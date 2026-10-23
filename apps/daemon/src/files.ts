import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, extname, isAbsolute, join, sep } from 'node:path'
import {
  FILE_KINDS,
  type AttachedFile,
  type FileEntry,
  type FileFolder,
  type FileKind,
  type FileListing,
  type FilePreview,
  type FileSearchHit,
  type FileSearchResponse,
  type FolderRemoval,
  type ProjectRecord,
} from '@junos/shared'
import { redact } from './canonical.ts'
import type { EventStore } from './store.ts'
import { SECRET_FILE } from './workflow-tools.ts'

export class FilesError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface FilesOptions {
  store: EventStore
  /** JunOS's own data folder: never indexed, and no folder containing it. */
  dataHome: string
  now?: () => number
  /** How often every folder is looked at again (default 5 min). */
  rescanMs?: number
  /** Most files indexed per folder (default 20,000). */
  maxFiles?: number
}

const BUILTIN_IGNORED = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', 'target', '__pycache__', '.venv', 'venv', '.cache', 'coverage', '.turbo', '.gradle'])
const MAX_FILE_BYTES = 100 * 1024 * 1024
const MAX_TEXT_BYTES = 200_000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }
const MARKDOWN = new Set(['md', 'markdown'])
const CODE = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rs', 'go', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'rb', 'php', 'sh', 'ps1', 'bat', 'sql', 'css', 'scss', 'html', 'htm', 'xml', 'svg', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'kt', 'swift', 'lua', 'vue', 'svelte'])
const TEXT = new Set(['txt', 'log', 'csv', 'tsv', 'rst', 'tex', 'env.example', 'gitignore', 'junosignore'])
const STOP = new Set(['from', 'about', 'the', 'of', 'a', 'an', 'in', 'on', 'for', 'with', 'file', 'files', 'document', 'documents', 'that', 'to', 'and', 'my', 'me', 'find', 'show'])

export function kindOf(ext: string): FileKind {
  if (MARKDOWN.has(ext)) return 'markdown'
  if (CODE.has(ext)) return 'code'
  if (TEXT.has(ext)) return 'text'
  if (ext in IMAGE_TYPES) return 'image'
  if (ext === 'pdf') return 'pdf'
  return 'other'
}

// ---- .junosignore ----

interface IgnoreRule {
  re: RegExp
  dirOnly: boolean
  anchored: boolean
}

function globToRegex(glob: string): string {
  let out = ''
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]!
    if (ch === '*' && glob[i + 1] === '*') {
      out += '.*'
      i += 1
    } else if (ch === '*') out += '[^/]*'
    else if (ch === '?') out += '[^/]'
    else out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return out
}

/** The subset of gitignore that matters here: comments, `dir/`, `*.ext`, names and anchored paths. Negation is not supported. */
export function parseIgnore(text: string): IgnoreRule[] {
  const rules: IgnoreRule[] = []
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('!')) continue
    const dirOnly = line.endsWith('/')
    if (dirOnly) line = line.slice(0, -1)
    const anchored = line.includes('/')
    if (line.startsWith('/')) line = line.slice(1)
    if (!line) continue
    rules.push({ re: new RegExp(`^${globToRegex(line)}$`), dirOnly, anchored })
  }
  return rules
}

/** True when a relative path (and so everything below it) is left out of the index. */
export function isExcluded(rules: IgnoreRule[], rel: string, isDir: boolean): boolean {
  const parts = rel.split('/')
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i]!
    const partIsDir = i < parts.length - 1 || isDir
    if (partIsDir && BUILTIN_IGNORED.has(name)) return true
    const prefix = parts.slice(0, i + 1).join('/')
    for (const rule of rules) {
      if (rule.dirOnly && !partIsDir) continue
      if (rule.re.test(rule.anchored ? prefix : name)) return true
    }
  }
  const last = parts[parts.length - 1]!
  return !isDir && SECRET_FILE.test(last)
}

// ---- natural-language questions ----

/** "PDFs from last week about the API" becomes a type, a time window and words to look for. */
export function understand(question: string): { text: string; types: FileKind[]; days: number | null } {
  let q = ` ${question.toLowerCase()} `
  const types: FileKind[] = []
  const take = (re: RegExp, kind: FileKind) => {
    if (re.test(q)) {
      types.push(kind)
      q = q.replace(re, ' ')
    }
  }
  take(/\bpdfs?\b/, 'pdf')
  take(/\b(images?|pictures?|photos?|screenshots?)\b/, 'image')
  take(/\bmarkdown\b/, 'markdown')
  take(/\b(code|source)\b/, 'code')
  take(/\btext files?\b/, 'text')
  let days: number | null = null
  const lastDays = /\b(?:last|past) (\d{1,3}) days?\b/.exec(q)
  if (lastDays) {
    days = Number(lastDays[1])
    q = q.replace(lastDays[0], ' ')
  } else if (/\btoday\b/.test(q)) {
    days = 1
    q = q.replace(/\btoday\b/, ' ')
  } else if (/\byesterday\b/.test(q)) {
    days = 2
    q = q.replace(/\byesterday\b/, ' ')
  } else if (/\b(last|this|past) week\b/.test(q)) {
    days = 7
    q = q.replace(/\b(last|this|past) week\b/, ' ')
  } else if (/\b(last|this|past) month\b/.test(q)) {
    days = 31
    q = q.replace(/\b(last|this|past) month\b/, ' ')
  }
  const words = (q.match(/[\p{L}\p{N}_]+/gu) ?? []).filter((w) => !STOP.has(w))
  return { text: words.join(' '), types, days }
}

interface EntryRow {
  id: number
  folder_id: string
  rel_path: string
  name: string
  ext: string
  kind: FileKind
  size: number
  mtime_ms: number
  text_indexed: number
}

interface FolderRow {
  id: string
  path: string
  label: string
  added_at: string
  scanned_at: string | null
  status: 'scanning' | 'ready'
}

interface ProjectRow {
  id: string
  folder_id: string
  rel_path: string
  name: string
}

const git = (cwd: string, args: string[]): Promise<string | null> =>
  new Promise((resolve) => {
    execFile(
      'git',
      ['-c', 'core.fsmonitor=false', '-C', cwd, ...args],
      { timeout: 5000, windowsHide: true, maxBuffer: 1_000_000, env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', USERPROFILE: process.env.USERPROFILE ?? '', SystemRoot: process.env.SystemRoot ?? '', GIT_OPTIONAL_LOCKS: '0' } },
      (err, stdout) => resolve(err ? null : String(stdout)),
    )
  })

/**
 * Files and projects (spec 11), read-only. Only folders Jonas adds are indexed, by a scan that skips build output,
 * `.junosignore`, credential-looking files and links. Search, previews and chat attachments all go back through the same
 * exclusions at the time they are used, and removing a folder deletes every row, search entry and project it made.
 */
export class FilesService {
  readonly #o: FilesOptions
  readonly #now: () => number
  readonly #scans = new Map<string, { cancelled: boolean; done: Promise<void> }>()
  readonly #ignoreCache = new Map<string, { mtime: number; rules: IgnoreRule[] }>()
  readonly #gitCache = new Map<string, { at: number; info: Pick<ProjectRecord, 'branch' | 'lastCommit' | 'dirty' | 'activity'> }>()
  #timer: ReturnType<typeof setInterval> | undefined

  constructor(options: FilesOptions) {
    this.#o = options
    this.#now = options.now ?? Date.now
  }

  start(): void {
    if (this.#timer) return
    for (const f of this.#folderRows()) void this.rescan(f.id).catch(() => {})
    this.#timer = setInterval(() => {
      for (const f of this.#folderRows()) void this.rescan(f.id).catch(() => {})
    }, this.#o.rescanMs ?? 5 * 60_000)
    this.#timer.unref()
  }

  async stopService(): Promise<void> {
    clearInterval(this.#timer)
    this.#timer = undefined
    for (const scan of this.#scans.values()) scan.cancelled = true
    await Promise.allSettled([...this.#scans.values()].map((s) => s.done))
  }

  #iso(): string {
    return new Date(this.#now()).toISOString()
  }

  // ---- folders ----

  #folderRows(): FolderRow[] {
    return this.#o.store.db.prepare('SELECT * FROM file_folder ORDER BY added_at').all() as unknown as FolderRow[]
  }

  #folder(id: string): FolderRow {
    const row = this.#o.store.db.prepare('SELECT * FROM file_folder WHERE id = ?').get(id) as FolderRow | undefined
    if (!row) throw new FilesError(404, 'not_found', 'No such folder.')
    return row
  }

  folders(): FileFolder[] {
    const db = this.#o.store.db
    return this.#folderRows().map((f) => ({
      id: f.id,
      path: f.path,
      label: f.label || basename(f.path),
      addedAt: f.added_at,
      scannedAt: f.scanned_at,
      status: f.status,
      fileCount: (db.prepare('SELECT COUNT(*) AS n FROM file_entry WHERE folder_id = ?').get(f.id) as { n: number }).n,
      projectCount: (db.prepare('SELECT COUNT(*) AS n FROM file_project WHERE folder_id = ?').get(f.id) as { n: number }).n,
    }))
  }

  /** Adds a folder to the allowlist and starts indexing it. Nothing outside an added folder is ever read. */
  addFolder(path: unknown, label?: unknown): FileFolder {
    if (typeof path !== 'string' || !isAbsolute(path)) throw new FilesError(400, 'bad_path', 'Give the full path of a folder.')
    let real: string
    try {
      if (!statSync(path).isDirectory()) throw new Error('not a directory')
      real = realpathSync(path)
    } catch {
      throw new FilesError(400, 'bad_path', 'That folder does not exist.')
    }
    if (dirname(real) === real || real === realpathSync(homedir())) throw new FilesError(400, 'too_broad', 'That is too broad. Add a specific folder, not a whole drive or your home folder.')
    const data = existsSync(this.#o.dataHome) ? realpathSync(this.#o.dataHome) : this.#o.dataHome
    const within = (inner: string, outer: string) => inner === outer || inner.startsWith(outer + sep)
    if (within(real, data) || within(data, real)) throw new FilesError(400, 'own_data', 'That folder holds JunOS’s own data, so it cannot be indexed.')
    for (const f of this.#folderRows()) {
      if (within(real, f.path) || within(f.path, real)) throw new FilesError(409, 'overlaps', `That overlaps a folder already added (${f.path}).`)
    }
    const id = randomUUID()
    this.#o.store.db.prepare('INSERT INTO file_folder (id, path, label, added_at) VALUES (?, ?, ?, ?)').run(id, real, typeof label === 'string' ? label.slice(0, 60) : '', this.#iso())
    this.#o.store.append('files.folder.added', { folderId: id }, id)
    void this.rescan(id).catch(() => {})
    return this.folders().find((f) => f.id === id)!
  }

  /** Revocation: everything the folder produced is deleted, and a scan in progress is cancelled. */
  async removeFolder(id: string): Promise<FolderRemoval> {
    this.#folder(id)
    const scan = this.#scans.get(id)
    if (scan) {
      scan.cancelled = true
      await scan.done.catch(() => {})
    }
    const db = this.#o.store.db
    const ids = (db.prepare('SELECT id FROM file_entry WHERE folder_id = ?').all(id) as Array<{ id: number }>).map((r) => r.id)
    const projects = (db.prepare('SELECT COUNT(*) AS n FROM file_project WHERE folder_id = ?').get(id) as { n: number }).n
    db.exec('BEGIN')
    try {
      const del = db.prepare('DELETE FROM file_fts WHERE rowid = ?')
      for (const entryId of ids) del.run(entryId)
      db.prepare('DELETE FROM file_entry WHERE folder_id = ?').run(id)
      db.prepare('DELETE FROM file_project WHERE folder_id = ?').run(id)
      db.prepare('DELETE FROM file_folder WHERE id = ?').run(id)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    this.#ignoreCache.delete(id)
    this.#o.store.append('files.folder.removed', { folderId: id, files: ids.length, projects }, id)
    return { folderId: id, removed: { files: ids.length, projects, searchEntries: ids.length } }
  }

  // ---- indexing ----

  #ignoreRules(folder: FolderRow): IgnoreRule[] {
    const file = join(folder.path, '.junosignore')
    let mtime = 0
    try {
      mtime = statSync(file).mtimeMs
    } catch {
      this.#ignoreCache.delete(folder.id)
      return []
    }
    const cached = this.#ignoreCache.get(folder.id)
    if (cached && cached.mtime === mtime) return cached.rules
    const rules = parseIgnore(readFileSync(file, 'utf8'))
    this.#ignoreCache.set(folder.id, { mtime, rules })
    return rules
  }

  /** Looks at a folder again: new and changed files are indexed, vanished ones are dropped. */
  rescan(id: string): Promise<void> {
    const running = this.#scans.get(id)
    if (running) return running.done
    const token = { cancelled: false, done: Promise.resolve() }
    token.done = this.#scan(id, token).finally(() => {
      if (this.#scans.get(id) === token) this.#scans.delete(id)
    })
    this.#scans.set(id, token)
    return token.done
  }

  async #scan(id: string, token: { cancelled: boolean }): Promise<void> {
    const db = this.#o.store.db
    const folder = db.prepare('SELECT * FROM file_folder WHERE id = ?').get(id) as FolderRow | undefined
    if (!folder) return
    db.prepare(`UPDATE file_folder SET status = 'scanning' WHERE id = ?`).run(id)
    const rules = this.#ignoreRules(folder)
    const seen = new Set<string>()
    const projects = new Map<string, string>()
    const maxFiles = this.#o.maxFiles ?? 20_000
    const stack = ['']
    let count = 0
    scanning: while (stack.length > 0) {
      if (token.cancelled) return
      const rel = stack.pop()!
      let entries
      try {
        entries = await readdir(join(folder.path, rel), { withFileTypes: true })
      } catch {
        continue
      }
      if (entries.some((e) => e.name === '.git')) projects.set(rel, rel ? basename(rel) : basename(folder.path))
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue // links could lead out of the folder
        const childRel = rel ? `${rel}/${entry.name}` : entry.name
        if (isExcluded(rules, childRel, entry.isDirectory())) continue
        if (entry.isDirectory()) {
          stack.push(childRel)
          continue
        }
        if (!entry.isFile()) continue
        if (++count > maxFiles) break scanning
        seen.add(childRel)
        await this.#indexFile(folder, childRel, token)
        if (token.cancelled) return
      }
      await new Promise((r) => setImmediate(r)) // let requests through between directories
    }
    if (token.cancelled) return
    // Files that are gone, or have become excluded since the last scan.
    const rows = db.prepare('SELECT id, rel_path FROM file_entry WHERE folder_id = ?').all(id) as Array<{ id: number; rel_path: string }>
    db.exec('BEGIN')
    try {
      for (const row of rows) {
        if (seen.has(row.rel_path)) continue
        db.prepare('DELETE FROM file_fts WHERE rowid = ?').run(row.id)
        db.prepare('DELETE FROM file_entry WHERE id = ?').run(row.id)
      }
      db.prepare('DELETE FROM file_project WHERE folder_id = ?').run(id)
      for (const [rel, name] of projects) db.prepare('INSERT INTO file_project (id, folder_id, rel_path, name) VALUES (?, ?, ?, ?)').run(randomUUID(), id, rel, name)
      db.prepare(`UPDATE file_folder SET status = 'ready', scanned_at = ? WHERE id = ?`).run(this.#iso(), id)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    this.#o.store.append('files.scan.finished', { folderId: id, files: seen.size, projects: projects.size }, id)
  }

  async #indexFile(folder: FolderRow, rel: string, token: { cancelled: boolean }): Promise<void> {
    const db = this.#o.store.db
    const full = join(folder.path, rel)
    let info
    try {
      info = await stat(full)
    } catch {
      return
    }
    if (info.size > MAX_FILE_BYTES) return
    const known = db.prepare('SELECT id, size, mtime_ms FROM file_entry WHERE folder_id = ? AND rel_path = ?').get(folder.id, rel) as { id: number; size: number; mtime_ms: number } | undefined
    if (known && known.size === info.size && known.mtime_ms === Math.floor(info.mtimeMs)) return // only a changed file is read again
    const name = basename(rel)
    const ext = extname(name).slice(1).toLowerCase()
    const kind = kindOf(ext)
    let content = ''
    let textIndexed = 0
    if ((kind === 'markdown' || kind === 'code' || kind === 'text') && info.size <= MAX_TEXT_BYTES) {
      try {
        const text = await readFile(full, 'utf8')
        if (!text.includes('\0')) {
          content = text
          textIndexed = 1
        }
      } catch {
        /* unreadable: indexed by name only */
      }
    }
    if (token.cancelled) return
    db.prepare(
      `INSERT INTO file_entry (folder_id, rel_path, name, ext, kind, size, mtime_ms, text_indexed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (folder_id, rel_path) DO UPDATE SET name = excluded.name, ext = excluded.ext, kind = excluded.kind, size = excluded.size, mtime_ms = excluded.mtime_ms, text_indexed = excluded.text_indexed`,
    ).run(folder.id, rel, name, ext, kind, info.size, Math.floor(info.mtimeMs), textIndexed)
    const id = (db.prepare('SELECT id FROM file_entry WHERE folder_id = ? AND rel_path = ?').get(folder.id, rel) as { id: number }).id
    db.prepare('DELETE FROM file_fts WHERE rowid = ?').run(id)
    db.prepare('INSERT INTO file_fts (rowid, path, content) VALUES (?, ?, ?)').run(id, rel, content)
  }

  // ---- browsing and search ----

  #projectRows(): ProjectRow[] {
    return this.#o.store.db.prepare('SELECT * FROM file_project').all() as unknown as ProjectRow[]
  }

  #toEntry(row: EntryRow, projects: ProjectRow[]): FileEntry {
    // The deepest project that contains the file.
    let best: ProjectRow | null = null
    for (const p of projects) {
      if (p.folder_id !== row.folder_id) continue
      const inside = p.rel_path === '' || row.rel_path.startsWith(`${p.rel_path}/`)
      if (inside && (!best || p.rel_path.length > best.rel_path.length)) best = p
    }
    return { folderId: row.folder_id, path: row.rel_path, name: row.name, kind: row.kind, size: row.size, modifiedAt: new Date(row.mtime_ms).toISOString(), projectId: best?.id ?? null }
  }

  /** Whether a path is still allowed: exclusions are checked when it is used, not only when it was indexed. */
  #allowed(folder: FolderRow, rel: string): boolean {
    return !isExcluded(this.#ignoreRules(folder), rel, false)
  }

  list(folderId: string, dir = ''): FileListing {
    const folder = this.#folder(folderId)
    const clean = dir.replace(/^\/+|\/+$/g, '')
    if (clean.split('/').includes('..')) throw new FilesError(400, 'bad_path', 'That path is not allowed.')
    const prefix = clean ? `${clean}/` : ''
    const rows = this.#o.store.db
      .prepare(`SELECT * FROM file_entry WHERE folder_id = ? AND substr(rel_path, 1, ?) = ? ORDER BY rel_path`)
      .all(folderId, prefix.length, prefix) as unknown as EntryRow[]
    const dirs = new Set<string>()
    const files: EntryRow[] = []
    for (const row of rows) {
      if (!this.#allowed(folder, row.rel_path)) continue
      const rest = row.rel_path.slice(prefix.length)
      const slash = rest.indexOf('/')
      if (slash === -1) files.push(row)
      else dirs.add(rest.slice(0, slash))
    }
    const projects = this.#projectRows()
    return { folderId, dir: clean, dirs: [...dirs].sort(), files: files.map((r) => this.#toEntry(r, projects)) }
  }

  search(params: { q?: string; type?: string; project?: string; folder?: string }): FileSearchResponse {
    const understood = understand(params.q ?? '')
    const types = new Set<FileKind>(understood.types)
    if (params.type && (FILE_KINDS as readonly string[]).includes(params.type)) types.add(params.type as FileKind)
    const where: string[] = []
    const args: Array<string | number> = []
    if (types.size > 0) {
      where.push(`e.kind IN (${[...types].map(() => '?').join(',')})`)
      args.push(...types)
    }
    if (understood.days !== null) {
      where.push('e.mtime_ms >= ?')
      args.push(this.#now() - understood.days * 86_400_000)
    }
    if (params.folder) {
      where.push('e.folder_id = ?')
      args.push(params.folder)
    }
    const terms = understood.text.split(' ').filter(Boolean).slice(0, 8)
    const db = this.#o.store.db
    let rows: Array<EntryRow & { snip?: string }>
    if (terms.length > 0) {
      const match = terms.map((t) => `"${t.replace(/"/g, '')}"*`).join(' ')
      rows = db
        .prepare(
          `SELECT e.*, snippet(file_fts, 1, '[[', ']]', '…', 12) AS snip FROM file_fts JOIN file_entry e ON e.id = file_fts.rowid
           WHERE file_fts MATCH ? ${where.length ? `AND ${where.join(' AND ')}` : ''} ORDER BY bm25(file_fts, 8.0, 1.0) LIMIT 200`,
        )
        .all(match, ...args) as unknown as Array<EntryRow & { snip?: string }>
    } else {
      rows = db.prepare(`SELECT e.* FROM file_entry e ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY e.mtime_ms DESC LIMIT 200`).all(...args) as unknown as EntryRow[]
    }
    const folders = new Map(this.#folderRows().map((f) => [f.id, f]))
    const projects = this.#projectRows()
    const hits: FileSearchHit[] = []
    for (const row of rows) {
      const folder = folders.get(row.folder_id)
      if (!folder || !this.#allowed(folder, row.rel_path)) continue
      const entry = this.#toEntry(row, projects)
      if (params.project && entry.projectId !== params.project) continue
      hits.push({ ...entry, snippet: row.snip && row.snip.includes('[[') ? row.snip : '' })
      if (hits.length >= 50) break
    }
    return { understood: { text: understood.text, types: [...types], days: understood.days }, hits }
  }

  // ---- reading one file ----

  /** The real path of an indexed, still-allowed file, or why it cannot be read. */
  #resolve(folderId: string, rel: unknown): { folder: FolderRow; full: string; row: EntryRow } {
    const folder = this.#folder(folderId)
    if (typeof rel !== 'string' || !rel || rel.split('/').includes('..') || isAbsolute(rel)) throw new FilesError(400, 'bad_path', 'That path is not allowed.')
    const row = this.#o.store.db.prepare('SELECT * FROM file_entry WHERE folder_id = ? AND rel_path = ?').get(folderId, rel) as EntryRow | undefined
    if (!row || !this.#allowed(folder, rel)) throw new FilesError(404, 'not_found', 'That file is not in the index.')
    const full = join(folder.path, rel)
    try {
      if (lstatSync(full).isSymbolicLink()) throw new Error('link')
      const real = realpathSync(full)
      if (!real.startsWith(realpathSync(folder.path) + sep)) throw new Error('outside')
      return { folder, full: real, row }
    } catch {
      throw new FilesError(404, 'not_found', 'That file is no longer there.')
    }
  }

  preview(folderId: string, rel: unknown): FilePreview {
    const { full, row } = this.#resolve(folderId, rel)
    const base = { name: row.name, size: row.size }
    if (row.kind === 'markdown' || row.kind === 'code' || row.kind === 'text') {
      const data = readFileSync(full)
      if (data.subarray(0, 8000).includes(0)) return { kind: 'other', ...base, note: 'This file is not text.' }
      const truncated = data.length > MAX_TEXT_BYTES
      return { kind: row.kind, ...base, text: data.subarray(0, MAX_TEXT_BYTES).toString('utf8'), truncated }
    }
    if (row.kind === 'image') {
      if (row.size > MAX_IMAGE_BYTES) return { kind: 'other', ...base, note: 'This image is too large to preview.' }
      const type = IMAGE_TYPES[row.ext]!
      return { kind: 'image', ...base, dataUrl: `data:${type};base64,${readFileSync(full).toString('base64')}` }
    }
    if (row.kind === 'pdf') return { kind: 'pdf', ...base, note: 'PDF previews are not shown here. Use Download to open it.' }
    return { kind: 'other', ...base, note: 'There is no preview for this kind of file.' }
  }

  /** A file for download (images and PDFs only), sent as an attachment under a sandboxing policy. */
  raw(folderId: string, rel: unknown): { name: string; type: string; data: Buffer } {
    const { full, row } = this.#resolve(folderId, rel)
    if (row.kind !== 'image' && row.kind !== 'pdf') throw new FilesError(415, 'not_downloadable', 'Only images and PDFs can be downloaded here.')
    if (row.size > MAX_FILE_BYTES) throw new FilesError(413, 'too_large', 'That file is too large.')
    return { name: row.name, type: row.kind === 'pdf' ? 'application/pdf' : IMAGE_TYPES[row.ext]!, data: readFileSync(full) }
  }

  /** One file's text for a chat attachment, with secret-looking strings masked. */
  readForChat(ref: AttachedFile): { name: string; text: string } {
    let p: FilePreview
    try {
      p = this.preview(ref?.folderId, ref?.path)
    } catch (err) {
      throw new Error(err instanceof FilesError ? err.message : 'That file cannot be attached.')
    }
    if (p.kind !== 'markdown' && p.kind !== 'code' && p.kind !== 'text') throw new Error(`${p.name} is not a text file.`)
    return { name: p.name, text: redact(p.text) as string }
  }

  // ---- projects ----

  hasProject(id: string): boolean {
    return Boolean(this.#o.store.db.prepare('SELECT 1 FROM file_project WHERE id = ?').get(id))
  }

  #projectFiles(p: ProjectRow): EntryRow[] {
    const prefix = p.rel_path ? `${p.rel_path}/` : ''
    return this.#o.store.db.prepare('SELECT * FROM file_entry WHERE folder_id = ? AND substr(rel_path, 1, ?) = ? ORDER BY rel_path').all(p.folder_id, prefix.length, prefix) as unknown as EntryRow[]
  }

  /** The project's file list for a chat: names and sizes, never contents, never the excluded. */
  manifest(projectId: string): string | null {
    const p = this.#o.store.db.prepare('SELECT * FROM file_project WHERE id = ?').get(projectId) as ProjectRow | undefined
    if (!p) return null
    const folder = this.#folder(p.folder_id)
    const prefix = p.rel_path ? p.rel_path.length + 1 : 0
    const lines = this.#projectFiles(p)
      .filter((r) => this.#allowed(folder, r.rel_path))
      .slice(0, 200)
      .map((r) => `${r.rel_path.slice(prefix)} (${r.size} bytes)`)
    const text = `Project: ${p.name}\nFiles (names and sizes only; you cannot open them, so ask the user to attach any file you need):\n${lines.join('\n')}`
    return `<untrusted-data source="project manifest">\n${text.replaceAll('</untrusted-data>', '[/untrusted-data]')}\n</untrusted-data>`
  }

  async projects(): Promise<ProjectRecord[]> {
    const folders = new Map(this.#folderRows().map((f) => [f.id, f]))
    const out: ProjectRecord[] = []
    for (const p of this.#projectRows()) {
      const folder = folders.get(p.folder_id)
      if (!folder) continue
      const files = this.#projectFiles(p).filter((r) => this.#allowed(folder, r.rel_path))
      const counts = new Map<string, number>()
      for (const f of files) if (f.ext) counts.set(f.ext, (counts.get(f.ext) ?? 0) + 1)
      const path = p.rel_path ? join(folder.path, p.rel_path) : folder.path
      out.push({
        id: p.id,
        name: p.name,
        path,
        folderId: p.folder_id,
        fileCount: files.length,
        languages: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([ext, count]) => ({ ext, count })),
        ...(await this.#gitInfo(path)),
      })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }

  async #gitInfo(path: string): Promise<Pick<ProjectRecord, 'branch' | 'lastCommit' | 'dirty' | 'activity'>> {
    const cached = this.#gitCache.get(path)
    if (cached && this.#now() - cached.at < 30_000) return cached.info
    const [branch, last, status, since] = await Promise.all([
      git(path, ['rev-parse', '--abbrev-ref', 'HEAD']),
      git(path, ['log', '-1', '--format=%cI%n%s']),
      git(path, ['status', '--porcelain']),
      git(path, ['log', '--since=14.days', '--format=%cs']),
    ])
    const [at, ...subject] = (last ?? '').trim().split('\n')
    const activity = Array<number>(14).fill(0)
    const today = new Date(this.#now())
    for (const day of (since ?? '').split('\n').filter(Boolean)) {
      const ago = Math.round((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.parse(day)) / 86_400_000)
      if (ago >= 0 && ago < 14) activity[13 - ago]! += 1
    }
    const info = {
      branch: branch ? branch.trim() : null,
      lastCommit: at ? { at, subject: subject.join(' ') } : null,
      dirty: status === null ? null : status.split('\n').filter(Boolean).length,
      activity,
    }
    this.#gitCache.set(path, { at: this.#now(), info })
    return info
  }
}
