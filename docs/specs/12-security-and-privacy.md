# Security and privacy

## Threat model (single user, localhost)
Main risks, in order: (1) an agent doing something destructive or leaking data through prompt injection from web/file content; (2) another local process or a web page calling the daemon; (3) leaked provider sign-ins; (4) accidental loss of data.

## Daemon access
- Binds to `127.0.0.1` only. Random auth token generated at first run, stored in `~/.junos/token` (mode 600) and sent as a bearer header; the UI reads it via a one-time pairing URL.
- Strict CORS to the UI origin; reject requests with unexpected `Origin`/`Host` (blocks DNS rebinding and drive-by pages).
- Remote access, if ever: only over a private network tunnel plus the same token.

## Credentials
- JunOS stores **no provider passwords or tokens**. Logins stay in each official CLI's own store (see 03).
- Any JunOS-owned secret (webhook tokens, Hermes bridge token) goes in the OS keychain, never in SQLite, logs, or the repo.
- Logs and run records redact known secret patterns.

## Approval policy
Actions are classified:
| Class | Examples | Default |
|---|---|---|
| read | read allowlisted files, search | auto |
| write-local | edit files in allowlisted project folders | auto in Balanced, ask in Ask-first |
| external-send | send mail, post, push, API write | always ask |
| destructive | delete, force-push, shell outside allowlist | always ask |
| spend | anything that costs money | always ask |
Approvals are explicit Inbox items showing the exact command/diff. "Approve and remember" creates a scoped rule (project + action pattern), visible and revocable in Settings.

## Prompt injection
Content from the web, files, mail, feeds is untrusted: wrapped as data, models given no tools while reading untrusted content when avoidable, tool calls that follow untrusted content in a run require approval for external-send and destructive classes.

## Data safety
- Nightly DB backup (02). Run output size caps.
- Hermes and workflows operate on a git branch/worktree for code projects, never directly on the main working tree, unless set otherwise.
- Kill switch in the UI stops all agent runs.
- Audit: every approval and every external action is in `event` and exportable.

## Open questions
- Keychain access from Node: use `keytar` replacement or OS CLI wrappers?
- Sandbox for shell steps (container or restricted user) in Phase 4.
