// Subscriptions JunOS will route chat through instead of paid API keys.
// Nothing is wired up yet; `connected` is a placeholder until real auth exists.

export type Effort = 'low' | 'medium' | 'high' | 'max'

export interface Provider {
  id: string
  name: string
  models: string[]
  connected: boolean
}

export const efforts: Effort[] = ['low', 'medium', 'high', 'max']

export const providers: Provider[] = [
  { id: 'claude', name: 'Claude', models: ['Opus', 'Sonnet', 'Haiku'], connected: false },
  { id: 'codex', name: 'Codex (ChatGPT)', models: ['GPT', 'Codex'], connected: false },
  { id: 'cursor', name: 'Cursor', models: ['Auto'], connected: false },
  { id: 'grok', name: 'Grok (X)', models: ['Grok'], connected: false },
  { id: 'nous', name: 'Nous Portal', models: ['Hermes'], connected: false },
]
