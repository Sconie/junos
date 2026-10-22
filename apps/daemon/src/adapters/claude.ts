import { execFile } from 'node:child_process'
import { EFFORTS, type RunEvent } from '@junos/shared'
import { cliEnv, resolveLauncher } from '../cli.ts'
import type { RunManager } from '../runs.ts'
import type { AdapterRunRequest, AdapterStatus, ProviderAdapter } from './types.ts'

// Short on purpose: the default Claude Code system prompt is large and this is a plain chat.
const SYSTEM_PROMPT =
  'You are the assistant in JunOS, a personal command center. Answer the last user message in the conversation. ' +
  'You have no tools here, so do not claim to have run commands or read files.'

/**
 * Flags for `claude -p`, from `claude --help` (2.1.306) and the recorded run in test/fixtures.
 * Never `--bare`: it only accepts an API key, which would break "subscription, not API keys" (spec 16).
 * The isolation flags keep the user's own plugins, hooks, skills and MCP servers out of a plain chat;
 * the first live run loaded all of them and cost 436k input tokens for one word.
 */
export function claudeArgs(model: string, effort: string): string[] {
  return [
    '-p',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--verbose',
    '--no-session-persistence',
    '--effort', effort,
    ...(model ? ['--model', model] : []),
    '--tools', '',
    '--permission-mode', 'plan',
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--system-prompt', SYSTEM_PROMPT,
  ]
}

type Json = Record<string, any>

/** Turns the line-delimited stream-json of `claude -p` into normalised run events. */
export class ClaudeStreamParser {
  #buffer = ''
  #sawDelta = false
  #text = ''
  /** True once a terminal event (`done` or `error`) was produced. */
  finished = false
  /** Lines that were not JSON; a drift signal for contract tests. */
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

  /** Call at the end of output for a last line without a newline. */
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
      case 'stream_event': {
        const delta = e.event?.type === 'content_block_delta' ? (e.event.delta as Json) : undefined
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
          this.#sawDelta = true
          this.#text += delta.text
          return [{ type: 'token', text: delta.text }]
        }
        if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
          return [{ type: 'thinking', text: delta.thinking }]
        }
        return []
      }
      case 'assistant': {
        // The complete message. Only used when no partial deltas arrived (no --include-partial-messages).
        if (this.#sawDelta) return []
        const text = ((e.message?.content ?? []) as Array<{ type: string; text?: string }>)
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('')
        this.#text += text
        return text ? [{ type: 'token', text }] : []
      }
      case 'rate_limit_event': {
        const info = e.rate_limit_info as Json | undefined
        if (!info) return []
        const resetsAt = typeof info.resetsAt === 'number' ? new Date(info.resetsAt * 1000).toISOString() : undefined
        return [{ type: 'rate_limit', status: String(info.status), resetsAt }]
      }
      case 'result': {
        this.finished = true
        const out: RunEvent[] = []
        const u = e.usage as Json | undefined
        if (u) {
          out.push({
            type: 'usage',
            inputTokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
            outputTokens: u.output_tokens ?? 0,
            cachedTokens: u.cache_read_input_tokens ?? 0,
          })
        }
        if (e.is_error) {
          const message = String(e.result ?? e.subtype ?? 'Claude returned an error')
          out.push({ type: 'error', message, kind: classifyError(message, e.api_error_status) })
        } else {
          out.push({ type: 'done', text: typeof e.result === 'string' ? e.result : this.#text, stopReason: e.stop_reason })
        }
        return out
      }
      default:
        return [] // system, hooks, status, commands: not chat content
    }
  }
}

export function classifyError(message: string, status?: unknown): 'rate_limited' | 'needs_login' | 'failed' {
  if (status === 429 || /rate.?limit|usage limit|limit reached|quota|too many requests/i.test(message)) return 'rate_limited'
  if (status === 401 || /log ?in|not authenticated|authentication|unauthori[sz]ed/i.test(message)) return 'needs_login'
  return 'failed'
}

export class ClaudeAdapter implements ProviderAdapter {
  readonly id = 'claude' as const
  readonly #env: NodeJS.ProcessEnv

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.#env = env
  }

  models() {
    // The CLI accepts aliases and there is no offline list, so these are static and labelled so.
    return {
      provider: 'claude' as const,
      source: 'static' as const,
      models: [
        { id: '', label: 'Default', efforts: [...EFFORTS] },
        { id: 'opus', label: 'Opus', efforts: [...EFFORTS] },
        { id: 'sonnet', label: 'Sonnet', efforts: [...EFFORTS] },
        { id: 'haiku', label: 'Haiku', efforts: [...EFFORTS] },
      ],
    }
  }

  #launcher() {
    return resolveLauncher(this.#env.JUNOS_CLAUDE_BIN || 'claude', this.#env)
  }

  async status(): Promise<AdapterStatus> {
    const launch = this.#launcher()
    if (!launch) return { available: false, reason: 'The Claude CLI was not found. Install Claude Code and run `claude login`.' }
    return new Promise((resolve) => {
      execFile(
        launch.command,
        [...launch.prefix, '--version'],
        { timeout: 5000, windowsHide: true, env: cliEnv(this.#env) },
        (err, stdout) =>
          resolve(err ? { available: false, reason: 'The Claude CLI did not start.' } : { available: true, version: stdout.trim().split(/\r?\n/)[0] }),
      )
    })
  }

  start(runs: RunManager, req: AdapterRunRequest) {
    const launch = this.#launcher()
    if (!launch) throw new Error('claude CLI not found')
    const parser = new ClaudeStreamParser()
    let stderrTail = ''
    const emit = (events: RunEvent[]) => events.forEach(req.onEvent)
    return runs.start({
      kind: 'chat',
      source: 'claude',
      provider: 'claude',
      model: req.model || 'default',
      effort: req.effort,
      command: launch.command,
      args: [...launch.prefix, ...claudeArgs(req.model, req.effort)],
      cwd: req.cwd,
      env: cliEnv(this.#env),
      stdin: req.prompt,
      onStdout: (chunk) => emit(parser.feed(chunk)),
      onStderr: (chunk) => {
        stderrTail = (stderrTail + chunk).slice(-2000)
      },
      onEnd: (run) => {
        emit(parser.flush())
        // `stopped` is a quiet cancel. `stop_unconfirmed` is too: the process is still alive
        // (or the daemon is shutting down on top of it), not a CLI that failed to answer.
        if (!parser.finished && run.status !== 'stopped' && run.status !== 'stop_unconfirmed') {
          // The process ended without a result line: say why, using stderr when there is any.
          const message = stderrTail.trim() || `Claude exited without an answer (code ${run.exitCode ?? 'unknown'}).`
          req.onEvent({ type: 'error', message, kind: classifyError(message) })
        }
        req.onEnd(run)
      },
    })
  }
}
