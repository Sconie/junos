import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ShimConfig } from '../src/config.ts'
import { type ShimDeps, type ShimServer, startShim } from '../src/server.ts'

export const KEY = 'test-key-not-a-real-secret'
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function until(cond: () => boolean | Promise<boolean>, ms = 8000, what = 'condition'): Promise<void> {
  const end = Date.now() + ms
  while (!(await cond())) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await sleep(15)
  }
}

export const STREAM = readFileSync(fileURLToPath(new URL('./fixtures/hermes-chat-stream.sse', import.meta.url)), 'utf8')

export interface FakeHermes {
  url: string
  seen: Array<{ method: string; path: string; auth: string | undefined; body: string }>
  /** ok: the fixture stream; plain: just text; slow: waits; empty; down: HTTP 500; tools: the fixture. */
  mode: 'ok' | 'plain' | 'slow' | 'empty' | 'fail'
  /** When true, /health also needs the key. */
  guardHealth: boolean
  close(): Promise<void>
}

/** A stand-in for Hermes's OpenAI-style API on 127.0.0.1. It never leaves this machine. */
export async function fakeHermes(): Promise<FakeHermes> {
  const state: FakeHermes = { url: '', seen: [], mode: 'ok', guardHealth: false, close: async () => {} }
  const read = (req: IncomingMessage) =>
    new Promise<string>((resolve) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => resolve(body))
    })
  const sockets = new Set<import('node:net').Socket>()
  const server: Server = createServer(async (req, res) => {
    const body = await read(req)
    state.seen.push({ method: req.method ?? '', path: req.url ?? '', auth: req.headers.authorization, body })
    const authed = req.headers.authorization === `Bearer ${KEY}`
    if (req.url === '/health') {
      if (state.guardHealth && !authed) return void res.writeHead(401).end('{"error":"key"}')
      return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'ok', version: '0.22.2' }))
    }
    if (!authed) return void res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"invalid key"}')
    if (req.url === '/v1/models') return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: [{ id: 'hermes-agent' }] }))
    if (req.url === '/v1/chat/completions') {
      if (state.mode === 'fail') return void res.writeHead(500).end('boom')
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      const text = (t: string) => res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`)
      if (state.mode === 'empty') return void res.end('data: [DONE]\n\n')
      if (state.mode === 'slow') {
        text('thinking… ')
        const t = setTimeout(() => !res.destroyed && (text('done'), res.end('data: [DONE]\n\n')), 4000)
        res.on('close', () => clearTimeout(t))
        return
      }
      if (state.mode === 'plain') {
        const asked = (JSON.parse(body) as { messages: Array<{ content: string }> }).messages.at(-1)!.content
        text(`You said: ${asked}`)
        return void res.end('data: [DONE]\n\n')
      }
      return void res.end(STREAM)
    }
    res.writeHead(404).end()
  })
  server.on('connection', (s) => {
    sockets.add(s)
    s.on('close', () => sockets.delete(s))
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  state.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  state.close = async () => {
    for (const s of sockets) s.destroy()
    await new Promise<void>((r) => server.close(() => r()))
  }
  return state
}

export interface Rig {
  shim: ShimServer
  url: string
  hermes: FakeHermes
  dir: string
  memoryDir: string
  skillsDir: string
  stateDir: string
  logFile: string
  config: ShimConfig
  call(path: string, init?: { method?: string; body?: unknown; key?: string | null; headers?: Record<string, string> }): Promise<Response>
  json<T>(path: string): Promise<T>
  stop(): Promise<void>
}

export async function rig(options: { deps?: ShimDeps; withLog?: boolean; port?: number; hermes?: FakeHermes } = {}): Promise<Rig> {
  const hermes = options.hermes ?? (await fakeHermes())
  const dir = mkdtempSync(join(tmpdir(), 'junos-shim-'))
  const config: ShimConfig = {
    host: '127.0.0.1',
    port: options.port ?? 0,
    key: KEY,
    hermesUrl: hermes.url,
    hermesKey: KEY,
    memoryDir: join(dir, 'memories'),
    skillsDir: join(dir, 'skills'),
    stateDir: join(dir, 'state'),
    logFile: options.withLog ? join(dir, 'conversation.jsonl') : null,
    hookCidrs: [],
  }
  const shim = await startShim(config, { heartbeatMs: 60_000, ...options.deps })
  const url = `http://127.0.0.1:${shim.port}`
  const call: Rig['call'] = (path, init = {}) =>
    fetch(url + path, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: { ...(init.key === null ? {} : { authorization: `Bearer ${init.key ?? KEY}` }), ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...init.headers },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  return {
    shim,
    url,
    hermes,
    dir,
    memoryDir: config.memoryDir,
    skillsDir: config.skillsDir,
    stateDir: config.stateDir,
    logFile: join(dir, 'conversation.jsonl'),
    config,
    call,
    json: async <T>(path: string) => (await call(path)).json() as Promise<T>,
    async stop() {
      await shim.close()
      if (!options.hermes) await hermes.close()
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
    },
  }
}
