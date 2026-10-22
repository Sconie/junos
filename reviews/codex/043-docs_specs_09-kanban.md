1. **[high] Pickup eligibility can override Jonas’s assignment.**  
   **Reference:** “assignee `hermes` (or label `hermes`)” (§ Hermes pickup rules).
   **Why it matters:** A card assigned to Jonas still qualifies through its label. The spec also leaves unspecified who may move cards into Ready or add execution labels; automated content could therefore promote itself into executable work. [08-scout.md](docs/specs/08-scout.md) explicitly expects Jonas to move findings to Ready.
   **Fix:** Make `assignee=hermes` authoritative. Require a trusted handoff into Ready, enforce transition permissions in the daemon, and preserve imported content as untrusted context. Labels should categorise work rather than grant execution authority.

2. **[high] The one-card limit has no safe claim or restart contract.**  
   **Reference:** “One card In progress at a time” and “On start: card moves to In progress and gets a run link.”
   **Why it matters:** Two pickup handlers can select the same card, while a crash between launching the run and updating the card can cause duplicate execution. Concurrent edits from Jonas are also unresolved.
   **Fix:** Specify an atomic claim that checks eligibility and capacity, reserves a unique execution ID, and records the transition. Define restart reconciliation and version checks so stale edits cannot silently overwrite newer state.

3. **[high] Markdown and artifact links lack a rendering trust boundary.**  
   **Reference:** “body (markdown)” and “links (file, PR, conversation, finding, run)” (§ Card fields).
   **Why it matters:** Cards accept content from agents, files and Scout. Unsanitised HTML or dangerous URLs could execute content; remote images could disclose viewing activity. File links could become an unintended path-access mechanism.
   **Fix:** Require sanitised Markdown, disabled raw HTML, allowed URL schemes, and remote images blocked by default. Resolve file references through daemon-validated allowlists. Treat opening a link separately from executing or attaching its target.

4. **[high] Capture and daily triage have an undefined disclosure boundary.**  
   **Reference:** “capture from chat message, file or Inbox item” and “Triage pass … reads Ideas.”
   **Why it matters:** “Start local-only” describes storage/sync, but does not establish whether private card contents reach a provider model. [11-files-and-projects.md](docs/specs/11-files-and-projects.md) restricts model disclosure to explicit attachments or enabled workflows.
   **Fix:** Define whether capture stores a reference, excerpt or full copy; whether linked files are followed; and which model receives triage inputs. Make triage explicitly enabled and scoped, preserve source exclusions, and never automatically expand linked files into model context.

5. **[med] Editable columns conflict with mandatory state transitions.**  
   **Reference:** “Columns (default, editable)” and “optional `Blocked`,” versus mandatory movement to Blocked on failure.
   **Why it matters:** Removing or renaming Ready, Review or Blocked can leave automation without a valid destination. `Inbox/Ideas` versus `Ideas` also leaves the canonical state unclear.
   **Fix:** Separate stable semantic state IDs from editable display names. Require mappings for execution states, define what happens when a column containing cards is removed, and provide a blocked state even when its column is hidden.

6. **[med] Run lifecycle states and controls disappear on the board.**  
   **Reference:** Start → In progress; finish → Review; failure/block → Blocked; top bar only says “Hermes is working on…”
   **Why it matters:** [05-tasks-and-workflows.md](docs/specs/05-tasks-and-workflows.md) includes queued, waiting-approval and cancelled states; [06-hermes.md](docs/specs/06-hermes.md) requires visible Stop. A waiting card could look actively running, and dragging an executing card elsewhere has undefined consequences.
   **Fix:** Keep column state separate from execution status. Specify queued, running, waiting for approval, paused, cancelled and failed indicators, with relevant approval/stop/retry controls. Define how manual moves interact with an active run and its eventual completion.

7. **[med] Events and repeated actions can multiply cards, results and runs.**  
   **Reference:** “Every change emits `kanban.card.*` events”; movement to Review creates an Inbox result; workflows create cards.
   **Why it matters:** Workflow retries, repeated “Make card” actions and event replay can create duplicates or feedback loops. [07-inbox-and-agent-chats.md](docs/specs/07-inbox-and-agent-chats.md)’s 24-hour dedupe does not define per-run completion semantics.
   **Fix:** Define concrete event types, actor, previous/new state, event ID and causation ID. Emit completion results once per run, distinguish no-op patches from transitions, and require idempotency keys for bulk creation, capture and workflow outputs.

8. **[med] Several promised fields and operations have no persistence contract.**  
   **Reference:** Checklist, links, activity log and comments (§ Card fields; § API sketch).
   **Why it matters:** [02-data-model.md](docs/specs/02-data-model.md) has no explicit checklist, comment or multi-link storage. Its single `source_ref_json` cannot simultaneously represent a finding’s origin, execution attempts and resulting artifacts. Board configuration and WIP updates also have no sketched operation.
   **Fix:** Document how these features map to durable storage, including whether activity derives from events. Separate source provenance from execution/artifact references, define comment persistence, and specify board configuration mutations and WIP enforcement.

9. **[med] Keyboard support is promised without an interaction model.**  
   **Reference:** “`c` anywhere,” “Drag and drop,” and “Add a card in under 3 seconds by keyboard.”
   **Why it matters:** A global `c` conflicts with typing and with Inbox’s contextual “make card” shortcut in [07](docs/specs/07-inbox-and-agent-chats.md). Keyboard and assistive-technology users have no defined way to move cards or operate the drawer.
   **Fix:** Suppress shortcuts in editable fields and define contextual precedence. Provide a keyboard-accessible Move action, reorder controls, focus restoration after drawer closure, and announced move results. Define when the three-second measurement starts and what constitutes successful creation.

10. **[med] The screen has no card hierarchy, spacing or density specification.**  
    **Reference:** The long field list and the single paragraph under “Screen (matches mockup).”
    **Why it matters:** Implementers must decide whether every field appears on every card. Labels, provenance, priority and dates can easily overpower the task title. No linked Kanban mockup establishes those decisions, and `src/App.tsx` has no Kanban route to supply an incumbent layout.
    **Fix:** Specify a compact card projection: title first, one restrained metadata row, explicit blocking/approval status, remaining details in the drawer. Set initial values such as 14px/20px titles, 12px/16px metadata, 12–16px padding and 8–12px card gaps. Define title wrapping, label overflow, column counts and accessible creator labels rather than relying on `🤖`.

11. **[med] Column geometry and drawer behaviour are unresolved.**  
    **Reference:** Five default columns, optional Blocked, swimlanes and a right drawer.
    **Why it matters:** Even five 240px columns plus four 16px gaps need 1,264px before shell margins; the 360–420px drawer specified in [14-ui-system.md](docs/specs/14-ui-system.md) further reduces room. Shrinking columns would damage legibility.
    **Fix:** Define minimum column widths, board-only horizontal scrolling, sticky headers and whether the desktop drawer overlays or resizes the board. Explicitly adopt full-screen sheets below 900px, choose a mobile column selector or list presentation, and keep quick add reachable in long columns.

12. **[med] Glass execution rules are inherited but not allocated to board layers.**  
    **Reference:** “Screen” and the glass rules in [14-ui-system.md](docs/specs/14-ui-system.md).
    **Why it matters:** Columns, cards, drawers and popovers could accumulate translucent layers and blur. The shared 4.5:1 text requirement alone does not establish legibility for priority chips, focus rings or drop targets over the brightest glow.
    **Fix:** Specify which board layers own blur and which use tinted fills. Verify text and interaction contrast on the brightest composited backgrounds; define accent foreground/fill pairs, rather than assuming one accent works everywhere. Include opaque and increased-contrast presentations, plus reduced-motion behaviour for card travel, drag effects and running indicators.

13. **[med] Live updates and editing lack recovery behaviour.**  
    **Reference:** “appears live on the board” and the card drawer.
    **Why it matters:** A card may move while Jonas reads or edits it; a failed drag can leave the displayed state different from persisted state. Shared loading/error requirements in [14](docs/specs/14-ui-system.md) do not resolve these board-specific cases.
    **Fix:** Preserve drawer identity and unsaved edits across external updates, surface conflicting revisions, and roll back rejected moves with an actionable message. Define reconnect reconciliation, stale/offline indicators, filtered-empty versus empty-board states, and focus-preserving update announcements.

14. **[med] Acceptance criteria cover a small happy path inside a much larger feature commitment.**  
    **Reference:** Three acceptance bullets versus bulk paste, capture, editable columns, swimlanes, WIP limits, triage and workflow integration.
    **Why it matters:** The document treats these capabilities as one deliverable, while [13-roadmap.md](docs/specs/13-roadmap.md) places the board in Phase 3 and Scout/file indexing in Phase 4. Passing the current criteria would leave most promised behaviour unverified.
    **Fix:** Mark an initial slice explicitly: one board, quick add, assign/move, durable storage, live updates and mock Hermes handoff. Phase-tag the remaining features. Add acceptance cases for denied approval, stop, restart, duplicate delivery, failed persistence, keyboard movement and glass legibility/fallbacks.