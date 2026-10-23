import { NavLink, Route, Routes } from 'react-router-dom'

// Hermes gets its own sub-app with tabs, so it can grow into a full interface.
const tabs = [
  { to: '/hermes', label: 'Console' },
  { to: '/hermes/tasks', label: 'Tasks' },
  { to: '/hermes/memory', label: 'Memory' },
  { to: '/hermes/settings', label: 'Settings' },
]

function Placeholder({ title }: { title: string }) {
  return <div className="panel muted">{title} coming soon.</div>
}

export default function Hermes() {
  return (
    <section>
      <h1>Hermes agent</h1>
      <div className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.label} to={t.to} end className="tab">{t.label}</NavLink>
        ))}
      </div>
      <Routes>
        <Route index element={<Placeholder title="Live console" />} />
        <Route path="tasks" element={<Placeholder title="Agent tasks" />} />
        <Route path="memory" element={<Placeholder title="Agent memory" />} />
        <Route path="settings" element={<Placeholder title="Agent settings" />} />
      </Routes>
    </section>
  )
}
