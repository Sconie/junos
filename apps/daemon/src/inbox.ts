import { randomUUID } from 'node:crypto'
import type { InboxActionRequest, InboxCounts, InboxItem, InboxKind, InboxPriority, InboxStatus, JunosEvent } from '@junos/shared'
import type { Gateway } from './gateway.ts'
import type { RunManager } from './runs.ts'
import type { EventStore } from './store.ts'

export class InboxError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface ItemRow {
  id: string
  kind: InboxKind
  priority: InboxPriority
  title: string
  body: string
  source: string
  key: string
  status: InboxStatus
  resolution: string | null
  ref_id: string | null
  created_at: string
  updated_at: string
  snooze_until: string | null
  tg_message_id: number | null
  tg_nonce: string | null
  tg_sent_at: string | null
}

export interface InboxOptions {
  store: EventStore
  gateway: Gateway
  runs: RunManager
  now?: () => number
}

type Listener = (item: InboxItem) => void

/** Same source and key inside this window updates the existing item instead of adding another (spec 07). */
const DEDUPE_MS = 24 * 60 * 60 * 1000

/**
 * The single queue of decisions, results and failures. It is built from events, so the Inbox can never
 * disagree with the approval or run it is about: it follows them.
 */
export class InboxService {
  readonly #store: EventStore
  readonly #gateway: Gateway
  readonly #runs: RunManager
  readonly #now: () => number
  readonly #created = new Set<Listener>()
  readonly #resolved = new Set<Listener>()

  constructor(options: InboxOptions) {
    this.#store = options.store
    this.#gateway = options.gateway
    this.#runs = options.runs
    this.#now = options.now ?? Date.now
    this.#store.subscribe((event) => this.#onEvent(event))
  }

  /** Called when an item is created (and again when a deduped item is bumped). */
  onCreated(fn: Listener): () => void {
    this.#created.add(fn)
    return () => this.#created.delete(fn)
  }

  /** Called when an item becomes resolved because its approval was decided, expired or revoked. */
  onResolved(fn: Listener): () => void {
    this.#resolved.add(fn)
    return () => this.#resolved.delete(fn)
  }

  #iso(): string {
    return new Date(this.#now()).toISOString()
  }

  #onEvent(event: JunosEvent): void {
    try {
      switch (event.type) {
        case 'approval.requested':
          return void this.#approvalRequested(event)
        case 'approval.approved':
        case 'approval.denied':
        case 'approval.consumed':
        case 'approval.expired':
          return void this.#approvalSettled(event)
        case 'run.failed':
          return void this.#runFailed(event)
        case 'run.stop_unconfirmed':
          return void this.#stopUnconfirmed(event)
        default:
          return
      }
    } catch {
      /* the database is closing; there is nothing left to record */
    }
  }

  #approvalRequested(event: JunosEvent): void {
    const id = String(event.payload.approvalId ?? '')
    const approval = this.#gateway.get(id)
    if (!approval) return
    this.add({
      kind: 'approval',
      priority: 'urgent',
      title: `Approval needed: ${approval.tool}`,
      body: `${approval.actor} wants to run ${approval.tool}${approval.target ? ` on ${approval.target}` : ''}. ${approval.irreversible ? 'This cannot be undone.' : ''}`.trim(),
      source: approval.actor,
      key: approval.digest,
      refId: id,
    })
  }

  #approvalSettled(event: JunosEvent): void {
    const id = String(event.payload.approvalId ?? '')
    const found = this.#byRef('approval', id)
    if (!found || found.status === 'resolved') return
    const resolution = event.type === 'approval.approved' ? 'approved' : event.type === 'approval.denied' ? 'denied' : event.type === 'approval.expired' ? 'expired' : 'approved'
    // A consumed approval was approved first; keep that wording.
    if (event.type === 'approval.consumed') return
    this.#store.db.prepare(`UPDATE inbox_item SET status = 'resolved', resolution = ?, updated_at = ? WHERE id = ?`).run(resolution, this.#iso(), found.id)
    const item = this.#item(found.id)!
    this.#store.append('inbox.item', { itemId: item.id, kind: item.kind, action: 'resolved', resolution }, item.id)
    for (const fn of this.#resolved) fn(item)
  }

  #runFailed(event: JunosEvent): void {
    const runId = String(event.payload.runId ?? '')
    const run = this.#runs.get(runId)
    // A task run reports through its own task events: only its last failed attempt reaches the Inbox.
    if (run?.kind === 'task') return
    this.add({
      kind: 'failure',
      priority: 'normal',
      title: `A ${run?.source ?? 'run'} run failed`,
      body: run?.error ?? `It exited with code ${event.payload.exitCode ?? 'unknown'}.`,
      source: run?.source ?? 'run',
      key: runId,
      refId: runId,
    })
  }

  #stopUnconfirmed(event: JunosEvent): void {
    const runId = String(event.payload.runId ?? '')
    this.add({
      kind: 'failure',
      priority: 'urgent',
      title: 'Stop not confirmed',
      body: 'A process may still be running after Stop. Check the machine.',
      source: 'stop',
      key: `stop:${runId}`,
      refId: `stop:${runId}`,
    })
  }

  #byRef(kind: InboxKind, refId: string): ItemRow | undefined {
    return this.#store.db.prepare('SELECT * FROM inbox_item WHERE kind = ? AND ref_id = ?').get(kind, refId) as ItemRow | undefined
  }

  add(input: { kind: InboxKind; priority: InboxPriority; title: string; body: string; source: string; key: string; refId: string }): void {
    const now = this.#iso()
    const existingByRef = this.#byRef(input.kind, input.refId)
    if (existingByRef) return // the same thing again: nothing new to say
    const since = new Date(this.#now() - DEDUPE_MS).toISOString()
    // An approval is its own item even if an earlier one had the same digest: each has to be answerable.
    const dupe = input.kind === 'approval' ? undefined : this.#store.db
      .prepare(`SELECT * FROM inbox_item WHERE kind = ? AND source = ? AND key = ? AND created_at >= ? AND status != 'resolved' ORDER BY created_at DESC LIMIT 1`)
      .get(input.kind, input.source, input.key, since) as ItemRow | undefined
    if (dupe) {
      this.#store.db
        .prepare(`UPDATE inbox_item SET title = ?, body = ?, updated_at = ?, status = CASE WHEN status = 'done' THEN 'new' ELSE status END WHERE id = ?`)
        .run(input.title, input.body, now, dupe.id)
      const item = this.#item(dupe.id)!
      this.#store.append('inbox.item', { itemId: item.id, kind: item.kind, priority: item.priority, action: 'updated' }, item.id)
      return
    }
    const id = randomUUID()
    this.#store.db
      .prepare(
        `INSERT INTO inbox_item (id, kind, priority, title, body, source, key, status, ref_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)`,
      )
      .run(id, input.kind, input.priority, input.title, input.body, input.source, input.key, input.refId, now, now)
    const item = this.#item(id)!
    this.#store.append('inbox.item', { itemId: id, kind: item.kind, priority: item.priority, action: 'created' }, id)
    for (const fn of this.#created) fn(item)
  }

  #item(id: string): InboxItem | undefined {
    const row = this.#store.db.prepare('SELECT * FROM inbox_item WHERE id = ?').get(id) as ItemRow | undefined
    return row && this.#toItem(row)
  }

  get(id: string): InboxItem | undefined {
    this.#wakeSnoozed()
    return this.#item(id)
  }

  /** The Telegram bookkeeping for an item: which message mirrors it, and the one-time code its buttons carry. */
  telegram(id: string): { messageId: number | null; nonce: string | null } {
    const row = this.#store.db.prepare('SELECT tg_message_id, tg_nonce FROM inbox_item WHERE id = ?').get(id) as { tg_message_id: number | null; tg_nonce: string | null } | undefined
    return { messageId: row?.tg_message_id === null || row?.tg_message_id === undefined ? null : Number(row.tg_message_id), nonce: row?.tg_nonce ?? null }
  }

  setTelegram(id: string, messageId: number | null, nonce: string | null): void {
    this.#store.db.prepare('UPDATE inbox_item SET tg_message_id = ?, tg_nonce = ?, tg_sent_at = ? WHERE id = ?').run(messageId, nonce, this.#iso(), id)
  }

  /** The item that mirrors a given Telegram message, if any. */
  byTelegramMessage(messageId: number): InboxItem | undefined {
    const row = this.#store.db.prepare('SELECT * FROM inbox_item WHERE tg_message_id = ?').get(messageId) as ItemRow | undefined
    return row && this.#toItem(row)
  }

  byApproval(approvalId: string): InboxItem | undefined {
    const row = this.#byRef('approval', approvalId)
    return row && this.#toItem(row)
  }

  /** Items not yet sent to Telegram, oldest first. Approvals are the only urgent kind. */
  unsentToTelegram(): InboxItem[] {
    const rows = this.#store.db.prepare(`SELECT * FROM inbox_item WHERE tg_sent_at IS NULL AND status = 'new' ORDER BY created_at`).all() as unknown as ItemRow[]
    return rows.map((r) => this.#toItem(r))
  }

  list(filter: { status?: string; kind?: string } = {}): { items: InboxItem[]; counts: InboxCounts } {
    this.#wakeSnoozed()
    const rows = this.#store.db.prepare('SELECT * FROM inbox_item ORDER BY CASE priority WHEN \'urgent\' THEN 0 WHEN \'normal\' THEN 1 ELSE 2 END, created_at DESC LIMIT 500').all() as unknown as ItemRow[]
    const all = rows.map((r) => this.#toItem(r))
    const items = all.filter((i) => {
      if (filter.kind && i.kind !== filter.kind) return false
      if (filter.status === 'needs_me') return needsMe(i)
      if (filter.status && i.status !== filter.status) return false
      return true
    })
    const counts: InboxCounts = {
      needsMe: all.filter(needsMe).length,
      approvals: all.filter((i) => i.kind === 'approval' && needsMe(i)).length,
      failures: all.filter((i) => i.kind === 'failure' && needsMe(i)).length,
      done: all.filter((i) => i.status === 'done' || i.status === 'resolved').length,
      snoozed: all.filter((i) => i.status === 'snoozed').length,
      all: all.length,
    }
    return { items, counts }
  }

  /** Done, snooze and reopen. Approve and deny are not here: they go through the one approvals API. */
  act(id: string, req: InboxActionRequest): InboxItem {
    const item = this.#item(id)
    if (!item) throw new InboxError(404, 'not_found', 'No such item')
    const now = this.#iso()
    if (item.kind === 'approval' && item.status !== 'resolved' && req.action === 'done') {
      throw new InboxError(409, 'approval_open', 'An approval is finished by approving or denying it, not by marking it done.')
    }
    if (req.action === 'done') {
      this.#store.db.prepare(`UPDATE inbox_item SET status = 'done', updated_at = ? WHERE id = ?`).run(now, id)
    } else if (req.action === 'snooze') {
      const until = req.until ? Date.parse(req.until) : NaN
      if (!Number.isFinite(until) || until <= this.#now()) throw new InboxError(400, 'bad_snooze', 'Snooze needs a time in the future')
      if (item.kind === 'approval' && item.status !== 'resolved') throw new InboxError(409, 'approval_open', 'A waiting approval cannot be snoozed; it expires on its own.')
      this.#store.db.prepare(`UPDATE inbox_item SET status = 'snoozed', snooze_until = ?, updated_at = ? WHERE id = ?`).run(new Date(until).toISOString(), now, id)
    } else if (req.action === 'reopen') {
      if (item.status === 'resolved') throw new InboxError(409, 'resolved', 'A settled approval cannot be reopened')
      this.#store.db.prepare(`UPDATE inbox_item SET status = 'new', snooze_until = NULL, updated_at = ? WHERE id = ?`).run(now, id)
    } else {
      throw new InboxError(400, 'bad_action', 'Unknown action')
    }
    this.#store.append('inbox.item', { itemId: id, kind: item.kind, action: req.action }, id)
    return this.#item(id)!
  }

  #wakeSnoozed(): void {
    this.wakeDue()
  }

  /** Brings snoozed items back when due, and says so on the event stream so open screens and the badge refresh. */
  wakeDue(): number {
    const now = this.#iso()
    const due = this.#store.db.prepare(`SELECT id, kind FROM inbox_item WHERE status = 'snoozed' AND snooze_until <= ?`).all(now) as Array<{ id: string; kind: string }>
    for (const { id, kind } of due) {
      this.#store.db.prepare(`UPDATE inbox_item SET status = 'new', snooze_until = NULL, updated_at = ? WHERE id = ? AND status = 'snoozed'`).run(now, id)
      this.#store.append('inbox.item', { itemId: id, kind, action: 'woke' }, id)
    }
    return due.length
  }

  #toItem(row: ItemRow): InboxItem {
    const item: InboxItem = {
      id: row.id,
      kind: row.kind,
      priority: row.priority,
      title: row.title,
      body: row.body,
      source: row.source,
      status: row.status,
      resolution: row.resolution,
      refId: row.ref_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      snoozeUntil: row.snooze_until,
    }
    if (row.kind === 'approval' && row.ref_id) item.approval = this.#gateway.get(row.ref_id)
    return item
  }
}

const needsMe = (i: InboxItem) => i.status === 'new' && (i.kind === 'approval' || i.kind === 'failure' || i.kind === 'mention')
