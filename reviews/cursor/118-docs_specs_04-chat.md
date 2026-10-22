**Verdict:** `04-chat.md` is a workable Phase‑1 *behavior* sketch, but as an Operate / app-screen brief it under-specifies states, hierarchy, and density while over-loading the surface with chrome and secondary actions. Several privacy-sensitive behaviors are implied without UX or guardrails.

Mode: **Operate** (task UI). Lens: impeccable Operate + design-taste **app screens** (quiet chrome, honest states, density, one primary job). No rendered UI to inspect—findings are from the spec alone.

---

### Contradictions / tensions (inside this doc)

1. **One component, two products.** Purpose puts model chat and agent chats in the same shell (“agent badge”), but Features never say what changes: model/effort pickers, tools, composer affordances, or message chrome. Implementers will invent a hybrid that feels like neither.

2. **Project context, two owners.** Composer “attach … project folders” vs Context panel “selected project (sets `cwd`)” with no rule for precedence, visual source of truth, or what the model actually sees.

3. **Agent invocation, two doors.** `@` mention of an agent vs `/hermes <directive>` with no exclusivity or mental model.

4. **Rich messages vs “plain” replay.** Switching model “replays history as plain messages” fights the same section’s tool-call cards, collapsible thinking, and headers. Unclear what is stripped, shown as stubs, or re-sent upstream.

5. **Cancel vs message actions.** “Partial output is kept on cancel” does not say whether that bubble is a first-class message (retry / branch / Kanban / save) or a dead stub.

6. **Phase labeling is uneven.** Compare is “phase 3”; slash commands (`/task`, `/card`, `/hermes`), branching, Kanban, folder attach, and tool cards are not phased—so “Phase 1” acceptance can be read as thin while Features read as full product.

---

### Gaps (especially for Operate / app-screen quality)

**States (app-screens §11 / ui-system expectation):** no empty conversation list, empty thread, first-run “what to do,” streaming placeholder, failed stream, offline daemon, tool-approval inline UX, title-generation failure, search-no-results.

**Structure:** no default for Context panel (open/closed), no collapse behavior for the three panes, no focus order, no keyboard map beyond Enter / Shift+Enter (list, pickers, panel, cancel).

**Message system:** no rules for hierarchy (content vs meta), default collapsed/expanded for thinking & tools, long-thread scroll/stickiness, branch representation in list vs thread, attachment preview/limits.

**Compare mode:** named only; no layout when list + dual threads + context already compete.

**Acceptance:** Phase 1 covers send/stream, model/effort visibility, logged-out Connect—not list, titles, tools, attachments, or cancel-keeps-partial.

---

### Unrealistic / overloaded scope

For a main chat surface, Features stacks: multi-line composer + files/folders + `/` + `@` + model popover + 4-way effort + route header + markdown/code/tables + thinking + tool cards + retry/branch/Kanban/save + streaming/cancel + context tools/token estimate + agent mode + (later) compare.

App-screen guidance: **one frequent job one click from the first screen**; colour/chrome stay quiet. This brief makes “compose and send” compete with configuration and secondary export actions on every message. Without a hard Phase‑1 cut (e.g. send/stream/picker/list only), scope is unrealistic for a crisp first ship.

Auto-title via “cheapest connected model” also assumes a live connection and a failure story the doc never gives.

---

### Security / privacy risks (spec-implied)

| Risk | Why it matters |
| --- | --- |
| **Mid-thread provider switch** | Replaying history to another vendor is a consent/disclosure moment; doc only discusses UX convenience. |
| **Folder / file attach** | Local store ≠ local-only inference; no “what leaves the machine,” redaction, or scope of folder trees. |
| **Tools in-thread** | Points at approval in 12 but no chat affordance for pending approval, denied tools, or scrubbing secrets in tool cards. |
| **Token estimate** | Can leak activity/size; no accuracy or sensitivity note. |
| **Route string in header** (“via subscription”) | Connection/billing metadata in the durable message chrome. |
| **Branch / save / Kanban** | Extra copies of prompt/output; no retention or destination clarity. |
| **Local search + provider icons** | Metadata index of topics and vendors; no retention/minimization note. |

“Conversations are stored locally” is necessary but not sufficient given attach, tools, and cross-provider replay.

---

### UI / design-quality problems (hierarchy, density, type, motion, contrast)

The layout line is the **category default** (list | thread | composer | context). The doc says “matches mockup” but never defines the visual or information hierarchy, so build will drift into template chat chrome.

1. **Hierarchy inverted toward meta.** Message header “model, effort and route” puts configuration and billing/route above the answer. Operate / app-screens: accent and ink on the *work* (the reply), not on chrome. Meta should be secondary size/weight (≈12px dim), one line max, or on demand.

2. **Cognitive load before send.** Visible decisions easily exceed four: model, effort, project, tools (Files/Web/Hermes/Tasks), attach, `/`, `@`. Context tool toggles on the main chat screen are settings smuggled into the operate surface.

3. **Density undefined → card spam.** Tool-call cards + thinking + tables + per-message action row will stack as “rows of identical cards” (taste house smell) unless the spec mandates: default-collapse tools/thinking, one trailing action pattern (kebab or overflow), tight list pitch for conversations (app-screens list: selected = active fill, not loud colour).

4. **Typography silence.** No roles for user vs assistant, code, tables, thinking. Operate wants a tight rem scale (≈12/14/16), ~65–75ch for prose; ui-system’s 760px max width is a good hook this doc never owns. Code/`pre` is the right monospace exception; the spec doesn’t say that.

5. **Effort control as permanent chrome.** Segmented Low/Medium/High/Max always visible, “greyed” where unsupported. Greying on glass is a contrast trap (dim text on translucent panels). Prefer hide unsupported levels, or disable with *text* reason—not opacity-only.

6. **Motion.** Streaming and cancel need state feedback (cursor/partial grow), not entrance choreography. Spec should require `prefers-reduced-motion` (instant full chunk or static placeholder)—Operate: 150–250ms, motion = state only.

7. **Legibility / contrast.** Token estimate, route subtitle, greyed segments, provider icons, agent badge—all secondary ink on frosted panels. Without contrast floors and “no information by colour alone” for connection/effort, glass will fail WCAG on meta.

8. **Empty / first screen thin.** No empty-state copy or primary CTA placement. App-screens: keep frame + title; put the first action where the control will live (composer / New chat)—not a decorative “No data” block.

9. **Product face missing here.** Spec does not bind chat to JunOS identity (only a generic three-pane). Risk: interchangeable AI-chat UI. (Visual system lives elsewhere; this doc still needs chat-specific rules so it doesn’t fight that system with badge/pill/icon noise.)

10. **Compare vs readable measure.** Side-by-side dual streams against a 3-pane shell will destroy measure and density unless compare *replaces* context/list or is a dedicated mode with its own layout rules—unspecified.

---

### Highest-leverage fixes (spec-only; not implementing)

1. **Phase fence:** Phase 1 = list + thread + composer + model/effort + stream/cancel + logged-out; defer folder attach, `@` agents, slash→Kanban/task, branch, tool cards UI polish, compare.  
2. **One project truth** and **one agent entry path.**  
3. **Message chrome policy:** content primary; model/effort/route secondary; actions in overflow; thinking/tools collapsed by default.  
4. **State matrix** (empty / loading / streaming / error / disconnected / approval).  
5. **Privacy beats:** confirm before replaying history to a new provider; declare attach/tool egress in UI copy.  
6. **Density + a11y:** conversation row pitch, composer height, contrast for dim/glass, reduced-motion for stream.

---

**Bottom line:** The doc is enough to start a thin chat client, not enough to ship a trustworthy Operate surface. It contradicts itself on agent/project/replay richness, loads Phase‑1 with Phase‑N features, and leaves hierarchy, states, motion, and privacy UX to improvisation—exactly where generic AI-chat UI and glass contrast failures appear.

I can turn this into a tightened outline for `04-chat.md` (still Ask mode: guidance only) if you want that next.
