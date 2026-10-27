#!/usr/bin/env node
// A scripted shell for the terminal tests: it runs in a real pseudo-terminal, so input and output behave like the real thing.
//   <text>   -> prints "echo:<text>"
//   env      -> prints whether a JunOS secret reached the shell
//   exit     -> ends
process.stdout.write('ready> ')
process.stdin.setEncoding('utf8')
let line = ''
process.stdin.on('data', (chunk) => {
  for (const ch of chunk) {
    if (ch === '\r' || ch === '\n') {
      const cmd = line.trim()
      line = ''
      process.stdout.write('\r\n')
      if (cmd === 'exit') process.exit(0)
      if (cmd === 'env') process.stdout.write(`secret=${process.env.JUNOS_TEST_SECRET ?? 'unset'} term=${process.env.TERM ?? 'none'}\r\n`)
      else if (cmd) process.stdout.write(`echo:${cmd}\r\n`)
      process.stdout.write('ready> ')
    } else line += ch
  }
})
