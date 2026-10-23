import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import type { HermesDirectiveRequest, HermesMemoryItem, HermesMessage, HermesQueueItem, HermesSkill, HermesState, HermesStatus, HermesStep } from '@junos/shared'
import { BridgeError, type BridgeUpdate, type HermesBridge } from './bridge.ts'

export interface HttpHermesOptions {
  /** Where Hermes's API is reached: on this machine (an SSH tunnel) or on the tailnet. Never the public internet. */
  baseUrl: string
  /** Hermes's API key. Kept in memory and sent as a bearer token to that one address; never logged or stored. */
  apiKey?: string
  now?: () => number
  /** How long a status check may take (default 4 s). */
  statusTimeoutMs?: number
}

const PRIORITY = { high: 0, normal: 1, low: 2 } as const

/** True for this machine, the tailnet (100.64.0.0/10, `.ts.net`) and nothing else. */
export function privateHermesHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.ts.net')) return true
  if (isIP(h) === 4) {
    const [a, b] = h.split('.').map(Number) as [number, number]
    return a === 127 || (a === 100 && b >= 64 && b <= 127)
  }
  return h === '::1'
}

/**
 * Talks to Hermes through the OpenAI-style API its gateway offers (GET /health, GET /v1/models, POST /v1/chat/completions),
 * reached over an SSH tunnel or Tailscale. That API carries a conversation and nothing more: it has no step stream, memory,
 * skills, queue or approvals, so those stay unsupported here until the shim on the VPS exists. What it can do is real:
 * a directive becomes a streamed question to Hermes, its answer becomes a message, and Stop closes the connection.
 */
export class HttpHermes implements HermesBridge {
  readonly mode = 'remote' as const
  readonly #base: URL
  readonly #key: string | undefined
  readonly #now: () => number
  readonly #statusTimeoutMs: number
  readonly #listeners = new Set<(u: BridgeUpdate) => void>()
  readonly #started: number
  #queue: Array<HermesQueueItem & { directiveId: string }> = []
  #paused = false
  #current: { directiveId: string; text: string; abort: AbortController } | null = null
  #model = ''
  #steps: HermesStep[] = []
  #messages: HermesMessage[] = []

  constructor(options: HttpHermesOptions) {
    let url: URL
    try {
      url = new URL(options.baseUrl)
    } catch {
      throw new BridgeError('bad_request', 'The Hermes address is not a web address.')
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BridgeError('bad_request', 'The Hermes address must be http or https.')
    if (url.username || url.password) throw new BridgeError('bad_request', 'The Hermes address must not contain a password.')
    if (!privateHermesHost(url.hostname)) throw new BridgeError('bad_request', 'Hermes is only reached on this machine or over Tailscale, never on the public internet.')
    this.#base = url
    this.#key = options.apiKey || undefined
    this.#now = options.now ?? Date.now
    this.#statusTimeoutMs = options.statusTimeoutMs ?? 4000
    this.#started = this.#now()
  }

  #iso(): string {
    return new Date(this.#now()).toISOString()
  }

  #emit(update: BridgeUpdate): void {
    for (const fn of this.#listeners) fn(update)
  }

  #headers(json = false): Record<string, string> {
    return { ...(this.#key ? { authorization: `Bearer ${this.#key}` } : {}), ...(json ? { 'content-type': 'application/json' } : {}) }
  }

  #state(): HermesState {
    return this.#paused ? 'paused' : this.#current ? 'working' : 'idle'
  }

  async status(): Promise<HermesStatus> {
    let health: Response
    try {
      health = await fetch(new URL('/health', this.#base), { signal: AbortSignal.timeout(this.#statusTimeoutMs) })
    } catch {
      return { state: 'unreachable', currentTask: null, model: this.#model, uptimeS: null, reason: 'Hermes did not answer. Is the tunnel or Tailscale up?' }
    }
    if (!health.ok) return { state: 'error', currentTask: null, model: this.#model, uptimeS: null, reason: `Hermes answered HTTP ${health.status}.` }
    // "degraded" (an unconfigured chat service, say) does not stop it answering, so it is not an error.
    if (!this.#model && this.#key) await this.#readModel()
    return { state: this.#state(), currentTask: this.#current?.text ?? null, model: this.#model, uptimeS: Math.max(0, Math.round((this.#now() - this.#started) / 1000)), reason: null }
  }

  async #readModel(): Promise<void> {
    try {
      const res = await fetch(new URL('/v1/models', this.#base), { headers: this.#headers(), signal: AbortSignal.timeout(this.#statusTimeoutMs) })
      if (!res.ok) return
      const body = (await res.json()) as { data?: Array<{ id?: unknown }> }
      const id = body.data?.[0]?.id
      if (typeof id === 'string') this.#model = id.slice(0, 80)
    } catch {
      /* the model name is optional */
    }
  }

  #message(role: 'user' | 'agent', text: string, directiveId: string): void {
    const message: HermesMessage = { id: randomUUID(), role, text, via: 'junos', directiveId, createdAt: this.#iso() }
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

  #publishState(): void {
    this.status().then(
      (s) => this.#emit({ type: 'status', status: s }),
      () => {},
    )
  }

  async sendDirective(request: HermesDirectiveRequest): Promise<{ directiveId: string }> {
    const text = typeof request.text === 'string' ? request.text.trim() : ''
    if (!text || text.length > 4000) throw new BridgeError('bad_request', 'A directive is 1 to 4000 characters.')
    const directiveId = randomUUID()
    this.#message('user', text, directiveId)
    if (this.#current || this.#paused) {
      this.#queue.push({ id: directiveId, directiveId, text, priority: request.priority ?? 'normal', queuedAt: this.#iso() })
      this.#queue.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.queuedAt.localeCompare(b.queuedAt))
      this.#emit({ type: 'queue', queue: this.#publicQueue() })
    } else void this.#run(directiveId, text)
    return { directiveId }
  }

  #publicQueue(): HermesQueueItem[] {
    return this.#queue.map(({ id, text, priority, queuedAt }) => ({ id, text, priority, queuedAt }))
  }

  async #run(directiveId: string, text: string): Promise<void> {
    const abort = new AbortController()
    this.#current = { directiveId, text, abort }
    this.#publishState()
    const step: HermesStep = { id: randomUUID(), directiveId, type: 'message', summary: 'Asked Hermes', input: text, output: '', status: 'running', ms: null, startedAt: this.#iso() }
    this.#step(step)
    const began = this.#now()
    let outcome: 'done' | 'failed' | 'stopped' = 'done'
    let reply = ''
    try {
      const res = await fetch(new URL('/v1/chat/completions', this.#base), {
        method: 'POST',
        headers: this.#headers(true),
        body: JSON.stringify({ model: this.#model || 'hermes', stream: true, messages: [{ role: 'user', content: text }] }),
        signal: abort.signal,
      })
      if (res.status === 401 || res.status === 403) throw new Error('Hermes did not accept the API key. Check JUNOS_HERMES_KEY.')
      if (!res.ok || !res.body) throw new Error(`Hermes answered HTTP ${res.status}.`)
      reply = await readStream(res.body)
      if (!reply.trim()) throw new Error('Hermes sent no answer.')
    } catch (err) {
      if (abort.signal.aborted) outcome = 'stopped'
      else {
        outcome = 'failed'
        reply = err instanceof Error && !/fetch failed|terminated/i.test(err.message) ? err.message : 'Hermes could not be reached.'
      }
    }
    const ms = Math.max(1, this.#now() - began)
    this.#step({ ...step, status: outcome === 'done' ? 'done' : outcome === 'stopped' ? 'stopped' : 'failed', output: reply.slice(0, 4000), ms })
    const shown = outcome === 'stopped' ? 'Stopped.' : outcome === 'failed' ? `That failed: ${reply}` : reply
    this.#message('agent', shown, directiveId)
    this.#current = null
    this.#emit({ type: 'directive', directiveId, outcome, summary: shown.slice(0, 4000) })
    this.#publishState()
    if (!this.#paused) this.#next()
  }

  #next(): void {
    const item = this.#queue.shift()
    if (!item) return
    this.#emit({ type: 'queue', queue: this.#publicQueue() })
    void this.#run(item.directiveId, item.text)
  }

  subscribe(listener: (u: BridgeUpdate) => void): () => void {
    this.#listeners.add(listener)
    return () => void this.#listeners.delete(listener)
  }

  async pause(): Promise<void> {
    this.#paused = true
    this.#publishState()
  }

  async resume(): Promise<void> {
    this.#paused = false
    this.#publishState()
    if (!this.#current) this.#next()
  }

  /**
   * Closes the connection to Hermes and drops what was queued. Hermes's API cannot say whether its own work ended, so a stop
   * while something was in flight is reported as not confirmed, and the owner is told to check.
   */
  async stop(): Promise<{ confirmed: boolean }> {
    const inFlight = this.#current !== null
    this.#queue = []
    this.#emit({ type: 'queue', queue: [] })
    this.#current?.abort.abort()
    this.#paused = false
    return { confirmed: !inFlight }
  }

  async memory(): Promise<HermesMemoryItem[]> {
    return []
  }
  async setMemory(): Promise<HermesMemoryItem[]> {
    throw new BridgeError('unsupported', 'Hermes’s memory is not reachable through its API yet. It needs the shim on the VPS.')
  }
  async skills(): Promise<HermesSkill[]> {
    return []
  }
  async setSkills(): Promise<HermesSkill[]> {
    throw new BridgeError('unsupported', 'Hermes’s skills are not reachable through its API yet. It needs the shim on the VPS.')
  }
  async queue(): Promise<HermesQueueItem[]> {
    return this.#publicQueue()
  }
  async decide(): Promise<void> {
    throw new BridgeError('unsupported', 'Approvals inside Hermes need the shim on the VPS.')
  }
  async recent(): Promise<{ steps: HermesStep[]; messages: HermesMessage[] }> {
    return { steps: this.#steps.map((s) => ({ ...s })), messages: this.#messages.map((m) => ({ ...m })) }
  }
  async close(): Promise<void> {
    this.#current?.abort.abort()
    this.#listeners.clear()
  }
}

/** The text of an OpenAI-style streamed answer (`data: {...}` lines ending with `[DONE]`). */
async function readStream(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let i
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).trim()
      buffer = buffer.slice(i + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return text
      try {
        const delta = (JSON.parse(data) as { choices?: Array<{ delta?: { content?: unknown } }> }).choices?.[0]?.delta?.content
        if (typeof delta === 'string') text += delta
      } catch {
        /* a line that is not JSON is skipped */
      }
    }
  }
  return text
}
