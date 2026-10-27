#!/usr/bin/env node
import { mkdirSync } from 'node:fs'
import { ConfigError, configFromEnv } from './config.ts'
import { startShim } from './server.ts'

const log = (msg: string, extra: Record<string, unknown> = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), msg, ...extra }))

let config
try {
  config = configFromEnv(process.env)
} catch (err) {
  console.error(err instanceof ConfigError ? err.message : err)
  process.exit(2)
}
mkdirSync(config.stateDir, { recursive: true, mode: 0o700 })

const shim = await startShim(config)
// The key is never printed: only where the shim listens and what it reads.
log('junos-hermes-shim listening', { host: config.host, port: shim.port, hermes: config.hermesUrl, memoryDir: config.memoryDir, skillsDir: config.skillsDir, logFile: config.logFile })

const stop = (signal: string) => {
  log('junos-hermes-shim stopping', { signal })
  shim.close().then(
    () => process.exit(0),
    () => process.exit(1),
  )
}
for (const s of ['SIGINT', 'SIGTERM'] as const) process.on(s, () => stop(s))
