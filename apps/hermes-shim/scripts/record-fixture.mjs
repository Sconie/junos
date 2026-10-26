// Records one real answer from Hermes's API so the stand-ins can be checked against it. Run by hand, on purpose:
// it makes one real request to the Hermes at HERMES_API_URL. The key comes from the environment and is never written.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const base = process.env.HERMES_API_URL || 'http://127.0.0.1:8642'
const key = process.env.HERMES_API_KEY
if (!key) {
  console.error('Set HERMES_API_KEY in the environment first.')
  process.exit(2)
}
const prompt = process.argv[2] || 'List the files in your workspace folder, then say hello in one sentence.'
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures', 'recorded')
mkdirSync(out, { recursive: true })

const get = async (path, withKey) => {
  const res = await fetch(new URL(path, base), { headers: withKey ? { authorization: `Bearer ${key}` } : {} })
  return { status: res.status, body: await res.text() }
}
const health = await get('/health', false)
const models = await get('/v1/models', true)
const res = await fetch(new URL('/v1/chat/completions', base), {
  method: 'POST',
  headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'hermes', stream: true, messages: [{ role: 'user', content: prompt }] }),
})
const stream = await res.text()
writeFileSync(join(out, 'health.json'), JSON.stringify(health, null, 2))
writeFileSync(join(out, 'models.json'), JSON.stringify(models, null, 2))
writeFileSync(join(out, 'chat-stream.sse'), stream)
console.log(`Wrote health (${health.status}), models (${models.status}) and a stream of ${stream.length} bytes to ${out}. Read them before committing.`)
