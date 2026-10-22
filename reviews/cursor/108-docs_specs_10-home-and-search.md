Context loading did not run; there is no `PRODUCT.md` / `DESIGN.md` in the repo, so this is a **doc-only Operate / app-screen review** of `docs/specs/10-home-and-search.md` through impeccable Operate + design-taste `app-screens` (not a live UI critique).

---

### Verdict

The spec describes a **feature dashboard of eight equal cards**, not a glance surface with one question. That fights its own “not a place to work” rule, overloads the first screen, and leaves search/⌘K/Home overlapping without IA. Design tokens (hierarchy, density, motion, contrast) are almost entirely absent.

---

### Contradictions

1. **Glance vs work** — “A glance page, not a place to work” vs inline **Approve/Deny**, **Quick ask → Chat**, and acceptance **“create a card without leaving the page.”** Those are Operate jobs, not glance.

2. **Data loading model** — “one `GET /home` aggregate **or** per-card queries” is unresolved. An aggregate **contradicts** “each card loads independently / no card may block the others” unless the aggregate is only a cache hint and failures are still per-card.

3. **Hermes twice** — Card 4 is Hermes; card 5 repeats “Hermes’s current card.” App-screen rule: a fact shown twice is one variable. Spec invites drift and visual double-counting.

4. **⌘K vs Home vs Global search** — Palette jumps + fuzzy + NL “Ask model”; Home has Quick ask; Global search is FTS. No rule for which surface owns “find,” “ask,” or “act.” Users will get three overlapping entry points.

5. **NL mode vs Enter** — “executes on Enter” + “sentence offers Ask as last row” — unclear whether Enter runs the selected jump or the Ask row when both match.

---

### Gaps

| Area | Missing |
|---|---|
| **One question** | No “Home answers ___ first” (e.g. “What needs me?”). Without it, layout cannot prioritize. |
| **Layout** | No grid, breakpoints, phone, or first-viewport budget. “From the mockup” is not a spec. |
| **Empty / zero** | Skeletons/errors yes; empty Needs you / Scout / Upcoming / Board no. |
| **Approve/Deny** | No confirm, undo, partial failure, or “open full item” when context is too thin. |
| **Status / usage** | Status dots and usage bars: meaning, labels, colour vs text, thresholds. |
| **Search** | Ranking, snippets, highlight, empty query, permissioned vs local-only indexing, when filters appear. |
| **⌘K** | Non-Mac shortcut, result limits, keyboard chrome, create-card UI (inline form vs jump). |
| **Realtime** | “Event stream” named; no card refresh / flicker / ordering rules. |
| **A11y** | Focus order across 8 cards, Approve/Deny keyboard, non-colour status, contrast. |

---

### Unrealistic scope

- **Eight domains** on one glance page (Inbox, cron, Hermes, Kanban, billing, Scout, files, plus ask) is a product home for a suite, not a 1s glance. App-screens: every named block should show header + first rows at **1440×900** — with 5+5+3 lists and usage bars, that forces either illegible density or a long scroll that stops being “glance.”
- **&lt;1s local** for all of that (even cached) is only credible with aggressive truncation and clear stale/refresh rules — neither specified.
- **⌘K &lt;100ms** while indexing “any screen, conversation, project, file, card, task” + actions + NL is a full launcher product; acceptance only mentions open + create card.
- **FTS across messages + files** in three lines under-specs a search system; semantic deferred to (11) with no interim UX.

---

### Security / privacy

- **Approve/Deny on Home** — high-stakes actions with less context than Inbox; no step-up, audit, or “show reason before deny.”
- **FTS over messages / summaries** — chat and file text often hold secrets/PII; no exclusions, retention, redaction, or “don’t index” rules.
- **Snippets in palette/search** — shoulder-surfing / shared-screen risk; no preview policy.
- **Subscriptions / usage** — billing/provider state on the home canvas with no role/visibility note (even single-user local apps still care about what’s on screen by default).
- **Event stream → Home** — unbounded client surface if payloads aren’t minimized.

---

### UI / design quality (skills lens)

**Mode:** Operate / app `home`–like overview. Ambition should be **precision and restraint**, not a marketing hero.

**Hierarchy** — Flat list of 8 cards = generated dashboard: greeting + equal tiles. Skills want one question answered by the **largest** block; for this product that is almost certainly **Needs you**, not Quick ask or greeting/date. Greeting-as-h1 only works if you deliberately take something like `editorial-greeting` and still let attention data dominate — the doc doesn’t.

**Density** — “Glance” + 8 panels + top-5 lists is a conflict. Cap lists (4–6 with View all is the app-screen pattern), cut or demote Board / Subscriptions / Recent files to secondary or linked screens, or accept Home is a workbench and rewrite the opener.

**Spacing / composition** — No canvas gutters, column math, or “blocks share edges.” Risk of ragged card rows, orphan cells, and stretched empty panels when one card has 5 rows and its neighbour has 1.

**Typography** — Unspecified. Operate: tight rem scale, no display greeting. Avoid oversized “Good morning” competing with data. Card titles need a shared size; figures (counts, next run times) need tabular nums — not stated.

**Colour / contrast / legibility** — Status dots and usage bars without text labels fail colour-only encoding. Colour should sit on **status/data that needs a decision**, not on chrome. Usage bars need units and ink-level labels, not a mute grey track.

**Motion** — Spec implies 8 independent skeleton→content transitions. Operate: 150–250ms feedback, **no load choreography**. Without a rule (e.g. quiet opacity, no stagger cascade), Home will flicker like a tile reveal. ⌘K open &lt;100ms argues for instant present, not animated entrance.

**Anti-slop / app tells** — Greeting + date + card grid of widgets is the template home. Subscriptions-as-usage-bars and Board-as-column-count KPIs read as vanity tiles unless they answer a named question. Duplicate Hermes content reads as kit padding.

**Command palette** — Grouped results + recent-first is sound Operate IA. NL “Ask …” as last row needs clear visual separation (type vs action) so people don’t Enter into Chat by accident. Creating a card “without leaving” needs an inline compose pattern specified, or it’s scope creep into a modal the Operate guidance would rather avoid.

**Quick ask** — Putting a full chat composer on Home competes with Needs you and duplicates Chat. For glance, a single primary control (“Review n approvals”) usually beats a second ask box next to ⌘K.

---

### Highest-leverage fixes (spec-level)

1. **One question + ordered blocks** — e.g. “What needs me?” → Needs you (primary) → Upcoming / Hermes → everything else collapsed or linked.
2. **Resolve glance vs act** — either remove inline Approve/Deny (deep-link to Inbox) or drop “not a place to work.”
3. **Pick one data model** — prefer per-card queries + stream; define aggregate only as optional warm cache.
4. **Dedupe Hermes / Board** — one source of “current card.”
5. **Split IA** — Home = attention; ⌘K = navigate/act; Search = find-in-content; define handoffs.
6. **Add Operate craft floor** — first viewport budget, empty/zero copy, status with text, motion/a11y, Approve confirmation, search indexing/privacy.

---

I’m in Ask mode, so this is review only. If you want these written into the spec or into `reviews/cursor/108-…`, switch to Agent mode.
