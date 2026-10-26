import { useCallback, useEffect, useState } from 'react'
import type { CatchUpMode, CronPreviewResponse, Effort, OverlapMode, ProviderId, ProviderModels, ScheduledRunRecord, TaskInput, TaskRecord, TasksResponse } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

type Tab = 'all' | 'running' | 'paused' | 'failed'
type Mode = 'hourly' | 'daily' | 'weekly' | 'custom'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EFFORT_LABEL: Record<Effort, string> = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'XHigh', max: 'Max' }
const PROVIDERS: ProviderId[] = ['claude', 'codex']
const PROVIDER_LABEL: Record<string, string> = { claude: 'Claude', codex: 'Codex (ChatGPT)' }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

function buildCron(mode: Mode, time: string, weekday: number, custom: string): string {
  const [hh = '8', mm = '0'] = time.split(':')
  const h = String(Number(hh))
  const m = String(Number(mm))
  if (mode === 'hourly') return `${m} * * * *`
  if (mode === 'daily') return `${m} ${h} * * *`
  if (mode === 'weekly') return `${m} ${h} * * ${weekday}`
  return custom.trim()
}

/** Scheduled prompts: a persisted schedule, catch-up and overlap rules, and a log for every run. */
export default function Schedules() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [data, setData] = useState<TasksResponse>({ tasks: [], paused: false })
  const [tab, setTab] = useState<Tab>('all')
  const [editing, setEditing] = useState<TaskRecord | 'new' | null>(null)
  const [logsFor, setLogsFor] = useState<TaskRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Task and run events move lastSeq, so the list follows the stream instead of polling.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/tasks')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as TasksResponse
        if (cancelled) return
        setData(body)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not load the tasks. Is junosd running?')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  async function post(path: string, method = 'POST') {
    const res = await api(path, { method })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      setError(body.message ?? 'That did not work.')
    } else setError(null)
    refresh()
  }

  const visible = data.tasks.filter((t) => {
    if (tab === 'running') return t.running
    if (tab === 'paused') return !t.enabled
    if (tab === 'failed') return t.lastRun?.status === 'failed'
    return true
  })

  return (
    <section>
      <h1>Scheduled tasks</h1>
      <p className="muted">A prompt sent to one of your subscriptions on a schedule. Each run keeps a log, and the result lands in your Inbox.</p>
      {data.paused && (
        <p className="approval-notice" role="alert">
          junosd is stopped, so nothing will start until you resume. Slots that come due meanwhile are handled by each task&apos;s catch-up setting.
        </p>
      )}
      {error && (
        <p className="approval-notice" role="alert">
          {error}
        </p>
      )}

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Filter tasks">
          {(['all', 'running', 'paused', 'failed'] as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t[0]!.toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button type="button" className="primary" onClick={() => setEditing('new')}>
          New task
        </button>
      </div>

      <table className="table tasks stack">
        <thead>
          <tr>
            <th>Status</th>
            <th>Name</th>
            <th>Schedule</th>
            <th>Target</th>
            <th>Last run</th>
            <th>Next run</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No tasks here. Create one with New task.
              </td>
            </tr>
          )}
          {visible.map((t) => (
            <tr key={t.id}>
              <td data-label="Status">{statusOf(t)}</td>
              <td data-label="Name">
                <b>{t.name}</b>
              </td>
              <td data-label="Schedule">
                <code>{t.cron}</code> <span className="muted">{t.timezone}</span>
              </td>
              <td data-label="Target">
                {PROVIDER_LABEL[t.provider] ?? t.provider}
                <span className="muted"> · {t.model || 'default'} · {t.effort}</span>
              </td>
              <td data-label="Last run">{t.lastRun ? `${t.lastRun.status} · ${fmt(t.lastRun.finishedAt ?? t.lastRun.startedAt)}` : '—'}</td>
              <td data-label="Next run">{fmt(t.nextRuns[0] ?? null)}</td>
              <td className="task-actions" data-label="Actions">
                <button type="button" onClick={() => void post(`/tasks/${t.id}/run`)} disabled={data.paused}>
                  Run now
                </button>
                <button type="button" onClick={() => void post(`/tasks/${t.id}/${t.enabled ? 'pause' : 'resume'}`)}>
                  {t.enabled ? 'Pause' : 'Resume'}
                </button>
                <button type="button" onClick={() => setEditing(t)}>
                  Edit
                </button>
                <button type="button" onClick={() => setLogsFor(t)}>
                  Logs
                </button>
                <button type="button" onClick={() => void post(`/tasks/${t.id}`, 'DELETE')} aria-label={`Delete ${t.name}`}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <TaskForm
          key={editing === 'new' ? 'new' : editing.id}
          task={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
      {logsFor && <Logs task={logsFor} onClose={() => setLogsFor(null)} />}
    </section>
  )
}

function statusOf(t: TaskRecord): string {
  if (t.running) return 'Running'
  if (!t.enabled) return 'Paused'
  if (t.lastRun?.status === 'failed') return 'Failed'
  return 'Active'
}

/** Detects the preset a cron came from, so editing starts in the friendly builder when it can. */
function parsePreset(cron: string): { mode: Mode; time: string; weekday: number } | null {
  const m = /^(\d{1,2}) (\d{1,2}|\*) \* \* (\*|[0-6])$/.exec(cron.trim())
  if (!m) return null
  const [, min, hour, dow] = m
  const pad = (v: string) => v.padStart(2, '0')
  if (hour === '*' && dow === '*') return { mode: 'hourly', time: `08:${pad(min!)}`, weekday: 1 }
  if (hour !== '*' && dow === '*') return { mode: 'daily', time: `${pad(hour!)}:${pad(min!)}`, weekday: 1 }
  if (hour !== '*' && dow !== '*') return { mode: 'weekly', time: `${pad(hour!)}:${pad(min!)}`, weekday: Number(dow) }
  return null
}

function TaskForm({ task, onDone }: { task: TaskRecord | null; onDone: () => void }) {
  const { api } = useAuth()
  const preset = task ? parsePreset(task.cron) : { mode: 'daily' as Mode, time: '08:00', weekday: 1 }
  const [name, setName] = useState(task?.name ?? '')
  const [prompt, setPrompt] = useState(task?.prompt ?? '')
  const [provider, setProvider] = useState<ProviderId>(task?.provider ?? 'claude')
  const [model, setModel] = useState(task?.model ?? '')
  const [effort, setEffort] = useState<Effort>(task?.effort ?? 'medium')
  const [mode, setMode] = useState<Mode>(preset?.mode ?? 'custom')
  const [time, setTime] = useState(preset?.time ?? '08:00')
  const [weekday, setWeekday] = useState(preset?.weekday ?? 1)
  const [custom, setCustom] = useState(task?.cron ?? '0 8 * * *')
  const [timezone, setTimezone] = useState(task?.timezone ?? 'Europe/Copenhagen')
  const [catchUp, setCatchUp] = useState<CatchUpMode>(task?.catchUp ?? 'skip')
  const [overlap, setOverlap] = useState<OverlapMode>(task?.overlap ?? 'skip')
  const [maxAttempts, setMaxAttempts] = useState(task?.maxAttempts ?? 3)
  const [models, setModels] = useState<ProviderModels[]>([])
  const [preview, setPreview] = useState<CronPreviewResponse | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const cron = buildCron(mode, time, weekday, custom)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/chat/models')
        if (res.ok && !cancelled) setModels(((await res.json()) as { providers: ProviderModels[] }).providers)
      } catch {
        /* the form still works with the default model */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api])

  // The schedule is checked by the daemon, so the preview is the daemon's own answer.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api(`/tasks/preview?cron=${encodeURIComponent(cron)}&tz=${encodeURIComponent(timezone)}`)
        if (res.ok && !cancelled) setPreview((await res.json()) as CronPreviewResponse)
      } catch {
        /* no preview while junosd is unreachable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, cron, timezone])

  const info = models.find((p) => p.provider === provider)
  const efforts = info?.models.find((m) => m.id === model)?.efforts ?? ['low', 'medium', 'high', 'xhigh', 'max']

  function changeProvider(next: ProviderId) {
    setProvider(next)
    setModel('')
    const first = models.find((p) => p.provider === next)?.models[0]
    if (first && !first.efforts.includes(effort)) setEffort('medium')
  }

  async function save() {
    setSaving(true)
    setProblem(null)
    const body: TaskInput = { name, prompt, provider, model, effort, cron, timezone, catchUp, overlap, maxAttempts, enabled: task?.enabled ?? true }
    try {
      const res = await api(task ? `/tasks/${task.id}` : '/tasks', {
        method: task ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) return onDone()
      setProblem(((await res.json().catch(() => ({}))) as { message?: string }).message ?? 'Could not save the task.')
    } finally {
      setSaving(false)
    }
  }

  const valid = name.trim() !== '' && prompt.trim() !== '' && preview?.valid !== false

  return (
    <form
      className="panel task-form"
      aria-label={task ? 'Edit task' : 'New task'}
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) void save()
      }}
    >
      <h3>{task ? 'Edit task' : 'New task'}</h3>
      <label htmlFor="task-name">Name</label>
      <input id="task-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <label htmlFor="task-prompt">Prompt</label>
      <textarea id="task-prompt" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

      <div className="task-row">
        <div>
          <label htmlFor="task-provider">Provider</label>
          <select id="task-provider" value={provider} onChange={(e) => changeProvider(e.target.value as ProviderId)}>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-model">Model</label>
          <select id="task-model" value={model} onChange={(e) => setModel(e.target.value)}>
            {(info?.models ?? [{ id: '', label: 'Default', efforts: [] }]).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-effort">Effort</label>
          <select id="task-effort" value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
            {(['low', 'medium', 'high', 'xhigh', 'max'] as Effort[]).map((e) => (
              <option key={e} value={e} disabled={!efforts.includes(e)}>
                {EFFORT_LABEL[e]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="task-schedule">
        <legend>Schedule</legend>
        <div className="segmented" role="group" aria-label="Schedule type">
          {(['hourly', 'daily', 'weekly', 'custom'] as Mode[]).map((m) => (
            <button key={m} type="button" className={mode === m ? 'active' : ''} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m[0]!.toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {mode === 'weekly' && (
          <select aria-label="Weekday" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        )}
        {(mode === 'daily' || mode === 'weekly') && <input aria-label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
        {mode === 'hourly' && <input aria-label="Minute past the hour" type="number" min={0} max={59} value={Number(time.split(':')[1] ?? 0)} onChange={(e) => setTime(`08:${String(Number(e.target.value) || 0).padStart(2, '0')}`)} />}
        {mode === 'custom' && <input aria-label="Cron expression" value={custom} onChange={(e) => setCustom(e.target.value)} spellCheck={false} />}
        <label htmlFor="task-tz">Timezone</label>
        <input id="task-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        <p className="muted">
          Cron: <code>{cron}</code>
        </p>
        {preview && !preview.valid && (
          <p className="approval-notice" role="alert">
            {preview.error}
          </p>
        )}
        {preview?.valid && (
          <div aria-label="Next runs">
            <span className="muted">Next runs:</span>
            <ol className="task-next">
              {preview.nextRuns.map((r) => (
                <li key={r}>{fmt(r)}</li>
              ))}
            </ol>
          </div>
        )}
      </fieldset>

      <div className="task-row">
        <div>
          <label htmlFor="task-catchup">If junosd was down at the time</label>
          <select id="task-catchup" value={catchUp} onChange={(e) => setCatchUp(e.target.value as CatchUpMode)}>
            <option value="skip">Skip missed runs</option>
            <option value="once">Run once to catch up</option>
            <option value="all">Run every missed one (up to 5)</option>
          </select>
        </div>
        <div>
          <label htmlFor="task-overlap">If the last run is still going</label>
          <select id="task-overlap" value={overlap} onChange={(e) => setOverlap(e.target.value as OverlapMode)}>
            <option value="skip">Skip this one</option>
            <option value="queue">Wait for it</option>
          </select>
        </div>
        <div>
          <label htmlFor="task-attempts">Attempts</label>
          <input id="task-attempts" type="number" min={1} max={5} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
        </div>
      </div>

      {problem && (
        <p className="approval-notice" role="alert">
          {problem}
        </p>
      )}
      <div className="approval-actions">
        <button type="submit" className="primary" disabled={!valid || saving}>
          {task ? 'Save changes' : 'Create task'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function Logs({ task, onClose }: { task: TaskRecord; onClose: () => void }) {
  const { api } = useAuth()
  const [runs, setRuns] = useState<ScheduledRunRecord[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api(`/tasks/${task.id}/runs`)
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as { runs: ScheduledRunRecord[] }
        if (!cancelled) setRuns(body.runs)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, task.id, task.lastRun?.status, task.lastRun?.finishedAt])

  return (
    <aside className="panel task-logs" aria-label={`Logs for ${task.name}`}>
      <header className="approval-head">
        <h3>Logs: {task.name}</h3>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      {failed && <p className="approval-notice">Could not load the runs.</p>}
      {runs && runs.length === 0 && <p className="muted">No runs yet.</p>}
      {runs?.map((r) => (
        <article key={r.id} className="task-run" data-status={r.status}>
          <p>
            <b>{r.status}</b> · due {fmt(r.dueAt)}
            {r.manual ? ' · by hand' : ''}
            {r.attempt > 0 ? ` · attempt ${r.attempt + 1}` : ''}
          </p>
          {r.error && <p className="muted">{r.error}</p>}
          {r.output && <pre className="approval-args">{r.output}</pre>}
          {r.log.length > 0 && (
            <details>
              <summary>Log ({r.log.length})</summary>
              <pre className="approval-args">{r.log.join('\n')}</pre>
            </details>
          )}
        </article>
      ))}
    </aside>
  )
}
