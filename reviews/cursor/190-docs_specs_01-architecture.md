Shell is blocked in Ask mode, so this review is of the workspace `docs/specs/01-architecture.md` as read (claimed revision / commit `2e87f7e`). No live UI to inspect — lenses are applied to what this architecture *specifies, implies, or omits* for an Operate-mode product shell.

---

## Verdict

The shape is sound for a local, ToS-bound multi-provider agent hub: browser thin, daemon thick, gateway for side effects, SSE not WebSocket. As a **single architecture doc**, it under-specifies the security boundary once “localhost” stops being absolute, parks UI quality entirely in “see 14,” and already inventories a large product surface (inbox, home, kanban, scout, files, Hermes, approvals) as peer infrastructure — scope risk dressed as topology.

---

## Contradictions (within this doc)

1. **“Open questions” that aren’t open**  
   The first bullet under Open questions is marked **Decided** (browser first, Tauri Phase 5, Windows user auto-start day one). Either rename the section or move decided items out. The second bullet (launchd/systemd day one?) then conflicts with “from day one” for Windows without stating platform scope for Phase 1.

2. **Sleep vs always-on**  
   Crons live in junosd on the laptop; “laptop sleep matters” is acknowledged. Separately, the daemon is a **user-level auto-start service from day one**. Auto-start ≠ awake. The doc never resolves whether Phase 1 reliability assumes “machine usually on” or whether sleep miss is accepted product behavior.

3. **Scout: special case / not special case**  
   Shape lists `Scout runner` as its own box; prose says scout is “a scheduled workflow, not a special case.” One of those framings should win in the diagram (workflow runner only, or a named facade over the same runner).

4. **Localhost purity vs remote access**  
   “Keep everything on localhost” and cookie-authenticated localhost sit next to Tailscale/WireGuard/SSH to the VPS and “optionally expose… for phone access later.” The trust model is written for loopback, then foreshadows non-loopback clients without updating auth, bind address, or CSRF assumptions in this doc.

5. **Secrets “must not live in browser storage” vs cookies**  
   Intent is clear (no provider tokens in `localStorage`), but cookie auth *is* browser-held credential material. Without HttpOnly / SameSite / path / binding rules here, the slogan and the mechanism look at odds to a careful reader.

6. **DB choice left as OR**  
   `better-sqlite3 or libsql` in Shape, then “SQLite (WAL)” in the table — fine as TBD, but libsql changes deployment/sync story; calling it interchangeable understates the fork.

---

## Gaps

| Area | What’s missing in *this* doc |
|---|---|
| **Bind & exposure** | Listen on `127.0.0.1` only? What changes when Tailscale phone access arrives? |
| **Auth** | Cookie issuance, rotation, CSRF for “commands use plain HTTP,” multi-tab sessions, logout, daemon restart invalidation |
| **SSE** | One multiplexed stream vs “per subscription”; backpressure; max replay buffer; who may see which event types |
| **Execution boundary** | Gateway is “see 12” only — architecture doesn’t state hard invariants (e.g. no adapter `exec` bypass) |
| **File indexer** | Watch roots, exclusions, PII, CPU/IO budget — unbounded watcher is a reliability and privacy hole |
| **UI IA** | Inbox / Home feed / activity timeline named as event queries; no primary job per surface, no shell hierarchy, no density budget |
| **Failure UX** | “Reconnecting” banner only; no offline, partial provider outage, or approval-while-disconnected behavior |
| **Retention** | Truncated run output “for audit” — how long, where, redaction of prompts/secrets |
| **Cross-platform day one** | Windows auto-start decided; macOS/Linux left as question while providers/CLIs are cross-platform |

Deferring detail to 05/06/12/14 is fine; leaving **security-critical defaults** and **Operate-mode product face** with no invariants here is not.

---

## Unrealistic / overloaded scope

Architecture presents as peer subsystems:

API · event bus · SQLite · gateway · scheduler · workflow runner · N provider adapters · Hermes bridge · file indexer/watcher · scout · plus UI already implying Inbox, Home, Kanban, approvals, activity.

For a personal daemon, that’s a **platform**, not a Phase 1 spine. Unrealistic pressure points:

- **Event-sourced “views are queries over events”** for inbox, home, and timeline before a minimal chat+run loop is proven.
- **Persisted scheduler + catch-up policies + resumable runs + audit store** as day-one reliability rules alongside monorepo migrate (`src/` → `apps/web`) and Windows service install.
- **Hermes-on-VPS** in the same shape diagram as local CLIs — network and ops complexity that isn’t required to validate the local adapter+SSE core.

A tighter architecture doc would mark a **critical path** (daemon + one adapter + SSE + gateway stub + one UI surface) vs **named later boxes**.

---

## Security / privacy risks

**High**

- **Loopback assumption is the whole perimeter.** Cookie + HTTP commands with no stated origin check, CSRF strategy, or bind address becomes dangerous the moment anything non-local can reach the port (mis-bind, tunnel, “phone later”).
- **Daemon = keys to the kingdom.** It can run CLIs, touch the filesystem, and sit beside provider sessions. Compromised UI XSS or a malicious page on another local port talking to the API is catastrophic unless same-origin and CSRF are explicit.
- **SSE replay (`Last-Event-ID`).** Historical `chat.message`, `scout.finding`, run output, approvals — sensitive. Authz must be event-scoped; “at-least-once + idempotent by seq” alone doesn’t prevent cross-user (here: cross-session) leakage if the cookie is weak or shared.

**Medium**

- **`~/.junos/junos.db`** as single file with audit/run transcripts — backup, encryption-at-rest, and “don’t sync this folder to cloud” aren’t mentioned.
- **File indexer/watcher** — silent ingestion of project trees into a queryable index is a privacy product decision, not only a feature.
- **Moving junosd to VPS** (sleep fix) correctly flags provider ToS; it also relocates the entire secret surface. Treat as a **different threat model**, not a small deploy tweak.
- **pty “where a CLI demands it”** — interactive CLIs expand attack and exfil surface; belongs under gateway policy, not only `execa` tooling.

**Lower / wording**

- “Nothing on the VPS holds subscription logins for the other providers” is good; Hermes shim still needs its own credential story (even if “see 06”).

---

## UI / design-quality (impeccable Operate + design-taste app-screens)

This doc is infrastructure-first. For an **Operate** surface (task completion, scanability, native expectations), that’s a design risk: the event bus becomes the product metaphor.

### Hierarchy & IA
- Naming **Inbox, Home feed, activity timeline** as symmetric “queries over events” predicts three competing “what’s happening” surfaces with no **one question per screen** (app-screens §: first screen answers the job; most frequent job one click away). Architecture should state the primary shell job (e.g. “approve or continue the active run”) vs secondary logs.
- No product **face** constraints (name/mark in shell, trade vocabulary, one signature element). Easy to ship a generic agent dashboard.

### Density & cognitive load
- Fan-in of event types (`chat`, `run.*`, `task`, `inbox`, `kanban`, `scout`, `connection`) into shared feeds invites **timeline sludge** — high density, low priority. Prefer architecture rules: severity/actionability tiers, what never appears in Home, what is Inbox-only.
- Approvals are high-stakes; “re-read before enabling Approve” is correct for safety but says nothing about **confirmation hierarchy** (what’s primary, what’s audit chrome).

### Spacing / typography / legibility / contrast
- Styling is “Plain CSS with tokens (see 14)” — good anti-framework choice. **This** doc still needs Operate floors if 14 isn’t loaded: running text in full ink, status banners meeting contrast, no soft-grey body copy for run output, tabular figures for usage/tokens.
- “Reconnecting” banner: useful; without hierarchy rules it becomes permanent chrome and fights content (noise vs system status).

### Motion
- SSE will drive frequent UI updates. No motion budget, no `prefers-reduced-motion`, no rule that stream tokens must remain readable without animation. Taste/impeccable both treat motion as purposeful feedback, not stream decoration — architecture should forbid animating every token/event.

### Slop traps this topology encourages
Left unconstrained, event-query UIs drift toward: KPI tiles for provider status, sparkline usage, icon-in-tinted-square connection cards, zebra activity tables, dark sidebar + coloured active pill. App-screens explicitly rejects that pattern set (**colour on data not chrome; KPIs as type; flat surfaces**). Architecture should either point at those as **non-goals** or require 14 to bind them — silence here is permission.

### Mode mismatch seed
- Phase 5 Tauri (tray, auto-start) vs Phase 1 “open a browser tab” means the **emotional journey** for “did my cron run?” is weak on day one while the daemon claims always-on. That’s a product UX gap owned by this reliability story, not only by 14.

---

## What’s strong (keep)

- Clear **trust split**: UI cannot touch CLIs/filesystem; daemon can; no hosted backend for subscription tokens.
- **SSE + HTTP** with `seq` / `Last-Event-ID` / `resync` and idempotent handlers — realistic local streaming.
- **Stale approval** guard called out at architecture level.
- **Gateway** as single side-effect door (even if details live in 12).
- Plain CSS tokens, shared Zod, same language UI/daemon — coherent for a one-person system.

---

## Priority fixes to this doc (if you revise it)

1. Split **Decided** vs **Open**; state Phase 1 OS and sleep/miss policy explicitly.  
2. Write **security invariants** here: bind `127.0.0.1`, cookie flags, CSRF for mutating HTTP, “no non-loopback until auth model X.”  
3. Collapse scout into workflow runner in the diagram *or* justify the extra box.  
4. Mark a **Phase 1 critical path** vs later event-view sprawl.  
5. Add 5–10 lines of **Operate UI constraints**: primary job of the shell, anti-dashboard-slop, reconnecting/approval hierarchy, reduced-motion for streams — even if tokens live in 14.

I did not open 12/14/others per your “ONLY this doc” rule; cross-refs are treated as deferrals, not verified consistency.
