import type {
  HermesDirectiveRequest,
  KanbanAgentAction,
  HermesMemoryItem,
  HermesMessage,
  HermesMode,
  HermesQueueItem,
  HermesSkill,
  HermesStatus,
  HermesStep,
} from '@junos/shared'

export type BridgeUpdate =
  | { type: 'step'; step: HermesStep }
  | { type: 'message'; message: HermesMessage }
  | { type: 'status'; status: HermesStatus }
  | { type: 'queue'; queue: HermesQueueItem[] }
  /** A directive ended. This is how the board learns a card's work finished, failed or was stopped. */
  | { type: 'directive'; directiveId: string; outcome: 'done' | 'failed' | 'stopped'; summary: string }
  /** Hermes asks something of the board. It is checked on arrival: it can never move a card to Done. */
  | { type: 'kanban'; action: KanbanAgentAction }

export class BridgeError extends Error {
  readonly code: 'unreachable' | 'not_connected' | 'bad_request' | 'busy'
  constructor(code: BridgeError['code'], message: string) {
    super(message)
    this.code = code
  }
}

/**
 * What junosd needs from Hermes (spec 06). The real agent sits behind a shim that speaks this over the private network;
 * until it is connected a mock stands in. Everything above this interface (the service, the API, the console) is the
 * same for both, which is what lets the console be built and tested before Hermes is reachable.
 */
export interface HermesBridge {
  readonly mode: HermesMode
  status(): Promise<HermesStatus>
  sendDirective(request: HermesDirectiveRequest): Promise<{ directiveId: string }>
  /** Steps, messages, status and queue changes as they happen. Reconnects replay through `recent`. */
  subscribe(listener: (update: BridgeUpdate) => void): () => void
  pause(): Promise<void>
  resume(): Promise<void>
  /** Halts the agent's current work. `confirmed` is false when its end could not be verified. */
  stop(): Promise<{ confirmed: boolean }>
  memory(): Promise<HermesMemoryItem[]>
  setMemory(items: HermesMemoryItem[]): Promise<HermesMemoryItem[]>
  skills(): Promise<HermesSkill[]>
  setSkills(toggles: Array<{ id: string; enabled: boolean }>): Promise<HermesSkill[]>
  queue(): Promise<HermesQueueItem[]>
  /** Answers a step that is waiting for an approval. */
  decide(stepId: string, decision: 'approve' | 'deny'): Promise<void>
  /** The shim's short ring buffer, so a reconnect catches up. */
  recent(): Promise<{ steps: HermesStep[]; messages: HermesMessage[] }>
  close(): Promise<void>
}

/** Stands in when no Hermes is connected: reports why, and refuses everything else. */
export class NoHermes implements HermesBridge {
  readonly mode = 'none' as const
  readonly reason: string
  constructor(reason: string) {
    this.reason = reason
  }

  #refuse(): never {
    throw new BridgeError('not_connected', this.reason)
  }

  status(): Promise<HermesStatus> {
    return Promise.resolve({ state: 'unreachable', currentTask: null, model: '', uptimeS: null, reason: this.reason })
  }
  sendDirective(): Promise<{ directiveId: string }> {
    return this.#refuse()
  }
  subscribe(): () => void {
    return () => {}
  }
  pause(): Promise<void> {
    return this.#refuse()
  }
  resume(): Promise<void> {
    return this.#refuse()
  }
  stop(): Promise<{ confirmed: boolean }> {
    return this.#refuse()
  }
  memory(): Promise<HermesMemoryItem[]> {
    return Promise.resolve([])
  }
  setMemory(): Promise<HermesMemoryItem[]> {
    return this.#refuse()
  }
  skills(): Promise<HermesSkill[]> {
    return Promise.resolve([])
  }
  setSkills(): Promise<HermesSkill[]> {
    return this.#refuse()
  }
  queue(): Promise<HermesQueueItem[]> {
    return Promise.resolve([])
  }
  decide(): Promise<void> {
    return this.#refuse()
  }
  recent(): Promise<{ steps: HermesStep[]; messages: HermesMessage[] }> {
    return Promise.resolve({ steps: [], messages: [] })
  }
  close(): Promise<void> {
    return Promise.resolve()
  }
}
