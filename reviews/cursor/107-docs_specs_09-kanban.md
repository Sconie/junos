**Verdict:** The behavioral core (Jonas adds → Hermes pickup → Review only Jonas Done) is clear; the Screen/API surface is under-specified for an Operate board and already plants craft/security traps (emoji marker, filter pile, unauth API, unbounded card face).

Mode: **Operate** / app screen (work board). Reviewed from the doc alone — no mockup, PRODUCT.md, or DESIGN.md in repo.

---

### Contradictions

1. **Column name vs semantics** — Default is `Inbox/Ideas`, semantics only define **Ideas**. Unclear whether the column is named Inbox, Ideas, or both; also collides with product “Inbox” used for triage/`result` items.
2. **Hermes eligibility** — Ready says “cards labelled `hermes`”; pickup says assignee `hermes` **or** label `hermes`. Assignee vs label is two mechanisms without precedence (both set? neither? label without Ready?).
3. **“Inbox/Ideas” vs auto-add** — “Auto-added cards land here” under Ideas, but the column title includes Inbox. Easy to confuse with Hermes Review → Inbox `result`.
4. **Screen “matches mockup”** — No mockup, layout, density, or states in this file. Implementers will invent a generic Trello clone.
5. **Assignee model** — Creators include `scout` and `workflow:<id>`; assignees are only `jonas | hermes | none`. Fine if intentional, but Scout/workflow ownership and “mine” filter are undefined.
6. **Blocked as column vs state** — Optional `Blocked` column plus failure path that “moves to Blocked” mixes column identity with run state; unclear vs a `blocked` label/status on In progress.

---

### Gaps

| Area | Missing |
|---|---|
| Card face vs drawer | Which of title/body/priority/labels/checklist/links/activity show on the tile vs only in the drawer |
| Empty / loading / error / first-run | Board empty, column empty, Hermes offline, DnD conflict, failed live update |
| WIP | Soft warn vs hard block; who can override; header treatment when over limit |
| Swimlanes × filters | Interaction matrix; empty lanes; lane order; performance with many projects |
| Concurrent edit | Jonas drags while Hermes moves same card; last-write / optimistic UI |
| Keyboard | `c` and `/card` only; no map for focus, move column, open drawer, filter |
| Responsive | Phone/narrow: columns → stacked? drawer → full screen? DnD on touch? |
| Lifecycle | Archive, delete, restore, Done retention, column edit UX |
| Realtime | “Appears live” — WS? poll? event payload shape? |
| A11y | DnD without pointer; status not color-only; focus in drawer |

Acceptance covers three happy paths and under-tests the surface the Screen section claims.

---

### Unrealistic scope

One short Screen line packs: swimlanes, multi-filter, DnD, card drawer, live Hermes strip, inline add per column, plus creators from Jonas/Hermes/Scout/workflows, triage suggestions, bulk paste, capture from chat/file/Inbox, editable columns, WIP, rich links, activity log, and `kanban.card.*` triggers.

That is a full work-tracker slice. The acceptance criteria do not constrain MVP (e.g. no swimlanes, no WIP, drawer read-only first). Risk: ship a shallow board chrome while Hermes rules stay half-specified.

---

### Security / privacy

- **API sketch** — No auth, board scoping, or field-level ACL on `GET/POST/PATCH` or bulk create. Local-only later sync (GitHub/Linear) does not excuse this for a board that holds work + agent output.
- **Link fan-out** — Cards link file / PR / conversation / finding / run. Opening a card or emitting events can over-expose Scout findings or chat content if consumers get full bodies.
- **Hermes/Scout auto-create** — Directives and findings can land sensitive text on a shared, less-guarded surface; no redaction, visibility, or “private to Jonas” flag.
- **Bulk paste / capture** — Clipboard and chat → many cards with no mention of secret scrubbing or size limits.
- **Activity log + events** — Durable agent summaries and `kanban.card.*` for triggers (05) without retention, who can subscribe, or whether body/diffs are in the payload.
- **Identity** — Hard-coded `jonas`/`hermes` implies single-user; multi-user later reopens auth and “mine”.

---

### UI / design quality (Operate + app-screen lens)

The Screen section is a feature dump, not a composition. For an app screen, the brief should answer: **one primary job on first paint**, **what’s on the card face**, **how chrome stays quiet**.

**Hierarchy**  
“Hermes is working on: \<card\>” in the top bar can steal the primary task (triage/move cards). App-screen guidance: colour/attention on data and the frequent job, not chrome. Spec that strip as a secondary status line (or in-column affordance on the In-progress card), not a second hero. Rank: board canvas → card titles → filters/swimlane as tools.

**Density**  
Card field list is Linear-scale. If tiles show priority + labels + checklist + links + 🤖 + assignee, columns become unreadable. Specify a tight face (e.g. title + one meta line + optional due) and put the rest in the drawer. App screens: one status mark per row; meta in grey; no badge pile.

**Typography**  
No scale. Operate wants a tight rem scale (≈1.125–1.2), one grotesk, page/column titles in the 14–24px band — not marketing display. Call out: column name + WIP count as one header pattern; card title as the only strong ink on the tile.

**Spacing / layout**  
Swimlanes × 5–6 columns creates empty band risk (`panel-void` / blank stretches). Need rules: fixed column width + horizontal scroll vs fluid; lane header pitch; drawer width (~360–420) vs board; add-row sticky at column foot without fighting scroll. Filters as a chip pile fights both skills and your “no pill clusters” rule — prefer a short compound control (“Project · Label · Hermes”) per app-screen filter patterns.

**Motion**  
DnD + live insert implied; no budget. Operate: 150–250ms state feedback only; no entrance choreography on every card. Spec: move/ column change as the signature motion; live Hermes card = quiet insert, not celebration; `prefers-reduced-motion` = instant reposition.

**Legibility / contrast**  
- **🤖 marker** — Craft floor and app-screen house rules reject emoji as UI chrome. Use a text/SVG creator mark (“Hermes”) with sufficient contrast.  
- **P0–P3** — Must not be colour-only; pair with text/order.  
- **WIP in header** — Secondary meta needs ≥4.5:1; over-limit needs a semantic state, not a louder badge.  
- Drag handles / “mine” filters — don’t rely on hue alone for assignee identity (pale person tints are identity, not status).

**Product face vs template**  
As written, this is a generic kanban. The one Junos-specific element is Hermes pickup/live work — design that as the signature (In-progress treatment, run link, Review summary), not a robot emoji and a status toast. Empty Ideas column should use product language (“Drop an idea — `c`”) not “No cards yet”.

**States the skills require and the doc omits**  
Empty board, empty column, over WIP, Hermes blocked reason on the card, drawer loading, failed pickup, offline/live sync. App screens: empty keeps frame + one sentence + primary action where the job lives (inline add / `c`).

**Copy**  
“Inbox/Ideas”, label `hermes`, assignee `hermes`, and product Inbox `result` will confuse. Pick one vocabulary in the UI (“Ideas”, “Ready for Hermes”, “Waiting on you”).

---

### Highest-leverage fixes (spec-only)

1. Resolve Ideas vs Inbox naming; pick **one** Hermes eligibility rule (assignee **or** label) with precedence.  
2. Split MVP Screen: face fields, drawer fields, no swimlanes/WIP until acceptance expands.  
3. Replace 🤖 with a non-emoji creator treatment; define priority/status without colour-only.  
4. Add empty/error/realtime and conflict notes; constrain API with auth + payload minimization for events/links.  
5. One paragraph on hierarchy: primary job = board; Hermes status = secondary; filters = quiet toolbar.

---

Questions skipped: Ask-mode doc review only — no rendered UI, so impeccable detector/live critique and taste `inspect.mjs` were not run.
