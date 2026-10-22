#!/usr/bin/env node
import { rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_PORT } from '@junos/shared'
import { AlreadyRunningError } from './lock.ts'
import { startDaemon } from './server.ts'

const home = process.env.JUNOS_HOME || join(homedir(), '.junos')
// Comma-separated browser origins besides the daemon's own, for a UI dev server on another port.
const uiOrigins = process.env.JUNOS_UI_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean)
const port = process.env.JUNOS_PORT ? Number(process.env.JUNOS_PORT) : DEFAULT_PORT

// The pairing code goes to the console and to a file, because a service has no console.
const codeFile = join(home, 'pairing-code.txt')
function announceCode(code: string | null, expiresAt: number | null): void {
  if (code === null) {
    rmSync(codeFile, { force: true })
    return
  }
  const until = new Date(expiresAt ?? 0).toLocaleTimeString()
  // Owner-only (a stale file from a killed daemon is replaced so it cannot keep looser permissions).
  rmSync(codeFile, { force: true })
  writeFileSync(codeFile, `${code}
`, { mode: 0o600 })
  console.log(`Pairing code: ${code}  (one use, valid until ${until}; also in ${codeFile})`)
}

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
  daemon = await startDaemon({ home, port, uiOrigins, onPairingCode: announceCode })
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
