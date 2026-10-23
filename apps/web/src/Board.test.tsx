import { cleanup, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KANBAN_COLUMNS, type KanbanBoard, type KanbanCard } from '@junos/shared'
import Board from './pages/Board'

const card = (over: Partial<KanbanCard> = {}): KanbanCard => ({
  id: '11111111-1111-4111-8111-111111111111',
  column: 'ideas',
  position: 1000,
  title: 'Write the notes',
  body: 'In notes.md',
  creator: 'jonas',
  assignee: 'none',
  project: '',
  priority: 'P2',
  labels: [],
  due: null,
  checklist: [],
  summary: '',
  claimedBy: null,
  createdAt: '2026-10-23T08:00:00.000Z',
  updatedAt: '2026-10-23T08:00:00.000Z',
  activity: [{ id: 'a1', at: '2026-10-23T08:00:00.000Z', actor: 'jonas', text: 'Created.' }],
  ...over,
})

const board = (cards: KanbanCard[], working: KanbanBoard['hermesWorkingOn'] = null): KanbanBoard => ({
  columns: KANBAN_COLUMNS,
  cards,
  projects: [...new Set(cards.map((c) => c.project).filter(Boolean))],
  hermesWorkingOn: working,
})

function mockDaemon(data: KanbanBoard) {
  const calls: Array<{ path: string; method: string; body?: any }> = []
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '').split('?')[0]!
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path, method, body })
      if (path === '/kanban' && method === 'GET') return json(data)
      if (path === '/kanban/cards/bulk') return json({ cards: [] }, 201)
      if (path === '/kanban/cards' && method === 'POST') return json(card(), 201)
      return json(card(), 200)
    }),
  )
  return calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const column = (name: string) => screen.getByRole('region', { name })

describe('Board', () => {
  it('shows the columns with counts, the cards with their chips, a Hermes marker, and what Hermes is on', async () => {
    mockDaemon(
      board(
        [
          card({ priority: 'P0', labels: ['docs'], due: '2026-11-01', checklist: [{ text: 'a', done: true }, { text: 'b', done: false }], assignee: 'jonas' }),
          card({ id: '22222222-2222-4222-8222-222222222222', title: 'Follow-up', creator: 'hermes', column: 'ideas' }),
          card({ id: '33333333-3333-4333-8333-333333333333', title: 'Busy card', column: 'in_progress', assignee: 'hermes', claimedBy: 'hermes' }),
        ],
        { id: '33333333-3333-4333-8333-333333333333', title: 'Busy card' },
      ),
    )
    render(<Board />)
    expect((await screen.findByRole('status')).textContent).toBe('Hermes is working on: Busy card')
    expect(KANBAN_COLUMNS.map((c) => c.name).every((n) => screen.getByRole('region', { name: n }))).toBe(true)
    const ideas = column('Ideas')
    expect(within(ideas).getByText('2')).toBeTruthy()
    const mine = within(ideas).getByRole('article', { name: 'Write the notes' })
    for (const chip of ['P0', 'jonas', 'docs', 'due 2026-11-01', '1/2']) expect(within(mine).getByText(chip)).toBeTruthy()
    expect(within(within(ideas).getByRole('article', { name: 'Follow-up' })).getByLabelText('Made by Hermes')).toBeTruthy()
    expect(within(column('In progress')).getByText('working')).toBeTruthy()
    expect(within(column('In progress')).getByText('1 / 3')).toBeTruthy()
  })

  it('filters by whose cards, project and label', async () => {
    mockDaemon(
      board([
        card({ title: 'Mine', assignee: 'jonas', project: 'junos' }),
        card({ id: '22222222-2222-4222-8222-222222222222', title: 'For Hermes', assignee: 'hermes', project: 'garden', labels: ['hermes'] }),
        card({ id: '33333333-3333-4333-8333-333333333333', title: 'Nobody', project: 'junos' }),
      ]),
    )
    render(<Board />)
    await screen.findByRole('article', { name: 'Mine' })
    fireEvent.click(screen.getByRole('tab', { name: 'Mine' }))
    expect(screen.queryByRole('article', { name: 'For Hermes' })).toBeNull()
    expect(screen.getByRole('article', { name: 'Mine' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Hermes' }))
    expect(screen.getByRole('article', { name: 'For Hermes' })).toBeTruthy()
    expect(screen.queryByRole('article', { name: 'Mine' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'junos' } })
    expect(screen.queryByRole('article', { name: 'For Hermes' })).toBeNull()
    expect(screen.getByRole('article', { name: 'Nobody' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'hermes' } })
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['For Hermes'])
  })

  it('adds a card inline, and the c key jumps to the add field', async () => {
    const calls = mockDaemon(board([]))
    render(<Board />)
    const ready = await screen.findByLabelText('Add a card to Ready')
    fireEvent.change(ready, { target: { value: 'Buy tea' } })
    fireEvent.submit(ready.closest('form')!)
    await waitFor(() => expect(calls.find((c) => c.path === '/kanban/cards' && c.method === 'POST')).toBeTruthy())
    expect(calls.find((c) => c.path === '/kanban/cards' && c.method === 'POST')!.body).toEqual({ title: 'Buy tea', column: 'ready' })
    fireEvent.keyDown(window, { key: 'c' })
    expect(document.activeElement).toBe(screen.getByLabelText('Add a card to Ideas'))
    // Typing a c in a field does not steal focus.
    fireEvent.keyDown(screen.getByLabelText('Add a card to Ready'), { key: 'c' })
    expect(document.activeElement).toBe(screen.getByLabelText('Add a card to Ideas'))
  })

  it('moves a card by dragging it onto a column or before another card', async () => {
    const calls = mockDaemon(
      board([
        card({ title: 'First', column: 'ideas' }),
        card({ id: '22222222-2222-4222-8222-222222222222', title: 'Second', column: 'ideas', position: 2000 }),
      ]),
    )
    render(<Board />)
    const first = await screen.findByRole('article', { name: 'First' })
    const second = screen.getByRole('article', { name: 'Second' })
    fireEvent(first, createEvent.dragStart(first))
    fireEvent(column('Ready'), createEvent.drop(column('Ready')))
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')).toBeTruthy())
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ path: '/kanban/cards/11111111-1111-4111-8111-111111111111', body: { column: 'ready', beforeId: null } })
    calls.length = 0
    fireEvent(second, createEvent.dragStart(second))
    fireEvent(first, createEvent.drop(first))
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')).toBeTruthy())
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ column: 'ideas', beforeId: '11111111-1111-4111-8111-111111111111' })
  })

  it('opens a card in the drawer to edit, comment on and delete it, and shows Hermes’s summary', async () => {
    const calls = mockDaemon(board([card({ column: 'review', creator: 'hermes', summary: 'Wrote notes.md', activity: [{ id: 'a1', at: '2026-10-23T08:00:00.000Z', actor: 'hermes', text: 'Finished: Wrote notes.md' }] })]))
    render(<Board />)
    fireEvent.click(await screen.findByRole('button', { name: /Write the notes/ }))
    const drawer = await screen.findByRole('complementary', { name: 'Card: Write the notes' })
    expect(within(drawer).getByText('Wrote notes.md')).toBeTruthy()
    expect(within(drawer).getByText('Finished: Wrote notes.md')).toBeTruthy()
    fireEvent.change(within(drawer).getByLabelText('Title'), { target: { value: 'Write the notes today' } })
    fireEvent.change(within(drawer).getByLabelText('Column'), { target: { value: 'done' } })
    fireEvent.change(within(drawer).getByLabelText('Assignee'), { target: { value: 'jonas' } })
    fireEvent.change(within(drawer).getByLabelText(/Labels/), { target: { value: 'docs, urgent' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save card' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')).toBeTruthy())
    expect(calls.find((c) => c.method === 'PATCH')!.body).toMatchObject({ title: 'Write the notes today', column: 'done', assignee: 'jonas', labels: ['docs', 'urgent'], due: null })
    fireEvent.change(within(drawer).getByLabelText('Comment'), { target: { value: 'looks good' } })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Comment' }))
    await waitFor(() => expect(calls.find((c) => c.path.endsWith('/comments'))).toBeTruthy())
    expect(calls.find((c) => c.path.endsWith('/comments'))!.body).toEqual({ text: 'looks good' })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'DELETE')).toBeTruthy())
  })

  it('creates several cards from pasted lines, dropping list markers', async () => {
    const calls = mockDaemon(board([]))
    render(<Board />)
    fireEvent.click(await screen.findByRole('button', { name: 'Paste cards' }))
    const form = await screen.findByRole('form', { name: 'Paste cards' })
    fireEvent.change(within(form).getByLabelText('One card per line'), { target: { value: '- buy tea\n* call Susanne\n\n3. tidy the repo' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Create 3 cards' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/kanban/cards/bulk')).toBeTruthy())
    expect(calls.find((c) => c.path === '/kanban/cards/bulk')!.body).toEqual({ titles: ['buy tea', 'call Susanne', 'tidy the repo'] })
  })
})
