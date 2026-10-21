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
If Hermes is a CLI process, the wrapper holds the process and translates stdout to this schema. Defining the wire format first (and mocking it) lets the UI be built before Hermes is connected. **Needs from Jonas:** how Hermes runs today (CLI, gateway, Docker?) and where its memory lives.

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
- Does Hermes run on the same machine as junosd? (affects file access and latency)
- One Hermes or several named agents? Data model already allows many (`agent` table).
