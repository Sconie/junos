# Roadmap

Revision 2 (2026-10-22). Change: the execution gateway, approvals, stop and localhost protections now come **before** any automation or agent execution (review finding: enforcement was scheduled after the features that need it).

Principle: one real end-to-end path early (Claude chat via subscription), widen later, and never ship an executing feature before the control that gates it.

## Where we are
Current scaffold: Vite + React shell with mock pages, no daemon, nothing wired. First release = Phases 0-2. Everything later is vision.

## Phase 0: Foundations and spikes
- Adopt UI tokens (14); route stubs for all screens; mock API layer.
- Repo layout: `apps/web`, `apps/daemon`, `packages/shared`.
- Timeboxed spikes (1 day each, results written into the spec): Claude CLI streaming adapter, Codex CLI exec adapter, sandboxing options for CLI agents, whether Cursor headless works, Nous Portal official sign-in path. Grok/X: no spike until a supported route is known.
**Done when**: UI runs on mock data; adapter feasibility recorded; sandbox approach chosen.

## Phase 1: Safe core and chat
- junosd with SQLite, event table with sequence numbers, SSE, browser pairing and cookie auth, Origin/Host checks, CSRF.
- **Gateway v1**: action classification, approval table (digest-bound, single use, expiry), deny-by-default for external-send/destructive/spend, audit events, Stop state machine, secret redaction.
- Shared ApprovalCard and Stop control in the UI.
- Claude and Codex adapters (validated targets), Connections screen with unified statuses, model + effort picker, streaming chat, history, allowed-providers list with consented fallback.
- Safe markdown rendering and CSP.
**Done when**: Jonas chats with Claude and Codex through subscriptions; a test tool call needing approval is blocked until approved, an altered call is rejected, and Stop kills the process and records it.

## Phase 2: Automation
- Persisted scheduled runs with atomic claim, leases, bounded catch-up, idempotency (see 05); Tasks screen; run logs; Inbox (approvals, results, failures); workflow runner with prompt/tool/approval/output steps; loop guards; three starter workflows that need only Phase 1-2 pieces (Morning briefing without mail/calendar at first, Inbox triage, Summarise file). Repo health and Weekly review move to Phase 3 (need GitHub and Kanban).
**Done when**: a daily task runs unattended for a week without duplicates or lost runs, including across forced daemon restarts.

## Phase 3: Agents and board
- Hermes bridge: mock first, then the real shim on the VPS; the mock must be validated against a recorded real Hermes session before this phase is called done.
- Console, approvals from Inbox and Telegram through the same gateway, agent chats.
- Kanban with atomic Hermes pickup (09); Repo health and Weekly review workflows.
- Cursor and Nous adapters if their spikes found supported routes.
**Done when**: Jonas hands Hermes a Ready card and gets a Review result with a summary; Stop works on the real VPS Hermes or says honestly that it cannot confirm.

## Phase 4: Awareness
- Scout (read-only pipeline and screen), file/project indexing and search with revocation, Home aggregate, ⌘K palette, compare mode, sandbox hardening for CLI agents.
**Done when**: Scout runs a week with under 30% of findings dismissed as noise.

## Phase 5: Polish
Packaging (Tauri or service install), backups UI, notifications, light theme, phone access.

## Risks
| Risk | Mitigation |
|---|---|
| Provider CLI flags or formats change | contract tests, version probe, Scout watches releases |
| A CLI cannot be constrained by the gateway | run read-only, label it in UI |
| Subscription limits exhausted by background jobs | usage budget in 03 (also when meters are unavailable) |
| Hermes interface differs from the mock | validate against a recorded real session first |
| Scope creep | each phase has a done-when; gateway before executors |

## Testing
Unit tests for scheduler claim/catch-up, router, gateway policy and digest binding. Contract tests per adapter with recorded CLI output. Fake provider and fake Hermes for offline end-to-end. Crash tests: kill the daemon mid-run and mid-approval. Playwright smoke per screen.
