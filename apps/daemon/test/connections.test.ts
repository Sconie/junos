import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { ConnectionRecord, ConnectionsResponse, ConversationRecord, RunEvent, SendMessageResponse } from '@junos/shared'
import { CodexStreamParser, codexArgs } from '../src/adapters/codex.ts'
import { boot, fakeProviderEnv, tempHome, type BootOptions } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const fixture = (name: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function setup(options: BootOptions & { env?: Record<string, string> } = {}) {
  const { home, cleanup } = tempHome()
  const log = join(home, 'fake.log')
  const env = fakeProviderEnv({ JUNOS_FAKE_LOG: log, ...options.env })
  const d = await boot(home, { ...options, env })
  cleanups.push(cleanup, () => d.close())
  const b = await d.pair()
  const connections = async () => (await b.json<ConnectionsResponse>('/api/connections')).connections
  const byProvider = async () => Object.fromEntries((await connections()).map((c) => [c.provider, c])) as Record<string, ConnectionRecord>
  const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as { cli?: string; args: string[]; prompt: string; cwd: string; env: string[] }) : [])
  return { home, d, b, connections, byProvider, calls }
}

describe('GET /api/connections', () => {
  it('shows one card per provider with the unified state, in a stable order', async () => {
    const { connections, byProvider } = await setup()
    assert.deepEqual((await connections()).map((c) => c.provider), ['claude', 'codex', 'cursor', 'grok', 'nous'])
    const c = await byProvider()
    assert.deepEqual([c.claude!.state, c.claude!.method, c.claude!.plan, c.claude!.chat, c.claude!.note], ['connected', 'Signed in via CLI', 'pro', true, null])
    assert.deepEqual([c.codex!.state, c.codex!.method, c.codex!.chat], ['connected', 'Signed in via CLI', true])
    assert.match(c.claude!.version ?? '', /fake/)
    assert.equal(c.claude!.reconnect, 'claude auth login')
    assert.equal(c.codex!.reconnect, 'codex login')
    assert.ok(c.claude!.checkedAt)
  })

  it('shows Cursor as signed in but with chat still to come', async () => {
    const { byProvider } = await setup()
    const cursor = (await byProvider()).cursor!
    assert.deepEqual([cursor.state, cursor.chat, cursor.note, cursor.reconnect], ['connected', false, 'chat_later', 'cursor-agent login'])
    assert.match(cursor.detail, /next step/)
  })

  it('shows Grok as coming and Nous as reached through Hermes', async () => {
    const { byProvider } = await setup()
    const c = await byProvider()
    assert.deepEqual([c.grok!.state, c.grok!.note, c.grok!.chat, c.grok!.reconnect], ['unavailable', 'coming', false, null])
    assert.deepEqual([c.nous!.state, c.nous!.note, c.nous!.chat], ['unknown', 'via_hermes', false])
    assert.match(c.nous!.detail, /Hermes/)
  })

  it('never exposes an email, organisation or token from the CLIs', async () => {
    const { b } = await setup()
    const text = await (await b.get('/api/connections')).text()
    assert.ok(!/someone@example\.com|Organization|sk-\*\*\*/.test(text), text)
  })

  it('reports needs_login with the exact command when a CLI is signed out', async () => {
    const { byProvider } = await setup({ env: { JUNOS_FAKE_CLAUDE_AUTH: 'out', JUNOS_FAKE_CODEX_LOGIN: 'out', JUNOS_FAKE_CURSOR_LOGIN: 'out' } })
    const c = await byProvider()
    for (const p of ['claude', 'codex', 'cursor']) assert.equal(c[p]!.state, 'needs_login', p)
    assert.deepEqual([c.claude!.reconnect, c.codex!.reconnect, c.cursor!.reconnect], ['claude auth login', 'codex login', 'cursor-agent login'])
    assert.equal(c.claude!.method, null)
  })

  it('flags an API-key sign-in as degraded, because JunOS does not use API keys', async () => {
    const { byProvider } = await setup({ env: { JUNOS_FAKE_CLAUDE_AUTH: 'apikey', JUNOS_FAKE_CODEX_LOGIN: 'apikey' } })
    const c = await byProvider()
    assert.equal(c.claude!.state, 'degraded')
    assert.equal(c.codex!.state, 'degraded')
    assert.match(c.claude!.detail, /API key/)
    assert.match(c.codex!.detail, /API key/)
    assert.equal(c.codex!.method, 'API key')
  })

  it('says unknown, not connected, when a login check cannot be read', async () => {
    const { byProvider } = await setup({ env: { JUNOS_FAKE_CLAUDE_AUTH: 'garbage', JUNOS_FAKE_CODEX_LOGIN: 'garbage' } })
    const c = await byProvider()
    assert.equal(c.claude!.state, 'unknown')
    assert.equal(c.codex!.state, 'unknown')
  })

  it('says unavailable when a CLI is not installed', async () => {
    const missing = (n: string) => join(tempHome().home, n)
    const { byProvider } = await setup({ env: { JUNOS_CLAUDE_BIN: missing('claude.mjs'), JUNOS_CODEX_BIN: missing('codex.mjs'), JUNOS_CURSOR_BIN: missing('cursor.mjs') } })
    const c = await byProvider()
    for (const p of ['claude', 'codex', 'cursor']) {
      assert.equal(c[p]!.state, 'unavailable', p)
      assert.match(c[p]!.detail, /not found/)
    }
  })

  it('needs a paired browser', async () => {
    const { d } = await setup()
    assert.equal((await d.browser().get('/api/connections')).status, 401)
  })
})

describe('plan limits seen in earlier runs', () => {
  async function limitedChat(provider: 'claude' | 'codex', mode: string, now: () => number) {
    const ctx = await setup({ now, env: { JUNOS_FAKE_MODE: mode } })
    await ctx.b.post(`/api/chat/disclosures/${provider}/ack`)
    const conv = (await (await ctx.b.post('/api/conversations', { provider })).json()) as ConversationRecord
    const res = await ctx.b.post(`/api/conversations/${conv.id}/messages`, { content: 'hi' })
    assert.equal(res.status, 201)
    const { runId } = (await res.json()) as Extract<SendMessageResponse, { status: 'started' }>
    await (await ctx.b.get(`/api/runs/${runId}/stream`)).text()
    await sleep(150)
    return ctx
  }

  it('turns a connected provider into rate_limited until the reset time, then back', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { byProvider } = await limitedChat('claude', 'ratelimit', () => now)
    const limited = (await byProvider()).claude!
    assert.equal(limited.state, 'rate_limited')
    assert.match(limited.resetsAt ?? '', /^2026-10-2\dT/)
    assert.match(limited.detail, /plan limit/)
    now = Date.parse(limited.resetsAt!) + 60_000
    assert.equal((await byProvider()).claude!.state, 'connected', 'the limit has lifted')
  })

  it('assumes a few hours when the provider gave no reset time, and leaves other providers alone', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { byProvider } = await limitedChat('codex', 'usagelimit', () => now)
    let c = await byProvider()
    assert.equal(c.codex!.state, 'rate_limited')
    assert.equal(c.codex!.resetsAt, null)
    assert.equal(c.claude!.state, 'connected')
    now += 6 * 3600_000
    c = await byProvider()
    assert.equal(c.codex!.state, 'connected')
  })

  it('does not hide a sign-in problem behind an old rate limit', async () => {
    const now = Date.parse('2026-10-22T10:00:00Z')
    const ctx = await limitedChat('claude', 'ratelimit', () => now)
    assert.equal((await ctx.byProvider()).claude!.state, 'rate_limited')
    // The same daemon, but the CLI is now signed out: the login problem wins.
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const second = await boot(home, { now: () => now, env: fakeProviderEnv({ JUNOS_FAKE_CLAUDE_AUTH: 'out' }) })
    cleanups.push(() => second.close())
    const b2 = await second.pair()
    const c = (await b2.json<ConnectionsResponse>('/api/connections')).connections.find((x) => x.provider === 'claude')!
    assert.equal(c.state, 'needs_login')
  })
})

describe('codex stream parser (recorded real output)', () => {
  const real = fixture('codex-exec-json.jsonl')

  it('turns the recorded run into token, usage and done', () => {
    const parser = new CodexStreamParser()
    const events = [...parser.feed(real), ...parser.flush()]
    assert.deepEqual(events.map((e) => e.type), ['token', 'usage', 'done'])
    assert.equal((events[0] as { text: string }).text, 'ok')
    assert.deepEqual(events[1], { type: 'usage', inputTokens: 22722, outputTokens: 5, cachedTokens: 12416 })
    assert.equal((events[2] as { text: string }).text, 'ok')
    assert.ok(parser.finished)
    assert.equal(parser.skipped, 0)
  })

  it('gives the same events however the output is split', () => {
    const whole = new CodexStreamParser().feed(real)
    for (const size of [1, 5, 50, 1000]) {
      const parser = new CodexStreamParser()
      const events: RunEvent[] = []
      for (let i = 0; i < real.length; i += size) events.push(...parser.feed(real.slice(i, i + size)))
      assert.deepEqual(events, whole, `chunk size ${size}`)
    }
  })

  it('joins several messages and ignores command items', () => {
    const parser = new CodexStreamParser()
    const lines = [
      { type: 'item.completed', item: { type: 'agent_message', text: 'one' } },
      { type: 'item.completed', item: { type: 'command_execution', command: 'ls' } },
      { type: 'item.completed', item: { type: 'agent_message', text: 'two' } },
      { type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } },
    ].map((l) => JSON.stringify(l)).join('\n')
    const events = parser.feed(lines + '\n')
    const text = events.filter((e) => e.type === 'token').map((e) => (e as { text: string }).text).join('')
    assert.equal(text, 'one\n\ntwo')
    assert.equal((events.find((e) => e.type === 'done') as { text: string }).text, 'one\n\ntwo')
  })

  it('classifies a usage-limit failure', () => {
    const events = new CodexStreamParser().feed(JSON.stringify({ type: 'turn.failed', error: { message: "You've hit your usage limit." } }) + '\n')
    assert.deepEqual(events, [{ type: 'error', message: "You've hit your usage limit.", kind: 'rate_limited' }])
  })
})

describe('codex command line', () => {
  it('is read-only, ephemeral, isolated, takes the prompt on stdin and keeps the effort', () => {
    const a = codexArgs('', 'high', '/empty')
    assert.deepEqual(a.slice(0, 2), ['exec', '--json'])
    assert.equal(a[a.indexOf('-s') + 1], 'read-only')
    for (const flag of ['--skip-git-repo-check', '--ephemeral', '--ignore-user-config', '--ignore-rules']) assert.ok(a.includes(flag), flag)
    assert.equal(a[a.indexOf('-C') + 1], '/empty')
    assert.ok(a.includes('model_reasoning_effort="high"'))
    assert.equal(a.at(-1), '-', 'prompt comes from stdin')
    assert.ok(!a.includes('-m'), 'no -m for the default model')
    assert.equal(codexArgs('gpt-x', 'low', '/e')[codexArgs('gpt-x', 'low', '/e').indexOf('-m') + 1], 'gpt-x')
  })

  it('never uses a flag that would lift the sandbox or skip approvals', () => {
    const a = codexArgs('m', 'medium', '/e').join(' ')
    for (const bad of ['--dangerously-bypass-approvals-and-sandbox', 'danger-full-access', 'workspace-write', '--full-auto', '--yolo']) assert.ok(!a.includes(bad), bad)
  })
})

describe('chat through Codex', () => {
  async function chatSetup(options: BootOptions & { env?: Record<string, string> } = {}) {
    const ctx = await setup(options)
    await ctx.b.post('/api/chat/disclosures/codex/ack')
    const create = async (body: Record<string, unknown> = {}) => (await (await ctx.b.post('/api/conversations', { provider: 'codex', ...body })).json()) as ConversationRecord
    const send = async (id: string, body: Record<string, unknown>) => {
      const res = await ctx.b.post(`/api/conversations/${id}/messages`, body)
      return { http: res.status, out: (await res.json()) as SendMessageResponse & { error?: string } }
    }
    const collect = async (runId: string): Promise<RunEvent[]> =>
      (await (await ctx.b.get(`/api/runs/${runId}/stream`)).text())
        .split('\n\n')
        .filter((f) => f.includes('data: ') && !f.startsWith('event: end'))
        .map((f) => JSON.parse(f.split('\n').find((l) => l.startsWith('data: '))!.slice(6)) as RunEvent)
    return { ...ctx, create, send, collect }
  }

  it('lists Codex with the four efforts it really has, and no max', async () => {
    const { b } = await setup()
    const body = await b.json<{ providers: Array<{ provider: string; models: Array<{ id: string; efforts: string[] }> }> }>('/api/chat/models')
    const codex = body.providers.find((p) => p.provider === 'codex')!
    assert.deepEqual(codex.models[0]!.efforts, ['low', 'medium', 'high', 'xhigh'])
  })

  it('refuses the max effort for Codex instead of silently changing it', async () => {
    const { create, send } = await chatSetup()
    const conv = await create()
    const r = await send(conv.id, { content: 'hi', effort: 'max' })
    assert.equal(r.http, 400)
    assert.equal(r.out.error, 'effort_not_supported')
  })

  it('shows the Codex-specific disclosure the first time', async () => {
    const ctx = await setup()
    const conv = (await (await ctx.b.post('/api/conversations', { provider: 'codex' })).json()) as ConversationRecord
    const res = await ctx.b.post(`/api/conversations/${conv.id}/messages`, { content: 'hi' })
    const body = (await res.json()) as { status: string; text: string }
    assert.equal(res.status, 409)
    assert.match(body.text, /Codex \(OpenAI\)/)
    assert.deepEqual(ctx.calls(), [])
  })

  it('streams a Codex reply, stores it, and passes the picker values to the CLI', async () => {
    const { create, send, collect, b, calls, home } = await chatSetup()
    const conv = await create()
    const r = await send(conv.id, { content: 'hello codex', effort: 'high' })
    assert.equal(r.http, 201)
    const { runId } = r.out as Extract<SendMessageResponse, { status: 'started' }>
    const events = await collect(runId)
    assert.equal(events.filter((e) => e.type === 'token').map((e) => (e as { text: string }).text).join(''), 'codex echo: hello codex')
    assert.equal(events.at(-1)?.type, 'done')
    await sleep(150)

    const detail = await b.json<{ messages: Array<{ role: string; content: string; provider: string | null; status: string }> }>(`/api/conversations/${conv.id}`)
    assert.deepEqual(detail.messages.map((m) => [m.role, m.content, m.provider, m.status]), [
      ['user', 'hello codex', null, 'complete'],
      ['assistant', 'codex echo: hello codex', 'codex', 'complete'],
    ])
    const call = calls().find((c) => c.cli === 'codex')!
    assert.ok(call.args.includes('model_reasoning_effort="high"'))
    assert.match(call.prompt, /User: hello codex/)
    assert.ok(!call.args.join(' ').includes('hello codex'), 'the prompt is not on the command line')
    assert.equal(call.cwd, join(home, 'chat-cwd'))
    const runs = (await b.json<{ runs: Array<{ id: string; provider: string; effort: string }> }>('/api/runs')).runs
    assert.deepEqual([runs.find((x) => x.id === runId)?.provider, runs.find((x) => x.id === runId)?.effort], ['codex', 'high'])
  })

  it('gives the Codex CLI no daemon secrets', async () => {
    const { create, send, collect, calls } = await chatSetup({ env: { OPENAI_API_KEY: 'sk-should-not-leak-1234567890', CODEX_API_KEY: 'nope' } })
    const conv = await create()
    const r = await send(conv.id, { content: 'x' })
    await collect((r.out as Extract<SendMessageResponse, { status: 'started' }>).runId)
    const env = calls().find((c) => c.cli === 'codex')!.env
    assert.ok(!env.includes('OPENAI_API_KEY') && !env.includes('CODEX_API_KEY'))
    assert.ok(env.includes('PATH'))
  })

  it('reports a usage limit on the message and records it for the Connections screen', async () => {
    const { create, send, collect, d, b } = await chatSetup({ env: { JUNOS_FAKE_MODE: 'usagelimit' } })
    const conv = await create()
    const r = await send(conv.id, { content: 'hi' })
    const events = await collect((r.out as Extract<SendMessageResponse, { status: 'started' }>).runId)
    assert.ok(events.some((e) => e.type === 'error' && e.kind === 'rate_limited'))
    await sleep(150)
    const detail = await b.json<{ messages: Array<{ role: string; status: string; error: string | null }> }>(`/api/conversations/${conv.id}`)
    assert.equal(detail.messages[1]?.status, 'error')
    assert.match(detail.messages[1]?.error ?? '', /usage limit/)
    assert.ok(d.store.since(0).some((e) => e.type === 'provider.rate_limited' && e.refId === 'codex'))
  })

  it('runs a Codex job and a Claude job at the same time, since each subscription has its own slot', async () => {
    const { create, send, b } = await chatSetup({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    await b.post('/api/chat/disclosures/claude/ack')
    const claudeConv = (await (await b.post('/api/conversations', { provider: 'claude' })).json()) as ConversationRecord
    const first = await send(claudeConv.id, { content: 'slow claude' })
    assert.equal(first.http, 201)
    const second = await send((await create()).id, { content: 'codex meanwhile' })
    assert.equal(second.http, 201, JSON.stringify(second.out))
    await b.post('/api/stop')
  })
})
