1. **[high] The allowlist is not defined as an enforceable boundary.**  
   **Reference:** §Sources: “nothing else is ever indexed”; §Indexing; §Privacy.  
   **Why it matters:** The spec does not constrain repo discovery to added folders or explain symlinks, Windows junctions, overlapping roots, and case-insensitive paths. A folder inside an allowed root could resolve outside it. Exclusions are described for indexing but not preview, attachment, or handoff.  
   **Concrete fix:** Require daemon-side canonical-path checks for every discovery, read, preview, and handoff. Define linked-path behavior, restrict repo discovery to allowed roots, and apply the same exclusion policy throughout.

2. **[high] Background enrichment has an incomplete consent contract.**  
   **Reference:** §Indexing: “AI summary and tags … via a cheap model”; “local embedding model preferred”; §Privacy: “only sent … when Jonas attaches it or a workflow he enabled reads it.”  
   **Why it matters:** Per-folder tagging consent does not clearly authorize summaries or remote embeddings. “Preferred” permits an unspecified remote fallback. Search-query interpretation could also send private filenames or query text elsewhere.  
   **Concrete fix:** Define separate permissions for local indexing and remote enrichment. Before enabling remote processing, show the provider, transmitted fields, folder scope, and budget. Prohibit silent remote fallback and require renewed consent when the destination changes.

3. **[high] Removing access does not remove indexed private content.**  
   **Reference:** §Indexing: “summaries cached by content hash”; §Acceptance: “Excluded paths never appear in the index.”  
   **Why it matters:** There is no behavior for removing a folder, adding an ignore rule, disabling enrichment, or deleting a file. Content can survive in FTS, summaries, embeddings, and caches; [02-data-model.md §Backups](E:/AI/review-loop/junos/docs/specs/02-data-model.md:47) also retains database copies. The acceptance criterion only addresses what initially enters the index.  
   **Concrete fix:** Specify immediate search removal and cancellation of queued enrichment when access is revoked. Purge derived content and caches, explain backup retention, and distinguish removable index data from attachments already saved in conversations.

4. **[high] File previews introduce an unspecified content-execution boundary.**  
   **Reference:** §File browser: “Preview pane renders markdown, images, PDFs, code.”  
   **Why it matters:** Markdown can contain unsafe HTML and remote tracking images; document viewers can expose links, embedded actions, or expensive malformed content. Merely selecting a local file should not trigger network requests or execute content. This is directly relevant to the untrusted-file threat in [12-security-and-privacy.md](E:/AI/review-loop/junos/docs/specs/12-security-and-privacy.md:27).  
   **Concrete fix:** Require sanitized markdown, escaped code, disabled active document content, blocked remote resources by default, safe link handling, and bounded preview size/work. Define an explicit unsupported-file state.

5. **[high] Project selection, file attachment, and agent authority are conflated.**  
   **Reference:** §Project entity: “Open in Chat (sets `cwd` and context), Give to Hermes”; §Open questions: “Read-only first?”  
   **Why it matters:** Setting a working directory does not define what a CLI may read or modify. “Context” could mean project metadata, selected files, or the entire folder. [06-hermes.md](E:/AI/review-loop/junos/docs/specs/06-hermes.md:27) permits writes in Balanced mode, while [12-security-and-privacy.md](E:/AI/review-loop/junos/docs/specs/12-security-and-privacy.md:32) expects code work in a branch/worktree. Hermes’s machine location is also unresolved.  
   **Concrete fix:** Settle the browser as read-only and define each handoff payload, recipient, readable scope, and effective write policy. Show the selected files before sending. Specify worktree resolution for code runs and reject unsupported remote-path handoffs with an actionable explanation.

6. **[med] The PDF search example promises a capability the indexing stages do not supply.**  
   **Reference:** §Indexing: “FTS5 text for text files” versus “PDFs from last week about the API.”  
   **Why it matters:** Finding PDFs by subject requires extracted PDF text, summaries, or equivalent content metadata. Neither PDF extraction nor OCR is specified. “Last week” also lacks a defined date field and timezone. Global search in [10-home-and-search.md](E:/AI/review-loop/junos/docs/specs/10-home-and-search.md:22) names filenames and summaries rather than file-body text.  
   **Concrete fix:** Define one search contract shared with global search: indexed formats, PDF extraction support, scanned-document limitations, date semantics, and behavior without enrichment. Show interpreted filters as editable chips.

7. **[med] Modification time alone is insufficient for index correctness.**  
   **Reference:** §Indexing: “Re-index only on mtime change.”  
   **Why it matters:** Files can change while retaining timestamps; watcher events can be missed during daemon downtime. Rename, deletion, atomic replacement, and changed ignore rules also require updates without a straightforward mtime change. This can produce stale answers or retain excluded content.  
   **Concrete fix:** Specify startup reconciliation, create/change/delete/rename handling, policy-change invalidation, and hash verification when metadata is ambiguous. State how an index recovers from interrupted scans.

8. **[med] The scope and performance criterion are not bounded enough to implement or verify.**  
   **Reference:** §Project entity, §File browser, §Indexing; §Acceptance: “Add a folder … search finds a file by content within a second.”  
   **Why it matters:** This combines repo enrichment, multiple preview engines, two browsing modes, semantic search, AI tagging, and cross-feature links without a delivery boundary. The timing criterion conflates initial indexing with query latency and gives no corpus size or readiness condition. [13-roadmap.md](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:26) groups this work into Phase 4 without further subdivision.  
   **Concrete fix:** Define a first slice—folder management, basic project detection, list browsing, text indexing, safe previews, explicit attachments—and mark later enrichment separately. Measure query latency against a stated corpus after indexing completes; specify scan progress, cancellation, and resource limits.

9. **[med] The screen has no defined primary hierarchy or workable pane geometry.**  
   **Reference:** §Project entity lists four actions; §File browser combines a tree, five-column browser, grid mode, preview, and composer.  
   **Why it matters:** The spec leaves competing project and file tasks at equal weight. At narrower desktop widths, the tree and [14-ui-system.md’s 360–420px drawer](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:25) can squeeze filenames into the remaining space. The current [Files.tsx](E:/AI/review-loop/junos/src/pages/Files.tsx:5) is only a two-panel placeholder, so it supplies no established interaction model.  
   **Concrete fix:** Make finding and selecting a file the dominant task. Put scope and search above the list; keep secondary project actions in contextual menus. Specify collapsible/resizable panes, minimum list width, and the breakpoint where preview becomes a separate sheet with preserved selection and scroll position.

10. **[med] Density, spacing, and typography are unspecified for long filenames and metadata.**  
    **Reference:** §File browser: “columns: name, project, size, modified, AI tags.”  
    **Why it matters:** Long paths and multiple tags can overwhelm file identity or create irregular row heights. There are no column priorities, spacing rules, text sizes, or overflow rules. Grid mode has no defined purpose for code and document collections.  
    **Concrete fix:** Specify a consistent row pitch, padding, and text hierarchy—for example, 44–48px rows, 14px filenames, and 12–13px metadata. Give the name column flexible width, preserve extensions when truncating, expose full paths accessibly, right-align tabular sizes, and cap visible tags. Define grid mode primarily for visual previews.

11. **[med] Glass execution lacks file-specific legibility and motion acceptance checks.**  
    **Reference:** §File browser and §Acceptance; cross-check [14-ui-system.md](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:22).  
    **Why it matters:** The shared UI rules establish contrast and fallbacks, but this screen places dense metadata, code, thumbnails, and potentially bright PDF pages beside translucent surfaces. The spec does not define how those backgrounds affect text, selection, focus, or blur layering.  
    **Concrete fix:** Require contrast checks over the brightest atmosphere and representative preview content: at least 4.5:1 for normal text and 3:1 for essential control indicators. Give documents a stable reading surface within the glass shell. Verify opaque/high-contrast fallbacks, distinguish selection from focus beyond colour, and prohibit animated blur or glow; reduced-motion mode should remove nonessential transitions.

12. **[med] Keyboard behavior and recoverable operational states are missing.**  
    **Reference:** §File browser and §Acceptance; [14-ui-system.md](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:30) requires screen states and a keyboard list in each spec.  
    **Why it matters:** There is no defined keyboard path through tree, results, preview, and composer, nor behavior for inaccessible folders, missing files, indexing errors, disconnected providers, or stale Git metadata. An empty result could mean “no match,” “not indexed yet,” or “excluded.”  
    **Concrete fix:** Specify tree arrow navigation, result selection, separate preview and attach actions, Escape/back behavior, and focus restoration. Add distinct first-run, scanning, no-results, partial-index, permission-error, and unavailable-preview states with local retry actions. Make “Add folder” the first-run action.

13. **[low] Project-derived indicators lack meaningful definitions and provenance.**  
    **Reference:** §Project entity: “last_activity_at,” “language mix,” “14-day activity sparkline,” and linked objects; §Sources: “open PRs via `gh`.”  
    **Why it matters:** “Activity” could mean commits, filesystem edits, or JunOS interactions. A quiet repository may appear abandoned despite active uncommitted work. Missing GitHub authentication could look like zero PRs. Cross-feature relationships also lack an explicit source of truth.  
    **Concrete fix:** Define each metric’s source, time window, refresh policy, and unavailable state. Label any sparkline with what it counts and provide a textual equivalent. Keep these indicators secondary to project identity and the next action.