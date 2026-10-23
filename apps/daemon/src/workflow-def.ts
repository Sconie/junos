import { parse, stringify, YAMLParseError } from 'yaml'
import {
  EFFORTS,
  PROVIDER_IDS,
  STEP_TYPES,
  WORKFLOW_VERSION,
  type Effort,
  type ProviderId,
  type WorkflowDefinition,
  type WorkflowParam,
  type WorkflowStep,
  type WorkflowTrigger,
  type WorkflowValidation,
} from '@junos/shared'
import { previewCron } from './scheduler.ts'

export interface ValidateContext {
  /** Tools a `tool` step may name. */
  tools: ReadonlySet<string>
  /** The reason a provider, model and effort do not go together, or null. */
  checkChoice(provider: ProviderId, model: string, effort: string): string | null
}

/** Events a workflow may be triggered by. */
export const EVENT_TRIGGERS = ['inbox.item.created', 'inbox.item.resolved'] as const
const EVENT_FIELDS = ['kind', 'priority', 'source']

const KEY = /^[a-z][a-z0-9_]*$/
const TEMPLATE = /\{\{\s*([^{}]*?)\s*\}\}/g

type Raw = Record<string, unknown>
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Format upgrades, one step per version: MIGRATIONS[n] turns a version-n document into version n+1.
 * A file with no version field is version 0 (the shape in the first design sketch).
 */
const MIGRATIONS: Array<(doc: Raw) => Raw> = [
  // 0 -> 1: `inputs` became `params`, and the single `schedule` string became `triggers`.
  (doc) => {
    const next: Raw = { ...doc }
    if (next.inputs !== undefined && next.params === undefined) {
      next.params = (next.inputs as unknown[]).map((i) => (typeof i === 'string' ? { key: i, type: 'string' } : i))
      delete next.inputs
    }
    if (typeof next.schedule === 'string' && next.triggers === undefined) {
      next.triggers = [{ type: 'manual' }, { type: 'cron', expr: next.schedule }]
      delete next.schedule
    }
    next.version = 1
    return next
  },
]

export interface ParsedWorkflow extends WorkflowValidation {
  /** The document rewritten in the current format, when it was upgraded. */
  upgradedText: string | null
}

/** Reads workflow text: parses, upgrades an older format, and validates. Never throws. */
export function parseWorkflow(text: string, ctx: ValidateContext): ParsedWorkflow {
  const fail = (errors: string[], upgradedFrom: number | null = null): ParsedWorkflow => ({ valid: false, errors, upgradedFrom, upgradedText: null })
  let doc: unknown
  try {
    doc = parse(text)
  } catch (err) {
    if (err instanceof YAMLParseError) return fail([`Line ${err.linePos?.[0]?.line ?? '?'}: ${err.message.split('\n')[0]}`])
    return fail(['The text is not valid YAML.'])
  }
  if (!isObject(doc)) return fail(['A workflow is a YAML mapping with a name and steps.'])

  const rawVersion = doc.version === undefined ? 0 : doc.version
  if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion) || rawVersion < 0) return fail(['version must be a whole number.'])
  if (rawVersion > WORKFLOW_VERSION) {
    return fail([`This file uses format version ${rawVersion}, which is newer than this JunOS understands (up to ${WORKFLOW_VERSION}). It was left as it is.`])
  }
  let current: Raw = doc
  for (let v = rawVersion; v < WORKFLOW_VERSION; v++) current = MIGRATIONS[v]!(current)
  const upgradedFrom = rawVersion < WORKFLOW_VERSION ? rawVersion : null

  const errors: string[] = []
  const definition = validate(current, ctx, errors)
  if (errors.length > 0 || !definition) return fail(errors, upgradedFrom)
  return { valid: true, errors: [], definition, upgradedFrom, upgradedText: upgradedFrom === null ? null : serialize(definition) }
}

export function serialize(def: WorkflowDefinition): string {
  return stringify(def, { lineWidth: 100 })
}

function validate(doc: Raw, ctx: ValidateContext, errors: string[]): WorkflowDefinition | null {
  const err = (m: string) => void errors.push(m)
  const known = (obj: Raw, keys: string[], where: string) => {
    for (const k of Object.keys(obj)) if (!keys.includes(k)) err(`${where}: unknown field "${k}" (did you mean one of: ${keys.join(', ')}?)`)
  }
  known(doc, ['version', 'name', 'description', 'provider', 'model', 'effort', 'params', 'triggers', 'steps'], 'Workflow')

  const name = typeof doc.name === 'string' ? doc.name.trim() : ''
  if (!name || name.length > 80) err('name is required and must be at most 80 characters.')
  const description = doc.description === undefined ? '' : doc.description
  if (typeof description !== 'string' || description.length > 300) err('description must be text of at most 300 characters.')

  const choice = (o: Raw, where: string): { provider?: ProviderId; model?: string; effort?: Effort } => {
    const out: { provider?: ProviderId; model?: string; effort?: Effort } = {}
    if (o.provider !== undefined) {
      if (typeof o.provider !== 'string' || !(PROVIDER_IDS as readonly string[]).includes(o.provider)) err(`${where}: provider must be one of ${PROVIDER_IDS.join(', ')}.`)
      else out.provider = o.provider as ProviderId
    }
    if (o.model !== undefined) {
      if (typeof o.model !== 'string' || !/^[\w.\-:[\],=]{0,80}$/.test(o.model)) err(`${where}: model is not a valid model name.`)
      else out.model = o.model
    }
    if (o.effort !== undefined) {
      if (typeof o.effort !== 'string' || !(EFFORTS as readonly string[]).includes(o.effort)) err(`${where}: effort must be one of ${EFFORTS.join(', ')}.`)
      else out.effort = o.effort as Effort
    }
    return out
  }
  const top = choice(doc, 'Workflow')

  // params
  const params: WorkflowParam[] = []
  const rawParams = doc.params === undefined ? [] : doc.params
  if (!Array.isArray(rawParams) || rawParams.length > 12) err('params must be a list of at most 12 parameters.')
  else {
    rawParams.forEach((p, i) => {
      const where = `params[${i}]`
      if (!isObject(p)) return err(`${where}: must be a mapping with a key.`)
      known(p, ['key', 'type', 'label', 'default', 'required'], where)
      if (typeof p.key !== 'string' || !KEY.test(p.key)) return err(`${where}: key must be lowercase letters, digits and underscores, starting with a letter.`)
      if (params.some((x) => x.key === p.key)) return err(`${where}: duplicate key "${p.key}".`)
      const type = p.type === undefined ? 'string' : p.type
      if (type !== 'string' && type !== 'number' && type !== 'boolean' && type !== 'file') return err(`${where}: type must be string, number, boolean or file.`)
      if (p.default !== undefined && typeof p.default !== (type === 'file' ? 'string' : type)) return err(`${where}: default must be a ${type}.`)
      if (p.label !== undefined && typeof p.label !== 'string') return err(`${where}: label must be text.`)
      if (p.required !== undefined && typeof p.required !== 'boolean') return err(`${where}: required must be true or false.`)
      params.push({ key: p.key, type, label: p.label as string | undefined, default: p.default as WorkflowParam['default'], required: p.required as boolean | undefined })
    })
  }
  const paramKeys = new Set(params.map((p) => p.key))

  // triggers
  const triggers: WorkflowTrigger[] = []
  const rawTriggers = doc.triggers === undefined ? [{ type: 'manual' }] : doc.triggers
  if (!Array.isArray(rawTriggers) || rawTriggers.length === 0 || rawTriggers.length > 6) err('triggers must be a list of 1 to 6 triggers.')
  else {
    rawTriggers.forEach((t, i) => {
      const where = `triggers[${i}]`
      if (!isObject(t)) return err(`${where}: must be a mapping with a type.`)
      if (t.type === 'manual') {
        known(t, ['type'], where)
        triggers.push({ type: 'manual' })
      } else if (t.type === 'cron') {
        known(t, ['type', 'expr', 'timezone'], where)
        const tz = typeof t.timezone === 'string' ? t.timezone : 'Europe/Copenhagen'
        const preview = previewCron(String(t.expr ?? ''), tz, new Date())
        if (!preview.valid) return err(`${where}: ${preview.error}`)
        triggers.push({ type: 'cron', expr: String(t.expr).trim(), timezone: tz })
      } else if (t.type === 'event') {
        known(t, ['type', 'event', 'where'], where)
        if (typeof t.event !== 'string' || !(EVENT_TRIGGERS as readonly string[]).includes(t.event)) return err(`${where}: event must be one of ${EVENT_TRIGGERS.join(', ')}.`)
        let where_: Record<string, string> | undefined
        if (t.where !== undefined) {
          if (!isObject(t.where) || Object.entries(t.where).some(([k, v]) => !EVENT_FIELDS.includes(k) || typeof v !== 'string')) return err(`${where}: where may only match ${EVENT_FIELDS.join(', ')} with text values.`)
          where_ = t.where as Record<string, string>
        }
        triggers.push({ type: 'event', event: t.event, where: where_ })
      } else err(`${where}: type must be manual, cron or event.`)
    })
  }

  if (triggers.some((t) => t.type !== 'manual')) {
    const missing = params.filter((p) => p.required && p.default === undefined).map((p) => p.key)
    if (missing.length > 0) err(`triggers: a workflow that starts by itself needs a default for every required parameter (missing: ${missing.join(', ')}).`)
  }

  // steps
  const steps: WorkflowStep[] = []
  const stepIds: string[] = []
  const rawSteps = doc.steps
  if (!Array.isArray(rawSteps) || rawSteps.length === 0 || rawSteps.length > 30) err('steps must be a list of 1 to 30 steps.')
  else {
    const checkRefs = (text: string, where: string) => {
      for (const m of text.matchAll(TEMPLATE)) {
        const ref = m[1]!
        if (paramKeys.has(ref)) continue
        const step = /^steps\.([a-z][a-z0-9_]*)$/.exec(ref)?.[1]
        if (step && stepIds.includes(step)) continue
        err(`${where}: {{${ref}}} is not a parameter or an earlier step (use {{name}} or {{steps.id}}).`)
      }
    }
    const checkDeep = (v: unknown, where: string) => {
      if (typeof v === 'string') checkRefs(v, where)
      else if (Array.isArray(v)) v.forEach((x) => checkDeep(x, where))
      else if (isObject(v)) Object.values(v).forEach((x) => checkDeep(x, where))
    }
    rawSteps.forEach((s, i) => {
      const where = `steps[${i}]`
      if (!isObject(s)) return err(`${where}: must be a mapping with an id and a type.`)
      if (typeof s.id !== 'string' || !KEY.test(s.id)) return err(`${where}: id must be lowercase letters, digits and underscores, starting with a letter.`)
      if (stepIds.includes(s.id)) return err(`${where}: duplicate step id "${s.id}".`)
      const label = `step "${s.id}"`
      if (typeof s.type !== 'string' || !(STEP_TYPES as readonly string[]).includes(s.type)) return err(`${label}: type must be one of ${STEP_TYPES.join(', ')}.`)
      const earlier = (ref: unknown, field: string): ref is string => {
        if (typeof ref !== 'string' || !stepIds.includes(ref)) {
          err(`${label}: ${field} "${String(ref)}" is not an earlier step.`)
          return false
        }
        return true
      }
      switch (s.type) {
        case 'prompt': {
          known(s, ['id', 'type', 'prompt', 'provider', 'model', 'effort', 'input'], label)
          if (typeof s.prompt !== 'string' || !s.prompt.trim() || s.prompt.length > 10_000) return err(`${label}: prompt is required (up to 10,000 characters).`)
          checkRefs(s.prompt, label)
          const input: string[] = []
          if (s.input !== undefined) {
            if (!Array.isArray(s.input) || s.input.length > 10) return err(`${label}: input must be a list of earlier step ids.`)
            for (const ref of s.input) if (earlier(ref, 'input')) input.push(ref)
          }
          const c = choice(s, label)
          const provider = c.provider ?? top.provider ?? 'claude'
          const problem = ctx.checkChoice(provider, c.model ?? top.model ?? '', c.effort ?? top.effort ?? 'medium')
          if (problem) err(`${label}: ${problem}`)
          steps.push({ id: s.id, type: 'prompt', prompt: s.prompt, ...c, ...(input.length ? { input } : {}) })
          break
        }
        case 'tool': {
          known(s, ['id', 'type', 'tool', 'args'], label)
          if (typeof s.tool !== 'string' || !ctx.tools.has(s.tool)) return err(`${label}: unknown tool "${String(s.tool)}" (available: ${[...ctx.tools].sort().join(', ')}).`)
          if (s.args !== undefined && !isObject(s.args)) return err(`${label}: args must be a mapping.`)
          checkDeep(s.args, label)
          steps.push({ id: s.id, type: 'tool', tool: s.tool, ...(s.args ? { args: s.args } : {}) })
          break
        }
        case 'approval': {
          known(s, ['id', 'type', 'message'], label)
          if (typeof s.message !== 'string' || !s.message.trim() || s.message.length > 300) return err(`${label}: message is required (up to 300 characters).`)
          checkRefs(s.message, label)
          steps.push({ id: s.id, type: 'approval', message: s.message })
          break
        }
        case 'output': {
          known(s, ['id', 'type', 'to', 'from', 'title'], label)
          if (s.to !== 'inbox') return err(`${label}: to must be inbox.`)
          let from: string | undefined
          if (s.from !== undefined) {
            if (!earlier(s.from, 'from')) return
            from = s.from
          } else {
            from = [...steps].reverse().find((x) => x.type === 'prompt' || x.type === 'tool')?.id
            if (!from) return err(`${label}: there is no earlier step to take the result from.`)
          }
          if (s.title !== undefined && (typeof s.title !== 'string' || s.title.length > 120)) return err(`${label}: title must be text of at most 120 characters.`)
          if (typeof s.title === 'string') checkRefs(s.title, label)
          steps.push({ id: s.id, type: 'output', to: 'inbox', from, ...(typeof s.title === 'string' ? { title: s.title } : {}) })
          break
        }
      }
      stepIds.push(s.id)
    })
  }

  if (errors.length > 0) return null
  return {
    version: WORKFLOW_VERSION,
    name,
    ...(typeof description === 'string' && description ? { description } : {}),
    ...top,
    params,
    triggers,
    steps,
  }
}

/** Replaces {{param}} and {{steps.id}}. Unknown references were refused when the file was saved. */
export function render(text: string, values: { params: Record<string, string | number | boolean>; steps: Record<string, string> }): string {
  return text.replace(TEMPLATE, (_all, ref: string) => {
    if (ref in values.params) return String(values.params[ref])
    const step = /^steps\.([a-z][a-z0-9_]*)$/.exec(ref)?.[1]
    return step && step in values.steps ? values.steps[step]! : ''
  })
}

export function renderDeep(v: unknown, values: Parameters<typeof render>[1]): unknown {
  if (typeof v === 'string') return render(v, values)
  if (Array.isArray(v)) return v.map((x) => renderDeep(x, values))
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, renderDeep(x, values)]))
  return v
}
