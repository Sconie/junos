import { mkdirSync, readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import {
  DEFAULT_PORT,
  RESYNC_EVENT,
  type HealthResponse,
  type JunosEvent,
  APPROVAL_STATUSES,
  type ActionRequest,
  type ApprovalStatus,
  type ConnectionsResponse,
  type ProviderProbe,
  type SendMessageRequest,
  type RunsResponse,
  type ProvidersResponse,
  type SessionResponse,
  type StatusResponse,
} from '@junos/shared'
import {
  Pairing,
  RequestPolicy,
  clearedSessionCookie,
  createSession,
  csrfOk,
  sessionCookie,
  sessionFromRequest,
} from './auth.ts'
import { ClaudeAdapter } from './adapters/claude.ts'
import { CodexAdapter } from './adapters/codex.ts'
import { ConnectionsService } from './connections.ts'
import { ChatError, ChatService } from './chat.ts'
import { Gateway, testTools, type Autonomy } from './gateway.ts'
import { acquireLock } from './lock.ts'
import { FAKE_RUNS, PausedError, RunManager } from './runs.ts'
import { probeProviders } from './providers.ts'
import { EventStore } from './store.ts'

export interface DaemonOptions {
  /** Data dir holding junos.db and junosd.lock. */
  home: string
  /** 0 picks a free port. */
  port?: number
  /** Always loopback; the UI never reaches the daemon from another host. */
  host?: string
  env?: NodeJS.ProcessEnv
  heartbeatMs?: number
  /** Extra browser origins allowed to call the API, e.g. the Vite dev server. */
  uiOrigins?: string[]
  /** Receives the one-time pairing code (null when it is used up). The owner reads it from here. */
  onPairingCode?: (code: string | null, expiresAt: number | null) => void
  /** Test hooks. */
  now?: () => number
  pairingTtlMs?: number
  approvalTtlMs?: number
  autonomy?: Autonomy
  /** Registers the fake test.* tools (never in a normal run). Also JUNOS_TEST_TOOLS=1. */
  testTools?: boolean
  /** Stop timing: polite-cancel grace and post-kill confirmation window. */
  stopGraceMs?: number
  stopConfirmMs?: number
}

export interface Daemon {
  readonly port: number
  readonly store: EventStore
  close(): Promise<void>
}

const CHAT_ACK_PATH = new RegExp('^/api/chat/disclosures/([a-z]+)/ack$')
const CONVERSATION_PATH = new RegExp('^/api/conversations/([0-9a-f-]{36})(?:/(messages))?$')
const RUN_STREAM_PATH = new RegExp('^/api/runs/([0-9a-f-]{36})/stream$')
const RUN_STOP_PATH = new RegExp('^/api/runs/([0-9a-f-]{36})/stop$')
const APPROVAL_PATH = new RegExp('^/api/approvals/([0-9a-f-]{36})(?:/(approve|deny))?$')

const DEFAULT_UI_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173']

const VERSION = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/** Reads a small JSON body; anything over 4 KB is refused. */
function readJson(req: IncomingMessage, maxBytes = 4096): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    let tooLarge = false
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (tooLarge) return // keep draining so the client gets the 400 instead of a reset
      if (size > maxBytes) {
        tooLarge = true
        chunks.length = 0
        reject(new Error('too large'))
      } else chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function sseFrame(event: JunosEvent): string {
  return `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`
}

export async function startDaemon(options: DaemonOptions): Promise<Daemon> {
  const { home, host = '127.0.0.1', env = process.env, heartbeatMs = 5_000 } = options
  mkdirSync(home, { recursive: true, mode: 0o700 })
  const lock = acquireLock(home)
  let store: EventStore | undefined
  let server: Server | undefined
  try {
    store = new EventStore(join(home, 'junos.db'))
    const db = store
    const startedAt = new Date()
    let probes: ProviderProbe[] = []
    const streams = new Set<ServerResponse>()
    const testToolsOn = options.testTools ?? env.JUNOS_TEST_TOOLS === '1'
    const testEffects: Array<Record<string, unknown>> = []
    let runs: RunManager | undefined
    const gateway = new Gateway({
      store: db,
      tools: testToolsOn ? testTools(testEffects) : [],
      now: options.now,
      approvalTtlMs: options.approvalTtlMs,
      autonomy: options.autonomy,
      testTools: testToolsOn,
      isPaused: () => runs?.paused ?? false,
    })
    runs = new RunManager({ store: db, gateway, graceMs: options.stopGraceMs, confirmMs: options.stopConfirmMs, now: options.now })
    const runMgr = runs
    const chatCwd = join(home, 'chat-cwd')
    mkdirSync(chatCwd, { recursive: true })
    const adapters = [new ClaudeAdapter(env), new CodexAdapter(env)]
    const chat = new ChatService({ store: db, runs: runMgr, adapters, cwd: chatCwd, now: options.now })
    const connections = new ConnectionsService({ store: db, adapters, env, now: options.now })
    const chatFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof ChatError) return sendJson(res, err.status, { error: err.code, message: err.message })
      if (err instanceof PausedError) return sendJson(res, 409, { error: 'paused', message: err.message })
      sendJson(res, 500, { error: 'chat error' })
    }
    const sweeper = setInterval(() => gateway.sweepExpired(), 30_000)
    sweeper.unref()
    const streamOwner = new WeakMap<ServerResponse, string>()
    const pairing = new Pairing({ now: options.now, ttlMs: options.pairingTtlMs, onCode: options.onPairingCode })

    async function refreshProviders(): Promise<void> {
      const next = await probeProviders(env)
      for (const probe of next) {
        const before = probes.find((p) => p.id === probe.id)
        if (before && before.detected === probe.detected && before.version === probe.version) continue
        db.append(
          'connection.changed',
          { provider: probe.id, detected: probe.detected, version: probe.version ?? null },
          probe.id,
        )
      }
      probes = next
    }

    function openStream(req: IncomingMessage, res: ServerResponse, url: URL, sessionId: string): void {
      streamOwner.set(res, sessionId)
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      })
      // A write after end() emits ERR_STREAM_WRITE_AFTER_END and, with no listener, exits the process.
      // Close is deferred while the socket is backed up, so the heartbeat can fire in that window.
      let closed = false
      let timer: ReturnType<typeof setInterval> | undefined
      let unsubscribe: (() => void) | undefined
      const stop = (): void => {
        if (closed) return
        closed = true
        clearInterval(timer)
        unsubscribe?.()
        streams.delete(res)
      }
      const write = (chunk: string): void => {
        if (closed || res.writableEnded || res.destroyed) {
          stop()
          return
        }
        res.write(chunk)
      }
      res.on('error', stop)
      res.on('close', stop)
      streams.add(res)
      write('retry: 2000\n\n')
      const raw = req.headers['last-event-id'] ?? url.searchParams.get('lastEventId')
      const lastId = raw === undefined || raw === null || raw === '' ? 0 : Number(raw)
      // Subscribe before replaying so nothing slips between the two; seq dedupes.
      let sent = 0
      const send = (event: JunosEvent) => {
        if (closed || event.seq <= sent) return
        sent = event.seq
        write(sseFrame(event))
      }
      let live: ((event: JunosEvent) => void) | undefined
      unsubscribe = db.subscribe((event) => live?.(event))
      timer = setInterval(() => write('event: heartbeat\ndata: {}\n\n'), heartbeatMs)
      timer.unref()

      const last = db.lastSeq()
      const first = db.firstSeq()
      if (!Number.isFinite(lastId) || lastId < 0 || lastId > last || (lastId > 0 && first > lastId + 1)) {
        // The client's position is unknown or has been trimmed: it must refetch snapshots.
        write(`event: ${RESYNC_EVENT}\ndata: ${JSON.stringify({ lastSeq: last })}\n\n`)
        sent = last
      } else {
        sent = lastId
        for (const event of db.since(lastId)) send(event)
      }
      live = send
      write(`event: ready\ndata: ${JSON.stringify({ lastSeq: db.lastSeq() })}\n\n`)
    }

    let policy: RequestPolicy | undefined

    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const write = req.method !== 'GET' && req.method !== 'HEAD'
      if (!policy) return sendJson(res, 503, { error: 'starting' })

      // 1. Who is this request for, and where did it come from? Applies to every route.
      if (!policy.hostOk(req)) return sendJson(res, 403, { error: 'bad host' })
      const origin = req.headers.origin
      if (!policy.originOk(origin, write)) return sendJson(res, 403, { error: 'bad origin' })

      // 2. Routes that work without a session.
      if (req.method === 'GET' && url.pathname === '/api/health') {
        return sendJson(res, 200, { ok: true, name: 'junosd', version: VERSION } satisfies HealthResponse)
      }
      const session = sessionFromRequest(db, req)
      if (req.method === 'GET' && url.pathname === '/api/session') {
        return sendJson(res, 200, (session ? { paired: true, csrf: session.csrf } : { paired: false }) satisfies SessionResponse)
      }
      if (req.method === 'POST' && url.pathname === '/api/pair') {
        readJson(req).then(
          (body) => {
            const code = typeof (body as { code?: unknown })?.code === 'string' ? (body as { code: string }).code : ''
            const result = pairing.redeem(code)
            if (result !== 'ok') {
              db.append('auth.pair_failed', { reason: result })
              return sendJson(res, 401, { error: result })
            }
            const created = createSession(db)
            db.append('auth.paired', { sessionId: created.id })
            res.setHeader('set-cookie', sessionCookie(created.token))
            sendJson(res, 200, { paired: true, csrf: created.csrf } satisfies SessionResponse)
          },
          () => sendJson(res, 400, { error: 'bad request' }),
        )
        return
      }

      // 3. Everything else needs the paired browser's cookie, and writes also need its CSRF token.
      if (!session) return sendJson(res, 401, { error: 'unauthorized' })
      if (write && !csrfOk(session, req)) return sendJson(res, 403, { error: 'bad csrf' })

      if (req.method === 'GET' && url.pathname === '/api/status') {
        const body: StatusResponse = {
          ok: true,
          name: 'junosd',
          version: VERSION,
          pid: process.pid,
          startedAt: startedAt.toISOString(),
          uptimeMs: Date.now() - startedAt.getTime(),
          lastSeq: db.lastSeq(),
        }
        return sendJson(res, 200, body)
      }
      if (req.method === 'GET' && url.pathname === '/api/events') return openStream(req, res, url, session.id)
      if (req.method === 'GET' && url.pathname === '/api/providers') {
        return sendJson(res, 200, { providers: probes } satisfies ProvidersResponse)
      }
      if (req.method === 'POST' && url.pathname === '/api/providers/refresh') {
        refreshProviders().then(
          () => sendJson(res, 200, { providers: probes } satisfies ProvidersResponse),
          () => sendJson(res, 500, { error: 'probe failed' }),
        )
        return
      }
      if (req.method === 'GET' && url.pathname === '/api/connections') {
        connections.list().then(
          (list) => sendJson(res, 200, { connections: list } satisfies ConnectionsResponse),
          (err) => chatFail(res, err),
        )
        return
      }
      if (req.method === 'GET' && url.pathname === '/api/chat/models') {
        chat.providerStatus().then(
          (status) => sendJson(res, 200, { providers: chat.providers(), acknowledged: chat.acknowledged(), status }),
          (err) => chatFail(res, err),
        )
        return
      }
      const ack = CHAT_ACK_PATH.exec(url.pathname)
      if (req.method === 'POST' && ack) {
        try {
          chat.acknowledge(ack[1]!)
          return sendJson(res, 200, { acknowledged: chat.acknowledged() })
        } catch (err) {
          return chatFail(res, err)
        }
      }
      if (req.method === 'GET' && url.pathname === '/api/conversations') return sendJson(res, 200, { conversations: chat.list() })
      if (req.method === 'POST' && url.pathname === '/api/conversations') {
        readJson(req).then(
          (body) => {
            try {
              sendJson(res, 201, chat.createConversation((body ?? {}) as Record<string, never>))
            } catch (err) {
              chatFail(res, err)
            }
          },
          () => sendJson(res, 400, { error: 'bad request' }),
        )
        return
      }
      const convPath = CONVERSATION_PATH.exec(url.pathname)
      if (convPath) {
        const [, convId, messages] = convPath as unknown as [string, string, string | undefined]
        if (req.method === 'GET' && !messages) {
          const found = chat.get(convId)
          return found ? sendJson(res, 200, found) : sendJson(res, 404, { error: 'not found' })
        }
        if (req.method === 'POST' && messages) {
          readJson(req, 100_000).then(
            (body) =>
              chat.send(convId, (body ?? {}) as SendMessageRequest).then(
                (out) => sendJson(res, out.status === 'started' ? 201 : 409, out),
                (err) => chatFail(res, err),
              ),
            () => sendJson(res, 400, { error: 'bad request' }),
          )
          return
        }
      }
      const runStream = RUN_STREAM_PATH.exec(url.pathname)
      if (req.method === 'GET' && runStream) {
        const live = chat.stream(runStream[1]!)
        if (!live) return sendJson(res, 404, { error: 'no live stream for this run' })
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' })
        const after = Number(req.headers['last-event-id'] ?? url.searchParams.get('lastEventId') ?? 0) || 0
        // A write after the client left would raise an unhandled stream error and take the daemon down,
        // so every write is guarded and the response's errors are swallowed.
        let gone = false
        let unsubscribe: (() => void) | undefined
        const leave = () => {
          gone = true
          unsubscribe?.()
        }
        res.on('error', leave)
        res.on('close', leave)
        const safeWrite = (chunk: string, end = false) => {
          if (gone || res.writableEnded || res.destroyed) return leave()
          try {
            res.write(chunk)
            if (end) res.end()
          } catch {
            leave()
          }
        }
        unsubscribe = live.subscribe(after, (entry) => {
          if (entry === null) safeWrite('event: end\ndata: {}\n\n', true)
          else safeWrite(`id: ${entry.id}\ndata: ${JSON.stringify(entry.event)}\n\n`)
        })
        if (gone) unsubscribe()
        return
      }
      if (req.method === 'GET' && url.pathname === '/api/runs') {
        return sendJson(res, 200, { paused: runMgr.paused, pausedAt: runMgr.pausedAt, runs: runMgr.list() } satisfies RunsResponse)
      }
      if (req.method === 'POST' && url.pathname === '/api/stop') {
        // Stop everything and pause. Resolves when each run is stopped, or honestly "not confirmed".
        runMgr.stop().then(
          () => sendJson(res, 200, { paused: runMgr.paused, pausedAt: runMgr.pausedAt, runs: runMgr.list() } satisfies RunsResponse),
          () => sendJson(res, 500, { error: 'stop failed' }),
        )
        return
      }
      if (req.method === 'POST' && url.pathname === '/api/resume') {
        runMgr.resume()
        return sendJson(res, 200, { paused: runMgr.paused, pausedAt: runMgr.pausedAt, runs: runMgr.list() } satisfies RunsResponse)
      }
      const runStop = RUN_STOP_PATH.exec(url.pathname)
      if (req.method === 'POST' && runStop) {
        if (!runMgr.get(runStop[1]!)) return sendJson(res, 404, { error: 'not found' })
        runMgr.stop(runStop[1]!).then(
          (done) => sendJson(res, 200, { run: done[0] }),
          () => sendJson(res, 500, { error: 'stop failed' }),
        )
        return
      }
      if (req.method === 'POST' && url.pathname === '/api/test/runs' && testToolsOn) {
        readJson(req).then(
          (body) => {
            const kind = (body as { kind?: unknown } | null)?.kind
            if (typeof kind !== 'string' || !(kind in FAKE_RUNS)) return sendJson(res, 400, { error: 'bad kind' })
            const pidDir = join(home, 'pids')
            mkdirSync(pidDir, { recursive: true })
            const pidFile = join(pidDir, `${kind}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.pid`)
            try {
              const run = runMgr.start({ kind: `test.${kind}`, source: 'test', command: process.execPath, args: FAKE_RUNS[kind]!(pidFile) })
              sendJson(res, 201, { run, pidFile, pid: runMgr.pid(run.id) })
            } catch (err) {
              if (err instanceof PausedError) return sendJson(res, 409, { error: 'paused' })
              sendJson(res, 500, { error: 'could not start' })
            }
          },
          () => sendJson(res, 400, { error: 'bad request' }),
        )
        return
      }
      if (req.method === 'GET' && url.pathname === '/api/gateway/info') return sendJson(res, 200, gateway.info())
      if (req.method === 'GET' && url.pathname === '/api/gateway/test-effects' && testToolsOn) {
        return sendJson(res, 200, { effects: testEffects })
      }
      if (req.method === 'GET' && url.pathname === '/api/approvals') {
        const status = url.searchParams.get('status') ?? undefined
        if (status && !APPROVAL_STATUSES.includes(status as ApprovalStatus)) return sendJson(res, 400, { error: 'bad status' })
        return sendJson(res, 200, { approvals: gateway.list(status as ApprovalStatus | undefined) })
      }
      const approvalPath = APPROVAL_PATH.exec(url.pathname)
      if (approvalPath) {
        const [, id, verb] = approvalPath as unknown as [string, string, 'approve' | 'deny' | undefined]
        if (req.method === 'GET' && !verb) {
          const found = gateway.get(id)
          return found ? sendJson(res, 200, found) : sendJson(res, 404, { error: 'not found' })
        }
        if (req.method === 'POST' && verb) {
          const out = verb === 'approve' ? gateway.approve(id, `session:${session.id}`, 'inbox') : gateway.deny(id, `session:${session.id}`, 'inbox')
          if (out.ok) return sendJson(res, 200, out.approval)
          return sendJson(res, out.reason === 'not_found' ? 404 : 409, { error: out.reason })
        }
      }
      if (req.method === 'POST' && url.pathname === '/api/actions') {
        readJson(req, 65_536).then(
          async (body) => {
            const b = body as Partial<ActionRequest> | null
            const isStr = (v: unknown) => v === undefined || typeof v === 'string'
            if (
              !b || typeof b.tool !== 'string' || !isStr(b.project) || !isStr(b.cwd) || !isStr(b.runId) || !isStr(b.approvalId) ||
              (b.args !== undefined && (typeof b.args !== 'object' || b.args === null || Array.isArray(b.args)))
            ) {
              return sendJson(res, 400, { error: 'bad request' })
            }
            try {
              const out = await gateway.request('ui', { ...b, tool: b.tool, args: b.args ?? {} })
              const code = { executed: 200, approval_required: 202, denied: 403, rejected: 409 }[out.status]
              sendJson(res, code, out)
            } catch (err) {
              if (err instanceof TypeError) return sendJson(res, 400, { error: 'bad request' })
              sendJson(res, 500, { error: 'gateway error' })
            }
          },
          () => sendJson(res, 400, { error: 'bad request' }),
        )
        return
      }
      if (req.method === 'POST' && url.pathname === '/api/pairing/code') {
        // An already paired browser can mint a code to pair another one.
        const { code, expiresAt } = pairing.issue()
        return sendJson(res, 200, { code, expiresAt: new Date(expiresAt).toISOString() })
      }
      if (req.method === 'POST' && url.pathname === '/api/session/logout') {
        db.revokeSession(session.id)
        db.append('auth.revoked', { sessionId: session.id })
        // A revoked session must stop receiving events at once, not when its stream happens to drop.
        for (const stream of streams) if (streamOwner.get(stream) === session.id) stream.end()
        // With no paired browser left, announce a fresh code so the owner is never locked out.
        if (db.activeSessionCount() === 0) pairing.issue()
        res.setHeader('set-cookie', clearedSessionCookie())
        return sendJson(res, 200, { paired: false } satisfies SessionResponse)
      }
      sendJson(res, 404, { error: 'not found' })
    })

    const srv = server
    await new Promise<void>((resolve, reject) => {
      srv.once('error', reject)
      srv.listen(options.port ?? DEFAULT_PORT, host, resolve)
    })
    const port = (srv.address() as AddressInfo).port
    lock.setPort(port)
    policy = new RequestPolicy(port, options.uiOrigins ?? DEFAULT_UI_ORIGINS)
    pairing.issue()
    db.append('daemon.started', { version: VERSION, pid: process.pid, port })
    await refreshProviders()

    let closing: Promise<void> | undefined
    return {
      port,
      store: db,
      close() {
        closing ??= (async () => {
          clearInterval(sweeper)
          await runMgr.closeAll()
          for (const res of streams) res.end()
          await new Promise<void>((resolve) => {
            srv.close(() => resolve())
            srv.closeAllConnections()
          })
          db.close()
          lock.release()
        })()
        return closing
      },
    }
  } catch (err) {
    server?.close()
    store?.close()
    lock.release()
    throw err
  }
}
