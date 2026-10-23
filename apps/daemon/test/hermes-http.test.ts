import assert from 'node:assert/strict'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, it } from 'node:test'
import type { HermesOverview, InboxResponse } from '@junos/shared'
import { BridgeError } from '../src/hermes/bridge.ts'
import { HttpHermes, privateHermesHost } from '../src/hermes/http.ts'
import { Browser, boot, fakeProviderEnv, tempHome, type TestDaemon } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
async function until(cond: () => boolean | Promise<boolean>, ms = 8000, what = 'condition'): Promise<void> {
  const end = Date.now() + ms
  while (!(await cond())) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await sleep(20)
  }
}

const KEY = 'test-key-not-a-real-secret'

interface Fake {
  url: string
  seen: Array<{ method: string; path: string; auth: string | undefined; body: string }>
  mode: 'ok' | 'slow' | 'down' | 'bad-key-reply' | 'empty'
  health: string
  close(): Promise<void>
}

/** A stand-in for Hermes's OpenAI-style gateway: /health open, /v1/models and /v1/chat/completions behind a bearer key. */
async function fakeHermes(): Promise<Fake> {
  const state: Fake = { url: '', seen: [], mode: 'ok', health: 'ok', close: async () => {} }
  const read = (req: IncomingMessage) =>
    new Promise<string>((resolve) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => resolve(body))
    })
  const server: Server = createServer(async (req, res) => {
    const body = await read(req)
    state.seen.push({ method: req.method ?? '', path: req.url ?? '', auth: req.headers.authorization, body })
    if (req.url === '/health') return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: state.health, version: '0.22.2' }))
    if (req.headers.authorization !== `Bearer ${KEY}`) return void res.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'invalid key' }))
    if (req.url === '/v1/models') return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: [{ id: 'hermes-agent' }] }))
    if (req.url === '/v1/chat/completions') {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      const send = (text: string) => res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)
      if (state.mode === 'empty') return void res.end('data: [DONE]\n\n')
      const asked = (JSON.parse(body) as { messages: Array<{ content: string }> }).messages.at(-1)!.content
      send('You said: ')
      if (state.mode === 'slow') return void setTimeout(() => !res.destroyed && (send(asked), res.end('data: [DONE]\n\n')), 3000)
      send(asked)
      return void res.end('data: [DONE]\n\n')
    }
    res.writeHead(404).end()
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  state.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  state.close = () =>
    new Promise<void>((r) => {
      server.closeAllConnections()
      server.close(() => r())
    })
  cleanups.push(() => state.close())
  return state
}

describe('which addresses Hermes may be reached at', () => {
  it('allows this machine and the tailnet, and nothing else', () => {
    for (const ok of ['127.0.0.1', 'localhost', '::1', '[::1]', '100.109.251.72', '100.64.0.1', 'hermes-vps.tail1234.ts.net']) assert.equal(privateHermesHost(ok), true, ok)
    for (const bad of ['8.8.8.8', '187.126.6.144', '10.0.0.5', '192.168.1.2', '100.63.0.1', '100.128.0.1', 'example.com', 'evil.ts.net.example.com']) assert.equal(privateHermesHost(bad), false, bad)
  })

  it('refuses to be built for a public, password-carrying or non-web address', () => {
    for (const bad of ['https://example.com', 'http://187.126.6.144:8642', 'http://user:pw@127.0.0.1:8642', 'ftp://127.0.0.1', 'nonsense']) {
      assert.throws(() => new HttpHermes({ baseUrl: bad }), BridgeError, bad)
    }
    assert.doesNotThrow(() => new HttpHermes({ baseUrl: 'http://127.0.0.1:8642' }))
    assert.doesNotThrow(() => new HttpHermes({ baseUrl: 'http://100.109.251.72:8642' }))
  })
})

describe('Hermes over its API', () => {
  async function daemon(env: Record<string, string>): Promise<{ d: TestDaemon; b: Browser }> {
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const d = await boot(tmp.home, { env: fakeProviderEnv(env), hermesPollMs: 100 })
    cleanups.push(() => d.close())
    return { d, b: await d.pair() }
  }
  const overview = (b: Browser) => b.json<HermesOverview>('/api/hermes')
  const replies = (o: HermesOverview) => o.messages.filter((m) => m.role === 'agent').map((m) => m.text)

  it('is chosen by JUNOS_HERMES_URL, reads its state from /health and its model with the key, and a degraded status is not an error', async () => {
    const fake = await fakeHermes()
    fake.health = 'degraded'
    const { b } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: KEY })
    await until(async () => (await overview(b)).status.model === 'hermes-agent', 5000, 'the model name')
    const o = await overview(b)
    assert.deepEqual([o.mode, o.status.state, o.status.model, o.status.reason], ['remote', 'idle', 'hermes-agent', null])
    assert.ok(fake.seen.some((s) => s.path === '/health' && s.auth === undefined), 'the health check carries no key')
    assert.ok(fake.seen.some((s) => s.path === '/v1/models' && s.auth === `Bearer ${KEY}`))
  })

  it('asks Hermes a directive and shows its streamed answer as a message, with the key only on the call that needs it', async () => {
    const fake = await fakeHermes()
    const { b } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: KEY })
    assert.equal((await b.post('/api/hermes/directives', { text: 'what is the plan?' })).status, 202)
    await until(async () => replies(await overview(b)).includes('You said: what is the plan?'), 5000, 'the reply')
    const o = await overview(b)
    assert.deepEqual(o.steps.map((s) => [s.summary, s.status]), [['Asked Hermes', 'done']])
    assert.equal(o.status.state, 'idle')
    const call = fake.seen.find((s) => s.path === '/v1/chat/completions')!
    assert.equal(call.auth, `Bearer ${KEY}`)
    assert.equal((JSON.parse(call.body) as { stream: boolean }).stream, true)
  })

  it('never lets the key into what the screen shows, the event log or the database', async () => {
    const fake = await fakeHermes()
    const { b, d } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: KEY })
    await b.post('/api/hermes/directives', { text: 'hello' })
    await until(async () => replies(await overview(b)).length === 1, 5000, 'the reply')
    const everything = JSON.stringify(await overview(b)) + JSON.stringify(d.store.since(0)) + JSON.stringify(d.store.db.prepare('SELECT json FROM hermes_message').all()) + JSON.stringify(d.store.db.prepare('SELECT json FROM hermes_step').all())
    assert.equal(everything.includes(KEY), false)
  })

  it('says the key was refused, without showing it, when it is wrong or missing', async () => {
    const fake = await fakeHermes()
    const { b } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: 'wrong-key' })
    await b.post('/api/hermes/directives', { text: 'hello' })
    await until(async () => replies(await overview(b)).length === 1, 5000, 'the failure')
    const o = await overview(b)
    assert.match(replies(o)[0]!, /did not accept the API key/)
    assert.doesNotMatch(JSON.stringify(o), /wrong-key/)
    assert.equal(o.steps[0]!.status, 'failed')
  })

  it('fails honestly when Hermes sends nothing', async () => {
    const fake = await fakeHermes()
    fake.mode = 'empty'
    const { b } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: KEY })
    await b.post('/api/hermes/directives', { text: 'hello' })
    await until(async () => replies(await overview(b)).length === 1, 5000, 'the failure')
    assert.match(replies(await overview(b))[0]!, /sent no answer/)
  })

  it('queues what comes while it waits, highest priority first, and holds the queue while paused', async () => {
    const fake = await fakeHermes()
    fake.mode = 'slow'
    const { b } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: KEY })
    await b.post('/api/hermes/directives', { text: 'first' })
    await until(async () => (await overview(b)).status.state === 'working', 5000, 'working')
    await b.post('/api/hermes/directives', { text: 'low', priority: 'low' })
    await b.post('/api/hermes/directives', { text: 'urgent', priority: 'high' })
    assert.deepEqual((await overview(b)).queue.map((q) => q.text), ['urgent', 'low'])
    await b.post('/api/hermes/stop')
    await until(async () => (await overview(b)).queue.length === 0 && (await overview(b)).status.state === 'idle', 5000, 'idle')
    fake.mode = 'ok'
    await b.post('/api/hermes/pause')
    await b.post('/api/hermes/directives', { text: 'while paused' })
    await sleep(300)
    assert.equal((await overview(b)).queue.length, 1)
    await b.post('/api/hermes/resume')
    await until(async () => replies(await overview(b)).includes('You said: while paused'), 5000, 'the held directive')
  })

  it('stops by closing the connection, and says it cannot confirm that Hermes itself stopped', async () => {
    const fake = await fakeHermes()
    fake.mode = 'slow'
    const { b } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: KEY })
    await b.post('/api/hermes/directives', { text: 'a long job' })
    await until(async () => (await overview(b)).status.state === 'working', 5000, 'working')
    const stopped = await b.post('/api/hermes/stop')
    assert.deepEqual(await stopped.json(), { confirmed: false })
    await until(async () => replies(await overview(b)).includes('Stopped.'), 5000, 'the stop')
    assert.equal((await overview(b)).stopUnconfirmed, true)
    assert.ok(((await b.json<InboxResponse>('/api/inbox')).items).some((i) => i.title === 'Hermes stop not confirmed'))
    // With nothing in flight a stop is simply confirmed.
    await b.post('/api/hermes/resume')
    assert.deepEqual(await (await b.post('/api/hermes/stop')).json(), { confirmed: true })
  })

  it('shows unreachable when nothing answers, and recovers', async () => {
    const fake = await fakeHermes()
    const { b } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: KEY })
    await until(async () => (await overview(b)).status.state === 'idle', 5000, 'idle')
    await fake.close()
    await until(async () => (await overview(b)).status.state === 'unreachable', 8000, 'unreachable')
    assert.match((await overview(b)).status.reason!, /tunnel or Tailscale/)
    assert.equal((await b.post('/api/hermes/directives', { text: 'hello' })).status, 202, 'it is queued by the daemon-side bridge and fails when it runs')
  })

  it('says what its API cannot do yet instead of pretending: memory, skills and approvals', async () => {
    const fake = await fakeHermes()
    const { b } = await daemon({ JUNOS_HERMES_URL: fake.url, JUNOS_HERMES_KEY: KEY })
    const mem = await b.request('/api/hermes/memory', { method: 'PUT', body: { items: [{ text: 'x' }] } })
    assert.equal(mem.status, 501)
    assert.match(((await mem.json()) as { message: string }).message, /shim on the VPS/)
    assert.equal((await b.request('/api/hermes/skills', { method: 'PUT', body: { skills: [{ id: 'a', enabled: true }] } })).status, 501)
    assert.deepEqual(await b.json('/api/hermes/memory'), { items: [] })
  })

  it('does not start with an address on the public internet, and says so', async () => {
    const { b } = await daemon({ JUNOS_HERMES_URL: 'http://187.126.6.144:8642', JUNOS_HERMES_KEY: KEY })
    const o = await overview(b)
    assert.equal(o.mode, 'none')
    assert.match(o.reason!, /never on the public internet/)
  })
})
