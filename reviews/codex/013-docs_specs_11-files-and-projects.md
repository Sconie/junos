1. **[high] The allowlist is a promise without an enforcement contract.**  
   **Reference:** Sources and Indexing: “nothing else is ever indexed”; “Excluded paths never appear in the index.”

   **Why it matters:** The spec does not define how symlinks, Windows junctions, overlapping roots, or paths supplied to preview/chat endpoints are handled. A watcher scoped to an approved folder does not establish that every file read stays within it.

   **Concrete fix:** Require daemon-side canonical-path validation for indexing, preview, search results, attachments, and agent reads. Default to rejecting links that resolve outside approved roots. Define `.junosignore` precedence and test traversal, junctions, and excluded descendants.

2. **[high] Background AI processing contradicts the stated disclosure rule.**  
   **Reference:** Indexing: “AI summary and tags per file via a cheap model”; “local embedding model preferred.” Privacy: content is sent only when attached or read by an enabled workflow.

   **Why it matters:** Folder-level tagging is a third disclosure path, and “preferred” permits an unspecified remote embedding fallback. Neither names the recipient or establishes whether summaries and embeddings share the same consent.

   **Concrete fix:** Define separate permissions for local indexing, remote summaries/tags, and remote embeddings. Default background processing to local-only; require explicit provider-specific opt-in for uploads. Never switch to a remote provider silently when local processing fails.

3. **[high] File previews have no security boundary.**  
   **Reference:** File browser: “Preview pane renders markdown, images, PDFs, code.”

   **Why it matters:** Previewing untrusted documents can introduce executable markup, unsafe links, or remote resources that disclose viewing activity. This exposure happens before any model interaction; the prompt-injection policy in `12-security-and-privacy.md` does not define renderer isolation.

   **Concrete fix:** Specify sanitized Markdown without executable HTML, blocked remote resources by default, isolated PDF rendering, safe URL handling, and escaped code. Add preview size/time limits and an explicit fallback for unsupported or malformed files.

4. **[high] Removing access does not remove indexed private content.**  
   **Reference:** Stage 1 stores full text; Stage 2 caches summaries by content hash. Privacy defines exclusions but no removal lifecycle.

   **Why it matters:** Removing a folder, adding an ignore rule, or discovering a secret could leave searchable text, embeddings, and summaries behind. The database backups specified in `02-data-model.md` can retain those copies after live removal.

   **Concrete fix:** Define “Remove folder and indexed data,” immediate suppression from all search surfaces, and cancellation of queued processing. Purge associated text, summaries, embeddings, and previews; explicitly describe backup retention and the treatment of content already attached to conversations.

5. **[high] Project handoff conflates navigation, disclosure, and execution.**  
   **Reference:** “Open in Chat (sets `cwd` and context)”; acceptance criterion says it “makes a CLI-backed model run.” Read-only behavior remains an open question.

   **Why it matters:** Opening Chat could mean preparing a conversation or immediately executing a model. “Context” could mean a project reference or uploading its contents. Setting `cwd` also does not enforce read-only access. Hermes’s machine location remains unresolved in `06-hermes.md`.

   **Concrete fix:** Make Open in Chat prepare a draft with a visible project reference and no automatic execution. Show selected files and recipient before sending. Define read-only tool permissions independently of `cwd`, and require an explicit file-transfer contract for remote Hermes.

6. **[med] The indexing rules can leave stale or newly excluded content searchable.**  
   **Reference:** “Re-index only on mtime change; summaries cached by content hash.”

   **Why it matters:** This omits deletion, rename, ignore-rule changes, missed watcher events, and replacements that preserve modification time. Cached summaries can remain associated with outdated content. No freshness state tells the user when search is incomplete.

   **Concrete fix:** Define reconciliation on startup, deletion/rename handling, immediate ignore-rule re-evaluation, and content-version checks before attachment. Track indexing status and tie each summary to its content hash and processing configuration.

7. **[med] The PDF search example promises an unspecified capability.**  
   **Reference:** “PDFs from last week about the API”; Stage 1 indexes “FTS5 text for text files.”

   **Why it matters:** PDF preview does not establish searchable text extraction, and scanned PDFs need a separate OCR capability. With optional Stage 2 disabled, “about the API” may have no content to search.

   **Concrete fix:** State supported extraction formats and whether PDF text extraction belongs to local Stage 1. Defer OCR explicitly if needed. Distinguish filename-only, content-indexed, and unsupported files in results, and define whether “last week” means modified or created date.

8. **[med] The acceptance criteria hide both scope and performance assumptions.**  
   **Reference:** “Add a folder, see projects detected, search finds a file by content within a second”; Sources, Project entity, and Indexing collectively add Git enrichment, previews, AI processing, embeddings, and natural-language search.

   **Why it matters:** The timing mixes initial indexing with query latency and specifies no corpus size, readiness condition, or hardware. The broad feature bundle has no minimum release boundary; Phase 4’s completion criterion in `13-roadmap.md` measures Scout rather than file browsing.

   **Concrete fix:** Define a first slice: approved local roots, project detection, a list view, selected previews, and local text search. Phase enrichment and semantic search separately. Measure initial indexing and ready-index query latency independently against a named representative corpus.

9. **[med] The screen lacks a clear hierarchy, while the sparkline risks becoming decoration.**  
   **Reference:** Project entity lists language mix, a “14-day activity sparkline,” linked objects, and four actions; File browser adds a tree, two views, metadata, preview, and composer.

   **Why it matters:** No primary task or disclosure order is established. The related Stitch prompt places project cards above the browser, which could push file work below secondary metadata. “Activity” has no defined measure, so the sparkline may convey busyness without helping a decision.

   **Concrete fix:** Make finding and selecting a file the main workspace. Put project enrichment in selected-project details and secondary actions in a menu. Remove the sparkline unless its metric, source, and useful decision are defined. Preserve the chosen Glass identity through restrained surfaces rather than repeated decorative cards.

10. **[med] Layout, spacing, and typography are underspecified for a dense browser.**  
    **Reference:** File browser’s tree, five columns, preview pane, and bottom input.

    **Why it matters:** The spec gives no pane minimums, resizing rules, filename/path treatment, or column priority. Applying the global drawer width from `14-ui-system.md` still leaves the tree and table competing for space. The current `Files.tsx` is only a placeholder, so it supplies no established solution.

    **Concrete fix:** Specify a resizable tree and collapsible preview, consistent gutters, readable row density, and dominant filename text. Use secondary relative paths to distinguish duplicate names; right-align sizes with tabular figures. Below 900px, show one main pane at a time with explicit back navigation. Reserve monospace for code and technical identifiers.

11. **[med] First-use, failure, and keyboard flows are missing.**  
    **Reference:** Acceptance criteria cover only folder addition, chat handoff, and exclusions.

    **Why it matters:** The global states in `14-ui-system.md` do not explain how this screen distinguishes an empty folder, unfinished indexing, no matches, denied access, or an unavailable model. The inline “Ask about this file” composer also lacks recipient, sending, cancellation, and conversation-destination behavior.

    **Concrete fix:** Add an initial Add folder action, indexing progress with cancel/retry, distinct empty/error states, and visible exclusion reasons. Specify tree arrow-key navigation, selection versus opening, focus restoration after preview dismissal, and accessible pane controls. Reuse Chat’s model and run states, with a clear link to the resulting conversation.