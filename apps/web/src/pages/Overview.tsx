import { Link } from 'react-router-dom'

const cards = [
  { to: '/chat', title: 'Chat', body: 'Talk to any connected model, pick effort per message.' },
  { to: '/schedules', title: 'Scheduled', body: 'Crons and recurring tasks, with run history.' },
  { to: '/hermes', title: 'Hermes', body: 'Your Hermes agent: status, tasks, memory.' },
  { to: '/files', title: 'Files & projects', body: 'Everything you are working on, in one place.' },
  { to: '/connections', title: 'Connections', body: 'Link your subscriptions instead of API keys.' },
]

export default function Overview() {
  return (
    <section>
      <h1>Good to see you</h1>
      <p className="muted">Your command center. Every section below is an empty shell for now.</p>
      <div className="grid">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="card">
            <h3>{c.title}</h3>
            <p className="muted">{c.body}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
