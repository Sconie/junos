import { execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import type { ActionResponse, TerminalFrame, TerminalOverview, TerminalSession } from '@junos/shared'
import { redact } from './canonical.ts'
import type { Gateway, ToolDef } from './gateway.ts'
import type { EventStore } from './store.ts'

export class TerminalError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** The part of a pseudo-terminal the service uses. node-pty provides it for the PC; the VPS shell provides its own. */
export interface PtyHandle {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  onData(listener: (data: string) => void): void
  onExit(listener: () => void): void
}

export interface ShellOpener {
  readonly mode: 'none' | 'mock' | 'remote'
  readonly reason: string | null
  open(size: { cols: number; rows: number }): Promise<PtyHandle>
}

export interface LocalShell {
  command: string
  args: string[]
  label: string
}

/** The shell for the PC tab: WSL on Windows (decided by Jonas), the login shell elsewhere. `JUNOS_TERMINAL_SHELL` overrides it. */
export function defaultShell(env: NodeJS.ProcessEnv, platform = process.platform): LocalShell {
  if (env.JUNOS_TERMINAL_SHELL) {
    let args: string[] = []
    try {
      const parsed: unknown = JSON.parse(env.JUNOS_TERMINAL_ARGS ?? '[]')
      if (Array.isArray(parsed)) args = parsed.map(String)
    } catch {
      /* no arguments */
    }
    return { command: env.JUNOS_TERMINAL_SHELL, args, label: 'Shell' }
  }
  if (platform === 'win32') return { command: 'wsl.exe', args: ['--cd', '~'], label: 'WSL' }
  return { command: env.SHELL || '/bin/sh', args: [], label: 'Shell' }
}

/** How an agent's command is run: the PC's Linux shell, not a terminal. */
export interface AgentShell {
  command: string
  args(command: string): string[]
}

export function defaultAgentShell(platform = process.platform): AgentShell {
  return platform === 'win32' ? { command: 'wsl.exe', args: (c) => ['--', 'sh', '-c', c] } : { command: '/bin/sh', args: (c) => ['-c', c] }
}

/** Standing in for the shell on the VPS until the shim exists: it says why nothing opens. */
export class NoVpsShell implements ShellOpener {
  readonly mode = 'none' as const
  readonly reason = 'The VPS shell goes through the Hermes shim, which is not connected yet.'
  open(): Promise<PtyHandle> {
    return Promise.reject(new TerminalError(503, 'not_connected', this.reason))
  }
}

/** A scripted shell for building and testing the VPS tab. Nothing real is behind it. */
export class MockVpsShell implements ShellOpener {
  readonly mode = 'mock' as const
  readonly reason = 'This is a stand-in shell (mock): nothing real is connected.'
  open(): Promise<PtyHandle> {
    let onData: (d: string) => void = () => {}
    let onExit: () => void = () => {}
    let line = ''
    const prompt = 'vps-mock$ '
    const pty: PtyHandle = {
      write(data) {
        for (const ch of data) {
          if (ch === '\r' || ch === '\n') {
            const cmd = line.trim()
            line = ''
            onData('\r\n')
            if (cmd === 'exit') return void onExit()
            if (cmd) onData(`mock: ${cmd}\r\n`)
            onData(prompt)
          } else {
            line += ch
            onData(ch)
          }
        }
      },
      resize() {},
      kill: () => onExit(),
      onData: (l) => {
        onData = l
        setImmediate(() => onData(`${prompt}`))
      },
      onExit: (l) => (onExit = l),
    }
    return Promise.resolve(pty)
  }
}

interface Live {
  id: string
  kind: 'local' | 'vps'
  label: string
  openedAt: string
  pty: PtyHandle
  tail: string
  listeners: Set<(frame: TerminalFrame) => void>
  lastInputAt: number
  closed: boolean
}

export interface TerminalOptions {
  store: EventStore
  gateway: Gateway
  env: NodeJS.ProcessEnv
  now?: () => number
  shell?: LocalShell
  agentShell?: AgentShell
  vps?: ShellOpener
  /** Interactive tabs open at once (default 6). */
  maxSessions?: number
  /** A VPS tab with no typing for this long is closed (default 15 min). */
  vpsIdleMs?: number
  /** How long an agent command may run (default 60 s). */
  agentTimeoutMs?: number
}

const TAIL = 64 * 1024
const AGENT_OUTPUT = 20_000
const AGENT_TAB = 'agent'
/** A command with none of these can only do what its first word does. */
const SHELL_META = /[;&|<>$`()\\\n\r*?{}[\]!~#'"]/
const READ_ONLY = /^(pwd|ls(\s+-[a-zA-Z]+)?(\s+[\w./-]+)?|echo(\s+[\w.,: /-]+)?|git\s+(status|log|diff|branch)(\s+-[\w-]+)*)$/

/** Only these can run without an approval. Everything else is treated as destructive: a shell can do anything. */
export function isReadOnlyCommand(command: string): boolean {
  return command.length <= 200 && !SHELL_META.test(command) && READ_ONLY.test(command.trim())
}

/**
 * The terminal (spec 15). Jonas's own typing in a tab goes straight to the shell and is never gated. Whatever an agent,
 * a workflow or Hermes runs goes through the gateway (an approval for anything not plainly read-only), is logged as an
 * event with its actor and result, and appears only in a separate read-only "agent" tab: nothing can write to a tab Jonas types in.
 */
export class TerminalService {
  readonly #o: TerminalOptions
  readonly #now: () => number
  readonly #shell: LocalShell
  readonly #agentShell: AgentShell
  readonly #vps: ShellOpener
  readonly #live = new Map<string, Live>()
  readonly #closed: TerminalSession[] = []
  readonly #agentRuns = new Set<{ kill(): void }>()
  readonly #agentListeners = new Set<(frame: TerminalFrame) => void>()
  #agentTail = ''
  #idle: ReturnType<typeof setInterval> | undefined
  #ptyModule: Promise<typeof import('node-pty') | null> | undefined

  constructor(options: TerminalOptions) {
    this.#o = options
    this.#now = options.now ?? Date.now
    this.#shell = options.shell ?? defaultShell(options.env)
    this.#agentShell = options.agentShell ?? defaultAgentShell()
    this.#vps = options.vps ?? new NoVpsShell()
  }

  start(): void {
    this.#idle = setInterval(() => {
      const limit = this.#o.vpsIdleMs ?? 15 * 60_000
      for (const s of this.#live.values()) if (s.kind === 'vps' && this.#now() - s.lastInputAt > limit) this.#finish(s.id, 'idle')
    }, 5000)
    this.#idle.unref()
    this.#o.store.subscribe((event) => {
      // Stop closes every tab and ends every agent command.
      if (event.type === 'stop.requested' && event.payload.scope === 'all') this.closeAll('stopped')
    })
  }

  stopService(): void {
    clearInterval(this.#idle)
    this.closeAll('daemon stopped')
  }

  #iso(): string {
    return new Date(this.#now()).toISOString()
  }

  /** node-pty is optional: where it cannot load, the PC tab says so and everything else keeps working. */
  #pty(): Promise<typeof import('node-pty') | null> {
    this.#ptyModule ??= import('node-pty').then(
      (m) => {
        const wrapped = m as unknown as { default?: typeof import('node-pty') }
        return wrapped.default?.spawn ? wrapped.default : m
      },
      () => null,
    )
    return this.#ptyModule
  }

  async overview(): Promise<TerminalOverview> {
    const pty = await this.#pty()
    return {
      sessions: this.list(),
      local: { available: pty !== null, reason: pty ? null : 'Terminal support (node-pty) could not be loaded on this machine.', shell: this.#shell.label },
      vps: { mode: this.#vps.mode, reason: this.#vps.reason },
    }
  }

  list(): TerminalSession[] {
    const open = [...this.#live.values()].map((s) => this.#toSession(s))
    return [...open, ...this.#closed.slice(-10), this.#agentSession()]
  }

  #agentSession(): TerminalSession {
    return { id: AGENT_TAB, kind: 'agent', label: 'Agent', status: 'open', openedAt: '', readOnly: true, closeReason: null }
  }

  #toSession(s: Live): TerminalSession {
    return { id: s.id, kind: s.kind, label: s.label, status: 'open', openedAt: s.openedAt, readOnly: false, closeReason: null }
  }

  // ---- Jonas's tabs ----

  async open(kind: unknown, cols = 80, rows = 24): Promise<TerminalSession> {
    if (kind !== 'local' && kind !== 'vps') throw new TerminalError(400, 'bad_kind', 'Open a local or vps tab.')
    if (this.#live.size >= (this.#o.maxSessions ?? 6)) throw new TerminalError(409, 'too_many', 'Close a tab first.')
    const size = { cols: Math.min(Math.max(Math.trunc(Number(cols)) || 80, 20), 400), rows: Math.min(Math.max(Math.trunc(Number(rows)) || 24, 5), 200) }
    let pty: PtyHandle
    let label: string
    if (kind === 'vps') {
      pty = await this.#vps.open(size)
      label = this.#vps.mode === 'mock' ? 'VPS (mock)' : 'VPS'
    } else {
      const mod = await this.#pty()
      if (!mod) throw new TerminalError(503, 'no_pty', 'Terminal support (node-pty) could not be loaded on this machine.')
      // The shell is the owner's own, so it gets their environment, minus JunOS's own settings and secrets.
      const env = Object.fromEntries(Object.entries(this.#o.env).filter(([k, v]) => v !== undefined && !k.startsWith('JUNOS_'))) as Record<string, string>
      env.TERM = 'xterm-256color'
      let proc
      try {
        proc = mod.spawn(this.#shell.command, this.#shell.args, { name: 'xterm-256color', cols: size.cols, rows: size.rows, cwd: homedir(), env })
      } catch (err) {
        throw new TerminalError(503, 'spawn_failed', `Could not start ${this.#shell.label}: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
      pty = {
        write: (d) => proc.write(d),
        resize: (c, r) => proc.resize(c, r),
        // On Windows the whole tree is ended directly first, because node-pty's own kill looks the tree up through a helper that
        // can fail. Its kill still runs afterwards: it is what releases the pseudo-terminal's handles, and without it junosd never exits.
        // That helper may print "AttachConsole failed" to stderr; the tab is closed either way.
        kill: () => {
          if (process.platform === 'win32') execFile('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { windowsHide: true }, () => {})
          try {
            proc.kill()
          } catch {
            /* already gone */
          }
        },
        onData: (l) => void proc.onData(l),
        onExit: (l) => void proc.onExit(() => l()),
      }
      label = this.#shell.label
    }
    const live: Live = { id: randomUUID(), kind, label, openedAt: this.#iso(), pty, tail: '', listeners: new Set(), lastInputAt: this.#now(), closed: false }
    this.#live.set(live.id, live)
    pty.onData((data) => {
      live.tail = (live.tail + data).slice(-TAIL)
      for (const fn of live.listeners) fn({ type: 'data', data })
    })
    pty.onExit(() => this.#finish(live.id, 'exited'))
    // What happened is logged; what was typed is not: Jonas's keystrokes are his own.
    this.#o.store.append('terminal.opened', { sessionId: live.id, kind, label }, live.id)
    return this.#toSession(live)
  }

  #interactive(id: string): Live {
    const s = this.#live.get(id)
    if (!s || s.closed) throw new TerminalError(404, 'not_found', 'No such open tab.')
    return s
  }

  /** Jonas's typing. Never gated. Only an interactive tab takes input, and only through the authenticated browser session. */
  input(id: string, data: unknown): void {
    if (id === AGENT_TAB) throw new TerminalError(403, 'read_only', 'The agent tab cannot be typed into.')
    const s = this.#interactive(id)
    if (typeof data !== 'string' || data.length === 0 || data.length > 4096) throw new TerminalError(400, 'bad_input', 'Send up to 4096 characters.')
    s.lastInputAt = this.#now()
    s.pty.write(data)
  }

  resize(id: string, cols: unknown, rows: unknown): void {
    if (id === AGENT_TAB) return
    const s = this.#interactive(id)
    const c = Math.trunc(Number(cols))
    const r = Math.trunc(Number(rows))
    if (!(c >= 20 && c <= 400 && r >= 5 && r <= 200)) throw new TerminalError(400, 'bad_size', 'That size is not allowed.')
    s.pty.resize(c, r)
  }

  close(id: string, reason = 'closed'): void {
    if (!this.#finish(id, reason)) throw new TerminalError(404, 'not_found', 'No such open tab.')
  }

  /** Ends a tab. False when it was already gone, which is normal when its shell exits just as it is closed. */
  #finish(id: string, reason: string): boolean {
    const s = this.#live.get(id)
    if (!s || s.closed) return false
    s.closed = true
    this.#live.delete(id)
    try {
      s.pty.kill()
    } catch {
      /* already gone */
    }
    for (const fn of s.listeners) fn({ type: 'closed', reason })
    s.listeners.clear()
    this.#closed.push({ id, kind: s.kind, label: s.label, status: 'closed', openedAt: s.openedAt, readOnly: false, closeReason: reason })
    // Output is kept for audit: truncated, with secret-looking strings masked.
    this.#o.store.append('terminal.closed', { sessionId: id, kind: s.kind, reason, tail: String(redact(stripAnsi(s.tail).slice(-4000))) }, id)
    return true
  }

  closeAll(reason: string): void {
    for (const id of [...this.#live.keys()]) this.#finish(id, reason)
    for (const run of this.#agentRuns) run.kill()
    this.#agentRuns.clear()
  }

  /** Output so far, then what follows. The agent tab's log is read the same way. */
  subscribe(id: string, listener: (frame: TerminalFrame) => void): { replay: string; unsubscribe: () => void } {
    if (id === AGENT_TAB) {
      this.#agentListeners.add(listener)
      return { replay: this.#agentTail, unsubscribe: () => void this.#agentListeners.delete(listener) }
    }
    const s = this.#interactive(id)
    s.listeners.add(listener)
    return { replay: s.tail, unsubscribe: () => void s.listeners.delete(listener) }
  }

  // ---- what agents run ----

  #agentWrite(text: string): void {
    const clean = String(redact(text)).replace(/\r?\n/g, '\r\n')
    this.#agentTail = (this.#agentTail + clean).slice(-TAIL)
    for (const fn of this.#agentListeners) fn({ type: 'data', data: clean })
  }

  #log(actor: string, status: string, command: string, extra: Record<string, unknown> = {}): void {
    this.#o.store.append('terminal.agent.command', { actor, status, command: String(redact(command)).slice(0, 200), ...extra })
  }

  /** The gateway tools for an agent command: plainly read-only ones run at once, everything else needs an approval. */
  tools(): ToolDef[] {
    const cmd = (a: Record<string, unknown>) => (typeof a.command === 'string' ? a.command : '')
    return [
      {
        name: 'terminal.read',
        class: 'read',
        target: (a) => cmd(a).slice(0, 200),
        execute: (a) => {
          if (!isReadOnlyCommand(cmd(a))) throw new Error('That command is not read-only.')
          return this.#run(String(a.actor ?? 'agent'), cmd(a))
        },
      },
      { name: 'terminal.exec', class: 'destructive', target: (a) => cmd(a).slice(0, 200), execute: (a) => this.#run(String(a.actor ?? 'agent'), cmd(a)) },
    ]
  }

  /** An agent asks to run a command: through the gateway, logged, and shown in the agent tab. */
  async requestAgent(actor: unknown, command: unknown, runId?: string, approvalId?: string): Promise<ActionResponse> {
    const who = typeof actor === 'string' && /^[a-z][\w:.-]{0,40}$/.test(actor) ? actor : 'agent'
    if (who === 'jonas') throw new TerminalError(400, 'bad_actor', 'Commands you type go in a tab, not through the agent door.')
    if (typeof command !== 'string' || !command.trim() || command.length > 2000) throw new TerminalError(400, 'bad_command', 'A command is 1 to 2000 characters.')
    const tool = isReadOnlyCommand(command) ? 'terminal.read' : 'terminal.exec'
    const res = await this.#o.gateway.request(who, { tool, args: { command, actor: who }, runId, approvalId })
    if (res.status === 'approval_required') {
      this.#log(who, 'requested', command, { approvalId: res.approvalId })
      this.#agentWrite(`[${who}] wants to run: ${command}\n[waiting for your approval]\n`)
    } else if (res.status !== 'executed') {
      const reason = 'reason' in res ? String(res.reason) : 'refused'
      this.#log(who, 'refused', command, { reason })
      this.#agentWrite(`[${who}] ${command}\n[not run: ${reason}]\n`)
    }
    return res
  }

  /** Runs the command in the PC's shell (not a terminal), capped in time and output. Runs only after the gateway has allowed it. */
  async #run(actor: string, command: string): Promise<{ exitCode: number | null; output: string; timedOut: boolean }> {
    this.#agentWrite(`[${actor}] $ ${command}\n`)
    const env = Object.fromEntries(Object.entries(this.#o.env).filter(([k, v]) => v !== undefined && !k.startsWith('JUNOS_'))) as Record<string, string>
    return new Promise((resolve) => {
      let output = ''
      let timedOut = false
      const child = spawn(this.#agentShell.command, this.#agentShell.args(command), { cwd: homedir(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      const handle = { kill: () => void child.kill() }
      this.#agentRuns.add(handle)
      const take = (d: Buffer) => {
        if (output.length < AGENT_OUTPUT) output += d.toString('utf8')
      }
      child.stdout.on('data', take)
      child.stderr.on('data', take)
      const timer = setTimeout(() => {
        timedOut = true
        child.kill()
      }, this.#o.agentTimeoutMs ?? 60_000)
      const done = (exitCode: number | null) => {
        clearTimeout(timer)
        this.#agentRuns.delete(handle)
        const text = String(redact(output.slice(0, AGENT_OUTPUT)))
        this.#agentWrite(`${text}${text.endsWith('\n') || text === '' ? '' : '\n'}[${timedOut ? 'timed out' : `exit ${exitCode}`}]\n`)
        this.#log(actor, timedOut ? 'timed_out' : 'executed', command, { exitCode })
        resolve({ exitCode, output: text, timedOut })
      }
      child.on('error', (err) => {
        output += `could not start: ${err.message}`
        done(null)
      })
      child.on('close', (code) => done(code))
    })
  }
}

/** The gateway needs its tools before the service exists; these hand each call to it once it does. */
export function terminalTools(service: () => TerminalService | undefined): ToolDef[] {
  return ['terminal.read', 'terminal.exec'].map((name) => {
    const real = (): ToolDef => service()!.tools().find((t) => t.name === name)!
    return {
      name,
      class: name === 'terminal.read' ? 'read' : 'destructive',
      target: (a) => (typeof a.command === 'string' ? a.command.slice(0, 200) : ''),
      execute: (a) => real().execute(a),
    }
  })
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*\u0007/g, '')
}
