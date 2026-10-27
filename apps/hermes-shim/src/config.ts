import { existsSync } from 'node:fs'
import { isIP } from 'node:net'
import { join } from 'node:path'

export interface ShimConfig {
  host: string
  port: number
  /** The bearer key junosd presents. */
  key: string
  hermesUrl: string
  /** Hermes's own API key (API_SERVER_KEY). */
  hermesKey: string | undefined
  memoryDir: string
  skillsDir: string
  stateDir: string
  /** A JSONL file of Hermes's conversation, tailed to mirror Telegram messages. Off when empty. */
  logFile: string | null
  /** Sources allowed to call the hooks Hermes uses to ask for approval: loopback always, plus these IPv4 CIDRs. */
  hookCidrs: string[]
}

/** True for this machine and the tailnet (100.64.0.0/10): the only places the shim may listen. */
export function privateBindHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (h === 'localhost' || h === '::1') return true
  if (isIP(h) === 4) {
    const [a, b] = h.split('.').map(Number) as [number, number]
    return a === 127 || (a === 100 && b >= 64 && b <= 127)
  }
  return false
}

function rfc1918(h: string): boolean {
  if (isIP(h) !== 4) return false
  const [a, b] = h.split('.').map(Number) as [number, number]
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

export class ConfigError extends Error {}

/** Reads the settings from the environment. It refuses to start on a public address or without a key. */
export function configFromEnv(env: NodeJS.ProcessEnv, cwd = process.cwd(), inContainer = existsSync('/.dockerenv')): ShimConfig {
  const host = env.JUNOS_SHIM_HOST || '127.0.0.1'
  // Inside a container the shim must listen on the container's own address; the published port, bound to the tailnet address on the host, is what is exposed.
  const containerAny = host === '0.0.0.0' && env.JUNOS_SHIM_CONTAINER === '1' && inContainer
  if (!privateBindHost(host) && !containerAny) {
    throw new ConfigError(`JUNOS_SHIM_HOST is ${host}. The shim only listens on this machine or a Tailscale address (100.64.0.0/10), never on 0.0.0.0 or a public address (0.0.0.0 is accepted only inside a container, with JUNOS_SHIM_CONTAINER=1).`)
  }
  const port = env.JUNOS_SHIM_PORT ? Number(env.JUNOS_SHIM_PORT) : 8650
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ConfigError('JUNOS_SHIM_PORT must be a port number.')
  const hermesKey = env.HERMES_API_KEY || env.API_SERVER_KEY || undefined
  // One secret is enough: by default junosd presents Hermes's own key, and the shim uses it to call Hermes.
  const key = env.JUNOS_SHIM_KEY || hermesKey || ''
  if (key.length < 16) throw new ConfigError('Set HERMES_API_KEY (or JUNOS_SHIM_KEY): a secret of at least 16 characters that junosd presents.')
  const hermesUrl = env.HERMES_API_URL || 'http://127.0.0.1:8642'
  let parsed: URL
  try {
    parsed = new URL(hermesUrl)
  } catch {
    throw new ConfigError('HERMES_API_URL is not a web address.')
  }
  if (!privateBindHost(parsed.hostname) && !rfc1918(parsed.hostname) && !/^[a-z0-9-]+$/i.test(parsed.hostname)) {
    throw new ConfigError('HERMES_API_URL must be this machine or a container name on the private Docker network.')
  }
  const hookCidrs = (env.JUNOS_SHIM_HOOK_CIDRS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  for (const c of hookCidrs) if (!parseCidr(c)) throw new ConfigError(`JUNOS_SHIM_HOOK_CIDRS has a bad entry: ${c}`)
  return {
    host,
    port,
    key,
    hermesUrl: parsed.origin,
    hermesKey,
    memoryDir: env.JUNOS_SHIM_MEMORY_DIR || '/opt/data/memories',
    skillsDir: env.JUNOS_SHIM_SKILLS_DIR || '/opt/data/skills',
    stateDir: env.JUNOS_SHIM_STATE_DIR || join(cwd, 'state'),
    logFile: env.JUNOS_SHIM_LOG_FILE || null,
    hookCidrs,
  }
}

export function parseCidr(text: string): { base: number; mask: number } | null {
  const m = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(text)
  if (!m || isIP(m[1]!) !== 4) return null
  const bits = Number(m[2])
  if (bits < 8 || bits > 32) return null
  const base = m[1]!.split('.').reduce((n, p) => n * 256 + Number(p), 0)
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return { base: (base & mask) >>> 0, mask }
}

/** Whether a peer address may call the hooks. */
export function hookAllowed(address: string | undefined, cidrs: string[]): boolean {
  if (!address) return false
  const a = address.replace(/^::ffff:/i, '')
  if (a === '::1' || a === '127.0.0.1' || a.startsWith('127.')) return true
  if (isIP(a) !== 4) return false
  const n = a.split('.').reduce((acc, p) => acc * 256 + Number(p), 0)
  return cidrs.some((c) => {
    const cidr = parseCidr(c)
    return cidr !== null && ((n & cidr.mask) >>> 0) === cidr.base
  })
}
