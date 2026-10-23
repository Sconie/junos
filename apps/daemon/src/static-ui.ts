import { existsSync, lstatSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

/** The policy for the app itself (spec 12): its own scripts only, no other site's, nothing framed or framing it. */
export const APP_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

/**
 * Serves the built web app, so junosd is one thing to run and the desktop wrapper (or any browser) just opens its address.
 * Only files inside the build folder are reachable: no dotfiles, no links, no way out of the folder.
 */
export class StaticUi {
  readonly #dir: string

  constructor(dir: string) {
    this.#dir = resolve(dir)
  }

  static find(candidates: Array<string | undefined>): StaticUi | null {
    for (const dir of candidates) if (dir && existsSync(join(dir, 'index.html'))) return new StaticUi(dir)
    return null
  }

  /** Answers the request and returns true, or returns false when it is not for a file (so the caller can say 404). */
  serve(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
    let path: string
    try {
      path = decodeURIComponent(pathname)
    } catch {
      return this.#refuse(res, 400)
    }
    if (path.includes('\0') || path.includes('\\')) return this.#refuse(res, 400)
    const parts = path.split('/').filter(Boolean)
    // Nothing hidden, and no stepping up a folder, however it is spelled.
    if (parts.some((p) => p.startsWith('.'))) return this.#refuse(res, 404)
    let file = resolve(this.#dir, ...parts)
    if (file !== this.#dir && !file.startsWith(this.#dir + sep)) return this.#refuse(res, 404)
    let isIndex = parts.length === 0
    const usable = (f: string) => {
      try {
        const info = lstatSync(f)
        return info.isFile() && !info.isSymbolicLink()
      } catch {
        return false
      }
    }
    if (parts.length === 0 || !usable(file)) {
      // A screen (/board, /files …) is the app's own route: it gets the app. A missing asset gets a plain 404.
      const last = parts.at(-1) ?? ''
      if (parts.length > 0 && last.includes('.')) return this.#refuse(res, 404)
      file = join(this.#dir, 'index.html')
      isIndex = true
      if (!usable(file)) return this.#refuse(res, 404)
    }
    const type = TYPES[extname(file).toLowerCase()]
    if (!type) return this.#refuse(res, 404)
    const body = readFileSync(file)
    const headers: Record<string, string | number> = {
      'content-type': type,
      'content-length': body.length,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'cache-control': !isIndex && parts[0] === 'assets' ? 'public, max-age=31536000, immutable' : 'no-cache',
    }
    if (type.startsWith('text/html')) {
      headers['content-security-policy'] = APP_CSP
      headers['x-frame-options'] = 'DENY'
    }
    res.writeHead(200, headers)
    res.end(req.method === 'HEAD' ? undefined : body)
    return true
  }

  #refuse(res: ServerResponse, status: number): true {
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' })
    res.end(status === 404 ? 'Not found' : 'Bad request')
    return true
  }
}
