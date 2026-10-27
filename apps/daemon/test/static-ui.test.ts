import assert from 'node:assert/strict'
import { request } from 'node:http'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { APP_CSP } from '../src/static-ui.ts'
import { boot, tempHome, type TestDaemon } from './harness.ts'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const fn of cleanups.splice(0).reverse()) await fn()
})

/** A tiny stand-in for `apps/web/dist`, with a file next to it that must never be reachable. */
function makeDist(): string {
  const root = mkdtempSync(join(tmpdir(), 'junos-ui-'))
  cleanups.push(() => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))
  const dist = join(root, 'dist')
  mkdirSync(join(dist, 'assets'), { recursive: true })
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>JunOS</title><div id="root"></div><script type="module" src="/assets/app-abc123.js"></script>')
  writeFileSync(join(dist, 'assets', 'app-abc123.js'), 'console.log("app")')
  writeFileSync(join(dist, 'assets', 'style-abc123.css'), 'body{color:red}')
  writeFileSync(join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
  writeFileSync(join(dist, '.env'), 'SECRET=1')
  writeFileSync(join(dist, 'notes.exe'), 'MZ')
  writeFileSync(join(root, 'outside.txt'), 'outside the build folder')
  try {
    symlinkSync(join(root, 'outside.txt'), join(dist, 'link.txt'))
  } catch {
    /* no symlink rights here: that case is skipped */
  }
  return dist
}

async function daemon(uiDir: string | null): Promise<{ d: TestDaemon; port: number }> {
  const tmp = tempHome()
  cleanups.push(tmp.cleanup)
  const d = await boot(tmp.home, { uiDir })
  cleanups.push(() => d.close())
  return { d, port: d.port }
}

/** A request with the path exactly as written (fetch would tidy `..` away before it left). */
function raw(port: number, path: string, method = 'GET', host = `127.0.0.1:${port}`): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method, headers: { host } }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.end()
  })
}

describe('serving the web app', () => {
  it('serves the app at the root with a strict policy, before anyone is paired', async () => {
    const { port } = await daemon(makeDist())
    const res = await raw(port, '/')
    assert.equal(res.status, 200)
    assert.match(String(res.headers['content-type']), /^text\/html/)
    assert.match(res.body, /<div id="root">/)
    assert.equal(res.headers['content-security-policy'], APP_CSP)
    assert.match(APP_CSP, /script-src 'self'/)
    assert.match(APP_CSP, /frame-ancestors 'none'/)
    assert.equal(res.headers['x-frame-options'], 'DENY')
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
    assert.equal(res.headers['cache-control'], 'no-cache')
  })

  it('serves assets with their types, and lets the hashed ones be cached for good', async () => {
    const { port } = await daemon(makeDist())
    const js = await raw(port, '/assets/app-abc123.js')
    assert.equal(js.status, 200)
    assert.match(String(js.headers['content-type']), /^text\/javascript/)
    assert.equal(js.headers['cache-control'], 'public, max-age=31536000, immutable')
    assert.equal(js.headers['content-security-policy'], undefined, 'the policy is on the page, not on every file')
    assert.match(String((await raw(port, '/assets/style-abc123.css')).headers['content-type']), /^text\/css/)
    assert.equal((await raw(port, '/favicon.svg')).headers['content-type'], 'image/svg+xml')
    const head = await raw(port, '/assets/app-abc123.js', 'HEAD')
    assert.deepEqual([head.status, head.body], [200, ''])
  })

  it('gives every screen the app, and a missing file a plain 404', async () => {
    const { port } = await daemon(makeDist())
    for (const screen of ['/board', '/files', '/chat', '/hermes/console']) {
      const res = await raw(port, screen)
      assert.equal(res.status, 200, screen)
      assert.match(res.body, /<div id="root">/, screen)
    }
    assert.equal((await raw(port, '/assets/missing.js')).status, 404)
    assert.equal((await raw(port, '/nothing.png')).status, 404)
  })

  it('cannot be asked for anything outside the build folder, a hidden file, a link or an odd type', async () => {
    const { port } = await daemon(makeDist())
    for (const path of ['/../outside.txt', '/..%2foutside.txt', '/%2e%2e/outside.txt', '/assets/../../outside.txt', '/assets/%2e%2e/%2e%2e/outside.txt', '/..%5coutside.txt', '/.env', '/assets/.env', '/%2eenv', '/notes.exe', '/link.txt', '/%00', '/assets/app-abc123.js%00.png']) {
      const res = await raw(port, path)
      assert.ok(res.status === 400 || res.status === 404, `${path} gave ${res.status}`)
      assert.doesNotMatch(res.body, /outside the build folder|SECRET=1|MZ/, path)
    }
  })

  it('leaves the API alone, and still answers an unknown API path as before', async () => {
    const { port, d } = await daemon(makeDist())
    const health = await raw(port, '/api/health')
    assert.equal(health.status, 200)
    assert.match(health.body, /"junosd"/)
    assert.equal((await raw(port, '/api/status')).status, 401, 'private routes still need the pairing')
    assert.equal((await raw(port, '/api/nope')).status, 401)
    const b = await d.pair()
    assert.equal((await b.get('/api/nope')).status, 404)
    assert.equal((await b.get('/api/status')).status, 200)
  })

  it('refuses a request meant for another host, even for the app', async () => {
    const { port } = await daemon(makeDist())
    assert.equal((await raw(port, '/', 'GET', 'evil.example.com')).status, 403)
    assert.equal((await raw(port, '/', 'GET', `localhost:${port}`)).status, 200)
  })

  it('serves nothing when there is no build, and the API still works', async () => {
    const { port } = await daemon(null)
    assert.equal((await raw(port, '/')).status, 401)
    assert.equal((await raw(port, '/api/health')).status, 200)
  })

  it('does not accept a write to the app’s paths', async () => {
    const { port } = await daemon(makeDist())
    assert.notEqual((await raw(port, '/', 'POST')).status, 200)
    assert.notEqual((await raw(port, '/assets/app-abc123.js', 'DELETE')).status, 200)
  })
})
