import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionRecord } from '@junos/shared'
import Connections from './pages/Connections'

const base = {
  version: null,
  method: null,
  plan: null,
  chat: false,
  note: null,
  reconnect: null,
  resetsAt: null,
  checkedAt: '2026-10-22T10:00:00Z',
} as const

const card = (over: Partial<ConnectionRecord> & Pick<ConnectionRecord, 'provider' | 'label' | 'state' | 'detail'>): ConnectionRecord => ({ ...base, ...over })

const ALL: ConnectionRecord[] = [
  card({ provider: 'claude', label: 'Claude', state: 'connected', detail: 'Signed in with your Claude plan.', method: 'Signed in via CLI', plan: 'pro', version: '2.1.306 (Claude Code)', chat: true, reconnect: 'claude auth login' }),
  card({ provider: 'codex', label: 'Codex (ChatGPT)', state: 'needs_login', detail: 'Not signed in. Run the command below, then check again.', chat: true, reconnect: 'codex login' }),
  card({ provider: 'cursor', label: 'Cursor', state: 'connected', detail: 'Signed in. Chat through Cursor is the next step.', note: 'chat_later', method: 'Signed in via CLI', reconnect: 'cursor-agent login' }),
  card({ provider: 'grok', label: 'Grok (X)', state: 'unavailable', detail: 'No supported sign-in route exists yet.', note: 'coming' }),
  card({ provider: 'nous', label: 'Nous Portal', state: 'unknown', detail: 'Nous Portal is reached through Hermes.', note: 'via_hermes' }),
]

function mockDaemon(list: ConnectionRecord[] | 'fail' = ALL) {
  let calls = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      calls += 1
      if (list === 'fail') return new Response('{}', { status: 500 })
      return new Response(JSON.stringify({ connections: list }), { status: 200 })
    }),
  )
  return () => calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Connections', () => {
  it('shows one card per provider with the state in words, not just colour', async () => {
    mockDaemon()
    render(<Connections />)
    const claude = await screen.findByRole('article', { name: 'Claude' })
    expect(within(claude).getByText('Connected')).toBeTruthy()
    expect(within(claude).getByText('pro')).toBeTruthy()
    expect(within(claude).getByText('2.1.306 (Claude Code)')).toBeTruthy()
    expect(within(claude).getByText('Available')).toBeTruthy()

    const codex = screen.getByRole('article', { name: 'Codex (ChatGPT)' })
    expect(within(codex).getByText('Needs sign-in')).toBeTruthy()
    expect(within(codex).getByText('Not right now')).toBeTruthy()
  })

  it('shows the exact command to fix a signed-out provider, and none for a healthy one', async () => {
    mockDaemon()
    render(<Connections />)
    const codex = await screen.findByRole('article', { name: 'Codex (ChatGPT)' })
    expect(within(codex).getByText('codex login')).toBeTruthy()
    expect(within(screen.getByRole('article', { name: 'Claude' })).queryByText('claude auth login')).toBeNull()
  })

  it('copies the command', async () => {
    mockDaemon()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<Connections />)
    fireEvent.click(within(await screen.findByRole('article', { name: 'Codex (ChatGPT)' })).getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('codex login'))
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('shows Grok as coming and Nous as reached through Hermes', async () => {
    mockDaemon()
    render(<Connections />)
    const grok = await screen.findByRole('article', { name: 'Grok (X)' })
    expect(within(grok).getByText('Coming later')).toBeTruthy()
    expect(within(grok).getByText('Not available yet')).toBeTruthy()
    const nous = screen.getByRole('article', { name: 'Nous Portal' })
    expect(within(nous).getByText('Through Hermes')).toBeTruthy()
  })

  it('shows Cursor as signed in with chat still to come', async () => {
    mockDaemon()
    render(<Connections />)
    const cursor = await screen.findByRole('article', { name: 'Cursor' })
    expect(within(cursor).getByText('Chat comes next')).toBeTruthy()
    expect(within(cursor).getByText('Connected')).toBeTruthy()
    expect(within(cursor).getByText('Not available yet')).toBeTruthy()
  })

  it('explains a rate limit and when it lifts, with no sign-in command', async () => {
    mockDaemon([card({ provider: 'claude', label: 'Claude', state: 'rate_limited', detail: 'The plan limit was reached.', chat: true, reconnect: 'claude auth login', resetsAt: '2026-10-23T00:20:00Z' })])
    render(<Connections />)
    const claude = await screen.findByRole('article', { name: 'Claude' })
    expect(within(claude).getByText('Rate limited')).toBeTruthy()
    expect(within(claude).getByText('Lifts')).toBeTruthy()
    expect(within(claude).queryByText('claude auth login')).toBeNull()
  })

  it('warns when a provider is signed in with an API key', async () => {
    mockDaemon([card({ provider: 'codex', label: 'Codex (ChatGPT)', state: 'degraded', detail: 'Signed in with an API key, which JunOS does not use.', method: 'API key', chat: true, reconnect: 'codex login' })])
    render(<Connections />)
    const codex = await screen.findByRole('article', { name: 'Codex (ChatGPT)' })
    expect(within(codex).getByText('Not using your plan')).toBeTruthy()
    expect(within(codex).getByText('codex login')).toBeTruthy()
  })

  it('checks again on request', async () => {
    const calls = mockDaemon()
    render(<Connections />)
    await screen.findByRole('article', { name: 'Claude' })
    const before = calls()
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }))
    await waitFor(() => expect(calls()).toBeGreaterThan(before))
  })

  it('says so when the daemon cannot be reached', async () => {
    mockDaemon('fail')
    render(<Connections />)
    expect((await screen.findByRole('alert')).textContent).toContain('Could not read the connections')
  })

  it('never mentions API keys as a way to connect', async () => {
    mockDaemon()
    const { container } = render(<Connections />)
    await screen.findByRole('article', { name: 'Claude' })
    expect(container.textContent).toContain('never uses an API key')
  })
})
