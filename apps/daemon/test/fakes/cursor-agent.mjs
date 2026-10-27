#!/usr/bin/env node
// Fake cursor-agent CLI for API tests: never touches a real subscription or the network.
// Only `--version` and `status` exist; `status` answers from JUNOS_FAKE_CURSOR_LOGIN.
const args = process.argv.slice(2)
if (args.includes('--version')) {
  console.log('cursor-agent 0.0.0-fake')
  process.exit(0)
}
if (args[0] === 'status') {
  if ((process.env.JUNOS_FAKE_CURSOR_LOGIN || 'in') === 'in') console.log('✓ Logged in as someone@example.com')
  else console.log('Not logged in')
  process.exit(0)
}
console.error('fake cursor-agent: only --version and status are implemented')
process.exit(2)
