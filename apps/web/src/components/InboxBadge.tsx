import { useEffect, useState } from 'react'
import type { InboxResponse } from '@junos/shared'
import { useAuth } from '../lib/auth'
import { useDaemon } from '../lib/daemon'

/** How many items need a person, on the Inbox entry of the sidebar. Hidden at zero. */
export default function InboxBadge() {
  const { api } = useAuth()
  const { lastSeq } = useDaemon()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/inbox')
        if (!res.ok) return
        const body = (await res.json()) as InboxResponse
        if (!cancelled) setCount(body.counts.needsMe)
      } catch {
        /* no badge while junosd is unreachable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, lastSeq])

  if (count === 0) return null
  return (
    <span className="nav-badge" aria-label={`${count} need you`}>
      {count}
    </span>
  )
}
