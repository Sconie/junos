1. **[high] The allowlist is an indexing rule, not a complete access boundary.**  
   **Reference:** Sources; Indexing; acceptance criterion “Excluded paths never appear in the index.”  
   **Why it matters:** Nothing defines how previews, attachments, workflows, or agents enforce the same exclusions. A junction/symlink inside an allowed folder could also resolve outside it. The privacy promise exceeds the specified protection.  
   **Concrete fix:** Require one daemon-side authorization check for discovery, indexing, preview, attachment, and tool reads. Resolve canonical paths, reject escapes through links/junctions, and revalidate before opening files. Specify `.junosignore` precedence and Windows path handling. Add acceptance cases covering traversal and linked excluded folders.

2. **[high] Background AI processing has an ambiguous upload permission.**  
   **Quote:** “Content is only sent to a model when Jonas attaches it or a workflow he enabled reads it”; Stage 2 generates summaries and tags, with a local embedding model merely “preferred.”  
   **Why it matters:** Enabling AI tags could authorize an entire folder’s contents to leave the machine without identifying the recipient. Embeddings have no equivalent explicit opt-in. Provider fallback in `03-connections-and-routing.md` could change that recipient again.  
   **Concrete fix:** Separate local indexing, remote summaries/tags, and remote embeddings into explicit permissions. Show folder scope and destination before enabling each. Keep embedding processing local by default; require authorization before remote fallback. Make natural-language query routing explicit too.

3. **[high] File previews lack an untrusted-content rendering contract.**  
   **Quote:** “Preview pane renders markdown, images, PDFs, code.”  
   **Why it matters:** These files can contain active markup, remote resources, or malicious links. A preview that fetches a remote image can disclose information before Jonas attaches anything to a model. `12-security-and-privacy.md` identifies file content as untrusted but does not specify preview isolation.  
   **Concrete fix:** Require sanitized Markdown, escaped code, disabled raw HTML and automatic remote-resource loading, and isolated PDF rendering without scripting. Restrict link schemes, make external navigation explicit, and define preview size/time limits with safe failure states.

4. **[high] “Open in Chat” conflates project selection, file disclosure, and execution authority.**  
   **Reference:** Project actions; acceptance criterion “makes a CLI-backed model run with that directory as cwd”; “Read-only first?”  
   **Why it matters:** Selecting a project does not define which files become context or what tools may write. Running directly in its directory also conflicts with `12-security-and-privacy.md`’s default worktree/branch isolation. “Give to Hermes” remains ambiguous when Hermes runs remotely, an open question in `06-hermes.md`.  
   **Concrete fix:** Define a handoff payload containing project identity, authorized files, execution location, and tool permissions. Selecting a project should configure context without starting work. Route code execution through the isolation policy; remote handoffs need an explicit transfer manifest. Settle browser read-only behavior and agent write authority separately.

5. **[med] There is no removal or privacy-revocation lifecycle.**  
   **Reference:** Sources; Indexing; Privacy.  
   **Why it matters:** Removing a folder or adding an ignore rule could leave searchable text, summaries, embeddings, and previews behind. The database backups described in `02-data-model.md` can retain those derivatives as well.  
   **Concrete fix:** Specify Remove folder and Stop AI processing actions. On exclusion/removal, cancel queued work and purge affected live index entries and derivatives. Explain separately what remains in conversation history and backups, with a defined retention policy.

6. **[med] Modification time alone is insufficient for index correctness.**  
   **Quote:** “Re-index only on mtime change; summaries cached by content hash.”  
   **Why it matters:** The spec omits deletion, rename, atomic replacement, missed watcher events, and restart reconciliation. Content changes that preserve timestamps may never reach the hash check. Search can therefore return deleted files or stale content.  
   **Concrete fix:** Define startup reconciliation and watcher handling for create/update/delete/rename. Use a documented fingerprint and reconciliation strategy rather than mtime alone. Invalidate derivatives when content, extraction rules, model version, or access policy changes.

7. **[med] The PDF search example promises content coverage the index does not provide.**  
   **Quote:** Stage 1 indexes “FTS5 text for text files”; search example: “PDFs from last week about the API.”  
   **Why it matters:** PDF preview does not imply searchable PDF text. With Stage 2 disabled, that example cannot reliably find PDFs by subject. Scanned PDFs need a further extraction path.  
   **Concrete fix:** Publish a supported-format matrix distinguishing preview, text extraction, semantic indexing, and OCR. Either include bounded local PDF text extraction initially or qualify the example. Show “content not indexed” distinctly from “no matching content.”

8. **[med] Scope and performance promises have no workload boundary.**  
   **Reference:** Derived project metadata; two browser views; four preview formats; Stage 2; “search finds a file by content within a second.”  
   **Why it matters:** The milestone combines substantial independent features, while the timing criterion conflates initial indexing with query latency. “Budget-limited” does not connect to the shared subscription limits in `03-connections-and-routing.md`.  
   **Concrete fix:** Define an initial slice: local folders, bounded text indexing, project detection, list view, and basic previews. Explicitly sequence richer metadata, grid view, and AI enrichment. Separate discovery time, indexing freshness, and warm-query latency, measured against a stated corpus and machine. Specify concurrency, pause/cancel, and subscription-budget enforcement.

9. **[med] The screen has several competing structures but no hierarchy.**  
   **Reference:** Project entity; File browser.  
   **Why it matters:** Projects, local folders, project metadata, files, tags, preview, and chat input all compete for space. A repository may appear under both Projects and Local folders without a defined relationship. `src/pages/Files.tsx` is only a placeholder, so existing code does not resolve these decisions.  
   **Concrete fix:** Make finding and selecting a file the primary task. Define projects as scoped views of underlying folders, retain one file identity, and show breadcrumbs. Specify a collapsible tree, dominant list, and optional preview; move project activity and linked work into project details. Keep filenames visually dominant and AI tags secondary.

10. **[med] Keyboard interaction and narrow-screen behavior are unspecified.**  
    **Reference:** File browser; acceptance criteria.  
    **Why it matters:** `14-ui-system.md` explicitly requires a keyboard list in each spec, but this document supplies none. The tree, list/grid, and preview introduce multiple focus regions and selection models; simply converting side panels to sheets does not define their navigation.  
    **Concrete fix:** Specify tree arrow-key behavior, expansion, selection versus opening, list navigation, preview entry/exit, search focus, and focus restoration. Below the shared breakpoint, show one working region at a time and restore list position when returning from preview. Define long-filename handling and essential metadata at increased text size.

11. **[med] Indexing and failure states are missing from both the UI and acceptance criteria.**  
    **Reference:** Indexing; Acceptance criteria.  
    **Why it matters:** An empty result might mean no match, incomplete indexing, denied access, unsupported content, or a disconnected folder. Generic shared loading/error states cannot explain these materially different situations.  
    **Concrete fix:** Define first-run “Add folder,” discovering/indexing progress, partial-result notices, paused enrichment, unavailable folders, unsupported previews, and provider-disconnected states. Keep usable results visible during refresh and offer scoped retry/cancel actions. Include these states in acceptance criteria.

12. **[med] Glass execution lacks screen-specific legibility and density criteria.**  
    **Reference:** File browser, inheriting `14-ui-system.md`’s glass tokens and accessibility rules.  
    **Why it matters:** The shared contrast minimum and fallbacks are useful, but do not specify how dense filenames, dim metadata, syntax highlighting, tags, and focus indicators behave over changing glow and preview content. Typography, row spacing, and motion are otherwise undefined here.  
    **Concrete fix:** Add a compact layout contract—for example, 14px filenames, 12–13px metadata, 36–40px rows, and a consistent 8px spacing rhythm. Test text at ≥4.5:1 and essential control/focus indicators at ≥3:1 against the brightest composited backgrounds. Define readable preview measures, stronger backing where needed, and explicit opaque/high-contrast fallbacks. Require stable rows during indexing and reduced-motion behavior for pane transitions and loading effects.