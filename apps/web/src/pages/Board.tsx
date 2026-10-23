import { useCallback, useEffect, useRef, useState } from 'react'
import type { KanbanAssignee, KanbanBoard, KanbanCard, KanbanColumn, KanbanPriority } from '@junos/shared'
import { KANBAN_PRIORITIES } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

type Who = 'all' | 'mine' | 'hermes'

const fmtDate = (iso: string) => new Date(iso).toLocaleString()

/** The board: one board, a project filter, drag and drop, and a drawer for the card in hand. */
export default function Board() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [board, setBoard] = useState<KanbanBoard | null>(null)
  const [who, setWho] = useState<Who>('all')
  const [project, setProject] = useState(() => new URLSearchParams(window.location.search).get('project') ?? '')
  const [label, setLabel] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [pasting, setPasting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const dragging = useRef<string | null>(null)
  const quickAdd = useRef<HTMLInputElement | null>(null)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Card events move lastSeq, so cards Hermes adds or moves appear without polling.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/kanban')
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as KanbanBoard
        if (cancelled) return
        setBoard(body)
        setError(null)
      } catch {
        if (!cancelled) setError('Could not load the board. Is junosd running?')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq, reload])

  // `c` adds a card from anywhere on the board, like the spec's quick add.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (e.key !== 'c' || e.ctrlKey || e.metaKey || e.altKey) return
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      e.preventDefault()
      quickAdd.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function call(path: string, method: string, body?: unknown): Promise<boolean> {
    const res = await api(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string }
      setError(err.message ?? 'That did not work.')
      return false
    }
    setError(null)
    refresh()
    return true
  }

  if (!board) {
    return (
      <section>
        <h1>Board</h1>
        {error ? <p className="approval-notice" role="alert">{error}</p> : <p className="muted">Loading…</p>}
      </section>
    )
  }

  const visible = (c: KanbanCard) => {
    if (who === 'mine' && c.assignee !== 'jonas') return false
    if (who === 'hermes' && c.assignee !== 'hermes' && c.creator !== 'hermes') return false
    if (project && c.project !== project) return false
    if (label && !c.labels.includes(label.trim())) return false
    return true
  }
  const open = board.cards.find((c) => c.id === openId) ?? null

  function drop(column: string, beforeId: string | null) {
    const id = dragging.current
    dragging.current = null
    if (id && id !== beforeId) void call(`/kanban/cards/${id}`, 'PATCH', { column, beforeId })
  }

  return (
    <section>
      <h1>Board</h1>
      <p className="muted" role="status">
        {board.hermesWorkingOn ? `Hermes is working on: ${board.hermesWorkingOn.title}` : 'Hermes is not working on a card.'}
      </p>
      {error && (
        <p className="approval-notice" role="alert">
          {error}
        </p>
      )}

      <div className="toolbar kanban-filters">
        <div className="tabs" role="tablist" aria-label="Whose cards">
          {(['all', 'mine', 'hermes'] as Who[]).map((w) => (
            <button key={w} type="button" role="tab" aria-selected={who === w} className={`tab ${who === w ? 'active' : ''}`} onClick={() => setWho(w)}>
              {w === 'all' ? 'All' : w === 'mine' ? 'Mine' : 'Hermes'}
            </button>
          ))}
        </div>
        <label>
          Project{' '}
          <select value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project">
            <option value="">All projects</option>
            {board.projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <input aria-label="Label" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button type="button" onClick={() => setPasting(true)}>
          Paste cards
        </button>
        <span className="muted">Press c to add a card.</span>
      </div>

      {pasting && (
        <PasteCards
          onDone={(ok) => {
            setPasting(false)
            if (ok) refresh()
          }}
        />
      )}

      <div className="kanban-board">
        {board.columns.map((col, i) => (
          <Column
            key={col.key}
            column={col}
            cards={board.cards.filter((c) => c.column === col.key && visible(c))}
            total={board.cards.filter((c) => c.column === col.key).length}
            quickAddRef={i === 0 ? (el) => void (quickAdd.current = el) : undefined}
            onOpen={setOpenId}
            onDragStart={(id) => (dragging.current = id)}
            onDrop={drop}
            onAdd={(title) => call('/kanban/cards', 'POST', { title, column: col.key })}
          />
        ))}
      </div>

      {open && (
        <Drawer
          key={open.id}
          card={open}
          columns={board.columns}
          onClose={() => setOpenId(null)}
          onSave={(patch) => call(`/kanban/cards/${open.id}`, 'PATCH', patch)}
          onComment={(text) => call(`/kanban/cards/${open.id}/comments`, 'POST', { text })}
          onDelete={async () => {
            if (await call(`/kanban/cards/${open.id}`, 'DELETE')) setOpenId(null)
          }}
        />
      )}
    </section>
  )
}

function Column({ column, cards, total, quickAddRef, onOpen, onDragStart, onDrop, onAdd }: {
  column: KanbanColumn
  cards: KanbanCard[]
  total: number
  quickAddRef?: (el: HTMLInputElement | null) => void
  onOpen: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (column: string, beforeId: string | null) => void
  onAdd: (title: string) => Promise<boolean>
}) {
  const [title, setTitle] = useState('')
  const overWip = column.wip !== null && total > column.wip
  return (
    <div className="kanban-column panel" role="region" aria-label={column.name} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(column.key, null)}>
      <h3>
        {column.name} <span className={`muted ${overWip ? 'over' : ''}`}>{total}{column.wip !== null ? ` / ${column.wip}` : ''}</span>
      </h3>
      {cards.map((c) => (
        <article
          key={c.id}
          className="kanban-card"
          data-priority={c.priority}
          draggable
          aria-label={c.title}
          onDragStart={() => onDragStart(c.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.stopPropagation()
            onDrop(column.key, c.id)
          }}
        >
          <button type="button" className="kanban-open" onClick={() => onOpen(c.id)}>
            {c.creator === 'hermes' && <span title="Made by Hermes" aria-label="Made by Hermes">🤖 </span>}
            {c.title}
          </button>
          <p className="muted">
            <span className="chip">{c.priority}</span>
            {c.assignee !== 'none' && <span className="chip">{c.assignee}</span>}
            {c.claimedBy && <span className="chip">working</span>}
            {c.labels.map((l) => (
              <span key={l} className="chip">
                {l}
              </span>
            ))}
            {c.due && <span className="chip">due {c.due}</span>}
            {c.checklist.length > 0 && (
              <span className="chip">
                {c.checklist.filter((i) => i.done).length}/{c.checklist.length}
              </span>
            )}
          </p>
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          void onAdd(title.trim()).then((ok) => ok && setTitle(''))
        }}
      >
        <input ref={quickAddRef} aria-label={`Add a card to ${column.name}`} placeholder="Add a card" value={title} onChange={(e) => setTitle(e.target.value)} />
      </form>
    </div>
  )
}

function Drawer(props: {
  card: KanbanCard
  columns: KanbanColumn[]
  onClose: () => void
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
  onComment: (text: string) => Promise<boolean>
  onDelete: () => void
}) {
  const { card } = props
  const [title, setTitle] = useState(card.title)
  const [body, setBody] = useState(card.body)
  const [assignee, setAssignee] = useState<KanbanAssignee>(card.assignee)
  const [priority, setPriority] = useState<KanbanPriority>(card.priority)
  const [project, setProject] = useState(card.project)
  const [labels, setLabels] = useState(card.labels.join(', '))
  const [due, setDue] = useState(card.due ?? '')
  const [column, setColumn] = useState(card.column)
  const [comment, setComment] = useState('')
  const [checklist, setChecklist] = useState(card.checklist)

  function save(e: React.FormEvent) {
    e.preventDefault()
    void props.onSave({
      title,
      body,
      assignee,
      priority,
      project,
      labels: labels
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
      due: due || null,
      checklist,
      ...(column !== card.column ? { column } : {}),
    })
  }

  return (
    <aside className="panel kanban-drawer" aria-label={`Card: ${card.title}`}>
      <header className="approval-head">
        <h3>{card.creator === 'hermes' ? '🤖 ' : ''}Card</h3>
        <button type="button" onClick={props.onClose}>
          Close
        </button>
      </header>
      <form className="task-form" onSubmit={save}>
        <label htmlFor="card-title">Title</label>
        <input id="card-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="card-body">Details</label>
        <textarea id="card-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="task-row">
          <div>
            <label htmlFor="card-column">Column</label>
            <select id="card-column" value={column} onChange={(e) => setColumn(e.target.value)}>
              {props.columns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="card-assignee">Assignee</label>
            <select id="card-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value as KanbanAssignee)}>
              <option value="none">Nobody</option>
              <option value="jonas">Jonas</option>
              <option value="hermes">Hermes</option>
            </select>
          </div>
          <div>
            <label htmlFor="card-priority">Priority</label>
            <select id="card-priority" value={priority} onChange={(e) => setPriority(e.target.value as KanbanPriority)}>
              {KANBAN_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="task-row">
          <div>
            <label htmlFor="card-project">Project</label>
            <input id="card-project" value={project} onChange={(e) => setProject(e.target.value)} />
          </div>
          <div>
            <label htmlFor="card-labels">Labels (comma separated)</label>
            <input id="card-labels" value={labels} onChange={(e) => setLabels(e.target.value)} />
          </div>
          <div>
            <label htmlFor="card-due">Due</label>
            <input id="card-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        {checklist.length > 0 && (
          <ul className="kanban-checklist" aria-label="Checklist">
            {checklist.map((item, i) => (
              <li key={`${i}-${item.text}`}>
                <label>
                  <input type="checkbox" checked={item.done} onChange={(e) => setChecklist(checklist.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} /> {item.text}
                </label>
              </li>
            ))}
          </ul>
        )}
        {card.assignee === 'hermes' && card.column !== 'ready' && card.column !== 'in_progress' && !card.claimedBy && <p className="muted">Hermes only picks up cards that are in Ready and assigned to it.</p>}
        <div className="approval-actions">
          <button type="submit" className="primary">
            Save card
          </button>
          <button type="button" className="danger" onClick={props.onDelete}>
            Delete
          </button>
        </div>
      </form>
      {card.summary && (
        <section>
          <h4>Hermes’s summary</h4>
          <pre className="approval-args">{card.summary}</pre>
        </section>
      )}
      <section>
        <h4>Activity</h4>
        <ul className="kanban-activity">
          {card.activity.map((a) => (
            <li key={a.id}>
              <b>{a.actor}</b> <span className="muted">{fmtDate(a.at)}</span>
              <br />
              {a.text}
            </li>
          ))}
        </ul>
        <form
          className="task-row"
          onSubmit={(e) => {
            e.preventDefault()
            if (!comment.trim()) return
            void props.onComment(comment.trim()).then((ok) => ok && setComment(''))
          }}
        >
          <input aria-label="Comment" placeholder="Add a comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" disabled={!comment.trim()}>
            Comment
          </button>
        </form>
      </section>
    </aside>
  )
}

function PasteCards({ onDone }: { onDone: (ok: boolean) => void }) {
  const { api } = useAuth()
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const titles = text.split('\n').map((l) => l.replace(/^\s*[-*•\d.)]+\s+/, '').trim()).filter(Boolean)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const res = await api('/kanban/cards/bulk', { method: 'POST', body: JSON.stringify({ titles }) })
    if (res.ok) return onDone(true)
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    setProblem(body.message ?? 'The cards were not created.')
  }

  return (
    <form className="panel task-form" onSubmit={(e) => void create(e)} aria-label="Paste cards">
      <label htmlFor="paste-cards">One card per line</label>
      <textarea id="paste-cards" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      {problem && (
        <p className="approval-notice" role="alert">
          {problem}
        </p>
      )}
      <div className="approval-actions">
        <button type="submit" className="primary" disabled={titles.length === 0}>
          Create {titles.length || ''} {titles.length === 1 ? 'card' : 'cards'}
        </button>
        <button type="button" onClick={() => onDone(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
