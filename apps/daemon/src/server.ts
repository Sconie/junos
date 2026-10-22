import { mkdirSync, readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import {
  DEFAULT_PORT,
  RESYNC_EVENT,
  type HealthResponse,
  type JunosEvent,
  type ProviderProbe,
  type ProvidersResponse,
} from '@junos/shared'
import { acquireLock } from './lock.ts'
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
}

export interface Daemon {
  readonly port: number
  readonly store: EventStore
  close(): Promise<void>
}

const VERSION = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function sseFrame(event: JunosEvent): string {
  return `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`
}

export async function startDaemon(options: DaemonOptions): Promise<Daemon> {
  const { home, host = '127.0.0.1', env = process.env, heartbeatMs = 5_000 } = options
  mkdirSync(home, { recursive: true })
  const lock = acquireLock(home)
  let store: EventStore | undefined
  let server: Server | undefined
  try {
    store = new EventStore(join(home, 'junos.db'))
    const db = store
    const startedAt = new Date()
    let probes: ProviderProbe[] = []
    const streams = new Set<ServerResponse>()

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

    function openStream(req: IncomingMessage, res: ServerResponse, url: URL): void {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      })
      res.write('retry: 2000\n\n')
      streams.add(res)
      const raw = req.headers['last-event-id'] ?? url.searchParams.get('lastEventId')
      const lastId = raw === undefined || raw === null || raw === '' ? 0 : Number(raw)
      // Subscribe before replaying so nothing slips between the two; seq dedupes.
      let sent = 0
      const send = (event: JunosEvent) => {
        if (event.seq <= sent) return
        sent = event.seq
        res.write(sseFrame(event))
      }
      let live: ((event: JunosEvent) => void) | undefined
      const unsubscribe = db.subscribe((event) => live?.(event))
      const timer = setInterval(() => res.write('event: heartbeat\ndata: {}\n\n'), heartbeatMs)
      timer.unref()
      res.on('close', () => {
        unsubscribe()
        streams.delete(res)
        clearInterval(timer)
      })

      const last = db.lastSeq()
      const first = db.firstSeq()
      if (!Number.isFinite(lastId) || lastId < 0 || lastId > last || (lastId > 0 && first > lastId + 1)) {
        // The client's position is unknown or has been trimmed: it must refetch snapshots.
        res.write(`event: ${RESYNC_EVENT}\ndata: ${JSON.stringify({ lastSeq: last })}\n\n`)
        sent = last
      } else {
        sent = lastId
        for (const event of db.since(lastId)) send(event)
      }
      live = send
      res.write(`event: ready\ndata: ${JSON.stringify({ lastSeq: db.lastSeq() })}\n\n`)
    }

    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (req.method === 'GET' && url.pathname === '/api/health') {
        const body: HealthResponse = {
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
      if (req.method === 'GET' && url.pathname === '/api/events') return openStream(req, res, url)
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
      sendJson(res, 404, { error: 'not found' })
    })

    const srv = server
    await new Promise<void>((resolve, reject) => {
      srv.once('error', reject)
      srv.listen(options.port ?? DEFAULT_PORT, host, resolve)
    })
    const port = (srv.address() as AddressInfo).port
    lock.setPort(port)
    db.append('daemon.started', { version: VERSION, pid: process.pid, port })
    await refreshProviders()

    let closing: Promise<void> | undefined
    return {
      port,
      store: db,
      close() {
        closing ??= (async () => {
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
