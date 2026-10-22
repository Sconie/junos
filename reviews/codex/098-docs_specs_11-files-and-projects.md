1. **[high] The allowlist lacks a filesystem enforcement contract.**  
   **Reference:** Sources, lines 7–8; exclusions, lines 19, 38–39.  
   **Why it matters:** Query-time filtering alone does not protect previews, attachments, manifests or model reads. Symlinks, Windows junctions and changed paths could expose content outside an approved folder. Repo discovery also has no explicit search boundary.  
   **Concrete fix:** Require daemon-side, canonical-path containment and exclusion checks for every enumeration and read, including previews and attachments. Define link handling, Windows path normalization and nested-root behavior. Limit repo detection to approved roots; test an in-root junction pointing outside them.

2. **[high] Revocation can race with active workers and restore deleted data.**  
   **Quote:** “deletes its index rows… and cancels queued jobs” (line 37).  
   **Why it matters:** An already-running summary or embedding job could finish after deletion and repopulate the index. Open previews and active model reads are also unspecified.  
   **Concrete fix:** Revoke access first, cancel queued and active work, and reject subsequent reads and worker writes using a folder permission generation. Confirm completion only after workers cannot recreate derived data. Explain that previously transmitted content cannot be recalled and reference the backup retention policy in spec 12.

3. **[high] Background AI processing has no explicit provider-consent scope.**  
   **Quote:** “AI summary and tags… via a cheap model”; “local embedding model preferred” (line 21).  
   **Why it matters:** A preference for local embeddings permits an unspecified remote alternative. Folder tagging consent does not clearly authorize summaries, embeddings or model-assisted search parsing. Spec 12 requires allowed-provider enforcement, but this spec does not identify the owning workflow or permission scope.  
   **Concrete fix:** Define a folder-scoped processing configuration covering summaries, tags, embeddings, allowed providers and usage limits. Show the destination before enabling it. If local embeddings are unavailable, pause and offer an explicit remote option. Define whether natural-language filter parsing is local.

4. **[high] “Give to Hermes” does not define which version or files leave the machine.**  
   **Reference:** Action on line 13; “Project files reach Hermes through git” on line 34.  
   **Why it matters:** Git handoff omits dirty and untracked files, and a repository push can include excluded files or sensitive history. Spec 06 also describes individual-file uploads, leaving non-repo folders and the purpose’s “any of them” promise unresolved.  
   **Concrete fix:** Specify separate repo and individual-file flows. Repo handoff must name the destination, branch and exact commit, explain omitted local changes, and show transfer scope before the digest-bound approval required by spec 12. Define whether non-repo folders are unsupported or use a separately approved upload.

5. **[med] Modification time alone cannot keep the index correct.**  
   **Quote:** “Re-index only on mtime change; summaries cached by content hash” (line 23).  
   **Why it matters:** Content can change while retaining its timestamp. Renames, deletions and watcher interruptions also need handling. A content-hash cache cannot detect a change if the timestamp rule prevents reading the file.  
   **Concrete fix:** Treat watcher events as invalidation hints; reconcile on startup and after interruptions. Handle rename/delete events and changed exclusions explicitly. Define when content hashes are recomputed and key AI caches by content plus processing configuration.

6. **[med] The PDF search example promises an extraction pipeline that is absent.**  
   **Quote:** “FTS5 text for text files” versus “PDFs from last week about the API” (lines 20–22).  
   **Why it matters:** PDF preview support does not establish searchable PDF text. Without extraction, “about the API” may match only filenames; scanned PDFs require an additional OCR decision.  
   **Concrete fix:** Define supported content-search formats. Either add bounded local PDF text extraction with visible extraction failures and an explicit OCR policy, or constrain the example and acceptance criteria to supported text files.

7. **[med] The performance criterion conflates indexing completion with query latency.**  
   **Quote:** “Add a folder… search finds a file by content within a second” (line 29).  
   **Why it matters:** There is no corpus bound, numeric file-size cap or initial-scan completion condition. The same promise cannot meaningfully cover a small notes folder and a large repository. Stage 2 further adds potentially substantial background work.  
   **Concrete fix:** Separate initial indexing, incremental update and warm-query targets against a named benchmark corpus. Define limits and backpressure. Show scanning progress, partial results, skipped-file reasons, paused AI processing and retryable failures.

8. **[med] The browser has no hierarchy or pane budget.**  
   **Quote:** “Tree navigator… list and grid views… Preview pane… input at the bottom” (line 16).  
   **Why it matters:** Tree, six-column list and preview compete for width. Spec 14’s 360–420 px drawers and below-900 px sheet rule leave intermediate desktop widths unresolved. Long paths and AI tags could crowd out the filenames users need most.  
   **Concrete fix:** Make the file list the primary region; define collapsible/resizable navigation and preview panes with minimum widths and an earlier collapse threshold. Prioritize filename, then location; constrain tags. Specify row height, padding and type sizes together—for example, 44–48 px rows with 14 px primary text and 12–13 px metadata. Right-align sizes and preserve full paths through an accessible disclosure.

9. **[med] Keyboard and focus behavior are missing for the central interaction.**  
   **Reference:** File browser, line 16; spec 14 requires a keyboard list in each spec.  
   **Why it matters:** Tree expansion, row selection, preview navigation and the embedded composer introduce distinct focus regions. A sandboxed preview also needs a predictable way to leave it.  
   **Concrete fix:** Specify tree arrow-key behavior, selection versus activation, explicit preview/Ask actions, Escape/back behavior and focus restoration. Preserve selection and scroll position across view changes. Announce search-result counts and indexing updates without repeatedly interrupting typing.

10. **[med] Glass execution has no screen-specific verification criteria.**  
    **Reference:** File browser, line 16; acceptance criteria, lines 28–31.  
    **Why it matters:** Spec 14 already establishes opaque and reduced-motion fallbacks, but this screen’s dense metadata, syntax highlighting, selection states and processing badges have no concrete acceptance checks. Token checks alone do not describe their composited appearance.  
    **Concrete fix:** Add representative browser checks using long filenames, dense tags, code and bright image/PDF previews. Require at least 4.5:1 for normal text and 3:1 for essential non-text indicators against their actual backgrounds. Verify distinguishable hover, selection and keyboard focus; keep preview content on a stable reading surface. Test opaque/high-contrast modes and reduced motion, with no animated reordering or recurring glow used as the sole processing signal.