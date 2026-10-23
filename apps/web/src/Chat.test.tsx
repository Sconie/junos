import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversationRecord, MessageRecord } from '@junos/shared'
import Chat from './pages/Chat'

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const conv = (over: Partial<ConversationRecord> = {}): ConversationRecord => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Earlier chat',
  kind: 'chat',
  provider: 'claude',
  model: '',
  effort: 'medium',
  allowedProviders: ['claude'],
  createdAt: '2026-10-22T10:00:00Z',
  updatedAt: '2026-10-22T10:00:00Z',
  ...over,
})
const msg = (over: Partial<MessageRecord>): MessageRecord => ({
  id: 'm1',
  conversationId: conv().id,
  role: 'user',
  provider: null,
  model: null,
  effort: null,
  content: '',
  thinking: '',
  status: 'complete',
  error: null,
  runId: null,
  createdAt: '2026-10-22T10:00:00Z',
  ...over,
})

/** A stand-in for EventSource that the test can drive. */
class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  onmessage: ((m: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  listeners = new Map<string, () => void>()
  closed = false
  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, fn)
  }
  close() {
    this.closed = true
  }
  emit(event: unknown) {
    this.onmessage?.({ data: JSON.stringify(event) })
  }
  end() {
    this.listeners.get('end')?.()
  }
}

interface Daemon {
  available?: boolean
  acknowledged?: boolean
  conversations?: ConversationRecord[]
  details?: Record<string, MessageRecord[]>
  sendStatus?: number
  sendBody?: unknown
}

function mockDaemon(opts: Daemon = {}) {
  const calls: Array<{ path: string; method: string; body?: unknown }> = []
  let acknowledged = opts.acknowledged ?? true
  // What the daemon has stored, so a reload after a send sees the new messages like the real one does.
  const stored: Record<string, MessageRecord[]> = { ...(opts.details ?? {}) }
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path, method, body })
      if (path === '/chat/models') {
        return json({
          providers: [{ provider: 'claude', source: 'static', models: ['', 'opus', 'sonnet'].map((id) => ({ id, label: id || 'Default', efforts: EFFORTS })) }],
          acknowledged: acknowledged ? ['claude'] : [],
          status: [{ provider: 'claude', available: opts.available ?? true, reason: 'The Claude CLI was not found. Install Claude Code and run `claude login`.' }],
        })
      }
      if (path === '/conversations' && method === 'GET') return json({ conversations: opts.conversations ?? [] })
      if (path === '/conversations' && method === 'POST') return json(conv({ id: '22222222-2222-4222-8222-222222222222', title: 'New chat' }), 201)
      const m = /^\/conversations\/([^/]+)(\/messages)?$/.exec(path)
      if (m && !m[2]) {
        const found = (opts.conversations ?? []).find((c) => c.id === m[1]) ?? conv({ id: m[1]! })
        return json({ conversation: found, messages: stored[m[1]!] ?? [] })
      }
      if (m && m[2]) {
        if (!acknowledged) return json({ status: 'disclosure_required', provider: 'claude', text: 'This conversation is sent to Claude (Anthropic).' }, 409)
        if (opts.sendStatus && opts.sendStatus !== 201) return json(opts.sendBody ?? { error: 'busy', message: 'A reply is still being written.' }, opts.sendStatus)
        const userMessage = msg({ id: 'u1', content: body.content })
        const assistantMessage = msg({ id: 'a1', role: 'assistant', provider: 'claude', model: body.model, effort: body.effort, status: 'streaming', runId: '33333333-3333-4333-8333-333333333333' })
        stored[m[1]!] = [...(stored[m[1]!] ?? []), userMessage, assistantMessage]
        return json({ status: 'started', runId: '33333333-3333-4333-8333-333333333333', userMessage, assistantMessage }, 201)
      }
      if (path === '/chat/disclosures/claude/ack') {
        acknowledged = true
        return json({ acknowledged: ['claude'] })
      }
      return json({ error: 'not found' }, 404)
    }),
  )
  return calls
}

beforeEach(() => {
  FakeEventSource.instances = []
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const type = (text: string) => fireEvent.change(screen.getByLabelText('Message'), { target: { value: text } })

describe('Chat', () => {
  it('starts empty and lets the model and effort be picked', async () => {
    mockDaemon()
    render(<Chat />)
    expect(await screen.findByText('Start a conversation.')).toBeTruthy()
    const model = (await screen.findByLabelText('Model')) as HTMLSelectElement
    await waitFor(() => expect(within(model).getAllByRole('option').map((o) => o.textContent)).toEqual(['Default', 'opus', 'sonnet']))
    const effort = screen.getByRole('group', { name: 'Effort' })
    expect(within(effort).getAllByRole('button').map((b) => b.textContent)).toEqual(['Low', 'Medium', 'High', 'XHigh', 'Max'])
    expect(within(effort).getByRole('button', { name: 'Medium' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('sends the chosen model and effort, then streams the reply into the bubble', async () => {
    const calls = mockDaemon()
    render(<Chat />)
    fireEvent.change(await screen.findByLabelText('Model'), { target: { value: 'opus' } })
    fireEvent.click(within(screen.getByRole('group', { name: 'Effort' })).getByRole('button', { name: 'High' }))
    type('hello there')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(FakeEventSource.instances.length).toBe(1))
    const sent = calls.find((c) => c.path.endsWith('/messages'))!
    expect(sent.body).toEqual({ content: 'hello there', model: 'opus', effort: 'high' })
    expect(FakeEventSource.instances[0]!.url).toBe('/api/runs/33333333-3333-4333-8333-333333333333/stream')

    const es = FakeEventSource.instances[0]!
    act(() => es.emit({ type: 'token', text: 'echo: ' }))
    act(() => es.emit({ type: 'token', text: 'hello there' }))
    expect(await screen.findByText('echo: hello there')).toBeTruthy()
    expect(screen.getByText('hello there')).toBeTruthy()
    expect(screen.getByText(/claude · opus · high · via subscription/)).toBeTruthy()
  })

  it('shows thinking separately from the answer', async () => {
    mockDaemon()
    render(<Chat />)
    type('q')
    fireEvent.click(await screen.findByRole('button', { name: 'Send' }))
    await waitFor(() => expect(FakeEventSource.instances.length).toBe(1))
    act(() => FakeEventSource.instances[0]!.emit({ type: 'thinking', text: 'pondering' }))
    act(() => FakeEventSource.instances[0]!.emit({ type: 'token', text: 'answer' }))
    expect(await screen.findByText('pondering')).toBeTruthy()
    expect(screen.getByText('Thinking')).toBeTruthy()
    expect(screen.getByText('answer')).toBeTruthy()
  })

  it('asks for the provider disclosure the first time and sends only after Continue', async () => {
    const calls = mockDaemon({ acknowledged: false })
    render(<Chat />)
    type('first message')
    fireEvent.click(await screen.findByRole('button', { name: 'Send' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('sent to Claude')
    expect(FakeEventSource.instances.length).toBe(0)
    fireEvent.click(within(alert).getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(FakeEventSource.instances.length).toBe(1))
    expect(calls.some((c) => c.path === '/chat/disclosures/claude/ack' && c.method === 'POST')).toBe(true)
    expect(calls.filter((c) => c.path.endsWith('/messages')).length).toBe(2)
  })

  it('Enter sends and Shift+Enter does not', async () => {
    const calls = mockDaemon()
    render(<Chat />)
    const box = await screen.findByLabelText('Message')
    type('line one')
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true })
    expect(calls.some((c) => c.path.endsWith('/messages'))).toBe(false)
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/messages'))).toBe(true))
  })

  it('explains why it cannot send when the CLI is missing, and disables the composer', async () => {
    mockDaemon({ available: false })
    render(<Chat />)
    expect((await screen.findByRole('alert')).textContent).toContain('Cannot send: The Claude CLI was not found')
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows a refused send as a message instead of failing silently', async () => {
    mockDaemon({ sendStatus: 409 })
    render(<Chat />)
    type('hi')
    fireEvent.click(await screen.findByRole('button', { name: 'Send' }))
    expect((await screen.findByRole('alert')).textContent).toContain('still being written')
    expect(FakeEventSource.instances.length).toBe(0)
  })

  it('loads saved history when an earlier chat is opened, including partial and failed replies', async () => {
    const c = conv()
    mockDaemon({
      conversations: [c],
      details: {
        [c.id]: [
          msg({ id: 'u1', content: 'what is 2+2' }),
          msg({ id: 'a1', role: 'assistant', provider: 'claude', model: 'opus', effort: 'high', content: '4', status: 'complete' }),
          msg({ id: 'u2', content: 'write a poem' }),
          msg({ id: 'a2', role: 'assistant', provider: 'claude', model: 'opus', effort: 'high', content: 'Roses are', status: 'partial' }),
          msg({ id: 'u3', content: 'again' }),
          msg({ id: 'a3', role: 'assistant', provider: 'claude', model: 'opus', effort: 'high', content: '', status: 'error', error: 'You have reached your usage limit.' }),
        ],
      },
    })
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: 'Earlier chat' }))
    expect(await screen.findByText('what is 2+2')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText('Roses are')).toBeTruthy()
    expect(screen.getByText('Stopped. This is what was written.')).toBeTruthy()
    expect(screen.getByText('You have reached your usage limit.')).toBeTruthy()
  })

  it('re-attaches to a reply that is still streaming after a page reload', async () => {
    const c = conv()
    mockDaemon({
      conversations: [c],
      details: { [c.id]: [msg({ id: 'u1', content: 'long one' }), msg({ id: 'a1', role: 'assistant', provider: 'claude', status: 'streaming', runId: '44444444-4444-4444-8444-444444444444' })] },
    })
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: 'Earlier chat' }))
    await waitFor(() => expect(FakeEventSource.instances.length).toBe(1))
    expect(FakeEventSource.instances[0]!.url).toBe('/api/runs/44444444-4444-4444-8444-444444444444/stream')
    expect(await screen.findByRole('button', { name: 'Stop' })).toBeTruthy()
  })

  it('renders model output as plain text, never as HTML', async () => {
    const c = conv()
    mockDaemon({
      conversations: [c],
      details: { [c.id]: [msg({ id: 'a1', role: 'assistant', provider: 'claude', content: '<img src=x onerror="alert(1)"><b>bold</b>', status: 'complete' })] },
    })
    const { container } = render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: 'Earlier chat' }))
    await screen.findByText(/<img src=x/)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.bubble-text b')).toBeNull()
  })
})
