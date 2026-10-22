import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import type { ConnectionRecord, ConnectionState, ProviderId } from '@junos/shared'
import type { ProviderAdapter } from './adapters/types.ts'
import { capture, resolveLauncher, type Launch } from './cli.ts'
import type { EventStore } from './store.ts'

/** How long a rate limit with no known reset time is assumed to last (the shortest plan window). */
const UNKNOWN_RESET_MS = 5 * 60 * 60 * 1000

export interface ConnectionsOptions {
  store: EventStore
  adapters: ProviderAdapter[]
  env: NodeJS.ProcessEnv
  now?: () => number
}

/**
 * The Connections screen's data: one record per provider with a single state enum (spec 03).
 * Everything here comes from offline login checks and from what earlier runs recorded; nothing is
 * sent to a provider to find out.
 */
export class ConnectionsService {
  readonly #store: EventStore
  readonly #adapters: ProviderAdapter[]
  readonly #env: NodeJS.ProcessEnv
  readonly #now: () => number

  constructor(options: ConnectionsOptions) {
    this.#store = options.store
    this.#adapters = options.adapters
    this.#env = options.env
    this.#now = options.now ?? Date.now
  }

  async list(): Promise<ConnectionRecord[]> {
    const checkedAt = new Date(this.#now()).toISOString()
    const live = await Promise.all(
      this.#adapters.map(async (a): Promise<ConnectionRecord> => {
        const c = await a.connection()
        const withLimit = this.#withRateLimit(a.id, c.state, c.detail)
        return {
          provider: a.id,
          label: LABEL[a.id],
          state: withLimit.state,
          detail: withLimit.detail,
          method: c.method,
          plan: c.plan,
          version: c.version,
          chat: true,
          note: null,
          reconnect: c.reconnect,
          resetsAt: withLimit.resetsAt,
          checkedAt,
        }
      }),
    )
    const cursor = await this.#cursor(checkedAt)
    return [
      ...order(live),
      cursor,
      {
        provider: 'grok',
        label: LABEL.grok,
        state: 'unavailable',
        detail: 'No supported sign-in route exists yet, so it is planned but not part of v1.',
        method: null,
        plan: null,
        version: null,
        chat: false,
        note: 'coming',
        reconnect: null,
        resetsAt: null,
        checkedAt,
      },
      {
        provider: 'nous',
        label: LABEL.nous,
        state: 'unknown',
        detail: 'Nous Portal is reached through Hermes, not on its own. Its status will come from the Hermes connection.',
        method: null,
        plan: null,
        version: null,
        chat: false,
        note: 'via_hermes',
        reconnect: null,
        resetsAt: null,
        checkedAt,
      },
    ]
  }

  /** A recorded rate limit that has not lifted yet turns a connected provider into rate_limited. */
  #withRateLimit(provider: ProviderId, state: ConnectionState, detail: string): { state: ConnectionState; detail: string; resetsAt: string | null } {
    if (state !== 'connected') return { state, detail, resetsAt: null }
    const row = this.#store.db
      .prepare(`SELECT payload_json, created_at FROM event WHERE type = 'provider.rate_limited' AND ref_id = ? ORDER BY seq DESC LIMIT 1`)
      .get(provider) as { payload_json: string; created_at: string } | undefined
    if (!row) return { state, detail, resetsAt: null }
    const payload = JSON.parse(row.payload_json) as { resetsAt?: string | null; at?: string }
    const now = this.#now()
    const until = payload.resetsAt ? Date.parse(payload.resetsAt) : Date.parse(payload.at ?? row.created_at) + UNKNOWN_RESET_MS
    if (!Number.isFinite(until) || until <= now) return { state, detail, resetsAt: null }
    const when = payload.resetsAt ? `until ${new Date(until).toLocaleString()}` : 'for a few hours'
    return { state: 'rate_limited', detail: `The plan limit was reached; it should lift ${when}.`, resetsAt: payload.resetsAt ?? null }
  }

  async #cursor(checkedAt: string): Promise<ConnectionRecord> {
    const base = {
      provider: 'cursor' as const,
      label: LABEL.cursor,
      plan: null,
      chat: false,
      note: 'chat_later' as const,
      reconnect: 'cursor-agent login',
      resetsAt: null,
      checkedAt,
    }
    const launch = this.#cursorLauncher()
    if (!launch) {
      return { ...base, state: 'unavailable', detail: 'The Cursor agent CLI was not found. Install it from cursor.com.', method: null, version: null }
    }
    const [version, status] = await Promise.all([capture(launch, ['--version'], this.#env), capture(launch, ['status'], this.#env)])
    const v = version.ok ? (version.stdout.trim().split(/\r?\n/)[0] ?? null) : null
    const text = `${status.stdout}\n${status.stderr}`
    if (/logged in/i.test(text) && !/not logged in/i.test(text)) {
      return { ...base, state: 'connected', detail: 'Signed in. Chat through Cursor is the next step; the sign-in works today.', method: 'Signed in via CLI', version: v }
    }
    if (/not logged in|log in|login/i.test(text) || (!status.ok && version.ok)) {
      return { ...base, state: 'needs_login', detail: 'Not signed in. Run the command below, then check again.', method: null, version: v }
    }
    return { ...base, state: 'unknown', detail: 'Could not read the Cursor login status.', method: null, version: v }
  }

  /** `cursor-agent` is a PowerShell/cmd shim on Windows; only fixed words (status, --version) are passed, so cmd.exe is safe. */
  #cursorLauncher(): Launch | null {
    const override = this.#env.JUNOS_CURSOR_BIN
    if (override) return resolveLauncher(override, this.#env)
    if (process.platform === 'win32') {
      const found = resolveLauncher('cursor-agent', this.#env) ?? resolveShim(this.#env)
      return found ? { command: 'cmd.exe', prefix: ['/d', '/s', '/c', 'cursor-agent'] } : null
    }
    return resolveLauncher('cursor-agent', this.#env)
  }
}

const LABEL: Record<ProviderId, string> = {
  claude: 'Claude',
  codex: 'Codex (ChatGPT)',
  cursor: 'Cursor',
  grok: 'Grok (X)',
  nous: 'Nous Portal',
}

const order = (list: ConnectionRecord[]) => [...list].sort((a, b) => (a.provider === 'claude' ? -1 : b.provider === 'claude' ? 1 : 0))

/** Looks for the .cmd, .ps1 or .exe shim of the Cursor agent on PATH. */
function resolveShim(env: NodeJS.ProcessEnv): string | null {
  const dirs = (env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean)
  for (const dir of dirs) {
    for (const ext of ['.cmd', '.ps1', '.exe']) {
      const candidate = join(dir, 'cursor-agent' + ext)
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}
