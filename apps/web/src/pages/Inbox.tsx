import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import type { InboxCounts, InboxItem, InboxResponse, TelegramStatus } from '@junos/shared'
import ApprovalCard from '../components/ApprovalCard'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

type Filter = 'all' | 'needs_me' | 'approval' | 'failure' | 'done'

const FILTERS: Array<{ id: Filter; label: string; count: (c: InboxCounts) => number }> = [
  { id: 'needs_me', label: 'Needs me', count: (c) => c.needsMe },
  { id: 'approval', label: 'Approvals', count: (c) => c.approvals },
  { id: 'failure', label: 'Failures', count: (c) => c.failures },
  { id: 'done', label: 'Done', count: (c) => c.done },
  { id: 'all', label: 'All', count: (c) => c.all },
]

/** Read at click time, outside render. */
function inAnHour(): string {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString()
}

const EMPTY: InboxCounts = { needsMe: 0, approvals: 0, failures: 0, done: 0, snoozed: 0, all: 0 }

/** The one queue of decisions and results. Approvals here are the same records Telegram answers. */
export default function Inbox() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [filter, setFilter] = useState<Filter>('needs_me')
  const [data, setData] = useState<InboxResponse>({ items: [], counts: EMPTY })
  const [selected, setSelected] = useState<string | null>(null)
  const [telegram, setTelegram] = useState<TelegramStatus | null>(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Item and approval events move lastSeq, so the list follows the stream instead of polling.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/inbox')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as InboxResponse
        if (cancelled) return
        setData(body)
        setError(false)
      } catch {
        if (!cancelled) setError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/telegram/status')
        if (res.ok && !cancelled) setTelegram((await res.json()) as TelegramStatus)
      } catch {
        /* the daemon banner covers an unreachable daemon */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api])

  const visible = data.items.filter((i) => {
    switch (filter) {
      case 'needs_me':
        return i.status === 'new' && i.kind !== 'result' && i.kind !== 'digest' && i.kind !== 'finding'
      case 'approval':
        return i.kind === 'approval'
      case 'failure':
        return i.kind === 'failure'
      case 'done':
        return i.status === 'done' || i.status === 'resolved'
      default:
        return true
    }
  })
  const current = visible.find((i) => i.id === selected) ?? visible[0]

  async function act(item: InboxItem, action: 'done' | 'snooze' | 'reopen') {
    const body: Record<string, string> = { action }
    if (action === 'snooze') body.until = inAnHour()
    await api(`/inbox/${item.id}/action`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    refresh()
  }

  // j and k move, e marks done. Approve and deny are never keyboard-enabled here: only inside the focused card.
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return
    const i = visible.findIndex((v) => v.id === current?.id)
    if (event.key === 'j' && i < visible.length - 1) setSelected(visible[i + 1]!.id)
    else if (event.key === 'k' && i > 0) setSelected(visible[i - 1]!.id)
    else if (event.key === 'e' && current && current.kind !== 'approval' && current.status === 'new') void act(current, 'done')
  }

  return (
    <section>
      <h1>Inbox</h1>
      <p className="muted">
        Everything that needs you, in one place.{' '}
        {telegram?.enabled ? 'Urgent approvals are also sent to your Telegram bot.' : 'Telegram alerts are off.'}
      </p>
      {telegram && !telegram.enabled && telegram.reason && <p className="muted inbox-tg">{telegram.reason}</p>}
      {error && (
        <p className="approval-notice" role="alert">
          Could not load the Inbox. <button onClick={refresh}>Retry</button>
        </p>
      )}

      <div className="inbox-layout">
        <nav className="inbox-filters" aria-label="Inbox filters">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="inbox-filter" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <span className="inbox-count">{f.count(data.counts)}</span>
            </button>
          ))}
        </nav>

        <ul className="inbox-list" aria-label="Items" tabIndex={0} onKeyDown={onKeyDown}>
          {visible.length === 0 && <li className="muted">Nothing here. New decisions appear as they arrive.</li>}
          {visible.map((i) => (
            <li key={i.id}>
              <button className="approval-row" aria-pressed={current?.id === i.id} onClick={() => setSelected(i.id)}>
                <span className="chip" data-class={i.priority === 'urgent' ? 'destructive' : undefined}>
                  {i.priority}
                </span>
                <b>{i.title}</b>
                <span className="muted">{i.status === 'resolved' ? `settled: ${i.resolution}` : i.status}</span>
              </button>
            </li>
          ))}
        </ul>

        <section className="inbox-detail" aria-label="Selected item">
          {current && <Detail key={current.id} item={current} onChanged={refresh} onAct={act} />}
        </section>
      </div>
    </section>
  )
}

function Detail({ item, onChanged, onAct }: { item: InboxItem; onChanged: () => void; onAct: (i: InboxItem, a: 'done' | 'snooze' | 'reopen') => Promise<void> }) {
  if (item.kind === 'approval' && item.approval) {
    return <ApprovalCard approval={item.approval} detail onChanged={onChanged} />
  }
  return (
    <article className="panel inbox-item">
      <h3>{item.title}</h3>
      <p>{item.body}</p>
      <p className="muted">From {item.source}</p>
      <div className="approval-actions">
        {item.status === 'new' && (
          <>
            <button type="button" className="primary" onClick={() => void onAct(item, 'done')}>
              Done
            </button>
            <button type="button" onClick={() => void onAct(item, 'snooze')}>
              Snooze 1 hour
            </button>
          </>
        )}
        {(item.status === 'done' || item.status === 'snoozed') && (
          <button type="button" onClick={() => void onAct(item, 'reopen')}>
            Reopen
          </button>
        )}
      </div>
    </article>
  )
}
