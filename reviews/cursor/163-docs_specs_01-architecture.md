**Verdict:** Solid local-first shape, but the doc underspecifies the trust boundary, treats too many subsystems as day-one peers, and leaves Operate/app-screen craft entirely to “see 14” — so UI quality, density, and realtime noise are architectural gaps, not just styling TODOs.

Context loading did not run (Ask mode); no `PRODUCT.md` / `DESIGN.md` in-repo. Lens: Impeccable **Operate** + design-taste **app screens** (task UI, not marketing pages).

---

### Contradictions (within this doc)

1. **Transport:** Shape says `HTTP + SSE/WebSocket`; Event bus only commits to **SSE**. Unclear when WS is required (bidirectional cancel? typing? Hermes?).
2. **UI/filesystem boundary:** “UI cannot touch … the filesystem” vs `RunRequest.cwd?` — the UI can still *direct* filesystem-scoped runs. Boundary is “no direct FS API,” not “no FS influence.”
3. **Scout special-casing:** Scout is “not a special case,” yet `scout.finding` is a first-class event type (same pattern as Hermes as a peer box while adapters are “the only code that knows providers”).
4. **Localhost purity vs later tunnel:** “Keep everything on localhost” then optional Tailscale. That changes the threat model; the doc doesn’t say auth must upgrade with exposure.
5. **Views model:** “queries over events plus a few materialized tables” without when/how materialization stays consistent with append-only events — Inbox vs Kanban vs Home can disagree under the same architecture story.

---

### Gaps

| Area | Missing |
|---|---|
| Process model | Daemon lifecycle, single-instance lock, crash recovery beyond “resumable runs,” UI↔daemon discovery (port, version skew). |
| Authn/z | What “token-protected” means: minting, storage, rotation, binding to loopback, per-route auth, who can `cancel`. |
| Secrets | “Not in browser storage” — not where they *do* live, or how adapters read CLI sessions. |
| Event contract | Payload shapes, ordering/idempotency, replay for late UI connect, backpressure, retention/compaction. |
| Streaming UX contract | How `RunEvent` (token / thinking / tool) maps to UI update cadence; no live-region / a11y story. |
| Failures | Daemon down, provider disconnected, partial index, truncated audit output — no client-visible states. |
| Shared package | Zod shared — no versioning/compat rule when daemon and web diverge mid-migration. |
| Hermes / indexer | Named in the tree with no interface, trust level, or data flow into the event bus. |
| Design system ownership | “Plain CSS with tokens (see 14)” with **no** Operate constraints here (shell, density, motion budget, connection chrome). |

---

### Unrealistic scope

One daemon box owns: API, event bus, SQLite, scheduler + catch-up, workflow runner (steps/retries/approvals), **five** provider adapters, Hermes bridge, file indexer/watcher, Scout. That’s a full product OS, not an architecture slice for “migrate `src/` → `apps/web` once the daemon exists.”

Unrealistic as a single Phase-1 critical path unless the doc explicitly **cuts** (e.g. one adapter + chat stream + events + no indexer/Kanban/Scout until later). Catch-up policies (`skip` / `run once` / `run all missed`) alone are a large correctness surface next to “resumable or cleanly failed.”

---

### Security / privacy risks

- **Localhost token ≠ isolation.** Other local processes, browser extensions, and XSS in the Vite app can abuse a bearer token to drive CLIs, read `~/.junos/junos.db`, and cancel/start runs.
- **Tunnel later without auth upgrade** turns a local agent into a remotely reachable executor of subscription CLIs.
- **Audit/storage of run output** (even truncated) will hold prompts, tool I/O, paths, and possibly secrets from CLIs — no redaction, retention, or DB file permissions/encryption.
- **File indexer/watcher** with no allowlist/denylist → high risk of indexing `.env`, keychains, mail, etc., then surfacing via search/Home events.
- **`pty` “where a CLI demands it”** expands interactive session risk (prompt injection into a live TTY) with no sandbox note.
- **Thinking/tool streams to the UI** broaden the confidentiality boundary of provider sessions to whatever the web app can display or log in devtools.
- **No Origin/CSRF story** for mutating REST from a malicious local page.

Architecture correctly avoids browser-held subscription secrets; it does not yet define the daemon as a **high-privilege local agent** with a matching threat model (that’s deferred to 12, but 01 still ships the risky surface).

---

### UI / design-quality (Operate + app-screen lens)

This is an Operate product (inbox, feeds, runs, boards). Impeccable Operate wants **scanability, state-driven motion, consistent chrome**; app-screens want **colour on data not chrome, flat surfaces, honest empty/error states, a shell that names the product, density that serves the job**.

What 01 gets right for craft: Vite/React already in repo; **plain CSS + tokens** (avoids framework slop); TanStack Query vs Zustand split; UI not shelling out directly.

Where the architecture **sets UI up to fail** if left as-is:

1. **Hierarchy / IA** — Names Inbox, Home feed, and activity timeline as event projections with no primary job per surface. App-screens rule: one question and one frequent action on the first screen. An undifferentiated event firehose becomes competing headers, badges, and feeds (generated-dashboard tell: status chrome everywhere).
2. **Density** — Five providers + workflows + Scout + Kanban + file events on one bus without aggregation/rollup rules. Expect noisy lists, identical cards, and “connection.changed” thrash unless the architecture defines **folding** (session summaries, run steps collapsed, finding digests).
3. **Motion** — Operate: 150–250ms, state only, **no page-load choreography**. App-screens: **no motion floor**; feedback only. Streaming tokens + SSE invalidations invite perpetual shimmer/auto-scroll. Doc never budgets motion or `prefers-reduced-motion` for run streams.
4. **Typography / legibility** — `token | thinking | tool` streams need a type hierarchy (primary answer vs secondary thinking vs tool chrome). Architecture stops at event names; without that contract, UIs default to monospace walls, tiny uppercase meta, or grey-on-grey secondary text (Operate: running text in full ink; grey only for secondary).
5. **Contrast / colour** — `status()` / `connection.changed` will drive semantic colour. App-screens: colour on **data/meaning** (good/bad), not nav pills. No semantic token ownership in 01 → risk of rainbow provider badges and KPI-tile connection cards.
6. **Spacing / shell** — Electron/Tauri vs browser tab is open, but shell (sidebar width, top bar contents, product mark) is undefined. App-screens treat shell identity as non-optional; architecture only debates tray/autostart.
7. **States** — Reliability covers run resume/fail, not **daemon unreachable**, **provider disconnected**, empty Inbox, or truncated audit in the UI. Harden/empty-state craft has nowhere to attach.
8. **Glass / decoration risk** — 01 doesn’t mandate glass, but “tokens in 14” with no Operate bans leaves room for backdrop-blur shells and icon-in-tinted-square connection grids — exactly what both skills reject for app screens. Architecture should at least assert: **flat surfaces, state colour on data, density over ornament** (or explicitly defer and accept Stitch “glass” as a known conflict).

---

### Priority fixes (for this doc only)

1. Split **Phase-1 daemon** vs later boxes (indexer, Scout, Kanban projections, Hermes).
2. One paragraph: **token model + loopback assumptions + “tunnel implies stronger auth.”**
3. Resolve **SSE vs WebSocket**; define replay/backpressure for the event stream.
4. Clarify **UI may propose `cwd`/tools; daemon enforces policy** (approvals already implied elsewhere — name the gate here).
5. Add a short **Operate UI contract**: shell owns nav; views are job-based not event-type-based; stream rendering hierarchy; motion = state feedback only; required empty/error/daemon-down states; no decorative glass in the app chrome.

I’m in Ask mode, so I can’t edit the spec — switch to Agent mode if you want those fixes applied.
