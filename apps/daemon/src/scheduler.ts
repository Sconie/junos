import { randomUUID } from 'node:crypto'
import { Cron } from 'croner'
import {
  CATCH_UP_MODES,
  EFFORTS,
  OVERLAP_MODES,
  PROVIDER_IDS,
  type CatchUpMode,
  type CronPreviewResponse,
  type Effort,
  type OverlapMode,
  type ProviderId,
  type ScheduledRunRecord,
  type ScheduledRunStatus,
  type TaskInput,
  type TaskRecord,
} from '@junos/shared'
import type { InboxService } from './inbox.ts'
import type { RunManager } from './runs.ts'
import type { EventStore } from './store.ts'

export class TaskError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Why an execution failed, so the scheduler knows whether trying again can help. */
export class ExecutionError extends Error {
  readonly kind: 'rate_limited' | 'needs_login' | 'failed' | 'stopped' | 'disclosure_required'
  constructor(kind: ExecutionError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

export interface TaskRow {
  id: string
  name: string
  prompt: string
  provider: ProviderId
  model: string
  effort: Effort
  cron: string
  timezone: string
  enabled: number
  catch_up: CatchUpMode
  overlap: OverlapMode
  max_attempts: number
  materialised_until: string
  created_at: string
  updated_at: string
}

interface RunRow {
  id: string
  task_id: string
  due_at: string
  status: ScheduledRunStatus
  lease_owner: string | null
  lease_expires_at: string | null
  attempt: number
  retry_at: string | null
  run_id: string | null
  manual: number
  started_at: string | null
  finished_at: string | null
  error: string | null
  output: string | null
  log: string
  created_at: string
}

/** What a prompt needs to be sent: shared by scheduled tasks and workflow prompt steps. */
export interface PromptSpec {
  provider: ProviderId
  model: string
  effort: Effort
  prompt: string
}

/** Runs a prompt against its provider. The scheduler decides when; this decides how. */
export interface TaskExecutor {
  run(task: PromptSpec, hooks: { log: (line: string) => void; onRun: (runId: string) => void }): Promise<{ text: string }>
}

export interface SchedulerOptions {
  store: EventStore
  runs: RunManager
  inbox: InboxService
  execute: TaskExecutor
  now?: () => number
  /** How often the scheduler looks for work. */
  tickMs?: number
  /** How long a claimed run keeps its lease without a heartbeat. */
  leaseMs?: number
  /** A slot older than this when it is first seen counts as missed rather than due. */
  graceMs?: number
  catchUpMaxAgeMs?: number
  catchUpMaxRuns?: number
  /** Waits before attempt 2, 3, ... of a failed run. */
  backoffMs?: number[]
}

const MIN_INTERVAL_MS = 10 * 60 * 1000
const MAX_OUTPUT = 20_000
const MAX_FIRES_PER_PASS = 500

const ACTIVE: ScheduledRunStatus[] = ['claimed', 'running']

/** Validates a cron + timezone and lists upcoming fire times. Seconds-level and very frequent schedules are refused. */
export function previewCron(cron: string, timezone: string, from: Date, count = 5): CronPreviewResponse {
  const text = (cron ?? '').trim()
  if (text.split(/\s+/).length !== 5) return { valid: false, error: 'Use five fields: minute hour day month weekday.', nextRuns: [] }
  try {
    const job = new Cron(text, { timezone })
    const runs = job.nextRuns(Math.max(count, 3), from)
    if (runs.length === 0) return { valid: false, error: 'That schedule never fires.', nextRuns: [] }
    for (let i = 1; i < runs.length; i++) {
      if (runs[i]!.getTime() - runs[i - 1]!.getTime() < MIN_INTERVAL_MS) {
        return { valid: false, error: 'Subscriptions have usage caps: a task cannot run more often than every 10 minutes.', nextRuns: [] }
      }
    }
    return { valid: true, error: null, nextRuns: runs.slice(0, count).map((d) => d.toISOString()) }
  } catch {
    return { valid: false, error: 'That is not a valid schedule or timezone.', nextRuns: [] }
  }
}

/**
 * Tasks on a schedule, kept as persisted run rows (spec 05). A slot is a `scheduled_run` row that is unique
 * per (task, due time); it is claimed with one compare-and-set UPDATE, runs under a lease, and is retried
 * by reusing the same row. Nothing depends on an in-memory timer, so a forced restart neither repeats nor loses a slot.
 */
export class Scheduler {
  readonly #store: EventStore
  readonly #runs: RunManager
  readonly #inbox: InboxService
  readonly #execute: TaskExecutor
  readonly #now: () => number
  readonly #tickMs: number
  readonly #leaseMs: number
  readonly #graceMs: number
  readonly #maxAgeMs: number
  readonly #maxRuns: number
  readonly #backoff: number[]
  readonly #owner = randomUUID()
  /** Rows this process is executing right now. */
  readonly #active = new Map<string, Promise<void>>()
  /** Providers a claimed row is about to use, so chat cannot slip in before the run row exists. */
  readonly #claimedProviders = new Set<ProviderId>()
  #timer: ReturnType<typeof setInterval> | undefined
  #ticking = false

  constructor(options: SchedulerOptions) {
    this.#store = options.store
    this.#runs = options.runs
    this.#inbox = options.inbox
    this.#execute = options.execute
    this.#now = options.now ?? Date.now
    this.#tickMs = options.tickMs ?? 15_000
    this.#leaseMs = options.leaseMs ?? 2 * 60_000
    this.#graceMs = options.graceMs ?? Math.max(2 * this.#tickMs, 60_000)
    this.#maxAgeMs = options.catchUpMaxAgeMs ?? 6 * 60 * 60_000
    this.#maxRuns = options.catchUpMaxRuns ?? 5
    this.#backoff = options.backoffMs ?? [60_000, 5 * 60_000, 15 * 60_000]
  }

  start(): void {
    if (this.#timer) return
    // Recover first: rows a dead daemon left in claimed/running can never finish.
    this.tick()
    this.#timer = setInterval(() => this.tick(), this.#tickMs)
    this.#timer.unref()
  }

  async stop(): Promise<void> {
    clearInterval(this.#timer)
    this.#timer = undefined
    await Promise.allSettled([...this.#active.values()])
  }

  /** True while a claimed run of this provider has not yet become a run row. Chat checks this. */
  providerClaimed(provider: ProviderId): boolean {
    return this.#claimedProviders.has(provider)
  }

  #iso(ms = this.#now()): string {
    return new Date(ms).toISOString()
  }

  // ---- the tick ----

  tick(): void {
    if (this.#ticking) return
    this.#ticking = true
    try {
      this.#recoverLost()
      this.#materialise()
      this.#applyCatchUp()
      this.#claimDue()
    } catch {
      /* the database is closing */
    } finally {
      this.#ticking = false
    }
  }

  /** A lease that ran out while no process of ours holds it means the daemon died mid-run. */
  #recoverLost(): void {
    const now = this.#iso()
    const lost = this.#store.db
      .prepare(`SELECT * FROM scheduled_run WHERE status IN ('claimed','running') AND lease_expires_at <= ?`)
      .all(now) as unknown as RunRow[]
    for (const row of lost) {
      if (this.#active.has(row.id)) continue
      this.#fail(row, 'lost', 'The daemon stopped while this run was in progress.', true)
    }
  }

  /** Turns the cron into rows for every slot between the last pass and now. */
  #materialise(): void {
    const nowMs = this.#now()
    const tasks = this.#store.db.prepare('SELECT * FROM task WHERE enabled = 1').all() as unknown as TaskRow[]
    for (const task of tasks) {
      const from = new Date(task.materialised_until)
      let fires: Date[] = []
      try {
        const job = new Cron(task.cron, { timezone: task.timezone })
        let cursor: Date | null = job.nextRun(from)
        while (cursor && cursor.getTime() <= nowMs && fires.length < MAX_FIRES_PER_PASS) {
          fires.push(cursor)
          cursor = job.nextRun(cursor)
        }
      } catch {
        fires = []
      }
      const insert = this.#store.db.prepare(`INSERT OR IGNORE INTO scheduled_run (id, task_id, due_at, status, created_at) VALUES (?, ?, ?, 'due', ?)`)
      for (const fire of fires) insert.run(randomUUID(), task.id, fire.toISOString(), this.#iso())
      // Only ever moves forward, and in the same pass as the inserts, so a slot is never made twice or skipped over.
      this.#store.db.prepare('UPDATE task SET materialised_until = ? WHERE id = ? AND materialised_until < ?').run(this.#iso(nowMs), task.id, this.#iso(nowMs))
    }
  }

  /** Bounded catch-up for first attempts only (retries and manual runs are never skipped by age). */
  #applyCatchUp(): void {
    const nowMs = this.#now()
    const cutoff = this.#iso(nowMs - this.#graceMs)
    const tasks = this.#store.db.prepare('SELECT * FROM task').all() as unknown as TaskRow[]
    for (const task of tasks) {
      const missed = this.#store.db
        .prepare(`SELECT * FROM scheduled_run WHERE task_id = ? AND status = 'due' AND attempt = 0 AND manual = 0 AND due_at < ? ORDER BY due_at`)
        .all(task.id, cutoff) as unknown as RunRow[]
      if (missed.length === 0) continue
      const tooOld = this.#iso(nowMs - this.#maxAgeMs)
      const fresh = missed.filter((r) => r.due_at >= tooOld)
      for (const r of missed) if (r.due_at < tooOld) this.#skip(r, 'Missed by more than the catch-up limit.')
      const keep = task.catch_up === 'skip' ? 0 : task.catch_up === 'once' ? 1 : this.#maxRuns
      const dropCount = Math.max(0, fresh.length - keep)
      for (const r of fresh.slice(0, dropCount)) {
        this.#skip(r, task.catch_up === 'skip' ? 'Missed while junosd was not running.' : task.catch_up === 'once' ? 'Collapsed into one catch-up run.' : 'Beyond the catch-up limit.')
      }
    }
  }

  #skip(row: RunRow, reason: string): void {
    const res = this.#store.db
      .prepare(`UPDATE scheduled_run SET status = 'skipped', error = ?, finished_at = ? WHERE id = ? AND status = 'due'`)
      .run(reason, this.#iso(), row.id)
    if (Number(res.changes) === 1) this.#store.append('task.run.skipped', { taskId: row.task_id, runId: row.id, dueAt: row.due_at, reason }, row.id)
  }

  #claimDue(): void {
    if (this.#runs.paused) return // after Stop nothing starts; the slots stay due and catch-up decides later
    const now = this.#iso()
    const stale = this.#iso(this.#now() - this.#graceMs)
    const due = this.#store.db
      .prepare(`SELECT * FROM scheduled_run WHERE status = 'due' AND due_at <= ? AND (retry_at IS NULL OR retry_at <= ?) ORDER BY due_at`)
      .all(now, now) as unknown as RunRow[]
    for (const row of due) {
      const task = this.#store.db.prepare('SELECT * FROM task WHERE id = ?').get(row.task_id) as TaskRow | undefined
      if (!task) continue
      // Overlap policy: the previous run of this task is still going.
      const going = this.#store.db.prepare(`SELECT 1 FROM scheduled_run WHERE task_id = ? AND status IN ('claimed','running') AND id != ?`).get(task.id, row.id)
      if (going) {
        // Only a slot that arrived on time is skipped. Backlog (catch-up and retries) simply waits its turn.
        if (task.overlap === 'skip' && row.due_at >= stale && row.attempt === 0 && !row.manual) this.#skip(row, 'The previous run was still going.')
        continue
      }
      // One job per subscription: wait for a free slot rather than start a second.
      if (this.#providerBusy(task.provider)) continue
      const claim = this.#store.db
        .prepare(`UPDATE scheduled_run SET status = 'claimed', lease_owner = ?, lease_expires_at = ?, started_at = COALESCE(started_at, ?) WHERE id = ? AND status = 'due'`)
        .run(this.#owner, this.#iso(this.#now() + this.#leaseMs), now, row.id)
      if (Number(claim.changes) !== 1) continue // another claimer won; exactly one process runs a slot
      this.#claimedProviders.add(task.provider)
      this.#store.append('task.run.claimed', { taskId: task.id, runId: row.id, dueAt: row.due_at, attempt: row.attempt }, row.id)
      const promise = this.#run(row, task).finally(() => {
        this.#active.delete(row.id)
        this.#claimedProviders.delete(task.provider)
      })
      this.#active.set(row.id, promise)
    }
  }

  /** Takes the provider's one slot for something outside the scheduler (a workflow step). False when it is in use. */
  tryClaimProvider(provider: ProviderId): boolean {
    if (this.#providerBusy(provider)) return false
    this.#claimedProviders.add(provider)
    return true
  }

  releaseProvider(provider: ProviderId): void {
    this.#claimedProviders.delete(provider)
  }

  #providerBusy(provider: ProviderId): boolean {
    if (this.#claimedProviders.has(provider)) return true
    return this.#runs.list().some((r) => r.provider === provider && (r.status === 'running' || r.status === 'cancelling' || (r.status === 'stop_unconfirmed' && this.#runs.isTracked(r.id))))
  }

  async #run(row: RunRow, task: TaskRow): Promise<void> {
    this.#store.db.prepare(`UPDATE scheduled_run SET status = 'running' WHERE id = ? AND status = 'claimed'`).run(row.id)
    const log: string[] = []
    const addLog = (line: string) => {
      log.push(`${this.#iso()} ${line}`.slice(0, 500))
      this.#store.db.prepare('UPDATE scheduled_run SET log = ? WHERE id = ?').run(JSON.stringify(log.slice(-200)), row.id)
    }
    addLog(`Started (attempt ${row.attempt + 1} of ${task.max_attempts}) on ${task.provider}`)
    // The lease is renewed while the run is alive; a dead daemon stops renewing it and the next start recovers the row.
    const beat = setInterval(() => {
      try {
        this.#store.db.prepare(`UPDATE scheduled_run SET lease_expires_at = ? WHERE id = ? AND status = 'running'`).run(this.#iso(this.#now() + this.#leaseMs), row.id)
      } catch {
        /* closing */
      }
    }, Math.max(10, Math.floor(this.#leaseMs / 3)))
    beat.unref()
    try {
      const out = await this.#execute.run(task, {
        log: addLog,
        onRun: (runId) => this.#store.db.prepare('UPDATE scheduled_run SET run_id = ? WHERE id = ?').run(runId, row.id),
      })
      const text = out.text.slice(0, MAX_OUTPUT)
      addLog(`Finished, ${out.text.length} characters`)
      const done = this.#store.db
        .prepare(`UPDATE scheduled_run SET status = 'succeeded', finished_at = ?, output = ?, error = NULL, lease_owner = NULL, lease_expires_at = NULL WHERE id = ? AND status = 'running'`)
        .run(this.#iso(), text, row.id)
      if (Number(done.changes) === 1) {
        this.#store.append('task.run.succeeded', { taskId: task.id, runId: row.id, dueAt: row.due_at }, row.id)
        this.#inbox.add({
          kind: 'result',
          priority: 'normal',
          title: `${task.name}: finished`,
          body: text.replace(/\s+/g, ' ').slice(0, 300),
          source: 'task',
          key: `${task.id}:${row.id}`,
          refId: `task-run:${row.id}`,
        })
      }
    } catch (err) {
      const e = err instanceof ExecutionError ? err : new ExecutionError('failed', err instanceof Error ? err.message : 'The task failed.')
      addLog(`Failed: ${e.message}`)
      // A rate limit or a transient failure can pass; a sign-in problem, a missing disclosure or a Stop will not.
      const retryable = e.kind === 'failed' || e.kind === 'rate_limited'
      this.#fail(row, e.kind, e.message, retryable)
    } finally {
      clearInterval(beat)
    }
  }

  /** Marks a run failed and, when it may help, makes the same row due again after a backoff. */
  #fail(row: RunRow, kind: string, message: string, retryable: boolean): void {
    const task = this.#store.db.prepare('SELECT * FROM task WHERE id = ?').get(row.task_id) as TaskRow | undefined
    const now = this.#now()
    const canRetry = retryable && task !== undefined && row.attempt + 1 < task.max_attempts
    if (canRetry) {
      const wait = this.#backoff[Math.min(row.attempt, this.#backoff.length - 1)] ?? 60_000
      const res = this.#store.db
        .prepare(
          `UPDATE scheduled_run SET status = 'due', attempt = attempt + 1, retry_at = ?, error = ?, lease_owner = NULL, lease_expires_at = NULL
           WHERE id = ? AND status IN ('claimed','running') AND attempt < ?`,
        )
        .run(this.#iso(now + wait), message, row.id, (task?.max_attempts ?? 1) - 1)
      if (Number(res.changes) === 1) {
        this.#store.append('task.run.retry', { taskId: row.task_id, runId: row.id, attempt: row.attempt + 1, kind }, row.id)
        return
      }
    }
    const res = this.#store.db
      .prepare(`UPDATE scheduled_run SET status = 'failed', finished_at = ?, error = ?, lease_owner = NULL, lease_expires_at = NULL WHERE id = ? AND status IN ('claimed','running','due')`)
      .run(this.#iso(now), message, row.id)
    if (Number(res.changes) !== 1) return
    this.#store.append('task.run.failed', { taskId: row.task_id, runId: row.id, dueAt: row.due_at, kind, attempts: row.attempt + 1 }, row.id)
    if (task && kind !== 'stopped') {
      this.#inbox.add({
        kind: 'failure',
        priority: 'normal',
        title: `${task.name}: failed`,
        body: message.slice(0, 300),
        source: 'task',
        key: `${task.id}:${row.id}`,
        refId: `task-run:${row.id}`,
      })
    }
  }

  // ---- tasks (the API) ----

  validate(input: Partial<TaskInput>, models: (provider: ProviderId, model: string, effort: Effort) => string | null): TaskInput {
    const fail = (code: string, message: string): never => {
      throw new TaskError(400, code, message)
    }
    const name = typeof input.name === 'string' ? input.name.trim() : ''
    if (!name || name.length > 80) fail('bad_name', 'Give the task a name of up to 80 characters.')
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : ''
    if (!prompt || prompt.length > 10_000) fail('bad_prompt', 'The prompt must be between 1 and 10,000 characters.')
    const provider = input.provider as ProviderId
    if (!(PROVIDER_IDS as readonly string[]).includes(provider)) fail('bad_provider', 'Unknown provider.')
    const model = typeof input.model === 'string' ? input.model : ''
    const effort = (input.effort ?? 'medium') as Effort
    if (!(EFFORTS as readonly string[]).includes(effort)) fail('bad_effort', 'Unknown effort.')
    const modelProblem = models(provider, model, effort)
    if (modelProblem) fail('bad_model', modelProblem)
    const timezone = typeof input.timezone === 'string' && input.timezone ? input.timezone : 'Europe/Copenhagen'
    const preview = previewCron(String(input.cron ?? ''), timezone, new Date(this.#now()))
    if (!preview.valid) fail('bad_schedule', preview.error ?? 'Invalid schedule.')
    const catchUp = (input.catchUp ?? 'skip') as CatchUpMode
    if (!(CATCH_UP_MODES as readonly string[]).includes(catchUp)) fail('bad_catch_up', 'Catch-up must be skip, once or all.')
    const overlap = (input.overlap ?? 'skip') as OverlapMode
    if (!(OVERLAP_MODES as readonly string[]).includes(overlap)) fail('bad_overlap', 'Overlap must be skip or queue.')
    const maxAttempts = input.maxAttempts ?? 3
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) fail('bad_attempts', 'Attempts must be a whole number from 1 to 5.')
    return { name, prompt, provider, model, effort, cron: String(input.cron).trim(), timezone, catchUp, overlap, maxAttempts, enabled: input.enabled !== false }
  }

  create(input: TaskInput): TaskRecord {
    const id = randomUUID()
    const now = this.#iso()
    this.#store.db
      .prepare(
        `INSERT INTO task (id, name, prompt, provider, model, effort, cron, timezone, enabled, catch_up, overlap, max_attempts, materialised_until, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      // A new task never backfills the past: its first slot is the next fire time.
      .run(id, input.name, input.prompt, input.provider, input.model, input.effort, input.cron, input.timezone, input.enabled ? 1 : 0, input.catchUp, input.overlap, input.maxAttempts, now, now, now)
    this.#store.append('task.created', { taskId: id, name: input.name, cron: input.cron, provider: input.provider }, id)
    return this.get(id)!
  }

  update(id: string, input: TaskInput): TaskRecord {
    const old = this.#row(id)
    if (!old) throw new TaskError(404, 'not_found', 'No such task')
    const now = this.#iso()
    // Changing the schedule or turning a task on starts from now; slots in the paused gap are not owed.
    const restart = input.cron !== old.cron || input.timezone !== old.timezone || (input.enabled && !old.enabled)
    this.#store.db
      .prepare(
        `UPDATE task SET name = ?, prompt = ?, provider = ?, model = ?, effort = ?, cron = ?, timezone = ?, enabled = ?, catch_up = ?, overlap = ?, max_attempts = ?,
         materialised_until = CASE WHEN ? THEN ? ELSE materialised_until END, updated_at = ? WHERE id = ?`,
      )
      .run(input.name, input.prompt, input.provider, input.model, input.effort, input.cron, input.timezone, input.enabled ? 1 : 0, input.catchUp, input.overlap, input.maxAttempts, restart ? 1 : 0, now, now, id)
    this.#store.append('task.updated', { taskId: id, enabled: input.enabled }, id)
    return this.get(id)!
  }

  setEnabled(id: string, enabled: boolean): TaskRecord {
    const old = this.#row(id)
    if (!old) throw new TaskError(404, 'not_found', 'No such task')
    const now = this.#iso()
    this.#store.db
      .prepare('UPDATE task SET enabled = ?, materialised_until = CASE WHEN ? AND enabled = 0 THEN ? ELSE materialised_until END, updated_at = ? WHERE id = ?')
      .run(enabled ? 1 : 0, enabled ? 1 : 0, now, now, id)
    this.#store.append(enabled ? 'task.resumed' : 'task.paused', { taskId: id }, id)
    return this.get(id)!
  }

  delete(id: string): void {
    if (!this.#row(id)) throw new TaskError(404, 'not_found', 'No such task')
    if (this.#store.db.prepare(`SELECT 1 FROM scheduled_run WHERE task_id = ? AND status IN ('claimed','running')`).get(id)) {
      throw new TaskError(409, 'running', 'This task is running. Stop it first.')
    }
    this.#store.db.prepare('DELETE FROM task WHERE id = ?').run(id)
    this.#store.append('task.deleted', { taskId: id }, id)
  }

  /** "Run now": a slot due immediately, exempt from catch-up. */
  runNow(id: string): ScheduledRunRecord {
    const task = this.#row(id)
    if (!task) throw new TaskError(404, 'not_found', 'No such task')
    if (this.#runs.paused) throw new TaskError(409, 'paused', 'junosd is stopped. Resume before running a task.')
    const rowId = randomUUID()
    const res = this.#store.db
      .prepare(`INSERT OR IGNORE INTO scheduled_run (id, task_id, due_at, status, manual, created_at) VALUES (?, ?, ?, 'due', 1, ?)`)
      .run(rowId, id, this.#iso(), this.#iso())
    if (Number(res.changes) !== 1) throw new TaskError(409, 'duplicate', 'A run was just queued. Try again in a moment.')
    this.#store.append('task.run.queued', { taskId: id, runId: rowId, manual: true }, rowId)
    this.tick()
    return this.run(rowId)!
  }

  list(): TaskRecord[] {
    const rows = this.#store.db.prepare('SELECT * FROM task ORDER BY created_at').all() as unknown as TaskRow[]
    return rows.map((r) => this.#toTask(r))
  }

  get(id: string): TaskRecord | undefined {
    const row = this.#row(id)
    return row && this.#toTask(row)
  }

  runs(taskId: string, limit = 50): ScheduledRunRecord[] {
    const rows = this.#store.db.prepare('SELECT * FROM scheduled_run WHERE task_id = ? ORDER BY due_at DESC, created_at DESC LIMIT ?').all(taskId, limit) as unknown as RunRow[]
    return rows.map(toRun)
  }

  run(id: string): ScheduledRunRecord | undefined {
    const row = this.#store.db.prepare('SELECT * FROM scheduled_run WHERE id = ?').get(id) as RunRow | undefined
    return row && toRun(row)
  }

  #row(id: string): TaskRow | undefined {
    return this.#store.db.prepare('SELECT * FROM task WHERE id = ?').get(id) as TaskRow | undefined
  }

  #toTask(row: TaskRow): TaskRecord {
    const preview = previewCron(row.cron, row.timezone, new Date(this.#now()))
    const last = this.#store.db
      .prepare(`SELECT * FROM scheduled_run WHERE task_id = ? AND status IN ('succeeded','failed','running','claimed') ORDER BY COALESCE(started_at, due_at) DESC LIMIT 1`)
      .get(row.id) as RunRow | undefined
    const active = this.#store.db.prepare(`SELECT 1 FROM scheduled_run WHERE task_id = ? AND status IN ('claimed','running')`).get(row.id)
    return {
      id: row.id,
      name: row.name,
      prompt: row.prompt,
      provider: row.provider,
      model: row.model,
      effort: row.effort,
      cron: row.cron,
      timezone: row.timezone,
      catchUp: row.catch_up,
      overlap: row.overlap,
      maxAttempts: Number(row.max_attempts),
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      nextRuns: row.enabled ? preview.nextRuns : [],
      lastRun: last ? toRun(last) : null,
      running: Boolean(active),
    }
  }
}

function toRun(row: RunRow): ScheduledRunRecord {
  let log: string[] = []
  try {
    log = JSON.parse(row.log) as string[]
  } catch {
    /* keep empty */
  }
  return {
    id: row.id,
    taskId: row.task_id,
    dueAt: row.due_at,
    status: row.status,
    attempt: Number(row.attempt),
    retryAt: row.retry_at,
    manual: Boolean(row.manual),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    error: row.error,
    output: row.output,
    log,
    runId: row.run_id,
  }
}

export { ACTIVE as ACTIVE_STATUSES }
