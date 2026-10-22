1. **[high] Inline approvals omit the evidence needed to approve safely.**  
   **Reference:** Home, “Needs you … inline Approve/Deny” (line 6).  
   **Why it matters:** A five-item summary can hide the command, affected files, destination, or diff. [Security §Approval policy](/E:/AI/review-loop/junos/docs/specs/12-security-and-privacy.md) requires approvals to show the exact command/diff. Items can also expire while Home remains open.  
   **Concrete fix:** Show a concise action summary and open an approval detail drawer before approval when the full evidence is unavailable inline. Bind the decision to the displayed action revision; reject expired, changed, or already-resolved requests. Keep pending decisions disabled until acknowledged and audit the result.

2. **[high] Global search does not define privacy boundaries or index removal.**  
   **Reference:** Global search, “across messages … file names and file summaries” (line 23).  
   **Why it matters:** Search creates another way to expose private content. The spec does not say what happens when a folder is excluded, a source is deleted, or a result is offered to a model. [Files §Privacy](/E:/AI/review-loop/junos/docs/specs/11-files-and-projects.md) limits model disclosure to explicit attachment or enabled workflows.  
   **Concrete fix:** Explicitly inherit folder allowlists and exclusions; remove excluded/deleted sources from search indexes and cached snippets. Keep queries and previews local by default. “Ask” must show exactly what text and attachments will leave the machine. Render snippets and highlights as escaped text.

3. **[high] “Executes on Enter” conflates navigation, creation, and agent execution.**  
   **Reference:** Command palette, actions and natural-language mode (lines 18–20).  
   **Why it matters:** A changing fuzzy-result list can turn a navigation attempt into a workflow launch or Hermes directive. “Ask” also sends content to a provider. [Tasks §Workflows launcher](/E:/AI/review-loop/junos/docs/specs/05-tasks-and-workflows.md) already requires a parameter form and dry-run option.  
   **Concrete fix:** Define execution per action: navigation opens the destination; creation opens a draft; workflows open their parameter form; Hermes opens a directive composer. Ask submits only through an explicitly selected Ask action. Preserve selection by result ID during updates, and require explicit submission of side effects.

4. **[med] The aggregate API option does not guarantee independent loading.**  
   **Reference:** Home rules, “one `GET /home` aggregate or per-card queries … no card may block the others” (line 14).  
   **Why it matters:** A conventional aggregate that awaits every dependency delays all cards behind the slowest one. Per-card retries and snapshot/event ordering are also undefined.  
   **Concrete fix:** Choose per-card queries, or specify that `/home` returns cached local snapshots with per-card status and freshness, without waiting for live providers. Define individual retries, stale-data display, and snapshot/event reconciliation so reconnects cannot overwrite newer data.

5. **[med] File-content search contradicts the file-index contract.**  
   **Reference:** Global search lists “file names and file summaries” and postpones semantic search (line 23).  
   **Why it matters:** [Files §Indexing and acceptance criteria](/E:/AI/review-loop/junos/docs/specs/11-files-and-projects.md) promises Stage 1 FTS over text-file content and finding a file by its content. Under this document, files without optional AI summaries may be undiscoverable by their contents.  
   **Concrete fix:** Include indexed text-file content in lexical search from Stage 1. Keep semantic search optional. Define which fields each result type searches and distinguish content matches from filename matches.

6. **[med] Eight cards have no hierarchy or density budget.**  
   **Reference:** “A glance page” followed by the eight-card inventory (lines 4–12).  
   **Why it matters:** Five Inbox rows, five upcoming tasks, activity, board counts, provider meters, and findings can become a wall of equally weighted glass panels. Hermes’s current card appears twice. The inherited 12-column grid does not establish reading order or narrow-screen priorities.  
   **Concrete fix:** Specify Needs you as the attention region, Quick ask as a compact entry point, and supporting summaries below. Show the current Hermes card once. Define desktop spans, row caps, “View all” counts, and narrow-screen order. Use consistent spacing—for example, 24px between sections and 16px within cards—with 16px section headings, 14–16px body text, and metadata at least 12px.

7. **[med] Glass requirements are inherited but never tested against this surface.**  
   **Reference:** Home’s dense rows and palette results; acceptance criteria (lines 26–27).  
   **Why it matters:** [UI system](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md) already requires contrast, reduced motion, and solid fallbacks. This spec supplies no checks for small metadata, selected results, focus indicators, or text over the brightest glow. Token colours alone cannot establish contrast over composited glass.  
   **Concrete fix:** Add checks over the brightest and darkest backdrop regions: 4.5:1 for normal text and 3:1 for essential control boundaries and focus indicators. Verify opaque/high-contrast and unsupported-blur states. Reserve skeleton dimensions, disable shimmer/pulsing under reduced motion, and prevent live updates from moving focused controls. Treat accent selection as open and validate its actual text, fill, and focus combinations.

8. **[med] Palette keyboard and assistive-technology behaviour is incomplete.**  
   **Reference:** “Command palette (⌘K)” and “executes on Enter” (lines 16–20).  
   **Why it matters:** The project runs on Windows, but only a Mac shortcut is named. Generic ARIA guidance in the UI system does not define focus restoration, selection, result announcements, or access without a keyboard.  
   **Concrete fix:** Specify Ctrl+K on Windows/Linux and ⌘K on macOS, plus a visible trigger. Define labelled dialog/combobox semantics, arrow-key navigation, Escape behaviour, focus restoration, loading/no-result announcements, and a viewport-bounded scrolling result list. State how ordinary text inputs and IME composition affect shortcuts.

9. **[med] Subscription bars imply measurements that providers may not expose.**  
   **Reference:** “Subscriptions: per provider state and usage bar” (line 10).  
   **Why it matters:** [Connections](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md) permits usage meters only where providers expose them; otherwise it shows local run counts and the last rate-limit response. A universal bar could imply invented remaining capacity.  
   **Concrete fix:** Make the meter conditional. Show its denominator, period/reset time, source, and freshness when known. Otherwise show “Usage unavailable” with local run counts; never represent unknown usage as an empty bar.

10. **[med] Quick ask has no reliable handoff contract.**  
    **Reference:** “input plus model chip, sends into Chat” (line 5).  
    **Why it matters:** It is unclear whether submission creates a new conversation, reuses one, or inherits project context and tools. Missing effort selection and disconnected-provider behaviour can make the visible chip disagree with the actual run.  
    **Concrete fix:** Define Quick ask as a new conversation using an explicit model/effort and stated context defaults. Reuse Chat’s provider-state and fallback behaviour. Preserve the prompt on failure, prevent duplicate submissions, and navigate to the conversation created by that submission.

11. **[med] Acceptance criteria leave most of the feature unverifiable.**  
    **Reference:** “Home renders in under 1 second” and “⌘K opens in under 100 ms” (lines 26–27).  
    **Why it matters:** “Renders” could mean an empty skeleton or useful data. Neither target names hardware, corpus size, cold/warm state, or percentile. There are no acceptance checks for search correctness, filters, indexing freshness, or unavailable dependencies.  
    **Concrete fix:** Define a representative fixture and environment, distinguish shell paint from useful-data readiness, and measure warm/cold timings separately. Add checks for file-content matches, filter semantics, exclusions, stale/deleted results, provider outages, and partial Home failure. Tie cards and palette actions to roadmap availability so unimplemented integrations show honest unavailable states.