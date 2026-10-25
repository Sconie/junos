import { closeSync, existsSync, openSync, readSync, statSync } from 'node:fs'

export interface MirroredMessage {
  role: 'user' | 'agent'
  text: string
  via: 'telegram'
  createdAt?: string
}

const MAX_READ = 1024 * 1024

/**
 * Turns one line of Hermes's conversation log into a message to mirror, or null. The log is JSON lines; a line counts when
 * it names Telegram as where it was said (`via`, `source` or `platform`) and carries text for the user or for Hermes.
 * Anything else, including a line that is not JSON, is skipped.
 */
export function parseLogLine(line: string): MirroredMessage | null {
  let o: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(line)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    o = parsed as Record<string, unknown>
  } catch {
    return null
  }
  const where = String(o.via ?? o.source ?? o.platform ?? '').toLowerCase()
  if (where !== 'telegram') return null
  const roleRaw = String(o.role ?? '').toLowerCase()
  const role = roleRaw === 'user' ? 'user' : roleRaw === 'assistant' || roleRaw === 'agent' ? 'agent' : null
  const text = typeof o.text === 'string' ? o.text : typeof o.content === 'string' ? o.content : ''
  if (!role || !text.trim()) return null
  const ts = o.ts ?? o.timestamp ?? o.created_at
  const createdAt = typeof ts === 'string' && !Number.isNaN(Date.parse(ts)) ? new Date(ts).toISOString() : typeof ts === 'number' ? new Date(ts < 1e12 ? ts * 1000 : ts).toISOString() : undefined
  return { role, text: text.slice(0, 8000), via: 'telegram', createdAt }
}

/**
 * Follows the end of a growing log file. It starts at the end, so history from before the shim started is not replayed,
 * remembers a half-written last line until it is finished, and starts over when the file shrinks (rotation).
 */
export class ConversationTail {
  readonly #path: string
  readonly #onMessage: (m: MirroredMessage) => void
  readonly #pollMs: number
  #offset = 0
  #partial = ''
  #timer: ReturnType<typeof setInterval> | null = null
  #primed = false
  #fromStart: boolean

  constructor(path: string, onMessage: (m: MirroredMessage) => void, options: { pollMs?: number; fromStart?: boolean } = {}) {
    this.#path = path
    this.#onMessage = onMessage
    this.#pollMs = options.pollMs ?? 1000
    this.#fromStart = options.fromStart ?? false
  }

  start(): void {
    this.poll()
    this.#timer = setInterval(() => this.poll(), this.#pollMs)
    this.#timer.unref()
  }

  stop(): void {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = null
  }

  /** Reads what was added since the last look. Exposed so tests do not wait for the timer. */
  poll(): void {
    if (!existsSync(this.#path)) return
    let size: number
    try {
      size = statSync(this.#path).size
    } catch {
      return
    }
    if (!this.#primed) {
      this.#primed = true
      if (!this.#fromStart) {
        this.#offset = size
        return
      }
    }
    if (size < this.#offset) {
      this.#offset = 0
      this.#partial = ''
    }
    if (size === this.#offset) return
    const want = Math.min(size - this.#offset, MAX_READ)
    const buf = Buffer.alloc(want)
    let fd: number | undefined
    try {
      fd = openSync(this.#path, 'r')
      const got = readSync(fd, buf, 0, want, this.#offset)
      this.#offset += got
      const lines = (this.#partial + buf.subarray(0, got).toString('utf8')).split('\n')
      this.#partial = lines.pop() ?? ''
      for (const line of lines) {
        const m = line.trim() ? parseLogLine(line) : null
        if (m) this.#onMessage(m)
      }
    } catch {
      /* the file is busy or gone; the next look tries again */
    } finally {
      if (fd !== undefined) closeSync(fd)
    }
  }
}
