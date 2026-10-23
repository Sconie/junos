import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HomeCard, HomeData, HomeResponse } from '@junos/shared'
import Home from './pages/Home'

const ok = <T,>(data: T): HomeCard<T> => ({ status: 'ok', asOf: '2026-10-23T08:00:00.000Z', data, error: null })

const data = (): HomeData => ({
  needs: {
    total: 7,
    items: [
      { id: 'i1', kind: 'approval', priority: 'urgent', title: 'Approval needed: test.send', body: 'hermes wants to send mail.', createdAt: '2026-10-23T08:00:00.000Z', approval: { id: 'ap1', irreversible: true } },
      { id: 'i2', kind: 'approval', priority: 'urgent', title: 'Approval needed: test.write', body: 'a local write.', createdAt: '2026-10-23T08:00:00.000Z', approval: { id: 'ap2', irreversible: false } },
      { id: 'i3', kind: 'failure', priority: 'normal', title: 'A run failed', body: 'It exited.', createdAt: '2026-10-23T08:00:00.000Z', approval: null },
    ],
  },
  running: { items: [{ kind: 'workflow', label: 'Morning briefing', since: '2026-10-23T08:00:00.000Z' }] },
  upcoming: { paused: false, tasks: [{ id: 't1', name: 'Daily briefing', cron: '0 8 * * *', timezone: 'UTC', next: '2026-10-24T08:00:00.000Z', running: false }] },
  hermes: { mode: 'mock', state: 'working', currentTask: 'write the notes', model: 'hermes-mock', steps: [{ summary: 'List the workspace', status: 'done' }], stopUnconfirmed: false },
  board: { counts: [{ key: 'ideas', name: 'Ideas', count: 3 }, { key: 'blocked', name: 'Blocked', count: 1 }], hermesWorkingOn: { id: 'c1', title: 'Busy card' }, blocked: [{ id: 'c2', title: 'Stuck card' }] },
  subscriptions: [{ provider: 'claude', label: 'Claude', state: 'connected', detail: 'Signed in via CLI', resetsAt: null, note: null }, { provider: 'codex', label: 'Codex', state: 'rate_limited', detail: 'Plan limit', resetsAt: '2026-10-23T12:00:00.000Z', note: null }],
  scout: [{ id: 'f1', title: 'Claude Code 3.0 adds hooks', relevance: 90, effort: 'S', sourceName: 'Claude Code releases' }],
  recent: { projects: [{ id: 'p1', name: 'junos', fileCount: 40 }], files: [{ folderId: 'fo', path: 'notes.md', name: 'notes.md', kind: 'markdown', modifiedAt: '2026-10-23T08:00:00.000Z' }] },
})

const response = (over: Partial<{ [K in keyof HomeData]: HomeCard<HomeData[K]> }> = {}): HomeResponse => {
  const d = data()
  return {
    now: '2026-10-23T08:00:00.000Z',
    cards: { needs: ok(d.needs), running: ok(d.running), upcoming: ok(d.upcoming), hermes: ok(d.hermes), board: ok(d.board), subscriptions: ok(d.subscriptions), scout: ok(d.scout), recent: ok(d.recent), ...over },
  }
}

function mockDaemon(replies: HomeResponse[] = [response()], extra: Record<string, () => Response> = {}) {
  const calls: Array<{ path: string; method: string; body?: any }> = []
  let n = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path, method, body })
      if (path === '/home') return new Response(JSON.stringify(replies[Math.min(n++, replies.length - 1)]), { status: 200 })
      for (const [prefix, make] of Object.entries(extra)) if (path.startsWith(prefix)) return make()
      return new Response(JSON.stringify({ id: 'c1', status: 'started' }), { status: 200 })
    }),
  )
  return calls
}

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const card = (name: string) => screen.getByRole('region', { name })

describe('Home', () => {
  it('shows each card as loading, then with its own data', async () => {
    mockDaemon()
    renderHome()
    expect(card('Needs you').getAttribute('aria-busy')).toBe('true')
    expect(within(card('Hermes')).getByText('Loading…')).toBeTruthy()
    await waitFor(() => expect(card('Needs you').getAttribute('aria-busy')).toBe('false'))
    expect(within(card('Running now')).getByText('Morning briefing')).toBeTruthy()
    expect(within(card('Next runs')).getByText('Daily briefing')).toBeTruthy()
    expect(within(card('Next runs')).getByText('0 8 * * *')).toBeTruthy()
    expect(within(card('Hermes')).getByText('Working on: write the notes')).toBeTruthy()
    expect(within(card('Hermes')).getByText(/List the workspace · done/)).toBeTruthy()
    expect(within(card('Board')).getByText('Ideas 3')).toBeTruthy()
    expect(within(card('Board')).getByText('Hermes is working on: Busy card')).toBeTruthy()
    expect(within(card('Board')).getByText('Stuck card')).toBeTruthy()
    expect(within(card('Subscriptions')).getByText(/Limit lifts/)).toBeTruthy()
    expect(within(card('Scout')).getByText('Claude Code 3.0 adds hooks')).toBeTruthy()
    expect(within(card('Recent projects and files')).getByText('notes.md')).toBeTruthy()
    expect(within(card('Recent projects and files')).getByText('junos')).toBeTruthy()
  })

  it('offers Approve only where it is safe, always offers Deny, and says how many more wait in the Inbox', async () => {
    const calls = mockDaemon()
    renderHome()
    const needs = await screen.findByRole('region', { name: 'Needs you' })
    await within(needs).findByText('Approval needed: test.send')
    expect(within(needs).getAllByRole('button', { name: 'Approve' })).toHaveLength(1)
    expect(within(needs).getAllByRole('button', { name: 'Deny' })).toHaveLength(2)
    expect(within(needs).getByRole('link', { name: 'Review in the Inbox' })).toBeTruthy()
    expect(within(needs).getByText('and 4 more in the Inbox.')).toBeTruthy()
    fireEvent.click(within(needs).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(calls.some((c) => c.path === '/approvals/ap2/approve' && c.method === 'POST')).toBe(true))
    fireEvent.click(within(needs).getAllByRole('button', { name: 'Deny' })[0]!)
    await waitFor(() => expect(calls.some((c) => c.path === '/approvals/ap1/deny' && c.method === 'POST')).toBe(true))
  })

  it('shows an empty Home calmly', async () => {
    const d = data()
    mockDaemon([response({ needs: ok({ total: 0, items: [] }), running: ok({ items: [] }), upcoming: ok({ paused: false, tasks: [] }), hermes: ok({ ...d.hermes, mode: 'none' }), scout: ok([]), recent: ok({ projects: [], files: [] }) })])
    renderHome()
    expect(await screen.findByText('Nothing is waiting for you.')).toBeTruthy()
    expect(screen.getByText('Nothing is running.')).toBeTruthy()
    expect(screen.getByText('No scheduled tasks.')).toBeTruthy()
    expect(screen.getByText('Not connected yet.')).toBeTruthy()
    expect(screen.getByText('No findings yet.')).toBeTruthy()
    expect(screen.getByText('No folders added yet.')).toBeTruthy()
  })

  it('does not let a failing card break the page, and retries just by asking again', async () => {
    const failed: HomeResponse = response({ board: { status: 'error', asOf: '2026-10-23T08:00:00.000Z', data: null, error: 'This could not be loaded.' } })
    const calls = mockDaemon([failed, response()])
    renderHome()
    const board = await screen.findByRole('region', { name: 'Board' })
    expect(within(board).getByRole('alert').textContent).toMatch(/This could not be loaded\./)
    expect(await within(await screen.findByRole('region', { name: 'Scout' })).findByText('Claude Code 3.0 adds hooks')).toBeTruthy()
    expect(within(card('Needs you')).getByText('Approval needed: test.write')).toBeTruthy()
    fireEvent.click(within(board).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(within(card('Board')).getByText('Ideas 3')).toBeTruthy(), { timeout: 4000 })
    expect(calls.filter((c) => c.path === '/home').length).toBe(2)
  })

  it('tries a slow card again by itself a few seconds later', async () => {
    const slow: HomeResponse = response({ scout: { status: 'error', asOf: '2026-10-23T08:00:00.000Z', data: null, error: 'This took too long to load.' } })
    const calls = mockDaemon([slow, response()])
    renderHome()
    await within(await screen.findByRole('region', { name: 'Scout' })).findByRole('alert')
    expect(await within(card('Scout')).findByText('Claude Code 3.0 adds hooks', undefined, { timeout: 6000 })).toBeTruthy()
    expect(calls.filter((c) => c.path === '/home').length).toBe(2)
  }, 10_000)

  it('shows earlier data as stale, with when it is from', async () => {
    mockDaemon([response({ scout: { status: 'stale', asOf: '2026-10-23T07:00:00.000Z', data: data().scout, error: 'This took too long to load.' } })])
    renderHome()
    const scout = await screen.findByRole('region', { name: 'Scout' })
    await within(scout).findByText('Claude Code 3.0 adds hooks')
    expect(scout.getAttribute('data-status')).toBe('stale')
    expect(within(scout).getByText(/This took too long to load\. Showing what it said at/)).toBeTruthy()
  })

  it('asks a quick question in a new chat, and says nothing was sent if the provider notice is not accepted', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const calls = mockDaemon([response()], { '/conversations/c1/messages': () => new Response(JSON.stringify({ status: 'started' }), { status: 200 }) })
    renderHome()
    fireEvent.change(await screen.findByLabelText('Ask a question'), { target: { value: 'what is on today?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/chat?c=c1'))
    expect(calls.find((c) => c.path === '/conversations/c1/messages')!.body).toEqual({ content: 'what is on today?' })
    cleanup()
    assign.mockClear()
    mockDaemon([response()], { '/conversations/c1/messages': () => new Response(JSON.stringify({ status: 'disclosure_required' }), { status: 200 }) })
    renderHome()
    fireEvent.change(await screen.findByLabelText('Ask a question'), { target: { value: 'hello there' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Nothing was sent/)
    expect(assign).not.toHaveBeenCalled()
  })
})
