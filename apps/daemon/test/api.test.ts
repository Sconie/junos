import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { HealthResponse, ProvidersResponse } from '@junos/shared'
import { startDaemon } from '../src/server.ts'
import { boot, brokenCli, fakeProviderEnv, openSse, tempHome } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

async function setup(env = fakeProviderEnv()) {
  const { home, cleanup } = tempHome()
  const daemon = await boot(home, env)
  cleanups.push(cleanup, () => daemon.close())
  return { home, daemon }
}

/** Kill a child and wait until it has really exited (Windows keeps file handles until then). */
async function reap(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise((r) => child.once("exit", r))
  child.kill("SIGKILL")
  await exited
}

const getJson = async <T>(url: string) => (await fetch(url)).json() as Promise<T>

describe('health', () => {
  it('reports identity and the last event seq', async () => {
    const { daemon } = await setup()
    const res = await fetch(`${daemon.url}/api/health`)
    assert.equal(res.status, 200)
    const body = (await res.json()) as HealthResponse
    assert.equal(body.ok, true)
    assert.equal(body.name, 'junosd')
    assert.equal(body.pid, process.pid)
    assert.ok(body.lastSeq >= 1, 'daemon.started is already in the event table')
  })

  it('answers unknown routes with 404 json', async () => {
    const { daemon } = await setup()
    const res = await fetch(`${daemon.url}/api/nope`)
    assert.equal(res.status, 404)
    assert.deepEqual(await res.json(), { error: 'not found' })
  })
})

describe('event stream', () => {
  it('replays history, then signals ready, then streams live events', async () => {
    const { daemon } = await setup()
    const sse = await openSse(daemon.url)
    cleanups.push(() => sse.close())
    assert.equal(sse.status, 200)
    assert.match(sse.contentType ?? '', /text\/event-stream/)

    await sse.waitFor((m) => m.event === 'ready')
    assert.equal(sse.events()[0]?.type, 'daemon.started')

    daemon.store.append('test.ping', { n: 1 })
    const live = await sse.waitFor((m) => (m.data as { type?: string }).type === 'test.ping')
    assert.equal((live.data as { payload: { n: number } }).payload.n, 1)

    const seqs = sse.events().map((e) => e.seq)
    assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b), 'seq is monotonic')
    assert.equal(new Set(seqs).size, seqs.length, 'no duplicates')
  })

  it('resumes from Last-Event-ID without repeating events', async () => {
    const { daemon } = await setup()
    const a = daemon.store.append('test.a')
    const b = daemon.store.append('test.b')
    const sse = await openSse(daemon.url, a.seq)
    cleanups.push(() => sse.close())
    await sse.waitFor((m) => m.event === 'ready')
    assert.deepEqual(
      sse.events().map((e) => e.seq),
      [b.seq],
    )
  })

  it('sends resync when Last-Event-ID is ahead of the daemon', async () => {
    const { daemon } = await setup()
    const sse = await openSse(daemon.url, daemon.store.lastSeq() + 100)
    cleanups.push(() => sse.close())
    const resync = await sse.waitFor((m) => m.event === 'resync')
    assert.equal((resync.data as { lastSeq: number }).lastSeq, daemon.store.lastSeq())
    assert.equal(sse.events().length, 0)
  })

  it('keeps the connection alive with heartbeats', async () => {
    const { daemon } = await setup()
    const res = await fetch(`${daemon.url}/api/events`)
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let text = ''
    const deadline = Date.now() + 3000
    while (!text.includes('event: heartbeat') && Date.now() < deadline) text += decoder.decode((await reader.read()).value)
    await reader.cancel()
    assert.match(text, /event: heartbeat/)
  })

  it('survives a restart: seq keeps counting on the same database', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const first = await boot(home)
    const before = first.store.lastSeq()
    await first.close()

    const second = await boot(home)
    cleanups.push(() => second.close())
    const sse = await openSse(second.url, before)
    cleanups.push(() => sse.close())
    await sse.waitFor((m) => m.event === 'ready')
    const types = sse.events().map((e) => e.type)
    assert.ok(types.includes('daemon.started'), 'second boot is recorded after the first')
    assert.ok(sse.events().every((e) => e.seq > before))
  })
})

describe('providers (fake CLIs)', () => {
  it('detects the fake CLIs and marks grok and nous as not available', async () => {
    const { daemon } = await setup()
    const { providers } = await getJson<ProvidersResponse>(`${daemon.url}/api/providers`)
    const byId = Object.fromEntries(providers.map((p) => [p.id, p]))
    for (const id of ['claude', 'codex', 'cursor']) {
      assert.equal(byId[id]?.detected, true, id)
      assert.match(byId[id]?.version ?? '', /0\.0\.0-fake/)
    }
    assert.equal(byId.grok?.detected, false)
    assert.equal(byId.nous?.detected, false)
  })

  it('emits connection.changed for each detected provider at startup', async () => {
    const { daemon } = await setup()
    const changed = daemon.store.since(0).filter((e) => e.type === 'connection.changed')
    assert.deepEqual(changed.map((e) => e.refId).sort(), ['claude', 'codex', 'cursor', 'grok', 'nous'])
  })

  it('reports a failing CLI as not detected', async () => {
    const { daemon } = await setup(fakeProviderEnv({ JUNOS_CODEX_BIN: brokenCli() }))
    const { providers } = await getJson<ProvidersResponse>(`${daemon.url}/api/providers`)
    const codex = providers.find((p) => p.id === 'codex')
    assert.equal(codex?.detected, false)
    assert.ok(codex?.error)
  })

  it('refresh emits an event only when something changed', async () => {
    const { daemon } = await setup()
    const seq = daemon.store.lastSeq()
    const res = await fetch(`${daemon.url}/api/providers/refresh`, { method: 'POST' })
    assert.equal(res.status, 200)
    assert.equal(daemon.store.lastSeq(), seq)
  })
})

describe('lifecycle', () => {
  it('binds to loopback only', async () => {
    const { daemon } = await setup()
    const res = await fetch(`http://127.0.0.1:${daemon.port}/api/health`)
    assert.equal(res.status, 200)
  })

  it('refuses a second daemon on the same data dir and cleans up on close', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const first = await boot(home)
    // The lock holder is this very process, so a second start in-process sees a stale-looking
    // self-lock; the cross-process case is covered by the spawned-process test below.
    const lock = join(home, 'junosd.lock')
    assert.ok(existsSync(lock))
    assert.equal(JSON.parse(readFileSync(lock, 'utf8')).port, first.port)
    await first.close()
    assert.equal(existsSync(lock), false, 'lock is removed on clean close')
    await first.close() // idempotent
  })

  it('runs as a real process: serves health, blocks a duplicate, and recovers from a hard kill', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const main = fileURLToPath(new URL('../src/main.ts', import.meta.url))
    const env = { ...fakeProviderEnv(), JUNOS_HOME: home, JUNOS_PORT: '0' }
    const lock = join(home, 'junosd.lock')

    const start = () => {
      const child = spawn(process.execPath, [main], { env, stdio: ['ignore', 'pipe', 'inherit'] })
      cleanups.push(() => reap(child))
      return child
    }
    const portOf = async () => {
      const deadline = Date.now() + 8000
      while (Date.now() < deadline) {
        if (existsSync(lock)) {
          const info = JSON.parse(readFileSync(lock, 'utf8')) as { port: number | null }
          if (info.port) return info.port
        }
        await new Promise((r) => setTimeout(r, 50))
      }
      throw new Error('daemon did not publish its port')
    }

    const child = start()
    const port = await portOf()
    const health = await getJson<HealthResponse>(`http://127.0.0.1:${port}/api/health`)
    assert.equal(health.pid, child.pid)

    // A duplicate exits without touching the running daemon.
    const dup = spawn(process.execPath, [main], { env, stdio: 'ignore' })
    const dupCode = await new Promise((r) => dup.once('exit', r))
    assert.equal(dupCode, 0)
    assert.equal((await getJson<HealthResponse>(`http://127.0.0.1:${port}/api/health`)).pid, child.pid)

    // Hard kill leaves a stale lock; the next start takes it over and keeps the history.
    const exited = new Promise((r) => child.once('exit', r))
    child.kill('SIGKILL')
    await exited
    assert.ok(existsSync(lock), 'hard kill leaves the lock behind')

    const again = start()
    const port2 = await (async () => {
      const deadline = Date.now() + 8000
      for (;;) {
        try {
          const p = JSON.parse(readFileSync(lock, 'utf8')) as { pid: number; port: number | null }
          if (p.pid === again.pid && p.port) return p.port
        } catch {
          /* not yet */
        }
        if (Date.now() > deadline) throw new Error('restart did not take over')
        await new Promise((r) => setTimeout(r, 50))
      }
    })()
    const h2 = await getJson<HealthResponse>(`http://127.0.0.1:${port2}/api/health`)
    assert.equal(h2.pid, again.pid)
    assert.ok(h2.lastSeq > health.lastSeq, 'event history survived the kill')

    // Graceful stop (SIGTERM is a hard kill on Windows; the signal path is exercised elsewhere).
    if (process.platform !== 'win32') {
      const stopped = new Promise((r) => again.once('exit', (code) => r(code)))
      again.kill('SIGTERM')
      assert.equal(await stopped, 0)
      assert.equal(existsSync(lock), false)
    }
  })

  it('startDaemon rejects when the data dir lock is held by a live process', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const holder = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore' })
    cleanups.push(() => reap(holder))
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(home, 'junosd.lock'), JSON.stringify({ pid: holder.pid, port: 1 }))
    await assert.rejects(startDaemon({ home, port: 0, env: fakeProviderEnv() }), /already running/)
  })
})
