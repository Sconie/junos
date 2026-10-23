import { randomUUID } from 'node:crypto'
import type {
  HermesDirectiveRequest,
  HermesMemoryItem,
  HermesMessage,
  HermesQueueItem,
  HermesSkill,
  HermesState,
  HermesStatus,
  HermesStep,
} from '@junos/shared'
import { BridgeError, type BridgeUpdate, type HermesBridge } from './bridge.ts'

export interface MockOptions {
  /** How long each scripted step takes. */
  stepMs?: number
  now?: () => number
  /** Whether Stop is confirmed (false simulates a process that survived). */
  stopConfirmed?: boolean
}

class Stopped extends Error {}

const PRIORITY = { high: 0, normal: 1, low: 2 } as const

/**
 * A scripted Hermes for building and testing the console. It behaves like the real agent at the level the bridge
 * sees it: a stream of steps, a queue while it is busy, an approval that holds a step, pause and stop, memory and
 * skills. A directive's wording picks the script: "send" asks for approval, "slow" runs until stopped, "fail"
 * fails a step. `simulateTelegram` mirrors a phone conversation the way the real shim will.
 */
export class MockHermes implements HermesBridge {
  readonly mode = 'mock' as const
  readonly #stepMs: number
  readonly #now: () => number
  readonly #stopConfirmed: boolean
  readonly #startedAt: number
  readonly #listeners = new Set<(u: BridgeUpdate) => void>()
  readonly #steps: HermesStep[] = []
  readonly #messages: HermesMessage[] = []
  readonly #waiting = new Map<string, (decision: 'approve' | 'deny') => void>()
  #queue: Array<HermesQueueItem & { directiveId: string }> = []
  #memory: HermesMemoryItem[] = [
    { id: 'mem-1', text: 'Jonas prefers short answers.', pinned: true },
    { id: 'mem-2', text: 'The project repo is Sconie/junos.', pinned: false },
  ]
  #skills: HermesSkill[] = [
    { id: 'browse', name: 'Web browsing', description: 'Open pages and read them.', enabled: true },
    { id: 'shell', name: 'Shell', description: 'Run commands in the workspace.', enabled: true },
    { id: 'files', name: 'File editing', description: 'Read and write files in the workspace.', enabled: true },
    { id: 'mail', name: 'Mail drafts', description: 'Write mail drafts (never sends).', enabled: false },
  ]
  #state: HermesState = 'idle'
  #task: string | null = null
  #paused = false
  #stopFlag = 0
  #reachable = true
  #running = false
  #resume: (() => void) | null = null

  constructor(options: MockOptions = {}) {
    this.#stepMs = options.stepMs ?? 600
    this.#now = options.now ?? Date.now
    this.#stopConfirmed = options.stopConfirmed ?? true
    this.#startedAt = this.#now()
  }

  // ---- test and demo controls (not part of the bridge) ----

  /** Pretends the VPS or the tunnel is down (or back up). */
  setReachable(reachable: boolean): void {
    this.#reachable = reachable
  }

  /** A conversation that happened on the phone, mirrored the way the real shim will mirror it. */
  simulateTelegram(text: string, reply: string): void {
    const directiveId = randomUUID()
    this.#message('user', text, 'telegram', directiveId)
    this.#message('agent', reply, 'telegram', directiveId)
  }

  // ---- bridge ----

  #check(): void {
    if (!this.#reachable) throw new BridgeError('unreachable', 'The mock Hermes was told to be unreachable.')
  }

  #iso(): string {
    return new Date(this.#now()).toISOString()
  }

  #emit(update: BridgeUpdate): void {
    for (const fn of this.#listeners) fn(update)
  }

  #status(): HermesStatus {
    if (!this.#reachable) return { state: 'unreachable', currentTask: null, model: 'hermes-mock', uptimeS: null, reason: 'The mock Hermes was told to be unreachable.' }
    return { state: this.#state, currentTask: this.#task, model: 'hermes-mock', uptimeS: Math.max(0, Math.round((this.#now() - this.#startedAt) / 1000)), reason: null }
  }

  #setState(state: HermesState, task: string | null = this.#task): void {
    this.#state = state
    this.#task = task
    this.#emit({ type: 'status', status: this.#status() })
  }

  #message(role: 'user' | 'agent', text: string, via: 'junos' | 'telegram', directiveId: string | null): HermesMessage {
    const message: HermesMessage = { id: randomUUID(), role, text, via, directiveId, createdAt: this.#iso() }
    this.#messages.push(message)
    if (this.#messages.length > 200) this.#messages.shift()
    this.#emit({ type: 'message', message })
    return message
  }

  #pushStep(step: HermesStep): void {
    const at = this.#steps.findIndex((s) => s.id === step.id)
    if (at >= 0) this.#steps[at] = step
    else this.#steps.push(step)
    if (this.#steps.length > 200) this.#steps.shift()
    this.#emit({ type: 'step', step: { ...step } })
  }

  status(): Promise<HermesStatus> {
    return Promise.resolve(this.#status())
  }

  async sendDirective(request: HermesDirectiveRequest): Promise<{ directiveId: string }> {
    this.#check()
    const text = typeof request.text === 'string' ? request.text.trim() : ''
    if (!text || text.length > 4000) throw new BridgeError('bad_request', 'A directive is 1 to 4000 characters.')
    const directiveId = randomUUID()
    this.#message('user', text, 'junos', directiveId)
    if (this.#running || this.#paused) {
      this.#queue.push({ id: directiveId, directiveId, text, priority: request.priority ?? 'normal', queuedAt: this.#iso() })
      this.#queue.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.queuedAt.localeCompare(b.queuedAt))
      this.#emit({ type: 'queue', queue: this.#publicQueue() })
    } else void this.#drain(directiveId, text)
    return { directiveId }
  }

  #publicQueue(): HermesQueueItem[] {
    return this.#queue.map(({ id, text, priority, queuedAt }) => ({ id, text, priority, queuedAt }))
  }

  subscribe(listener: (update: BridgeUpdate) => void): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  pause(): Promise<void> {
    this.#check()
    this.#paused = true
    this.#setState('paused')
    return Promise.resolve()
  }

  resume(): Promise<void> {
    this.#check()
    this.#paused = false
    this.#resume?.()
    this.#resume = null
    if (!this.#running) {
      this.#setState('idle', null)
      this.#next()
    } else this.#setState('working')
    return Promise.resolve()
  }

  stop(): Promise<{ confirmed: boolean }> {
    this.#check()
    this.#stopFlag += 1
    this.#queue = []
    this.#emit({ type: 'queue', queue: [] })
    for (const [stepId, answer] of this.#waiting) {
      answer('deny')
      this.#waiting.delete(stepId)
    }
    this.#resume?.()
    this.#resume = null
    this.#paused = false
    if (!this.#running) this.#setState('idle', null)
    return Promise.resolve({ confirmed: this.#stopConfirmed })
  }

  memory(): Promise<HermesMemoryItem[]> {
    this.#check()
    return Promise.resolve(this.#memory.map((m) => ({ ...m })))
  }

  setMemory(items: HermesMemoryItem[]): Promise<HermesMemoryItem[]> {
    this.#check()
    this.#memory = items.map((m) => ({ id: m.id, text: m.text, pinned: m.pinned }))
    return this.memory()
  }

  skills(): Promise<HermesSkill[]> {
    this.#check()
    return Promise.resolve(this.#skills.map((s) => ({ ...s })))
  }

  setSkills(toggles: Array<{ id: string; enabled: boolean }>): Promise<HermesSkill[]> {
    this.#check()
    for (const t of toggles) {
      const skill = this.#skills.find((s) => s.id === t.id)
      if (!skill) throw new BridgeError('bad_request', `Unknown skill: ${t.id}`)
      skill.enabled = t.enabled
    }
    return this.skills()
  }

  queue(): Promise<HermesQueueItem[]> {
    this.#check()
    return Promise.resolve(this.#publicQueue())
  }

  decide(stepId: string, decision: 'approve' | 'deny'): Promise<void> {
    this.#check()
    const answer = this.#waiting.get(stepId)
    if (!answer) throw new BridgeError('bad_request', 'That step is not waiting for an approval.')
    this.#waiting.delete(stepId)
    answer(decision)
    return Promise.resolve()
  }

  recent(): Promise<{ steps: HermesStep[]; messages: HermesMessage[] }> {
    this.#check()
    return Promise.resolve({ steps: this.#steps.map((s) => ({ ...s })), messages: this.#messages.map((m) => ({ ...m })) })
  }

  close(): Promise<void> {
    this.#stopFlag += 1
    this.#resume?.()
    for (const answer of this.#waiting.values()) answer('deny')
    this.#waiting.clear()
    this.#listeners.clear()
    return Promise.resolve()
  }

  // ---- the script ----

  #next(): void {
    const item = this.#queue.shift()
    if (!item) return
    this.#emit({ type: 'queue', queue: this.#publicQueue() })
    void this.#drain(item.directiveId, item.text)
  }

  /** Waits one step's time. Holds while paused; throws if Stop was pressed since `epoch`. */
  async #tick(epoch: number): Promise<void> {
    await new Promise((r) => setTimeout(r, this.#stepMs))
    while (this.#paused && this.#stopFlag === epoch) await new Promise<void>((r) => (this.#resume = r))
    if (this.#stopFlag !== epoch) throw new Stopped()
  }

  async #step(epoch: number, directiveId: string, type: HermesStep['type'], summary: string, input: string, output: string, status: HermesStep['status'] = 'done'): Promise<void> {
    const step: HermesStep = { id: randomUUID(), directiveId, type, summary, input, output: '', status: 'running', ms: null, startedAt: this.#iso() }
    this.#pushStep(step)
    const started = this.#now()
    try {
      await this.#tick(epoch)
    } catch (err) {
      this.#pushStep({ ...step, status: 'stopped', ms: this.#now() - started })
      throw err
    }
    this.#pushStep({ ...step, output, status, ms: Math.max(1, this.#now() - started) })
  }

  async #drain(directiveId: string, text: string): Promise<void> {
    this.#running = true
    const epoch = this.#stopFlag
    this.#setState(this.#paused ? 'paused' : 'working', text)
    let reply = `Done: ${text}`
    try {
      const wants = text.toLowerCase()
      await this.#step(epoch, directiveId, 'message', 'Reading the request', text, 'Understood.')
      if (wants.includes('slow')) {
        for (let i = 1; i <= 200; i++) await this.#step(epoch, directiveId, 'shell', `Long task, part ${i}`, `work --part ${i}`, 'ok')
      } else if (wants.includes('fail')) {
        await this.#step(epoch, directiveId, 'shell', 'Run the build', 'npm run build', 'error: build failed', 'failed')
        reply = 'That failed: the build did not pass.'
      } else if (/\b(send|email|post)\b/.test(wants)) {
        await this.#step(epoch, directiveId, 'file', 'Read the draft', 'cat draft.txt', 'Hello, this is the draft.')
        const id = randomUUID()
        const ask = { class: 'external-send' as const, target: 'someone@example.com', summary: 'Send the drafted message' }
        const step: HermesStep = { id, directiveId, type: 'api', summary: ask.summary, input: 'POST /send', output: '', status: 'waiting_approval', ms: null, startedAt: this.#iso(), approval: ask }
        this.#pushStep(step)
        const decision = await new Promise<'approve' | 'deny'>((resolve) => {
          this.#waiting.set(id, resolve)
        })
        if (this.#stopFlag !== epoch) {
          this.#pushStep({ ...step, status: 'stopped', approval: undefined })
          throw new Stopped()
        }
        if (decision === 'approve') {
          const started = this.#now()
          await this.#tick(epoch)
          this.#pushStep({ ...step, status: 'done', output: 'sent (mock: nothing left this machine)', ms: Math.max(1, this.#now() - started), approval: undefined })
          reply = 'Sent it.'
        } else {
          this.#pushStep({ ...step, status: 'denied', output: 'Denied.', approval: undefined })
          reply = 'Understood, I did not send it.'
        }
      } else {
        await this.#step(epoch, directiveId, 'shell', 'List the workspace', 'ls', 'notes.md  draft.txt')
        await this.#step(epoch, directiveId, 'file', 'Write notes.md', 'write notes.md', 'wrote 1 file')
      }
      this.#message('agent', reply, 'junos', directiveId)
    } catch (err) {
      if (!(err instanceof Stopped)) throw err
      this.#message('agent', 'Stopped.', 'junos', directiveId)
    } finally {
      this.#running = false
      this.#setState(this.#paused ? 'paused' : 'idle', null)
      // Anything queued after a Stop is a new request and still runs.
      if (!this.#paused) this.#next()
    }
  }
}
