import { randomUUID } from 'node:crypto'
import type {
  ActionClass,
  HermesDirectiveRequest,
  HermesMemoryItem,
  HermesMessage,
  HermesOverview,
  HermesQueueItem,
  HermesSkill,
  HermesStatus,
  HermesStep,
  JunosEvent,
} from '@junos/shared'
import { BridgeError, type BridgeUpdate, type HermesBridge } from './hermes/bridge.ts'
import type { Gateway, ToolDef } from './gateway.ts'
import type { InboxService } from './inbox.ts'
import type { RunManager } from './runs.ts'
import type { EventStore } from './store.ts'

export class HermesError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface HermesOptions {
  store: EventStore
  gateway: Gateway
  inbox: InboxService
  runs: RunManager
  bridge: HermesBridge
  now?: () => number
  /** How often the agent's status is read (default 5 s). */
  pollMs?: number
}

const KEEP = 500
const ASK_CLASSES: Array<Exclude<ActionClass, 'read'>> = ['write-local', 'external-send', 'destructive', 'spend']

/**
 * The gateway tools a Hermes action goes through. The action itself runs inside Hermes; what the gateway owns is the
 * decision, so these only carry the answer back: running one (after an approval, or at once when the class needs none)
 * tells Hermes to go ahead.
 */
export function hermesTools(service: () => HermesService | undefined): ToolDef[] {
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return ASK_CLASSES.map((cls) => ({
    name: `hermes.${cls}`,
    class: cls,
    target: (a) => str(a.target),
    execute: async (a) => {
      await service()?.release(str(a.step), 'approve')
      return { released: true }
    },
  }))
}

const unreachable = (err: unknown): HermesStatus => ({
  state: 'unreachable',
  currentTask: null,
  model: '',
  uptimeS: null,
  reason: err instanceof Error ? err.message : 'Hermes could not be reached.',
})

/**
 * Supervises Hermes (spec 06) through a bridge: relays its steps and messages into events and SQLite so the console
 * survives a reload, turns a step that needs a yes into a digest-bound gateway approval, and carries Stop and
 * memory edits across. Nothing here knows whether the agent is the mock or the real one.
 */
export class HermesService {
  readonly #o: HermesOptions
  readonly #now: () => number
  #status: HermesStatus
  #stopUnconfirmed = false
  #timer: ReturnType<typeof setInterval> | undefined
  #unsubscribeBridge: (() => void) | undefined
  #unsubscribeEvents: (() => void) | undefined
  readonly #asked = new Set<string>()

  constructor(options: HermesOptions) {
    this.#o = options
    this.#now = options.now ?? Date.now
    this.#status = { state: 'unreachable', currentTask: null, model: '', uptimeS: null, reason: 'Not read yet.' }
  }

  get mode(): HermesOverview['mode'] {
    return this.#o.bridge.mode
  }

  #iso(): string {
    return new Date(this.#now()).toISOString()
  }

  // ---- life ----

  async start(): Promise<void> {
    if (this.#timer) return
    this.#unsubscribeBridge = this.#o.bridge.subscribe((u) => this.#onUpdate(u))
    this.#unsubscribeEvents = this.#o.store.subscribe((event) => this.#onEvent(event))
    await this.#refresh()
    this.#timer = setInterval(() => void this.#refresh(), this.#o.pollMs ?? 5000)
    this.#timer.unref()
  }

  async stopService(): Promise<void> {
    clearInterval(this.#timer)
    this.#timer = undefined
    this.#unsubscribeBridge?.()
    this.#unsubscribeEvents?.()
    await this.#o.bridge.close()
  }

  /** Reads the status, and when the agent has just become reachable again, catches up on what it did meanwhile. */
  async #refresh(): Promise<void> {
    const before = this.#status.state
    let next: HermesStatus
    try {
      next = await this.#o.bridge.status()
    } catch (err) {
      next = unreachable(err)
    }
    this.#setStatus(next)
    if (next.state !== 'unreachable' && (before === 'unreachable' || before === 'error')) {
      try {
        const recent = await this.#o.bridge.recent()
        for (const message of recent.messages) this.#saveMessage(message)
        for (const step of recent.steps) this.#saveStep(step)
      } catch {
        /* the next poll tries again */
      }
    }
  }

  #setStatus(next: HermesStatus): void {
    const prev = this.#status
    this.#status = next
    if (prev.state !== next.state || prev.currentTask !== next.currentTask) {
      this.#o.store.append('hermes.status', { state: next.state, currentTask: next.currentTask, reason: next.reason })
    }
  }

  #onUpdate(update: BridgeUpdate): void {
    try {
      if (update.type === 'status') this.#setStatus(update.status)
      else if (update.type === 'message') this.#saveMessage(update.message)
      else if (update.type === 'step') this.#saveStep(update.step)
      else this.#o.store.append('hermes.queue', { count: update.queue.length })
    } catch {
      /* the database is closing */
    }
  }

  // ---- stored history ----

  #saveMessage(message: HermesMessage): void {
    const res = this.#o.store.db.prepare('INSERT OR IGNORE INTO hermes_message (id, json, created_at) VALUES (?, ?, ?)').run(message.id, JSON.stringify(message), message.createdAt)
    if (Number(res.changes) !== 1) return
    this.#o.store.db.prepare('DELETE FROM hermes_message WHERE seq <= (SELECT MAX(seq) FROM hermes_message) - ?').run(KEEP)
    this.#o.store.append('hermes.message', { messageId: message.id, role: message.role, via: message.via })
  }

  #saveStep(step: HermesStep): void {
    const db = this.#o.store.db
    const known = db.prepare('SELECT json, approval_id FROM hermes_step WHERE id = ?').get(step.id) as { json: string; approval_id: string | null } | undefined
    const previous = known ? (JSON.parse(known.json) as HermesStep) : undefined
    // The approval id is ours, not the agent's: keep it across the agent's own updates to the step.
    const approvalId = step.approvalId ?? known?.approval_id ?? null
    const stored: HermesStep = { ...step, approvalId }
    if (previous && previous.status === stored.status && previous.output === stored.output && previous.ms === stored.ms && previous.summary === stored.summary) return
    db.prepare(
      `INSERT INTO hermes_step (id, approval_id, json, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET approval_id = excluded.approval_id, json = excluded.json, updated_at = excluded.updated_at`,
    ).run(step.id, approvalId, JSON.stringify(stored), this.#iso())
    db.prepare('DELETE FROM hermes_step WHERE seq <= (SELECT MAX(seq) FROM hermes_step) - ?').run(KEEP)
    this.#o.store.append('hermes.step', { stepId: step.id, status: step.status, type: step.type })
    if (stored.status === 'waiting_approval' && stored.approval && !this.#asked.has(step.id) && !approvalId) void this.#askApproval(stored)
  }

  // ---- approvals ----

  /** A step waits for a yes: ask the gateway, which puts the same approval in the Inbox and on Telegram. */
  async #askApproval(step: HermesStep): Promise<void> {
    this.#asked.add(step.id)
    const ask = step.approval!
    try {
      const res = await this.#o.gateway.request('hermes', {
        tool: `hermes.${ask.class}`,
        args: { step: step.id, target: ask.target, summary: ask.summary },
        runId: `hermes:${step.id}`,
      })
      if (res.status === 'approval_required') {
        this.#o.store.db.prepare('UPDATE hermes_step SET approval_id = ?, json = ? WHERE id = ?').run(res.approvalId, JSON.stringify({ ...step, approvalId: res.approvalId }), step.id)
        this.#o.store.append('hermes.step', { stepId: step.id, status: 'waiting_approval', approvalId: res.approvalId })
      } else if (res.status !== 'executed') {
        await this.release(step.id, 'deny') // not allowed (Stop, or an unknown class): the answer is no
      }
    } catch {
      await this.release(step.id, 'deny').catch(() => {})
    }
  }

  /** Tells Hermes the answer for a waiting step. */
  async release(stepId: string, decision: 'approve' | 'deny'): Promise<void> {
    await this.#o.bridge.decide(stepId, decision)
  }

  #onEvent(event: JunosEvent): void {
    try {
      if (event.type === 'approval.approved' || event.type === 'approval.denied' || event.type === 'approval.expired') {
        const approvalId = String(event.payload.approvalId ?? '')
        const row = this.#o.store.db.prepare('SELECT json FROM hermes_step WHERE approval_id = ?').get(approvalId) as { json: string } | undefined
        if (!row) return
        const step = JSON.parse(row.json) as HermesStep
        if (event.type === 'approval.approved') {
          // Running the tool with the approval spends it and releases the step.
          const ask = step.approval
          if (!ask) return
          void this.#o.gateway
            .request('hermes', { tool: `hermes.${ask.class}`, args: { step: step.id, target: ask.target, summary: ask.summary }, runId: `hermes:${step.id}`, approvalId })
            .catch(() => {})
        } else void this.release(step.id, 'deny').catch(() => {})
        return
      }
      if (event.type === 'stop.requested' && event.payload.scope === 'all') void this.#onGlobalStop()
    } catch {
      /* the database is closing */
    }
  }

  async #onGlobalStop(): Promise<void> {
    for (const step of this.#waitingSteps()) this.#o.gateway.revokeForRun(`hermes:${step.id}`, 'stop')
    if (this.#o.bridge.mode === 'none') return
    await this.stop().catch(() => {})
  }

  #waitingSteps(): HermesStep[] {
    const rows = this.#o.store.db.prepare(`SELECT json FROM hermes_step WHERE json_extract(json, '$.status') = 'waiting_approval'`).all() as Array<{ json: string }>
    return rows.map((r) => JSON.parse(r.json) as HermesStep)
  }

  // ---- what the API offers ----

  async #bridge<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work()
    } catch (err) {
      if (err instanceof BridgeError) {
        const status = err.code === 'bad_request' ? 400 : err.code === 'busy' ? 409 : 503
        throw new HermesError(status, err.code, err.message)
      }
      throw new HermesError(503, 'unreachable', err instanceof Error ? err.message : 'Hermes could not be reached.')
    }
  }

  async overview(): Promise<HermesOverview> {
    const db = this.#o.store.db
    const steps = (db.prepare('SELECT json FROM hermes_step ORDER BY seq DESC LIMIT 100').all() as Array<{ json: string }>).reverse().map((r) => JSON.parse(r.json) as HermesStep)
    const messages = (db.prepare('SELECT json FROM hermes_message ORDER BY seq DESC LIMIT 100').all() as Array<{ json: string }>).reverse().map((r) => JSON.parse(r.json) as HermesMessage)
    let queue: HermesQueueItem[] = []
    try {
      queue = await this.#o.bridge.queue()
    } catch {
      /* unreachable: the status says so */
    }
    return {
      mode: this.#o.bridge.mode,
      reason: this.#o.bridge.mode === 'none' ? this.#status.reason : null,
      status: this.#status,
      steps,
      messages,
      queue,
      stopUnconfirmed: this.#stopUnconfirmed,
    }
  }

  async directive(request: HermesDirectiveRequest): Promise<{ directiveId: string }> {
    if (this.#o.runs.paused) throw new HermesError(409, 'paused', 'JunOS is stopped. Resume it first.')
    return this.#bridge(() => this.#o.bridge.sendDirective(request))
  }

  async pause(): Promise<void> {
    await this.#bridge(() => this.#o.bridge.pause())
    await this.#refresh()
  }

  async resume(): Promise<void> {
    await this.#bridge(() => this.#o.bridge.resume())
    this.#stopUnconfirmed = false
    await this.#refresh()
  }

  /** Halts Hermes. If the agent cannot be reached or cannot confirm, that is recorded and raised, not hidden. */
  async stop(): Promise<{ confirmed: boolean }> {
    let confirmed = false
    try {
      confirmed = (await this.#o.bridge.stop()).confirmed
    } catch {
      confirmed = false
    }
    for (const step of this.#waitingSteps()) this.#o.gateway.revokeForRun(`hermes:${step.id}`, 'stop')
    this.#stopUnconfirmed = !confirmed
    this.#o.store.append('hermes.stopped', { confirmed })
    if (!confirmed) {
      this.#o.inbox.add({
        kind: 'failure',
        priority: 'urgent',
        title: 'Hermes stop not confirmed',
        body: 'Hermes could not confirm it stopped (it may be unreachable). Check the VPS before trusting it is idle.',
        source: 'hermes',
        key: 'hermes-stop',
        refId: `hermes-stop:${this.#now()}`,
      })
    }
    await this.#refresh()
    return { confirmed }
  }

  async memory(): Promise<HermesMemoryItem[]> {
    return this.#bridge(() => this.#o.bridge.memory())
  }

  async setMemory(items: unknown): Promise<HermesMemoryItem[]> {
    if (!Array.isArray(items) || items.length > 200) throw new HermesError(400, 'bad_memory', 'Memory is a list of at most 200 items.')
    const seen = new Set<string>()
    const clean = items.map((raw: unknown): HermesMemoryItem => {
      const item = (raw ?? {}) as { id?: unknown; text?: unknown; pinned?: unknown }
      const text = typeof item.text === 'string' ? item.text.trim() : ''
      if (!text || text.length > 500) throw new HermesError(400, 'bad_memory', 'Each memory is 1 to 500 characters.')
      if (item.pinned !== undefined && typeof item.pinned !== 'boolean') throw new HermesError(400, 'bad_memory', 'pinned must be true or false.')
      const id = typeof item.id === 'string' && /^[\w-]{1,60}$/.test(item.id) ? item.id : `mem-${randomUUID().slice(0, 8)}`
      if (seen.has(id)) throw new HermesError(400, 'bad_memory', `Duplicate memory id ${id}.`)
      seen.add(id)
      return { id, text, pinned: item.pinned === true }
    })
    const saved = await this.#bridge(() => this.#o.bridge.setMemory(clean))
    this.#o.store.append('hermes.memory.changed', { count: saved.length })
    return saved
  }

  async skills(): Promise<HermesSkill[]> {
    return this.#bridge(() => this.#o.bridge.skills())
  }

  async setSkills(toggles: unknown): Promise<HermesSkill[]> {
    if (!Array.isArray(toggles) || toggles.some((t: { id?: unknown; enabled?: unknown }) => typeof t?.id !== 'string' || typeof t?.enabled !== 'boolean')) {
      throw new HermesError(400, 'bad_skills', 'Send a list of { id, enabled }.')
    }
    const saved = await this.#bridge(() => this.#o.bridge.setSkills(toggles as Array<{ id: string; enabled: boolean }>))
    this.#o.store.append('hermes.skills.changed', { count: toggles.length })
    return saved
  }
}
