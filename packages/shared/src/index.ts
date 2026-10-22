/** Contracts shared by the UI and junosd. Keep this file dependency-free. */

export const DEFAULT_PORT = 4777
export const API_PREFIX = '/api'

export const PROVIDER_IDS = ['claude', 'codex', 'cursor', 'grok', 'nous'] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]

export interface HealthResponse {
  ok: true
  name: 'junosd'
  version: string
  pid: number
  startedAt: string
  uptimeMs: number
  /** Highest event seq written so far (0 when the event table is empty). */
  lastSeq: number
}

export interface ProviderProbe {
  id: ProviderId
  /** The CLI answered `--version`. */
  detected: boolean
  version?: string
  error?: string
}

export interface ProvidersResponse {
  providers: ProviderProbe[]
}

export const EVENT_TYPES = ['daemon.started', 'connection.changed'] as const
export type EventType = (typeof EVENT_TYPES)[number] | (string & {})

/** One row of the append-only event table, as sent over SSE. */
export interface JunosEvent {
  seq: number
  id: string
  type: EventType
  refId: string | null
  payload: Record<string, unknown>
  createdAt: string
}

/** SSE event name used when the client's Last-Event-ID cannot be replayed. */
export const RESYNC_EVENT = 'resync'
