import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { ActionResponse, ApprovalRecord, GatewayInfo } from '@junos/shared'
import { boot, tempHome, type Browser, type BootOptions, type TestDaemon } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

async function setup(options: BootOptions = {}) {
  const { home, cleanup } = tempHome()
  const d = await boot(home, { testTools: true, ...options })
  cleanups.push(cleanup, () => d.close())
  const b = await d.pair()
  return { home, d, b, ...helpers(d, b) }
}

function helpers(d: TestDaemon, b: Browser) {
  const act = async (body: Record<string, unknown>) => {
    const res = await b.post('/api/actions', body)
    return { http: res.status, out: (await res.json()) as ActionResponse }
  }
  const effects = async () => ((await b.json<{ effects: unknown[] }>('/api/gateway/test-effects')).effects)
  const approvals = async (status?: string) =>
    (await b.json<{ approvals: ApprovalRecord[] }>(`/api/approvals${status ? `?status=${status}` : ''}`)).approvals
  const decide = (id: string, verb: 'approve' | 'deny') => b.post(`/api/approvals/${id}/${verb}`)
  /** Request an action that needs approval and return its approval id. */
  const ask = async (body: Record<string, unknown>) => {
    const { http, out } = await act(body)
    assert.equal(http, 202, JSON.stringify(out))
    assert.equal(out.status, 'approval_required')
    return (out as Extract<ActionResponse, { status: 'approval_required' }>).approvalId
  }
  const eventsOf = (prefix: string) => d.store.since(0).filter((e) => e.type.startsWith(prefix))
  return { act, effects, approvals, decide, ask, eventsOf }
}

const send = (over: Record<string, unknown> = {}) => ({ tool: 'test.send', args: { to: 'a@example.com', body: 'hello' }, ...over })

describe('classification and policy', () => {
  it('lets read and (in Balanced) write-local actions run without approval', async () => {
    const { act, effects } = await setup()
    const read = await act({ tool: 'test.read', args: { text: 'hi' } })
    assert.equal(read.http, 200)
    assert.deepEqual((read.out as { result: unknown }).result, { echo: 'hi' })
    const write = await act({ tool: 'test.write', args: { path: '/work/a.txt' } })
    assert.equal(write.http, 200)
    assert.equal((await effects()).length, 1)
  })

  it('asks for write-local in Ask-first mode', async () => {
    const { act, effects } = await setup({ autonomy: 'ask-first' })
    const write = await act({ tool: 'test.write', args: { path: '/work/a.txt' } })
    assert.equal(write.http, 202)
    assert.equal((await effects()).length, 0)
  })

  it('blocks every external-send, destructive and spend action until approved, even in Autonomous mode', async () => {
    const { act, effects } = await setup({ autonomy: 'autonomous' })
    for (const body of [
      { tool: 'test.send', args: { to: 'a@example.com' } },
      { tool: 'test.delete', args: { path: '/work/important' } },
      { tool: 'test.spend', args: { item: 'gpu', amount: 20 } },
    ]) {
      const r = await act(body)
      assert.equal(r.http, 202, body.tool)
      assert.equal(r.out.status, 'approval_required')
    }
    assert.deepEqual(await effects(), [], 'nothing ran')
  })

  it('treats an unknown tool as destructive and refuses to run it at all', async () => {
    const { act, eventsOf } = await setup()
    const r = await act({ tool: 'shell.rm_rf', args: { path: '/' } })
    assert.equal(r.http, 403)
    assert.equal(r.out.status, 'denied')
    assert.equal(r.out.class, 'destructive')
    assert.ok(eventsOf('gateway.decision').some((e) => e.payload.reason === 'unknown_tool'))
  })

  it('ignores a class the caller claims: the daemon decides it from the tool', async () => {
    const { act } = await setup()
    const r = await act(send({ class: 'read', actor: 'daemon', approved: true }))
    assert.equal(r.http, 202)
  })

  it('registers no test tools unless asked', async () => {
    const { b, act } = await setup({ testTools: false })
    const info = await b.json<GatewayInfo>('/api/gateway/info')
    assert.equal(info.testTools, false)
    assert.deepEqual(info.tools, [])
    assert.equal((await act(send())).http, 403)
    assert.equal((await b.get('/api/gateway/test-effects')).status, 404)
  })
})

describe('approvals gate execution', () => {
  it('runs an approved action exactly once', async () => {
    const { act, ask, decide, effects } = await setup()
    const id = await ask(send())
    assert.equal((await decide(id, 'approve')).status, 200)
    const first = await act(send({ approvalId: id }))
    assert.equal(first.http, 200)
    assert.equal(first.out.status, 'executed')
    assert.equal((await effects()).length, 1)

    const replay = await act(send({ approvalId: id }))
    assert.equal(replay.http, 409)
    assert.deepEqual(replay.out, { ...replay.out, status: 'rejected', reason: 'not_approved' })
    assert.equal((await effects()).length, 1, 'the replay did not run')
  })

  it('does not run while the approval is still pending, or for an invented id', async () => {
    const { act, ask, effects } = await setup()
    const id = await ask(send())
    assert.equal((await act(send({ approvalId: id }))).out.status, 'rejected')
    const invented = await act(send({ approvalId: '00000000-0000-4000-8000-000000000000' }))
    assert.equal((invented.out as { reason: string }).reason, 'unknown_approval')
    assert.deepEqual(await effects(), [])
  })

  it('does not run a denied action', async () => {
    const { act, ask, decide, effects } = await setup()
    const id = await ask(send())
    assert.equal((await decide(id, 'deny')).status, 200)
    const r = await act(send({ approvalId: id }))
    assert.equal((r.out as { reason: string }).reason, 'not_approved')
    assert.deepEqual(await effects(), [])
  })

  it('rejects an altered action and leaves the approval usable for the original only', async () => {
    const { act, ask, decide, effects, approvals } = await setup()
    const id = await ask(send())
    await decide(id, 'approve')

    for (const altered of [
      send({ approvalId: id, args: { to: 'attacker@example.com', body: 'hello' } }),
      send({ approvalId: id, args: { to: 'a@example.com', body: 'hello!' } }),
      send({ approvalId: id, args: { to: 'a@example.com', body: 'hello', extra: 1 } }),
      send({ approvalId: id, cwd: '/elsewhere' }),
      send({ approvalId: id, project: 'other' }),
      { tool: 'test.delete', args: { path: 'a@example.com' }, approvalId: id },
    ]) {
      const r = await act(altered)
      assert.equal(r.http, 409)
      assert.equal((r.out as { reason: string }).reason, 'digest_mismatch', JSON.stringify(altered))
    }
    assert.deepEqual(await effects(), [], 'no altered variant ran')
    assert.equal((await approvals('approved')).length, 1, 'the approval was not consumed by the failed attempts')

    const original = await act(send({ approvalId: id }))
    assert.equal(original.out.status, 'executed')
    assert.equal((await effects()).length, 1)
  })

  it('treats the same arguments in a different key order as the same action', async () => {
    const { act, ask, decide } = await setup()
    const id = await ask({ tool: 'test.send', args: { to: 'a@example.com', body: 'hello', meta: { a: 1, b: [2, 3] } } })
    await decide(id, 'approve')
    const reordered = await act({ approvalId: id, args: { meta: { b: [2, 3], a: 1 }, body: 'hello', to: 'a@example.com' }, tool: 'test.send' })
    assert.equal(reordered.out.status, 'executed')
  })

  it('lets only one of several simultaneous submissions run', async () => {
    const { act, ask, decide, effects } = await setup()
    const id = await ask(send())
    await decide(id, 'approve')
    const results = await Promise.all(Array.from({ length: 8 }, () => act(send({ approvalId: id }))))
    assert.equal(results.filter((r) => r.out.status === 'executed').length, 1)
    assert.equal(results.filter((r) => r.out.status === 'rejected').length, 7)
    assert.equal((await effects()).length, 1)
  })

  it('binds an approval to its run', async () => {
    const { act, ask, decide, effects } = await setup()
    const id = await ask(send({ runId: 'run-1' }))
    await decide(id, 'approve')
    const other = await act(send({ approvalId: id, runId: 'run-2' }))
    assert.equal((other.out as { reason: string }).reason, 'run_mismatch')
    const none = await act(send({ approvalId: id }))
    assert.equal((none.out as { reason: string }).reason, 'run_mismatch')
    assert.deepEqual(await effects(), [])
    assert.equal((await act(send({ approvalId: id, runId: 'run-1' }))).out.status, 'executed')
  })

  it('reuses one pending approval for an identical request instead of piling up', async () => {
    const { ask, approvals } = await setup()
    const a = await ask(send())
    const b = await ask(send())
    assert.equal(a, b)
    assert.equal((await approvals('pending')).length, 1)
  })

  it('always lists every pending approval, however many newer resolved ones there are', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { ask, decide, approvals, b } = await setup({ now: () => now })
    const oldPending = await ask(send({ args: { to: 'old@example.com' } }))
    for (let i = 0; i < 130; i++) {
      now += 1000
      const id = await ask(send({ args: { to: `n${i}@example.com` } }))
      await decide(id, 'deny')
    }
    const all = (await b.json<{ approvals: ApprovalRecord[] }>('/api/approvals')).approvals
    assert.ok(all.some((a) => a.id === oldPending && a.status === 'pending'), 'the oldest still-valid pending request is in the unfiltered list')
    assert.equal(all.filter((a) => a.status === 'pending').length, 1)
    assert.ok(all.length <= 101, 'resolved history is capped')
    assert.equal((await approvals('pending')).length, 1)
  })

  it('keeps an approval across a daemon restart', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const first = await boot(home, { testTools: true })
    const b1 = await first.pair()
    const h1 = helpers(first, b1)
    const id = await h1.ask(send())
    await h1.decide(id, 'approve')
    await first.close()

    const second = await boot(home, { testTools: true })
    cleanups.push(() => second.close())
    // The browser session is stored in SQLite too, so the same cookie keeps working.
    const b2 = second.browser()
    b2.cookie = b1.cookie
    b2.csrf = b1.csrf
    const h2 = helpers(second, b2)
    assert.equal((await h2.act(send({ approvalId: id }))).out.status, 'executed')
  })
})

describe('approvals expire', () => {
  it('refuses to approve an expired request and marks it expired', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { act, ask, decide, approvals, eventsOf, effects } = await setup({ now: () => now, approvalTtlMs: 60_000 })
    const id = await ask(send())
    now += 61_000
    const res = await decide(id, 'approve')
    assert.equal(res.status, 409)
    assert.deepEqual(await res.json(), { error: 'expired' })
    assert.equal((await approvals('expired')).length, 1)
    assert.equal(eventsOf('approval.expired').length, 1)
    assert.equal((await act(send({ approvalId: id }))).out.status, 'rejected')
    assert.deepEqual(await effects(), [])
  })

  it('refuses to run an approved action after it expired unused', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { act, ask, decide, effects } = await setup({ now: () => now, approvalTtlMs: 60_000 })
    const id = await ask(send())
    await decide(id, 'approve')
    now += 61_000
    const r = await act(send({ approvalId: id }))
    assert.equal(r.http, 409)
    assert.equal((r.out as { reason: string }).reason, 'expired')
    assert.deepEqual(await effects(), [])
  })

  it('still runs just before the deadline', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { act, ask, decide } = await setup({ now: () => now, approvalTtlMs: 60_000 })
    const id = await ask(send())
    await decide(id, 'approve')
    now += 59_000
    assert.equal((await act(send({ approvalId: id }))).out.status, 'executed')
  })

  it('does not let a new request reuse an expired approval', async () => {
    let now = Date.parse('2026-10-22T10:00:00Z')
    const { ask } = await setup({ now: () => now, approvalTtlMs: 60_000 })
    const first = await ask(send())
    now += 61_000
    assert.notEqual(await ask(send()), first)
  })
})

describe('audit and redaction', () => {
  it('records decision, approval and execution with the digest and result', async () => {
    const { act, ask, decide, eventsOf } = await setup()
    const id = await ask(send())
    await decide(id, 'approve')
    const done = await act(send({ approvalId: id }))
    const digest = done.out.digest
    const trail = eventsOf('').filter((e) => e.payload.digest === digest).map((e) => e.type)
    assert.deepEqual(trail, [
      'gateway.decision',
      'approval.requested',
      'approval.approved',
      'approval.consumed',
      'gateway.executed',
    ])
    const executed = eventsOf('gateway.executed')[0]!
    assert.equal(executed.payload.result, 'ok')
    assert.equal(executed.payload.approvalId, id)
    assert.match(String(executed.payload.approvedBy), /^session:/)
    assert.equal(executed.payload.channel, 'inbox')
  })

  it('records rejections with the reason', async () => {
    const { act, ask, decide, eventsOf } = await setup()
    const id = await ask(send())
    await decide(id, 'approve')
    await act(send({ approvalId: id, args: { to: 'x@example.com' } }))
    assert.equal(eventsOf('gateway.rejected')[0]?.payload.reason, 'digest_mismatch')
  })

  it('records a failed execution, keeps the approval consumed, and masks secrets in the error', async () => {
    const { act, ask, decide, approvals, eventsOf } = await setup()
    const body = { tool: 'test.fail', args: {} }
    const id = await ask(body)
    await decide(id, 'approve')
    const r = await act({ ...body, approvalId: id })
    assert.equal(r.http, 409)
    assert.equal((r.out as { reason: string }).reason, 'execution_failed')
    const failed = eventsOf('gateway.executed')[0]!
    assert.equal(failed.payload.result, 'failed')
    assert.ok(!JSON.stringify(failed.payload).includes('abcdefghijklmnop123456'), 'bearer token is masked')
    assert.equal((await approvals('consumed')).length, 1, 'never silently retried')
  })

  it('keeps message bodies and secrets out of the event stream', async () => {
    const { act, ask, decide, d } = await setup()
    const secretBody = 'my private diary entry 7f3a'
    const req = send({ args: { to: 'a@example.com', body: secretBody } })
    const id = await ask(req)
    await decide(id, 'approve')
    await act({ ...req, approvalId: id })
    assert.ok(!JSON.stringify(d.store.since(0)).includes(secretBody))
  })

  it('shows the approver redacted arguments but still binds the exact secret value', async () => {
    const { act, ask, decide, approvals } = await setup()
    const req = send({ args: { to: 'a@example.com', body: 'key sk-abcdefghijklmnopqrstuv', apiKey: 'hunter2hunter2' } })
    const id = await ask(req)
    const shown = (await approvals('pending'))[0]!
    const text = JSON.stringify(shown.args)
    assert.ok(!text.includes('sk-abcdefghijklmnopqrstuv') && !text.includes('hunter2'))
    assert.match(text, /\[redacted\]/)

    await decide(id, 'approve')
    const tweaked = send({ approvalId: id, args: { ...(req.args as object), apiKey: 'hunter3hunter3' } })
    assert.equal(((await act(tweaked)).out as { reason: string }).reason, 'digest_mismatch')
  })

  it('redacts target secrets in stored and legacy approval records without changing digest binding', async () => {
    const { act, ask, approvals, b, d } = await setup()
    const secretTarget = 'Bearer abcdefghijklmnop123456'
    const id = await ask(send({ args: { to: secretTarget } }))

    const raw = d.store.db.prepare('SELECT action_json FROM approval WHERE id = ?').get(id) as { action_json: string }
    assert.ok(!raw.action_json.includes(secretTarget), 'new approval rows persist only the redacted target')
    const listed = (await approvals('pending')).find((a) => a.id === id)!
    assert.equal(listed.target, '[redacted]')
    assert.ok(!JSON.stringify(listed).includes(secretTarget), 'the approval API does not reveal the target secret')

    // Simulate an approval row written before target redaction was added.
    const legacy = JSON.parse(raw.action_json) as { actor: string; tool: string; target: string; args: unknown }
    legacy.target = secretTarget
    d.store.db.prepare('UPDATE approval SET action_json = ? WHERE id = ?').run(JSON.stringify(legacy), id)
    const legacyRead = await b.json<ApprovalRecord>(`/api/approvals/${id}`)
    assert.equal(legacyRead.target, '[redacted]')
    assert.ok(!JSON.stringify(legacyRead).includes(secretTarget), 'legacy rows are redacted when read')

    const altered = await act(send({ approvalId: id, args: { to: 'Bearer zyxwvutsrqponmlk987654' } }))
    assert.equal(altered.http, 409)
    assert.equal((altered.out as { reason: string }).reason, 'digest_mismatch')
  })

  it('tells the approver everything the spec asks for', async () => {
    const { ask, approvals } = await setup()
    await ask(send({ project: 'junos', runId: 'run-9' }))
    const a = (await approvals('pending'))[0]!
    assert.equal(a.actor, 'ui')
    assert.equal(a.tool, 'test.send')
    assert.equal(a.target, 'a@example.com')
    assert.equal(a.project, 'junos')
    assert.equal(a.runId, 'run-9')
    assert.equal(a.class, 'external-send')
    assert.equal(a.irreversible, true)
    assert.ok(a.expiresAt > a.requestedAt)
    assert.match(a.digest, /^[0-9a-f]{64}$/)
  })
})

describe('who may decide', () => {
  it('needs a paired browser and the CSRF header to approve or deny', async () => {
    const { d, ask, approvals, b } = await setup()
    const id = await ask(send())
    const anon = d.browser()
    assert.equal((await anon.post(`/api/approvals/${id}/approve`)).status, 401)
    assert.equal((await b.request(`/api/approvals/${id}/approve`, { method: 'POST', csrf: false })).status, 403)
    assert.equal((await b.request(`/api/approvals/${id}/approve`, { method: 'POST', origin: 'https://evil.example' })).status, 403)
    assert.equal((await approvals('pending')).length, 1, 'still pending after all the refused attempts')
    assert.equal((await anon.post('/api/actions', send())).status, 401)
  })

  it('answers 409 for a second decision and 404 for an unknown id', async () => {
    const { ask, decide } = await setup()
    const id = await ask(send())
    assert.equal((await decide(id, 'approve')).status, 200)
    const again = await decide(id, 'deny')
    assert.equal(again.status, 409)
    assert.deepEqual(await again.json(), { error: 'already_decided' })
    assert.equal((await decide('00000000-0000-4000-8000-000000000000', 'approve')).status, 404)
  })

  it('rejects malformed requests', async () => {
    const { b, act } = await setup()
    assert.equal((await act({ args: {} })).http, 400)
    assert.equal((await act({ tool: 'test.read', args: [] })).http, 400)
    assert.equal((await act({ tool: 'test.read', args: { n: Number.NaN } })).http, 200, 'NaN becomes null in JSON before it arrives')
    assert.equal((await b.get('/api/approvals?status=bogus')).status, 400)
  })
})
