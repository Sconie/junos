import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { EventStore } from './store.ts'

export const SESSION_COOKIE = 'junos_session'
export const CSRF_HEADER = 'x-junos-csrf'
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60
export const SESSION_TTL_MS = SESSION_MAX_AGE_S * 1000

// No 0/O/1/I so a code read off a terminal is hard to mistype.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type RedeemResult = 'ok' | 'invalid' | 'expired' | 'locked'

export interface PairingOptions {
  now?: () => number
  ttlMs?: number
  maxAttempts?: number
  /** Called with the new code, or null when the code is used up or gone. Never log it anywhere else. */
  onCode?: (code: string | null, expiresAt: number | null) => void
}

const normalise = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** One-time pairing code: single use, expires, and is replaced after too many wrong guesses. */
export class Pairing {
  readonly #now: () => number
  readonly #ttlMs: number
  readonly #maxAttempts: number
  readonly #onCode: NonNullable<PairingOptions['onCode']>
  #code: string | null = null
  #expiresAt = 0
  #attempts = 0

  constructor(options: PairingOptions = {}) {
    this.#now = options.now ?? Date.now
    this.#ttlMs = options.ttlMs ?? 10 * 60_000
    this.#maxAttempts = options.maxAttempts ?? 5
    this.#onCode = options.onCode ?? (() => {})
  }

  /** Replaces any earlier code. Returns it formatted as XXXX-XXXX. */
  issue(): { code: string; expiresAt: number } {
    let raw = ''
    for (let i = 0; i < 8; i++) raw += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
    this.#code = raw
    this.#expiresAt = this.#now() + this.#ttlMs
    this.#attempts = 0
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`
    this.#onCode(code, this.#expiresAt)
    return { code, expiresAt: this.#expiresAt }
  }

  /** Ensures an owner can pair again without invalidating a still-valid code. */
  ensureAvailable(): void {
    if (this.#code !== null && this.#now() <= this.#expiresAt) return
    this.issue()
  }

  redeem(input: string): RedeemResult {
    if (this.#code === null) return 'invalid'
    if (this.#now() > this.#expiresAt) {
      this.#clear()
      return 'expired'
    }
    if (safeEqual(normalise(input), this.#code)) {
      this.#clear()
      return 'ok'
    }
    this.#attempts += 1
    if (this.#attempts >= this.#maxAttempts) {
      this.issue() // the old code is dead; a fresh one is announced where the owner can see it
      return 'locked'
    }
    return 'invalid'
  }

  #clear(): void {
    this.#code = null
    this.#onCode(null, null)
  }
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export interface SessionInfo {
  id: string
  csrf: string
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

export function createSession(store: EventStore, now: () => number = Date.now): { token: string; csrf: string; id: string } {
  const token = randomBytes(32).toString('base64url')
  const csrf = randomBytes(16).toString('base64url')
  const id = randomUUID()
  store.createSession(id, sha256(token), csrf, now())
  return { token, csrf, id }
}

export function sessionFromRequest(store: EventStore, req: IncomingMessage, now: () => number = Date.now): SessionInfo | undefined {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  return token ? store.sessionByHash(sha256(token), now()) : undefined
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE_S}`
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
}

export function csrfOk(session: SessionInfo, req: IncomingMessage): boolean {
  const header = req.headers[CSRF_HEADER]
  return typeof header === 'string' && safeEqual(header, session.csrf)
}

/**
 * Host and Origin allow-lists. The Host check blocks DNS rebinding (a hostile name that resolves to
 * 127.0.0.1); the Origin check blocks drive-by pages. Origin is optional on reads, required on writes.
 */
export class RequestPolicy {
  readonly #hosts = new Set<string>()
  readonly #origins = new Set<string>()

  constructor(port: number, extraUiOrigins: string[]) {
    for (const name of ['127.0.0.1', 'localhost']) {
      this.#hosts.add(`${name}:${port}`)
      this.#origins.add(`http://${name}:${port}`)
    }
    for (const origin of extraUiOrigins) this.#origins.add(origin)
  }

  hostOk(req: IncomingMessage): boolean {
    const host = req.headers.host
    return typeof host === 'string' && this.#hosts.has(host.toLowerCase())
  }

  /** `null` means "no Origin header". */
  originOk(origin: string | undefined, write: boolean): boolean {
    if (origin === undefined) return !write
    return this.#origins.has(origin.toLowerCase())
  }
}
