import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TerminalFrame, TerminalOverview, TerminalSession } from '@junos/shared'

// xterm draws to a canvas that jsdom does not have, so the terminal itself is replaced by a recorder.
const h = vi.hoisted(() => {
  interface FakeTerm {
    options: Record<string, unknown>
    written: string[]
    disposed: boolean
    cols: number
    rows: number
    typed?: (data: string) => void
  }
  const terms: FakeTerm[] = []
  const sources: Array<{ url: string; closed: boolean; onmessage: ((e: { data: string }) => void) | null }> = []
  return { terms, sources }
})

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    #t: (typeof h.terms)[number]
    constructor(options: Record<string, unknown>) {
      this.#t = { options, written: [], disposed: false, cols: 80, rows: 24 }
      h.terms.push(this.#t)
    }
    loadAddon() {}
    open() {}
    write(data: string) {
      this.#t.written.push(data)
    }
    onData(fn: (data: string) => void) {
      this.#t.typed = fn
      return { dispose: () => {} }
    }
    dispose() {
      this.#t.disposed = true
    }
  },
}))
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }))
vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

import Terminal from './pages/Terminal'

class FakeEventSource {
  url: string
  closed = false
  onmessage: ((e: { data: string }) => void) | null = null
  constructor(url: string) {
    this.url = url
    h.sources.push(this)
  }
  close() {
    this.closed = true
  }
}

const agent = (): TerminalSession => ({ id: 'agent', kind: 'agent', label: 'Agent', status: 'open', openedAt: '', readOnly: true, closeReason: null })
const tab = (over: Partial<TerminalSession> = {}): TerminalSession => ({ id: '11111111-1111-4111-8111-111111111111', kind: 'local', label: 'WSL', status: 'open', openedAt: '2026-10-23T08:00:00.000Z', readOnly: false, closeReason: null, ...over })

interface Daemon {
  sessions?: TerminalSession[]
  localAvailable?: boolean
  vps?: TerminalOverview['vps']
  openStatus?: number
}

function mockDaemon(opts: Daemon = {}) {
  const calls: Array<{ path: string; method: string; body?: any }> = []
  const state = { sessions: opts.sessions ?? [agent()] }
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path, method, body })
      if (path === '/terminal') {
        const overview: TerminalOverview = {
          sessions: state.sessions,
          local: { available: opts.localAvailable ?? true, reason: opts.localAvailable === false ? 'Terminal support (node-pty) could not be loaded on this machine.' : null, shell: 'WSL' },
          vps: opts.vps ?? { mode: 'none', reason: 'The VPS shell goes through the Hermes shim, which is not connected yet.' },
        }
        return json(overview)
      }
      if (path === '/terminal/sessions' && method === 'POST') {
        if (opts.openStatus) return json({ error: 'not_connected', message: 'The VPS shell goes through the Hermes shim, which is not connected yet.' }, opts.openStatus)
        const created = tab({ kind: body.kind, label: body.kind === 'vps' ? 'VPS' : 'WSL' })
        state.sessions = [...state.sessions.filter((s) => s.kind === 'agent'), created]
        return json(created, 201)
      }
      if (/^\/terminal\/sessions\/[^/]+$/.test(path) && method === 'DELETE') {
        state.sessions = state.sessions.filter((s) => path.endsWith(`/${s.id}`) === false)
        return json({ closed: true })
      }
      return json({ ok: true })
    }),
  )
  return calls
}

beforeEach(() => {
  h.terms.length = 0
  h.sources.length = 0
  vi.stubGlobal('EventSource', FakeEventSource)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const emit = (source: (typeof h.sources)[number], frame: TerminalFrame) => act(() => source.onmessage?.({ data: JSON.stringify(frame) }))

describe('Terminal page', () => {
  it('starts on the agent tab: read-only, with its output streamed in and nothing sent back', async () => {
    const calls = mockDaemon()
    render(<Terminal />)
    expect(await screen.findByRole('tab', { name: 'Agent (read-only)' })).toBeTruthy()
    await waitFor(() => expect(h.sources.length).toBe(1))
    expect(h.sources[0]!.url).toBe('/api/terminal/sessions/agent/stream')
    expect(h.terms[0]!.options).toMatchObject({ disableStdin: true, cursorBlink: false, convertEol: true })
    await emit(h.sources[0]!, { type: 'data', data: '[hermes] $ pwd\r\n' })
    expect(h.terms[0]!.written).toEqual(['[hermes] $ pwd\r\n'])
    h.terms[0]!.typed?.('rm -rf /\r')
    await new Promise((r) => setTimeout(r, 40))
    expect(calls.some((c) => c.path.endsWith('/input'))).toBe(false)
    expect(screen.getByText(/waits for your approval/)).toBeTruthy()
  })

  it('opens a PC tab, shows its output, and sends what you type in bursts, plus the size', async () => {
    const calls = mockDaemon()
    render(<Terminal />)
    fireEvent.click(await screen.findByRole('button', { name: 'New PC tab (WSL)' }))
    await screen.findByRole('tab', { name: 'WSL' })
    expect(calls.find((c) => c.path === '/terminal/sessions' && c.method === 'POST')!.body).toEqual({ kind: 'local' })
    await waitFor(() => expect(h.sources.some((s) => s.url.endsWith('/stream') && !s.url.includes('/agent/')) ).toBe(true))
    const mine = h.terms.at(-1)!
    expect(mine.options).toMatchObject({ disableStdin: false, cursorBlink: true })
    const source = h.sources.at(-1)!
    await emit(source, { type: 'data', data: 'ready> ' })
    expect(mine.written).toContain('ready> ')
    mine.typed?.('l')
    mine.typed?.('s')
    mine.typed?.('\r')
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/input'))).toBe(true))
    expect(calls.filter((c) => c.path.endsWith('/input'))).toHaveLength(1)
    expect(calls.find((c) => c.path.endsWith('/input'))!.body).toEqual({ data: 'ls\r' })
    expect(calls.find((c) => c.path.endsWith('/resize'))!.body).toEqual({ cols: 80, rows: 24 })
  })

  it('says why the VPS tab cannot open', async () => {
    mockDaemon({ openStatus: 503 })
    render(<Terminal />)
    expect(await screen.findByText(/VPS: The VPS shell goes through the Hermes shim/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'New VPS tab' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Hermes shim, which is not connected yet/)
    expect(screen.queryByRole('tab', { name: 'VPS' })).toBeNull()
  })

  it('returns to the agent tab and says why when a tab closes', async () => {
    mockDaemon({ sessions: [agent(), tab()] })
    render(<Terminal />)
    fireEvent.click(await screen.findByRole('tab', { name: 'WSL' }))
    await waitFor(() => expect(h.sources.some((s) => !s.url.includes('/agent/'))).toBe(true))
    await emit(h.sources.at(-1)!, { type: 'closed', reason: 'stopped' })
    expect((await screen.findByRole('status')).textContent).toBe('That tab closed (stopped).')
    expect(screen.getByRole('tab', { name: 'Agent (read-only)' }).getAttribute('aria-selected')).toBe('true')
    expect(h.sources.at(-2)!.closed).toBe(true)
  })

  it('closes a tab from its ×', async () => {
    const calls = mockDaemon({ sessions: [agent(), tab()] })
    render(<Terminal />)
    fireEvent.click(await screen.findByRole('button', { name: 'Close WSL' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'DELETE')).toBeTruthy())
    expect(calls.find((c) => c.method === 'DELETE')!.path).toBe('/terminal/sessions/11111111-1111-4111-8111-111111111111')
    await waitFor(() => expect(screen.queryByRole('tab', { name: 'WSL' })).toBeNull())
  })

  it('turns the PC tab off, with the reason, when terminal support is missing', async () => {
    mockDaemon({ localAvailable: false })
    render(<Terminal />)
    expect(await screen.findByText(/node-pty\) could not be loaded/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'New PC tab (WSL)' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('has no way to type into the agent tab and says agents cannot type into yours', async () => {
    mockDaemon({ sessions: [agent(), tab()] })
    render(<Terminal />)
    await screen.findByRole('tab', { name: 'Agent (read-only)' })
    expect(screen.getByText(/you cannot type in this tab, and they cannot type into your tabs|which you cannot type in and they cannot type into your tabs/)).toBeTruthy()
    const host = screen.getByLabelText('Agent terminal output')
    expect(within(host.parentElement!).queryByRole('textbox')).toBeNull()
  })
})
