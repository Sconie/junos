# JunOS

A personal AI command center that runs on your PC: a daemon (`junosd`) and a browser UI. It uses your existing subscriptions through their official command-line tools, never API keys. Everything with an effect goes through one approval gateway, and **Stop** halts it all. The sections below describe each part; details are in `docs/specs`.

## Sections

- **Home**: what needs you, what is running, what is next, and the command palette (Ctrl K)
- **Inbox** and **Approvals**: one queue of decisions, results and failures, also on Telegram when you set it up
- **Chat**: Claude and Codex with a model and effort picker, files and projects attached as data
- **Scheduled** and **Workflows**: prompts on a cron schedule, and YAML workflows with approval steps and loop guards
- **Board**: a Kanban board that Hermes can fill and pick up from, but never finish
- **Scout**: read-only suggestions from feeds you switch on
- **Hermes**: the agent console (against a mock until the real shim exists)
- **Terminal**: a PC shell tab (WSL), an agent tab you cannot type in, and a VPS tab waiting for the shim
- **Files & projects**: folders you add, searchable, with safe previews
- **Connections**: the state of each subscription, from offline checks

## Layout

```
apps/web         Vite + React UI
apps/daemon      junosd (Node 24, TypeScript run directly, node:sqlite, SSE)
apps/desktop     Tauri wrapper: tray, start with the OS
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

### Scheduled tasks

A task is a prompt sent to one of your subscriptions on a five-field cron schedule in a timezone (default Europe/Copenhagen). Nothing depends on an in-memory timer: every slot is a persisted `scheduled_run` row, unique per (task, due time).

- **Claimed atomically** with one compare-and-set update, so two schedulers (or a restart) can never run a slot twice. A running slot holds a lease that a heartbeat renews; a lease left by a dead daemon is marked lost on the next start and **the same row** is retried.
- **Catch-up** for slots missed while junosd was down, per task: `skip` (default), `run once` (collapses all missed slots into the latest) or `run every missed one` (capped at 5). Anything older than 6 hours is skipped. Retries and runs started by hand are never skipped by age.
- **Overlap**: a slot that arrives while the previous run is going is skipped (default) or waits. Backlog and retries always wait their turn.
- **One job per subscription:** a task waits while a chat (or another task) is using the same provider, and chat is refused while a task has claimed it.
- **Retries** (1 to 5 attempts, 1/5/15 min backoff) reuse the row; only the last failure reaches the Inbox. A sign-in problem, a missing provider notice or a Stop is not retried. A deliberate Stop is not a failure.
- A schedule is refused if it is not five fields or fires more often than every 10 minutes (the plans have caps). New tasks never backfill the past; pausing and resuming owes nothing for the gap.
- After **Stop**, due slots are held and not started; each task's catch-up setting decides what happens after Resume.
- Each run keeps its output and a log, the result lands in the Inbox, and the **Scheduled** screen has tabs (All, Running, Paused, Failed), a schedule builder (hourly, daily, weekly, custom) with the daemon's next five run times, Run now, Pause, Edit and Logs.

A task sends its prompt to the provider like a chat message does, so the provider notice must have been accepted once in Chat first; otherwise the run fails with a message saying so and nothing is sent.

### Workflows

A workflow is a YAML file in `~/.junos/workflows/` made of steps: **prompt** (send text to a subscription), **tool** (`files.read`, `inbox.summary`, `time.now`), **approval** (waits for you) and **output** (post to the Inbox). Three starters are written once on first start (Morning briefing without mail, Inbox triage, Summarise file); they are ordinary files you can edit or delete. The **Workflows** screen has launcher cards, a Run form for parameters with a **dry run** (shows what each step would do, sends nothing, changes nothing), a YAML editor that checks the text as you type, and the run history with every step's output.

```yaml
version: 1
name: Summarise file
params:
  - key: path
    type: file
    required: true
steps:
  - id: file
    type: tool
    tool: files.read
    args: { path: "{{path}}" }
  - id: summary
    type: prompt
    prompt: Summarise the file below in five bullet points.
    input: [file]
  - id: post
    type: output
    to: inbox
```

- **Versioned format.** `version: 1` is current. A file with no version (the first sketch: `inputs`, `schedule`) is upgraded on load, with a copy of the old file kept as `name.yaml.bak-v0-<time>`. A file from a newer JunOS is refused and left untouched. Validation names the step and the field.
- **Approval steps** use the same gateway approvals as the Inbox and Telegram, so they ask even when autonomy is autonomous. The run waits (and survives a restart) until the approval is approved, denied (the run ends as cancelled) or expires (the run fails). **Stop** and **Cancel run** withdraw the approval.
- **Untrusted data.** What an earlier step produced (a file, an Inbox list, a model reply) goes into later prompts inside `<untrusted-data>` markers with a note not to follow instructions found in it.
- **Triggers:** by hand, a cron schedule (a persisted slot, so it runs once; missed slots are skipped, a new schedule never backfills), or an Inbox event (`inbox.item.created` or `.resolved`, with a `where` filter on `kind`, `priority`, `source`). Anything that starts by itself needs defaults for its required parameters.
- **Loop guards.** Each Inbox item a workflow posts remembers which workflows caused it. A workflow is never started by something it caused (directly or through others), a chain is cut at depth 3, one workflow runs at most 10 times an hour and all together at most 60. An automatic start that hits a guard **pauses that workflow** and raises an urgent Inbox item; a manual start is refused with the reason.
- **Files** are read only from `~/.junos/files` and folders in `JUNOS_FILE_ROOTS` (path-separated), by real path (links cannot escape), at most 200 KB, text only, never credential-looking names (`.env`, keys, files named for secrets or tokens).
- A run keeps a snapshot of the definition it started with, so editing the file does not change a run in flight. A step that may already have had an effect is never repeated after a restart. A prompt step takes the provider's single slot like chat and tasks.

### Hermes console (mock)

The **Hermes** screen supervises the agent: a chat of directives and replies, a live step timeline, and Memory, Skills, Queue and Logs tabs, with Pause, Resume and Stop. Everything goes through a **bridge** interface (`apps/daemon/src/hermes/bridge.ts`, the wire format in spec 06), so the same console works for the mock now and the real agent later.

- **Not connected by default.** Without configuration the screen says so and keeps its controls off. Start junosd with `JUNOS_HERMES=mock` to use the scripted stand-in (a banner always says it is a mock; nothing leaves the machine). Words in a directive pick the script: "send" asks for approval, "slow" runs until stopped, "fail" fails a step.
- **Approvals.** A step that needs a yes becomes a gateway approval (`hermes.external-send`, `hermes.destructive`, `hermes.spend`, `hermes.write-local`) bound to that step, shown in the Inbox and on Telegram. Approve releases the step, deny or expiry says no, and Stop withdraws it. These tools are not available to workflows.
- **Stop** (console button, and part of the global Stop) halts the agent and is recorded. If Hermes cannot confirm, or cannot be reached, the console says "Stop not confirmed" and an urgent Inbox item is raised.
- **Status** shows `unreachable` (the VPS or tunnel is down) separately from `error`, and recovers on its own; history is kept in SQLite across restarts. Telegram conversations will be mirrored with a "via Telegram" badge (the mock can simulate one).
- **Real Hermes, as far as its API goes.** Set `JUNOS_HERMES_URL` (and `JUNOS_HERMES_KEY`, Hermes's `API_SERVER_KEY`) before starting junosd and the console talks to Hermes's own OpenAI-style gateway (`/health`, `/v1/models`, `/v1/chat/completions`, which listens on 127.0.0.1:8642 inside its container and is not published). Reach it through an SSH tunnel (`ssh -L 8642:127.0.0.1:8642 …`, then `http://127.0.0.1:8642`) or over Tailscale. **Only this machine and the tailnet are accepted as addresses, never the public internet, and never an address with a password in it.** The key is read from the environment only: it is sent as a bearer token to that one address, and never logged, stored, shown or written to the event log (tested). What works: status (a `degraded` health answer is not an error), the model name, directives (a directive becomes a streamed question and the answer becomes a message), a queue and Pause held by JunOS, and Stop (closes the connection; because Hermes's API cannot say whether its own work ended, a Stop with something in flight is reported as **not confirmed** and raised in the Inbox). What does not work yet, and says so (HTTP 501): step stream, memory, skills, Hermes-side approvals and Telegram mirroring. Those need the shim on the VPS, which now exists (next bullet). The health check asks without the key first and, if Hermes refuses that, once more with it, then remembers which worked. The request and stream format is as the gateway is documented to speak it and was tested against a stand-in server; it has not been tried against the real Hermes, because the key has not been supplied. No Hermes credential is stored in this repository.
- **The shim, for the rest.** `apps/hermes-shim` is a small dependency-free service you run next to Hermes on the VPS. It adds the step stream, queue, approvals (a hook Hermes calls, answered from the Inbox or Telegram, first answer wins), memory (Hermes's own facts are read and pinned, never edited; JunOS keeps its own notes in `junos-notes.md`), skills and Telegram mirroring. Start junosd with `JUNOS_HERMES_URL=http://<vps tailscale address>:8650`, `JUNOS_HERMES_PROTOCOL=shim` and the same `JUNOS_HERMES_KEY`. **One secret is all it needs: Hermes's API key**, in the environment on both sides. It is built and tested against a stand-in Hermes only; it has never run against the real one. Setup, settings and the parts that depend on how the real Hermes lays out its files: [`apps/hermes-shim/README.md`](apps/hermes-shim/README.md).

### Board

The **Board** is one Kanban board with columns Ideas, Ready, In progress, Review, Done and Blocked. Automation depends on a column's *kind*, never its name. Add cards inline or press **c**, paste several lines at once, drag cards between columns (or use the Column field in the card drawer), and filter by Mine, Hermes, project and label. The top line says which card Hermes is working on.

- **Hermes fills it.** Cards Hermes creates land in Ideas, unassigned, with a robot marker. It may move and comment on cards it made or holds, never on anyone else's, and **never move a card to Done**: that is refused and recorded (`kanban.agent.refused`). It cannot give itself work.
- **Pickup.** Only a card in **Ready** assigned to Hermes is handed over. A label alone never starts work. The pickup is one atomic claim under a lease, so a card is never started twice; Hermes does one card at a time, most urgent first, and only while it is connected, idle and JunOS is not stopped. The card moves to In progress; when the work ends it moves to **Review** with Hermes's summary and an Inbox result, or to **Blocked** with the reason (and an Inbox failure, or after a Stop). A claim nobody renews (a restart) returns the card to Ready with a note. Taking a card back by hand ends Hermes's claim.
- **Untrusted text.** The card's title and body are wrapped in `<untrusted-data>` markers, with a note not to follow instructions in them, when they are handed to Hermes.
- Card events (`kanban.card.created|moved|updated|commented|claimed|released|deleted`) stream to the UI. Not built yet: swimlanes, editable columns, and cards from Scout and workflows.

### Files and projects

The **Files & projects** screen is read-only. Add a folder by its full path and JunOS indexes it: nothing outside an added folder is ever read. It refuses a whole drive, your home folder, JunOS's own data folder and overlapping folders.

- **What is left out.** Build output and dependency folders (`node_modules`, `.git`, `dist`, `build`, `target`…), anything in the folder's `.junosignore` (comments, `dir/`, `*.ext`, names, anchored paths; no negation), files with credential-looking names (`.env`, keys, anything named for a secret, password or token, so `tokenizer.ts` is skipped too) and symbolic links (never followed). Exclusions are checked again at search, preview and attach time, so a new `.junosignore` line takes effect before the next scan.
- **Search** uses SQLite full text (only the files' text up to 200 KB; larger and binary files by name). Ask in words: "PDFs from last week about the API" becomes a type, a time window and words, and the screen shows what it understood. Only changed files are read again on a rescan (manual, or every 5 minutes); there is no file watcher yet, and no AI summaries, tags or embeddings.
- **Revoking a folder** deletes its index rows, search entries and projects, cancels a scan in progress, and says what was removed.
- **Previews** render in an iframe with `sandbox=""` (no scripts, no same-origin access) and a policy inside it; Markdown is escaped before it is rendered, so HTML in a file stays text, and links are not live. PDFs and other files are not previewed; images and PDFs can be downloaded as an attachment under `sandbox` and `nosniff`.
- **Projects** are folders containing `.git`: branch, last commit, changed files, language mix and a 14-day commit sparkline, read with fixed `git` commands (no hooks, no fsmonitor). Not built: open PRs through `gh`, "Open in editor" and "Give to Hermes".
- **Chat.** "Open in Chat" starts a conversation with the project attached: each message carries the project's file list (names and sizes, never contents) as data. "Ask about this file" attaches up to 3 text files to one message, with secret-looking strings masked; the text goes with that message only and the chat stores just "(Attached: name)". The provider notice must have been accepted first. The CLI still runs in its isolated empty directory with tools off, so a model sees only what you attach.

### Terminal

The **Terminal** screen has tabs you type in and one tab you cannot. **New PC tab** opens a real shell on this PC in a pseudo-terminal owned by junosd: **WSL** on Windows (Jonas's choice), the login shell elsewhere (`JUNOS_TERMINAL_SHELL` and `JUNOS_TERMINAL_ARGS` override it). It uses `node-pty` (an optional dependency: where it cannot be installed, the tab says so and nothing else is affected) and `xterm.js` in the browser, over the same cookie, origin and CSRF checks as the rest of the API: output arrives as server-sent events, typing and resizing are small POSTs.

- **Your typing is not gated.** Keystrokes go straight to your shell; they are not run through approvals and are not recorded (only that a tab opened and closed). The shell gets your environment minus JunOS's own `JUNOS_*` settings. Closing a tab keeps a short, redacted tail of its output in the event log for audit.
- **Agent commands are gated and kept apart.** What an agent, a workflow or Hermes runs goes through `POST /api/terminal/agent/exec` and the gateway: only plainly read-only commands (`pwd`, `ls`, `echo`, `git status|log|diff|branch`, no shell punctuation) run at once; **everything else needs a digest-bound, single-use approval** (a shell can do anything, so it is classed as destructive). Each command is logged as an event with its actor and result, runs in the PC's Linux shell with a 60 s limit, a 20 KB output cap and secrets masked, and shows up only in the read-only **Agent** tab. No route lets an agent write to a tab you type in, and the agent tab refuses input.
- **Stop** closes every tab and ends every running agent command; an idle VPS tab closes after 15 minutes.
- **VPS tab.** It goes through the Hermes shim over Tailscale, which is not built yet (#15), so the tab says why it cannot open. `JUNOS_TERMINAL_VPS=mock` gives a scripted stand-in for building the screen. No SSH key or token is used or stored here.
- Sessions do not survive a junosd restart, and there is no scrollback between restarts. On Windows, closing a tab may print "AttachConsole failed" from a node-pty helper when junosd runs with a console; the tab is closed regardless.

### Scout

The **Scout** screen suggests changes for JunOS from feeds you switch on, scored for relevance. **It only reads**: it never installs, edits code, opens a PR or runs a command. Making a card or asking Claude is a separate click of yours.

- **Sources.** Four suggested release feeds (Claude Code, Codex CLI, Vite, React) are added **switched off**: nothing is fetched until you turn one on. You can add any http(s) feed, and an optional **self-report** that reads only counters (runs, failures, waiting approvals), never message or file content. An address with a password in it, or on this machine or network, is refused. Fetching is a plain GET (no cookies), redirects are re-checked, and a feed over 1 MB or slower than 10 s is an error shown on its source.
- **Pipeline.** Collect new items (only the ones not seen before; a title you dismissed or already have a finding for is skipped before any model call), **filter** with a cheap pass, **assess** what is left (relevance 0 to 100, effort S/M/L, risk, what it would touch, why, a suggested change), then publish findings at or above the threshold (default 60) as findings and Inbox `finding` items. What scored lower goes into a weekly **digest** item (built from the stored scores, no model call). Both model calls run through the shared executor: the CLI with tools off, in an empty folder, with the provider's single slot, and the web text wrapped in `<untrusted-data>` markers with a note not to follow instructions in it. A reply that is not the requested JSON fails the run and leaves the items to be tried again.
- **Schedule and budget.** Each source has a cadence (daily or weekly) and Scout looks every 5 minutes for sources that are due. A scheduled run is skipped when the daily model-call budget is spent (default 6) or the plan says its limit is reached; **Run now** always goes ahead.
- **Your clicks.** *Make card* creates a Kanban card in Ideas labelled `scout` (creator `scout`, never assigned), once per finding, with the why, suggestion, link and the finding id. *Ask Claude* starts a chat with the finding's text wrapped as data; it needs the provider notice accepted first. *Dismiss* takes a reason (not relevant, already know, too risky, later): the title never returns, and the last ten dismissals go into the filter prompt as examples.
- Not built: dependency checks (`npm outdated`), web-search "ideas" sources, and a draft-PR proposal (deferred in the spec).

### Home and the command palette

**Home** is a glance, not a place to work: **Needs you** (the top five Inbox items, approvals first), **Running now**, **Next runs**, **Hermes**, **Board**, **Subscriptions**, **Scout** and **Recent projects and files**, plus a quick ask. `GET /api/home` returns one payload with a status for every card (`ok`, `error`, or `stale` with the last good data and when it is from), so a card that fails or is slow never breaks the page: it says so and offers Retry (and tries again by itself a few times). The sign-in checks are slow, so that card is waited for only 0.7 s, keeps loading in the background and is warmed at start. Home follows the event stream and loads in milliseconds from local data. An approval can be approved from Home only when it is not irreversible; anything that sends, deletes or spends is reviewed in the Inbox (Deny is always one click).

**Ctrl K** (⌘K on a Mac), or the Search button in the top bar, opens the **command palette** from any screen. It jumps to every screen, and finds chats, messages, cards, Scout findings, Inbox items, tasks, workflows, projects and indexed files (`GET /api/search`, local data only; a plain text match, with the file index using its own full-text search and its exclusions). It can add a card from what you typed, send it to Hermes, or start a workflow that needs no input, without leaving the page. What you type is never sent to a model on its own: **Ask Claude** is an explicit last row for a sentence, it says it sends the text, and the provider notice still applies. Matches are fuzzy, what you used last comes first, and everything works from the keyboard.

### Backups

JunOS keeps its state in one SQLite database (`~/.junos/junos.db`), so a backup is one file. A copy is taken **every night** (after 03:00 local, at least twelve hours after the last good one), and **when junosd starts if one is overdue**, so a night the PC was off is made up on the next start. Each copy is taken with SQLite's online backup (a consistent snapshot while junosd keeps running), written under a temporary name, folded into one self-contained file, then **opened again on its own and checked**: SQLite's integrity check, the tables JunOS needs, and that it holds at least the events that existed when the backup began. Only a copy that passes is given its real name (`backups/junos-<time>.db`, readable by you alone). A copy that fails is deleted, recorded, and raised as an urgent Inbox item; the earlier good backups are never touched. The newest 14 good backups are kept. A half-written copy left by a crash is removed at start.

The **Backups** screen lists every attempt with its result and size, has **Back up now**, and says when the next one is due. To check a file by hand: `npm run backup:verify -- <file>` (exit code 0 means usable). **To restore:** stop junosd, check the backup, keep the current `junos.db` aside, copy the backup over `junos.db`, delete `junos.db-wal` and `junos.db-shm` beside it, and start junosd. Browsers stay paired, because sessions are in the database. A backup contains your chats, approvals and everything else in the database, so keep the folder as private as the database itself. Not covered: copying the backups off this machine, and the workflow, Hermes and `files` folders (workflows are plain YAML files you can copy).

### Running without the dev server, and the desktop wrapper

junosd serves the **built web app** (`npm run build`, then open `http://127.0.0.1:4777`), so there is one thing to run and no Vite. The files come from `apps/web/dist` (or `JUNOS_UI_DIR`) and only that folder is reachable: no hidden files, no links, no way up a folder, and every page carries a strict content policy (its own scripts only, no framing). The app is public (it holds nothing private and is where pairing happens); the API still needs the pairing. `apps/desktop` is a [Tauri](https://tauri.app) wrapper with a tray icon, start with the OS and close-to-tray. It builds and was checked on Windows 11 (tray icon, Run entry, `--hidden` start, close to tray, single instance, starting junosd); a real restart and the installer were not checked: see `apps/desktop/README.md`.

### Connections

`GET /api/connections` powers the Connections screen: one card per provider with a single state (`connected`, `needs_login`, `rate_limited`, `degraded`, `unavailable`, `unknown`). It is built from offline checks only: `claude auth status`, `codex login status` and `cursor-agent status`, plus plan limits seen in earlier runs (`provider.rate_limited` events). Nothing is sent to a provider and no email, organisation or token is ever returned. A provider signed in with an API key shows as `degraded`, because JunOS does not use API keys. Grok is shown as coming, Nous Portal as reached through Hermes, and Cursor as signed in with chat to come.

`JUNOS_CLAUDE_BIN`, `JUNOS_CODEX_BIN` and `JUNOS_CURSOR_BIN` override the CLI commands (tests point them at fakes). Recorded real output of `claude`, `codex` and `cursor-agent` is in `apps/daemon/test/fixtures` and the parser is tested against it.

## Running junosd as a service (Windows)

`scripts/install-service.ps1` registers a per-user scheduled task that starts junosd at logon; `scripts/uninstall-service.ps1` removes it. Stop junosd with Ctrl+C, SIGTERM, or by ending the task. A hard kill leaves a stale `junosd.lock`, which the next start takes over; SQLite runs in WAL mode so the event history survives.

Stack: Vite, React, TypeScript, React Router, Node.
