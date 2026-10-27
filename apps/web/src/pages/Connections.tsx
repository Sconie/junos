import { useCallback, useEffect, useState } from 'react'
import type { ConnectionRecord, ConnectionState, ConnectionsResponse } from '@junos/shared'
import { useAuth } from '../lib/auth'

/** Text and an icon always carry the state; the colour is only a second signal (spec 14). */
const STATE: Record<ConnectionState, { icon: string; label: string; tone: 'ok' | 'warn' | 'bad' | 'dim' }> = {
  connected: { icon: '✓', label: 'Connected', tone: 'ok' },
  needs_login: { icon: '!', label: 'Needs sign-in', tone: 'warn' },
  rate_limited: { icon: '⏳', label: 'Rate limited', tone: 'warn' },
  degraded: { icon: '!', label: 'Not using your plan', tone: 'warn' },
  unavailable: { icon: '✕', label: 'Unavailable', tone: 'bad' },
  unknown: { icon: '?', label: 'Not checked', tone: 'dim' },
}

const NOTE: Record<NonNullable<ConnectionRecord['note']>, string> = {
  coming: 'Coming later',
  via_hermes: 'Through Hermes',
  chat_later: 'Chat comes next',
}

/** One card per subscription: whether chat can use it, why not, and the exact command to fix it. */
export default function Connections() {
  const { api } = useAuth()
  const [items, setItems] = useState<ConnectionRecord[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [reload, setReload] = useState(0)
  const checkAgain = useCallback(() => {
    setChecking(true)
    setReload((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/connections')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as ConnectionsResponse
        if (cancelled) return
        setItems(body.connections)
        setFailed(false)
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, reload])

  return (
    <section>
      <h1>Connections</h1>
      <p className="muted">
        Each provider is used through its own official sign-in on this computer. JunOS never sees your passwords or tokens, and never uses an API key.
      </p>
      <p>
        <button type="button" onClick={checkAgain} disabled={checking}>
          {checking ? 'Checking…' : 'Check again'}
        </button>
      </p>

      {failed && (
        <p className="approval-notice" role="alert">
          Could not read the connections. Is junosd running?
        </p>
      )}

      <div className="grid connections">
        {(items ?? []).map((c) => (
          <Card key={c.provider} c={c} />
        ))}
      </div>
    </section>
  )
}

function Card({ c }: { c: ConnectionRecord }) {
  const [copied, setCopied] = useState(false)
  const s = STATE[c.state]

  async function copy() {
    try {
      await navigator.clipboard.writeText(c.reconnect ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* the command is on screen to copy by hand */
    }
  }

  return (
    <article className="card connection" data-state={c.state} aria-label={c.label}>
      <header className="connection-head">
        <h3>{c.label}</h3>
        {c.note && <span className="chip">{NOTE[c.note]}</span>}
      </header>
      <p className="connection-state" data-tone={s.tone}>
        <span aria-hidden="true">{s.icon}</span> <b>{s.label}</b>
      </p>
      <p className="muted">{c.detail}</p>
      <dl className="approval-meta">
        {c.method && (
          <>
            <dt>Sign-in</dt>
            <dd>{c.method}</dd>
          </>
        )}
        {c.plan && (
          <>
            <dt>Plan</dt>
            <dd>{c.plan}</dd>
          </>
        )}
        {c.version && (
          <>
            <dt>Version</dt>
            <dd>{c.version}</dd>
          </>
        )}
        <dt>Chat</dt>
        <dd>{c.chat ? (c.state === 'connected' ? 'Available' : 'Not right now') : 'Not available yet'}</dd>
        {c.resetsAt && (
          <>
            <dt>Lifts</dt>
            <dd>{new Date(c.resetsAt).toLocaleString()}</dd>
          </>
        )}
      </dl>
      {c.reconnect && c.state !== 'connected' && c.state !== 'rate_limited' && (
        <div className="connection-fix">
          <span className="muted">To fix, run this in a terminal:</span>
          <code>{c.reconnect}</code>
          <button type="button" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </article>
  )
}
