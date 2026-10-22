**Verdict:** As an Operate/app-screen brief, `04-chat.md` names the right job (talk to a connected model) but overloads Phase 1 with a full multi-agent IDE chat surface, while leaving hierarchy, states, density, and data-egress almost unspecified. The acceptance criteria are sober; the Features list is not.

Mode: **Operate** (impeccable) / **app screen** (design-taste). No live UI to inspect—this is a spec critique against those lenses.

---

### Contradictions (within this doc)

1. **Phase 1 vs Features.** Acceptance criteria are one path: Claude via subscription, stream, model/effort visible, logged-out Connect. Features also require attachments, project folders, `/` and `@`, tool-call cards, collapsible thinking, retry/branch/Kanban/save, Context panel tool toggles (Files, Web, Hermes, Tasks), auto-titles, and Compare (phase 3). The doc never says which of those are Phase 1 vs later, so implementers will treat the feature dump as Phase 1.

2. **“Plain history” vs rich messages.** Behavior says mid-thread model switches replay history as **plain messages**. Features require thinking blocks, tool-call cards, and route headers. Unclear what is stripped, kept as text, or broken when the new model cannot see prior tool state.

3. **Same component for agents vs chat-only AC.** Purpose puts Hermes/agent chats in this component (badge → 07), and Features include `/hermes`, `@` agents, Hermes tool toggle—while Phase 1 AC never mentions agents. Scope of “this screen” is unstable.

4. **“Matches mockup” with no visual contract.** Layout is named (list / thread / composer / context) but there are no widths, defaults (context open vs closed), type roles, or density targets. “Matches mockup” is not reviewable from this file alone.

5. **API sketch vs Features.** `POST .../messages` carries `content, model, effort, attachments[]` only—no tools, project/cwd, slash expansion, branch parent, or compare pair. Cancel exists; “partial kept” has no event/shape. List is cursor-paged; no rename/delete/pin/search endpoints despite UI promising search and New chat.

---

### Gaps (blocking a trustworthy Operate screen)

From impeccable Operate (every control needs default/hover/focus/disabled/loading/error) and app-screens §11 (empty/zero/loading/error):

| Area | Missing in this doc |
| --- | --- |
| Empty | No conversations; empty thread; first-run “what is Chat” |
| Loading | First paint, reconnecting SSE, title generation in flight |
| Error | Failed run, mid-stream drop, rate limit, attach rejection, tool denial |
| Streaming UI | How tokens appear; cancel affordance placement; “stopped” vs “complete” |
| Message actions | How retry / branch / Kanban / save are revealed (overflow vs always-on) |
| Branching | Fork tree vs linear copy; how the list shows branches |
| Attachments | Types, size limits, folder-attach UX, what is inlined vs referenced |
| `@` / `/` | Palette vs inline; conflict with normal typing; mobile |
| Context panel | Default open/closed; persistence; what “token estimate” means |
| Conversation list | Active row, pin/delete/rename, provider icon meaning, search scope |
| A11y | Focus order across three columns; live region for streaming |
| Responsive | Dual sidebars + composer on narrow widths (not mentioned) |
| Motion | Streaming, panel collapse, thinking expand—budget and `prefers-reduced-motion` |

Hardening and clarify work that the skills expect is almost entirely deferred.

---

### Unrealistic scope

For a Phase 1 “stream Claude” slice, this doc already specifies roughly:

- Multi-provider picker + per-conversation memory  
- Effort matrix with per-model disable  
- Local conversation store + run linkage + auto-title via a second model  
- File **and** project-folder attach + `@` file/project/agent  
- Slash surface spanning model, effort, project, tasks, cards, Hermes  
- Rich message chrome (markdown, code+copy, tables, thinking, tools)  
- Four outbound message actions including Kanban  
- Collapsible context with tool policy UI  
- Compare mode (even if labeled phase 3)

That is a Cursor-class chat shell. App-screens demand **one primary job one click from the first screen**; this brief invents many jobs on one canvas. Realistic Phase 1 for this AC: list + thread + composer + model/effort + stream/cancel + logged-out state. Everything else should be explicitly out of Phase 1 or moved to later specs.

---

### Security / privacy risks (spec silence = product risk)

These are implied by Features/Behavior, not mitigated in the doc:

1. **Local store undefined.** “Stored locally” does not say disk path, encryption at rest, export, or backup. Chat + attachments are high-sensitivity.

2. **Cross-provider leakage.** Mid-thread model switch replays history to the new model. Auto-title uses the **cheapest connected** model—possibly a different vendor than the chat—so the first exchange may leave the user’s chosen provider without consent UI.

3. **Filesystem + cwd.** Attach project folders and “selected project sets `cwd` for CLI-backed models” is remote-code / data-exfil territory. No mention of path allowlists, read-only vs write, secrets scanning, or confirm-before-send for folder contents.

4. **Tool toggles (Files, Web, Hermes, Tasks).** “Always behind approval policy in 12” is a pointer, not a chat UX. The Context panel can look like always-on capability; the doc never says how denied/pending tools appear in-thread.

5. **Egress actions.** “Save to file”, “send to Kanban”, `@` agent handoff, and Web tools create copies of chat content outside the thread with no retention/redaction rules here.

6. **Partial cancel keep.** Good UX; still retention of aborted sensitive drafts with no delete/redact story.

7. **Search over local history.** Listed in layout; no note on whether search indexes message bodies (privacy surface).

---

### UI / design quality (skills lens)

Chat is an **app screen**: quiet chrome, colour on meaning not decoration, substance over template. This doc risks the opposite.

**Hierarchy & cognitive load**  
Composer alone stacks model, effort, attach, `/`, `@`, send, plus Context toggles. Message headers pack model + effort + route on every turn; Features add agent badge and four message actions. Impeccable’s cognitive-load bar (~>4 visible decisions) is already exceeded before the user types. Operate mode wants the tool to disappear into the task—this layout advertises infrastructure.

**Density & layout**  
Three columns (conversation list + thread + context) plus a bottom composer is heavy. App-screens: the frequent job (send / read reply) should dominate the first viewport; the Context panel (files, project, four tool toggles, token estimate) competes with the thread. No widths, collapse default, or “thread max measure”—so implementers will invent a dashboard-like chat.

**Typography**  
No type roles for: list title, message body, meta line, code, thinking, tool card title. Risk of tiny uppercase meta (“via subscription”) and too many sizes. Operate: one family, tight scale (≈1.125–1.2), meta at ~12px floor—not display type. Code monospace is appropriate; using mono for route/effort chips would read as costume (design-taste house rule).

**Spacing & rhythm**  
No message stack pitch, composer padding, or panel gap. “Today / This week / Older” is fine for lists; without pitch/divider rules, rows will either feel sparse or like a card feed (feed-as-cards is a known generated pattern—use carefully).

**Motion**  
Streaming is the one state motion that must be designed; the doc only says “streaming with cancel.” Risks: decorative token glitter, staggered tool-card entrances, panel slide as spectacle. Operate: 150–250ms, state only, no load choreography; reduced-motion must still show full text (design-taste motion rules). Collapsible thinking needs a clear collapsed preview so content is not hidden if motion/JS fails.

**Legibility & contrast**  
“Greyed” effort segments and disabled providers invite unreadable disabled states (app-screens flag ~1.4:1). Connection state and route must not be colour-only. Token estimate as a prominent panel metric risks vanity chrome; if shown, it should be secondary ink and honest about uncertainty.

**Slop / generic tells the Features invite**  
- Segmented Low/Medium/High/Max as loud chrome  
- Provider icon on every list row (colour on chrome)  
- Tool-call **cards** (easy to become icon-tinted tiles—banned dashboard tell)  
- Agent **badge** / effort chips as pill clusters  
- Token estimate as a KPI tile  
- Compare mode side-by-side without a composition plan (two thin threads, duplicated chrome)

**What the brief gets right (keep)**  
Primary purpose is clear. Enter / Shift+Enter is standard. Model picker with Connect + composer explanation matches honest disabled/empty behavior. Streaming + cancel + keep partial is good peak–end. Grouping the model picker by provider with connection state is the right Operate pattern—if Phase 1 stays narrow.

---

### Priority fixes for the doc (not implementation)

1. **Split Features into Phase 1 / later** aligned to the three acceptance criteria; park Hermes, Kanban, Tasks, Compare, folder attach, `@` agent.  
2. **Define the one job and the first viewport:** thread + composer win; list secondary; Context closed by default or phase 2.  
3. **Specify states:** empty, streaming, cancelled-partial, failed, disconnected (copy + layout).  
4. **Resolve replay vs rich history** and **title-model provider consent**.  
5. **Add a short visual contract:** column roles, type roles (body/meta/code), message action disclosure, motion = stream + cancel only for v1.  
6. **Name attach/cwd/tool egress rules** in one subsection (or explicitly “see 12 for UX + policy”) so chat does not ship a soft open door.

---

If you want a follow-up, I can turn this into a tightened outline for `04-chat.md` (Phase 1 only) still in Ask mode as proposed text, or you can switch to Agent mode to edit the file.
