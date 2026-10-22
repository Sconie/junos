**Verdict:** As a glance/home + search brief, this doc is an inventory of widgets, not a designed Operate surface. It contradicts its own “not a place to work” framing, under-specifies hierarchy and states, and is too dense for a first viewport that still meets its acceptance bar.

Lens: **impeccable Operate** (precision, states, familiarity) + **design-taste app-screens** (one question, first-screen budget, anti-dashboard-tells). Spec-only review — no rendered UI.

---

### Contradictions

1. **Glance vs work.** Opening line: “glance page, not a place to work.” Then: Quick ask → Chat, inline Approve/Deny, Hermes Open, ⌘K creates cards/tasks. That is a work surface with a report wrapper.

2. **Loading model fights itself.** “Each card loads independently” vs “one `GET /home` aggregate **or** per-card queries.” An aggregate is one failure domain and one waterfall; it does not match independent skeleton→data→error unless the aggregate is only a cache seed and cards still own their queries. Pick one.

3. **Hermes / board duplication.** Hermes card shows “current card or task”; Board snapshot also shows “Hermes’s current card.” App-screen rule: a fact shown twice is one variable — two widgets will drift and burn trust.

4. **Two ask entry points.** Home “Quick ask” and ⌘K “Ask &lt;current model&gt;” both start model chat. No rule for which wins, shared draft, or whether Home is just a shortcut into the same composer.

5. **Search vs palette overlap.** Palette jumps to conversations/files/cards/tasks; global search is FTS over messages, cards, findings, inbox, file names/summaries. Boundary of “navigate” vs “find content” is undefined — implementers will double-build or disagree.

6. **Scope creep inside the section.** “Semantic search … comes with the file index (11)” sits under Global search while acceptance only covers Home + ⌘K. This surface either owns semantic search or it doesn’t.

---

### Gaps (design + product)

| Missing | Why it matters |
| --- | --- |
| **One question / one finding** | App-screens §2.2: biggest block answers the day’s question (“Who needs me?”, “What’s blocked?”). Eight peers = no answer. |
| **Priority / layout** | No reading order, spans, or “Needs you wins the grid.” Greeting+date as chrome is the generated-home tell unless this is deliberately `editorial-greeting`. |
| **First-screen budget** | Skill: at 1440×900 every named block shows header + first rows. Eight cards + greeting cannot honestly do that; which fold below? |
| **Empty / zero / first-run** | New install: all cards empty. No empty copy, setup CTA, or “zeros as zeros.” |
| **Freshness** | Event stream mentioned; no stamp, stale behavior, or “last good” on error (skill error pattern). |
| **Approve/Deny UX** | No confirm, undo, disabled-while-submitting, or what happens to the row. High-stakes on a glance page. |
| **Status dots / usage bars** | Dot color alone fails colorblind + contrast; bars need both ends labeled (“12 of 20”), not a bare fill. |
| **Typography / density / motion** | No type scale, row pitch, card chrome, or motion budget. Operate: 150–250 ms state motion only; no load choreography. Skeletons: flat bars at real size, no shimmer (app-screens). |
| **Responsive** | Phone/tablet unstated. Inline Approve/Deny as full-width button stacks is a known phone failure mode. |
| **⌘K IA** | Grouping, max rows, empty query, recent vs fuzzy, action vs nav ranking, focus trap, reduced-motion — all unspecified. |
| **Search result UI** | Snippet length, highlight, ranking, empty, error, filter chrome — absent. |

---

### Unrealistic scope

- **Eight independent live cards** + stream + FTS + rich ⌘K (nav + create + NL) is a product area, not a glance page. Acceptance (“&lt;1 s from local data”, “⌘K &lt;100 ms”) assumes everything is already local and indexed — Subscriptions/Scout/Hermes imply remote or async sources.
- **“Jump to any …”** without result caps or lazy indexes will miss 100 ms once the corpus grows.
- **Inline approvals on Home** duplicates Inbox and invites divergent UX/state machines unless Home is a strict projection of Inbox with one shared mutation path.
- **Board snapshot “counts per column”** is a mini-Kanban; without a hard row/column budget it becomes a second Board.

---

### Security / privacy

- **`GET /home` aggregate** packs Inbox, Hermes, Scout, usage, files into one payload — over-fetch and a single leak surface. Prefer least-privilege per card if sensitivity differs.
- **FTS over messages + file summaries** in a global UI: snippet leakage on shared screens, shoulder-surfing, and unclear multi-user/workspace scoping.
- **⌘K “recent first”** resurfaces sensitive titles/paths without search intent.
- **Approve/Deny without confirm** is an integrity risk (misclick), not only UX.
- **Quick ask / model chip:** unclear whether Home context (visible inbox/Hermes) is attached to the model call.
- **Provider usage bars:** billing/quota may be sensitive; who can see Home?
- **Event stream:** no authz, payload minimization, or “don’t push message bodies to Home subscribers.”

---

### UI / design-quality (hierarchy, spacing, type, density, motion, legibility)

Against app-screen tells and Operate craft:

1. **No hierarchy.** Equal “cards from the mockup” reads as the equal multi-up dashboard template. Needs you (or the one finding) should dominate; the rest are secondary answers or links out.

2. **Greeting + date as lead** → “Welcome back” class of home unless the product commits to editorial-greeting and a noun title is still present in the shell. A glance page usually wants a **noun** (“Home” / workspace name) and the finding as the first line of substance.

3. **Density collision.** Eight widgets guarantee either cramped cards (illegible lists) or a long scroll that breaks “glance.” Cap rows (skill: 4–6 + “View all”) and cut blocks that don’t answer a next question (Subscriptions and Recent files often belong in Settings / Projects).

4. **Chrome vs data.** Status dots and usage bars will attract accent-on-chrome if unspecified. Colour should mark **decision state** (needs approval, blocked), not every card accent.

5. **Legibility / contrast.** “Status dot” and grey secondary lines need minimum sizes (≥11–12 px meta) and non-colour encodings (label or icon + text). Model chip + input in Quick ask needs clear focus and 44 px touch targets on phone.

6. **Motion.** Skeletons are right; unspecified motion invites staggered card entrances (Operate bans load choreography). Palette open: instant; results can soft-replace, not theatrical.

7. **Product face missing.** No mark, workspace scope, or one signature element (e.g. a single “attention” strip). Risk: generic kit home.

8. **Command palette as second OS.** Without visual hierarchy (actions vs jumps vs “Ask model”), ⌘K becomes a dense unsorted dump — cognitive load &gt;4 options immediately.

---

### Highest-leverage fixes (spec-level)

1. State the **one question** and ordered blocks; demote or delete the rest.  
2. Resolve **aggregate vs independent** loading and shared Hermes/board data.  
3. Separate **navigate (⌘K)** vs **content search**, and defer semantic search cleanly to (11).  
4. Spec **empty / error / stale / Approve confirm**, snippet privacy, and a **first-viewport layout** (what fits above the fold).  
5. Replace “greeting + 8 cards” with hierarchy: finding → primary list → compact secondary strip — flat surfaces, type not KPI tiles.

I’m in Ask mode, so I can’t edit the doc; switch to Agent mode if you want these folded into the spec.
