import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { join } from 'node:path'
import { afterEach, describe, it } from 'node:test'
import type { ConversationDetail, ConversationRecord, SendMessageResponse } from '@junos/shared'
import { ClaudeAdapter } from '../src/adapters/claude.ts'
import { ChatService } from '../src/chat.ts'
import { resolveLauncher, scriptFromNpmShim } from '../src/cli.ts'
import { Gateway } from '../src/gateway.ts'
import { RunManager } from '../src/runs.ts'
import { EventStore } from '../src/store.ts'
import { boot, fakeProviderEnv, tempHome, type BootOptions } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function setup(options: BootOptions & { env?: Record<string, string> } = {}) {
  const { home, cleanup } = tempHome()
  const env = fakeProviderEnv(options.env)
  const d = await boot(home, { ...options, env })
  cleanups.push(cleanup, () => d.close())
  const b = await d.pair()
  await b.post('/api/chat/disclosures/claude/ack')
  const create = async () => (await (await b.post('/api/conversations', {})).json()) as ConversationRecord
  const send = async (id: string, body: Record<string, unknown>) => {
    const res = await b.post(`/api/conversations/${id}/messages`, body)
    return { http: res.status, out: (await res.json()) as SendMessageResponse & { error?: string } }
  }
  const detail = (id: string) => b.json<ConversationDetail>(`/api/conversations/${id}`)
  return { home, d, b, create, send, detail }
}

describe('concurrency and safety', () => {
  it('lets only one of two simultaneous sends start, on two conversations or on the same one', async () => {
    const { create, send, b } = await setup({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    const one = await create()
    const two = await create()
    const across = await Promise.all([send(one.id, { content: 'a' }), send(two.id, { content: 'b' })])
    assert.deepEqual(across.map((r) => r.http).sort(), [201, 409])
    assert.equal(across.find((r) => r.http === 409)!.out.error, 'provider_busy')
    await b.post('/api/stop')
    await sleep(500)
    await b.post('/api/resume')

    const same = await Promise.all([send(one.id, { content: 'c' }), send(one.id, { content: 'd' })])
    assert.deepEqual(same.map((r) => r.http).sort(), [201, 409])
    await b.post('/api/stop')
  })

  it('stores nothing for the send that lost the race', async () => {
    const { create, send, b, detail } = await setup({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    const one = await create()
    const two = await create()
    await Promise.all([send(one.id, { content: 'a' }), send(two.id, { content: 'b' })])
    const counts = [(await detail(one.id)).messages.length, (await detail(two.id)).messages.length].sort()
    assert.deepEqual(counts, [0, 2], 'the loser has no stored messages and no run')
    await b.post('/api/stop')
  })

  it('survives a client that leaves in the middle of a stream', async () => {
    const { create, send, home, d, b } = await setup({ env: { JUNOS_FAKE_MODE: 'slow' }, stopGraceMs: 300 })
    const conv = await create()
    const started = await send(conv.id, { content: 'long' })
    const runId = (started.out as Extract<SendMessageResponse, { status: 'started' }>).runId
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no data arrived')), 4000)
      const req = request({ host: '127.0.0.1', port: d.port, path: `/api/runs/${runId}/stream`, headers: { cookie: b.cookie } }, (res) => {
        res.once('data', () => {
          clearTimeout(timer)
          res.destroy() // the browser tab closes mid-reply
          resolve()
        })
      })
      req.on('error', () => resolve())
      req.end()
    })
    await sleep(600) // more tokens are produced after the client is gone
    assert.equal((await fetch(`http://127.0.0.1:${d.port}/api/health`)).status, 200, 'junosd is still up')
    assert.ok(existsSync(join(home, 'junos.db')))
    await b.post('/api/stop')
  })
})

describe('a stop that could not be confirmed', () => {
  it('keeps the subscription slot until the process really exits, then frees it', async () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const store = new EventStore(join(home, 'junos.db'))
    cleanups.push(async () => {
      await sleep(200)
      store.close()
    })
    const gateway = new Gateway({ store, tools: [] })
    // A signal that does nothing stands in for a process the OS will not let us end.
    const runs = new RunManager({ store, gateway, graceMs: 100, confirmMs: 100, signal: async () => {} })
    const env = fakeProviderEnv({ JUNOS_FAKE_MODE: 'slow' })
    const cwd = join(home, 'cwd')
    mkdirSync(cwd)
    const chat = new ChatService({ store, runs, adapters: [new ClaudeAdapter(env)], cwd })
    chat.acknowledge('claude')
    const one = chat.createConversation({})
    const two = chat.createConversation({})

    const first = await chat.send(one.id, { content: 'long please' })
    assert.equal(first.status, 'started')
    const runId = (first as { runId: string }).runId
    const pid = runs.pid(runId)!
    cleanups.push(async () => {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        /* gone */
      }
    })
    const [stopped] = await runs.stop(runId)
    assert.equal(stopped?.status, 'stop_unconfirmed')

    await assert.rejects(chat.send(two.id, { content: 'second' }), (err: Error & { code?: string }) => err.code === 'provider_busy')
    assert.notEqual(chat.get(one.id)!.messages[1]!.status, 'error', 'no made-up failure for a run that was stopped')

    process.kill(pid, 'SIGKILL') // it dies after all
    const end = Date.now() + 4000
    while (runs.get(runId)?.status !== 'stopped' && Date.now() < end) await sleep(50)
    assert.equal(runs.get(runId)?.status, 'stopped')
    const again = await chat.send(two.id, { content: 'second' })
    assert.equal(again.status, 'started')
    process.kill(runs.pid((again as { runId: string }).runId)!, 'SIGKILL')
    await sleep(300)
  })
})

describe('Windows command shims', () => {
  const bs = String.fromCharCode(92)

  it('follows an npm .cmd shim to the Node script behind it', () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    const pkg = join(home, 'node_modules', '@anthropic-ai', 'claude-code')
    mkdirSync(pkg, { recursive: true })
    const script = join(pkg, 'cli.js')
    writeFileSync(script, '// cli')
    const shim = [
      '@ECHO off',
      'GOTO start',
      ':find_dp0',
      'SET dp0=%~dp0',
      'EXIT /b',
      ':start',
      'SETLOCAL',
      'CALL :find_dp0',
      'IF EXIST "%dp0%' + bs + 'node.exe" (',
      '  SET "_prog=%dp0%' + bs + 'node.exe"',
      ') ELSE (',
      '  SET "_prog=node"',
      ')',
      'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%' + bs + 'node_modules' + bs + '@anthropic-ai' + bs + 'claude-code' + bs + 'cli.js" %*',
    ].join('\r\n')
    assert.equal(scriptFromNpmShim(shim, home), script)
    assert.equal(scriptFromNpmShim(shim, join(home, 'elsewhere')), null, 'the script must exist')
    assert.equal(scriptFromNpmShim('@echo hello', home), null, 'not a shim we understand')
  })

  it('launches a CLI that is installed as an npm shim', { skip: process.platform !== 'win32' }, () => {
    const { home, cleanup } = tempHome()
    cleanups.push(cleanup)
    mkdirSync(join(home, 'node_modules', 'tool'), { recursive: true })
    writeFileSync(join(home, 'node_modules', 'tool', 'cli.js'), '// tool')
    writeFileSync(join(home, 'faketool.cmd'), '@ECHO off\r\n"%dp0%' + bs + 'node_modules' + bs + 'tool' + bs + 'cli.js" %*\r\n')
    const launch = resolveLauncher('faketool', { PATH: home })
    assert.equal(launch?.command, process.execPath)
    assert.deepEqual(launch?.prefix, [join(home, 'node_modules', 'tool', 'cli.js')])
    writeFileSync(join(home, 'brokentool.cmd'), '@ECHO off\r\necho hello\r\n')
    assert.equal(resolveLauncher('brokentool', { PATH: home }), null, 'a shim we cannot follow is not launched')
  })
})

void readFileSync
