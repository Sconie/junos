import { randomUUID } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync, backup } from 'node:sqlite'
import type { BackupRecord, BackupsResponse } from '@junos/shared'
import type { InboxService } from './inbox.ts'
import type { EventStore } from './store.ts'

export class BackupError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface BackupOptions {
  store: EventStore
  inbox: InboxService
  /** Where backups go (default: a `backups` folder beside the database). */
  dir: string
  now?: () => number
  /** Verified backups kept (default 14). */
  keep?: number
  /** The local hour after which the nightly backup is due (default 3). */
  hour?: number
  /** How often Scheduling looks (default 10 min). */
  tickMs?: number
  /** Whether the nightly schedule runs by itself (default true). Manual backups always work. */
  auto?: boolean
  /** Test hook: runs on the copy before it is verified. */
  afterCopy?: (path: string) => void | Promise<void>
}

/** Tables a usable JunOS database has. A copy without them is not a backup of this program. */
const REQUIRED_TABLES = ['event', 'session', 'approval', 'run', 'conversation', 'message', 'inbox_item', 'task', 'workflow_run', 'kanban_card', 'file_folder', 'scout_source']

/**
 * Opens a backup file on its own, read-only, and checks it: SQLite's integrity check, the tables JunOS needs, and that it
 * holds at least the events that existed when the backup began. A copy that cannot be opened and read back is not a backup.
 */
export function verifyBackup(path: string, expectMinSeq = 0): { ok: boolean; problems: string[] } {
  const problems: string[] = []
  let db: DatabaseSync | undefined
  try {
    if (!existsSync(path) || statSync(path).size === 0) return { ok: false, problems: ['The file is missing or empty.'] }
    db = new DatabaseSync(path, { readOnly: true })
    const integrity = db.prepare('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>
    if (integrity.length !== 1 || integrity[0]!.integrity_check !== 'ok') problems.push(`SQLite integrity check: ${integrity.slice(0, 3).map((r) => r.integrity_check).join('; ')}`)
    const tables = new Set((db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{ name: string }>).map((t) => t.name))
    const missing = REQUIRED_TABLES.filter((t) => !tables.has(t))
    if (missing.length > 0) problems.push(`Missing tables: ${missing.join(', ')}.`)
    else {
      const max = (db.prepare('SELECT COALESCE(MAX(seq), 0) AS m FROM event').get() as { m: number }).m
      if (max < expectMinSeq) problems.push(`It holds events only up to ${max}, but ${expectMinSeq} existed before the backup began.`)
    }
  } catch (err) {
    problems.push(`It could not be opened as a JunOS database: ${err instanceof Error ? err.message.split('\n')[0] : 'unknown error'}`)
  } finally {
    try {
      db?.close()
    } catch {
      /* already closed */
    }
  }
  return { ok: problems.length === 0, problems }
}

interface Row {
  id: string
  started_at: string
  finished_at: string | null
  status: BackupRecord['status']
  trigger: BackupRecord['trigger']
  file: string | null
  size: number | null
  verified: number
  pruned: number
  error: string | null
}

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')

/**
 * Nightly, verified backups of the SQLite database (the one place JunOS keeps state). Each backup is taken with SQLite's
 * online backup (a consistent snapshot while junosd keeps running), written under a temporary name, opened again on its own
 * and checked, and only then given its final name. A copy that fails the check is deleted and reported, never kept as a good one.
 */
export class BackupService {
  readonly #o: BackupOptions
  readonly #now: () => number
  #timer: ReturnType<typeof setInterval> | undefined
  #running: Promise<BackupRecord> | undefined

  constructor(options: BackupOptions) {
    this.#o = options
    this.#now = options.now ?? Date.now
  }

  get #keep(): number {
    return this.#o.keep ?? 14
  }

  get #hour(): number {
    return this.#o.hour ?? 3
  }

  start(): void {
    if (this.#timer) return
    this.#cleanPartials()
    if (this.#o.auto === false) return
    this.#timer = setInterval(() => this.tick(), this.#o.tickMs ?? 10 * 60_000)
    this.#timer.unref()
    this.tick()
  }

  async stopService(): Promise<void> {
    clearInterval(this.#timer)
    this.#timer = undefined
    await this.#running?.catch(() => {})
  }

  #iso(ms = this.#now()): string {
    return new Date(ms).toISOString()
  }

  /** A crash can leave a half-written copy. It is never a backup, so it is removed. */
  #cleanPartials(): void {
    try {
      for (const f of readdirSync(this.#o.dir)) if (f.includes('.partial')) rmSync(join(this.#o.dir, f), { force: true })
    } catch {
      /* no folder yet */
    }
  }

  // ---- when ----

  #lastOk(): Row | undefined {
    return this.#o.store.db.prepare(`SELECT * FROM backup_run WHERE status = 'ok' ORDER BY started_at DESC, rowid DESC LIMIT 1`).get() as Row | undefined
  }

  /**
   * When the next scheduled backup is due: the first local `hour`:00 at least twelve hours after the last good backup, or at once
   * when there is none yet. A daemon that was off at that hour finds it already past and backs up as soon as it starts.
   */
  nextDue(): number {
    const last = this.#lastOk()
    if (!last) return this.#now()
    const earliest = new Date(Date.parse(last.started_at) + 12 * 3600_000)
    const due = new Date(earliest)
    due.setHours(this.#hour, 0, 0, 0)
    if (due.getTime() < earliest.getTime()) due.setDate(due.getDate() + 1)
    return due.getTime()
  }

  tick(): void {
    if (this.#running || this.#now() < this.nextDue()) return
    void this.run('schedule').catch(() => {})
  }

  // ---- doing it ----

  run(trigger: 'manual' | 'schedule' = 'manual'): Promise<BackupRecord> {
    if (this.#running) throw new BackupError(409, 'busy', 'A backup is already running.')
    const work = this.#backup(trigger).finally(() => {
      this.#running = undefined
    })
    this.#running = work
    return work
  }

  async #backup(trigger: 'manual' | 'schedule'): Promise<BackupRecord> {
    const db = this.#o.store.db
    const id = randomUUID()
    const started = this.#now()
    db.prepare(`INSERT INTO backup_run (id, started_at, status, trigger) VALUES (?, ?, 'running', ?)`).run(id, this.#iso(started), trigger)
    this.#o.store.append('backup.started', { backupId: id, trigger }, id)
    const name = `junos-${stamp(started)}.db`
    const final = join(this.#o.dir, name)
    const partial = `${final}.partial`
    try {
      mkdirSync(this.#o.dir, { recursive: true, mode: 0o700 })
      const minSeq = (db.prepare('SELECT COALESCE(MAX(seq), 0) AS m FROM event').get() as { m: number }).m
      rmSync(partial, { force: true })
      await backup(db, partial)
      // The copy inherits WAL mode. Fold it into one self-contained file (no -wal or -shm beside it) before it is checked and named.
      const copy = new DatabaseSync(partial)
      try {
        copy.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE')
      } finally {
        copy.close()
      }
      await this.#o.afterCopy?.(partial)
      const check = verifyBackup(partial, minSeq)
      if (!check.ok) throw new Error(`The copy did not pass its check: ${check.problems.join(' ')}`)
      renameSync(partial, final)
      try {
        chmodSync(final, 0o600)
      } catch {
        /* not supported everywhere */
      }
      const size = statSync(final).size
      db.prepare(`UPDATE backup_run SET status = 'ok', finished_at = ?, file = ?, size = ?, verified = 1 WHERE id = ?`).run(this.#iso(), name, size, id)
      this.#o.store.append('backup.finished', { backupId: id, status: 'ok', file: name, size }, id)
      this.#prune()
    } catch (err) {
      for (const stray of [partial, `${partial}-wal`, `${partial}-shm`, `${partial}-journal`]) rmSync(stray, { force: true })
      const message = (err instanceof Error ? err.message : 'The backup failed.').split('\n')[0]!.slice(0, 300)
      db.prepare(`UPDATE backup_run SET status = 'failed', finished_at = ?, error = ? WHERE id = ?`).run(this.#iso(), message, id)
      this.#o.store.append('backup.finished', { backupId: id, status: 'failed', error: message }, id)
      this.#o.inbox.add({
        kind: 'failure',
        priority: 'urgent',
        title: 'The backup failed',
        body: `${message} The last good backup is still there. Check the disk and try Back up now.`,
        source: 'backup',
        key: 'backup-failed',
        refId: `backup:${id}`,
      })
    }
    return this.#record(db.prepare('SELECT * FROM backup_run WHERE id = ?').get(id) as unknown as Row)
  }

  /** Keeps the newest verified backups and deletes the rest. A failed or running row never counts as one to keep. */
  #prune(): void {
    const db = this.#o.store.db
    const ok = db.prepare(`SELECT * FROM backup_run WHERE status = 'ok' AND pruned = 0 ORDER BY started_at DESC, rowid DESC`).all() as unknown as Row[]
    for (const row of ok.slice(this.#keep)) {
      if (row.file) rmSync(join(this.#o.dir, row.file), { force: true })
      db.prepare('UPDATE backup_run SET pruned = 1 WHERE id = ?').run(row.id)
    }
  }

  // ---- reading ----

  #record(r: Row): BackupRecord {
    return {
      id: r.id,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      status: r.status,
      trigger: r.trigger,
      file: r.file,
      size: r.size,
      verified: r.verified === 1,
      present: r.status === 'ok' && r.pruned === 0 && r.file !== null && existsSync(join(this.#o.dir, r.file)),
      error: r.error,
    }
  }

  list(): BackupsResponse {
    const rows = this.#o.store.db.prepare('SELECT * FROM backup_run ORDER BY started_at DESC, rowid DESC LIMIT 60').all() as unknown as Row[]
    return { dir: this.#o.dir, keep: this.#keep, hour: this.#hour, running: this.#running !== undefined, nextDue: this.#iso(this.nextDue()), overdue: this.nextDue() <= this.#now(), backups: rows.map((r) => this.#record(r)) }
  }
}
