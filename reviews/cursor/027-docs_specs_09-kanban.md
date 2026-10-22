**Verdict:** As an Operate-surface brief, the workflow story is clear; the Screen section is a feature inventory, not a designed board. Scope and acceptance criteria don’t match, and a few rules contradict each other.

Lens: **impeccable Operate** (task UI, restraint, status, motion as feedback) + **design-taste app screens** (one question, quiet chrome, density with honest states, no emoji/slop).

---

### Contradictions

1. **Column name vs semantics** — Default columns open with `Inbox/Ideas`, but semantics only define **Ideas**. Elsewhere, moving Hermes work to Review creates an Inbox `result` (product Inbox). Same word, two systems — implementers will collide those concepts.

2. **Hermes eligibility is dual-keyed** — Ready says cards **labelled** `hermes`; pickup says assignee `hermes` **or** label `hermes`. No precedence if assignee is Jonas but label is `hermes` (or the reverse).

3. **Blocked is optional but required by Hermes** — Columns: optional `Blocked`. Pickup: on failure/block, Hermes **moves to Blocked**. If Blocked is off, the failure path is undefined.

4. **Title vs fillers** — Title: “Jonas adds, Hermes fills.” Body also has Scout, workflows, and triage. Fine as marketing, misleading as ownership model.

5. **Comments API vs activity log** — Fields list `activity log`; API has `POST .../comments` only. Are comments the log, a subset, or a third stream?

6. **Assignee model vs filters** — Assignee is `jonas | hermes | none`; filters include **mine**. Unspecified for `none`, Scout-created, or workflow-created cards.

---

### Gaps (spec holes that will invent UI)

| Gap | Why it matters |
|-----|----------------|
| “Matches mockup” with no mockup, tokens, or layout | Screen can’t be built consistently |
| No screen **one question** (app-screens §2.2) | Hierarchy/density will default to template kanban |
| Card **face** vs drawer: what shows on the chip | Priority + labels + due + 🤖 + checklist = pill soup |
| Empty / loading / error / first-run | App-screens require framed empties; board will feel broken empty |
| Swimlanes × columns | 2D board: scroll, DnD across lanes, WIP per lane — undesigned |
| WIP when exceeded | Show-only vs block drop vs warn |
| Live updates | Acceptance wants live Hermes cards; no transport |
| Auth / who can mutate | Shared board implied; API has none |
| A11y for DnD | Keyboard/`c` help create; move/reorder path missing |
| Phone / narrow width | App-screens need a phone composition; absent |
| Triage “accept” | Suggestions in Inbox — apply how? undo? |
| Markdown / links rendering | Body + links to file/PR/conversation/finding/run — no threat model |

External refs (`05`, `06`, autonomy) are fine as pointers, but this doc doesn’t restate the board-visible approval UX, so Review/Ready can look “stuck” with no explanation.

---

### Unrealistic scope

Card model alone is a mini Linear: markdown, checklist, due, P0–P3, labels, project, multi-link types, activity, drawer, swimlanes, filters, DnD, inline add, global `c`, chat/`/card`, paste-bulk, Scout, workflows, triage, live Hermes strip.

**Acceptance criteria only prove:** 3s keyboard add, live Hermes marker, mock pickup → Review with summary.

Everything else (swimlanes, WIP, filters, drawer, bulk, triage, Blocked, multi-creator) is untested scope. For an Operate v1, cut to: one board, fixed columns including Blocked, minimal card face + drawer, Hermes Ready→In progress→Review, Jonas Done — defer swimlanes/GitHub sync/bulk paste.

---

### Security / privacy

- **Markdown body** — XSS if rendered as HTML without a tight sanitizer.
- **Linked artifacts** — File/PR/conversation/finding/run on a card can become an authorization bypass if the board is readable without object ACL.
- **Auto-fill from Scout/Hermes/workflows** — Findings and run summaries can land secrets, paths, or customer data on a persistent board; no redaction/retention rule.
- **Activity / comments** — Likely to mirror tool output; same leak surface.
- **API sketch** — No authn/authz, no idempotency for bulk, no audit of who moved a card (beyond creator).
- **Events → triggers (05)** — `kanban.card.*` can chain privileged automation; needs who can emit and whether Hermes moves fire the same triggers as Jonas.
- **Clipboard → bulk cards** — Easy to paste tokens/API keys into titles/bodies with no warn.
- **Spoofable `creator`** — If clients send `creator=hermes`, trust and the 🤖 marker break.

---

### UI / design quality (hierarchy, density, motion, legibility)

**Mode:** Operate / app screen — scanability and status over expression.

**What’s working (as intent)**
- Progressive disclosure via **card drawer** (if the face stays thin).
- **Top bar Hermes status** → strong Visibility of system status (heuristic 1).
- Global **`c` / quick add** → Flexibility & efficiency; matches “most frequent job one click away.”
- Hermes never Done → clear human gate at the end of the emotional arc.

**Problems the Screen section invites**

1. **No hierarchy design** — Column headers, WIP counts, card title, meta, Hermes strip, filters, swimlane toggle compete with equal weight. App type wants ~12/14/16/24 and greyscale chrome; colour on **state that needs a decision** (Blocked, P0, Hermes active), not on every label.

2. **Density unspecified → default slop** — Classic AI kanban: coloured column headers, emoji creator badge, stack of chips, shadow cards, “Welcome”-style empty. Spec should freeze card face to ~title + one status mark + optional due/assignee; everything else in the drawer.

3. **🤖 marker** — Explicit emoji; app-screens house rule replaces emoji with words/chips (“Hermes”). Also fails legibility/contrast in small UI and reads as decoration, not data.

4. **Cognitive load** — Visible controls already: swimlane mode, filters (mine / Hermes / project / label), DnD, per-column add, drawer, Hermes strip, WIP. That’s past the “>4 visible options” critique threshold without IA (e.g. filters in one control, swimlanes secondary).

5. **Motion** — DnD needs short feedback (150–250ms, drop target, reduced-motion: keyboard move). Spec says nothing; risk of celebratory card animations. App screens: **no motion floor**; motion = feedback only.

6. **Contrast / legibility** — WIP in headers, muted meta, markdown in drawer, checklist — no contrast tiers. House floor: running text ≥4.5:1; don’t put priority/due in `#969696` on white cards.

7. **Spacing / structure** — Inline add at column bottom is good; without column min-width, gutter, and sticky headers while horizontal-scrolling, boards become unreadable past ~5 columns + Blocked.

8. **Empty states** — “Add at bottom” without a framed empty column sentence (“Drop ideas here — or press `c`”) fails app-screens empty guidance and first-run activation.

9. **Product face** — Shell doesn’t name product/workspace; screen could be any SaaS kanban. One Hermes-specific element (active strip + Ready pickup affordance) is the right signature — amplify that, don’t add KPI tiles or icon-in-tinted-square chrome.

10. **Naming collision as UX** — Inbox/Ideas column vs Inbox `result` will confuse copy, empty states, and notifications (“new Inbox item” — card or message?).

---

### Priority fixes if you revise the doc only

1. Rename Ideas column; keep **Inbox** for the notification surface only. Make **Blocked** required while Hermes can fail.
2. Single pickup rule: e.g. `assignee=hermes` **and** column=Ready; labels are display-only.
3. Specify **card face** (3 fields max) vs drawer; replace 🤖 with a text/chip mark.
4. Cut v1 scope to match the three acceptance tests; mark swimlanes/bulk/triage/sync as later.
5. Add one paragraph each: authz on cards/links, markdown policy, empty/loading/Hermes-failure UI, live update mechanism, keyboard move alternative.

I can turn this into a tightened outline for `09-kanban.md` (still Ask mode — guidance only) if you want that next.
