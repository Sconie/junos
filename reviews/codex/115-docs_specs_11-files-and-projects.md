1. **[high] The allowlist does not define a filesystem security boundary.**  
   **Reference:** Sources, line 7; Indexing, line 19; Rev 2, lines 38–39.  
   **Why it matters:** Exclusion checks are specified for indexing and search, but not for previews, attachments, manifests or on-demand reads. A symlink or Windows junction inside an allowed folder could resolve outside it. Different endpoints could expose files that search correctly hides.  
   **Concrete fix:** Require one daemon-side authorization check for every filesystem access: canonicalize paths, verify the resolved target remains inside an allowed root, apply exclusions, and reject traversal and links escaping that root. Define Windows case handling and overlapping roots. Add acceptance cases covering direct reads and junction escapes.

2. **[high] “Any” file can be handed to Hermes, but git cannot deliver that promise.**  
   **Quote:** “a fast way to hand any of them to a model or Hermes” (line 4); “Project files reach Hermes through git” (line 34).  
   **Why it matters:** Standalone files, untracked files and dirty working copies have no defined handoff. A git clone also transfers repository history rather than the exclusion-filtered manifest described for chat; excluded sensitive material might exist in that history. Section 06 mentions explicit uploads, while its settled project decision is git.  
   **Concrete fix:** Define separate handoffs: projects use a named branch and exact commit; standalone files use an explicitly approved copy if supported. Otherwise disable unsupported handoffs with an explanation. Show destination, transferred revision and dirty/untracked omissions before sending. Bind the external-send approval required by section 12 to the exact transfer; distinguish index exclusions from what repository transfer includes.

3. **[high] Background AI processing has contradictory consent rules.**  
   **Quote:** Stage 2 uses “a cheap model” and a local embedding model is merely “preferred” (line 21), while content is sent only through attachment or an enabled workflow (line 26).  
   **Why it matters:** Folder tagging consent is mentioned, but automatic summaries, embeddings and possible remote fallback are not clearly included. Sections 04 and 12 define allowed providers for conversations/workflows; this spec does not identify which provider policy governs a folder indexing job.  
   **Concrete fix:** Define a folder processing policy covering summaries, tags and embeddings separately, including provider, local/remote execution and budget. Keep remote processing off until explicitly enabled. Never silently substitute remote embeddings when local processing is unavailable. Make the folder badge disclose these settings rather than just “AI on.”

4. **[high] Revocation can race with running jobs and recreate deleted data.**  
   **Quote:** Removing a folder deletes derived data and “cancels queued jobs” (line 37).  
   **Why it matters:** A running summarizer or embedding request can finish after deletion and write its results back. Open previews, active watchers and on-demand reads are also unspecified. Query-time filtering alone does not establish that these paths lose access immediately.  
   **Concrete fix:** Revoke access first, invalidate the folder’s processing generation, stop watchers and cancel queued/running work. Reject late writes against the revoked generation, then purge derived data and invalidate UI caches. Confirm completion only after that sequence. Explain that revocation cannot retract content already delivered to a provider or Hermes, and distinguish index deletion from deleting existing chat attachments.

5. **[high] Opening a project can bypass the intended working-copy protection.**  
   **Quote:** “‘Open in Chat’ … makes a CLI-backed model run with that directory as cwd” (line 30).  
   **Why it matters:** Section 12 defaults code work to a branch/worktree and requires constrained CLI execution. This acceptance criterion instead rewards launching directly in the original directory without stating whether the session is read-only or which restrictions apply. Choosing a project should not implicitly authorize writes to its main working tree.  
   **Concrete fix:** Separate project selection from execution location. Open the conversation with a manifest; launch a read-only constrained session or create an approved worktree before enabling writes. Display the actual working directory and permission mode. Revise the acceptance criterion to test these protections.

6. **[med] Modification time alone cannot keep the index correct.**  
   **Quote:** “Re-index only on mtime change; summaries cached by content hash” (line 23).  
   **Why it matters:** Content can change while timestamps are preserved. Renames, deletions, daemon downtime and exclusion-rule changes also require updates without a file-content mtime change. Hash caching cannot help when the file is never reconsidered.  
   **Concrete fix:** Specify initial and startup reconciliation, create/rename/delete handling, and exclusion-policy invalidation. Treat mtime and size as shortcuts, with reconciliation or explicit refresh able to verify content hashes. Version summary caches by content, processor/model and relevant settings.

7. **[med] The one-second acceptance criterion conflates indexing readiness with search latency.**  
   **Quote:** “Add a folder … search finds a file by content within a second” (line 29).  
   **Why it matters:** There is no corpus limit, initial-scan deadline or defined size cap. A newly added large folder cannot reliably become content-searchable in one second. The natural-language PDF example also lacks an extraction contract: Stage 1 indexes text files, and Stage 2 is optional.  
   **Concrete fix:** Define a supported corpus and file-size cap, then measure search latency against an already indexed corpus. Specify incremental indexing progress and partial-result messaging. State whether PDF text extraction ships, whether scanned PDFs/OCR are deferred, and what filename-only or metadata-only matches look like.

8. **[med] A sandboxed iframe does not fully specify the preview pipeline.**  
   **Reference:** File browser, line 16; Rev 2, line 39; section 12, Safe rendering.  
   **Why it matters:** Section 12 supplies useful rendering restrictions, but this document promises Markdown, images, PDFs and code without defining compatible renderers or resource limits. Large images, malformed PDFs and unsupported files need predictable behavior; choosing a PDF viewer later may conflict with the scriptless iframe requirement.  
   **Concrete fix:** Add a format/support matrix: safe rendering path, input and decoded-size limits, processing timeout, remote-resource policy and fallback. Explicitly inherit SafeMarkdown. Define a PDF approach compatible with the sandbox, or a bounded static preview. Provide “Preview unavailable” with file metadata when rendering fails.

9. **[med] The browser has no layout contract that protects the file list from competing panels.**  
   **Reference:** Project entity, lines 12–13; File browser, line 16.  
   **Why it matters:** Tree navigation, five columns, grid mode, preview and project metadata compete for width. The Files Stitch prompt additionally places project cards above the browser. Section 14’s general grid and drawer rules do not decide which content yields first. Long filenames and tags could make the main task the least legible part of the screen.  
   **Concrete fix:** Make the file list the dominant workspace, with project information in a collapsible header or detail view. Define minimum pane widths and a collapse order: hide preview first, then move tree navigation into a drawer. Use one pane at a time on narrow screens and preserve selection and scroll position when returning.

10. **[med] Typography and density are unspecified for the screen’s hardest content.**  
    **Quote:** Columns include “name, project, size, modified, AI tags” (line 16).  
    **Why it matters:** Shared font tokens do not define row height, column priority, filename truncation or tag overflow. Long paths and generated tags can dominate the list, while compressed metadata can become difficult to scan over glass.  
    **Concrete fix:** Specify a baseline such as 40px single-line rows, 14px filenames, 12–13px metadata and consistent cell padding. Give names the flexible column; right-align sizes with tabular figures. Preserve extensions when truncating, expose full paths accessibly, and cap visible tags with an overflow count. Define sorting and a text-labelled selected state.

11. **[med] “Ask about this file” lacks an explicit context and conversation contract.**  
    **Quote:** The bottom input “uses the chat model with the file attached” (line 16).  
    **Why it matters:** “The chat model” is ambiguous outside Chat. The spec does not say whether this starts a conversation, appends to an existing one, attaches a snapshot or reads the latest file. Changing selection while a draft exists could silently change the material being sent. Sections 04 and 12 provide disclosure rules, but this entry point does not explicitly inherit them.  
    **Concrete fix:** Reuse the shared composer and provider disclosure. Show the selected filename/revision, destination model and conversation behavior before sending. Bind the draft to its selected file, require explicit Send, and explain unreadable, oversized or changed-file states.

12. **[med] Glass accessibility rules need Files-specific verification cases.**  
    **Reference:** File browser, line 16; section 14’s contrast, blur and fallback rules.  
    **Why it matters:** Section 14 already defines reduced-motion and opaque fallbacks. What remains missing here is verification over actual preview content: bright images, white PDF pages and syntax colours can change the visual conditions beside glass controls. Token-pair checks alone do not establish legible composited states.  
    **Concrete fix:** Require contrast checks for normal, hover, selected and focused rows over the brightest supported backdrop: at least 4.5:1 for ordinary text and 3:1 for essential control/focus indicators. Keep preview content on an isolated reading surface within the glass frame. Verify opaque fallbacks, static reduced-motion loading states and selection visibility without colour alone.

13. **[med] Keyboard behavior is missing despite the shared system explicitly requiring it per spec.**  
    **Reference:** File browser, line 16; section 14, Accessibility and input.  
    **Why it matters:** A tree, selectable list, view toggle, preview and composer create several focus regions. Generic ARIA guidance does not resolve whether arrows expand folders, select files or move between cells, nor where focus returns after a preview closes.  
    **Concrete fix:** Define tree arrow-key behavior, row navigation, distinct select/preview/open actions, named view toggles and labelled pane controls. Escape should close the preview and restore focus to the originating row. Keep action buttons keyboard-accessible without making every metadata cell a tab stop.