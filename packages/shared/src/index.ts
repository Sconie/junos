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
  /** What was asked of the provider, so a run record shows what was actually sent (spec 04). */
  provider: string | null
  model: string | null
  effort: string | null
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
  /** When the current Stop began (null when not stopped), so only that stop's side effects are shown. */
  pausedAt: string | null
  runs: RunRecord[]
}

// ---- Chat and provider adapters (spec 03, 04) ----

/** One UI effort scale (spec 03). Each provider maps it to what exists. */
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type Effort = (typeof EFFORTS)[number]

export interface ModelInfo {
  /** Value passed to the provider CLI (`--model`), or '' for the provider default. */
  id: string
  label: string
  efforts: Effort[]
}

export interface ProviderModels {
  provider: ProviderId
  /** Where the list comes from, so the UI can say it honestly. */
  source: 'static' | 'cli'
  models: ModelInfo[]
}

/** Streamed output of one run, normalised across providers. */
export type RunEvent =
  | { type: 'token'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number; cachedTokens?: number }
  | { type: 'rate_limit'; status: string; resetsAt?: string }
  | { type: 'done'; text: string; stopReason?: string }
  | { type: 'error'; message: string; kind: 'rate_limited' | 'needs_login' | 'failed' }

export type ConversationKind = 'chat' | 'agent'

export interface ConversationRecord {
  id: string
  title: string
  kind: ConversationKind
  provider: ProviderId
  model: string
  effort: Effort
  /** Providers allowed to receive this conversation's context (spec 12). */
  allowedProviders: ProviderId[]
  createdAt: string
  updatedAt: string
}

export type MessageStatus = 'complete' | 'streaming' | 'partial' | 'error'

export interface MessageRecord {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  provider: ProviderId | null
  model: string | null
  effort: Effort | null
  content: string
  thinking: string
  status: MessageStatus
  error: string | null
  runId: string | null
  createdAt: string
}

export interface ConversationDetail {
  conversation: ConversationRecord
  messages: MessageRecord[]
}

export interface SendMessageRequest {
  content: string
  /** Optional per-message override; it also becomes the conversation's remembered choice. */
  model?: string
  effort?: Effort
}

export type SendMessageResponse =
  | { status: 'started'; userMessage: MessageRecord; assistantMessage: MessageRecord; runId: string }
  | { status: 'disclosure_required'; provider: ProviderId; text: string }

/** One-line notice shown the first time context goes to a provider (spec 04 rev 2). */
export const PROVIDER_DISCLOSURE: Record<string, string> = {
  claude: 'This conversation is sent to Claude (Anthropic) through your Claude plan. Everything you type here, and earlier messages in this chat, go to that provider.',
  codex: 'This conversation is sent to Codex (OpenAI) through your ChatGPT plan. Everything you type here, and earlier messages in this chat, go to that provider.',
}

// ---- Connections (spec 03) ----

/** One enum for connection state, used by the UI, Home, the router and the Hermes pill (spec 03). */
export const CONNECTION_STATES = ['connected', 'needs_login', 'rate_limited', 'unavailable', 'degraded', 'unknown'] as const
export type ConnectionState = (typeof CONNECTION_STATES)[number]

export interface ConnectionRecord {
  provider: ProviderId
  label: string
  state: ConnectionState
  /** Short human reason for the state, in the person's terms. */
  detail: string
  /** How it is signed in, e.g. "Signed in via CLI". Never a token, never an email. */
  method: string | null
  /** The plan, only where the CLI reports it offline (e.g. "pro"). */
  plan: string | null
  version: string | null
  /** True when chat works through JunOS with this provider today. */
  chat: boolean
  /** Shown instead of a state for providers that are planned or reached another way. */
  note: 'coming' | 'via_hermes' | 'chat_later' | null
  /** The exact command to run to sign in again. */
  reconnect: string | null
  /** ISO time a rate limit is expected to lift, when known. */
  resetsAt: string | null
  checkedAt: string
}

export interface ConnectionsResponse {
  connections: ConnectionRecord[]
}

// ---- Inbox and Telegram (spec 07) ----

export const INBOX_KINDS = ['approval', 'failure', 'result', 'finding', 'mention', 'digest'] as const
export type InboxKind = (typeof INBOX_KINDS)[number]

export type InboxPriority = 'urgent' | 'normal' | 'low'
/** `resolved` means the thing it was about is settled elsewhere (an approval decided, expired or cancelled). */
export type InboxStatus = 'new' | 'done' | 'snoozed' | 'resolved'

export interface InboxItem {
  id: string
  kind: InboxKind
  priority: InboxPriority
  title: string
  body: string
  source: string
  status: InboxStatus
  /** For a resolved item: what happened ("approved", "denied", "expired"…). */
  resolution: string | null
  /** The approval or run this item is about. */
  refId: string | null
  createdAt: string
  updatedAt: string
  snoozeUntil: string | null
  /** The live approval record, so the Inbox shows the same ApprovalCard and its current state. */
  approval?: ApprovalRecord
}

export interface InboxCounts {
  /** Items that still need a person: new approvals, failures and mentions. */
  needsMe: number
  approvals: number
  failures: number
  done: number
  snoozed: number
  all: number
}

export interface InboxResponse {
  items: InboxItem[]
  counts: InboxCounts
}

export interface InboxActionRequest {
  action: 'done' | 'snooze' | 'reopen'
  /** For snooze: an ISO time. */
  until?: string
}

export interface TelegramStatus {
  enabled: boolean
  /** Why it is off, when it is. Never contains the token. */
  reason: string | null
  quietHours: { start: string; end: string }
  lastPollAt: string | null
  sent: number
  /** Updates from anyone but the owner, or in the wrong chat, that were ignored. */
  rejected: number
}

// ---- Scheduled tasks (spec 05) ----

export const CATCH_UP_MODES = ['skip', 'once', 'all'] as const
export type CatchUpMode = (typeof CATCH_UP_MODES)[number]

export const OVERLAP_MODES = ['skip', 'queue'] as const
export type OverlapMode = (typeof OVERLAP_MODES)[number]

export const SCHEDULED_RUN_STATUSES = ['due', 'claimed', 'running', 'succeeded', 'failed', 'skipped'] as const
export type ScheduledRunStatus = (typeof SCHEDULED_RUN_STATUSES)[number]

/** Body of POST /api/tasks. A task is a prompt sent to a provider on a schedule. */
export interface TaskInput {
  name: string
  prompt: string
  provider: ProviderId
  model: string
  effort: Effort
  /** Five-field cron. Seconds are not allowed, and neither is anything that fires more often than every 10 minutes. */
  cron: string
  timezone: string
  /** What to do with slots missed while junosd was down (spec 05). */
  catchUp: CatchUpMode
  /** What to do when a slot comes due while the previous run of this task is still going. */
  overlap: OverlapMode
  maxAttempts: number
  enabled: boolean
}

export interface ScheduledRunRecord {
  id: string
  taskId: string
  /** The slot this run is for. Unique per task, so a slot can only exist once. */
  dueAt: string
  status: ScheduledRunStatus
  attempt: number
  retryAt: string | null
  manual: boolean
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  /** What the provider answered, kept for the run log. */
  output: string | null
  log: string[]
  runId: string | null
}

export interface TaskRecord extends TaskInput {
  id: string
  createdAt: string
  updatedAt: string
  /** The next five fire times, so the schedule can be checked before it is trusted. */
  nextRuns: string[]
  lastRun: ScheduledRunRecord | null
  running: boolean
}

export interface TasksResponse {
  tasks: TaskRecord[]
  /** True while Stop is in effect: due slots are held, not run. */
  paused: boolean
}

export interface CronPreviewResponse {
  valid: boolean
  error: string | null
  nextRuns: string[]
}
