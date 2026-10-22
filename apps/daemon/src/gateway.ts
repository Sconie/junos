import { randomUUID } from 'node:crypto'
import {
  ALWAYS_ASK_CLASSES,
  type ActionClass,
  type ActionRejection,
  type ActionRequest,
  type ActionResponse,
  type ApprovalRecord,
  type ApprovalStatus,
  type GatewayInfo,
} from '@junos/shared'
import { actionDigest, redact, type ActionRecord } from './canonical.ts'
import type { EventStore } from './store.ts'

/** A side-effecting capability the gateway knows how to classify and run. Nothing else can execute. */
export interface ToolDef {
  name: string
  class: ActionClass
  /** What the action touches (path, recipient, host), shown to the approver and bound into the digest. */
  target(args: Record<string, unknown>): string
  execute(args: Record<string, unknown>): unknown | Promise<unknown>
}

export type Autonomy = GatewayInfo['autonomy']

export interface GatewayOptions {
  store: EventStore
  tools: ToolDef[]
  now?: () => number
  approvalTtlMs?: number
  autonomy?: Autonomy
  testTools?: boolean
}

interface ApprovalRow {
  id: string
  run_id: string | null
  action_digest: string
  action_json: string
  class: ActionClass
  project_id: string | null
  status: ApprovalStatus
  requested_at: string
  expires_at: string
  decided_by: string | null
  decided_channel: string | null
  decided_at: string | null
}

export type DecideOutcome =
  | { ok: true; approval: ApprovalRecord }
  | { ok: false; reason: 'not_found' | 'expired' | 'already_decided' }

const iso = (ms: number) => new Date(ms).toISOString()

/**
 * The one door every side effect goes through (spec 12). It classifies the action, decides allow or
 * ask, and runs an action that needs approval only against an approved, unexpired, unconsumed
 * approval whose digest equals the digest of the exact action being run.
 */
export class Gateway {
  readonly #store: EventStore
  readonly #tools: Map<string, ToolDef>
  readonly #now: () => number
  readonly #ttlMs: number
  readonly #autonomy: Autonomy
  readonly #testTools: boolean

  constructor(options: GatewayOptions) {
    this.#store = options.store
    this.#tools = new Map(options.tools.map((t) => [t.name, t]))
    this.#now = options.now ?? Date.now
    this.#ttlMs = options.approvalTtlMs ?? 30 * 60_000
    this.#autonomy = options.autonomy ?? 'balanced'
    this.#testTools = options.testTools ?? false
  }

  info(): GatewayInfo {
    return {
      autonomy: this.#autonomy,
      approvalTtlMs: this.#ttlMs,
      testTools: this.#testTools,
      tools: [...this.#tools.values()].map((t) => ({ name: t.name, class: t.class })),
    }
  }

  /** Allow, or ask for approval. The invariants come first and no setting can relax them. */
  #decide(cls: ActionClass): 'allow' | 'ask' {
    if (ALWAYS_ASK_CLASSES.includes(cls)) return 'ask'
    if (cls === 'write-local') return this.#autonomy === 'ask-first' ? 'ask' : 'allow'
    return 'allow'
  }

  async request(actor: string, req: ActionRequest): Promise<ActionResponse> {
    this.sweepExpired()
    const tool = this.#tools.get(req.tool)
    const args = req.args ?? {}
    const cls: ActionClass = tool?.class ?? 'destructive' // unknown tool = destructive
    const record: ActionRecord = {
      actor,
      tool: req.tool,
      args,
      target: tool ? tool.target(args) : '',
      class: cls,
      cwd: req.cwd ?? '',
      project: req.project ?? '',
    }
    const digest = actionDigest(record)
    const audit = (type: string, extra: Record<string, unknown> = {}) =>
      this.#store.append(type, { digest, tool: req.tool, class: cls, target: redact(record.target), actor, ...extra })

    if (!tool) {
      // Nothing is registered to run it, so it cannot run, approved or not.
      audit('gateway.decision', { decision: 'deny', reason: 'unknown_tool' })
      return { status: 'denied', digest, class: cls, reason: 'unknown_tool' }
    }

    if (this.#decide(cls) === 'allow') {
      audit('gateway.decision', { decision: 'allow' })
      return this.#run(tool, args, digest, cls, audit, undefined)
    }

    if (!req.approvalId) {
      const pending = this.#findPending(digest, req.runId ?? null)
      if (pending) {
        audit('gateway.decision', { decision: 'ask', approvalId: pending.id, reused: true })
        return { status: 'approval_required', digest, class: cls, approvalId: pending.id, expiresAt: pending.expires_at }
      }
      const id = randomUUID()
      const requestedAt = this.#now()
      this.#store.db
        .prepare(
          `INSERT INTO approval (id, run_id, action_digest, action_json, class, project_id, status, requested_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        )
        .run(
          id,
          req.runId ?? null,
          digest,
          // What the approver sees: redacted. The digest still binds the exact, unredacted action.
          JSON.stringify({ actor, tool: req.tool, target: record.target, args: redact(args) }),
          cls,
          req.project ?? null,
          iso(requestedAt),
          iso(requestedAt + this.#ttlMs),
        )
      audit('gateway.decision', { decision: 'ask', approvalId: id })
      this.#store.append('approval.requested', { approvalId: id, digest, tool: req.tool, class: cls, actor }, id)
      return { status: 'approval_required', digest, class: cls, approvalId: id, expiresAt: iso(requestedAt + this.#ttlMs) }
    }

    return this.#consumeAndRun(tool, args, req, digest, cls, audit)
  }

  async #consumeAndRun(
    tool: ToolDef,
    args: Record<string, unknown>,
    req: ActionRequest,
    digest: string,
    cls: ActionClass,
    audit: (type: string, extra?: Record<string, unknown>) => void,
  ): Promise<ActionResponse> {
    const reject = (reason: ActionRejection, extra: Record<string, unknown> = {}): ActionResponse => {
      audit('gateway.rejected', { reason, approvalId: req.approvalId, ...extra })
      return { status: 'rejected', digest, class: cls, reason }
    }
    const row = this.#row(req.approvalId!)
    if (!row) return reject('unknown_approval')
    if (row.action_digest !== digest) return reject('digest_mismatch') // an altered action never uses someone else's approval
    if ((row.run_id ?? null) !== (req.runId ?? null)) return reject('run_mismatch')
    if (row.status === 'pending' || row.status === 'approved') {
      if (row.expires_at <= iso(this.#now())) {
        this.#expire(row.id)
        return reject('expired')
      }
    }
    if (row.status === 'expired') return reject('expired')
    if (row.status !== 'approved') return reject('not_approved', { status: row.status })

    // Compare-and-set: of any number of concurrent submissions, exactly one flips approved -> consumed.
    const res = this.#store.db
      .prepare(`UPDATE approval SET status = 'consumed', consumed_at = ? WHERE id = ? AND status = 'approved' AND expires_at > ?`)
      .run(iso(this.#now()), row.id, iso(this.#now()))
    if (Number(res.changes) !== 1) return reject('not_approved', { raced: true })
    this.#store.append('approval.consumed', { approvalId: row.id, digest }, row.id)
    return this.#run(tool, args, digest, cls, audit, row)
  }

  async #run(
    tool: ToolDef,
    args: Record<string, unknown>,
    digest: string,
    cls: ActionClass,
    audit: (type: string, extra?: Record<string, unknown>) => void,
    approval: ApprovalRow | undefined,
  ): Promise<ActionResponse> {
    const approvedBy = approval ? { approvalId: approval.id, approvedBy: approval.decided_by, channel: approval.decided_channel } : {}
    try {
      const result = await tool.execute(args)
      audit('gateway.executed', { result: 'ok', ...approvedBy })
      return { status: 'executed', digest, class: cls, result }
    } catch (err) {
      // The approval stays consumed: once an action may have started, it is never silently retried.
      audit('gateway.executed', { result: 'failed', error: redact(String((err as Error).message ?? err)), ...approvedBy })
      return { status: 'rejected', digest, class: cls, reason: 'execution_failed' }
    }
  }

  approve(id: string, by: string, channel: string): DecideOutcome {
    return this.#decideApproval(id, 'approved', by, channel)
  }

  deny(id: string, by: string, channel: string): DecideOutcome {
    return this.#decideApproval(id, 'denied', by, channel)
  }

  #decideApproval(id: string, to: 'approved' | 'denied', by: string, channel: string): DecideOutcome {
    this.sweepExpired()
    const now = iso(this.#now())
    const res = this.#store.db
      .prepare(
        `UPDATE approval SET status = ?, decided_by = ?, decided_channel = ?, decided_at = ?
         WHERE id = ? AND status = 'pending' AND expires_at > ?`,
      )
      .run(to, by, channel, now, id, now)
    const row = this.#row(id)
    if (Number(res.changes) !== 1) {
      if (!row) return { ok: false, reason: 'not_found' }
      return { ok: false, reason: row.status === 'expired' ? 'expired' : 'already_decided' }
    }
    this.#store.append(`approval.${to === 'approved' ? 'approved' : 'denied'}`, { approvalId: id, digest: row!.action_digest, by, channel }, id)
    return { ok: true, approval: toRecord(row!) }
  }

  /** Marks pending and approved-but-unused approvals past their expiry as expired. */
  sweepExpired(): number {
    const now = iso(this.#now())
    const due = this.#store.db
      .prepare(`SELECT id FROM approval WHERE status IN ('pending','approved') AND expires_at <= ?`)
      .all(now) as Array<{ id: string }>
    for (const { id } of due) this.#expire(id)
    return due.length
  }

  #expire(id: string): void {
    const res = this.#store.db
      .prepare(`UPDATE approval SET status = 'expired' WHERE id = ? AND status IN ('pending','approved')`)
      .run(id)
    if (Number(res.changes) === 1) {
      const row = this.#row(id)
      this.#store.append('approval.expired', { approvalId: id, digest: row?.action_digest }, id)
    }
  }

  list(status?: ApprovalStatus): ApprovalRecord[] {
    this.sweepExpired()
    // A still-pending approval has to stay listed until it is decided or expires. Capping the mixed
    // history at 200 lets newer consumed, denied, or expired rows push it out of the inbox.
    const rows = (
      status
        ? this.#store.db.prepare('SELECT * FROM approval WHERE status = ? ORDER BY requested_at DESC LIMIT 200').all(status)
        : this.#store.db
            .prepare(
              `SELECT * FROM (SELECT * FROM approval WHERE status = 'pending' ORDER BY requested_at DESC LIMIT 200)
               UNION ALL
               SELECT * FROM (SELECT * FROM approval WHERE status != 'pending' ORDER BY requested_at DESC LIMIT 200)
               ORDER BY requested_at DESC`,
            )
            .all()
    ) as unknown as ApprovalRow[]
    return rows.map(toRecord)
  }

  get(id: string): ApprovalRecord | undefined {
    this.sweepExpired()
    const row = this.#row(id)
    return row && toRecord(row)
  }

  #row(id: string): ApprovalRow | undefined {
    return this.#store.db.prepare('SELECT * FROM approval WHERE id = ?').get(id) as ApprovalRow | undefined
  }

  #findPending(digest: string, runId: string | null): ApprovalRow | undefined {
    return this.#store.db
      .prepare(
        `SELECT * FROM approval WHERE action_digest = ? AND status = 'pending' AND expires_at > ? AND run_id IS ?`,
      )
      .get(digest, iso(this.#now()), runId) as ApprovalRow | undefined
  }
}

function toRecord(row: ApprovalRow): ApprovalRecord {
  const shown = JSON.parse(row.action_json) as { actor: string; tool: string; target: string; args: unknown }
  return {
    id: row.id,
    status: row.status,
    digest: row.action_digest,
    class: row.class,
    actor: shown.actor,
    tool: shown.tool,
    target: shown.target,
    project: row.project_id,
    runId: row.run_id,
    args: shown.args,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
    decidedBy: row.decided_by,
    decidedChannel: row.decided_channel,
    decidedAt: row.decided_at,
    irreversible: ALWAYS_ASK_CLASSES.includes(row.class),
  }
}

/** Built-in tools for tests and the dev UI. They only record into memory; nothing leaves the machine. */
export function testTools(effects: Array<Record<string, unknown>>): ToolDef[] {
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return [
    { name: 'test.read', class: 'read', target: () => '', execute: (a) => ({ echo: a.text ?? null }) },
    {
      name: 'test.write',
      class: 'write-local',
      target: (a) => str(a.path),
      execute: (a) => void effects.push({ tool: 'test.write', ...a }),
    },
    {
      name: 'test.send',
      class: 'external-send',
      target: (a) => str(a.to),
      execute: (a) => void effects.push({ tool: 'test.send', ...a }),
    },
    {
      name: 'test.delete',
      class: 'destructive',
      target: (a) => str(a.path),
      execute: (a) => void effects.push({ tool: 'test.delete', ...a }),
    },
    {
      name: 'test.spend',
      class: 'spend',
      target: (a) => str(a.item),
      execute: (a) => void effects.push({ tool: 'test.spend', ...a }),
    },
    {
      name: 'test.fail',
      class: 'external-send',
      target: () => 'nowhere',
      execute: () => {
        throw new Error('fake send failed with Bearer abcdefghijklmnop123456')
      },
    },
  ]
}
