import { providers } from '../lib/providers'

export default function Connections() {
  return (
    <section>
      <h1>Connections</h1>
      <p className="muted">Link existing subscriptions so chat runs on them instead of API keys.</p>
      <div className="grid">
        {providers.map((p) => (
          <div key={p.id} className="card">
            <h3>{p.name}</h3>
            <p className="muted">{p.connected ? 'Connected' : 'Not connected'}</p>
            <button disabled>Connect (soon)</button>
          </div>
        ))}
      </div>
    </section>
  )
}
