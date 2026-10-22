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

try {
  const daemon = await startDaemon({ home, port })
  log('junosd listening', { host: '127.0.0.1', port: daemon.port, home })

  let stopping = false
  const stop = (signal: string) => {
    if (stopping) return
    stopping = true
    log('junosd stopping', { signal })
    daemon.close().then(
      () => process.exit(0),
      (err) => {
        console.error(err)
        process.exit(1)
      },
    )
  }
  // SIGBREAK is what Windows sends on Ctrl+Break / console close.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) process.on(signal, () => stop(signal))
} catch (err) {
  if (err instanceof AlreadyRunningError) {
    log('junosd already running', { pid: err.info.pid, port: err.info.port })
    process.exit(0)
  }
  console.error(err)
  process.exit(1)
}
