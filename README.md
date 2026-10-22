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

### Stop

Every process JunOS starts is a run owned by the run manager. The **Stop** button in the top bar (visible whenever something runs) halts everything: it pauses new runs and every action except reads, revokes the stopped runs' pending approvals, asks each process tree to cancel, and force-kills it after a 5 s grace (`taskkill /T` on Windows, the process group on Linux and macOS). The outcome is `stopped`, or an honest `stop not confirmed` if a process survives the kill. Actions that had already completed are listed, since they cannot be undone. Events: `stop.requested`, `run.cancelling`, `run.stopped` / `run.stop_unconfirmed`, `stop.resumed`. Nothing outlives junosd: a shutdown kills its children, and runs a dead daemon left behind are marked failed on the next start. "Resume" lifts the pause.

### Chat (Claude and Codex)

The Chat screen talks to your Claude plan by running the official `claude -p` CLI as a run (so Stop works on it). Codex works the same way through `codex exec --json` (read-only sandbox, ephemeral, no user config, prompt on stdin); the Provider picker chooses which one a new conversation uses, and a conversation keeps its provider. No API key is used and JunOS never reads Claude's login. Pick a model and effort per message; they are passed to the CLI (`--model`, `--effort`), remembered on the conversation, and recorded on the run. The prompt (the whole conversation as plain text) goes to the CLI on stdin, in an empty working directory, with a minimal environment. History is stored in SQLite and survives restarts; a reply streams over `GET /api/runs/:id/stream` (kept in memory, not in the event table). The first time context goes to a provider, a one-line disclosure must be accepted. One job per subscription runs at a time. Everything a model writes is shown as plain text.

### Inbox and Telegram

The **Inbox** is the one queue of things that need you. It is built from events, so it can never disagree with what it is about: an approval request becomes an urgent item that shows the same ApprovalCard; deciding, denying, expiring or stopping the approval settles the item; a failed run becomes a failure item that can be marked done or snoozed. The sidebar badge counts what still needs a person.

A separate **JunOS Telegram bot** can push approvals to your phone. It is **off unless you configure it**, and nothing is sent to Telegram until you do. Set these before starting junosd (the token never goes in SQLite, the UI, logs or events; the OS keychain is the planned home):

```sh
JUNOS_TELEGRAM_TOKEN=<token from @BotFather>
JUNOS_TELEGRAM_USER_ID=<your numeric Telegram user id>
# optional: JUNOS_TELEGRAM_QUIET=23:00-07:00
```

It answers only your user id, in your own chat, on the message it sent, with that message's current one-time code; anything else is ignored and only a count is kept. Approvals always arrive; failures and other items wait until the quiet window (23:00 to 07:00 by default) ends. Messages are a short summary (what and where), never the command or its arguments. **Deny is one tap. Approving anything that sends, deletes or spends takes a second "Are you sure?" tap**; a local write takes one. A press resolves the same gateway approval the Inbox shows, so whichever answers second sees it already resolved, and the other place is updated. `JUNOS_TELEGRAM_API` can point at a local fake for testing; it only accepts `https://api.telegram.org` or a local address.

### Connections

`GET /api/connections` powers the Connections screen: one card per provider with a single state (`connected`, `needs_login`, `rate_limited`, `degraded`, `unavailable`, `unknown`). It is built from offline checks only: `claude auth status`, `codex login status` and `cursor-agent status`, plus plan limits seen in earlier runs (`provider.rate_limited` events). Nothing is sent to a provider and no email, organisation or token is ever returned. A provider signed in with an API key shows as `degraded`, because JunOS does not use API keys. Grok is shown as coming, Nous Portal as reached through Hermes, and Cursor as signed in with chat to come.

`JUNOS_CLAUDE_BIN`, `JUNOS_CODEX_BIN` and `JUNOS_CURSOR_BIN` override the CLI commands (tests point them at fakes). Recorded real output of `claude`, `codex` and `cursor-agent` is in `apps/daemon/test/fixtures` and the parser is tested against it.

## Running junosd as a service (Windows)

`scripts/install-service.ps1` registers a per-user scheduled task that starts junosd at logon; `scripts/uninstall-service.ps1` removes it. Stop junosd with Ctrl+C, SIGTERM, or by ending the task. A hard kill leaves a stale `junosd.lock`, which the next start takes over; SQLite runs in WAL mode so the event history survives.

Stack: Vite, React, TypeScript, React Router, Node.
