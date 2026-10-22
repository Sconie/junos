import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { ActionResponse, ApprovalRecord, InboxItem, InboxResponse, TelegramStatus } from '@junos/shared'
import { FakeTelegram } from './fake-telegram.ts'
import { boot, fakeProviderEnv, tempHome, type BootOptions } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function until(cond: () => boolean | Promise<boolean>, ms = 4000, what = 'condition'): Promise<void> {
  const end = Date.now() + ms
  while (!(await cond())) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await sleep(25)
  }
}

const OWNER = 4242
const TOKEN = '123456:SECRET-bot-token'

async function setup(options: BootOptions & { env?: Record<string, string>; telegram?: boolean } = {}) {
  const { home, cleanup } = tempHome()
  let tg: FakeTelegram | undefined
  const env: Record<string, string> = { ...options.env }
  if (options.telegram) {
    tg = new FakeTelegram(TOKEN)
    await tg.listen()
    cleanups.push(() => tg!.close())
    Object.assign(env, {
      JUNOS_TELEGRAM_TOKEN: TOKEN,
      JUNOS_TELEGRAM_USER_ID: String(OWNER),
      JUNOS_TELEGRAM_API: tg.url,
      JUNOS_TELEGRAM_POLL_MS: '20',
      JUNOS_TELEGRAM_LONG_POLL_S: '0',
    })
  }
  const d = await boot(home, { testTools: true, ...options, env: fakeProviderEnv(env) })
  cleanups.push(cleanup, () => d.close())
  const b = await d.pair()
  const inbox = (query = '') => b.json<InboxResponse>(`/api/inbox${query}`)
  const ask = async (tool: string, args: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
    const res = await b.post('/api/actions', { tool, args, ...extra })
    return (await res.json()) as ActionResponse
  }
  const approvalOf = async (id: string) => b.json<ApprovalRecord>(`/api/approvals/${id}`)
  const decide = (id: string, verb: 'approve' | 'deny') => b.post(`/api/approvals/${id}/${verb}`)
  const effects = async () => (await b.json<{ effects: unknown[] }>('/api/gateway/test-effects')).effects
  return { home, d, b, tg, inbox, ask, approvalOf, decide, effects }
}

const approvalId = (r: ActionResponse) => (r as Extract<ActionResponse, { status: 'approval_required' }>).approvalId

describe('Inbox', () => {
  it('shows an approval as an urgent item with the live approval record', async () => {
    const { ask, inbox } = await setup()
    const r = await ask('test.send', { to: 'a@example.com', body: 'hi' })
    const { items, counts } = await inbox()
    assert.equal(items.length, 1)
    const item = items[0]!
    assert.deepEqual([item.kind, item.priority, item.status, item.refId], ['approval', 'urgent', 'new', approvalId(r)])
    assert.match(item.title, /test\.send/)
    assert.equal(item.approval?.target, 'a@example.com')
    assert.equal(item.approval?.status, 'pending')
    assert.deepEqual([counts.needsMe, counts.approvals, counts.all], [1, 1, 1])
  })

  it('shows the item resolved the moment its approval is decided anywhere', async () => {
    const { ask, inbox, decide } = await setup()
    const id = approvalId(await ask('test.send', { to: 'a@example.com' }))
    await decide(id, 'approve')
    const { items, counts } = await inbox()
    assert.deepEqual([items[0]!.status, items[0]!.resolution, items[0]!.approval?.status], ['resolved', 'approved', 'approved'])
    assert.equal(counts.needsMe, 0)
    assert.equal(counts.done, 1)
  })

  it('shows a denied approval as resolved, denied', async () => {
    const { ask, inbox, decide } = await setup()
    await decide(approvalId(await ask('test.delete', { path: '/x' })), 'deny')
    assert.deepEqual([(await inbox()).items[0]!.status, (await inbox()).items[0]!.resolution], ['resolved', 'denied'])
  })

  it('shows an expired approval as resolved, expired', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { ask, inbox, b } = await setup({ now: () => now, approvalTtlMs: 60_000 })
    await ask('test.send', { to: 'a@example.com' })
    now += 61_000
    await b.json('/api/approvals') // any read sweeps expiry
    const item = (await inbox()).items[0]!
    assert.deepEqual([item.status, item.resolution], ['resolved', 'expired'])
  })

  it('resolves the items of a stopped run', async () => {
    const { b, ask, inbox } = await setup()
    const run = (await (await b.post('/api/test/runs', { kind: 'sleep' })).json()) as { run: { id: string } }
    await ask('test.send', { to: 'a@example.com' }, { runId: run.run.id })
    assert.equal((await inbox()).counts.needsMe, 1)
    await b.post('/api/stop')
    const item = (await inbox()).items.find((i) => i.kind === 'approval')!
    assert.deepEqual([item.status, item.resolution], ['resolved', 'denied'])
  })

  it('does not pile up duplicates when the same request is made again', async () => {
    const { ask, inbox } = await setup()
    const a = await ask('test.send', { to: 'a@example.com' })
    const b = await ask('test.send', { to: 'a@example.com' })
    assert.equal(approvalId(a), approvalId(b))
    assert.equal((await inbox()).items.length, 1)
  })

  it('adds a failure item for a failed run and lets it be marked done and reopened', async () => {
    const { b, inbox } = await setup()
    await b.post('/api/test/runs', { kind: 'fail' })
    await until(async () => (await inbox()).items.some((i) => i.kind === 'failure'), 4000, 'the failure item')
    const failure = (await inbox('?kind=failure')).items[0]!
    assert.deepEqual([failure.kind, failure.priority, failure.status], ['failure', 'normal', 'new'])
    assert.equal((await inbox()).counts.failures, 1)

    const done = await b.post(`/api/inbox/${failure.id}/action`, { action: 'done' })
    assert.equal(((await done.json()) as InboxItem).status, 'done')
    assert.equal((await inbox()).counts.needsMe, 0)
    const reopened = await b.post(`/api/inbox/${failure.id}/action`, { action: 'reopen' })
    assert.equal(((await reopened.json()) as InboxItem).status, 'new')
  })

  it('snoozes an item until a time, then brings it back', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { b, inbox } = await setup({ now: () => now })
    await b.post('/api/test/runs', { kind: 'fail' })
    await until(async () => (await inbox()).items.length > 0, 4000, 'the failure item')
    const item = (await inbox()).items[0]!
    const until1 = new Date(now + 3600_000).toISOString()
    const res = await b.post(`/api/inbox/${item.id}/action`, { action: 'snooze', until: until1 })
    assert.equal(((await res.json()) as InboxItem).status, 'snoozed')
    assert.equal((await inbox('?status=snoozed')).items.length, 1)
    assert.equal((await inbox()).counts.needsMe, 0)
    now += 3600_000 + 1000
    assert.equal((await inbox()).items[0]!.status, 'new', 'it woke up')
  })

  it('refuses nonsense snoozes and unknown actions', async () => {
    const { b, inbox } = await setup()
    await b.post('/api/test/runs', { kind: 'fail' })
    await until(async () => (await inbox()).items.length > 0, 4000, 'the failure item')
    const id = (await inbox()).items[0]!.id
    assert.equal((await b.post(`/api/inbox/${id}/action`, { action: 'snooze', until: '2001-01-01T00:00:00Z' })).status, 400)
    assert.equal((await b.post(`/api/inbox/${id}/action`, { action: 'snooze' })).status, 400)
    assert.equal((await b.post(`/api/inbox/${id}/action`, { action: 'explode' })).status, 400)
    assert.equal((await b.post('/api/inbox/00000000-0000-4000-8000-000000000000/action', { action: 'done' })).status, 404)
  })

  it('does not let a waiting approval be marked done or snoozed, and a settled one cannot be reopened', async () => {
    const { ask, inbox, b, decide } = await setup()
    const id = approvalId(await ask('test.send', { to: 'a@example.com' }))
    const item = (await inbox()).items[0]!
    const done = await b.post(`/api/inbox/${item.id}/action`, { action: 'done' })
    assert.deepEqual([done.status, ((await done.json()) as { error: string }).error], [409, 'approval_open'])
    const snooze = await b.post(`/api/inbox/${item.id}/action`, { action: 'snooze', until: new Date(Date.now() + 3600_000).toISOString() })
    assert.equal(snooze.status, 409)
    await decide(id, 'deny')
    assert.equal((await b.post(`/api/inbox/${item.id}/action`, { action: 'reopen' })).status, 409)
  })

  it('filters by status and kind, urgent first', async () => {
    const { ask, inbox, b } = await setup()
    await b.post('/api/test/runs', { kind: 'fail' })
    await until(async () => (await inbox()).items.some((i) => i.kind === 'failure'), 4000, 'the failure item')
    await ask('test.send', { to: 'a@example.com' })
    const all = (await inbox()).items
    assert.deepEqual(all.map((i) => i.kind), ['approval', 'failure'], 'urgent first')
    assert.deepEqual((await inbox('?kind=approval')).items.map((i) => i.kind), ['approval'])
    assert.equal((await inbox('?status=needs_me')).items.length, 2)
  })

  it('announces items on the event stream for the unread badge', async () => {
    const { ask, d } = await setup()
    await ask('test.send', { to: 'a@example.com' })
    const created = d.store.since(0).filter((e) => e.type === 'inbox.item' && e.payload.action === 'created')
    assert.equal(created.length, 1)
    assert.equal(created[0]!.payload.kind, 'approval')
  })

  it('keeps arguments and message bodies out of the inbox item', async () => {
    const { ask, inbox } = await setup()
    await ask('test.send', { to: 'a@example.com', body: 'my private diary entry 7f3a' })
    const text = JSON.stringify((await inbox()).items.map((i) => ({ ...i, approval: undefined })))
    assert.ok(!text.includes('private diary'), 'the item itself carries only a summary')
  })

  it('needs a paired browser and the CSRF header', async () => {
    const { d, b, ask, inbox } = await setup()
    await ask('test.send', { to: 'a@example.com' })
    const id = (await inbox()).items[0]!.id
    assert.equal((await d.browser().get('/api/inbox')).status, 401)
    assert.equal((await d.browser().post(`/api/inbox/${id}/action`, { action: 'done' })).status, 401)
    assert.equal((await b.request(`/api/inbox/${id}/action`, { method: 'POST', body: { action: 'done' }, csrf: false })).status, 403)
  })
})

describe('Telegram is off unless configured', () => {
  it('reports why it is off and contacts nobody', async () => {
    const { b, ask } = await setup()
    await ask('test.send', { to: 'a@example.com' })
    const status = await b.json<TelegramStatus>('/api/telegram/status')
    assert.equal(status.enabled, false)
    assert.match(status.reason ?? '', /Not configured/)
    assert.deepEqual(status.quietHours, { start: '23:00', end: '07:00' })
  })

  it('refuses a bad user id or an API address that is not Telegram or local', async () => {
    const bad = await setup({ env: { JUNOS_TELEGRAM_TOKEN: TOKEN, JUNOS_TELEGRAM_USER_ID: 'not-a-number' } })
    const s1 = await bad.b.json<TelegramStatus>('/api/telegram/status')
    assert.equal(s1.enabled, false)
    assert.match(s1.reason ?? '', /numeric/)
    const evil = await setup({ env: { JUNOS_TELEGRAM_TOKEN: TOKEN, JUNOS_TELEGRAM_USER_ID: '4242', JUNOS_TELEGRAM_API: 'https://evil.example' } })
    const s2 = await evil.b.json<TelegramStatus>('/api/telegram/status')
    assert.equal(s2.enabled, false)
    assert.match(s2.reason ?? '', /api\.telegram\.org/)
    assert.ok(!JSON.stringify([s1, s2]).includes(TOKEN), 'the token is never echoed')
  })
})

describe('Telegram bot', () => {
  it('sends an urgent approval to the owner with Approve and Deny, as a short summary', async () => {
    const { ask, tg } = await setup({ telegram: true })
    await ask('test.send', { to: 'alice@example.com', body: 'my private diary entry 7f3a' })
    await until(() => tg!.sent.length === 1, 4000, 'the Telegram message')
    const msg = tg!.lastSent()
    assert.equal(msg.chat_id, OWNER)
    assert.match(msg.text, /Approval needed/)
    assert.match(msg.text, /test\.send → alice@example\.com/)
    assert.match(msg.text, /cannot be undone/)
    assert.ok(!msg.text.includes('private diary'), 'not the full command or its arguments')
    assert.deepEqual(msg.reply_markup?.inline_keyboard.flat().map((b) => b.text), ['Approve', 'Deny'])
    for (const btn of msg.reply_markup!.inline_keyboard.flat()) assert.ok(Buffer.byteLength(btn.callback_data) <= 64, 'within Telegram\'s callback limit')
  })

  it('denies with one tap, records who and where, and updates the message and the Inbox', async () => {
    const { ask, tg, approvalOf, inbox } = await setup({ telegram: true })
    const id = approvalId(await ask('test.send', { to: 'a@example.com' }))
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    tg!.press(OWNER, m.message_id, tg!.button(m.message_id, 'Deny'))
    await until(async () => (await approvalOf(id)).status === 'denied', 4000, 'the denial')
    const a = await approvalOf(id)
    assert.deepEqual([a.decidedBy, a.decidedChannel], [`telegram:${OWNER}`, 'telegram'])
    await until(() => /Resolved: denied from Telegram/.test(tg!.textOf(m.message_id)), 4000, 'the message edit')
    assert.deepEqual(tg!.edits.at(-1)!.reply_markup?.inline_keyboard, [], 'buttons are gone')
    assert.equal((await inbox()).items[0]!.resolution, 'denied')
  })

  it('needs a second "Are you sure?" tap to approve anything that sends, deletes or spends', async () => {
    const { ask, tg, approvalOf, act } = await withAct(await setup({ telegram: true }))
    const r = await ask('test.send', { to: 'a@example.com' })
    const id = approvalId(r)
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()

    tg!.press(OWNER, m.message_id, tg!.button(m.message_id, 'Approve'))
    await until(() => /Are you sure\?/.test(tg!.textOf(m.message_id)), 4000, 'the confirmation')
    assert.equal((await approvalOf(id)).status, 'pending', 'one tap is not enough')
    assert.deepEqual(tg!.edits.at(-1)!.reply_markup?.inline_keyboard.flat().map((b) => b.text), ['Yes, approve', 'No'])
    assert.deepEqual(await act.effects(), [])

    tg!.press(OWNER, m.message_id, tg!.button(m.message_id, 'Yes, approve'))
    await until(async () => (await approvalOf(id)).status === 'approved', 4000, 'the approval')
    const a = await approvalOf(id)
    assert.deepEqual([a.decidedBy, a.decidedChannel], [`telegram:${OWNER}`, 'telegram'])
    // It is the same gateway approval: the requester can now run the exact action, once.
    const run = await act.run('test.send', { to: 'a@example.com' }, id)
    assert.equal(run.status, 'executed')
    assert.equal((await act.effects()).length, 1)
  })

  it('lets "No" back out of the confirmation, and the old confirm button then goes stale', async () => {
    const { ask, tg, approvalOf } = await setup({ telegram: true })
    const id = approvalId(await ask('test.delete', { path: '/important' }))
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    tg!.press(OWNER, m.message_id, tg!.button(m.message_id, 'Approve'))
    await until(() => /Are you sure\?/.test(tg!.textOf(m.message_id)))
    const staleYes = tg!.button(m.message_id, 'Yes, approve')
    tg!.press(OWNER, m.message_id, tg!.button(m.message_id, 'No'))
    await until(() => /Approval needed/.test(tg!.textOf(m.message_id)) && tg!.edits.length >= 2, 4000, 'the original buttons')
    tg!.press(OWNER, m.message_id, staleYes)
    await until(() => tg!.answers.some((a) => /out of date/.test(a.text)), 4000, 'the stale answer')
    assert.equal((await approvalOf(id)).status, 'pending', 'a stale Yes approves nothing')
  })

  it('approves a local write with one tap, since nothing leaves the machine', async () => {
    const { ask, tg, approvalOf } = await setup({ telegram: true, autonomy: 'ask-first' })
    const id = approvalId(await ask('test.write', { path: '/work/a.txt' }))
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    assert.ok(!/cannot be undone/.test(m.text))
    tg!.press(OWNER, m.message_id, tg!.button(m.message_id, 'Approve'))
    await until(async () => (await approvalOf(id)).status === 'approved', 4000, 'the one-tap approval')
  })

  it('answers only the owner: another user, or the owner in another chat, changes nothing', async () => {
    const { ask, tg, approvalOf, d, b } = await setup({ telegram: true })
    const id = approvalId(await ask('test.delete', { path: '/x' }))
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    const deny = tg!.button(m.message_id, 'Deny')
    tg!.press(999, m.message_id, deny) // a stranger with the real button data
    tg!.press(OWNER, m.message_id, deny, -100123) // the owner's id, but in a group
    tg!.say(999, 'approve everything please')
    await until(async () => (await b.json<TelegramStatus>('/api/telegram/status')).rejected === 3, 4000, 'three rejections')
    assert.equal((await approvalOf(id)).status, 'pending')
    const reasons = d.store.since(0).filter((e) => e.type === 'telegram.rejected').map((e) => e.payload.reason).sort()
    assert.deepEqual(reasons, ['not_owner', 'not_owner', 'wrong_chat'])
    assert.ok(!JSON.stringify(d.store.since(0)).includes('approve everything'), 'what a stranger wrote is not stored')
    assert.ok(tg!.answers.filter((a) => a.text !== '').length === 0, 'strangers get no information back')
  })

  it('rejects buttons with a wrong code, on the wrong message, or malformed', async () => {
    const { ask, tg, approvalOf } = await setup({ telegram: true })
    const id = approvalId(await ask('test.delete', { path: '/x' }))
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    tg!.press(OWNER, m.message_id, `d:${id}:deadbeef00`)
    tg!.press(OWNER, 99999, tg!.button(m.message_id, 'Deny'))
    tg!.press(OWNER, m.message_id, 'd:not-a-uuid:xxxxxxxx')
    tg!.press(OWNER, m.message_id, 'rm -rf /')
    await until(() => tg!.answers.length === 4, 4000, 'four answers')
    assert.equal((await approvalOf(id)).status, 'pending')
    assert.equal(tg!.answers.filter((a) => /out of date|not valid/.test(a.text)).length, 4)
  })

  it('shows the Telegram message as resolved when the Inbox decided first, and pressing it later does nothing', async () => {
    const { ask, tg, decide, approvalOf } = await setup({ telegram: true })
    const id = approvalId(await ask('test.send', { to: 'a@example.com' }))
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    const approve = tg!.button(m.message_id, 'Approve')
    await decide(id, 'deny')
    await until(() => /Resolved: denied in the Inbox/.test(tg!.textOf(m.message_id)), 4000, 'the mirror edit')
    tg!.press(OWNER, m.message_id, approve)
    await until(() => tg!.answers.some((a) => /Already denied|out of date/.test(a.text)), 4000, 'the late press answer')
    assert.equal((await approvalOf(id)).status, 'denied', 'a second answer does not flip it')
  })

  it('shows an expired approval as resolved in Telegram, and a press on it is refused', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { ask, tg, b } = await setup({ telegram: true, now: () => now, approvalTtlMs: 60_000 })
    await ask('test.send', { to: 'a@example.com' })
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    const approve = tg!.button(m.message_id, 'Approve')
    now += 61_000
    await b.json('/api/approvals')
    await until(() => /Resolved: expired/.test(tg!.textOf(m.message_id)), 4000, 'the expiry edit')
    tg!.press(OWNER, m.message_id, approve)
    await until(() => tg!.answers.some((a) => /Already expired|out of date/.test(a.text)))
  })

  it('lets only one of two simultaneous confirmations approve', async () => {
    const { ask, tg, approvalOf, d } = await setup({ telegram: true })
    const id = approvalId(await ask('test.send', { to: 'a@example.com' }))
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    tg!.press(OWNER, m.message_id, tg!.button(m.message_id, 'Approve'))
    await until(() => /Are you sure\?/.test(tg!.textOf(m.message_id)))
    const yes = tg!.button(m.message_id, 'Yes, approve')
    tg!.press(OWNER, m.message_id, yes)
    tg!.press(OWNER, m.message_id, yes)
    await until(async () => (await approvalOf(id)).status === 'approved')
    await sleep(150)
    assert.equal(d.store.since(0).filter((e) => e.type === 'approval.approved').length, 1)
  })
})

describe('Telegram quiet hours', () => {
  const local = (h: number, m: number) => new Date(2026, 9, 22, h, m).getTime()

  it('always delivers approvals, but holds everything else until the quiet window ends', async () => {
    let now = local(23, 30)
    const { b, ask, tg, inbox } = await setup({ telegram: true, now: () => now })
    await b.post('/api/test/runs', { kind: 'fail' })
    await until(async () => (await inbox()).items.some((i) => i.kind === 'failure'), 4000, 'the failure item')
    await ask('test.send', { to: 'a@example.com' })
    await until(() => tg!.sent.length === 1, 4000, 'the approval')
    assert.match(tg!.lastSent().text, /Approval needed/, 'the approval came through at night')
    await sleep(300)
    assert.equal(tg!.sent.length, 1, 'the failure is waiting for morning')

    now = local(7, 30) + 24 * 3600_000
    await until(() => tg!.sent.length === 2, 4000, 'the held failure')
    assert.match(tg!.lastSent().text, /run failed/)
    assert.equal(tg!.lastSent().reply_markup, undefined, 'a failure has no buttons')
  })

  it('sends a failure straight away in the daytime', async () => {
    const now = local(14, 0)
    const { b, tg } = await setup({ telegram: true, now: () => now })
    await b.post('/api/test/runs', { kind: 'fail' })
    await until(() => tg!.sent.length === 1, 4000, 'the failure message')
  })

  it('honours a custom quiet window', async () => {
    const now = local(13, 0)
    const { b, tg } = await setup({ telegram: true, now: () => now, env: { JUNOS_TELEGRAM_QUIET: '12:00-14:00' } })
    await b.post('/api/test/runs', { kind: 'fail' })
    await sleep(400)
    assert.equal(tg!.sent.length, 0)
    const status = await b.json<TelegramStatus>('/api/telegram/status')
    assert.deepEqual(status.quietHours, { start: '12:00', end: '14:00' })
  })
})

describe('Telegram secrets and failures', () => {
  it('never puts the bot token in events, the API, the Inbox or the database', async () => {
    const { ask, tg, b, d, home } = await setup({ telegram: true })
    await ask('test.send', { to: 'a@example.com' })
    await until(() => tg!.sent.length === 1)
    const everything = JSON.stringify([d.store.since(0), await b.json('/api/telegram/status'), await b.json('/api/inbox'), await b.json('/api/connections')])
    assert.ok(!everything.includes('SECRET-bot-token'))
    const { DatabaseSync } = await import('node:sqlite')
    const { join } = await import('node:path')
    const db = new DatabaseSync(join(home, 'junos.db'), { readOnly: true })
    const rows = JSON.stringify([db.prepare('SELECT * FROM inbox_item').all(), db.prepare('SELECT payload_json FROM event').all()])
    db.close()
    assert.ok(!rows.includes('SECRET-bot-token'))
  })

  it('only ever sends the token to the Telegram server it was configured with', async () => {
    const { ask, tg } = await setup({ telegram: true })
    await ask('test.send', { to: 'a@example.com' })
    await until(() => tg!.sent.length === 1)
    assert.ok(tg!.paths.every((p) => p.startsWith(`/bot${TOKEN}/`)))
  })

  it('masks the token in the error it records when Telegram fails', async () => {
    const { ask, tg, d } = await setup({ telegram: true })
    tg!.failSend = true
    await ask('test.send', { to: 'a@example.com' })
    await until(() => d.store.since(0).some((e) => e.type === 'telegram.error'), 4000, 'the error event')
    const text = JSON.stringify(d.store.since(0).filter((e) => e.type === 'telegram.error'))
    assert.ok(!text.includes('SECRET-bot-token'), text)
    assert.match(text, /<token>|failed/)
  })

  it('keeps the approval working in the Inbox when Telegram is down', async () => {
    const { ask, tg, decide, approvalOf } = await setup({ telegram: true })
    tg!.failSend = true
    const id = approvalId(await ask('test.send', { to: 'a@example.com' }))
    await decide(id, 'approve')
    assert.equal((await approvalOf(id)).status, 'approved')
  })

  it('does not replay an update it already handled', async () => {
    const { ask, tg } = await setup({ telegram: true })
    await ask('test.send', { to: 'a@example.com' })
    await until(() => tg!.sent.length === 1)
    const m = tg!.lastSent()
    tg!.press(OWNER, m.message_id, tg!.button(m.message_id, 'Deny'))
    await until(() => tg!.answers.length === 1)
    await sleep(200)
    assert.equal(tg!.answers.length, 1)
    assert.ok(tg!.offsets.at(-1)! > 1, 'the offset moved past the handled update')
  })

  it('resumes after a restart: items it never delivered go out, and delivered ones are not sent twice', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const tg = new FakeTelegram(TOKEN)
    await tg.listen()
    cleanups.push(() => tg.close())
    const envBase = { JUNOS_TELEGRAM_TOKEN: TOKEN, JUNOS_TELEGRAM_USER_ID: String(OWNER), JUNOS_TELEGRAM_POLL_MS: '20', JUNOS_TELEGRAM_LONG_POLL_S: '0' }

    // First run: Telegram is not reachable, so the approval is only in the Inbox.
    const first = await boot(home, { testTools: true, env: fakeProviderEnv({ ...envBase, JUNOS_TELEGRAM_API: 'http://127.0.0.1:1' }) })
    const b1 = await first.pair()
    const r = (await (await b1.post('/api/actions', { tool: 'test.send', args: { to: 'a@example.com' } })).json()) as ActionResponse
    await sleep(200)
    await first.close()

    const second = await boot(home, { testTools: true, env: fakeProviderEnv({ ...envBase, JUNOS_TELEGRAM_API: tg.url }) })
    cleanups.push(() => second.close())
    await until(() => tg.sent.length === 1, 4000, 'the late delivery')
    await sleep(200)
    assert.equal(tg.sent.length, 1, 'sent once, not repeatedly')
    assert.match(tg.lastSent().text, /test\.send/)
    void r
  })
})

/** Small helper so a test can run an approved action through the same HTTP API the requester uses. */
async function withAct<T extends Awaited<ReturnType<typeof setup>>>(ctx: T) {
  return {
    ...ctx,
    act: {
      effects: ctx.effects,
      run: async (tool: string, args: Record<string, unknown>, approvalId: string) => (await (await ctx.b.post('/api/actions', { tool, args, approvalId })).json()) as ActionResponse,
    },
  }
}
