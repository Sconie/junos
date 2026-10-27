import { useCallback, useEffect, useState } from 'react'
import type { FileEntry, FileFolder, FileKind, FileListing, FilePreview, FileSearchHit, FileSearchResponse, ProjectRecord, SendMessageResponse } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'
import { previewDocument } from '../lib/markdown'

const KIND_LABEL: Record<FileKind | '', string> = { '': 'Any type', markdown: 'Markdown', code: 'Code', text: 'Text', image: 'Images', pdf: 'PDFs', other: 'Other' }
const BARS = '▁▂▃▄▅▆▇█'

const size = (n: number) => (n < 1024 ? `${n} B` : n < 1_048_576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1_048_576).toFixed(1)} MB`)
const ago = (iso: string) => new Date(iso).toLocaleDateString()

function sparkline(counts: number[]): string {
  const max = Math.max(1, ...counts)
  return counts.map((c) => (c === 0 ? '·' : BARS[Math.min(BARS.length - 1, Math.ceil((c / max) * (BARS.length - 1)))]!)).join('')
}

/** A search snippet with [[matches]] marked, shown as text with the matches emphasised. Never as HTML. */
function Snippet({ text }: { text: string }) {
  return (
    <span className="snippet">
      {text.split(/(\[\[.*?\]\])/g).map((part, i) => (part.startsWith('[[') ? <mark key={i}>{part.slice(2, -2)}</mark> : <span key={i}>{part}</span>))}
    </span>
  )
}

/** Files and projects: folders you add, search across them, a safe preview, and projects to hand to a chat. Read-only. */
export default function Files() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [folders, setFolders] = useState<FileFolder[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [folderId, setFolderId] = useState<string | null>(null)
  const [dir, setDir] = useState('')
  const [listing, setListing] = useState<FileListing | null>(null)
  const [q, setQ] = useState('')
  const [type, setType] = useState<FileKind | ''>('')
  const [result, setResult] = useState<FileSearchResponse | null>(null)
  const [selected, setSelected] = useState<FileEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Folder and scan events move lastSeq, so a scan finishing updates the screen.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [f, p] = await Promise.all([api('/files/folders'), api('/files/projects')])
        if (!f.ok || !p.ok) throw new Error('load')
        const fb = (await f.json()) as { folders: FileFolder[] }
        const pb = (await p.json()) as { projects: ProjectRecord[] }
        if (cancelled) return
        setFolders(fb.folders)
        setProjects(pb.projects)
        setFolderId((cur) => (cur && fb.folders.some((x) => x.id === cur) ? cur : (fb.folders[0]?.id ?? null)))
        setError(null)
      } catch {
        if (!cancelled) setError('Could not load your folders. Is junosd running?')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  useEffect(() => {
    if (!folderId) return
    let cancelled = false
    void (async () => {
      const res = await api(`/files/list?folder=${folderId}&dir=${encodeURIComponent(dir)}`)
      if (res.ok && !cancelled) setListing((await res.json()) as FileListing)
    })()
    return () => {
      cancelled = true
    }
  }, [api, folderId, dir, lastSeq])

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    if (!q.trim() && !type) return void setResult(null)
    const res = await api(`/files/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`)
    if (res.ok) setResult((await res.json()) as FileSearchResponse)
  }

  async function call(path: string, method: string, body?: unknown): Promise<Response> {
    const res = await api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string }
      setError(err.message ?? 'That did not work.')
    } else setError(null)
    return res
  }

  async function openInChat(project: ProjectRecord) {
    const res = await call('/conversations', 'POST', { provider: 'claude', projectId: project.id, title: project.name })
    if (!res.ok) return
    const created = (await res.json()) as { id: string }
    window.location.assign(`/chat?c=${created.id}`)
  }

  return (
    <section>
      <h1>Files & projects</h1>
      <p className="muted">Folders you add are indexed so you can search them and hand them to a chat. JunOS only reads them: nothing is changed, and nothing is sent anywhere unless you attach it.</p>
      {error && (
        <p className="approval-notice" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="approval-notice" role="status">
          {notice}
        </p>
      )}

      <Folders
        folders={folders}
        selected={folderId}
        onSelect={(id) => {
          setFolderId(id)
          setDir('')
        }}
        onAdd={async (path) => {
          const res = await call('/files/folders', 'POST', { path })
          if (res.ok) refresh()
          return res.ok
        }}
        onRescan={async (id) => {
          await call(`/files/folders/${id}/rescan`, 'POST')
          refresh()
        }}
        onRemove={async (id) => {
          const res = await call(`/files/folders/${id}`, 'DELETE')
          if (res.ok) {
            const body = (await res.json()) as { removed: { files: number; projects: number; searchEntries: number } }
            setNotice(`Removed the folder. Deleted ${body.removed.files} indexed files, ${body.removed.searchEntries} search entries and ${body.removed.projects} projects.`)
            setSelected(null)
            setResult(null)
            refresh()
          }
        }}
      />

      {projects.length > 0 && (
        <div className="panel" aria-label="Projects">
          <h3>Projects</h3>
          <div className="grid projects">
            {projects.map((p) => (
              <article key={p.id} className="card project" aria-label={p.name}>
                <h4>{p.name}</h4>
                <p className="muted">
                  {p.branch ?? 'no branch'}
                  {p.dirty ? ` · ${p.dirty} changed` : p.dirty === 0 ? ' · clean' : ''} · {p.fileCount} files
                </p>
                {p.lastCommit && (
                  <p className="muted">
                    Last commit {ago(p.lastCommit.at)}: {p.lastCommit.subject}
                  </p>
                )}
                <p className="muted" aria-label="Languages">
                  {p.languages.map((l) => `${l.ext} ${l.count}`).join(' · ')}
                </p>
                <p aria-label="14-day activity" className="spark">
                  {sparkline(p.activity)}
                </p>
                <div className="task-actions">
                  <button type="button" onClick={() => void openInChat(p)}>
                    Open in Chat
                  </button>
                  <a className="button" href={`/board?project=${encodeURIComponent(p.name)}`}>
                    Show board
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <form className="toolbar files-search" onSubmit={(e) => void search(e)} role="search">
        <input aria-label="Search files" placeholder="Search, e.g. PDFs from last week about the API" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="File type" value={type} onChange={(e) => setType(e.target.value as FileKind | '')}>
          {(Object.keys(KIND_LABEL) as Array<FileKind | ''>).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <button type="submit" className="primary">
          Search
        </button>
      </form>

      {result && (
        <div className="panel" aria-label="Search results">
          <p className="muted">
            Looking for {result.understood.text ? `“${result.understood.text}”` : 'any file'}
            {result.understood.types.length ? ` · ${result.understood.types.join(', ')}` : ''}
            {result.understood.days !== null ? ` · changed in the last ${result.understood.days} days` : ''}
          </p>
          {result.hits.length === 0 && <p className="muted">Nothing found.</p>}
          <ul className="file-list">
            {result.hits.map((h: FileSearchHit) => (
              <li key={`${h.folderId}:${h.path}`}>
                <button type="button" className="link" onClick={() => setSelected(h)}>
                  {h.path}
                </button>{' '}
                <span className="muted">
                  {h.kind} · {size(h.size)} · {ago(h.modifiedAt)}
                </span>
                {h.snippet && (
                  <div>
                    <Snippet text={h.snippet} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="files-grid">
        <div className="panel" aria-label="Browser">
          <h3>{folders.find((f) => f.id === folderId)?.label ?? 'Folder'}</h3>
          {folderId && listing ? (
            <>
              <p className="muted">
                <button type="button" className="link" onClick={() => setDir('')}>
                  Top
                </button>
                {dir
                  .split('/')
                  .filter(Boolean)
                  .map((part, i, all) => (
                    <span key={i}>
                      {' / '}
                      <button type="button" className="link" onClick={() => setDir(all.slice(0, i + 1).join('/'))}>
                        {part}
                      </button>
                    </span>
                  ))}
              </p>
              <ul className="file-list">
                {listing.dirs.map((d) => (
                  <li key={d}>
                    <button type="button" className="link" onClick={() => setDir(dir ? `${dir}/${d}` : d)}>
                      {d}/
                    </button>
                  </li>
                ))}
                {listing.files.map((f) => (
                  <li key={f.path}>
                    <button type="button" className="link" onClick={() => setSelected(f)}>
                      {f.name}
                    </button>{' '}
                    <span className="muted">
                      {size(f.size)} · {ago(f.modifiedAt)}
                    </span>
                  </li>
                ))}
              </ul>
              {listing.dirs.length === 0 && listing.files.length === 0 && <p className="muted">Nothing here.</p>}
            </>
          ) : (
            <p className="muted">{folders.length === 0 ? 'Add a folder to get started.' : 'Choose a folder.'}</p>
          )}
        </div>
        <Preview key={selected ? `${selected.folderId}:${selected.path}` : "none"} entry={selected} projects={projects} onNotice={setNotice} onError={setError} />
      </div>
    </section>
  )
}

function Folders(props: {
  folders: FileFolder[]
  selected: string | null
  onSelect: (id: string) => void
  onAdd: (path: string) => Promise<boolean>
  onRescan: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [path, setPath] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  return (
    <div className="panel" aria-label="Folders">
      <h3>Folders</h3>
      {props.folders.length === 0 && <p className="muted">No folders yet. Only folders you add here are ever indexed.</p>}
      <ul className="file-list">
        {props.folders.map((f) => (
          <li key={f.id} data-selected={props.selected === f.id}>
            <button type="button" className="link" onClick={() => props.onSelect(f.id)}>
              {f.label}
            </button>{' '}
            <span className="muted">
              {f.path} · {f.status === 'scanning' ? 'indexing…' : `${f.fileCount} files · ${f.projectCount} projects`}
            </span>{' '}
            <button type="button" onClick={() => void props.onRescan(f.id)} aria-label={`Rescan ${f.label}`}>
              Rescan
            </button>{' '}
            {confirming === f.id ? (
              <>
                <span>Remove it and delete its index ({f.fileCount} files, its search entries and projects)?</span>{' '}
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setConfirming(null)
                    void props.onRemove(f.id)
                  }}
                >
                  Yes, remove
                </button>{' '}
                <button type="button" onClick={() => setConfirming(null)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirming(f.id)} aria-label={`Remove ${f.label}`}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="task-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!path.trim()) return
          void props.onAdd(path.trim()).then((ok) => ok && setPath(''))
        }}
      >
        <input aria-label="Folder path" placeholder="Full path of a folder to add" value={path} onChange={(e) => setPath(e.target.value)} />
        <button type="submit" disabled={!path.trim()}>
          Add folder
        </button>
      </form>
    </div>
  )
}

function Preview({ entry, projects, onNotice, onError }: { entry: FileEntry | null; projects: ProjectRecord[]; onNotice: (m: string | null) => void; onError: (m: string | null) => void }) {
  const { api } = useAuth()
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [question, setQuestion] = useState('')

  useEffect(() => {
    if (!entry) return
    let cancelled = false
    void (async () => {
      const res = await api(`/files/preview?folder=${entry.folderId}&path=${encodeURIComponent(entry.path)}`)
      if (cancelled) return
      if (res.ok) setPreview((await res.json()) as FilePreview)
      else setPreview({ kind: 'other', name: entry.name, size: entry.size, note: 'This file can no longer be previewed.' })
    })()
    return () => {
      cancelled = true
    }
  }, [api, entry])

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!entry || !question.trim()) return
    const project = projects.find((p) => p.id === entry.projectId)
    const made = await api('/conversations', { method: 'POST', body: JSON.stringify({ provider: 'claude', title: entry.name, ...(project ? { projectId: project.id } : {}) }) })
    if (!made.ok) return onError('Could not start a chat.')
    const conversation = (await made.json()) as { id: string }
    const sent = await api(`/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ content: question, attachments: [{ folderId: entry.folderId, path: entry.path }] }) })
    const body = (await sent.json().catch(() => ({}))) as SendMessageResponse & { message?: string }
    if (!sent.ok) return onError(body.message ?? 'The file was not attached.')
    if (body.status === 'disclosure_required') return onNotice('Open Chat and accept the notice for the provider once, then ask again. The file was not sent.')
    window.location.assign(`/chat?c=${conversation.id}`)
  }

  if (!entry) {
    return (
      <div className="panel" aria-label="Preview">
        <p className="muted">Choose a file to preview it.</p>
      </div>
    )
  }
  return (
    <div className="panel" aria-label="Preview">
      <h3>{entry.name}</h3>
      <p className="muted">
        {entry.kind} · {size(entry.size)}
        {preview?.kind === 'image' || preview?.kind === 'pdf' ? (
          <>
            {' · '}
            <a href={`/api/files/raw?folder=${entry.folderId}&path=${encodeURIComponent(entry.path)}`}>Download</a>
          </>
        ) : null}
      </p>
      {preview ? (
        // No scripts, no same-origin access, and a policy inside: a file can show text and pictures, nothing more.
        <iframe title={`Preview of ${entry.name}`} sandbox="" srcDoc={previewDocument(preview as { kind: string; text?: string; dataUrl?: string; note?: string })} className="file-preview" />
      ) : (
        <p className="muted">Loading…</p>
      )}
      {preview && (preview.kind === 'markdown' || preview.kind === 'code' || preview.kind === 'text') && (
        <form className="task-row" onSubmit={(e) => void ask(e)}>
          <input aria-label="Ask about this file" placeholder="Ask about this file" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <button type="submit" disabled={!question.trim()}>
            Ask in Chat
          </button>
        </form>
      )}
    </div>
  )
}
