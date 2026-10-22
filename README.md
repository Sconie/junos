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
npm run lint && npm run typecheck && npm run test && npm run build
```

`npm test` runs the daemon API tests (fake provider CLIs) and the web shell smoke tests. `npm run build` builds every workspace that has a build.

The sidebar pill shows the live junosd state, driven by the SSE stream (`/api/events`).

### Pairing and localhost protection

Only a paired browser can use the API. On start junosd prints a one-time pairing code (also saved to `~/.junos/pairing-code.txt` until it is used, because a service has no console). Open the UI, type the code, and the browser gets an `HttpOnly`, `SameSite=Strict` session cookie. The session is stored hashed in SQLite, so it survives restarts. A code works once, expires after 10 minutes, and is replaced after 5 wrong guesses.

- Every request must carry the daemon's own `Host`. A foreign `Origin` is rejected, and writes need an `Origin` plus the `x-junos-csrf` header.
- Public routes: `GET /api/health` (name and version only), `GET /api/session`, `POST /api/pair`. Everything else needs the cookie.
- When the dev UI runs on a port other than 5173, start junosd with `JUNOS_UI_ORIGINS=http://127.0.0.1:<port>`.
- "Unpair" in the sidebar revokes the session. If it was the last one, a fresh code is announced.

### Execution gateway and approvals

Every side effect goes through the gateway (`POST /api/actions`). The daemon classifies the tool (read, write-local, external-send, destructive, spend; an unregistered tool is destructive and is refused), and external-send, destructive and spend actions always need an approval, whatever the autonomy level. An approval is bound to a digest of the exact action (actor, tool, sorted arguments, target, class, cwd, project) and the run. It is single use, expires after 30 minutes, and is decided in the Approvals screen. A changed argument, another run, a replay or an expired approval is rejected and audited (`gateway.*` and `approval.*` events carry the digest and result, never the arguments).

To try it by hand, start junosd with `JUNOS_TEST_TOOLS=1`: the Approvals screen then shows a test panel with fake send, delete and spend tools that only record into memory.

## Running junosd as a service (Windows)

`scripts/install-service.ps1` registers a per-user scheduled task that starts junosd at logon; `scripts/uninstall-service.ps1` removes it. Stop junosd with Ctrl+C, SIGTERM, or by ending the task. A hard kill leaves a stale `junosd.lock`, which the next start takes over; SQLite runs in WAL mode so the event history survives.

Stack: Vite, React, TypeScript, React Router, Node.
