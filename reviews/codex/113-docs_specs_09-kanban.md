1. **[high] Lease expiry can duplicate remote execution.**  
   **Reference:** §Hermes pickup rules, line 26: “expires after a crash/restart, returning the card to Ready … Duplicate pickup is impossible.”  
   **Why it matters:** A daemon restart or tunnel failure does not prove the VPS worker stopped. Releasing its card can launch another worker while the first continues. The proposed update also omits eligibility checks and an atomic enforcement of the one-active-card limit. Its claim fields are absent from the schema in `02-data-model.md`.  
   **Concrete fix:** Claim and transition in one transaction, checking ready-kind, assignee, card version, and executor capacity. Persist a claim token and run ID. Reconcile expired claims with the shim before retrying; show an uncertain state while unreachable. Require claim tokens for subsequent updates and apply the side-effect-aware retry rules from §05. Replace the absolute duplicate-execution promise with a bounded guarantee.

2. **[high] Pickup eligibility contradicts itself.**  
   **Reference:** Line 10: “Cards labelled `hermes` … are eligible”; line 25: “assignee `hermes`. A label alone never triggers execution”; acceptance criterion, line 45: “A Ready `hermes` card”.  
   **Why it matters:** These describe different triggers for autonomous work. §06 also repeats the label-based rule, so implementations and tests could select different cards.  
   **Concrete fix:** State explicitly in §09 that eligibility means **ready-kind plus assignee=hermes**, independent of labels. Make the acceptance criterion test that combination and verify that a labelled card assigned to Jonas remains untouched. Identify the §06 wording as superseded.

3. **[high] The API lacks actor-specific mutation permissions.**  
   **Reference:** Lines 19–25 and §API sketch: `PATCH /cards/:id {column, position, ...}`.  
   **Why it matters:** The gateway in §12 classifies actions, but §09 does not define who may change assignment, execution eligibility, or creator identity. Without those rules, generated content could promote itself into executable work, or an agent could overwrite provenance or another actor’s card. “Hermes never moves a card to Done” currently reads as behavior rather than an enforced restriction.  
   **Concrete fix:** Define server-enforced permissions per actor. Derive creator from authenticated provenance; make it immutable. Keep automated captures in Ideas, and require Jonas or an explicitly authorized workflow to assign and promote them. Reject unauthorized Done transitions and ownership changes.

4. **[high] Editing or moving an active card has no execution semantics.**  
   **Reference:** Editable columns, drag and drop, mutable card fields, and lines 28–30.  
   **Why it matters:** Jonas can apparently edit instructions, reassign the card, or move it to Done while Hermes works. A late completion could overwrite that decision or report success against a different task. Deletion during execution is also undefined.  
   **Concrete fix:** Bind each run to an immutable card revision. Define which edits affect future runs, and require an explicit cancellation flow for stopping current work. Use version checks on worker updates; retain an execution tombstone when deleting an active card. Reference §12’s cancellation and “stop not confirmed” states.

5. **[med] Optional and editable columns can break mandatory transitions.**  
   **Reference:** Line 7: “optional `Blocked`”; line 28: failures always “move to Blocked”; §Columns: “editable”.  
   **Why it matters:** Failure handling has no destination when Blocked is absent. Removing or changing the kind of Ready, In progress, or Review can similarly strand cards and automation.  
   **Concrete fix:** Define required semantic destinations and column-edit constraints. Either require a blocked-kind column or keep blocked status separately with an explicit display destination. Require migration of existing cards before removing a column; prevent deletion of required kinds while execution depends on them.

6. **[med] Capture and event processing lack durable deduplication.**  
   **Reference:** Bulk paste and capture, lines 18–22; “Every change emits `kanban.card.*` events”, line 40; Review creates an Inbox result, line 11.  
   **Why it matters:** The transport in §01 is explicitly at-least-once. Retried workflow outputs or capture requests can create duplicate cards; repeated Review transitions can create repeated results. §05’s loop guard does not replace operation-level idempotency.  
   **Concrete fix:** Specify idempotency keys for card creation and workflow outputs, with source-to-card mappings. Emit mutation events transactionally with stable IDs and origin metadata. Key Review results by card/run completion, and define whether reopening a card updates or creates a result.

7. **[med] “Local-only” leaves the remote handoff boundary unclear.**  
   **Reference:** Line 49: “local-only to start”; automatic Hermes pickup and file/conversation links in §Card fields.  
   **Why it matters:** §06 puts Hermes in Docker on a VPS. Local board storage does not mean card text, linked conversation content, or project files stay local. §09 does not say what pickup transfers, and local file links will not resolve inside the remote workspace.  
   **Concrete fix:** Define “local-only” as board persistence and no external issue sync. Specify a bounded handoff payload, explicitly selected context, project/repository mapping, and an egress disclosure. Route transfers through §12’s policy and approval rules; never recursively attach linked content merely because it appears on a card.

8. **[med] The screen has no implementable card hierarchy or density contract.**  
   **Reference:** §Card fields lists roughly fifteen field groups; §Screen says only “matches mockup”.  
   **Why it matters:** The referenced mockups are unavailable according to §00, and `src/` contains no Kanban implementation to establish visual behavior. Showing every field would produce dense badge stacks; showing only titles would hide assignment and blockers. Shared tokens in §14 do not settle this composition.  
   **Concrete fix:** Define a compact card anatomy: title first, assignee and actionable status next, then a bounded metadata row; keep body, checklist detail, links, and activity in the drawer. Specify, for example, 14px semibold titles, 12–13px metadata, 12px padding, and consistent 8px internal spacing. Include long-title, many-label, overdue, and blocked examples. State which layers use glass so columns, cards, and drawers remain within §14’s blur-depth limit; verify text contrast over the brightest composited background.

9. **[med] Five or six columns plus a drawer have no responsive layout rule.**  
   **Reference:** §Screen: board, swimlanes, filters, right drawer, and inline add controls.  
   **Why it matters:** At 1440px, a 64px rail, 400px drawer, and 48px outer gutters leave about 928px for the board—under 180px per column before gaps. Squeezing columns makes titles and metadata hard to scan. §14’s full-screen mobile drawer does not define the board itself. Bottom-only add controls also disappear beneath long columns.  
   **Concrete fix:** Give columns a minimum width, such as 280px, and use intentional horizontal scrolling. Define whether the desktop drawer overlays or reduces the viewport. Below 900px, specify a selected-column list or another explicit narrow layout. Keep column headers visible and provide an always-accessible New card action.

10. **[med] “Keyboard-first” creation conflicts with existing shortcuts and leaves movement inaccessible.**  
    **Reference:** Line 18: “`c` anywhere”; §Screen: “Drag and drop”; acceptance criterion: “under 3 seconds by keyboard”.  
    **Why it matters:** §07 assigns `c` to Make card in Inbox. An unrestricted listener can also intercept ordinary typing. Dragging has no specified keyboard or single-pointer alternative, despite moving cards being a core action.  
    **Concrete fix:** Define shortcut precedence and exclude inputs, editors, composition events, and modal contexts. Scope `c` to the board or explicitly dispatch by focused surface. Provide a Move to column menu usable by keyboard and touch, announced move results, Escape cancellation, and focus restoration. Define the three-second test from a focused, loaded board through successful submission.

11. **[med] Live updates can disrupt focus and obscure failed saves.**  
    **Reference:** Line 44: cards appear “live”; §Screen: drag and drop, drawer, and “Hermes is working on”.  
    **Why it matters:** Incoming cards and automated moves can shift the target beneath a pointer or keyboard focus. The spec does not distinguish optimistic placement from persisted placement, or stale activity from confirmed remote work. §14 supplies general fallback requirements but no board-specific behavior.  
    **Concrete fix:** Preserve focus and scroll anchors during updates; defer disruptive reordering while dragging or editing. Specify pending, rejected, and retry states for moves, including conflict recovery. Show unreachable or awaiting-approval activity honestly. Honor reduced motion with immediate transitions and textual announcements, and include acceptance checks for reconnects, rejected moves, opaque fallback, and reduced-motion operation.