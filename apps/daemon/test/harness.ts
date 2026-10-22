import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { JunosEvent } from '@junos/shared'
import { startDaemon, type Daemon } from '../src/server.ts'

const fake = (name: string) => fileURLToPath(new URL(`./fakes/${name}.mjs`, import.meta.url))

/** Env that points every provider at a fake CLI. */
export function fakeProviderEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    JUNOS_CLAUDE_BIN: fake('claude'),
    JUNOS_CODEX_BIN: fake('codex'),
    JUNOS_CURSOR_BIN: fake('cursor-agent'),
    ...overrides,
  }
}

export function brokenCli(): string {
  return fake('broken')
}

export function tempHome(): { home: string; cleanup(): void } {
  const home = mkdtempSync(join(tmpdir(), 'junosd-test-'))
  return { home, cleanup: () => rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) }
}

export async function boot(home: string, env = fakeProviderEnv()): Promise<Daemon & { url: string }> {
  const daemon = await startDaemon({ home, port: 0, env, heartbeatMs: 50 })
  return Object.assign(daemon, { url: `http://127.0.0.1:${daemon.port}` })
}

export interface SseMessage {
  event: string
  id?: string
  data: unknown
}

/** Minimal SSE client over fetch. */
export async function openSse(url: string, lastEventId?: number) {
  const controller = new AbortController()
  const res = await fetch(`${url}/api/events`, {
    signal: controller.signal,
    headers: lastEventId === undefined ? {} : { 'last-event-id': String(lastEventId) },
  })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const messages: SseMessage[] = []
  const waiters: Array<() => void> = []

  void (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const msg: SseMessage = { event: 'message', data: null }
          let data = ''
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) msg.event = line.slice(7)
            else if (line.startsWith('id: ')) msg.id = line.slice(4)
            else if (line.startsWith('data: ')) data += line.slice(6)
          }
          if (!data) continue
          msg.data = JSON.parse(data)
          messages.push(msg)
          for (const w of waiters.splice(0)) w()
        }
      }
    } catch {
      /* aborted */
    }
  })()

  async function waitFor(pred: (m: SseMessage) => boolean, ms = 5000): Promise<SseMessage> {
    const deadline = Date.now() + ms
    for (;;) {
      const hit = messages.find(pred)
      if (hit) return hit
      const left = deadline - Date.now()
      if (left <= 0) throw new Error(`timed out; saw ${JSON.stringify(messages)}`)
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, left)
        waiters.push(() => {
          clearTimeout(t)
          resolve()
        })
      })
    }
  }

  return {
    status: res.status,
    contentType: res.headers.get('content-type'),
    messages,
    waitFor,
    events: () => messages.filter((m) => m.event === 'message').map((m) => m.data as JunosEvent),
    close: () => controller.abort(),
  }
}
