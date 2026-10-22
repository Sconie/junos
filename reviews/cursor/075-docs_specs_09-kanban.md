**Verdict:** Strong product brief for “Jonas captures, Hermes executes”; weak Operate/app-screen design brief. The Hermes rules are almost implementable; the Screen section is not. Several rules conflict with each other, and the UI defaults the skills would reject (emoji chrome, stacked status marks, unspecified density) are left wide open.

Mode for this surface: **Operate / app screen** (work board, not marketing). Ambition = precision and scanability, not expression.

---

### Contradictions

1. **Pickup eligibility is dual and fuzzy.** Ready semantics say cards *labelled* `hermes` are eligible; pickup rules say assignee `hermes` *(or label `hermes`)*. Unclear which wins when assignee is `jonas` and label is `hermes`, or assignee is `hermes` with no label.
2. **Blocked is optional and mandatory.** Columns list `Blocked` as optional; failure/block path *requires* moving there. If the column can be deleted, the failure path has nowhere legal to go.
3. **“Editable columns” vs fixed Hermes machine.** Defaults are editable, but Ideas → Ready → In progress → Review → Done (and Blocked) carry hard semantics (auto-land, pickup, Inbox `result`, Done-only-by-Jonas). Editing/renaming/removing those columns breaks the agent contract; the doc never freezes system columns vs cosmetic ones.
4. **Assignee `none` vs label `hermes`.** Card fields allow assignee `none`; pickup still allows label-only. That invents a third ownership model without UI language for “claimed for Hermes but unassigned.”
5. **“Matches mockup” with no mockup.** Screen claims visual parity with something not in this doc—no layout, tokens, or states to match.
6. **Review → Inbox `result` only for Hermes.** Implied for Hermes work; silent on Jonas/Scout/workflow cards moved to Review—either a product decision or an inconsistency waiting to happen.

---

### Gaps

**Product / behavior**
- Card *face* vs drawer: which of title, body, creator, assignee, project, priority, labels, due, checklist, links, activity show on the column card.
- What `c` / `/card` targets (which column, focus after create).
- WIP limit: soft warning vs hard block; who may override; interaction with Hermes’ “one In progress.”
- Concurrent edit: Jonas drags while Hermes starts; live board + DnD conflict policy.
- Reopen/reject from Review; who may move out of Blocked; archive/delete.
- Ordering (`position`): sort keys, manual order vs priority, swimlane reparenting.
- Triage suggestions: accept/reject UX and whether apply is one-shot or field-by-field.
- Realtime: how “appears live” is delivered (events already sketched; UI subscription not).

**Operate / design (skills expect these)**
- Empty, zero, loading, error for board, column, drawer, filters, Hermes idle/working/failed.
- Narrow / phone composition (app-screens: phone is its own layout; kanban almost always needs a list fallback).
- Keyboard parity for everything DnD does (a11y + your “under 3 seconds” criterion).
- Type scale, column/card pitch, max title lines, meta hierarchy (primary ink vs grey).
- Focus, selection, and “Hermes is working on” when idle (operate: no decorative top chrome).
- `prefers-reduced-motion` for DnD, live inserts, drawer open.
- Filter model: AND/OR, sticky URL state, “mine” definition (creator vs assignee).

**API**
- Authn/authz on board/card; comment vs activity; bulk limits; event payload shape for `kanban.card.*`.

---

### Unrealistic scope

The Screen line packs swimlanes, filters, DnD, right drawer, live Hermes status, and per-column inline add—on top of four creators, daily triage, editable columns, and agent pickup. Acceptance criteria only cover: keyboard add, live Hermes card, mock pickup → Review. That gap usually means either a thin v1 that still claims the full Screen, or an unbounded board project.

Highest risk cut: **swimlanes + editable columns + live agent moves** in one milestone. One board + project filter (already proposed) is enough; swimlanes can wait.

Also heavy: markdown body + checklist + activity + multi-link types on every card before the face hierarchy is defined—drawer becomes a second product.

---

### Security / privacy

| Risk | Why it matters here |
| --- | --- |
| **Markdown body rendered in drawer/card** | Classic XSS / HTML injection if not strictly sanitized; agent- and paste-created content is untrusted. |
| **Links to file, conversation, finding, run** | Board becomes a side channel into other surfaces; no ACL or redaction rule—Scout findings and chat can be sensitive. |
| **Activity log + Hermes summaries** | May include paths, diffs, prompts, or failure detail; visible to anyone who can see the board (multi-user never stated). |
| **`kanban.card.*` → triggers (05)** | Event payloads can leak title/body/links into automations and logs. |
| **Bulk paste / capture from chat/Inbox** | Size limits, secret scrubbing, and “did I mean to publish this?” are unspecified. |
| **Creator spoofing** | API sketch is open `POST /cards` with creator in the field model; server must set creator, not the client. |
| **`workflow:<id>` / run links** | ID enumeration and cross-tenant leakage if IDs are guessable and boards are shared. |
| **Emoji `🤖` as sole Hermes signal** | Not a security bug, but a11y/i18n failure; screen readers and plain text logs need a real `creator`/`source` affordance, not a pictograph. |

Assumption hole: the doc reads single-player (Jonas), but “shared work board” + API implies sharing. Privacy model is missing either way.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

This is where the spec most invites **generated kanban slop**: column headers with counts, rainbow priority, emoji creator marks, filter pill rows, shadowed cards, and a status strip that competes with the work.

**Hierarchy**
- No stated primary question for the first screen (app-screens §2: one job). Likely job: “What should Hermes or I do next?”—but the described chrome (filters + swimlane toggle + Hermes banner + per-column add) can bury Ready/In progress.
- Card face unspecified → every field will fight for the title. Skill rule: identity + one key signal in primary ink; meta in grey; **one status mark per row**.

**Density**
- 5–6 columns × swimlanes × rich cards without pitch/width caps will fail the “first screen shows the work” test. Need: column min width, card title ≤2 lines, meta budget (e.g. assignee + due only), overflow into drawer.
- Inline add at the foot of *every* column repeats chrome; one compose control + `c` is denser and matches acceptance.

**Typography**
- No scale. For Operate: one grotesk, page title ~18–24px, card title ~14–16, meta ~12—not a marketing hero. Spec’s emoji and unnamed “marker” push decoration over type.

**Spacing / layout**
- Swimlane toggle + filter row + Hermes top bar + board = three header bands before cards. App-screens: colour/chrome stay quiet; data (cards) own the plane. Collapse Hermes status into the In progress column or a single quiet status line, not a permanent banner.
- Drawer “on the right” with no width, stacking order, or scroll model for checklist + activity + markdown—likely a long undifferentiated scroll.

**Contrast / legibility**
- P0–P3 + labels + Hermes marker + project + due invites multi-hue chips (taste: status as pale tint + dark text of same hue; saturated fill only for rare CTA). Spec doesn’t forbid the loud default.
- WIP in header and filter chips need AA contrast called out; grey-on-grey meta is the usual failure.

**Motion**
- DnD and live card insert implied; Operate: 150–250ms, state only, no load choreography; app-screens: **no motion floor**, feedback only. Spec should require reduced-motion = instant move / no drag animation, and no celebratory Done motion.

**Product face (taste)**
- The one element that is *this* product—Hermes working on a card—is mentioned but not designed as the signature (e.g. In progress column as the live run surface with run link). Instead the doc leans on `🤖`, which both skills treat as a tell to remove.

**Copy / empty states**
- No trade empty states (“Nothing Ready for Hermes”, “Ideas waiting on triage”). Generic “No cards” will ship by default.

---

### Priority fixes to the doc (guidance only — Ask mode)

1. Freeze **system columns** and a single pickup rule: e.g. Ready + `assignee=hermes` only; label is filter sugar, not eligibility.
2. Make **Blocked** required when Hermes pickup exists, or define a fallback column.
3. Replace Screen with an Operate brief: first-screen job, card face fields, density numbers, empty/loading/error, keyboard map, narrow layout, reduced motion—drop or defer swimlanes.
4. Replace `🤖` with typed creator/source UI (short text or monochrome mark), one status signal max on the card.
5. Add a short **trust** section: server-set creator, markdown policy, link ACL, activity/event redaction, bulk limits.

---

If you want a follow-up, the highest leverage rewrite is the **Screen** section into an app-screen brief (job, face, density, states)—still without expanding scope into other specs.
