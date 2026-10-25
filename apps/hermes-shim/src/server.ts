import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { HermesDirectiveRequest, HermesMemoryItem, KanbanAgentAction } from '@junos/shared'
import { HermesApiBackend, type HermesBackend } from './backend.ts'
import { type ShimConfig, hookAllowed } from './config.ts'
import { ConversationTail } from './convlog.ts'
import { ShimEngine } from './engine.ts'
import { PROTOCOL_VERSION, type ShimInfo, ShimError } from './protocol.ts'
import { MemoryStore, SkillStore } from './stores.ts'

export interface ShimServer {
  port: number
  engine: ShimEngine
  close(): Promise<void>
}

export interface ShimDeps {
  backend?: HermesBackend
  now?: () => number
  heartbeatMs?: number
  ringSize?: number
  approvalTimeoutMs?: number
  /** Tests ask for the log to be read from the first byte and polled quickly. */
  logFromStart?: boolean
  logPollMs?: number
}

const digest = (s: string) => createHash('sha256').update(s).digest()

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readJson(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > maxBytes) {
        req.destroy()
        reject(new ShimError(413, 'too_large', 'That request is too large.'))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (size === 0) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new ShimError(400, 'bad_request', 'The body is not JSON.'))
      }
    })
    req.on('error', reject)
  })
}

const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Starts the shim's HTTP server. Nothing here reaches the public internet: the caller has already checked the address. */
export async function startShim(config: ShimConfig, deps: ShimDeps = {}): Promise<ShimServer> {
  const backend = deps.backend ?? new HermesApiBackend(config.hermesUrl, config.hermesKey)
  const engine = new ShimEngine({
    backend,
    memory: new MemoryStore(config.memoryDir, config.stateDir),
    skills: new SkillStore(config.skillsDir, config.stateDir),
    now: deps.now,
    approvalTimeoutMs: deps.approvalTimeoutMs,
    ringSize: deps.ringSize,
  })
  const tail = config.logFile ? new ConversationTail(config.logFile, (m) => engine.mirror(m), { pollMs: deps.logPollMs, fromStart: deps.logFromStart }) : null
  tail?.start()
  const keyDigest = digest(config.key)
  const heartbeatMs = deps.heartbeatMs ?? 5000
  const streams = new Set<ServerResponse>()
  // Wrong keys are slowed down: ten in a minute and everything is refused until the minute is up.
  let failures: number[] = []
  const throttled = () => {
    const now = Date.now()
    failures = failures.filter((t) => now - t < 60_000)
    return failures.length >= 10
  }

  const authorised = (req: IncomingMessage): boolean => {
    const header = req.headers.authorization ?? ''
    const given = /^Bearer (.+)$/.exec(header)?.[1] ?? ''
    return timingSafeEqual(digest(given), keyDigest)
  }

  const openEvents = (req: IncomingMessage, res: ServerResponse, url: URL) => {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' })
    res.write('event: ready\ndata: {}\n\n')
    const last = Number(req.headers['last-event-id'] ?? url.searchParams.get('lastEventId') ?? 0) || 0
    const write = (seq: number, update: unknown) => res.write(`id: ${seq}\ndata: ${JSON.stringify(update)}\n\n`)
    const replay = engine.after(last)
    // A cursor ahead of the shim (it restarted) or behind what the ring still holds: tell junosd to read `recent`.
    if (replay.gap || last > engine.lastSeq) res.write(`event: resync\ndata: ${JSON.stringify({ lastSeq: engine.lastSeq })}\n\n`)
    else for (const e of replay.events) write(e.seq, e.update)
    const off = engine.subscribe((e) => write(e.seq, e.update))
    const beat = setInterval(() => res.write('event: heartbeat\ndata: {}\n\n'), heartbeatMs)
    streams.add(res)
    const end = () => {
      clearInterval(beat)
      off()
      streams.delete(res)
    }
    res.on('close', end)
    res.on('error', end)
  }

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://shim')
    const method = req.method ?? 'GET'
    if (method === 'GET' && url.pathname === '/shim/health') {
      return send(res, 200, { ok: true, name: 'junos-hermes-shim', protocol: PROTOCOL_VERSION } satisfies ShimInfo)
    }
    // A browser page cannot be the caller: junosd sends no Origin, and refusing one closes the DNS-rebinding route.
    if (req.headers.origin) throw new ShimError(403, 'forbidden', 'Browsers may not call the shim.')
    if (throttled()) throw new ShimError(429, 'too_many_failures', 'Too many wrong keys. Try again in a minute.')
    if (!authorised(req)) {
      failures.push(Date.now())
      throw new ShimError(401, 'unauthorised', 'The key is missing or wrong.')
    }
    const p = url.pathname
    if (p.startsWith('/v1/hooks/') && !hookAllowed(req.socket.remoteAddress, config.hookCidrs)) {
      throw new ShimError(403, 'forbidden', 'Hooks may only be called from the machine Hermes runs on.')
    }
    if (method === 'GET' && p === '/v1/status') return send(res, 200, await engine.status())
    if (method === 'GET' && p === '/v1/recent') return send(res, 200, { ...engine.recent(), lastSeq: engine.lastSeq })
    if (method === 'GET' && p === '/v1/events') return openEvents(req, res, url)
    if (method === 'GET' && p === '/v1/queue') return send(res, 200, { queue: engine.queue() })
    if (method === 'GET' && p === '/v1/memory') return send(res, 200, { items: engine.memory() })
    if (method === 'PUT' && p === '/v1/memory') {
      const items = obj(await readJson(req, 262_144)).items
      if (!Array.isArray(items)) throw new ShimError(400, 'bad_request', 'Send { "items": [...] }.')
      return send(res, 200, { items: engine.setMemory(items as HermesMemoryItem[]) })
    }
    if (method === 'GET' && p === '/v1/skills') return send(res, 200, { skills: engine.skills() })
    if (method === 'PUT' && p === '/v1/skills') {
      const skills = obj(await readJson(req, 16_384)).skills
      if (!Array.isArray(skills)) throw new ShimError(400, 'bad_request', 'Send { "skills": [...] }.')
      return send(res, 200, { skills: engine.setSkills(skills as Array<{ id: string; enabled: boolean }>) })
    }
    if (method === 'POST' && p === '/v1/directives') return send(res, 202, engine.sendDirective(obj(await readJson(req, 16_384)) as unknown as HermesDirectiveRequest))
    if (method === 'POST' && p === '/v1/pause') return send(res, 200, (engine.pause(), { ok: true }))
    if (method === 'POST' && p === '/v1/resume') return send(res, 200, (engine.resume(), { ok: true }))
    if (method === 'POST' && p === '/v1/stop') return send(res, 200, await engine.stop())
    const decision = /^\/v1\/steps\/([0-9a-f-]{36})\/decision$/.exec(p)
    if (method === 'POST' && decision) {
      const body = obj(await readJson(req, 1024))
      engine.decide(decision[1]!, body.decision as 'approve' | 'deny')
      return send(res, 200, { ok: true })
    }
    // Hooks: how Hermes (or a small script beside it) asks for an approval, mirrors a message or adds a board card.
    if (method === 'POST' && p === '/v1/hooks/approval') {
      const body = obj(await readJson(req, 16_384))
      const { stepId, decision: answer } = engine.requestApproval(
        { class: body.class as 'destructive', target: String(body.target ?? ''), summary: String(body.summary ?? ''), type: typeof body.type === 'string' ? body.type : undefined, input: typeof body.input === 'string' ? body.input : undefined },
        typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      )
      // The caller waits here for the answer. If it hangs up first, the step is denied rather than left waiting.
      res.on('close', () => {
        if (res.writableEnded) return
        try {
          engine.decide(stepId, 'deny')
        } catch {
          /* already answered */
        }
      })
      send(res, 200, { stepId, decision: await answer })
      return
    }
    const resolve = /^\/v1\/hooks\/approval\/([0-9a-f-]{36})\/resolve$/.exec(p)
    if (method === 'POST' && resolve) {
      const body = obj(await readJson(req, 1024))
      engine.decide(resolve[1]!, body.decision as 'approve' | 'deny', body.via === 'telegram' ? 'telegram' : 'junos')
      return send(res, 200, { ok: true })
    }
    if (method === 'POST' && p === '/v1/hooks/kanban') {
      engine.kanban(obj(await readJson(req, 8192)) as unknown as KanbanAgentAction)
      return send(res, 200, { ok: true })
    }
    if (method === 'POST' && p === '/v1/hooks/message') {
      const body = obj(await readJson(req, 16_384))
      if ((body.role !== 'user' && body.role !== 'agent') || typeof body.text !== 'string') throw new ShimError(400, 'bad_request', 'Send { "role", "text" }.')
      engine.mirror({ role: body.role, text: body.text, via: 'telegram' })
      return send(res, 200, { ok: true })
    }
    throw new ShimError(404, 'not_found', 'No such route.')
  }

  const server: Server = createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      if (res.headersSent) return void res.end()
      if (err instanceof ShimError) return send(res, err.status, { error: err.code, message: err.message })
      // Nothing from the failure is sent back: it could hold a path or a key.
      send(res, 500, { error: 'internal', message: 'The shim hit an error.' })
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(config.port, config.host, resolve)
  })
  return {
    port: (server.address() as AddressInfo).port,
    engine,
    async close() {
      tail?.stop()
      await engine.close()
      for (const s of streams) s.end()
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}
