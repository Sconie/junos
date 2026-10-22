**Verdict:** `04-chat.md` is a useful Phase‑1 product sketch, but as a UI/Operate spec it is mostly a feature inventory. It under-specifies the work surface, mixes Phase‑1 with later scope, and leaves security-visible UX and design quality (hierarchy, density, type, motion, contrast) almost entirely to an unnamed mockup.

Mode: **Operate** / **app screen** (inbox + thread + composer). Persuade/page rules do not apply; quiet chrome and clear primary job do.

---

### Contradictions

1. **Phase cut vs feature list.** Acceptance is Claude stream + model/effort + logged-out Connect. Features already include compare mode, `/task` `/card` `/hermes`, folder attach, tool toggles (Files/Web/Hermes/Tasks), branch, Kanban, save-to-file. The doc never marks what is Phase 1 vs later inside Features.
2. **Two different tool stories.** Behavior says the daemon exposes a small set (read file, list projects, create card, create task). Context panel toggles Files / Web / Hermes / Tasks. Unclear whether toggles gate that set, add separate capabilities, or are aspirational UI.
3. **“Same component” vs agent surface.** Purpose puts Hermes agent chats in this component (badge → 07), while slash commands and a Hermes tool toggle also live here. Same shell, three entry points—role of each is undefined.
4. **Rich messages vs “replay as plain messages.”** Messages include thinking, tool-call cards, markdown, tables. Mid-thread model switch “replays history as plain messages,” which conflicts with preserving those structures (and with “each assistant message links to its run”).
5. **“Matches mockup” with no design contract.** Layout is named; hierarchy, widths, density, type, and states are not. `14-ui-system` already constrains chat measure (760px) and drawer width; this doc neither inherits nor conflicts explicitly—it just ignores them.
6. **API sketch vs Features.** No history fetch, attachment upload, SSE event shape, edit/delete conversation, or how cancel maps to a kept partial message. Acceptance needs a run record; API never returns one on send beyond SSE.

---

### Gaps (product / UX that Phase 1 still needs)

| Area | Missing |
|---|---|
| Empty / first run | No conversations; no connected model; first-message coaching |
| Streaming UX | Cursor/placeholder, stick-to-bottom, reconnect, mid-stream auth failure, rate limit |
| Cancel | Control placement; what “partial kept” looks like; whether user can resume/edit |
| Conversation list | Rename, delete, archive, pin; search = title vs full text; empty search; long titles |
| Message actions | Retry vs branch (replace vs fork); where Kanban/save live (overflow vs always visible) |
| Composer | Disabled reasons beyond logout; attachment limits/types; `@` / `/` picker UX; multiline height |
| Context panel | Default open/closed; what “token estimate” includes; project/`cwd` when unset |
| a11y | Live region for stream; focus when opening pickers; keyboard list→thread |
| Responsive | Three columns + app rail; how list/context become sheets (14 has a rule; 04 doesn’t) |
| Compare (even as phase 3) | Layout, scroll sync, which model “owns” the thread afterward |

---

### Unrealistic scope

Bundling list + thread + composer + context + pickers + slash + mentions + attachments + folders + tools + agent badge + export/Kanban + branching + compare into one “chat” component, then measuring Phase 1 only by “stream Claude,” invites a ChatGPT-shaped shell that never gets hardened.

Highest cut candidates for Phase 1: compare, `/task` `/card` `/hermes`, folder attach, Kanban/save, branch, Web/Hermes/Tasks toggles. Keep: stream, cancel+partial, model/effort, conversation list+persist, Connect empty composer, basic markdown.

Auto-title via “cheapest connected model” is a second provider hop with no failure, cost, or “title pending” behavior.

---

### Security / privacy risks (in this doc’s surface)

- **Attachments + `@` file/project + project `cwd`:** Local paths and file bodies go to providers; no allowlist, size/type limits, secret redaction, or “what will be sent” preview.
- **Tool toggles (esp. Web):** Untrusted content path exists in 12; 04 never says the thread must show untrusted wrapping or that tool use after web/file content needs approval UX (inline vs Inbox).
- **Title generation:** First exchange may leave the conversation’s primary provider for a cheaper one—silent exfiltration of topic text.
- **Cancel keeps partial output:** May already contain secrets; no scrub/export guidance.
- **“Stored locally” + HTTP API:** Implies daemon-held data; no retention, export, or at-rest expectations in this screen’s behavior.
- **Compare / multi-model / retry-other-model:** Same prompt (and attachments) egress to multiple vendors; UI never discloses that.
- **Agent badge in same composer:** Elevated agency with only a badge as the affordance difference—easy to miss before sending.

---

### UI / design-quality problems (impeccable Operate + tasteskill app-screens)

The doc specifies **what** chrome exists, not **how** it should read. Against those lenses, the implied UI is at risk of generic AI-chat slop.

**Hierarchy / cognitive load**  
Four competing regions (list | thread | composer | context) with no “one job on first screen.” Message header meta (“model, effort, route”) plus action set (retry, branch, Kanban, save) is well over app-screen “one primary action / don’t stack status marks.” Context tool toggles add another decision cluster beside the composer.

**Density / spacing**  
No row pitch, composer height, panel width, or message vertical rhythm. Risk: sparse ChatGPT bubbles *or* a packed IDE. App-screens expect quiet lists (selected row = active fill, not loud accent), ~30–36px search, and panels separated by tone—not shadow cards. “Tool-call cards” naming already steers toward card chrome.

**Typography**  
No roles for body / meta / code / thinking / tool output. Operate wants one grotesk, tight scale (≈12/14/16/24), meta smaller and grey, running text in full ink. Spec invites many parallel styles (markdown, code, tables, collapsible thinking) with no scale ceiling → noisy thread.

**Legibility / contrast**  
“Greyed” effort segments and disabled providers are called out in app-screen form rules as often illegible when done with opacity. Need disabled *explanation* (acceptance partly does this for composer) and real disabled styles, not 30% fade. Thinking/tool secondary text needs a stated contrast floor. Code blocks need theme/contrast (light UI + dark code is a common fail).

**Motion**  
Streaming + cancel with no motion budget. Operate: 150–250ms, state only, no load choreography; always `prefers-reduced-motion`. Spec should say: tokens appear without theatrical typing; cancel is immediate; no shimmer theater.

**Composition / product face**  
Left list / center thread / right context is the category default. No empty-state copy in product language, no signature element, no shell naming. “Provider icon each” risks tinted logo circles (dashboard tell). Effort as segmented control is fine if quiet; “Max” as a fourth segment needs a defined meaning or it becomes costume.

**Mobile**  
Silent. Three columns will collapse badly without the sheet rules from 14 being owned here.

---

### Priority fixes for the doc (not implementation)

1. **Split Features into Phase 1 / later** aligned with acceptance; park compare, Hermes/task/card slash, folder attach, Kanban/save, branch.
2. **One primary job sentence** for the first viewport: e.g. “Read the thread and send the next message”—and demote Context to collapsed-by-default.
3. **States table:** empty, streaming, cancelled-partial, error, logged-out, no-project, tool-approval pending.
4. **Safety UX:** pre-send attachment summary; provider disclosure on title/compare/retry; link approval to Inbox (12) with in-thread pending affordance.
5. **Design contract** (even brief): type roles, list row pitch, thread max width (cite 14’s 760px), panel width, selected-row treatment, no bubble/shadow/glow defaults, motion + reduced-motion for stream/cancel.
6. **Resolve tool inventory** and **plain-replay vs rich history** in one paragraph each.
7. **API sketch** for history, attachments, and cancel→partial, or drop API until those exist.

---

Strongest Phase‑1 path in the doc: composer + stream + cancel/partial + model/effort + Connect empty state + local history. Everything else is currently specified at the same altitude, which is the main quality and scope risk.
