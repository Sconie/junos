#!/usr/bin/env node
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_PORT } from '@junos/shared'
import { AlreadyRunningError } from './lock.ts'
import { startDaemon } from './server.ts'

const home = process.env.JUNOS_HOME || join(homedir(), '.junos')
const port = process.env.JUNOS_PORT ? Number(process.env.JUNOS_PORT) : DEFAULT_PORT

function log(msg: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra }))
}

// The server accepts /api/health as soon as it listens, which is before provider probes finish.
// A SIGTERM in that window must not use Node's default action (exit code null, lock left behind).
let daemon: Awaited<ReturnType<typeof startDaemon>> | undefined
let received: string | undefined

function closeAndExit(signal: string, running: NonNullable<typeof daemon>): void {
  log('junosd stopping', { signal })
  running.close().then(
    () => process.exit(0),
    (err) => {
      console.error(err)
      process.exit(1)
    },
  )
}

function stop(signal: string): void {
  if (received) return
  received = signal
  if (daemon) closeAndExit(signal, daemon)
}

// SIGBREAK is what Windows sends on Ctrl+Break / console close.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) process.on(signal, () => stop(signal))

try {
  daemon = await startDaemon({ home, port })
  if (received) closeAndExit(received, daemon)
  else log('junosd listening', { host: '127.0.0.1', port: daemon.port, home })
} catch (err) {
  if (err instanceof AlreadyRunningError) {
    log('junosd already running', { pid: err.info.pid, port: err.info.port })
    process.exit(0)
  }
  console.error(err)
  process.exit(1)
}
