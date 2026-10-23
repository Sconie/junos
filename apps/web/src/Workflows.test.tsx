import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkflowRunRecord, WorkflowSummary } from '@junos/shared'
import Workflows from './pages/Workflows'

const wf = (over: Partial<WorkflowSummary> = {}): WorkflowSummary => ({
  id: 'morning-briefing',
  name: 'Morning briefing',
  description: 'A short briefing for your day.',
  version: 1,
  params: [],
  triggers: [{ type: 'manual' }],
  valid: true,
  errors: [],
  upgradedFrom: null,
  paused: false,
  pausedReason: null,
  running: false,
  lastRun: null,
  ...over,
})

const run = (over: Partial<WorkflowRunRecord> = {}): WorkflowRunRecord => ({
  id: '33333333-3333-4333-8333-333333333333',
  workflowId: 'morning-briefing',
  name: 'Morning briefing',
  version: 1,
  status: 'succeeded',
  trigger: 'manual',
  dryRun: false,
  params: {},
  startedAt: '2026-10-22T08:00:00.000Z',
  finishedAt: '2026-10-22T08:00:20.000Z',
  error: null,
  currentStep: null,
  approvalId: null,
  chain: [],
  steps: [
    { seq: 0, stepId: 'briefing', type: 'prompt', status: 'succeeded', output: 'Here is your briefing.', error: null, startedAt: null, finishedAt: null },
    { seq: 1, stepId: 'post', type: 'output', status: 'succeeded', output: 'Added to the Inbox.', error: null, startedAt: null, finishedAt: null },
  ],
  ...over,
})

interface Daemon {
  workflows?: WorkflowSummary[]
  runs?: WorkflowRunRecord[]
  paused?: boolean
  /** Reply for /workflows/validate. */
  verdict?: { valid: boolean; errors: string[]; upgradedFrom: number | null }
  startStatus?: number
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
      if (path === '/workflows' && method === 'GET') return json({ workflows: opts.workflows ?? [], paused: opts.paused ?? false })
      if (path === '/workflow-runs') return json({ runs: opts.runs ?? [] })
      if (path === '/workflows/validate') return json(opts.verdict ?? { valid: true, errors: [], upgradedFrom: null })
      if (path === '/workflows' && method === 'POST') return json(wf({ id: 'new-one' }), 201)
      if (/^\/workflows\/[^/]+\/run$/.test(path)) return opts.startStatus ? json({ error: 'x', message: 'Not started: it already ran 10 times in the last hour.' }, opts.startStatus) : json(run(), 202)
      if (/^\/workflows\/[^/]+$/.test(path) && method === 'GET') return json({ ...wf(), yaml: 'version: 1\nname: Morning briefing\n' })
      return json({}, 200)
    }),
  )
  return calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Workflows', () => {
  it('shows each workflow as a launcher card with its state and triggers', async () => {
    mockDaemon({
      workflows: [
        wf(),
        wf({ id: 'echo', name: 'Echo', paused: true, pausedReason: 'Paused because it was started by something it caused itself.', triggers: [{ type: 'event', event: 'inbox.item.created', where: { kind: 'result' } }] }),
        wf({ id: 'broken', name: 'Broken', valid: false, errors: ['step "a": unknown tool "rm".'] }),
        wf({ id: 'old', name: 'Old', upgradedFrom: 0, triggers: [{ type: 'manual' }, { type: 'cron', expr: '0 9 * * *', timezone: 'UTC' }] }),
      ],
    })
    render(<Workflows />)
    const ready = await screen.findByRole('article', { name: 'Morning briefing' })
    expect(within(ready).getByText('Ready')).toBeTruthy()
    expect(within(ready).getByText('By hand')).toBeTruthy()
    const echo = screen.getByRole('article', { name: 'Echo' })
    expect(within(echo).getAllByText('Paused').length).toBeGreaterThan(0)
    expect(within(echo).getByText(/started by something it caused itself/)).toBeTruthy()
    expect(within(echo).getByText(/When inbox.item.created \(kind=result\)/)).toBeTruthy()
    expect((within(echo).getByRole('button', { name: 'Run' }) as HTMLButtonElement).disabled).toBe(true)
    const broken = screen.getByRole('article', { name: 'Broken' })
    expect(within(broken).getByText(/unknown tool "rm"/)).toBeTruthy()
    expect((within(broken).getByRole('button', { name: 'Run' }) as HTMLButtonElement).disabled).toBe(true)
    const old = screen.getByRole('article', { name: 'Old' })
    expect(within(old).getByText(/Upgraded from format version 0/)).toBeTruthy()
    expect(within(old).getByText(/Schedule 0 9 \* \* \* \(UTC\)/)).toBeTruthy()
  })

  it('asks for the parameters, offers a dry run, and starts the run', async () => {
    const calls = mockDaemon({ workflows: [wf({ id: 'summarise-file', name: 'Summarise file', params: [{ key: 'path', label: 'File to summarise', type: 'file', required: true }] })] })
    render(<Workflows />)
    fireEvent.click(await screen.findByRole('button', { name: 'Run' }))
    const form = await screen.findByRole('form', { name: 'Run Summarise file' })
    fireEvent.change(within(form).getByLabelText(/File to summarise/), { target: { value: 'notes.txt' } })
    fireEvent.click(within(form).getByLabelText(/Dry run/))
    fireEvent.click(within(form).getByRole('button', { name: 'Start dry run' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/workflows/summarise-file/run')).toBeTruthy())
    expect(calls.find((c) => c.path === '/workflows/summarise-file/run')!.body).toEqual({ params: { path: 'notes.txt' }, dryRun: true })
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Run Summarise file' })).toBeNull())
  })

  it('says why a run did not start', async () => {
    mockDaemon({ workflows: [wf()], startStatus: 429 })
    render(<Workflows />)
    fireEvent.click(await screen.findByRole('button', { name: 'Run' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Start' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/already ran 10 times in the last hour/)
  })

  it('checks the YAML as it is typed and only lets a valid workflow be created', async () => {
    mockDaemon({ verdict: { valid: false, errors: ['steps must be a list of 1 to 30 steps.'], upgradedFrom: null } })
    render(<Workflows />)
    fireEvent.click(await screen.findByRole('button', { name: 'New workflow' }))
    const form = await screen.findByRole('form', { name: 'New workflow' })
    expect(await within(form).findByText('steps must be a list of 1 to 30 steps.')).toBeTruthy()
    expect((within(form).getByRole('button', { name: 'Create workflow' }) as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    vi.unstubAllGlobals()

    const ok = mockDaemon({ verdict: { valid: true, errors: [], upgradedFrom: null } })
    render(<Workflows />)
    fireEvent.click(await screen.findByRole('button', { name: 'New workflow' }))
    const good = await screen.findByRole('form', { name: 'New workflow' })
    await waitFor(() => expect((within(good).getByRole('button', { name: 'Create workflow' }) as HTMLButtonElement).disabled).toBe(false))
    expect(within(good).getByText('Valid.')).toBeTruthy()
    fireEvent.click(within(good).getByRole('button', { name: 'Create workflow' }))
    await waitFor(() => expect(ok.find((c) => c.path === '/workflows' && c.method === 'POST')).toBeTruthy())
    expect(ok.find((c) => c.path === '/workflows' && c.method === 'POST')!.body.yaml).toMatch(/^version: 1/)
  })

  it('shows a run with each step, its output, and Cancel while it waits for an approval', async () => {
    const calls = mockDaemon({
      workflows: [wf()],
      runs: [
        run({ status: 'waiting_approval', approvalId: 'a1', steps: [{ seq: 0, stepId: 'ask', type: 'approval', status: 'running', output: null, error: null, startedAt: null, finishedAt: null }] }),
        run({ id: '44444444-4444-4444-8444-444444444444', dryRun: true }),
      ],
    })
    render(<Workflows />)
    const cards = await screen.findAllByRole('article', { name: 'Morning briefing run' })
    expect(within(cards[0]!).getByText(/Waiting for your approval/)).toBeTruthy()
    fireEvent.click(within(cards[0]!).getByRole('button', { name: 'Cancel run' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/workflow-runs/33333333-3333-4333-8333-333333333333/cancel')).toBeTruthy())
    expect(within(cards[1]!).getByText(/dry run/)).toBeTruthy()
    expect(within(cards[1]!).getByText('Here is your briefing.')).toBeTruthy()
    expect(within(cards[1]!).queryByRole('button', { name: 'Cancel run' })).toBeNull()
  })

  it('pauses and resumes a workflow', async () => {
    const calls = mockDaemon({ workflows: [wf(), wf({ id: 'echo', name: 'Echo', paused: true })] })
    render(<Workflows />)
    const ready = await screen.findByRole('article', { name: 'Morning briefing' })
    fireEvent.click(within(ready).getByRole('button', { name: 'Pause' }))
    fireEvent.click(within(screen.getByRole('article', { name: 'Echo' })).getByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(calls.some((c) => c.path === '/workflows/morning-briefing/pause')).toBe(true))
    expect(calls.some((c) => c.path === '/workflows/echo/resume')).toBe(true)
  })
})
