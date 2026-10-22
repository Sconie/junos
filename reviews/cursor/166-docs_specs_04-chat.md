**Verdict:** `04-chat.md` is a workable Phase‑1 product sketch for an Operate/chat surface, but as a buildable UI+API spec it under-specifies the screen’s job, states, and safety boundaries while packing a Cursor-class feature surface into “Features” with only three acceptance lines.

*Lens: impeccable Operate + design-taste app-screen (`inbox`/editor). No PRODUCT.md/DESIGN.md; no rendered UI to inspect. Review is of this doc alone.*

---

### Contradictions / tension inside the doc

1. **Purpose vs Phase 1** — Purpose is “any connected model”; acceptance is only “Claude via subscription.” Either Phase 1 is Claude-only (say so) or acceptance is incomplete.
2. **Chat vs agent chat** — Same component + agent badge (→07) plus `@` agents, Hermes tool toggle, and `/hermes`. Unclear when the user is in “model chat,” “agent thread,” or a Hermes side-channel.
3. **Three overlapping tool UIs** — Composer `@` / `/`, Context panel toggles (Files, Web, Hermes, Tasks), and daemon tools (read file, list projects, create card, create task). Same capabilities, no precedence or single source of truth.
4. **Kanban / cards three ways** — Message action “send to Kanban,” slash `/card`, and tool `create card` without one primary path.
5. **Model memory vs mid-thread switch** — “Remembers last choice per conversation” and “switching model mid-thread is allowed” need rules: does the picker show last-sent, last-selected, or per-message history?
6. **Features dump vs phases** — Compare mode is “phase 3” but sits in the same Features list as Phase‑1 composer/streaming; readers will treat it as in-scope chrome.

---

### Gaps (especially vs Operate / app-screen craft)

**Product / IA**
- No single screen question (app-screen §2.2). For chat it should be roughly: *continue this thread safely and clearly*. The three-pane layout never says what is primary.
- Conversation list: search, New chat, date buckets are in Layout only — no rename, archive, delete, pin, or empty list.
- No first-run / empty thread copy or next action (skills require empty + primary job one click away).
- No keyboard map beyond Enter / Shift+Enter (list nav, focus to composer, cancel stream, open context).
- No responsive behavior for list | thread | context (collapse order, sheets, what survives &lt;900px).
- Branch / compare / retry: no UI for branch tree, side-by-side layout, or which message is “current.”

**API / data**
- Sketch has create conversation + post message SSE + cancel + cursor list — missing get thread, list messages, attachments upload, delete/rename, run record read, and how `RunEvent` maps to UI (token, tool, thinking, error).
- “Each assistant message links to its run” — run schema and failure surfaces absent.
- Title generation “after first exchange” — race with second send, offline/no cheap model, and user override not specified.

**States (required by Operate + app-screen §11, and by your own UI system elsewhere)**  
Missing: skeleton load, empty thread, stream error mid-flight, provider disconnected (partially in acceptance), daemon down, tool denied/pending, attachment fail, offline/reconnect.

---

### Unrealistic scope

If Phase 1 is the three acceptance bullets, the Features list is far ahead of that:

| Likely Phase 1 | Likely later but listed flat |
|---|---|
| Composer, stream+cancel, model/effort, basic markdown | Compare mode, branch tree, Kanban send, Hermes/Tasks toggles, `/task` scheduling, folder-as-cwd, rich tool-call cards, collapsible thinking |

Shipping “tool-call cards + thinking + @ file/project/agent + project cwd + slash suite” in one Phase 1 is a full IDE-agent chat. The doc should split **must-ship chrome** from **phase 2/3** the way Compare already hints—but doesn’t enforce.

Effort **Max** as a fourth segment also pushes cognitive load (Operate: flag decision points with &gt;4 visible options when combined with model + tools + attach).

---

### Security / privacy risks (underspecified → default-insecure)

1. **Local conversations** — “Stored locally” with no encryption, retention, export, or “clear” story. Chats will hold secrets, code, and PII.
2. **Title via cheapest model** — First-exchange content (and maybe attachments) leaves the machine to a possibly *different* vendor than the chat model. Cross-provider leakage; needs consent, opt-out, or local-only titles.
3. **Mid-thread model switch + “replay as plain messages”** — Prior tool results, file snippets, and thinking may be resent to a new provider. Need redaction / what gets replayed.
4. **Attach files / project folders + `cwd` for CLI models** — Full workspace access is a high-risk default. Need path allowlist, scope indicator in UI, and approval before tools run (points at 12 but chat UX for pending/deny is absent here).
5. **`@` file / project** — Implicit injection of file contents into context; no size limits, secret scanning, or “what will be sent” preview.
6. **Web / Hermes / Tasks toggles** — Network and side effects without in-thread approval states or audit affordances in this doc.
7. **Cancel keeps partial output** — Partials may include tool args or secrets; retry/branch must not silently re-exfiltrate.
8. **SSE `POST .../messages`** — No auth, origin, or attachment size/type limits in the sketch.

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Chat is an **Operate / app screen**, not a marketing page: familiarity and scanability beat expression. This doc almost only says “matches mockup” and lists chrome—so implementers will invent a busy three-pane Cursor clone.

| Area | Problem in the spec |
|---|---|
| **Hierarchy** | List, thread, context, model, effort, route header, tools, thinking, tool cards compete with equal weight. Spec never says: thread + composer are the primary plane; list and context are secondary. |
| **Density** | Message chrome (model, effort, route, retry, branch, Kanban, save) per assistant turn will drown content. Needs a calm default (header once / on hover / overflow) vs power actions. |
| **Typography** | No type roles for user vs assistant vs thinking vs tool vs code. Operate wants a tight rem scale and readable prose measure; UI system elsewhere caps chat ~760px—this doc doesn’t restate measure or code-block treatment. |
| **Spacing / layout** | No gutter, composer sticky rules, or context width. Risk: context panel always open → thread starved; or collapsed with no discoverability. |
| **Lists** | Today / This week / Older is fine; “provider icon each” risks icon noise. Selected row / unread / streaming row states unspecified. |
| **Motion** | Streaming + cancel with no guidance. Operate: 150–250 ms state feedback only; no load choreography. Need: token/append behavior, stop control, `prefers-reduced-motion` (instant full chunks, no shimmer spam). |
| **Legibility / contrast** | Collapsible thinking and tool cards are classic low-contrast grey-on-glass traps. Spec should require full ink for primary message text, clearer secondary for thinking, and WCAG for code on panel surfaces. |
| **Cognitive load** | Model popover × effort × tools × attach × slash × @ is many concurrent decisions before send. Phase 1 should default tools off / last-used model and progressive disclosure. |
| **Empty / loading** | No skeleton for list or stream; no empty composer coaching—app-screen judges punish thin first screens. |
| **Signature / product face** | Nothing product-specific (trade words, one distinctive chat affordance). Pure generic “AI chat.” Fine for v1 if intentional; as written it’s template-shaped. |

**Slop risks if built from this list alone:** badge-heavy agent chips, icon-topped tool cards, segmented control as decoration, glass stacking on every message, purple accent on every selected state (system accent pressure)—all against design-taste app rules (colour on status/data/primary action only; flat surfaces; quiet chrome).

---

### Priority fixes for the doc (not implementing—guidance only)

1. **Phase gate the Features list** and rewrite acceptance to match (states + one non-Claude path or explicitly Claude-only).
2. **Declare primary plane + collapse rules** for the three panes; demote per-message actions.
3. **One tools model** (context toggles *or* slash/@ *or* daemon tools)—others are aliases.
4. **Privacy section**: what leaves the device (titles, replay, attachments, web); cwd/attach scope; approval UI hooks.
5. **States + a11y + motion one-pagers**: empty/loading/error/offline; live region for stream; reduced motion; contrast for thinking/code.
6. **API completeness** for what Phase 1 UI must bind to (`RunEvent`, get thread, attachments).

---

Highest leverage: treat this as a Phase‑1 *thread + stream + model/effort* spec, and move agent/Hermes/Kanban/compare/cwd folders behind explicit later phases with security UX called out—not as equal bullets under Features.
