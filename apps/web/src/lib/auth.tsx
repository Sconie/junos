import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { API_PREFIX, CSRF_HEADER, type SessionResponse } from '@junos/shared'

export type AuthState = 'loading' | 'offline' | 'unpaired' | 'paired'

interface AuthValue {
  state: AuthState
  /** fetch() for the daemon API: same-origin cookie, plus the CSRF header on writes. */
  api: (path: string, init?: RequestInit) => Promise<Response>
  /** Re-reads the session. Only ever flips the UI to "unpaired"; an unreachable daemon is the daemon banner's job. */
  recheck: () => Promise<void>
  pair: (code: string) => Promise<'ok' | 'invalid' | 'expired' | 'locked' | 'error'>
  unpair: () => Promise<void>
}

const AuthContext = createContext<AuthValue>({
  state: 'paired',
  api: (path, init) => fetch(`${API_PREFIX}${path}`, init),
  recheck: async () => {},
  pair: async () => 'error',
  unpair: async () => {},
})

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthValue {
  return useContext(AuthContext)
}

const OFFLINE_RETRY_MS = 3_000

/** Shows the children only for a paired browser. The CSRF token lives in memory, never in storage. */
export function AuthGate({ children, pairing }: { children: ReactNode; pairing: ReactNode }) {
  const [state, setState] = useState<AuthState>('loading')
  const csrf = useRef('')

  const api = useCallback((path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    if (csrf.current && (init.method ?? 'GET') !== 'GET') headers.set(CSRF_HEADER, csrf.current)
    return fetch(`${API_PREFIX}${path}`, { ...init, headers, credentials: 'same-origin' })
  }, [])

  const apply = useCallback((session: SessionResponse) => {
    csrf.current = session.csrf ?? ''
    setState(session.paired ? 'paired' : 'unpaired')
  }, [])

  const recheck = useCallback(async () => {
    try {
      const res = await api('/session')
      if (res.ok) apply((await res.json()) as SessionResponse)
    } catch {
      /* unreachable: leave the state alone */
    }
  }, [api, apply])

  useEffect(() => {
    if (state !== 'loading' && state !== 'offline') return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      try {
        const res = await api('/session')
        if (!res.ok) throw new Error(String(res.status))
        if (!cancelled) apply((await res.json()) as SessionResponse)
      } catch {
        if (cancelled) return
        setState('offline')
        timer = setTimeout(load, OFFLINE_RETRY_MS)
      }
    }
    void load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [state, api, apply])

  const pair = useCallback<AuthValue['pair']>(
    async (code) => {
      try {
        const res = await api('/pair', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        if (res.ok) {
          apply((await res.json()) as SessionResponse)
          return 'ok'
        }
        const { error } = (await res.json()) as { error?: string }
        return error === 'expired' || error === 'locked' ? error : res.status === 401 ? 'invalid' : 'error'
      } catch {
        return 'error'
      }
    },
    [api, apply],
  )

  const unpair = useCallback(async () => {
    await api('/session/logout', { method: 'POST' }).catch(() => undefined)
    csrf.current = ''
    setState('unpaired')
  }, [api])

  const value = useMemo(() => ({ state, api, recheck, pair, unpair }), [state, api, recheck, pair, unpair])

  let body: ReactNode
  if (state === 'paired') body = children
  else if (state === 'unpaired') body = pairing
  else if (state === 'offline') {
    body = (
      <div className="gate" role="alert">
        <div className="panel">
          <h1>junosd is not running</h1>
          <p className="muted">
            Start it with <code>npm run dev:daemon</code>. This page keeps trying.
          </p>
        </div>
      </div>
    )
  } else body = <div className="gate" role="status">Connecting to junosd…</div>

  return <AuthContext.Provider value={value}>{body}</AuthContext.Provider>
}
