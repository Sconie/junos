import type { HermesStepType } from '@junos/shared'

/** What the engine watches while Hermes works. */
export interface BackendSink {
  /** Hermes decided to use a tool. */
  toolCall(call: { id: string; name: string; args: string }): void
  /** A tool finished, when Hermes says so. */
  toolResult(id: string, output: string): void
}

/** Hermes as the shim sees it: ask it something and read what it does. A fake stands in for it in tests. */
export interface HermesBackend {
  /** Whether Hermes answers, and the model it reports. */
  health(): Promise<{ ok: boolean; model: string; reason: string | null }>
  /** Asks Hermes and returns its final answer. Rejects on failure; `signal` ends it early. */
  run(prompt: string, signal: AbortSignal, sink: BackendSink): Promise<string>
}

const STEP_TYPE: Array<[RegExp, HermesStepType]> = [
  [/terminal|shell|exec|bash|command|process/i, 'shell'],
  [/brows|web|http|fetch|search|url|navigate|click/i, 'browser'],
  [/file|read|write|patch|edit|grep|glob|dir|ls\b/i, 'file'],
]

export function stepTypeFor(tool: string): HermesStepType {
  for (const [re, type] of STEP_TYPE) if (re.test(tool)) return type
  return 'api'
}

/** Hermes's gateway: an OpenAI-style API (GET /health, GET /v1/models, POST /v1/chat/completions). */
export class HermesApiBackend implements HermesBackend {
  readonly #base: URL
  readonly #key: string | undefined
  readonly #timeoutMs: number
  #model = ''
  #healthNeedsKey = false

  constructor(baseUrl: string, key: string | undefined, timeoutMs = 4000) {
    this.#base = new URL(baseUrl)
    this.#key = key
    this.#timeoutMs = timeoutMs
  }

  #headers(json = false): Record<string, string> {
    return { ...(this.#key ? { authorization: `Bearer ${this.#key}` } : {}), ...(json ? { 'content-type': 'application/json' } : {}) }
  }

  async health(): Promise<{ ok: boolean; model: string; reason: string | null }> {
    let res: Response
    try {
      const get = (withKey: boolean) => fetch(new URL('/health', this.#base), { headers: withKey ? this.#headers() : {}, signal: AbortSignal.timeout(this.#timeoutMs) })
      res = this.#healthNeedsKey && this.#key ? await get(true) : await get(false)
      // Some Hermes setups guard /health with the key too: retry once with it, and remember which worked.
      if ((res.status === 401 || res.status === 403) && this.#key && !this.#healthNeedsKey) {
        const keyed = await get(true)
        if (keyed.ok) this.#healthNeedsKey = true
        res = keyed
      }
    } catch {
      return { ok: false, model: this.#model, reason: 'Hermes did not answer on its API.' }
    }
    if (!res.ok) return { ok: false, model: this.#model, reason: `Hermes answered HTTP ${res.status}.` }
    if (!this.#model && this.#key) {
      try {
        const m = await fetch(new URL('/v1/models', this.#base), { headers: this.#headers(), signal: AbortSignal.timeout(this.#timeoutMs) })
        if (m.ok) {
          const id = ((await m.json()) as { data?: Array<{ id?: unknown }> }).data?.[0]?.id
          if (typeof id === 'string') this.#model = id.slice(0, 80)
        }
      } catch {
        /* the model name is optional */
      }
    }
    return { ok: true, model: this.#model, reason: null }
  }

  async run(prompt: string, signal: AbortSignal, sink: BackendSink): Promise<string> {
    const res = await fetch(new URL('/v1/chat/completions', this.#base), {
      method: 'POST',
      headers: this.#headers(true),
      body: JSON.stringify({ model: this.#model || 'hermes', stream: true, messages: [{ role: 'user', content: prompt }] }),
      signal,
    })
    if (res.status === 401 || res.status === 403) throw new Error('Hermes did not accept its API key. Check HERMES_API_KEY.')
    if (!res.ok || !res.body) throw new Error(`Hermes answered HTTP ${res.status}.`)
    return readChatStream(res.body, sink)
  }
}

interface PendingCall {
  id: string
  name: string
  args: string
  announced: boolean
}

/**
 * Reads an OpenAI-style stream. Text deltas become the answer; tool_calls deltas are collected by index and announced
 * once the model stops to run them. The tool's own output does not come back on this API, so a tool is reported done
 * when the next turn of text or the end of the stream arrives.
 */
export async function readChatStream(body: ReadableStream<Uint8Array>, sink: BackendSink): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const calls = new Map<number, PendingCall>()
  let buffer = ''
  let text = ''
  const announce = () => {
    for (const call of calls.values()) {
      if (call.announced || !call.name) continue
      call.announced = true
      sink.toolCall({ id: call.id, name: call.name, args: call.args })
    }
  }
  const finishTools = () => {
    for (const call of calls.values()) if (call.announced) sink.toolResult(call.id, '')
    calls.clear()
  }
  const handle = (data: string): boolean => {
    if (data === '[DONE]') return true
    let chunk: { choices?: Array<{ delta?: { content?: unknown; tool_calls?: unknown }; finish_reason?: unknown }> }
    try {
      chunk = JSON.parse(data)
    } catch {
      return false
    }
    const choice = chunk.choices?.[0]
    const delta = choice?.delta
    if (typeof delta?.content === 'string' && delta.content) {
      if (calls.size > 0) finishTools()
      text += delta.content
    }
    if (Array.isArray(delta?.tool_calls)) {
      for (const raw of delta.tool_calls as Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }>) {
        const index = typeof raw.index === 'number' ? raw.index : 0
        const call = calls.get(index) ?? { id: raw.id ?? `tool-${index}-${calls.size}`, name: '', args: '', announced: false }
        if (raw.id) call.id = raw.id
        if (raw.function?.name) call.name += raw.function.name
        if (raw.function?.arguments) call.args += raw.function.arguments
        calls.set(index, call)
      }
    }
    if (choice?.finish_reason === 'tool_calls' || choice?.finish_reason === 'stop') announce()
    return false
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let i
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).trim()
      buffer = buffer.slice(i + 1)
      if (!line.startsWith('data:')) continue
      if (handle(line.slice(5).trim())) {
        announce()
        finishTools()
        return text
      }
    }
  }
  announce()
  finishTools()
  return text
}
