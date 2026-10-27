import type { ConnectionState, Effort, ProviderId, ProviderModels, RunEvent, RunRecord } from '@junos/shared'
import type { RunManager } from '../runs.ts'

export interface AdapterStatus {
  available: boolean
  version?: string
  /** Why it is not available, in words the UI can show. */
  reason?: string
}

/** What an offline login check found (nothing is sent to the provider to learn it). */
export interface AdapterConnection {
  state: ConnectionState
  detail: string
  method: string | null
  plan: string | null
  version: string | null
  reconnect: string
}

export interface AdapterRunRequest {
  model: string
  effort: Effort
  /** The whole conversation as plain text, ending with the message to answer. Goes to stdin. */
  prompt: string
  /** What kind of run this is, for the run record. Defaults to 'chat'. */
  kind?: string
  /** An empty directory, so the CLI finds no project files or settings to load. */
  cwd: string
  onEvent: (event: RunEvent) => void
  /** Final run record, after the last event. */
  onEnd: (run: RunRecord) => void
}

/** One adapter per subscription (spec 01). Only adapters know how a provider is reached. */
export interface ProviderAdapter {
  readonly id: ProviderId
  models(): ProviderModels
  status(): Promise<AdapterStatus>
  /** Offline login check for the Connections screen. */
  connection(): Promise<AdapterConnection>
  start(runs: RunManager, req: AdapterRunRequest): RunRecord
}
