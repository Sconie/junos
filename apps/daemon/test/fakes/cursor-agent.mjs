#!/usr/bin/env node
// Fake cursor-agent CLI for API tests: never touches a real subscription or the network.
if (process.argv.includes("--version")) { console.log("cursor-agent 0.0.0-fake"); process.exit(0) }
console.error("fake cursor-agent: only --version is implemented")
process.exit(2)
