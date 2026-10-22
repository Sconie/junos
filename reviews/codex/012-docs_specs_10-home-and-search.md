1. **[high] Inline approval lacks the information required for informed consent.**  
   **Reference:** Home: “top 5 Inbox items … with inline Approve/Deny.”  
   **Why it matters:** [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires approvals to show the exact command/diff. A compact Home row could authorize an external or destructive action without showing its scope. Approvals can also expire while displayed.  
   **Fix:** Require an expandable review showing command/diff, project, destination and consequences before enabling Approve. Revalidate pending status server-side, prevent duplicate submissions, and show expired or already-resolved outcomes.

2. **[high] The palette blurs local search and sending data to a model.**  
   **Reference:** Command palette: typing a sentence offers “Ask \<current model\>”; results “execute on Enter.”  
   **Why it matters:** Sentence-shaped text can be a private search query. The spec does not define default selection or whether asynchronous results can change it, creating a risk of unintended submission. File privacy in [11-files-and-projects.md](docs/specs/11-files-and-projects.md) depends on intentional attachment.  
   **Fix:** Keep typing and searching local. Make Ask an explicitly selected action with a visible provider/model destination; never attach search results automatically. Preserve selection identity when results update.

3. **[med] Independent loading is not guaranteed by the proposed aggregate API.**  
   **Reference:** Home rules: “one `GET /home` aggregate or per-card queries”; “no card may block the others.”  
   **Why it matters:** An aggregate that waits for every source delays all cards behind the slowest dependency. Independent React skeletons cannot resolve that server-side dependency.  
   **Fix:** Choose per-card queries, or specify a cached aggregate with per-section status and bounded deadlines. Keep provider and Hermes probes outside the initial response; include timestamps and retry only the failed section.

4. **[med] Eight unrelated cards have no visual priority or layout contract.**  
   **Reference:** Home: “Greeting and date, then cards (from the mockup).”  
   **Why it matters:** Approvals compete with subscription meters and recent files. Hermes’s current card appears twice. The existing [Overview.tsx](src/pages/Overview.tsx) and auto-fill grid in [index.css](src/index.css) provide an equal-card template, which would amplify this hierarchy problem.  
   **Fix:** Specify a dominant Needs you region, compact Quick ask, and secondary operational summaries. Show the current assignment once. Define desktop spans, 16–24px gaps, consistent padding, and a restrained type scale—for example 24px title, 16px section headings, 14px rows, 12px metadata. Preserve the chosen glass direction while avoiding decorative icons, oversized greetings and equally prominent panels.

5. **[med] Global search omits a promised search corpus and leaves filters ambiguous.**  
   **Reference:** Global search: “file names and file summaries”; filters “type, project, date.”  
   **Why it matters:** Spec 11 promises Stage 1 full-text file-content search; summaries are optional. Following this document literally could make file contents undiscoverable until AI summarization is enabled. “Type” could mean entity kind or file format, and “date” has different meanings across entities.  
   **Fix:** Include allowlisted text-file contents explicitly. Distinguish entity kind from file format, define the date field per entity, and specify project associations and treatment of unscoped results. Include snippets and links to the matching message or file location.

6. **[med] Search does not inherit exclusion and deletion rules explicitly.**  
   **Reference:** Global search’s cross-entity index.  
   **Why it matters:** Spec 11 excludes secrets and non-allowlisted paths, but this document does not say what happens to search copies, snippets or cached results when a folder is removed or an exclusion changes. Sensitive content could remain discoverable after access is withdrawn.  
   **Fix:** Require search to honor current source eligibility, purge derived index entries when eligibility changes, and recheck eligibility when opening a result. Add acceptance coverage for excluded, removed and deleted sources.

7. **[med] Responsive behavior and capped-list navigation are undefined.**  
   **Reference:** Home’s five-item and three-item lists; “Recent projects and files.”  
   **Why it matters:** Eight panels can become a long mobile stack that buries decisions. Spec 14 folds navigation below 900px but does not establish Home’s content order. Without totals or View all links, capped lists can also look complete.  
   **Fix:** Define a single-column priority order with Needs you first, explicit totals and View all destinations, bounded previews, and wrapping rules for long titles. Specify 44px touch targets and prevent page-level horizontal scrolling.

8. **[med] Palette interaction is too underspecified for a keyboard-first feature.**  
   **Reference:** “Command palette (⌘K)” and “executes on Enter.”  
   **Why it matters:** This project runs on Windows, yet Ctrl+K is absent. Focus behavior, Escape, arrow navigation, screen-reader announcements and the relationship between fuzzy navigation and full-text search are undefined. “New card without leaving the page” also has no creation flow.  
   **Fix:** Specify Ctrl+K/⌘K plus a visible trigger, an accessible dialog/combobox pattern, stable keyboard selection and focus restoration. Define how users enter full search and how New card opens a validated inline form or drawer.

9. **[med] Subscription bars assume measurements that may not exist.**  
   **Reference:** Home: “per provider state and usage bar.”  
   **Why it matters:** [03-connections-and-routing.md](docs/specs/03-connections-and-routing.md) allows usage meters only where providers expose them. Local run counts cannot establish remaining subscription capacity; a speculative bar would mislead scheduling decisions.  
   **Fix:** Show a bar only with a known numerator, denominator, measurement window and timestamp. Otherwise show “Usage unavailable” and separately labelled local run counts, alongside connection state.

10. **[med] Quick ask has no defined handoff or recovery behavior.**  
    **Reference:** Home: “input plus model chip, sends into Chat.”  
    **Why it matters:** It is unclear whether submission creates a conversation or resumes one, which effort and project context apply, and what happens if navigation or provider access fails. Spec 04 remembers model choice per conversation, while Home has no conversation yet.  
    **Fix:** Define Quick ask as creating a new conversation with visible model/effort and explicit context defaults. Submit once, preserve the draft on failure, navigate to the created thread, and reuse Chat’s disconnected-provider behavior.

11. **[med] Acceptance criteria do not bound the feature’s scope or prove its promises.**  
    **Reference:** Acceptance criteria: Home under one second; palette under 100ms; inline card creation.  
    **Why it matters:** The document combines eight integrations, entity navigation, actions, fuzzy matching, full-text search and semantic search. The two checks omit search correctness and leave timing undefined—an empty skeleton could satisfy “renders.” Home rules also omit empty, stale and disconnected states required by spec 14.  
    **Fix:** Separate minimum delivery from optional semantic search. Define timing endpoints, representative dataset size and cold/warm conditions. Add checks for useful Home data appearing, a slow/failed dependency, stale data after reconnect, empty sections, search/filter correctness, and successful inline creation.