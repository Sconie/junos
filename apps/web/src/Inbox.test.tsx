import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalRecord, InboxItem, InboxResponse, TelegramStatus } from '@junos/shared'
import InboxBadge from './components/InboxBadge'
import Inbox from './pages/Inbox'

const approval = (over: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: '11111111-1111-4111-8111-111111111111',
  status: 'pending',
  digest: 'a'.repeat(64),
  class: 'external-send',
  actor: 'hermes',
  tool: 'mail.send',
  target: 'alice@example.com',
  project: null,
  runId: null,
  args: { to: 'alice@example.com' },
  requestedAt: '2026-10-22T10:00:00Z',
  expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
  decidedBy: null,
  decidedChannel: null,
  decidedAt: null,
  irreversible: true,
  ...over,
})

const approvalItem = (over: Partial<InboxItem> = {}): InboxItem => ({
  id: 'i1',
  kind: 'approval',
  priority: 'urgent',
  title: 'Approval needed: mail.send',
  body: 'hermes wants to run mail.send',
  source: 'hermes',
  status: 'new',
  resolution: null,
  refId: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-10-22T10:00:00Z',
  updatedAt: '2026-10-22T10:00:00Z',
  snoozeUntil: null,
  approval: approval(),
  ...over,
})

const failureItem = (over: Partial<InboxItem> = {}): InboxItem => ({
  id: 'i2',
  kind: 'failure',
  priority: 'normal',
  title: 'A claude run failed',
  body: 'It exited with code 1.',
  source: 'claude',
  status: 'new',
  resolution: null,
  refId: 'run-1',
  createdAt: '2026-10-22T09:00:00Z',
  updatedAt: '2026-10-22T09:00:00Z',
  snoozeUntil: null,
  ...over,
})

function counts(items: InboxItem[]) {
  const needs = items.filter((i) => i.status === 'new')
  return {
    needsMe: needs.length,
    approvals: needs.filter((i) => i.kind === 'approval').length,
    failures: needs.filter((i) => i.kind === 'failure').length,
    done: items.filter((i) => i.status === 'done' || i.status === 'resolved').length,
    snoozed: items.filter((i) => i.status === 'snoozed').length,
    all: items.length,
  }
}

function mockDaemon(initial: InboxItem[], telegram: Partial<TelegramStatus> = {}) {
  let items = initial
  const calls: Array<{ path: string; method: string; body?: unknown }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path, method, body })
      const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
      if (path === '/inbox') return json({ items, counts: counts(items) } satisfies InboxResponse)
      if (path === '/telegram/status') {
        return json({ enabled: false, reason: 'Not configured. Set JUNOS_TELEGRAM_TOKEN and JUNOS_TELEGRAM_USER_ID before starting junosd.', quietHours: { start: '23:00', end: '07:00' }, lastPollAt: null, sent: 0, rejected: 0, ...telegram })
      }
      const act = /^\/inbox\/([^/]+)\/action$/.exec(path)
      if (act && method === 'POST') {
        items = items.map((i) => (i.id === act[1] ? { ...i, status: body.action === 'done' ? 'done' : body.action === 'snooze' ? 'snoozed' : 'new' } : i))
        return json(items.find((i) => i.id === act[1]))
      }
      const one = /^\/approvals\/([^/]+)(\/(approve|deny))?$/.exec(path)
      if (one && !one[2]) return json(approval())
      if (one && one[3]) {
        items = items.map((i) => (i.kind === 'approval' ? { ...i, status: 'resolved', resolution: one[3] === 'approve' ? 'approved' : 'denied', approval: approval({ status: one[3] === 'approve' ? 'approved' : 'denied' }) } : i))
        return json(approval({ status: 'approved' }))
      }
      return json({ error: 'not found' }, 404)
    }),
  )
  return { calls, set: (next: InboxItem[]) => (items = next) }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Inbox', () => {
  it('lists what needs me with filter counts, urgent first', async () => {
    mockDaemon([approvalItem(), failureItem()])
    render(<Inbox />)
    expect(await screen.findByRole('button', { name: /Approval needed: mail\.send/ })).toBeTruthy()
    const filters = screen.getByRole('navigation', { name: 'Inbox filters' })
    expect(within(filters).getByRole('button', { name: /Needs me/ }).textContent).toContain('2')
    expect(within(filters).getByRole('button', { name: /Approvals/ }).textContent).toContain('1')
    expect(within(filters).getByRole('button', { name: /Failures/ }).textContent).toContain('1')
    const rows = within(screen.getByRole('list', { name: 'Items' })).getAllByRole('button')
    expect(rows[0]!.textContent).toContain('Approval needed')
  })

  it('shows an approval with the shared ApprovalCard, and approving it settles the item', async () => {
    const d = mockDaemon([approvalItem()])
    render(<Inbox />)
    const card = await screen.findByRole('article', { name: /Approval request: mail\.send/ })
    expect(within(card).getByText('Cannot be undone once it runs.')).toBeTruthy()
    fireEvent.click(within(card).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(d.calls.some((c) => c.path.endsWith('/approve'))).toBe(true))
    // The approval API is the one used; the Inbox only follows it.
    expect(d.calls.some((c) => c.path.startsWith('/inbox/') && c.method === 'POST')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /Done/ }))
    expect(await screen.findByText(/settled: approved/)).toBeTruthy()
  })

  it('shows an approval settled elsewhere as resolved, with no buttons to answer it again', async () => {
    mockDaemon([approvalItem({ status: 'resolved', resolution: 'denied', approval: approval({ status: 'denied', decidedChannel: 'telegram' }) })])
    render(<Inbox />)
    fireEvent.click(await screen.findByRole('button', { name: /Done/ }))
    const card = await screen.findByRole('article', { name: /Approval request/ })
    expect(within(card).queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(within(card).getByRole('status').textContent).toContain('Denied')
  })

  it('marks a failure done and can reopen it', async () => {
    const d = mockDaemon([failureItem()])
    render(<Inbox />)
    fireEvent.click(await screen.findByRole('button', { name: 'Done' }))
    await waitFor(() => expect(d.calls.find((c) => c.path === '/inbox/i2/action')?.body).toEqual({ action: 'done' }))
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Inbox filters' })).getByRole('button', { name: /Done/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reopen' }))
    await waitFor(() => expect(d.calls.filter((c) => c.path === '/inbox/i2/action').at(-1)?.body).toEqual({ action: 'reopen' }))
  })

  it('snoozes for an hour', async () => {
    const d = mockDaemon([failureItem()])
    render(<Inbox />)
    fireEvent.click(await screen.findByRole('button', { name: 'Snooze 1 hour' }))
    await waitFor(() => expect(d.calls.find((c) => c.method === 'POST')?.body).toMatchObject({ action: 'snooze' }))
    const until = Date.parse((d.calls.find((c) => c.method === 'POST')!.body as { until: string }).until)
    expect(until).toBeGreaterThan(Date.now() + 50 * 60_000)
  })

  it('moves with j and k and marks done with e, but never approves from the keyboard on a row', async () => {
    const d = mockDaemon([approvalItem(), failureItem({ id: 'i2' }), failureItem({ id: 'i3', title: 'A codex run failed', createdAt: '2026-10-22T08:00:00Z' })])
    render(<Inbox />)
    const list = await screen.findByRole('list', { name: 'Items' })
    list.focus()
    fireEvent.keyDown(list, { key: 'j' })
    expect(await screen.findByRole('heading', { name: 'A claude run failed' })).toBeTruthy()
    fireEvent.keyDown(list, { key: 'k' })
    expect(await screen.findByRole('article', { name: /Approval request/ })).toBeTruthy()
    fireEvent.keyDown(list, { key: 'a' })
    fireEvent.keyDown(list, { key: 'd' })
    fireEvent.keyDown(list, { key: 'e' }) // e on an approval does nothing
    expect(d.calls.some((c) => c.method === 'POST')).toBe(false)
    fireEvent.keyDown(list, { key: 'j' })
    fireEvent.keyDown(list, { key: 'e' })
    await waitFor(() => expect(d.calls.find((c) => c.path === '/inbox/i2/action')?.body).toEqual({ action: 'done' }))
  })

  it('says Telegram is off and how to turn it on, without asking for a token here', async () => {
    mockDaemon([])
    render(<Inbox />)
    expect(await screen.findByText(/Telegram alerts are off/)).toBeTruthy()
    expect(await screen.findByText(/Set JUNOS_TELEGRAM_TOKEN/)).toBeTruthy()
    expect(screen.queryByLabelText(/token/i)).toBeNull()
  })

  it('says Telegram is on when configured', async () => {
    mockDaemon([], { enabled: true, reason: null })
    render(<Inbox />)
    expect(await screen.findByText(/also sent to your Telegram bot/)).toBeTruthy()
  })

  it('shows an empty state', async () => {
    mockDaemon([])
    render(<Inbox />)
    expect(await screen.findByText(/Nothing here/)).toBeTruthy()
  })
})

describe('InboxBadge', () => {
  it('shows how many items need a person, and nothing at zero', async () => {
    mockDaemon([approvalItem(), failureItem()])
    const { unmount } = render(<InboxBadge />)
    expect(await screen.findByLabelText('2 need you')).toBeTruthy()
    unmount()
    mockDaemon([failureItem({ status: 'done' })])
    const { container } = render(<InboxBadge />)
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('.nav-badge')).toBeNull()
  })
})
