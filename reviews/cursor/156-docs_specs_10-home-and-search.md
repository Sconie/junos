**Verdict:** Spec 10 describes a classic eight-card “glance dashboard” that contradicts its own “not a place to work” framing, never names one primary question, and leaves hierarchy, density, empty states, and search/palette privacy undefined. Through Operate + app-screen rules, it reads as a template brief, not a designed home.

Context note: no `PRODUCT.md` / `DESIGN.md` in repo; review is doc-only (no rendered UI).

---

### Contradictions

1. **Glance vs work.** “A glance page, not a place to work” sits next to **inline Approve/Deny**, **Quick ask → Chat**, and **⌘K actions** (New card/task, Run workflow). Approvals on Home *are* work; either drop inline decisions or drop the glance claim.
2. **Hermes duplicated.** Card 4 and card 5 both surface **Hermes’s current card**. App-screen rule: one fact → one variable. Spec invites two cards disagreeing under independent load.
3. **Data loading fork.** “one `GET /home` aggregate **or** per-card queries” plus event stream is three architectures. Acceptance (“&lt;1s from local data”) only fits one of them; the other two need different contracts.
4. **⌘K vs Global search.** Palette jumps + fuzzy match; search is FTS + filters + later semantic. Spec never says whether ⌘K *is* search, embeds it, or is a separate surface—so implementers will invent a second chrome.
5. **Acceptance vs card list.** “Home renders in under 1 second” + eight independently loading cards with skeletons implies progressive paint, not one ready page. Clarify: first paint vs all cards settled.

---

### Gaps (spec silence that will ship as slop)

| Area | Missing |
|---|---|
| **One question** | No “what does Home answer first?” (e.g. “What needs me?”). Without it, all eight cards compete. |
| **Reading order / layout** | Numbered list only—no grid, spans, which block is largest, what sits above the fold at 1440×900. |
| **Empty / zero** | Error+retry only. Zero inbox, no upcoming runs, idle Hermes, empty Scout, no recent files—undefined. |
| **States for actions** | Approve/Deny: pending, success, undo, conflict if item already handled elsewhere. |
| **Status vocabulary** | “Status dot” with no legend, colors, or contrast rules (dots fail a11y alone). |
| **Responsive** | No phone / narrow layout; eight cards will stack into a long scroll or crush. |
| **Typography / spacing** | No type scale, row pitch, card padding, or section gap (homes should be *sparse*: ~6–25 data points, not a packed dashboard). |
| **Motion** | Skeletons implied; no reduced-motion, no ban on entrance choreography (Operate: motion = state feedback only). |
| **⌘K UX** | Grouping, empty query, no results, focus trap, Esc, recent vs fuzzy ranking, confirmation for destructive actions. |
| **Search UX** | Result chrome, snippet highlighting, ranking, pagination, how filters compose with FTS. |
| **Copy** | “Greeting and date” unspecified—high risk of “Welcome back 👋” (banned tell). |

---

### Unrealistic scope

- **Eight peer cards** on a glance surface. App-screen guidance: everything named must show header + first rows on first screen; time-sensitive work first; lists capped ~4–6 with “View all.” Eight equals KPI-row + chart + widgets template—unlikely to fit without thin tiles or fold.
- **Subscriptions usage bars × N providers** + board column counts + Scout + recent files is a second dashboard inside Home. Scope for v1 should be 3–4 blocks answering one question; deep links for the rest.
- **FTS across messages, cards, findings, inbox, file names, summaries** in the same slice as Home chrome is a full search product. Wire to (11) or cut semantic/file body until index exists.
- **Perf:** &lt;1s local + &lt;100ms ⌘K + create card in place needs a prewarmed index/cache story; not stated.

---

### Security / privacy risks

1. **Global FTS over messages + inbox + file summaries** — who can see what? Multi-user/workspace ACLs, soft-deleted items, secrets in chat, attachment names—all unspecified. Search that ignores auth is a data leak.
2. **`GET /home` aggregate** — one blob with approvals, usage, Hermes state, Scout findings widens blast radius vs per-card scoped queries; no authz note.
3. **Approve/Deny on Home** — high-stakes actions without confirm, audit, or idempotency; easy mis-click on a glance layout.
4. **⌘K “Ask &lt;model&gt;” / Run workflow / Switch model** — Enter executes; no confirm for irreversible runs; NL last-row can steal Enter from a selected jump target.
5. **Event stream into Home** — live approvals/usage on a always-visible surface; no note on sensitive payloads in the stream or screen-lock / away behavior.
6. **Recent projects and files** — path/name leakage on shared screens; retention of “recent” unclear.

---

### UI / design-quality problems (hierarchy, density, type, motion, contrast)

Lens: Operate restraint + app-screen house rules (colour on data, not chrome; no hero greeting dashboard; KPIs as type not tiles; flat surfaces; no entrance motion).

1. **Hierarchy absent.** Greeting → equal “cards (from the mockup)” implies equal visual weight. Needs one dominant answer (usually **Needs you**), then secondary strips—not eight equal modules.
2. **Greeting-led home.** Allowed only for personal/team homes, and as a designed move (`editorial-greeting`)—not a subtitle under a widget grid. Spec leans “Welcome + widget wall,” the study’s top tell.
3. **Card-grid density.** Peer identical cards, usage bars, status dots, column counts → dashboard kit. Prefer fewer blocks, hairline/tone separation, colour only on status/action that needs a decision.
4. **Inline Approve/Deny on a glance list** fights scanability: primary actions on every row raise cognitive load and mis-tap risk; better on Inbox with Home showing count + deep link (or one “next approval” only).
5. **Quick ask + model chip** on Home duplicates Chat and ⌘K Ask—three ask entry points without priority. Chip + input density needs focus/contrast specs or it becomes chrome noise.
6. **Legibility / contrast debt.** Status dots and usage bars without defined tokens will ship as low-contrast greys or rainbow provider colors. Spec should require ink for labels, colour only for fail/need-you, tabular nums for times/usage.
7. **Motion.** Independent skeletons can become eight shimmering panels (orchestrated load). Spec should: static skeleton tone, no staggered entrances, 150–250ms only on approve feedback / palette open.
8. **⌘K / search as overlays.** These are the floating surfaces that *may* use shadow; Home cards should not. Spec never separates resting vs floating elevation.
9. **No product face.** Nothing Junos-specific (Hermes/Scout as signature element vs generic “agent status + findings + board counts”). Without that, any product could use this list unchanged.

---

### Priority fixes (if the doc is revised)

1. **Name one Home question** and cut or demote cards that don’t answer it; put the frequent job one click from that answer.
2. **Resolve glance vs Approve/Deny**—pick one product stance.
3. **Dedupe Hermes** (and any other shared facts) across cards; one source of truth.
4. **Define layout:** fold priority, grid spans, max rows + “View all,” empty/zero copy.
5. **Split or merge ⌘K and search**; add authz, confirm-for-destructive, and ranking/Enter rules.
6. **Narrow acceptance:** first meaningful paint vs all cards; which data path is normative.

---

**Questions skipped:** full impeccable dual-assessment / browser detect (Ask mode + spec-only target, no rendered Home).
