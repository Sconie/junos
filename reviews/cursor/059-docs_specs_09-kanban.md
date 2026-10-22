**Verdict:** As an Operate-surface brief, the behavior spine is clear; the UI is mostly “matches mockup,” so hierarchy, density, states, and a11y are under-specified, and a few naming/rules collisions will bite implementers.

Lens: impeccable **Operate** (task UI, restraint, state motion) + design-taste **app screens** (quiet chrome, data over decoration, honest empty/loading/error, density arithmetic). No PRODUCT.md/DESIGN.md in repo; critique is of this doc alone. Context loader did not run (Ask mode).

---

### Contradictions

1. **`Inbox/Ideas` vs Ideas vs product Inbox**  
   Column is `Inbox/Ideas`, semantics say **Ideas**, and Review “creates an Inbox `result`.” Three different “inbox” meanings in one flow. Operators will confuse the Ideas column with the product Inbox.

2. **Hermes pickup: assignee *or* label**  
   “Ready with assignee `hermes` (or label `hermes`).” No precedence when they disagree (assignee Jonas + label hermes; assignee hermes + no label). Dual keys invite silent wrong pickup.

3. **Two WIP models**  
   Optional per-column WIP in the header vs Hermes “one card In progress at a time.” Unclear whether column WIP applies to Jonas, Hermes, both, or is display-only.

4. **Silent create vs non-silent triage**  
   Hermes/Scout/workflows can auto-add cards; triage must not silently edit. Fine as policy, but Ideas will fill with vague auto-cards while the only refinement path is an Inbox suggestion—tension with “scoped enough” Ready.

5. **Open question already half-answered**  
   “One board + project filter?” is open, but Screen already has project filter **and** swimlane-by-project. Decision is implied; the question should close or the UI should shrink.

---

### Gaps (spec holes)

| Area | Missing |
| --- | --- |
| Card chrome | What appears on the **tile** vs the **drawer** (title-only vs priority/due/checklist/labels). Field list dumps everything with no face hierarchy. |
| States | Empty board, empty column, loading, live-update failure, Hermes offline, WIP exceeded. App-screen rule: every block needs empty/zero/loading/error. |
| Interaction | DnD conflict with concurrent Hermes moves; keyboard equivalent; focus order into drawer; undo for accidental column moves. |
| Ordering | `position` in PATCH but no sort rules (manual vs priority vs due). |
| Live | “Appears live” with no transport, reconnect, or conflict UI. |
| “Mine” | Creator vs assignee vs both—undefined. |
| Blocked | Optional column with no enablement, and failure path always moves there. |
| Done | No archive/hide; Done grows forever. |
| A11y | Screen reader column announcements, reduced motion for live insert/DnD. |
| Mockup | “Matches mockup” with no link/criteria in-doc—unverifiable. |

---

### Unrealistic scope

One short doc commits to: editable columns, WIP, swimlanes, multi-filter, DnD, right drawer, Hermes status bar, inline add, keyboard capture, paste-bulk, chat/file/Inbox capture, Scout, workflows, daily triage, event bus, REST sketch, and agent pickup lifecycle.

Acceptance only covers three happy paths (3s add, live Hermes marker, mock pickup→Review). That under-tests the surface you’re specifying. For a first cut, the operable MVP is closer to: **one board, fixed columns, tile+drawer, keyboard add, Hermes Ready→In progress→Review**, and defer swimlanes / editable columns / WIP UI / bulk paste.

---

### Security / privacy risks

- **Markdown body** rendered in drawer/board → XSS / HTML injection if not sandboxed; agent-written bodies raise the stakes.
- **Links** to file, PR, conversation, finding, run with **no ACL**—board visibility may leak linked resource content or IDs.
- **Activity log + Review→Inbox `result` summaries** can carry paths, secrets, customer text; no retention, redaction, or “summary safe for Inbox” rule.
- **`creator` / `assignee` as API fields**—spoofable if client-trusted; events `kanban.card.*` can drive triggers (05) → automation abuse via forged moves.
- **Bulk paste / capture from chat**—prompt-injection into card text that Hermes later executes under pickup rules; autonomy note is necessary but insufficient without “untrusted card body” handling.
- **No tenancy/auth model**—fine if single-user local; say so explicitly, or multi-user is an unstated risk.

---

### UI / design quality (Operate + app-screen lens)

**Mode:** Operate—scanability and familiar board patterns beat expression. Ambition here should be precision, not a branded “hero” board.

1. **Hierarchy**  
   No page title, column-header scale, or tile typography. App-screen medians: page title ~24px, card title ~16/500, meta 11–12px grey. Spec should say: **title = primary ink; everything else secondary**; one status mark per tile (not priority + labels + hermes emoji + due).

2. **Density / clutter**  
   Swimlane toggle + filters (mine, Hermes, project, label) + Hermes top bar + WIP in headers + add-at-bottom-of-every-column + drawer is past the “>4 visible options” cognitive-load line. Prefer: default flat board; swimlanes secondary; filters as one compact control; single global add (`c`) instead of N column footers.

3. **Emoji marker (`🤖`)**  
   App-screen/house rules treat emoji as a generated tell. Prefer a quiet creator chip (“Hermes”) or a monochrome glyph in meta row—same information, less costume.

4. **Surfaces**  
   Spec implies classic card tiles. App screens: flat separation (tone step / 1px), shadows only on floating UI (drawer/menu). Call that out so the board doesn’t ship as a tray of elevated cards.

5. **Spacing / legibility**  
   No tile pitch, column width, or drawer width. Without numbers, implementers will over-stuff tiles (checklist + links on face) and kill scan speed. Suggest: tile shows title + at most one meta line; checklist/links/activity live in the drawer.

6. **Contrast / color**  
   No semantic colors for Blocked / In progress / P0. Risk: rainbow priority pills and saturated “Hermes working” chrome. Rule of thumb from the lens: **~few % colored pixels; color on state that needs a decision; pale status pairs with dark text; one loud fill only while rare.**

7. **Motion**  
   Live card appearance and column moves need **state feedback** (150–250ms), not entrance choreography. Spec should require `prefers-reduced-motion` (instant position update, no travel) and no board-load animation sequence.

8. **Product face vs generic kit**  
   The Hermes status line is the one product-specific signal—good. Everything else reads as generic kanban. Empty states should use trade words (“No Ready work for Hermes”, “Ideas waiting on triage”), not “No cards.”

9. **Phone**  
   Unmentioned. Horizontal boards collapse badly; without a stack/list fallback, mobile is undefined (app-screens §12).

10. **IA naming**  
    Rename column to **Ideas** (drop Inbox) so hierarchy and the real Inbox stay legible.

---

### Highest-leverage doc fixes

1. Resolve **Ideas** naming, **assignee vs label** precedence, and **WIP** (Hermes-only vs column).  
2. Specify **tile vs drawer** content and empty/loading/error/live-fail states.  
3. Cut or stage swimlanes / editable columns / WIP UI behind the three acceptance paths.  
4. Add security notes: markdown sandbox, link ACL, summary redaction, untrusted agent/paste bodies, single-user assumption.  
5. Replace emoji with a quiet creator mark; constrain color, density, and motion to Operate/app-screen rules.

Questions skipped: Ask-mode doc review only; no live UI or detector run.
