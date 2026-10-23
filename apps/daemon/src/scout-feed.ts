import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export class FeedError extends Error {}

export interface FeedItem {
  guid: string
  title: string
  link: string
  publishedAt: string | null
  summary: string
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1]!.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
}

/** Plain text from feed markup: tags dropped, entities decoded, whitespace collapsed. Never HTML. */
function plain(raw: string, max: number): string {
  // Entities are decoded first so escaped markup (as GitHub feeds ship it) is stripped too.
  const once = decode(raw).replace(/<[^>]*>/g, ' ')
  const twice = decode(once).replace(/<[^>]*>/g, ' ')
  return twice.replace(/\s+/g, ' ').trim().slice(0, max)
}

const tag = (block: string, names: string[]): string => {
  for (const name of names) {
    const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(block)
    if (m) return m[1]!
  }
  return ''
}

const safeLink = (raw: string): string => {
  try {
    const u = new URL(decode(raw).trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : ''
  } catch {
    return ''
  }
}

/** Items from an RSS or Atom document. Tolerant on purpose: a feed is untrusted text and only ever read as text. */
export function parseFeed(xml: string): FeedItem[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? []
  const items: FeedItem[] = []
  for (const block of blocks) {
    const title = plain(tag(block, ['title']), 200)
    if (!title) continue
    const atom = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i.exec(block)
    const link = safeLink(atom ? atom[1]! : tag(block, ['link']))
    const date = plain(tag(block, ['pubDate', 'updated', 'published', 'dc:date']), 60)
    const parsed = date ? Date.parse(date) : NaN
    const summary = plain(tag(block, ['content:encoded', 'description', 'summary', 'content']), 1500)
    const guid = plain(tag(block, ['guid', 'id']), 300) || link || title
    items.push({ guid, title, link, publishedAt: Number.isNaN(parsed) ? null : new Date(parsed).toISOString(), summary })
  }
  return items
}

function privateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number) as [number, number]
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
  }
  const v6 = address.toLowerCase()
  if (v6.startsWith('::ffff:')) return privateAddress(v6.slice(7))
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb')
}

/** A feed address is http(s), has no password in it, and does not point at this machine or the local network. */
export async function checkFeedUrl(raw: string, allowLocal: boolean): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new FeedError('That is not a web address.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new FeedError('Only http and https addresses can be a source.')
  if (url.username || url.password) throw new FeedError('An address with a password in it cannot be a source.')
  if (!allowLocal) {
    const host = url.hostname.replace(/^\[|\]$/g, '')
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new FeedError('Addresses on this machine or network cannot be a source.')
    const addresses = isIP(host) ? [host] : await lookup(host, { all: true }).then((r) => r.map((a) => a.address)).catch(() => [])
    if (addresses.length === 0) throw new FeedError('That address could not be found.')
    if (addresses.some(privateAddress)) throw new FeedError('Addresses on this machine or network cannot be a source.')
  }
  return url
}

export interface FetchOptions {
  allowLocal: boolean
  timeoutMs?: number
  maxBytes?: number
}

/** Fetches a feed as text: GET only, no cookies, redirects re-checked, size and time capped. Nothing is sent but the request. */
export async function fetchFeed(raw: string, options: FetchOptions): Promise<string> {
  const maxBytes = options.maxBytes ?? 1_000_000
  let url = await checkFeedUrl(raw, options.allowLocal)
  for (let hop = 0; hop < 4; hop++) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'user-agent': 'JunOS-Scout', accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1' },
        signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
      })
    } catch (err) {
      throw new FeedError(err instanceof Error && err.name === 'TimeoutError' ? 'The feed took too long to answer.' : 'The feed could not be reached.')
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      await res.body?.cancel().catch(() => {})
      url = await checkFeedUrl(new URL(res.headers.get('location')!, url).toString(), options.allowLocal)
      continue
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {})
      throw new FeedError(`The feed answered HTTP ${res.status}.`)
    }
    const reader = res.body?.getReader()
    if (!reader) return ''
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new FeedError('The feed is larger than 1 MB.')
      }
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  }
  throw new FeedError('The feed redirected too many times.')
}
