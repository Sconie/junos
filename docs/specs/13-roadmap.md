# Roadmap

Principle: get one real end-to-end path working early (Claude chat via subscription), then widen. UI already exists as a shell; build backend behind it screen by screen and keep mock data switchable.

## Phase 0: Foundations (days)
- Adopt the Translucent Glass tokens (14); add Inbox, Agents, Workflows, Scout, Kanban routes to the shell.
- Convert repo to `apps/web` + `apps/daemon` + `packages/shared`; mock API layer in the UI.
- Spikes (timeboxed 1 day each): Claude CLI streaming adapter, Codex CLI exec adapter, Cursor headless, Grok path, Nous Portal endpoint.
**Done when**: UI runs on mock data for all screens; spike notes written into 03.

## Phase 1: Chat that works
- junosd with SQLite, auth token, SSE, event table.
- Claude and Codex adapters, Connections screen real states, model + effort picker, streaming chat, conversation history, routing fallback.
**Done when**: Jonas chats with Claude and Codex through subscriptions, no API keys, with history persisted.

## Phase 2: Automation
- Scheduler, Tasks screen, run history/logs, Inbox (results, failures), workflow runner with prompt/tool/output steps, 3 starter workflows, Workflows launcher.
**Done when**: a daily morning briefing runs unattended for a week without duplicates or lost runs.

## Phase 3: Agents and board
- Hermes bridge (mock first, then real), console, approvals in Inbox, agent chats.
- Kanban with Hermes create/pickup rules.
- Cursor, Nous adapters (Grok if the spike found a legitimate path).
**Done when**: Jonas hands Hermes a Ready card and gets a Review result with a summary.

## Phase 4: Awareness
- Scout pipeline and screen, file/project indexing and search, Home aggregation, ⌘K palette, compare mode.
- Security hardening: sandboxed shell, approval rules UI.
**Done when**: Scout surfaces useful findings a week running with under 30% dismissed as noise.

## Phase 5: Polish
Packaging (Tauri or service install), backups UI, notifications, light theme, phone access over a tunnel.

## Risks
| Risk | Mitigation |
|---|---|
| Provider CLI flags or output formats change | adapter contract tests, version probe, Scout watches releases |
| Subscription limits exhausted by background jobs | usage budget in 03, thresholds |
| Hermes interface unknown | define wire format first, build against a mock |
| Grok/X has no legitimate route | ship without it |
| Scope creep | each phase has a done-when; no phase starts before the last passes |

## Testing approach
Unit tests for scheduler, router, approval policy. Contract tests per adapter with recorded CLI outputs. A fake provider and fake Hermes so end-to-end tests run offline. Playwright smoke test per screen.
