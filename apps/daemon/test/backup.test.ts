import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, truncateSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, it } from 'node:test'
import type { BackupRecord, BackupsResponse, InboxResponse, KanbanBoard } from '@junos/shared'
import { verifyBackup } from '../src/backup.ts'
import { EventStore } from '../src/store.ts'
import { Browser, boot, tempHome, type BootOptions, type TestDaemon } from './harness.ts'

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

interface Ctx {
  d: TestDaemon
  b: Browser
  home: string
  dir: string
  clock: { now: number }
  close(): Promise<void>
  list(): Promise<BackupsResponse>
  run(): Promise<BackupRecord>
  files(): string[]
}

async function daemon(options: BootOptions & { home?: string; clock?: { now: number } } = {}): Promise<Ctx> {
  const owned = options.home ? null : tempHome()
  const home = options.home ?? owned!.home
  if (owned) cleanups.push(owned.cleanup)
  const clock = options.clock ?? { now: Date.now() }
  const dir = options.backupDir ?? join(home, 'backups')
  const d = await boot(home, { ...options, backupDir: dir, now: () => clock.now })
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
    d,
    b,
    home,
    dir,
    clock,
    close,
    list: () => b.json<BackupsResponse>('/api/backups'),
    run: async () => {
      const res = await b.post('/api/backups/run')
      assert.equal(res.status, 200, await res.clone().text())
      return (await res.json()) as BackupRecord
    },
    files: () => (existsSync(dir) ? readdirSync(dir).sort() : []),
  }
}

/** A real JunOS database, made by the program itself, to practise on. */
function makeDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'junos-bk-'))
  cleanups.push(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))
  const path = join(dir, 'junos.db')
  const store = new EventStore(path)
  store.append('test.event', { n: 1 })
  store.append('test.event', { n: 2 })
  store.close()
  return path
}

describe('checking a backup', () => {
  it('accepts a good database and counts what it holds', () => {
    const path = makeDb()
    assert.deepEqual(verifyBackup(path), { ok: true, problems: [] })
    assert.deepEqual(verifyBackup(path, 2), { ok: true, problems: [] })
  })

  it('refuses a missing file, an empty one, one that is not a database, and one that is damaged', () => {
    assert.match(verifyBackup(join(tmpdir(), 'junos-nowhere.db')).problems[0]!, /missing or empty/)
    const dir = mkdtempSync(join(tmpdir(), 'junos-bk-'))
    cleanups.push(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))
    writeFileSync(join(dir, 'empty.db'), '')
    assert.equal(verifyBackup(join(dir, 'empty.db')).ok, false)
    writeFileSync(join(dir, 'text.db'), 'this is not a database at all, just words '.repeat(200))
    const text = verifyBackup(join(dir, 'text.db'))
    assert.equal(text.ok, false)
    assert.match(text.problems.join(' '), /could not be opened|integrity|Missing tables/)
    // A real database with its tail cut off.
    const good = makeDb()
    const cut = join(dir, 'cut.db')
    copyFileSync(good, cut)
    truncateSync(cut, Math.floor(statSync(cut).size / 2))
    assert.equal(verifyBackup(cut).ok, false)
  })

  it('refuses a database that is not JunOS’s, or that is missing events it should hold', () => {
    const dir = mkdtempSync(join(tmpdir(), 'junos-bk-'))
    cleanups.push(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))
    const other = join(dir, 'other.db')
    const db = new DatabaseSync(other)
    db.exec('CREATE TABLE notes (x TEXT); INSERT INTO notes VALUES (1)')
    db.close()
    const result = verifyBackup(other)
    assert.equal(result.ok, false)
    assert.match(result.problems.join(' '), /Missing tables: .*event/)
    const good = makeDb()
    const behind = verifyBackup(good, 999)
    assert.equal(behind.ok, false)
    assert.match(behind.problems.join(' '), /only up to 2, but 999 existed/)
  })
})

describe('the check from the command line', () => {
  const cli = (file: string) => spawnSync(process.execPath, [join(import.meta.dirname, '..', 'src', 'backup-cli.ts'), file], { encoding: 'utf8' })

  it('says OK for a good backup and exits 0, and says what is wrong with a bad one and exits 1', () => {
    const good = makeDb()
    const ok = cli(good)
    assert.deepEqual([ok.status, ok.stdout.startsWith('OK:')], [0, true])
    const dir = mkdtempSync(join(tmpdir(), 'junos-bk-'))
    cleanups.push(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))
    writeFileSync(join(dir, 'bad.db'), 'not a database '.repeat(100))
    const bad = cli(join(dir, 'bad.db'))
    assert.equal(bad.status, 1)
    assert.match(bad.stderr, /NOT A GOOD BACKUP/)
    assert.equal(spawnSync(process.execPath, [join(import.meta.dirname, '..', 'src', 'backup-cli.ts')], { encoding: 'utf8' }).status, 2)
  })
})

describe('taking a backup', () => {
  it('copies the live database, opens the copy on its own, and records it as verified', async () => {
    const c = await daemon()
    await c.b.post('/api/kanban/cards', { title: 'Remember me' })
    const record = await c.run()
    assert.deepEqual([record.status, record.verified, record.trigger, record.present, record.error], ['ok', true, 'manual', true, null])
    assert.match(record.file!, /^junos-\d{8}T\d{6}Z\.db$/)
    assert.deepEqual(c.files(), [record.file], 'no temporary copy is left behind')
    assert.equal(record.size, statSync(join(c.dir, record.file!)).size)
    assert.deepEqual(verifyBackup(join(c.dir, record.file!)), { ok: true, problems: [] })
    // It holds the data: open it and look.
    const copy = new DatabaseSync(join(c.dir, record.file!), { readOnly: true })
    assert.equal((copy.prepare(`SELECT COUNT(*) AS n FROM kanban_card WHERE title = 'Remember me'`).get() as { n: number }).n, 1)
    assert.ok((copy.prepare('SELECT COUNT(*) AS n FROM session').get() as { n: number }).n >= 1)
    copy.close()
    const listing = await c.list()
    assert.equal(listing.dir, c.dir)
    assert.deepEqual(listing.backups.map((b) => [b.id, b.status]), [[record.id, 'ok']])
    assert.ok(c.d.store.since(0).some((e) => e.type === 'backup.finished' && e.payload.status === 'ok'))
  })

  it('stays consistent while junosd keeps writing', async () => {
    const c = await daemon()
    let stop = false
    const writer = (async () => {
      while (!stop) {
        c.d.store.append('busy.event', { at: Date.now() })
        await sleep(1)
      }
    })()
    const records: BackupRecord[] = []
    for (let i = 0; i < 3; i++) records.push(await c.run())
    stop = true
    await writer
    assert.ok(records.every((r) => r.status === 'ok' && r.verified))
  })

  it('restores: a backup dropped in place brings the data back', async () => {
    const first = await daemon()
    await first.b.post('/api/kanban/cards', { title: 'Survives a restore', column: 'ready' })
    const record = await first.run()
    await first.close()
    const target = tempHome()
    cleanups.push(target.cleanup)
    copyFileSync(join(first.dir, record.file!), join(target.home, 'junos.db'))
    const second = await daemon({ home: target.home })
    const board = await second.b.json<KanbanBoard>('/api/kanban')
    assert.deepEqual(board.cards.map((x) => [x.title, x.column]), [['Survives a restore', 'ready']])
  })

  it('refuses two at once', async () => {
    const c = await daemon({ backupAfterCopy: () => sleep(300) })
    const first = c.b.post('/api/backups/run')
    await sleep(50)
    assert.equal((await c.b.post('/api/backups/run')).status, 409)
    assert.equal((await first).status, 200)
  })

  it('needs a paired browser', async () => {
    const c = await daemon()
    assert.equal((await c.d.browser().get('/api/backups')).status, 401)
    assert.equal((await c.d.browser().post('/api/backups/run')).status, 401)
  })
})

describe('a backup that does not pass', () => {
  it('is deleted, reported in the Inbox, and leaves the earlier good one alone', async () => {
    let damage = false
    const c = await daemon({
      backupAfterCopy: (path) => {
        if (damage) truncateSync(path, Math.floor(statSync(path).size / 2))
      },
    })
    const good = await c.run()
    damage = true
    const bad = await c.run()
    assert.deepEqual([bad.status, bad.verified, bad.file, bad.present], ['failed', false, null, false])
    assert.match(bad.error!, /did not pass its check/)
    assert.deepEqual(c.files(), [good.file], 'the damaged copy is gone, the good one is untouched')
    const item = ((await c.b.json<InboxResponse>('/api/inbox')).items).find((i) => i.title === 'The backup failed')!
    assert.ok(item)
    assert.equal(item.priority, 'urgent')
    assert.match(item.body, /last good backup is still there/)
    assert.equal(verifyBackup(join(c.dir, good.file!)).ok, true)
  })

  it('is reported when the folder cannot be used', async () => {
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const blocker = join(tmp.home, 'not-a-folder')
    writeFileSync(blocker, 'a file where the backups folder should be')
    const c = await daemon({ backupDir: join(blocker, 'backups') })
    const res = await c.b.post('/api/backups/run')
    const record = (await res.json()) as BackupRecord
    assert.equal(record.status, 'failed')
    assert.ok(record.error)
    assert.ok((await c.b.json<InboxResponse>('/api/inbox')).items.some((i) => i.title === 'The backup failed'))
  })

  it('removes a half-written copy left by a crash when it starts', async () => {
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const dir = join(tmp.home, 'backups')
    mkdirSync(dir)
    writeFileSync(join(dir, 'junos-20260101T000000Z.db.partial'), 'half')
    const c = await daemon({ home: tmp.home, backupAuto: true, backupTickMs: 3_600_000 })
    await until(() => !readdirSync(c.dir).some((f) => f.endsWith('.partial')), 5000, 'the leftover to go')
    await until(async () => (await c.list()).backups.some((b) => b.status === 'ok'), 8000, 'the first backup')
  })
})

describe('a backup interrupted by a crash', () => {
  it('is closed as failed when junosd starts, not left showing as running', async () => {
    const tmp = tempHome()
    cleanups.push(tmp.cleanup)
    const first = await daemon({ home: tmp.home, backupAuto: false })
    await first.close()
    const db = new DatabaseSync(join(tmp.home, 'junos.db'))
    db.prepare(`INSERT INTO backup_run (id, started_at, status, trigger) VALUES ('stale', ?, 'running', 'schedule')`).run(new Date().toISOString())
    db.close()
    const c = await daemon({ home: tmp.home, backupAuto: false })
    const row = (await c.list()).backups.find((b) => b.id === 'stale')!
    assert.equal(row.status, 'failed')
    assert.match(row.error!, /stopped while this backup was running/)
  })
})

describe('keeping some, not all', () => {
  it('keeps the newest verified backups and deletes the rest, and says so', async () => {
    const clock = { now: Date.parse('2026-10-20T10:00:00Z') }
    const c = await daemon({ backupKeep: 3, clock })
    const names: string[] = []
    for (let i = 0; i < 5; i++) {
      clock.now += 3600_000
      names.push((await c.run()).file!)
    }
    assert.deepEqual(c.files(), names.slice(2), 'the three newest remain')
    const listing = await c.list()
    assert.deepEqual(listing.backups.map((b) => b.present), [true, true, true, false, false])
    assert.equal(listing.keep, 3)
  })

  it('never lets a failed attempt count as one to keep', async () => {
    let fail = false
    const clock = { now: Date.parse('2026-10-20T10:00:00Z') }
    const c = await daemon({ backupKeep: 2, clock, backupAfterCopy: (p) => (fail ? truncateSync(p, 10) : undefined) })
    const first = await c.run()
    clock.now += 3600_000
    const second = await c.run()
    fail = true
    for (let i = 0; i < 3; i++) {
      clock.now += 3600_000
      await c.run()
    }
    assert.deepEqual(c.files(), [first.file, second.file])
  })
})

describe('nightly', () => {
  it('takes the first backup soon after install, then one a day once the hour has come, and catches up when it was missed', async () => {
    const clock = { now: new Date(2026, 9, 21, 10, 0, 0).getTime() }
    const c = await daemon({ clock, backupAuto: true, backupTickMs: 40, backupHour: 3 })
    await until(async () => (await c.list()).backups.filter((b) => b.status === 'ok').length === 1, 8000, 'the first backup')
    assert.equal((await c.list()).backups[0]!.trigger, 'schedule')
    const taken = async () => (await c.list()).backups.filter((b) => b.status === 'ok').length
    // The same evening and before 03:00: not yet.
    clock.now = new Date(2026, 9, 21, 23, 0, 0).getTime()
    await sleep(300)
    assert.equal(await taken(), 1)
    clock.now = new Date(2026, 9, 22, 2, 30, 0).getTime()
    await sleep(300)
    assert.equal(await taken(), 1)
    // After 03:00: the nightly one.
    clock.now = new Date(2026, 9, 22, 3, 30, 0).getTime()
    await until(async () => (await taken()) === 2, 8000, 'the 03:00 backup')
    // Not again that day, and again the next night.
    clock.now = new Date(2026, 9, 22, 20, 0, 0).getTime()
    await sleep(300)
    assert.equal(await taken(), 2)
    clock.now = new Date(2026, 9, 23, 3, 30, 0).getTime()
    await until(async () => (await taken()) === 3, 8000, 'the next night’s backup')
    // Missed for two days: it runs at once, whatever the hour.
    clock.now = new Date(2026, 9, 26, 1, 0, 0).getTime()
    await until(async () => (await taken()) === 4, 8000, 'the catch-up backup')
  })

  it('says when the next one is due', async () => {
    const clock = { now: new Date(2026, 9, 21, 10, 0, 0).getTime() }
    const c = await daemon({ clock, backupHour: 3 })
    assert.ok(Date.parse((await c.list()).nextDue) <= clock.now, 'with none yet, one is due now')
    assert.equal((await c.list()).overdue, true)
    await c.run()
    assert.equal((await c.list()).overdue, false)
    const next = new Date((await c.list()).nextDue)
    assert.deepEqual([next.getDate(), next.getHours(), next.getMinutes()], [22, 3, 0], 'the next 03:00 that is at least twelve hours on')
  })

  it('does not run by itself when the schedule is off', async () => {
    const c = await daemon({ backupAuto: false, backupTickMs: 40 })
    await sleep(300)
    assert.equal((await c.list()).backups.length, 0)
  })
})
