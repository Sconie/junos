**Verdict:** `01-architecture.md` is a clear local-first shape, but it over-promises surface area (many product domains in one daemon), leaves transport/auth/delivery unresolved in ways that collide, and under-specifies Operate-mode UI constraints for a high-event, multi-view product.

*Lens: impeccable (Operate + craft floor) and design-taste-frontend (app screens). Spec-only review — no live UI, no detector.*

---

### Contradictions

1. **SSE vs WebSocket** — Shape line: `HTTP + SSE/WebSocket`. Event bus: “SSE to the UI” only. No rule for when each is used (chat tokens vs board updates vs reconnect). Implementers will invent two paths.

2. **Delivery model** — Diagram fixes “Browser (Vite + React)”. Open questions float Electron/Tauri tray + auto-start. That is not a small open question; it changes process lifecycle, auth boundary, and “tab closed / daemon runs” assumptions.

3. **Scout special-case** — Shape: Scout is “a scheduled workflow, not a special case.” Event bus still has a dedicated `scout.finding`. Either Scout is a first-class domain (events, views) or it is just workflow output — the doc says both.

4. **DB fork** — `better-sqlite3 or libsql` with no decision criteria. Same for “token-protected” with no issuer, storage, or rotation story.

5. **UI isolation vs `cwd`** — “UI cannot touch … the filesystem” but `RunRequest` includes `cwd?`. The UI can still steer filesystem reach via the daemon unless path allowlists exist (they do not here).

---

### Gaps (architecture that will force design debt)

| Gap | Why it matters |
|---|---|
| No process/trust boundary for CLI adapters | Provider CLIs get machine reach; no sandbox, cwd allowlist, or tool-policy layer |
| No auth detail for “token-protected” | Localhost + later Tailscale needs different threat models; unspecified |
| No reconnect / backfill for SSE | Append-only bus + live UI without “events after cursor” → missed Inbox/Home updates |
| No event retention / PII policy | Chat, thinking, tools, files, scout — all land in one DB file |
| No concurrency / queue limits | Scheduler + workflow + scout + chats can stampede providers |
| No IA / shell | Event types imply Inbox, Home, timeline, chat, kanban, scout, connections — no nav budget or primary job |
| Styling deferred to “see 14” | Architecture owns the *information* model that drives density; tokens alone do not |

---

### Unrealistic scope

One daemon is asked to own: API + event bus + SQLite + cron + workflow runner (retries, approvals) + N provider adapters + Hermes + file indexer/watcher + Scout — while the UI migrates into a monorepo.

That is several products’ worth of reliability surface. Reliability rules (resumable runs, catch-up modes, truncated audit output) are good but thin against that list. “Migrate `src/` once the daemon exists (Phase 1)” packs daemon + migration into the same phase with no cut line for MVP adapters or deferred subsystems (Hermes, indexer, Scout).

Provider set (`claude | codex | cursor | grok | nous`) plus effort mapping “see 03” makes the adapter interface look small while the integration matrix is large.

---

### Security / privacy risks

1. **Single file `~/.junos/junos.db`** — Sessions, messages, tool output, scout findings, connection status. Backup is “easy”; exfil and restore of secrets-adjacent content is also easy. No encryption-at-rest, OS keychain for tokens, or DB permissions called out.

2. **“Secrets must not live in browser storage”** — Correct direction; incomplete. Daemon secret storage, env vs keychain, and whether run/tool transcripts may contain pasted keys is unspecified. Truncated audit storage still retains sensitive prefixes.

3. **Localhost token + optional Tailscale** — Token on loopback ≠ token on a tunnel. Phone access without device auth, short-lived tokens, or bind restrictions turns “local assistant” into a remote agent host for every connected provider CLI.

4. **Provider CLIs on the machine** — Adapters `run` with `cwd` and `tools`. Architecture does not constrain blast radius (repo escape, exfil via tools, long-lived pty).

5. **Thinking / tool events on the bus** — `run` streams `thinking | tool` to UI and into append-only events. High privacy sensitivity; no redaction or view-level ACL (everything localhost-trusted is still a laptop-theft / backup-sync risk).

6. **Hermes bridge named, not bounded** — External bridge with no trust, data-flow, or least-privilege note in this doc.

---

### UI / design-quality problems (Operate lens)

This doc is infrastructure, but it **defines the product surface** via the event bus. Against impeccable Operate + tasteskill app-screen rules:

1. **Hierarchy / IA overload** — Views named as “queries over events”: Inbox, Home feed, activity timeline, plus implied chat/kanban/scout/connection from event types. App screens want **one primary question and one frequent job** on the first screen. An undifferentiated event firehose invites a dashboard of competing feeds (cognitive load >4 destinations, no declared primary).

2. **Density** — Streaming `token | thinking | tool` plus `inbox.item`, `kanban.card.*`, `scout.finding` with no batching, digest, or severity model. Classic Operate failure: everything “live,” nothing scannable. App-screen study: colour on data that needs a decision, not chrome; this architecture pushes chrome toward “badge everything.”

3. **Typography / legibility** — No ownership of type roles for the densest surfaces (stream vs list vs board). “Plain CSS + tokens (14)” without architecture-level rules for body measure, secondary vs primary ink, and tabular run metadata risks soft-grey secondary text and monospace-as-costume for a “technical” local tool (both craft-floor / house-rule failures).

4. **Spacing / composition** — Materialized tables + many views with no shell layout (nav recession, product mark/name, content column). Migration of existing Vite app “as-is” plus new feeds tends to produce stacked panels and card grids — exactly what both skills reject for app chrome.

5. **Motion** — High-frequency SSE updates without an update budget, reduced-motion policy, or “batch then settle” rule. Impeccable motion: purposeful, not every event animating. Risk: toast/pulse spam on `run.step` and kanban noise.

6. **Contrast / states** — `connection.changed`, `run.failed`, approvals implied by workflow runner — no error/empty/reconnect UI contract. Craft floor requires loading/error/empty; architecture only promises event types.

7. **Product face** — tasteskill app screens: name the product and scope in the shell; avoid kit look. Architecture treats UI as a consumer of events and “keep styling as-is.” That freezes whatever current look is and does not reserve one signature Operate element (e.g. run timeline as the product’s object).

8. **Mode mismatch risk** — If Tauri/Electron wins later, tray + auto-start is a different attention model than a browser tab; notification and density rules still absent.

---

### What the doc does well

- Local-first rationale (ToS / machine-bound sessions) is sharp and correct.
- Adapter boundary (`ProviderAdapter` as sole provider knowledge) is clean.
- Reliability intents (resumable/fail-clean, catch-up policy, stored output) are the right class of rules.
- Shared Zod monorepo direction is proportionate for UI ↔ daemon contracts.

---

### Highest-leverage fixes (if you revise this doc later)

1. Pick **one** transport story (SSE + cursor backfill *or* WS; not both undecided).
2. Cut Phase-1 daemon scope to a thin vertical (e.g. API + bus + one adapter + chat runs); park Hermes/indexer/Scout/kanban as “same patterns later.”
3. Write a short **trust model**: token lifecycle, DB sensitivity, cwd/tool allowlist, tunnel ≠ localhost.
4. Add an **Operate IA paragraph**: primary job, nav budget (≤5), which views are digests vs live streams, update batching + `prefers-reduced-motion`.
5. Resolve Scout: either first-class domain or workflow-only — drop the contradictory wording.

I did not open `14-ui-system.md` or other specs, per your scope. If you want a pass that checks this doc against those, say so (still Ask mode) or switch to Agent for edits.
