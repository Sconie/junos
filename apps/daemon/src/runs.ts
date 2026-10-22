import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type { RunRecord, RunStatus, SideEffect } from '@junos/shared'
import type { Gateway } from './gateway.ts'
import type { EventStore } from './store.ts'

export interface RunSpec {
  kind: string
  source: string
  command: string
  args: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  /** What this run asks of a provider, recorded on the run. */
  provider?: string
  model?: string
  effort?: string
  /** Written to the process's stdin, then stdin is closed (prompts go here, never on the command line). */
  stdin?: string
  /** Receives the process's stdout and stderr as they arrive. Without these, output is discarded. */
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
  /** Called once, after the run row reached its final status. */
  onEnd?: (run: RunRecord) => void
}

export class PausedError extends Error {
  constructor() {
    super('junosd is stopped; resume before starting a run')
  }
}

export interface RunManagerOptions {
  store: EventStore
  gateway: Gateway
  /** How long a run gets to exit after the polite cancel before its process tree is killed. */
  graceMs?: number
  /** How long to wait after the kill before reporting "stop not confirmed". */
  confirmMs?: number
  now?: () => number
  /** Test seam: how a process tree is signalled. Defaults to the real thing. */
  signal?: (pid: number, force: boolean) => Promise<void>
}

interface RunRow {
  id: string
  kind: string
  source: string
  provider: string | null
  model: string | null
  effort: string | null
  status: RunStatus
  started_at: string
  finished_at: string | null
  exit_code: number | null
  signal: string | null
  error: string | null
  stop_requested_at: string | null
  side_effects_json: string
}

const TERMINAL: RunStatus[] = ['stopped', 'finished', 'failed', 'stop_unconfirmed']

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Asks a process tree to stop. POSIX: the child leads its own group, so the signal reaches every
 * descendant. Windows has no process groups, so taskkill /T walks the tree; without /F it is polite.
 */
function signalTree(pid: number, force: boolean): Promise<void> {
  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      execFile('taskkill', ['/PID', String(pid), '/T', ...(force ? ['/F'] : [])], { windowsHide: true }, () => resolve())
    })
  }
  try {
    process.kill(-pid, force ? 'SIGKILL' : 'SIGTERM')
  } catch {
    /* already gone */
  }
  return Promise.resolve()
}

/** Owns every process JunOS starts, and the Stop state machine (spec 12): requested, cancelling, stopped. */
export class RunManager {
  readonly #store: EventStore
  readonly #gateway: Gateway
  readonly #graceMs: number
  readonly #confirmMs: number
  readonly #now: () => number
  readonly #signal: (pid: number, force: boolean) => Promise<void>
  readonly #children = new Map<string, { child: ChildProcess; exited: Promise<void> }>()
  readonly #onEnd = new Map<string, (run: RunRecord) => void>()
  #paused = false
  #pausedAt: string | null = null

  constructor(options: RunManagerOptions) {
    this.#store = options.store
    this.#gateway = options.gateway
    this.#graceMs = options.graceMs ?? 5000
    this.#confirmMs = options.confirmMs ?? 2000
    this.#now = options.now ?? Date.now
    this.#signal = options.signal ?? signalTree
    // A daemon that died mid-run left rows that can no longer be true.
    this.#store.db
      .prepare(`UPDATE run SET status = 'failed', finished_at = ?, error = 'junosd restarted while this run was active' WHERE status IN ('running','cancelling')`)
      .run(new Date(this.#now()).toISOString())
  }

  /** The OS pid of a run's process, for tests and diagnostics. */
  pid(id: string): number | undefined {
    return this.#children.get(id)?.child.pid
  }

  get paused(): boolean {
    return this.#paused
  }

  /** When the current Stop began, so the UI lists only that stop's effects. Null while running normally. */
  get pausedAt(): string | null {
    return this.#pausedAt
  }

  start(spec: RunSpec): RunRecord {
    if (this.#paused) throw new PausedError()
    const id = randomUUID()
    const startedAt = new Date(this.#now()).toISOString()
    this.#store.db
      .prepare(`INSERT INTO run (id, kind, source, provider, model, effort, status, started_at) VALUES (?, ?, ?, ?, ?, ?, 'running', ?)`)
      .run(id, spec.kind, spec.source, spec.provider ?? null, spec.model ?? null, spec.effort ?? null, startedAt)

    const piped = spec.stdin !== undefined || spec.onStdout !== undefined || spec.onStderr !== undefined
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: spec.env,
      stdio: piped ? ['pipe', 'pipe', 'pipe'] : 'ignore',
      windowsHide: true,
      // Its own process group on POSIX, so Stop can signal the whole tree.
      detached: process.platform !== 'win32',
    })
    const exited = new Promise<void>((resolve) => {
      child.once('exit', (code, signal) => {
        this.#children.delete(id)
        // The database may already be closed if the daemon is shutting down; there is nothing left to record.
        try {
          this.#onExit(id, code, signal)
        } catch {
          /* closed */
        }
        resolve()
      })
      child.once('error', (err) => {
        this.#children.delete(id)
        try {
          this.#finish(id, 'failed', { error: err.message })
        } catch {
          /* closed */
        }
        resolve()
      })
    })
    if (piped) {
      child.stdout?.setEncoding('utf8')
      child.stderr?.setEncoding('utf8')
      child.stdout?.on('data', (c: string) => spec.onStdout?.(c))
      child.stderr?.on('data', (c: string) => spec.onStderr?.(c))
      // A process that exits before reading its prompt closes the pipe; that is not our error.
      child.stdin?.on('error', () => {})
      if (spec.stdin !== undefined) child.stdin?.end(spec.stdin)
      else child.stdin?.end()
    }
    if (spec.onEnd) this.#onEnd.set(id, spec.onEnd)
    this.#children.set(id, { child, exited })
    this.#store.append('run.started', { runId: id, kind: spec.kind, source: spec.source }, id)
    return this.get(id)!
  }

  #onExit(id: string, code: number | null, signal: NodeJS.Signals | null): void {
    const row = this.#row(id)
    if (!row) return
    if (row.status === 'stop_unconfirmed') {
      // It did die, just after we gave up waiting: correct the record instead of leaving a false alarm.
      this.#confirmLate(id, code, signal)
      return
    }
    if (TERMINAL.includes(row.status)) return
    if (row.status === 'cancelling') {
      this.#finish(id, 'stopped', { exitCode: code, signal })
    } else {
      this.#finish(id, code === 0 ? 'finished' : 'failed', { exitCode: code, signal })
    }
  }

  #confirmLate(id: string, code: number | null, signal: NodeJS.Signals | null): void {
    const res = this.#store.db
      .prepare(`UPDATE run SET status = 'stopped', finished_at = ?, exit_code = ?, signal = ?, error = NULL WHERE id = ? AND status = 'stop_unconfirmed'`)
      .run(new Date(this.#now()).toISOString(), code, signal, id)
    if (Number(res.changes) !== 1) return
    this.#store.append('run.stopped', { runId: id, status: 'stopped', exitCode: code, signal, late: true }, id)
  }

  #finish(id: string, status: RunStatus, info: { exitCode?: number | null; signal?: string | null; error?: string } = {}): void {
    const res = this.#store.db
      .prepare(
        `UPDATE run SET status = ?, finished_at = ?, exit_code = ?, signal = ?, error = COALESCE(?, error)
         WHERE id = ? AND status IN ('running','cancelling')`,
      )
      .run(status, new Date(this.#now()).toISOString(), info.exitCode ?? null, info.signal ?? null, info.error ?? null, id)
    if (Number(res.changes) !== 1) return
    const sideEffects = status === 'stopped' || status === 'stop_unconfirmed' ? this.#recordSideEffects(id) : []
    this.#store.append(
      `run.${status === 'stop_unconfirmed' ? 'stop_unconfirmed' : status}`,
      { runId: id, status, exitCode: info.exitCode ?? null, signal: info.signal ?? null, sideEffects: sideEffects.length },
      id,
    )
    const done = this.#onEnd.get(id)
    this.#onEnd.delete(id)
    const rec = this.get(id)
    if (done && rec) done(rec)
  }

  #recordSideEffects(id: string): SideEffect[] {
    const effects = this.#gateway.sideEffectsForRun(id)
    this.#store.db.prepare('UPDATE run SET side_effects_json = ? WHERE id = ?').run(JSON.stringify(effects), id)
    return effects
  }

  /** Stop one run, or (no id) every run and pause everything new. Resolves once the outcome is known. */
  async stop(runId?: string): Promise<RunRecord[]> {
    const targets = runId ? [runId] : [...this.#children.keys()]
    if (!runId) {
      if (!this.#paused) this.#pausedAt = new Date(this.#now()).toISOString()
      this.#paused = true
    }
    this.#store.append('stop.requested', { scope: runId ?? 'all', runs: targets, paused: this.#paused })
    const done = await Promise.all(targets.map((id) => this.#stopOne(id)))
    return done.filter((r): r is RunRecord => r !== undefined)
  }

  async #stopOne(id: string): Promise<RunRecord | undefined> {
    const entry = this.#children.get(id)
    const row = this.#row(id)
    if (!row) return undefined
    if (!entry || TERMINAL.includes(row.status)) return this.get(id)

    const res = this.#store.db
      .prepare(`UPDATE run SET status = 'cancelling', stop_requested_at = ? WHERE id = ? AND status = 'running'`)
      .run(new Date(this.#now()).toISOString(), id)
    if (Number(res.changes) === 1) this.#store.append('run.cancelling', { runId: id }, id)
    // Pending approvals for a stopped run must not be answerable later.
    this.#gateway.revokeForRun(id, 'stop')

    const pid = entry.child.pid
    if (pid === undefined) return this.get(id)
    void this.#signal(pid, false)
    const polite = await Promise.race([entry.exited.then(() => true), sleep(this.#graceMs).then(() => false)])
    if (!polite) {
      await this.#signal(pid, true) // the kill must be issued before we start counting the confirmation window
      await Promise.race([entry.exited, sleep(this.#confirmMs)])
    }
    if (this.#children.has(id) || alive(pid)) {
      // We asked twice and it is still there. Say so instead of claiming it stopped.
      this.#finish(id, 'stop_unconfirmed', { error: 'process did not exit after a forced kill' })
    }
    return this.get(id)
  }

  resume(): void {
    if (!this.#paused) return
    this.#paused = false
    this.#pausedAt = null
    this.#store.append('stop.resumed', {})
  }

  /** Daemon shutdown: nothing may outlive junosd by accident. */
  async closeAll(): Promise<void> {
    await Promise.all(
      [...this.#children.entries()].map(async ([id, entry]) => {
        const pid = entry.child.pid
        if (pid !== undefined) await this.#signal(pid, true)
        await Promise.race([entry.exited, sleep(this.#confirmMs)])
        if (pid !== undefined && alive(pid)) {
          // An orphan outlives us; say so, so the record is not a comforting lie.
          this.#finish(id, 'stop_unconfirmed', { error: 'junosd shut down while the process was still running' })
        } else {
          this.#finish(id, 'stopped', { error: 'junosd shut down' })
        }
      }),
    )
  }

  list(limit = 50): RunRecord[] {
    const rows = this.#store.db
      .prepare(
        `SELECT * FROM run ORDER BY CASE WHEN status IN ('running','cancelling') THEN 0 ELSE 1 END, started_at DESC LIMIT ?`,
      )
      .all(limit) as unknown as RunRow[]
    return rows.map(toRecord)
  }

  get(id: string): RunRecord | undefined {
    const row = this.#row(id)
    return row && toRecord(row)
  }

  #row(id: string): RunRow | undefined {
    return this.#store.db.prepare('SELECT * FROM run WHERE id = ?').get(id) as RunRow | undefined
  }
}

function toRecord(row: RunRow): RunRecord {
  return {
    id: row.id,
    kind: row.kind,
    source: row.source,
    provider: row.provider ?? null,
    model: row.model ?? null,
    effort: row.effort ?? null,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    exitCode: row.exit_code === null ? null : Number(row.exit_code),
    signal: row.signal,
    error: row.error,
    stopRequestedAt: row.stop_requested_at,
    sideEffects: JSON.parse(row.side_effects_json) as SideEffect[],
  }
}

/** Fake long-running "CLIs" for tests. Each is a tiny node program, so no real provider is ever involved. */
export const FAKE_RUNS: Record<string, (pidFile: string) => string[]> = {
  sleep: () => ['-e', 'setInterval(() => {}, 1000)'],
  // Ignores the polite cancel, so only the forced kill can end it.
  stubborn: () => ['-e', "process.on('SIGTERM', () => {}); process.on('SIGINT', () => {}); process.on('SIGBREAK', () => {}); setInterval(() => {}, 1000)"],
  // Starts a grandchild and records its pid, to prove the whole tree dies.
  tree: (pidFile) => [
    '-e',
    `const c = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
     require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(c.pid));
     setInterval(() => {}, 1000)`,
  ],
  quick: () => ['-e', 'process.exit(0)'],
  fail: () => ['-e', 'process.exit(3)'],
}
