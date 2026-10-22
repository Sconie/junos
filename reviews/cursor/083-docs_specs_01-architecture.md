**Verdict:** Solid local-daemon split and adapter boundary, but the bus and view list bake in a full product surface set, SSE vs WebSocket and “token vs no browser secrets” collide, and the doc never constrains Operate UI density for live streams, feeds, or status.

*Lens: impeccable Operate + design-taste app-screens / house rules. Spec only — no detector/browser.*

---

### Contradictions (inside this doc)

1. **Transport**  
   Shape: `HTTP + SSE/WebSocket`. Event bus: “SSE to the UI” only. Cancel and bidirectional control usually want a request path or WS; the doc never picks one stack.

2. **“Secrets must not live in browser storage” vs “token-protected”**  
   The UI must authenticate somehow. If the daemon token sits in `localStorage`/memory-persisted store, it *is* a browser-held secret. If it is ephemeral only, that rule is missing. Same paragraph forbids and implies browser-held auth material.

3. **Scout: not special vs special**  
   Shape: Scout is “a scheduled workflow, not a special case.” Event catalog still has dedicated `scout.finding`. Either Scout is just another workflow (no special event) or it is a first-class product type — the doc says both.

4. **Localhost-only vs Tailscale later**  
   “Keep everything on localhost” then “optionally expose through a private tunnel … for phone access.” Token-on-localhost ≠ token-on-Tailscale (CSRF, bind address, who can open the UI). Phone access quietly expands the trust model without new rules.

5. **UI cannot touch the filesystem vs File indexer + views**  
   Correct daemon split, but “Views (Inbox, Home feed, activity timeline)” never says how Files/projects appear. A reader can infer either “files only via daemon APIs reflected as events” or a hole in the shape diagram.

6. **Hermes bridge vs provider list**  
   Adapters: `claude | codex | cursor | grok | nous`. Hermes is a peer box in the shape, not an adapter id. Unclear whether Hermes is transport, a provider, or a separate product surface on the same bus.

7. **SQLite choice**  
   Shape: `better-sqlite3 or libsql`. Tech table: “SQLite (WAL)” only. Dual client libs are different ops/backup stories; the doc leaves both live.

8. **Open questions vs implied shell**  
   Electron/Tauri vs “plain localhost tab” is open, but the shape already assumes a browser Vite app as the UI. Tray/auto-start would change process lifetime and how “tab closed / crons still run” is explained — already cited as why a daemon exists.

---

### Gaps (this doc alone)

| Gap | Why it matters under these skills |
|---|---|
| Bind address / listen policy | “Localhost” is not `127.0.0.1`-only. Operate tools that exec CLIs need an explicit non-LAN default. |
| Token lifecycle | Issue, rotate, revoke, CSRF for cookie vs bearer, what happens on first run — none specified. |
| What may live in `~/.junos/junos.db` | Events + runs + jobs; no line that secrets/sessions stay out of SQLite or how backup is treated. |
| Event payload shape / redaction | Bus will carry chat, tools, scout, kanban — no retention, truncation *of event payloads*, or UI-safe vs audit-full split (only run *output* truncation is named). |
| Daemon-down / reconnect UX | Architecture of SSE with no offline, backlog, or “daemon not running” contract for the Operate shell. |
| Streaming UI contract | `token \| thinking \| tool \| done \| error` is a density bomb; no hierarchy (what collapses, what is default-visible). |
| Approval in the runner | Workflow “approvals” named; no event/API for pending approval as a first-class Inbox/Home job. |
| One primary job for named views | Home feed + activity timeline + Inbox are three peer feeds over the same bus — no “Home answers X.” |
| Shell / nav from architecture | Tech picks Query + Zustand + plain CSS; no IA constraint so the bus’s event types become the nav. |
| Migration blast radius | “Move `src/` into `apps/web` once the daemon exists” with no interim API compatibility or strangler rule. |

Undefined for a new reader: **Hermes**, how **effort** maps (deferred to 03 — fine), and whether **materialized tables** are the source of truth for Kanban/Inbox or caches of events.

---

### Unrealistic scope

The shape diagram is not a thin Phase-1 slice. In one process it commits:

- REST + event stream  
- Event bus + SQLite  
- Scheduler with catch-up policies  
- Workflow runner (steps, retries, approvals)  
- **Five** provider adapters  
- Hermes bridge  
- File indexer/watcher  
- Scout (even if “just a workflow”)  

Reliability adds resumable runs across CLI/pty providers — hard for opaque third-party CLIs — plus audit storage and catch-up (`skip` / `run once` / `run all missed`).

Repo layout then adds monorepo split (`apps/web`, `apps/daemon`, `packages/shared`) and a migrate-the-existing-app step.

Skill lens: Operate products fail when the architecture enumerates every product noun as a peer subsystem on day one. This reads like the full JunOS platform spine, not “daemon + one adapter + chat stream + auth.”

---

### Security / privacy risks (from claims here)

1. **Credential & session aggregation** — One daemon + five adapters + CLI/pty = one process that can act as every subscription. No keychain, OS secret store, or “sessions never written to `junos.db`/events.”

2. **Auth token vs “no secrets in the browser”** — Unspecified token storage is the classic localhost footgun: XSS in the Vite app, extension access, or shared-machine browser profile becomes daemon access.

3. **Listen + Tailscale** — “Token-protected” without loopback-only, origin checks, and a stronger story for tunneled access turns personal CLI power into a remote agent API.

4. **Append-only events as a high-sensitivity log** — Chat, tools, scout findings, file-index side effects, connection changes: one SSE feed to the UI. Compromise of DB or token ≈ full history. Truncation is only called out for run *output*, not events.

5. **File indexer/watcher** — Continuous FS visibility next to agent runners; no path allowlist, ignore rules, or “never index ~/.ssh / keychains” in this doc.

6. **`execa` + pty** — Full user privileges; cancel exists, but no sandbox, cwd jail beyond `RunRequest.cwd?`, or tool-egress policy at the architecture layer.

7. **Backup of `~/.junos/junos.db`** — “Easy backup” is also easy exfil if the file holds transcripts and connection metadata.

---

### UI / design quality (what this architecture commits)

Mode: **Operate** (task UI over a local daemon). Ambition here should be precision and scanability, not atmosphere.

**Hierarchy** — Event types already mint equal product nouns (`inbox`, `kanban`, `scout`, `chat`, `task`, `connection`). Views named: Inbox, Home feed, activity timeline. That is three feed metaphors plus every domain event with no primary surface or “one question per screen.” App-screens: first screen answers one job; frequent action one click away. This bus invites a command-center home that shows everything.

**Density** — Live `AsyncIterable` of `token | thinking | tool` plus a global SSE bus is the default AI-dashboard failure: every step visible, every event toastable. No collapse rules, sampling, or “thinking behind a disclosure.” Risk: noisy timelines that fail the Operate “tool disappears into the task” test.

**Typography** — Deferred to “plain CSS with tokens (see 14).” Architecture doesn’t force Inter/Geist, which is good, but also doesn’t require a loaded face or an Operate scale (tight ratio, headings often ≤24px on app screens). Gap, not a hard fail — ownership is unclear between 01 and 14.

**Spacing / layout** — No shell grid, panel rhythm, or “colour on data not chrome.” Materialized views over events tend to produce stacked cards/feeds unless 14 constrains them. Taste app-screens: flat surfaces, tone steps, quiet nav — none of that is gated here.

**Motion** — SSE/WebSocket updates with no motion budget. Impeccable Operate: 150–250ms, state only, no page-load choreography. Unconstrained live feeds usually add badge pulses, list inserts, and stream autoscroll that fight `prefers-reduced-motion` and scanning.

**Legibility / contrast** — `connection.changed`, `run.failed`, usage/plan on adapters need semantic state colours. Doc never requires contrast-safe status (or forbids decorative accent on chrome). Streaming “thinking” in muted grey is a common contrast miss — not specified either way.

**Design specificity** — “Vite + Query + Zustand + token CSS + event-sourced feeds” is a generic local AI console. The distinctive idea (subscription CLIs on *this* machine, approvals, daemon while the tab is closed) never becomes a UI/architecture signature (e.g. connection health as the shell’s one data hue, approval as the primary Inbox job). Without that, implementers will ship kit UI on a powerful bus.

| Architecture commitment | Skill position |
|---|---|
| Plain CSS + tokens | Aligns (no UI framework tax) |
| Home feed + activity timeline + Inbox | Too many peer feeds; pick one primary job |
| Full event catalog ≈ full product | Bake v1 event subset or demote types |
| Live token/thinking/tool stream | Needs density/disclosure rules or UI will slop |
| Token-protected localhost (+ Tailscale later) | Auth/bind/tunnel rules before UI polish |
| Electron/Tauri open | Shell chrome undecided; don’t design tray + tab as one |

---

### Priority fixes (if this doc is revised)

1. Pick **SSE vs WebSocket** (and where `cancel` lives); state **loopback bind + token lifecycle** so “no browser secrets” is coherent.  
2. Cut the shape to a **Phase-1 spine** (daemon, DB, one adapter, chat run stream, scheduler stub); demote Hermes/Scout/files/kanban to later or “events reserved.”  
3. Resolve **Scout / Hermes / nous** naming so the bus doesn’t invent peer product surfaces by accident.  
4. Add one Operate sentence: **primary UI job**, stream disclosure rules, and daemon-offline state — so 14 cannot be blamed for a feed-of-everything shell.

I can go deeper on any one section (auth model, event schema, or streaming UI contract) if you want that next.
