import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { JunosEvent } from '@junos/shared'
import { SESSION_TTL_MS } from './auth.ts'

type Listener = (event: JunosEvent) => void

interface EventRow {
  seq: number | bigint
  id: string
  type: string
  ref_id: string | null
  payload_json: string
  created_at: string
}

// Migrations run in order; PRAGMA user_version records how many have been applied.
const MIGRATIONS = [
  `CREATE TABLE event (
     seq INTEGER PRIMARY KEY AUTOINCREMENT,
     id TEXT NOT NULL UNIQUE,
     type TEXT NOT NULL,
     ref_id TEXT,
     payload_json TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  // Browser sessions: only a hash of the cookie token is stored.
  `CREATE TABLE session (
     id TEXT PRIMARY KEY,
     token_hash TEXT NOT NULL UNIQUE,
     csrf TEXT NOT NULL,
     created_at TEXT NOT NULL,
     last_seen_at TEXT NOT NULL,
     revoked_at TEXT
   )`,
]

/** SQLite-backed append-only event table. `seq` drives SSE resume. */
export class EventStore {
  readonly #db: DatabaseSync
  readonly #listeners = new Set<Listener>()

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.#db = new DatabaseSync(path)
    this.#db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;')
    this.#migrate()
  }

  #migrate(): void {
    const row = this.#db.prepare('PRAGMA user_version').get() as { user_version: number | bigint }
    for (let v = Number(row.user_version); v < MIGRATIONS.length; v++) {
      this.#db.exec('BEGIN')
      try {
        this.#db.exec(MIGRATIONS[v]!)
        this.#db.exec(`PRAGMA user_version = ${v + 1}`)
        this.#db.exec('COMMIT')
      } catch (err) {
        this.#db.exec('ROLLBACK')
        throw err
      }
    }
  }

  append(type: string, payload: Record<string, unknown> = {}, refId: string | null = null): JunosEvent {
    const id = randomUUID()
    const createdAt = new Date().toISOString()
    const result = this.#db
      .prepare('INSERT INTO event (id, type, ref_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, type, refId, JSON.stringify(payload), createdAt)
    const event: JunosEvent = { seq: Number(result.lastInsertRowid), id, type, refId, payload, createdAt }
    for (const listener of this.#listeners) listener(event)
    return event
  }

  /** Events with seq strictly greater than `seq`, oldest first. */
  since(seq: number): JunosEvent[] {
    const rows = this.#db.prepare('SELECT * FROM event WHERE seq > ? ORDER BY seq').all(seq) as unknown as EventRow[]
    return rows.map(toEvent)
  }

  lastSeq(): number {
    const row = this.#db.prepare('SELECT MAX(seq) AS seq FROM event').get() as { seq: number | bigint | null }
    return Number(row.seq ?? 0)
  }

  firstSeq(): number {
    const row = this.#db.prepare('SELECT MIN(seq) AS seq FROM event').get() as { seq: number | bigint | null }
    return Number(row.seq ?? 0)
  }

  createSession(id: string, tokenHash: string, csrf: string, now = Date.now()): void {
    const createdAt = new Date(now).toISOString()
    this.#db
      .prepare('INSERT INTO session (id, token_hash, csrf, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, tokenHash, csrf, createdAt, createdAt)
  }

  /** A non-revoked session younger than its 30-day lifetime. */
  sessionByHash(tokenHash: string, now = Date.now()): { id: string; csrf: string } | undefined {
    const expiresAfter = new Date(now - SESSION_TTL_MS).toISOString()
    const row = this.#db
      .prepare('SELECT id, csrf FROM session WHERE token_hash = ? AND revoked_at IS NULL AND created_at > ?')
      .get(tokenHash, expiresAfter) as { id: string; csrf: string } | undefined
    return row && { id: row.id, csrf: row.csrf }
  }

  sessionActive(id: string, now = Date.now()): boolean {
    const expiresAfter = new Date(now - SESSION_TTL_MS).toISOString()
    return Boolean(this.#db
      .prepare('SELECT 1 AS active FROM session WHERE id = ? AND revoked_at IS NULL AND created_at > ?')
      .get(id, expiresAfter))
  }

  revokeSession(id: string): void {
    this.#db.prepare('UPDATE session SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(new Date().toISOString(), id)
  }

  activeSessionCount(now = Date.now()): number {
    const expiresAfter = new Date(now - SESSION_TTL_MS).toISOString()
    const row = this.#db.prepare('SELECT COUNT(*) AS n FROM session WHERE revoked_at IS NULL AND created_at > ?').get(expiresAfter) as { n: number | bigint }
    return Number(row.n)
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  close(): void {
    this.#listeners.clear()
    this.#db.close()
  }
}

function toEvent(row: EventRow): JunosEvent {
  return {
    seq: Number(row.seq),
    id: row.id,
    type: row.type,
    refId: row.ref_id,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at,
  }
}
