#!/usr/bin/env node
// Fake Codex CLI for API tests: never touches a real subscription or the network.
// `exec --json ... -` reads the prompt on stdin and answers in the shapes recorded in
// test/fixtures/codex-exec-json.jsonl. `login status` answers from JUNOS_FAKE_CODEX_LOGIN.
import { appendFileSync } from 'node:fs'

const args = process.argv.slice(2)
if (args.includes('--version')) {
  console.log('codex-cli 0.0.0-fake')
  process.exit(0)
}

if (args[0] === 'login' && args[1] === 'status') {
  const login = process.env.JUNOS_FAKE_CODEX_LOGIN || 'chatgpt'
  if (login === 'chatgpt') console.log('Logged in using ChatGPT')
  else if (login === 'apikey') console.log('Logged in using an API key - sk-***')
  else if (login === 'garbage') console.log('???')
  else {
    console.error('Not logged in')
    process.exit(1)
  }
  process.exit(0)
}

if (args[0] !== 'exec') {
  console.error('fake codex: unsupported command')
  process.exit(2)
}

const mode = process.env.JUNOS_FAKE_MODE || 'ok'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = (obj) => process.stdout.write(JSON.stringify(obj) + '\n')

let prompt = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) prompt += chunk

if (process.env.JUNOS_FAKE_LOG) {
  appendFileSync(process.env.JUNOS_FAKE_LOG, JSON.stringify({ cli: 'codex', args, prompt, cwd: process.cwd(), env: Object.keys(process.env) }) + '\n')
}

const lastUser = [...prompt.matchAll(/(?:^|\n\n)User: ([\s\S]*?)(?=\n\n(?:Assistant|User):|$)/g)].pop()?.[1]?.trim() ?? ''
out({ type: 'thread.started', thread_id: '00000001-0000-4000-8000-000000000000' })
out({ type: 'turn.started' })

if (mode === 'silent') process.exit(0)
if (mode === 'nojson') {
  process.stdout.write('this is not json\n')
  process.stderr.write('fake codex: something broke\n')
  process.exit(1)
}
if (mode === 'usagelimit') {
  out({ type: 'error', message: "You've hit your usage limit. Try again at 8:26 PM." })
  out({ type: 'turn.failed', error: { message: "You've hit your usage limit. Try again at 8:26 PM." } })
  process.exit(1)
}
if (mode === 'login') {
  out({ type: 'error', message: 'Not logged in. Please run codex login' })
  process.exit(1)
}
if (mode === 'slow') await sleep(30_000)
if (mode === 'thinking') out({ type: 'item.completed', item: { id: 'item_0', type: 'reasoning', text: 'let me think' } })

out({ type: 'item.completed', item: { id: 'item_1', type: 'agent_message', text: `codex echo: ${lastUser}` } })
out({ type: 'turn.completed', usage: { input_tokens: 22722, cached_input_tokens: 12416, cache_write_input_tokens: 0, output_tokens: 5, reasoning_output_tokens: 0 } })
