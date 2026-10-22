Context loading did not run; I’ll read the existing project context directly. No `PRODUCT.md` / `DESIGN.md` in the repo — this is a **spec critique** of `docs/specs/04-chat.md` only (Operate / app-screen surface), not a live UI audit.

---

## Verdict

The Phase 1 acceptance criteria are a thin happy path; the **Features** list is a full chat product (agents, tools, slash, attachments, Kanban, compare). As a design brief it specifies **chrome inventory**, not hierarchy, density, states, or motion — so implementers will default to a generic three-pane AI chat with overloaded composer and per-message metadata noise.

---

## Contradictions

1. **“Any connected model” vs Phase 1** — Purpose promises any connected model; acceptance only requires Claude via subscription. Unclear what “done” means for the picker, disabled providers, and multi-provider chrome.
2. **One component, two products** — Agent chats “live in the same component” (→ 07) while this doc also owns `/hermes`, Hermes tool toggle, and agent `@` mentions. Same shell vs same thread model is unresolved.
3. **Phase mixing** — Compare mode is labeled phase 3 but sits in the main Features list beside Phase 1 composer/picker behavior, so scope reads as one surface.
4. **Project selection twice** — Attach “project folders”, Context “selected project (`cwd`)”, and `/project` are three controls for one concern with no source of truth.
5. **Model memory vs mid-thread switch** — “Remembers last choice per conversation” vs “switching model mid-thread is allowed” — does the picker follow the latest message, the conversation default, or both?
6. **Logged-out vs auto-titles** — Composer blocks send when logged out; titles still require “the cheapest connected model” after the first exchange with no fallback.
7. **Tool toggles vs approval (→ 12)** — Context panel toggles (Files, Web, Hermes, Tasks) vs “always behind the approval policy” — enablement vs per-call approval is unspecified; UI can imply tools are “on” when they still need approval (or the reverse).

---

## Gaps (spec silence that will bite)

| Area | Missing |
|---|---|
| **States** | Empty thread, empty list, loading history, stream stall, cancel, retry failure, rate limit, offline, reconnect |
| **Responsive** | How left list / right Context collapse; no phone/narrow composition |
| **Composer strip** | Order, overflow, and priority when model + effort + attach + `/` + `@` + send compete |
| **Streaming UI** | Cursor, thinking default open/closed, tool-card appearance mid-stream, scroll-lock while streaming |
| **Branch / retry** | New conversation vs fork tree; what history the new model sees |
| **Attachments / `@`** | Types, size limits, folder depth, whether file *contents* are inlined, preview/remove |
| **List** | Rename, delete, archive, pin; search fields; truncation; provider icon meaning vs model in header |
| **A11y** | Focus order, live regions for tokens, keyboard for picker/effort/slash |
| **Visual system** | No type scale, spacing rhythm, contrast rules, or motion budget (and no DESIGN.md to inherit) |
| **Copy** | Only “composer explains why it cannot send” — no actual strings |

API sketch also omits message edit, branch, attachment upload, and run replay — fine as a sketch, but Features assume those behaviors exist in UI.

---

## Unrealistic scope

Phase 1 acceptance is ~3 checks. Features imply roughly:

- full streaming chat + cancel/partial keep  
- multi-provider picker + effort matrix  
- attachments + folder attach + `@` + `/` command palette  
- markdown/code/tables/thinking/tool cards  
- retry other model, branch, Kanban, save-to-file  
- Context panel with tools + tokens + project  
- agent badge / Hermes path  
- compare mode (even if “phase 3”)

For an Operate surface, that is several products. Risk: ship a crowded shell that “has” every control while only subscription Claude streaming is real.

**Cut / stage hard in the doc:** compare; Kanban/save; full slash set; agent-in-same-component; folder attach + `cwd` tools — or promote them only under explicit phase gates matching acceptance.

---

## Security / privacy risks (called out lightly or not at all)

1. **`cwd` + read-file tools + attach folders** — Local project content can leave the machine to whichever provider is selected; mid-thread model switch **replays history as plain messages** to a new vendor with no redact/confirm step.
2. **Auto-title via cheapest model** — First-exchange content (and possibly secrets in that turn) is an extra egress path, possibly to a *different* provider than the chat model.
3. **“Stored locally”** — No encryption-at-rest, multi-user machine, export, or backup posture in this doc.
4. **`@` file / project / agent** — Unspecified whether mention injects full file text into the prompt (classic silent exfil).
5. **Tool-call cards** — May render paths, snippets, or command output in the clear in the thread (scrollback = durable leak surface).
6. **Partial output kept on cancel** — Correct for UX; still persists incomplete sensitive generations locally and in any sync you add later.
7. **Save to file / send to Kanban** — Additional copies of model output outside the conversation store; no sensitivity warning.
8. **SSE `RunEvent`** — Payload contents unspecified; easy to over-share tool args/results to the renderer (and logs).

This doc defers approval to 12 but still needs **in-chat** rules: what is shown, what is sent on provider switch, and what attach/`@`/`cwd` put in context.

---

## UI / design quality (Impeccable Operate + design-taste app-screens)

**Mode:** Operate — task UI; familiarity over spectacle. Chat is an inbox + editor hybrid: quiet chrome, colour on meaning, honest states.

### Hierarchy & composition
- Four regions (list | thread | composer | Context) with no default focus or “one job.” App-screens require the **most frequent job one click from the first screen** and the **product/scope named in the shell** — neither is specified.
- Per-message header *“Claude Opus, high, via subscription”* makes **route/effort chrome compete with the answer**. That is metadata-as-eyebrow on every turn; Operate wants accent on selection/action, not repeated status paint.
- Right Context + left list both steal width from the reading column (markdown, tables, code). No measure/max-width for prose or code overflow behavior.

### Density & cognitive load
- Always-visible **effort segmented control (4 levels)** beside a **model popover** and tool toggles pushes past “scan and type.” Decision points with many peers on one strip fail the cognitive-load bar.
- Message actions (retry, branch, Kanban, save) unspecified as overflow vs always-visible — likely either hidden forever or icon soup on every bubble.
- Conversation list: date buckets + search + New chat + provider icons without row pitch, truncation, or secondary line rules → either sparse emptiness or noisy rows.

### Typography & legibility
- Markdown + code + tables + thinking + tool cards need a **tight product type scale** (Operate: ~1.125–1.2 steps, one family). Spec is silent → Inter/system + soft-grey secondary body is the default failure.
- Collapsible thinking and tool cards without default-collapsed / max-height rules will **drown the assistant answer** (peak-end: user remembers the wall of tool JSON, not the result).
- Code “with copy” but no wrap/overflow/contrast for nested panes.

### Spacing & structure
- Composer is a **control dock**, not a single input: attach, `/`, `@`, model, effort, send. Without a primary/secondary split, spacing becomes equal padding on everything (template look).
- Context panel “collapsible” with no default (open on desktop?) — first paint either cramped thread or empty-looking center.

### Motion
- Streaming invites decorative shimmer/token theater. Operate: **150–250ms, state only**; no page-load choreography. Spec never mentions `prefers-reduced-motion`, cancel feedback, or whether thinking expand animates.
- Taste/app motion budget doesn’t apply as “delight”; here motion should mean **stream append, cancel, panel collapse** only.

### Contrast & states
- “Greyed” effort levels and disabled providers need a defined **disabled vs unavailable vs Connect** treatment (contrast + affordance). “Shows Connect” is IA, not visual spec.
- Logged-out composer explanation is the high-stakes moment — needs reassurance design (what’s wrong, one action), not a muted helper line.

### Slop / tell risks the wording invites
- Provider icons on every list row + agent **badge** → pill/badge chrome.
- “Tool-call cards” → icon-in-tinted-square card stacks (app-screen ban).
- Segmented effort + popover model + tool toggles → settings-bar cosplay in the main task surface.
- Compare mode side-by-side → dual scroll, dual headers, no single reading column (composition failure unless specified as a temporary mode with a hard exit).

### What’s strong
- Clear spatial map (list / thread / composer / Context).
- Enter / Shift+Enter and cancel-keeps-partial are solid Operate behaviors.
- Phase 1 acceptance is testable — it just doesn’t match the Features inventory.

---

## Highest-leverage doc fixes (guidance only)

1. **Split Features by phase** so Phase 1 UI matches acceptance; park compare/Kanban/Hermes/`cwd` tools behind gates.  
2. **One project control** (panel *or* `/project` *or* attach — not three).  
3. **Composer hierarchy:** primary = textarea + send; model/effort secondary; attach/`@`/`/` tertiary.  
4. **Message chrome:** model/effort/route once (thread sticky or last-run), not on every bubble; actions in a single overflow.  
5. **States + narrow layout** as acceptance, not afterthought.  
6. **Privacy sentences in this doc:** what attach/`@`/switch-model send; title-model egress; tool-card redaction.

I’m in Ask mode — I can’t edit the spec. Switch to Agent mode if you want these folded into `04-chat.md`.
