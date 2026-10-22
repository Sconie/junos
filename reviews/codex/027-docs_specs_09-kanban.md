1. **[high] A label can authorize execution despite a conflicting assignee.**  
   **Reference:** “assignee `hermes` (or label `hermes`)” (§Hermes pickup rules, line 25).  
   **Why it matters:** A card assigned to Jonas still qualifies if labelled `hermes`. The spec also does not say who may move cards into Ready or set execution eligibility. Agent-created follow-ups could become executable without a deliberate handoff; action approvals alone do not resolve that ambiguity. [08-scout.md](docs/specs/08-scout.md:32) explicitly ties acting on findings to Jonas moving them to Ready.  
   **Fix:** Require `assignee=hermes` plus an explicit, recorded handoff by Jonas or an authorized workflow. Treat labels as categorization. Enforce eligibility and actor permissions in the daemon, including the Jonas-only transition to Done.

2. **[high] Pickup has no atomic claim or restart contract.**  
   **Reference:** “One card In progress at a time” and “On start: card moves…” (lines 26–27).  
   **Why it matters:** Two pickup attempts can select the same Ready card; a crash between creating a run and moving the card can leave duplicate work or an orphaned card. The one-card limit is a preference without enforcement semantics.  
   **Fix:** Specify an atomic eligibility check and claim, a unique active run per card, and an idempotent pickup operation. On restart, reconcile claimed cards with run state before taking more work. Define deterministic queue ordering.

3. **[high] Editable columns conflict with hard-coded execution states.**  
   **Reference:** “Columns (default, editable)” and “optional `Blocked`” (lines 6–7), versus mandatory transitions to Blocked on failure (line 27).  
   **Why it matters:** Renaming or deleting Ready can break pickup; disabling Blocked leaves the failure path without a destination. `Inbox/Ideas` versus `Ideas` also leaves the canonical initial state unclear.  
   **Fix:** Give columns stable IDs and semantic roles independent of their display names. Require mappings for executable states, define migration when removing a column, and either make Blocked mandatory or specify its fallback. State whether WIP limits warn or prevent transitions.

4. **[high] The board cannot explain or control an interrupted run.**  
   **Reference:** §Hermes pickup rules and “Hermes is working on: `<card>`” (lines 24–32).  
   **Why it matters:** Approval waits, Pause, Stop, cancellation, denial, and timeout have no board behavior. These states exist in [06-hermes.md](docs/specs/06-hermes.md:26) and [05-tasks-and-workflows.md](docs/specs/05-tasks-and-workflows.md:47). Moving an active card back to Ideas is also undefined: does execution continue?  
   **Fix:** Separate card column from run status. Show running, awaiting approval, paused, failed, and cancelled states with appropriate controls or direct links. Define what moving or editing an active card does, and require explicit requeue after cancellation.

5. **[high] Captured content has no defined trust or privacy boundary.**  
   **Reference:** Markdown bodies and file/conversation links (line 15); capture and bulk paste (line 18); daily triage (line 22).  
   **Why it matters:** Cards may contain private conversations, local file content, or hostile instructions copied from Scout findings. “Local-only” storage does not establish whether triage or pickup sends that material to a remote model. The document also lacks rendering and link-opening constraints.  
   **Fix:** Explicitly inherit [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md:27). Preserve source provenance, treat imported text as untrusted data, sanitize rendered Markdown, restrict link schemes, and enforce file allowlists when resolving links. Define what content each model receives and whether captures store references, excerpts, or full copies.

6. **[med] Promised card features lack a persistence and API contract.**  
   **Reference:** Checklist, links, activity log (line 15), comments endpoint and broad PATCH payload (lines 36–37).  
   **Why it matters:** [02-data-model.md](docs/specs/02-data-model.md:28) has no explicit checklist, comments, or general links storage; its source-reference invariant permits one source. An event log could support activity, but the mapping is unspecified. Concurrent drawer edits and agent updates could overwrite each other.  
   **Fix:** Define the stored shape or event projection for each feature, distinguish originating source from additional links, and specify writable fields, validation, revisions, and conflict behavior. Include the minimal column-configuration contract if editable columns remain in scope.

7. **[med] Drag-and-drop has no accessible equivalent.**  
   **Reference:** “Drag and drop” (§Screen, line 32).  
   **Why it matters:** Keyboard-first creation does not make the board keyboard-operable. Moving, ordering, opening, and reviewing cards remain unspecified for keyboard, screen-reader, and touch users. The general accessibility rules in [14-ui-system.md](docs/specs/14-ui-system.md:33) do not define these interactions.  
   **Fix:** Add a visible “Move to…” action, keyboard reordering, named column lists, movement announcements, and focus restoration after moving or closing the drawer. Specify touch targets and drag cancellation.

8. **[med] The screen description does not establish hierarchy, typography, or density.**  
   **Reference:** “Screen (matches mockup)” and its single paragraph (lines 31–32).  
   **Why it matters:** No Kanban mockup is identified; [stitch-prompts.md](docs/design/stitch-prompts.md) contains no Kanban screen, and [App.tsx](src/App.tsx:33) has no Kanban route. The field list could become a dense stack of equally prominent badges, dates, links, and previews.  
   **Fix:** Name a concrete visual reference and define the card anatomy. A workable baseline: title first at 14–15px semibold, one secondary metadata row at 12–13px, two visible labels maximum, 12px card padding, and a consistent 12–16px gutter. Keep full Markdown, checklists, links, and activity in the drawer. Make creation the primary board action and the agent-status strip secondary.

9. **[med] Column overflow and drawer behavior are undefined.**  
   **Reference:** Five default columns, optional Blocked, swimlanes, and a right drawer (lines 7 and 32).  
   **Why it matters:** Even five 260px columns with four 16px gaps require 1,364px before navigation and outer padding. The shared 360–420px drawer makes simultaneous visibility unrealistic on many laptops. The full-screen sheet rule below 900px does not resolve the board layout itself.  
   **Fix:** Specify minimum column widths, horizontal board scrolling, sticky headers, and whether the desktop drawer overlays or reduces the board. Below 900px, define a column selector with one column visible and a full-screen detail sheet. State how swimlanes and scroll position behave.

10. **[med] Glass requirements are not translated into Kanban acceptance checks.**  
    **Reference:** §Screen (line 32), inheriting [14-ui-system.md](docs/specs/14-ui-system.md:22).  
    **Why it matters:** The shared spec already requires contrast, fallbacks, and reduced motion, but repeated cards, column panels, drag previews, and the drawer introduce additional compositing states. No evidence establishes that dim metadata, focus, or drop targets remain legible over the brightest glow.  
    **Fix:** Require contrast checks on the actual composited surfaces: at least 4.5:1 for normal text and 3:1 for essential control boundaries and indicators. Limit backdrop blur to the intended panel layers; use controlled surface fills for repeated cards. Define distinguishable hover, selection, focus, and drop states. Test opaque/high-contrast fallbacks and reduced-motion behavior for dragging, drawer transitions, and live arrivals; keep focus and scroll stable.

11. **[med] Automatic updates have no deduplication or feedback-loop rules.**  
    **Reference:** Automatic card creation, daily triage, and “Every change emits `kanban.card.*` events” (lines 19–22 and 39).  
    **Why it matters:** A workflow can react to a card event, update a card, and trigger itself again. Retried output steps can create duplicate cards; repeated Review transitions can create duplicate Inbox results. “Appears live” also leaves reconnection behavior unspecified.  
    **Fix:** Define event names, origin and correlation IDs, idempotency keys, and trigger loop protection. Create one result per completed run, with explicit behavior for subsequent review cycles. Specify event replay or refetch after disconnect.

12. **[med] Creation shortcuts can collide with typing and Inbox actions.**  
    **Reference:** “`c` anywhere” and “paste text to create several cards” (line 18).  
    **Why it matters:** A literal global shortcut would interrupt typing in chat, search, or Markdown. Inbox already uses `c` for “make card” in [07-inbox-and-agent-chats.md](docs/specs/07-inbox-and-agent-chats.md:17). Bulk paste has no delimiter, preview, or partial-failure behavior. Bottom-of-column creation also becomes hard to reach in long columns.  
    **Fix:** Scope shortcuts to the active surface, ignore editable elements and composition input, and provide a visible top-level New card action. Make bulk creation an explicit mode with preview, count, limits, and retained input on failure. Define safe defaults, especially that automatic capture cannot silently enqueue execution.

13. **[med] Acceptance criteria cover a small happy path while the scope spans several later integrations.**  
    **Reference:** §Who fills it, §Screen, and the three acceptance criteria (lines 17–22, 32, 41–44).  
    **Why it matters:** The same spec promises editable columns, WIP limits, swimlanes, bulk capture, comments, Scout, workflow output, and daily triage. [13-roadmap.md](docs/specs/13-roadmap.md:20) places the board in Phase 3 and Scout in Phase 4. “Under 3 seconds” is also untestable without a defined starting state and input.  
    **Fix:** Declare a Phase 3 slice and explicitly defer later integrations. Define the timed creation scenario. Add acceptance cases for conflicting assignees, duplicate pickup, restart, approval denial, Jonas-only completion, keyboard movement, failed saves, narrow layouts, and glass fallback states.