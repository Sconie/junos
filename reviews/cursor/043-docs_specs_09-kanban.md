**Verdict:** As an Operate / app-screen brief, `09-kanban.md` is a solid *behavior* sketch (who creates, who picks up, Review ≠ Done) but a thin *UI* brief. It stacks a full board product into one screen paragraph, leaves eligibility and column naming ambiguous, and leans on emoji + a status top-bar that both skills would reject.

---

### Contradictions

1. **Column name vs semantics** — Columns list `Inbox/Ideas`; semantics call it **Ideas**. Moving Hermes work to Review “creates an Inbox `result`,” so “Inbox” means two different things in one flow. That will show up as wrong labels and wrong empty-state copy.

2. **Blocked is optional and required** — Columns say optional `Blocked`; failure path always “moves to Blocked.” Either Blocked is a first-class column or failure needs another home (stay In progress + reason, or a status on the card).

3. **Two Hermes eligibility keys** — Ready + `assignee=hermes` *or* label `hermes`, with no precedence. Conflicting states (assignee Jonas + label hermes; assignee hermes + no label) are undefined.

4. **Multi-board API vs one-board proposal** — Open question proposes one board + project field; API is `GET /boards/:id`. Swimlanes “by project” assume multi-project on one board; that fits the proposal, but the API sketch still implies many boards.

5. **Marker vs creators** — Only Hermes gets `🤖` + `creator=hermes`. Scout gets a label; workflows get `workflow:<id>`. No consistent face-of-card identity for non-Jonas creators.

6. **“Mine” is undefined** — Filter “mine” could mean creator, assignee, or both. Same for how swimlane-by-assignee interacts with filters (stacked filters vs exclusive views).

---

### Gaps (spec holes that block a trustworthy Operate screen)

Per app-screens §2 / §11 and impeccable craft-floor (states, coverage):

| Missing | Why it matters |
|---|---|
| **Card face vs drawer** | Fields list everything; Screen never says what sits on the tile (title only? P0? due? checklist count?). Default is over-dense tiles. |
| **Drawer IA** | “Card drawer on the right” with no sections, primary action, or edit model. |
| **Empty / loading / error / first-run** | No empty column copy, no board-empty, no SSE reconnect, no failed pickup UI. |
| **Conflict / concurrency** | Jonas drags while Hermes starts — last-write-wins? lock? toast? |
| **WIP over-limit UX** | Optional limit “shown in header” — soft warn, hard block drop, or ignore? |
| **Editable columns** | Claimed, no rename/reorder/add/remove, migration of cards, or defaults restore. |
| **Keyboard beyond `c`** | AC wants &lt;3s add; no move between columns, open drawer, or DnD alternative. |
| **Phone / &lt;900px** | Silent; board + drawer + swimlanes usually collapse to a sheet/list — unscoped. |
| **Comments vs activity** | API has `comments`; fields have “activity log” — one or two models? |
| **Triage apply-back** | Suggestions land in Inbox; how do accepted edits hit the board? |
| **Realtime contract** | “Appears live” + `kanban.card.*` with no payload shape, ordering, or optimistic UI rules. |
| **Reduced motion / DnD feedback** | Operate motion is state-only (150–250ms); unspecified. |

---

### Unrealistic scope

Acceptance covers three happy paths; the Screen line packs swimlanes, four filter dimensions, DnD, drawer, Hermes status chrome, and per-column inline add — plus editable columns, WIP, triage, bulk paste, Scout/workflow ingest, and event triggers.

For a first slice, that’s a multi-milestone board product. Realistic cut: one board, fixed columns (incl. Blocked), face fields locked, drawer for the rest, Hermes pickup + live create, keyboard add — defer swimlanes, column editing, and filter combinatorial explosion.

“Matches mockup” with almost no visual constraints also means implementers will invent a generic Linear/Trello clone; the skills treat that as failure of *specificity*, not of engineering.

---

### Security / privacy

- **Markdown body + links** (file, PR, conversation, finding, run) are a secrets sink; no redaction, link gating, or “don’t paste tokens” rule.
- **`kanban.card.*` on every change** — if events carry full body/artifacts, anything subscribed (workflows in 05, UI SSE) widens blast radius; spec should say *what* is in the event vs id-only + fetch.
- **Hermes finish summaries/artifacts on the card** — run output on a shared board needs the same sensitivity bar as chat/logs.
- **Clipboard / chat / Inbox capture** — high accidental-secret risk; no confirm-on-paste or scrubbing.
- **Local-only left open** — until then, no ACL, visibility, or “who can see Hermes failures.” Fine for solo local, unsafe if the API sketch ships as-is on a shared host.
- **Activity log as audit** is good; retention/export/delete of card history is absent.

---

### UI / design quality (impeccable Operate + design-taste app screens)

Mode: **Operate** — scanability and earned familiarity over expression. Colour on data/state, not chrome; motion = feedback; no emoji-as-icon; app screens have **no motion floor**.

**Hierarchy / IA**  
The Screen section is a feature pile, not a job. Primary job (“triage Ideas → Ready, watch Hermes, close Review”) is never named, so filters + swimlanes + status bar will compete equally. Renaming the first column away from “Inbox” would fix the worst IA collision.

**Density / card chrome**  
Unbounded fields on the tile will produce the generated-kanban look: priority chips, label pills, due dates, assignee avatars, checklist progress, emoji. App-screens want **one status mark per row** and colour on meaning; lock a minimal face (e.g. title + one state signal + creator affordance) and put the rest in the drawer.

**Typography / spacing**  
No type roles, column header treatment, or WIP numeral rules. Risk: loud headers, tiny meta, uneven column widths. Operate wants a tight rem scale (≈12/14/16/24), one grotesk, WIP as quiet type in the header — not a badge cluster.

**Top bar: “Hermes is working on: …”**  
App-screens punish empty or redundant top chrome and vanity status. This duplicates In progress and fights the shell. Prefer presence on the active card/column (and maybe a single quiet global indicator elsewhere), not a persistent sentence in the bar.

**Emoji `🤖`**  
Craft-floor and app-screens house rules: emoji is not an icon system. Use a consistent Hermes mark (glyph/wordmark/chip in one hue) that also works for Scout/workflow.

**Filters / swimlanes**  
“Mine, Hermes, project, label” + swimlane toggle is &gt;4 visible decision points before the board. Cognitive-load fail. Prefer one view mode (board | by project | by assignee) and a single filter control, not a pill row.

**Motion / DnD**  
Unspecified drag preview, drop reject (WIP), and `prefers-reduced-motion` (instant move, no travel). Spec should require state feedback only — no load choreography when cards stream in.

**Legibility / contrast**  
P0–P3, Blocked, and Hermes eligibility need a semantic vocabulary (pale tint + dark text, or a 6px dot + ink label) — not saturated pills on every card. Blocked reason must be readable on the face or immediately in the drawer, not only in activity.

**Empty / first-run**  
No “empty column keeps frame + one sentence + add affordance.” Without that, Hermes-filled boards look alive and Jonas-only boards look broken.

**Product specificity**  
Almost nothing is *only this product* except Hermes pickup. The signature element should be Hermes-on-the-board (eligibility, one-at-a-time, Review-with-summary), designed as UI — not an emoji and a status string.

---

### Highest-leverage spec fixes (if you revise the doc)

1. Rename first column to **Ideas**; keep product Inbox only for `result` / failure items.  
2. One Hermes rule: Ready + `assignee=hermes` (label as shortcut that *sets* assignee, or drop it).  
3. Make **Blocked** required (or redefine failure).  
4. Define **card face** (3–4 signals max) vs drawer.  
5. Replace emoji + Hermes top-bar sentence with a non-emoji Hermes presence pattern.  
6. Cut v1 Screen to: fixed columns, DnD + keyboard add, drawer, live create/pickup — defer swimlanes and rich filters.  
7. Add empty/loading/conflict, event payload sensitivity, and paste/capture caution in one short “States & trust” section.

---

Questions skipped: Ask-mode review of a markdown spec only (no live UI, detector, or mockup pixels to score).
