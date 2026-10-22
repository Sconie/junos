import { useCallback, useEffect, useState } from 'react'
import type { RunRecord, RunsResponse } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

const HOUR_MS = 60 * 60 * 1000
// One Stop writes every `stopRequestedAt` before it waits, so they land together. A later Stop must
// not replay an earlier run's side effects just because those rows are still in the list.
const SAME_STOP_MS = 1000

function stopStamp(run: RunRecord): number | null {
  const raw = run.stopRequestedAt ?? run.finishedAt
  if (!raw) return null
  const t = Date.parse(raw)
  return Number.isFinite(t) ? t : null
}

function latestStoppedWithEffects(runs: RunRecord[]): RunRecord[] {
  let latest = Number.NEGATIVE_INFINITY
  for (const run of runs) {
    if (run.status !== 'stopped') continue
    const t = stopStamp(run)
    if (t !== null && t > latest) latest = t
  }
  if (!Number.isFinite(latest)) return []
  return runs.filter((run) => {
    if (run.status !== 'stopped' || run.sideEffects.length === 0) return false
    const t = stopStamp(run)
    return t !== null && latest - t <= SAME_STOP_MS
  })
}

/**
 * Always in the top bar. Hidden when nothing runs; otherwise the one big way to halt everything.
 * States (spec 14): running, cancelling, stopped, stop not confirmed.
 */
export default function StopControl() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  // `at` is when the snapshot was taken, so "within the last hour" needs no clock read during render.
  const [snap, setSnap] = useState<{ data: RunsResponse; at: number }>({ data: { paused: false, runs: [] }, at: 0 })
  const state = snap.data
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)

  // Run and stop events move lastSeq, so this follows the stream instead of polling.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/runs')
        if (!res.ok) return
        const body = (await res.json()) as RunsResponse
        if (!cancelled) setSnap({ data: body, at: Date.now() })
      } catch {
        /* the daemon banner already says when junosd is unreachable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  const call = useCallback(
    async (path: '/stop' | '/resume') => {
      setBusy(true)
      try {
        const res = await api(path, { method: 'POST' })
        if (res.ok) setSnap({ data: (await res.json()) as RunsResponse, at: Date.now() })
      } finally {
        setBusy(false)
        setReload((n) => n + 1)
      }
    },
    [api],
  )

  const running = state.runs.filter((r) => r.status === 'running')
  const cancelling = state.runs.filter((r) => r.status === 'cancelling')
  const unconfirmed = state.runs.filter(
    (r) => r.status === 'stop_unconfirmed' && r.finishedAt && snap.at - Date.parse(r.finishedAt) < HOUR_MS,
  )
  const lastStopped = latestStoppedWithEffects(state.runs)

  if (unconfirmed.length > 0) {
    return (
      <div className="stop stop-warn" role="alert" data-state="unconfirmed">
        <b>Stop not confirmed</b>
        <span>
          {unconfirmed.length} {unconfirmed.length === 1 ? 'process' : 'processes'} may still be running. Check the machine.
        </span>
        <SideEffects runs={unconfirmed} />
        {cancelling.length > 0 ? (
          <button type="button" className="stop-btn" disabled>
            Stopping…
          </button>
        ) : running.length > 0 ? (
          <button type="button" className="stop-btn" disabled={busy} onClick={() => void call('/stop')}>
            Stop · {running.length} running
          </button>
        ) : (
          state.paused && (
            <button type="button" disabled={busy} onClick={() => void call('/resume')}>
              Resume
            </button>
          )
        )}
      </div>
    )
  }

  if (cancelling.length > 0) {
    return (
      <div className="stop" role="status" data-state="cancelling">
        <button type="button" className="stop-btn" disabled>
          Stopping…
        </button>
        <span className="muted">{cancelling.length} cancelling</span>
      </div>
    )
  }

  if (running.length > 0) {
    return (
      <div className="stop" data-state="running">
        <button type="button" className="stop-btn" disabled={busy} onClick={() => void call('/stop')}>
          Stop · {running.length} running
        </button>
      </div>
    )
  }

  if (state.paused) {
    return (
      <div className="stop stop-stopped" role="status" data-state="stopped">
        <b>Stopped</b>
        <span className="muted">Nothing new will start until you resume.</span>
        <SideEffects runs={lastStopped} />
        <button type="button" className="primary" disabled={busy} onClick={() => void call('/resume')}>
          Resume
        </button>
      </div>
    )
  }

  return null
}

/** Work that had already completed when a run was stopped: it cannot be undone, so it is listed. */
function SideEffects({ runs }: { runs: RunRecord[] }) {
  const effects = runs.flatMap((r) => r.sideEffects)
  if (effects.length === 0) return null
  return (
    <details className="stop-effects">
      <summary>{effects.length} action{effects.length === 1 ? '' : 's'} had already run</summary>
      <ul>
        {effects.map((e) => (
          <li key={e.digest}>
            {e.tool} {e.target && <span className="muted">→ {e.target}</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}
