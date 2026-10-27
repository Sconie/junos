import { randomUUID } from 'node:crypto'
import {
  EFFORTS,
  PROVIDER_DISCLOSURE,
  PROVIDER_IDS,
  type ConversationDetail,
  type ConversationRecord,
  type Effort,
  type MessageRecord,
  type MessageStatus,
  type ProviderId,
  type ProviderModels,
  type RunEvent,
  type AttachedFile,
  type SendMessageRequest,
  type SendMessageResponse,
} from '@junos/shared'
import type { ProviderAdapter } from './adapters/types.ts'
import type { RunManager } from './runs.ts'
import type { EventStore } from './store.ts'

export class ChatError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const MAX_CONTENT = 20_000
/** Rough cap on the history sent with a message; the oldest turns are dropped first. */
const MAX_PROMPT_CHARS = 120_000
/** A plain chat should be small. Above this the CLI probably loaded the user's own config. */
const HEAVY_CONTEXT_TOKENS = 60_000

/** Output of one run, kept in memory so a browser can attach (or re-attach) to it. Never written to the event table. */
export class RunStream {
  readonly events: Array<{ id: number; event: RunEvent }> = []
  readonly #subs = new Set<(entry: { id: number; event: RunEvent } | null) => void>()
  done = false

  push(event: RunEvent): void {
    const entry = { id: this.events.length + 1, event }
    this.events.push(entry)
    for (const sub of this.#subs) sub(entry)
  }

  finish(): void {
    this.done = true
    for (const sub of this.#subs) sub(null)
    this.#subs.clear()
  }

  /** Replays everything after `afterId`, then follows live. `null` means the run ended. */
  subscribe(afterId: number, fn: (entry: { id: number; event: RunEvent } | null) => void): () => void {
    for (const entry of this.events) if (entry.id > afterId) fn(entry)
    if (this.done) {
      fn(null)
      return () => {}
    }
    this.#subs.add(fn)
    return () => this.#subs.delete(fn)
  }
}

interface ConversationRow {
  id: string
  title: string
  kind: 'chat' | 'agent'
  provider: ProviderId
  model: string
  effort: Effort
  allowed_providers_json: string
  project_id: string | null
  created_at: string
  updated_at: string
}

interface MessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  provider: ProviderId | null
  model: string | null
  effort: Effort | null
  content_md: string
  thinking_md: string
  status: MessageStatus
  error: string | null
  run_id: string | null
  created_at: string
}

export interface ChatOptions {
  store: EventStore
  runs: RunManager
  adapters: ProviderAdapter[]
  /** An empty directory for provider CLIs to run in. */
  cwd: string
  now?: () => number
  /** True while a scheduled task has claimed a provider but its run does not exist yet. */
  providerClaimed?: (provider: ProviderId) => boolean
  /** The indexed folders, for attaching a project or a file. */
  context?: ChatContext
}

/** What a conversation may take from the indexed folders. Only names, sizes and attached text ever leave. */
export interface ChatContext {
  hasProject(id: string): boolean
  /** The project's file list (names and sizes, never the tree's contents). */
  manifest(projectId: string): string | null
  /** One attached file's text. Throws a message for the owner when it cannot be attached. */
  readFile(ref: AttachedFile): { name: string; text: string }
}

const MAX_ATTACHED_TEXT = 300_000

/** Wraps text the model did not get from the user's own message as data. */
function asData(label: string, text: string): string {
  return `<untrusted-data source="${label}">\n${text.replaceAll('</untrusted-data>', '[/untrusted-data]')}\n</untrusted-data>`
}

export class ChatService {
  readonly #store: EventStore
  readonly #runs: RunManager
  readonly #adapters: Map<ProviderId, ProviderAdapter>
  readonly #cwd: string
  readonly #now: () => number
  readonly #providerClaimed: (provider: ProviderId) => boolean
  readonly #context: ChatContext | undefined
  readonly #streams = new Map<string, RunStream>()

  constructor(options: ChatOptions) {
    this.#store = options.store
    this.#runs = options.runs
    this.#adapters = new Map(options.adapters.map((a) => [a.id, a]))
    this.#cwd = options.cwd
    this.#now = options.now ?? Date.now
    this.#providerClaimed = options.providerClaimed ?? (() => false)
    this.#context = options.context
    // A reply that was streaming when junosd died can never finish.
    this.#store.db
      .prepare(`UPDATE message SET status = 'error', error = 'junosd restarted before this reply finished' WHERE status = 'streaming'`)
      .run()
  }

  providers(): ProviderModels[] {
    return [...this.#adapters.values()].map((a) => a.models())
  }

  async providerStatus(): Promise<Array<{ provider: ProviderId; available: boolean; version?: string; reason?: string }>> {
    return Promise.all([...this.#adapters.values()].map(async (a) => ({ provider: a.id, ...(await a.status()) })))
  }

  acknowledged(): ProviderId[] {
    const rows = this.#store.db.prepare('SELECT provider FROM provider_disclosure').all() as Array<{ provider: ProviderId }>
    return rows.map((r) => r.provider)
  }

  acknowledge(provider: string): void {
    if (!this.#adapters.has(provider as ProviderId)) throw new ChatError(404, 'unknown_provider', 'Unknown provider')
    this.#store.db
      .prepare('INSERT OR IGNORE INTO provider_disclosure (provider, acknowledged_at) VALUES (?, ?)')
      .run(provider, this.#iso())
    this.#store.append('provider.disclosure_acknowledged', { provider }, provider)
  }

  #iso(): string {
    return new Date(this.#now()).toISOString()
  }

  #adapter(provider: string): ProviderAdapter {
    const adapter = this.#adapters.get(provider as ProviderId)
    if (!adapter) throw new ChatError(400, 'unknown_provider', `Unknown provider: ${provider}`)
    return adapter
  }

  #checkModel(adapter: ProviderAdapter, model: string, effort: string): void {
    const info = adapter.models().models.find((m) => m.id === model)
    if (!info) throw new ChatError(400, 'unknown_model', `Unknown model for ${adapter.id}: ${model}`)
    if (!(EFFORTS as readonly string[]).includes(effort)) throw new ChatError(400, 'unknown_effort', `Unknown effort: ${effort}`)
    if (!info.efforts.includes(effort as Effort)) throw new ChatError(400, 'effort_not_supported', `${info.label} does not support effort ${effort}`)
  }

  /** The reason a provider, model and effort do not go together, or null when they do. For tasks and workflows. */
  checkChoice(provider: ProviderId, model: string, effort: string): string | null {
    const adapter = this.#adapters.get(provider)
    if (!adapter) return `Unknown provider: ${provider}`
    try {
      this.#checkModel(adapter, model, effort)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid choice'
    }
  }

  createConversation(input: { title?: string; provider?: string; model?: string; effort?: string; allowedProviders?: string[]; projectId?: string }): ConversationRecord {
    if (input.projectId !== undefined && !this.#context?.hasProject(String(input.projectId))) throw new ChatError(400, 'unknown_project', 'That project is not in an indexed folder.')
    const provider = (input.provider ?? 'claude') as ProviderId
    const adapter = this.#adapter(provider)
    const model = input.model ?? ''
    const effort = (input.effort ?? 'medium') as Effort
    this.#checkModel(adapter, model, effort)
    const allowed = [...new Set([provider, ...(input.allowedProviders ?? [])])]
    for (const p of allowed) if (!(PROVIDER_IDS as readonly string[]).includes(p)) throw new ChatError(400, 'unknown_provider', `Unknown provider: ${p}`)
    const id = randomUUID()
    const now = this.#iso()
    this.#store.db
      .prepare(
        `INSERT INTO conversation (id, title, kind, provider, model, effort, allowed_providers_json, project_id, created_at, updated_at)
         VALUES (?, ?, 'chat', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, (input.title ?? 'New chat').slice(0, 80) || 'New chat', provider, model, effort, JSON.stringify(allowed), input.projectId ?? null, now, now)
    return this.#conversation(id)!
  }

  list(): ConversationRecord[] {
    const rows = this.#store.db.prepare('SELECT * FROM conversation ORDER BY updated_at DESC LIMIT 200').all() as unknown as ConversationRow[]
    return rows.map(toConversation)
  }

  get(id: string): ConversationDetail | undefined {
    const conversation = this.#conversation(id)
    if (!conversation) return undefined
    const rows = this.#store.db
      .prepare('SELECT * FROM message WHERE conversation_id = ? ORDER BY created_at, rowid')
      .all(id) as unknown as MessageRow[]
    return { conversation, messages: rows.map(toMessage) }
  }

  #conversation(id: string): ConversationRecord | undefined {
    const row = this.#store.db.prepare('SELECT * FROM conversation WHERE id = ?').get(id) as ConversationRow | undefined
    return row && toConversation(row)
  }

  stream(runId: string): RunStream | undefined {
    return this.#streams.get(runId)
  }

  async send(conversationId: string, req: SendMessageRequest): Promise<SendMessageResponse> {
    const detail = this.get(conversationId)
    if (!detail) throw new ChatError(404, 'not_found', 'No such conversation')
    const conv = detail.conversation
    const content = typeof req.content === 'string' ? req.content.trim() : ''
    if (!content) throw new ChatError(400, 'empty', 'Write something to send')
    if (content.length > MAX_CONTENT) throw new ChatError(400, 'too_long', `Messages are limited to ${MAX_CONTENT} characters`)

    // Attached files and the attached project travel as data, with this message only. Their text is not stored in the chat.
    const attachments = req.attachments ?? []
    if (!Array.isArray(attachments) || attachments.length > 3) throw new ChatError(400, 'bad_attachment', 'Attach up to 3 files.')
    const attachedNames: string[] = []
    const blocks: string[] = []
    let attachedChars = 0
    for (const ref of attachments) {
      if (!this.#context) throw new ChatError(400, 'bad_attachment', 'Files are not available.')
      let file
      try {
        file = this.#context.readFile(ref)
      } catch (err) {
        throw new ChatError(400, 'bad_attachment', err instanceof Error ? err.message : 'That file cannot be attached.')
      }
      attachedChars += file.text.length
      if (attachedChars > MAX_ATTACHED_TEXT) throw new ChatError(400, 'bad_attachment', 'The attached files are too large together.')
      attachedNames.push(file.name)
      blocks.push(asData(`file ${file.name}`, file.text))
    }
    const manifest = conv.projectId && this.#context ? this.#context.manifest(conv.projectId) : null
    const extra = [...(manifest ? [manifest] : []), ...blocks].join('\n\n')
    const stored = attachedNames.length > 0 ? `${content}\n\n(Attached: ${attachedNames.join(', ')})` : content

    const model = req.model ?? conv.model
    const effort = (req.effort ?? conv.effort) as Effort
    const adapter = this.#adapter(conv.provider)
    this.#checkModel(adapter, model, effort)

    // Invariant 4 (spec 12): context only goes to a provider this conversation allows.
    if (!conv.allowedProviders.includes(conv.provider)) {
      throw new ChatError(403, 'provider_not_allowed', `${conv.provider} is not allowed to receive this conversation`)
    }
    if (!this.acknowledged().includes(conv.provider)) {
      return { status: 'disclosure_required', provider: conv.provider, text: PROVIDER_DISCLOSURE[conv.provider] ?? `This conversation is sent to ${conv.provider}.` }
    }
    // The one await comes first. Everything from the guards to the claim below is synchronous, so two
    // overlapping sends cannot both pass the guards before either has claimed the slot.
    const status = await adapter.status()
    if (!status.available) throw new ChatError(503, 'provider_unavailable', status.reason ?? `${conv.provider} is not available`)
    if (this.#runs.paused) throw new ChatError(409, 'paused', 'junosd is stopped. Resume before sending.')
    const busy = this.#store.db.prepare(`SELECT 1 FROM message WHERE conversation_id = ? AND status = 'streaming'`).get(conversationId)
    if (busy) throw new ChatError(409, 'busy', 'A reply is still being written. Wait for it or stop it first.')
    // Decided 2026-10-22: one job per subscription at a time, so chats cannot starve scheduled work (or each other).
    // A run whose stop was not confirmed may still be alive, so it keeps the slot until it really exits.
    if (this.#providerClaimed(conv.provider) || this.#runs.list().some((r) => r.provider === conv.provider && (r.status === 'running' || r.status === 'cancelling' || (r.status === 'stop_unconfirmed' && this.#runs.isTracked(r.id))))) {
      throw new ChatError(409, 'provider_busy', `Another ${conv.provider} job is running. Subscriptions run one job at a time.`)
    }
    const now = this.#iso()
    const userId = randomUUID()
    const assistantId = randomUUID()
    const insert = this.#store.db.prepare(
      `INSERT INTO message (id, conversation_id, role, provider, model, effort, content_md, status, run_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insert.run(userId, conversationId, 'user', null, null, null, stored, 'complete', null, now)
    // The assistant message exists before the run so a reload mid-stream still shows it.
    insert.run(assistantId, conversationId, 'assistant', conv.provider, model, effort, '', 'streaming', null, new Date(this.#now() + 1).toISOString())
    const title = detail.messages.length === 0 && conv.title === 'New chat' ? content.replace(/\s+/g, ' ').slice(0, 48) : conv.title
    this.#store.db
      .prepare('UPDATE conversation SET model = ?, effort = ?, title = ?, updated_at = ? WHERE id = ?')
      .run(model, effort, title, now, conversationId)

    const history = [...detail.messages, { role: 'user' as const, content: stored, status: 'complete' as MessageStatus }]
    const prompt = (extra ? `${extra}\n\n` : '') + buildPrompt(history)
    const stream = new RunStream()
    let text = ''
    let thinking = ''
    let failure: { message: string; kind: string } | undefined
    let limitResetsAt: string | null = null

    let run
    try {
      run = adapter.start(this.#runs, {
        model,
        effort,
        prompt,
        cwd: this.#cwd,
        onEvent: (event) => {
          if (event.type === 'token') text += event.text
          else if (event.type === 'thinking') thinking += event.text
          else if (event.type === 'rate_limit' && event.status !== 'allowed') limitResetsAt = event.resetsAt ?? null
          else if (event.type === 'error') {
            failure = { message: event.message, kind: event.kind }
            // Remembered so the Connections screen can say the plan is limited, and until when.
            if (event.kind === 'rate_limited') this.#store.append('provider.rate_limited', { provider: conv.provider, resetsAt: limitResetsAt, at: this.#iso() }, conv.provider)
          }
          else if (event.type === 'usage' && event.inputTokens > HEAVY_CONTEXT_TOKENS) {
            this.#store.append('provider.heavy_context', { provider: conv.provider, inputTokens: event.inputTokens, messageId: assistantId })
          }
          stream.push(event)
        },
        onEnd: (finished) => {
          let finalStatus: MessageStatus
          if (failure) finalStatus = 'error'
          else if (finished.status === 'finished') finalStatus = 'complete'
          else finalStatus = 'partial' // stopped: what was written is kept (spec 04)
          this.#store.db
            .prepare('UPDATE message SET content_md = ?, thinking_md = ?, status = ?, error = ? WHERE id = ?')
            .run(text, thinking, finalStatus, failure?.message ?? null, assistantId)
          this.#store.append('chat.message', { conversationId, messageId: assistantId, status: finalStatus, runId: finished.id, errorKind: failure?.kind ?? null }, assistantId)
          stream.finish()
          // Keep the buffer a little while so a slow client can still read the end.
          setTimeout(() => this.#streams.delete(finished.id), 60_000).unref()
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'could not start'
      this.#store.db.prepare(`UPDATE message SET status = 'error', error = ? WHERE id = ?`).run(message, assistantId)
      throw err
    }
    this.#streams.set(run.id, stream)
    this.#store.db.prepare('UPDATE message SET run_id = ? WHERE id = ?').run(run.id, assistantId)
    this.#store.append('chat.message', { conversationId, messageId: userId, status: 'complete' }, userId)

    const messages = this.get(conversationId)!.messages
    return {
      status: 'started',
      runId: run.id,
      userMessage: messages.find((m) => m.id === userId)!,
      assistantMessage: messages.find((m) => m.id === assistantId)!,
    }
  }
}

/** The conversation as plain text. Provider-neutral, so switching providers later replays it unchanged. */
export function buildPrompt(messages: Array<{ role: 'user' | 'assistant'; content: string; status: MessageStatus }>): string {
  const turns = messages
    .filter((m) => m.content.trim() && (m.role === 'user' || m.status === 'complete' || m.status === 'partial'))
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.trim()}`)
  let total = 0
  const kept: string[] = []
  for (let i = turns.length - 1; i >= 0; i--) {
    total += turns[i]!.length
    if (total > MAX_PROMPT_CHARS && kept.length > 0) break
    kept.unshift(turns[i]!)
  }
  return kept.join('\n\n') + '\n\nAssistant:'
}

function toConversation(row: ConversationRow): ConversationRecord {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    provider: row.provider,
    model: row.model,
    effort: row.effort,
    allowedProviders: JSON.parse(row.allowed_providers_json) as ProviderId[],
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toMessage(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    provider: row.provider,
    model: row.model,
    effort: row.effort,
    content: row.content_md,
    thinking: row.thinking_md,
    status: row.status,
    error: row.error,
    runId: row.run_id,
    createdAt: row.created_at,
  }
}
