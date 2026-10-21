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

Defining the wire format first (and mocking it) lets the UI be built before Hermes is connected. **Still needed from Jonas:** how Hermes runs on the VPS (CLI, gateway, Docker?), where its memory lives, and whether Tailscale is available.

## Screen (matches mockup)
Header: name, status pill (pulsing when working), model, uptime, Pause/Stop/Settings.
Left 40%: directive stream, a chat with Hermes (uses the shared chat component, `kind=agent`).
Right 60%: Activity timeline of steps as cards with icon, summary, duration, expandable input/output; running step shimmers.
Bottom tabs: **Memory** (editable chips with pin), **Skills/Tools** (toggles), **Logs** (raw), **Queue** (tasks handed over from Tasks/Kanban).

## Behaviors
- **Autonomy levels**: Ask-first (every outward/destructive step needs approval), Balanced (default; reads free, writes in allowlisted folders free, shell/network/mail ask), Autonomous (log only). Level is per project.
- **Approvals** appear as Inbox items and as a banner in the console; the step waits (timeout configurable, default 30 min, then auto-deny).
- **Kanban link**: Hermes can create cards, move its own cards, and pick up cards labelled `hermes` in the Ready column (see 09).
- **Kill switch**: Stop is always visible; Stop cancels the current step and drops queue to paused.
- **Memory hygiene**: memory writes by Hermes are proposed as a diff in the Memory tab until Jonas pins them (optional setting).
- **Handoff from anywhere**: "Give to Hermes" button on files, projects, chat messages and cards creates a directive with the context attached.

## Acceptance criteria
- With a mock Hermes, the console renders status, a live step stream, queue and memory edit.
- A step that needs approval pauses and is resolved from the Inbox.
- Stop halts within a few seconds and is logged.

## Open questions
- Resolved: Hermes runs on a VPS (see Deployment). Open: file sync strategy for projects (git vs upload).
- One Hermes or several named agents? Data model already allows many (`agent` table).
