import type { HermesDirectiveRequest, HermesMemoryItem, HermesMessage, HermesQueueItem, HermesSkill, HermesStatus, HermesStep } from '@junos/shared'
import { BridgeError, type BridgeUpdate, type HermesBridge } from './bridge.ts'
import { privateHermesHost } from './http.ts'

export interface ShimHermesOptions {
  /** Where the shim listens: on this machine (an SSH tunnel) or on the tailnet. Never the public internet. */
  baseUrl: string
  /** The key the shim expects, sent as a bearer token to that one address. Kept in memory; never logged or stored. */
  apiKey: string | undefined
  now?: () => number
  /** How long a plain request may take (default 8 s). */
  timeoutMs?: number
  /** First wait before the event stream reconnects (default 1 s, doubling to 15 s). */
  reconnectMs?: number
}

/** The wire version this daemon speaks. A shim reporting another is refused with a clear message. */
const PROTOCOL = 1

/**
 * The real Hermes through the shim that sits next to it on the VPS (apps/hermes-shim). The shim has what Hermes's own API
 * lacks: a step stream, memory, skills, a queue and approvals. This class only carries them: one request per call, and one
 * long event stream that reconnects on its own and resumes by `Last-Event-ID`, so a dropped tunnel loses nothing.
 */
export class ShimHermes implements HermesBridge {
  readonly mode = 'remote' as const
  readonly #base: URL
  readonly #key: string | undefined
  readonly #timeoutMs: number
  readonly #reconnectMs: number
  readonly #listeners = new Set<(u: BridgeUpdate) => void>()
  #abort: AbortController | null = null
  #lastSeq = 0
  #closed = false
  #checked = false

  constructor(options: ShimHermesOptions) {
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
    this.#timeoutMs = options.timeoutMs ?? 8000
    this.#reconnectMs = options.reconnectMs ?? 1000
  }

  #headers(json = false): Record<string, string> {
    return { ...(this.#key ? { authorization: `Bearer ${this.#key}` } : {}), ...(json ? { 'content-type': 'application/json' } : {}) }
  }

  async #call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(new URL(path, this.#base), {
        method,
        headers: this.#headers(body !== undefined),
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.#timeoutMs),
      })
    } catch {
      throw new BridgeError('unreachable', 'The Hermes shim did not answer. Is the tunnel or Tailscale up, and is the shim running?')
    }
    if (res.status === 401 || res.status === 403 || res.status === 429) throw new BridgeError('bad_request', 'The Hermes shim did not accept the key. Check JUNOS_HERMES_KEY.')
    if (!res.ok) {
      const info = (await res.json().catch(() => ({}))) as { message?: unknown }
      const message = typeof info.message === 'string' ? info.message : `The Hermes shim answered HTTP ${res.status}.`
      throw new BridgeError(res.status >= 500 ? 'unreachable' : 'bad_request', message)
    }
    return (await res.json()) as T
  }

  /** Confirms once that what answers is a shim of this version, not Hermes's own API. */
  async #checkShim(): Promise<void> {
    if (this.#checked) return
    let info: { name?: unknown; protocol?: unknown }
    try {
      const res = await fetch(new URL('/shim/health', this.#base), { signal: AbortSignal.timeout(this.#timeoutMs) })
      info = res.ok ? ((await res.json()) as { name?: unknown; protocol?: unknown }) : {}
    } catch {
      throw new BridgeError('unreachable', 'The Hermes shim did not answer. Is the tunnel or Tailscale up, and is the shim running?')
    }
    if (info.name !== 'junos-hermes-shim') throw new BridgeError('bad_request', 'That address is not the JunOS Hermes shim. Point JUNOS_HERMES_URL at the shim (port 8650 by default), or leave JUNOS_HERMES_PROTOCOL unset to use Hermes’s API.')
    if (info.protocol !== PROTOCOL) throw new BridgeError('bad_request', 'The shim speaks another protocol version. Update the shim or junosd so they match.')
    this.#checked = true
  }

  async #shim<T>(method: string, path: string, body?: unknown): Promise<T> {
    await this.#checkShim()
    return this.#call<T>(method, path, body)
  }

  async status(): Promise<HermesStatus> {
    try {
      return await this.#shim<HermesStatus>('GET', '/v1/status')
    } catch (err) {
      if (err instanceof BridgeError) return { state: err.code === 'unreachable' ? 'unreachable' : 'error', currentTask: null, model: '', uptimeS: null, reason: err.message }
      throw err
    }
  }

  async sendDirective(request: HermesDirectiveRequest): Promise<{ directiveId: string }> {
    return this.#shim('POST', '/v1/directives', { text: request.text, priority: request.priority, projectId: request.projectId, echoToTelegram: request.echoToTelegram })
  }

  async pause(): Promise<void> {
    await this.#shim('POST', '/v1/pause')
  }
  async resume(): Promise<void> {
    await this.#shim('POST', '/v1/resume')
  }
  async stop(): Promise<{ confirmed: boolean }> {
    try {
      return await this.#shim<{ confirmed: boolean }>('POST', '/v1/stop')
    } catch (err) {
      // A stop that could not be delivered is not a confirmed stop; the service tells the owner to check.
      if (err instanceof BridgeError && err.code === 'unreachable') return { confirmed: false }
      throw err
    }
  }
  async memory(): Promise<HermesMemoryItem[]> {
    return (await this.#shim<{ items: HermesMemoryItem[] }>('GET', '/v1/memory')).items
  }
  async setMemory(items: HermesMemoryItem[]): Promise<HermesMemoryItem[]> {
    return (await this.#shim<{ items: HermesMemoryItem[] }>('PUT', '/v1/memory', { items })).items
  }
  async skills(): Promise<HermesSkill[]> {
    return (await this.#shim<{ skills: HermesSkill[] }>('GET', '/v1/skills')).skills
  }
  async setSkills(toggles: Array<{ id: string; enabled: boolean }>): Promise<HermesSkill[]> {
    return (await this.#shim<{ skills: HermesSkill[] }>('PUT', '/v1/skills', { skills: toggles })).skills
  }
  async queue(): Promise<HermesQueueItem[]> {
    return (await this.#shim<{ queue: HermesQueueItem[] }>('GET', '/v1/queue')).queue
  }
  async decide(stepId: string, decision: 'approve' | 'deny'): Promise<void> {
    await this.#shim('POST', `/v1/steps/${encodeURIComponent(stepId)}/decision`, { decision })
  }
  async recent(): Promise<{ steps: HermesStep[]; messages: HermesMessage[] }> {
    const r = await this.#shim<{ steps: HermesStep[]; messages: HermesMessage[] }>('GET', '/v1/recent')
    return { steps: r.steps ?? [], messages: r.messages ?? [] }
  }

  // ---- the event stream ----

  subscribe(listener: (u: BridgeUpdate) => void): () => void {
    this.#listeners.add(listener)
    if (!this.#abort && !this.#closed) void this.#stream()
    return () => {
      this.#listeners.delete(listener)
      if (this.#listeners.size === 0) this.#abort?.abort()
    }
  }

  #emit(update: BridgeUpdate): void {
    for (const fn of this.#listeners) fn(update)
  }

  async #stream(): Promise<void> {
    let wait = this.#reconnectMs
    while (!this.#closed && this.#listeners.size > 0) {
      const abort = new AbortController()
      this.#abort = abort
      try {
        await this.#checkShim()
        const res = await fetch(new URL(`/v1/events?lastEventId=${this.#lastSeq}`, this.#base), { headers: { ...this.#headers(), accept: 'text/event-stream' }, signal: abort.signal })
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
        wait = this.#reconnectMs
        await this.#read(res.body)
      } catch {
        /* the status poll reports the reason; here we only try again */
      }
      this.#abort = null
      if (this.#closed || this.#listeners.size === 0) return
      await new Promise((r) => setTimeout(r, wait).unref())
      wait = Math.min(wait * 2, 15_000)
    }
  }

  async #read(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      let at
      while ((at = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, at)
        buffer = buffer.slice(at + 2)
        await this.#block(block)
      }
    }
  }

  async #block(block: string): Promise<void> {
    let event = 'message'
    let id: string | undefined
    const data: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('id:')) id = line.slice(3).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).trim())
    }
    if (event === 'resync') {
      // The shim cannot replay what was missed: read its ring buffer instead, and carry on from where it is now.
      try {
        const info = JSON.parse(data.join('\n')) as { lastSeq?: number }
        if (typeof info.lastSeq === 'number') this.#lastSeq = info.lastSeq
        const recent = await this.recent()
        for (const message of recent.messages) this.#emit({ type: 'message', message })
        for (const step of recent.steps) this.#emit({ type: 'step', step })
      } catch {
        /* the next poll catches up */
      }
      return
    }
    if (event !== 'message' || data.length === 0) return
    let update: BridgeUpdate
    try {
      update = JSON.parse(data.join('\n')) as BridgeUpdate
    } catch {
      return
    }
    if (id !== undefined && Number.isFinite(Number(id))) this.#lastSeq = Math.max(this.#lastSeq, Number(id))
    if (update && typeof update === 'object' && typeof update.type === 'string') this.#emit(update)
  }

  async close(): Promise<void> {
    this.#closed = true
    this.#abort?.abort()
    this.#listeners.clear()
  }
}
