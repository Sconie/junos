import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, it } from 'node:test'
import type { ActionResponse, ApprovalRecord, RunRecord, RunsResponse } from '@junos/shared'
import { RunManager } from '../src/runs.ts'
import { Gateway, testTools } from '../src/gateway.ts'
import { EventStore } from '../src/store.ts'
import { boot, tempHome, type BootOptions } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

async function waitDead(pid: number, ms = 4000): Promise<boolean> {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (!alive(pid)) return true
    await sleep(50)
  }
  return !alive(pid)
}

async function setup(options: BootOptions = {}) {
  const { home, cleanup } = tempHome()
  const d = await boot(home, { testTools: true, ...options })
  cleanups.push(cleanup, () => d.close())
  const b = await d.pair()
  const startRun = async (kind: string) => {
    const res = await b.post('/api/test/runs', { kind })
    assert.equal(res.status, 201)
    const body = (await res.json()) as { run: RunRecord; pidFile: string; pid: number }
    // Make sure no test leaks a process even if it fails halfway.
    cleanups.push(() => {
      try {
        if (alive(body.pid)) process.kill(body.pid, 'SIGKILL')
      } catch {
        /* gone */
      }
    })
    return body
  }
  const runs = () => b.json<RunsResponse>('/api/runs')
  const stopAll = async () => {
    const res = await b.post('/api/stop')
    assert.equal(res.status, 200)
    return (await res.json()) as RunsResponse
  }
  const act = async (body: Record<string, unknown>) => (await (await b.post('/api/actions', body)).json()) as ActionResponse
  const types = (prefix: string) => d.store.since(0).filter((e) => e.type.startsWith(prefix)).map((e) => e.type)
  return { home, d, b, startRun, runs, stopAll, act, types }
}

describe('Stop kills a running process', () => {
  it('stops a running fake CLI and records it', async () => {
    const { startRun, stopAll, runs, d } = await setup()
    const { run, pid } = await startRun('sleep')
    assert.equal(run.status, 'running')
    assert.ok(alive(pid))

    const after = await stopAll()
    assert.equal(await waitDead(pid), true, 'the process is really gone')
    const stopped = after.runs.find((r) => r.id === run.id)!
    assert.equal(stopped.status, 'stopped')
    assert.ok(stopped.stopRequestedAt)
    assert.ok(stopped.finishedAt)
    assert.equal((await runs()).runs.find((r) => r.id === run.id)?.status, 'stopped')

    const trail = d.store.since(0).filter((e) => /^(run|stop)\./.test(e.type)).map((e) => e.type)
    assert.deepEqual(trail, ['run.started', 'stop.requested', 'run.cancelling', 'run.stopped'])
  })

  it('goes through cancelling before stopped, and says so in the record', async () => {
    const { startRun, d, stopAll } = await setup()
    const { run } = await startRun('sleep')
    await stopAll()
    const cancelling = d.store.since(0).find((e) => e.type === 'run.cancelling')!
    const stopped = d.store.since(0).find((e) => e.type === 'run.stopped')!
    assert.ok(cancelling.seq < stopped.seq)
    assert.equal(stopped.payload.runId, run.id)
  })

  it('force-kills a process that ignores the polite cancel', async () => {
    const { startRun, stopAll } = await setup({ stopGraceMs: 300 })
    const { run, pid } = await startRun('stubborn')
    const started = Date.now()
    const after = await stopAll()
    assert.equal(await waitDead(pid), true)
    assert.equal(after.runs.find((r) => r.id === run.id)?.status, 'stopped')
    assert.ok(Date.now() - started < 6000, 'it did not hang')
  })

  it('kills the whole process tree, not just the first process', async () => {
    const { startRun, stopAll } = await setup()
    const { pid, pidFile } = await startRun('tree')
    const deadline = Date.now() + 5000
    while (!existsSync(pidFile) && Date.now() < deadline) await sleep(50)
    const grandchild = Number(readFileSync(pidFile, 'utf8'))
    assert.ok(alive(grandchild), 'the grandchild is running before the stop')
    await stopAll()
    assert.equal(await waitDead(pid), true)
    assert.equal(await waitDead(grandchild), true, 'the grandchild died with it')
  })

  it('stops several runs at once', async () => {
    const { startRun, stopAll } = await setup()
    const a = await startRun('sleep')
    const b = await startRun('stubborn')
    const after = await stopAll()
    assert.deepEqual(after.runs.filter((r) => r.id === a.run.id || r.id === b.run.id).map((r) => r.status), ['stopped', 'stopped'])
    assert.equal(await waitDead(a.pid), true)
    assert.equal(await waitDead(b.pid), true)
  })

  it('answers cleanly when nothing is running, and still pauses', async () => {
    const { stopAll, d } = await setup()
    const after = await stopAll()
    assert.equal(after.paused, true)
    assert.deepEqual(after.runs, [])
    assert.ok(d.store.since(0).some((e) => e.type === 'stop.requested'))
  })

  it('leaves runs that finished on their own as finished or failed, not stopped', async () => {
    const { startRun, runs, stopAll } = await setup()
    const ok = await startRun('quick')
    const bad = await startRun('fail')
    await sleep(600)
    await stopAll()
    const byId = Object.fromEntries((await runs()).runs.map((r) => [r.id, r]))
    assert.equal(byId[ok.run.id]?.status, 'finished')
    assert.equal(byId[bad.run.id]?.status, 'failed')
    assert.equal(byId[bad.run.id]?.exitCode, 3)
  })
})

describe('Stop one run', () => {
  it('stops only that run and does not pause anything', async () => {
    const { startRun, b, runs, d } = await setup()
    const one = await startRun('sleep')
    const two = await startRun('sleep')
    const res = await b.post(`/api/runs/${one.run.id}/stop`)
    assert.equal(res.status, 200)
    assert.equal(await waitDead(one.pid), true)
    assert.ok(alive(two.pid), 'the other run keeps going')
    const state = await runs()
    assert.equal(state.paused, false)
    assert.equal(state.runs.find((r) => r.id === two.run.id)?.status, 'running')
    assert.equal(d.store.since(0).find((e) => e.type === 'stop.requested')?.payload.scope, one.run.id)
  })

  it('answers 404 for an unknown run', async () => {
    const { b } = await setup()
    assert.equal((await b.post('/api/runs/00000000-0000-4000-8000-000000000000/stop')).status, 404)
  })
})

describe('after Stop', () => {
  it('refuses new runs and everything with an effect, until resumed', async () => {
    const { b, stopAll, act, d } = await setup()
    await stopAll()
    const res = await b.post('/api/test/runs', { kind: 'sleep' })
    assert.equal(res.status, 409)
    assert.deepEqual(await res.json(), { error: 'paused' })

    const write = await act({ tool: 'test.write', args: { path: '/a' } })
    assert.deepEqual([write.status, (write as { reason?: string }).reason], ['denied', 'paused'])
    const read = await act({ tool: 'test.read', args: { text: 'still fine' } })
    assert.equal(read.status, 'executed', 'reads keep working so the UI can show what happened')

    // An approval that already existed cannot be used while stopped either.
    const resumed = await b.post('/api/resume')
    assert.equal((await resumed.json() as RunsResponse).paused, false)
    const askAgain = await act({ tool: 'test.send', args: { to: 'a@example.com' } })
    assert.equal(askAgain.status, 'approval_required')
    assert.ok(d.store.since(0).some((e) => e.type === 'stop.resumed'))
  })

  it('does not let an approved action run while stopped', async () => {
    const { b, act } = await setup()
    const asked = await act({ tool: 'test.send', args: { to: 'a@example.com' } })
    assert.equal(asked.status, 'approval_required')
    const id = (asked as { approvalId: string }).approvalId
    await b.post(`/api/approvals/${id}/approve`)
    await b.post('/api/stop')
    const r = await act({ tool: 'test.send', args: { to: 'a@example.com' }, approvalId: id })
    assert.equal(r.status, 'denied')
    const effects = (await b.json<{ effects: unknown[] }>('/api/gateway/test-effects')).effects
    assert.deepEqual(effects, [])
  })

  it('works again after resume', async () => {
    const { b, startRun, stopAll } = await setup()
    await stopAll()
    await b.post('/api/resume')
    const { pid } = await startRun('sleep')
    assert.ok(alive(pid))
  })

  it('revokes the stopped run\'s pending and approved approvals', async () => {
    const { startRun, b, act, stopAll, d } = await setup()
    const { run } = await startRun('sleep')
    const pending = await act({ tool: 'test.send', args: { to: 'p@example.com' }, runId: run.id })
    const approvedAsk = await act({ tool: 'test.send', args: { to: 'q@example.com' }, runId: run.id })
    await b.post(`/api/approvals/${(approvedAsk as { approvalId: string }).approvalId}/approve`)
    const unrelated = await act({ tool: 'test.send', args: { to: 'r@example.com' } })

    await stopAll()
    const list = (await b.json<{ approvals: ApprovalRecord[] }>('/api/approvals')).approvals
    const status = (id: string) => list.find((a) => a.id === id)?.status
    assert.equal(status((pending as { approvalId: string }).approvalId), 'denied')
    assert.equal(status((approvedAsk as { approvalId: string }).approvalId), 'denied')
    assert.equal(status((unrelated as { approvalId: string }).approvalId), 'pending', 'approvals with no run are untouched')
    const denied = d.store.since(0).filter((e) => e.type === 'approval.denied' && e.payload.reason === 'run_stopped')
    assert.equal(denied.length, 2)
    assert.equal(list.find((a) => a.id === (pending as { approvalId: string }).approvalId)?.decidedBy?.startsWith('system:'), true)
  })

  it('lists what had already been done, because it cannot be undone', async () => {
    const { startRun, b, act, stopAll } = await setup()
    const { run } = await startRun('sleep')
    const done = await act({ tool: 'test.write', args: { path: '/work/a.txt' }, runId: run.id })
    assert.equal(done.status, 'executed')
    const after = await stopAll()
    const rec = after.runs.find((r) => r.id === run.id)!
    assert.equal(rec.sideEffects.length, 1)
    assert.deepEqual({ tool: rec.sideEffects[0]!.tool, target: rec.sideEffects[0]!.target }, { tool: 'test.write', target: '/work/a.txt' })
    assert.equal((await b.json<RunsResponse>('/api/runs')).runs.find((r) => r.id === run.id)?.sideEffects.length, 1)
  })
})

describe('who may stop', () => {
  it('needs a paired browser and the CSRF header', async () => {
    const { d, b, startRun } = await setup()
    const { pid } = await startRun('sleep')
    assert.equal((await d.browser().post('/api/stop')).status, 401)
    assert.equal((await b.request('/api/stop', { method: 'POST', csrf: false })).status, 403)
    assert.ok(alive(pid), 'refused requests stopped nothing')
  })
})

describe('shutdown and restart', () => {
  it('kills child processes when the daemon shuts down', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const d = await boot(home, { testTools: true, stopConfirmMs: 1500 })
    const b = await d.pair()
    const res = await b.post('/api/test/runs', { kind: 'sleep' })
    const { pid } = (await res.json()) as { pid: number }
    cleanups.push(() => {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        /* gone */
      }
    })
    assert.ok(alive(pid))
    await d.close()
    assert.equal(await waitDead(pid), true, 'nothing outlives junosd')
  })

  it('marks runs a dead daemon left behind as failed', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const first = await boot(home, { testTools: true })
    await first.close()
    const db = new DatabaseSync(join(home, 'junos.db'))
    db.prepare(`INSERT INTO run (id, kind, source, status, started_at) VALUES ('stale-1', 'chat', 'test', 'running', '2026-10-22T09:00:00Z')`).run()
    db.close()

    const second = await boot(home, { testTools: true })
    cleanups.push(() => second.close())
    const b = await second.pair()
    const stale = (await b.json<RunsResponse>('/api/runs')).runs.find((r) => r.id === 'stale-1')!
    assert.equal(stale.status, 'failed')
    assert.match(stale.error ?? '', /restarted/)
  })
})

describe('when a process will not die', () => {
  it('says "stop not confirmed" instead of claiming it stopped', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const store = new EventStore(join(home, 'junos.db'))
    cleanups.push(() => store.close())
    const gateway = new Gateway({ store, tools: [] })
    // A "signal" that does nothing, standing in for a process the OS will not let us end.
    const runs = new RunManager({ store, gateway, graceMs: 100, confirmMs: 100, signal: async () => {} })
    const run = runs.start({ kind: 'test', source: 'test', command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'] })
    const pid = runs.pid(run.id)!
    // Kill it and give its exit event time to land before the store closes.
    cleanups.push(async () => {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        /* gone */
      }
      await waitDead(pid)
      await sleep(100)
    })
    const done = await runs.stop(run.id)
    assert.equal(done[0]?.status, 'stop_unconfirmed')
    assert.match(done[0]?.error ?? '', /did not exit/)
    assert.ok(store.since(0).some((e) => e.type === 'run.stop_unconfirmed'))
    assert.ok(alive(pid))
  })
})

describe('stop edge cases found in review', () => {
  async function manager(signal?: (pid: number, force: boolean) => Promise<void>) {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const store = new EventStore(join(home, 'junos.db'))
    cleanups.push(async () => {
      await sleep(150)
      store.close()
    })
    const effects: Array<Record<string, unknown>> = []
    const gateway = new Gateway({ store, tools: testTools(effects) })
    const runs = new RunManager({ store, gateway, graceMs: 100, confirmMs: 100, signal })
    const spawnOne = () => {
      const run = runs.start({ kind: 'test', source: 'test', command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'] })
      const pid = runs.pid(run.id)!
      cleanups.push(async () => {
        try {
          process.kill(pid, 'SIGKILL')
        } catch {
          /* gone */
        }
        await waitDead(pid)
      })
      return { run, pid }
    }
    return { store, gateway, runs, spawnOne }
  }

  it('corrects a false "stop not confirmed" when the process does die a moment later', async () => {
    // The kill is issued but takes effect after the confirmation window.
    const slowKill = async (pid: number, force: boolean) => {
      if (force) setTimeout(() => process.kill(pid, 'SIGKILL'), 400)
    }
    const { runs, spawnOne, store } = await manager(slowKill)
    const { run } = spawnOne()
    const [first] = await runs.stop(run.id)
    assert.equal(first?.status, 'stop_unconfirmed')
    const end = Date.now() + 4000
    while (runs.get(run.id)?.status !== 'stopped' && Date.now() < end) await sleep(50)
    assert.equal(runs.get(run.id)?.status, 'stopped', 'a late exit corrects the record')
    assert.ok(store.since(0).some((e) => e.type === 'run.stopped' && e.payload.late === true))
  })

  it('does not report a stopped run on shutdown when the process survived', async () => {
    const { runs, spawnOne } = await manager(async () => {})
    const { run } = spawnOne()
    await runs.closeAll()
    const rec = runs.get(run.id)!
    assert.equal(rec.status, 'stop_unconfirmed')
    assert.match(rec.error ?? '', /still running/)
  })

  it('records the side effects of a run whose stop could not be confirmed', async () => {
    const { runs, spawnOne, gateway } = await manager(async () => {})
    const { run } = spawnOne()
    const done = await gateway.request('ui', { tool: 'test.write', args: { path: '/work/a.txt' }, runId: run.id })
    assert.equal(done.status, 'executed')
    const [stopped] = await runs.stop(run.id)
    assert.equal(stopped?.status, 'stop_unconfirmed')
    assert.deepEqual(stopped?.sideEffects.map((e) => e.target), ['/work/a.txt'])
  })

  it('reports when the current Stop began, and clears it on Resume', async () => {
    const { b, stopAll } = await setup()
    assert.equal((await b.json<RunsResponse>('/api/runs')).pausedAt, null)
    const after = await stopAll()
    assert.ok(after.pausedAt && !Number.isNaN(Date.parse(after.pausedAt)))
    const resumed = (await (await b.post('/api/resume')).json()) as RunsResponse
    assert.equal(resumed.pausedAt, null)
  })
})

// A plain child_process smoke check that the fake processes used above behave as described.
describe('fixtures', () => {
  it('the stubborn fake ignores SIGTERM', { skip: process.platform === 'win32' }, async () => {
    const child = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], { stdio: 'ignore' })
    cleanups.push(() => void child.kill('SIGKILL'))
    await sleep(300)
    child.kill('SIGTERM')
    await sleep(300)
    assert.equal(child.exitCode, null)
  })
})
