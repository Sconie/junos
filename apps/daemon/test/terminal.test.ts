import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, it } from 'node:test'
import type { ActionResponse, ApprovalRecord, InboxResponse, TerminalFrame, TerminalOverview, TerminalSession } from '@junos/shared'
import { isReadOnlyCommand, MockVpsShell } from '../src/terminal.ts'
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
    await sleep(20)
  }
}

const fake = (name: string) => fileURLToPath(new URL(`./fakes/${name}.mjs`, import.meta.url))
const havePty = await import('node-pty').then(
  () => true,
  () => false,
)

interface Ctx {
  d: TestDaemon
  b: Browser
  marker: string
  close(): Promise<void>
  overview(): Promise<TerminalOverview>
  open(kind?: string): Promise<TerminalSession>
  type(id: string, data: string): Promise<Response>
  stream(id: string): Promise<{ text(): string; frames: TerminalFrame[]; waitFor(re: RegExp, ms?: number): Promise<void>; stop(): void }>
  agent(command: string, extra?: Record<string, unknown>): Promise<ActionResponse>
  ran(): string[]
  inbox(): Promise<InboxResponse>
}

async function daemon(options: BootOptions = {}): Promise<Ctx> {
  const tmp = tempHome()
  cleanups.push(tmp.cleanup)
  const marker = join(tmp.home, 'ran.txt')
  const env = fakeProviderEnv({ TEST_MARKER: marker, JUNOS_TEST_SECRET: 'hunter2' })
  const d = await boot(tmp.home, {
    ...options,
    env,
    terminalShell: { command: process.execPath, args: [fake('shell')], label: 'Test shell' },
    terminalAgentShell: { command: process.execPath, args: (c) => [fake('agent-shell'), c] },
  })
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
    marker,
    close,
    overview: () => b.json<TerminalOverview>('/api/terminal'),
    open: async (kind = 'local') => {
      const res = await b.post('/api/terminal/sessions', { kind, cols: 80, rows: 24 })
      assert.equal(res.status, 201, await res.clone().text())
      return (await res.json()) as TerminalSession
    },
    type: (id, data) => b.post(`/api/terminal/sessions/${id}/input`, { data }),
    stream: async (id) => {
      const controller = new AbortController()
      const res = await fetch(`${d.url}/api/terminal/sessions/${id}/stream`, { signal: controller.signal, headers: { cookie: b.cookie } })
      assert.equal(res.status, 200)
      const frames: TerminalFrame[] = []
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      void (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let i
            while ((i = buffer.indexOf('\n\n')) >= 0) {
              const frame = buffer.slice(0, i)
              buffer = buffer.slice(i + 2)
              if (frame.startsWith('data: ')) frames.push(JSON.parse(frame.slice(6)) as TerminalFrame)
            }
          }
        } catch {
          /* aborted */
        }
      })()
      const text = () => frames.map((f) => (f.type === 'data' ? f.data : `<closed:${f.reason}>`)).join('')
      return {
        text,
        frames,
        waitFor: (re, ms = 8000) => until(() => re.test(text()), ms, `${re} in the output; saw ${JSON.stringify(text())}`),
        stop: () => controller.abort(),
      }
    },
    agent: async (command, extra = {}) => {
      const res = await b.post('/api/terminal/agent/exec', { command, actor: 'hermes', ...extra })
      assert.equal(res.status, 200, await res.clone().text())
      return (await res.json()) as ActionResponse
    },
    ran: () => (existsSync(marker) ? readFileSync(marker, 'utf8').split('\n').filter(Boolean) : []),
    inbox: () => b.json<InboxResponse>('/api/inbox'),
  }
}

describe('which commands may run without an approval', () => {
  it('lets only plainly read-only commands through', () => {
    for (const ok of ['pwd', 'ls', 'ls -la', 'ls src/app', 'echo hello world', 'git status', 'git log', 'git diff -s', 'git branch']) assert.equal(isReadOnlyCommand(ok), true, ok)
    for (const no of ['rm -rf x', 'cat .env', 'ls; rm x', 'echo $(whoami)', 'echo hi > f', 'ls | sh', 'git push', 'git status && curl x', 'echo `id`', 'ls\nrm x', 'curl http://x', 'python -c 1', 'echo "x"', 'ls ~', '', 'x'.repeat(300)]) assert.equal(isReadOnlyCommand(no), false, no)
  })
})

describe('your own tabs', { skip: !havePty && 'node-pty could not be loaded here' }, () => {
  it('opens a PC tab, shows its output live, takes typing, and closes', async () => {
    const { overview, open, type, stream, b, d } = await daemon()
    const first = await overview()
    assert.deepEqual(first.local, { available: true, reason: null, shell: 'Test shell' })
    assert.deepEqual(first.sessions.map((s) => s.kind), ['agent'])
    const tab = await open()
    assert.deepEqual([tab.kind, tab.label, tab.readOnly, tab.status], ['local', 'Test shell', false, 'open'])
    const out = await stream(tab.id)
    await out.waitFor(/ready>/)
    assert.equal((await type(tab.id, 'hello\r')).status, 200)
    await out.waitFor(/echo:hello/)
    assert.equal((await b.post(`/api/terminal/sessions/${tab.id}/resize`, { cols: 100, rows: 30 })).status, 200)
    assert.equal((await b.request(`/api/terminal/sessions/${tab.id}`, { method: 'DELETE' })).status, 200)
    await out.waitFor(/<closed:closed>/)
    const after = (await overview()).sessions.find((s) => s.id === tab.id)!
    assert.deepEqual([after.status, after.closeReason], ['closed', 'closed'])
    assert.equal((await type(tab.id, 'x')).status, 404)
    assert.ok(d.store.since(0).some((e) => e.type === 'terminal.opened'))
    out.stop()
  })

  it('does not gate your typing: nothing you type goes near the approvals, and it is not logged', async () => {
    const { open, type, stream, b, d } = await daemon()
    const tab = await open()
    const out = await stream(tab.id)
    await out.waitFor(/ready>/)
    await type(tab.id, 'rm -rf everything\r')
    await out.waitFor(/echo:rm -rf everything/)
    assert.deepEqual((await b.json<{ approvals: unknown[] }>('/api/approvals')).approvals, [])
    assert.equal(d.store.since(0).filter((e) => e.type.startsWith('gateway.')).length, 0)
    assert.equal(JSON.stringify(d.store.since(0)).includes('rm -rf everything'), false, 'keystrokes are not recorded')
    out.stop()
  })

  it('keeps JunOS’s own settings out of the shell’s environment', async () => {
    const { open, type, stream } = await daemon()
    const tab = await open()
    const out = await stream(tab.id)
    await out.waitFor(/ready>/)
    await type(tab.id, 'env\r')
    await out.waitFor(/secret=unset term=xterm-256color/)
    out.stop()
  })

  it('keeps a redacted tail of the output for audit when a tab closes', async () => {
    const { open, type, stream, b, d } = await daemon()
    const tab = await open()
    const out = await stream(tab.id)
    await out.waitFor(/ready>/)
    await type(tab.id, 'my key is sk-aaaaaaaaaaaaaaaaaaaaaaaa\r')
    await out.waitFor(/echo:my key/)
    await b.request(`/api/terminal/sessions/${tab.id}`, { method: 'DELETE' })
    const closed = d.store.since(0).find((e) => e.type === 'terminal.closed')!
    const tail = String(closed.payload.tail)
    assert.match(tail, /echo:my key is \[redacted\]/)
    assert.doesNotMatch(tail, /sk-aaaa/)
    out.stop()
  })

  it('refuses bad input, a bad size, an unknown tab and typing into the agent tab', async () => {
    const { open, type, b } = await daemon()
    const tab = await open()
    assert.equal((await type(tab.id, '')).status, 400)
    assert.equal((await type(tab.id, 'x'.repeat(4097))).status, 400)
    assert.equal((await b.post(`/api/terminal/sessions/${tab.id}/resize`, { cols: 3, rows: 3 })).status, 400)
    assert.equal((await type('11111111-1111-4111-8111-111111111111', 'x')).status, 404)
    const agent = await type('agent', 'x')
    assert.equal(agent.status, 403)
    assert.equal((await b.request('/api/terminal/sessions/agent', { method: 'DELETE' })).status, 403)
    assert.equal((await b.post('/api/terminal/sessions', { kind: 'root' })).status, 400)
  })

  it('closes every tab when Stop is pressed', async () => {
    const { open, overview, b, stream } = await daemon()
    const a = await open()
    await open()
    const out = await stream(a.id)
    await out.waitFor(/ready>/)
    await b.post('/api/stop')
    await until(async () => (await overview()).sessions.filter((s) => s.kind === 'local' && s.status === 'closed').length === 2, 5000, 'both tabs to close')
    assert.ok((await overview()).sessions.filter((s) => s.kind === 'local').every((s) => s.closeReason === 'stopped'))
    await out.waitFor(/<closed:stopped>/)
    out.stop()
  })

  it('ends a tab when its shell exits', async () => {
    const { open, type, overview, stream } = await daemon()
    const tab = await open()
    const out = await stream(tab.id)
    await out.waitFor(/ready>/)
    await type(tab.id, 'exit\r')
    await until(async () => (await overview()).sessions.find((s) => s.id === tab.id)?.closeReason === 'exited', 5000, 'exit')
    out.stop()
  })

  it('needs a paired browser for everything', async () => {
    const { d, open } = await daemon()
    const tab = await open()
    const stranger = d.browser()
    assert.equal((await stranger.get('/api/terminal')).status, 401)
    assert.equal((await stranger.post('/api/terminal/sessions', { kind: 'local' })).status, 401)
    assert.equal((await stranger.post(`/api/terminal/sessions/${tab.id}/input`, { data: 'x' })).status, 401)
    assert.equal((await stranger.get(`/api/terminal/sessions/${tab.id}/stream`)).status, 401)
    assert.equal((await stranger.post('/api/terminal/agent/exec', { command: 'pwd' })).status, 401)
  })
})

describe('the shell on the VPS', () => {
  it('says why it cannot open while the shim is not connected', async () => {
    const { overview, b } = await daemon()
    const o = await overview()
    assert.equal(o.vps.mode, 'none')
    assert.match(o.vps.reason!, /Hermes shim/)
    const res = await b.post('/api/terminal/sessions', { kind: 'vps' })
    assert.equal(res.status, 503)
    assert.equal(((await res.json()) as { error: string }).error, 'not_connected')
  })

  it('opens against a stand-in shell, closes when idle, and ends on exit and on Stop', async () => {
    const { open, type, stream, overview, b } = await daemon({ terminalVps: new MockVpsShell(), terminalVpsIdleMs: 300 })
    const tab = await open('vps')
    assert.equal(tab.label, 'VPS (mock)')
    const out = await stream(tab.id)
    await out.waitFor(/vps-mock\$ /)
    await type(tab.id, 'uptime\r')
    await out.waitFor(/mock: uptime/)
    await until(async () => (await overview()).sessions.find((s) => s.id === tab.id)?.closeReason === 'idle', 9000, 'the idle close')
    await out.waitFor(/<closed:idle>/)
    out.stop()

    const again = await open('vps')
    const out2 = await stream(again.id)
    await out2.waitFor(/vps-mock\$ /)
    await type(again.id, 'exit\r')
    await until(async () => (await overview()).sessions.find((s) => s.id === again.id)?.closeReason === 'exited', 5000, 'exit')
    out2.stop()

    const third = await open('vps')
    await b.post('/api/stop')
    await until(async () => (await overview()).sessions.find((s) => s.id === third.id)?.closeReason === 'stopped', 5000, 'Stop')
  })
})

describe('commands run by agents', () => {
  const approvalOf = async (b: Browser, id: string) => b.json<ApprovalRecord>(`/api/approvals/${id}`)

  it('runs a plainly read-only command at once, logs it with its actor, and shows it in the agent tab', async () => {
    const { agent, stream, d, ran } = await daemon()
    const out = await stream('agent')
    const res = await agent('echo hello there')
    assert.equal(res.status, 'executed')
    assert.deepEqual((res as { result: { exitCode: number; output: string } }).result, { exitCode: 0, output: 'hello there\n', timedOut: false })
    await out.waitFor(/\[hermes\] \$ echo hello there[\s\S]*hello there[\s\S]*\[exit 0\]/)
    assert.deepEqual(ran(), ['echo hello there'])
    const logged = d.store.since(0).find((e) => e.type === 'terminal.agent.command' && e.payload.status === 'executed')!
    assert.deepEqual([logged.payload.actor, logged.payload.command, logged.payload.exitCode], ['hermes', 'echo hello there', 0])
    out.stop()
  })

  it('needs an approval for anything else: nothing runs until it is given, and the approval is single-use', async () => {
    const { agent, b, ran, inbox, stream } = await daemon()
    const out = await stream('agent')
    const first = await agent('delete everything')
    assert.equal(first.status, 'approval_required')
    const approvalId = (first as { approvalId: string }).approvalId
    assert.deepEqual(ran(), [], 'not run')
    await out.waitFor(/\[hermes\] wants to run: delete everything\r?\n\[waiting for your approval\]/)
    const approval = await approvalOf(b, approvalId)
    assert.deepEqual([approval.tool, approval.class, approval.actor, approval.target], ['terminal.exec', 'destructive', 'hermes', 'delete everything'])
    assert.ok((await inbox()).items.some((i) => i.kind === 'approval' && i.refId === approvalId))
    // Asking again does not run it either, and does not spend the approval.
    assert.equal((await agent('delete everything')).status, 'approval_required')
    await b.post(`/api/approvals/${approvalId}/approve`)
    const done = await agent('delete everything', { approvalId })
    assert.equal(done.status, 'executed')
    assert.deepEqual(ran(), ['delete everything'])
    await out.waitFor(/ran: delete everything[\s\S]*\[exit 0\]/)
    const replay = await agent('delete everything', { approvalId })
    assert.notEqual(replay.status, 'executed')
    assert.deepEqual(ran(), ['delete everything'], 'a second use did not run it again')
    out.stop()
  })

  it('does not run a command that was denied, or one changed after the approval', async () => {
    const { agent, b, ran } = await daemon()
    const denied = (await agent('remove the logs')) as { approvalId: string }
    await b.post(`/api/approvals/${denied.approvalId}/deny`)
    const refused = await agent('remove the logs', { approvalId: denied.approvalId })
    assert.equal(refused.status, 'rejected')
    const ok = (await agent('tidy the cache')) as { approvalId: string }
    await b.post(`/api/approvals/${ok.approvalId}/approve`)
    const swapped = await agent('tidy the cache and more', { approvalId: ok.approvalId })
    assert.deepEqual([swapped.status, (swapped as { reason: string }).reason], ['rejected', 'digest_mismatch'])
    assert.deepEqual(ran(), [])
  })

  it('treats a command with shell tricks as needing approval, even when it starts like a read', async () => {
    const { agent, ran } = await daemon()
    for (const sneaky of ['echo hi; rm x', 'ls && rm x', 'echo $(id)', 'cat .env']) assert.equal((await agent(sneaky)).status, 'approval_required', sneaky)
    assert.deepEqual(ran(), [])
  })

  it('refuses the read tool for a command that is not read-only, even when called directly', async () => {
    const { b, ran } = await daemon()
    const res = await b.post('/api/actions', { tool: 'terminal.read', args: { command: 'rm -rf x', actor: 'hermes' } })
    const body = (await res.json()) as ActionResponse
    assert.equal(body.status, 'rejected')
    assert.deepEqual(ran(), [])
  })

  it('records failures, masks secrets in the output, and cuts off a command that runs too long', async () => {
    const { agent, b, stream } = await daemon({ terminalAgentTimeoutMs: 300 })
    const out = await stream('agent')
    const approve = async (cmd: string) => {
      const need = (await agent(cmd)) as { approvalId: string }
      await b.post(`/api/approvals/${need.approvalId}/approve`)
      return (await agent(cmd, { approvalId: need.approvalId })) as { status: string; result: { exitCode: number | null; output: string; timedOut: boolean } }
    }
    const failed = await approve('fail')
    assert.deepEqual([failed.result.exitCode, failed.result.output], [3, 'it failed\n'])
    const secret = await approve('secret')
    assert.equal(secret.result.output, 'token [redacted]\n')
    await out.waitFor(/token \[redacted\]/)
    assert.doesNotMatch(out.text(), /sk-aaaa/)
    const slow = await approve('sleep 5000')
    assert.equal(slow.result.timedOut, true)
    await out.waitFor(/\[timed out\]/)
    out.stop()
  })

  it('ends a running agent command when Stop is pressed, and refuses new ones until resumed', async () => {
    const { agent, b } = await daemon()
    const need = (await agent('sleep 20000')) as { approvalId: string }
    await b.post(`/api/approvals/${need.approvalId}/approve`)
    const running = agent('sleep 20000', { approvalId: need.approvalId })
    await sleep(500)
    const started = Date.now()
    await b.post('/api/stop')
    await running
    assert.ok(Date.now() - started < 6000, 'Stop ended it')
    const blocked = await agent('delete more')
    assert.equal(blocked.status, 'denied', 'a write is refused while stopped')
    assert.equal((blocked as { reason: string }).reason, 'paused')
  })

  it('refuses a bad request, and never lets “jonas” use the agent door', async () => {
    const { b } = await daemon()
    const post = (body: Record<string, unknown>) => b.post('/api/terminal/agent/exec', body)
    assert.equal((await post({ command: '', actor: 'hermes' })).status, 400)
    assert.equal((await post({ command: 'pwd', actor: 'jonas' })).status, 400)
    assert.equal((await post({ command: 'x'.repeat(2001), actor: 'hermes' })).status, 400)
  })

  it('keeps agent output out of the tabs you type in', { skip: !havePty && 'node-pty could not be loaded here' }, async () => {
    const { open, stream, agent } = await daemon()
    const tab = await open()
    const mine = await stream(tab.id)
    await mine.waitFor(/ready>/)
    await agent('echo from-the-agent')
    await sleep(300)
    assert.doesNotMatch(mine.text(), /from-the-agent/)
    mine.stop()
  })
})
