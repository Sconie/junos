import { useCallback, useEffect, useState } from 'react'
import { SCOUT_DISMISS_REASONS, type ScoutCadence, type ScoutDismissReason, type ScoutFinding, type ScoutOverview, type ScoutSource } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : 'never')
const safeLink = (link: string) => (/^https?:\/\//i.test(link) ? link : null)

/** Scout: suggestions from the feeds you switch on, scored for JunOS. It only reads; acting on a finding is your click. */
export default function Scout() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [data, setData] = useState<ScoutOverview | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Run and finding events move lastSeq, so a finished run shows up without polling.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/scout')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as ScoutOverview
        if (cancelled) return
        setData(body)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not load Scout. Is junosd running?')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  async function call(path: string, method: string, body?: unknown): Promise<Response> {
    const res = await api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string }
      setError(err.message ?? 'That did not work.')
    } else setError(null)
    refresh()
    return res
  }

  if (!data) {
    return (
      <section>
        <h1>Scout</h1>
        {error ? <p className="approval-notice" role="alert">{error}</p> : <p className="muted">Loading…</p>}
      </section>
    )
  }

  const open = data.findings.find((f) => f.id === openId) ?? null
  const last = data.runs[0]
  const enabled = data.sources.filter((s) => s.enabled).length

  return (
    <section>
      <h1>Scout</h1>
      <p className="muted">Scout reads the feeds you switch on and suggests changes for JunOS. It only reads: it never installs, edits or opens anything. Making a card or asking Claude is your click.</p>
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

      <div className="toolbar">
        <button type="button" className="primary" disabled={data.running || enabled === 0} onClick={() => void call('/scout/run', 'POST')}>
          {data.running ? 'Running…' : 'Run now'}
        </button>
        {enabled === 0 && <span className="muted">Switch on a source first.</span>}
        {last && (
          <span className="muted" aria-label="Last run">
            Last run {when(last.startedAt)}: {last.status}
            {last.status === 'succeeded' ? `, ${last.items} new items, ${last.findings} findings` : last.error ? ` (${last.error})` : ''}
          </span>
        )}
      </div>

      <div className="scout-grid">
        <div>
          <h2>Findings</h2>
          {data.findings.length === 0 && <p className="muted">Nothing yet. Findings above the threshold of {data.settings.threshold} land here and in your Inbox.</p>}
          {data.findings.map((f) => (
            <article key={f.id} className="card scout-finding" aria-label={f.title} data-status={f.status}>
              <header className="approval-head">
                <button type="button" className="link" onClick={() => setOpenId(f.id)}>
                  {f.title}
                </button>
                <span className="chip">{f.relevance}</span>
              </header>
              <p className="muted">
                <span className="chip">{f.sourceName}</span>
                <span className="chip">effort {f.effort}</span>
                <span className="chip">risk {f.risk}</span>
                {f.status === 'carded' && <span className="chip">card made</span>}
              </p>
              <p>{f.why}</p>
            </article>
          ))}
          {open && (
            <Detail
              key={open.id}
              finding={open}
              onClose={() => setOpenId(null)}
              onCard={async () => {
                const res = await call(`/scout/findings/${open.id}/card`, 'POST')
                if (res.ok) setNotice('Card made. It is in Ideas on the Board; Scout will not touch it.')
              }}
              onAsk={async () => {
                const res = await call(`/scout/findings/${open.id}/ask`, 'POST', {})
                if (!res.ok) return
                const body = (await res.json()) as { conversationId: string | null; status: string }
                if (body.status === 'disclosure_required' || !body.conversationId) return setNotice('Open Chat and accept the notice for the provider once, then ask again. Nothing was sent.')
                window.location.assign(`/chat?c=${body.conversationId}`)
              }}
              onDismiss={async (reason) => {
                const res = await call(`/scout/findings/${open.id}/dismiss`, 'POST', { reason })
                if (res.ok) setOpenId(null)
              }}
            />
          )}
          <h2>Runs</h2>
          {data.runs.length === 0 && <p className="muted">Scout has not run yet.</p>}
          {data.runs.slice(0, 5).map((r) => (
            <details key={r.id} className="task-run" data-status={r.status}>
              <summary>
                <b>{r.status}</b> · {when(r.startedAt)} · {r.trigger} · {r.items} items · {r.findings} findings · {r.modelCalls} model calls
              </summary>
              {r.error && <p className="muted">{r.error}</p>}
              <pre className="approval-args">{r.log.join('\n') || 'No log.'}</pre>
            </details>
          ))}
        </div>

        <aside className="panel scout-rail" aria-label="Sources">
          <h3>Sources</h3>
          <ul className="scout-sources">
            {data.sources.map((s: ScoutSource) => (
              <li key={s.id}>
                <label>
                  <input type="checkbox" checked={s.enabled} onChange={(e) => void call(`/scout/sources/${s.id}`, 'PATCH', { enabled: e.target.checked })} aria-label={`Switch on ${s.name}`} /> <b>{s.name}</b>
                </label>
                <p className="muted">
                  {s.kind === 'self' ? 'JunOS counters only' : s.url}
                  <br />
                  checked {when(s.lastCheckedAt)} · {s.health === 'error' ? <span className="bad">{s.lastError}</span> : s.health}
                </p>
                <select aria-label={`Cadence for ${s.name}`} value={s.cadence} onChange={(e) => void call(`/scout/sources/${s.id}`, 'PATCH', { cadence: e.target.value as ScoutCadence })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>{' '}
                <button type="button" onClick={() => void call(`/scout/sources/${s.id}`, 'DELETE')} aria-label={`Remove ${s.name}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <AddSource onAdd={(input) => call('/scout/sources', 'POST', input).then((r) => r.ok)} />
          <Settings key={`${data.settings.threshold}-${data.settings.dailyModelCalls}`} settings={data.settings} onSave={(s) => call('/scout/settings', 'PUT', s).then((r) => r.ok)} />
          <button type="button" onClick={() => void call('/scout/digest', 'POST').then(async (r) => r.ok && setNotice(((await r.json()) as { posted: boolean }).posted ? 'The digest is in your Inbox.' : 'Nothing under the threshold to report this week.'))}>
            Post the weekly digest now
          </button>
        </aside>
      </div>
    </section>
  )
}

function Detail({ finding, onClose, onCard, onAsk, onDismiss }: { finding: ScoutFinding; onClose: () => void; onCard: () => void; onAsk: () => void; onDismiss: (reason: ScoutDismissReason) => void }) {
  const [reason, setReason] = useState<ScoutDismissReason>('not relevant')
  const link = safeLink(finding.link)
  return (
    <aside className="panel scout-detail" aria-label={`Finding: ${finding.title}`}>
      <header className="approval-head">
        <h3>{finding.title}</h3>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <p className="muted">
        {finding.sourceName} · relevance {finding.relevance} · effort {finding.effort} · risk {finding.risk}
      </p>
      <h4>Why it matters</h4>
      <p>{finding.why}</p>
      {finding.touches && (
        <>
          <h4>It would touch</h4>
          <p>{finding.touches}</p>
        </>
      )}
      {finding.suggestion && (
        <>
          <h4>Suggested change</h4>
          <p>{finding.suggestion}</p>
        </>
      )}
      {finding.summary && (
        <>
          <h4>From the source</h4>
          <p className="muted">{finding.summary}</p>
        </>
      )}
      {link && (
        <p>
          <a href={link} target="_blank" rel="noopener noreferrer">
            Open the source
          </a>
        </p>
      )}
      <div className="approval-actions">
        <button type="button" className="primary" disabled={finding.status === 'carded'} onClick={onCard}>
          {finding.status === 'carded' ? 'Card made' : 'Make card'}
        </button>
        <button type="button" onClick={onAsk}>
          Ask Claude
        </button>
      </div>
      <div className="task-row">
        <label htmlFor="dismiss-reason">Dismiss because</label>
        <select id="dismiss-reason" value={reason} onChange={(e) => setReason(e.target.value as ScoutDismissReason)}>
          {SCOUT_DISMISS_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onDismiss(reason)}>
          Dismiss
        </button>
      </div>
    </aside>
  )
}

function AddSource({ onAdd }: { onAdd: (input: { name: string; url: string; cadence: ScoutCadence }) => Promise<boolean> }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [cadence, setCadence] = useState<ScoutCadence>('daily')
  return (
    <form
      className="task-form"
      aria-label="Add a source"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || !url.trim()) return
        void onAdd({ name: name.trim(), url: url.trim(), cadence }).then((ok) => {
          if (ok) {
            setName('')
            setUrl('')
          }
        })
      }}
    >
      <label htmlFor="source-name">Name</label>
      <input id="source-name" value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="source-url">Feed address (http or https)</label>
      <input id="source-url" value={url} onChange={(e) => setUrl(e.target.value)} />
      <label htmlFor="source-cadence">How often</label>
      <select id="source-cadence" value={cadence} onChange={(e) => setCadence(e.target.value as ScoutCadence)}>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
      <button type="submit" disabled={!name.trim() || !url.trim()}>
        Add source
      </button>
    </form>
  )
}

function Settings({ settings, onSave }: { settings: ScoutOverview['settings']; onSave: (s: { threshold: number; dailyModelCalls: number }) => Promise<boolean> }) {
  const [threshold, setThreshold] = useState(String(settings.threshold))
  const [calls, setCalls] = useState(String(settings.dailyModelCalls))
  return (
    <form
      className="task-form"
      aria-label="Scout settings"
      onSubmit={(e) => {
        e.preventDefault()
        void onSave({ threshold: Number(threshold), dailyModelCalls: Number(calls) })
      }}
    >
      <label htmlFor="scout-threshold">Show findings at or above</label>
      <input id="scout-threshold" type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
      <label htmlFor="scout-calls">Model calls per day on a schedule</label>
      <input id="scout-calls" type="number" min={0} max={50} value={calls} onChange={(e) => setCalls(e.target.value)} />
      <button type="submit">Save settings</button>
    </form>
  )
}
