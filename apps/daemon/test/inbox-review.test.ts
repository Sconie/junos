import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { ActionResponse, ApprovalRecord, InboxResponse } from '@junos/shared'
import { FakeTelegram } from './fake-telegram.ts'
import { boot, fakeProviderEnv, tempHome, type BootOptions } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function until(cond: () => boolean | Promise<boolean>, ms = 6000, what = 'condition'): Promise<void> {
  const end = Date.now() + ms
  while (!(await cond())) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await sleep(25)
  }
}

const OWNER = 4242
const TOKEN = '123456:SECRET-bot-token'

async function setup(options: BootOptions = {}) {
  const { home, cleanup } = tempHome()
  const tg = new FakeTelegram(TOKEN)
  await tg.listen()
  cleanups.push(() => tg.close())
  const env = fakeProviderEnv({
    JUNOS_TELEGRAM_TOKEN: TOKEN,
    JUNOS_TELEGRAM_USER_ID: String(OWNER),
    JUNOS_TELEGRAM_API: tg.url,
    JUNOS_TELEGRAM_POLL_MS: '20',
    JUNOS_TELEGRAM_LONG_POLL_S: '0',
  })
  const d = await boot(home, { testTools: true, ...options, env })
  cleanups.push(cleanup, () => d.close())
  const b = await d.pair()
  const ask = async (tool: string, args: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    (await (await b.post('/api/actions', { tool, args, ...extra })).json()) as ActionResponse
  const approval = (id: string) => b.json<ApprovalRecord>(`/api/approvals/${id}`)
  const inbox = () => b.json<InboxResponse>('/api/inbox')
  return { d, b, tg, ask, approval, inbox }
}

const idOf = (r: ActionResponse) => (r as Extract<ActionResponse, { status: 'approval_required' }>).approvalId

describe('Telegram review findings', () => {
  it('never lets a single tap approve something risky, whatever the one-time code looks like', async () => {
    const { ask, tg, approval } = await setup()
    const N = 48 // with a 1-in-16 collision this would almost surely have hit one
    const ids: string[] = []
    for (let i = 0; i < N; i++) ids.push(idOf(await ask('test.send', { to: `user${i}@example.com` })))
    await until(() => tg.sent.length === N, 8000, 'all messages')
    for (const m of tg.sent) tg.press(OWNER, m.message_id, tg.button(m.message_id, 'Approve'))
    await until(() => tg.edits.filter((e) => /Are you sure\?/.test(e.text)).length === N, 8000, 'every confirmation')
    for (const id of ids) assert.equal((await approval(id)).status, 'pending', 'a first tap approves nothing')
  })

  it('uses stage markers that cannot be confused with the hex part of a code', async () => {
    const { ask, tg } = await setup()
    await ask('test.send', { to: 'a@example.com' })
    await until(() => tg.sent.length === 1)
    const m = tg.lastSent()
    const first = tg.button(m.message_id, 'Approve').split(':')[2]!
    assert.match(first, /^p[0-9a-f]+$/)
    tg.press(OWNER, m.message_id, tg.button(m.message_id, 'Approve'))
    await until(() => /Are you sure\?/.test(tg.textOf(m.message_id)))
    assert.match(tg.button(m.message_id, 'Yes, approve').split(':')[2]!, /^q[0-9a-f]+$/)
  })

  it('sends exactly one message per approval, even for a burst', async () => {
    const { ask, tg } = await setup()
    for (let round = 0; round < 3; round++) {
      const before = tg.sent.length
      await Promise.all(Array.from({ length: 6 }, (_, i) => ask('test.send', { to: `r${round}-${i}@example.com` })))
      await until(() => tg.sent.length === before + 6, 8000, 'the burst')
      await sleep(150) // time for any duplicate to show up
      assert.equal(tg.sent.length, before + 6, `round ${round}: no duplicates`)
    }
    const targets = tg.sent.map((m) => m.text.split('\n')[1])
    assert.equal(new Set(targets).size, targets.length, 'every approval got one message, not two')
  })

  it('takes the buttons off a message whose approval was settled while it was being sent', async () => {
    const { ask, tg, b } = await setup()
    tg.sendDelayMs = 250
    const id = idOf(await ask('test.send', { to: 'a@example.com' }))
    await b.post(`/api/approvals/${id}/deny`) // the Inbox answers before Telegram has even delivered
    await until(() => tg.sent.length === 1, 6000, 'the delayed message')
    await until(() => tg.edits.length === 1, 6000, 'the correcting edit')
    assert.match(tg.edits[0]!.text, /Resolved: denied in the Inbox/)
    assert.deepEqual(tg.edits[0]!.reply_markup?.inline_keyboard, [], 'no live buttons')
  })
})

describe('Inbox review findings', () => {
  it('wakes a snoozed item by itself and announces it, without anyone opening the Inbox', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { b, d } = await setup({ now: () => now, sweepMs: 40 })
    await b.post('/api/test/runs', { kind: 'fail' })
    await until(async () => (await b.json<InboxResponse>('/api/inbox')).items.length > 0, 6000, 'the failure item')
    const item = (await b.json<InboxResponse>('/api/inbox')).items[0]!
    const res = await b.post(`/api/inbox/${item.id}/action`, { action: 'snooze', until: new Date(now + 3600_000).toISOString() })
    assert.equal(res.status, 200)
    const seqBefore = d.store.lastSeq()
    now += 3600_000 + 1000
    // Only the daemon's own sweep can have done this: nothing reads the Inbox in between.
    await until(() => d.store.since(seqBefore).some((e) => e.type === 'inbox.item' && e.payload.action === 'woke'), 6000, 'the wake event')
  })

  it('keeps one item per approval even when two approvals share a digest', async () => {
    const { ask, inbox, approval } = await setup()
    const one = idOf(await ask('test.send', { to: 'a@example.com' }, { runId: 'run-1' }))
    const two = idOf(await ask('test.send', { to: 'a@example.com' }, { runId: 'run-2' }))
    assert.notEqual(one, two)
    const items = (await inbox()).items.filter((i) => i.kind === 'approval')
    assert.equal(items.length, 2, 'the later approval is not orphaned')
    assert.deepEqual(items.map((i) => i.refId).sort(), [one, two].sort())
    assert.ok(items.every((i) => i.approval?.status === 'pending'))
    assert.equal((await approval(two)).status, 'pending')
  })
})
