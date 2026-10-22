1. **[high] A label can unintentionally authorize agent work.**  
   **Reference:** “Only cards in Ready with assignee `hermes` (or label `hermes`)” (lines 24–28).  
   **Why it matters:** A card assigned to Jonas still qualifies through its label. Labels added by imports, workflows or triage can become execution controls. Action approvals do not establish whether Jonas intended the task to start.  
   **Fix:** Require explicit assignment to Hermes plus a recorded handoff to Ready. Treat labels as metadata. Enforce eligibility in the daemon and test that automated creation or relabelling cannot authorize pickup.

2. **[high] Editable columns contradict the required lifecycle.**  
   **Reference:** “Columns (default, editable)” and “optional `Blocked`” (lines 6–12), versus mandatory transitions to Blocked and Review (line 27).  
   **Why it matters:** Renaming or deleting a column can break pickup, failure handling and result delivery. A default board without Blocked cannot represent the specified failure path.  
   **Fix:** Separate stable workflow states from editable display names. Require a destination for every lifecycle state; prevent deletion without remapping affected cards.

3. **[high] Pickup lacks atomicity, recovery and stale-result rules.**  
   **Reference:** “One card In progress at a time” and start/finish transitions (lines 26–27); API sketch (lines 34–39).  
   **Why it matters:** Concurrent consumers can claim the same card. A restart can repeat work, and an old run can overwrite a card Jonas reassigned or edited. Architecture §Reliability requires restart recovery, but this spec provides no board-specific contract.  
   **Fix:** Specify an atomic claim linking card revision and run ID, a persisted concurrency limit, restart reconciliation, and rejection of stale completion updates. Define cancellation, approval denial, timeout and explicit retry behavior; never automatically repeat uncertain external actions.

4. **[high] Daily triage creates an undefined disclosure path.**  
   **Reference:** Capture from chat/file/Inbox (line 18), daily triage reading Ideas (line 22), “Start local-only” (line 47).  
   **Why it matters:** Cards can contain private excerpts and linked files. An automatic model-based triage pass could send that content to a provider without a defined consent or context boundary. Spec 11 restricts model disclosure to attachments or enabled workflows; local storage alone does not imply local processing.  
   **Fix:** Make triage opt-in with a named provider and explicit input scope. Default to card text without dereferencing links; exclude secrets and private cards, retain provenance, and distinguish local storage from remote inference.

5. **[high] Card content has no rendering or execution trust boundary.**  
   **Reference:** Markdown bodies, pasted text and file/PR/conversation links (lines 15–21).  
   **Why it matters:** Scout and workflow content can originate outside the app. Unsafe Markdown or link handling can expose the authenticated UI; embedded instructions can also travel into Hermes as apparent task authority. Spec 12 identifies prompt injection as a primary risk.  
   **Fix:** Require sanitized Markdown, disabled raw HTML, safe URL schemes and no automatic remote-image fetching. Resolve file links through the daemon’s allowlist. Preserve source attribution and pass captured content as untrusted data, separate from Jonas’s directive.

6. **[med] Persistence and API contracts do not cover the promised card.**  
   **Reference:** Checklist, links and activity log (line 15); comments endpoint and generic PATCH (lines 36–37).  
   **Why it matters:** Spec 02’s `kanban_card` has no explicit checklist, comments or activity representation, and its source-reference invariant does not explain multiple linked artifacts and runs. Implementers must invent incompatible storage and mutation rules.  
   **Fix:** State which fields are persisted, derived or separate records. Define typed links, comments, checklist updates, board membership and ordering. Allowlist PATCH fields and make creator/provenance and audit entries server-controlled.

7. **[med] Events can produce duplicate notifications or automation loops.**  
   **Reference:** Review creates an Inbox result (line 11); “Every change emits `kanban.card.*` events” (line 39).  
   **Why it matters:** Spec 05 allows card-move triggers. A workflow can react to its own updates, while repeated Review transitions or retries can create misleading duplicate results.  
   **Fix:** Define concrete event names, actor, changed fields, revision, run ID and causation ID. Publish events with the committed mutation, deduplicate completion results by card/run, and prevent self-triggering loops by default.

8. **[med] The keyboard promise contains a shortcut collision and excludes moving cards.**  
   **Reference:** “`c` anywhere” (line 18), “Drag and drop” (line 32), keyboard acceptance criterion (line 42).  
   **Why it matters:** Inbox already uses `c` for “make card” in spec 07. A global handler can also interrupt typing in chat or Markdown. Keyboard users can create cards but have no specified way to change their state.  
   **Fix:** Scope shortcuts to the active surface and ignore editable fields and composition events. Provide a keyboard/touch “Move to…” action, focus restoration, drawer focus management and movement announcements.

9. **[med] The layout does not resolve column width, overflow or drawer competition.**  
   **Reference:** Board, swimlanes, filters and right drawer in one sentence (line 32).  
   **Why it matters:** Five or six columns plus the 360–420px drawer from spec 14 cannot stay comfortably readable at many desktop widths. Swimlanes further multiply headers and empty space. The global mobile-sheet rule does not define board navigation.  
   **Fix:** Specify a minimum column width, board-local horizontal scrolling, sticky column headers and independent drawer behavior. Below 900px, define a column selector or list presentation with full-screen detail. Keep page-level horizontal overflow disabled and preserve scroll position.

10. **[med] Card hierarchy, typography and spacing are unspecified.**  
    **Reference:** Extensive card fields (line 15), bottom-of-column add controls and generic screen description (line 32).  
    **Why it matters:** Rendering every field as a chip produces dense, repetitive cards; hiding everything loses ownership and next-action clarity. Bottom-only creation controls become distant on busy columns.  
    **Fix:** Define a compact card anatomy: a two-line title at 14–16px/medium weight, one restrained metadata row at 12–13px, and additional detail in the drawer. Start with 12–16px padding, 8–12px card gaps and 16px column gaps. Provide a persistent “New card” action and visible Review/Blocked counts. Replace the variable emoji marker with a consistent icon and accessible “Created by Hermes” label.

11. **[med] Glass contrast rules are not mapped to the board’s actual layers and states.**  
    **Reference:** “Screen (matches mockup)” (line 31), inheriting spec 14’s translucent panels, accent and contrast rules.  
    **Why it matters:** Columns, cards, drag previews and drawers can exceed the intended blur depth or lose separation over glow. Spec 14 requires 4.5:1 text contrast, but this document leaves component roles undefined. Its text token `#E7E8EC` on violet `#8B5CF6` is only **3.46:1** if used for a filled action.  
    **Fix:** Define the board’s compositing stack: frosted columns, controlled card fills without additional backdrop blur, and bounded drawer opacity. Validate text and focus/drag indicators against the brightest allowed backdrop. A restrained periwinkle accent, `#7C9CFF`, would connect to the current source palette while separating actions from teal running states: **6.94:1** on solid `#14161B`, with dark `#0B0C0F` button text at **7.50:1**. These are solid-pair calculations, not measurements over glass.

12. **[med] Live updates lack interaction stability and motion rules.**  
    **Reference:** Automatically added cards, live appearance and current-work banner (lines 19–22, 32, 43).  
    **Why it matters:** Insertions and reordering can move targets during dragging or reading. A constant stream of animations or announcements would make a persistent work surface distracting.  
    **Fix:** Preserve focus and scroll position, defer conflicting reorder updates during interaction, and show a quiet new-items count. Limit animation to brief local feedback; reduced motion removes travel and pulsing. Explicitly apply opaque/high-contrast fallbacks and test pending, failed and rolled-back moves.

13. **[med] The mockup reference and release boundary are not actionable.**  
    **Reference:** “Screen (matches mockup)” (line 31), creation channels (lines 17–22), acceptance criteria (lines 41–44).  
    **Why it matters:** `docs/design/stitch-prompts.md` contains no Kanban prompt, and `src/App.tsx` has no Kanban route. The spec therefore references no identifiable screen while bundling swimlanes, bulk capture, daily triage and integrations beyond the roadmap’s core Ready-to-Review milestone. Three happy-path criteria cannot establish readiness.  
    **Fix:** Name a specific mockup or replace that reference with a complete screen contract. Mark the first release explicitly: quick add, fixed lifecycle, card drawer and one Hermes handoff. Phase the remaining features, and add acceptance cases for unauthorized pickup, duplicate claims, restart recovery, rejected moves, keyboard operation, narrow layouts and glass fallbacks.