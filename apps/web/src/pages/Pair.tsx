import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'

const MESSAGE = {
  invalid: 'That code is not right. Check it and try again.',
  expired: 'That code has expired. Restart junosd to get a new one.',
  locked: 'Too many wrong tries. junosd made a new code; read it from the console or the file below.',
  error: 'Could not reach junosd. Is it running?',
} as const

/** First-run screen: swap the one-time code junosd printed for a session cookie. */
export default function Pair() {
  const { pair } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<keyof typeof MESSAGE | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await pair(code)
    setBusy(false)
    if (result !== 'ok') {
      setError(result)
      setCode('')
    }
  }

  return (
    <div className="gate">
      <form className="panel pair" onSubmit={submit} aria-labelledby="pair-title">
        <h1 id="pair-title">Pair this browser</h1>
        <p className="muted">
          Enter the one-time code junosd printed in its console. It is also saved in <code>pairing-code.txt</code> in
          the junosd data folder (<code>~/.junos</code>) until you use it.
        </p>
        <label htmlFor="pair-code">Pairing code</label>
        <input
          id="pair-code"
          className="pair-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          maxLength={12}
        />
        {error && (
          <p className="pair-error" role="alert">
            {MESSAGE[error]}
          </p>
        )}
        <button className="primary" type="submit" disabled={busy || code.trim().length < 8}>
          {busy ? 'Pairing…' : 'Pair'}
        </button>
      </form>
    </div>
  )
}
