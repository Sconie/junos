1. **[high] Inline approvals lack the information needed for informed consent.**  
   **Reference:** Home: “inline Approve/Deny.”  
   **Why it matters:** [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires the exact command/diff. This card does not require that context, project, destination, or approval expiry. A compact title could conceal a destructive or outward-facing action.  
   **Concrete fix:** Reuse the Inbox approval detail component in a drawer. Show the exact action and scope before enabling approval; bind the decision to that action’s version, reject expired/resolved requests, and prevent duplicate submissions.

2. **[high] Enter conflates navigation, execution, and sending data to a model.**  
   **Reference:** Command palette: “Run workflow,” “Ask Hermes,” “Ask \<current model\>,” and “executes on Enter.”  
   **Why it matters:** These actions have different consequences. The spec leaves initial selection and selection changes undefined, so asynchronous results could turn a local search into a provider request or agent directive. Workflows also require parameters and a dry-run choice in spec 05.  
   **Concrete fix:** Give navigation, commands, and model submission distinct row treatments. Never auto-select the Ask row; preserve selection by stable ID as results arrive. Workflow actions open the existing launch form. Show provider/model and attached context before explicit submission, preserving approval gates.

3. **[high] Search does not inherit an explicit data-exclusion and removal contract.**  
   **Reference:** Global search: “across messages … file names and file summaries.”  
   **Why it matters:** Spec 11 excludes secret files and non-allowlisted folders, but this document does not say whether those exclusions apply to snippets, recents, cached results, summaries, or embeddings after a folder is removed. Derived search data can retain private content after access is revoked.  
   **Concrete fix:** Require the same allowlist and exclusions for every search surface. Define removal of indexed content and derived artifacts when access is revoked, invalidate cached results, and recheck file access when opening a result. Keep local queries local unless the user explicitly selects Ask.

4. **[med] The aggregate API option does not guarantee independent cards.**  
   **Reference:** Home rules: “each card loads independently” versus “one `GET /home` aggregate.”  
   **Why it matters:** A conventional aggregate response waits for its slowest dependency. The page can therefore satisfy neither independent loading nor the one-second target, even if individual failures are caught.  
   **Concrete fix:** Choose per-card queries, or specify a cached aggregate that returns immediately with per-section status and timestamps. Set dependency timeouts and forbid live provider/agent probes on Home’s critical path. Define how event reconnection refreshes stale cards without blanking successful ones.

5. **[med] Home has an inventory, but no visual priority or usable layout contract.**  
   **Reference:** “A glance page” followed by eight cards; “cards (from the mockup).”  
   **Why it matters:** The Home prompt in `docs/design/stitch-prompts.md` describes six blocks and a masonry layout; this spec adds Needs you, Board, and Scout without revising that composition. The current `Overview.tsx` is a navigation shell, so it supplies no implementation precedent. Equal prominence would bury decisions among monitoring information.  
   **Concrete fix:** Define a canonical Home composition: Needs you leads when actionable items exist; Quick ask remains compact; agent/run status follows; discovery and recents sit lower. Specify desktop spans and mobile reading order, use one page scroll, and link out with totals and “View all.” Show Hermes’s current card in one place.

6. **[med] Typography and spacing are unspecified for unusually dense cards.**  
   **Reference:** Upcoming runs’ name/cron/time/status; Hermes’s task plus three actions; Needs you’s five actionable rows.  
   **Why it matters:** Spec 14 provides a font family and grid, but no row pitch, type scale, card padding, or truncation hierarchy. These combinations invite tiny metadata, squeezed action buttons, and ragged card heights.  
   **Concrete fix:** Add a Home density prescription: for example, 24px page title, 16px section headings, 14px primary row text, and 12–13px metadata with adequate contrast; 20px card padding and 16px gutters. Use roughly 48–56px two-line rows, aligned action columns, tabular times/counts, and explicit wrapping rules for long names and paths. Verify at narrow widths and 200% zoom.

7. **[med] Glass accessibility rules exist, but Home has no execution checks.**  
   **Reference:** Home loading/event rules and acceptance criteria; inherited glass requirements in spec 14.  
   **Why it matters:** Spec 14 already requires contrast and fallbacks. Home adds many glass panels, skeletons, status indicators, and live changes without defining how those requirements are verified over atmospheric highlights.  
   **Concrete fix:** Add acceptance checks for text at **4.5:1** and essential controls/focus indicators at **3:1** against the actual composited background. Provide an explicit opaque/high-contrast mode; under reduced motion, remove shimmer, pulse, and decorative travel. Keep live updates from moving focused rows.

   For the open accent choice, consider **sky blue `#7CC4FF`**: it separates interaction from teal health states. It measures **9.65:1** against opaque `#14161B`; dark `#0B0C0F` labels on that accent measure **10.43:1**. Light `#E7E8EC` labels measure only **1.53:1**, so use dark labels on filled accent buttons. These are solid-color calculations; glass still needs composited checks.

8. **[med] Palette search and global search have no defined relationship.**  
   **Reference:** “Results grouped by type … fuzzy match” versus “Full-text (SQLite FTS5) … Filters: type, project, date.”  
   **Why it matters:** It is unclear whether these are separate interfaces, shared results, or successive search modes. Recency-first ordering can bury exact matches, and “date” means different things for messages, files, and scheduled tasks.  
   **Concrete fix:** Define the palette as a bounded quick navigator with “Search all results” opening a dedicated results view that preserves query and filters. Specify exact-match/relevance/recency precedence, result limits, date-field semantics, project attribution, and stable destination links. Render snippets as escaped text with safe highlighting.

9. **[med] File-search scope contradicts the indexing spec.**  
   **Reference:** Global search includes “file names and file summaries”; “Semantic search … comes with the file index (11).”  
   **Why it matters:** Spec 11 promises file-content FTS in Stage 1, while summaries and embeddings are optional Stage 2 features. This wording can omit cheap content search while making optional semantic indexing appear mandatory.  
   **Concrete fix:** Explicitly include file contents in baseline FTS. Mark summaries and semantic retrieval as optional enhancements. Define the usable FTS-only state and visible indexing progress without requiring AI tagging.

10. **[med] Keyboard access is promised without an interaction contract.**  
    **Reference:** “Command palette (⌘K)” and “executes on Enter.”  
    **Why it matters:** This Windows-based product needs Ctrl+K and a visible pointer/touch entry point. Generic ARIA guidance in spec 14 does not settle focus movement, dismissal, announcement of results, or embedded creation forms.  
    **Concrete fix:** Specify Ctrl+K on Windows/Linux and Cmd+K on macOS; labelled search trigger; initial input focus; arrow-key selection; appropriate combobox/listbox semantics; Escape/back behavior; focus restoration; and loading/no-results announcements. Define how “New card” opens, validates, saves, and returns focus without navigating away.

11. **[med] “Needs you” has no eligibility rule and can hide unresolved work.**  
    **Reference:** “top 5 Inbox items (approvals first).”  
    **Why it matters:** Spec 07 includes results, digests, snoozed items, and completed items as well as actionable requests. It sorts urgent first, whereas this spec gives approvals categorical precedence. The five-item cap has no total or route to the remainder.  
    **Concrete fix:** Define eligible statuses and actionable kinds, exclude snoozed/resolved items, and specify precedence between urgency and approval status. Show the remaining actionable count and an Inbox link. Use kind-specific actions; Approve/Deny applies only to approvals.

12. **[med] Usage bars require data that providers may not expose.**  
    **Reference:** Subscriptions: “per provider state and usage bar.”  
    **Why it matters:** Spec 03 permits usage meters only where providers expose reliable limits; otherwise it shows local run counts and the last rate-limit event. An invented or stale percentage would misrepresent remaining capacity.  
    **Concrete fix:** Inherit that capability rule explicitly. Show percentage and reset window only when known, label freshness, and distinguish unknown from zero. Use local activity or “Usage unavailable” otherwise.

13. **[med] Performance criteria leave most of the scope untestable.**  
    **Reference:** “Home renders in under 1 second” and “⌘K opens in under 100 ms.”  
    **Why it matters:** Neither defines hardware, corpus size, cold/warm state, or whether “renders” means skeletons or useful data. Palette opening time says nothing about search response time. The full screen also depends on services introduced across several roadmap phases.  
    **Concrete fix:** Define representative data volumes and test conditions; measure useful local Home content separately from optional remote refreshes; specify a search-response target. State which cards/actions are available at each phase and how absent integrations appear, rather than requiring every dependency to ship together.

14. **[low] Upcoming runs assumes every task has a cron expression.**  
    **Reference:** “next 5 tasks with cron, next time, status dot.”  
    **Why it matters:** Spec 05 supports one-off runs and explicit task timezones. Raw cron plus an unqualified time is hard to scan and can misrepresent one-off or cross-timezone schedules.  
    **Concrete fix:** Show task name and human-readable next occurrence first, with a date when needed and a clear timezone convention. Keep cron in secondary detail, label one-off runs, exclude paused tasks, and pair status dots with text.