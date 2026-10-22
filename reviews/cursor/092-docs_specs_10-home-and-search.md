**Verdict:** Spec 10 describes a glance Home that is actually an 8-panel ops dashboard plus two overlapping search surfaces. As an Operate / app-screen brief it never names the one question the page answers, so hierarchy, density, and duplication are under-specified and likely to ship as a template home.

Lens: impeccable **Operate** + design-taste **app screens** (quiet chrome, one question, first-screen substance, no entrance carnival). Review is of this doc only.

---

### Contradictions

1. **Glance vs work.** “A glance page, not a place to work” conflicts with inline Approve/Deny, Quick ask → Chat, Hermes Open, and ⌘K “create a card without leaving.” Those are work surfaces, not glance chrome.
2. **One Hermes fact, two cards.** Hermes “current card or task” and Board snapshot “Hermes’s current card” are the same fact twice. App-screen rule: one variable; disagreement costs more trust than a missing card.
3. **⌘K vs Global search.** Palette jumps to conversations/files/cards/tasks with fuzzy match; Global search is FTS across the same object families. The doc never says whether they share an index, UI, or ranking—or when the user should use which.
4. **Data path fork.** “One `GET /home` aggregate **or** per-card queries plus the event stream” leaves two architectures with different failure, cache, and consistency stories while acceptance assumes a single “under 1s” experience.
5. **Natural-language row vs search.** “Typing a sentence offers Ask …” as the last row does not define when a query is a jump vs an ask (punctuation? length? explicit mode?). Enter “executes” then becomes ambiguous.

---

### Gaps

| Area | Missing |
| --- | --- |
| **One question** | No line like “What needs me before I dig in?”—so no rule for what is largest, first, or cut. |
| **Layout** | No grid, breakpoints, or first-viewport packing for eight cards (app screens require every named block’s header + first rows at ~1440×900). |
| **Empty / zero** | Skeleton + error + retry only; no empty copy or next action per card. |
| **Approve/Deny** | No confirmation, deny reason, keyboard path, or “what happens to the row.” |
| **Needs you** | “Approvals first” only; non-approval inbox kinds, sort, and deep-link undefined. |
| **Board / runs / Scout** | Counts, status dots, findings—no labels, units, or “View all.” |
| **Subscriptions** | Usage bar with no plan baseline, overrun, or click-through. |
| **Recent projects/files** | Count, sort, and what “recent” means. |
| **Search UX** | Ranking, snippets/highlights, empty state, keyboard nav, result cap, project scope default. |
| **Semantic vs FTS** | Deferred to 11 with no interim behavior when the user expects “search.” |
| **a11y / motion** | No focus order, live regions for async cards, or `prefers-reduced-motion` for multi-skeleton load. |
| **Acceptance** | No criteria for search quality, palette actions beyond “create a card,” or Home when several cards fail. |

---

### Unrealistic scope

- **Home is a product map.** Eight cards pull Inbox, Tasks, Hermes, Kanban, Connections/usage, Scout, Files, and Chat entry—nearly every surface. A true glance page usually answers one finding + one primary job; the rest should deep-link.
- **⌘K is three products:** navigation, command runner (New chat/card/task, Run workflow, Ask Hermes, Switch model), and NL ask. “Opens in under 100 ms” with fuzzy over all object types plus actions is a hard bar without indexing/lazy strategies (none specified).
- **FTS corpus.** Messages + cards + findings + inbox + file names + summaries is a large, churny index; no ingest, refresh, or size assumptions.
- **Independent card load + aggregate + stream** without stating which wins for consistency (e.g. Hermes state vs board) will fight the 1s / non-blocking goals in practice.

---

### Security / privacy risks

- **`GET /home` aggregate** is a high-value dump (approvals, Hermes actions, usage, findings, recent files). No authz, field minimization, or “don’t put secrets in home payloads.”
- **Inline Approve/Deny** on Home invites mis-clicks on high-impact actions with no step-up or undo called out.
- **⌘K “Run workflow” / “Ask Hermes”** from a global hotkey is accidental-execution risk; no confirm or dry-run.
- **Full-text over messages and file summaries** will index secrets, tokens, PII, and pasted credentials unless redaction/exclusions exist (none here). Filters are type/project/date only—no sensitivity or “local-only” rules.
- **Provider usage bars** on a glance page can leak quota/billing on shared screens; no sensitivity note.
- **Model chip on Quick ask** can change cost/routing with no visibility into what is sent from Home.

---

### UI / design quality (hierarchy, density, type, motion, legibility)

**Hierarchy.** Greeting + date + eight peer cards is the generated-home pattern app screens warn about (welcome header, equal tiles, no dominant answer). Nothing is specified as the largest block or the one finding. Quick ask competes with “Needs you” for primary attention.

**Density / first screen.** Caps of 5 + 5 + 3 + 3 actions + column counts + usage + recent files will not all show “header + first rows” above the fold without aggressive truncation or a multi-row wall. Spec pushes toward scrollable dashboard clutter, not a glance.

**Composition / tells.** Card-per-domain with status dots and usage bars reads as KPI/tile dashboard unless type-led (numbers as type, flat surfaces, colour only on data that needs a decision). “Subscriptions … usage bar” without a plan track encoding invites decorative chrome.

**Duplication as UX noise.** Hermes + board, Needs you vs full Inbox, Scout teaser vs Scout—same objects with weaker context than the destination screens. Glance should summarize once and link.

**Typography / contrast.** No type roles, sizes, or dim-text rules. Status “dots” alone fail colour-not-only unless paired with text (implied elsewhere in the system, not in this spec). Greeting/date as hero-scale type would fight Operate restraint (app screens: many homes keep titles ≤ ~24px).

**Spacing / rhythm.** No section gaps, card padding, or shared left edges—eight independently loading panels will ragged-row and leave panel voids when content lengths differ.

**Motion.** Eight skeletons resolving independently risks a staggered shimmer entrance. App-screen house guidance: no entrance performance; motion should be feedback on controls, not load theatrics. Reduced-motion not mentioned.

**Command palette density.** Grouped-by-type + recent + fuzzy + trailing Ask row will produce long, similar lists; no visual hierarchy between navigation results and destructive/expensive actions (Run workflow vs Jump to file).

**Legibility of search.** FTS without snippet/highlight rules makes result rows hard to scan; semantic “later” leaves a quality cliff.

---

### Highest-impact fixes (spec-level, not implementation)

1. **Write Home’s one question and one finding**; cut or demote cards that don’t answer them (likely keep Needs you + one next-run/Hermes signal; deep-link the rest).
2. **Pick one source of truth for Hermes’s current work**; Board snapshot should not restate it.
3. **Reconcile glance vs work:** either remove inline Approve/Deny or drop the “not a place to work” line and specify confirm/undo/keyboard.
4. **Unify ⌘K and Global search** (one index, two entry points—or explicitly separate jump vs full-text) and define NL vs fuzzy disambiguation.
5. **Add privacy bounds for FTS** (what is never indexed) and step-up for Approve / Run workflow from Home/palette.
6. **Specify first-viewport layout** (columns, max rows, “View all”) and empty states so density is intentional.

I’m in Ask mode, so this is review only. If you want the doc patched to match this, switch to Agent mode.
