import { randomUUID } from 'node:crypto'
import type {
  HermesApprovalAsk,
  HermesDirectiveRequest,
  HermesMemoryItem,
  HermesMessage,
  HermesQueueItem,
  HermesSkill,
  HermesState,
  HermesStatus,
  HermesStep,
  HermesStepType,
  KanbanAgentAction,
} from '@junos/shared'
import { type BackendSink, type HermesBackend, stepTypeFor } from './backend.ts'
import { type ShimEvent, ShimError, type ShimUpdate } from './protocol.ts'
import type { MemoryStore, SkillStore } from './stores.ts'

export interface EngineOptions {
  backend: HermesBackend
  memory: MemoryStore
  skills: SkillStore
  now?: () => number
  /** How long a step waits for an answer before it is denied (default 30 minutes). */
  approvalTimeoutMs?: number
  /** How many events are kept so a reconnecting junosd can catch up (default 500). */
  ringSize?: number
}

const PRIORITY = { high: 0, normal: 1, low: 2 } as const
const ASK_CLASSES = ['write-local', 'external-send', 'destructive', 'spend'] as const
const STEP_TYPES: HermesStepType[] = ['shell', 'browser', 'file', 'api', 'message']

interface Waiting {
  step: HermesStep
  resolve: (decision: 'approve' | 'deny') => void
  timer: ReturnType<typeof setTimeout>
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)

/**
 * The shim's brain. It owns the state junosd supervises: what Hermes is doing, the queue, a ring of recent steps and
 * messages, and the steps waiting for an approval. Hermes itself is behind `backend`, so all of it is tested with a fake.
 */
export class ShimEngine {
  readonly #o: EngineOptions
  readonly #now: () => number
  readonly #started: number
  readonly #ring: ShimEvent[] = []
  readonly #ringSize: number
  readonly #listeners = new Set<(e: ShimEvent) => void>()
  readonly #waiting = new Map<string, Waiting>()
  readonly #steps: HermesStep[] = []
  readonly #messages: HermesMessage[] = []
  /** How the last directives ended, so a junosd that missed the event (a restart, a gap) still learns it. */
  readonly #finished: Array<{ directiveId: string; outcome: 'done' | 'failed' | 'stopped'; summary: string }> = []
  #queue: Array<HermesQueueItem & { directiveId: string; echo: boolean }> = []
  #seq = 0
  #paused = false
  #current: { directiveId: string; text: string; abort: AbortController; done: Promise<void> } | null = null
  #model = ''
  #closed = false

  constructor(options: EngineOptions) {
    this.#o = options
    this.#now = options.now ?? Date.now
    this.#started = this.#now()
    this.#ringSize = options.ringSize ?? 500
  }

  #iso(): string {
    return new Date(this.#now()).toISOString()
  }

  // ---- events ----

  get lastSeq(): number {
    return this.#seq
  }

  #emit(update: ShimUpdate): void {
    if (this.#closed) return
    const event: ShimEvent = { seq: ++this.#seq, update }
    this.#ring.push(event)
    if (this.#ring.length > this.#ringSize) this.#ring.shift()
    for (const fn of this.#listeners) fn(event)
  }

  subscribe(fn: (e: ShimEvent) => void): () => void {
    this.#listeners.add(fn)
    return () => void this.#listeners.delete(fn)
  }

  /** Events after `seq`. `gap` is true when some were already dropped from the ring, so the caller must read `recent`. */
  after(seq: number): { events: ShimEvent[]; gap: boolean } {
    const oldest = this.#ring[0]?.seq ?? this.#seq + 1
    return { events: this.#ring.filter((e) => e.seq > seq), gap: seq + 1 < oldest && seq < this.#seq }
  }

  #state(): HermesState {
    return this.#paused ? 'paused' : this.#current ? 'working' : 'idle'
  }

  async status(): Promise<HermesStatus> {
    const health = await this.#o.backend.health()
    if (health.model) this.#model = health.model
    if (!health.ok) return { state: 'unreachable', currentTask: null, model: this.#model, uptimeS: null, reason: health.reason ?? 'Hermes did not answer.' }
    return { state: this.#state(), currentTask: this.#current?.text ?? null, model: this.#model, uptimeS: Math.max(0, Math.round((this.#now() - this.#started) / 1000)), reason: null }
  }

  #publishStatus(): void {
    this.status().then(
      (status) => this.#emit({ type: 'status', status }),
      () => {},
    )
  }

  // ---- messages and steps ----

  #message(role: HermesMessage['role'], text: string, via: HermesMessage['via'], directiveId: string | null, createdAt = this.#iso()): void {
    const message: HermesMessage = { id: randomUUID(), role, text: clip(text, 8000), via, directiveId, createdAt }
    this.#messages.push(message)
    if (this.#messages.length > 200) this.#messages.shift()
    this.#emit({ type: 'message', message })
  }

  #step(step: HermesStep): void {
    const at = this.#steps.findIndex((s) => s.id === step.id)
    if (at >= 0) this.#steps[at] = step
    else this.#steps.push(step)
    if (this.#steps.length > 200) this.#steps.shift()
    this.#emit({ type: 'step', step: { ...step } })
  }

  /** A message that happened outside the shim (a Telegram chat with Hermes), shown in the console with its badge. */
  mirror(message: { role: 'user' | 'agent'; text: string; via: 'junos' | 'telegram'; createdAt?: string }): void {
    if (!message.text.trim()) return
    this.#message(message.role, message.text, message.via, null, message.createdAt)
  }

  /** Hermes asks something of the board. It is checked again on junosd's side, where Done is refused. */
  kanban(action: KanbanAgentAction): void {
    this.#emit({ type: 'kanban', action })
  }

  recent(): { steps: HermesStep[]; messages: HermesMessage[]; directives: Array<{ directiveId: string; outcome: 'done' | 'failed' | 'stopped'; summary: string }> } {
    return { steps: this.#steps.map((s) => ({ ...s })), messages: this.#messages.map((m) => ({ ...m })), directives: this.#finished.map((d) => ({ ...d })) }
  }

  // ---- directives ----

  #publicQueue(): HermesQueueItem[] {
    return this.#queue.map(({ id, text, priority, queuedAt }) => ({ id, text, priority, queuedAt }))
  }

  queue(): HermesQueueItem[] {
    return this.#publicQueue()
  }

  sendDirective(request: HermesDirectiveRequest): { directiveId: string } {
    const text = typeof request.text === 'string' ? request.text.trim() : ''
    if (!text || text.length > 4000) throw new ShimError(400, 'bad_request', 'A directive is 1 to 4000 characters.')
    const priority = request.priority ?? 'normal'
    if (!(priority in PRIORITY)) throw new ShimError(400, 'bad_request', 'The priority is low, normal or high.')
    if (this.#closed) throw new ShimError(503, 'closed', 'The shim is shutting down.')
    const directiveId = randomUUID()
    this.#message('user', text, 'junos', directiveId)
    const echo = request.echoToTelegram === true
    if (this.#current || this.#paused) {
      this.#queue.push({ id: directiveId, directiveId, text, priority, queuedAt: this.#iso(), echo })
      this.#queue.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.queuedAt.localeCompare(b.queuedAt))
      this.#emit({ type: 'queue', queue: this.#publicQueue() })
    } else this.#start(directiveId, text, echo)
    return { directiveId }
  }

  #start(directiveId: string, text: string, echo: boolean): void {
    const abort = new AbortController()
    const done = this.#run(directiveId, text, echo, abort)
    this.#current = { directiveId, text, abort, done }
    this.#publishStatus()
  }

  /** What Hermes is actually asked: the directive, plus the skills switched off and whether to echo to Telegram. */
  #prompt(text: string, echo: boolean): string {
    const lines: string[] = []
    const off = this.#o.skills.disabled()
    if (off.length > 0) lines.push(`The owner has switched these skills off for now, so do not use them: ${off.join(', ')}.`)
    if (echo) lines.push('Also send your final answer to the owner on Telegram.')
    return lines.length ? `${lines.join('\n')}\n\n${text}` : text
  }

  async #run(directiveId: string, text: string, echo: boolean, abort: AbortController): Promise<void> {
    const began = this.#now()
    const asked: HermesStep = { id: randomUUID(), directiveId, type: 'message', summary: 'Asked Hermes', input: clip(text, 4000), output: '', status: 'running', ms: null, startedAt: this.#iso() }
    this.#step(asked)
    const tools = new Map<string, HermesStep>()
    const sink: BackendSink = {
      toolCall: (call) => {
        const type = stepTypeFor(call.name)
        const step: HermesStep = { id: randomUUID(), directiveId, type: STEP_TYPES.includes(type) ? type : 'api', summary: `Used ${clip(call.name, 60)}`, input: clip(call.args, 2000), output: '', status: 'running', ms: null, startedAt: this.#iso() }
        tools.set(call.id, step)
        this.#step(step)
      },
      toolResult: (id, output) => {
        const step = tools.get(id)
        if (!step || step.status !== 'running') return
        const done: HermesStep = { ...step, status: 'done', output: clip(output, 2000), ms: Math.max(1, this.#now() - Date.parse(step.startedAt)) }
        tools.set(id, done)
        this.#step(done)
      },
    }
    let outcome: 'done' | 'failed' | 'stopped' = 'done'
    let reply = ''
    try {
      reply = await this.#o.backend.run(this.#prompt(text, echo), abort.signal, sink)
      if (abort.signal.aborted) outcome = 'stopped'
      else if (!reply.trim()) {
        outcome = 'failed'
        reply = 'Hermes sent no answer.'
      }
    } catch (err) {
      if (abort.signal.aborted) outcome = 'stopped'
      else {
        outcome = 'failed'
        reply = err instanceof Error && !/fetch failed|terminated/i.test(err.message) ? err.message : 'Hermes could not be reached.'
      }
    }
    for (const step of tools.values()) {
      if (step.status === 'running') this.#step({ ...step, status: outcome === 'done' ? 'done' : outcome === 'stopped' ? 'stopped' : 'failed' })
    }
    this.#step({ ...asked, status: outcome === 'done' ? 'done' : outcome === 'stopped' ? 'stopped' : 'failed', output: clip(reply, 4000), ms: Math.max(1, this.#now() - began) })
    const shown = outcome === 'stopped' ? 'Stopped.' : outcome === 'failed' ? `That failed: ${reply}` : reply
    this.#message('agent', shown, 'junos', directiveId)
    this.#current = null
    this.#finished.push({ directiveId, outcome, summary: clip(shown, 4000) })
    if (this.#finished.length > 100) this.#finished.shift()
    this.#emit({ type: 'directive', directiveId, outcome, summary: clip(shown, 4000) })
    this.#publishStatus()
    if (!this.#paused && !this.#closed) this.#next()
  }

  #next(): void {
    const item = this.#queue.shift()
    if (!item) return
    this.#emit({ type: 'queue', queue: this.#publicQueue() })
    this.#start(item.directiveId, item.text, item.echo)
  }

  pause(): void {
    this.#paused = true
    this.#publishStatus()
  }

  resume(): void {
    this.#paused = false
    this.#publishStatus()
    if (!this.#current) this.#next()
  }

  /**
   * Ends what the shim can end: closes the request to Hermes, denies every step waiting for an approval and empties the
   * queue. Hermes's API cannot say whether its own work stopped, so the answer is `confirmed: false` when work was in flight.
   */
  async stop(): Promise<{ confirmed: boolean }> {
    const inFlight = this.#current
    this.#queue = []
    this.#emit({ type: 'queue', queue: [] })
    for (const id of [...this.#waiting.keys()]) this.#settle(id, 'deny', 'Stopped.', 'stopped')
    this.#paused = false
    if (inFlight) {
      inFlight.abort.abort()
      await Promise.race([inFlight.done, new Promise((r) => setTimeout(r, 1500))])
    } else this.#publishStatus()
    return { confirmed: inFlight === null }
  }

  // ---- approvals ----

  /**
   * Hermes asks for a yes before it acts. The step waits (30 minutes, then it is denied) until junosd, or a hook call from
   * the Telegram side, answers; the first answer wins. Resolves with the decision, so the caller can tell Hermes.
   */
  requestApproval(ask: HermesApprovalAsk & { type?: string; input?: string }, timeoutMs = this.#o.approvalTimeoutMs ?? 30 * 60_000): { stepId: string; decision: Promise<'approve' | 'deny'> } {
    if (!ASK_CLASSES.includes(ask.class as (typeof ASK_CLASSES)[number])) throw new ShimError(400, 'bad_request', 'The class is write-local, external-send, destructive or spend.')
    if (typeof ask.summary !== 'string' || !ask.summary.trim()) throw new ShimError(400, 'bad_request', 'An approval needs a summary.')
    const type = STEP_TYPES.includes(ask.type as HermesStepType) ? (ask.type as HermesStepType) : 'api'
    const step: HermesStep = {
      id: randomUUID(),
      directiveId: this.#current?.directiveId ?? null,
      type,
      summary: clip(ask.summary.trim(), 300),
      input: clip(String(ask.input ?? ''), 2000),
      output: '',
      status: 'waiting_approval',
      ms: null,
      startedAt: this.#iso(),
      approval: { class: ask.class, target: clip(String(ask.target ?? ''), 300), summary: clip(ask.summary.trim(), 300) },
    }
    const decision = new Promise<'approve' | 'deny'>((resolve) => {
      const timer = setTimeout(() => this.#settle(step.id, 'deny', 'No answer in time, so it was denied.', 'denied'), Math.max(10, timeoutMs))
      this.#waiting.set(step.id, { step, resolve, timer })
    })
    this.#step(step)
    return { stepId: step.id, decision }
  }

  #settle(stepId: string, decision: 'approve' | 'deny', note: string, status: HermesStep['status']): boolean {
    const waiting = this.#waiting.get(stepId)
    if (!waiting) return false
    this.#waiting.delete(stepId)
    clearTimeout(waiting.timer)
    const { approval: _approval, ...rest } = waiting.step
    this.#step({ ...rest, status: decision === 'approve' ? 'done' : status, output: note, ms: Math.max(1, this.#now() - Date.parse(waiting.step.startedAt)) })
    waiting.resolve(decision)
    return true
  }

  /** junosd's answer, or the Telegram side's. A step is answered once; a second answer is refused. */
  decide(stepId: string, decision: 'approve' | 'deny', via: 'junos' | 'telegram' = 'junos'): void {
    if (decision !== 'approve' && decision !== 'deny') throw new ShimError(400, 'bad_request', 'The decision is approve or deny.')
    const where = via === 'telegram' ? 'on Telegram' : 'in JunOS'
    const ok = this.#settle(stepId, decision, decision === 'approve' ? `Approved ${where}.` : `Denied ${where}.`, 'denied')
    if (!ok) throw new ShimError(409, 'not_waiting', 'That step is not waiting for an approval (it may already be answered).')
  }

  // ---- memory and skills ----

  memory(): HermesMemoryItem[] {
    return this.#o.memory.list()
  }
  setMemory(items: HermesMemoryItem[]): HermesMemoryItem[] {
    return this.#o.memory.set(items)
  }
  skills(): HermesSkill[] {
    return this.#o.skills.list()
  }
  setSkills(toggles: Array<{ id: string; enabled: boolean }>): HermesSkill[] {
    return this.#o.skills.set(toggles)
  }

  async close(): Promise<void> {
    this.#closed = true
    for (const id of [...this.#waiting.keys()]) this.#settle(id, 'deny', 'The shim shut down.', 'stopped')
    this.#current?.abort.abort()
    await this.#current?.done.catch(() => {})
    this.#listeners.clear()
  }
}
