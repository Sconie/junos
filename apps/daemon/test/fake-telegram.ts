import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface SentMessage {
  message_id: number
  chat_id: number
  text: string
  reply_markup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> }
}

export interface Edit {
  message_id: number
  text: string
  reply_markup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> }
}

/**
 * A stand-in for api.telegram.org on 127.0.0.1. The real bot is never contacted from a test.
 * It checks the token in the URL like Telegram does, records everything the daemon sends, and lets a
 * test queue updates as if Jonas (or a stranger) tapped a button or wrote a message.
 */
export class FakeTelegram {
  readonly token: string
  readonly sent: SentMessage[] = []
  readonly edits: Edit[] = []
  readonly answers: Array<{ id: string; text: string }> = []
  /** Raw request paths, to prove the token only ever travels to this server. */
  readonly paths: string[] = []
  /** Offsets the daemon polled with, to prove acknowledged updates are not replayed. */
  readonly offsets: number[] = []
  failSend = false
  #updates: Array<Record<string, unknown> & { update_id: number }> = []
  #nextUpdate = 1
  #nextMessage = 100
  #server: Server
  url = ''

  constructor(token: string) {
    this.token = token
    this.#server = createServer((req, res) => {
      this.paths.push(req.url ?? '')
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', () => {
        const m = /^\/bot([^/]+)\/(\w+)$/.exec(req.url ?? '')
        const reply = (status: number, body: unknown) => {
          res.writeHead(status, { 'content-type': 'application/json' })
          res.end(JSON.stringify(body))
        }
        if (!m || m[1] !== this.token) return reply(401, { ok: false, description: 'Unauthorized' })
        const body = (chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}) as Record<string, any>
        switch (m[2]) {
          case 'getUpdates': {
            this.offsets.push(Number(body.offset ?? 0))
            this.#updates = this.#updates.filter((u) => u.update_id >= Number(body.offset ?? 0))
            return reply(200, { ok: true, result: this.#updates })
          }
          case 'sendMessage': {
            if (this.failSend) return reply(500, { ok: false, description: `boom for token ${this.token}` })
            const message_id = this.#nextMessage++
            this.sent.push({ message_id, chat_id: body.chat_id, text: body.text, reply_markup: body.reply_markup })
            return reply(200, { ok: true, result: { message_id } })
          }
          case 'editMessageText':
            this.edits.push({ message_id: body.message_id, text: body.text, reply_markup: body.reply_markup })
            return reply(200, { ok: true, result: true })
          case 'answerCallbackQuery':
            this.answers.push({ id: body.callback_query_id, text: body.text ?? '' })
            return reply(200, { ok: true, result: true })
          default:
            return reply(404, { ok: false, description: 'unknown method' })
        }
      })
    })
  }

  async listen(): Promise<void> {
    await new Promise<void>((resolve) => this.#server.listen(0, '127.0.0.1', resolve))
    this.url = `http://127.0.0.1:${(this.#server.address() as AddressInfo).port}`
  }

  close(): Promise<void> {
    this.#server.closeAllConnections()
    return new Promise((resolve) => this.#server.close(() => resolve()))
  }

  /** The owner (or anyone) taps an inline button. */
  press(fromId: number, messageId: number, data: string, chatId = fromId): string {
    const id = `cq-${this.#nextUpdate}`
    this.#updates.push({ update_id: this.#nextUpdate++, callback_query: { id, from: { id: fromId }, message: { message_id: messageId, chat: { id: chatId } }, data } })
    return id
  }

  /** Someone writes to the bot. */
  say(fromId: number, text: string, chatId = fromId): void {
    this.#updates.push({ update_id: this.#nextUpdate++, message: { message_id: this.#nextMessage++, from: { id: fromId }, chat: { id: chatId }, text } })
  }

  lastSent(): SentMessage {
    const m = this.sent.at(-1)
    if (!m) throw new Error('nothing was sent to Telegram')
    return m
  }

  /** The callback data of a button by its label on the latest version of a message. */
  button(messageId: number, label: string): string {
    const edit = [...this.edits].reverse().find((e) => e.message_id === messageId)
    const markup = edit ? edit.reply_markup : this.sent.find((s) => s.message_id === messageId)?.reply_markup
    const btn = markup?.inline_keyboard.flat().find((b) => b.text === label)
    if (!btn) throw new Error(`no "${label}" button on message ${messageId}`)
    return btn.callback_data
  }

  textOf(messageId: number): string {
    const edit = [...this.edits].reverse().find((e) => e.message_id === messageId)
    return edit ? edit.text : (this.sent.find((s) => s.message_id === messageId)?.text ?? '')
  }
}
