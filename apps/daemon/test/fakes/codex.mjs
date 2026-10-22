#!/usr/bin/env node
// Fake codex CLI for API tests: never touches a real subscription or the network.
if (process.argv.includes("--version")) { console.log("codex 0.0.0-fake"); process.exit(0) }
console.error("fake codex: only --version is implemented")
process.exit(2)
