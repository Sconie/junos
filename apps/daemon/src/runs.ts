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
  #paused = false

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

  start(spec: RunSpec): RunRecord {
    if (this.#paused) throw new PausedError()
    const id = randomUUID()
    const startedAt = new Date(this.#now()).toISOString()
    this.#store.db
      .prepare(`INSERT INTO run (id, kind, source, status, started_at) VALUES (?, ?, ?, 'running', ?)`)
      .run(id, spec.kind, spec.source, startedAt)

    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: spec.env,
      stdio: 'ignore',
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
    this.#children.set(id, { child, exited })
    this.#store.append('run.started', { runId: id, kind: spec.kind, source: spec.source }, id)
    return this.get(id)!
  }

  #onExit(id: string, code: number | null, signal: NodeJS.Signals | null): void {
    const row = this.#row(id)
    if (!row || TERMINAL.includes(row.status)) return
    if (row.status === 'cancelling') {
      this.#finish(id, 'stopped', { exitCode: code, signal })
    } else {
      this.#finish(id, code === 0 ? 'finished' : 'failed', { exitCode: code, signal })
    }
  }

  #finish(id: string, status: RunStatus, info: { exitCode?: number | null; signal?: string | null; error?: string } = {}): void {
    const res = this.#store.db
      .prepare(
        `UPDATE run SET status = ?, finished_at = ?, exit_code = ?, signal = ?, error = COALESCE(?, error)
         WHERE id = ? AND status IN ('running','cancelling')`,
      )
      .run(status, new Date(this.#now()).toISOString(), info.exitCode ?? null, info.signal ?? null, info.error ?? null, id)
    if (Number(res.changes) !== 1) return
    // Spec 12: anything already executed is part of the stop record, confirmed or not.
    const sideEffects = status === 'stopped' || status === 'stop_unconfirmed' ? this.#recordSideEffects(id) : []
    this.#store.append(
      `run.${status === 'stop_unconfirmed' ? 'stop_unconfirmed' : status}`,
      { runId: id, status, exitCode: info.exitCode ?? null, signal: info.signal ?? null, sideEffects: sideEffects.length },
      id,
    )
  }

  #recordSideEffects(id: string): SideEffect[] {
    const effects = this.#gateway.sideEffectsForRun(id)
    this.#store.db.prepare('UPDATE run SET side_effects_json = ? WHERE id = ?').run(JSON.stringify(effects), id)
    return effects
  }

  /** Stop one run, or (no id) every run and pause everything new. Resolves once the outcome is known. */
  async stop(runId?: string): Promise<RunRecord[]> {
    const targets = runId ? [runId] : [...this.#children.keys()]
    if (!runId) this.#paused = true
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
      // `signal` resolves only once the kill has been delivered. On Windows that is when
      // taskkill exits; starting the confirm timer earlier freezes a false `stop_unconfirmed`.
      await this.#signal(pid, true)
      await Promise.race([entry.exited, sleep(this.#confirmMs)])
    }
    if (this.#survived(id, pid)) {
      // We asked twice and it is still there. Say so instead of claiming it stopped.
      this.#finish(id, 'stop_unconfirmed', { error: 'process did not exit after a forced kill' })
    }
    return this.get(id)
  }

  resume(): void {
    if (!this.#paused) return
    this.#paused = false
    this.#store.append('stop.resumed', {})
  }

  /** Daemon shutdown: nothing may outlive junosd by accident. */
  async closeAll(): Promise<void> {
    await Promise.all(
      [...this.#children.entries()].map(async ([id, entry]) => {
        const pid = entry.child.pid
        if (pid !== undefined) await this.#signal(pid, true)
        await Promise.race([entry.exited, sleep(this.#confirmMs)])
        // Detached children do not die with us. A survivor must not be stored as a clean stop:
        // the next start only rewrites running and cancelling rows.
        const survived = this.#survived(id, pid)
        this.#finish(id, survived ? 'stop_unconfirmed' : 'stopped', {
          error: survived ? 'process did not exit after a forced kill' : 'junosd shut down',
        })
      }),
    )
  }

  /**
   * Still our child, and the OS still has the pid. The map entry lives until `exit`, so it is not
   * proof of life: a kill that already landed must not be recorded as `stop_unconfirmed`.
   */
  #survived(id: string, pid: number | undefined): boolean {
    return pid !== undefined && this.#children.has(id) && alive(pid)
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
