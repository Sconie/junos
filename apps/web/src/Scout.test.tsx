import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ScoutFinding, ScoutOverview, ScoutRunRecord, ScoutSource } from '@junos/shared'
import Scout from './pages/Scout'

const finding = (over: Partial<ScoutFinding> = {}): ScoutFinding => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Claude Code 3.0 adds hooks',
  sourceName: 'Claude Code releases',
  link: 'https://example.com/cc3',
  summary: 'New hooks for agents.',
  relevance: 90,
  effort: 'S',
  risk: 'low',
  touches: 'the Claude adapter',
  why: 'Hooks could replace our approval wrapper.',
  suggestion: 'Try hooks for the gateway.',
  status: 'new',
  dismissReason: null,
  cardId: null,
  createdAt: '2026-10-23T08:00:00.000Z',
  ...over,
})

const source = (over: Partial<ScoutSource> = {}): ScoutSource => ({ id: 's1', name: 'Claude Code releases', kind: 'feed', url: 'https://github.com/anthropics/claude-code/releases.atom', cadence: 'daily', enabled: true, lastCheckedAt: '2026-10-23T07:00:00.000Z', health: 'ok', lastError: null, ...over })

const run = (over: Partial<ScoutRunRecord> = {}): ScoutRunRecord => ({ id: 'r1', trigger: 'manual', status: 'succeeded', startedAt: '2026-10-23T08:00:00.000Z', finishedAt: '2026-10-23T08:00:20.000Z', sources: 1, items: 5, kept: 3, findings: 2, modelCalls: 2, error: null, log: ['Local RSS: 3 new of 3.'], ...over })

const overview = (over: Partial<ScoutOverview> = {}): ScoutOverview => ({
  sources: [source()],
  settings: { threshold: 60, dailyModelCalls: 6, provider: 'claude' },
  findings: [finding(), finding({ id: '22222222-2222-4222-8222-222222222222', title: 'Vite 9 released', relevance: 75, effort: 'L', sourceName: 'Vite releases', link: 'javascript:alert(1)' })],
  runs: [run()],
  running: false,
  ...over,
})

function mockDaemon(data: ScoutOverview = overview(), reply: Record<string, unknown> = {}) {
  const calls: Array<{ path: string; method: string; body?: any }> = []
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path, method, body })
      if (path === '/scout' && method === 'GET') return json(data)
      if (path.endsWith('/ask')) return json(reply.ask ?? { conversationId: 'c1', status: 'started' })
      if (path.endsWith('/digest')) return json(reply.digest ?? { posted: true })
      if (path.endsWith('/card')) return json({ id: 'card1' }, 201)
      return json({ ok: true }, method === 'POST' && path.endsWith('/sources') ? 201 : 200)
    }),
  )
  return calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Scout', () => {
  it('lists findings with source, effort, risk and relevance, and the last run', async () => {
    mockDaemon()
    render(<Scout />)
    const first = await screen.findByRole('article', { name: 'Claude Code 3.0 adds hooks' })
    for (const text of ['90', 'Claude Code releases', 'effort S', 'risk low', 'Hooks could replace our approval wrapper.']) expect(within(first).getByText(text)).toBeTruthy()
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Claude Code 3.0 adds hooks', 'Vite 9 released'])
    expect(screen.getByLabelText('Last run').textContent).toMatch(/succeeded, 5 new items, 2 findings/)
  })

  it('runs now, and is switched off with nothing to run, or while running', async () => {
    const calls = mockDaemon()
    render(<Scout />)
    fireEvent.click(await screen.findByRole('button', { name: 'Run now' }))
    await waitFor(() => expect(calls.some((c) => c.path === '/scout/run' && c.method === 'POST')).toBe(true))
    cleanup()
    mockDaemon(overview({ running: true }))
    render(<Scout />)
    expect(((await screen.findByRole('button', { name: 'Running…' })) as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    mockDaemon(overview({ sources: [source({ enabled: false })] }))
    render(<Scout />)
    expect(((await screen.findByRole('button', { name: 'Run now' })) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Switch on a source first.')).toBeTruthy()
  })

  it('shows a finding in full with its source link, and refuses to link an unsafe address', async () => {
    mockDaemon()
    render(<Scout />)
    fireEvent.click(await screen.findByRole('button', { name: 'Claude Code 3.0 adds hooks' }))
    const detail = await screen.findByRole('complementary', { name: 'Finding: Claude Code 3.0 adds hooks' })
    expect(within(detail).getByText('the Claude adapter')).toBeTruthy()
    expect(within(detail).getByText('Try hooks for the gateway.')).toBeTruthy()
    const link = within(detail).getByRole('link', { name: 'Open the source' })
    expect(link.getAttribute('href')).toBe('https://example.com/cc3')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    fireEvent.click(screen.getByRole('button', { name: 'Vite 9 released' }))
    const vite = await screen.findByRole('complementary', { name: 'Finding: Vite 9 released' })
    expect(within(vite).queryByRole('link')).toBeNull()
  })

  it('makes a card, asks Claude, and dismisses with a reason', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const calls = mockDaemon()
    render(<Scout />)
    fireEvent.click(await screen.findByRole('button', { name: 'Claude Code 3.0 adds hooks' }))
    const detail = await screen.findByRole('complementary', { name: 'Finding: Claude Code 3.0 adds hooks' })
    fireEvent.click(within(detail).getByRole('button', { name: 'Make card' }))
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/card'))).toBe(true))
    expect((await screen.findByRole('status')).textContent).toMatch(/Card made/)
    fireEvent.click(within(detail).getByRole('button', { name: 'Ask Claude' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/chat?c=c1'))
    fireEvent.change(within(detail).getByLabelText('Dismiss because'), { target: { value: 'too risky' } })
    fireEvent.click(within(detail).getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(calls.find((c) => c.path.endsWith('/dismiss'))).toBeTruthy())
    expect(calls.find((c) => c.path.endsWith('/dismiss'))!.body).toEqual({ reason: 'too risky' })
  })

  it('says nothing was sent when the provider notice has not been accepted', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    mockDaemon(overview(), { ask: { conversationId: null, status: 'disclosure_required' } })
    render(<Scout />)
    fireEvent.click(await screen.findByRole('button', { name: 'Claude Code 3.0 adds hooks' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ask Claude' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/Nothing was sent/)
    expect(assign).not.toHaveBeenCalled()
  })

  it('shows a made card as made, and does not offer it again', async () => {
    mockDaemon(overview({ findings: [finding({ status: 'carded', cardId: 'card1' })] }))
    render(<Scout />)
    fireEvent.click(await screen.findByRole('button', { name: 'Claude Code 3.0 adds hooks' }))
    expect(((await screen.findByRole('button', { name: 'Card made' })) as HTMLButtonElement).disabled).toBe(true)
  })

  it('manages sources: switch one on, change its cadence, add one, remove one, and see why one failed', async () => {
    const calls = mockDaemon(overview({ sources: [source({ health: 'error', lastError: 'The feed answered HTTP 500.' }), source({ id: 's2', name: 'Vite releases', enabled: false, health: 'never', lastCheckedAt: null })] }))
    render(<Scout />)
    const rail = await screen.findByLabelText('Sources')
    expect(within(rail).getByText('The feed answered HTTP 500.')).toBeTruthy()
    fireEvent.click(within(rail).getByLabelText('Switch on Vite releases'))
    await waitFor(() => expect(calls.find((c) => c.path === '/scout/sources/s2' && c.method === 'PATCH')).toBeTruthy())
    expect(calls.find((c) => c.path === '/scout/sources/s2' && c.method === 'PATCH')!.body).toEqual({ enabled: true })
    fireEvent.change(within(rail).getByLabelText('Cadence for Vite releases'), { target: { value: 'weekly' } })
    await waitFor(() => expect(calls.some((c) => c.body?.cadence === 'weekly')).toBe(true))
    fireEvent.change(within(rail).getByLabelText('Name'), { target: { value: 'My feed' } })
    fireEvent.change(within(rail).getByLabelText('Feed address (http or https)'), { target: { value: 'https://example.com/feed.xml' } })
    fireEvent.click(within(rail).getByRole('button', { name: 'Add source' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/scout/sources' && c.method === 'POST')).toBeTruthy())
    expect(calls.find((c) => c.path === '/scout/sources' && c.method === 'POST')!.body).toEqual({ name: 'My feed', url: 'https://example.com/feed.xml', cadence: 'daily' })
    fireEvent.click(within(rail).getByRole('button', { name: 'Remove Vite releases' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'DELETE')).toBeTruthy())
  })

  it('saves settings and posts the weekly digest', async () => {
    const calls = mockDaemon(overview(), { digest: { posted: false } })
    render(<Scout />)
    const rail = await screen.findByLabelText('Sources')
    fireEvent.change(within(rail).getByLabelText('Show findings at or above'), { target: { value: '80' } })
    fireEvent.change(within(rail).getByLabelText('Model calls per day on a schedule'), { target: { value: '4' } })
    fireEvent.click(within(rail).getByRole('button', { name: 'Save settings' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/scout/settings')).toBeTruthy())
    expect(calls.find((c) => c.path === '/scout/settings')!.body).toEqual({ threshold: 80, dailyModelCalls: 4 })
    fireEvent.click(within(rail).getByRole('button', { name: 'Post the weekly digest now' }))
    expect((await screen.findByRole('status')).textContent).toBe('Nothing under the threshold to report this week.')
  })
})
