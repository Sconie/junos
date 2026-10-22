import { useEffect, useState, type KeyboardEvent } from 'react'
import type { ApprovalRecord } from '@junos/shared'
import { useAuth } from '../lib/auth'

const CLASS_LABEL: Record<ApprovalRecord['class'], string> = {
  read: 'Read',
  'write-local': 'Write (local)',
  'external-send': 'External send',
  destructive: 'Destructive',
  spend: 'Spend',
}

const RESOLVED_TEXT: Record<string, string> = {
  approved: 'Approved. Waiting for the requester to run it.',
  consumed: 'Approved and already used.',
  denied: 'Denied.',
  expired: 'Expired. Nobody decided in time.',
}

function remaining(expiresAt: string, now: number): string {
  const left = Math.max(0, Date.parse(expiresAt) - now)
  const s = Math.ceil(left / 1000)
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`
}

interface Props {
  approval: ApprovalRecord
  /**
   * Detail view: the action is fully visible and the card is focused, so the A / D keys work.
   * Never true for a row in a list (a stray key must not approve the wrong thing).
   */
  detail?: boolean
  onChanged?: () => void
}

/** The one approval component: actor, exact action, target, expiry, irreversibility, Approve / Deny. */
export default function ApprovalCard({ approval, detail = false, onChanged }: Props) {
  const { api } = useAuth()
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (approval.status !== 'pending') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [approval.status])

  const expired = approval.status === 'expired' || (approval.status === 'pending' && Date.parse(approval.expiresAt) <= now)
  const pending = approval.status === 'pending' && !expired
  const argsText = JSON.stringify(approval.args, null, 2)

  async function decide(verb: 'approve' | 'deny') {
    if (!pending || busy) return
    setBusy(true)
    setNotice(null)
    try {
      // Re-read first: another screen or the phone may have decided already.
      const fresh = await api(`/approvals/${approval.id}`)
      const current = fresh.ok ? ((await fresh.json()) as ApprovalRecord) : null
      if (!current || current.status !== 'pending') {
        setNotice(current ? `This request is already ${current.status}.` : 'This request no longer exists.')
        onChanged?.()
        return
      }
      const res = await api(`/approvals/${approval.id}/${verb}`, { method: 'POST' })
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string }
        setNotice(error === 'expired' ? 'This request just expired.' : 'Could not record your decision.')
      }
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!detail || event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === 'a') void decide('approve')
    else if (event.key === 'd') void decide('deny')
  }

  return (
    <article
      className="approval panel"
      data-status={expired ? 'expired' : approval.status}
      tabIndex={detail ? 0 : undefined}
      onKeyDown={onKeyDown}
      aria-label={`Approval request: ${approval.tool}`}
    >
      <header className="approval-head">
        <span className="chip" data-class={approval.class}>
          {CLASS_LABEL[approval.class]}
        </span>
        <b>{approval.tool}</b>
      </header>

      <dl className="approval-meta">
        <dt>Requested by</dt>
        <dd>{approval.actor}</dd>
        <dt>Target</dt>
        <dd>{approval.target || '—'}</dd>
        <dt>Project</dt>
        <dd>{approval.project ?? '—'}</dd>
        <dt>Expires</dt>
        <dd>{expired ? 'expired' : approval.status === 'pending' ? `in ${remaining(approval.expiresAt, now)}` : '—'}</dd>
      </dl>

      <details open={detail || argsText.length < 160}>
        <summary>Exact action</summary>
        <pre className="approval-args">{argsText}</pre>
      </details>

      {approval.irreversible && approval.status !== 'denied' && (
        <p className="approval-warn" role="note">
          Cannot be undone once it runs.
        </p>
      )}

      {pending ? (
        <footer className="approval-actions">
          <button type="button" className="primary" disabled={busy} onClick={() => void decide('approve')}>
            Approve
          </button>
          <button type="button" disabled={busy} onClick={() => void decide('deny')}>
            Deny
          </button>
          {detail && <span className="muted approval-hint">Press A to approve, D to deny</span>}
        </footer>
      ) : (
        <p className="approval-resolved" role="status">
          {expired ? RESOLVED_TEXT.expired : (RESOLVED_TEXT[approval.status] ?? approval.status)}
        </p>
      )}
      {notice && (
        <p className="approval-notice" role="alert">
          {notice}
        </p>
      )}
    </article>
  )
}
