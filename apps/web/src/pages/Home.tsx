import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { HomeCard, HomeResponse, SendMessageResponse } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

function greeting(now: Date): string {
  const h = now.getHours()
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/**
 * A card of its own: skeleton while it loads, its data when it has some, and an error with a retry when it does not.
 * One card failing never takes the others with it.
 */
function Card<T>({ title, card, retry, link, children }: { title: string; card: HomeCard<T> | undefined; retry: () => void; link?: { to: string; label: string }; children: (data: T) => ReactNode }) {
  return (
    <section className="card home-card" aria-label={title} aria-busy={card === undefined} data-status={card?.status ?? 'loading'}>
      <header className="approval-head">
        <h3>{title}</h3>
        {link && (
          <Link to={link.to} className="muted">
            {link.label}
          </Link>
        )}
      </header>
      {card === undefined && <p className="muted home-skeleton">Loading…</p>}
      {card?.status === 'error' && (
        <p className="approval-notice" role="alert">
          {card.error}{' '}
          <button type="button" onClick={retry}>
            Retry
          </button>
        </p>
      )}
      {card?.status === 'stale' && (
        <p className="muted">
          {card.error} Showing what it said at {time(card.asOf)}.{' '}
          <button type="button" onClick={retry}>
            Retry
          </button>
        </p>
      )}
      {card?.data != null && children(card.data)}
    </section>
  )
}

/** Home: a glance at what needs you, what is running, what is next, and how Hermes, the board and Scout are doing. */
export default function Home() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [home, setHome] = useState<HomeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const lastLoad = useRef(0)
  const attempts = useRef(0)
  const [today] = useState(() => new Date())
  const retry = useCallback(() => setReload((n) => n + 1), [])

  // Events move lastSeq, so the cards follow the stream; a burst of events loads the page once, not once each.
  useEffect(() => {
    let cancelled = false
    const wait = Math.max(0, 1200 - (Date.now() - lastLoad.current))
    const timer = setTimeout(() => {
      lastLoad.current = Date.now()
      void (async () => {
        try {
          const res = await api('/home')
          if (!res.ok) throw new Error(String(res.status))
          const body = (await res.json()) as HomeResponse
          if (cancelled) return
          setHome(body)
          setError(null)
          // A card that was slow or failed gets a few more tries by itself, a few seconds apart.
          const loaded = Object.values(body.cards).every((card) => card.status === 'ok')
          if (loaded) attempts.current = 0
          else if (attempts.current < 3) {
            attempts.current += 1
            setTimeout(() => !cancelled && setReload((n) => n + 1), 3000)
          }
        } catch {
          if (!cancelled) setError('Could not load Home. Is junosd running?')
        }
      })()
    }, reload === 0 && lastSeq === 0 ? 0 : wait)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [api, lastSeq, reload])

  async function decide(approvalId: string, verb: 'approve' | 'deny') {
    const res = await api(`/approvals/${approvalId}/${verb}`, { method: 'POST' })
    if (!res.ok) setNotice('That approval could not be answered (it may already have been).')
    else setNotice(null)
    retry()
  }

  const c = home?.cards
  return (
    <section>
      <h1>{greeting(today)}</h1>
      <p className="muted">{today.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}. A glance, not a place to work: the Inbox is where decisions are made.</p>
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

      <QuickAsk onNotice={setNotice} />

      <div className="grid home-grid">
        <Card title="Needs you" card={c?.needs} retry={retry} link={{ to: '/inbox', label: 'Inbox' }}>
          {(d) =>
            d.items.length === 0 ? (
              <p className="muted">Nothing is waiting for you.</p>
            ) : (
              <>
                <ul className="home-list">
                  {d.items.map((i) => (
                    <li key={i.id}>
                      <b>{i.title}</b>
                      <br />
                      <span className="muted">{i.body}</span>
                      {i.approval && (
                        <div className="task-actions">
                          {i.approval.irreversible ? (
                            <Link to="/inbox">Review in the Inbox</Link>
                          ) : (
                            <button type="button" onClick={() => void decide(i.approval!.id, 'approve')}>
                              Approve
                            </button>
                          )}
                          <button type="button" onClick={() => void decide(i.approval!.id, 'deny')}>
                            Deny
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {d.total > d.items.length && <p className="muted">and {d.total - d.items.length} more in the Inbox.</p>}
              </>
            )
          }
        </Card>

        <Card title="Running now" card={c?.running} retry={retry}>
          {(d) =>
            d.items.length === 0 ? (
              <p className="muted">Nothing is running.</p>
            ) : (
              <ul className="home-list">
                {d.items.map((i, n) => (
                  <li key={n}>
                    {i.label} <span className="chip">{i.kind}</span>
                  </li>
                ))}
              </ul>
            )
          }
        </Card>

        <Card title="Next runs" card={c?.upcoming} retry={retry} link={{ to: '/schedules', label: 'Scheduled' }}>
          {(d) => (
            <>
              {d.paused && <p className="approval-notice">Everything is stopped, so these will wait.</p>}
              {d.tasks.length === 0 ? (
                <p className="muted">No scheduled tasks.</p>
              ) : (
                <ul className="home-list">
                  {d.tasks.map((t) => (
                    <li key={t.id}>
                      <b>{t.name}</b> {t.running && <span className="chip">running</span>}
                      <br />
                      <span className="muted">
                        {time(t.next)} · <code>{t.cron}</code>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>

        <Card title="Hermes" card={c?.hermes} retry={retry} link={{ to: '/hermes', label: 'Open' }}>
          {(d) =>
            d.mode === 'none' ? (
              <p className="muted">Not connected yet.</p>
            ) : (
              <>
                <p>
                  <span className="pill" data-state={d.state}>
                    {d.state}
                  </span>{' '}
                  <span className="muted">{d.model}{d.mode === 'mock' ? ' (mock)' : ''}</span>
                </p>
                {d.stopUnconfirmed && <p className="approval-notice">Stop was not confirmed.</p>}
                {d.currentTask && <p>Working on: {d.currentTask}</p>}
                <ul className="home-list">
                  {d.steps.map((s, n) => (
                    <li key={n} className="muted">
                      {s.summary} · {s.status.replace('_', ' ')}
                    </li>
                  ))}
                </ul>
              </>
            )
          }
        </Card>

        <Card title="Board" card={c?.board} retry={retry} link={{ to: '/board', label: 'Open' }}>
          {(d) => (
            <>
              <p>
                {d.counts.map((col) => (
                  <span key={col.key} className="chip">
                    {col.name} {col.count}
                  </span>
                ))}
              </p>
              {d.hermesWorkingOn && <p>Hermes is working on: {d.hermesWorkingOn.title}</p>}
              {d.blocked.length > 0 && (
                <>
                  <p className="muted">Blocked:</p>
                  <ul className="home-list">
                    {d.blocked.map((b) => (
                      <li key={b.id}>{b.title}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </Card>

        <Card title="Subscriptions" card={c?.subscriptions} retry={retry} link={{ to: '/connections', label: 'Connections' }}>
          {(d) => (
            <ul className="home-list">
              {d.map((s) => (
                <li key={s.provider}>
                  <b>{s.label}</b> <span className="chip">{s.note ?? s.state.replace('_', ' ')}</span>
                  <br />
                  <span className="muted">{s.resetsAt ? `Limit lifts ${time(s.resetsAt)}` : s.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Scout" card={c?.scout} retry={retry} link={{ to: '/scout', label: 'Open' }}>
          {(d) =>
            d.length === 0 ? (
              <p className="muted">No findings yet.</p>
            ) : (
              <ul className="home-list">
                {d.map((f) => (
                  <li key={f.id}>
                    {f.title} <span className="chip">{f.relevance}</span>
                    <br />
                    <span className="muted">
                      {f.sourceName} · effort {f.effort}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        </Card>

        <Card title="Recent projects and files" card={c?.recent} retry={retry} link={{ to: '/files', label: 'Files' }}>
          {(d) =>
            d.projects.length === 0 && d.files.length === 0 ? (
              <p className="muted">No folders added yet.</p>
            ) : (
              <>
                {d.projects.length > 0 && (
                  <ul className="home-list">
                    {d.projects.map((p) => (
                      <li key={p.id}>
                        {p.name} <span className="muted">{p.fileCount} files</span>
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="home-list">
                  {d.files.map((f) => (
                    <li key={`${f.folderId}:${f.path}`}>
                      {f.name} <span className="muted">{time(f.modifiedAt)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )
          }
        </Card>
      </div>
    </section>
  )
}

/** Ask a quick question: it starts a chat with Claude and opens it. The provider notice applies, as everywhere. */
function QuickAsk({ onNotice }: { onNotice: (m: string | null) => void }) {
  const { api } = useAuth()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      const made = await api('/conversations', { method: 'POST', body: JSON.stringify({ provider: 'claude', title: text.trim().slice(0, 60) }) })
      if (!made.ok) return onNotice('Could not start a chat.')
      const conversation = (await made.json()) as { id: string }
      const sent = await api(`/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ content: text.trim() }) })
      const body = (await sent.json().catch(() => ({}))) as SendMessageResponse & { message?: string }
      if (!sent.ok) return onNotice(body.message ?? 'The question was not sent.')
      if (body.status === 'disclosure_required') return onNotice('Open Chat and accept the notice for the provider once, then ask again. Nothing was sent.')
      window.location.assign(`/chat?c=${conversation.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="home-ask" onSubmit={(e) => void ask(e)} aria-label="Quick ask">
      <input aria-label="Ask a question" placeholder="Ask Claude something…" value={text} onChange={(e) => setText(e.target.value)} />
      <span className="muted">Claude · default model</span>
      <button type="submit" className="primary" disabled={busy || !text.trim()}>
        Ask
      </button>
    </form>
  )
}
