import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchResponse, WorkflowSummary } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { fuzzyScore } from '../lib/fuzzy'

interface Row {
  id: string
  group: string
  label: string
  hint?: string
  /** Matched against the query as well as the label. */
  words?: string
  run: () => void | Promise<void>
}

const SCREENS: Array<{ to: string; label: string; words?: string }> = [
  { to: '/', label: 'Home', words: 'overview start' },
  { to: '/inbox', label: 'Inbox', words: 'needs me approvals' },
  { to: '/approvals', label: 'Approvals' },
  { to: '/chat', label: 'Chat', words: 'model talk' },
  { to: '/schedules', label: 'Scheduled tasks', words: 'cron crons' },
  { to: '/board', label: 'Board', words: 'kanban cards' },
  { to: '/scout', label: 'Scout', words: 'findings releases' },
  { to: '/workflows', label: 'Workflows' },
  { to: '/terminal', label: 'Terminal', words: 'shell wsl vps' },
  { to: '/hermes', label: 'Hermes', words: 'agent' },
  { to: '/files', label: 'Files & projects', words: 'folders search' },
  { to: '/connections', label: 'Connections', words: 'subscriptions providers' },
  { to: '/backups', label: 'Backups', words: 'restore database copy' },
]

const RECENT_KEY = 'junos.palette.recent'
const readRecent = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, 5) : []
  } catch {
    return []
  }
}
const writeRecent = (id: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 5)))
  } catch {
    /* private mode: recents are a convenience */
  }
}

/**
 * ⌘K / Ctrl+K: jump to any screen, find a chat, card, task, project or file, and do a few things without leaving the page.
 * Typing only searches what JunOS holds. Nothing goes to a model unless the explicit "Ask" row is chosen.
 */
export default function CommandPalette() {
  const { api } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const input = useRef<HTMLInputElement | null>(null)

  const say = useCallback((text: string) => {
    setToast(text)
    setTimeout(() => setToast((t) => (t === text ? null : t)), 5000)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults(null)
    setActive(0)
  }, [])

  // ⌘K on a Mac, Ctrl+K elsewhere: from anywhere on the page, including inside a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Workflows are listed once when the palette opens, for "Run workflow".
  useEffect(() => {
    if (!open) return
    input.current?.focus()
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/workflows')
        if (res.ok && !cancelled) setWorkflows(((await res.json()) as { workflows: WorkflowSummary[] }).workflows.filter((w) => w.valid && !w.paused))
      } catch {
        /* the rows are simply missing */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, api])

  // What JunOS holds that matches, a moment after typing stops.
  useEffect(() => {
    if (!open || query.trim().length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await api(`/search?q=${encodeURIComponent(query.trim())}`)
          if (res.ok && !cancelled) setResults((await res.json()) as SearchResponse)
        } catch {
          /* no results shown */
        }
      })()
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, query, api])

  const go = useCallback((to: string) => () => navigate(to), [navigate])

  const rows = useMemo<Row[]>(() => {
    const q = query.trim()
    const post = async (path: string, body: unknown) => api(path, { method: 'POST', body: JSON.stringify(body) })
    const screens: Row[] = SCREENS.map((s) => ({ id: `screen:${s.to}`, group: 'Go to', label: s.label, words: s.words, run: go(s.to) }))
    const actions: Row[] = [
      { id: 'action:chat', group: 'Actions', label: 'New chat', words: 'conversation', run: go('/chat') },
      { id: 'action:card', group: 'Actions', label: 'New card', words: 'kanban add', run: go('/board') },
      { id: 'action:task', group: 'Actions', label: 'New task', words: 'schedule cron', run: go('/schedules') },
      { id: 'action:model', group: 'Actions', label: 'Switch model', words: 'effort provider', run: go('/chat') },
      { id: 'action:hermes', group: 'Actions', label: 'Ask Hermes', words: 'agent directive', run: go('/hermes') },
      ...workflows.map<Row>((w) => ({
        id: `workflow:${w.id}`,
        group: 'Actions',
        label: `Run workflow: ${w.name}`,
        hint: w.params.some((p) => p.required && p.default === undefined) ? 'needs input' : undefined,
        words: 'run start',
        run: async () => {
          if (w.params.some((p) => p.required && p.default === undefined)) return navigate('/workflows')
          const res = await post(`/workflows/${w.id}/run`, {})
          say(res.ok ? `Started ${w.name}.` : `${w.name} did not start.`)
        },
      })),
    ]
    if (!q) {
      const recent = readRecent()
      const all = [...screens, ...actions]
      const recents = recent.flatMap((id) => all.find((r) => r.id === id) ?? []).map((r) => ({ ...r, group: 'Recent' }))
      return [...recents, ...all.filter((r) => !recent.includes(r.id))]
    }
    const scored = [...screens, ...actions]
      .map((r) => ({ r, s: Math.max(fuzzyScore(q, r.label), fuzzyScore(q, `${r.label} ${r.words ?? ''}`) - 5) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.r)
    const found: Row[] = (results?.q === q ? results.groups : []).flatMap((g) => g.hits.map<Row>((h) => ({ id: `hit:${g.type}:${h.id}`, group: g.label, label: h.title, hint: h.subtitle, run: go(h.to) })))
    // Things you can do with the words you typed. Only these use them.
    const withText: Row[] = [
      {
        id: 'text:card',
        group: 'With what you typed',
        label: `New card: “${q}”`,
        run: async () => {
          const res = await post('/kanban/cards', { title: q.slice(0, 200) })
          say(res.ok ? `Card added to Ideas: ${q.slice(0, 60)}` : 'The card was not added.')
        },
      },
      {
        id: 'text:hermes',
        group: 'With what you typed',
        label: `Ask Hermes: “${q}”`,
        run: async () => {
          const res = await post('/hermes/directives', { text: q })
          say(res.ok ? 'Sent to Hermes.' : ((await res.json().catch(() => ({}))) as { message?: string }).message ?? 'Hermes did not take it.')
        },
      },
    ]
    const sentence = q.split(/\s+/).length >= 2 || q.endsWith('?')
    const ask: Row[] = sentence
      ? [
          {
            id: 'text:ask',
            group: 'Ask',
            label: `Ask Claude: “${q}”`,
            hint: 'sends this text to Claude',
            run: async () => {
              const made = await post('/conversations', { provider: 'claude', title: q.slice(0, 60) })
              if (!made.ok) return say('Could not start a chat.')
              const convo = (await made.json()) as { id: string }
              const sent = await post(`/conversations/${convo.id}/messages`, { content: q })
              const body = (await sent.json().catch(() => ({}))) as { status?: string; message?: string }
              if (!sent.ok) return say(body.message ?? 'The question was not sent.')
              if (body.status === 'disclosure_required') return say('Open Chat and accept the notice for the provider once, then ask again. Nothing was sent.')
              navigate(`/chat?c=${convo.id}`)
            },
          },
        ]
      : []
    return [...scored, ...found, ...withText, ...ask]
  }, [query, results, workflows, api, go, navigate, say])

  const choose = async (row: Row | undefined) => {
    if (!row) return
    if (row.id.startsWith('screen:') || row.id.startsWith('action:')) writeRecent(row.id)
    close()
    await row.run()
  }

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return close()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      void choose(rows[active])
    }
  }

  const mac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform ?? '')
  let lastGroup = ''

  return (
    <>
      <button type="button" className="palette-open" onClick={() => setOpen(true)} aria-label="Open the command palette">
        Search <span className="palette-hint">{mac ? '⌘K' : 'Ctrl K'}</span>
      </button>
      {toast && (
        <p className="palette-toast" role="status">
          {toast}
        </p>
      )}
      {open && (
        <div className="palette-backdrop" onMouseDown={close}>
          <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
            <input
              ref={input}
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={rows[active] ? `palette-row-${active}` : undefined}
              aria-label="Type a command or search"
              placeholder="Go to a screen, find something, or do something…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onInputKey}
            />
            <ul id="palette-list" role="listbox" aria-label="Results">
              {rows.length === 0 && <li className="muted palette-empty">Nothing matches.</li>}
              {rows.map((row, i) => {
                const heading = row.group !== lastGroup
                lastGroup = row.group
                return (
                  <li key={row.id} role="presentation">
                    {heading && <div className="palette-group">{row.group}</div>}
                    <div id={`palette-row-${i}`} role="option" aria-selected={i === active} className={`palette-row ${i === active ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => void choose(row)}>
                      <span>{row.label}</span>
                      {row.hint && <span className="muted"> {row.hint}</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
