import { Suspense, lazy } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Overview from './pages/Overview'
import Chat from './pages/Chat'
import Schedules from './pages/Schedules'
import Workflows from './pages/Workflows'
import Board from './pages/Board'
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
  { to: '/', label: 'Overview', icon: '◎' },
  { to: '/inbox', label: 'Inbox', icon: '✉' },
  { to: '/approvals', label: 'Approvals', icon: '✓' },
  { to: '/chat', label: 'Chat', icon: '✦' },
  { to: '/schedules', label: 'Scheduled', icon: '◷' },
  { to: '/board', label: 'Board', icon: '▥' },
  { to: '/workflows', label: 'Workflows', icon: '⇉' },
  { to: '/terminal', label: 'Terminal', icon: '>_' },
  { to: '/hermes', label: 'Hermes', icon: '⚚' },
  { to: '/files', label: 'Files & projects', icon: '▤' },
  { to: '/connections', label: 'Connections', icon: '⛓' },
]

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">JunOS</div>
        <nav>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.to === '/inbox' && <InboxBadge />}
            </NavLink>
          ))}
        </nav>
        <DaemonStatus />
      </aside>
      <main className="content">
        <div className="topbar">
          <StopControl />
        </div>
        <DaemonBanner />
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/board" element={<Board />} />
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
