**Verdict:** As an Operate / app-screen chat surface, this spec names a lot of product behavior and almost no visual or interaction craft. It reads like a feature inventory for a generic AI chat shell (three panes, picker, effort, streaming) with Phase 1, Phase 3, agents, tools, and Kanban piled into one “Features” list—high cognitive load, thin hierarchy, and several privacy/security holes left to “see 12.”

---

### Contradictions & scope muddle

- **Phase labels collide.** Acceptance is Phase 1 (Claude via subscription, model/effort, logged-out Connect). The same “Features” block includes Compare mode (phase 3), Hermes/`/hermes`, `/task`, `/card`, “send to Kanban,” agent badge (07), and a tool set. Implementers will treat the whole list as MVP.
- **One component, two products.** Purpose: “talk to any connected model” *and* “Agent chats (Hermes etc.) live in the same component with an agent badge.” No rule for when the UI is plain chat vs agent (tools always on? different composer? different empty state?).
- **Model switch vs fidelity.** “History is replayed as plain messages” conflicts with rich message types (thinking, tool-call cards, attachments). Unclear whether tool results, approvals, and thinking survive the switch or get stripped—and what the user sees.
- **Disabled vs Connect.** Picker: disabled providers + Connect link. AC: composer explains why it cannot send. Spec never unifies: can you still type? Attach? Switch effort? Pick a dead provider then hit Enter?
- **“Greyed” effort levels.** Greyed segments that look like controls but do nothing fight Operate affordance rules; hide unsupported levels or disable with an explicit reason, don’t mute them into decoration.

---

### Gaps (behavior the UI will need and the doc doesn’t define)

| Area | Missing |
| --- | --- |
| **States** | Empty thread, first-run, offline/daemon down, stream error mid-token, rate limit, tool denial, title-gen failure |
| **Composer** | Max length, attachment types/size, folder attach semantics, paste images, drag-drop, draft persistence |
| **Thread** | Search-in-thread, jump to latest, sticky composer on long scrolls, message selection for branch/compare |
| **Branching** | How branches appear in the list vs thread; which branch is “current”; delete/merge |
| **Context panel** | Default open/closed; what “token estimate” means (input? with tools? stale while streaming?) |
| **Responsive** | Three panes (list / thread / context) with no phone/narrow composition—app-screen work always needs a thumb layout |
| **a11y** | Focus order across panes, live region for streaming, keyboard for `/` and `@`, contrast for “greyed” |
| **Motion** | Stream reveal, panel collapse, thinking expand—Operate wants 150–250 ms state feedback only; none specified, including `prefers-reduced-motion` |

---

### Unrealistic / overloaded Phase 1 surface

From an Operate + app-screen lens, the **first job** should be: type → stream → stop/retry, with model/effort discoverable. This doc also asks Phase 1-adjacent surface for:

- `@` file / project / agent + `/` commands (six commands, some product-spanning)
- Attach files **or project folders**
- Message actions: retry other model, branch, Kanban, save to file
- Tool-call cards + collapsible thinking + markdown/code/tables
- Context panel: files, project/`cwd`, four tool toggles, tokens
- Auto-title via a second model call

That’s a full IDE-chat product, not a Phase 1 acceptance set. **Compare mode** and **Kanban/task/card** especially look like they should stay out of this doc’s primary Features until their phases own them.

---

### Security & privacy risks (called out or implied here)

- **Title generation** by “cheapest connected model” after the first exchange sends conversation content off-device with no disclosure, opt-out, or “what snippet is sent.” Local storage does not make that private.
- **Attachments + `@` + folder attach + `cwd` for CLI models** expand filesystem reach; approval is deferred to 12, but this surface still needs: what’s shown in tool-call cards (full paths?), what’s stored in the run record, and whether attachments are copied into local conversation storage.
- **Tool set** (read file, list projects, create card/task) in the chat path—card/task creation is write-side; “small tool set” understates blast radius if approval UX isn’t specified *in chat* (inline approve/deny, what’s previewed).
- **Streaming SSE** of `RunEvent`—no note on whether thinking/tool args (often secret-bearing) are persisted, redacted in UI, or exportable via “save to file.”
- **“Save to file” / “send to Kanban”** can exfiltrate model output (and quoted user context) into other surfaces without a sensitivity warning.
- **Provider icon + route in header** (“via subscription”) is fine for trust; ensure connection state never leaks tokens into UI copy or logs (spec is silent).

---

### UI / design-quality problems (impeccable Operate + tasteskill app-screens)

Mode: **Operate** — precision and restraint, not Persuade. Chat is an **app screen** (inbox/editor hybrid): colour on meaning, quiet chrome, density with a clear primary job.

1. **No craft layer.** “Layout (matches mockup)” with no linked mockup, tokens, type scale, spacing rhythm, or density. Hierarchy, contrast, and motion are unspecified—so any implementation will default to AI-chat slop (tinted sidebar, pill active item, icon-in-circle providers, carded tool calls, soft shadows).

2. **Hierarchy inversion.** Message chrome (model, effort, route) plus a row of secondary actions (retry / branch / Kanban / save) competes with the answer itself. App-screen rule of thumb: colour and weight on the *content and the next action*, not on every metadata chip. Primary: read + continue; secondary: overflow menu.

3. **Density without triage.** Left list (date groups + search + New + provider icon), center (rich messages), bottom (composer with `/` `@` attach), right (files + project + four toggles + tokens). That’s four competing focus regions. Spec never says what is **always visible** vs progressive (e.g. context panel collapsed by default; message actions in a single “⋯”).

4. **Generic product face.** Nothing here is Junos-specific—no empty-state language of the trade, no signature element, no shell identity. Per tasteskill app-screens, a quiet chat that could be any wrapper fails the “kit vs product” test even if features are complete.

5. **Typography / legibility unspecified.** Markdown + code + tables + thinking + tool cards need a fixed rem scale (Operate: not fluid display type), measure for prose (~65–75ch in the thread), and tabular treatment for code—none of it is in the doc. Risk: body in soft grey, tiny uppercase “TODAY / THIS WEEK,” monospace labels for metadata (tasteskill bans those tells on pages; on app screens, tiny tracked caps and chrome colour are still the generated-dashboard smell).

6. **Spacing / panels.** Collapsible right panel + left list with no widths, collapse behavior, or content reflow. Risk of three skinny columns, ragged message actions, and a composer crushed under chrome.

7. **Motion.** Streaming is the one motion that matters (token appearance, cancel). Spec doesn’t ban decorative entrance choreography; Operate says no orchestrated load sequences—worth stating so Phase 1 doesn’t ship “fade up every bubble.”

8. **Contrast / disabled UI.** “Greyed” effort and disabled providers without contrast or non-colour cues. Logged-out AC is good; visual disabled language isn’t.

9. **Effort as segmented control** is appropriate for Operate; stacking it beside a grouped provider popover and a long header string will overflow. Spec needs a narrow-width rule (effort under model, or both in one compact control).

10. **Tool-call cards + thinking** as default-expanded chrome will bury the answer (cognitive load >4 decision points already: model, effort, attach, `/`, `@`, tools…). Default collapsed thinking/tools, expand on demand, matches both skills’ “substance over ornament.”

---

### What the doc already gets right

- Clear primary layout regions (list / thread / composer / context).
- Composer keyboard contract (Enter / Shift+Enter).
- Partial output kept on cancel.
- Local conversation storage called out.
- Phase 1 AC is concrete and testable (if Features were trimmed to match).
- Open questions correctly park voice and personas.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Split **Phase 1 surface** vs **Later** (compare, Kanban/card/task slash, Hermes-as-agent) so Features match AC.  
2. Specify **default chrome**: context collapsed; message actions in overflow; thinking/tools collapsed.  
3. Add a short **Operate visual contract**: type scale, thread measure, pane widths, empty/error/stream states, reduced motion, phone: list XOR thread.  
4. Privacy: **what leaves the device** for titles, tools, and attachments—and user-visible copy for that.  
5. Resolve **model-switch replay** and **disabled-send** into one behavior table.

I did not run browser/inspector gates (this is a markdown spec, not a rendered screen). No PRODUCT.md/DESIGN.md in-repo to pin brand against—review is against the skills’ Operate/app-screen laws and the doc’s own Phase 1 claims.
