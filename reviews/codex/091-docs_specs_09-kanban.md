1. **[high] A label can override explicit assignment and trigger execution.**  
   **Reference:** “Ready” semantics and “Hermes pickup rules,” lines 10, 25.  
   **Why it matters:** A card assigned to Jonas still qualifies if it carries the `hermes` label. Labels suggested by triage can become execution controls. The spec also never distinguishes permission to create a card from permission to make it executable.  
   **Fix:** Make `assignee=hermes` the sole ownership condition. Require an authorized transition into Ready, record its actor, and prevent imported content or automated suggestions from granting execution eligibility.

2. **[high] Editable columns conflict with mandatory lifecycle states.**  
   **Reference:** “Columns (default, editable),” line 7; failure handling, line 27.  
   **Why it matters:** Blocked is optional, yet every failure must move there. Renaming or removing Ready, Review, or Done could also break pickup and completion rules.  
   **Fix:** Separate stable semantic state IDs from editable display names. Always support a blocked state, even when its column is hidden. Define column-removal migration and reject changes that leave cards without a valid state.

3. **[high] Pickup, retries, and events lack duplicate-execution safeguards.**  
   **Reference:** Lines 26–27, 36–39.  
   **Why it matters:** “One card In progress” does not define an atomic claim. Concurrent pickup attempts or daemon restarts could start the same work twice. Repeated transitions into Review could duplicate Inbox results, while workflow-triggered edits could create event loops. These gaps undermine the restart reliability required by `01-architecture.md`.  
   **Fix:** Specify a transactional claim tied to an execution attempt and run ID, conditional/versioned mutations, restart reconciliation, and idempotency keys for runs and Inbox results. Give events explicit types, actor, causation ID, and workflow recursion limits.

4. **[high] Captured content has no explicit boundary between reference material and agent instructions.**  
   **Reference:** Markdown body and links, line 15; capture/import paths, lines 18–21; pickup, line 25.  
   **Why it matters:** Cards can inherit web findings, files, and conversation text, then become executable tasks. Although `12-security-and-privacy.md` declares those sources untrusted, this spec does not say how that provenance survives capture or how project context limits execution.  
   **Fix:** Preserve source provenance and distinguish Jonas’s directive from quoted source material. Require explicit project/context selection before pickup, apply project allowlists and approval policy, and preview the context sent to Hermes. Define sanitized Markdown rendering, permitted link schemes, and remote-image loading behavior.

5. **[med] The card contract exceeds the persistence model and API sketch.**  
   **Reference:** “Card fields,” line 15; API, lines 36–37.  
   **Why it matters:** `02-data-model.md` has no explicit storage for checklists, comments, or the advertised collection of links; its source reference supports one originating item. The append-only event table could supply activity history, but that mapping is unspecified. UI features could therefore appear functional without surviving reloads.  
   **Fix:** Map each field to durable storage, distinguish source provenance from artifact links, and specify comment/history retrieval. State required creation fields, board selection, validation, and which fields each actor may change.

6. **[med] The board shows running work without defining its controls or waiting states.**  
   **Reference:** “Hermes is working on: `<card>`,” line 32; finish/failure rules, line 27.  
   **Why it matters:** `05-tasks-and-workflows.md` includes queued, waiting-approval, and cancelled runs; `06-hermes.md` provides Pause/Stop. The board cannot explain these states or what happens when Jonas reassigns or moves a running card. WIP enforcement is also unclear.  
   **Fix:** Show execution state separately from column state, with approval/run links and access to Stop. Define cancellation, reassignment during execution, retry, WIP behavior, and what the status bar displays when concurrency exceeds one.

7. **[med] “Keyboard-first” capture conflicts with existing shortcuts, and moving cards is drag-only.**  
   **Reference:** “`c` anywhere,” line 18; “Drag and drop,” line 32.  
   **Why it matters:** Inbox already uses `c` for “make card” (`07-inbox-and-agent-chats.md`). An unrestricted handler can also interrupt typing in chat or editors. No keyboard or single-pointer alternative exists for moving and ordering cards.  
   **Fix:** Scope shortcuts by active surface, ignore editable fields and composition input, and define precedence. Add a labelled “Move to…” action, keyboard ordering, move announcements, and drawer focus entry/restoration.

8. **[med] Card hierarchy, typography, and density are unspecified.**  
   **Reference:** Field inventory, line 15; entire “Screen” section, line 32.  
   **Why it matters:** There is no distinction between collapsed-card information and drawer content. Rendering the full field inventory would bury titles under labels and metadata. Bottom-only capture also becomes distant in populated columns. “Matches mockup” names no reviewable reference; the Stitch prompts contain no Kanban screen.  
   **Fix:** Specify a compact card anatomy: title first, one metadata row, exceptional deadline/block indicators, and details in the drawer. Start with 14px/20px titles, 12px metadata, 12px card padding, and 8–12px gaps. Define sticky column headers/counts and a persistent Add card action. Link a concrete reference and include populated, long-title examples.

9. **[med] Board width and drawer behavior have no responsive contract.**  
   **Reference:** Swimlanes and right drawer, line 32.  
   **Why it matters:** Five or six columns, swimlanes, and the shared 360–420px drawer cannot remain comfortably readable at many desktop widths. The below-900px sheet rule in `14-ui-system.md` does not explain navigation between columns or lanes.  
   **Fix:** Define minimum column widths and board-contained horizontal scrolling. Specify when the drawer overlays rather than compresses columns. On narrow screens, use a column selector or grouped list, a full-screen detail sheet, and preserved scroll/focus when returning.

10. **[med] Glass execution lacks board-specific legibility and interaction requirements.**  
    **Reference:** “Screen,” line 32, inheriting `14-ui-system.md`.  
    **Why it matters:** Shared rules already require contrast and fallbacks, but a board adds stacked cards, drag previews, selection, and drop targets over changing glow positions. Their treatment is undefined; decorative hairlines alone may not communicate interactive boundaries.  
    **Fix:** Specify which board layers receive blur, avoiding repeated card-level backdrop filters. Require 4.5:1 text contrast over actual composites and 3:1 for necessary control/state indicators. Define distinct focus, selection, and drop states; opaque high-contrast fallbacks; and reduced-motion behavior without animated reordering or pulsing.

    An optional accent is the existing source blue, `#7C9CFF`: it separates actions from teal health states. Calculated contrast is **7.50:1** against `#0B0C0F` and **6.09:1** against an illustrative `#20222A` surface. Filled blue controls should use dark text: `#E7E8EC` on that blue reaches only **2.13:1**. Actual glass composites still require verification.

11. **[med] Capture and live updates have no recovery behavior.**  
    **Reference:** Bulk paste, line 18; live appearance, line 43; three-second capture target, line 42.  
    **Why it matters:** Parsing pasted text, failed saves, connection loss, or remote updates during editing can lose input or obscure whether a card exists. Shared loading/error components do not define these board interactions.  
    **Fix:** Define paste preview and splitting rules, title-only quick capture, retained drafts, duplicate-safe retry, and clear pending/saved/error states. Preserve focus and scroll during live inserts. Specify conflict handling for simultaneous drawer edits and agent updates.

12. **[med] The acceptance criteria understate the delivery scope and omit critical failures.**  
    **Reference:** “Who fills it,” “Screen,” and “Acceptance criteria,” lines 17–22, 32, 41–44.  
    **Why it matters:** Three happy-path checks stand in for editable workflows, bulk capture, multiple ingestion paths, daily AI triage, swimlanes, WIP limits, and autonomous execution. Scout arrives in Phase 4 of `13-roadmap.md`, after the board’s Phase 3 milestone.  
    **Fix:** Mark a first-release boundary explicitly: one board, fixed semantic states, title-first capture, assignment, movement, drawer, and one Hermes handoff. Defer or separately accept swimlanes, column editing, bulk import, triage, and Scout integration. Add acceptance checks for unauthorized pickup, duplicate claims, restart, denied approval, blocked/cancelled runs, keyboard movement, failed saves, and glass fallbacks.