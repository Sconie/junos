1. **[high] Folder allowlisting does not define an enforceable access boundary.**  
   **Reference:** § Sources: “allowlist; nothing else is ever indexed”; § Indexing: watcher exclusions.  
   **Why it matters:** Symlinks, Windows junctions, overlapping roots, and files moved during a read can escape a path-based check. The spec also leaves unclear whether exclusions govern previews, attachments, and agent reads, or only indexing.  
   **Fix:** Require daemon-side canonical-path checks for every file operation, define link handling, and apply the same exclusion policy to discovery, indexing, previews, and attachments. Add acceptance cases for junction escapes, overlapping roots, and excluded descendants.

2. **[high] Background AI processing has an ambiguous consent contract.**  
   **Reference:** § Indexing: “AI summary and tags per file via a cheap model”; § Privacy: content is sent only when attached or read by an enabled workflow.  
   **Why it matters:** Folder tagging is not explicitly identified as such a workflow, summaries lack their own consent rule, and “local embedding model preferred” permits an unspecified remote alternative. Provider fallback in spec 03 could also change who receives private content.  
   **Fix:** Separate local indexing, remote summaries/tags, and remote embeddings into explicit permissions. Show provider, scope, and budget before enabling each; pause rather than silently changing the approved destination.

3. **[high] Revoking folder access does not revoke indexed copies.**  
   **Reference:** § Indexing: FTS5 text, summaries, embeddings, content-hash cache; § Acceptance: “Excluded paths never appear in the index.”  
   **Why it matters:** Removing a folder or changing `.junosignore` could leave searchable text and derived content behind. Spec 02 also backs up the database for 14 days, extending retention beyond the visible index.  
   **Fix:** Define removal and exclusion-change behavior: cancel queued processing, remove search entries and derived caches, and immediately hide revoked content from every search surface. Explain backup retention and distinguish index removal from deletion of previously attached chat content.

4. **[high] File previews introduce an unspecified untrusted-content boundary.**  
   **Reference:** § File browser: “Preview pane renders markdown, images, PDFs, code.”  
   **Why it matters:** Markdown can contain active HTML or tracking images; SVG and PDF previews need deliberate handling. Opening a local document should not unexpectedly execute content or contact external servers. Spec 12’s prompt-injection rules do not define renderer safety.  
   **Fix:** Require sanitized markdown, escaped code, restricted URL schemes, blocked remote resources by default, and isolated document viewers. Bound preview size and rendering time; provide a safe unsupported-file state.

5. **[high] “Open in Chat” and “Give to Hermes” leave access and disclosure scope undefined.**  
   **Reference:** § Project entity: “sets `cwd` and context”; § Open questions: “Read-only first?”  
   **Why it matters:** Setting a working directory does not define which files are attached or which files a CLI may read. Hermes may run elsewhere—explicitly unresolved in spec 06—and spec 12 requires code edits to use a branch/worktree. “Read-only” therefore promises little while execution scope remains unspecified.  
   **Fix:** Settle read-only browsing for the first release. Define handoffs using project identity, selected files, approved root, execution directory/worktree, and destination. Show the attachment set and provider before sending; require an explicit transfer policy for remote Hermes.

6. **[med] The example PDF search exceeds the defined extraction pipeline.**  
   **Reference:** § Indexing: “FTS5 text for text files” versus “PDFs from last week about the API.”  
   **Why it matters:** PDF previewing does not establish searchable PDF text. The example could return nothing unless summaries, extraction, or filename matching happen to supply the topic. “Last week” also lacks a defined date field and timezone.  
   **Fix:** Either include bounded PDF text extraction or qualify the supported search types. Display interpreted filters—such as PDF, modified date, and date range—and distinguish filename, content, and semantic matches.

7. **[med] Modification time alone cannot support reliable index freshness.**  
   **Reference:** § Indexing: “Re-index only on mtime change”; § Acceptance: content search “within a second.”  
   **Why it matters:** Deletes, renames, missed watcher events, and replacements preserving timestamps can leave stale results. The one-second criterion conflates initial crawling, extraction, indexing delay, and query latency across folders of unlimited size.  
   **Fix:** Specify initial scanning, rename/delete handling, restart reconciliation, and recovery from watcher failure. Separate query latency from indexing freshness, with a stated corpus size, file-size limit, and indexing-complete condition.

8. **[med] Background processing is described as cheap without a bounded workload.**  
   **Reference:** § Indexing: Stage 1 “always, cheap”; Stage 2 “background, budget-limited.”  
   **Why it matters:** Large trees, network folders, generated text, and repeated edits can consume disk, CPU, and subscription capacity. Spec 03 protects shared subscription limits, but this spec does not say how indexing joins that budget.  
   **Fix:** Define supported root types, size/count limits, worker concurrency, debounce behavior, cancellation, and pause/resume. Route AI jobs through the shared usage guard; expose progress, skipped files, and the reason processing paused.

9. **[med] The first release has no clear feature boundary.**  
   **Reference:** §§ Project entity, File browser, Indexing; only Cloud is explicitly marked v2.  
   **Why it matters:** Git enrichment, PR retrieval, activity charts, linked work objects, two browser views, four preview formats, natural-language search, AI tagging, and embeddings form several deliverables. Roadmap Phase 4 includes them without a Files-specific completion gate; the current `Files.tsx` is only an empty shell.  
   **Fix:** Define an initial slice: add/remove local roots, detect repositories, browse a list, preview supported text, search locally, and attach a selected file. Sequence enrichment, grid view, semantic search, and additional preview formats separately. Keep Cloud absent until available.

10. **[med] Browser hierarchy and density are left to implementation guesswork.**  
    **Reference:** § File browser: tree, list/grid, five columns, preview, and an input; § Project entity: activity and linked objects.  
    **Why it matters:** The Stitch prompt additionally places project cards above the browser. Combined, these compete with finding and selecting a file, especially beside the 360–420 px drawer described in spec 14. No pane widths, collapse rules, or filename-priority rules resolve that competition.  
    **Fix:** Make file results the dominant region, with a collapsible tree and optional preview. Use one consistent gutter, a defined row density, and restrained metadata typography. Keep filenames and distinguishing paths readable; move secondary project activity into details. Specify tablet pane collapse and phone list-to-preview navigation.

11. **[med] Glass accessibility requirements are inherited but not made testable for this surface.**  
    **Reference:** § File browser, read with spec 14’s glass contrast, fallback, and motion rules.  
    **Why it matters:** Small paths, AI tags, syntax colours, selection fills, and focus indicators can lose distinction over atmospheric glow. A general text-contrast rule does not establish usable selected, hovered, and focused rows or readable document previews.  
    **Fix:** Add Files-specific acceptance cases: text at least 4.5:1 across the brightest supported backdrop, necessary control/focus indicators at least 3:1 against adjacent colours, and selection identifiable without colour alone. Define opaque preview surfaces/fallbacks, increased-contrast behavior, and reduced-motion versions of pane transitions and indexing feedback.

12. **[med] Essential navigation, setup, and failure states are missing.**  
    **Reference:** § Acceptance criteria covers only successful indexing and chat handoff; § File browser defines no keyboard behavior.  
    **Why it matters:** Spec 14 explicitly expects keyboard behavior in each screen spec. Users otherwise lack a defined path through folder setup, tree navigation, selection, preview, and attachment—or recovery from an inaccessible root, failed preview, disconnected model, or empty search.  
    **Fix:** Specify an **Add folder** first-run action; distinct indexing, no-results, unavailable-root, and preview-error states; retry/remove controls; and provider-aware send states. Define arrow-key tree navigation, separate focus and selection, keyboard-accessible row actions, preview close/focus return, and preserved selection/scroll position.