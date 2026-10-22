**Verdict:** Solid local-first skeleton, but thin on trust boundaries, client protocol, and Operate-mode UI constraints. Several open forks (SSE vs WebSocket, shell vs tab) will cascade into security and design debt if left open into Phase 1.

---

### Contradictions

1. **Transport is two things at once.** Shape says `HTTP + SSE/WebSocket`; Event bus says only `SSE to the UI`. That isn’t a “decide later” note — it changes reconnect, auth-in-URL, and backpressure for streaming `RunEvent`s.

2. **“UI cannot touch the filesystem” vs `RunRequest.cwd?` / `tools?`.** The UI can’t call `fs` directly, but it can ask the daemon to run providers in a cwd with tools. The real boundary is “UI proposes, daemon executes,” not “UI is filesystem-blind.” The doc sells the stronger claim.

3. **Scout is and isn’t special.** Shape lists `Scout runner` as a peer of Scheduler/Workflow runner, then says it is “a scheduled workflow, not a special case.” Either fold it under the runner or admit scout-specific lifecycle.

4. **Localhost-only vs Tailscale.** “Keep everything on localhost” and “optionally expose through a private tunnel … for phone access” conflict unless binding, auth, and CORS are specified for multi-client. Right now Tailscale reads like a free phone port with no model change.

5. **Append-only events vs “materialized tables”.** Views are “queries over events plus a few materialized tables,” but Reliability never says how materializations rebuild after crash or schema change. Readers can assume either pure event sourcing or dual-write without a rule.

---

### Gaps

| Area | Missing |
|---|---|
| Trust | Who issues the localhost token, lifetime, rotation, storage (cookie vs header), and what a stolen token can do |
| Bind address | `127.0.0.1` only vs `0.0.0.0` (required clarity before Tailscale) |
| Secrets | Where provider sessions/keys live (keychain vs `~/.junos`), not only that they mustn’t be in browser storage |
| Run isolation | Concurrency caps, cwd sandbox, which tools are allowed, who can approve dangerous steps |
| Hermes / indexer | Named in Shape, undefined here (purpose, data written to SQLite, retention) |
| API contract | Versioning, error shape, auth on SSE/WS, idempotency for retries |
| Dual clients | Two UIs (desktop tab + phone) on one event bus: cursors, read state, conflicting actions |
| Shell decision | Electron/Tauri vs tab is open, but tray, auto-start, and deep links change the whole product surface |
| UI architecture | Named surfaces (Inbox, Home feed, activity timeline) with no IA, primary job per screen, or density/mode rules — deferred to “14” without Operate constraints here |

---

### Unrealistic scope (for an architecture that also owns Phase 1 migration)

- Five provider adapters + Hermes + file watcher + scheduler catch-up + resumable workflows + approvals + scout, while moving `src/` → `apps/web`, is a large first cut. “Adapters are the only code that knows how a provider is reached” is right; shipping five idiomatic CLI/pty adapters with true resume is the hard part.
- **“Every run is resumable or cleanly failed”** across heterogeneous CLIs is aspirational until resume semantics are per-adapter (or explicitly “fail clean, never resume mid-stream”).
- **Catch-up `run all missed`** plus long LLM runs is a resource/ToS footgun without global budgets.
- Monorepo + shared Zod + daemon + migrate existing Vite app is fine as a layout; treating it as simultaneous with full product surface area is not.

---

### Security / privacy risks

1. **Localhost token without a threat model.** Other local users, malicious pages hitting `localhost`, and token-in-query for EventSource are classic failures. Doc says “token-protected” and stops.
2. **Audit storage of run output** (“truncated at a configurable size”) will hold prompts, tool results, and file snippets. No retention, redaction, or “secrets in output” policy.
3. **File indexer → SQLite** under `~/.junos/junos.db` is a second copy of personal content; backup “easy” also means backup of indexed private files.
4. **Provider `run` with `cwd` + `tools`** is remote code execution on Jonas’s machine gated only by whatever the UI/workflows allow — approvals are mentioned once, not scoped.
5. **Tailscale later** turns a single-user localhost daemon into a remotely reachable API with the same token story unless auth is redesigned first.
6. **ToS framing** covers “tokens stay on machine” but not automated/scheduled use of subscription CLIs (often the actual ToS risk).

---

### UI / design-quality problems (Operate + taste lens)

This doc is architecture, but it already commits to product surfaces and realtime behavior. Against impeccable **Operate** and design-taste **app-screens**:

1. **Dashboard sprawl risk.** Inbox + Home feed + activity timeline + kanban + connection status, all fed by one busy event bus, with no “one question per screen.” App-screens fail when the first viewport is thin KPI chrome or an undifferentiated firehose. Architecture should name the primary job of each view and what *doesn’t* live on Home.

2. **Hierarchy / density unspecified.** Streaming `token | thinking | tool` plus `inbox.item`, `scout.finding`, `kanban.card.*` invites equal-weight noise. Operate wants a tight type scale and accent on action/state only; the event taxonomy doesn’t rank severity or UI prominence.

3. **Motion budget missing.** Live token streams and `connection.changed` need state motion (150–250ms, reduced-motion), not entrance choreography. Without a rule, the UI will animate every event. Taste/impeccable both punish decorative motion on work screens.

4. **Reconnect / dual-write flicker.** TanStack Query + SSE/WS + Zustand with no reconciliation rule → duplicate messages, jumpy timelines, lost scroll position — legibility and trust issues, not just bugs.

5. **Phone via tunnel with desktop-shaped IA.** Architecture mentions phone access but not adaptive density, nav collapse, or thumb-first approvals. Desktop-dense Inbox/Kanban will not translate.

6. **“Plain CSS with tokens (see 14)” is good** (avoids framework slop) but this doc never constrains chrome: sidebar pills, icon KPI tiles, card grids, hero headers — the exact failure modes of app-screens. A one-liner like “shell is Operate-mode: product name + scope, no KPI tile row, color on data/state not chrome” would lock the architecture to the UI system.

7. **Empty / loading / error as architecture.** Reliability covers daemon restart; UI doesn’t get equivalent contracts (skeleton vs spinner, empty Inbox copy, failed run presentation). Operate treats those as component law.

8. **Typography / contrast / spacing** aren’t this file’s job — but deferring entirely to 14 while naming three feed-like views without measure, truncation, or mono-only-for-code rules means streaming “thinking” will likely ship as grey monospace walls (taste bans monospace outside code; Operate allows denser data but still wants readable ink, not soft-grey body).

---

### What the doc gets right

Local daemon over hosted backend for subscription CLIs; adapters as the only provider boundary; SQLite single file; shared Zod; UI vs server state split; scout-as-workflow intent; catch-up policy called out. Shape diagram is clear.

---

### Highest-leverage fixes (if you edit later)

1. Pick **SSE or WebSocket** (or state “SSE for events, WS only if …”).  
2. Rewrite the filesystem boundary as **capability + approval**, including `cwd`/`tools`.  
3. Add a short **localhost threat model** (bind, token, no query-string secrets) before Tailscale.  
4. Cap Phase 1 adapters/surfaces; mark resume as **fail-clean until adapter X**.  
5. Add **Operate UI constraints** for named views (one job each, event prominence, motion/reconnect, no dashboard-kit chrome) so 14 isn’t inventing product IA alone.

I’m in Ask mode, so this is review only — switch to Agent mode if you want the doc patched.
