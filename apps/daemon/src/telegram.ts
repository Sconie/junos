import { randomBytes } from 'node:crypto'
import { ALWAYS_ASK_CLASSES, type InboxItem, type TelegramStatus } from '@junos/shared'
import type { Gateway } from './gateway.ts'
import type { InboxService } from './inbox.ts'
import type { EventStore } from './store.ts'

export interface TelegramConfig {
  token: string
  /** Jonas's numeric Telegram user id. The bot answers nobody else. */
  userId: number
  apiBase: string
  quietStart: string
  quietEnd: string
  pollMs: number
  longPollSeconds: number
}

/**
 * Reads the bot settings from the environment. The token is never stored in SQLite, logged or sent
 * to the browser (the OS keychain is the planned home, spec 12). With no token the bridge is simply off.
 */
export function telegramConfigFromEnv(env: NodeJS.ProcessEnv): { config: TelegramConfig | null; reason: string | null; quiet: { start: string; end: string } } {
  const [start, end] = (env.JUNOS_TELEGRAM_QUIET || '23:00-07:00').split('-')
  const quiet = { start: validTime(start) ? start! : '23:00', end: validTime(end) ? end! : '07:00' }
  const token = env.JUNOS_TELEGRAM_TOKEN
  if (!token) return { config: null, reason: 'Not configured. Set JUNOS_TELEGRAM_TOKEN and JUNOS_TELEGRAM_USER_ID before starting junosd.', quiet }
  const userId = Number(env.JUNOS_TELEGRAM_USER_ID)
  if (!/^\d{3,15}$/.test(env.JUNOS_TELEGRAM_USER_ID ?? '') || !Number.isSafeInteger(userId)) {
    return { config: null, reason: 'JUNOS_TELEGRAM_USER_ID must be your numeric Telegram user id.', quiet }
  }
  const apiBase = (env.JUNOS_TELEGRAM_API || 'https://api.telegram.org').replace(/\/+$/, '')
  // The bot token travels in the URL, so it may only go to Telegram itself (or a local fake in tests).
  if (!/^https:\/\/api\.telegram\.org$/.test(apiBase) && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiBase)) {
    return { config: null, reason: 'JUNOS_TELEGRAM_API must be https://api.telegram.org or a local address.', quiet }
  }
  return {
    config: {
      token,
      userId,
      apiBase,
      quietStart: quiet.start,
      quietEnd: quiet.end,
      pollMs: Number(env.JUNOS_TELEGRAM_POLL_MS) || 2000,
      longPollSeconds: Number(env.JUNOS_TELEGRAM_LONG_POLL_S ?? 25),
    },
    reason: null,
    quiet,
  }
}

function validTime(t: string | undefined): boolean {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

/** Quiet window in the PC's local time; it may cross midnight. */
export function isQuiet(nowMs: number, start: string, end: string): boolean {
  const d = new Date(nowMs)
  const m = d.getHours() * 60 + d.getMinutes()
  const [s, e] = [toMinutes(start), toMinutes(end)]
  return s === e ? false : s < e ? m >= s && m < e : m >= s || m < e
}

interface TgUpdate {
  update_id: number
  message?: { message_id: number; from?: { id: number }; chat: { id: number; type?: string }; text?: string }
  callback_query?: { id: string; from: { id: number }; message?: { message_id: number; chat: { id: number } }; data?: string }
}

export interface TelegramOptions {
  config: TelegramConfig
  store: EventStore
  gateway: Gateway
  inbox: InboxService
  now?: () => number
  /** Test seam; defaults to the global fetch. */
  fetchFn?: typeof fetch
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const CALLBACK = /^([adyn]):([0-9a-f-]{36}):([a-z0-9]{8,24})$/

/**
 * The JunOS bot. It pushes urgent approvals to Jonas with Approve and Deny buttons and resolves the same
 * gateway approval the Inbox shows. It trusts nothing from Telegram except a press from the owner, in the
 * owner's own chat, on the message JunOS sent, carrying that message's current one-time code.
 */
export class TelegramBridge {
  readonly #cfg: TelegramConfig
  readonly #store: EventStore
  readonly #gateway: Gateway
  readonly #inbox: InboxService
  readonly #now: () => number
  readonly #fetch: typeof fetch
  #abort = new AbortController()
  #offset = 0
  #lastPoll: string | null = null
  #sent = 0
  #rejected = 0
  #running: Promise<void> | null = null
  readonly #unsubscribe: Array<() => void> = []

  constructor(options: TelegramOptions) {
    this.#cfg = options.config
    this.#store = options.store
    this.#gateway = options.gateway
    this.#inbox = options.inbox
    this.#now = options.now ?? Date.now
    this.#fetch = options.fetchFn ?? fetch
  }

  status(): TelegramStatus {
    return {
      enabled: true,
      reason: null,
      quietHours: { start: this.#cfg.quietStart, end: this.#cfg.quietEnd },
      lastPollAt: this.#lastPoll,
      sent: this.#sent,
      rejected: this.#rejected,
    }
  }

  start(): void {
    if (this.#running) return
    this.#unsubscribe.push(
      this.#inbox.onCreated((item) => void this.#deliver(item)),
      this.#inbox.onResolved((item) => void this.#mirrorResolved(item)),
    )
    this.#running = this.#loop()
  }

  async stop(): Promise<void> {
    this.#abort.abort()
    for (const un of this.#unsubscribe.splice(0)) un()
    await this.#running?.catch(() => undefined)
    this.#running = null
  }

  async #loop(): Promise<void> {
    let backoff = this.#cfg.pollMs
    // Items that arrived while the bridge was off (or the daemon was down) are sent first.
    await this.#flushUnsent()
    while (!this.#abort.signal.aborted) {
      try {
        const updates = await this.#call<TgUpdate[]>('getUpdates', { offset: this.#offset, timeout: this.#cfg.longPollSeconds, allowed_updates: ['message', 'callback_query'] })
        this.#lastPoll = new Date(this.#now()).toISOString()
        backoff = this.#cfg.pollMs
        for (const update of updates ?? []) {
          this.#offset = Math.max(this.#offset, update.update_id + 1)
          await this.#handle(update).catch(() => undefined)
        }
        await this.#flushUnsent()
        if (!updates || updates.length === 0) await sleep(this.#cfg.pollMs).catch(() => undefined)
      } catch (err) {
        if (this.#abort.signal.aborted) return
        this.#store.append('telegram.error', { message: this.#scrub(err) })
        await sleep(backoff)
        backoff = Math.min(backoff * 2, 30_000)
      }
    }
  }

  /** Keeps the bot token out of anything that is logged or stored. */
  #scrub(err: unknown): string {
    return String((err as Error)?.message ?? err).split(this.#cfg.token).join('<token>').slice(0, 200)
  }

  async #call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await this.#fetch(`${this.#cfg.apiBase}/bot${this.#cfg.token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: this.#abort.signal,
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null
    if (!res.ok || !json?.ok) throw new Error(`Telegram ${method} failed (${res.status}${json?.description ? `: ${json.description}` : ''})`)
    return json.result as T
  }

  // ---- outbound ----

  async #flushUnsent(): Promise<void> {
    for (const item of this.#inbox.unsentToTelegram()) await this.#deliver(item)
  }

  /** Approvals always go out. Everything else waits for the quiet window to end. */
  async #deliver(item: InboxItem): Promise<void> {
    if (item.status !== 'new') return
    const quiet = isQuiet(this.#now(), this.#cfg.quietStart, this.#cfg.quietEnd)
    if (item.kind !== 'approval' && quiet) return
    if (this.#inbox.telegram(item.id).messageId !== null) return
    try {
      if (item.kind === 'approval' && item.approval) {
        const nonce = token()
        const sent = await this.#call<{ message_id: number }>('sendMessage', {
          chat_id: this.#cfg.userId,
          text: approvalText(item),
          reply_markup: buttons(item.approval.id, nonce, false),
        })
        this.#inbox.setTelegram(item.id, sent.message_id, nonce)
      } else {
        const sent = await this.#call<{ message_id: number }>('sendMessage', { chat_id: this.#cfg.userId, text: `${item.title}\n${item.body}`.slice(0, 400) })
        this.#inbox.setTelegram(item.id, sent.message_id, null)
      }
      this.#sent += 1
      this.#store.append('telegram.sent', { itemId: item.id, kind: item.kind }, item.id)
    } catch (err) {
      if (!this.#abort.signal.aborted) this.#store.append('telegram.error', { message: this.#scrub(err), itemId: item.id })
    }
  }

  /** The approval was settled somewhere else (or expired): take the buttons off so it cannot be answered twice. */
  async #mirrorResolved(item: InboxItem): Promise<void> {
    const { messageId } = this.#inbox.telegram(item.id)
    if (messageId === null || !item.approval) return
    await this.#edit(messageId, resolvedText(item)).catch(() => undefined)
  }

  async #edit(messageId: number, text: string, markup?: unknown): Promise<void> {
    await this.#call('editMessageText', { chat_id: this.#cfg.userId, message_id: messageId, text, reply_markup: markup ?? { inline_keyboard: [] } })
  }

  async #answer(id: string, text: string): Promise<void> {
    await this.#call('answerCallbackQuery', { callback_query_id: id, text }).catch(() => undefined)
  }

  // ---- inbound ----

  async #handle(update: TgUpdate): Promise<void> {
    const cq = update.callback_query
    const msg = update.message
    const from = cq?.from.id ?? msg?.from?.id
    const chat = cq?.message?.chat.id ?? msg?.chat.id
    // Anyone else, or the owner's id in a group, is ignored. Only a count and a reason are kept, never the content.
    if (from !== this.#cfg.userId || chat !== this.#cfg.userId) {
      this.#rejected += 1
      this.#store.append('telegram.rejected', { reason: from !== this.#cfg.userId ? 'not_owner' : 'wrong_chat' })
      if (cq) await this.#answer(cq.id, '')
      return
    }
    if (!cq) return // plain messages from the owner are not commands; this bot only carries approvals
    await this.#press(cq)
  }

  async #press(cq: NonNullable<TgUpdate['callback_query']>): Promise<void> {
    const match = CALLBACK.exec(cq.data ?? '')
    const messageId = cq.message?.message_id
    if (!match || messageId === undefined) return this.#answer(cq.id, 'That button is not valid.')
    const [, verb, approvalId, nonce] = match as unknown as [string, 'a' | 'd' | 'y' | 'n', string, string]

    // The press must be on the message JunOS sent for this approval, carrying that message's current code.
    const item = this.#inbox.byApproval(approvalId)
    const stored = item ? this.#inbox.telegram(item.id) : null
    if (!item || !stored || stored.messageId !== messageId || stored.nonce !== nonce) {
      return this.#answer(cq.id, 'This button is out of date.')
    }
    const confirmStage = nonce.startsWith('c')
    if ((verb === 'y' || verb === 'n') !== confirmStage) return this.#answer(cq.id, 'This button is out of date.')

    const approval = this.#gateway.get(approvalId)
    if (!approval || approval.status !== 'pending') {
      await this.#answer(cq.id, `Already ${approval?.status ?? 'gone'}.`)
      if (item.approval || approval) await this.#edit(messageId, resolvedText({ ...item, approval: approval ?? item.approval })).catch(() => undefined)
      return
    }
    const by = `telegram:${this.#cfg.userId}`

    if (verb === 'd' || verb === 'n') {
      if (verb === 'n') {
        // Backing out of the confirmation puts the original buttons back.
        const fresh = token()
        this.#inbox.setTelegram(item.id, messageId, fresh)
        await this.#edit(messageId, approvalText({ ...item, approval }), buttons(approvalId, fresh, false))
        return this.#answer(cq.id, 'Cancelled.')
      }
      const out = this.#gateway.deny(approvalId, by, 'telegram')
      return this.#answer(cq.id, out.ok ? 'Denied.' : `Could not deny: ${out.reason.replace('_', ' ')}.`)
    }

    // Approve. Anything that sends, deletes or spends needs a second tap on a fresh one-time code.
    const risky = ALWAYS_ASK_CLASSES.includes(approval.class)
    if (verb === 'a' && risky) {
      const confirmNonce = 'c' + token()
      this.#inbox.setTelegram(item.id, messageId, confirmNonce)
      await this.#edit(messageId, `Are you sure?\nApprove ${approval.tool}${approval.target ? ` → ${approval.target}` : ''}.${approval.irreversible ? '\nThis cannot be undone.' : ''}`, buttons(approvalId, confirmNonce, true))
      return this.#answer(cq.id, 'Tap again to confirm.')
    }
    const out = this.#gateway.approve(approvalId, by, 'telegram')
    return this.#answer(cq.id, out.ok ? 'Approved.' : `Could not approve: ${out.reason.replace('_', ' ')}.`)
  }
}

const token = () => randomBytes(5).toString('hex')

/** A short summary: what and where, never the full command or its arguments. */
function approvalText(item: InboxItem): string {
  const a = item.approval
  if (!a) return item.title
  const expires = new Date(a.expiresAt)
  const hh = String(expires.getHours()).padStart(2, '0')
  const mm = String(expires.getMinutes()).padStart(2, '0')
  return `Approval needed\n${a.tool}${a.target ? ` → ${a.target}` : ''}\n${a.class}${a.irreversible ? ' · cannot be undone' : ''}\nExpires ${hh}:${mm}`
}

function buttons(approvalId: string, nonce: string, confirm: boolean) {
  return {
    inline_keyboard: [
      confirm
        ? [
            { text: 'Yes, approve', callback_data: `y:${approvalId}:${nonce}` },
            { text: 'No', callback_data: `n:${approvalId}:${nonce}` },
          ]
        : [
            { text: 'Approve', callback_data: `a:${approvalId}:${nonce}` },
            { text: 'Deny', callback_data: `d:${approvalId}:${nonce}` },
          ],
    ],
  }
}

function resolvedText(item: InboxItem): string {
  const a = item.approval
  const how = a?.decidedChannel === 'telegram' ? 'from Telegram' : a?.decidedChannel === 'stop' ? 'because Stop was pressed' : a?.decidedChannel === 'inbox' ? 'in the Inbox' : ''
  const status = a?.status === 'consumed' ? 'approved' : (a?.status ?? item.resolution ?? 'resolved')
  return `${a?.tool ?? item.title}${a?.target ? ` → ${a.target}` : ''}\nResolved: ${status}${how ? ` ${how}` : ''}.`
}
