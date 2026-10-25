import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { afterEach, describe, it } from 'node:test'
import { join } from 'node:path'
import type { HermesMemoryItem, HermesMessage, HermesQueueItem, HermesSkill, HermesStatus, HermesStep } from '@junos/shared'
import { ConfigError, configFromEnv, hookAllowed, privateBindHost } from '../src/config.ts'
import { parseLogLine } from '../src/convlog.ts'
import type { ShimUpdate } from '../src/protocol.ts'
import { type Rig, fakeHermes, KEY, rig as makeRig, sleep, until } from './helpers.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})
async function rig(...args: Parameters<typeof makeRig>): Promise<Rig> {
  const r = await makeRig(...args)
  cleanups.push(() => r.stop())
  return r
}

/** Reads the shim's event stream like junosd does. */
async function listen(r: Rig, lastEventId = 0) {
  const abort = new AbortController()
  const items: Array<{ id?: number; event: string; update?: ShimUpdate; data?: unknown }> = []
  const res = await fetch(`${r.url}/v1/events?lastEventId=${lastEventId}`, { headers: { authorization: `Bearer ${KEY}` }, signal: abort.signal })
  assert.equal(res.status, 200)
  void (async () => {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return
        buffer += decoder.decode(value, { stream: true })
        let at
        while ((at = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, at)
          buffer = buffer.slice(at + 2)
          let event = 'message'
          let id: number | undefined
          let data = ''
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim()
            else if (line.startsWith('id:')) id = Number(line.slice(3))
            else if (line.startsWith('data:')) data += line.slice(5).trim()
          }
          const parsed = data ? JSON.parse(data) : undefined
          items.push(event === 'message' ? { id, event, update: parsed as ShimUpdate } : { event, data: parsed })
        }
      }
    } catch {
      /* closed */
    }
  })()
  cleanups.push(() => abort.abort())
  return { items, close: () => abort.abort(), updates: () => items.filter((i) => i.event === 'message').map((i) => i.update!) }
}

const directive = (r: Rig, body: Record<string, unknown>) => r.call('/v1/directives', { body })

describe('configuration', () => {
  const base = { HERMES_API_KEY: KEY }
  it('listens only on this machine or the tailnet', () => {
    for (const host of ['127.0.0.1', '::1', 'localhost', '100.101.102.103', '100.64.0.1', '100.127.255.254']) assert.equal(privateBindHost(host), true, host)
    for (const host of ['0.0.0.0', '::', '192.168.1.5', '10.0.0.4', '100.63.0.1', '100.128.0.1', '8.8.8.8', 'example.com']) assert.equal(privateBindHost(host), false, host)
    assert.throws(() => configFromEnv({ ...base, JUNOS_SHIM_HOST: '0.0.0.0' }), ConfigError)
    assert.throws(() => configFromEnv({ ...base, JUNOS_SHIM_HOST: '203.0.113.9' }), /never on 0\.0\.0\.0/)
    assert.equal(configFromEnv({ ...base, JUNOS_SHIM_HOST: '100.88.1.2' }).host, '100.88.1.2')
    // Inside a container 0.0.0.0 is allowed, but only when asked for and only really inside one.
    const any = { ...base, JUNOS_SHIM_HOST: '0.0.0.0', JUNOS_SHIM_CONTAINER: '1' }
    assert.equal(configFromEnv(any, '.', true).host, '0.0.0.0')
    assert.throws(() => configFromEnv(any, '.', false), ConfigError)
    assert.throws(() => configFromEnv({ ...base, JUNOS_SHIM_HOST: '0.0.0.0' }, '.', true), ConfigError)
    assert.throws(() => configFromEnv({ ...any, JUNOS_SHIM_HOST: '203.0.113.9' }, '.', true), ConfigError)
  })
  it('refuses to start without a real key, and one key can do both jobs', () => {
    assert.throws(() => configFromEnv({}), /secret of at least 16/)
    assert.throws(() => configFromEnv({ HERMES_API_KEY: 'short' }), ConfigError)
    const c = configFromEnv(base)
    assert.equal(c.key, KEY)
    assert.equal(c.hermesKey, KEY)
    assert.equal(configFromEnv({ ...base, JUNOS_SHIM_KEY: 'another-secret-of-sixteen+' }).key, 'another-secret-of-sixteen+')
    assert.equal(configFromEnv({ ...base, JUNOS_SHIM_KEY: 'another-secret-of-sixteen+' }).hermesKey, KEY)
  })
  it('only reads Hermes on this machine, a private address or a container name', () => {
    assert.equal(configFromEnv(base).hermesUrl, 'http://127.0.0.1:8642')
    assert.equal(configFromEnv({ ...base, HERMES_API_URL: 'http://hermes:8642' }).hermesUrl, 'http://hermes:8642')
    assert.equal(configFromEnv({ ...base, HERMES_API_URL: 'http://172.18.0.2:8642' }).hermesUrl, 'http://172.18.0.2:8642')
    assert.throws(() => configFromEnv({ ...base, HERMES_API_URL: 'https://api.example.com' }), /container name/)
    assert.throws(() => configFromEnv({ ...base, HERMES_API_URL: 'nonsense' }), /web address/)
    assert.throws(() => configFromEnv({ ...base, JUNOS_SHIM_PORT: '99999' }), /port/)
  })
  it('allows hooks from loopback, and from an addresses range only when it is named', () => {
    for (const a of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) assert.equal(hookAllowed(a, []), true, a)
    assert.equal(hookAllowed('172.18.0.5', []), false)
    assert.equal(hookAllowed('172.18.0.5', ['172.16.0.0/12']), true)
    assert.equal(hookAllowed('172.40.0.5', ['172.16.0.0/12']), false)
    assert.equal(hookAllowed('100.100.100.100', []), false)
    assert.equal(hookAllowed(undefined, ['172.16.0.0/12']), false)
    assert.throws(() => configFromEnv({ ...base, JUNOS_SHIM_HOOK_CIDRS: '0.0.0.0/0' }), /bad entry/)
  })
})

describe('who may call', () => {
  it('answers a health check with its name and nothing else, and everything else needs the key', async () => {
    const r = await rig()
    const open = await fetch(`${r.url}/shim/health`)
    assert.deepEqual(await open.json(), { ok: true, name: 'junos-hermes-shim', protocol: 1 })
    for (const path of ['/v1/status', '/v1/recent', '/v1/memory', '/v1/skills', '/v1/queue', '/v1/events']) assert.equal((await r.call(path, { key: null })).status, 401, path)
    assert.equal((await r.call('/v1/status', { key: 'wrong-key-wrong-key' })).status, 401)
    assert.equal((await r.call('/v1/directives', { body: { text: 'hi' }, key: null })).status, 401)
    assert.equal((await r.call('/v1/status')).status, 200)
  })
  it('refuses anything that comes from a web page', async () => {
    const r = await rig()
    const res = await r.call('/v1/status', { headers: { origin: 'https://evil.example' } })
    assert.equal(res.status, 403)
  })
  it('slows down someone guessing keys', async () => {
    const r = await rig()
    for (let i = 0; i < 10; i++) assert.equal((await r.call('/v1/status', { key: `guess-number-${i}-padding` })).status, 401)
    const locked = await r.call('/v1/status')
    assert.equal(locked.status, 429)
  })
  it('never puts the key in an answer', async () => {
    const r = await rig()
    await directive(r, { text: 'hello' })
    await until(async () => (await r.json<{ messages: HermesMessage[] }>('/v1/recent')).messages.some((m) => m.role === 'agent'))
    for (const path of ['/v1/status', '/v1/recent', '/v1/queue', '/v1/memory', '/v1/skills', '/shim/health']) {
      assert.ok(!(await (await r.call(path)).text()).includes(KEY), path)
    }
    assert.ok(!(await (await r.call('/v1/nothing')).text()).includes(KEY))
    assert.equal((await r.call('/v1/nothing')).status, 404)
  })
  it('turns a broken request into a plain error without details', async () => {
    const r = await rig()
    const res = await fetch(`${r.url}/v1/directives`, { method: 'POST', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: '{not json' })
    assert.equal(res.status, 400)
    assert.equal((await r.call('/v1/directives', { body: { text: '' } })).status, 400)
    assert.equal((await r.call('/v1/directives', { body: { text: 'x'.repeat(4001) } })).status, 400)
    assert.equal((await r.call('/v1/directives', { body: { text: 'hi', priority: 'urgent' } })).status, 400)
    const big = await fetch(`${r.url}/v1/directives`, { method: 'POST', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(40_000) }) }).catch(() => null)
    assert.ok(big === null || big.status === 413)
  })
})

describe('a directive', () => {
  it('goes to Hermes with the key, streams its steps and ends with the answer', async () => {
    const r = await rig()
    const events = await listen(r)
    const res = await directive(r, { text: 'What is in the workspace?' })
    assert.equal(res.status, 202)
    const { directiveId } = (await res.json()) as { directiveId: string }
    await until(() => events.updates().some((u) => u.type === 'directive'))
    const updates = events.updates()
    const done = updates.find((u) => u.type === 'directive')!
    assert.deepEqual(done, { type: 'directive', directiveId, outcome: 'done', summary: 'The workspace has two folders.' })
    const steps = updates.filter((u): u is Extract<ShimUpdate, { type: 'step' }> => u.type === 'step').map((u) => u.step)
    const tool = steps.filter((s) => s.summary === 'Used terminal')
    assert.deepEqual(tool.map((s) => s.status), ['running', 'done'])
    assert.equal(tool[0]!.type, 'shell')
    assert.equal(tool[0]!.input, '{"command":"ls /workspace"}')
    const asked = steps.filter((s) => s.summary === 'Asked Hermes')
    assert.deepEqual(asked.map((s) => s.status), ['running', 'done'])
    const messages = updates.filter((u): u is Extract<ShimUpdate, { type: 'message' }> => u.type === 'message').map((u) => u.message)
    assert.deepEqual(messages.map((m) => [m.role, m.via]), [['user', 'junos'], ['agent', 'junos']])
    const chat = r.hermes.seen.find((s) => s.path === '/v1/chat/completions')!
    assert.equal(chat.auth, `Bearer ${KEY}`)
    assert.match(chat.body, /What is in the workspace\?/)
    const seqs = events.items.filter((i) => i.id !== undefined).map((i) => i.id!)
    assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b), 'events arrive in order')
    assert.equal(new Set(seqs).size, seqs.length)
    assert.equal(((await r.json<HermesStatus>('/v1/status')).state), 'idle')
  })
  it('reports working while Hermes is busy and queues the next one by priority', async () => {
    const r = await rig()
    r.hermes.mode = 'slow'
    await directive(r, { text: 'first' })
    await until(async () => (await r.json<HermesStatus>('/v1/status')).state === 'working')
    assert.equal((await r.json<HermesStatus>('/v1/status')).currentTask, 'first')
    await directive(r, { text: 'low one', priority: 'low' })
    await directive(r, { text: 'urgent one', priority: 'high' })
    await directive(r, { text: 'normal one' })
    const { queue } = await r.json<{ queue: HermesQueueItem[] }>('/v1/queue')
    assert.deepEqual(queue.map((q) => q.text), ['urgent one', 'normal one', 'low one'])
  })
  it('holds the queue while paused and goes on when resumed', async () => {
    const r = await rig()
    r.hermes.mode = 'plain'
    await r.call('/v1/pause', { body: {} })
    assert.equal((await r.json<HermesStatus>('/v1/status')).state, 'paused')
    await directive(r, { text: 'wait for me' })
    await sleep(150)
    assert.equal((await r.json<{ queue: HermesQueueItem[] }>('/v1/queue')).queue.length, 1)
    assert.ok(!r.hermes.seen.some((s) => s.path === '/v1/chat/completions'))
    await r.call('/v1/resume', { body: {} })
    await until(async () => (await r.json<{ messages: HermesMessage[] }>('/v1/recent')).messages.some((m) => m.text === 'You said: wait for me'))
    assert.equal((await r.json<{ queue: HermesQueueItem[] }>('/v1/queue')).queue.length, 0)
  })
  it('says so when Hermes fails, sends nothing, or cannot be reached', async () => {
    const r = await rig()
    for (const [mode, expect] of [['fail', /HTTP 500/], ['empty', /no answer/]] as const) {
      r.hermes.mode = mode
      const { directiveId } = (await (await directive(r, { text: mode })).json()) as { directiveId: string }
      await until(async () => (await r.json<{ messages: HermesMessage[] }>('/v1/recent')).messages.some((m) => m.directiveId === directiveId && m.role === 'agent'))
      const reply = (await r.json<{ messages: HermesMessage[] }>('/v1/recent')).messages.find((m) => m.directiveId === directiveId && m.role === 'agent')!
      assert.match(reply.text, /^That failed:/)
      assert.match(reply.text, expect)
    }
    await r.hermes.close()
    const status = await r.json<HermesStatus>('/v1/status')
    assert.equal(status.state, 'unreachable')
    assert.match(status.reason ?? '', /did not answer/)
    const spare = await fakeHermes()
    cleanups.push(() => spare.close())
  })
  it('stops: closes the request, empties the queue, and admits it cannot see inside Hermes', async () => {
    const r = await rig()
    r.hermes.mode = 'slow'
    const events = await listen(r)
    await directive(r, { text: 'long job' })
    await until(async () => (await r.json<HermesStatus>('/v1/status')).state === 'working')
    await directive(r, { text: 'queued job' })
    const stopped = await (await r.call('/v1/stop', { body: {} })).json()
    assert.deepEqual(stopped, { confirmed: false })
    await until(() => events.updates().some((u) => u.type === 'directive'))
    assert.equal((events.updates().find((u) => u.type === 'directive') as { outcome: string }).outcome, 'stopped')
    assert.equal((await r.json<{ queue: HermesQueueItem[] }>('/v1/queue')).queue.length, 0)
    assert.equal((await r.json<HermesStatus>('/v1/status')).state, 'idle')
    // With nothing running the stop is simply confirmed.
    assert.deepEqual(await (await r.call('/v1/stop', { body: {} })).json(), { confirmed: true })
  })
  it('tells Hermes which skills are off and, when asked, to answer on Telegram', async () => {
    const r = await rig()
    r.hermes.mode = 'plain'
    mkdirSync(join(r.skillsDir, 'web-search'), { recursive: true })
    writeFileSync(join(r.skillsDir, 'web-search', 'SKILL.md'), '---\nname: Web search\ndescription: Look things up.\n---\nBody')
    await r.call('/v1/skills', { method: 'PUT', body: { skills: [{ id: 'web-search', enabled: false }] } })
    await directive(r, { text: 'plain question', echoToTelegram: true })
    await until(() => r.hermes.seen.some((s) => s.path === '/v1/chat/completions'))
    const body = JSON.parse(r.hermes.seen.find((s) => s.path === '/v1/chat/completions')!.body) as { messages: Array<{ content: string }> }
    const prompt = body.messages[0]!.content
    assert.match(prompt, /do not use them: Web search/)
    assert.match(prompt, /send your final answer to the owner on Telegram/)
    assert.match(prompt, /plain question$/)
    await directive(r, { text: 'second' })
    await until(() => r.hermes.seen.filter((s) => s.path === '/v1/chat/completions').length === 2)
    const second = JSON.parse(r.hermes.seen.filter((s) => s.path === '/v1/chat/completions')[1]!.body) as { messages: Array<{ content: string }> }
    assert.ok(!/Telegram/.test(second.messages[0]!.content), 'the echo applies to one directive only')
  })
})

describe('Hermes health check', () => {
  it('asks without the key first, retries once with it when refused, and remembers', async () => {
    const hermes = await fakeHermes()
    cleanups.push(() => hermes.close())
    hermes.guardHealth = true
    const r = await rig({ hermes })
    const status = await r.json<HermesStatus>('/v1/status')
    assert.equal(status.state, 'idle')
    assert.equal(status.model, 'hermes-agent')
    const healthCalls = hermes.seen.filter((s) => s.path === '/health')
    assert.deepEqual(healthCalls.map((s) => s.auth), [undefined, `Bearer ${KEY}`])
    await r.json<HermesStatus>('/v1/status')
    assert.deepEqual(hermes.seen.filter((s) => s.path === '/health').slice(2).map((s) => s.auth), [`Bearer ${KEY}`], 'the next check goes straight to the key')
  })
  it('does not send the key to /health when Hermes does not ask for it', async () => {
    const r = await rig()
    await r.json<HermesStatus>('/v1/status')
    assert.deepEqual(r.hermes.seen.filter((s) => s.path === '/health').map((s) => s.auth), [undefined])
  })
})

describe('approvals', () => {
  const ask = { class: 'external-send', target: 'mia@example.com', summary: 'Send the weekly summary', type: 'api', input: 'POST /send' }
  const hook = (r: Rig, body: unknown) => r.call('/v1/hooks/approval', { body })

  it('holds a step until junosd answers, and tells Hermes the answer', async () => {
    const r = await rig()
    const events = await listen(r)
    const pending = hook(r, ask)
    await until(() => events.updates().some((u) => u.type === 'step' && u.step.status === 'waiting_approval'))
    const waiting = events.updates().find((u) => u.type === 'step' && u.step.status === 'waiting_approval') as { step: HermesStep }
    assert.deepEqual(waiting.step.approval, { class: 'external-send', target: 'mia@example.com', summary: 'Send the weekly summary' })
    assert.equal((await r.json<{ steps: HermesStep[] }>('/v1/recent')).steps[0]!.status, 'waiting_approval')
    assert.equal((await r.call(`/v1/steps/${waiting.step.id}/decision`, { body: { decision: 'approve' } })).status, 200)
    const answer = (await (await pending).json()) as { stepId: string; decision: string }
    assert.deepEqual(answer, { stepId: waiting.step.id, decision: 'approve' })
    await until(() => events.updates().some((u) => u.type === 'step' && u.step.id === waiting.step.id && u.step.status === 'done'))
    const settled = events.updates().filter((u) => u.type === 'step' && u.step.id === waiting.step.id).at(-1) as { step: HermesStep }
    assert.equal(settled.step.approval, undefined)
    assert.match(settled.step.output, /Approved in JunOS/)
  })
  it('lets the first answer win, from JunOS or from Telegram', async () => {
    const r = await rig()
    const events = await listen(r)
    const pending = hook(r, ask)
    await until(() => events.updates().some((u) => u.type === 'step'))
    const id = (events.updates().find((u) => u.type === 'step') as { step: HermesStep }).step.id
    assert.equal((await r.call(`/v1/hooks/approval/${id}/resolve`, { body: { decision: 'deny', via: 'telegram' } })).status, 200)
    assert.equal(((await (await pending).json()) as { decision: string }).decision, 'deny')
    const late = await r.call(`/v1/steps/${id}/decision`, { body: { decision: 'approve' } })
    assert.equal(late.status, 409)
    assert.match(((await late.json()) as { message: string }).message, /may already be answered/)
    const settled = events.updates().filter((u) => u.type === 'step' && u.step.id === id).at(-1) as { step: HermesStep }
    assert.equal(settled.step.status, 'denied')
    assert.match(settled.step.output, /Denied on Telegram/)
  })
  it('denies a step nobody answers in time', async () => {
    const r = await rig({ deps: { approvalTimeoutMs: 80 } })
    const answer = (await (await hook(r, ask)).json()) as { decision: string }
    assert.equal(answer.decision, 'deny')
    const step = (await r.json<{ steps: HermesStep[] }>('/v1/recent')).steps[0]!
    assert.equal(step.status, 'denied')
    assert.match(step.output, /No answer in time/)
  })
  it('denies the step when Hermes gives up waiting', async () => {
    const r = await rig()
    const abort = new AbortController()
    const pending = r.call('/v1/hooks/approval', { body: ask, headers: {} }).catch(() => null)
    void pending
    const res = fetch(`${r.url}/v1/hooks/approval`, { method: 'POST', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(ask), signal: abort.signal }).catch(() => null)
    await until(async () => (await r.json<{ steps: HermesStep[] }>('/v1/recent')).steps.length >= 2)
    abort.abort()
    await res
    await until(async () => (await r.json<{ steps: HermesStep[] }>('/v1/recent')).steps.filter((s) => s.status === 'waiting_approval').length === 1)
    // Stop denies the one still waiting.
    await r.call('/v1/stop', { body: {} })
    await until(async () => (await r.json<{ steps: HermesStep[] }>('/v1/recent')).steps.every((s) => s.status !== 'waiting_approval'))
  })
  it('refuses bad asks, and an answer for a step that is not waiting', async () => {
    const r = await rig()
    assert.equal((await hook(r, { ...ask, class: 'read' })).status, 400)
    assert.equal((await hook(r, { ...ask, class: 'banana' })).status, 400)
    assert.equal((await hook(r, { ...ask, summary: '  ' })).status, 400)
    assert.equal((await r.call('/v1/steps/00000000-0000-4000-8000-000000000000/decision', { body: { decision: 'approve' } })).status, 409)
    assert.equal((await r.call('/v1/steps/not-an-id/decision', { body: { decision: 'approve' } })).status, 404)
    assert.equal((await r.call('/v1/steps/00000000-0000-4000-8000-000000000000/decision', { body: { decision: 'maybe' } })).status, 400)
  })
  it('passes board requests and mirrored messages on, marked as they are', async () => {
    const r = await rig()
    const events = await listen(r)
    assert.equal((await r.call('/v1/hooks/kanban', { body: { kind: 'create', title: 'Look into X', body: 'because' } })).status, 200)
    assert.equal((await r.call('/v1/hooks/message', { body: { role: 'user', text: 'hello from my phone' } })).status, 200)
    assert.equal((await r.call('/v1/hooks/message', { body: { role: 'robot', text: 'x' } })).status, 400)
    await until(() => events.updates().length >= 2)
    assert.deepEqual(events.updates()[0], { type: 'kanban', action: { kind: 'create', title: 'Look into X', body: 'because' } })
    const message = (events.updates()[1] as { message: HermesMessage }).message
    assert.deepEqual([message.role, message.via, message.text], ['user', 'telegram', 'hello from my phone'])
  })
})

describe('the event stream', () => {
  it('resumes from the last event id, and says when the gap is too big', async () => {
    const r = await rig({ deps: { ringSize: 8 } })
    r.hermes.mode = 'plain'
    await directive(r, { text: 'one' })
    await until(async () => (await r.json<{ messages: HermesMessage[] }>('/v1/recent')).messages.length === 2)
    await directive(r, { text: 'two' })
    await until(async () => (await r.json<{ messages: HermesMessage[] }>('/v1/recent')).messages.length === 4)
    await sleep(100)
    const top = (await r.json<{ lastSeq: number }>('/v1/recent')).lastSeq
    const last = top - 2
    const caughtUp = await listen(r, last)
    await until(() => caughtUp.updates().length === 2)
    assert.ok(caughtUp.items.every((i) => i.event !== 'resync'))
    assert.ok(caughtUp.items.filter((i) => i.id !== undefined).every((i) => i.id! > last))
    const stale = await listen(r, 1)
    await until(() => stale.items.some((i) => i.event === 'resync'))
    assert.ok(typeof (stale.items.find((i) => i.event === 'resync')!.data as { lastSeq: number }).lastSeq === 'number')
    const ahead = await listen(r, 9999)
    await until(() => ahead.items.some((i) => i.event === 'resync'))
  })
})

describe('memory', () => {
  const put = (r: Rig, items: HermesMemoryItem[]) => r.call('/v1/memory', { method: 'PUT', body: { items } })
  const get = async (r: Rig) => (await r.json<{ items: HermesMemoryItem[] }>('/v1/memory')).items

  it('lists the bullet facts in Hermes’s files and nothing else', async () => {
    const r = await rig()
    assert.deepEqual(await get(r), [], 'a missing folder is just empty')
    mkdirSync(r.memoryDir, { recursive: true })
    writeFileSync(join(r.memoryDir, 'MEMORY.md'), '# Memory\n\nSome prose that is not a fact.\n- Jonas prefers short answers.\n* The repo is Sconie/junos.\n  - Indented fact\n')
    writeFileSync(join(r.memoryDir, 'notes.txt'), '- From a text file\n')
    writeFileSync(join(r.memoryDir, 'image.png'), '- not read')
    const items = await get(r)
    assert.deepEqual(items.map((i) => i.text), ['Jonas prefers short answers.', 'The repo is Sconie/junos.', 'Indented fact', 'From a text file'])
    assert.ok(items.every((i) => i.id.startsWith('m-') && !i.pinned))
  })
  it('keeps pins, adds notes of its own, and never edits what Hermes wrote', async () => {
    const r = await rig()
    mkdirSync(r.memoryDir, { recursive: true })
    const original = '- Hermes wrote this\n- And this\n'
    writeFileSync(join(r.memoryDir, 'MEMORY.md'), original)
    let items = await get(r)
    items[0]!.pinned = true
    items.push({ id: 'new-1', text: 'A note from JunOS', pinned: false })
    assert.equal((await put(r, items)).status, 200)
    items = await get(r)
    assert.deepEqual(items.map((i) => [i.text, i.pinned]), [['Hermes wrote this', true], ['And this', false], ['A note from JunOS', false]])
    assert.equal(readFileSync(join(r.memoryDir, 'MEMORY.md'), 'utf8'), original, 'Hermes’s file is untouched')
    assert.match(readFileSync(join(r.memoryDir, 'junos-notes.md'), 'utf8'), /- A note from JunOS/)
    // Edit and remove its own note.
    items = items.map((i) => (i.text === 'A note from JunOS' ? { ...i, text: 'Edited note' } : i))
    await put(r, items)
    assert.ok((await get(r)).some((i) => i.text === 'Edited note'))
    await put(r, (await get(r)).filter((i) => i.text !== 'Edited note'))
    assert.ok(!(await get(r)).some((i) => i.text === 'Edited note'))
  })
  it('refuses to rewrite or drop a fact Hermes wrote', async () => {
    const r = await rig()
    mkdirSync(r.memoryDir, { recursive: true })
    writeFileSync(join(r.memoryDir, 'MEMORY.md'), '- Hermes wrote this\n- And this\n')
    const items = await get(r)
    const edited = await put(r, [{ ...items[0]!, text: 'Changed' }, items[1]!])
    assert.equal(edited.status, 400)
    assert.match(((await edited.json()) as { message: string }).message, /Hermes wrote this memory/)
    const dropped = await put(r, [items[0]!])
    assert.equal(dropped.status, 400)
    assert.match(((await dropped.json()) as { message: string }).message, /cannot remove it/)
    assert.equal((await put(r, [{ id: 'x', text: '   ', pinned: false }, ...items])).status, 400)
    assert.equal((await r.call('/v1/memory', { method: 'PUT', body: { nope: 1 } })).status, 400)
    assert.equal((await get(r)).length, 2, 'nothing changed')
  })
  it('skips a link that could point outside the folder, and a file that is too big', async () => {
    const r = await rig()
    mkdirSync(r.memoryDir, { recursive: true })
    writeFileSync(join(r.dir, 'outside.md'), '- secret outside the folder\n')
    try {
      symlinkSync(join(r.dir, 'outside.md'), join(r.memoryDir, 'link.md'))
    } catch {
      /* creating a link needs a privilege on some systems */
    }
    writeFileSync(join(r.memoryDir, 'huge.md'), `- ${'x'.repeat(300_000)}\n`)
    writeFileSync(join(r.memoryDir, 'ok.md'), '- fine\n')
    assert.deepEqual((await get(r)).map((i) => i.text), ['fine'])
  })
})

describe('skills', () => {
  const put = (r: Rig, skills: Array<{ id: string; enabled: boolean }>) => r.call('/v1/skills', { method: 'PUT', body: { skills } })
  const skill = (r: Rig, rel: string, name: string, description: string) => {
    mkdirSync(join(r.skillsDir, rel), { recursive: true })
    writeFileSync(join(r.skillsDir, rel, 'SKILL.md'), `---\nname: ${name}\ndescription: "${description}"\n---\nbody`)
  }
  it('lists skills with a name and a description, one folder level deep', async () => {
    const r = await rig()
    skill(r, 'web-search', 'Web search', 'Look things up.')
    skill(r, 'devops/deploy', 'Deploy', 'Ship it.')
    mkdirSync(join(r.skillsDir, 'empty-folder'), { recursive: true })
    mkdirSync(join(r.skillsDir, '.hidden'), { recursive: true })
    writeFileSync(join(r.skillsDir, 'loose.md'), 'not a skill')
    const { skills } = await r.json<{ skills: HermesSkill[] }>('/v1/skills')
    assert.deepEqual(skills.map((s) => [s.id, s.name, s.description, s.enabled]), [['devops/deploy', 'Deploy', 'Ship it.', true], ['web-search', 'Web search', 'Look things up.', true]])
  })
  it('switches skills off and on, remembers it, and refuses an unknown one', async () => {
    const r = await rig()
    skill(r, 'web-search', 'Web search', 'Look things up.')
    const off = await put(r, [{ id: 'web-search', enabled: false }])
    assert.equal(((await off.json()) as { skills: HermesSkill[] }).skills[0]!.enabled, false)
    assert.equal((await r.json<{ skills: HermesSkill[] }>('/v1/skills')).skills[0]!.enabled, false)
    assert.deepEqual(JSON.parse(readFileSync(join(r.stateDir, 'skills.json'), 'utf8')), ['web-search'])
    await put(r, [{ id: 'web-search', enabled: true }])
    assert.equal((await r.json<{ skills: HermesSkill[] }>('/v1/skills')).skills[0]!.enabled, true)
    const bad = await put(r, [{ id: '../../etc', enabled: false }])
    assert.equal(bad.status, 400)
    assert.equal((await r.call('/v1/skills', { method: 'PUT', body: {} })).status, 400)
  })
})

describe('mirroring Telegram', () => {
  it('reads one log line the way Hermes might write it', () => {
    const m = parseLogLine('{"role":"user","text":"hi","via":"telegram","ts":"2026-10-25T10:00:00Z"}')
    assert.deepEqual(m, { role: 'user', text: 'hi', via: 'telegram', createdAt: '2026-10-25T10:00:00.000Z' })
    assert.equal(parseLogLine('{"role":"assistant","content":"hello","source":"Telegram"}')?.role, 'agent')
    assert.equal(parseLogLine('{"role":"agent","text":"x","platform":"telegram","timestamp":1792922400}')?.createdAt, '2026-10-25T10:00:00.000Z')
    for (const line of ['{"role":"user","text":"from the api","via":"api"}', '{"role":"tool","text":"x","via":"telegram"}', '{"role":"user","text":"   ","via":"telegram"}', 'not json', '[1,2]', '{"text":"no role","via":"telegram"}']) {
      assert.equal(parseLogLine(line), null, line)
    }
  })
  it('follows the file from the end, waits for a finished line, and survives rotation', async () => {
    const r = await rig({ withLog: true, deps: { logPollMs: 20 } })
    const events = await listen(r)
    writeFileSync(r.logFile, '{"role":"user","text":"old history","via":"telegram"}\n')
    await sleep(120)
    appendFileSync(r.logFile, '{"role":"user","text":"from my phone","via":"telegram"}\n{"role":"user","text":"not from phone","via":"api"}\n{"role":"assistant","te')
    await until(() => events.updates().some((u) => u.type === 'message' && u.message.text === 'from my phone'))
    assert.ok(!events.updates().some((u) => u.type === 'message' && u.message.text === 'old history'), 'history before the shim started is not replayed')
    assert.ok(!events.updates().some((u) => u.type === 'message' && u.message.text === 'not from phone'))
    appendFileSync(r.logFile, 'xt":"on it","via":"telegram"}\n')
    await until(() => events.updates().some((u) => u.type === 'message' && u.message.text === 'on it'))
    // The log is rotated: a shorter file starts again from its beginning.
    writeFileSync(r.logFile, '{"role":"user","text":"after rotation","via":"telegram"}\n')
    await until(() => events.updates().some((u) => u.type === 'message' && u.message.text === 'after rotation'))
    const mirrored = events.updates().filter((u): u is Extract<ShimUpdate, { type: 'message' }> => u.type === 'message').map((u) => u.message)
    assert.ok(mirrored.every((m) => m.via === 'telegram'))
  })
})
