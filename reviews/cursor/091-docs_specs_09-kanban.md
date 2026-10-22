**Verdict:** As an Operate / app-screen brief, this is a thin capability list with a workable agent loop, but it is not yet a buildable UI or security-safe surface. The board’s one job is unclear, the column/Inbox language fights itself, and the “Screen” paragraph invites a generic Trello/Linear clone with emoji chrome.

Lens: **impeccable Operate** (scanability, states, motion-as-state, keyboard) + **design-taste app screens** (one question first, quiet chrome, density with substance, no template tells). No rendered UI — this is a **spec** critique only.

---

### Contradictions

1. **Column name vs semantics** — Default is `Inbox/Ideas`, but semantics only define **Ideas**. Elsewhere, moving Hermes work to Review “creates an Inbox `result`.” Same word for a board column and a separate Inbox product is a naming collision waiting to confuse filters, events, and UI copy.

2. **Pickup eligibility** — Ready says cards “labelled `hermes`” are eligible; pickup rules say assignee `hermes` **or** label `hermes`. Unspecified: label but assignee `jonas`; assignee `hermes` but not Ready; both set; neither set after triage.

3. **Assignee model vs creators** — Creators include `scout` and `workflow:<id>`; assignees are only `jonas | hermes | none`. Scout/workflow work has no first-class owner on the board face.

4. **“One In progress” vs status chrome** — Default WIP is one Hermes card, but WIP is optional/configurable and the top bar is singular: “Hermes is working on: \<card\>.” Multi-WIP has no UI.

5. **“Matches mockup”** — No mockup, tokens, or layout constraints in the doc. That phrase licenses inventing a stock board.

6. **Done ownership** — Hermes never moves to Done (Jonas does). Unspecified who moves out of Blocked, who can skip Review, and whether Jonas can force Done from In progress.

---

### Gaps (spec completeness)

| Area | Missing |
|---|---|
| **One question** | App-screen run wants one line (“What should move next?”). The Screen section never names it, so hierarchy is undefined. |
| **Card face vs drawer** | Fields list is rich; board face vs drawer contents, truncation, and what DnD preview shows are unspecified → either overcrowded cards or empty shells. |
| **States** | Empty board/column, loading, drag conflict, Hermes offline, failed pickup, WIP exceeded — none. Operate craft floor requires these. |
| **Keyboard** | `c` / `/card` only. No board nav, column jump, move without mouse, drawer focus trap — weak vs “add in \<3s” and DnD-heavy UI. |
| **Phone** | Zero responsive story. App-screens treat phone as its own composition. |
| **Realtime** | “Appears live” with no transport, presence, or conflict rules. |
| **Ordering** | `PATCH … position` with no model (index, fractional, per-column). |
| **Triage UX** | Suggestions as Inbox items — accept/reject/apply-to-board flow not specified. |
| **Blocked** | Optional column: enablement, who may enter/leave, relation to failure Inbox. |
| **Acceptance** | Covers add, live Hermes marker, mock pickup → Review. Omits filters, swimlanes, drawer, WIP, triage, bulk paste, a11y. |
| **Cross-refs** | Autonomy (06) and events (05) cited without stating what the board must show when approval is required. |

---

### Unrealistic scope

In ~50 lines the surface absorbs: editable columns, optional WIP, swimlanes, multi-filter, DnD, drawer, global capture, bulk paste, chat/file/Inbox capture, Scout, workflows, daily triage, live agent status, activity log, checklists, typed links, and evented API.

That is a full work-tracker vertical, not a first slice. Unrealistic for one pass unless cut to: **one board, fixed columns, card face + drawer, Jonas add, Hermes pickup loop** — swimlanes, editable columns, and Linear/GitHub sync stay out of v1 (sync is already an open question; keep it there).

“Add in under 3s” fights the full field set unless create is title-only (or title + body) and enrichment is triage/drawer later — say that explicitly.

---

### Security / privacy

1. **Markdown body** — No sanitization/CSP rules. Agent- or paste-sourced markdown is a classic XSS path if rendered as HTML.
2. **Link types** (file, PR, conversation, finding, run) — Findings/runs/chats can hold secrets; board visibility and link prefetch/unfurl are unspecified.
3. **API sketch** — No authz, tenancy, or “who can PATCH assignee to hermes.” Open `POST /cards` + pickup = free agent work trigger.
4. **Event cascade** — `kanban.card.*` → triggers (05): card create/move can fan out automations; need authz and loop limits (Hermes creates cards → triage → more cards).
5. **Capture surfaces** — `c` anywhere + capture from chat/file/Inbox can park private content on a durable board with activity log; retention/redaction unstated.
6. **Creator spoofing** — If clients send `creator=hermes`, the 🤖 marker is a trust UI lie unless creator is server-set.
7. **Activity log** — Risk of logging prompts, tokens, or failure payloads into a UI surface.

---

### UI / design quality

**Mode:** Operate — familiarity and task speed beat expression. Taste app-screens: colour on data not chrome; no hero; quiet shell; honest empty/zero states.

**Hierarchy & density**  
Screen dumps peer features (swimlanes, filters, DnD, drawer, Hermes bar, per-column add) with no primary block. For a board, the columns/cards should dominate; filters and swimlanes are secondary. Card field list will produce **high-chrome cards** (priority + labels + due + checklist + links + emoji) unless the face is title + 1–2 signals and the rest live in the drawer.

**Typography & legibility**  
No type scale, measure, or “markdown on the card face” rule. Body markdown on the board face will wreck scanability; meta in soft grey will fail contrast if unspecified (house floor ≥4.5:1).

**Spacing & layout**  
No column width, card pitch, drawer width, or filter bar rhythm. “Add at bottom of each column” fails on long columns (add control scrolls away) — sticky column footer or header action is the usual Operate fix; undocumented.

**Swimlanes + filters**  
Two ways to slice project/assignee → redundant controls and >4 visible decision points (cognitive load). Pick one primary dimension for v1.

**Motion**  
DnD is the only implied motion. Operate: 150–250ms, state only, no load choreography; needs reduced-motion and keyboard move parity. Live “Hermes working” should be a calm status line, not attention theater.

**Contrast & status**  
WIP in headers is good. Priority P0–P3 and Blocked need a **one-mark-per-card** status system (pale chip or dot + ink), not rainbow pills. Saturated fills on many cards will drown the board (app-screens status-pill guidance).

**Template / slop risks (taste + craft floor)**  
- **`🤖` as the Hermes marker** — craft floor: no emoji as icon system; taste: no emoji. Use a server-backed agent mark (text, monochrome glyph, or quiet “Hermes” meta).  
- Unspecified visual world → default **generic kanban** (shadow cards, badge piles, coloured column headers). Spec should forbid decorative column colour and require flat separation (tone step / 1px), product name in the shell, and sentence-case filters — not tiny tracked uppercase chips.

**Empty & error**  
No empty-column or empty-board copy in the product’s language (“Drop an idea” / “Nothing in Ready for Hermes”). Judges punish quiet-but-empty frames.

**Phone**  
Unspecified. A horizontal board usually becomes a column picker + single column + drawer; without that, mobile is a failed crop of desktop.

**What’s strong**  
Purpose is clear; Hermes pickup → Review → Jonas Done is a real loop; triage as Inbox suggestions (not silent edits) is good trust design; top-bar “working on” supports visibility of system status; keyboard-first add AC matches Operate efficiency.

---

### Priority fixes for the doc (not implementation)

1. Rename the first column to **Ideas** only; keep **Inbox** for the notification product.  
2. One pickup rule; server-owned `creator`; non-emoji Hermes mark.  
3. Split **card face** (title + status signals) vs **drawer**; title-first create for the 3s AC.  
4. Cut v1 scope: fixed columns, no swimlanes (or filter-only), no editable column model.  
5. Add states, keyboard moves, authz on API/events, markdown sanitization, phone composition.  
6. Replace “matches mockup” with layout constraints (one question, shell, density, status vocabulary) or link the actual mockup.

I can turn this into a tightened outline for `09-kanban.md` section-by-section if you want that next (still Ask mode: guidance only).
