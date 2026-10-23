import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, it } from 'node:test'
import type { HermesOverview, HomeResponse, InboxItem, SearchResponse, TaskInput } from '@junos/shared'
import { MockHermes } from '../src/hermes/mock.ts'
import { HomeService, type HomeSources } from '../src/home.ts'
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

const item = (over: Partial<InboxItem> = {}): InboxItem => ({ id: 'i1', kind: 'result', priority: 'normal', title: 'A result', body: 'It finished.', source: 'x', status: 'new', resolution: null, refId: null, createdAt: '2026-10-23T08:00:00.000Z', updatedAt: '2026-10-23T08:00:00.000Z', snoozeUntil: null, ...over })

function sources(over: Partial<HomeSources> = {}): HomeSources {
  const hermes: HermesOverview = { mode: 'mock', reason: null, status: { state: 'idle', currentTask: null, model: 'hermes-mock', uptimeS: 5, reason: null }, steps: [], messages: [], queue: [], stopUnconfirmed: false }
  return {
    inbox: () => ({ items: [], total: 0 }),
    tasks: () => ({ tasks: [], paused: false }),
    runs: () => [],
    workflowRuns: () => [],
    hermes: async () => hermes,
    board: () => ({ columns: [], cards: [], projects: [], hermesWorkingOn: null }),
    connections: async () => [],
    scout: () => ({ running: false, findings: [] }),
    recentFiles: () => [],
    projects: () => [],
    ...over,
  }
}

describe('Home cards', () => {
  it('builds every card, each with its own status and time', async () => {
    const home = await new HomeService(sources()).get()
    assert.deepEqual(Object.keys(home.cards).sort(), ['board', 'hermes', 'needs', 'recent', 'running', 'scout', 'subscriptions', 'upcoming'])
    for (const card of Object.values(home.cards)) {
      assert.equal(card.status, 'ok')
      assert.equal(card.error, null)
      assert.match(card.asOf, /^\d{4}-\d{2}-\d{2}T/)
    }
    assert.equal(home.cards.board.data!.counts.length, 6)
  })

  it('does not let one failing card break the page', async () => {
    const home = await new HomeService(
      sources({
        board: () => {
          throw new Error('database is locked: secret detail')
        },
        scout: () => ({ running: false, findings: [] }),
      }),
    ).get()
    assert.deepEqual([home.cards.board.status, home.cards.board.data, home.cards.board.error], ['error', null, 'This could not be loaded.'])
    assert.doesNotMatch(JSON.stringify(home.cards.board), /secret detail/, 'the reason is not leaked')
    assert.equal(home.cards.needs.status, 'ok')
    assert.equal(home.cards.hermes.status, 'ok')
  })

  it('reports a slow card as too slow without holding up the others', async () => {
    const started = Date.now()
    const home = await new HomeService(sources({ cardTimeoutMs: 150, hermes: () => new Promise(() => {}) })).get()
    assert.ok(Date.now() - started < 1500)
    assert.deepEqual([home.cards.hermes.status, home.cards.hermes.error], ['error', 'This took too long to load.'])
    assert.equal(home.cards.upcoming.status, 'ok')
    assert.equal(home.cards.running.status, 'ok', 'a card that only looks at Hermes on the side still loads')
  })

  it('does not wait for the slow sign-in checks: the card says so at once, loads in the background, and is there next time', async () => {
    const connection = { provider: 'claude', label: 'Claude', state: 'connected', detail: 'Signed in', method: null, plan: null, version: null, chat: true, note: null, reconnect: null, resetsAt: null, checkedAt: '' }
    const service = new HomeService(sources({ slowCardTimeoutMs: 40, connections: () => new Promise((r) => setTimeout(() => r([connection as never]), 200)) }))
    const started = Date.now()
    const first = await service.get()
    assert.ok(Date.now() - started < 150, 'the page was not held up')
    assert.deepEqual([first.cards.subscriptions.status, first.cards.subscriptions.error], ['error', 'This took too long to load.'])
    assert.equal(first.cards.needs.status, 'ok')
    await sleep(300)
    const second = await service.get()
    assert.equal(second.cards.subscriptions.status, 'ok')
    assert.equal(second.cards.subscriptions.data![0]!.label, 'Claude')
  })

  it('keeps the last good data as stale when a card starts failing', async () => {
    let fail = false
    let now = Date.parse('2026-10-23T08:00:00Z')
    const service = new HomeService(
      sources({
        now: () => now,
        scout: () => {
          if (fail) throw new Error('x')
          return { running: false, findings: [{ id: 'f1', title: 'A finding', sourceName: 'S', link: '', summary: '', relevance: 80, effort: 'S', risk: 'low', touches: '', why: '', suggestion: '', status: 'new', dismissReason: null, cardId: null, createdAt: '' }] }
        },
      }),
    )
    const first = await service.get()
    assert.equal(first.cards.scout.status, 'ok')
    fail = true
    now += 60_000
    const second = await service.get()
    assert.equal(second.cards.scout.status, 'stale')
    assert.equal(second.cards.scout.data![0]!.title, 'A finding')
    assert.equal(second.cards.scout.asOf, first.cards.scout.asOf, 'it says how old the data is')
    assert.equal(second.cards.scout.error, 'This could not be loaded.')
  })

  it('shows approvals first, five at most, and offers a decision only where it is safe', async () => {
    const approval = (id: string, irreversible: boolean) => ({ id, status: 'pending' as const, digest: 'd', class: 'external-send' as const, actor: 'hermes', tool: 't', target: '', project: null, runId: null, args: {}, requestedAt: '', expiresAt: '', decidedBy: null, decidedChannel: null, decidedAt: null, irreversible })
    const items = [
      item({ id: 'r1', title: 'Result one' }),
      item({ id: 'a1', kind: 'approval', priority: 'urgent', title: 'Send mail', approval: approval('ap1', true) }),
      item({ id: 'f1', kind: 'failure', title: 'A failure' }),
      item({ id: 'a2', kind: 'approval', priority: 'urgent', title: 'Write a file', approval: approval('ap2', false) }),
      item({ id: 'r2', title: 'Result two' }),
      item({ id: 'r3', title: 'Result three' }),
      item({ id: 'r4', title: 'Result four' }),
    ]
    const home = await new HomeService(sources({ inbox: () => ({ items, total: 7 }) })).get()
    const needs = home.cards.needs.data!
    assert.equal(needs.total, 7)
    assert.equal(needs.items.length, 5)
    assert.deepEqual(needs.items.map((i) => i.id).slice(0, 2), ['a1', 'a2'])
    assert.deepEqual(needs.items[0]!.approval, { id: 'ap1', irreversible: true })
    assert.deepEqual(needs.items[1]!.approval, { id: 'ap2', irreversible: false })
    assert.equal(needs.items[2]!.approval, null)
  })

  it('lists what is running now, and the next scheduled runs soonest first', async () => {
    const task = (id: string, name: string, next: string | null, over: Record<string, unknown> = {}) => ({ id, name, cron: '0 8 * * *', timezone: 'UTC', prompt: '', provider: 'claude', model: '', effort: 'low', catchUp: 'skip', overlap: 'skip', maxAttempts: 3, enabled: true, createdAt: '', updatedAt: '', nextRuns: next ? [next] : [], lastRun: null, running: false, ...over }) as never
    const home = await new HomeService(
      sources({
        tasks: () => ({ paused: false, tasks: [task('t2', 'Later', '2026-10-25T08:00:00Z'), task('t1', 'Sooner', '2026-10-24T08:00:00Z', { running: true }), task('t3', 'Off', '2026-10-24T01:00:00Z', { enabled: false }), task('t4', 'Never', null)] }),
        scout: () => ({ running: true, findings: [] }),
      }),
    ).get()
    assert.deepEqual(home.cards.upcoming.data!.tasks.map((t) => t.name), ['Sooner', 'Later', 'Never'])
    const kinds = home.cards.running.data!.items.map((i) => i.kind)
    assert.deepEqual(kinds.sort(), ['scout', 'task'])
  })
})

describe('Home over the API', () => {
  async function daemon(options: BootOptions & { mock?: MockHermes } = {}): Promise<{ d: TestDaemon; b: Browser; home: string }> {
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const d = await boot(tmp.home, { ...options, hermes: options.mock })
    cleanups.push(() => d.close())
    return { d, b: await d.pair(), home: tmp.home }
  }

  it('answers in under a second with every card, on an empty install', async () => {
    const { b } = await daemon()
    const started = Date.now()
    const res = await b.get('/api/home')
    const home = (await res.json()) as HomeResponse
    assert.equal(res.status, 200)
    assert.ok(Date.now() - started < 1000, `took ${Date.now() - started} ms`)
    assert.ok(Object.values(home.cards).every((c) => c.status === 'ok'))
    assert.equal(home.cards.needs.data!.total, 0)
    assert.equal(home.cards.hermes.data!.mode, 'none')
    assert.deepEqual(home.cards.board.data!.counts.map((c) => c.count), [0, 0, 0, 0, 0, 0])
    assert.deepEqual(home.cards.subscriptions.data!.map((s) => s.provider).sort(), ['claude', 'codex', 'cursor', 'grok', 'nous'])
  })

  it('summarises what is waiting, scheduled, running and on the board', async () => {
    const mock = new MockHermes({ stepMs: 25 })
    const { b } = await daemon({ testTools: true, mock })
    // Waiting: an approval for a send (irreversible) and a local write.
    await b.post('/api/actions', { tool: 'test.send', args: { to: 'a@example.com' }, runId: 'r1' })
    await b.post('/api/actions', { tool: 'test.delete', args: { path: 'x' }, runId: 'r2' })
    // Scheduled.
    const task: TaskInput = { name: 'Daily briefing', prompt: 'p', provider: 'claude', model: '', effort: 'low', cron: '0 8 * * *', timezone: 'UTC', catchUp: 'skip', overlap: 'skip', maxAttempts: 3, enabled: true }
    assert.equal((await b.post('/api/tasks', task)).status, 201)
    // Board, with one card blocked and Hermes busy on another.
    await b.post('/api/kanban/cards', { title: 'Idea', column: 'ideas' })
    await b.post('/api/kanban/cards', { title: 'Stuck', column: 'blocked' })
    await b.post('/api/hermes/directives', { text: 'a slow job' })
    await until(async () => ((await b.json<HomeResponse>('/api/home')).cards.hermes.data?.state ?? '') === 'working', 5000, 'Hermes to be working')
    const home = await b.json<HomeResponse>('/api/home')
    const needs = home.cards.needs.data!
    assert.equal(needs.total, 2)
    assert.ok(needs.items.every((i) => i.kind === 'approval'))
    assert.ok(needs.items.some((i) => i.approval?.irreversible === true))
    assert.deepEqual(home.cards.upcoming.data!.tasks.map((t) => [t.name, t.cron]), [['Daily briefing', '0 8 * * *']])
    assert.ok(home.cards.upcoming.data!.tasks[0]!.next)
    assert.equal(home.cards.hermes.data!.currentTask, 'a slow job')
    assert.ok(home.cards.hermes.data!.steps.length >= 1)
    assert.deepEqual(home.cards.board.data!.counts.filter((c) => c.count).map((c) => [c.key, c.count]), [['ideas', 1], ['blocked', 1]])
    assert.deepEqual(home.cards.board.data!.blocked.map((x) => x.title), ['Stuck'])
    assert.ok(home.cards.running.data!.items.some((i) => i.kind === 'hermes'))
    await b.post('/api/hermes/stop')
  })

  it('shows recent projects and files from the index, and the latest findings', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'junos-home-')))
    cleanups.push(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))
    mkdirSync(join(root, 'app/.git'), { recursive: true })
    writeFileSync(join(root, 'app/.git/HEAD'), 'ref: refs/heads/main\n')
    writeFileSync(join(root, 'app/main.ts'), 'export {}\n')
    writeFileSync(join(root, 'notes.md'), '# notes\n')
    writeFileSync(join(root, '.env'), 'KEY=1')
    const { b, d } = await daemon()
    const added = await b.post('/api/files/folders', { path: root })
    const folder = (await added.json()) as { id: string }
    await until(async () => (await b.json<{ folders: Array<{ id: string; status: string }> }>('/api/files/folders')).folders.find((f) => f.id === folder.id)?.status === 'ready', 8000, 'the scan')
    for (let i = 1; i <= 4; i++) {
      d.store.db
        .prepare(`INSERT INTO scout_finding (id, item_id, title, title_key, source_name, link, summary, relevance, effort, risk, touches, why, suggestion, created_at) VALUES (?, 'i', ?, ?, 'S', '', '', ?, 'S', 'low', '', 'why', '', ?)`)
        .run(`3333333${i}-3333-4333-8333-333333333333`, `Finding ${i}`, `k${i}`, 50 + i * 10, new Date().toISOString())
    }
    const home = await b.json<HomeResponse>('/api/home')
    assert.deepEqual(home.cards.recent.data!.projects.map((p) => [p.name, p.fileCount]), [['app', 2]].map(([n]) => [n, home.cards.recent.data!.projects[0]!.fileCount]))
    assert.equal(home.cards.recent.data!.projects[0]!.name, 'app')
    const names = home.cards.recent.data!.files.map((f) => f.name)
    assert.ok(names.includes('notes.md') && names.includes('main.ts'))
    assert.ok(!names.includes('.env'), 'a secret never shows')
    assert.deepEqual(home.cards.scout.data!.map((f) => f.title), ['Finding 4', 'Finding 3', 'Finding 2'])
  })

  it('needs a paired browser', async () => {
    const { d } = await daemon()
    assert.equal((await d.browser().get('/api/home')).status, 401)
    assert.equal((await d.browser().get('/api/search?q=abc')).status, 401)
  })
})

describe('search', () => {
  it('finds chats, messages, cards, findings, Inbox items, tasks, workflows, projects and files, and says where each lives', async () => {
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'junos-search-')))
    cleanups.push(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))
    mkdirSync(join(root, 'zebra-app/.git'), { recursive: true })
    writeFileSync(join(root, 'zebra-app/.git/HEAD'), 'x')
    writeFileSync(join(root, 'zebra-app/readme.md'), 'the zebra project readme\n')
    writeFileSync(join(root, 'secret-zebra.token'), 'zebra secret')
    const d = await boot(tmp.home, { testTools: true })
    cleanups.push(() => d.close())
    const b = await d.pair()
    await b.post('/api/files/folders', { path: root })
    await until(async () => (await b.json<{ folders: Array<{ status: string }> }>('/api/files/folders')).folders[0]?.status === 'ready', 8000, 'the scan')
    await b.post('/api/kanban/cards', { title: 'Feed the zebra', body: 'daily' })
    await b.post('/api/tasks', { name: 'Zebra report', prompt: 'p', provider: 'claude', model: '', effort: 'low', cron: '0 8 * * *', timezone: 'UTC', catchUp: 'skip', overlap: 'skip', maxAttempts: 3, enabled: true })
    await b.post('/api/actions', { tool: 'test.send', args: { to: 'zebra@example.com' }, runId: 'r' })
    await b.post('/api/workflows', { yaml: 'version: 1\nname: Zebra census\nsteps:\n  - id: now\n    type: tool\n    tool: time.now\n' })
    d.store.db.prepare(`INSERT INTO scout_finding (id, item_id, title, title_key, source_name, relevance, effort, risk, touches, why, suggestion, created_at) VALUES ('44444444-4444-4444-8444-444444444444', 'i', 'Zebra release', 'kz', 'Feed', 70, 'S', 'low', '', 'why', '', ?)`).run(new Date().toISOString())
    d.store.db.prepare(`INSERT INTO scout_finding (id, item_id, title, title_key, source_name, relevance, effort, risk, touches, why, suggestion, status, created_at) VALUES ('55555555-5555-4555-8555-555555555555', 'i', 'Zebra dismissed', 'kd', 'Feed', 70, 'S', 'low', '', 'why', '', 'dismissed', ?)`).run(new Date().toISOString())
    const conv = (await (await b.post('/api/conversations', { provider: 'claude', title: 'About zebras' })).json()) as { id: string }
    d.store.db.prepare(`INSERT INTO message (id, conversation_id, role, content_md, status, created_at) VALUES ('m1', ?, 'user', 'where do zebra herds sleep?', 'complete', ?)`).run(conv.id, new Date().toISOString())

    const res = await b.json<SearchResponse>('/api/search?q=zebra')
    const by = Object.fromEntries(res.groups.map((g) => [g.type, g.hits]))
    assert.deepEqual(Object.keys(by).sort(), ['cards', 'conversations', 'files', 'findings', 'inbox', 'messages', 'projects', 'tasks', 'workflows'])
    assert.equal(by.conversations![0]!.to, `/chat?c=${conv.id}`)
    assert.match(by.messages![0]!.subtitle, /zebra herds sleep/)
    assert.equal(by.cards![0]!.title, 'Feed the zebra')
    assert.match(by.cards![0]!.to, /^\/board\?card=/)
    assert.deepEqual(by.findings!.map((h) => h.title), ['Zebra release'], 'a dismissed finding does not appear')
    assert.equal(by.tasks![0]!.to, '/schedules')
    assert.equal(by.workflows![0]!.title, 'Zebra census')
    assert.equal(by.projects![0]!.title, 'zebra-app')
    assert.deepEqual(by.files!.map((h) => h.subtitle), ['zebra-app/readme.md'], 'a credential-looking file is never offered')
  })

  it('takes plain text only: wildcards are literal, and very short or empty questions find nothing', async () => {
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const d = await boot(tmp.home)
    cleanups.push(() => d.close())
    const b = await d.pair()
    await b.post('/api/kanban/cards', { title: '100% done' })
    await b.post('/api/kanban/cards', { title: 'other' })
    const find = async (q: string) => (await b.json<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)).groups.flatMap((g) => g.hits.map((h) => h.title))
    assert.deepEqual(await find('100%'), ['100% done'])
    assert.deepEqual(await find('%'), [], 'one character is too short')
    assert.deepEqual(await find('o_h'), [], 'an underscore is not a wildcard')
    assert.deepEqual(await find(''), [])
    assert.deepEqual(await find("x' OR 1=1 --"), [])
  })
})
