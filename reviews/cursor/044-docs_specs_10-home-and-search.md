⚠️ Spec review (not a live UI critique): no PRODUCT.md/DESIGN.md, no rendered Home — judgment is from the text of `docs/specs/10-home-and-search.md` through Impeccable **Operate** and design-taste **app-screen / overview** rules.

**Verdict:** The doc correctly frames Home as a glance surface and nails independent card loading, but as written it specifies an eight-card equal-weight dashboard that works against “glance,” leaves search/palette security and composition undefined, and sets performance bars without enough product hierarchy to ship a non-generic Home.

---

### Contradictions (inside this doc)

1. **Glance vs work** — “A glance page, not a place to work” sits next to **Needs you** with inline Approve/Deny, **Quick ask** that starts Chat, and ⌘K that **creates a card without leaving the page**. Those are Operate jobs, not glance.
2. **One data path vs many** — “one `GET /home` aggregate **or** per-card queries plus the event stream” never picks a source of truth. Aggregate and per-card behave differently for freshness, authz, and the “no card may block the others” rule.
3. **Acceptance vs progressive load** — “Home renders in under 1 second from local data” vs skeleton → data → error per card. Unclear whether 1s is shell, first useful card, or all eight filled.
4. **⌘K vs Global search** — Palette is jump/actions/NL ask; Global search is FTS (+ later semantic). Whether ⌘K searches the same index, shows snippets, or is navigation-only is undefined, so “search” as a product concept splits in two with no merge rule.
5. **Hermes twice** — Card 4 (Hermes) and card 5 (Board snapshot: “Hermes’s current card”) restate the same object without saying which wins or how they stay consistent (“a fact shown twice is one variable” in app-screens).

---

### Gaps

| Area | Missing |
|---|---|
| **One question** | No screen question / finding (e.g. “What needs me before I leave?”). Eight peer cards = stock overview. |
| **Hierarchy & layout** | “from the mockup” only — no grid, span, primary vs secondary blocks, truncation, or “View all” rules. |
| **States** | Skeleton + error + retry only. No empty, zero, first-run, stale/freshness, or partial aggregate failure. |
| **Responsive** | No phone/narrow layout for Home or palette (density, Approve targets, card stack order). |
| **Search UX** | Filters named; no screen, result shape, snippet rules, empty query, or keyboard model beyond Enter. |
| **Palette UX** | No grouping UI, ranking when “recent” vs fuzzy conflict, cancel, confirm for destructive/create, or model-chip ownership vs Quick ask. |
| **Copy / a11y** | Status “dot” with no text equivalent; no focus order, live regions for card refresh, or reduced-motion. |
| **Cross-links** | Caps (5 / 5 / 3) with no deep-link to full Inbox / Tasks / Scout / Board. |

---

### Unrealistic / under-specified scope

- **Eight live domains on one glance page** (chat entry, inbox actions, cron, Hermes, kanban, billing usage, scout, files) is a full product shell, not a thin Home. App-screen rule: everything named must show header + first rows at 1440×900 — that fights “glance” unless most cards shrink or drop.
- **`<1s` local Home + `<100ms` ⌘K** with FTS across messages, cards, findings, inbox, filenames, summaries needs index build, update path, and what “local” excludes (remote providers, large file bodies). Not in the doc.
- **Create card / run workflow / ask from palette without leaving** implies inline forms and side effects; only “New card” appears in acceptance.
- **Inline Approve/Deny on Home** reimplements Inbox triage; no conflict rules if both surfaces act on the same item.

---

### Security / privacy risks

1. **FTS over messages + file summaries** — Spec never limits scope (project, sensitivity, redaction). Snippets can leak secrets, PII, or tool output into the palette/search UI.
2. **`GET /home` aggregate** — One blob of approvals, Hermes state, usage, findings. No authz, field minimization, or “who is this for” (single-user local vs multi-profile).
3. **Inline Approve/Deny on a glance page** — High-stakes actions next to greeting chrome: mis-click, no confirm/undo, no idempotency or audit note in this spec.
4. **NL “Ask \<model\>” as last ⌘K row** — Unclear what context is attached (open project, selection, search hits) before leaving the machine.
5. **Subscriptions usage** — Provider metering on Home; no note on caching, who may see quotas, or stale bars after reconnect.
6. **Event stream → Home** — Live updates of inbox/approvals on a glance surface increase shoulder-surfing and notification side-channel risk; no privacy posture.

---

### UI / design quality (Operate + app-screen lens)

**Hierarchy** — Equal card list reads as a generated dashboard (greeting → date → card grid). Skills want one primary answer first (likely **Needs you** or a single “attention” strip), then supporting blocks; Scout / Recent / Subscriptions should not share weight with approvals.

**Density** — Sparse “home” budgets (~6–25 data points) vs eight cards × 3–5 rows each → either cramped or a long scroll that fails “glance.” Cap lists are good; the card *count* is the problem.

**Spacing / composition** — Unspecified. Risk of leftover voids (stretched equal-height cards) or a KPI-tile strip (Board counts, usage bars) without grouping. App-screen preference: group related figures; don’t box every metric.

**Typography** — Greeting as implicit hero is a template tell unless the finding/action sits next to it. No type roles (title / section / row / meta). Operate wants a tight rem scale, not a marketing greeting hierarchy.

**Legibility / contrast** — Status dots and usage bars need labels and 4.5:1 text; color-only dots fail. Secondary meta on many cards will go soft-grey unless specified.

**Motion** — Independent skeletons are right for Operate (state, not choreography). Doc doesn’t ban page-load staging or shimmer; app-screens prefer flat skeleton bars, no shimmer, no layout shift when data lands.

**Signature / product face** — Nothing JunOS-specific beyond feature inventory. Quick ask + eight cards could be any agent OS. Missing: one product-owned element (e.g. attention queue as the home signature) and trade language in empty states.

**Three “ask” entries** — Quick ask, ⌘K Ask, Chat. Dilutes the primary job and confuses hierarchy.

**Mockup deferral** — “from the mockup” without criteria means implementers will copy composition (and, if the Stitch glass direction wins elsewhere, glass/blur chrome that both skills reject for product UI). This doc should pin hierarchy and states even if visuals live elsewhere.

---

### What the doc already gets right

- Independent card load + isolated failure + retry.
- Palette as jump + actions + recent-first fuzzy (familiar Operate pattern).
- FTS5 named; semantic deferred to files (11) — good scope cut if acceptance matches.
- Hard latency targets (even if under-specified).

---

### Highest-leverage fixes (if you revise the spec later)

1. Pick Home’s **one question** and demote or merge cards that don’t answer it (especially Hermes vs Board, Scout vs Needs you).
2. Resolve **glance vs act**: either strip Approve/Deny to “open Inbox” or rename Home as the morning triage surface and design for that.
3. One search model: ⌘K ⊆ global search or explicitly split “go/do” vs “find in content,” with snippet/redaction rules.
4. Define empty/zero/stale + mobile order + what “\<1s” measures.
5. Privacy: default search scope, no secret snippets, confirm high-stakes Home actions.

Questions skipped: Ask-mode doc review only; no live detector/screenshots.
