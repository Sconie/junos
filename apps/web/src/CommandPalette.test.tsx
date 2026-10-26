import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchResponse, WorkflowSummary } from '@junos/shared'
import CommandPalette from './components/CommandPalette'
import { fuzzyScore } from './lib/fuzzy'

const Where = () => {
  const l = useLocation()
  return <p data-testid="where">{l.pathname + l.search}</p>
}

const wf = (over: Partial<WorkflowSummary> = {}): WorkflowSummary => ({ id: 'morning-briefing', name: 'Morning briefing', description: '', version: 1, params: [], triggers: [], valid: true, errors: [], upgradedFrom: null, paused: false, pausedReason: null, running: false, lastRun: null, ...over })

function mockDaemon(opts: { search?: SearchResponse; workflows?: WorkflowSummary[]; messageStatus?: string } = {}) {
  const calls: Array<{ path: string; method: string; body?: any }> = []
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path, method, body })
      if (path.startsWith('/search')) return json(opts.search ?? { q: new URL(`http://x${path}`).searchParams.get('q'), groups: [] })
      if (path === '/workflows') return json({ workflows: opts.workflows ?? [], paused: false })
      if (path === '/conversations') return json({ id: 'c1' }, 201)
      if (path === '/conversations/c1/messages') return json({ status: opts.messageStatus ?? 'started' })
      return json({ ok: true }, 200)
    }),
  )
  return calls
}

const mount = () =>
  render(
    <MemoryRouter>
      <CommandPalette />
      <Where />
    </MemoryRouter>,
  )

const openPalette = async () => {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  return (await screen.findByRole('dialog', { name: 'Command palette' })) as HTMLElement
}
const where = () => screen.getByTestId('where').textContent
const type = (text: string) => fireEvent.change(screen.getByRole('combobox'), { target: { value: text } })

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('fuzzy matching', () => {
  it('needs every letter in order, and prefers starts and runs', () => {
    expect(fuzzyScore('xyz', 'Scheduled tasks')).toBe(-1)
    expect(fuzzyScore('', 'anything')).toBe(0)
    expect(fuzzyScore('sch', 'Scheduled tasks')).toBeGreaterThan(fuzzyScore('sch', 'Hermes console'))
    expect(fuzzyScore('sch', 'Scheduled tasks')).toBeGreaterThan(fuzzyScore('sch', 'Files and projects'))
    expect(fuzzyScore('tsk', 'Scheduled tasks')).toBeGreaterThan(-1)
    expect(fuzzyScore('SCOUT', 'Scout')).toBeGreaterThan(0)
  })
})

describe('Command palette', () => {
  it('opens with Ctrl+K or its button, focuses the field, toggles, and closes with Escape', async () => {
    mockDaemon()
    mount()
    expect(screen.queryByRole('dialog')).toBeNull()
    const dialog = await openPalette()
    expect(document.activeElement).toBe(within(dialog).getByRole('combobox'))
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open the command palette' }))
    await screen.findByRole('dialog')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('jumps to every screen by name', async () => {
    mockDaemon()
    mount()
    const screens: Array<[string, string]> = [
      ['Home', '/'],
      ['Inbox', '/inbox'],
      ['Approvals', '/approvals'],
      ['Chat', '/chat'],
      ['Scheduled tasks', '/schedules'],
      ['Board', '/board'],
      ['Scout', '/scout'],
      ['Workflows', '/workflows'],
      ['Terminal', '/terminal'],
      ['Hermes', '/hermes'],
      ['Files & projects', '/files'],
      ['Connections', '/connections'],
    ]
    for (const [label, path] of screens) {
      await openPalette()
      type(label)
      const first = screen.getAllByRole('option')[0]!
      expect(first.textContent).toContain(label)
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
      expect(where()).toBe(path)
      expect(screen.queryByRole('dialog')).toBeNull()
    }
  })

  it('finds a screen from a few letters, and moves with the arrow keys', async () => {
    mockDaemon()
    mount()
    await openPalette()
    type('sched')
    expect(screen.getAllByRole('option')[0]!.textContent).toContain('Scheduled tasks')
    type('')
    const field = screen.getByRole('combobox')
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[2]!.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(field, { key: 'ArrowUp' })
    expect(screen.getAllByRole('option')[1]!.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(where()).toBe('/inbox')
  })

  it('shows what you used last, first', async () => {
    mockDaemon()
    mount()
    await openPalette()
    type('Scout')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    await openPalette()
    const options = screen.getAllByRole('option')
    expect(options[0]!.textContent).toContain('Scout')
    expect(screen.getByText('Recent')).toBeTruthy()
  })

  it('finds chats, cards and files, and goes to each', async () => {
    mockDaemon({ search: { q: 'zebra', groups: [{ type: 'conversations', label: 'Chats', hits: [{ id: 'c9', title: 'About zebras', subtitle: 'claude', to: '/chat?c=c9' }] }, { type: 'cards', label: 'Cards', hits: [{ id: 'k1', title: 'Feed the zebra', subtitle: 'ideas', to: '/board?card=k1' }] }] } })
    mount()
    await openPalette()
    type('zebra')
    const chat = await screen.findByRole('option', { name: /About zebras/ })
    expect(screen.getByRole('option', { name: /Feed the zebra/ })).toBeTruthy()
    fireEvent.click(chat)
    expect(where()).toBe('/chat?c=c9')
  })

  it('creates a card from what you typed without leaving the page', async () => {
    const calls = mockDaemon()
    mount()
    await openPalette()
    type('Buy tea')
    fireEvent.click(screen.getByRole('option', { name: /New card: “Buy tea”/ }))
    await waitFor(() => expect(calls.find((c) => c.path === '/kanban/cards')).toBeTruthy())
    expect(calls.find((c) => c.path === '/kanban/cards')!.body).toEqual({ title: 'Buy tea' })
    expect((await screen.findByRole('status')).textContent).toBe('Card added to Ideas: Buy tea')
    expect(where()).toBe('/')
  })

  it('sends a directive to Hermes only from its own row', async () => {
    const calls = mockDaemon()
    mount()
    await openPalette()
    type('tidy the repo')
    expect(calls.some((c) => c.path.startsWith('/hermes'))).toBe(false)
    fireEvent.click(screen.getByRole('option', { name: /Ask Hermes: “tidy the repo”/ }))
    await waitFor(() => expect(calls.find((c) => c.path === '/hermes/directives')).toBeTruthy())
    expect(calls.find((c) => c.path === '/hermes/directives')!.body).toEqual({ text: 'tidy the repo' })
  })

  it('never sends words to a model on its own: Ask is an explicit last row for a sentence, and says so', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const calls = mockDaemon()
    mount()
    await openPalette()
    type('Buy')
    expect(screen.queryByRole('option', { name: /Ask Claude/ })).toBeNull()
    type('what changed in the last release?')
    await new Promise((r) => setTimeout(r, 250))
    expect(calls.some((c) => c.path.startsWith('/conversations'))).toBe(false)
    const options = screen.getAllByRole('option')
    expect(options.at(-1)!.textContent).toMatch(/Ask Claude: “what changed in the last release\?”.*sends this text to Claude/)
    fireEvent.click(options.at(-1)!)
    await waitFor(() => expect(calls.find((c) => c.path === '/conversations/c1/messages')).toBeTruthy())
    expect(calls.find((c) => c.path === '/conversations/c1/messages')!.body).toEqual({ content: 'what changed in the last release?' })
    await waitFor(() => expect(where()).toBe('/chat?c=c1'))
  })

  it('says nothing was sent when the provider notice has not been accepted', async () => {
    mockDaemon({ messageStatus: 'disclosure_required' })
    mount()
    await openPalette()
    type('is this fine to ask?')
    fireEvent.click(screen.getAllByRole('option').at(-1)!)
    expect((await screen.findByRole('status')).textContent).toMatch(/Nothing was sent/)
    expect(where()).toBe('/')
  })

  it('runs a workflow that needs no input from the palette, and opens the screen for one that does', async () => {
    const calls = mockDaemon({ workflows: [wf(), wf({ id: 'summarise-file', name: 'Summarise file', params: [{ key: 'path', type: 'file', required: true }] }), wf({ id: 'broken', name: 'Broken', valid: false })] })
    mount()
    await openPalette()
    type('Run workflow')
    await screen.findByRole('option', { name: /Run workflow: Morning briefing/ })
    expect(screen.queryByRole('option', { name: /Broken/ })).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: /Run workflow: Morning briefing/ }))
    await waitFor(() => expect(calls.find((c) => c.path === '/workflows/morning-briefing/run')).toBeTruthy())
    expect((await screen.findByRole('status')).textContent).toBe('Started Morning briefing.')
    await openPalette()
    type('Run workflow')
    fireEvent.click(await screen.findByRole('option', { name: /Run workflow: Summarise file/ }))
    expect(where()).toBe('/workflows')
  })

  it('says when nothing matches', async () => {
    mockDaemon()
    mount()
    await openPalette()
    type('qqqqqqqq')
    expect(screen.getAllByRole('option').every((o) => /New card|Ask Hermes/.test(o.textContent ?? ''))).toBe(true)
  })
})
