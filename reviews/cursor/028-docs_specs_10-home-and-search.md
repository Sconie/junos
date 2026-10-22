**Verdict:** The doc sets a useful engineering floor (independent card load, fail-soft Home, fast ⌘K) but describes a full product dashboard as a “glance,” without a single primary question, layout, or privacy model — so it is underspecified for UI craft and overpacked for its stated job.

Mode: **Operate** (app home / overview), judged against tasteskill app-screens + Impeccable Operate.

---

### Contradictions

1. **Glance vs work** — Opens as “a glance page, not a place to work,” then puts **inline Approve/Deny** on Needs you and a full **Quick ask** composer. Approvals are work; a glance surfaces “N waiting” and deep-links.

2. **Dual data model left open** — “one `GET /home` aggregate **or** per-card queries plus the event stream” never chooses. Aggregate + independent skeletons fight each other unless the aggregate is optional/partial.

3. **“From the mockup” ≠ this card list** — Spec lists 8 cards (Needs you, Board snapshot, Scout, etc.). The Stitch home prompt is a different 6-card set (no Inbox/Kanban/Scout; projects and files split). Either the mockup is not normative, or the list is wrong.

4. **Hermes duplicated** — Hermes card (“current card or task”) and Board snapshot (“Hermes's current card”) show the same fact twice with no single source of truth.

5. **Three “ask” surfaces** — Quick ask → Chat; ⌘K “Ask Hermes”; NL row “Ask \<current model\>”. No rule for when each wins or what “current model” means on Home.

6. **⌘K vs global search** — Palette jumps/acts; search is FTS + filters. Overlap (find a conversation vs jump to it) and whether the top-bar field is palette, search, or both are undefined.

7. **Perf vs freshness** — Acceptance: Home &lt;1s **from local data**. Body also implies live event stream and subscription usage bars (often remote). Stale-vs-fresh and what “local” covers are unspecified.

---

### Gaps (blocking for build / design)

| Area | Missing |
| --- | --- |
| **One question** | No “Home answers ___ first.” Without it, all 8 cards stay peer tiles. |
| **Layout** | No grid, spans, above-the-fold order, or “View all” caps beyond “top/next/latest N.” |
| **Priority / urgency** | Approvals vs Scout vs cron vs usage — no ranking when everything is “interesting.” |
| **Empty / first-run / zero** | Skeletons + error/retry only. No empty copy, no “0” vs “—”, no setup path. |
| **Responsive** | No phone stack, touch targets, or which cards drop/collapse. |
| **⌘K UX** | No empty state, no “no results,” grouping UI, keyboard (Esc, arrows), or create-card flow. |
| **Search UX** | Filters named; no default sort, snippet UI, empty query, or how results open. |
| **Visual system** | No type scale, density, status encoding, contrast, or motion beyond skeletons. |
| **A11y** | No focus trap for palette, live-region for card errors, or reduced-motion. |

---

### Unrealistic scope

- **Eight peer cards** on a glance screen blows past a sparse home (tasteskill: ~6–25 data points; first screen should show every named block’s header + first rows). At 1440×900 this becomes scroll theater or an unreadably dense wall.
- **Inline approvals** on Home re-implements Inbox decision UI without the detail pane Inbox needs.
- **FTS across messages, cards, findings, inbox, file names, summaries** plus filters, while acceptance barely covers Home/⌘K and defers semantic search — search is a product of its own, not a paragraph.
- **Subscriptions usage bars** for every provider in a &lt;1s local Home is a hard dependency unless usage is cached/approximate (not stated).
- **“⌘K opens in under 100 ms and can create a card”** mixes open latency with a multi-step create flow.

---

### Security / privacy risks

1. **Approve/Deny without context** — Risk of confirming the wrong action from a truncated Home row (no body, linked run, or confirm step).
2. **FTS over messages/inbox** — No local-only guarantee, what is indexed, redaction, or who can query. For a personal OS this should be explicit.
3. **NL palette → model** — Typing a sentence offers “Ask …”; unclear if Enter sends, whether content leaves the machine, or if there is a confirm.
4. **Aggregate `GET /home`** — One endpoint that joins inbox, Hermes, board, scout, files, usage is a high-value surface; no authz/scope note (even for single-user local, process boundaries matter).
5. **Usage / provider state** — May imply outbound checks; not scoped as cached telemetry vs live probe.

---

### UI / design-quality (skills lens)

**Hierarchy** — Classic generated overview: greeting + equal card grid. App-screens want one question answered by the largest block, with the main job one click away. If Home is “what needs me?”, Needs you (or a single attention strip) should dominate; Quick ask can stay primary *action*. Subscriptions / Recent files / Scout should not share weight with approvals.

**Density / composition** — Eight cards with lists, dots, bars, and counts without spans or “View all” invites orphan cells, stretched empty cards, and ragged rows. Cap rows (4–6), unequal spans, one divided attention block — not a uniform masonry of peers.

**Typography / greeting** — “Greeting and date” with no type rules invites the welcome-banner tell (large greeting, weak noun title). Operate mode: restrained title scale; greeting is optional flavor, not the hero. Cron/model IDs need a declared mono/tabular treatment, not an afterthought.

**Status / color** — “Status dot,” usage bars, provider state — color must encode decision (blocked, needs you, failing), not decorate every row. No legend for dot meanings; risk of teal/red rainbow chrome.

**Spacing / frame** — No canvas gutters, card padding, or section rhythm. Spec cannot prevent leftover voids or equal four-up grids that ignore real card counts.

**Motion** — Skeletons are fine (state). No guidance against staggered “delight” loads; Impeccable Operate: 150–250ms feedback, no choreographed page-load. Prefer static grey bars at real metric size, labels visible immediately (tasteskill loading rule).

**Legibility / contrast** — Usage bars, dots, and muted meta on dark/violet mockup language (elsewhere) are contrast traps; this doc sets no floor (body ≥14px sparse home, meta ≥11–12px, 4.5:1).

**Signature / product face** — Nothing only JunOS has (e.g. one attention stream over the event bus). Reads as “dashboard kit + AI cards.”

**Command palette** — “Results grouped by type with recent first; fuzzy match” is fine IA; missing visual hierarchy (jump vs action vs Ask row), density, and that Ask-as-last-row must not look like a normal result (mis-send risk).

---

### Highest-leverage fixes (spec-only)

1. Pick **one Home question** and order/size cards from it; demote or deep-link the rest.
2. Resolve **glance vs Approve**: summary + open Inbox, or full context + confirm — not silent inline deny.
3. Choose **aggregate vs per-card** and define stale/local vs live.
4. Split **palette (jump/act)** vs **search (find/read)**; one top-bar behavior.
5. Add **empty/error/zero**, **above-fold layout**, **phone**, and a **local FTS/privacy** sentence.
6. Drop or merge **Hermes ∩ Board** duplication; align card list with the real mockup or stop citing it.

---

Questions skipped: Ask-mode doc review (no live UI / detector).
