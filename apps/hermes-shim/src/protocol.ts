import type {
  HermesMemoryItem,
  HermesMessage,
  HermesQueueItem,
  HermesSkill,
  HermesStatus,
  HermesStep,
  KanbanAgentAction,
} from '@junos/shared'

/** Bump when a route or event changes shape. junosd refuses a shim that speaks another version. */
export const PROTOCOL_VERSION = 1

/** What the shim streams on GET /v1/events. The same updates junosd's bridge understands, each with a sequence number. */
export type ShimUpdate =
  | { type: 'step'; step: HermesStep }
  | { type: 'message'; message: HermesMessage }
  | { type: 'status'; status: HermesStatus }
  | { type: 'queue'; queue: HermesQueueItem[] }
  | { type: 'directive'; directiveId: string; outcome: 'done' | 'failed' | 'stopped'; summary: string }
  | { type: 'kanban'; action: KanbanAgentAction }

export interface ShimEvent {
  seq: number
  update: ShimUpdate
}

export interface ShimInfo {
  ok: true
  name: 'junos-hermes-shim'
  protocol: number
}

export class ShimError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export type { HermesMemoryItem, HermesSkill }
