**Verdict:** As a daemon/shape sketch this doc is clear; as the spine for an Operate product UI it under-specifies shell, density, realtime UX, and auth enough that “plain CSS keep as-is” plus a wide event surface risks a generic, noisy app. Findings below are from this file only, read through impeccable Operate + design-taste app-screens.

---

### Contradictions (within the doc)

1. **SSE and WebSocket at once** — Shape says `HTTP + SSE/WebSocket` with no rule for which stream carries what. For Inbox / Home feed / activity timeline that ambiguity becomes dual clients, double reconnect logic, and inconsistent live UX.

2. **Scout is and isn’t special** — Bullet list includes a dedicated `Scout runner`, while the note says scout is “a scheduled workflow, not a special case.” That fights the later claim that views are mostly “queries over events” with scout as just another producer.

3. **Event-sourced views vs kanban cards** — Event types include `kanban.card.*` and “materialized tables,” but the reliability section only talks about runs. Unclear whether kanban is event-projected, CRUD, or both—material for hierarchy and optimistic UI later.

4. **Product shell unresolved** — Opening shape is “Browser (Vite…)”; open questions float Electron/Tauri tray + auto-start. Packaging changes first-run, offline, and how “daemon down” reads—architecture shouldn’t leave the primary chrome undecided.

---

### Gaps (architecture + Operate UI)

| Gap | Why it matters for this product |
|---|---|
| Token auth undefined | “Token-protected” with no mint, store, rotate, bind-to-loopback, or CSRF story for REST mutations |
| Bind address / CORS | Localhost only vs `0.0.0.0` (Tailscale later) changes threat model and cookie/token rules |
| Daemon-down / reconnect UX | Scheduler and feeds assume the daemon; no offline, reconnect, or “junosd not running” surface |
| UI ↔ daemon discovery / version skew | Monorepo split with no protocol version or capability handshake |
| Live stream → UI contract | Event flood (`chat`, `run.*`, `task`, `inbox`, `kanban`, `scout`, `connection`) with no filter, priority, or per-view subscription |
| States for Operate | No loading / empty / error / partial-failure vocabulary for adapters, runs, or the bus |
| Visual system | “Plain CSS with tokens (see 14), keep as-is” — no product face, shell, density target, or type scale here |
| Motion | Realtime feeds need motion rules (impeccable Operate: 150–250ms, state-only; no page-load choreography)—absent |
| Phone | Tailscale “later” with no density/nav story for inbox/kanban on small screens |

App-screens lens: an inbox + home feed + timeline needs **one primary job per screen**, trade vocabulary (not “Items”), honest empty/zero states, and colour on data not chrome. This doc names surfaces via event types only—no IA, shell, or “first question” per view.

---

### Unrealistic scope

- **One daemon owns:** API, bus+SQLite, scheduler+catch-up, workflow runner+approvals, five provider adapters, Hermes, file indexer/watcher, and scout—while Phase 1 is only “move `src/` into `apps/web` once the daemon exists.” That’s a full local OS for agent work, not a thin Phase 1.
- **`run(): AsyncIterable` + cancel + resumable-or-clean-fail** across heterogeneous CLIs (pty “only where demanded”) is the hard reliability problem; the doc treats it as one interface line.
- **Catch-up `skip | run once | run all missed`** for every persisted job, with truncated audit storage, without backlog, cost, or approval interaction—easy to thrash providers and the UI feed on restart.
- **Five providers + Hermes + files + scout + kanban + inbox** in the same event vocabulary before any product face or shell is specified invites a dashboard-of-everything.

---

### Security / privacy risks (from this text alone)

1. **Localhost token without details** — Bearer on loopback is fine until something binds beyond `127.0.0.1`, a malicious page hits the API, or the token lands in logs/devtools. No mention of Origin checks, loopback-only bind, or short-lived tokens.

2. **Tailscale / phone later** — Expands from “browser on the same machine” to a reachable service; secrets and run output that were “local” become network-adjacent without a new threat model in this doc.

3. **Secrets out of browser storage — good** — But adapter/CLI/session material and `~/.junos/junos.db` encryption, backups, and file-mode aren’t specified here. One file holds events, runs, and likely secrets-adjacent metadata.

4. **Run output stored (truncated) for audit** — Provider streams often contain prompts, paths, snippets, and tool args. Truncation ≠ redaction; event types like `chat.message` and `scout.finding` amplify retention risk.

5. **`execa` / pty for CLIs** — cwd, tools, and systemPrompt on `RunRequest` are a command- and prompt-injection surface if anything untrusted can enqueue runs (inbox → workflow → adapter). Not scoped here.

6. **SSE/WebSocket fan-out** — Broad event taxonomy to the UI risks oversharing (e.g. connection/plan/usage, scout, kanban) on one channel without per-view ACLs—even for a single user, that’s accidental logging and shoulder-surfing surface.

7. **ToS / machine-bound sessions** — Correct rationale for no hosted backend; still leaves local malware, backup sync of `~/.junos`, and shared-machine exposure unaddressed.

---

### UI / design-quality problems (skills lens)

Mode: **Operate** (task UI), not Persuade. Ambition should be precision and restraint—not marketing motion.

**Hierarchy / IA**  
Surfaces appear only as event-derived views (Inbox, Home feed, activity timeline) plus implied chat, kanban, scout, connections. No primary nav, no “one job of the home screen,” no priority among live streams. App-screens warn: first screen thin, nothing to do, product missing → “kit not product.” This architecture doesn’t prevent that.

**Density**  
Realtime bus + many event types without aggregation rules invites a noisy feed (every `run.step`, `kanban.card.*`, `scout.finding`). Operate and app-screens want dense, scannable data—not undifferentiated activity chrome. Missing: coalesce, severity, and mute.

**Typography / spacing**  
Only “plain CSS + tokens, keep as-is.” No rem scale, measure, or shell rhythm. Operate wants a tight fixed scale (≈1.125–1.2), one family, labels not display type. “Keep as-is” with no quality bar freezes whatever slop is already there.

**Motion**  
SSE/WS updates with no guidance → default fade spam or layout jump on every event. Skills want state feedback only, reduced-motion safe, no load choreography. Doc silent.

**Legibility / contrast**  
Streaming “thinking,” tool, and status lines tend toward muted grey-on-grey. App-screens: running meaning in full ink; colour on data/change, not chrome. No semantic token map (error/warn/success/info) in architecture.

**Product face**  
No mark, name-in-shell, or Junos-specific signature element (e.g. run timeline as the hero object). design-taste’s “give the product a face” is entirely deferred to “see 14,” while this doc already locks stack and “keep styling.”

**Tauri/Electron vs tab**  
Tray + auto-start changes empty states (“daemon starting”), focus stealing, and notification density—unresolved while the UI is already assumed to consume a live bus.

---

### What the doc does well

- Clear **why daemon / why not hosted** (CLI sessions, cron while tab closed, secrets off the browser).
- **Adapter boundary** is the right seam for providers.
- **Append-only events + query views** is a coherent mental model *if* projection and subscription rules get specified.
- Reliability intent (resumable/fail-clean, catch-up, stored output) is stated even if under-scoped.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Pick **one** realtime transport (or a one-line matrix: SSE for events, WS only if …).  
2. Split **Phase 1 daemon** (API + bus + one adapter + chat runs) from indexer/scout/kanban/Hermes.  
3. Specify **loopback bind, token lifecycle, and what run/chat events must never store**.  
4. Add a short **Operate UI contract**: shell (product name + scope), primary job of Home vs Inbox, event subscription filters, density/coalesce rules, semantic states, motion = state only + `prefers-reduced-motion`.  
5. Resolve **tab vs Tauri** enough to define first-run and daemon-down UX.  
6. Reconcile **scout**: either a normal scheduled workflow with no special runner bullet, or an explicit special case with why.

I did not run impeccable’s live detector/browser critique—the target is a markdown architecture spec, not a rendered surface.
