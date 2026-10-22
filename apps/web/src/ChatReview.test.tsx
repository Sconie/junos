import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Chat from './pages/Chat'

/** A minimal EventSource and daemon, just enough for the regressions Bugbot found in the Chat screen. */
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

const RUN = '33333333-3333-4333-8333-333333333333'
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

const conv = (id: string, title: string, provider = 'claude') => ({
  id,
  title,
  kind: 'chat',
  provider,
  model: '',
  effort: 'medium',
  allowedProviders: [provider],
  createdAt: '2026-10-22T10:00:00Z',
  updatedAt: '2026-10-22T10:00:00Z',
})
const message = (over: Record<string, unknown>) => ({
  id: 'm',
  conversationId: A,
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

interface State {
  detailGate: Promise<void> | null
  detailFails: boolean
  /** What the daemon has saved for the assistant message once the run has ended. */
  finished: string | null
}

function mockDaemon(initial: { streamingA?: boolean } = {}) {
  const state: State = { detailGate: null, detailFails: false, finished: null }
  const calls: Array<{ path: string; method: string; body?: unknown }> = []
  const stored: Record<string, ReturnType<typeof message>[]> = {
    [A]: [
      message({ id: 'u1', conversationId: A, content: 'question' }),
      message({ id: 'a1', conversationId: A, role: 'assistant', provider: 'claude', status: initial.streamingA ? 'streaming' : 'complete', content: initial.streamingA ? '' : 'answer', runId: initial.streamingA ? RUN : null }),
    ],
    [B]: [message({ id: 'u2', conversationId: B, content: 'other question' }), message({ id: 'a2', conversationId: B, role: 'assistant', provider: 'claude', content: 'other answer' })],
  }
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
          providers: [{ provider: 'claude', source: 'static', models: [{ id: '', label: 'Default', efforts: ['low', 'medium', 'high', 'xhigh', 'max'] }] }],
          acknowledged: ['claude'],
          status: [{ provider: 'claude', available: true }],
        })
      }
      if (path === '/conversations' && method === 'GET') return json({ conversations: [conv(A, 'Chat A'), conv(B, 'Chat B')] })
      if (path === '/conversations' && method === 'POST') {
        const c = conv('44444444-4444-4444-8444-444444444444', 'New chat', body?.provider ?? 'claude')
        stored[c.id] = []
        return json(c, 201)
      }
      const m = /^\/conversations\/([^/]+)(\/messages)?$/.exec(path)
      if (m && !m[2]) {
        if (state.detailGate) await state.detailGate
        if (state.detailFails) return json({ error: 'boom' }, 500)
        const id = m[1]!
        const msgs = (stored[id] ?? []).map((x) => (state.finished !== null && x.status === 'streaming' ? { ...x, status: 'complete', content: state.finished } : x))
        return json({ conversation: conv(id, id === A ? 'Chat A' : id === B ? 'Chat B' : 'New chat'), messages: msgs })
      }
      if (m && m[2]) {
        const user = message({ id: 'u9', conversationId: m[1]!, content: body.content })
        const assistant = message({ id: 'a9', conversationId: m[1]!, role: 'assistant', provider: 'claude', status: 'streaming', runId: RUN })
        stored[m[1]!] = [...(stored[m[1]!] ?? []), user, assistant]
        return json({ status: 'started', runId: RUN, userMessage: user, assistantMessage: assistant }, 201)
      }
      return json({ error: 'not found' }, 404)
    }),
  )
  return { state, calls }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  FakeEventSource.instances = []
})

const type = (text: string) => fireEvent.change(screen.getByLabelText('Message'), { target: { value: text } })
const sendButton = () => screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement

describe('switching away from a streaming chat', () => {
  it('drops the stream and frees the composer for the other chat', async () => {
    mockDaemon({ streamingA: true })
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: 'Chat A' }))
    await waitFor(() => expect(FakeEventSource.instances.length).toBe(1))
    expect(await screen.findByRole('button', { name: 'Stop' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Chat B' }))
    expect(FakeEventSource.instances[0]!.closed).toBe(true)
    await screen.findByText('other answer')
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull()
    type('a question for B')
    expect(sendButton().disabled).toBe(false)
  })

  it('starts a new chat without creating it on the server until the first message, and frees the composer', async () => {
    const d = mockDaemon({ streamingA: true })
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: 'Chat A' }))
    await waitFor(() => expect(FakeEventSource.instances.length).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))
    expect(FakeEventSource.instances[0]!.closed).toBe(true)
    expect(d.calls.some((c) => c.path === '/conversations' && c.method === 'POST'), 'nothing is created yet').toBe(false)
    expect(await screen.findByText('Start a conversation.')).toBeTruthy()
    type('fresh start')
    expect(sendButton().disabled).toBe(false)
    fireEvent.click(sendButton())
    await waitFor(() => expect(d.calls.some((c) => c.path === '/conversations' && c.method === 'POST')).toBe(true))
  })
})

describe('a reply that has just finished', () => {
  async function sendAndStream() {
    const d = mockDaemon()
    render(<Chat />)
    type('hello')
    fireEvent.click(await screen.findByRole('button', { name: 'Send' }))
    await waitFor(() => expect(FakeEventSource.instances.length).toBe(1))
    act(() => FakeEventSource.instances[0]!.emit({ type: 'token', text: 'the full ' }))
    act(() => FakeEventSource.instances[0]!.emit({ type: 'token', text: 'answer' }))
    expect(await screen.findByText('the full answer')).toBeTruthy()
    return d
  }

  it('stays on screen until the saved history has loaded, then shows the saved text', async () => {
    const d = await sendAndStream()
    let release!: () => void
    d.state.detailGate = new Promise<void>((r) => (release = r))
    d.state.finished = 'the full answer'
    act(() => FakeEventSource.instances[0]!.end())
    // The reload is in flight: the bubble must not fall back to an empty "…".
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.getByText('the full answer')).toBeTruthy()
    expect(screen.queryByText('…')).toBeNull()
    release()
    await waitFor(() => expect(screen.getByText('the full answer')).toBeTruthy())
    await waitFor(() => expect(sendButton().disabled).toBe(true)) // draft is empty again, so Send is idle, not stuck
    type('next one')
    await waitFor(() => expect(sendButton().disabled).toBe(false))
  })

  it('does not stay stuck when the reload fails', async () => {
    const d = await sendAndStream()
    d.state.detailFails = true
    act(() => FakeEventSource.instances[0]!.end())
    await new Promise((r) => setTimeout(r, 50))
    type('try again')
    await waitFor(() => expect(sendButton().disabled).toBe(false))
  })
})
