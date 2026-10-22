import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { ConversationDetail, ConversationRecord, MessageRecord, ProviderModels, RunEvent, RunsResponse, SendMessageResponse } from '@junos/shared'
import { ClaudeStreamParser, classifyError, claudeArgs } from '../src/adapters/claude.ts'
import { boot, fakeProviderEnv, tempHome, type Browser, type BootOptions } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const fixture = (name: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('claude stream-json parser (recorded real output)', () => {
  const real = fixture('claude-stream-json.jsonl')

  it('turns the recorded run into token, usage and done events', () => {
    const parser = new ClaudeStreamParser()
    const events = [...parser.feed(real), ...parser.flush()]
    const kinds = events.map((e) => e.type)
    assert.deepEqual(kinds.filter((k) => k !== 'rate_limit'), ['token', 'usage', 'done'])
    assert.equal((events.find((e) => e.type === 'token') as { text: string }).text, 'ok')
    assert.equal((events.find((e) => e.type === 'done') as { text: string }).text, 'ok')
    assert.ok(parser.finished)
    assert.equal(parser.skipped, 0, 'every recorded line is valid JSON')
  })

  it('reads usage, counting cached input too', () => {
    const events = new ClaudeStreamParser().feed(real)
    const usage = events.find((e) => e.type === 'usage') as Extract<RunEvent, { type: 'usage' }>
    assert.ok(usage.inputTokens > 100_000, 'the recorded call loaded the whole user setup')
    assert.equal(usage.outputTokens, 4)
  })

  it('reports the plan limit window', () => {
    const limit = new ClaudeStreamParser().feed(real).find((e) => e.type === 'rate_limit') as Extract<RunEvent, { type: 'rate_limit' }>
    assert.equal(limit.status, 'allowed')
    assert.match(limit.resetsAt ?? '', /^\d{4}-\d{2}-\d{2}T/)
  })

  it('gives the same events however the output is split into chunks', () => {
    const whole = new ClaudeStreamParser().feed(real)
    for (const size of [1, 7, 64, 1000]) {
      const parser = new ClaudeStreamParser()
      const events: RunEvent[] = []
      for (let i = 0; i < real.length; i += size) events.push(...parser.feed(real.slice(i, i + size)))
      assert.deepEqual(events, whole, `chunk size ${size}`)
    }
  })

  it('handles a last line with no newline, and ignores lines that are not JSON', () => {
    const parser = new ClaudeStreamParser()
    const events = [...parser.feed('not json\n{"type":"result","is_error":false,"result":"hi"}'), ...parser.flush()]
    assert.deepEqual(events.map((e) => e.type), ['done'])
    assert.equal(parser.skipped, 1)
  })

  it('classifies errors', () => {
    assert.equal(classifyError('You have reached your usage limit.'), 'rate_limited')
    assert.equal(classifyError('whatever', 429), 'rate_limited')
    assert.equal(classifyError('Not logged in. Please run /login'), 'needs_login')
    assert.equal(classifyError('boom'), 'failed')
  })
})

describe('claude command line', () => {
  it('maps model and effort, and omits --model for the default', () => {
    const a = claudeArgs('opus', 'high')
    assert.deepEqual(a.slice(a.indexOf('--model'), a.indexOf('--model') + 2), ['--model', 'opus'])
    assert.deepEqual(a.slice(a.indexOf('--effort'), a.indexOf('--effort') + 2), ['--effort', 'high'])
    assert.ok(!claudeArgs('', 'low').includes('--model'))
  })

  it('never uses flags that break the subscription or the sandbox', () => {
    const a = claudeArgs('opus', 'max')
    for (const bad of ['--bare', '--dangerously-skip-permissions', '--permission-mode=bypassPermissions', '--api-key']) assert.ok(!a.includes(bad), bad)
    assert.equal(a[a.indexOf('--permission-mode') + 1], 'plan')
    assert.equal(a[a.indexOf('--tools') + 1], '', 'no tools in a plain chat')
  })

  it('keeps the user config out and never puts the prompt on the command line', () => {
    const a = claudeArgs('', 'medium')
    assert.equal(a[a.indexOf('--setting-sources') + 1], 'project')
    for (const flag of ['--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence', '--include-partial-messages']) assert.ok(a.includes(flag), flag)
  })
})

describe('recorded output of the other CLIs (shapes for #10)', () => {
  it('codex exec --json is thread, turn, item, turn.completed', () => {
    const lines = fixture('codex-exec-json.jsonl').trim().split('\n').map((l) => JSON.parse(l))
    assert.deepEqual(lines.map((l) => l.type), ['thread.started', 'turn.started', 'item.completed', 'turn.completed'])
    assert.equal(lines[2].item.text, 'ok')
    assert.ok(lines[3].usage.input_tokens > 0)
  })

  it('cursor-agent stream-json has init, thinking deltas, assistant and result', () => {
    const lines = fixture('cursor-stream-json.jsonl').trim().split('\n').map((l) => JSON.parse(l))
    assert.equal(lines[0].subtype, 'init')
    assert.ok(lines.some((l) => l.type === 'thinking' && l.subtype === 'delta'))
    assert.equal(lines.find((l) => l.type === 'assistant').message.content[0].text, 'ok')
    assert.equal(lines.at(-1).result, 'ok')
  })

  it('contains no personal data', () => {
    for (const name of readdirSync(fileURLToPath(new URL('./fixtures/', import.meta.url)))) {
      const text = fixture(name)
      assert.ok(!/jonas|gmail|@(?!example\.com)/i.test(text), name)
      assert.ok(!/C:\\\\?Users/i.test(text), name)
    }
  })
})

async function setup(options: BootOptions & { env?: Record<string, string> } = {}) {
  const { home, cleanup } = tempHome()
  const log = join(home, 'fake-claude.log')
  const env = fakeProviderEnv({ JUNOS_FAKE_LOG: log, ...options.env })
  const d = await boot(home, { ...options, env })
  cleanups.push(cleanup, () => d.close())
  const b = await d.pair()
  const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as { args: string[]; prompt: string; cwd: string; env: string[] }) : [])
  return { home, d, b, log, calls, ...chatHelpers(b) }
}

function chatHelpers(b: Browser) {
  const create = async (body: Record<string, unknown> = {}) => {
    const res = await b.post('/api/conversations', body)
    assert.equal(res.status, 201, await res.clone().text())
    return (await res.json()) as ConversationRecord
  }
  const ack = () => b.post('/api/chat/disclosures/claude/ack')
  const send = async (id: string, body: Record<string, unknown>) => {
    const res = await b.post(`/api/conversations/${id}/messages`, body)
    return { http: res.status, out: (await res.json()) as SendMessageResponse & { error?: string; message?: string } }
  }
  const started = async (id: string, body: Record<string, unknown>) => {
    const r = await send(id, body)
    assert.equal(r.http, 201, JSON.stringify(r.out))
    return r.out as Extract<SendMessageResponse, { status: 'started' }>
  }
  /** Reads a run's SSE stream to its end and returns the events. */
  const collect = async (runId: string): Promise<RunEvent[]> => {
    const res = await b.get(`/api/runs/${runId}/stream`)
    assert.equal(res.status, 200)
    const text = await res.text()
    return text
      .split('\n\n')
      .filter((f) => f.includes('data: ') && !f.startsWith('event: end'))
      .map((f) => JSON.parse(f.split('\n').find((l) => l.startsWith('data: '))!.slice(6)) as RunEvent)
  }
  const detail = (id: string) => b.json<ConversationDetail>(`/api/conversations/${id}`)
  const waitDone = async (id: string, ms = 8000): Promise<MessageRecord[]> => {
    const end = Date.now() + ms
    for (;;) {
      const d = await detail(id)
      if (d.messages.every((m) => m.status !== 'streaming')) return d.messages
      if (Date.now() > end) throw new Error('reply never finished')
      await sleep(50)
    }
  }
  return { create, ack, send, started, collect, detail, waitDone }
}

describe('models and disclosure', () => {
  it('lists Claude models with their efforts, labelled static, and whether the CLI is available', async () => {
    const { b } = await setup()
    const body = await b.json<{ providers: ProviderModels[]; acknowledged: string[]; status: Array<{ provider: string; available: boolean; version?: string }> }>('/api/chat/models')
    const claude = body.providers.find((p) => p.provider === 'claude')!
    assert.equal(claude.source, 'static')
    assert.deepEqual(claude.models.map((m) => m.id), ['', 'opus', 'sonnet', 'haiku'])
    assert.ok(claude.models.every((m) => m.efforts.length === 5))
    assert.deepEqual(body.acknowledged, [])
    assert.equal(body.status[0]?.available, true)
  })

  it('asks for the one-line disclosure the first time, and sends nothing until it is acknowledged', async () => {
    const { create, send, ack, calls, detail } = await setup()
    const conv = await create()
    const first = await send(conv.id, { content: 'hello' })
    assert.equal(first.http, 409)
    assert.equal(first.out.status, 'disclosure_required')
    assert.match((first.out as { text: string }).text, /sent to Claude/)
    assert.deepEqual(calls(), [], 'nothing reached the provider')
    assert.equal((await detail(conv.id)).messages.length, 0, 'no message was stored either')

    assert.equal((await ack()).status, 200)
    assert.equal((await send(conv.id, { content: 'hello' })).http, 201)
  })

  it('remembers the acknowledgement across a restart and audits it', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const first = await boot(home)
    const b1 = await first.pair()
    await b1.post('/api/chat/disclosures/claude/ack')
    assert.ok(first.store.since(0).some((e) => e.type === 'provider.disclosure_acknowledged'))
    await first.close()
    const second = await boot(home)
    cleanups.push(() => second.close())
    const b2 = second.browser()
    b2.cookie = b1.cookie
    b2.csrf = b1.csrf
    assert.deepEqual((await b2.json<{ acknowledged: string[] }>('/api/chat/models')).acknowledged, ['claude'])
  })

  it('rejects unknown providers', async () => {
    const { b } = await setup()
    assert.equal((await b.post('/api/chat/disclosures/nope/ack')).status, 404)
  })
})

describe('conversations', () => {
  it('creates a conversation with defaults and validates the picker values', async () => {
    const { create, b } = await setup()
    const conv = await create()
    assert.deepEqual([conv.provider, conv.model, conv.effort, conv.allowedProviders, conv.title], ['claude', '', 'medium', ['claude'], 'New chat'])
    for (const bad of [{ model: 'gpt-9' }, { effort: 'ludicrous' }, { provider: 'nobody' }, { allowedProviders: ['nobody'] }]) {
      const res = await b.post('/api/conversations', bad)
      assert.equal(res.status, 400, JSON.stringify(bad))
    }
  })

  it('needs a paired browser and the CSRF header', async () => {
    const { d, b } = await setup()
    assert.equal((await d.browser().get('/api/conversations')).status, 401)
    assert.equal((await d.browser().post('/api/conversations', {})).status, 401)
    assert.equal((await b.request('/api/conversations', { method: 'POST', body: {}, csrf: false })).status, 403)
  })

  it('answers 404 for an unknown conversation and 400 for bad messages', async () => {
    const { b, create, ack, send } = await setup()
    assert.equal((await b.get('/api/conversations/00000000-0000-4000-8000-000000000000')).status, 404)
    await ack()
    const conv = await create()
    assert.equal((await send(conv.id, { content: '   ' })).http, 400)
    assert.equal((await send(conv.id, { content: 'x'.repeat(20_001) })).http, 400)
    assert.equal((await send('00000000-0000-4000-8000-000000000000', { content: 'hi' })).http, 404)
  })
})

describe('streaming chat', () => {
  it('streams the reply token by token and stores it', async () => {
    const { create, ack, started, collect, waitDone } = await setup()
    await ack()
    const conv = await create()
    const { runId, assistantMessage } = await started(conv.id, { content: 'hello world' })
    assert.equal(assistantMessage.status, 'streaming')

    const events = await collect(runId)
    const tokens = events.filter((e) => e.type === 'token').map((e) => (e as { text: string }).text)
    assert.ok(tokens.length >= 2, 'arrived in several pieces, not one block')
    assert.equal(tokens.join(''), 'echo: hello world')
    assert.equal((events.at(-1) as { type: string }).type, 'done')

    const messages = await waitDone(conv.id)
    const reply = messages.find((m) => m.role === 'assistant')!
    assert.equal(reply.content, 'echo: hello world')
    assert.equal(reply.status, 'complete')
    assert.equal(reply.runId, runId)
    assert.deepEqual([reply.provider, reply.effort], ['claude', 'medium'])
  })

  it('can re-attach to a stream that is still buffered, from the last event it saw', async () => {
    const { create, ack, started, collect, b } = await setup()
    await ack()
    const conv = await create()
    const { runId } = await started(conv.id, { content: 'replay me' })
    const all = await collect(runId)
    const res = await b.request(`/api/runs/${runId}/stream`, { headers: { 'last-event-id': String(all.length - 1) } })
    const text = await res.text()
    assert.equal(text.split('\n\n').filter((f) => f.startsWith('id:')).length, 1, 'only the last event is replayed')
  })

  it('titles a new chat from the first message', async () => {
    const { create, ack, started, collect, waitDone, b } = await setup()
    await ack()
    const conv = await create()
    const { runId } = await started(conv.id, { content: 'What is   the capital of Denmark?' })
    await collect(runId)
    await waitDone(conv.id)
    const list = await b.json<{ conversations: ConversationRecord[] }>('/api/conversations')
    assert.equal(list.conversations[0]?.title, 'What is the capital of Denmark?')
  })

  it('keeps the thinking apart from the answer', async () => {
    const { create, ack, started, collect, waitDone } = await setup({ env: { JUNOS_FAKE_MODE: 'thinking' } })
    await ack()
    const conv = await create()
    const { runId } = await started(conv.id, { content: 'think' })
    await collect(runId)
    const reply = (await waitDone(conv.id)).find((m) => m.role === 'assistant')!
    assert.equal(reply.thinking, 'hmm let me think')
    assert.equal(reply.content, 'echo: think')
  })

  it('only allows one reply at a time per conversation', async () => {
    const { create, ack, started, send, b } = await setup({ env: { JUNOS_FAKE_MODE: 'slow' } })
    await ack()
    const conv = await create()
    await started(conv.id, { content: 'first' })
    const second = await send(conv.id, { content: 'second' })
    assert.equal(second.http, 409)
    assert.equal(second.out.error, 'busy')
    await b.post('/api/stop')
  })
})

describe('one job per subscription', () => {
  it('refuses a second job on the same provider while one is running, then allows it after', async () => {
    const { create, ack, started, send, b, waitDone } = await setup({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    await ack()
    const one = await create()
    const two = await create()
    await started(one.id, { content: 'first' })
    const blocked = await send(two.id, { content: 'second' })
    assert.deepEqual([blocked.http, blocked.out.error], [409, 'provider_busy'])
    assert.equal((await b.json<ConversationDetail>(`/api/conversations/${two.id}`)).messages.length, 0, 'nothing was stored for the refused one')
    await b.post('/api/stop')
    await waitDone(one.id)
    await b.post('/api/resume')
    assert.equal((await send(two.id, { content: 'second' })).http, 201)
    await b.post('/api/stop')
  })
})

describe('the picker changes what is sent', () => {
  it('passes the chosen model and effort to the CLI and records them on the run', async () => {
    const { create, ack, started, collect, waitDone, calls, b } = await setup()
    await ack()
    const conv = await create()
    const one = await started(conv.id, { content: 'a', model: 'opus', effort: 'high' })
    await collect(one.runId)
    await waitDone(conv.id)
    const args = calls()[0]!.args
    assert.deepEqual(args.slice(args.indexOf('--model'), args.indexOf('--model') + 2), ['--model', 'opus'])
    assert.deepEqual(args.slice(args.indexOf('--effort'), args.indexOf('--effort') + 2), ['--effort', 'high'])

    const two = await started(conv.id, { content: 'b', model: '', effort: 'low' })
    await collect(two.runId)
    await waitDone(conv.id)
    const args2 = calls()[1]!.args
    assert.ok(!args2.includes('--model'), 'the default model sends no --model')
    assert.equal(args2[args2.indexOf('--effort') + 1], 'low')

    const runs = (await b.json<RunsResponse>('/api/runs')).runs
    const byId = Object.fromEntries(runs.map((r) => [r.id, r]))
    assert.deepEqual([byId[one.runId]?.provider, byId[one.runId]?.model, byId[one.runId]?.effort], ['claude', 'opus', 'high'])
    assert.deepEqual([byId[two.runId]?.model, byId[two.runId]?.effort], ['default', 'low'])
  })

  it('sends an empty conversation to the provider the picker switched to', async () => {
    const { create, send, collect, detail, calls, b } = await setup()
    const conv = await create()
    const disclosed = await send(conv.id, { content: 'not yet', provider: 'codex', model: '', effort: 'high' })
    // Claude was never acknowledged; the disclosure must name the provider that will actually receive it.
    assert.equal(disclosed.http, 409)
    assert.equal(disclosed.out.status, 'disclosure_required')
    assert.equal((disclosed.out as { provider?: string }).provider, 'codex')
    assert.match((disclosed.out as { text?: string }).text ?? '', /Codex \(OpenAI\)/)
    assert.deepEqual(calls(), [], 'disclosure does not reach a provider')
    const pending = await detail(conv.id)
    assert.equal(pending.messages.length, 0)
    assert.deepEqual([pending.conversation.provider, pending.conversation.model, pending.conversation.effort, pending.conversation.allowedProviders], ['codex', '', 'high', ['codex']])

    assert.equal((await b.post('/api/chat/disclosures/codex/ack')).status, 200)
    const started = await send(conv.id, { content: 'hello codex', provider: 'codex', model: '', effort: 'high' })
    assert.equal(started.http, 201, JSON.stringify(started.out))
    const runId = (started.out as Extract<SendMessageResponse, { status: 'started' }>).runId
    await collect(runId)
    await sleep(150)
    const after = await detail(conv.id)
    assert.equal(after.conversation.provider, 'codex')
    assert.equal(after.messages.find((m) => m.role === 'assistant')?.provider, 'codex')
    const call = calls().at(-1)!
    assert.equal(call.args[0], 'exec', 'the first message goes to Codex, not the provider the chat was created with')
    assert.match(call.prompt, /hello codex/)
    const runs = (await b.json<RunsResponse>('/api/runs')).runs
    assert.equal(runs.find((r) => r.id === runId)?.provider, 'codex')
  })

  it('does not retarget a conversation that already has messages', async () => {
    const { create, ack, started, collect, waitDone, detail, calls, b } = await setup()
    await ack()
    await b.post('/api/chat/disclosures/codex/ack')
    const conv = await create()
    const first = await started(conv.id, { content: 'stay' })
    await collect(first.runId)
    await waitDone(conv.id)
    const second = await started(conv.id, { content: 'still claude', provider: 'codex', model: '', effort: 'medium' })
    await collect(second.runId)
    await waitDone(conv.id)
    const after = await detail(conv.id)
    assert.equal(after.conversation.provider, 'claude')
    assert.deepEqual(after.conversation.allowedProviders, ['claude'])
    assert.ok(after.messages.filter((m) => m.role === 'assistant').every((m) => m.provider === 'claude'))
    assert.ok(calls().every((c) => c.args[0] === '-p'))
  })

  it('does not retarget when the model is not valid for the new provider', async () => {
    const { create, send, detail, calls } = await setup()
    const conv = await create({ model: 'opus' })
    const r = await send(conv.id, { content: 'hi', provider: 'codex', model: 'opus', effort: 'medium' })
    assert.equal(r.http, 400)
    assert.equal(r.out.error, 'unknown_model')
    const after = await detail(conv.id)
    assert.equal(after.conversation.provider, 'claude')
    assert.deepEqual(after.conversation.allowedProviders, ['claude'])
    assert.equal(after.messages.length, 0)
    assert.deepEqual(calls(), [])
  })

  it('remembers the last choice on the conversation', async () => {
    const { create, ack, started, collect, waitDone, detail } = await setup()
    await ack()
    const conv = await create()
    const { runId } = await started(conv.id, { content: 'a', model: 'sonnet', effort: 'max' })
    await collect(runId)
    await waitDone(conv.id)
    const after = (await detail(conv.id)).conversation
    assert.deepEqual([after.model, after.effort], ['sonnet', 'max'])
  })

  it('refuses a model or effort it does not know, without starting anything', async () => {
    const { create, ack, send, calls } = await setup()
    await ack()
    const conv = await create()
    assert.equal((await send(conv.id, { content: 'a', model: 'bogus' })).http, 400)
    assert.equal((await send(conv.id, { content: 'a', effort: 'bogus' })).http, 400)
    assert.deepEqual(calls(), [])
  })
})

describe('history', () => {
  it('saves both sides, replays earlier turns to the CLI, and survives a restart', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const log = join(home, 'fake.log')
    const env = fakeProviderEnv({ JUNOS_FAKE_LOG: log })
    const first = await boot(home, { env })
    const b1 = await first.pair()
    const h1 = chatHelpers(b1)
    await h1.ack()
    const conv = await h1.create()
    await h1.collect((await h1.started(conv.id, { content: 'first question' })).runId)
    await h1.waitDone(conv.id)
    await h1.collect((await h1.started(conv.id, { content: 'second question' })).runId)
    await h1.waitDone(conv.id)

    const prompts = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l).prompt as string)
    assert.match(prompts[1]!, /User: first question\n\nAssistant: echo: first question\n\nUser: second question\n\nAssistant:$/)
    await first.close()

    const second = await boot(home, { env })
    cleanups.push(() => second.close())
    const b2 = second.browser()
    b2.cookie = b1.cookie
    b2.csrf = b1.csrf
    const loaded = await chatHelpers(b2).detail(conv.id)
    assert.deepEqual(loaded.messages.map((m) => [m.role, m.content]), [
      ['user', 'first question'],
      ['assistant', 'echo: first question'],
      ['user', 'second question'],
      ['assistant', 'echo: second question'],
    ])
    const listed = await b2.json<{ conversations: ConversationRecord[] }>('/api/conversations')
    assert.equal(listed.conversations.length, 1)
  })

  it('marks a reply that was streaming when junosd died as failed', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const first = await boot(home)
    const b1 = await first.pair()
    const conv = await chatHelpers(b1).create()
    await first.close()
    const db = new DatabaseSync(join(home, 'junos.db'))
    db.prepare(`INSERT INTO message (id, conversation_id, role, content_md, status, created_at) VALUES ('m-stale', ?, 'assistant', 'half', 'streaming', '2026-10-22T09:00:00Z')`).run(conv.id)
    db.close()
    const second = await boot(home)
    cleanups.push(() => second.close())
    const b2 = second.browser()
    b2.cookie = b1.cookie
    b2.csrf = b1.csrf
    const m = (await chatHelpers(b2).detail(conv.id)).messages[0]!
    assert.deepEqual([m.status, m.content], ['error', 'half'])
    assert.match(m.error ?? '', /restarted/)
  })
})

describe('what the CLI is given', () => {
  it('gets the prompt on stdin, an empty working directory, and none of the daemon secrets', async () => {
    const { create, ack, started, collect, waitDone, calls, home } = await setup({ env: { ANTHROPIC_API_KEY: 'sk-ant-should-not-leak-1234567890', JUNOS_SECRET_THING: 'nope' } })
    await ack()
    const conv = await create()
    const { runId } = await started(conv.id, { content: 'my private question' })
    await collect(runId)
    await waitDone(conv.id)
    const call = calls()[0]!
    assert.ok(!call.args.join(' ').includes('my private question'), 'the prompt is not on the command line')
    assert.match(call.prompt, /my private question/)
    assert.equal(call.cwd, join(home, 'chat-cwd'))
    assert.deepEqual(readdirSync(call.cwd), [], 'nothing for the CLI to discover')
    assert.ok(!call.env.includes('ANTHROPIC_API_KEY'), 'no API key reaches the CLI')
    assert.ok(!call.env.includes('JUNOS_SECRET_THING'))
    assert.ok(call.env.includes('PATH'))
  })
})

describe('Stop and errors', () => {
  it('Stop keeps what was written so far, and ends the reply', async () => {
    const { create, ack, started, waitDone, b } = await setup({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    await ack()
    const conv = await create()
    const { runId } = await started(conv.id, { content: 'long please' })
    await sleep(700)
    const res = await b.post('/api/stop')
    assert.equal(res.status, 200)
    const reply = (await waitDone(conv.id)).find((m) => m.role === 'assistant')!
    assert.equal(reply.status, 'partial')
    assert.ok(reply.content.length > 0 && reply.content.startsWith('word'), 'the partial text is kept')
    assert.equal(reply.runId, runId)
  })

  it('refuses to send while stopped, and works again after Resume', async () => {
    const { create, ack, send, b, started, collect } = await setup()
    await ack()
    const conv = await create()
    await b.post('/api/stop')
    const blocked = await send(conv.id, { content: 'hi' })
    assert.deepEqual([blocked.http, blocked.out.error], [409, 'paused'])
    await b.post('/api/resume')
    await collect((await started(conv.id, { content: 'hi' })).runId)
  })

  for (const [mode, kind, text] of [
    ['ratelimit', 'rate_limited', /usage limit/],
    ['login', 'needs_login', /logged in/i],
    ['nojson', 'failed', /something broke/],
    ['silent', 'failed', /without an answer/],
  ] as const) {
    it(`reports a ${mode} failure on the message instead of hanging`, async () => {
      const { create, ack, started, collect, waitDone, d } = await setup({ env: { JUNOS_FAKE_MODE: mode } })
      await ack()
      const conv = await create()
      const { runId } = await started(conv.id, { content: 'hi' })
      const events = await collect(runId)
      assert.ok(events.some((e) => e.type === 'error' && e.kind === kind), JSON.stringify(events))
      const reply = (await waitDone(conv.id)).find((m) => m.role === 'assistant')!
      assert.equal(reply.status, 'error')
      assert.match(reply.error ?? '', text)
      const ev = d.store.since(0).find((e) => e.type === 'chat.message' && e.payload.status === 'error')!
      assert.equal(ev.payload.errorKind, kind)
    })
  }

  it('says so when the CLI is missing, and stores nothing', async () => {
    const { create, ack, send, detail } = await setup({ env: { JUNOS_CLAUDE_BIN: join(tempHome().home, 'no-such-claude.mjs') } })
    await ack()
    const conv = await create()
    const r = await send(conv.id, { content: 'hi' })
    assert.deepEqual([r.http, r.out.error], [503, 'provider_unavailable'])
    assert.match(r.out.message ?? '', /not found/)
    assert.equal((await detail(conv.id)).messages.length, 0)
  })

  it('flags a call whose context was huge, which means the CLI loaded the user config', async () => {
    const { create, ack, started, collect, waitDone, d } = await setup({ env: { JUNOS_FAKE_MODE: 'heavy' } })
    await ack()
    const conv = await create()
    await collect((await started(conv.id, { content: 'hi' })).runId)
    await waitDone(conv.id)
    const heavy = d.store.since(0).find((e) => e.type === 'provider.heavy_context')
    assert.ok(heavy)
    assert.ok(Number(heavy.payload.inputTokens) > 400_000)
  })
})

describe('allowed providers', () => {
  it('never sends a conversation to a provider that is not on its allowed list', async () => {
    const { home, create, ack, send, calls } = await setup()
    await ack()
    const conv = await create()
    const db = new DatabaseSync(join(home, 'junos.db'))
    db.prepare(`UPDATE conversation SET allowed_providers_json = '[]' WHERE id = ?`).run(conv.id)
    db.close()
    const r = await send(conv.id, { content: 'secret stuff' })
    assert.deepEqual([r.http, r.out.error], [403, 'provider_not_allowed'])
    assert.deepEqual(calls(), [])
  })
})
