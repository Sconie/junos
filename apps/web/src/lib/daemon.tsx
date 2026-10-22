import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { API_PREFIX, RESYNC_EVENT, type JunosEvent } from '@junos/shared'

export type DaemonState = 'connecting' | 'connected' | 'reconnecting' | 'offline'

interface DaemonValue {
  state: DaemonState
  /** Highest event seq seen on the stream. */
  lastSeq: number
  /** Bumped when the daemon asks the client to refetch snapshots. */
  resyncs: number
}

const DaemonContext = createContext<DaemonValue>({ state: 'connecting', lastSeq: 0, resyncs: 0 })

// The daemon sends a heartbeat every few seconds; after a few failed attempts in a row the UI
// says it is offline and how to start it.
const OFFLINE_AFTER_ERRORS = 3
const STALE_AFTER_MS = 12_000
const RETRY_MS = 2_000

/** Owns the single SSE connection to junosd. The connected state is driven by the stream, not by polling. */
export function DaemonProvider({ children }: { children: ReactNode }) {
  const { recheck } = useAuth()
  const [state, setState] = useState<DaemonState>('connecting')
  const [lastSeq, setLastSeq] = useState(0)
  const [resyncs, setResyncs] = useState(0)

  useEffect(() => {
    let source: EventSource | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    let watchdog: ReturnType<typeof setTimeout> | undefined
    let errors = 0
    let last = 0
    let disposed = false

    const armWatchdog = () => {
      clearTimeout(watchdog)
      // Proxies can keep the browser side open after the daemon died; silence means disconnected.
      watchdog = setTimeout(() => fail(), STALE_AFTER_MS)
    }
    const fail = () => {
      source?.close()
      clearTimeout(watchdog)
      if (disposed) return
      errors += 1
      void recheck() // a revoked session also ends the stream; if so the pairing screen takes over
      setState(errors >= OFFLINE_AFTER_ERRORS ? 'offline' : 'reconnecting')
      retry = setTimeout(connect, RETRY_MS)
    }
    const connect = () => {
      // A fresh EventSource cannot send Last-Event-ID itself, so resume by query.
      source = new EventSource(`${API_PREFIX}/events?lastEventId=${last}`)
      armWatchdog()
      source.addEventListener('ready', () => {
        errors = 0
        setState('connected')
        armWatchdog()
      })
      source.addEventListener('heartbeat', armWatchdog)
      source.addEventListener(RESYNC_EVENT, (msg) => {
        // Replay was skipped (cursor ahead of a wiped stream, or a trimmed gap). Resume from
        // the server seq, which can be behind the id this tab has been advertising.
        const body = JSON.parse(msg.data) as { lastSeq: number }
        if (Number.isFinite(body.lastSeq) && body.lastSeq >= 0) {
          last = body.lastSeq
          setLastSeq(last)
        }
        setResyncs((n) => n + 1)
      })
      source.onmessage = (msg) => {
        const event = JSON.parse(msg.data) as JunosEvent
        // Events are at-least-once: only ever move forward.
        last = Math.max(last, event.seq)
        setLastSeq(last)
        armWatchdog()
      }
      source.onerror = fail
    }
    connect()
    return () => {
      disposed = true
      source?.close()
      clearTimeout(retry)
      clearTimeout(watchdog)
    }
  }, [recheck])

  const value = useMemo(() => ({ state, lastSeq, resyncs }), [state, lastSeq, resyncs])
  return <DaemonContext.Provider value={value}>{children}</DaemonContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useDaemon(): DaemonValue {
  return useContext(DaemonContext)
}

const LABEL: Record<DaemonState, string> = {
  connecting: 'Connecting to junosd…',
  connected: 'junosd connected',
  reconnecting: 'Reconnecting…',
  offline: 'junosd not running',
}

export function DaemonStatus() {
  const { state } = useDaemon()
  const { unpair } = useAuth()
  const [failed, setFailed] = useState(false)
  return (
    <div className="daemon-status" data-state={state} role="status">
      <span className="dot" aria-hidden="true" />
      <span>{LABEL[state]}</span>
      <button
        type="button"
        className="link"
        onClick={() => {
          setFailed(false)
          void unpair().then((ok) => setFailed(!ok))
        }}
      >
        Unpair
      </button>
      {failed && <span role="alert" className="daemon-unpair-error">Could not unpair. Try again.</span>}
    </div>
  )
}

export function DaemonBanner() {
  const { state } = useDaemon()
  if (state !== 'offline') return null
  return (
    <div className="daemon-banner" role="alert">
      junosd is not running. Start it with <code>npm run dev:daemon</code>.
    </div>
  )
}
