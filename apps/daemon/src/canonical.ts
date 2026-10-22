import { createHash } from 'node:crypto'

/**
 * Deterministic JSON: object keys sorted at every depth, so equal arguments always produce the same
 * bytes whatever order they were built in. Values JSON cannot represent are refused instead of being
 * dropped silently, because a dropped argument would let two different actions share a digest.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('non-finite number in action')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`
  }
  throw new TypeError(`unsupported ${typeof value} in action`)
}

export interface ActionRecord {
  actor: string
  tool: string
  args: Record<string, unknown>
  target: string
  class: string
  cwd: string
  project: string
}

/** The digest an approval is bound to (spec 12: actor, tool, normalised args, target, class, cwd). */
export function actionDigest(action: ActionRecord): string {
  return createHash('sha256').update(canonicalize(action)).digest('hex')
}

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
]
const SECRET_KEY = /pass(word)?|secret|token|api[-_]?key|authorization|cookie|credential/i

/** Copy of `value` with secret-looking strings and secret-named fields masked, for display and audit. */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') return SECRET_PATTERNS.reduce((s, re) => s.replace(re, '[redacted]'), value)
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[redacted]' : redact(v)]),
    )
  }
  return value
}
