import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, it } from 'node:test'
import type { ConversationRecord, CronPreviewResponse, InboxResponse, ScheduledRunRecord, TaskInput, TaskRecord, TasksResponse } from '@junos/shared'
import { Gateway } from '../src/gateway.ts'
import { InboxService } from '../src/inbox.ts'
import { RunManager } from '../src/runs.ts'
import { Scheduler, previewCron, type TaskExecutor } from '../src/scheduler.ts'
import { EventStore } from '../src/store.ts'
import { Browser, boot, fakeProviderEnv, tempHome, type BootOptions, type TestDaemon } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function until(cond: () => boolean | Promise<boolean>, ms = 8000, what = 'condition'): Promise<void> {
  const end = Date.now() + ms
  while (!(await cond())) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await sleep(25)
  }
}

const T0 = Date.parse('2026-10-22T07:59:00Z')
const at = (iso: string) => Date.parse(iso)

const BASE: TaskInput = {
  name: 'Daily briefing',
  prompt: 'Summarise the news',
  provider: 'claude',
  model: '',
  effort: 'low',
  cron: '0 8 * * *',
  timezone: 'UTC',
  catchUp: 'skip',
  overlap: 'skip',
  maxAttempts: 3,
  enabled: true,
}

interface Ctx {
  home: string
  clock: { now: number }
  d: TestDaemon
  b: Browser
  create(over?: Partial<TaskInput>): Promise<TaskRecord>
  runs(taskId: string): Promise<ScheduledRunRecord[]>
  inbox(): Promise<InboxResponse>
  close(): Promise<void>
}

/** A daemon with a clock the test controls. Pass `home` to restart on the same data. */
async function daemon(options: BootOptions & { env?: Record<string, string>; home?: string; clock?: { now: number }; ack?: boolean } = {}): Promise<Ctx> {
  const owned = options.home ? null : tempHome()
  const home = options.home ?? owned!.home
  if (owned) cleanups.push(owned.cleanup)
  const clock = options.clock ?? { now: T0 }
  const d = await boot(home, { ...options, now: () => clock.now, env: fakeProviderEnv(options.env) })
  let closed = false
  const close = async () => {
    if (!closed) {
      closed = true
      await d.close()
    }
  }
  cleanups.push(close)
  const b = await d.pair()
  if (options.ack !== false) await b.post('/api/chat/disclosures/claude/ack')
  return {
    home,
    clock,
    d,
    b,
    close,
    create: async (over = {}) => {
      const res = await b.post('/api/tasks', { ...BASE, ...over })
      assert.equal(res.status, 201, await res.clone().text())
      return (await res.json()) as TaskRecord
    },
    runs: async (taskId) => (await b.json<{ runs: ScheduledRunRecord[] }>(`/api/tasks/${taskId}/runs`)).runs,
    inbox: () => b.json<InboxResponse>('/api/inbox'),
  }
}

const statuses = (runs: ScheduledRunRecord[]) => runs.map((r) => r.status)

describe('task validation and preview', () => {
  it('creates a task and shows its next five fire times in its own timezone', async () => {
    const { create } = await daemon({ clock: { now: at('2026-10-22T10:00:00Z') } })
    const t = await create({ cron: '0 8 * * 1-5', timezone: 'Europe/Copenhagen' })
    assert.equal(t.nextRuns.length, 5)
    // 08:00 in Copenhagen is 06:00Z while summer time lasts and 07:00Z after the clocks change on Oct 25.
    assert.deepEqual(t.nextRuns.slice(0, 3), ['2026-10-23T06:00:00.000Z', '2026-10-26T07:00:00.000Z', '2026-10-27T07:00:00.000Z'])
    assert.equal(t.enabled, true)
    assert.equal(t.lastRun, null)
  })

  it('refuses a bad schedule, a too-frequent one, a bad timezone and bad fields', async () => {
    const { b } = await daemon()
    const bad = async (over: Record<string, unknown>) => {
      const res = await b.post('/api/tasks', { ...BASE, ...over })
      assert.equal(res.status, 400, JSON.stringify(over))
      return ((await res.json()) as { error: string }).error
    }
    assert.equal(await bad({ cron: 'nonsense' }), 'bad_schedule')
    assert.equal(await bad({ cron: '*/5 * * * * *' }), 'bad_schedule') // six fields (seconds)
    assert.equal(await bad({ cron: '* * * * *' }), 'bad_schedule') // every minute burns the plan
    assert.equal(await bad({ cron: '*/5 * * * *' }), 'bad_schedule')
    assert.equal(await bad({ timezone: 'Nowhere/Land' }), 'bad_schedule')
    assert.equal(await bad({ name: '   ' }), 'bad_name')
    assert.equal(await bad({ prompt: '' }), 'bad_prompt')
    assert.equal(await bad({ prompt: 'x'.repeat(10_001) }), 'bad_prompt')
    assert.equal(await bad({ provider: 'nobody' }), 'bad_provider')
    assert.equal(await bad({ model: 'gpt-9' }), 'bad_model')
    assert.equal(await bad({ effort: 'ludicrous' }), 'bad_effort')
    assert.equal(await bad({ provider: 'codex', effort: 'max' }), 'bad_model')
    assert.equal(await bad({ catchUp: 'everything' }), 'bad_catch_up')
    assert.equal(await bad({ overlap: 'both' }), 'bad_overlap')
    assert.equal(await bad({ maxAttempts: 0 }), 'bad_attempts')
    assert.equal(await bad({ maxAttempts: 9 }), 'bad_attempts')
  })

  it('previews a schedule before it is saved', async () => {
    const { b } = await daemon({ clock: { now: at('2026-10-22T10:00:00Z') } })
    const ok = await b.json<CronPreviewResponse>('/api/tasks/preview?cron=0%209%20*%20*%20*&tz=UTC')
    assert.deepEqual([ok.valid, ok.nextRuns[0]], [true, '2026-10-23T09:00:00.000Z'])
    const bad = await b.json<CronPreviewResponse>('/api/tasks/preview?cron=nope&tz=UTC')
    assert.deepEqual([bad.valid, bad.nextRuns], [false, []])
    assert.ok(bad.error)
  })

  it('accepts a daily and an hourly schedule and refuses anything under ten minutes apart', () => {
    const from = new Date('2026-10-22T10:00:00Z')
    assert.equal(previewCron('0 8 * * *', 'UTC', from).valid, true)
    assert.equal(previewCron('0 * * * *', 'UTC', from).valid, true)
    assert.equal(previewCron('*/10 * * * *', 'UTC', from).valid, true)
    assert.equal(previewCron('*/9 * * * *', 'UTC', from).valid, false)
  })
})

describe('a daily task runs unattended', () => {
  it('fires at its time, runs the prompt through the provider, saves the log and puts the result in the Inbox', async () => {
    const ctx = await daemon()
    const t = await ctx.create()
    assert.deepEqual(await ctx.runs(t.id), [], 'nothing before the first fire time')

    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'succeeded', 8000, 'the scheduled run')
    const [run] = await ctx.runs(t.id)
    assert.equal(run!.dueAt, '2026-10-22T08:00:00.000Z')
    assert.equal(run!.output, 'echo: Summarise the news')
    assert.equal(run!.attempt, 0)
    assert.equal(run!.manual, false)
    assert.ok(run!.runId, 'linked to the provider run')
    assert.match(run!.log.join('\n'), /Started \(attempt 1 of 3\)/)
    assert.match(run!.log.join('\n'), /Finished, 24 characters/)

    const item = (await ctx.inbox()).items.find((i) => i.kind === 'result')!
    assert.match(item.title, /Daily briefing: finished/)
    assert.match(item.body, /echo: Summarise the news/)
    const types = ctx.d.store.since(0).filter((e) => e.type.startsWith('task.run.')).map((e) => e.type)
    assert.deepEqual(types, ['task.run.claimed', 'task.run.succeeded'])

    const rec = (await ctx.b.json<TasksResponse>('/api/tasks')).tasks[0]!
    assert.equal(rec.lastRun?.status, 'succeeded')
    assert.equal(rec.running, false)
  })

  it('records what was asked of the provider on the run', async () => {
    const ctx = await daemon()
    const t = await ctx.create({ effort: 'high', model: 'opus' })
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'succeeded')
    const run = (await ctx.b.json<{ runs: Array<{ id: string; provider: string; model: string; effort: string }> }>('/api/runs')).runs.find((r) => r.provider === 'claude')!
    assert.deepEqual([run.model, run.effort], ['opus', 'high'])
  })

  it('does not run a slot twice however often the scheduler looks, and fires again the next day', async () => {
    const ctx = await daemon()
    const t = await ctx.create()
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'succeeded')
    await sleep(400) // ten more scheduler passes
    assert.equal((await ctx.runs(t.id)).length, 1)
    ctx.clock.now = at('2026-10-23T08:00:05Z')
    await until(async () => (await ctx.runs(t.id)).filter((r) => r.status === 'succeeded').length === 2, 8000, 'the second day')
    assert.deepEqual((await ctx.runs(t.id)).map((r) => r.dueAt).sort(), ['2026-10-22T08:00:00.000Z', '2026-10-23T08:00:00.000Z'])
  })

  it('never backfills the past when a task is created', async () => {
    const ctx = await daemon({ clock: { now: at('2026-10-22T12:00:00Z') } })
    const t = await ctx.create()
    await sleep(300)
    assert.deepEqual(await ctx.runs(t.id), [])
  })

  it('does not run a paused task, and does not owe it the slots missed while paused', async () => {
    const ctx = await daemon()
    const t = await ctx.create({ catchUp: 'all' })
    assert.equal(((await (await ctx.b.post(`/api/tasks/${t.id}/pause`)).json()) as TaskRecord).enabled, false)
    ctx.clock.now = at('2026-10-24T09:00:00Z') // two slots pass while paused
    await sleep(300)
    assert.deepEqual(await ctx.runs(t.id), [])
    const resumed = (await (await ctx.b.post(`/api/tasks/${t.id}/resume`)).json()) as TaskRecord
    assert.equal(resumed.enabled, true)
    await sleep(300)
    assert.deepEqual(await ctx.runs(t.id), [], 'resuming starts from now, with no backfill')
    ctx.clock.now = at('2026-10-25T08:00:05Z')
    await until(async () => (await ctx.runs(t.id)).length === 1)
  })
})

describe('Run now', () => {
  it('queues a run that does not wait for the schedule, and is marked manual', async () => {
    const ctx = await daemon()
    const t = await ctx.create()
    const res = await ctx.b.post(`/api/tasks/${t.id}/run`)
    assert.equal(res.status, 202)
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'succeeded')
    const [run] = await ctx.runs(t.id)
    assert.equal(run!.manual, true)
    assert.equal(run!.output, 'echo: Summarise the news')
    assert.ok((await ctx.inbox()).items.some((i) => i.kind === 'result'))
  })

  it('is refused while Stop is in effect', async () => {
    const ctx = await daemon()
    const t = await ctx.create()
    await ctx.b.post('/api/stop')
    const res = await ctx.b.post(`/api/tasks/${t.id}/run`)
    assert.equal(res.status, 409)
    assert.equal(((await res.json()) as { error: string }).error, 'paused')
  })

  it('answers 404 for a task that does not exist', async () => {
    const { b } = await daemon()
    assert.equal((await b.post('/api/tasks/00000000-0000-4000-8000-000000000000/run')).status, 404)
  })
})

describe('restarts neither repeat nor lose a slot', () => {
  it('does not run a finished slot again after a restart, and still fires the next one', async () => {
    const first = await daemon()
    const t = await first.create()
    first.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await first.runs(t.id))[0]?.status === 'succeeded')
    await first.close()

    const second = await daemon({ home: first.home, clock: first.clock })
    await sleep(500)
    assert.equal((await second.runs(t.id)).length, 1, 'the slot that already ran is not run again')
    second.clock.now = at('2026-10-23T08:00:05Z')
    await until(async () => (await second.runs(t.id)).filter((r) => r.status === 'succeeded').length === 2, 8000, 'the next day')
  })

  it('lets two schedulers on the same data run a slot exactly once', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const store = new EventStore(join(home, 'junos.db'))
    cleanups.push(async () => {
      await sleep(150)
      store.close()
    })
    const gateway = new Gateway({ store, tools: [] })
    const runs = new RunManager({ store, gateway })
    const inbox = new InboxService({ store, gateway, runs })
    let calls = 0
    const execute: TaskExecutor = {
      async run() {
        calls += 1
        await sleep(100)
        return { text: 'done' }
      },
    }
    let now = T0
    const make = () => new Scheduler({ store, runs, inbox, execute, now: () => now, tickMs: 20 })
    const a = make()
    const b = make()
    const t = a.create({ ...BASE, provider: 'codex' })
    now = at('2026-10-22T08:00:05Z')
    for (let i = 0; i < 30; i++) {
      a.tick()
      b.tick()
      await sleep(10)
    }
    await a.stop()
    await b.stop()
    assert.equal(calls, 1, 'one slot, one run')
    assert.equal(a.runs(t.id).length, 1)
    assert.equal(a.runs(t.id)[0]!.status, 'succeeded')
  })

  it('recovers a run whose daemon died mid-way: marks it lost, retries the same row, and runs it once', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const store = new EventStore(join(home, 'junos.db'))
    cleanups.push(async () => {
      await sleep(150)
      store.close()
    })
    const gateway = new Gateway({ store, tools: [] })
    const runs = new RunManager({ store, gateway })
    const inbox = new InboxService({ store, gateway, runs })
    let calls = 0
    const execute: TaskExecutor = {
      async run() {
        calls += 1
        return { text: 'recovered' }
      },
    }
    let now = at('2026-10-22T08:10:00Z')
    const s = new Scheduler({ store, runs, inbox, execute, now: () => now, tickMs: 20, backoffMs: [1000] })
    const t = s.create({ ...BASE, provider: 'codex' })
    // A row a dead daemon left behind: running, lease expired, owned by nobody alive.
    store.db
      .prepare(`INSERT INTO scheduled_run (id, task_id, due_at, status, lease_owner, lease_expires_at, started_at, created_at) VALUES ('lost-1', ?, '2026-10-22T08:00:00.000Z', 'running', 'dead-daemon', '2026-10-22T08:02:00.000Z', '2026-10-22T08:00:01.000Z', '2026-10-22T08:00:00.000Z')`)
      .run(t.id)
    s.tick()
    const lost = s.run('lost-1')!
    assert.equal(lost.status, 'due', 'made due again, same row')
    assert.equal(lost.attempt, 1)
    assert.match(lost.error ?? '', /daemon stopped/)
    assert.equal(calls, 0, 'not run before its backoff')
    now += 2000
    for (let i = 0; i < 10; i++) {
      s.tick()
      await sleep(15)
    }
    await s.stop()
    assert.equal(s.run('lost-1')!.status, 'succeeded')
    assert.equal(calls, 1)
    assert.equal(s.runs(t.id).length, 1, 'recovery reuses the row, no second row')
  })

  it('lets a retry survive a restart, and does not skip it as stale', async () => {
    const { home: dir, cleanup } = tempHome()
    cleanups.push(cleanup)
    const failFile = join(dir, 'fails.txt')
    writeFileSync(failFile, '1')
    const first = await daemon({ env: { JUNOS_FAKE_FAIL_FILE: failFile }, schedulerBackoffMs: [60_000] })
    const t = await first.create({ catchUp: 'skip' })
    first.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => {
      const r = (await first.runs(t.id))[0]
      return r?.status === 'due' && r.attempt === 1
    }, 8000, 'the failed first attempt to be queued for retry')
    await first.close()

    const second = await daemon({ home: first.home, clock: first.clock, env: { JUNOS_FAKE_FAIL_FILE: failFile }, schedulerBackoffMs: [60_000] })
    second.clock.now = at('2026-10-22T09:30:00Z') // long after the slot: a first attempt would now be stale
    await until(async () => (await second.runs(t.id))[0]?.status === 'succeeded', 8000, 'the retry after the restart')
    const runs = await second.runs(t.id)
    assert.equal(runs.length, 1)
    assert.equal(runs[0]!.attempt, 1)
  })
})

describe('catch-up after the daemon was down', () => {
  async function downFor(policy: 'skip' | 'once' | 'all', cron: string, from: string, until_: string) {
    const first = await daemon({ clock: { now: at(from) } })
    const t = await first.create({ cron, catchUp: policy })
    await first.close()
    first.clock.now = at(until_)
    const second = await daemon({ home: first.home, clock: first.clock })
    return { second, t }
  }

  it('skip: slots missed while down are skipped, none run', async () => {
    const { second, t } = await downFor('skip', '0 * * * *', '2026-10-22T07:59:00Z', '2026-10-22T11:30:00Z')
    await until(async () => (await second.runs(t.id)).length === 4, 8000, 'four missed slots')
    assert.deepEqual(statuses(await second.runs(t.id)), ['skipped', 'skipped', 'skipped', 'skipped'])
    await sleep(300)
    assert.ok((await second.runs(t.id)).every((r) => r.output === null))
    assert.ok(!(await second.inbox()).items.some((i) => i.kind === 'result'))
  })

  it('once: the missed slots collapse into one run of the latest', async () => {
    const { second, t } = await downFor('once', '0 * * * *', '2026-10-22T07:59:00Z', '2026-10-22T11:30:00Z')
    await until(async () => (await second.runs(t.id)).filter((r) => r.status === 'succeeded').length === 1 && (await second.runs(t.id)).length === 4, 8000, 'one run and three skipped')
    const runs = await second.runs(t.id)
    assert.equal(runs.find((r) => r.status === 'succeeded')!.dueAt, '2026-10-22T11:00:00.000Z')
    assert.equal(runs.filter((r) => r.status === 'skipped').length, 3)
    assert.match(runs.find((r) => r.status === 'skipped')!.error ?? '', /Collapsed into one/)
  })

  it('all: every missed slot runs, one after another', async () => {
    const { second, t } = await downFor('all', '0 * * * *', '2026-10-22T07:59:00Z', '2026-10-22T11:30:00Z')
    await until(async () => (await second.runs(t.id)).filter((r) => r.status === 'succeeded').length === 4, 12000, 'four catch-up runs')
    assert.deepEqual((await second.runs(t.id)).map((r) => r.dueAt).sort(), ['2026-10-22T08:00:00.000Z', '2026-10-22T09:00:00.000Z', '2026-10-22T10:00:00.000Z', '2026-10-22T11:00:00.000Z'])
  })

  it('all is capped, and the oldest slots beyond the cap are skipped', async () => {
    const { second, t } = await downFor('all', '*/30 * * * *', '2026-10-22T07:59:00Z', '2026-10-22T11:05:00Z')
    await until(async () => {
      const r = await second.runs(t.id)
      return r.length === 7 && r.filter((x) => x.status === 'succeeded').length === 5
    }, 15000, 'five runs and two skipped')
    const skipped = (await second.runs(t.id)).filter((r) => r.status === 'skipped')
    assert.deepEqual(skipped.map((r) => r.dueAt).sort(), ['2026-10-22T08:00:00.000Z', '2026-10-22T08:30:00.000Z'])
    assert.match(skipped[0]!.error ?? '', /catch-up limit/)
  })

  it('skips slots older than the catch-up limit whatever the mode', async () => {
    const { second, t } = await downFor('all', '0 8 * * *', '2026-10-22T07:59:00Z', '2026-10-22T16:00:00Z')
    await until(async () => (await second.runs(t.id)).length === 1, 8000, 'the stale slot')
    const [run] = await second.runs(t.id)
    assert.equal(run!.status, 'skipped')
    assert.match(run!.error ?? '', /more than the catch-up limit/)
  })

  it('does not apply catch-up to a run started by hand', async () => {
    const ctx = await daemon()
    const t = await ctx.create({ catchUp: 'skip' })
    ctx.clock.now = at('2026-10-22T09:00:00Z')
    await ctx.b.post(`/api/tasks/${t.id}/run`)
    await until(async () => (await ctx.runs(t.id)).some((r) => r.manual && r.status === 'succeeded'))
  })
})

describe('overlap and the one-job-per-subscription rule', () => {
  it('skip: a slot that comes due while the previous run is still going is skipped', async () => {
    const ctx = await daemon({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    const t = await ctx.create({ cron: '*/10 * * * *', overlap: 'skip' })
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'running', 8000, 'the first run')
    ctx.clock.now = at('2026-10-22T08:10:05Z')
    await until(async () => (await ctx.runs(t.id)).some((r) => r.status === 'skipped'), 8000, 'the skipped overlap')
    const skipped = (await ctx.runs(t.id)).find((r) => r.status === 'skipped')!
    assert.match(skipped.error ?? '', /previous run was still going/)
    await ctx.b.post('/api/stop')
  })

  it('queue: the later slot waits and runs once the first has ended', async () => {
    const ctx = await daemon({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    const t = await ctx.create({ cron: '*/10 * * * *', overlap: 'queue' })
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'running')
    ctx.clock.now = at('2026-10-22T08:10:05Z')
    await sleep(400)
    const waiting = (await ctx.runs(t.id)).find((r) => r.dueAt === '2026-10-22T08:10:00.000Z')!
    assert.equal(waiting.status, 'due', 'it waits instead of starting a second job')
    await ctx.b.post('/api/stop') // ends the first run
    await ctx.b.post('/api/resume')
    await until(async () => ['claimed', 'running'].includes((await ctx.runs(t.id)).find((r) => r.dueAt === '2026-10-22T08:10:00.000Z')!.status), 8000, 'the queued slot to start')
    await ctx.b.post('/api/stop')
  })

  it('keeps a task from starting while a chat is using the same subscription, and chat from starting while a task is', async () => {
    const ctx = await daemon({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    const t = await ctx.create()
    const conv = (await (await ctx.b.post('/api/conversations', {})).json()) as ConversationRecord
    assert.equal((await ctx.b.post(`/api/conversations/${conv.id}/messages`, { content: 'long chat' })).status, 201)
    await ctx.b.post(`/api/tasks/${t.id}/run`)
    await sleep(500)
    assert.equal((await ctx.runs(t.id))[0]!.status, 'due', 'the task waits for the chat')
    await ctx.b.post('/api/stop')
    await sleep(500)
    await ctx.b.post('/api/resume')
    await until(async () => ['claimed', 'running'].includes((await ctx.runs(t.id))[0]!.status), 8000, 'the task to take the slot')
    const blocked = await ctx.b.post(`/api/conversations/${conv.id}/messages`, { content: 'another' })
    assert.equal(blocked.status, 409)
    assert.equal(((await blocked.json()) as { error: string }).error, 'provider_busy')
    await ctx.b.post('/api/stop')
  })
})

describe('failures, retries and Stop', () => {
  it('retries a failed run on the same row after a backoff, then succeeds without bothering the Inbox', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const failFile = join(home, 'fails.txt')
    writeFileSync(failFile, '1')
    const ctx = await daemon({ env: { JUNOS_FAKE_FAIL_FILE: failFile }, schedulerBackoffMs: [1000] })
    const t = await ctx.create()
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => {
      const r = (await ctx.runs(t.id))[0]
      return r?.status === 'due' && r.attempt === 1
    }, 8000, 'the retry to be queued')
    const queued = (await ctx.runs(t.id))[0]!
    assert.equal(queued.retryAt, '2026-10-22T08:00:06.000Z')
    assert.match(queued.error ?? '', /scripted failure/)
    await sleep(200)
    assert.equal((await ctx.runs(t.id))[0]!.status, 'due', 'not before the backoff')
    ctx.clock.now = at('2026-10-22T08:00:08Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'succeeded')
    const runs = await ctx.runs(t.id)
    assert.equal(runs.length, 1)
    assert.equal(runs[0]!.attempt, 1)
    assert.ok(ctx.d.store.since(0).some((e) => e.type === 'task.run.retry'))
    assert.ok(!(await ctx.inbox()).items.some((i) => i.kind === 'failure'))
  })

  it('gives up after the attempt limit and raises one failure in the Inbox', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const failFile = join(home, 'fails.txt')
    writeFileSync(failFile, '9')
    const ctx = await daemon({ env: { JUNOS_FAKE_FAIL_FILE: failFile }, schedulerBackoffMs: [1000] })
    const t = await ctx.create({ maxAttempts: 2 })
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.attempt === 1, 8000, 'the first failure')
    ctx.clock.now = at('2026-10-22T08:00:10Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'failed', 8000, 'the final failure')
    const [run] = await ctx.runs(t.id)
    assert.equal(run!.attempt, 1)
    assert.match(run!.error ?? '', /scripted failure/)
    const failures = (await ctx.inbox()).items.filter((i) => i.kind === 'failure')
    assert.equal(failures.length, 1)
    assert.match(failures[0]!.title, /Daily briefing: failed/)
  })

  it('does not retry a sign-in problem, and says so in the Inbox', async () => {
    const ctx = await daemon({ env: { JUNOS_FAKE_MODE: 'login' } })
    const t = await ctx.create()
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'failed')
    assert.equal((await ctx.runs(t.id))[0]!.attempt, 0, 'no retry for something that cannot fix itself')
    assert.ok((await ctx.inbox()).items.some((i) => i.kind === 'failure'))
  })

  it('retries a plan limit later instead of giving up', async () => {
    const ctx = await daemon({ env: { JUNOS_FAKE_MODE: 'ratelimit' }, schedulerBackoffMs: [1000] })
    const t = await ctx.create()
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => {
      const r = (await ctx.runs(t.id))[0]
      return r?.status === 'due' && r.attempt === 1
    }, 8000, 'a retry to be queued after the limit')
  })

  it('refuses to send to a provider whose notice was never accepted, and tells the owner what to do', async () => {
    const ctx = await daemon({ ack: false })
    const t = await ctx.create()
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'failed')
    const [run] = await ctx.runs(t.id)
    assert.match(run!.error ?? '', /accept the notice/)
    assert.equal(run!.runId, null, 'nothing was started or sent')
    assert.ok((await ctx.inbox()).items.some((i) => i.kind === 'failure' && /accept the notice/.test(i.body)))
  })

  it('Stop ends a running task without a failure alert or a retry, and holds due slots until Resume', async () => {
    const ctx = await daemon({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    const t = await ctx.create({ cron: '*/10 * * * *', overlap: 'queue' })
    ctx.clock.now = at('2026-10-22T08:00:05Z')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'running')
    await ctx.b.post('/api/stop')
    await until(async () => (await ctx.runs(t.id)).find((r) => r.dueAt === '2026-10-22T08:00:00.000Z')?.status === 'failed', 8000, 'the stopped run')
    const stopped = (await ctx.runs(t.id)).find((r) => r.dueAt === '2026-10-22T08:00:00.000Z')!
    assert.equal(stopped.error, 'Stopped.')
    assert.equal(stopped.attempt, 0)
    assert.ok(!(await ctx.inbox()).items.some((i) => i.kind === 'failure'), 'a deliberate Stop is not a failure')
    // While stopped, a slot that comes due is held, not run.
    ctx.clock.now = at('2026-10-22T08:10:05Z')
    await sleep(400)
    const held = (await ctx.runs(t.id)).find((r) => r.dueAt === '2026-10-22T08:10:00.000Z')!
    assert.equal(held.status, 'due')
  })
})

describe('managing tasks', () => {
  it('edits a task, and a changed schedule starts from now', async () => {
    const ctx = await daemon({ clock: { now: at('2026-10-22T10:00:00Z') } })
    const t = await ctx.create()
    const res = await ctx.b.request(`/api/tasks/${t.id}`, { method: 'PUT', body: { ...BASE, name: 'Renamed', cron: '0 18 * * *' } })
    assert.equal(res.status, 200)
    const updated = (await res.json()) as TaskRecord
    assert.deepEqual([updated.name, updated.nextRuns[0]], ['Renamed', '2026-10-22T18:00:00.000Z'])
  })

  it('deletes a task and its runs, but not while it is running', async () => {
    const ctx = await daemon({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    const t = await ctx.create()
    await ctx.b.post(`/api/tasks/${t.id}/run`)
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'running')
    const refused = await ctx.b.request(`/api/tasks/${t.id}`, { method: 'DELETE' })
    assert.equal(refused.status, 409)
    await ctx.b.post('/api/stop')
    await until(async () => (await ctx.runs(t.id))[0]?.status === 'failed')
    const ok = await ctx.b.request(`/api/tasks/${t.id}`, { method: 'DELETE' })
    assert.equal(ok.status, 200)
    assert.equal((await ctx.b.get(`/api/tasks/${t.id}`)).status, 404)
    assert.deepEqual((await ctx.b.json<{ runs: unknown[] }>(`/api/tasks/${t.id}/runs`)).runs, [])
  })

  it('lists tasks with the next run, the last run and whether one is running', async () => {
    const ctx = await daemon()
    await ctx.create({ name: 'A' })
    await ctx.create({ name: 'B', cron: '0 9 * * *' })
    const list = await ctx.b.json<TasksResponse>('/api/tasks')
    assert.deepEqual(list.tasks.map((t) => t.name), ['A', 'B'])
    assert.deepEqual(list.tasks.map((t) => t.nextRuns[0]), ['2026-10-22T08:00:00.000Z', '2026-10-22T09:00:00.000Z'])
    assert.equal(list.paused, false)
  })

  it('needs a paired browser and the CSRF header for every task route', async () => {
    const ctx = await daemon()
    const t = await ctx.create()
    const anon = ctx.d.browser()
    for (const path of ['/api/tasks', `/api/tasks/${t.id}`, `/api/tasks/${t.id}/runs`, '/api/tasks/preview?cron=0%208%20*%20*%20*']) assert.equal((await anon.get(path)).status, 401, path)
    for (const path of ['/api/tasks', `/api/tasks/${t.id}/run`, `/api/tasks/${t.id}/pause`]) assert.equal((await anon.post(path, BASE)).status, 401, path)
    assert.equal((await ctx.b.request('/api/tasks', { method: 'POST', body: BASE, csrf: false })).status, 403)
    assert.equal((await ctx.b.request(`/api/tasks/${t.id}`, { method: 'DELETE', csrf: false })).status, 403)
  })
})
