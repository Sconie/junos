1. **[high] The allowlist is a promise without an enforcement contract.**  
   **Reference:** Sources, lines 7–8; Indexing, line 19; “Excluded paths never appear,” line 31.  
   **Why it matters:** Repository discovery is not explicitly confined to added roots. Symlinks, Windows junctions, overlapping roots, and direct preview requests could bypass indexing exclusions. An excluded file could remain readable through another endpoint.  
   **Concrete fix:** Require daemon-side canonical-path validation for discovery, indexing, preview, attachment, and agent reads. Define whether links are rejected or checked against their resolved targets; apply exclusions consistently and test junction escapes, sibling-path prefixes, and overlapping roots.

2. **[high] Background model processing contradicts the stated consent boundary.**  
   **Quote:** “AI summary and tags per file via a cheap model” and “local embedding model preferred” versus “Content is only sent to a model when Jonas attaches it or a workflow he enabled reads it.”  
   **Why it matters:** Stage 2 introduces another route for sending content. Opting into “AI tagging” does not clearly authorize summaries, embeddings, or remote fallback. “Preferred” permits content to leave the machine without a defined decision.  
   **Concrete fix:** Give each folder explicit processing permissions: local indexing, local AI processing, and named remote-provider processing. Show what each sends, prohibit silent remote fallback, and make background work obey the subscription budget in spec 03.

3. **[high] Exclusion and folder removal do not revoke cached access.**  
   **Reference:** Indexing, lines 20–23; Privacy, line 26.  
   **Why it matters:** Full text, summaries, tags, and embeddings can retain sensitive content after a file is deleted, excluded, or removed from the allowlist. Spec 02 also backs up the database for 14 days. Neither document defines how revocation reaches these copies.  
   **Concrete fix:** Specify deletion and exclusion propagation across search, previews, caches, queued jobs, and embeddings. Block access immediately on revocation, then purge derived data. Explain backup retention and distinguish retained, deliberately sent chat attachments from live file access.

4. **[high] Preview rendering has no security boundary.**  
   **Quote:** “Preview pane renders markdown, images, PDFs, code.”  
   **Why it matters:** Spec 12 treats file content as untrusted, but this spec gives no rendering contract. HTML in Markdown, active SVG, PDF actions, or remote image URLs could introduce script execution or network requests while merely browsing.  
   **Concrete fix:** Require sanitized Markdown, escaped code, inert image handling, and a sandboxed PDF viewer with scripting disabled. Block remote resources by default, handle external links explicitly, and cap preview size and parsing work. Previewing must never execute file content.

5. **[high] Selecting a project blurs context, disclosure, and write authority.**  
   **Reference:** “Open in Chat (sets `cwd` and context),” line 13; automatic CLI run, line 30; “Read-only first?” line 34.  
   **Why it matters:** A working directory does not restrict a CLI’s filesystem access. “Context” could mean project metadata or an entire repository upload. Read-only remains unresolved, while spec 12 permits some writes and requires code changes in a branch/worktree.  
   **Concrete fix:** Define the exact handoff payload and permissions separately. Opening Chat should select the project and display context before a run starts. Show recipient, files, and read/write scope for Hermes handoffs; enforce permissions in the daemon/adapter and use the worktree location for authorized edits. Resolve read-only as a v1 rule.

6. **[med] The search example promises PDF content retrieval without an extraction path.**  
   **Quote:** Stage 1 indexes “FTS5 text for text files”; search supports “PDFs from last week about the API.”  
   **Why it matters:** PDF preview support does not supply searchable text. With optional Stage 2 disabled, “about the API” cannot reliably match PDF contents. Scanned PDFs need a further OCR decision.  
   **Concrete fix:** Either include bounded local PDF text extraction or explicitly limit PDF search to filenames and metadata. Mark scanned PDFs as not content-searchable unless OCR is enabled, and state whether “last week” means modified date, indexed date, or document date.

7. **[med] Index freshness and the one-second criterion are underspecified.**  
   **Reference:** “Stage 1 (always, cheap),” line 20; “Re-index only on mtime change,” line 23; acceptance criterion, line 29.  
   **Why it matters:** Adding a large folder cannot guarantee immediate content search. Modification time alone can miss replacement files with preserved timestamps; watcher interruptions and offline drives can leave stale results. The size cap and supported workload are undefined.  
   **Concrete fix:** Separate initial indexing time from query latency. Define a representative corpus and query target, queue and batch limits, cancellation, and restart reconciliation. Treat mtime as a change hint, with verification for replacements and missed events; label partial or stale results.

8. **[med] Project enrichment has an unbounded first-release scope.**  
   **Reference:** Sources and Project entity, lines 8–12.  
   **Why it matters:** Language analysis, PR retrieval, a 14-day sparkline, and linked work objects each require different sources and refresh rules. Spec 02 has no task-to-project field, and “activity” could mean commits, filesystem changes, or agent runs. Cloud is deferred but still appears in the browser tree.  
   **Concrete fix:** Define the first release around folder registration, local repository metadata, browsing, search, and explicit handoff. Phase enrichment separately. Define each metric’s source and unavailable state, specify project-link relationships, and hide Cloud until supported. PR retrieval failure must not block local browsing.

9. **[med] The browser has features but no spatial hierarchy or density contract.**  
   **Quote:** “Tree navigator … list and grid views … Preview pane,” line 16.  
   **Why it matters:** A tree, five-column table, and preview compete for width. Spec 14’s 360–420 px side panel guidance does not explain when this layout stops fitting. The current `Files.tsx` is only two empty panels, so there is no implemented browser layout to inherit.  
   **Concrete fix:** Make file discovery the dominant region, with a collapsible tree and optional preview. Define minimum pane widths, resize limits, shared gutters, and independent scrolling. Prioritize filename and modified date; reveal secondary metadata progressively. Below the fitting width, open preview as a sheet with a clear return to the selected row.

10. **[med] Glass accessibility rules need Files-specific execution criteria.**  
    **Reference:** File browser, line 16; inherited Translucent Glass rules in spec 14.  
    **Why it matters:** Spec 14 already requires text contrast, reduced motion, and an unsupported-blur fallback. It does not specify how dense filenames, syntax highlighting, selection, and focus remain distinguishable across this screen’s composited backgrounds. A browser that supports blur can still need an opaque mode.  
    **Concrete fix:** Specify stable backing surfaces for reading previews, filenames, and code while retaining glass around them. Verify text at 4.5:1 and essential control/focus indicators at 3:1 against the actual composite. Define non-colour selection cues, an explicit opaque/high-contrast mode, and reduced-motion behavior for pane transitions, loading effects, and live index updates.

11. **[med] The primary workflow lacks operational states and keyboard behavior.**  
    **Reference:** “Local folders that Jonas explicitly adds,” line 7; browser and Ask input, line 16; acceptance criteria, lines 29–31.  
    **Why it matters:** There is no defined Add folder flow, indexing progress, permission-denied recovery, unsupported-preview state, or distinction between no matches and incomplete indexing. Spec 14 requires keyboard-first behavior “in each spec,” but this one lists none.  
    **Concrete fix:** Define Add folder and Manage folders entry points, progress with pause/cancel, and actionable partial/error states. Specify tree arrow-key behavior, row selection, preview opening, Escape and focus restoration, and labelled view toggles. Keep selection stable during background updates. Beside the Ask input, show the chosen file and model, with clear disabled states when either is unavailable.