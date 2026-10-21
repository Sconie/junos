# Architecture

## Shape
```
Browser (Vite + React + TS)          <- the current repo
   |  HTTP + SSE/WebSocket (localhost, token-protected)
Local daemon  "junosd"  (Node + TypeScript)
   |- API layer (REST + event stream)
   |- Event bus + SQLite (better-sqlite3 or libsql), one file: ~/.junos/junos.db
   |- Scheduler (cron + one-off, persisted, catch-up policy)
   |- Workflow runner (steps, retries, approvals)
   |- Provider adapters (one per subscription)
   |- Hermes bridge
   |- File indexer / watcher
   '- Scout runner (a scheduled workflow, not a special case)
```
The UI cannot touch CLIs or the filesystem; the daemon can. Why a daemon: subscriptions are reachable only through local CLIs and sessions, crons must run while the tab is closed, and secrets must not live in browser storage.

## Why not a hosted backend
Subscription sign-ins are tied to Jonas's machine and ToS. A hosted service would need his tokens. Keep everything on localhost; optionally expose through a private tunnel (Tailscale) later for phone access.

## Provider adapter interface
```ts
interface ProviderAdapter {
  id: 'claude' | 'codex' | 'cursor' | 'grok' | 'nous'
  status(): Promise<{ connected: boolean; plan?: string; usage?: Usage; error?: string }>
  models(): Promise<ModelInfo[]>            // includes supported effort levels
  run(req: RunRequest): AsyncIterable<RunEvent>   // token | thinking | tool | done | error
  cancel(runId: string): Promise<void>
}
```
`RunRequest` = `{ model, effort, messages, cwd?, tools?, systemPrompt? }`. Effort is mapped per provider (see 03). Adapters are the only code that knows how a provider is reached.

## Event bus
Append-only `events` table, SSE to the UI. Event types: `chat.message`, `run.started|step|finished|failed`, `task.fired`, `inbox.item`, `kanban.card.*`, `scout.finding`, `connection.changed`. Views (Inbox, Home feed, activity timeline) are queries over events plus a few materialized tables.

## Tech choices (proposed)
| Concern | Choice | Note |
|---|---|---|
| UI | Vite, React 19, React Router, TS | already in repo |
| UI state | TanStack Query + small Zustand store | server state vs UI state |
| Styling | Plain CSS with tokens (see 14) | keep as-is, no framework |
| Daemon | Node 22 + Fastify | same language as UI |
| DB | SQLite (WAL) | single file, easy backup |
| Scheduling | `croner` library, persisted jobs | handles timezones |
| Validation | Zod shared between UI and daemon | monorepo `packages/shared` |
| Process mgmt | `execa` for CLIs, pty only where a CLI demands it | |

## Repo layout (proposed)
```
apps/web        current Vite app
apps/daemon     junosd
packages/shared types, zod schemas, provider ids
docs/           these specs
```
Migrate by moving `src/` into `apps/web` once the daemon exists (Phase 1).

## Reliability rules
- Every run is resumable or cleanly failed; no silent loss on daemon restart.
- Scheduler on startup applies per-task catch-up: `skip`, `run once`, or `run all missed`.
- Output of runs is stored (truncated at a configurable size) for audit.

## Open questions
- Electron/Tauri wrapper vs plain localhost tab? (Tauri gives a tray icon and auto-start.)
- Run the daemon as a launchd/systemd user service from day one?
