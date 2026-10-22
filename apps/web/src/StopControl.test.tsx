import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RunRecord, RunsResponse } from '@junos/shared'
import StopControl from './components/StopControl'

const run = (over: Partial<RunRecord> = {}): RunRecord => ({
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'chat',
  source: 'claude',
  status: 'running',
  startedAt: new Date().toISOString(),
  finishedAt: null,
  exitCode: null,
  signal: null,
  error: null,
  stopRequestedAt: null,
  sideEffects: [],
  ...over,
})

/** A stand-in junosd whose /api/runs answers can be changed between calls. */
function mockDaemon(initial: RunsResponse) {
  let state = initial
  const calls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const method = init.method ?? 'GET'
      calls.push(`${method} ${String(input)}`)
      if (String(input) === '/api/stop' && method === 'POST') {
        state = { paused: true, runs: state.runs.map((r) => (r.status === 'running' ? { ...r, status: 'stopped', finishedAt: new Date().toISOString() } : r)) }
      }
      if (String(input) === '/api/resume' && method === 'POST') state = { ...state, paused: false }
      return new Response(JSON.stringify(state), { status: 200 })
    }),
  )
  return { calls, set: (s: RunsResponse) => (state = s) }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('StopControl', () => {
  it('is hidden when nothing runs and nothing is stopped', async () => {
    const d = mockDaemon({ paused: false, runs: [] })
    const { container } = render(<StopControl />)
    await waitFor(() => expect(d.calls).toContain('GET /api/runs'))
    expect(container.querySelector('.stop')).toBeNull()
  })

  it('shows a Stop button with the number of running runs', async () => {
    mockDaemon({ paused: false, runs: [run(), run({ id: '22222222-2222-4222-8222-222222222222' })] })
    render(<StopControl />)
    expect((await screen.findByRole('button', { name: 'Stop · 2 running' })).tagName).toBe('BUTTON')
  })

  it('stops everything with one click and then shows the stopped state with Resume', async () => {
    const d = mockDaemon({ paused: false, runs: [run()] })
    render(<StopControl />)
    fireEvent.click(await screen.findByRole('button', { name: /Stop · 1 running/ }))
    expect(await screen.findByText('Stopped')).toBeTruthy()
    expect(d.calls).toContain('POST /api/stop')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Stop ·/ })).toBeNull()
  })

  it('resumes from the stopped state', async () => {
    const d = mockDaemon({ paused: true, runs: [] })
    render(<StopControl />)
    fireEvent.click(await screen.findByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(d.calls).toContain('POST /api/resume'))
    await waitFor(() => expect(screen.queryByText('Stopped')).toBeNull())
  })

  it('shows a disabled "Stopping…" while a run is cancelling', async () => {
    mockDaemon({ paused: true, runs: [run({ status: 'cancelling' })] })
    render(<StopControl />)
    const button = (await screen.findByRole('button', { name: 'Stopping…' })) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('says "Stop not confirmed" when a process would not die, instead of claiming success', async () => {
    mockDaemon({ paused: true, runs: [run({ status: 'stop_unconfirmed', finishedAt: new Date().toISOString() })] })
    render(<StopControl />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Stop not confirmed')
    expect(alert.textContent).toContain('may still be running')
    expect(screen.queryByText('Stopped')).toBeNull()
  })

  it('still offers Stop when a sibling is running after one run could not be confirmed', async () => {
    mockDaemon({
      paused: false,
      runs: [
        run({ status: 'stop_unconfirmed', finishedAt: new Date().toISOString() }),
        run({ id: '22222222-2222-4222-8222-222222222222', status: 'running' }),
      ],
    })
    render(<StopControl />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Stop · 1 running' })).toBeTruthy()
  })

  it('keeps Stopping… when one run is unconfirmed and another is still cancelling', async () => {
    mockDaemon({
      paused: true,
      runs: [
        run({ status: 'stop_unconfirmed', finishedAt: new Date().toISOString() }),
        run({ id: '22222222-2222-4222-8222-222222222222', status: 'cancelling' }),
      ],
    })
    render(<StopControl />)
    expect(await screen.findByRole('button', { name: 'Stopping…' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Stop not confirmed')
  })

  it('lists actions that already ran when the stop could not be confirmed', async () => {
    mockDaemon({
      paused: true,
      runs: [
        run({
          status: 'stop_unconfirmed',
          finishedAt: new Date().toISOString(),
          sideEffects: [{ digest: 'b'.repeat(64), tool: 'mail.send', class: 'external-send', target: 'bob@example.com' }],
        }),
      ],
    })
    render(<StopControl />)
    expect(await screen.findByText('1 action had already run')).toBeTruthy()
    expect(screen.getByText('mail.send')).toBeTruthy()
    expect(screen.getByText(/bob@example.com/)).toBeTruthy()
  })

  it('lists actions that had already run, because they cannot be undone', async () => {
    mockDaemon({
      paused: true,
      runs: [
        run({
          status: 'stopped',
          finishedAt: new Date().toISOString(),
          sideEffects: [{ digest: 'a'.repeat(64), tool: 'mail.send', class: 'external-send', target: 'alice@example.com' }],
        }),
      ],
    })
    render(<StopControl />)
    expect(await screen.findByText('1 action had already run')).toBeTruthy()
    expect(screen.getByText('mail.send')).toBeTruthy()
    expect(screen.getByText(/alice@example.com/)).toBeTruthy()
  })

  it('lists side effects from every run in the latest stop', async () => {
    const at = new Date().toISOString()
    mockDaemon({
      paused: true,
      runs: [
        run({
          status: 'stopped',
          stopRequestedAt: at,
          finishedAt: at,
          sideEffects: [{ digest: 'a'.repeat(64), tool: 'mail.send', class: 'external-send', target: 'alice@example.com' }],
        }),
        run({
          id: '22222222-2222-4222-8222-222222222222',
          status: 'stopped',
          stopRequestedAt: at,
          finishedAt: at,
          sideEffects: [{ digest: 'c'.repeat(64), tool: 'test.write', class: 'write-local', target: '/work/a.txt' }],
        }),
      ],
    })
    render(<StopControl />)
    expect(await screen.findByText('2 actions had already run')).toBeTruthy()
    expect(screen.getByText('mail.send')).toBeTruthy()
    expect(screen.getByText('test.write')).toBeTruthy()
  })

  it('does not list side effects from an earlier stop on the next pause', async () => {
    const earlier = new Date(Date.now() - 60_000).toISOString()
    const later = new Date().toISOString()
    mockDaemon({
      paused: true,
      runs: [
        run({
          status: 'stopped',
          stopRequestedAt: earlier,
          finishedAt: earlier,
          sideEffects: [{ digest: 'a'.repeat(64), tool: 'mail.send', class: 'external-send', target: 'alice@example.com' }],
        }),
        run({
          id: '22222222-2222-4222-8222-222222222222',
          status: 'stopped',
          stopRequestedAt: later,
          finishedAt: later,
          sideEffects: [],
        }),
      ],
    })
    render(<StopControl />)
    expect(await screen.findByText('Stopped')).toBeTruthy()
    expect(screen.queryByText('mail.send')).toBeNull()
    expect(screen.queryByText(/had already run/)).toBeNull()
  })
})
