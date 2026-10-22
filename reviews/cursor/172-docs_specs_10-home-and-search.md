**Verdict:** Spec 10 specs a stock eight-card glance dashboard that fights its own “not a place to work” line, never names one Home question, and leaves hierarchy, density, empty states, and search/palette privacy to the implementer. Through Operate + app-screen rules, it reads as a mockup inventory, not a designed home.

Context: doc-only review (no `PRODUCT.md` / `DESIGN.md`, no rendered UI). Skills used as lens only—not a full dual-agent impeccable critique / browser detect.

---

### Contradictions

1. **Glance vs work.** “A glance page, not a place to work” sits next to **inline Approve/Deny**, **Quick ask → Chat**, and ⌘K actions (New card/task, Run workflow). Approvals on Home *are* work. Either drop inline decisions or drop the glance claim.
2. **Hermes duplicated.** Cards 4 and 5 both show **Hermes’s current card**. App-screen rule: one fact → one variable. Independent loads invite disagreeing cards.
3. **Data path fork.** “one `GET /home` aggregate **or** per-card queries” plus the event stream is three architectures. Acceptance (“under 1 second from local data”) only fits one; the others need different contracts.
4. **⌘K vs Global search.** Palette = jump + fuzzy + actions; search = FTS + filters (+ semantic later). Spec never says whether ⌘K *is* search, embeds it, or is separate chrome—so implementers invent a second surface.
5. **Acceptance vs progressive cards.** “Home renders in under 1 second” + eight independently loading skeletons implies progressive paint, not one ready page. First paint vs all cards settled is undefined.

---

### Gaps

| Area | Missing |
|---|---|
| **One question** | No “what does Home answer first?” (e.g. “What needs me?”). Without it, eight cards compete. |
| **Reading order / layout** | Numbered list only—no grid, spans, which block is largest, what’s above the fold at 1440×900. |
| **Empty / zero** | Error+retry only. Zero inbox, no runs, idle Hermes, empty Scout, no recent files—undefined. |
| **Action states** | Approve/Deny: pending, success, undo, already-handled elsewhere. |
| **Status vocabulary** | “Status dot” with no legend, tokens, or contrast (dots alone fail a11y). |
| **Responsive** | No phone/narrow behavior; eight cards will stack or crush. |
| **Type / spacing** | No scale, row pitch, padding, section gap (homes should be *sparse*, not a packed dashboard). |
| **Motion** | Skeletons implied; no reduced-motion; no ban on entrance choreography (Operate: motion = state feedback only). |
| **⌘K UX** | Empty query, no results, focus/Esc, ranking, confirm for destructive actions, NL vs jump Enter conflict. |
| **Search UX** | Snippets, ranking, pagination, how filters compose with FTS. |
| **Copy** | “Greeting and date” unspecified—high risk of “Welcome back 👋” (banned dashboard tell). |

---

### Unrealistic scope

- **Eight peer cards** on a glance surface. App-screen guidance: every named block shows header + first rows on the first screen; time-sensitive work first; lists capped ~4–6 with “View all.” Eight equals the KPI-row + widgets template—won’t fit without thin tiles or fold.
- **Subscriptions × N + board counts + Scout + recent files** is a second dashboard inside Home. V1 should be 3–4 blocks answering one question; deep links for the rest.
- **FTS across messages, cards, findings, inbox, file names, summaries** in the same slice as Home chrome is a full search product. Defer file/semantic body until (11), or cut scope.
- **Perf:** &lt;1s local + &lt;100ms ⌘K + create-card in place needs a prewarmed index/cache story; not stated.

---

### Security / privacy risks

1. **Global FTS over messages + inbox + file summaries** — ACL, soft-deletes, secrets in chat, attachment names unspecified. Search without authz is a leak.
2. **`GET /home` aggregate** — one blob (approvals, usage, Hermes, Scout) widens blast radius vs scoped per-card queries; no authz note.
3. **Approve/Deny on Home** — high-stakes on a glance layout with no confirm, audit, or idempotency.
4. **⌘K Enter executes** — Run workflow / Ask model / Switch model with no confirm; NL “Ask …” as last row can steal Enter from a jump target.
5. **Event stream into Home** — live approvals/usage always visible; no note on sensitive payloads or away/screen-lock behavior.
6. **Recent projects/files** — path/name leakage on shared screens; retention of “recent” unclear.

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Lens: Operate restraint + app-screen house rules (colour on data not chrome; no hero-greeting widget wall; KPIs as type not tiles; flat surfaces; no entrance motion).

1. **Hierarchy absent.** Greeting → equal “cards (from the mockup)” implies equal weight. Needs one dominant answer (usually **Needs you**), then secondary strips—not eight equal modules.
2. **Greeting-led home.** Allowed only as a designed move (`editorial-greeting`), not a subtitle under a widget grid. Spec leans “Welcome + widget wall,” the study’s top tell.
3. **Card-grid density.** Peer cards, usage bars, status dots, column counts → dashboard kit. Prefer fewer blocks, tone/hairline separation, colour only on status/action that needs a decision.
4. **Inline Approve/Deny on a glance list** hurts scanability and raises mis-tap risk. Better: Inbox for decisions; Home shows count + deep link (or one “next approval”).
5. **Quick ask + model chip** duplicates Chat and ⌘K Ask—three ask entries with no priority. Chip+input needs focus/contrast specs or it becomes chrome noise.
6. **Legibility / contrast debt.** Status dots and usage bars without tokens ship as low-contrast greys or rainbow provider colors. Require ink for labels, colour only for fail/need-you, tabular nums for times/usage.
7. **Motion.** Eight independent skeletons can become eight shimmering panels. Spec should: static skeleton tone, no staggered entrances, 150–250ms only on approve feedback / palette open.
8. **⌘K / search as overlays.** Floating surfaces may use shadow; Home cards should not. Spec never separates resting vs floating elevation.
9. **No product face.** Nothing Junos-specific (Hermes/Scout as signature vs generic “agent + findings + board counts”). Any product could use this list unchanged.

---

### Priority fixes if the doc is revised

1. Name **one Home question**; cut or demote cards that don’t answer it; put the frequent job one click from that answer.
2. Resolve **glance vs Approve/Deny**—one product stance.
3. **Dedupe Hermes** (and any shared facts); one source of truth.
4. Define **layout**: fold priority, grid spans, max rows + “View all,” empty/zero copy.
5. **Split or merge ⌘K and search**; add authz, confirm-for-destructive, ranking/Enter rules.
6. Narrow **acceptance**: first meaningful paint vs all cards; which data path is normative.
