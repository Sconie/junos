**Verdict:** `01-architecture.md` is a clear local-first shape, but as an architecture brief for an Operate product it under-specifies the UI system it already assumes, leaves security as slogans, and packs a multi-product surface into one daemon without binding design or density decisions.

Mode (Impeccable): **Operate** — Inbox, Home feed, activity timeline, chats, kanban, scout. Design-taste: **app screens**, not marketing pages. There is no PRODUCT.md / DESIGN.md; visual identity is deferred to “see 14” and never constrained here.

---

### Contradictions (internal)

1. **“Views are queries over events” vs materialization** — Event bus says views are “queries over events plus a few materialized tables,” but never says which views are live queries vs tables, or how SSE + Query stay consistent after restart. That fights “every run is resumable” if UI rebuilds from a partial stream.
2. **SSE and WebSocket both named, neither chosen** — Shape line is `HTTP + SSE/WebSocket`. Event bus only mentions SSE. Dual transport without a rule invites duplicate subscriptions, double-rendered feed items, and motion/feedback firing twice.
3. **Scout is and isn’t special** — Shape says “Scout runner (a scheduled workflow, not a special case)” while the event taxonomy still has `scout.finding`. Architecture never says whether scout gets its own UI density/chrome or reuses Inbox/Home patterns (app-screens: one job, one vocabulary).
4. **“UI cannot touch CLIs or the filesystem” vs `cwd?` / tools in `RunRequest`** — Adapter can take workspace paths and tools; the doc doesn’t say the UI only picks daemon-known project ids. Risk: browser becomes a path picker and the boundary softens.
5. **Plain CSS “keep as-is” vs monorepo migration** — Styling choice assumes current UI tokens survive `src/` → `apps/web`. No rule that the daemon doesn’t introduce a second visual stack (e.g. admin HTML, status pages).

---

### Gaps (architecture that will show up as UI/UX debt)

| Gap | Why it matters (Operate / app-screens) |
|---|---|
| No information architecture | Named event types imply Inbox, Home feed, activity timeline, kanban, connections — no nav model, primary job per screen, or “one click to the frequent job.” |
| No shell / product face | App-screens demand product name/mark in the shell and one signature element. Architecture never owns shell vs content. |
| No state vocabulary | Loading / empty / error / offline / reconnect for SSE are unspecified. Impeccable Operate expects skeletons, teaching empty states, not spinners. |
| No density or layout contract | Feed + timeline + kanban + chat will default to dashboard slop (KPI tiles, icon cards, zebra tables) unless architecture points at a quiet app system. |
| No typography / token ownership | “Plain CSS with tokens (see 14)” with no roles here (ground, ink, accent, semantic states). Five-size ceiling and fixed rem scale never appear. |
| No motion policy | SSE-driven feeds invite entrance choreography. Operate wants 150–250 ms state motion only; architecture is silent → marketing-style scroll motion is likely. |
| No a11y / contrast floor | Live streams, “thinking” tokens, status colors — no WCAG or “running text in full ink” constraint. |
| Phone access deferred | Tailscale “later” with no responsive structural rules (collapse nav, not fluid display type). |
| Approval / high-stakes UX | Workflow runner has “approvals”; no surface for confirm/deny, peak-end reassurance, or irreversible-action patterns. |
| Truncation UX | “Output … truncated at a configurable size” — no UI for “truncated,” resume, or audit trail reading. |

---

### Unrealistic scope (for one architecture slice)

The shape lists API, event bus, SQLite, scheduler with catch-up policies, workflow runner (steps/retries/approvals), five provider adapters, Hermes bridge, file indexer/watcher, and Scout — while the UI is already a multi-surface product (Inbox, Home, timeline, implied chat/kanban/scout).

For a single-operator localhost tool that’s ambitious but plausible **if phased**. As written, Phase 1 is only “move `src/` once the daemon exists,” with no cut line for:

- which event types ship first,
- which views are read-only vs interactive,
- whether kanban/scout/Hermes are Phase 1 or later.

Without that, the default UI build is a thin shell over every event type → underbuilt first screens (app-screens warning: clean and empty, loses to denser wrong UIs).

Open questions (Electron/Tauri vs tab, launchd/systemd) are correct to leave open, but they change density (tray vs browser chrome), auto-start trust, and focus/window behavior — they should be called **blocking for shell design**, not optional polish.

---

### Security / privacy risks (called out or missing)

**Stated well:** local-only motivation; secrets not in browser storage; token-protected localhost; ToS/machine-bound sessions.

**Under-specified in this doc (high impact):**

1. **Token-protected how?** Header? cookie? one-time bootstrap? rotation? Shared token in a query string for SSE is a classic leak via logs/Referer.
2. **Localhost ≠ private on a shared machine** — any local process can often hit `127.0.0.1`. No mention of bind address, OS user isolation, or “daemon only accepts same-uid.”
3. **`~/.junos/junos.db`** — chat, runs, scout findings, possibly paths and snippets. No encryption-at-rest, file permissions, or backup/exfil story.
4. **Provider adapters + CLIs/pty** — session cookies, API keys, and PTY output can contain secrets; architecture doesn’t say redact-before-store / redact-before-SSE.
5. **File indexer/watcher** — unbounded privacy surface (which trees, ignore rules, content vs metadata, retention). One sentence in Shape is not a boundary.
6. **Tailscale “later”** — expands the trust boundary without authn/authz redesign (still “the” token?).
7. **Audit log of run output** — useful and sensitive; no retention, export, or “who can read” (single user assumed, never stated as a hard invariant).
8. **Cancel/run APIs** — no CSRF/origin story for a browser UI on localhost (less critical than remote, still real with malicious local pages).

---

### UI / design-quality problems (hierarchy, spacing, typography, density, motion, legibility, contrast)

The doc barely designs the product surface; that absence *is* the finding.

1. **Hierarchy** — Event taxonomy is flat (`chat.message`, `inbox.item`, `kanban.card.*`, `scout.finding`). Without a primary object and a primary screen question, Home/Inbox/timeline will compete at the same visual weight (Impeccable: one job per surface; app-screens: answer the one question first).
2. **Density** — “Queries over events” pushes a firehose feed. No max density, grouping, or “colour on data not chrome.” Expect either sparse empty dashboards or an unreadable activity stream.
3. **Typography** — Zero type contract. Risk: display sizing on Operate screens, fluid clamp headings in chrome, monospace labels as “agent aesthetic” (design-taste house ban outside real code).
4. **Spacing / layout** — No grid, margin, or panel language. Multi-pane chat + feed + kanban without a shared shell rhythm → inconsistent gutters and card-wrapped everything.
5. **Motion** — Streaming `thinking` / tokens + SSE list inserts with no reduced-motion or “motion = state only” rule. High chance of staggered section entrances and animated list noise.
6. **Legibility / contrast** — Status (`connected`, errors, plan/usage), thinking traces, and truncated logs need semantic colour and full-ink body text; doc only mentions `error?: string` on adapters.
7. **Anti-slop defaults not blocked** — Architecture never forbids KPI tiles, icon-in-tinted-square connection cards, gradient usage charts, or glass nav — the exact failure modes for a “connections + usage + inbox” app.
8. **Styling choice is incomplete** — “Plain CSS with tokens” is fine for Operate; without naming token roles and a single face for the product, Phase 1 UI will ship as a generic Vite kit.

---

### What this doc does well

- Clear **trust boundary** (browser vs daemon) and a real reason for the daemon.
- **Adapter interface** is small and honest (`AsyncIterable` for streaming).
- **Reliability rules** (resumable runs, catch-up policy, stored output) are the right kind of non-UI architecture.
- Explicit deferral of hosted backend for ToS/token reasons.

---

### Highest-leverage fixes (still only for this doc’s job)

If you revise `01-architecture.md` later (Agent mode), the design lens would want roughly:

1. Pick **SSE or WebSocket**, one reconnect model, and how TanStack Query invalidates from the bus.  
2. State the **IA**: shell + 3–5 routes, each with one job and which event types feed it.  
3. Add a short **Operate UI contract**: tokens roles, density, motion = state only, empty/offline/error, no marketing chrome.  
4. Harden **localhost auth + DB + redaction + indexer scope** in bullets here or by normative pointer that this doc owns the boundary.  
5. **Phase cut**: daemon + one feed surface before kanban/scout/Hermes UI.

I’m in Ask mode, so this is review only — switch to Agent mode if you want those edits drafted into the spec.
