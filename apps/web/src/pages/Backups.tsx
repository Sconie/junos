import { useCallback, useEffect, useState } from 'react'
import type { BackupRecord, BackupsResponse } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')
const size = (n: number | null) => (n === null ? '—' : n < 1_048_576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1_048_576).toFixed(1)} MB`)

/** Backups: a copy of the database every night, each opened again and checked before it counts. */
export default function Backups() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [data, setData] = useState<BackupsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Backup events move lastSeq, so the list follows the stream.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/backups')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as BackupsResponse
        if (cancelled) return
        setData(body)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not load the backups. Is junosd running?')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  async function backUpNow() {
    setBusy(true)
    try {
      const res = await api('/backups/run', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as BackupRecord & { message?: string }
      if (!res.ok) setError(body.message ?? 'The backup did not run.')
      else setError(body.status === 'failed' ? `The backup failed: ${body.error ?? 'unknown reason'}` : null)
    } finally {
      setBusy(false)
      refresh()
    }
  }

  if (!data) {
    return (
      <section>
        <h1>Backups</h1>
        {error ? <p className="approval-notice" role="alert">{error}</p> : <p className="muted">Loading…</p>}
      </section>
    )
  }

  const lastGood = data.backups.find((b) => b.status === 'ok')
  const newest = data.backups[0]

  return (
    <section>
      <h1>Backups</h1>
      <p className="muted">
        JunOS keeps everything in one database. A copy is taken every night after {String(data.hour).padStart(2, '0')}:00, opened again on its own and checked before it counts. The newest {data.keep} good ones are kept in <code>{data.dir}</code>.
      </p>
      {error && (
        <p className="approval-notice" role="alert">
          {error}
        </p>
      )}
      {newest?.status === 'failed' && (
        <p className="approval-notice" role="alert">
          The last attempt failed ({newest.error}). {lastGood ? `The last good backup is from ${when(lastGood.startedAt)}.` : 'There is no good backup yet.'}
        </p>
      )}

      <div className="toolbar">
        <button type="button" className="primary" disabled={busy || data.running} onClick={() => void backUpNow()}>
          {busy || data.running ? 'Backing up…' : 'Back up now'}
        </button>
        <span className="muted" aria-label="Status">
          {lastGood ? `Last good backup ${when(lastGood.startedAt)}.` : 'No good backup yet.'} Next: {data.overdue ? 'due now' : when(data.nextDue)}.
        </span>
      </div>

      <table className="table stack">
        <thead>
          <tr>
            <th>When</th>
            <th>Result</th>
            <th>File</th>
            <th>Size</th>
            <th>How</th>
          </tr>
        </thead>
        <tbody>
          {data.backups.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No backups yet. The first one is taken shortly after junosd starts.
              </td>
            </tr>
          )}
          {data.backups.map((b) => (
            <tr key={b.id} data-status={b.status}>
              <td data-label="When">{when(b.startedAt)}</td>
              <td data-label="Result">
                {b.status === 'ok' ? (b.present ? 'Verified' : 'Verified, since deleted') : b.status === 'failed' ? <span className="bad">Failed: {b.error}</span> : 'Running'}
              </td>
              <td data-label="File">{b.present ? <code>{b.file}</code> : '—'}</td>
              <td data-label="Size">{size(b.size)}</td>
              <td data-label="How">{b.trigger === 'manual' ? 'By hand' : 'Nightly'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <details className="panel">
        <summary>How to restore</summary>
        <ol>
          <li>Stop junosd.</li>
          <li>
            Check the backup you want: <code>npm run backup:verify -- &lt;file&gt;</code>
          </li>
          <li>
            Keep the current database aside, then copy the backup over <code>junos.db</code> in the junosd data folder and delete <code>junos.db-wal</code> and <code>junos.db-shm</code> beside it.
          </li>
          <li>Start junosd. Browsers stay paired, because sessions are in the database.</li>
        </ol>
      </details>
    </section>
  )
}
