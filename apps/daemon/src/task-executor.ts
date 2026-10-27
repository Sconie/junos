import type { RunEvent } from '@junos/shared'
import type { ProviderAdapter } from './adapters/types.ts'
import { buildPrompt, type ChatService } from './chat.ts'
import { PausedError, type RunManager } from './runs.ts'
import { ExecutionError, type TaskExecutor } from './scheduler.ts'

export interface ExecutorOptions {
  adapters: ProviderAdapter[]
  runs: RunManager
  chat: ChatService
  /** An empty directory, so the CLI finds no project files or settings. */
  cwd: string
}

/**
 * Runs a task's prompt through the same adapters as chat: the official CLI, tools off, an empty directory,
 * a scrubbed environment, the prompt on stdin. A prompt-only task has no side effects, so it is safe to retry.
 */
export function makeTaskExecutor(options: ExecutorOptions): TaskExecutor {
  const byId = new Map(options.adapters.map((a) => [a.id, a]))
  return {
    async run(task, hooks) {
      const adapter = byId.get(task.provider)
      if (!adapter) throw new ExecutionError('failed', `Unknown provider ${task.provider}.`)
      // The same one-line disclosure as chat: nothing is sent to a provider the owner has not accepted.
      if (!options.chat.acknowledged().includes(task.provider)) {
        throw new ExecutionError('disclosure_required', `Context has never been sent to ${task.provider} from JunOS. Open Chat and accept the notice for it once, then run the task again.`)
      }
      // Stop pressed between the claim and the start: this run is stopped, not failed, and must not be retried.
      if (options.runs.paused) throw new ExecutionError('stopped', 'Stopped.')
      const status = await adapter.status()
      if (options.runs.paused) throw new ExecutionError('stopped', 'Stopped.')
      if (!status.available) throw new ExecutionError('failed', status.reason ?? `${task.provider} is not available.`)
      const prompt = buildPrompt([{ role: 'user', content: task.prompt, status: 'complete' }])

      return new Promise((resolve, reject) => {
        let text = ''
        let failure: { kind: 'rate_limited' | 'needs_login' | 'failed'; message: string } | undefined
        try {
          const run = adapter.start(options.runs, {
            model: task.model,
            effort: task.effort,
            prompt,
            kind: 'task',
            cwd: options.cwd,
            onEvent: (event: RunEvent) => {
              if (event.type === 'token') text += event.text
              else if (event.type === 'usage') hooks.log(`Used ${event.inputTokens} input and ${event.outputTokens} output tokens`)
              else if (event.type === 'rate_limit' && event.status !== 'allowed') hooks.log(`Plan limit: ${event.status}`)
              else if (event.type === 'error') failure = { kind: event.kind, message: event.message }
            },
            onEnd: (finished) => {
              if (failure) return reject(new ExecutionError(failure.kind, failure.message))
              if (finished.status === 'stopped' || finished.status === 'stop_unconfirmed') return reject(new ExecutionError('stopped', 'Stopped.'))
              if (finished.status !== 'finished') return reject(new ExecutionError('failed', finished.error ?? 'The run did not finish.'))
              resolve({ text })
            },
          })
          hooks.onRun(run.id)
        } catch (err) {
          if (err instanceof PausedError) return reject(new ExecutionError('stopped', 'Stopped.'))
          reject(new ExecutionError('failed', err instanceof Error ? err.message : 'Could not start.'))
        }
      })
    },
  }
}
