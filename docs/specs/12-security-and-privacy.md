# Security and privacy

Revision 2 (2026-10-22), after the Codex and Cursor review loop. Main change: approvals are enforced by JunOS's own execution layer, not by trusting an agent or reading CLI output.

## Threat model (single user)
Main risks, in order: (1) an agent doing something destructive or leaking data, including through prompt injection from web, file, mail or feed content; (2) another local process or a web page calling the daemon; (3) leaked provider sign-ins or the Telegram/Hermes bridge; (4) private context sent to a provider Jonas did not expect; (5) accidental loss of data.

## Invariants (override every setting)
These hold regardless of autonomy level, remembered approvals, provider defaults or workflow definitions:
1. External-send, destructive and spend actions never run without a valid, unexpired, single-use approval bound to that exact action (see gateway).
2. Untrusted content never turns into instructions or into an approval.
3. Stop always works (defined below).
4. Selected context only goes to a provider Jonas has allowed for that conversation or workflow.

## Execution gateway (policy layer)
junosd owns a single **gateway** through which every side-effecting action passes: file writes, shell commands, network writes, git push, mail, Kanban/Hermes mutations, anything a tool call or workflow step does. Providers, CLIs and Hermes never act on their own authority from JunOS's point of view.

- **Action record**: `{actor, run_id, tool, normalized args, target (path/host/repo), class, cwd}` hashed to an `action_digest`.
- **Classify**: read, write-local, external-send, destructive, spend (table below). Unknown tool = destructive until classified.
- **Decide**: policy engine returns allow, ask, or deny from: class, project rules, autonomy level, and the invariants. Deny wins; invariants cannot be relaxed by rules.
- **Ask**: creates an `approval` row showing the exact command/diff/recipient, bound to `action_digest`, run, project, expiry (default 30 min) and single use. The gateway executes only if the approval's digest equals the digest of the action being run; any changed argument needs a new approval. Approval status changes are compare-and-set (`pending -> approved|denied|expired`), so a timeout cannot race an approval.
- **Execute**: the gateway performs the action itself where possible (file ops, git, HTTP). For CLI-backed models and agents that execute their own tools, JunOS launches them (a) with the CLI's own permission flags set to deny or ask-through, (b) inside a restricted working directory (a git worktree or per-project sandbox user/container), (c) with no network or secrets beyond what the project allows, and (d) with tool calls routed back through the gateway where the CLI supports a hook or MCP interface. Where a CLI cannot be constrained, it runs only in read-only mode (read class), and the UI says so. Reading stdout is never treated as proof of enforcement.
- **Hermes**: the VPS is a separate trust zone. The gateway enforces the junosd-side rules on every action Hermes asks JunOS to perform or approve; Hermes's own local approvals are advisory. A compromised Hermes cannot approve itself.
- **Audit**: every decision and execution is written to `event` with the digest, who approved (channel: Inbox/Telegram), and result.

### Action classes
| Class | Examples | Default |
|---|---|---|
| read | read allowlisted files, search | allow |
| write-local | edit files in allowlisted project worktrees | allow in Balanced, ask in Ask-first |
| external-send | send mail/message, post, push, API write | always ask |
| destructive | delete, force-push, shell outside allowlist | always ask |
| spend | anything that costs money | always ask |

### Remembered approvals ("Approve and remember")
A rule is `{project, tool, normalized argument pattern, class, expiry (default 7 days), max uses}`. Never available for external-send, destructive or spend classes (those are always ask); allowed only for write-local and bounded read patterns. Rules are listed and revocable in Settings and logged when used.

### Autonomy levels
Ask-first, Balanced (default), Autonomous. Autonomous only widens write-local inside allowlisted worktrees. It never touches the invariants. (The earlier "Autonomous (log only)" wording is removed.)

### Approval UX requirements
Shown identically wherever it appears (Inbox, Hermes console, Telegram, chat): the one shared component in 14. It must show actor, exact action/diff, target, project, expiry and what is irreversible. Keyboard shortcuts for approve/deny only work in a focused detail view with the action visible, never on a list row.

## Stop
Stop is a state machine, not a promise: `stop requested -> cancelling -> stopped`. It (1) pauses the scheduler and queue, (2) sends cancel to the current run, (3) kills the spawned process group after a grace period (default 5 s), (4) revokes pending approvals for that run, (5) records anything already executed. For remote Hermes, Stop sends the cancel through the shim and, if unreachable, marks the agent `unreachable` and the UI shows "stop not confirmed". Side effects already completed cannot be undone and are listed in the run record.

## Daemon access
- Binds to `127.0.0.1` only. Reject unexpected `Host` and `Origin` (blocks DNS rebinding and drive-by pages); no wildcard CORS.
- **Browser auth**: first run prints a one-time pairing code; the browser exchanges it for a session cookie (`HttpOnly`, `SameSite=Strict`, `Secure` when over TLS), rotatable and revocable in Settings. SSE and API use the cookie; the raw daemon token never goes in URLs, `localStorage` or logs. CLI/scripts use a separate token file (`~/.junos/token`, mode 600).
- State-changing requests require a CSRF check (custom header plus origin check).
- Remote access, if ever: private network tunnel plus the same session auth.

## Credentials
- JunOS stores no provider passwords or tokens; logins stay in each official client's own store (see 03).
- JunOS-owned secrets (bridge tokens, webhook tokens) go in the OS keychain, never SQLite, logs or the repo. Logs and run records redact known secret patterns before persistence.

## Privacy and data egress
- "Local first" means JunOS **stores** its records locally. Any context sent to a model (messages, attached files, workflow inputs, file summaries) goes to the provider chosen for that call. Each conversation/workflow has an **allowed providers** list; fallback never goes outside it, and a fallback to a different provider shows a notice in the message header. Default allowed set: the provider the user picked.
- Automatic title generation and AI file tagging use the same list and are opt-in per folder or project.
- Events and run records hold references and minimal metadata by default; large content lives in the owning table.
- **Retention and deletion**: deleting a conversation, file index entry or card removes its content from primary rows, event payloads, run output, FTS and embedding indexes. Backups expire after 14 days. Revoking a folder removes its indexed rows and caches (see 11).

## Untrusted content
Content from the web, files, mail, feeds, Telegram and agents is data. It is wrapped as data in prompts, rendered through a safe pipeline (below), and tool use is disabled while reading it where possible. If a tool call follows untrusted content in a run, external-send and destructive actions need a fresh approval even if a remembered rule matches.
**Safe rendering**: Markdown is rendered with raw HTML disabled; links are sanitized (`http`, `https`, `mailto` only) and open with `rel="noopener noreferrer"`; images from remote URLs are blocked by default (click to load); code is shown as text; file previews render inside a sandboxed iframe without scripts or same-origin access; a strict Content-Security-Policy applies to the app.

## Hermes on a VPS
Shim bound to the private interface only, firewall denies everything else, key-only SSH, bridge token in the keychain, Hermes runs as an unprivileged user in a Docker container with a separate workspace volume, no Docker socket mounted into it. Telegram bot token stays on the VPS; the bot answers only Jonas's numeric user ID.

## Data safety
- **Backups**: use SQLite's online backup API (or `VACUUM INTO`), never a plain file copy of a WAL database. Nightly, keep 14, verify with an integrity check.
- Hermes and workflows operate on a git branch/worktree for code projects, not the main working tree, unless set otherwise.
- Kill switch in the UI (Stop above).

## Open questions
- Keychain access from Node: which library or OS CLI wrapper?
- Sandbox technology for CLI-backed agents on Jonas's machine: separate OS user, container, or worktree plus deny flags only? Decide in the Phase 0 spike.
- Telegram alerts and Tailscale availability: waiting on Jonas.
