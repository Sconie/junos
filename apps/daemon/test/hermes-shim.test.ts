import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { ApprovalRecord, HermesOverview, HermesStep, InboxResponse } from '@junos/shared'
import { BridgeError, type BridgeUpdate } from '../src/hermes/bridge.ts'
import { ShimHermes } from '../src/hermes/shim.ts'
import { startShim } from '../../hermes-shim/src/server.ts'
import { KEY, fakeHermes, rig as makeRig, type Rig } from '../../hermes-shim/test/helpers.ts'
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

/** A real shim in front of a stand-in Hermes API, both on this machine. */
async function shim(options: Parameters<typeof makeRig>[0] = {}): Promise<Rig> {
  const r = await makeRig(options)
  cleanups.push(() => r.stop())
  return r
}
function bridge(r: Rig, key: string | undefined = KEY): ShimHermes {
  const b = new ShimHermes({ baseUrl: r.url, apiKey: key, reconnectMs: 30 })
  cleanups.push(() => b.close())
  return b
}

describe('the shim bridge', () => {
  it('refuses a public, password-carrying or non-web address', () => {
    for (const bad of ['https://example.com', 'http://187.126.6.144:8650', 'http://user:pw@127.0.0.1:8650', 'ftp://127.0.0.1', 'nonsense']) {
      assert.throws(() => new ShimHermes({ baseUrl: bad, apiKey: KEY }), BridgeError, bad)
    }
    assert.doesNotThrow(() => new ShimHermes({ baseUrl: 'http://100.109.251.72:8650', apiKey: KEY }))
  })

  it('carries status, a directive, its steps and the answer', async () => {
    const r = await shim()
    const b = bridge(r)
    const updates: BridgeUpdate[] = []
    b.subscribe((u) => updates.push(u))
    const status = await b.status()
    assert.deepEqual([status.state, status.model, status.reason], ['idle', 'hermes-agent', null])
    const { directiveId } = await b.sendDirective({ text: 'What is in the workspace?' })
    await until(() => updates.some((u) => u.type === 'directive'))
    assert.deepEqual(updates.find((u) => u.type === 'directive'), { type: 'directive', directiveId, outcome: 'done', summary: 'The workspace has two folders.' })
    assert.ok(updates.some((u) => u.type === 'step' && u.step.summary === 'Used terminal' && u.step.status === 'done'))
    const recent = await b.recent()
    assert.deepEqual(recent.messages.map((m) => m.role), ['user', 'agent'])
    assert.ok(recent.steps.length >= 2)
  })

  it('carries memory, skills, the queue, pause, resume and stop', async () => {
    const r = await shim()
    const b = bridge(r)
    const { mkdirSync, writeFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    mkdirSync(r.memoryDir, { recursive: true })
    writeFileSync(join(r.memoryDir, 'MEMORY.md'), '- Hermes remembers this\n')
    mkdirSync(join(r.skillsDir, 'browse'), { recursive: true })
    writeFileSync(join(r.skillsDir, 'browse', 'SKILL.md'), '---\nname: Browse\ndescription: Open pages.\n---\n')
    const memory = await b.memory()
    assert.equal(memory[0]!.text, 'Hermes remembers this')
    const saved = await b.setMemory([{ ...memory[0]!, pinned: true }, { id: 'n', text: 'My note', pinned: false }])
    assert.deepEqual(saved.map((m) => [m.text, m.pinned]), [['Hermes remembers this', true], ['My note', false]])
    await assert.rejects(b.setMemory([]), (e: BridgeError) => e.code === 'bad_request' && /cannot remove it/.test(e.message))
    assert.deepEqual((await b.setSkills([{ id: 'browse', enabled: false }])).map((s) => [s.id, s.enabled]), [['browse', false]])
    await assert.rejects(b.setSkills([{ id: 'nope', enabled: false }]), (e: BridgeError) => e.code === 'bad_request')
    await b.pause()
    assert.equal((await b.status()).state, 'paused')
    await b.sendDirective({ text: 'later' })
    assert.equal((await b.queue()).length, 1)
    await b.resume()
    await until(async () => (await b.queue()).length === 0 && (await b.status()).state === 'idle', 5000, 'the queued directive to finish')
    assert.deepEqual(await b.stop(), { confirmed: true })
  })

  it('answers an approval that Hermes is waiting on', async () => {
    const r = await shim()
    const b = bridge(r)
    const updates: BridgeUpdate[] = []
    b.subscribe((u) => updates.push(u))
    const hook = r.call('/v1/hooks/approval', { body: { class: 'destructive', target: '/workspace', summary: 'Delete the build folder' } })
    await until(() => updates.some((u) => u.type === 'step' && u.step.status === 'waiting_approval'))
    const step = (updates.find((u) => u.type === 'step' && u.step.status === 'waiting_approval') as { step: HermesStep }).step
    await b.decide(step.id, 'deny')
    assert.equal(((await (await hook).json()) as { decision: string }).decision, 'deny')
    await assert.rejects(b.decide(step.id, 'approve'), (e: BridgeError) => e.code === 'bad_request' && /already be answered/.test(e.message))
  })

  it('says what is wrong: a wrong key, an address that is not the shim, a shim that is down', async () => {
    const r = await shim()
    const wrong = await bridge(r, 'a-different-key-entirely').status()
    assert.equal(wrong.state, 'error')
    assert.match(wrong.reason ?? '', /did not accept the key/)
    assert.ok(!JSON.stringify(wrong).includes('a-different-key-entirely'))
    const notShim = new ShimHermes({ baseUrl: r.hermes.url, apiKey: KEY })
    const other = await notShim.status()
    assert.equal(other.state, 'error')
    assert.match(other.reason ?? '', /not the JunOS Hermes shim/)
    const down = bridge(r)
    await r.shim.close()
    const gone = await down.status()
    assert.equal(gone.state, 'unreachable')
    assert.match(gone.reason ?? '', /shim did not answer/)
    assert.deepEqual(await down.stop(), { confirmed: false }, 'a stop that could not be delivered is not confirmed')
    await assert.rejects(down.sendDirective({ text: 'hi' }), (e: BridgeError) => e.code === 'unreachable')
  })

  it('reconnects after the shim restarts and catches up from its recent steps', async () => {
    const hermes = await fakeHermes()
    cleanups.push(() => hermes.close())
    let r = await shim({ hermes })
    const port = r.shim.port
    const b = bridge(r)
    const updates: BridgeUpdate[] = []
    b.subscribe((u) => updates.push(u))
    await b.sendDirective({ text: 'before the restart' })
    await until(() => updates.some((u) => u.type === 'directive'))
    const seen = updates.length
    // The shim restarts on the same address with a fresh sequence: the old cursor is ahead of it.
    await r.shim.close()
    const second = await startShim({ ...r.config, port }, { heartbeatMs: 60_000 })
    cleanups.push(() => second.close())
    await sleep(100)
    await b.sendDirective({ text: 'after the restart' })
    await until(() => updates.slice(seen).some((u) => u.type === 'directive'), 10_000, 'the stream to come back')
    r = { ...r, shim: second }
    assert.ok(updates.slice(seen).some((u) => u.type === 'message' && u.message.text.includes('workspace')))
  })
})

describe('junosd with the shim', () => {
  async function daemon(r: Rig): Promise<{ d: TestDaemon; b: Browser }> {
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const d = await boot(tmp.home, { env: fakeProviderEnv({ JUNOS_HERMES_URL: r.url, JUNOS_HERMES_KEY: KEY, JUNOS_HERMES_PROTOCOL: 'shim' }), hermesPollMs: 100 })
    cleanups.push(() => d.close())
    return { d, b: await d.pair() }
  }
  const overview = (b: Browser) => b.json<HermesOverview>('/api/hermes')

  it('is chosen by JUNOS_HERMES_PROTOCOL=shim, shows Hermes’s steps, memory and skills, and keeps the key out of everything', async () => {
    const r = await shim()
    const { mkdirSync, writeFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    mkdirSync(r.memoryDir, { recursive: true })
    writeFileSync(join(r.memoryDir, 'MEMORY.md'), '- Jonas prefers short answers.\n')
    const { b, d } = await daemon(r)
    await until(async () => (await overview(b)).status.model === 'hermes-agent', 5000, 'the shim to answer')
    assert.deepEqual([(await overview(b)).mode, (await overview(b)).status.state], ['remote', 'idle'])
    assert.equal((await b.post('/api/hermes/directives', { text: 'What is in the workspace?' })).status, 202)
    await until(async () => (await overview(b)).messages.some((m) => m.role === 'agent'), 5000, 'the answer')
    const o = await overview(b)
    assert.ok(o.steps.some((s) => s.summary === 'Used terminal' && s.status === 'done'))
    assert.equal(o.messages.find((m) => m.role === 'agent')!.text, 'The workspace has two folders.')
    const memory = await b.json<{ items: Array<{ text: string }> }>('/api/hermes/memory')
    assert.deepEqual(memory.items.map((i) => i.text), ['Jonas prefers short answers.'])
    const everything = JSON.stringify(o) + JSON.stringify(d.store.since(0)) + JSON.stringify(d.store.db.prepare('SELECT json FROM hermes_message').all())
    assert.equal(everything.includes(KEY), false)
  })

  it('turns a step Hermes is waiting on into an Inbox approval, and the answer reaches Hermes', async () => {
    const r = await shim()
    const { b } = await daemon(r)
    await until(async () => (await overview(b)).status.state === 'idle', 5000, 'the shim to answer')
    const hook = r.call('/v1/hooks/approval', { body: { class: 'external-send', target: 'mia@example.com', summary: 'Send the weekly summary', type: 'api' } })
    await until(async () => (await overview(b)).steps.some((s) => s.status === 'waiting_approval' && s.approvalId), 5000, 'the approval')
    const step = (await overview(b)).steps.find((s) => s.status === 'waiting_approval')!
    const approval = await b.json<ApprovalRecord>(`/api/approvals/${step.approvalId}`)
    assert.deepEqual([approval.tool, approval.class, approval.actor, approval.target], ['hermes.external-send', 'external-send', 'hermes', 'mia@example.com'])
    assert.ok((await b.json<InboxResponse>('/api/inbox')).items.some((i) => i.kind === 'approval' && i.refId === approval.id))
    assert.equal((await b.post(`/api/approvals/${approval.id}/approve`)).status, 200)
    assert.equal(((await (await hook).json()) as { decision: string }).decision, 'approve')
    await until(async () => (await overview(b)).steps.find((s) => s.id === step.id)?.status === 'done', 5000, 'the step to finish')
  })

  it('shows what is wrong in plain words when the key is wrong', async () => {
    const r = await shim()
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const d = await boot(tmp.home, { env: fakeProviderEnv({ JUNOS_HERMES_URL: r.url, JUNOS_HERMES_KEY: 'not-the-right-key-xxxx', JUNOS_HERMES_PROTOCOL: 'shim' }), hermesPollMs: 100 })
    cleanups.push(() => d.close())
    const b = await d.pair()
    await until(async () => (await overview(b)).status.state === 'error', 5000, 'the error')
    const o = await overview(b)
    assert.match(o.status.reason ?? '', /did not accept the key/)
    assert.doesNotMatch(JSON.stringify(o), /not-the-right-key/)
  })
})
