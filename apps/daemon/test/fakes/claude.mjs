#!/usr/bin/env node
// Fake claude CLI for API tests: never touches a real subscription or the network.
if (process.argv.includes("--version")) { console.log("claude 0.0.0-fake"); process.exit(0) }
console.error("fake claude: only --version is implemented")
process.exit(2)
