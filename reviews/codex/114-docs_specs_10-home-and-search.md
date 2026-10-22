1. **[high] Inline approvals conflict with Home’s summary role and the shared safety contract.**  
   **Reference:** §Home: “top 5 Inbox items … with inline Approve/Deny”; Rev 2: “the Inbox is the authority for decisions.”  
   **Why it matters:** Compact rows could expose approval controls without the exact action, target, expiry and irreversible consequences required by specs 07, 12 and 14. SSE updates could also move a different approval beneath the pointer.  
   **Fix:** Make Home rows open the authoritative Inbox detail. If inline decisions remain, require the shared ApprovalCard in an expanded detail view, refresh status before enabling controls, and freeze ordering during interaction.

2. **[high] Quick ask leaves its send context undefined.**  
   **Reference:** §Home: “input plus model chip, sends into Chat.”  
   **Why it matters:** It is unclear whether this navigates with a draft or immediately submits, creates a conversation or reuses one, and inherits project files or history. Those choices determine what private context reaches which provider. Rev 2 explicitly applies spec 04’s disclosure to the palette, but leaves this entry point ambiguous.  
   **Fix:** Specify a new conversation with no inherited attachments/history, a visible provider/model/effort selection, and disclosure before transmission. Define whether Enter sends or opens a draft; preserve the input on failure.

3. **[med] Per-card status does not guarantee independent loading.**  
   **Reference:** §Home rules and Rev 2: one `GET /home`, per-card `status` and `as_of`, “no card may block the others.”  
   **Why it matters:** A single response can still wait for the slowest provider or remote Hermes request. A finished response containing individual statuses does not resolve that bottleneck.  
   **Fix:** Define `/home` as a bounded read of locally cached snapshots, with background refreshes delivered through SSE, or choose independent card queries. Include a test where one source hangs while other cards become usable.

4. **[med] Global search excludes the file contents that the Files spec promises to search.**  
   **Reference:** §Global search: “file names and file summaries.”  
   **Why it matters:** Spec 11’s Stage 1 indexes text-file contents and requires finding a file by content. Under this wording, global search can miss a matching file unless optional AI summarisation has run.  
   **Fix:** Include allowlisted text-file contents in FTS search independently of summaries and embeddings. Explicitly inherit spec 11’s query-time exclusions and revocation behaviour.

5. **[med] Palette navigation, actions and provider sends lack a safe selection model.**  
   **Reference:** §Command palette: “executes on Enter”; “Ask \<current model\>” as the last row.  
   **Why it matters:** Rev 2 requires an explicit Ask action, but does not define the initial selection or what happens when asynchronous results change. Enter could activate a different row than the user expected. “Run workflow” also needs the parameter and dry-run form defined in spec 05.  
   **Fix:** Separate navigation from action results visually; preserve selection by stable identity; never automatically select Ask. Enter on a workflow opens its launch form. Define the in-place New card form, validation and cancellation required by the acceptance criterion.

6. **[med] The eight-card inventory has no visual priority or density budget.**  
   **Reference:** §Home: “A glance page … Greeting and date, then cards (from the mockup).”  
   **Why it matters:** Approvals, routine schedules, subscription meters and recent files receive no specified relative emphasis. Hermes’s current card is duplicated in Board snapshot. The cited mockup cannot resolve this: spec 00 says the designs are absent and the Stitch prompts are historical.  
   **Fix:** Specify column spans and reading order: Needs you leads when actionable; Quick ask stays compact; operational summaries follow; subscriptions and recents recede. Give the current Hermes assignment one primary location. Define card padding, gaps, row heights, overflow links and the single-column order below 900 px.

7. **[med] Typography and long-content behaviour remain unspecified.**  
   **Reference:** §Home’s cron expressions, action feeds and file lists; §Global search results.  
   **Why it matters:** Spec 14 names font families but supplies no Home type scale. Long paths, task names and snippets can force uneven rows or shrink metadata until the glass dashboard becomes difficult to scan.  
   **Fix:** Establish a compact scale—for example, 24 px page title, 16 px card headings, 14 px rows and 12 px metadata—with explicit line heights. Use tabular numerals for changing times/counts, monospace selectively, and defined wrapping/truncation with keyboard-accessible full text.

8. **[med] Glass legibility and live-update motion lack surface-specific acceptance checks.**  
   **Reference:** §Acceptance criteria; §Home’s skeletons and SSE updates.  
   **Why it matters:** Spec 14 already requires contrast checks, reduced motion and opaque fallbacks. This document does not verify them with dense Home content, the palette over underlying cards, or rapidly updating feeds. Token-pair checks alone do not demonstrate contrast over composited glass.  
   **Fix:** Require rendered checks over the brightest allowed backdrop and overlay combinations: 4.5:1 for normal text and 3:1 for necessary control boundaries/focus indicators. Reserve skeleton dimensions, avoid animated reordering and entrance effects, and verify static loading indicators and legible opaque states under the existing accessibility preferences.

9. **[med] Search has no defined entry point or result interaction.**  
   **Reference:** Separate §Command palette and §Global search sections.  
   **Why it matters:** The palette promises fuzzy entity matching; search promises full-text matching and filters. It is unclear whether these share a field, how users switch modes, or whether Enter navigates or executes. “Recent first” can bury an exact match beneath recent weak matches.  
   **Fix:** Define the relationship between both surfaces. Specify exact-match/relevance ranking before recency, labelled result types, snippets, bounded result groups, loading/no-results/error states, and destination behaviour. Define project-filter membership for findings and Inbox items through their linked sources.

10. **[med] Keyboard requirements omit the actual host platform and modal behaviour.**  
    **Reference:** §Command palette and §Acceptance criteria specify only `⌘K`.  
    **Why it matters:** The planned first host is Windows. Spec 14’s generic ARIA requirement does not define palette focus, dismissal or result announcements.  
    **Fix:** Require Ctrl+K on Windows/Linux and ⌘K on macOS, with a visible opener. Specify arrow navigation, Escape, focus containment/restoration, accessible result announcements and keyboard operation of filters and creation forms.

11. **[low] Subscription bars imply measurements that providers may not expose.**  
    **Reference:** §Home: “per provider state and usage bar.”  
    **Why it matters:** Spec 03 explicitly permits unavailable meters. An empty bar can misleadingly imply zero usage or full capacity.  
    **Fix:** Reuse spec 03’s connection enum. Show a percentage bar only with a known limit, period and timestamp; otherwise show “Usage unavailable,” local run counts and the last known rate-limit information.

12. **[low] Performance targets are ambiguous, and search has no acceptance criteria.**  
    **Reference:** §Acceptance criteria: Home under one second; palette under 100 ms.  
    **Why it matters:** Painting skeletons could satisfy “renders” without delivering useful data; an instantly opened palette could still have unusably slow results. Corpus size, cold/warm state and measurement boundaries are unspecified.  
    **Fix:** Separate shell paint, usable cached cards, palette opening and first-result latency. Set representative hardware/corpus conditions and a percentile target. Add search checks for content matches, filters, excluded/revoked files, malformed queries and unavailable semantic indexing.