1. **[high] A label can override ownership and authorize unintended pickup.**  
   **Reference:** “assignee `hermes` (or label `hermes`)” ([09:25](docs/specs/09-kanban.md#L25)).  
   **Why it matters:** A card explicitly assigned to Jonas still qualifies if it carries the label. Labels suggested by triage or supplied by workflows become execution controls. The approval reference does not resolve who may authorize pickup.  
   **Concrete fix:** Require `assignee=hermes` plus an explicit Ready transition authorized by Jonas or a scoped automation rule. Treat labels as descriptive. Enforce eligibility and trusted creator identity in the daemon, including bulk requests.

2. **[high] Pickup has no atomic claim or restart behavior.**  
   **Reference:** “One card In progress at a time” and automatic start/finish transitions ([09:26–27](docs/specs/09-kanban.md#L26)).  
   **Why it matters:** Concurrent pickup attempts can start duplicate runs; a restart between starting Hermes and updating the card can repeat work or strand the card. This leaves [01’s reliability rules](docs/specs/01-architecture.md) undefined for Kanban.  
   **Concrete fix:** Specify an atomic Ready-to-claimed transition, durable card/run association, and an idempotency key for dispatch. Define startup reconciliation and reject stale card updates. Add acceptance cases for simultaneous pickup and daemon restart.

3. **[high] Editable columns conflict with mandatory lifecycle destinations.**  
   **Reference:** “Columns (default, editable)”; “optional `Blocked`”; failures “move to Blocked” ([09:6–7](docs/specs/09-kanban.md#L6), [09:27](docs/specs/09-kanban.md#L27)).  
   **Why it matters:** Renaming or removing Ready, Review, or Blocked can break execution, completion notifications, and failure handling. Display names currently double as machine states.  
   **Concrete fix:** Give columns stable IDs and semantic roles. Permit renaming while protecting required roles, or separate execution state from board position. Make the failure destination mandatory or define an explicit fallback.

4. **[high] Captured content lacks a rendering and model-disclosure contract.**  
   **Reference:** Markdown bodies, file/conversation links, capture from files, and daily AI triage ([09:15–22](docs/specs/09-kanban.md#L15)).  
   **Why it matters:** Cards can contain untrusted web text or sensitive local content. Rendering remote images can disclose viewing activity; unsafe markup or URL schemes can expose the local UI. Daily triage also introduces a model-processing path despite “local-only” wording. [11’s privacy rules](docs/specs/11-files-and-projects.md) require explicit attachment or an enabled workflow.  
   **Concrete fix:** Require sanitized Markdown, disabled raw HTML, validated link schemes, and remote media blocked by default. Define whether capture copies content or stores references. Make triage opt-in with a visible model and content scope; carry untrusted-source provenance into Hermes runs under spec 12.

5. **[med] Approval, pause, cancellation, and rework are missing from the card lifecycle.**  
   **Reference:** Only start, finish, failure/block, and Done are described ([09:24–29](docs/specs/09-kanban.md#L24)).  
   **Why it matters:** A card awaiting approval may appear actively progressing. Moving a running card elsewhere has no defined effect on execution. Review provides no specified way to request changes, although [05](docs/specs/05-tasks-and-workflows.md) includes waiting-approval and cancelled run states.  
   **Concrete fix:** Define card presentation and actions for queued, running, awaiting approval, paused, cancelled, and failed runs. State whether moving a running card cancels it. Give Review explicit **Mark done**, **Request changes**, and **Open artifacts** actions.

6. **[med] The promised card content exceeds its persistence contract.**  
   **Reference:** Checklist, multiple typed links, and activity log ([09:15](docs/specs/09-kanban.md#L15)).  
   **Why it matters:** [02’s card schema](docs/specs/02-data-model.md#L28) has no checklist or comment storage, and its invariant permits one source reference. A captured finding that later produces several runs and artifacts needs more than that single reference.  
   **Concrete fix:** Specify persisted checklist items and comments, repeatable typed links, and separate source provenance from execution links. Define whether activity is derived from events and how it survives source deletion.

7. **[med] “Every change” events can create automation feedback loops.**  
   **Reference:** “Every change emits `kanban.card.*` events” ([09:39](docs/specs/09-kanban.md#L39)).  
   **Why it matters:** [05](docs/specs/05-tasks-and-workflows.md#L36) lets events trigger workflows that can create or modify cards. Without event semantics, a workflow can trigger itself repeatedly; repeated Review transitions can also produce duplicate results.  
   **Concrete fix:** Name the events and define their payloads, including actor, changed fields, previous/new state, run ID, and causation ID. Specify deduplication and loop prevention. Emit the Review result once per completed run.

8. **[med] The global `c` shortcut contradicts Inbox behavior and can interrupt typing.**  
   **Reference:** “`c` anywhere” ([09:18](docs/specs/09-kanban.md#L18)).  
   **Why it matters:** [07](docs/specs/07-inbox-and-agent-chats.md#L17) assigns `c` to converting the selected Inbox item into a card. A literal global handler also conflicts with chat, Markdown editing, and other text inputs. Dragging is the only specified movement interaction despite the keyboard-first UI requirement.  
   **Concrete fix:** Scope `c` by route and focus, preserving Inbox conversion. Disable single-letter shortcuts in editable fields. Define keyboard card navigation, a **Move to…** action, drawer focus restoration, and announcements after moves.

9. **[med] Five or six columns plus a drawer have no usable width contract.**  
   **Reference:** Board, swimlanes, filters, and right drawer ([09:32](docs/specs/09-kanban.md#L32)).  
   **Why it matters:** [14](docs/specs/14-ui-system.md#L25) gives drawers 360–420 px. Keeping every column visible beside one can squeeze titles and actions into narrow strips. Its mobile sheet rule does not define how the board itself adapts.  
   **Concrete fix:** Set a minimum column width, board-local horizontal scrolling, sticky column headers, and drawer overlay behavior. Below 900 px, specify a status selector with a single-column list and full-screen card detail. Define how swimlanes collapse and preserve position.

10. **[med] Card hierarchy, spacing, and typography are left to generic component defaults.**  
    **Reference:** The long field inventory and one-paragraph Screen section ([09:15](docs/specs/09-kanban.md#L15), [09:32](docs/specs/09-kanban.md#L32)).  
    **Why it matters:** No rule separates scan-critical content from drawer details. This invites equal-weight badge collections and repeated decorative panels. `src/index.css` supplies a generic `.card`, but no Kanban hierarchy; the screen’s distinctive handoff between Jonas and Hermes remains visually underspecified.  
    **Concrete fix:** Define a compact card anatomy: 14–16 px semibold title, one 12–13 px metadata row, and a clear blocked/approval reason when relevant. Keep body, full labels, checklist, and history in the drawer. Specify consistent padding and gaps, restrained semantic color, and flat card fills within the chosen glass shell. Include realistic populated examples.

11. **[med] Live updates lack rules for preserving user control.**  
    **Reference:** Cards appear live; agents move cards; triage proposes edits ([09:22](docs/specs/09-kanban.md#L22), [09:27](docs/specs/09-kanban.md#L27), [09:43](docs/specs/09-kanban.md#L43)).  
    **Why it matters:** Incoming changes can displace a focused card, invalidate a drag, or overwrite an open edit. Spec 14 lists generic states, but Kanban needs specific behavior for conflicts and uncertain saves.  
    **Concrete fix:** Preserve focus, scroll, and unsaved drawer content during updates. Define version-conflict handling, failed-move rollback, reconnect reconciliation, and separate empty-board versus no-filter-results states. Show pending saves and connection freshness without reshuffling active interactions.

12. **[med] The delivery boundary is much broader than its acceptance criteria.**  
    **Reference:** Bulk paste, captures, swimlanes, editable columns, WIP limits, triage, and multiple producers versus three happy-path checks ([09:17–44](docs/specs/09-kanban.md#L17)).  
    **Why it matters:** [13’s Phase 3 milestone](docs/specs/13-roadmap.md#L20) is a Ready-to-Review handoff. The spec does not distinguish that milestone from a considerably larger board product, making implementation and completion estimates unreliable.  
    **Concrete fix:** Mark a first release explicitly: one board, fixed semantic columns, title-first creation, assignment, accessible movement, persistence, and mock Hermes handoff. Phase bulk capture, swimlanes, editable columns, and AI triage separately. Define the three-second measure from opening quick-add to persisted confirmation, excluding title composition.

13. **[low] The robot emoji substitutes decoration for clear provenance.**  
    **Reference:** Hermes-created cards carry a “`🤖` marker” ([09:19](docs/specs/09-kanban.md#L19)).  
    **Why it matters:** It introduces the generic AI styling both requested lenses caution against, varies across platforms, and can confuse creator with current assignee.  
    **Concrete fix:** Use quiet text such as **Created by Hermes** in metadata or details. Show **Assigned to Hermes** separately; if an icon is retained, use the shared icon set with an accessible label.