import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { ActionResponse, ApprovalRecord, GatewayInfo } from '@junos/shared'
import ApprovalCard from '../components/ApprovalCard'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

interface DevRequest {
  approvalId: string
  body: Record<string, unknown>
}

const DEV_TOOLS = ['test.send', 'test.delete', 'test.spend'] as const

/** All pending decisions in one place, with the full card for the selected one. */
export default function Approvals() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [items, setItems] = useState<ApprovalRecord[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [info, setInfo] = useState<GatewayInfo | null>(null)
  const [error, setError] = useState(false)

  const [reload, setReload] = useState(0)
  const load = useCallback(() => setReload((n) => n + 1), [])

  // Every approval.* event moves lastSeq, so the list follows the stream instead of polling.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/approvals')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as { approvals: ApprovalRecord[] }
        if (cancelled) return
        setItems(body.approvals)
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
    void api('/gateway/info')
      .then((r) => (r.ok ? (r.json() as Promise<GatewayInfo>) : null))
      .then(setInfo)
      .catch(() => undefined)
  }, [api])

  const pending = items.filter((i) => i.status === 'pending')
  const recent = items.filter((i) => i.status !== 'pending').slice(0, 10)
  const current = items.find((i) => i.id === selected) ?? pending[0]

  return (
    <>
      <h1>Approvals</h1>
      <p className="muted">Anything that sends, deletes or spends waits here until you decide. Each approval works once.</p>

      {error && (
        <p className="approval-notice" role="alert">
          Could not load approvals. <button onClick={() => load()}>Retry</button>
        </p>
      )}

      <div className="approvals-layout">
        <section aria-label="Pending approvals">
          <h3>Waiting for you ({pending.length})</h3>
          {pending.length === 0 && <p className="muted">Nothing is waiting. New requests appear here as they arrive.</p>}
          <ul className="approval-list">
            {pending.map((a) => (
              <li key={a.id}>
                <button
                  className="approval-row"
                  aria-pressed={current?.id === a.id}
                  onClick={() => setSelected(a.id)}
                >
                  <span className="chip" data-class={a.class}>
                    {a.class}
                  </span>
                  <b>{a.tool}</b>
                  <span className="muted">{a.target}</span>
                </button>
              </li>
            ))}
          </ul>
          {recent.length > 0 && (
            <>
              <h3>Recently resolved</h3>
              <ul className="approval-list">
                {recent.map((a) => (
                  <li key={a.id}>
                    <button className="approval-row" aria-pressed={current?.id === a.id} onClick={() => setSelected(a.id)}>
                      <span className="muted">{a.status}</span>
                      <b>{a.tool}</b>
                      <span className="muted">{a.target}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-label="Selected approval">
          {current ? <ApprovalCard key={current.id} approval={current} detail onChanged={() => load()} /> : null}
        </section>
      </div>

      {info?.testTools && <DevPanel items={items} onChange={() => load()} />}
    </>
  )
}

/** Only shown when junosd runs with the fake test.* tools: lets you try the whole flow by hand. */
function DevPanel({ items, onChange }: { items: ApprovalRecord[]; onChange: () => void }) {
  const { api } = useAuth()
  const [tool, setTool] = useState<(typeof DEV_TOOLS)[number]>('test.send')
  const [target, setTarget] = useState('someone@example.com')
  const [requests, setRequests] = useState<DevRequest[]>([])
  const [message, setMessage] = useState('')

  async function submit(body: Record<string, unknown>): Promise<ActionResponse | null> {
    const res = await api('/actions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.headers.get('content-type')?.includes('json') ? ((await res.json()) as ActionResponse) : null
  }

  async function request(event: FormEvent) {
    event.preventDefault()
    const args = tool === 'test.send' ? { to: target, body: 'hello from the test panel' } : tool === 'test.delete' ? { path: target } : { item: target, amount: 5 }
    const body = { tool, args }
    const out = await submit(body)
    if (out?.status === 'approval_required') {
      setRequests((r) => [...r, { approvalId: out.approvalId, body }])
      setMessage('Approval requested. Nothing has run.')
    } else setMessage(out ? `Result: ${out.status}` : 'No response')
    onChange()
  }

  async function run(r: DevRequest) {
    const out = await submit({ ...r.body, approvalId: r.approvalId })
    setMessage(out ? `Run result: ${out.status}${out.status === 'rejected' ? ` (${out.reason})` : ''}` : 'No response')
    onChange()
  }

  return (
    <section className="panel dev-panel" aria-label="Test the gateway">
      <h3>Test the gateway (test tools are on)</h3>
      <form onSubmit={request} className="toolbar">
        <select value={tool} onChange={(e) => setTool(e.target.value as typeof tool)} aria-label="Test tool">
          {DEV_TOOLS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target" />
        <button type="submit" className="primary">
          Request
        </button>
      </form>
      {requests.map((r) => {
        const status = items.find((i) => i.id === r.approvalId)?.status
        return (
          <p key={r.approvalId} className="muted">
            {r.body.tool as string} · {status ?? '…'}{' '}
            {status === 'approved' && <button onClick={() => void run(r)}>Run it</button>}
          </p>
        )
      })}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
