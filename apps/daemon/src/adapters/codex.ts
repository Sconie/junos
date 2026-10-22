import type { RunEvent } from '@junos/shared'
import { capture, cliEnv, resolveCodexLauncher } from '../cli.ts'
import type { RunManager } from '../runs.ts'
import { classifyError } from './claude.ts'
import type { AdapterConnection, AdapterRunRequest, AdapterStatus, ProviderAdapter } from './types.ts'

/**
 * Codex reasoning effort (`-c model_reasoning_effort`). JunOS's scale is wider than Codex's, so `max`
 * maps to the highest level Codex has and the picker does not offer it (spec 03: greyed where absent).
 */
export const CODEX_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const

/**
 * `codex exec --json` from the recorded run in test/fixtures and `codex exec --help` (0.163.0).
 * Read-only sandbox, no session files, no user config or rules, and the working directory is an empty
 * folder. The prompt is read from stdin (`-`), never put on the command line.
 */
export function codexArgs(model: string, effort: string, cwd: string): string[] {
  return [
    'exec',
    '--json',
    '-s', 'read-only',
    '--skip-git-repo-check',
    '--ephemeral',
    '--ignore-user-config',
    '--ignore-rules',
    '-C', cwd,
    ...(model ? ['-m', model] : []),
    '-c', `model_reasoning_effort="${effort}"`,
    '-',
  ]
}

type Json = Record<string, any>

/** Turns the JSONL of `codex exec --json` into normalised run events. Codex sends whole items, not token deltas. */
export class CodexStreamParser {
  #buffer = ''
  #text = ''
  finished = false
  skipped = 0

  feed(chunk: string): RunEvent[] {
    this.#buffer += chunk
    const out: RunEvent[] = []
    let idx
    while ((idx = this.#buffer.indexOf('\n')) >= 0) {
      const line = this.#buffer.slice(0, idx).trim()
      this.#buffer = this.#buffer.slice(idx + 1)
      if (line) out.push(...this.#line(line))
    }
    return out
  }

  flush(): RunEvent[] {
    const rest = this.#buffer.trim()
    this.#buffer = ''
    return rest ? this.#line(rest) : []
  }

  #line(line: string): RunEvent[] {
    let e: Json
    try {
      e = JSON.parse(line) as Json
    } catch {
      this.skipped += 1
      return []
    }
    switch (e.type) {
      case 'item.completed': {
        const item = e.item as Json | undefined
        if (item?.type === 'agent_message' && typeof item.text === 'string') {
          this.#text += (this.#text ? '\n\n' : '') + item.text
          return [{ type: 'token', text: (this.#text === item.text ? '' : '\n\n') + item.text }]
        }
        if (item?.type === 'reasoning' && typeof item.text === 'string') return [{ type: 'thinking', text: item.text }]
        return [] // commands, file changes, tool items: not chat content here
      }
      case 'turn.completed': {
        this.finished = true
        const u = e.usage as Json | undefined
        const out: RunEvent[] = []
        if (u) out.push({ type: 'usage', inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0, cachedTokens: u.cached_input_tokens ?? 0 })
        out.push({ type: 'done', text: this.#text })
        return out
      }
      case 'turn.failed':
      case 'error': {
        this.finished = true
        const message = String(e.error?.message ?? e.message ?? 'Codex reported an error')
        return [{ type: 'error', message, kind: classifyError(message) }]
      }
      default:
        return [] // thread.started, turn.started, item.started and anything newer
    }
  }
}

export class CodexAdapter implements ProviderAdapter {
  readonly id = 'codex' as const
  readonly #env: NodeJS.ProcessEnv

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.#env = env
  }

  models() {
    // There is no offline model list; the default is whatever the user's Codex plan offers.
    return {
      provider: 'codex' as const,
      source: 'static' as const,
      models: [{ id: '', label: 'Default', efforts: [...CODEX_EFFORTS] }],
    }
  }

  async status(): Promise<AdapterStatus> {
    const launch = resolveCodexLauncher(this.#env)
    if (!launch) return { available: false, reason: 'The Codex CLI was not found. Install it with npm and run `codex login`.' }
    const v = await capture(launch, ['--version'], this.#env, 5000)
    return v.ok ? { available: true, version: v.stdout.trim().split(/\r?\n/)[0] } : { available: false, reason: 'The Codex CLI did not start.' }
  }

  /** `codex login status` reads the local login; no model call. */
  async connection(): Promise<AdapterConnection> {
    const reconnect = 'codex login'
    const launch = resolveCodexLauncher(this.#env)
    if (!launch) return { state: 'unavailable', detail: 'The Codex CLI was not found. Install it first.', method: null, plan: null, version: null, reconnect }
    const [version, login] = await Promise.all([capture(launch, ['--version'], this.#env), capture(launch, ['login', 'status'], this.#env)])
    const v = version.ok ? version.stdout.trim().split(/\r?\n/)[0] ?? null : null
    const text = `${login.stdout}\n${login.stderr}`
    if (/api key/i.test(text) && /logged in/i.test(text)) {
      return { state: 'degraded', detail: 'Signed in with an API key, which JunOS does not use. Sign in with your ChatGPT plan.', method: 'API key', plan: null, version: v, reconnect }
    }
    if (/logged in using chatgpt/i.test(text)) {
      return { state: 'connected', detail: 'Signed in with your ChatGPT plan.', method: 'Signed in via CLI', plan: null, version: v, reconnect }
    }
    if (/not logged in|logged out/i.test(text) || !login.ok) {
      return { state: 'needs_login', detail: 'Not signed in. Run the command below, then check again.', method: null, plan: null, version: v, reconnect }
    }
    return { state: 'unknown', detail: 'Could not read the Codex login status.', method: null, plan: null, version: v, reconnect }
  }

  start(runs: RunManager, req: AdapterRunRequest) {
    const launch = resolveCodexLauncher(this.#env)
    if (!launch) throw new Error('codex CLI not found')
    const parser = new CodexStreamParser()
    let stderrTail = ''
    const emit = (events: RunEvent[]) => events.forEach(req.onEvent)
    return runs.start({
      kind: 'chat',
      source: 'codex',
      provider: 'codex',
      model: req.model || 'default',
      effort: req.effort,
      command: launch.command,
      args: [...launch.prefix, ...codexArgs(req.model, req.effort === 'max' ? 'xhigh' : req.effort, req.cwd)],
      cwd: req.cwd,
      env: cliEnv(this.#env),
      stdin: req.prompt,
      onStdout: (chunk) => emit(parser.feed(chunk)),
      onStderr: (chunk) => {
        stderrTail = (stderrTail + chunk).slice(-2000)
      },
      onEnd: (run) => {
        emit(parser.flush())
        if (!parser.finished && run.status !== 'stopped') {
          const message = stderrTail.trim() || `Codex exited without an answer (code ${run.exitCode ?? 'unknown'}).`
          req.onEvent({ type: 'error', message, kind: classifyError(message) })
        }
        req.onEnd(run)
      },
    })
  }
}
