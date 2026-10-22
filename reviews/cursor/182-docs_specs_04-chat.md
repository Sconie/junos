**Verdict:** `04-chat.md` is a feature inventory dressed as a Phase 1 screen spec. It names a four-pane Operate surface but does not decide hierarchy, states, density, or what ships first—so implementers will either overbuild chrome or invent the UI.

Context loading did not run; no `PRODUCT.md` / `DESIGN.md` in the repo. Review is of this doc only, through Impeccable **Operate** mode and design-taste **app-screen** rules (chat = work surface, not a marketing page).

---

### Contradictions (inside the doc)

1. **Phase vs Features.** Acceptance is three Phase 1 checks (stream Claude, model/effort in run record, logged-out Connect). Features dump compare mode, `/hermes`, `/task`, `/card`, branch, Kanban handoff, tool-call cards, `@` agents, folder attach, context tool toggles—with only compare marked “phase 3.” Everything else looks in-scope.
2. **Tool surface.** Behavior: “small tool set (read file, list projects, create card, create task).” Context panel: toggles for Files, Web, Hermes, Tasks. Web and Hermes are not in the small set; toggles vs fixed daemon tools is unresolved.
3. **Project / cwd ownership.** Composer can attach project folders; `@` can mention a project; Context panel has “selected project (sets `cwd`).” Three controls for one binding; no winner when they disagree.
4. **Model identity.** Picker “remembers last choice per conversation,” mid-thread switch allowed, message header shows model/effort/route, plus “retry with another model.” Unclear which model is authoritative for the next send vs per-message display.
5. **Agent vs model chat.** Purpose: talk to connected models; also “agent chats live in the same component with an agent badge.” Same surface, different jobs (badge alone does not define IA, empty states, or composer rules).
6. **History replay.** “History is replayed as plain messages” after a model switch conflicts with rich message types (thinking, tool-call cards) unless those are stripped—then the UI story is wrong.

---

### Gaps (spec cannot be built faithfully)

| Area | Missing |
| --- | --- |
| Shell | No page title/`h1`, no widths for list / thread / context (only “collapsible”), no relation to app chrome |
| States | Empty list, empty thread, first-run, loading history, SSE drop, send failure, cancel mid-stream, approval pending |
| Conversation ops | Rename, delete, pin, archive; what search matches; how titles update after auto-gen fails |
| Attachments | Limits, types, progress, failures; folder vs file; what is sent to the provider |
| Streaming UI | Cursor/placeholder, where cancel lives, how partial output is marked, retry after cancel |
| Message chrome | Action density (retry / branch / Kanban / save); when actions appear; keyboard path |
| Branching | Tree vs linear; how branches appear in the list |
| A11y | Focus order across three panes + popovers; live regions for streaming; thinking collapse |
| Responsive | Four regions are desktop-only; no collapse rules for narrow widths |
| Visual system | Zero tokens: type scale, spacing, surfaces, contrast for secondary chrome (“greyed” effort, route line, token estimate) |
| Motion | Panel collapse, thinking expand, stream reveal, popovers—no duration, no `prefers-reduced-motion` |
| Copy | Composer “explains why it cannot send” is the only specified microcopy |

API sketch also omits list/get conversation, attachments upload, and how SSE `RunEvent` maps to UI chunks.

---

### Unrealistic scope

For Phase 1 (stream + picker + Connect), the layout alone is a full product: conversation IA, rich markdown thread, composer with `/` and `@`, model + effort pickers, context rail with tool toggles and token estimate, plus outbound actions to Kanban/files/tasks/Hermes.

That is several screens of work stacked into one. Compare mode as “phase 3” is honest; the rest is not phased. Risk: Phase 1 ships a noisy shell with thin streaming, or slips while chasing slash commands and tool cards.

---

### Security / privacy risks (called out or implied)

- **Local store, no threat model.** Conversations “stored locally”; no encryption, multi-profile, export, or wipe.
- **File / folder → model.** Attach and `@` file/project send workspace content to third-party providers; no redaction, allowlist, or “what will leave the machine” preview.
- **`cwd` for CLI-backed models.** Selected project sets cwd with no sandbox / path boundary story in this doc.
- **Title via cheapest model.** First exchange is re-sent (or summarized) to another model—extra egress users may not expect.
- **Tool toggles (esp. Web).** On/off in UI without saying what is fetched, logged, or shown in the thread.
- **Handoffs.** “Send to Kanban” / “save to file” / `/task` copy message content into other stores; no confirmation or scope of what is copied.
- **Provider state in chrome.** Connection/route in headers is fine; still no guidance on not leaking tokens/account ids into UI or logs.

Approval is deferred to “12” with no chat-surface behavior (inline interrupt vs leave thread).

---

### UI / design quality (Operate + app-screen lens)

This is an **inbox/editor** screen: quiet chrome, colour on meaning, one primary job per view. The doc points at the opposite default.

**Hierarchy.** No single “question” for the screen (send? resume? pick model?). Three competing foci—list, thread, context—plus composer chrome (attach, `/`, `@`, model, effort). App-screen rule: most frequent job one click from first paint; here New chat and Send share attention with a right rail of toggles and a token estimate.

**Density / layout.** “Matches mockup” with no dimensions. Conversation list packs grouping + search + New chat + per-row provider icons. Provider glyphs on every row are chrome colour, not data. Context panel tool toggles read as a second toolbar. Segmented Low/Medium/High/Max plus model popover plus route string on every assistant message will stack into label noise (Operate: tight type scale, accent only on action/selection/state).

**Typography / legibility.** No thread measure, message type ramp, or secondary-text contrast. “Greyed” unavailable effort and route/token chrome invite soft-grey body (design-taste: running text in full ink; grey for notes only). Markdown + code + tables + collapsible thinking need a stated hierarchy so thinking/meta never outrank the answer.

**Spacing / surfaces.** No tone-step vs rule vs card policy. “Tool-call cards” and an agent “badge” push toward card grids and pill badges—exactly the generated-app tells app-screens warn against. Prefer flat rows/tone steps unless the card is the interaction.

**Motion.** Streaming and collapse are state; good. Unspecified motion usually becomes decorative fade-in on every bubble (Operate: 150–250ms, state only, no load choreography). Reduced-motion for thinking/panel not mentioned.

**Product face.** Spec could be any multi-model chat. No Junos-specific object (run, route, approval) as the signature element—only generic pickers and a token count. That fails the app-screen “kit vs product” test.

**Compare mode.** “Side by side” with no column rules, shared composer, or how list/context behave—layout landmine left for later.

---

### Highest-leverage fixes (if you revise the doc)

1. Split **Phase 1 surface** (list + thread + composer + model/effort + stream/cancel + Connect empty) from later: context rail, `/` `@`, branches, Kanban, compare, agent badge.
2. Pick **one** project/cwd control; delete or demote the others.
3. Align **tools** in the panel with the daemon set (or mark Web/Hermes as later).
4. Specify **states and a11y** for empty, error, streaming, and logged-out—those are the Operate craft floor.
5. Add a short **visual contract**: pane widths, thread max measure, type roles (message / meta / code), no violet user bubbles / icon tiles / soft shadows; motion only for stream and panel; `prefers-reduced-motion`.
6. One sentence of **privacy**: what leaves the machine on send, title-gen, and attach.

I did not score Nielsen heuristics or run a visual detector—there is no renderable target, only the markdown spec.
