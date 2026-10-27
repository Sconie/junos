import { Suspense, lazy, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import CommandPalette from './components/CommandPalette'
import Chat from './pages/Chat'
import Schedules from './pages/Schedules'
import Workflows from './pages/Workflows'
import Board from './pages/Board'
import Scout from './pages/Scout'
import Backups from './pages/Backups'
// The terminal brings xterm.js with it, so it loads only when opened.
const Terminal = lazy(() => import('./pages/Terminal'))
import Hermes from './pages/Hermes'
import Files from './pages/Files'
import Connections from './pages/Connections'
import Approvals from './pages/Approvals'
import Inbox from './pages/Inbox'
import InboxBadge from './components/InboxBadge'
import StopControl from './components/StopControl'
import { DaemonBanner, DaemonStatus } from './lib/daemon'

const nav = [
  { to: '/', label: 'Home', icon: '◎' },
  { to: '/inbox', label: 'Inbox', icon: '✉' },
  { to: '/approvals', label: 'Approvals', icon: '✓' },
  { to: '/chat', label: 'Chat', icon: '✦' },
  { to: '/schedules', label: 'Scheduled', icon: '◷' },
  { to: '/board', label: 'Board', icon: '▥' },
  { to: '/scout', label: 'Scout', icon: '◈' },
  { to: '/workflows', label: 'Workflows', icon: '⇉' },
  { to: '/terminal', label: 'Terminal', icon: '>_' },
  { to: '/hermes', label: 'Hermes', icon: '⚚' },
  { to: '/files', label: 'Files & projects', icon: '▤' },
  { to: '/connections', label: 'Connections', icon: '⛓' },
  { to: '/backups', label: 'Backups', icon: '⤓' },
]

/** The four screens kept in the bar at the bottom of a phone; the rest open from "More". */
const PRIMARY = new Set(['/', '/inbox', '/chat', '/board'])

export default function App() {
  // Only used at phone width, where the sidebar becomes a bottom bar and a sheet for the other screens.
  // The sheet belongs to the screen it was opened on, so choosing another screen closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const { pathname } = useLocation()
  const more = openAt === pathname
  useEffect(() => {
    if (!more) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpenAt(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [more])
  return (
    <div className="shell">
      <aside className="sidebar" id="phone-sheet" data-more={more}>
        <div className="brand">JunOS</div>
        <nav>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={PRIMARY.has(item.to) ? 'nav-link' : 'nav-link nav-secondary'}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.to === '/inbox' && <InboxBadge />}
            </NavLink>
          ))}
          <button type="button" className="nav-link nav-more" aria-expanded={more} aria-controls="phone-sheet" onClick={() => setOpenAt(more ? null : pathname)}>
            <span className="nav-icon">{more ? '✕' : '⋯'}</span>
            {more ? 'Close' : 'More'}
          </button>
        </nav>
        <DaemonStatus />
      </aside>
      <main className="content">
        <div className="topbar">
          <CommandPalette />
          <StopControl />
        </div>
        <DaemonBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/board" element={<Board />} />
          <Route path="/scout" element={<Scout />} />
          <Route path="/backups" element={<Backups />} />
          <Route
            path="/terminal"
            element={
              <Suspense fallback={<p className="muted">Loading…</p>}>
                <Terminal />
              </Suspense>
            }
          />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/hermes/*" element={<Hermes />} />
          <Route path="/files" element={<Files />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
