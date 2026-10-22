import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGate } from './lib/auth'
import Pair from './pages/Pair'
import { DaemonStatus } from './lib/daemon'

type Call = { path: string; method: string; headers: Headers; body?: string }

/** A tiny stand-in for junosd's pairing endpoints. */
function fakeDaemon(options: { paired?: boolean; code?: string; logoutStatus?: number } = {}) {
  const calls: Call[] = []
  let paired = options.paired ?? false
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input)
      calls.push({ path, method: init.method ?? 'GET', headers: new Headers(init.headers), body: init.body as string | undefined })
      if (path === '/api/session') return json(paired ? { paired: true, csrf: 'tok' } : { paired: false })
      if (path === '/api/pair') {
        const code = JSON.parse(init.body as string).code
        if (code !== options.code) return json({ error: 'invalid' }, 401)
        paired = true
        return json({ paired: true, csrf: 'tok' })
      }
      if (path === '/api/session/logout') {
        const status = options.logoutStatus ?? 200
        if (status === 200) paired = false
        return json(status === 200 ? { paired: false } : { error: 'boom' }, status)
      }
      return json({ error: 'not found' }, 404)
    }),
  )
  return calls
}

function renderGate() {
  render(
    <AuthGate pairing={<Pair />}>
      <p>the app</p>
    </AuthGate>,
  )
}

beforeEach(() => vi.unstubAllGlobals())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('pairing flow', () => {
  it('shows the pairing screen to an unpaired browser, not the app', async () => {
    fakeDaemon()
    renderGate()
    expect(await screen.findByRole('heading', { name: 'Pair this browser' })).toBeTruthy()
    expect(screen.queryByText('the app')).toBeNull()
  })

  it('shows the app straight away when the browser is already paired', async () => {
    fakeDaemon({ paired: true })
    renderGate()
    expect(await screen.findByText('the app')).toBeTruthy()
  })

  it('keeps the Pair button disabled until a full code is typed', async () => {
    fakeDaemon()
    renderGate()
    const button = (await screen.findByRole('button', { name: 'Pair' })) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Pairing code'), { target: { value: 'ABCD-EFGH' } })
    expect(button.disabled).toBe(false)
  })

  it('explains a wrong code and clears the field', async () => {
    fakeDaemon({ code: 'ABCD-EFGH' })
    renderGate()
    const input = (await screen.findByLabelText('Pairing code')) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ZZZZ-ZZZZ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pair' }))
    expect((await screen.findByRole('alert')).textContent).toContain('not right')
    expect(input.value).toBe('')
    expect(screen.queryByText('the app')).toBeNull()
  })

  it('pairs with the right code and then shows the app', async () => {
    const calls = fakeDaemon({ code: 'ABCD-EFGH' })
    renderGate()
    fireEvent.change(await screen.findByLabelText('Pairing code'), { target: { value: 'ABCD-EFGH' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pair' }))
    expect(await screen.findByText('the app')).toBeTruthy()
    const pairCall = calls.find((c) => c.path === '/api/pair')!
    expect(pairCall.method).toBe('POST')
    expect(JSON.parse(pairCall.body!)).toEqual({ code: 'ABCD-EFGH' })
  })

  it('never keeps the code or token in browser storage', async () => {
    fakeDaemon({ code: 'ABCD-EFGH' })
    renderGate()
    fireEvent.change(await screen.findByLabelText('Pairing code'), { target: { value: 'ABCD-EFGH' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pair' }))
    await screen.findByText('the app')
    await waitFor(() => {
      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)
    })
  })
})

describe('unpair', () => {
  function renderStatus() {
    render(
      <AuthGate pairing={<Pair />}>
        <DaemonStatus />
      </AuthGate>,
    )
  }

  it('goes back to the pairing screen once the daemon confirms', async () => {
    fakeDaemon({ paired: true })
    renderStatus()
    fireEvent.click(await screen.findByRole('button', { name: 'Unpair' }))
    expect(await screen.findByRole('heading', { name: 'Pair this browser' })).toBeTruthy()
  })

  it('keeps the session and says so when the daemon could not revoke it', async () => {
    fakeDaemon({ paired: true, logoutStatus: 500 })
    renderStatus()
    fireEvent.click(await screen.findByRole('button', { name: 'Unpair' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Could not unpair')
    expect(screen.queryByRole('heading', { name: 'Pair this browser' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Unpair' })).toBeTruthy()
  })
})
