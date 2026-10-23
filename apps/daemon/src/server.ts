import { mkdirSync, readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { delimiter, join } from 'node:path'
import {
  DEFAULT_PORT,
  type HermesDirectiveRequest,
  type WorkflowRunRequest,
  type WorkflowRunsResponse,
  type WorkflowsResponse,
  RESYNC_EVENT,
  type HealthResponse,
  type JunosEvent,
  APPROVAL_STATUSES,
  type ActionRequest,
  type ApprovalStatus,
  type ConnectionsResponse,
  type CronPreviewResponse,
  type TaskInput,
  type TasksResponse,
  type InboxActionRequest,
  type InboxResponse,
  type TelegramStatus,
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
import { InboxError, InboxService } from './inbox.ts'
import { Scheduler, TaskError, previewCron } from './scheduler.ts'
import { makeTaskExecutor } from './task-executor.ts'
import { WorkflowError, WorkflowService } from './workflows.ts'
import { workflowTools } from './workflow-tools.ts'
import { HermesError, HermesService, hermesTools } from './hermes.ts'
import { KanbanError, KanbanService } from './kanban.ts'
import { FilesError, FilesService } from './files.ts'
import { ScoutError, ScoutService } from './scout.ts'
import { MockVpsShell, TerminalError, TerminalService, terminalTools, type AgentShell, type LocalShell, type ShellOpener } from './terminal.ts'
import { NoHermes, type HermesBridge } from './hermes/bridge.ts'
import { MockHermes } from './hermes/mock.ts'
import { TelegramBridge, telegramConfigFromEnv } from './telegram.ts'
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
  /** How often expired approvals are swept and due snoozes wake (default 30 s). */
  sweepMs?: number
  /** Scheduler timing (tests make it fast). */
  schedulerTickMs?: number
  schedulerGraceMs?: number
  schedulerBackoffMs?: number[]
  schedulerLeaseMs?: number
  /** The Hermes bridge to use. Default: a mock when JUNOS_HERMES=mock, otherwise "not connected". */
  hermes?: HermesBridge
  hermesPollMs?: number
  /** Board timing (tests make it fast). */
  kanbanTickMs?: number
  /** Index timing and size (tests make them small). */
  filesRescanMs?: number
  /** Scout timing; `scoutAllowLocal` lets a feed on this machine be a source (tests only). */
  scoutTickMs?: number
  scoutAllowLocal?: boolean
  scoutSlotWaitMs?: number
  scoutFetchTimeoutMs?: number
  /** Terminal settings (tests replace the shells with scripted ones). */
  terminalShell?: LocalShell
  terminalAgentShell?: AgentShell
  terminalVps?: ShellOpener
  terminalVpsIdleMs?: number
  terminalAgentTimeoutMs?: number
  filesMaxFiles?: number
  kanbanLeaseMs?: number
  /** Workflow timing and loop-guard limits (tests make them small). */
  workflowTickMs?: number
  workflowGraceMs?: number
  workflowSlotWaitMs?: number
  workflowSlotPollMs?: number
  workflowRatePerHour?: number
  workflowGlobalPerHour?: number
  workflowMaxDepth?: number
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
const TASK_PATH = new RegExp('^/api/tasks/([0-9a-f-]{36})(?:/(runs|run|pause|resume))?$')
const WORKFLOW_PATH = new RegExp('^/api/workflows/([a-z][a-z0-9-]{0,39})(?:/(run|pause|resume))?$')
const WORKFLOW_RUN_PATH = new RegExp('^/api/workflow-runs/([0-9a-f-]{36})(?:/(cancel))?$')
const INBOX_PATH = new RegExp('^/api/inbox/([0-9a-f-]{36})(?:/(action))?$')
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
    let inboxRef: InboxService | undefined
    let hermesRef: HermesService | undefined
    let terminalRef: TerminalService | undefined
    const fileRoots = [join(home, 'files'), ...(env.JUNOS_FILE_ROOTS ?? '').split(delimiter).filter(Boolean)]
    mkdirSync(fileRoots[0]!, { recursive: true })
    const gateway = new Gateway({
      store: db,
      tools: [
        ...(testToolsOn ? testTools(testEffects) : []),
        // The inbox does not exist yet (it needs the gateway); the tools only reach it when they run.
        ...workflowTools({ inbox: { list: (f) => inboxRef!.list(f) }, fileRoots, now: options.now }),
        ...hermesTools(() => hermesRef),
        ...terminalTools(() => terminalRef),
      ],
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
    const inbox = new InboxService({ store: db, gateway, runs: runMgr, now: options.now })
    inboxRef = inbox
    const telegramCfg = telegramConfigFromEnv(env)
    const telegram = telegramCfg.config
      ? new TelegramBridge({ config: telegramCfg.config, store: db, gateway, inbox, now: options.now })
      : null
    const adapters = [new ClaudeAdapter(env), new CodexAdapter(env)]
    let schedulerRef: Scheduler | undefined
    const terminal = new TerminalService({
      store: db,
      gateway,
      env,
      now: options.now,
      shell: options.terminalShell,
      agentShell: options.terminalAgentShell,
      vps: options.terminalVps ?? (env.JUNOS_TERMINAL_VPS === 'mock' ? new MockVpsShell() : undefined),
      vpsIdleMs: options.terminalVpsIdleMs,
      agentTimeoutMs: options.terminalAgentTimeoutMs,
    })
    terminalRef = terminal
    const terminalFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof TerminalError) return sendJson(res, err.status, { error: err.code, message: err.message })
      sendJson(res, 500, { error: 'terminal error' })
    }
    const files = new FilesService({ store: db, dataHome: home, now: options.now, rescanMs: options.filesRescanMs, maxFiles: options.filesMaxFiles })
    const filesFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof FilesError) return sendJson(res, err.status, { error: err.code, message: err.message })
      sendJson(res, 500, { error: 'files error' })
    }
    const chat = new ChatService({
      store: db,
      runs: runMgr,
      adapters,
      cwd: chatCwd,
      now: options.now,
      providerClaimed: (p) => schedulerRef?.providerClaimed(p) ?? false,
      context: { hasProject: (id) => files.hasProject(id), manifest: (id) => files.manifest(id), readFile: (ref) => files.readForChat(ref) },
    })
    const executor = makeTaskExecutor({ adapters, runs: runMgr, chat, cwd: chatCwd })
    const scheduler = new Scheduler({
      store: db,
      runs: runMgr,
      inbox,
      execute: executor,
      now: options.now,
      tickMs: options.schedulerTickMs,
      graceMs: options.schedulerGraceMs,
      backoffMs: options.schedulerBackoffMs,
      leaseMs: options.schedulerLeaseMs,
    })
    schedulerRef = scheduler
    const workflows = new WorkflowService({
      store: db,
      gateway,
      inbox,
      runs: runMgr,
      execute: executor,
      slot: { tryClaim: (p) => scheduler.tryClaimProvider(p), release: (p) => scheduler.releaseProvider(p) },
      dir: join(home, 'workflows'),
      checkChoice: (p, m, e) => chat.checkChoice(p, m, e),
      now: options.now,
      tickMs: options.workflowTickMs,
      graceMs: options.workflowGraceMs,
      slotWaitMs: options.workflowSlotWaitMs,
      slotPollMs: options.workflowSlotPollMs,
      ratePerHour: options.workflowRatePerHour,
      globalPerHour: options.workflowGlobalPerHour,
      maxDepth: options.workflowMaxDepth,
    })
    const bridge =
      options.hermes ??
      (env.JUNOS_HERMES === 'mock'
        ? new MockHermes({ now: options.now })
        : new NoHermes('Hermes is not connected yet. Start junosd with JUNOS_HERMES=mock to try the console with a stand-in agent.'))
    const hermes = new HermesService({ store: db, gateway, inbox, runs: runMgr, bridge, now: options.now, pollMs: options.hermesPollMs })
    hermesRef = hermes
    const kanban = new KanbanService({ store: db, inbox, now: options.now, tickMs: options.kanbanTickMs, leaseMs: options.kanbanLeaseMs })
    kanban.attach(hermes)
    hermes.attachKanban(kanban)
    const scout = new ScoutService({
      store: db,
      inbox,
      kanban,
      runs: runMgr,
      execute: executor,
      slot: { tryClaim: (p) => scheduler.tryClaimProvider(p), release: (p) => scheduler.releaseProvider(p) },
      now: options.now,
      tickMs: options.scoutTickMs,
      allowLocal: options.scoutAllowLocal,
      slotWaitMs: options.scoutSlotWaitMs,
      slotPollMs: 25,
      fetchTimeoutMs: options.scoutFetchTimeoutMs,
    })
    const scoutFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof ScoutError) return sendJson(res, err.status, { error: err.code, message: err.message })
      sendJson(res, 500, { error: 'scout error' })
    }
    const kanbanFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof KanbanError) return sendJson(res, err.status, { error: err.code, message: err.message })
      sendJson(res, 500, { error: 'kanban error' })
    }
    const hermesFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof HermesError) return sendJson(res, err.status, { error: err.code, message: err.message })
      sendJson(res, 500, { error: 'hermes error' })
    }
    const workflowFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof WorkflowError) return sendJson(res, err.status, { error: err.code, message: err.message, errors: err.errors })
      sendJson(res, 500, { error: 'workflow error' })
    }
    const taskFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof TaskError) return sendJson(res, err.status, { error: err.code, message: err.message })
      sendJson(res, 500, { error: 'task error' })
    }
    const connections = new ConnectionsService({ store: db, adapters, env, now: options.now })
    const chatFail = (res: ServerResponse, err: unknown) => {
      if (err instanceof ChatError) return sendJson(res, err.status, { error: err.code, message: err.message })
      if (err instanceof PausedError) return sendJson(res, 409, { error: 'paused', message: err.message })
      sendJson(res, 500, { error: 'chat error' })
    }
    const sweeper = setInterval(() => {
      gateway.sweepExpired()
      inboxRef?.wakeDue()
    }, options.sweepMs ?? 30_000)
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
      if (req.method === 'GET' && url.pathname === '/api/tasks') {
        return sendJson(res, 200, { tasks: scheduler.list(), paused: runMgr.paused } satisfies TasksResponse)
      }
      if (req.method === 'GET' && url.pathname === '/api/tasks/preview') {
        const preview = previewCron(url.searchParams.get('cron') ?? '', url.searchParams.get('tz') || 'Europe/Copenhagen', new Date(options.now?.() ?? Date.now()))
        return sendJson(res, 200, preview satisfies CronPreviewResponse)
      }
      if (req.method === 'POST' && url.pathname === '/api/tasks') {
        readJson(req, 65_536).then(
          (body) => {
            try {
              const input = scheduler.validate((body ?? {}) as Partial<TaskInput>, (p, m, e) => chat.checkChoice(p, m, e))
              sendJson(res, 201, scheduler.create(input))
            } catch (err) {
              taskFail(res, err)
            }
          },
          () => sendJson(res, 400, { error: 'bad request' }),
        )
        return
      }
      const taskPath = TASK_PATH.exec(url.pathname)
      if (taskPath) {
        const [, taskId, sub] = taskPath as unknown as [string, string, string | undefined]
        try {
          if (req.method === 'GET' && !sub) {
            const found = scheduler.get(taskId)
            return found ? sendJson(res, 200, found) : sendJson(res, 404, { error: 'not found' })
          }
          if (req.method === 'GET' && sub === 'runs') return sendJson(res, 200, { runs: scheduler.runs(taskId) })
          if (req.method === 'DELETE' && !sub) {
            scheduler.delete(taskId)
            return sendJson(res, 200, { deleted: true })
          }
          if (req.method === 'POST' && sub === 'run') return sendJson(res, 202, scheduler.runNow(taskId))
          if (req.method === 'POST' && (sub === 'pause' || sub === 'resume')) return sendJson(res, 200, scheduler.setEnabled(taskId, sub === 'resume'))
          if (req.method === 'PUT' && !sub) {
            readJson(req, 65_536).then(
              (body) => {
                try {
                  const input = scheduler.validate((body ?? {}) as Partial<TaskInput>, (p, m, e) => chat.checkChoice(p, m, e))
                  sendJson(res, 200, scheduler.update(taskId, input))
                } catch (err) {
                  taskFail(res, err)
                }
              },
              () => sendJson(res, 400, { error: 'bad request' }),
            )
            return
          }
        } catch (err) {
          return taskFail(res, err)
        }
      }
      if (req.method === 'GET' && url.pathname === '/api/workflows') {
        return sendJson(res, 200, { workflows: workflows.list(), paused: runMgr.paused } satisfies WorkflowsResponse)
      }
      if (req.method === 'POST' && (url.pathname === '/api/workflows' || url.pathname === '/api/workflows/validate')) {
        const validateOnly = url.pathname.endsWith('/validate')
        readJson(req, 70_000).then(
          (body) => {
            try {
              const yaml = (body as { yaml?: unknown } | null)?.yaml
              if (typeof yaml !== 'string') throw new WorkflowError(400, 'bad_request', 'Send the workflow as { "yaml": "…" }.')
              sendJson(res, validateOnly ? 200 : 201, validateOnly ? workflows.validate(yaml) : workflows.save(null, yaml))
            } catch (err) {
              workflowFail(res, err)
            }
          },
          () => sendJson(res, 400, { error: 'bad request' }),
        )
        return
      }
      if (req.method === 'GET' && url.pathname === '/api/workflow-runs') {
        return sendJson(res, 200, { runs: workflows.runs(url.searchParams.get('workflow') ?? undefined) } satisfies WorkflowRunsResponse)
      }
      const workflowRunPath = WORKFLOW_RUN_PATH.exec(url.pathname)
      if (workflowRunPath) {
        const [, runId, act] = workflowRunPath as unknown as [string, string, string | undefined]
        if (req.method === 'GET' && !act) {
          const found = workflows.getRun(runId)
          return found ? sendJson(res, 200, found) : sendJson(res, 404, { error: 'not found' })
        }
        if (req.method === 'POST' && act === 'cancel') {
          workflows.cancel(runId).then(
            (run) => sendJson(res, 200, run),
            (err) => workflowFail(res, err),
          )
          return
        }
      }
      const workflowPath = WORKFLOW_PATH.exec(url.pathname)
      if (workflowPath) {
        const [, workflowId, sub] = workflowPath as unknown as [string, string, string | undefined]
        try {
          if (req.method === 'GET' && !sub) {
            const found = workflows.get(workflowId)
            return found ? sendJson(res, 200, found) : sendJson(res, 404, { error: 'not found' })
          }
          if (req.method === 'DELETE' && !sub) {
            workflows.remove(workflowId)
            return sendJson(res, 200, { deleted: true })
          }
          if (req.method === 'POST' && (sub === 'pause' || sub === 'resume')) return sendJson(res, 200, workflows.setPaused(workflowId, sub === 'pause', sub === 'pause' ? 'Paused by you.' : null))
          if (req.method === 'PUT' && !sub) {
            readJson(req, 70_000).then(
              (body) => {
                try {
                  const yaml = (body as { yaml?: unknown } | null)?.yaml
                  if (typeof yaml !== 'string') throw new WorkflowError(400, 'bad_request', 'Send the workflow as { "yaml": "…" }.')
                  sendJson(res, 200, workflows.save(workflowId, yaml))
                } catch (err) {
                  workflowFail(res, err)
                }
              },
              () => sendJson(res, 400, { error: 'bad request' }),
            )
            return
          }
          if (req.method === 'POST' && sub === 'run') {
            readJson(req, 16_384).then(
              (body) => {
                try {
                  sendJson(res, 202, workflows.start(workflowId, (body ?? {}) as WorkflowRunRequest, 'manual'))
                } catch (err) {
                  workflowFail(res, err)
                }
              },
              () => sendJson(res, 400, { error: 'bad request' }),
            )
            return
          }
        } catch (err) {
          return workflowFail(res, err)
        }
      }
      if (url.pathname.startsWith('/api/terminal')) {
        const sub = url.pathname.slice('/api/terminal'.length)
        const session = /^\/sessions\/([0-9a-f-]{36}|agent)(?:\/(input|resize|stream))?$/.exec(sub)
        const run = (work: () => unknown, status = 200) => {
          try {
            sendJson(res, status, work())
          } catch (err) {
            terminalFail(res, err)
          }
        }
        const withBody = (limit: number, work: (body: any) => unknown | Promise<unknown>, status = 200) =>
          void readJson(req, limit).then(
            (body) => Promise.resolve().then(() => work(body ?? {})).then((out) => sendJson(res, status, out), (err) => terminalFail(res, err)),
            () => sendJson(res, 400, { error: 'bad request' }),
          )
        if (req.method === 'GET' && sub === '') return void terminal.overview().then((o) => sendJson(res, 200, o), (err) => terminalFail(res, err))
        if (req.method === 'POST' && sub === '/sessions') return withBody(1024, (b) => terminal.open(b.kind, b.cols, b.rows), 201)
        if (req.method === 'POST' && sub === '/agent/exec') return withBody(8192, (b) => terminal.requestAgent(b.actor, b.command, b.runId, b.approvalId))
        if (session) {
          const [, id, act] = session as unknown as [string, string, string | undefined]
          if (req.method === 'DELETE' && !act) return run(() => {
            if (id === 'agent') throw new TerminalError(403, 'read_only', 'The agent tab stays.')
            terminal.close(id, 'closed')
            return { closed: true }
          })
          if (req.method === 'POST' && act === 'input') return withBody(8192, (b) => (terminal.input(id, b.data), { ok: true }))
          if (req.method === 'POST' && act === 'resize') return withBody(1024, (b) => (terminal.resize(id, b.cols, b.rows), { ok: true }))
          if (req.method === 'GET' && act === 'stream') {
            // Output as server-sent events. A write after the browser left would raise an unhandled stream error, so every write is guarded.
            let gone = false
            let unsubscribe: (() => void) | undefined
            const leave = () => {
              gone = true
              unsubscribe?.()
              clearInterval(beat)
            }
            const safeWrite = (chunk: string, end = false) => {
              if (gone || res.writableEnded || res.destroyed) return leave()
              try {
                res.write(chunk)
                if (end) res.end()
              } catch {
                leave()
              }
            }
            const beat = setInterval(() => safeWrite(': heartbeat\n\n'), 15_000)
            res.on('error', leave)
            res.on('close', leave)
            try {
              const sub = terminal.subscribe(id, (frame) => safeWrite(`data: ${JSON.stringify(frame)}\n\n`, frame.type === 'closed'))
              res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' })
              unsubscribe = sub.unsubscribe
              // Headers go out now, not with the first output: a quiet tab must still connect.
              safeWrite(': connected\n\n')
              if (sub.replay) safeWrite(`data: ${JSON.stringify({ type: 'data', data: sub.replay })}\n\n`)
              if (gone) unsubscribe()
            } catch (err) {
              clearInterval(beat)
              terminalFail(res, err)
            }
            return
          }
        }
      }
      if (url.pathname.startsWith('/api/files') || url.pathname.startsWith('/api/projects')) {
        const sub = url.pathname.startsWith('/api/files') ? url.pathname.slice('/api/files'.length) : `/projects${url.pathname.slice('/api/projects'.length)}`
        const q = url.searchParams
        const guard = (work: () => unknown, status = 200) => {
          try {
            sendJson(res, status, work())
          } catch (err) {
            filesFail(res, err)
          }
        }
        const guardAsync = (work: () => Promise<unknown>, status = 200) => void work().then((body) => sendJson(res, status, body), (err) => filesFail(res, err))
        const folder = /^\/folders\/([0-9a-f-]{36})(?:\/(rescan))?$/.exec(sub)
        if (req.method === 'GET' && sub === '/folders') return guard(() => ({ folders: files.folders() }))
        if (req.method === 'POST' && sub === '/folders') {
          return void readJson(req).then(
            (body) => guard(() => files.addFolder((body as { path?: unknown })?.path, (body as { label?: unknown })?.label), 201),
            () => sendJson(res, 400, { error: 'bad request' }),
          )
        }
        if (folder) {
          const [, folderId, act] = folder as unknown as [string, string, string | undefined]
          if (req.method === 'DELETE' && !act) return guardAsync(() => files.removeFolder(folderId))
          if (req.method === 'POST' && act === 'rescan') {
            return guard(() => {
              if (!files.folders().some((x) => x.id === folderId)) throw new FilesError(404, 'not_found', 'No such folder.')
              void files.rescan(folderId).catch(() => {})
              return { started: true }
            }, 202)
          }
        }
        if (req.method === 'GET' && sub === '/list') return guard(() => files.list(q.get('folder') ?? '', q.get('dir') ?? ''))
        if (req.method === 'GET' && sub === '/search') return guard(() => files.search({ q: q.get('q') ?? '', type: q.get('type') ?? undefined, project: q.get('project') ?? undefined, folder: q.get('folder') ?? undefined }))
        if (req.method === 'GET' && sub === '/preview') return guard(() => files.preview(q.get('folder') ?? '', q.get('path')))
        if (req.method === 'GET' && sub === '/raw') {
          try {
            const file = files.raw(q.get('folder') ?? '', q.get('path'))
            res.writeHead(200, {
              'content-type': file.type,
              'content-length': file.data.length,
              'content-disposition': `attachment; filename="${file.name.replace(/[^\w. -]/g, '_')}"`,
              'x-content-type-options': 'nosniff',
              'content-security-policy': "sandbox; default-src 'none'",
              'cache-control': 'no-store',
            })
            return void res.end(file.data)
          } catch (err) {
            return filesFail(res, err)
          }
        }
        if (req.method === 'GET' && sub === '/projects') return guardAsync(async () => ({ projects: await files.projects() }))
      }
      if (url.pathname.startsWith('/api/scout')) {
        const sub = url.pathname.slice('/api/scout'.length)
        const send = (work: () => unknown | Promise<unknown>, status = 200) =>
          void Promise.resolve()
            .then(work)
            .then((body) => sendJson(res, status, body), (err) => (err instanceof ChatError ? chatFail(res, err) : scoutFail(res, err)))
        const withBody = (work: (body: any) => unknown | Promise<unknown>, status = 200) =>
          void readJson(req, 16_384).then(
            (body) => send(() => work(body ?? {}), status),
            () => sendJson(res, 400, { error: 'bad request' }),
          )
        const source = /^\/sources\/([0-9a-f-]{36})$/.exec(sub)
        const finding = /^\/findings\/([0-9a-f-]{36})\/(dismiss|card|ask)$/.exec(sub)
        if (req.method === 'GET' && sub === '') return send(() => scout.overview())
        if (req.method === 'GET' && sub === '/findings') return send(() => ({ findings: scout.findings(url.searchParams.get('dismissed') === '1') }))
        if (req.method === 'POST' && sub === '/run') {
          return send(() => {
            void scout.run('manual').catch(() => {})
            return { started: true }
          }, 202)
        }
        if (req.method === 'POST' && sub === '/digest') return send(() => scout.digest())
        if (req.method === 'PUT' && sub === '/settings') return withBody((b) => scout.setSettings(b))
        if (req.method === 'POST' && sub === '/sources') return withBody((b) => scout.addSource(b), 201)
        if (source) {
          const [, sourceId] = source as unknown as [string, string]
          if (req.method === 'PATCH') return withBody((b) => scout.updateSource(sourceId, b))
          if (req.method === 'DELETE') return send(() => (scout.removeSource(sourceId), { deleted: true }))
        }
        if (finding && req.method === 'POST') {
          const [, findingId, act] = finding as unknown as [string, string, string]
          if (act === 'dismiss') return withBody((b) => scout.dismiss(findingId, b.reason))
          if (act === 'card') return send(() => scout.makeCard(findingId), 201)
          if (act === 'ask') {
            return withBody(async (b) => {
              const f = scout.getFinding(findingId)
              // Nothing is sent to a provider the owner has not accepted: say so before a chat is even created.
              if (!chat.acknowledged().includes('claude')) return { conversationId: null, status: 'disclosure_required' }
              const conversation = chat.createConversation({ provider: 'claude', title: f.title.slice(0, 60) })
              const sent = await chat.send(conversation.id, { content: scout.chatMessage(findingId, b.question) })
              return { conversationId: conversation.id, status: sent.status }
            })
          }
        }
      }
      if (url.pathname.startsWith('/api/kanban')) {
        const sub = url.pathname.slice('/api/kanban'.length)
        const card = /^\/cards\/([0-9a-f-]{36})(?:\/(comments))?$/.exec(sub)
        const run = (work: () => unknown, status = 200) => {
          try {
            sendJson(res, status, work())
          } catch (err) {
            kanbanFail(res, err)
          }
        }
        const withBody = (work: (body: any) => unknown, status = 200) =>
          void readJson(req, 65_536).then(
            (body) => run(() => work(body ?? {}), status),
            () => sendJson(res, 400, { error: 'bad request' }),
          )
        if (req.method === 'GET' && sub === '') return run(() => kanban.board())
        if (req.method === 'POST' && sub === '/cards') return withBody((b) => kanban.create(b), 201)
        if (req.method === 'POST' && sub === '/cards/bulk') return withBody((b) => ({ cards: kanban.bulk(b.titles) }), 201)
        if (card) {
          const [, cardId, comments] = card as unknown as [string, string, string | undefined]
          if (req.method === 'GET' && !comments) return run(() => {
            const found = kanban.get(cardId)
            if (!found) throw new KanbanError(404, 'not_found', 'No such card.')
            return found
          })
          if (req.method === 'PATCH' && !comments) return withBody((b) => kanban.update(cardId, b))
          if (req.method === 'DELETE' && !comments) return run(() => (kanban.remove(cardId), { deleted: true }))
          if (req.method === 'POST' && comments) return withBody((b) => kanban.comment(cardId, b.text), 201)
        }
      }
      if (url.pathname.startsWith('/api/hermes')) {
        const sub = url.pathname.slice('/api/hermes'.length)
        const ok = (p: Promise<unknown>, status = 200) => void p.then((body) => sendJson(res, status, body), (err) => hermesFail(res, err))
        const withBody = (limit: number, run: (body: unknown) => Promise<unknown>, status = 200) =>
          void readJson(req, limit).then(
            (body) => ok(run(body), status),
            () => sendJson(res, 400, { error: 'bad request' }),
          )
        if (req.method === 'GET' && sub === '') return ok(hermes.overview())
        if (req.method === 'GET' && sub === '/memory') return ok(hermes.memory().then((items) => ({ items })))
        if (req.method === 'PUT' && sub === '/memory') return withBody(262_144, (b) => hermes.setMemory((b as { items?: unknown })?.items).then((items) => ({ items })))
        if (req.method === 'GET' && sub === '/skills') return ok(hermes.skills().then((skills) => ({ skills })))
        if (req.method === 'PUT' && sub === '/skills') return withBody(16_384, (b) => hermes.setSkills((b as { skills?: unknown })?.skills).then((skills) => ({ skills })))
        if (req.method === 'POST' && sub === '/directives') return withBody(16_384, (b) => hermes.directive((b ?? {}) as HermesDirectiveRequest), 202)
        if (req.method === 'POST' && sub === '/pause') return ok(hermes.pause().then(() => hermes.overview()))
        if (req.method === 'POST' && sub === '/resume') return ok(hermes.resume().then(() => hermes.overview()))
        if (req.method === 'POST' && sub === '/stop') return ok(hermes.stop())
      }
      if (req.method === 'GET' && url.pathname === '/api/telegram/status') {
        return sendJson(
          res,
          200,
          telegram
            ? telegram.status()
            : ({ enabled: false, reason: telegramCfg.reason, quietHours: telegramCfg.quiet, lastPollAt: null, sent: 0, rejected: 0 } satisfies TelegramStatus),
        )
      }
      if (req.method === 'GET' && url.pathname === '/api/inbox') {
        return sendJson(res, 200, inbox.list({ status: url.searchParams.get('status') ?? undefined, kind: url.searchParams.get('kind') ?? undefined }) satisfies InboxResponse)
      }
      const inboxPath = INBOX_PATH.exec(url.pathname)
      if (inboxPath) {
        const [, itemId, act] = inboxPath as unknown as [string, string, string | undefined]
        if (req.method === 'GET' && !act) {
          const found = inbox.get(itemId)
          return found ? sendJson(res, 200, found) : sendJson(res, 404, { error: 'not found' })
        }
        if (req.method === 'POST' && act) {
          readJson(req).then(
            (body) => {
              try {
                sendJson(res, 200, inbox.act(itemId, (body ?? {}) as InboxActionRequest))
              } catch (err) {
                if (err instanceof InboxError) return sendJson(res, err.status, { error: err.code, message: err.message })
                sendJson(res, 500, { error: 'inbox error' })
              }
            },
            () => sendJson(res, 400, { error: 'bad request' }),
          )
          return
        }
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
    telegram?.start()
    scheduler.start()
    workflows.begin()
    await hermes.start()
    kanban.start()
    scout.start()
    files.start()
    terminal.start()

    let closing: Promise<void> | undefined
    return {
      port,
      store: db,
      close() {
        closing ??= (async () => {
          clearInterval(sweeper)
          await telegram?.stop()
          await scheduler.stop()
          await workflows.end()
          kanban.stopService()
          await scout.stopService()
          await files.stopService()
          terminal.stopService()
          await hermes.stopService()
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
