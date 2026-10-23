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
  | { status: 'rejected'; digest: string; class: ActionClass; reason: ActionRejection; /** Why a tool refused, when the tool says it is safe to show. */ message?: string }

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

// ---- Workflows (spec 05) ----

/** The workflow file format JunOS writes. Older files are upgraded on load (with a backup of the old file). */
export const WORKFLOW_VERSION = 1

export const STEP_TYPES = ['prompt', 'tool', 'approval', 'output'] as const
export type StepType = (typeof STEP_TYPES)[number]

export interface WorkflowParam {
  key: string
  type: 'string' | 'number' | 'boolean' | 'file'
  label?: string
  default?: string | number | boolean
  required?: boolean
}

export type WorkflowTrigger =
  | { type: 'manual' }
  | { type: 'cron'; expr: string; timezone?: string }
  /** `where` matches fields of the event payload, e.g. { kind: 'failure' }. */
  | { type: 'event'; event: string; where?: Record<string, string> }

export type WorkflowStep =
  | { id: string; type: 'prompt'; prompt: string; provider?: ProviderId; model?: string; effort?: Effort; input?: string[] }
  | { id: string; type: 'tool'; tool: string; args?: Record<string, unknown> }
  | { id: string; type: 'approval'; message: string }
  | { id: string; type: 'output'; to: 'inbox'; from?: string; title?: string }

export interface WorkflowDefinition {
  version: number
  name: string
  description?: string
  /** Defaults for prompt steps that do not name their own. */
  provider?: ProviderId
  model?: string
  effort?: Effort
  params: WorkflowParam[]
  triggers: WorkflowTrigger[]
  steps: WorkflowStep[]
}

export type WorkflowRunStatus = 'queued' | 'running' | 'waiting_approval' | 'succeeded' | 'failed' | 'cancelled'
export type WorkflowStepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'

export interface WorkflowStepRecord {
  seq: number
  stepId: string
  type: StepType
  status: WorkflowStepStatus
  output: string | null
  error: string | null
  startedAt: string | null
  finishedAt: string | null
}

export interface WorkflowRunRecord {
  id: string
  workflowId: string
  name: string
  /** The file format version this run executed. Editing the file does not change a run in flight. */
  version: number
  status: WorkflowRunStatus
  trigger: 'manual' | 'cron' | 'event'
  dryRun: boolean
  params: Record<string, string | number | boolean>
  startedAt: string
  finishedAt: string | null
  error: string | null
  currentStep: string | null
  approvalId: string | null
  /** The workflows that caused this one, oldest first (loop guard). */
  chain: string[]
  steps: WorkflowStepRecord[]
}

export interface WorkflowSummary {
  id: string
  name: string
  description: string
  version: number
  params: WorkflowParam[]
  triggers: WorkflowTrigger[]
  valid: boolean
  errors: string[]
  /** Set when the file was just upgraded from an older format. */
  upgradedFrom: number | null
  paused: boolean
  pausedReason: string | null
  running: boolean
  lastRun: WorkflowRunRecord | null
}

export interface WorkflowDetail extends WorkflowSummary {
  yaml: string
}

export interface WorkflowValidation {
  valid: boolean
  errors: string[]
  definition?: WorkflowDefinition
  /** The format version the text was written in, when it was older than the current one. */
  upgradedFrom: number | null
}

export interface WorkflowRunRequest {
  params?: Record<string, string | number | boolean>
  /** Plan the run without sending anything or changing anything. */
  dryRun?: boolean
}

export interface WorkflowsResponse {
  workflows: WorkflowSummary[]
  /** True while Stop is in effect: nothing starts. */
  paused: boolean
}

export interface WorkflowRunsResponse {
  runs: WorkflowRunRecord[]
}

// ---- Hermes (spec 06) ----

export const HERMES_STATES = ['online', 'idle', 'working', 'paused', 'error', 'unreachable'] as const
export type HermesState = (typeof HERMES_STATES)[number]

/** `mock` is a scripted stand-in, `remote` the real agent behind its shim, `none` means nothing is connected. */
export type HermesMode = 'mock' | 'remote' | 'none'

export interface HermesStatus {
  state: HermesState
  currentTask: string | null
  model: string
  /** Seconds since the agent started, or null when unknown. */
  uptimeS: number | null
  /** Why it is unreachable or in error. */
  reason: string | null
}

export const HERMES_STEP_TYPES = ['shell', 'browser', 'file', 'api', 'message'] as const
export type HermesStepType = (typeof HERMES_STEP_TYPES)[number]
export type HermesStepStatus = 'running' | 'done' | 'failed' | 'waiting_approval' | 'denied' | 'stopped'

/** An action Hermes wants to take that needs a person's yes. */
export interface HermesApprovalAsk {
  class: Exclude<ActionClass, 'read'>
  target: string
  summary: string
}

export interface HermesStep {
  id: string
  directiveId: string | null
  type: HermesStepType
  summary: string
  input: string
  output: string
  status: HermesStepStatus
  ms: number | null
  startedAt: string
  /** Set while the step waits for an approval. */
  approval?: HermesApprovalAsk
  approvalId?: string | null
}

export interface HermesMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  /** Where it was said. Telegram messages are mirrored with a badge. */
  via: 'junos' | 'telegram'
  directiveId: string | null
  createdAt: string
}

export interface HermesMemoryItem {
  id: string
  text: string
  pinned: boolean
}

export interface HermesSkill {
  id: string
  name: string
  description: string
  enabled: boolean
}

export interface HermesQueueItem {
  id: string
  text: string
  priority: 'low' | 'normal' | 'high'
  queuedAt: string
}

export interface HermesDirectiveRequest {
  text: string
  priority?: 'low' | 'normal' | 'high'
  projectId?: string
  /** Also echo the reply to Telegram. Off by default. */
  echoToTelegram?: boolean
}

export interface HermesOverview {
  mode: HermesMode
  /** Why nothing is connected, when mode is `none`. */
  reason: string | null
  status: HermesStatus
  steps: HermesStep[]
  messages: HermesMessage[]
  queue: HermesQueueItem[]
  /** Set after a Stop whose result could not be confirmed. */
  stopUnconfirmed: boolean
}

// ---- Kanban (spec 09) ----

export const KANBAN_COLUMN_KINDS = ['ideas', 'ready', 'active', 'review', 'done', 'blocked'] as const
export type KanbanColumnKind = (typeof KANBAN_COLUMN_KINDS)[number]

export interface KanbanColumn {
  key: string
  name: string
  /** Automation depends on the kind, never on the display name. */
  kind: KanbanColumnKind
  /** Shown in the header; not enforced for a person. */
  wip: number | null
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { key: 'ideas', name: 'Ideas', kind: 'ideas', wip: null },
  { key: 'ready', name: 'Ready', kind: 'ready', wip: null },
  { key: 'in_progress', name: 'In progress', kind: 'active', wip: 3 },
  { key: 'review', name: 'Review', kind: 'review', wip: null },
  { key: 'done', name: 'Done', kind: 'done', wip: null },
  { key: 'blocked', name: 'Blocked', kind: 'blocked', wip: null },
]

export const KANBAN_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const
export type KanbanPriority = (typeof KANBAN_PRIORITIES)[number]
export type KanbanAssignee = 'jonas' | 'hermes' | 'none'

export interface KanbanChecklistItem {
  text: string
  done: boolean
}

export interface KanbanActivity {
  id: string
  at: string
  /** `jonas`, `hermes` or `system`. */
  actor: string
  text: string
}

export interface KanbanCard {
  id: string
  column: string
  position: number
  title: string
  body: string
  /** `jonas`, `hermes`, `scout` or `workflow:<id>`. A Hermes-created card shows a marker. */
  creator: string
  assignee: KanbanAssignee
  project: string
  priority: KanbanPriority
  labels: string[]
  due: string | null
  checklist: KanbanChecklistItem[]
  /** What Hermes wrote when it finished. */
  summary: string
  /** Set while Hermes holds the card. */
  claimedBy: string | null
  createdAt: string
  updatedAt: string
  activity: KanbanActivity[]
}

export interface KanbanCardInput {
  title: string
  body?: string
  column?: string
  assignee?: KanbanAssignee
  project?: string
  priority?: KanbanPriority
  labels?: string[]
  due?: string | null
  checklist?: KanbanChecklistItem[]
}

export interface KanbanCardPatch extends Partial<KanbanCardInput> {
  /** Place the card just before this one in its column; omit to put it last. */
  beforeId?: string | null
}

export interface KanbanBoard {
  columns: KanbanColumn[]
  cards: KanbanCard[]
  projects: string[]
  /** The card Hermes is working on right now. */
  hermesWorkingOn: { id: string; title: string } | null
}

/** What Hermes may ask of the board. It can never move a card to Done. */
export type KanbanAgentAction =
  | { kind: 'create'; title: string; body?: string }
  | { kind: 'move'; cardId: string; column: string }
  | { kind: 'comment'; cardId: string; text: string }
