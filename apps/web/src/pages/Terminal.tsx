import { useCallback, useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { API_PREFIX, type TerminalFrame, type TerminalOverview, type TerminalSession } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

/** The terminal: tabs for a shell on this PC and one on the VPS that you type in, and a separate read-only tab for what agents run. */
export default function Terminal() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [overview, setOverview] = useState<TerminalOverview | null>(null)
  const [active, setActive] = useState<string>('agent')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Tabs opening and closing are events, so the strip follows the stream.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/terminal')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as TerminalOverview
        if (cancelled) return
        setOverview(body)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not load the terminal. Is junosd running?')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  if (!overview) {
    return (
      <section>
        <h1>Terminal</h1>
        {error ? <p className="approval-notice" role="alert">{error}</p> : <p className="muted">Loading…</p>}
      </section>
    )
  }

  const open = overview.sessions.filter((s) => s.status === 'open')
  const tabs = open
  const closedActive = overview.sessions.find((s) => s.id === active && s.status === 'closed')
  const current = open.find((s) => s.id === active) ?? open.find((s) => s.kind === 'agent')!

  async function openTab(kind: 'local' | 'vps') {
    const res = await api('/terminal/sessions', { method: 'POST', body: JSON.stringify({ kind }) })
    const body = (await res.json().catch(() => ({}))) as TerminalSession & { message?: string }
    if (!res.ok) return setError(body.message ?? 'The tab did not open.')
    setError(null)
    setNotice(null)
    setActive(body.id)
    refresh()
  }

  async function closeTab(id: string) {
    await api(`/terminal/sessions/${id}`, { method: 'DELETE' })
    if (active === id) setActive('agent')
    refresh()
  }

  return (
    <section>
      <h1>Terminal</h1>
      <p className="muted">Your own typing in a tab is not checked: you are in charge. What agents and Hermes run goes through approvals and appears only in the Agent tab, which you cannot type in and they cannot type into your tabs.</p>
      {error && (
        <p className="approval-notice" role="alert">
          {error}
        </p>
      )}
      {(notice || closedActive) && (
        <p className="approval-notice" role="status">
          {notice ?? `That tab closed (${closedActive?.closeReason}).`}
        </p>
      )}
      {!overview.local.available && <p className="approval-notice">{overview.local.reason}</p>}

      <div className="toolbar terminal-bar">
        <div className="tabs" role="tablist" aria-label="Terminal tabs">
          {tabs.map((s) => (
            <span key={s.id} className="terminal-tab">
              <button type="button" role="tab" aria-selected={current.id === s.id} className={`tab ${current.id === s.id ? 'active' : ''}`} onClick={() => setActive(s.id)}>
                {s.kind === 'agent' ? 'Agent (read-only)' : s.label}
              </button>
              {s.kind !== 'agent' && (
                <button type="button" aria-label={`Close ${s.label}`} onClick={() => void closeTab(s.id)}>
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <button type="button" disabled={!overview.local.available} onClick={() => void openTab('local')}>
          New PC tab ({overview.local.shell})
        </button>
        <button type="button" onClick={() => void openTab('vps')}>
          New VPS tab
        </button>
      </div>
      {overview.vps.mode !== 'remote' && (
        <p className="muted" role="note">
          VPS: {overview.vps.reason}
        </p>
      )}
      {current.kind === 'agent' && (
        <p className="muted" role="note">
          Commands from agents, workflows and Hermes show up here. Anything that is not plainly read-only (pwd, ls, git status…) waits for your approval in the <a href="/inbox">Inbox</a> first.
        </p>
      )}

      <TerminalView
        key={current.id}
        session={current}
        onClosed={(reason) => {
          setNotice(`That tab closed (${reason}).`)
          setActive('agent')
          refresh()
        }}
      />
    </section>
  )
}

function TerminalView({ session, onClosed }: { session: TerminalSession; onClosed: (reason: string) => void }) {
  const { api } = useAuth()
  const host = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const readOnly = session.readOnly
    const term = new XTerm({ cursorBlink: !readOnly, disableStdin: readOnly, convertEol: readOnly, fontFamily: 'ui-monospace, Consolas, Menlo, monospace', fontSize: 13, theme: { background: '#15171a' }, scrollback: 5000 })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    const safeFit = () => {
      try {
        fit.fit()
      } catch {
        /* not laid out yet */
      }
    }
    safeFit()

    let pending = ''
    let timer: ReturnType<typeof setTimeout> | undefined
    const flush = () => {
      timer = undefined
      const data = pending
      pending = ''
      if (data) void api(`/terminal/sessions/${session.id}/input`, { method: 'POST', body: JSON.stringify({ data }) })
    }
    // Keystrokes are sent in small bursts, never one request each, and never longer than the daemon accepts.
    const input = term.onData((data) => {
      if (readOnly) return
      pending += data
      if (pending.length > 2000) flush()
      else timer ??= setTimeout(flush, 8)
    })
    let last = ''
    const sendSize = () => {
      if (readOnly) return
      const size = `${term.cols}x${term.rows}`
      if (size === last) return
      last = size
      void api(`/terminal/sessions/${session.id}/resize`, { method: 'POST', body: JSON.stringify({ cols: term.cols, rows: term.rows }) })
    }
    sendSize()
    const onResize = () => {
      safeFit()
      sendSize()
    }
    window.addEventListener('resize', onResize)

    const source = new EventSource(`${API_PREFIX}/terminal/sessions/${session.id}/stream`)
    source.onmessage = (e: MessageEvent<string>) => {
      const frame = JSON.parse(e.data) as TerminalFrame
      if (frame.type === 'data') term.write(frame.data)
      else {
        source.close()
        onClosed(frame.reason)
      }
    }
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
      source.close()
      input.dispose()
      term.dispose()
    }
    // The tab is fixed for this view's life (it is keyed by session).
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  return <div ref={host} className="terminal-host" aria-label={session.readOnly ? 'Agent terminal output' : `Terminal: ${session.label}`} />
}
