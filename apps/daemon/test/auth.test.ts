import assert from 'node:assert/strict'
import { request } from 'node:http'
import { afterEach, describe, it } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import type { SessionResponse } from '@junos/shared'
import { openSse, boot, tempHome } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

async function daemon(options: Parameters<typeof boot>[1] = {}) {
  const { home, cleanup } = tempHome()
  const d = await boot(home, options)
  cleanups.push(cleanup, () => d.close())
  return { home, d }
}

/** Raw HTTP so a test can set a Host header that fetch would not let it set. */
function rawGet(port: number, path: string, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, headers }, (res) => {
      res.resume()
      resolve(res.statusCode ?? 0)
    })
    req.on('error', reject)
    req.end()
  })
}

describe('unpaired requests are rejected', () => {
  it('blocks every route except the liveness probe, the session check and pairing', async () => {
    const { d } = await daemon()
    const b = d.browser()
    for (const path of ['/api/status', '/api/providers', '/api/events', '/api/nope']) {
      const res = await b.get(path)
      assert.equal(res.status, 401, path)
      assert.deepEqual(await res.json(), { error: 'unauthorized' })
    }
    assert.equal((await b.get('/api/health')).status, 200)
    assert.deepEqual(await b.json<SessionResponse>('/api/session'), { paired: false })
  })

  it('blocks writes without a session too', async () => {
    const { d } = await daemon()
    for (const path of ['/api/providers/refresh', '/api/pairing/code', '/api/session/logout']) {
      assert.equal((await d.browser().post(path)).status, 401, path)
    }
  })

  it('does not let a made-up or tampered cookie through', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    const forged = d.browser()
    forged.cookie = 'junos_session=' + 'A'.repeat(43)
    assert.equal((await forged.get('/api/status')).status, 401)
    const tampered = d.browser()
    tampered.cookie = b.cookie.slice(0, -1) + (b.cookie.endsWith('A') ? 'B' : 'A')
    assert.equal((await tampered.get('/api/status')).status, 401)
  })
})

describe('pairing', () => {
  it('exchanges the one-time code for an HttpOnly, SameSite=Strict session cookie', async () => {
    const { d } = await daemon()
    const b = d.browser()
    const res = await b.pair(d.code())
    assert.equal(res.status, 200)
    const cookie = res.headers.get('set-cookie') ?? ''
    assert.match(cookie, /^junos_session=[A-Za-z0-9_-]{40,}/)
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /SameSite=Strict/)
    assert.equal((await b.get('/api/status')).status, 200)
    const session = await b.json<SessionResponse>('/api/session')
    assert.equal(session.paired, true)
    assert.equal(session.csrf, b.csrf)
  })

  it('accepts the code however it is typed (case, dash, spaces)', async () => {
    const { d } = await daemon()
    const typed = d.code().toLowerCase().replace('-', ' ')
    assert.equal((await d.browser().pair(typed)).status, 200)
  })

  it('never puts the code or the session token in the event stream or the database', async () => {
    const { home, d } = await daemon()
    const code = d.code()
    const b = await d.pair()
    const token = b.cookie.split('=')[1]!
    const events = JSON.stringify(d.store.since(0))
    assert.ok(!events.includes(code.replace('-', '')) && !events.includes(code), 'code not in events')
    assert.ok(!events.includes(token), 'token not in events')
    const db = new DatabaseSync(join(home, 'junos.db'), { readOnly: true })
    const rows = JSON.stringify(db.prepare('SELECT * FROM session').all())
    db.close()
    assert.ok(!rows.includes(token), 'only a hash of the token is stored')
  })

  it('records pairing in the audit stream', async () => {
    const { d } = await daemon()
    await d.pair()
    assert.ok(d.store.since(0).some((e) => e.type === 'auth.paired'))
  })

  it('works only once: the code is gone after use', async () => {
    const { d } = await daemon()
    const code = d.code()
    assert.equal((await d.browser().pair(code)).status, 200)
    const again = await d.browser().pair(code)
    assert.equal(again.status, 401)
    assert.throws(() => d.code(), /no pairing code/)
  })

  it('rejects a wrong code and audits the failure', async () => {
    const { d } = await daemon()
    const res = await d.browser().pair('AAAA-AAAA')
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { error: 'invalid' })
    assert.ok(d.store.since(0).some((e) => e.type === 'auth.pair_failed'))
  })

  it('replaces the code after too many wrong guesses, so brute force cannot win', async () => {
    const { d } = await daemon()
    const first = d.code()
    const attempts = []
    for (let i = 0; i < 5; i++) attempts.push((await d.browser().pair('ZZZZ-ZZZZ')).status)
    assert.deepEqual(attempts, [401, 401, 401, 401, 401])
    assert.notEqual(d.code(), first, 'a fresh code was announced')
    assert.equal((await d.browser().pair(first)).status, 401, 'the old code no longer works')
    assert.equal((await d.browser().pair(d.code())).status, 200, 'the new one does')
  })

  it('expires the code', async () => {
    let now = 1_000_000
    const { d } = await daemon({ now: () => now, pairingTtlMs: 60_000 })
    const code = d.code()
    now += 61_000
    const res = await d.browser().pair(code)
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { error: 'expired' })
  })

  it('expires sessions server-side at 30 days and carries the expiry across restart', async () => {
    let now = Date.UTC(2026, 0, 1)
    const { home, d } = await daemon({ now: () => now })
    const browser = await d.pair()
    await d.close()

    now += 30 * 24 * 60 * 60 * 1000 - 1
    const restarted = await boot(home, { now: () => now })
    cleanups.push(() => restarted.close())
    const restartedBrowser = restarted.browser()
    restartedBrowser.cookie = browser.cookie
    restartedBrowser.csrf = browser.csrf
    assert.equal((await restartedBrowser.get('/api/status')).status, 200, 'session remains valid one millisecond before expiry')

    now += 1
    const status = await restartedBrowser.get('/api/status')
    assert.equal(status.status, 401)
    assert.deepEqual(await (await restartedBrowser.get('/api/session')).json(), { paired: false })
    assert.equal(restarted.store.activeSessionCount(now), 0)

    now += 1
    assert.equal((await restartedBrowser.get('/api/status')).status, 401, 'session remains expired after restart')
  })

  it('restores a pairing code once the last session expires, without rotating it on checks', async () => {
    let now = Date.UTC(2026, 0, 1)
    const { d } = await daemon({ now: () => now })
    const browser = await d.pair()
    now += 30 * 24 * 60 * 60 * 1000

    assert.deepEqual(await (await browser.get('/api/session')).json(), { paired: false })
    const availableCode = d.code()
    assert.deepEqual(await (await browser.get('/api/session')).json(), { paired: false })
    assert.equal(d.code(), availableCode, 'rechecking an unpaired session does not invalidate the code')
    const secondBrowser = d.browser()
    assert.equal((await secondBrowser.pair(availableCode)).status, 200)
  })

  it('ends expired SSE streams before live events and heartbeats, without rotating a recovery code', async () => {
    let now = Date.UTC(2026, 0, 1)
    const { d } = await daemon({ now: () => now })
    const browser = await d.pair()
    const streams = await Promise.all([
      openSse(d.url, { cookie: browser.cookie }),
      openSse(d.url, { cookie: browser.cookie }),
    ])
    cleanups.push(...streams.map((stream) => () => stream.close()))
    await Promise.all(streams.map((stream) => stream.waitFor((message) => message.event === 'ready')))

    const heartbeatCounts = streams.map((stream) => stream.messages.filter((message) => message.event === 'heartbeat').length)
    now += 30 * 24 * 60 * 60 * 1000
    await browser.get('/api/session')
    const recoveryCode = d.code()
    d.store.append('test.after-expiry')
    await Promise.race([
      Promise.all(streams.map((stream) => stream.ended)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('stream stayed open after session expiry')), 1000)),
    ])
    assert.ok(streams.every((stream) => !stream.events().some((event) => event.type === 'test.after-expiry')), 'expired streams receive no live event')
    assert.ok(streams.every((stream, index) => stream.messages.filter((message) => message.event === 'heartbeat').length === heartbeatCounts[index]), 'expired streams receive no further heartbeat')
    assert.equal(d.store.activeSessionCount(now), 0)
    assert.deepEqual(await (await browser.get('/api/session')).json(), { paired: false })
    assert.equal(d.code(), recoveryCode, 'expired streams do not repeatedly rotate the code')
  })

  it('closes an idle expired stream on heartbeat without waiting for a live event', async () => {
    let now = Date.UTC(2026, 0, 1)
    const { d } = await daemon({ now: () => now })
    const browser = await d.pair()
    const stream = await openSse(d.url, { cookie: browser.cookie })
    cleanups.push(() => stream.close())
    await stream.waitFor((message) => message.event === 'ready')
    const heartbeatCount = stream.messages.filter((message) => message.event === 'heartbeat').length

    now += 30 * 24 * 60 * 60 * 1000
    await Promise.race([
      stream.ended,
      new Promise((_, reject) => setTimeout(() => reject(new Error('idle expired stream stayed open')), 1000)),
    ])
    assert.equal(stream.messages.filter((message) => message.event === 'heartbeat').length, heartbeatCount)
    assert.equal((await d.browser().pair(d.code())).status, 200, 'the heartbeat restores a usable pairing code')
  })

  it('lets a paired browser mint a code for a second browser', async () => {
    const { d } = await daemon()
    const first = await d.pair()
    const res = await first.post('/api/pairing/code')
    assert.equal(res.status, 200)
    const { code } = (await res.json()) as { code: string }
    const second = d.browser()
    assert.equal((await second.pair(code)).status, 200)
    assert.equal((await second.get('/api/status')).status, 200)
  })

  it('logout revokes the session for good', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    const res = await b.post('/api/session/logout')
    assert.equal(res.status, 200)
    assert.match(res.headers.get('set-cookie') ?? '', /Max-Age=0/)
    assert.equal((await b.get('/api/status')).status, 401, 'the old cookie is dead server-side')
  })

  it('ends a revoked session event stream at once and leaves other session streams alone', async () => {
    const { d } = await daemon()
    const one = await d.pair()
    const code = ((await (await one.post('/api/pairing/code')).json()) as { code: string }).code
    const two = d.browser()
    assert.equal((await two.pair(code)).status, 200)

    const streamOne = await openSse(d.url, { cookie: one.cookie })
    const streamTwo = await openSse(d.url, { cookie: two.cookie })
    cleanups.push(() => streamOne.close(), () => streamTwo.close())
    await streamOne.waitFor((m) => m.event === 'ready')
    await streamTwo.waitFor((m) => m.event === 'ready')

    await one.post('/api/session/logout')
    await Promise.race([streamOne.ended, new Promise((_, rej) => setTimeout(() => rej(new Error('stream stayed open after logout')), 3000))])

    const before = streamTwo.events().length
    d.store.append('test.after-logout')
    await streamTwo.waitFor((m) => (m.data as { type?: string }).type === 'test.after-logout')
    assert.ok(streamTwo.events().length > before, 'the other session still gets events')
    assert.ok(!streamOne.events().some((e) => e.type === 'test.after-logout'), 'the revoked session got nothing more')
  })

  it('announces a fresh code once the last paired browser is gone', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    assert.throws(() => d.code(), /no pairing code/)
    await b.post('/api/session/logout')
    assert.equal((await d.browser().pair(d.code())).status, 200)
  })
})

describe('localhost protection', () => {
  it('rejects an unexpected Host header (DNS rebinding)', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    const ok = await rawGet(d.port, '/api/status', { host: `127.0.0.1:${d.port}`, cookie: b.cookie })
    assert.equal(ok, 200)
    for (const host of [`evil.example:${d.port}`, 'localhost', `127.0.0.1:${d.port + 1}`, `localhost.evil.example:${d.port}`]) {
      assert.equal(await rawGet(d.port, '/api/status', { host, cookie: b.cookie }), 403, host)
    }
    // Even the public probe checks Host.
    assert.equal(await rawGet(d.port, '/api/health', { host: `evil.example:${d.port}` }), 403)
  })

  it('rejects a foreign Origin, even with a valid cookie', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    for (const origin of ['https://evil.example', 'http://127.0.0.1:9999', 'null']) {
      const res = await b.request('/api/status', { origin })
      assert.equal(res.status, 403, origin)
      assert.deepEqual(await res.json(), { error: 'bad origin' })
    }
  })

  it('refuses pairing from a foreign Origin, so a hostile page cannot pair itself', async () => {
    const { d } = await daemon()
    const res = await d.browser().request('/api/pair', { method: 'POST', body: { code: d.code() }, origin: 'https://evil.example' })
    assert.equal(res.status, 403)
    assert.equal((await d.browser().pair(d.code())).status, 200, 'the code was not consumed by the bad attempt')
  })

  it('requires an Origin on writes', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    const res = await b.request('/api/providers/refresh', { method: 'POST', origin: null })
    assert.equal(res.status, 403)
  })

  it('allows the Vite dev origin', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    const res = await b.request('/api/status', { origin: 'http://localhost:5173' })
    assert.equal(res.status, 200)
  })

  it('requires the CSRF header on writes', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    const none = await b.request('/api/providers/refresh', { method: 'POST', csrf: false })
    assert.equal(none.status, 403)
    assert.deepEqual(await none.json(), { error: 'bad csrf' })
    const wrong = await b.request('/api/providers/refresh', { method: 'POST', headers: { 'x-junos-csrf': 'nope' }, csrf: false })
    assert.equal(wrong.status, 403)
    assert.equal((await b.post('/api/providers/refresh')).status, 200)
  })

  it('does not let one session reuse another session’s CSRF token', async () => {
    const { d } = await daemon()
    const one = await d.pair()
    const two = await one.post('/api/pairing/code').then(async (r) => d.browser().pair(((await r.json()) as { code: string }).code))
    assert.equal(two.status, 200)
    const attacker = d.browser()
    attacker.cookie = one.cookie
    attacker.csrf = 'not-the-token'
    assert.equal((await attacker.post('/api/providers/refresh')).status, 403)
  })

  it('refuses the event stream to an unpaired or foreign-origin client, and serves it to a paired one', async () => {
    const { d } = await daemon()
    const b = await d.pair()
    const unpaired = await openSse(d.url)
    assert.equal(unpaired.status, 401)
    unpaired.close()
    const paired = await openSse(d.url, { cookie: b.cookie })
    cleanups.push(() => paired.close())
    assert.equal(paired.status, 200)
  })

  it('refuses oversized pairing bodies', async () => {
    const { d } = await daemon()
    const res = await d.browser().request('/api/pair', { method: 'POST', body: { code: 'A'.repeat(10_000) } })
    assert.equal(res.status, 400)
  })
})
