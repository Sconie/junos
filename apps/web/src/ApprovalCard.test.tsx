import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalRecord } from '@junos/shared'
import ApprovalCard from './components/ApprovalCard'

const base: ApprovalRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'pending',
  digest: 'a'.repeat(64),
  class: 'external-send',
  actor: 'hermes',
  tool: 'mail.send',
  target: 'alice@example.com',
  project: 'junos',
  runId: 'run-1',
  args: { to: 'alice@example.com', subject: 'Hi', apiKey: '[redacted]' },
  requestedAt: '2026-10-22T10:00:00.000Z',
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  decidedBy: null,
  decidedChannel: null,
  decidedAt: null,
  irreversible: true,
}

/** Stand-in daemon: GET returns `current`, POSTs are recorded. */
function mockApi(current: Partial<ApprovalRecord> = {}) {
  const calls: Array<{ path: string; method: string }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input)
      const method = init.method ?? 'GET'
      calls.push({ path, method })
      const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
      if (method === 'GET') return json({ ...base, ...current })
      return json({ ...base, status: 'approved' })
    }),
  )
  return calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ApprovalCard', () => {
  it('shows who asked, the exact action, target, project, expiry and the irreversible warning', () => {
    mockApi()
    render(<ApprovalCard approval={base} detail />)
    expect(screen.getByText('hermes')).toBeTruthy()
    expect(screen.getByText('mail.send')).toBeTruthy()
    expect(screen.getAllByText('alice@example.com').length).toBeGreaterThan(0)
    expect(screen.getByText('junos')).toBeTruthy()
    expect(screen.getByText(/in \d+ min/)).toBeTruthy()
    expect(screen.getByText('Exact action')).toBeTruthy()
    expect(screen.getByText(/"subject": "Hi"/)).toBeTruthy()
    expect(screen.getByText('Cannot be undone once it runs.')).toBeTruthy()
    expect(screen.getByText('External send')).toBeTruthy()
  })

  it('does not claim irreversibility for a reversible action', () => {
    mockApi()
    render(<ApprovalCard approval={{ ...base, class: 'write-local', irreversible: false }} />)
    expect(screen.queryByText('Cannot be undone once it runs.')).toBeNull()
  })

  it('re-reads the status before approving, then approves', async () => {
    const calls = mockApi()
    const changed = vi.fn()
    render(<ApprovalCard approval={base} onChanged={changed} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(changed).toHaveBeenCalled())
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([`GET /api/approvals/${base.id}`, `POST /api/approvals/${base.id}/approve`])
  })

  it('does not approve a request that was decided elsewhere, and says so', async () => {
    const calls = mockApi({ status: 'denied' })
    render(<ApprovalCard approval={base} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect((await screen.findByRole('alert')).textContent).toContain('already denied')
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('shows an expired request as resolved, with no buttons', () => {
    mockApi()
    render(<ApprovalCard approval={{ ...base, expiresAt: new Date(Date.now() - 1000).toISOString() }} />)
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Expired')
  })

  it.each([
    ['approved', 'Approved'],
    ['consumed', 'already used'],
    ['denied', 'Denied'],
  ] as const)('shows a %s request as resolved', (status, text) => {
    mockApi()
    render(<ApprovalCard approval={{ ...base, status }} />)
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByRole('status').textContent).toContain(text)
  })

  describe('keyboard shortcuts', () => {
    it('work only in a detail view, with the card itself focused', async () => {
      const calls = mockApi()
      render(<ApprovalCard approval={base} detail />)
      const card = screen.getByRole('article')
      fireEvent.keyDown(card, { key: 'a' })
      await waitFor(() => expect(calls.some((c) => c.path.endsWith('/approve'))).toBe(true))
    })

    it('never fire on a list row', () => {
      const calls = mockApi()
      render(<ApprovalCard approval={base} />)
      const card = screen.getByRole('article')
      fireEvent.keyDown(card, { key: 'a' })
      fireEvent.keyDown(card, { key: 'd' })
      expect(calls).toEqual([])
    })

    it('ignore keys typed into a control inside the card', () => {
      const calls = mockApi()
      render(<ApprovalCard approval={base} detail />)
      fireEvent.keyDown(screen.getByRole('button', { name: 'Deny' }), { key: 'a' })
      expect(calls).toEqual([])
    })
  })
})
