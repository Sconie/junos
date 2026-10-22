1. **[high] Home approvals omit the evidence required for informed consent.**  
   **Reference:** Home: “top 5 Inbox items … with inline Approve/Deny.”  
   **Why it matters:** [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires approvals to show the exact command/diff. A short dashboard row could authorize a destructive or external action without exposing its scope. Live updates also introduce expired or already-resolved approvals.  
   **Fix:** Require an expandable review showing command/diff, project, destination and expiry before approval becomes available. Validate that the approval still matches the pending action server-side; disable duplicate submissions and show the recorded outcome.

2. **[high] Enter has no safe contract across navigation, execution and model submission.**  
   **Reference:** Command palette: “Run workflow,” “Ask Hermes,” and “executes on Enter.”  
   **Why it matters:** Opening a file and starting an agent have different consequences. Changing search results could move the selection immediately before Enter. “Run workflow” also omits the parameter, model and dry-run form required by [05-tasks-and-workflows.md](docs/specs/05-tasks-and-workflows.md).  
   **Fix:** Define Enter per result type: navigation opens its destination; creation opens a form; workflow execution opens its configured launcher; model submission requires explicit selection. Preserve selection by stable ID during updates and apply the existing approval policy to resulting actions.

3. **[high] The boundary between local search and sending content to a model is unspecified.**  
   **Reference:** “typing a sentence offers ‘Ask \<current model\>’” alongside global search across private messages and files.  
   **Why it matters:** Sentence detection cannot reliably distinguish a search query from a prompt. The spec does not say whether retrieved snippets, files or project context accompany the request. [11-files-and-projects.md](docs/specs/11-files-and-projects.md) permits content transmission only through explicit attachment or an enabled workflow.  
   **Fix:** Keep typing and retrieval local. Label the action “Send question to [provider/model]”; send only the entered text unless the user explicitly adds context. Never attach search results implicitly.

4. **[med] Search coverage contradicts the file-index specification.**  
   **Reference:** Global search includes “file names and file summaries.”  
   **Why it matters:** Spec 11 requires Stage 1 full-text indexing of text-file contents, while summaries are optional. Following this document literally would miss words inside unsummarised files. The project/date filters also lack field semantics across mixed entity types.  
   **Fix:** Explicitly include indexed file contents. Define project membership through entity relationships and identify the date field used for each type. Specify that removing or excluding a source removes its searchable text, summaries, embeddings and cached snippets.

5. **[med] Palette search and global search are not connected into a usable flow.**  
   **Reference:** Palette: “fuzzy match”; Global search: “Full-text … Filters: type, project, date.”  
   **Why it matters:** It is unclear where full-text results appear, how users reach filters, or whether matching message text opens the correct conversation position. “Recent first” can also bury an exact match beneath weak recent matches.  
   **Fix:** Define the palette as a compact entry point with “Search all results.” Give the results view snippets, source/project labels, filters, pagination and exact destination links. Rank relevance first, using recency as a tie-breaker; define zero-query recents separately.

6. **[med] The aggregation option can violate the independent-loading guarantee.**  
   **Reference:** “each card loads independently” versus “one `GET /home` aggregate.”  
   **Why it matters:** A response that waits for every source lets a slow provider or Hermes request delay every card. The state sequence also omits successful-empty results and stale data after an event-stream disconnect.  
   **Fix:** Choose per-card queries or an aggregate with bounded source timeouts and per-section data/error/freshness fields. Keep available data visible during refresh, retry only the failed section, and specify recovery after missed events. Reference the shared empty/offline states in spec 14.

7. **[med] The glance-page hierarchy is left to an ambiguous mockup reference.**  
   **Reference:** “A glance page, not a place to work” followed by eight cards.  
   **Why it matters:** No rule establishes which information dominates. Hermes’s current card appears twice, and five Inbox items, five schedules, activity, findings and provider meters can create competing focal points. The Home prompt in [stitch-prompts.md](docs/design/stitch-prompts.md) describes a different six-card arrangement without Needs you or Board snapshot.  
   **Fix:** Make this document authoritative for composition. Put urgent decisions first, keep Quick ask compact, and group background status below. Show Hermes’s current work once, with a board link. Set row limits and “View all” links rather than giving every module equal visual weight.

8. **[med] Spacing, typography and responsive density lack a Home-specific contract.**  
   **Reference:** Home card list and “Recent projects and files.”  
   **Why it matters:** Spec 14 supplies a grid but no Home spans, row geometry or text hierarchy. The existing [Overview.tsx](src/pages/Overview.tsx) is a navigation-card shell; its automatic grid cannot establish the intended operational hierarchy. Long paths and cron strings could squeeze titles and action labels.  
   **Fix:** Specify desktop/tablet/phone arrangements and reading order. A concrete starting point is 24px page title, 16px card headings, 14px row text, 12–13px metadata, 16–20px panel padding and 16px gutters. Prioritise task names and readable next-run times; make raw cron secondary, label timezone, and define path truncation with access to the full value.

9. **[med] Glass accessibility rules exist, but Home and palette acceptance never exercise them.**  
   **Reference:** Acceptance criteria cover only timing and card creation.  
   **Why it matters:** Spec 14 already requires contrast, reduced motion and solid fallbacks. This document does not verify them with dense rows, selected search results, focus rings or an overlay above another glass surface. Multiple shimmering cards and streamed updates could also make the glance page visually restless.  
   **Fix:** Add acceptance checks over the brightest glow and layered palette background: at least 4.5:1 for normal text and 3:1 for essential control/state indicators. Check readable opaque/no-blur and increased-contrast modes. Under reduced motion, use static skeletons and status marks; reserve layout space and avoid animated row reordering.

10. **[med] Keyboard-first access is incomplete, particularly on Windows.**  
    **Reference:** “Command palette (⌘K)” and “executes on Enter.”  
    **Why it matters:** The project runs on Windows, while the spec names only the Mac shortcut. Generic ARIA guidance in spec 14 does not define this component’s focus, selection or dismissal behavior.  
    **Fix:** Specify Ctrl+K on Windows/Linux and Cmd+K on macOS, plus a visible trigger. Define arrow navigation, announced active results, Escape dismissal, focus containment/restoration and IME-safe Enter handling. Preserve access when the phone keyboard is open.

11. **[med] Usage bars imply measurements that providers may not supply.**  
    **Reference:** Subscriptions: “per provider state and usage bar.”  
    **Why it matters:** [03-connections-and-routing.md](docs/specs/03-connections-and-routing.md) permits meters only where providers expose usage. An invented or stale percentage would misrepresent remaining capacity.  
    **Fix:** Make the meter conditional. Display the measured window, reset time and freshness when available; otherwise show “Usage unavailable” with explicitly labelled local run counts. Unknown usage must not appear as an empty or zero-percent bar.

12. **[med] Quick ask lacks the handoff details needed to prevent lost or misrouted prompts.**  
    **Reference:** “input plus model chip, sends into Chat”; palette action “Switch model.”  
    **Why it matters:** The document does not identify the destination conversation, effort, project, tools or scope of model changes. Navigation, provider disconnection or a double submission could lose the draft or create duplicate runs.  
    **Fix:** Define Quick ask as creating a new conversation with visible model/effort and explicit context defaults. Preserve the draft until submission succeeds, suppress duplicate sends and provide a recoverable failure state. Specify whether palette model changes affect the current conversation or the next new chat.

13. **[low] Performance targets are not reproducible acceptance criteria.**  
    **Reference:** “Home renders in under 1 second” and “⌘K opens in under 100 ms.”  
    **Why it matters:** Rendering skeletons and rendering useful local data are different outcomes. Neither target specifies cold/warm state, dataset size, hardware or percentile, and neither tests search quality.  
    **Fix:** Define separate timing points for shell, first useful data and palette interaction, with a representative dataset and test environment. Add acceptance cases for partial failure, stale approvals, exact-match retrieval, indexed file content and keyboard-only card creation.