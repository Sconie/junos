1. **[high] Inline approvals omit the information needed for informed consent.**  
   **Reference:** Home, “Needs you…with inline Approve/Deny” (line 6).  
   **Why it matters:** A five-item summary could expose an approval button without the exact command/diff required by `12-security-and-privacy.md`. Approvals can also expire while Home remains open.  
   **Fix:** Show the project, action class, target and exact operation before enabling approval; open a detail sheet when necessary. Bind approval to an immutable request/version, revalidate pending status server-side, prevent duplicate submissions, and display expired or already-resolved outcomes.

2. **[high] Enter can cross from local navigation into model execution without a defined boundary.**  
   **Reference:** Command palette, “Ask <current model>” and “executes on Enter” (lines 18–20).  
   **Why it matters:** Navigation, workflow execution and transmitting a prompt share one result list. Asynchronous reordering could change what Enter activates. Search terms may contain private information that Jonas intended to search locally.  
   **Fix:** Keep matching local until the explicit Ask action is selected. Clearly distinguish navigation from execution, preserve selection by stable result ID, and show the destination model/provider. Workflow and Hermes actions must collect required parameters and use the approval policy before execution.

3. **[high] Search lacks an exclusion and removal contract.**  
   **Reference:** Global search, “across messages…file names and file summaries” (line 23).  
   **Why it matters:** `11-files-and-projects.md` limits indexing to allowlisted folders and excludes secret files. This spec does not say whether those restrictions also govern search snippets, recents and cached summaries after a folder is removed or exclusions change. Previously indexed private material could remain discoverable.  
   **Fix:** Explicitly inherit those restrictions for every search surface. Define removal from FTS, summaries, embeddings and recents when access is revoked or content is deleted. Render snippets as escaped text with controlled highlighting.

4. **[high] Independent loading conflicts with an unspecified aggregate response.**  
   **Reference:** Home rules, “one `GET /home` aggregate or per-card queries…no card may block the others” (line 14).  
   **Why it matters:** A conventional aggregate that waits for every source allows one slow provider or Hermes bridge to delay all cards. Per-card skeletons alone do not provide isolation.  
   **Fix:** Choose independent cached card queries, or define an aggregate that reads bounded local snapshots and returns per-card data/error/freshness envelopes. Refresh external sources separately, with timeouts and independent retries.

5. **[med] Eight cards have no explicit visual priority or density budget.**  
   **Reference:** Home’s “glance page” and eight-card inventory (lines 4–12).  
   **Why it matters:** Five approvals, five tasks, activity, board counts and provider meters can become a wall of equally prominent panels. The referenced Stitch prompt predates Needs you, Board and Scout; the current `Overview.tsx` contains only navigation tiles. Neither resolves this composition.  
   **Fix:** Define Home’s first question as “What needs my attention?” Give Needs you the leading position, keep Quick ask compact, and place monitoring information below it. Specify desktop/tablet/phone spans and reading order, capped previews with totals and “View all,” and no forced equal heights. Start with 20–24px panel padding, 16–24px gaps, 14–16px body text and readable secondary labels; move raw cron expressions behind human-readable schedules.

6. **[med] Glass accessibility rules are not translated into Home’s layered surfaces.**  
   **Reference:** Home cards and Command palette; inherited rules in `14-ui-system.md`.  
   **Why it matters:** The shared spec already requires 4.5:1 text contrast, reduced-motion support and solid fallbacks. Home does not define how a palette or drawer over frosted cards preserves those guarantees, or distinguish informative labels and controls from decorative glass borders.  
   **Fix:** Specify stronger backing for the palette, approval details and dense rows; verify text at 4.5:1 and essential control/focus indicators at 3:1 over the brightest allowed atmosphere. Define opaque/high-contrast variants. An optional ice-cyan accent (`#67E8F9`) would distinguish interaction from teal health states: it gives **12.49:1** against solid `#14161B`, with dark `#0B0C0F` button text giving **13.49:1**. These are solid-pair calculations; composited glass still needs verification.

7. **[med] The command palette has no usable keyboard or touch interaction contract.**  
   **Reference:** “Command palette (⌘K)” and its acceptance criterion (lines 16–20, 27).  
   **Why it matters:** The project runs on Windows, but only a Mac shortcut is named. Shared ARIA guidance in `14-ui-system.md` does not define selection, focus restoration or the nested New card flow.  
   **Fix:** Support Ctrl+K on Windows/Linux and ⌘K on macOS, plus a visible touch-accessible launcher. Specify arrow navigation, Enter behavior, Escape/back behavior, focus containment/restoration, accessible result announcements and IME-safe input. Define New card’s fields, validation, save feedback and cancellation behavior.

8. **[med] File search promises do not agree on what is searchable.**  
   **Reference:** Global search lists “file names and file summaries” (line 23).  
   **Why it matters:** `11-files-and-projects.md` makes file-content FTS the always-on first stage; summaries and embeddings are optional. Following this document literally would omit available file contents and weaken search whenever AI enrichment is disabled.  
   **Fix:** Explicitly include indexed text-file contents in baseline search. Treat summaries as optional enrichment and semantic retrieval as a separately enabled capability. Define behavior while indexing is incomplete, and clarify whether the palette queries the same index or only object names.

9. **[med] Ranking, filters and result destinations are too ambiguous to implement consistently.**  
   **Reference:** “grouped by type with recent first; fuzzy match” and filters “type, project, date” (lines 20–23).  
   **Why it matters:** Recency can bury an exact match. A result named only by title cannot distinguish similarly named files, cards or conversations. “Date” could mean creation, modification or scheduled execution.  
   **Fix:** Rank exact and strong matches before recency; use recency as a tie-breaker. Define searchable fields, filter semantics and date/timezone rules. Specify result rows with type, title, project/path, timestamp and matching snippet, and open messages/files at the matching location. Include bounded pagination and no-results/error states.

10. **[med] Usage bars promise measurements that some providers cannot supply.**  
    **Reference:** Home, “Subscriptions: per provider state and usage bar” (line 10).  
    **Why it matters:** `03-connections-and-routing.md` explicitly permits usage meters only where providers expose them. A mandatory bar invites invented percentages or unknown values displayed as zero.  
    **Fix:** Show percentage bars only with a known numerator, limit, period and freshness timestamp. Otherwise display “Usage unavailable,” supported local run counts, or rate-limit/reset information. Keep unknown, disconnected and zero usage visually distinct.

11. **[med] Live updates lack freshness and stability rules.**  
    **Reference:** Home rules, “plus the event stream” (line 14); Hermes’s current card appears twice (lines 8–9).  
    **Why it matters:** Independent queries can show conflicting current tasks. Stream reconnection can leave stale approvals or duplicate rows. Immediate reordering can move an Approve button under the pointer, while repeated skeletons or pulses make a glance page distracting.  
    **Fix:** Derive duplicated facts from shared cached entities, define event deduplication and reconnect reconciliation, and show last-updated/stale states. Preserve row position during interaction, retain existing data during refresh, reserve skeleton geometry, and use static loading indicators under reduced motion.

12. **[med] Quick ask has no defined handoff or failure behavior.**  
    **Reference:** “input plus model chip, sends into Chat” (line 5).  
    **Why it matters:** It is unclear whether submitting creates a conversation or resumes one, which effort/project/tools apply, or what survives a disconnected provider or failed navigation. `04-chat.md` already makes these choices meaningful.  
    **Fix:** Define Quick ask as creating a new conversation with explicit model, effort and context defaults. Preserve the draft on failure, prevent duplicate sends, and navigate to the created thread. Specify unavailable-provider behavior and reuse Chat’s model/effort controls.

13. **[med] Acceptance criteria cannot demonstrate that the main feature works.**  
    **Reference:** Acceptance criteria (lines 25–27).  
    **Why it matters:** “Renders in under 1 second” could pass with skeletons alone; “opens in under 100 ms” could pass with an unusable palette. There are no search correctness, privacy-removal or approval-race criteria.  
    **Fix:** Define representative dataset size, hardware, cold/warm conditions and percentile targets. Measure useful Home data and palette input readiness separately from search latency. Add checks for a stalled card, excluded/deleted content, optional summaries disabled, expired approvals, keyboard-only creation, narrow layouts, and glass contrast/opaque/reduced-motion variants.