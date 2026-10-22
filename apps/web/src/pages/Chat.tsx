import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type {
  ConversationDetail,
  ConversationRecord,
  Effort,
  MessageRecord,
  ProviderModels,
  RunEvent,
  SendMessageResponse,
} from '@junos/shared'
import { useAuth } from '../lib/auth'

interface ModelsResponse {
  providers: ProviderModels[]
  acknowledged: string[]
  status: Array<{ provider: string; available: boolean; version?: string; reason?: string }>
}

interface Live {
  messageId: string
  text: string
  thinking: string
}

const EFFORT_LABEL: Record<Effort, string> = { low: 'Low', medium: 'Medium', high: 'High', xhigh: 'XHigh', max: 'Max' }

type ProviderChoice = 'claude' | 'codex'
const PROVIDER_LABEL: Record<ProviderChoice, string> = { claude: 'Claude', codex: 'Codex (ChatGPT)' }
const PLAN_LABEL: Record<ProviderChoice, string> = { claude: 'your Claude plan', codex: 'your ChatGPT plan' }

/** Chat with the connected provider: model and effort picker, streaming reply, history that survives a reload. */
export default function Chat() {
  const { api } = useAuth()
  const [models, setModels] = useState<ModelsResponse | null>(null)
  const [convs, setConvs] = useState<ConversationRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [live, setLive] = useState<Live | null>(null)
  const [draft, setDraft] = useState('')
  const [provider, setProvider] = useState<ProviderChoice>('claude')
  const [model, setModel] = useState('')
  const [effort, setEffort] = useState<Effort>('medium')
  const [disclosure, setDisclosure] = useState<{ provider: string; text: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [reload, setReload] = useState(0)
  const source = useRef<EventSource | null>(null)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  // Provider status and the model list.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/chat/models')
        if (res.ok && !cancelled) setModels((await res.json()) as ModelsResponse)
      } catch {
        /* the daemon banner says when junosd is unreachable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, reload])

  // The conversation list.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await api('/conversations')
        if (res.ok && !cancelled) setConvs(((await res.json()) as { conversations: ConversationRecord[] }).conversations)
      } catch {
        /* see above */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, reload])

  // The open conversation.
  useEffect(() => {
    if (!activeId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await api(`/conversations/${activeId}`)
        if (!res.ok || cancelled) return
        const d = (await res.json()) as ConversationDetail
        if (cancelled) return
        setDetail(d)
        setProvider(d.conversation.provider as ProviderChoice)
        setModel(d.conversation.model)
        setEffort(d.conversation.effort)
      } catch {
        /* see above */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, activeId, reload])

  const closeStream = useCallback(() => {
    source.current?.close()
    source.current = null
  }, [])
  useEffect(() => closeStream, [closeStream])

  /** Follow a run's output as it is written. When it ends (or the stream is gone) reload from the saved history. */
  const attach = useCallback(
    (runId: string, messageId: string) => {
      closeStream()
      setLive({ messageId, text: '', thinking: '' })
      const es = new EventSource(`/api/runs/${runId}/stream`)
      source.current = es
      es.onmessage = (msg) => {
        const event = JSON.parse(msg.data) as RunEvent
        if (event.type === 'token') setLive((l) => (l ? { ...l, text: l.text + event.text } : l))
        else if (event.type === 'thinking') setLive((l) => (l ? { ...l, thinking: l.thinking + event.text } : l))
      }
      const finish = () => {
        es.close()
        if (source.current === es) source.current = null
        setLive(null)
        refresh()
      }
      es.addEventListener('end', finish)
      es.onerror = finish
    },
    [closeStream, refresh],
  )

  // A reply that was still streaming when this page loaded: re-attach to it.
  const streamingMsg = detail?.messages.find((m) => m.status === 'streaming' && m.runId)
  const streamingRun = streamingMsg?.runId ?? null
  const streamingId = streamingMsg?.id ?? null
  useEffect(() => {
    if (streamingRun && streamingId && !source.current) attach(streamingRun, streamingId)
  }, [streamingRun, streamingId, attach])

  const claude = models?.providers.find((p) => p.provider === provider)
  const providerStatus = models?.status.find((s) => s.provider === provider)
  const unavailable = providerStatus && !providerStatus.available ? (providerStatus.reason ?? 'The provider is not available.') : null
  const efforts = claude?.models.find((m) => m.id === model)?.efforts ?? []
  const busy = sending || Boolean(streamingId) || live !== null
  // Messages stay with the provider they were started on (history replay to another is a later step).
  const providerLocked = (detail?.messages.length ?? 0) > 0

  function chooseProvider(next: ProviderChoice) {
    setProvider(next)
    const info = models?.providers.find((p) => p.provider === next)
    setModel('')
    if (info && !info.models[0]?.efforts.includes(effort)) setEffort('medium')
  }

  async function newChat() {
    const res = await api('/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider, model, effort }) })
    if (!res.ok) return setNotice('Could not start a new chat.')
    const conv = (await res.json()) as ConversationRecord
    setActiveId(conv.id)
    setDetail({ conversation: conv, messages: [] })
    refresh()
  }

  async function send() {
    const content = draft.trim()
    if (!content || busy) return
    setNotice(null)
    setSending(true)
    try {
      let id = activeId
      if (!id) {
        const created = await api('/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider, model, effort }) })
        if (!created.ok) return setNotice('Could not start a chat.')
        id = ((await created.json()) as ConversationRecord).id
        setActiveId(id)
      }
      const res = await api(`/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, model, effort, provider }),
      })
      const body = (await res.json()) as SendMessageResponse & { message?: string; error?: string }
      if (body.status === 'disclosure_required') {
        setDisclosure({ provider: body.provider, text: body.text })
        return
      }
      if (!res.ok || body.status !== 'started') {
        setNotice(body.message ?? 'Could not send that message.')
        return
      }
      setDraft('')
      setDetail((d) => ({
        conversation: d?.conversation ?? ({ id } as ConversationRecord),
        messages: [...(d?.messages ?? []), body.userMessage, body.assistantMessage],
      }))
      attach(body.runId, body.assistantMessage.id)
      refresh()
    } finally {
      setSending(false)
    }
  }

  async function acknowledge() {
    if (!disclosure) return
    await api(`/chat/disclosures/${disclosure.provider}/ack`, { method: 'POST' })
    setDisclosure(null)
    refresh()
    await send()
  }

  async function stopReply() {
    const runId = streamingRun
    if (runId) await api(`/runs/${runId}/stop`, { method: 'POST' })
    refresh()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter only sends (spec 04); Shift+Enter is a newline.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  const messages = detail?.messages ?? []

  return (
    <section className="chat chat-layout">
      <aside className="conv-list" aria-label="Conversations">
        <button type="button" className="primary" onClick={() => void newChat()}>
          New chat
        </button>
        <ul>
          {convs.map((c) => (
            <li key={c.id}>
              <button type="button" className="conv" aria-pressed={c.id === activeId} onClick={() => setActiveId(c.id)}>
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="chat-main">
        <header className="toolbar">
          <select value={provider} onChange={(e) => chooseProvider(e.target.value as ProviderChoice)} aria-label="Provider" disabled={busy || providerLocked}>
            {(Object.keys(PROVIDER_LABEL) as ProviderChoice[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABEL[p]}
              </option>
            ))}
          </select>
          <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model" disabled={busy}>
            {(claude?.models ?? [{ id: '', label: 'Default', efforts: [] }]).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="segmented" role="group" aria-label="Effort">
            {(['low', 'medium', 'high', 'xhigh', 'max'] as Effort[]).map((e) => (
              <button
                key={e}
                type="button"
                className={e === effort ? 'active' : ''}
                aria-pressed={e === effort}
                disabled={busy || !efforts.includes(e)}
                onClick={() => setEffort(e)}
              >
                {EFFORT_LABEL[e]}
              </button>
            ))}
          </div>
          <span className="muted chat-route">
            via {PLAN_LABEL[provider]} · may send to: {PROVIDER_LABEL[provider]} only
          </span>
        </header>

        <div className="messages" aria-live="polite">
          {messages.length === 0 && <p className="muted">Start a conversation.</p>}
          {messages.map((m) => (
            <Bubble key={m.id} message={m} live={live?.messageId === m.id ? live : null} />
          ))}
        </div>

        {disclosure && (
          <div className="disclosure panel" role="alert">
            <p>{disclosure.text}</p>
            <button type="button" className="primary" onClick={() => void acknowledge()}>
              Continue
            </button>
            <button type="button" onClick={() => setDisclosure(null)}>
              Cancel
            </button>
          </div>
        )}
        {unavailable && (
          <p className="approval-notice" role="alert">
            Cannot send: {unavailable}
          </p>
        )}
        {notice && (
          <p className="approval-notice" role="alert">
            {notice}
          </p>
        )}

        <form
          className="composer"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            void send()
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message…"
            rows={2}
            aria-label="Message"
            disabled={Boolean(unavailable)}
          />
          {streamingId ? (
            <button type="button" onClick={() => void stopReply()}>
              Stop
            </button>
          ) : (
            <button type="submit" className="primary" disabled={busy || !draft.trim() || Boolean(unavailable)}>
              Send
            </button>
          )}
        </form>
      </div>
    </section>
  )
}

/** Plain text on purpose: nothing a model writes is ever interpreted as HTML (spec 12). */
function Bubble({ message, live }: { message: MessageRecord; live: Live | null }) {
  const text = live ? live.text : message.content
  const thinking = live ? live.thinking : message.thinking
  const header =
    message.role === 'assistant' && message.provider
      ? `${message.provider} · ${message.model || 'default'} · ${message.effort ?? ''} · via subscription`
      : null
  return (
    <div className={`bubble ${message.role}`} data-status={message.status}>
      {header && <div className="bubble-head muted">{header}</div>}
      {thinking && (
        <details className="bubble-thinking">
          <summary>Thinking</summary>
          <p>{thinking}</p>
        </details>
      )}
      <div className="bubble-text">{text || (message.status === 'streaming' ? '…' : '')}</div>
      {message.status === 'partial' && <div className="bubble-note muted">Stopped. This is what was written.</div>}
      {message.status === 'error' && (
        <div className="bubble-note bubble-error" role="alert">
          {message.error ?? 'Something went wrong.'}
        </div>
      )}
    </div>
  )
}
