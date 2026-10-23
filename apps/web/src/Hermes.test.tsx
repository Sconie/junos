import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HermesMemoryItem, HermesOverview, HermesSkill } from '@junos/shared'
import Hermes from './pages/Hermes'

const overview = (over: Partial<HermesOverview> = {}): HermesOverview => ({
  mode: 'mock',
  reason: null,
  status: { state: 'working', currentTask: 'write the notes', model: 'hermes-mock', uptimeS: 3600, reason: null },
  steps: [
    { id: 's1', directiveId: 'd1', type: 'shell', summary: 'List the workspace', input: 'ls', output: 'notes.md', status: 'done', ms: 42, startedAt: '2026-10-23T08:00:00.000Z' },
    { id: 's2', directiveId: 'd1', type: 'file', summary: 'Write notes.md', input: '', output: '', status: 'running', ms: null, startedAt: '2026-10-23T08:00:01.000Z' },
  ],
  messages: [
    { id: 'm1', role: 'user', text: 'write the notes', via: 'junos', directiveId: 'd1', createdAt: '2026-10-23T08:00:00.000Z' },
    { id: 'm2', role: 'user', text: 'how is the build?', via: 'telegram', directiveId: 'd2', createdAt: '2026-10-23T07:00:00.000Z' },
    { id: 'm3', role: 'agent', text: 'It passes.', via: 'telegram', directiveId: 'd2', createdAt: '2026-10-23T07:00:01.000Z' },
  ],
  queue: [{ id: 'q1', text: 'tidy the repo', priority: 'low', queuedAt: '2026-10-23T08:00:02.000Z' }],
  stopUnconfirmed: false,
  ...over,
})

const memory = (): HermesMemoryItem[] => [
  { id: 'mem-1', text: 'Jonas prefers short answers.', pinned: true },
  { id: 'mem-2', text: 'The repo is Sconie/junos.', pinned: false },
]
const skills = (): HermesSkill[] => [
  { id: 'shell', name: 'Shell', description: 'Run commands.', enabled: true },
  { id: 'mail', name: 'Mail drafts', description: 'Write drafts.', enabled: false },
]

interface Daemon {
  overview?: HermesOverview
  memoryStatus?: number
}

function mockDaemon(opts: Daemon = {}) {
  const calls: Array<{ path: string; method: string; body?: any }> = []
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '').split('?')[0]!
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path, method, body })
      if (path === '/hermes' && method === 'GET') return json(opts.overview ?? overview())
      if (path === '/hermes/memory' && method === 'GET') return json({ items: memory() })
      if (path === '/hermes/memory' && method === 'PUT') {
        if (opts.memoryStatus) return json({ error: 'bad_memory', message: 'Each memory is 1 to 500 characters.' }, opts.memoryStatus)
        return json({ items: body.items.map((m: HermesMemoryItem, i: number) => ({ ...m, id: m.id.startsWith('new-') ? `mem-new${i}` : m.id })) })
      }
      if (path === '/hermes/skills' && method === 'GET') return json({ skills: skills() })
      if (path === '/hermes/skills' && method === 'PUT') return json({ skills: skills().map((s) => (s.id === body.skills[0].id ? { ...s, enabled: body.skills[0].enabled } : s)) })
      if (path === '/hermes/directives') return json({ directiveId: 'd9' }, 202)
      return json({}, 200)
    }),
  )
  return calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Hermes console', () => {
  it('shows the status, the live steps and the conversation, with a badge on phone messages', async () => {
    mockDaemon()
    render(<Hermes />)
    expect(await screen.findByLabelText('Status: Working')).toBeTruthy()
    expect(screen.getByText(/hermes-mock · up 60 min · working on: write the notes/)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toMatch(/stand-in agent \(mock\)/)
    const activity = screen.getByLabelText('Activity')
    expect(within(within(activity).getByRole('article', { name: 'List the workspace' })).getByText(/done · 42 ms/)).toBeTruthy()
    expect(within(within(activity).getByRole('article', { name: 'Write notes.md' })).getByText(/running/)).toBeTruthy()
    const chat = screen.getByLabelText('Chat with Hermes')
    expect(within(chat).getAllByText('via Telegram')).toHaveLength(2)
    expect(within(chat).getByText('It passes.')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Queue \(1\)/ })).toBeTruthy()
  })

  it('sends a directive with its priority and the Telegram echo choice', async () => {
    const calls = mockDaemon()
    render(<Hermes />)
    fireEvent.change(await screen.findByLabelText('Directive'), { target: { value: 'tidy the repo' } })
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } })
    fireEvent.click(screen.getByLabelText(/Echo the reply to Telegram/))
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/hermes/directives')).toBeTruthy())
    expect(calls.find((c) => c.path === '/hermes/directives')!.body).toEqual({ text: 'tidy the repo', priority: 'high', echoToTelegram: true })
    await waitFor(() => expect((screen.getByLabelText('Directive') as HTMLTextAreaElement).value).toBe(''))
  })

  it('explains that nothing is connected and keeps the controls off', async () => {
    mockDaemon({ overview: overview({ mode: 'none', reason: 'Hermes is not connected yet.', status: { state: 'unreachable', currentTask: null, model: '', uptimeS: null, reason: 'Hermes is not connected yet.' }, steps: [], messages: [], queue: [] }) })
    render(<Hermes />)
    expect((await screen.findAllByText('Hermes is not connected yet.')).length).toBeGreaterThan(0)
    expect((screen.getByLabelText('Directive') as HTMLTextAreaElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Stop' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Pause' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('pauses, resumes and stops', async () => {
    const calls = mockDaemon()
    render(<Hermes />)
    fireEvent.click(await screen.findByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    await waitFor(() => expect(calls.some((c) => c.path === '/hermes/pause')).toBe(true))
    expect(calls.some((c) => c.path === '/hermes/stop')).toBe(true)
    cleanup()
    vi.unstubAllGlobals()
    const later = mockDaemon({ overview: overview({ status: { state: 'paused', currentTask: null, model: 'hermes-mock', uptimeS: 5, reason: null } }) })
    render(<Hermes />)
    fireEvent.click(await screen.findByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(later.some((c) => c.path === '/hermes/resume')).toBe(true))
  })

  it('warns when Stop could not be confirmed, and when a step waits for an approval', async () => {
    mockDaemon({
      overview: overview({
        stopUnconfirmed: true,
        steps: [{ id: 's3', directiveId: 'd1', type: 'api', summary: 'Send the drafted message', input: '', output: '', status: 'waiting_approval', ms: null, startedAt: '2026-10-23T08:00:00.000Z', approval: { class: 'external-send', target: 'someone@example.com', summary: 'Send the drafted message' } }],
      }),
    })
    render(<Hermes />)
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some((a) => /Stop not confirmed/.test(a.textContent ?? ''))).toBe(true)
    const waiting = alerts.find((a) => /waiting for your approval/.test(a.textContent ?? ''))!
    expect(waiting.textContent).toMatch(/Send the drafted message \(someone@example.com\)/)
    expect(within(waiting).getByRole('link', { name: 'Inbox' }).getAttribute('href')).toBe('/inbox')
    expect(within(screen.getByRole('article', { name: 'Send the drafted message' })).getByText(/This cannot be undone/)).toBeTruthy()
  })

  it('edits memory: change, pin, add, remove, then save', async () => {
    const calls = mockDaemon()
    render(<Hermes />)
    const panel = await screen.findByLabelText('Memory')
    const first = await within(panel).findByLabelText('Memory 1')
    fireEvent.change(first, { target: { value: 'Jonas prefers very short answers.' } })
    fireEvent.click(within(panel).getAllByLabelText('Pin')[1]!)
    fireEvent.click(within(panel).getByRole('button', { name: 'Remove memory 2' }))
    fireEvent.change(within(panel).getByLabelText('New memory'), { target: { value: 'Likes tea.' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Add' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Save memory' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT' && c.path === '/hermes/memory')).toBeTruthy())
    const body = calls.find((c) => c.method === 'PUT' && c.path === '/hermes/memory')!.body
    expect(body.items.map((m: HermesMemoryItem) => [m.text, m.pinned])).toEqual([
      ['Jonas prefers very short answers.', true],
      ['Likes tea.', false],
    ])
    await waitFor(() => expect(within(panel).queryByText('Unsaved changes')).toBeNull())
  })

  it('shows why memory was refused', async () => {
    mockDaemon({ memoryStatus: 400 })
    render(<Hermes />)
    const panel = await screen.findByLabelText('Memory')
    fireEvent.change(await within(panel).findByLabelText('Memory 1'), { target: { value: 'changed' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Save memory' }))
    expect((await screen.findAllByRole('alert')).some((a) => /1 to 500 characters/.test(a.textContent ?? ''))).toBe(true)
  })

  it('toggles a skill, and shows the queue and the raw log on their tabs', async () => {
    const calls = mockDaemon()
    render(<Hermes />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Skills' }))
    const mail = await screen.findByLabelText(/Mail drafts/)
    fireEvent.click(mail)
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT' && c.path === '/hermes/skills')).toBeTruthy())
    expect(calls.find((c) => c.method === 'PUT' && c.path === '/hermes/skills')!.body).toEqual({ skills: [{ id: 'mail', enabled: true }] })
    fireEvent.click(screen.getByRole('tab', { name: /Queue/ }))
    expect(screen.getByText(/tidy the repo/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Logs' }))
    expect(screen.getByLabelText('Raw log').textContent).toMatch(/List the workspace/)
  })
})
