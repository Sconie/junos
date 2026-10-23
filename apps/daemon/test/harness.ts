import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CSRF_HEADER, type JunosEvent } from '@junos/shared'
import type { HermesBridge } from '../src/hermes/bridge.ts'
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

export interface BootOptions {
  env?: NodeJS.ProcessEnv
  now?: () => number
  pairingTtlMs?: number
  approvalTtlMs?: number
  autonomy?: 'ask-first' | 'balanced' | 'autonomous'
  testTools?: boolean
  stopGraceMs?: number
  stopConfirmMs?: number
  sweepMs?: number
  schedulerTickMs?: number
  schedulerGraceMs?: number
  schedulerBackoffMs?: number[]
  schedulerLeaseMs?: number
  hermes?: HermesBridge
  hermesPollMs?: number
  workflowTickMs?: number
  workflowGraceMs?: number
  workflowSlotWaitMs?: number
  workflowSlotPollMs?: number
  workflowRatePerHour?: number
  workflowGlobalPerHour?: number
  workflowMaxDepth?: number
}

export type TestDaemon = Daemon & {
  url: string
  /** The pairing code the daemon announced last (what the owner would read from the console). */
  code(): string
  /** A browser that has paired with this daemon. */
  pair(): Promise<Browser>
  browser(): Browser
}

export async function boot(home: string, options: BootOptions = {}): Promise<TestDaemon> {
  let announced: string | null = null
  const daemon = await startDaemon({
    home,
    port: 0,
    env: options.env ?? fakeProviderEnv(),
    heartbeatMs: 50,
    now: options.now,
    pairingTtlMs: options.pairingTtlMs,
    approvalTtlMs: options.approvalTtlMs,
    autonomy: options.autonomy,
    testTools: options.testTools ?? false,
    stopGraceMs: options.stopGraceMs ?? 300,
    stopConfirmMs: options.stopConfirmMs ?? 1500,
    sweepMs: options.sweepMs,
    schedulerTickMs: options.schedulerTickMs ?? 40,
    schedulerGraceMs: options.schedulerGraceMs,
    schedulerBackoffMs: options.schedulerBackoffMs,
    schedulerLeaseMs: options.schedulerLeaseMs,
    hermes: options.hermes,
    hermesPollMs: options.hermesPollMs ?? 100,
    workflowTickMs: options.workflowTickMs ?? 40,
    workflowGraceMs: options.workflowGraceMs,
    workflowSlotWaitMs: options.workflowSlotWaitMs,
    workflowSlotPollMs: options.workflowSlotPollMs ?? 25,
    workflowRatePerHour: options.workflowRatePerHour,
    workflowGlobalPerHour: options.workflowGlobalPerHour,
    workflowMaxDepth: options.workflowMaxDepth,
    onPairingCode: (c) => {
      announced = c
    },
  })
  const url = `http://127.0.0.1:${daemon.port}`
  const code = () => {
    if (!announced) throw new Error('no pairing code is active')
    return announced
  }
  return Object.assign(daemon, {
    url,
    code,
    browser: () => new Browser(url),
    async pair() {
      const b = new Browser(url)
      const res = await b.pair(code())
      if (res.status !== 200) throw new Error(`pairing failed: ${res.status}`)
      return b
    },
  })
}

interface RequestInit2 {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  /** false: leave the CSRF header off. */
  csrf?: boolean
  /** null: send no Origin header. */
  origin?: string | null
}

/** Stands in for the UI tab: keeps the session cookie and the CSRF token, and sends a same-origin Origin. */
export class Browser {
  cookie = ''
  csrf = ''
  readonly url: string
  readonly origin: string
  constructor(url: string, origin = url) {
    this.url = url
    this.origin = origin
  }

  request(path: string, init: RequestInit2 = {}) {
    const method = init.method ?? 'GET'
    const headers: Record<string, string> = { ...init.headers }
    if (this.cookie) headers.cookie = this.cookie
    const origin = init.origin === undefined ? this.origin : init.origin
    if (origin !== null) headers.origin = origin
    if (init.csrf !== false && this.csrf && method !== 'GET') headers[CSRF_HEADER] = this.csrf
    if (init.body !== undefined) headers['content-type'] = 'application/json'
    return fetch(this.url + path, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  }

  get(path: string) {
    return this.request(path)
  }

  post(path: string, body?: unknown) {
    return this.request(path, { method: 'POST', body })
  }

  async pair(code: string) {
    const res = await this.request('/api/pair', { method: 'POST', body: { code } })
    const set = res.headers.get('set-cookie')
    if (res.status === 200 && set) {
      this.cookie = set.split(';')[0]!
      this.csrf = ((await res.clone().json()) as { csrf: string }).csrf
    }
    return res
  }

  json<T>(path: string): Promise<T> {
    return this.get(path).then((r) => r.json() as Promise<T>)
  }
}

export interface SseMessage {
  event: string
  id?: string
  data: unknown
}

/** Minimal SSE client over fetch. */
export async function openSse(url: string, opts: { lastEventId?: number; cookie?: string } = {}) {
  const controller = new AbortController()
  const res = await fetch(`${url}/api/events`, {
    signal: controller.signal,
    headers: {
      ...(opts.lastEventId === undefined ? {} : { 'last-event-id': String(opts.lastEventId) }),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
  })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const messages: SseMessage[] = []
  const waiters: Array<() => void> = []
  let markEnded: () => void = () => {}
  /** Resolves when the daemon ends the stream. */
  const ended = new Promise<void>((resolve) => {
    markEnded = resolve
  })

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
    } finally {
      markEnded()
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
    ended,
    waitFor,
    events: () => messages.filter((m) => m.event === 'message').map((m) => m.data as JunosEvent),
    close: () => controller.abort(),
  }
}
