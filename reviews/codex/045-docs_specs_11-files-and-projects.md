1. **[high] “Open in Chat” does not define the access it grants.**  
   **Reference:** §Project entity, §Acceptance criteria: “sets `cwd` and context”; “makes a CLI-backed model run with that directory as cwd.”  
   **Why it matters:** Selecting a directory, attaching its contents, and authorizing tool access are different actions. A CLI may read ignored files through its own tools even when JunOS excludes them from search. “Give to Hermes” also lacks a context boundary; spec 06 leaves Hermes’s machine location unresolved.  
   **Concrete fix:** Define separate permissions for indexing, model attachment, tool reads, and writes. Show the selected project, recipient, and attached files before submission. Enforce read boundaries in the runner, revalidate access at execution time, and disable remote handoff until an explicit transfer contract exists.

2. **[high] The allowlist promise lacks filesystem boundary rules.**  
   **Reference:** §Sources: “nothing else is ever indexed”; §Indexing: ignored directories and `.junosignore`.  
   **Why it matters:** Symlinks, Windows junctions, overlapping roots, and Git worktrees can lead outside the approved directory or create duplicate records. Repo auto-detection is not explicitly restricted to approved roots. Index-time filtering alone also leaves preview and attachment endpoints exposed.  
   **Concrete fix:** Require canonical-path containment for discovery, indexing, preview, attachment, and agent reads. Specify junction/symlink behavior, Windows case handling, overlapping-root deduplication, and rejection of paths outside approved roots. Apply exclusions before reading content.

3. **[high] Background AI processing conflicts with the privacy wording.**  
   **Reference:** §Indexing: “AI summary and tags per file via a cheap model”; §Privacy: content is sent only when attached or read by an enabled workflow; “AI tagging is opt-in per folder.”  
   **Why it matters:** Background summarization and embedding generation are additional model disclosures. Consent covers “tagging,” but not clearly summaries, embeddings, provider fallback, or natural-language query parsing. “Local embedding model preferred” permits remote processing without defining consent.  
   **Concrete fix:** Define folder-level consent covering each processing purpose and destination. Default embeddings to local processing; require explicit consent for remote processing or fallback. Show the provider and scope before enabling background enrichment, and make disabling it cancel queued jobs.

4. **[high] Removing access does not remove retained content.**  
   **Reference:** §Indexing: FTS5 text, summaries cached by content hash; §Acceptance criteria: “Excluded paths never appear in the index.”  
   **Why it matters:** There is no behavior for removing a folder, adding an ignore rule, deleting a file, or discovering a previously indexed secret. Content can remain in FTS, summaries, embeddings, previews, or backups. Spec 02’s nightly database backups extend that retention.  
   **Concrete fix:** Specify an exclusion/revocation transaction: stop queued work, immediately hide affected results, purge derived records and caches, and define backup retention. Explain separately that existing chat attachments and provider disclosures have their own retention. Test exclusion changes after indexing, not just before it.

5. **[high] File previews have no safe-rendering contract.**  
   **Reference:** §File browser: “Preview pane renders markdown, images, PDFs, code.”  
   **Why it matters:** File content is untrusted under spec 12. Markdown HTML, remote images, SVGs, and document links can introduce script execution or network requests. Large or malformed documents can also freeze the interface.  
   **Concrete fix:** Require sanitized Markdown with raw HTML disabled, inert code rendering, constrained image/PDF viewers, and blocked automatic remote resource loads. Define permitted link protocols, explicit external-link behavior, preview size/time limits, and a safe “preview unavailable” state.

6. **[med] The indexing lifecycle can silently return stale results.**  
   **Reference:** §Indexing: “Re-index only on mtime change; summaries cached by content hash.”  
   **Why it matters:** Renames, deletions, ignore changes, parser upgrades, and model changes need handling without an mtime change. Preserved timestamps can conceal content changes; content-hash caching alone can reuse summaries generated under obsolete instructions. Watcher outages have no recovery path.  
   **Concrete fix:** Define create/change/rename/delete processing, startup reconciliation, manual rebuild, and cache versioning by content hash plus parser/model/prompt version. Expose indexing freshness and failures rather than presenting stale results as current.

7. **[med] Search promises exceed the defined extraction and performance contract.**  
   **Reference:** §Indexing: “FTS5 text for text files”; example “PDFs from last week about the API”; §Acceptance criteria: content search “within a second.”  
   **Why it matters:** PDF body extraction is unspecified, so the example may only work through filenames or optional enrichment. The timing requirement does not distinguish initial scanning from querying an already-built index, or define corpus size and hardware.  
   **Concrete fix:** State supported searchable formats and whether PDFs receive text extraction; explicitly defer OCR if appropriate. Separate indexing progress from a benchmarked query target, with corpus size, hardware, and percentile latency. Label partial results while indexing.

8. **[med] The screen lacks a clear hierarchy and width budget.**  
   **Reference:** §Project entity’s derived information and actions; §File browser’s tree, six columns, grid view, and preview.  
   **Why it matters:** These are competing regions without a specified primary task. The related Stitch prompt adds project cards above the browser, further reducing working space. Spec 14 supplies a rail and drawer range, but does not resolve this screen’s layout near 900 px or at increased zoom.  
   **Concrete fix:** Make the file list the dominant workspace, with a compact project selector and an optional preview. Put activity and secondary project actions in project details. Define tree/list/preview minimum widths and collapse order; below the usable width, open preview as a sheet while preserving selection and scroll.

9. **[med] Typography, spacing, and filename legibility are left to implementation guesswork.**  
   **Reference:** §File browser: “columns: name, project, size, modified, AI tags.”  
   **Why it matters:** Long paths, repeated filenames, and variable tag counts can overwhelm the identity column. Global font-family tokens do not establish row density, line height, column priority, or truncation behavior.  
   **Concrete fix:** Specify a starting density—for example, 40–44 px rows, 14 px filenames, 12–13 px metadata, and consistent 16 px panel gutters. Give filenames most of the available width, preserve extensions when truncating, reveal/copy full paths through keyboard-accessible controls, right-align sizes with tabular numerals, and cap visible tags.

10. **[med] Glass execution needs measurable states and contrast tests.**  
    **Reference:** §File browser; inherited spec 14 requires 4.5:1 text contrast, solid fallbacks, reduced motion, and increased contrast.  
    **Why it matters:** The target does not apply those rules to selected rows, preview content, focus, or indexing feedback. Contrast changes with the atmospheric background. As a reference calculation, violet `#8B5CF6` on Stitch’s `#14161B` surface is approximately **4.27:1**, below the normal-text target.  
    **Concrete fix:** Define distinct hover, selection, and focus treatments, then test their composited colors over the brightest glow and in opaque fallback mode. Keep glows static and disable shimmer/transitions under reduced motion. An optional blue accent, `#78B7FF`, offers **8.63:1** against `#14161B` and separates actions from teal health states; dark `#0B0C0F` button text gives **9.33:1** on that blue. Actual glass combinations still need measurement.

11. **[med] Keyboard and recovery behavior are unspecified for the core workflow.**  
    **Reference:** §File browser; spec 14 explicitly says keyboard shortcuts belong in each screen spec.  
    **Why it matters:** A tree, selectable list, preview, and composer need coordinated focus behavior. Generic loading/error components do not explain permission loss, moved files, unsupported previews, unavailable AI tags, or indexing-in-progress results.  
    **Concrete fix:** Specify tree arrow-key navigation, list selection, explicit attachment/send actions, preview focus entry/return, and Escape behavior. Announce search/index status accessibly. Define feature-specific recovery states that preserve the query, selected file, and draft question.

12. **[med] The initial release boundary remains too broad and partly unresolved.**  
    **Reference:** §§Sources–Indexing combine Git/PR enrichment, activity sparklines, linked entities, multiple previews, AI enrichment, embeddings, and natural-language search; §Open questions asks “Read-only first?”  
    **Why it matters:** Only Cloud is explicitly deferred. The remaining work spans several substantial systems, while three acceptance criteria cannot establish their readiness. Read-only behavior also remains ambiguous beside spec 12’s automatic local writes in Balanced mode.  
    **Concrete fix:** Commit to a first slice: approved local folders, bounded repo detection, metadata/text search, safe previews, and explicit handoff. Mark enrichment, semantic search, and additional preview formats as separately gated increments. Settle the browser’s read-only contract and state exactly when a handoff enters the agent approval policy.