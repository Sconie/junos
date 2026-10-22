/** Contracts shared by the UI and junosd. Keep this file dependency-free. */

export const DEFAULT_PORT = 4777
export const API_PREFIX = '/api'

export const PROVIDER_IDS = ['claude', 'codex', 'cursor', 'grok', 'nous'] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]

/** Public liveness probe: no session needed, so it says nothing about the machine. */
export interface HealthResponse {
  ok: true
  name: 'junosd'
  version: string
}

/** Detailed status, only for a paired browser. */
export interface StatusResponse extends HealthResponse {
  pid: number
  startedAt: string
  uptimeMs: number
  /** Highest event seq written so far (0 when the event table is empty). */
  lastSeq: number
}

/** Whether this browser holds a valid session. `csrf` goes in the x-junos-csrf header on every write. */
export interface SessionResponse {
  paired: boolean
  csrf?: string
}

export const CSRF_HEADER = 'x-junos-csrf'

export interface ProviderProbe {
  id: ProviderId
  /** The CLI answered `--version`. */
  detected: boolean
  version?: string
  error?: string
}

export interface ProvidersResponse {
  providers: ProviderProbe[]
}

export const EVENT_TYPES = ['daemon.started', 'connection.changed'] as const
export type EventType = (typeof EVENT_TYPES)[number] | (string & {})

/** One row of the append-only event table, as sent over SSE. */
export interface JunosEvent {
  seq: number
  id: string
  type: EventType
  refId: string | null
  payload: Record<string, unknown>
  createdAt: string
}

/** SSE event name used when the client's Last-Event-ID cannot be replayed. */
export const RESYNC_EVENT = 'resync'

// ---- Execution gateway (spec 12) ----

export const ACTION_CLASSES = ['read', 'write-local', 'external-send', 'destructive', 'spend'] as const
export type ActionClass = (typeof ACTION_CLASSES)[number]

/** Classes that can never run without a valid, single-use approval, whatever the autonomy level. */
export const ALWAYS_ASK_CLASSES: readonly ActionClass[] = ['external-send', 'destructive', 'spend']

export const APPROVAL_STATUSES = ['pending', 'approved', 'consumed', 'denied', 'expired'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

/** Body of POST /api/actions. The class is decided by the daemon from the tool, never by the caller. */
export interface ActionRequest {
  tool: string
  args: Record<string, unknown>
  project?: string
  cwd?: string
  runId?: string
  /** Present when re-submitting an approved action to execute it. */
  approvalId?: string
}

export type ActionResponse =
  | { status: 'executed'; digest: string; class: ActionClass; result: unknown }
  | { status: 'approval_required'; digest: string; class: ActionClass; approvalId: string; expiresAt: string }
  | { status: 'denied'; digest: string; class: ActionClass; reason: string }
  | { status: 'rejected'; digest: string; class: ActionClass; reason: ActionRejection }

export type ActionRejection =
  | 'unknown_approval'
  | 'digest_mismatch'
  | 'run_mismatch'
  | 'not_approved'
  | 'expired'
  | 'execution_failed'

/** What the approval UI shows. `action` is the redacted copy of what was requested. */
export interface ApprovalRecord {
  id: string
  status: ApprovalStatus
  digest: string
  class: ActionClass
  actor: string
  tool: string
  target: string
  project: string | null
  runId: string | null
  /** Redacted arguments, as they will be shown to the person deciding. */
  args: unknown
  requestedAt: string
  expiresAt: string
  decidedBy: string | null
  decidedChannel: string | null
  decidedAt: string | null
  /** True for classes that cannot be undone (external-send, destructive, spend). */
  irreversible: boolean
}

export interface GatewayInfo {
  autonomy: 'ask-first' | 'balanced' | 'autonomous'
  approvalTtlMs: number
  /** Test tools are registered (never in a normal run). */
  testTools: boolean
  tools: Array<{ name: string; class: ActionClass }>
}

// ---- Runs and Stop (spec 12, 14) ----

export const RUN_STATUSES = ['running', 'cancelling', 'stopped', 'finished', 'failed', 'stop_unconfirmed'] as const
export type RunStatus = (typeof RUN_STATUSES)[number]

/** An action that had already completed when a run was stopped. It cannot be undone. */
export interface SideEffect {
  digest: string
  tool: string
  class: ActionClass
  target: string
}

export interface RunRecord {
  id: string
  kind: string
  source: string
  status: RunStatus
  startedAt: string
  finishedAt: string | null
  exitCode: number | null
  signal: string | null
  error: string | null
  /** Set once a stop was requested for this run. */
  stopRequestedAt: string | null
  /** Completed side effects, listed when a run is stopped. */
  sideEffects: SideEffect[]
}

export interface RunsResponse {
  /** While true no new run may start and the gateway refuses everything but reads. */
  paused: boolean
  runs: RunRecord[]
}
