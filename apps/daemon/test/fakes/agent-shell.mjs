#!/usr/bin/env node
// Stands in for `sh -c <command>` in the agent-command tests. It records every command that actually ran.
import { appendFileSync } from 'node:fs'

const command = process.argv[2] ?? ''
if (process.env.TEST_MARKER) appendFileSync(process.env.TEST_MARKER, `${command}\n`)
const sleep = /^sleep (\d+)$/.exec(command)
if (sleep) {
  await new Promise((r) => setTimeout(r, Number(sleep[1])))
  process.exit(0)
}
if (command === 'fail') {
  process.stderr.write('it failed\n')
  process.exit(3)
}
if (command === 'secret') {
  process.stdout.write('token sk-aaaaaaaaaaaaaaaaaaaaaaaa\n')
  process.exit(0)
}
const echo = /^echo (.*)$/.exec(command)
process.stdout.write(echo ? `${echo[1]}\n` : `ran: ${command}\n`)
