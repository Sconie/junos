import { useCallback, useEffect, useState } from 'react'
import type { WorkflowDetail, WorkflowParam, WorkflowRunRecord, WorkflowRunsResponse, WorkflowSummary, WorkflowTrigger, WorkflowValidation, WorkflowsResponse } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

const TEMPLATE = `version: 1
name: My workflow
description: What it does, in a sentence.
effort: low
steps:
  - id: now
    type: tool
    tool: time.now
  - id: ask
    type: approval
    message: Post the time to your Inbox?
  - id: post
    type: output
    to: inbox
    from: now
    title: The time
`

function triggerLabel(t: WorkflowTrigger): string {
  if (t.type === 'manual') return 'By hand'
  if (t.type === 'cron') return `Schedule ${t.expr}${t.timezone ? ` (${t.timezone})` : ''}`
  const where = Object.entries(t.where ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
  return `When ${t.event}${where ? ` (${where})` : ''}`
}

function stateOf(w: WorkflowSummary): string {
  if (!w.valid) return 'Has problems'
  if (w.paused) return 'Paused'
  if (w.running) return 'Running'
  return 'Ready'
}

/** Workflows: launcher cards, a YAML editor with live checking, and the run history with each step's output. */
export default function Workflows() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [data, setData] = useState<WorkflowsResponse>({ workflows: [], paused: false })
  const [runs, setRuns] = useState<WorkflowRunRecord[]>([])
  const [running, setRunning] = useState<WorkflowSummary | null>(null)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Workflow, step and approval events move lastSeq, so the screen follows the stream instead of polling.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [list, history] = await Promise.all([api('/workflows'), api('/workflow-runs')])
        if (!list.ok || !history.ok) throw new Error('load')
        const body = (await list.json()) as WorkflowsResponse
        const past = (await history.json()) as WorkflowRunsResponse
        if (cancelled) return
        setData(body)
        setRuns(past.runs)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not load the workflows. Is junosd running?')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  async function act(path: string, method = 'POST') {
    const res = await api(path, { method })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      setError(body.message ?? 'That did not work.')
    } else setError(null)
    refresh()
  }

  return (
    <section>
      <h1>Workflows</h1>
      <p className="muted">Steps that prompt a model, use a tool, wait for your approval and post a result. Each run keeps what every step produced.</p>
      {data.paused && (
        <p className="approval-notice" role="alert">
          junosd is stopped, so no workflow will start until you resume.
        </p>
      )}
      {error && (
        <p className="approval-notice" role="alert">
          {error}
        </p>
      )}

      <div className="toolbar">
        <button type="button" className="primary" onClick={() => setEditing('new')}>
          New workflow
        </button>
      </div>

      <div className="grid workflows">
        {data.workflows.length === 0 && <p className="muted">No workflows yet. Create one with New workflow.</p>}
        {data.workflows.map((w) => (
          <article key={w.id} className="card workflow" data-state={stateOf(w)} aria-label={w.name}>
            <header className="approval-head">
              <h3>{w.name}</h3>
              <span className="muted">{stateOf(w)}</span>
            </header>
            {w.description && <p className="muted">{w.description}</p>}
            {w.upgradedFrom !== null && <p className="muted">Upgraded from format version {w.upgradedFrom}. A copy of the old file was kept next to it.</p>}
            {w.paused && w.pausedReason && <p className="approval-notice">{w.pausedReason}</p>}
            {!w.valid && (
              <ul className="approval-notice">
                {w.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            <p className="muted">{w.triggers.map(triggerLabel).join(' · ') || '—'}</p>
            <div className="task-actions">
              <button type="button" className="primary" disabled={!w.valid || w.paused || data.paused} onClick={() => setRunning(w)}>
                Run
              </button>
              <button type="button" onClick={() => setEditing(w.id)}>
                Edit
              </button>
              {w.valid && (
                <button type="button" onClick={() => void act(`/workflows/${w.id}/${w.paused ? 'resume' : 'pause'}`)}>
                  {w.paused ? 'Resume' : 'Pause'}
                </button>
              )}
              <button type="button" onClick={() => void act(`/workflows/${w.id}`, 'DELETE')} aria-label={`Delete ${w.name}`}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {running && (
        <RunForm
          key={running.id}
          workflow={running}
          onDone={() => {
            setRunning(null)
            refresh()
          }}
        />
      )}
      {editing && (
        <Editor
          key={editing}
          id={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      <h2>Runs</h2>
      {runs.length === 0 && <p className="muted">Nothing has run yet.</p>}
      {runs.map((r) => (
        <RunCard key={r.id} run={r} onCancel={() => void act(`/workflow-runs/${r.id}/cancel`)} />
      ))}
    </section>
  )
}

function RunForm({ workflow, onDone }: { workflow: WorkflowSummary; onDone: () => void }) {
  const { api } = useAuth()
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(workflow.params.map((p) => [p.key, p.default === undefined ? (p.type === 'boolean' ? false : '') : p.type === 'boolean' ? Boolean(p.default) : String(p.default)])),
  )
  const [dryRun, setDryRun] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  async function start(e: React.FormEvent) {
    e.preventDefault()
    setStarting(true)
    const params: Record<string, string | number | boolean> = {}
    for (const p of workflow.params) {
      const v = values[p.key]
      if (p.type === 'number') params[p.key] = Number(v)
      else if (v !== '' || p.required) params[p.key] = v as string | boolean
    }
    const res = await api(`/workflows/${workflow.id}/run`, { method: 'POST', body: JSON.stringify({ params, dryRun }) })
    setStarting(false)
    if (res.ok) return onDone()
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    setProblem(body.message ?? 'It did not start.')
  }

  return (
    <form className="panel task-form" onSubmit={(e) => void start(e)} aria-label={`Run ${workflow.name}`}>
      <h3>Run {workflow.name}</h3>
      {workflow.params.map((p: WorkflowParam) => (
        <div key={p.key}>
          <label htmlFor={`param-${p.key}`}>
            {p.label ?? p.key}
            {p.type === 'file' ? ' (a path in a folder shared with JunOS)' : ''}
          </label>
          {p.type === 'boolean' ? (
            <input id={`param-${p.key}`} type="checkbox" checked={values[p.key] === true} onChange={(e) => setValues({ ...values, [p.key]: e.target.checked })} />
          ) : (
            <input
              id={`param-${p.key}`}
              type={p.type === 'number' ? 'number' : 'text'}
              value={String(values[p.key] ?? '')}
              required={p.required}
              onChange={(e) => setValues({ ...values, [p.key]: e.target.value })}
            />
          )}
        </div>
      ))}
      <label>
        <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Dry run: show what it would do, send nothing and change nothing
      </label>
      {problem && (
        <p className="approval-notice" role="alert">
          {problem}
        </p>
      )}
      <div className="approval-actions">
        <button type="submit" className="primary" disabled={starting}>
          {dryRun ? 'Start dry run' : 'Start'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function Editor({ id, onDone }: { id: string | null; onDone: () => void }) {
  const { api } = useAuth()
  const [text, setText] = useState<string | null>(id ? null : TEMPLATE)
  const [verdict, setVerdict] = useState<WorkflowValidation | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      const res = await api(`/workflows/${id}`)
      if (!res.ok) return void (!cancelled && setProblem('Could not load the workflow.'))
      const detail = (await res.json()) as WorkflowDetail
      if (!cancelled) setText(detail.yaml)
    })()
    return () => {
      cancelled = true
    }
  }, [api, id])

  // The daemon is the one that knows the rules, so the text is checked there as it is typed.
  useEffect(() => {
    if (text === null) return
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        const res = await api('/workflows/validate', { method: 'POST', body: JSON.stringify({ yaml: text }) })
        if (!res.ok || cancelled) return
        setVerdict((await res.json()) as WorkflowValidation)
      })()
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [api, text])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await api(id ? `/workflows/${id}` : '/workflows', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ yaml: text }) })
    setSaving(false)
    if (res.ok) return onDone()
    const body = (await res.json().catch(() => ({}))) as { message?: string; errors?: string[] }
    setProblem(body.errors?.length ? body.errors.join(' ') : (body.message ?? 'It was not saved.'))
  }

  return (
    <form className="panel task-form" onSubmit={(e) => void save(e)} aria-label={id ? 'Edit workflow' : 'New workflow'}>
      <h3>{id ? 'Edit workflow' : 'New workflow'}</h3>
      <label htmlFor="workflow-yaml">Workflow (YAML)</label>
      <textarea id="workflow-yaml" className="yaml" rows={20} spellCheck={false} value={text ?? ''} disabled={text === null}
        onChange={(e) => {
          setText(e.target.value)
          setVerdict(null) // the old verdict is about the old text
        }}
      />
      {verdict?.valid && (
        <p className="muted" role="status">
          Valid{verdict.upgradedFrom !== null ? `. Written in format version ${verdict.upgradedFrom}; saving stores it as version ${verdict.definition?.version}.` : '.'}
        </p>
      )}
      {verdict && !verdict.valid && (
        <ul className="approval-notice" role="alert" aria-label="Problems">
          {verdict.errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {problem && (
        <p className="approval-notice" role="alert">
          {problem}
        </p>
      )}
      <div className="approval-actions">
        <button type="submit" className="primary" disabled={saving || text === null || verdict?.valid !== true}>
          {id ? 'Save changes' : 'Create workflow'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function RunCard({ run, onCancel }: { run: WorkflowRunRecord; onCancel: () => void }) {
  const open = run.status === 'queued' || run.status === 'running' || run.status === 'waiting_approval'
  return (
    <article className="task-run workflow-run" data-status={run.status} aria-label={`${run.name} run`}>
      <p>
        <b>{run.status.replace('_', ' ')}</b> · {run.name} · {fmt(run.startedAt)} · {run.trigger}
        {run.dryRun ? ' · dry run' : ''}
      </p>
      {run.status === 'waiting_approval' && (
        <p className="approval-notice">
          Waiting for your approval. Answer it in the <a href="/inbox">Inbox</a> or on Telegram.
        </p>
      )}
      {run.error && <p className="muted">{run.error}</p>}
      <ol className="steps">
        {run.steps.map((s) => (
          <li key={s.seq} data-status={s.status}>
            <b>{s.stepId}</b> <span className="muted">{s.type} · {s.status}</span>
            {s.error && <span className="muted"> · {s.error}</span>}
            {s.output && (
              <details>
                <summary>Output</summary>
                <pre className="approval-args">{s.output}</pre>
              </details>
            )}
          </li>
        ))}
      </ol>
      {open && (
        <button type="button" onClick={onCancel}>
          Cancel run
        </button>
      )}
    </article>
  )
}
