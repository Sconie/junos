import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ScheduledRunRecord, TaskRecord } from '@junos/shared'
import Schedules from './pages/Schedules'

const run = (over: Partial<ScheduledRunRecord> = {}): ScheduledRunRecord => ({
  id: 'r1',
  taskId: 't1',
  dueAt: '2026-10-22T08:00:00.000Z',
  status: 'succeeded',
  attempt: 0,
  retryAt: null,
  manual: false,
  startedAt: '2026-10-22T08:00:01.000Z',
  finishedAt: '2026-10-22T08:00:20.000Z',
  error: null,
  output: 'Here is your briefing.',
  log: ['2026-10-22T08:00:01.000Z Started (attempt 1 of 3) on claude', '2026-10-22T08:00:20.000Z Finished, 22 characters'],
  runId: 'x',
  ...over,
})

const task = (over: Partial<TaskRecord> = {}): TaskRecord => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Morning briefing',
  prompt: 'Summarise the news',
  provider: 'claude',
  model: '',
  effort: 'medium',
  cron: '0 8 * * *',
  timezone: 'Europe/Copenhagen',
  catchUp: 'skip',
  overlap: 'skip',
  maxAttempts: 3,
  enabled: true,
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
  nextRuns: ['2026-10-23T06:00:00.000Z', '2026-10-24T06:00:00.000Z'],
  lastRun: run(),
  running: false,
  ...over,
})

interface Daemon {
  tasks?: TaskRecord[]
  paused?: boolean
  runs?: ScheduledRunRecord[]
  saveStatus?: number
  fail?: boolean
}

function mockDaemon(opts: Daemon = {}) {
  const calls: Array<{ path: string; method: string; body?: any }> = []
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const raw = String(input).replace(/^\/api/, '')
      const path = raw.split('?')[0]!
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path: raw, method, body })
      if (opts.fail && path === '/tasks') return json({ error: 'x' }, 500)
      if (path === '/tasks' && method === 'GET') return json({ tasks: opts.tasks ?? [], paused: opts.paused ?? false })
      if (path === '/tasks/preview') {
        const cron = new URLSearchParams(raw.split('?')[1]).get('cron') ?? ''
        if (/bad|\*\/5/.test(cron)) return json({ valid: false, error: 'Subscriptions have usage caps: a task cannot run more often than every 10 minutes.', nextRuns: [] })
        return json({ valid: true, error: null, nextRuns: ['2026-10-23T06:00:00.000Z', '2026-10-24T06:00:00.000Z', '2026-10-25T07:00:00.000Z', '2026-10-26T07:00:00.000Z', '2026-10-27T07:00:00.000Z'] })
      }
      if (path === '/chat/models') {
        return json({
          providers: [
            { provider: 'claude', source: 'static', models: [{ id: '', label: 'Default', efforts: ['low', 'medium', 'high', 'xhigh', 'max'] }, { id: 'opus', label: 'Opus', efforts: ['low', 'medium', 'high', 'xhigh', 'max'] }] },
            { provider: 'codex', source: 'static', models: [{ id: '', label: 'Default', efforts: ['low', 'medium', 'high', 'xhigh'] }] },
          ],
          acknowledged: [],
          status: [],
        })
      }
      if (path === '/tasks' && method === 'POST') return opts.saveStatus && opts.saveStatus !== 201 ? json({ error: 'bad_name', message: 'Give the task a name of up to 80 characters.' }, opts.saveStatus) : json(task({ id: '22222222-2222-4222-8222-222222222222' }), 201)
      const m = /^\/tasks\/([^/]+)(?:\/(\w+))?$/.exec(path)
      if (m) {
        if (m[2] === 'runs') return json({ runs: opts.runs ?? [] })
        if (method === 'PUT') return json(task())
        return json(task())
      }
      return json({ error: 'not found' }, 404)
    }),
  )
  return calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

describe('Scheduled tasks', () => {
  it('lists tasks with status, schedule, target, last run and next run', async () => {
    mockDaemon({ tasks: [task()] })
    render(<Schedules />)
    const row = (await screen.findByText('Morning briefing')).closest('tr') as HTMLElement
    expect(within(row).getByText('Active')).toBeTruthy()
    expect(within(row).getByText('0 8 * * *')).toBeTruthy()
    expect(within(row).getByText('Europe/Copenhagen')).toBeTruthy()
    expect(within(row).getByText(/Claude/)).toBeTruthy()
    expect(within(row).getByText(/succeeded/)).toBeTruthy()
  })

  it('has an empty state', async () => {
    mockDaemon({ tasks: [] })
    render(<Schedules />)
    expect(await screen.findByText(/No tasks here/)).toBeTruthy()
  })

  it('filters by Running, Paused and Failed', async () => {
    mockDaemon({
      tasks: [
        task({ id: 'a', name: 'Alpha', running: true }),
        task({ id: 'b', name: 'Beta', enabled: false, nextRuns: [] }),
        task({ id: 'c', name: 'Gamma', lastRun: run({ status: 'failed' }) }),
      ],
    })
    render(<Schedules />)
    await screen.findByText('Alpha')
    fireEvent.click(screen.getByRole('tab', { name: 'Running' }))
    expect(screen.queryByText('Beta')).toBeNull()
    expect(screen.getByText('Alpha')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Paused' }))
    expect(screen.getByText('Beta')).toBeTruthy()
    expect(screen.queryByText('Alpha')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Failed' }))
    expect(screen.getByText('Gamma')).toBeTruthy()
    expect(within(rowOf('Gamma')).getByText('Failed')).toBeTruthy()
  })

  it('runs now, pauses, resumes and deletes through the API', async () => {
    const calls = mockDaemon({ tasks: [task()] })
    render(<Schedules />)
    const row = (await screen.findByText('Morning briefing')).closest('tr') as HTMLElement
    const id = '11111111-1111-4111-8111-111111111111'
    fireEvent.click(within(row).getByRole('button', { name: 'Run now' }))
    await waitFor(() => expect(calls.some((c) => c.path === `/tasks/${id}/run` && c.method === 'POST')).toBe(true))
    fireEvent.click(within(row).getByRole('button', { name: 'Pause' }))
    await waitFor(() => expect(calls.some((c) => c.path === `/tasks/${id}/pause`)).toBe(true))
    fireEvent.click(within(row).getByRole('button', { name: 'Delete Morning briefing' }))
    await waitFor(() => expect(calls.some((c) => c.path === `/tasks/${id}` && c.method === 'DELETE')).toBe(true))
  })

  it('offers Resume for a paused task', async () => {
    const calls = mockDaemon({ tasks: [task({ enabled: false, nextRuns: [] })] })
    render(<Schedules />)
    fireEvent.click(await screen.findByRole('button', { name: 'Resume' }))
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/resume'))).toBe(true))
  })

  it('explains that nothing will start while Stop is in effect, and disables Run now', async () => {
    mockDaemon({ tasks: [task()], paused: true })
    render(<Schedules />)
    expect((await screen.findByRole('alert')).textContent).toContain('junosd is stopped')
    expect((screen.getByRole('button', { name: 'Run now' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('says so when the tasks cannot be loaded', async () => {
    mockDaemon({ fail: true })
    render(<Schedules />)
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load the tasks')
  })
})

describe('creating a task', () => {
  async function openForm() {
    const calls = mockDaemon({ tasks: [] })
    render(<Schedules />)
    fireEvent.click(await screen.findByRole('button', { name: 'New task' }))
    const form = await screen.findByRole('form', { name: 'New task' })
    return { calls, form }
  }
  const fill = (form: HTMLElement) => {
    fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Briefing' } })
    fireEvent.change(within(form).getByLabelText('Prompt'), { target: { value: 'Summarise the news' } })
  }

  it('builds a daily schedule from a time and shows the daemon\'s next five runs', async () => {
    const { calls, form } = await openForm()
    fill(form)
    fireEvent.change(within(form).getByLabelText('Time'), { target: { value: '07:30' } })
    expect(await within(form).findByLabelText('Next runs')).toBeTruthy()
    await waitFor(() => expect(within(within(form).getByLabelText('Next runs')).getAllByRole('listitem').length).toBe(5))
    fireEvent.click(within(form).getByRole('button', { name: 'Create task' }))
    await waitFor(() => expect(calls.some((c) => c.path === '/tasks' && c.method === 'POST')).toBe(true))
    const body = calls.find((c) => c.path === '/tasks' && c.method === 'POST')!.body
    expect(body).toMatchObject({ name: 'Briefing', prompt: 'Summarise the news', provider: 'claude', cron: '30 7 * * *', timezone: 'Europe/Copenhagen', catchUp: 'skip', overlap: 'skip', maxAttempts: 3, enabled: true })
  })

  it('builds weekly, hourly and custom schedules', async () => {
    const { calls, form } = await openForm()
    fill(form)
    fireEvent.click(within(form).getByRole('button', { name: 'Weekly' }))
    fireEvent.change(within(form).getByLabelText('Weekday'), { target: { value: '3' } })
    fireEvent.change(within(form).getByLabelText('Time'), { target: { value: '09:00' } })
    await waitFor(() => expect(within(form).getByText('0 9 * * 3')).toBeTruthy())
    fireEvent.click(within(form).getByRole('button', { name: 'Hourly' }))
    fireEvent.change(within(form).getByLabelText('Minute past the hour'), { target: { value: '15' } })
    await waitFor(() => expect(within(form).getByText('15 * * * *')).toBeTruthy())
    fireEvent.click(within(form).getByRole('button', { name: 'Custom' }))
    fireEvent.change(within(form).getByLabelText('Cron expression'), { target: { value: '0 6 * * 1-5' } })
    await waitFor(() => expect(calls.some((c) => c.path.includes('cron=0%206%20*%20*%201-5'))).toBe(true))
    fireEvent.click(within(form).getByRole('button', { name: 'Create task' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.path === '/tasks')?.body.cron).toBe('0 6 * * 1-5'))
  })

  it('shows why a schedule is refused and will not let it be saved', async () => {
    const { form } = await openForm()
    fill(form)
    fireEvent.click(within(form).getByRole('button', { name: 'Custom' }))
    fireEvent.change(within(form).getByLabelText('Cron expression'), { target: { value: '*/5 * * * *' } })
    expect(await within(form).findByText(/more often than every 10 minutes/)).toBeTruthy()
    expect((within(form).getByRole('button', { name: 'Create task' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('needs a name and a prompt', async () => {
    const { form } = await openForm()
    expect((within(form).getByRole('button', { name: 'Create task' }) as HTMLButtonElement).disabled).toBe(true)
    fill(form)
    await waitFor(() => expect((within(form).getByRole('button', { name: 'Create task' }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('shows what the daemon refused when saving fails', async () => {
    mockDaemon({ tasks: [], saveStatus: 400 })
    render(<Schedules />)
    fireEvent.click(await screen.findByRole('button', { name: 'New task' }))
    const form = await screen.findByRole('form', { name: 'New task' })
    fill(form)
    await waitFor(() => expect((within(form).getByRole('button', { name: 'Create task' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(within(form).getByRole('button', { name: 'Create task' }))
    expect((await within(form).findByText(/Give the task a name/)).tagName).toBe('P')
  })

  it('greys out the efforts Codex does not have and resets the model when the provider changes', async () => {
    const { form } = await openForm()
    await waitFor(() => expect(within(form).getAllByRole('option', { name: 'Opus' }).length).toBe(1))
    fireEvent.change(within(form).getByLabelText('Model'), { target: { value: 'opus' } })
    fireEvent.change(within(form).getByLabelText('Provider'), { target: { value: 'codex' } })
    expect((within(form).getByLabelText('Model') as HTMLSelectElement).value).toBe('')
    await waitFor(() => expect((within(form).getByRole('option', { name: 'Max' }) as HTMLOptionElement).disabled).toBe(true))
  })

  it('can be cancelled without saving', async () => {
    const { calls, form } = await openForm()
    fireEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('form', { name: 'New task' })).toBeNull())
    expect(calls.some((c) => c.method === 'POST' && c.path === '/tasks')).toBe(false)
  })
})

describe('editing and logs', () => {
  it('opens an existing task prefilled in the friendly builder and saves with PUT', async () => {
    const calls = mockDaemon({ tasks: [task()] })
    render(<Schedules />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const form = await screen.findByRole('form', { name: 'Edit task' })
    expect((within(form).getByLabelText('Name') as HTMLInputElement).value).toBe('Morning briefing')
    expect((within(form).getByLabelText('Time') as HTMLInputElement).value).toBe('08:00')
    fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Renamed' } })
    await waitFor(() => expect((within(form).getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ name: 'Renamed', cron: '0 8 * * *' }))
  })

  it('shows the run log: status, answer, errors and log lines', async () => {
    mockDaemon({
      tasks: [task()],
      runs: [run(), run({ id: 'r2', status: 'failed', dueAt: '2026-10-21T08:00:00.000Z', output: null, error: 'You have reached your usage limit.', attempt: 1, log: [] })],
    })
    render(<Schedules />)
    fireEvent.click(await screen.findByRole('button', { name: 'Logs' }))
    const logs = await screen.findByRole('complementary', { name: 'Logs for Morning briefing' })
    expect(await within(logs).findByText('Here is your briefing.')).toBeTruthy()
    expect(within(logs).getByText('succeeded')).toBeTruthy()
    expect(within(logs).getByText('failed')).toBeTruthy()
    expect(within(logs).getByText('You have reached your usage limit.')).toBeTruthy()
    expect(within(logs).getByText(/attempt 2/)).toBeTruthy()
    expect(within(logs).getByText('Log (2)')).toBeTruthy()
  })

  it('has an empty log state and can be closed', async () => {
    mockDaemon({ tasks: [task()], runs: [] })
    render(<Schedules />)
    fireEvent.click(await screen.findByRole('button', { name: 'Logs' }))
    expect(await screen.findByText('No runs yet.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('complementary', { name: /Logs for/ })).toBeNull())
  })
})
