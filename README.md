# JunOS

A personal AI command center. Early scaffold: every section is an empty shell.

## Sections

- **Overview**: landing page linking to everything else
- **Chat**: provider, model and effort picker (not wired to any model yet)
- **Scheduled**: crons and recurring tasks
- **Hermes**: its own tabbed interface for the Hermes agent
- **Files & projects**: overview of what you are working on
- **Connections**: future home for linking Claude, Codex, Cursor, Grok and Nous Portal subscriptions instead of API keys

## Layout

```
apps/web         Vite + React UI
apps/daemon      junosd (Node 24, TypeScript run directly, node:sqlite, SSE)
packages/shared  contracts shared by both
scripts/         Windows service install/uninstall (not run automatically)
docs/specs       the v1 specs
```

## Run it

Needs Node 24 or newer.

```sh
npm install
npm run dev:daemon   # junosd on http://127.0.0.1:4777, data in ~/.junos (JUNOS_HOME, JUNOS_PORT override)
npm run dev:web      # UI on http://localhost:5173, proxies /api to junosd
npm test             # API tests against fake provider CLIs
npm run typecheck && npm run lint
```

The sidebar pill shows the live junosd state, driven by the SSE stream (`/api/events`). `/api/health` and `/api/providers` are the other endpoints so far.

## Running junosd as a service (Windows)

`scripts/install-service.ps1` registers a per-user scheduled task that starts junosd at logon; `scripts/uninstall-service.ps1` removes it. Stop junosd with Ctrl+C, SIGTERM, or by ending the task. A hard kill leaves a stale `junosd.lock`, which the next start takes over; SQLite runs in WAL mode so the event history survives.

Stack: Vite, React, TypeScript, React Router, Node.
