import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { JunosEvent } from '@junos/shared'

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
  // Approvals (spec 02/12). Status changes are compare-and-set UPDATEs; an approved row is consumed once.
  `CREATE TABLE approval (
     id TEXT PRIMARY KEY,
     run_id TEXT,
     action_digest TEXT NOT NULL,
     action_json TEXT NOT NULL,
     class TEXT NOT NULL,
     project_id TEXT,
     status TEXT NOT NULL CHECK (status IN ('pending','approved','consumed','denied','expired')),
     requested_at TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     decided_by TEXT,
     decided_channel TEXT,
     decided_at TEXT,
     consumed_at TEXT
   );
   CREATE INDEX approval_status ON approval (status, requested_at)`,
  // Runs (spec 02), plus what a stop needs to record.
  `CREATE TABLE run (
     id TEXT PRIMARY KEY,
     kind TEXT NOT NULL,
     source TEXT NOT NULL,
     status TEXT NOT NULL,
     started_at TEXT NOT NULL,
     finished_at TEXT,
     exit_code INTEGER,
     signal TEXT,
     error TEXT,
     stop_requested_at TEXT,
     side_effects_json TEXT NOT NULL DEFAULT '[]'
   )`,
  // What a run asked of its provider (spec 04: visible in the run record).
  `ALTER TABLE run ADD COLUMN provider TEXT;
   ALTER TABLE run ADD COLUMN model TEXT;
   ALTER TABLE run ADD COLUMN effort TEXT`,
  // Chat (spec 02). The conversation remembers its model, effort and allowed providers.
  `CREATE TABLE conversation (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     kind TEXT NOT NULL DEFAULT 'chat',
     provider TEXT NOT NULL,
     model TEXT NOT NULL DEFAULT '',
     effort TEXT NOT NULL DEFAULT 'medium',
     allowed_providers_json TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE message (
     id TEXT PRIMARY KEY,
     conversation_id TEXT NOT NULL REFERENCES conversation (id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('user','assistant')),
     provider TEXT,
     model TEXT,
     effort TEXT,
     content_md TEXT NOT NULL DEFAULT '',
     thinking_md TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'complete',
     error TEXT,
     run_id TEXT,
     created_at TEXT NOT NULL
   );
   CREATE INDEX message_conversation ON message (conversation_id, created_at);
   CREATE TABLE provider_disclosure (
     provider TEXT PRIMARY KEY,
     acknowledged_at TEXT NOT NULL
   )`,
  // Inbox (spec 07): the decision queue. tg_* remember the Telegram message that mirrors an item.
  `CREATE TABLE inbox_item (
     id TEXT PRIMARY KEY,
     kind TEXT NOT NULL,
     priority TEXT NOT NULL,
     title TEXT NOT NULL,
     body TEXT NOT NULL DEFAULT '',
     source TEXT NOT NULL,
     key TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'new',
     resolution TEXT,
     ref_id TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     snooze_until TEXT,
     tg_message_id INTEGER,
     tg_nonce TEXT,
     tg_sent_at TEXT
   );
   CREATE INDEX inbox_status ON inbox_item (status, priority, created_at);
   CREATE UNIQUE INDEX inbox_ref ON inbox_item (kind, ref_id) WHERE ref_id IS NOT NULL`,
  // Scheduled tasks (spec 05). Schedules are persisted run rows, so nothing depends on in-memory timers.
  `CREATE TABLE task (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     prompt TEXT NOT NULL,
     provider TEXT NOT NULL,
     model TEXT NOT NULL DEFAULT '',
     effort TEXT NOT NULL DEFAULT 'medium',
     cron TEXT NOT NULL,
     timezone TEXT NOT NULL,
     enabled INTEGER NOT NULL DEFAULT 1,
     catch_up TEXT NOT NULL DEFAULT 'skip',
     overlap TEXT NOT NULL DEFAULT 'skip',
     max_attempts INTEGER NOT NULL DEFAULT 3,
     materialised_until TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE scheduled_run (
     id TEXT PRIMARY KEY,
     task_id TEXT NOT NULL REFERENCES task (id) ON DELETE CASCADE,
     due_at TEXT NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('due','claimed','running','succeeded','failed','skipped')),
     lease_owner TEXT,
     lease_expires_at TEXT,
     attempt INTEGER NOT NULL DEFAULT 0,
     retry_at TEXT,
     run_id TEXT,
     manual INTEGER NOT NULL DEFAULT 0,
     started_at TEXT,
     finished_at TEXT,
     error TEXT,
     output TEXT,
     log TEXT NOT NULL DEFAULT '[]',
     created_at TEXT NOT NULL,
     UNIQUE (task_id, due_at)
   );
   CREATE INDEX scheduled_run_status ON scheduled_run (status, due_at)`,
  // Workflows (spec 05). Definitions live as YAML files; a run keeps a snapshot of the definition it executes.
  `CREATE TABLE workflow_run (
     id TEXT PRIMARY KEY,
     workflow_id TEXT NOT NULL,
     name TEXT NOT NULL,
     version INTEGER NOT NULL,
     definition_json TEXT NOT NULL,
     status TEXT NOT NULL,
     trigger TEXT NOT NULL,
     dry_run INTEGER NOT NULL DEFAULT 0,
     params_json TEXT NOT NULL DEFAULT '{}',
     chain_json TEXT NOT NULL DEFAULT '[]',
     started_at TEXT NOT NULL,
     finished_at TEXT,
     error TEXT,
     current_step TEXT,
     approval_id TEXT
   );
   CREATE INDEX workflow_run_wf ON workflow_run (workflow_id, started_at);
   CREATE TABLE workflow_step_run (
     id TEXT PRIMARY KEY,
     run_id TEXT NOT NULL REFERENCES workflow_run (id) ON DELETE CASCADE,
     seq INTEGER NOT NULL,
     step_id TEXT NOT NULL,
     type TEXT NOT NULL,
     status TEXT NOT NULL,
     output TEXT,
     error TEXT,
     started_at TEXT,
     finished_at TEXT,
     UNIQUE (run_id, seq)
   );
   CREATE TABLE workflow_state (
     workflow_id TEXT PRIMARY KEY,
     paused INTEGER NOT NULL DEFAULT 0,
     paused_reason TEXT,
     cron_until TEXT
   );
   CREATE TABLE workflow_slot (
     workflow_id TEXT NOT NULL,
     due_at TEXT NOT NULL,
     PRIMARY KEY (workflow_id, due_at)
   )`,
  // Hermes (spec 06): what the console shows survives a restart; the agent keeps only a short ring buffer.
  `CREATE TABLE hermes_step (
     seq INTEGER PRIMARY KEY AUTOINCREMENT,
     id TEXT NOT NULL UNIQUE,
     approval_id TEXT,
     json TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX hermes_step_approval ON hermes_step (approval_id);
   CREATE TABLE hermes_message (
     seq INTEGER PRIMARY KEY AUTOINCREMENT,
     id TEXT NOT NULL UNIQUE,
     json TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  // Kanban (spec 09): one board; automation depends on the column's kind, never its name.
  `CREATE TABLE kanban_card (
     id TEXT PRIMARY KEY,
     column_key TEXT NOT NULL,
     position REAL NOT NULL,
     title TEXT NOT NULL,
     body_md TEXT NOT NULL DEFAULT '',
     creator TEXT NOT NULL,
     assignee TEXT NOT NULL DEFAULT 'none',
     project TEXT NOT NULL DEFAULT '',
     priority TEXT NOT NULL DEFAULT 'P2',
     labels_json TEXT NOT NULL DEFAULT '[]',
     due TEXT,
     checklist_json TEXT NOT NULL DEFAULT '[]',
     summary TEXT NOT NULL DEFAULT '',
     claimed_by TEXT,
     claim_run TEXT,
     claim_lease_expires TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX kanban_card_column ON kanban_card (column_key, position);
   CREATE TABLE kanban_activity (
     id TEXT PRIMARY KEY,
     card_id TEXT NOT NULL REFERENCES kanban_card (id) ON DELETE CASCADE,
     at TEXT NOT NULL,
     actor TEXT NOT NULL,
     text TEXT NOT NULL
   );
   CREATE INDEX kanban_activity_card ON kanban_activity (card_id, at)`,
  // Files and projects (spec 11): only folders Jonas adds are ever indexed; removing one deletes everything below.
  `CREATE TABLE file_folder (
     id TEXT PRIMARY KEY,
     path TEXT NOT NULL UNIQUE,
     label TEXT NOT NULL DEFAULT '',
     added_at TEXT NOT NULL,
     scanned_at TEXT,
     status TEXT NOT NULL DEFAULT 'scanning'
   );
   CREATE TABLE file_entry (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     folder_id TEXT NOT NULL,
     rel_path TEXT NOT NULL,
     name TEXT NOT NULL,
     ext TEXT NOT NULL DEFAULT '',
     kind TEXT NOT NULL,
     size INTEGER NOT NULL,
     mtime_ms INTEGER NOT NULL,
     text_indexed INTEGER NOT NULL DEFAULT 0,
     UNIQUE (folder_id, rel_path)
   );
   CREATE INDEX file_entry_folder ON file_entry (folder_id, rel_path);
   CREATE TABLE file_project (
     id TEXT PRIMARY KEY,
     folder_id TEXT NOT NULL,
     rel_path TEXT NOT NULL,
     name TEXT NOT NULL,
     UNIQUE (folder_id, rel_path)
   );
   CREATE VIRTUAL TABLE file_fts USING fts5(path, content);
   ALTER TABLE conversation ADD COLUMN project_id TEXT`,
  // Scout (spec 08): read-only collection and assessment. Web text is stored as data.
  `CREATE TABLE scout_source (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     kind TEXT NOT NULL DEFAULT 'feed',
     url TEXT NOT NULL DEFAULT '',
     cadence TEXT NOT NULL DEFAULT 'daily',
     enabled INTEGER NOT NULL DEFAULT 0,
     last_checked_at TEXT,
     health TEXT NOT NULL DEFAULT 'never',
     last_error TEXT,
     created_at TEXT NOT NULL
   );
   CREATE TABLE scout_item (
     id TEXT PRIMARY KEY,
     source_id TEXT NOT NULL,
     guid TEXT NOT NULL,
     title TEXT NOT NULL,
     link TEXT NOT NULL DEFAULT '',
     published_at TEXT,
     summary TEXT NOT NULL DEFAULT '',
     title_key TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'new',
     relevance INTEGER,
     seen_at TEXT NOT NULL,
     UNIQUE (source_id, guid)
   );
   CREATE TABLE scout_finding (
     id TEXT PRIMARY KEY,
     item_id TEXT NOT NULL,
     title TEXT NOT NULL,
     title_key TEXT NOT NULL UNIQUE,
     source_name TEXT NOT NULL,
     link TEXT NOT NULL DEFAULT '',
     summary TEXT NOT NULL DEFAULT '',
     relevance INTEGER NOT NULL,
     effort TEXT NOT NULL,
     risk TEXT NOT NULL,
     touches TEXT NOT NULL,
     why TEXT NOT NULL,
     suggestion TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'new',
     dismiss_reason TEXT,
     card_id TEXT,
     created_at TEXT NOT NULL
   );
   CREATE TABLE scout_dismissal (
     title_key TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     reason TEXT NOT NULL,
     at TEXT NOT NULL
   );
   CREATE TABLE scout_run (
     id TEXT PRIMARY KEY,
     trigger TEXT NOT NULL,
     status TEXT NOT NULL,
     started_at TEXT NOT NULL,
     finished_at TEXT,
     sources INTEGER NOT NULL DEFAULT 0,
     items INTEGER NOT NULL DEFAULT 0,
     kept INTEGER NOT NULL DEFAULT 0,
     findings INTEGER NOT NULL DEFAULT 0,
     model_calls INTEGER NOT NULL DEFAULT 0,
     error TEXT,
     log_json TEXT NOT NULL DEFAULT '[]'
   );
   CREATE TABLE scout_setting (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   )`,
  // Backups: every attempt is recorded; a file is a backup only once its copy has been opened and checked.
  `CREATE TABLE backup_run (
     id TEXT PRIMARY KEY,
     started_at TEXT NOT NULL,
     finished_at TEXT,
     status TEXT NOT NULL,
     trigger TEXT NOT NULL,
     file TEXT,
     size INTEGER,
     verified INTEGER NOT NULL DEFAULT 0,
     pruned INTEGER NOT NULL DEFAULT 0,
     error TEXT
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

  /** The open database, for stores that sit next to the event table (approvals). */
  get db(): DatabaseSync {
    return this.#db
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

  createSession(id: string, tokenHash: string, csrf: string): void {
    const now = new Date().toISOString()
    this.#db
      .prepare('INSERT INTO session (id, token_hash, csrf, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, tokenHash, csrf, now, now)
  }

  /** The live (not revoked) session for a token hash. */
  sessionByHash(tokenHash: string): { id: string; csrf: string } | undefined {
    const row = this.#db
      .prepare('SELECT id, csrf FROM session WHERE token_hash = ? AND revoked_at IS NULL')
      .get(tokenHash) as { id: string; csrf: string } | undefined
    return row && { id: row.id, csrf: row.csrf }
  }

  revokeSession(id: string): void {
    this.#db.prepare('UPDATE session SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(new Date().toISOString(), id)
  }

  activeSessionCount(): number {
    const row = this.#db.prepare('SELECT COUNT(*) AS n FROM session WHERE revoked_at IS NULL').get() as { n: number | bigint }
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
