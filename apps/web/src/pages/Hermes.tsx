import { useCallback, useEffect, useState } from 'react'
import type { HermesMemoryItem, HermesMessage, HermesOverview, HermesSkill, HermesStep } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

type Tab = 'memory' | 'skills' | 'queue' | 'logs'

const STEP_ICON: Record<HermesStep['type'], string> = { shell: '❯', browser: '◎', file: '▤', api: '⇄', message: '✎' }
const STATE_LABEL: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  working: 'Working',
  paused: 'Paused',
  error: 'Error',
  unreachable: 'Unreachable',
}

const time = (iso: string) => new Date(iso).toLocaleTimeString()

function uptime(s: number | null): string {
  if (s === null) return '—'
  if (s < 90) return `${s}s`
  const m = Math.round(s / 60)
  return m < 90 ? `${m} min` : `${(m / 60).toFixed(1)} h`
}

/** The Hermes console: a chat with the agent, its live steps, and its memory, skills, queue and logs. */
export default function Hermes() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [data, setData] = useState<HermesOverview | null>(null)
  const [tab, setTab] = useState<Tab>('memory')
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Hermes events (steps, messages, status) move lastSeq, so the console follows the stream instead of polling.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/hermes')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as HermesOverview
        if (cancelled) return
        setData(body)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not load Hermes. Is junosd running?')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  async function control(path: string) {
    const res = await api(`/hermes/${path}`, { method: 'POST' })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      setError(body.message ?? 'That did not work.')
    } else setError(null)
    refresh()
  }

  if (!data) {
    return (
      <section>
        <h1>Hermes agent</h1>
        {error ? <p className="approval-notice" role="alert">{error}</p> : <p className="muted">Loading…</p>}
      </section>
    )
  }

  const { status } = data
  const connected = data.mode !== 'none'
  const waiting = data.steps.filter((s) => s.status === 'waiting_approval')

  return (
    <section>
      <h1>Hermes agent</h1>
      {error && (
        <p className="approval-notice" role="alert">
          {error}
        </p>
      )}
      {data.mode === 'mock' && (
        <p className="approval-notice" role="status">
          This is a stand-in agent (mock). Nothing real is connected: what you see below is scripted, and nothing leaves this machine.
        </p>
      )}
      {data.mode === 'none' && (
        <p className="approval-notice" role="status">
          {data.reason}
        </p>
      )}
      {data.stopUnconfirmed && (
        <p className="approval-notice" role="alert">
          Stop not confirmed: Hermes could not confirm it stopped. Check the VPS before trusting that it is idle.
        </p>
      )}

      <header className="hermes-head panel">
        <div>
          <b>Hermes</b>{' '}
          <span className="pill" data-state={status.state} aria-label={`Status: ${STATE_LABEL[status.state]}`}>
            {STATE_LABEL[status.state] ?? status.state}
          </span>
          <p className="muted">
            {status.model || 'no model'} · up {uptime(status.uptimeS)}
            {status.currentTask ? ` · working on: ${status.currentTask}` : ''}
          </p>
          {status.reason && status.state !== 'idle' && <p className="muted">{status.reason}</p>}
        </div>
        <div className="task-actions">
          {status.state === 'paused' ? (
            <button type="button" onClick={() => void control('resume')} disabled={!connected}>
              Resume
            </button>
          ) : (
            <button type="button" onClick={() => void control('pause')} disabled={!connected || status.state === 'unreachable'}>
              Pause
            </button>
          )}
          <button type="button" className="danger" onClick={() => void control('stop')} disabled={!connected}>
            Stop
          </button>
        </div>
      </header>

      {waiting.length > 0 && (
        <p className="approval-notice" role="alert">
          {waiting.length === 1 ? 'A step is waiting for your approval' : `${waiting.length} steps are waiting for your approval`}:{' '}
          {waiting.map((s) => `${s.approval?.summary ?? s.summary}${s.approval ? ` (${s.approval.target})` : ''}`).join('; ')}. Answer in the <a href="/inbox">Inbox</a>.
        </p>
      )}

      <div className="hermes-grid">
        <Chat messages={data.messages} disabled={!connected || status.state === 'unreachable'} onSent={refresh} onError={setError} />
        <Activity steps={data.steps} />
      </div>

      <div className="tabs" role="tablist" aria-label="Hermes details">
        {(['memory', 'skills', 'queue', 'logs'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t[0]!.toUpperCase() + t.slice(1)}
            {t === 'queue' && data.queue.length > 0 ? ` (${data.queue.length})` : ''}
          </button>
        ))}
      </div>
      {tab === 'memory' && <Memory connected={connected} onError={setError} />}
      {tab === 'skills' && <Skills connected={connected} onError={setError} />}
      {tab === 'queue' && (
        <div className="panel">
          {data.queue.length === 0 && <p className="muted">Nothing is waiting. Directives queue here while Hermes is busy or paused.</p>}
          <ol>
            {data.queue.map((q) => (
              <li key={q.id}>
                {q.text} <span className="muted">· {q.priority} · queued {time(q.queuedAt)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {tab === 'logs' && (
        <pre className="panel approval-args" aria-label="Raw log">
          {data.steps.length === 0 ? 'No activity yet.' : data.steps.map((s) => `${time(s.startedAt)}  ${s.type.padEnd(7)} ${s.status.padEnd(16)} ${s.summary}${s.ms !== null ? `  (${s.ms} ms)` : ''}`).join('\n')}
        </pre>
      )}
    </section>
  )
}

function Chat({ messages, disabled, onSent, onError }: { messages: HermesMessage[]; disabled: boolean; onSent: () => void; onError: (m: string | null) => void }) {
  const { api } = useAuth()
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [echo, setEcho] = useState(false)
  const [sending, setSending] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const res = await api('/hermes/directives', { method: 'POST', body: JSON.stringify({ text, priority, echoToTelegram: echo }) })
    setSending(false)
    if (res.ok) {
      setText('')
      onError(null)
      return onSent()
    }
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    onError(body.message ?? 'It was not sent.')
  }

  return (
    <div className="panel hermes-chat" aria-label="Chat with Hermes">
      <h3>Directives</h3>
      <div className="hermes-messages">
        {messages.length === 0 && <p className="muted">Tell Hermes what to do. Replies and phone conversations appear here.</p>}
        {messages.map((m) => (
          <p key={m.id} className={`hermes-msg ${m.role}`}>
            <b>{m.role === 'user' ? 'You' : 'Hermes'}</b>
            {m.via === 'telegram' && <span className="badge">via Telegram</span>}
            <span className="muted"> · {time(m.createdAt)}</span>
            <br />
            {m.text}
          </p>
        ))}
      </div>
      <form className="task-form" onSubmit={(e) => void send(e)}>
        <label htmlFor="hermes-text">Directive</label>
        <textarea id="hermes-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} disabled={disabled} placeholder="What should Hermes do?" />
        <div className="task-row">
          <div>
            <label htmlFor="hermes-priority">Priority</label>
            <select id="hermes-priority" value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <label>
            <input type="checkbox" checked={echo} onChange={(e) => setEcho(e.target.checked)} /> Echo the reply to Telegram
          </label>
        </div>
        <div className="approval-actions">
          <button type="submit" className="primary" disabled={disabled || sending || !text.trim()}>
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

function Activity({ steps }: { steps: HermesStep[] }) {
  return (
    <div className="panel hermes-activity" aria-label="Activity">
      <h3>Activity</h3>
      {steps.length === 0 && <p className="muted">No steps yet.</p>}
      {[...steps].reverse().map((s) => (
        <article key={s.id} className="hermes-step" data-status={s.status} aria-label={s.summary}>
          <p>
            <span className="step-icon" aria-hidden="true">
              {STEP_ICON[s.type]}
            </span>{' '}
            <b>{s.summary}</b> <span className="muted">· {s.status.replace('_', ' ')}{s.ms !== null ? ` · ${s.ms} ms` : ''}</span>
          </p>
          {s.status === 'waiting_approval' && s.approval && (
            <p className="approval-notice">
              Needs your approval: {s.approval.summary} ({s.approval.target}). {s.approval.class === 'external-send' ? 'This cannot be undone.' : ''}
            </p>
          )}
          {(s.input || s.output) && (
            <details>
              <summary>Input and output</summary>
              {s.input && <pre className="approval-args">{s.input}</pre>}
              {s.output && <pre className="approval-args">{s.output}</pre>}
            </details>
          )}
        </article>
      ))}
    </div>
  )
}

function Memory({ connected, onError }: { connected: boolean; onError: (m: string | null) => void }) {
  const { api } = useAuth()
  const [items, setItems] = useState<HermesMemoryItem[] | null>(null)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await api('/hermes/memory')
      if (!res.ok) return void (!cancelled && setItems([]))
      const body = (await res.json()) as { items: HermesMemoryItem[] }
      if (!cancelled) setItems(body.items)
    })()
    return () => {
      cancelled = true
    }
  }, [api])

  const change = (next: HermesMemoryItem[]) => {
    setItems(next)
    setSaved(false)
  }

  async function save() {
    const res = await api('/hermes/memory', { method: 'PUT', body: JSON.stringify({ items }) })
    const body = (await res.json().catch(() => ({}))) as { items?: HermesMemoryItem[]; message?: string }
    if (res.ok && body.items) {
      setItems(body.items)
      setSaved(true)
      onError(null)
    } else onError(body.message ?? 'Memory was not saved.')
  }

  if (!items) return <p className="muted">Loading…</p>
  return (
    <div className="panel hermes-memory" aria-label="Memory">
      {items.length === 0 && <p className="muted">Hermes has no memories yet.</p>}
      <ul>
        {items.map((m, i) => (
          <li key={m.id}>
            <input aria-label={`Memory ${i + 1}`} value={m.text} onChange={(e) => change(items.map((x) => (x.id === m.id ? { ...x, text: e.target.value } : x)))} />
            <label>
              <input type="checkbox" checked={m.pinned} onChange={(e) => change(items.map((x) => (x.id === m.id ? { ...x, pinned: e.target.checked } : x)))} /> Pin
            </label>
            <button type="button" aria-label={`Remove memory ${i + 1}`} onClick={() => change(items.filter((x) => x.id !== m.id))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="task-row">
        <input aria-label="New memory" placeholder="Add a fact for Hermes to remember" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={() => {
            change([...items, { id: `new-${items.length}-${draft.length}`, text: draft.trim(), pinned: false }])
            setDraft('')
          }}
        >
          Add
        </button>
      </div>
      <div className="approval-actions">
        <button type="button" className="primary" disabled={!connected || saved} onClick={() => void save()}>
          Save memory
        </button>
        {!saved && <span className="muted">Unsaved changes</span>}
      </div>
    </div>
  )
}

function Skills({ connected, onError }: { connected: boolean; onError: (m: string | null) => void }) {
  const { api } = useAuth()
  const [skills, setSkills] = useState<HermesSkill[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await api('/hermes/skills')
      if (!res.ok) return void (!cancelled && setSkills([]))
      const body = (await res.json()) as { skills: HermesSkill[] }
      if (!cancelled) setSkills(body.skills)
    })()
    return () => {
      cancelled = true
    }
  }, [api])

  async function toggle(skill: HermesSkill, enabled: boolean) {
    const res = await api('/hermes/skills', { method: 'PUT', body: JSON.stringify({ skills: [{ id: skill.id, enabled }] }) })
    const body = (await res.json().catch(() => ({}))) as { skills?: HermesSkill[]; message?: string }
    if (res.ok && body.skills) {
      setSkills(body.skills)
      onError(null)
    } else onError(body.message ?? 'That skill was not changed.')
  }

  if (!skills) return <p className="muted">Loading…</p>
  return (
    <div className="panel" aria-label="Skills">
      {skills.length === 0 && <p className="muted">No skills to show.</p>}
      <ul className="hermes-skills">
        {skills.map((s) => (
          <li key={s.id}>
            <label>
              <input type="checkbox" checked={s.enabled} disabled={!connected} onChange={(e) => void toggle(s, e.target.checked)} /> <b>{s.name}</b>
            </label>
            <span className="muted"> {s.description}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
