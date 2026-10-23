import { useState } from 'react'
import { efforts, providers, type Effort } from '../lib/providers'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function Chat() {
  const [providerId, setProviderId] = useState(providers[0].id)
  const provider = providers.find((p) => p.id === providerId)!
  const [model, setModel] = useState(provider.models[0])
  const [effort, setEffort] = useState<Effort>('medium')
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')

  function changeProvider(id: string) {
    setProviderId(id)
    setModel(providers.find((p) => p.id === id)!.models[0])
  }

  function send() {
    if (!draft.trim()) return
    setMessages((m) => [
      ...m,
      { role: 'user', text: draft },
      { role: 'assistant', text: `(${provider.name} · ${model} · ${effort}) Not connected yet.` },
    ])
    setDraft('')
  }

  return (
    <section className="chat">
      <header className="toolbar">
        <select value={providerId} onChange={(e) => changeProvider(e.target.value)}>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {provider.models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="segmented">
          {efforts.map((e) => (
            <button key={e} className={e === effort ? 'active' : ''} onClick={() => setEffort(e)}>
              {e}
            </button>
          ))}
        </div>
      </header>
      <div className="messages">
        {messages.length === 0 && <p className="muted">Start a conversation.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
        ))}
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" />
        <button type="submit">Send</button>
      </form>
    </section>
  )
}
