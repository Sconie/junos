# Hermes agent console

## What Hermes is here
Jonas's autonomous personal agent (Nous Research's Hermes family of models, run via Nous Portal or locally). JunOS does not re-implement the agent loop; it **supervises** it: sends directives, shows live activity, edits memory, gates risky actions.

## Integration contract (Hermes bridge)
Hermes must expose, or be wrapped to expose, this minimal interface. The wrapper lives in the daemon.
```
POST /hermes/directives   {text, projectId?, priority}      -> {directiveId}
GET  /hermes/status       -> {state: online|idle|working|paused|error, currentTask, model, uptime}
GET  /hermes/stream       -> SSE of steps: {id, type: shell|browser|file|api|message, summary, input, output, status, ms}
POST /hermes/pause | /resume | /stop
GET/PUT /hermes/memory    -> list/edit key facts
GET/PUT /hermes/skills    -> list/toggle tools
GET  /hermes/queue        -> pending tasks
POST /hermes/approvals/:id {decision}
```
**Deployment (confirmed by Jonas, 2026-10-21): Hermes runs on a VPS**, not on the machine running junosd. So the bridge is remote:
- junosd reaches the VPS over a private channel only: Tailscale/WireGuard, or an SSH tunnel. The Hermes API is never exposed on the public internet.
- Auth: a dedicated bridge token (kept in the OS keychain) plus the private network; rotate on demand.
- A small **hermes-agent-shim** on the VPS (systemd service, bound to the private interface) translates between Hermes (CLI/gateway) and the wire format above, and tails its logs and memory files. Until it exists, the UI runs on a mock.
- The SSE stream must tolerate reconnects: the shim keeps a short ring buffer and junosd resumes by `Last-Event-ID`.
- Hermes works on the VPS filesystem, not Jonas's local files. Projects handed over are synced by git (push branch, Hermes clones) or an explicit upload; "Give to Hermes" on a local file uploads a copy and says so.
- Status adds `unreachable` (VPS or tunnel down) distinct from `error`.

Defining the wire format first (and mocking it) lets the UI be built before Hermes is connected. **Container (confirmed by Jonas, 2026-10-22): Hermes runs in a Docker container on the VPS.** Consequences:
- The shim runs as a sidecar container (or on the host) on a private Docker network; only the shim publishes a port, bound to the Tailscale/private interface. Hermes itself publishes nothing.
- Memory, skills and logs live in named volumes (or bind mounts) so they survive redeploys; the shim mounts them read-only for the Memory/Skills/Logs tabs, and writes memory only through Hermes's own interface.
- Hermes's workspace is a dedicated volume. Project handoff = git clone into it, or an upload into it; nothing else on the host is mounted.
- Lifecycle controls (Restart, Update image) go through the shim calling the Docker API with a restricted socket proxy; never mount `/var/run/docker.sock` into Hermes.
- Run with a non-root user, dropped capabilities, resource limits, and a restart policy; health check feeds the status pill.
**Telegram (confirmed by Jonas, 2026-10-22): Hermes is already connected to Telegram.** Today that is Jonas's only way to talk to it, so JunOS must coexist with it rather than replace it:
- Telegram stays a first-class channel: Jonas can keep messaging Hermes from his phone, and JunOS shows those exchanges too. The shim observes Hermes's conversation and activity log (not the Telegram bot token) and mirrors Telegram messages into the console and agent chat with a `via Telegram` badge.
- Directives sent from JunOS are delivered to Hermes through its normal gateway so they behave exactly like a Telegram message (same memory, same session), and replies can optionally be echoed to Telegram. Setting per directive: `echo to Telegram` off by default.
- Approvals can be answered from either place: the Inbox item and a Telegram prompt (inline buttons) resolve the same approval; first answer wins and the other is marked resolved. Approval decisions still pass the junosd-side check from 12.
- The Telegram bot token stays on the VPS, in the container's secrets. JunOS never stores it. The bot should only answer Jonas's numeric Telegram user ID (allowlist); confirm this is set.
- Phone fallback: if JunOS is unreachable, Telegram still works, and mirrored history catches up when the shim reconnects.
- Notifications: urgent Inbox items could be pushed via the same Telegram bot (decision for Jonas, see open questions), which removes the need for a separate push service.
**Still needed from Jonas:** how the Hermes gateway inside the container can be reached by the shim (CLI, local HTTP/API server, or only via the Telegram gateway), where its memory lives in the volume, and whether Tailscale is available.

## Screen (matches mockup)
Header: name, status pill (pulsing when working), model, uptime, Pause/Stop/Settings.
Left 40%: directive stream, a chat with Hermes (uses the shared chat component, `kind=agent`).
Right 60%: Activity timeline of steps as cards with icon, summary, duration, expandable input/output; running step shimmers.
Bottom tabs: **Memory** (editable chips with pin), **Skills/Tools** (toggles), **Logs** (raw), **Queue** (tasks handed over from Tasks/Kanban).

## Behaviors
- **Autonomy levels**: Ask-first, Balanced (default), Autonomous (wider write-local in allowlisted worktrees only). Per project. They never override the invariants in 12: external-send, destructive and spend actions always need a digest-bound approval enforced by the junosd gateway.
- **Approvals** appear as Inbox items and as a banner in the console; the step waits (timeout configurable, default 30 min, then auto-deny).
- **Kanban link**: Hermes can create cards, move its own cards, and pick up cards labelled `hermes` in the Ready column (see 09).
- **Stop** follows the state machine in 12 (requested, cancelling, stopped). The header shows `stop not confirmed` if the VPS is unreachable; completed side effects are listed.
- **Memory hygiene**: memory writes by Hermes are proposed as a diff in the Memory tab until Jonas pins them (optional setting).
- **Handoff from anywhere**: "Give to Hermes" button on files, projects, chat messages and cards creates a directive with the context attached.

## Acceptance criteria
- The mock is validated against a recorded real Hermes session (including Telegram-originated activity) before Phase 3 is done.
- With a mock Hermes, the console renders status, a live step stream, queue and memory edit.
- A step that needs approval pauses and is resolved from the Inbox.
- Stop halts within a few seconds and is logged.

## Open questions
- Resolved: Hermes runs on a VPS (see Deployment). Open: file sync strategy for projects (git vs upload).
- One Hermes or several named agents? Data model already allows many (`agent` table).
