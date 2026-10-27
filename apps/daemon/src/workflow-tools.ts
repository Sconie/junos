import { existsSync, realpathSync, statSync, readFileSync } from 'node:fs'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'
import { redact } from './canonical.ts'
import type { ToolDef } from './gateway.ts'
import type { InboxService } from './inbox.ts'

const MAX_FILE_BYTES = 200_000

/** File names that hold credentials: never read, whatever folder they are in. */
export const SECRET_FILE = /(^|[\\/])(\.env(\..*)?|\.npmrc|\.netrc|\.pypirc|id_(rsa|dsa|ecdsa|ed25519)|credentials|.*api[ _-]?key.*|.*secret.*|.*password.*|.*token.*)$|\.(pem|key|pfx|p12|kdbx)$/i

/** A refusal whose message is written for the owner, so the gateway may show it. */
export class ToolRefusal extends Error {
  readonly safe = true
}

export interface WorkflowToolOptions {
  inbox: Pick<InboxService, 'list'>
  /** Folders `files.read` may read from. Nothing outside them is reachable. */
  fileRoots: string[]
  now?: () => number
}

/** Resolves `path` inside one of the roots, following links, or throws why it is not allowed. */
export function resolveReadable(roots: string[], path: string): string {
  if (roots.length === 0) throw new ToolRefusal('No folder is shared with JunOS. Set JUNOS_FILE_ROOTS to a folder it may read.')
  if (typeof path !== 'string' || !path.trim()) throw new ToolRefusal('Give a file path.')
  const candidates = isAbsolute(path) ? [path] : roots.map((r) => resolve(r, path))
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    const real = realpathSync(candidate)
    const inside = roots.some((root) => {
      if (!existsSync(root)) return false
      const rel = relative(realpathSync(root), real)
      return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
    })
    if (!inside) throw new ToolRefusal('That file is outside the folders shared with JunOS.')
    if (SECRET_FILE.test(real.split(sep).slice(-1)[0]!) || SECRET_FILE.test(basename(real))) throw new ToolRefusal('That file looks like it holds credentials, so JunOS will not read it.')
    const info = statSync(real)
    if (!info.isFile()) throw new ToolRefusal('That is not a file.')
    if (info.size > MAX_FILE_BYTES) throw new ToolRefusal(`That file is larger than ${MAX_FILE_BYTES / 1000} KB.`)
    return real
  }
  throw new ToolRefusal('That file was not found in the folders shared with JunOS.')
}

/** The tools a workflow `tool` step (and the approval step) can use. Reads run freely; the checkpoint always asks. */
export function workflowTools(options: WorkflowToolOptions): ToolDef[] {
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return [
    {
      name: 'files.read',
      class: 'read',
      target: (a) => str(a.path),
      execute: (a) => {
        const file = resolveReadable(options.fileRoots, str(a.path))
        const text = readFileSync(file, 'utf8')
        if (text.includes('\0')) throw new ToolRefusal('That file is not text.')
        return redact(text)
      },
    },
    {
      name: 'inbox.summary',
      class: 'read',
      target: () => '',
      execute: () => {
        const { items, counts } = options.inbox.list({})
        const open = items.filter((i) => i.status === 'new' || i.status === 'snoozed')
        return {
          counts,
          items: open.slice(0, 30).map((i) => ({ kind: i.kind, priority: i.priority, status: i.status, title: i.title, source: i.source, createdAt: i.createdAt })),
        }
      },
    },
    { name: 'time.now', class: 'read', target: () => '', execute: () => new Date(options.now?.() ?? Date.now()).toISOString() },
    // The approval step: running it does nothing, but it can only run with an approval a person gave.
    { name: 'workflow.checkpoint', class: 'write-local', alwaysAsk: true, target: (a) => str(a.workflow), execute: () => ({ approved: true }) },
  ]
}
