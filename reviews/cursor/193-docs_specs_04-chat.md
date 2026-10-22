**Verdict:** As an Operate-mode chat surface, Rev 2 (`docs/specs/04-chat.md`) is stronger on privacy than on craft: it names consent and tool gating, but it still specifies a crowded, template-shaped three-pane chat without hierarchy, states, density, or motion rules. Phase 1 acceptance is a thin slice of an overloaded feature list.

*Reviewed the working-tree file only (Ask mode; no live UI / detector). Assumed it matches commit `2e87f7e`.*

---

### Contradictions (within this doc)

1. **“Any connected model” vs allowed providers**  
   Purpose says talk to *any* connected model; Rev 2 restricts which providers may receive context. The purpose overclaims; the model picker “remembers last choice” has no rule when that choice leaves the allowlist.

2. **“Plain messages” vs attachment/tool replay**  
   Behavior: mid-thread switch replays history as *plain messages*. Rev 2: warn if *attachments/tool results* go to the new provider. Those cannot both be true without defining what is stripped vs re-sent.

3. **“Cheapest connected model” for titles vs allowlist**  
   Behavior still says cheapest *connected* model; Rev 2 says auto-title respects the allowlist. Unresolved when the cheapest model is off-list or disconnected.

4. **Feature framing vs Rev 2 semantics**  
   Features still read as full folder attach and tool toggles that enable tools; Rev 2 says manifest/on-demand reads and “requests, not permissions.” Someone implementing from Features alone will get the wrong product.

5. **Phase labeling vs the Features dump**  
   Compare is “phase 3”; Phase 1 AC is Claude stream + picker + logged-out composer. Everything else (branch, Kanban, Hermes slash, `@` agents, context panel tools, agent badge) sits in Features with no phase gate—scope and “done” disagree.

6. **“Matches mockup”**  
   Unverifiable in this doc; layout cannot be reviewed for craft against anything named here.

---

### Gaps (product / UX / craft)

| Area | Missing |
|---|---|
| **Screen question** | No one job for the first viewport (app-screens §2.2). List + thread + context + composer compete; answer content does not win by rule. |
| **States** | No empty thread, empty list, stream error, reconnect, rate-limit, long-run stalled, partial-cancel presentation (craft floor + app-screens §11). |
| **Selection / running** | No selected conversation treatment, streaming/running row mark, or unread. |
| **Message actions** | Retry, branch, Kanban, save, copy (+ tool cards, thinking) → well over four visible decisions with no progressive disclosure. |
| **Branch UI** | “Branch from this message” with no tree, labels, or how the list represents branches. |
| **Compare** | Named only; no layout, scroll sync, which model is “primary,” or how cancel works for two runs. |
| **Composer** | No height/max height, attach affordance, disabled reasons beyond logout, focus after send, paste/drop, or Escape/cancel mapping. |
| **Keyboard** | Enter/Shift+Enter and ⌘K noted; no map for cancel stream, open picker, focus list/panel. |
| **Responsive** | Desktop three-pane only; no phone/narrow fold (list ↔ thread ↔ panel). |
| **Token estimate** | No definition (input/output/cache), refresh timing, or what happens near limit. |
| **Disclosure UX** | “One-line disclosure” / switch warning: no confirm vs dismiss, no sticky history of consent, no copy examples. |
| **Safe rendering** | Safe pipeline only in Rev 2; Messages line still lists markdown/images/tables without it. |
| **API** | No auth, attachment upload, allowlist fields, cancel semantics, or error events on the SSE sketch. |

---

### Unrealistic scope

For one surface, Phase 1–shaped AC plus: agent-mode coexistence, `@` agents, six slash integrations, branching, dual-model compare, project cwd + four tool domains, Kanban/file egress, and a full context drawer. That is a product shell, not a chat MVP. Design-taste app screens want **one frequent job one click from the first screen**; here the job list is unbounded.

---

### Security / privacy risks (called out or underspecified)

- **Cross-provider history**: switch + auto-title + compare all move conversation content; warnings are weaker than an explicit confirm for new providers (and conflict with “plain messages”).  
- **Auto-title**: silent model call on first exchange—easy to miss as a data egress.  
- **Attachments**: file attach has no size/secret/redaction rules in this doc (folders get limits/ignore; files do not).  
- **Tool results in thread**: visible, copyable, re-sendable on switch/retry/compare.  
- **`@` / `/hermes` / agent badge**: handoff paths that can widen context without a dedicated consent beat in this spec.  
- **“Locally stored”**: no at-rest/export/delete note here; partial cancel kept locally still left the provider.  
- **Composer attach + project cwd**: high-blast-radius combo; Rev 2 helps for folders, not for arbitrary files or what the model “sees” in the UI.

---

### UI / design-quality problems (impeccable Operate + design-taste app-screens)

**Hierarchy & composition**  
Classic ChatGPT three-pane + chrome. No product-specific signature element; meta (model/effort/route) is specified on every message while answer typography/measure/spacing are not. Context panel is a second app (files, project, four toggles, tokens)—likely steals focus from the thread.

**Density & spacing**  
No row pitch for the conversation list, no message stack rhythm, no panel width/collapse default. Risk: sparse empty thread + dense message chrome + crowded composer toolbar in one screen.

**Typography**  
No type roles (list title vs message body vs meta vs code). Message headers will fight body if both are ~14px grey/ink. Code blocks named; measure for prose (elsewhere often ~760px) is not owned here.

**Contrast & legibility**  
“Greyed” unsupported effort levels and disabled providers—classic low-contrast trap; app-screens want disabled controls that stay legible and *say why*. Provider icons alone in the list risk icon-only identification.

**Motion**  
Streaming, cancel, thinking collapse, panel collapse, compare layout—all motion-heavy with **no** reduced-motion, scroll-stickiness, or “content visible if motion fails” rule. Impeccable wants authored motion, not default fades on every chrome bit.

**Template / slop tells this spec invites**  
- Agent **badge** / chip as eyebrow chrome  
- Segmented effort + status pills as coloured chrome rather than data  
- Tool-call **cards** and icon-led context toggles  
- Kitchen-sink right drawer  
- Action menus on every message  

Quiet app screens put colour on status that needs a decision, not on every provider/effort chip.

**Cognitive load**  
Composer alone: multiline, attach, `/`, `@`, model, effort, project, tools. Plus per-message actions. Recognition-over-recall fails without a clear primary path (type → send → read).

---

### Heuristic skim (Operate, scored against the *written* UI)

| Heuristic | Score | Note |
|---|---|---|
| Visibility of status | 2 | Stream + cancel; weak on run/error/list running |
| Match real world | 3 | Familiar chat; jargon (effort, route, cwd) unexplained |
| User control | 3 | Cancel + keep partial; branch underspecified |
| Consistency | 2 | Features vs Rev 2; phases unclear |
| Error prevention | 2 | Disclosures help; no hard confirm for provider change |
| Recognition vs recall | 2 | Slash/`@`/effort need memory |
| Flexibility | 3 | Power-user dense |
| Aesthetic / minimal | 1 | Over-chromed for Operate |
| Error recovery | 2 | Retry named; stream failure not |
| Help | 1 | No empty/first-run or command discovery |

**Rough total ~21/40** — workable product intent, weak as a buildable UI brief.

---

### Highest-leverage fixes (if you revise the doc only)

1. Split **Phase 1 chat** vs later (branch, compare, slash suite, agent mode) with AC per slice.  
2. Resolve replay: **what is stripped** on model/provider switch; require confirm when attachments/tool results leave the allowlist.  
3. Align Purpose/Features language with Rev 2 (requests ≠ permissions; manifest ≠ tree).  
4. Specify **one primary column** (thread), defaults for list/panel, and message chrome that stays secondary to answer text.  
5. Add empty/loading/error/streaming-stuck and narrow-layout behavior.  
6. Cap per-message actions (primary + overflow) and define branch/compare only when phased in.  
7. Name contrast/disabled copy and `prefers-reduced-motion` for stream/panel motion.

I can go deeper on any one bucket (privacy flows, Phase 1 cut, or a message-layout brief) if you want that next—still Ask-only unless you switch to Agent mode for edits.
