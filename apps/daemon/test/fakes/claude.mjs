#!/usr/bin/env node
// Fake Claude CLI for API tests: never touches a real subscription or the network.
// `-p` mode reads the prompt on stdin and answers in the same stream-json shapes as the real CLI
// (see test/fixtures/claude-stream-json.jsonl). Behaviour is chosen with JUNOS_FAKE_MODE.
import { appendFileSync } from 'node:fs'

const args = process.argv.slice(2)
if (args.includes('--version')) {
  console.log('claude 0.0.0-fake')
  process.exit(0)
}

if (args[0] === 'auth' && args[1] === 'status') {
  // The real one prints JSON including an email and organisation; the adapter must ignore those.
  const auth = process.env.JUNOS_FAKE_CLAUDE_AUTH || 'claude.ai'
  if (auth === 'out') {
    console.log(JSON.stringify({ loggedIn: false, authMethod: 'none' }))
    process.exit(1)
  }
  if (auth === 'garbage') {
    console.log('not json at all')
    process.exit(0)
  }
  console.log(JSON.stringify({ loggedIn: true, authMethod: auth, apiProvider: 'firstParty', email: 'someone@example.com', orgName: "someone's Organization", subscriptionType: 'pro' }))
  process.exit(0)
}

const mode = process.env.JUNOS_FAKE_MODE || 'ok'
const delay = Number(process.env.JUNOS_FAKE_DELAY || 5)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = (obj) => process.stdout.write(JSON.stringify(obj) + '\n')

let prompt = ''
process.stdin.setEncoding('utf8')
for await (const chunk of process.stdin) prompt += chunk

if (process.env.JUNOS_FAKE_LOG) {
  appendFileSync(process.env.JUNOS_FAKE_LOG, JSON.stringify({ args, prompt, cwd: process.cwd(), env: Object.keys(process.env) }) + '\n')
}

const lastUser = [...prompt.matchAll(/(?:^|\n\n)User: ([\s\S]*?)(?=\n\n(?:Assistant|User):|$)/g)].pop()?.[1]?.trim() ?? ''
const sessionId = '00000001-0000-4000-8000-000000000000'
const base = { session_id: sessionId, parent_tool_use_id: null }

out({ type: 'system', subtype: 'init', cwd: '<fake>', session_id: sessionId, tools: [], mcp_servers: [], model: 'fake-model', permissionMode: 'plan', apiKeySource: 'none', claude_code_version: '0.0.0-fake' })
out({ type: 'system', subtype: 'status', status: 'requesting', session_id: sessionId })

if (mode === 'silent') process.exit(0)
if (mode === 'nojson') {
  process.stdout.write('this is not json\n')
  process.stderr.write('fake claude: something broke\n')
  process.exit(1)
}
if (mode === 'login') {
  out({ type: 'result', subtype: 'success', is_error: true, api_error_status: 401, result: 'Not logged in. Please run /login', usage: { input_tokens: 0, output_tokens: 0 }, session_id: sessionId })
  process.exit(1)
}
if (mode === 'ratelimit') {
  out({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1792714800, rateLimitType: 'five_hour' }, session_id: sessionId })
  out({ type: 'result', subtype: 'success', is_error: true, api_error_status: 429, result: 'You have reached your usage limit.', usage: { input_tokens: 1, output_tokens: 0 }, session_id: sessionId })
  process.exit(1)
}

const reply = mode === 'slow' ? 'word '.repeat(400) : `echo: ${lastUser}`
const pieces = reply.match(/[\s\S]{1,6}/g)

out({ type: 'stream_event', event: { type: 'message_start', message: { model: 'fake-model', id: 'msg_FIXTURE', type: 'message', role: 'assistant', content: [], usage: { input_tokens: 2, output_tokens: 1 } } }, ...base })
out({ type: 'stream_event', event: { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }, ...base })
if (mode === 'thinking') {
  for (const t of ['hmm ', 'let me think']) out({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: t } }, ...base })
}
for (const text of pieces) {
  out({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }, ...base })
  await sleep(mode === 'slow' ? Math.max(delay, 100) : delay)
}
out({ type: 'assistant', message: { model: 'fake-model', id: 'msg_FIXTURE', type: 'message', role: 'assistant', content: [{ type: 'text', text: reply }] }, ...base })
out({ type: 'stream_event', event: { type: 'content_block_stop', index: 0 }, ...base })
out({ type: 'stream_event', event: { type: 'message_stop' }, ...base })
out({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', resetsAt: 1792714800, rateLimitType: 'five_hour' }, session_id: sessionId })
const inputTokens = mode === 'heavy' ? 500000 : 12
out({
  type: 'result',
  subtype: 'success',
  is_error: false,
  stop_reason: 'end_turn',
  result: reply,
  usage: { input_tokens: 2, cache_creation_input_tokens: inputTokens, cache_read_input_tokens: 0, output_tokens: pieces.length },
  session_id: sessionId,
})
