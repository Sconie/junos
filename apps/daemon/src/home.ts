import type {
  HomeCard,
  HomeData,
  HomeResponse,
  ConnectionRecord,
  FileEntry,
  HermesOverview,
  InboxItem,
  KanbanBoard,
  RunRecord,
  ScoutFinding,
  ScoutOverview,
  SearchGroup,
  SearchHit,
  SearchResponse,
  TaskRecord,
  WorkflowRunRecord,
  WorkflowSummary,
} from '@junos/shared'
import { KANBAN_COLUMNS } from '@junos/shared'
import type { EventStore } from './store.ts'

/** What Home reads. Each is a plain function, so the page can be built from anything and tested with failing ones. */
export interface HomeSources {
  inbox(): { items: InboxItem[]; total: number }
  tasks(): { tasks: TaskRecord[]; paused: boolean }
  runs(): RunRecord[]
  workflowRuns(): WorkflowRunRecord[]
  hermes(): Promise<HermesOverview>
  board(): KanbanBoard
  connections(): Promise<ConnectionRecord[]>
  scout(): Pick<ScoutOverview, 'running'> & { findings: ScoutFinding[] }
  recentFiles(): FileEntry[]
  projects(): Array<{ id: string; name: string; fileCount: number }>
  now?: () => number
  /** How long a card may take before it is reported as too slow (default 3 s). */
  cardTimeoutMs?: number
  /** How long the sign-in card is waited for (default 0.7 s). It keeps loading in the background and is served from its copy next time. */
  slowCardTimeoutMs?: number
}

const SUBSCRIPTIONS_TTL_MS = 30_000

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/**
 * Home (spec 10): a glance, built from small independent cards. One card failing, or being slow, never breaks the
 * page: it reports `error` (or `stale`, with its last good data) while the rest are served as usual.
 */
export class HomeService {
  readonly #s: HomeSources
  readonly #now: () => number
  readonly #last = new Map<string, { data: unknown; asOf: string; at: number }>()

  constructor(sources: HomeSources) {
    this.#s = sources
    this.#now = sources.now ?? Date.now
  }

  async #card<K extends keyof HomeData>(key: K, build: () => HomeData[K] | Promise<HomeData[K]>, ttlMs = 0, waitMs = this.#s.cardTimeoutMs ?? 3000): Promise<HomeCard<HomeData[K]>> {
    const at = this.#now()
    const asOf = new Date(at).toISOString()
    const cached = this.#last.get(key)
    // A slow source (the sign-in checks) is served from a short-lived copy rather than re-run on every refresh.
    if (ttlMs > 0 && cached && at - cached.at < ttlMs) return { status: 'ok', asOf: cached.asOf, data: cached.data as HomeData[K], error: null }
    try {
      let timer: ReturnType<typeof setTimeout> | undefined
      const work = Promise.resolve().then(build)
      // Even when this request stops waiting, a late answer is kept, so the next one has it.
      work.then(
        (late) => void this.#last.set(key, { data: late, asOf: new Date(this.#now()).toISOString(), at: this.#now() }),
        () => {},
      )
      const data = await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), waitMs)
        }),
      ]).finally(() => clearTimeout(timer))
      this.#last.set(key, { data, asOf, at })
      return { status: 'ok', asOf, data, error: null }
    } catch (err) {
      const error = err instanceof Error && err.message === 'timeout' ? 'This took too long to load.' : 'This could not be loaded.'
      if (cached) return { status: 'stale', asOf: cached.asOf, data: cached.data as HomeData[K], error }
      return { status: 'error', asOf, data: null, error }
    }
  }

  /** Loads the slow card once at start, so the first time Home is opened it is already there. */
  warm(): void {
    void this.get().catch(() => {})
  }

  async get(): Promise<HomeResponse> {
    const s = this.#s
    const [needs, running, upcoming, hermes, board, subscriptions, scout, recent] = await Promise.all([
      this.#card('needs', () => {
        const { items, total } = s.inbox()
        // Approvals first, then the rest in the Inbox's own order (urgent, then newest).
        const ordered = [...items.filter((i) => i.kind === 'approval'), ...items.filter((i) => i.kind !== 'approval')].slice(0, 5)
        return {
          total,
          items: ordered.map((i) => ({
            id: i.id,
            kind: i.kind,
            priority: i.priority,
            title: cut(i.title, 120),
            body: cut(i.body, 160),
            createdAt: i.createdAt,
            approval: i.kind === 'approval' && i.approval && i.approval.status === 'pending' ? { id: i.approval.id, irreversible: i.approval.irreversible } : null,
          })),
        }
      }),
      this.#card('running', () => {
        const items: HomeData['running']['items'] = []
        for (const r of s.runs()) if (r.status === 'running' || r.status === 'cancelling') items.push({ kind: 'run', label: `${r.source}${r.provider ? ` on ${r.provider}` : ''}`, since: r.startedAt })
        for (const w of s.workflowRuns()) if (w.status === 'running' || w.status === 'queued' || w.status === 'waiting_approval') items.push({ kind: 'workflow', label: `${w.name}${w.status === 'waiting_approval' ? ' (waiting for approval)' : ''}`, since: w.startedAt })
        for (const t of s.tasks().tasks) if (t.running) items.push({ kind: 'task', label: t.name, since: t.lastRun?.startedAt ?? null })
        if (s.scout().running) items.push({ kind: 'scout', label: 'Scout is looking at its feeds', since: null })
        return { items: items.slice(0, 10) }
      }),
      this.#card('upcoming', () => {
        const { tasks, paused } = s.tasks()
        return {
          paused,
          tasks: tasks
            .filter((t) => t.enabled)
            .map((t) => ({ id: t.id, name: t.name, cron: t.cron, timezone: t.timezone, next: t.nextRuns[0] ?? null, running: t.running }))
            .sort((a, b) => (a.next ?? '9').localeCompare(b.next ?? '9'))
            .slice(0, 5),
        }
      }),
      this.#card('hermes', async () => {
        const h = await s.hermes()
        return { mode: h.mode, state: h.status.state, currentTask: h.status.currentTask, model: h.status.model, steps: h.steps.slice(-3).reverse().map((st) => ({ summary: cut(st.summary, 100), status: st.status })), stopUnconfirmed: h.stopUnconfirmed }
      }),
      this.#card('board', () => {
        const b = s.board()
        return {
          counts: KANBAN_COLUMNS.map((c) => ({ key: c.key, name: c.name, count: b.cards.filter((x) => x.column === c.key).length })),
          hermesWorkingOn: b.hermesWorkingOn,
          blocked: b.cards.filter((x) => x.column === 'blocked').slice(0, 3).map((x) => ({ id: x.id, title: cut(x.title, 100) })),
        }
      }),
      this.#card(
        'subscriptions',
        async () => (await s.connections()).map((c) => ({ provider: c.provider, label: c.label, state: c.state, detail: cut(c.detail, 120), resetsAt: c.resetsAt, note: c.note })),
        SUBSCRIPTIONS_TTL_MS,
        this.#s.slowCardTimeoutMs ?? 700,
      ),
      this.#card('scout', () => s.scout().findings.slice(0, 3).map((f) => ({ id: f.id, title: cut(f.title, 120), relevance: f.relevance, effort: f.effort, sourceName: f.sourceName }))),
      this.#card('recent', () => ({
        projects: s.projects().slice(0, 5),
        files: s.recentFiles().map((f) => ({ folderId: f.folderId, path: f.path, name: f.name, kind: f.kind, modifiedAt: f.modifiedAt })),
      })),
    ])
    // Hermes is its own card; when it is working it also counts as running work, without making the running card wait for it.
    if (running.data && hermes.status === 'ok' && hermes.data && hermes.data.mode !== 'none' && hermes.data.state === 'working') {
      running.data.items.push({ kind: 'hermes', label: hermes.data.currentTask ? `Hermes: ${cut(hermes.data.currentTask, 80)}` : 'Hermes is working', since: null })
    }
    return { now: new Date(this.#now()).toISOString(), cards: { needs, running, upcoming, hermes, board, subscriptions, scout, recent } }
  }
}

// ---- search ----

export interface SearchSources {
  store: EventStore
  workflows(): WorkflowSummary[]
  files(q: string): Array<{ folderId: string; path: string; name: string; kind: string; snippet: string }>
}

const like = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/**
 * Search across what JunOS holds: chats, cards, findings, Inbox items, tasks, workflows, projects and indexed files. It reads
 * only local data and sends nothing anywhere. A plain LIKE is enough at this size; the indexed files use their own full-text index.
 */
export function searchEverything(sources: SearchSources, raw: string): SearchResponse {
  const q = raw.trim().slice(0, 100)
  if (q.length < 2) return { q, groups: [] }
  const db = sources.store.db
  const p = like(q)
  const groups: SearchGroup[] = []
  const add = (type: SearchGroup['type'], label: string, hits: SearchHit[]) => {
    if (hits.length > 0) groups.push({ type, label, hits })
  }
  const rows = <T>(sql: string, ...args: Array<string | number>) => db.prepare(sql).all(...args) as unknown as T[]

  add(
    'conversations',
    'Chats',
    rows<{ id: string; title: string; provider: string }>(`SELECT id, title, provider FROM conversation WHERE title LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 5`, p).map((r) => ({ id: r.id, title: r.title, subtitle: r.provider, to: `/chat?c=${r.id}` })),
  )
  add(
    'messages',
    'In chats',
    rows<{ conversation_id: string; content_md: string; title: string }>(
      `SELECT m.conversation_id, m.content_md, c.title FROM message m JOIN conversation c ON c.id = m.conversation_id WHERE m.content_md LIKE ? ESCAPE '\\' ORDER BY m.created_at DESC LIMIT 5`,
      p,
    ).map((r) => ({ id: r.conversation_id, title: r.title, subtitle: cut(r.content_md.replace(/\s+/g, ' '), 100), to: `/chat?c=${r.conversation_id}` })),
  )
  add(
    'cards',
    'Cards',
    rows<{ id: string; title: string; column_key: string }>(`SELECT id, title, column_key FROM kanban_card WHERE title LIKE ? ESCAPE '\\' OR body_md LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 5`, p, p).map((r) => ({ id: r.id, title: r.title, subtitle: r.column_key.replace('_', ' '), to: `/board?card=${r.id}` })),
  )
  add(
    'findings',
    'Scout findings',
    rows<{ id: string; title: string; source_name: string }>(`SELECT id, title, source_name FROM scout_finding WHERE status != 'dismissed' AND (title LIKE ? ESCAPE '\\' OR why LIKE ? ESCAPE '\\') ORDER BY relevance DESC LIMIT 5`, p, p).map((r) => ({ id: r.id, title: r.title, subtitle: r.source_name, to: '/scout' })),
  )
  add(
    'inbox',
    'Inbox',
    rows<{ id: string; title: string; kind: string }>(`SELECT id, title, kind FROM inbox_item WHERE title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 5`, p, p).map((r) => ({ id: r.id, title: r.title, subtitle: r.kind, to: '/inbox' })),
  )
  add(
    'tasks',
    'Scheduled tasks',
    rows<{ id: string; name: string; cron: string }>(`SELECT id, name, cron FROM task WHERE name LIKE ? ESCAPE '\\' ORDER BY name LIMIT 5`, p).map((r) => ({ id: r.id, title: r.name, subtitle: r.cron, to: '/schedules' })),
  )
  const lower = q.toLowerCase()
  add(
    'workflows',
    'Workflows',
    sources
      .workflows()
      .filter((w) => w.name.toLowerCase().includes(lower) || w.description.toLowerCase().includes(lower))
      .slice(0, 5)
      .map((w) => ({ id: w.id, title: w.name, subtitle: w.description, to: '/workflows' })),
  )
  add(
    'projects',
    'Projects',
    rows<{ id: string; name: string }>(`SELECT id, name FROM file_project WHERE name LIKE ? ESCAPE '\\' ORDER BY name LIMIT 5`, p).map((r) => ({ id: r.id, title: r.name, subtitle: 'project', to: '/files' })),
  )
  add(
    'files',
    'Files',
    sources.files(q).slice(0, 5).map((f) => ({ id: `${f.folderId}:${f.path}`, title: f.name, subtitle: f.path, to: '/files' })),
  )
  return { q, groups }
}
