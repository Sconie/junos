1. **[high] A label can override explicit assignment and trigger execution.**  
   **Reference:** “assignee `hermes` (or label `hermes`)” (line 25); triage suggests labels (line 22).  
   **Why it matters:** A Ready card assigned to Jonas remains eligible if it carries a stale `hermes` label. The document also never specifies who may promote automatically created cards into Ready. Action approvals do not resolve ambiguous permission to start work.  
   **Concrete fix:** Make explicit assignment authoritative. Require a Jonas-authorized Ready transition or a scoped automation rule before pickup. Enforce permitted transitions and actor identity in the daemon; derive `creator` from the authenticated caller.

2. **[high] Pickup has no atomic claim or restart contract.**  
   **Reference:** “One card In progress at a time” and start/finish rules (lines 26–27).  
   **Why it matters:** Concurrent pickup attempts or a daemon restart between starting Hermes and updating the card could execute work twice. Moving a running card back to Ready also has undefined consequences. This leaves the restart guarantees in `01-architecture.md` unresolved for Kanban.  
   **Concrete fix:** Atomically claim a card with its expected revision, persist a unique execution attempt, and link that attempt to its run. Define restart reconciliation, cancellation, manual moves during execution, and explicit retries.

3. **[high] Editable columns conflict with hard-coded execution states.**  
   **Reference:** “default, editable”; “optional `Blocked`” (lines 6–7), but failure “moves to Blocked” (line 27).  
   **Why it matters:** Renaming or removing Ready, Review, or Blocked can break pickup and completion routing. Approval waits, cancellations, failures, and external blockers also lack distinct treatment.  
   **Concrete fix:** Separate stable state IDs from editable display names. Require destinations for every execution outcome. If Blocked is hidden, retain a defined fallback and visible reason; distinguish waiting for approval, failed, and blocked runs in card status.

4. **[high] Captured content lacks a Kanban-specific trust and rendering contract.**  
   **Reference:** Markdown bodies and file links (line 15); capture from chat, files, and findings (lines 18–21).  
   **Why it matters:** These cards can contain untrusted instructions, unsafe links, or remote images that disclose viewing activity. Automatically passing captured material to Hermes also creates a path from external content into executable work. `12-security-and-privacy.md` establishes the general threat model but does not define this handoff.  
   **Concrete fix:** Require sanitized Markdown, blocked executable URL schemes, and remote-image loading disabled by default. Resolve local files through allowlisted daemon access. Preserve source provenance and distinguish Jonas’s instruction from captured reference material when assembling Hermes context.

5. **[med] Keyboard creation is specified; keyboard operation is missing and shortcuts conflict.**  
   **Reference:** “`c` anywhere” (line 18), “Drag and drop” (line 32).  
   **Why it matters:** `07-inbox-and-agent-chats.md` already uses `c` to make a card from the selected Inbox item. A global handler could intercept typing in chat or Markdown. Keyboard users have no specified way to move, reorder, or review cards.  
   **Concrete fix:** Define route-specific shortcut precedence and suppress single-key shortcuts in editable fields. Specify keyboard card navigation, a “Move to…” action, reorder controls, movement announcements, Escape behavior, and drawer focus restoration.

6. **[med] The board has no responsive layout contract.**  
   **Reference:** Five or six columns, swimlanes, filters, and a right drawer (lines 7, 32).  
   **Why it matters:** At 900px, the 64px rail and a 360–420px drawer from `14-ui-system.md` leave only 416–476px before gutters. Compressing all columns into that area would make titles and controls difficult to use. The shared mobile sheet rule does not resolve board navigation.  
   **Concrete fix:** Define a minimum column width and horizontal board scrolling. At narrow widths, offer a single-column selector or grouped list. Specify whether the desktop drawer overlays or resizes the board, with sticky column headers and discoverable off-screen columns.

7. **[med] Card hierarchy, typography, and spacing are left to interpretation.**  
   **Reference:** Extensive field list (line 15); screen description (line 32).  
   **Why it matters:** Rendering every field on every card would bury the work title beneath metadata. The spec gives no consistent card padding, title treatment, metadata order, or rules for long titles and numerous labels. A glass surface makes weak hierarchy particularly noticeable.  
   **Concrete fix:** Define a compact card anatomy: title first; assignee and actionable due/blocker information second; limited labels last. Keep bodies, checklists, links, and activity in the drawer. Specify, for example, 14px/20px titles, 12–13px metadata, 12px padding, 8px card gaps, and 16px column gaps, with full titles available on opening.

8. **[med] Glass requirements are not mapped to the board’s actual layers and states.**  
   **Reference:** “Screen (matches mockup)” (line 31); glass constraints in `14-ui-system.md`.  
   **Why it matters:** Columns, cards, drawer, and drag previews could inadvertently stack translucent layers beyond the shared blur budget. The global 4.5:1 text requirement does not specify how to verify dim metadata, selected cards, focus indicators, or drop targets over atmospheric glow. This is an execution gap, not evidence of a measured contrast failure.  
   **Concrete fix:** Define which board layers receive blur and give cards a predictable surface treatment. Require contrast checks against the brightest composited backdrop, including metadata and interactive states; target 3:1 for required control boundaries and focus indicators. Apply the shared opaque and contrast fallbacks explicitly. Keep movement functional, with reduced-motion alternatives to drag travel and live rearrangement.

9. **[med] Live updates and failed saves have no recovery behavior.**  
   **Reference:** Cards “appear live” (line 43), drag-and-drop and inline creation (line 32).  
   **Why it matters:** A failed move could leave the UI showing a state the daemon never accepted. An arriving card could shift the keyboard target or a card under the pointer. Shared loading/error states in `14-ui-system.md` do not cover these interactions.  
   **Concrete fix:** Specify pending and failed mutation states, draft preservation, rollback with retry, and reconnect reconciliation. Preserve focus and scroll during updates; defer disruptive reordering while interacting. Keep add-card controls reachable in long columns and distinguish an empty board from empty filter results.

10. **[med] Promised card features exceed the persistence and API contract.**  
    **Reference:** Checklist, multiple links, and activity log (line 15); comment endpoint (line 37).  
    **Why it matters:** `02-data-model.md` has no checklist or comment storage and permits only one source reference. The spec does not explain whether the event log supplies activity history or how multiple artifact links persist. Implementers could produce incompatible partial versions.  
    **Concrete fix:** Add a field-to-storage/API mapping within this doc. Distinguish the originating source from additional artifact links, define checklist/comment persistence, and state whether activity is derived from immutable events. Make all promised fields survive reload and export.

11. **[med] Automatic creation and event triggers can multiply work.**  
    **Reference:** Automatic card creation (lines 19–22); “Every change emits `kanban.card.*` events” (line 39).  
    **Why it matters:** `05-tasks-and-workflows.md` allows card-moved triggers and Kanban outputs. Retries or workflows responding to their own changes could create duplicate cards or repeated follow-ups. Inbox deduplication does not deduplicate board cards.  
    **Concrete fix:** Define stable event names and payloads, source/run idempotency keys, and event origin/correlation IDs. Prevent workflows from recursively handling their own effects by default. Keep triage suggestions inert until accepted.

12. **[med] The scope and acceptance criteria do not describe the same release.**  
    **Reference:** Scout capture, daily triage, bulk paste, swimlanes, editable columns (lines 6–22, 32), versus three acceptance checks (lines 42–44).  
    **Why it matters:** The roadmap puts Kanban in Phase 3 and Scout in Phase 4. The “matches mockup” reference provides no specific artifact, and the current `src/App.tsx` has no Kanban route to supply missing behavior. The three-second creation target also leaves its start/end points undefined.  
    **Concrete fix:** Mark the first release explicitly: one board, defined states, keyboard creation, drawer, and reliable Hermes handoff. Schedule richer capture and organization features separately. Link the exact visual reference and add acceptance checks for blocked work, denied approvals, restart recovery, inaccessible mutations, and narrow layouts. Measure creation from invoking quick-add to a persisted title-only card.