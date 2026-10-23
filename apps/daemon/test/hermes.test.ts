import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { ApprovalRecord, HermesMemoryItem, HermesOverview, HermesSkill, InboxResponse, WorkflowValidation } from '@junos/shared'
import { MockHermes, type MockOptions } from '../src/hermes/mock.ts'
import { Browser, boot, tempHome, type BootOptions, type TestDaemon } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function until(cond: () => boolean | Promise<boolean>, ms = 8000, what = 'condition'): Promise<void> {
  const end = Date.now() + ms
  while (!(await cond())) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await sleep(20)
  }
}

interface Ctx {
  home: string
  d: TestDaemon
  b: Browser
  mock: MockHermes
  clock: { now: number }
  close(): Promise<void>
  overview(): Promise<HermesOverview>
  say(text: string, extra?: Record<string, unknown>): Promise<Response>
  inbox(): Promise<InboxResponse>
}

async function daemon(options: BootOptions & { mock?: MockOptions; home?: string; bridge?: MockHermes } = {}): Promise<Ctx> {
  const owned = options.home ? null : tempHome()
  const home = options.home ?? owned!.home
  if (owned) cleanups.push(owned.cleanup)
  const clock = { now: Date.now() }
  const mock = options.bridge ?? new MockHermes({ stepMs: 25, ...options.mock })
  const d = await boot(home, { ...options, hermes: mock, now: options.approvalTtlMs ? () => clock.now : undefined })
  let closed = false
  const close = async () => {
    if (!closed) {
      closed = true
      await d.close()
    }
  }
  cleanups.push(close)
  const b = await d.pair()
  return {
    home,
    d,
    b,
    mock,
    clock,
    close,
    overview: () => b.json<HermesOverview>('/api/hermes'),
    say: (text, extra = {}) => b.post('/api/hermes/directives', { text, ...extra }),
    inbox: () => b.json<InboxResponse>('/api/inbox'),
  }
}

const replies = (o: HermesOverview) => o.messages.filter((m) => m.role === 'agent').map((m) => m.text)

describe('with no Hermes connected', () => {
  it('says so, and refuses what needs an agent', async () => {
    const owned = tempHome()
    cleanups.push(owned.cleanup)
    const d = await boot(owned.home)
    cleanups.push(() => d.close())
    const b = await d.pair()
    const o = await b.json<HermesOverview>('/api/hermes')
    assert.equal(o.mode, 'none')
    assert.equal(o.status.state, 'unreachable')
    assert.match(o.reason!, /not connected/)
    for (const [path, body] of [
      ['/api/hermes/directives', { text: 'hello' }],
      ['/api/hermes/pause', {}],
      ['/api/hermes/resume', {}],
    ] as const) {
      const res = await b.post(path, body)
      assert.equal(res.status, 503, path)
      assert.equal(((await res.json()) as { error: string }).error, 'not_connected')
    }
    assert.deepEqual(await b.json('/api/hermes/memory'), { items: [] })
  })

  it('needs a paired browser', async () => {
    const { d } = await daemon()
    assert.equal((await d.browser().get('/api/hermes')).status, 401)
    assert.equal((await d.browser().post('/api/hermes/directives', { text: 'x' })).status, 401)
  })
})

describe('the console against the mock', () => {
  it('shows status, then the live steps and the reply for a directive', async () => {
    const { d, say, overview } = await daemon()
    const first = await overview()
    assert.equal(first.mode, 'mock')
    assert.equal(first.status.state, 'idle')
    assert.equal(first.status.model, 'hermes-mock')
    assert.equal(first.status.currentTask, null)

    const res = await say('write the notes')
    assert.equal(res.status, 202)
    assert.ok(((await res.json()) as { directiveId: string }).directiveId)
    await until(async () => (await overview()).status.state === 'working', 3000, 'working')
    assert.equal((await overview()).status.currentTask, 'write the notes')
    await until(async () => replies(await overview()).includes('Done: write the notes'), 5000, 'the reply')
    const done = await overview()
    assert.equal(done.status.state, 'idle')
    assert.deepEqual(done.steps.map((s) => [s.type, s.summary, s.status]), [
      ['message', 'Reading the request', 'done'],
      ['shell', 'List the workspace', 'done'],
      ['file', 'Write notes.md', 'done'],
    ])
    assert.ok(done.steps.every((s) => typeof s.ms === 'number' && s.ms > 0))
    assert.equal(done.messages[0]!.role, 'user')
    assert.equal(done.messages[0]!.via, 'junos')
    // The UI follows the event stream: steps and messages are events.
    const types = new Set(d.store.since(0).map((e) => e.type))
    assert.ok(types.has('hermes.step') && types.has('hermes.message') && types.has('hermes.status'))
  })

  it('keeps its history across a restart', async () => {
    const first = await daemon()
    await first.say('write the notes')
    await until(async () => replies(await first.overview()).length === 1, 5000, 'the reply')
    await first.close()
    const second = await daemon({ home: first.home })
    const o = await second.overview()
    assert.equal(o.steps.length, 3)
    assert.deepEqual(replies(o), ['Done: write the notes'])
  })

  it('queues directives while busy, highest priority first', async () => {
    const { say, overview, b } = await daemon()
    await say('a slow job')
    await until(async () => (await overview()).status.state === 'working', 3000, 'working')
    await say('low one', { priority: 'low' })
    await say('normal one')
    await say('urgent one', { priority: 'high' })
    const queue = (await overview()).queue
    assert.deepEqual(queue.map((q) => q.text), ['urgent one', 'normal one', 'low one'])
    assert.deepEqual(queue.map((q) => q.priority), ['high', 'normal', 'low'])
    await b.post('/api/hermes/stop')
    await until(async () => (await overview()).queue.length === 0 && (await overview()).status.state === 'idle', 5000, 'idle')
  })

  it('refuses an empty or oversized directive', async () => {
    const { say } = await daemon()
    assert.equal((await say('   ')).status, 400)
    assert.equal((await say('x'.repeat(4001))).status, 400)
  })

  it('pauses and resumes: directives wait while paused and run after', async () => {
    const { b, say, overview } = await daemon()
    assert.equal((await b.post('/api/hermes/pause')).status, 200)
    assert.equal((await overview()).status.state, 'paused')
    await say('write the notes')
    await sleep(150)
    let o = await overview()
    assert.equal(o.queue.length, 1)
    assert.equal(o.steps.length, 0)
    await b.post('/api/hermes/resume')
    await until(async () => replies(await overview()).length === 1, 5000, 'the reply after resume')
    o = await overview()
    assert.equal(o.queue.length, 0)
    assert.equal(o.status.state, 'idle')
  })

  it('mirrors a Telegram conversation with a badge', async () => {
    const { mock, overview } = await daemon()
    mock.simulateTelegram('how is the build?', 'It passes.')
    await until(async () => (await overview()).messages.length === 2, 3000, 'mirrored messages')
    const o = await overview()
    assert.deepEqual(o.messages.map((m) => [m.role, m.via, m.text]), [
      ['user', 'telegram', 'how is the build?'],
      ['agent', 'telegram', 'It passes.'],
    ])
  })
})

describe('Stop', () => {
  it('halts the running work within a few seconds and says what stopped', async () => {
    const { b, say, overview } = await daemon()
    await say('a slow job')
    await until(async () => (await overview()).steps.some((s) => s.summary.startsWith('Long task')), 3000, 'a running step')
    const started = Date.now()
    const res = await b.post('/api/hermes/stop')
    assert.deepEqual(await res.json(), { confirmed: true })
    await until(async () => (await overview()).status.state === 'idle', 3000, 'idle')
    assert.ok(Date.now() - started < 3000)
    const o = await overview()
    assert.ok(o.steps.some((s) => s.status === 'stopped'))
    assert.equal(replies(o).at(-1), 'Stopped.')
    assert.equal(o.stopUnconfirmed, false)
  })

  it('does not claim success when Hermes cannot confirm, and raises it in the Inbox', async () => {
    const { b, say, overview, inbox } = await daemon({ mock: { stopConfirmed: false } })
    await say('a slow job')
    await until(async () => (await overview()).status.state === 'working', 3000, 'working')
    const res = await b.post('/api/hermes/stop')
    assert.deepEqual(await res.json(), { confirmed: false })
    const o = await overview()
    assert.equal(o.stopUnconfirmed, true)
    const item = (await inbox()).items.find((i) => i.title === 'Hermes stop not confirmed')
    assert.ok(item)
    assert.equal(item!.priority, 'urgent')
    await b.post('/api/hermes/resume')
    assert.equal((await overview()).stopUnconfirmed, false)
  })

  it('is unconfirmed when the agent cannot be reached at all', async () => {
    const { b, mock, overview } = await daemon()
    mock.setReachable(false)
    const res = await b.post('/api/hermes/stop')
    assert.deepEqual(await res.json(), { confirmed: false })
    assert.equal((await overview()).stopUnconfirmed, true)
  })

  it('is part of the global Stop, which also refuses new directives until resumed', async () => {
    const { b, say, overview } = await daemon()
    await say('a slow job')
    await until(async () => (await overview()).status.state === 'working', 3000, 'working')
    await b.post('/api/stop')
    await until(async () => (await overview()).status.state === 'idle', 4000, 'Hermes to stop with everything else')
    const refused = await say('write the notes')
    assert.equal(refused.status, 409)
    assert.equal(((await refused.json()) as { error: string }).error, 'paused')
    await b.post('/api/resume')
    assert.equal((await say('write the notes')).status, 202)
  })
})

describe('approvals', () => {
  const waiting = async (c: Ctx) => {
    await until(async () => (await c.overview()).steps.some((s) => s.status === 'waiting_approval' && s.approvalId), 5000, 'a step waiting with its approval')
    const step = (await c.overview()).steps.find((s) => s.status === 'waiting_approval')!
    return { step, approval: await c.b.json<ApprovalRecord>(`/api/approvals/${step.approvalId}`) }
  }

  it('holds a step that needs a yes, shows it in the Inbox, and goes on once it is approved', async () => {
    const c = await daemon()
    await c.say('send the report')
    const { step, approval } = await waiting(c)
    assert.equal(approval.tool, 'hermes.external-send')
    assert.equal(approval.class, 'external-send')
    assert.equal(approval.actor, 'hermes')
    assert.equal(approval.target, 'someone@example.com')
    assert.equal(approval.irreversible, true)
    assert.equal((approval.args as { summary: string }).summary, 'Send the drafted message')
    const item = (await c.inbox()).items.find((i) => i.kind === 'approval' && i.refId === approval.id)
    assert.ok(item, 'the same approval is in the Inbox')
    // It stays held until someone answers.
    await sleep(150)
    assert.equal((await c.overview()).steps.find((s) => s.id === step.id)!.status, 'waiting_approval')
    assert.equal((await c.overview()).status.state, 'working')

    assert.equal((await c.b.post(`/api/approvals/${approval.id}/approve`)).status, 200)
    await until(async () => replies(await c.overview()).includes('Sent it.'), 5000, 'the step to go on')
    const done = (await c.overview()).steps.find((s) => s.id === step.id)!
    assert.equal(done.status, 'done')
    assert.equal((await c.b.json<ApprovalRecord>(`/api/approvals/${approval.id}`)).status, 'consumed')
  })

  it('does not send when the approval is denied', async () => {
    const c = await daemon()
    await c.say('send the report')
    const { step, approval } = await waiting(c)
    await c.b.post(`/api/approvals/${approval.id}/deny`)
    await until(async () => replies(await c.overview()).includes('Understood, I did not send it.'), 5000, 'the denial to reach Hermes')
    assert.equal((await c.overview()).steps.find((s) => s.id === step.id)!.status, 'denied')
  })

  it('treats an unanswered approval as a no once it expires', async () => {
    const c = await daemon({ approvalTtlMs: 60_000, sweepMs: 30 })
    await c.say('send the report')
    const { step } = await waiting(c)
    c.clock.now += 61_000
    await until(async () => (await c.overview()).steps.find((s) => s.id === step.id)!.status === 'denied', 5000, 'the step to be denied')
    assert.ok(replies(await c.overview()).includes('Understood, I did not send it.'))
  })

  it('withdraws the approval when everything is stopped', async () => {
    const c = await daemon()
    await c.say('send the report')
    const { step, approval } = await waiting(c)
    await c.b.post('/api/stop')
    await until(async () => (await c.overview()).steps.find((s) => s.id === step.id)!.status === 'stopped', 5000, 'the step to stop')
    assert.equal((await c.b.json<ApprovalRecord>(`/api/approvals/${approval.id}`)).status, 'denied')
    // The withdrawn approval cannot be answered afterwards.
    assert.equal((await c.b.post(`/api/approvals/${approval.id}/approve`)).status, 409)
  })

  it('binds the approval to that one step', async () => {
    const c = await daemon()
    await c.say('send the report')
    const { approval } = await waiting(c)
    await c.b.post(`/api/approvals/${approval.id}/approve`)
    const args = approval.args as { step: string; summary: string }
    const replay = await c.b.post('/api/actions', { tool: 'hermes.external-send', args: { ...args, target: 'someone@example.com' }, approvalId: approval.id, runId: `hermes:${args.step}` })
    // Already spent by the daemon's own release: a second use is refused.
    assert.notEqual(((await replay.json()) as { status: string }).status, 'executed')
  })

  it('is not something a workflow can call', async () => {
    const { b } = await daemon()
    const res = await b.post('/api/workflows/validate', { yaml: 'version: 1\nname: x\nsteps:\n  - id: a\n    type: tool\n    tool: hermes.external-send\n' })
    const verdict = (await res.json()) as WorkflowValidation
    assert.equal(verdict.valid, false)
    assert.match(verdict.errors.join(' '), /unknown tool "hermes.external-send"/)
  })
})

describe('memory and skills', () => {
  it('lists, edits, pins and adds memory', async () => {
    const { b } = await daemon()
    const first = (await b.json<{ items: HermesMemoryItem[] }>('/api/hermes/memory')).items
    assert.equal(first.length, 2)
    const next = [{ ...first[1]!, pinned: true }, { text: '  Prefers tea.  ', pinned: false }]
    const res = await b.request('/api/hermes/memory', { method: 'PUT', body: { items: next } })
    assert.equal(res.status, 200)
    const saved = ((await res.json()) as { items: HermesMemoryItem[] }).items
    assert.equal(saved.length, 2)
    assert.equal(saved[0]!.pinned, true)
    assert.equal(saved[1]!.text, 'Prefers tea.')
    assert.match(saved[1]!.id, /^mem-/)
    assert.deepEqual((await b.json<{ items: HermesMemoryItem[] }>('/api/hermes/memory')).items, saved)
  })

  it('refuses bad memory', async () => {
    const { b } = await daemon()
    const put = async (items: unknown) => (await b.request('/api/hermes/memory', { method: 'PUT', body: { items } })).status
    assert.equal(await put([{ text: '   ', pinned: false }]), 400)
    assert.equal(await put([{ text: 'x'.repeat(501) }]), 400)
    assert.equal(await put([{ id: 'a', text: 'one' }, { id: 'a', text: 'two' }]), 400)
    assert.equal(await put([{ text: 'x', pinned: 'yes' }]), 400)
    assert.equal(await put('nope'), 400)
    assert.equal(await put(Array.from({ length: 201 }, (_, i) => ({ text: `m${i}` }))), 400)
    assert.equal((await b.json<{ items: unknown[] }>('/api/hermes/memory')).items.length, 2, 'nothing was changed')
  })

  it('toggles skills and refuses an unknown one', async () => {
    const { b } = await daemon()
    const res = await b.request('/api/hermes/skills', { method: 'PUT', body: { skills: [{ id: 'mail', enabled: true }, { id: 'shell', enabled: false }] } })
    const skills = ((await res.json()) as { skills: HermesSkill[] }).skills
    assert.equal(skills.find((s) => s.id === 'mail')!.enabled, true)
    assert.equal(skills.find((s) => s.id === 'shell')!.enabled, false)
    assert.equal((await b.request('/api/hermes/skills', { method: 'PUT', body: { skills: [{ id: 'teleport', enabled: true }] } })).status, 400)
    assert.equal((await b.request('/api/hermes/skills', { method: 'PUT', body: { skills: [{ id: 'mail' }] } })).status, 400)
  })
})

describe('when Hermes cannot be reached', () => {
  it('shows unreachable (not error), refuses directives, and recovers by itself', async () => {
    const { b, mock, say, overview } = await daemon()
    assert.equal((await overview()).status.state, 'idle')
    mock.setReachable(false)
    await until(async () => (await overview()).status.state === 'unreachable', 3000, 'unreachable')
    assert.match((await overview()).status.reason!, /unreachable/)
    const refused = await say('write the notes')
    assert.equal(refused.status, 503)
    assert.equal(((await refused.json()) as { error: string }).error, 'unreachable')
    assert.equal((await b.get('/api/hermes/memory')).status, 503)
    mock.setReachable(true)
    await until(async () => (await overview()).status.state === 'idle', 3000, 'recovery')
    assert.equal((await say('write the notes')).status, 202)
  })
})
