1. **[high] Approval gates have no enforceable execution boundary.**  
   **Reference:** §Approval policy; §Open questions: “Sandbox for shell steps … in Phase 4.”  
   **Why it matters:** Official CLIs execute as subprocesses (`03`), and Hermes owns its agent loop (`06`). Classifying actions in JunOS does not establish that their internal shell, file or network actions can be intercepted. Agents arrive before the proposed sandbox (`13`).  
   **Fix:** Require each adapter to demonstrate pre-execution approval enforcement. Disable capabilities that bypass it, and make filesystem/network restrictions a prerequisite for unattended execution.

2. **[high] “Always ask” conflicts with autonomy and remembered approvals.**  
   **Reference:** §Approval policy: external-send, destructive and spend “always ask”; “Approve and remember” creates a rule. `06:27` defines Autonomous as “log only.”  
   **Why it matters:** Implementers cannot determine which policy wins. A remembered pattern could silently authorize actions described as requiring explicit consent.  
   **Fix:** Define policy precedence and a complete mode/class matrix. Specify which classes permit remembered authorization, its limits and expiry; otherwise keep them per-action approvals. Treat unknown and compound actions conservatively.

3. **[high] Privacy rules do not govern outbound data.**  
   **Reference:** §Approval policy: “read … search” is automatic; §Prompt injection protects external-send and destructive actions.  
   **Why it matters:** Reading can still disclose data through search queries, model prompts or uploads. Routing fallback (`03`) and automatic title generation (`04`) can introduce additional recipients. Pattern redaction does not prevent these disclosures.  
   **Fix:** Define outbound-data permissions separately from read/write permissions: approved providers, destinations, content scope and background uses. Require consent before changing the recipient or expanding scope, including fallback and automatic metadata generation.

4. **[high] Approval is not bound to the operation eventually executed.**  
   **Reference:** §Approval policy: “showing the exact command/diff.”  
   **Why it matters:** Arguments, files, recipients or payloads can change while approval waits. Retries and duplicate responses could execute the same external action twice.  
   **Fix:** Bind approval to an immutable operation containing resolved arguments, working directory, destinations, payload and relevant file versions. Make approval single-use and expiring; invalidate it on changes and define duplicate/retry handling.

5. **[high] The daemon credential and pairing lifecycle is incomplete.**  
   **Reference:** §Daemon access: token stored in `~/.junos/token` with “mode 600”; §Credentials: “Any JunOS-owned secret … goes in the OS keychain.”  
   **Why it matters:** These storage requirements conflict, POSIX permissions do not define Windows protection, and the pairing URL has no specified expiry or replay protection. A process running as the same user may also read a user-owned token file.  
   **Fix:** Choose and document token storage, including Windows ACLs or keychain handling. Use a short-lived, single-use pairing code exchanged for a revocable browser session; specify browser storage, rotation and logout. State explicitly whether hostile same-user processes are outside the protection boundary.

6. **[high] Untrusted content is addressed only as a model instruction risk.**  
   **Reference:** §Prompt injection: content is “wrapped as data.”  
   **Why it matters:** Markdown, file previews and agent output also reach the browser (`04`, `07`, `11`). Unsafe HTML, link schemes or remote images could execute code or leak data independently of model behavior. Browser compromise would be especially serious beside daemon credentials.  
   **Fix:** Add rendering requirements: sanitized Markdown, disabled raw HTML, restricted URL schemes, isolated active previews and blocked-by-default remote resources. Keep untrusted content away from executable commands and approval controls.

7. **[high] “Allowlisted folders” lacks a filesystem security definition.**  
   **Reference:** §Approval policy: automatic reads and local writes in allowlisted folders.  
   **Why it matters:** A textual path check can be escaped through traversal, symlinks or Windows junctions. Folder membership also does not make every contained file safe to disclose or modify; `11` already excludes secret files from indexing.  
   **Fix:** Require canonical containment checks at access time, explicit link handling and secret-path exclusions across tools as well as indexing. Separate read, write and disclosure permissions; never treat a shell command as safe merely because its working directory is allowlisted.

8. **[med] Local records have no retention or deletion policy.**  
   **Reference:** §Credentials: “Logs and run records redact known secret patterns”; §Data safety: audit events are exportable.  
   **Why it matters:** `02` retains messages, thinking, tool arguments, step outputs, memory and events. These can contain sensitive personal information that matches no secret pattern, and backups preserve additional copies.  
   **Fix:** Inventory sensitive stores, minimize captured content and redact before persistence. Define retention, deletion and export controls, including derived indexes and backup expiry; distinguish append-only audit metadata from removable sensitive payloads.

9. **[med] Approval UI lacks a safe reading and interaction contract.**  
   **Reference:** §Approval policy, line 25; cross-check Inbox’s `a` shortcut (`07:17`) and Home’s inline approval buttons (`10`).  
   **Why it matters:** Exact commands alone can bury consequences in dense technical content. Inline or single-key approval may authorize an operation without adequate review. `14` provides general glass accessibility rules, but no approval-specific hierarchy or density requirements.  
   **Fix:** Lead with action, consequence, project, recipient/destination and cost. Below, show the full selectable payload/diff using readable type, consistent spacing and contained scrolling. Separate “Approve once” from persistent authorization. Require focused review before keyboard approval. Apply `14`’s contrast and fallback rules to critical details and controls, including bright glow backgrounds and reduced-motion states.

10. **[med] The global stop promise has ambiguous scope and completion.**  
    **Reference:** §Data safety: “Kill switch … stops all agent runs”; `06:30` stops the current Hermes step and pauses its queue.  
    **Why it matters:** Stopping a parent process may leave descendants running, and schedules or retries may immediately launch replacements. The UI could report success before execution actually stops.  
    **Fix:** Distinguish “Stop Hermes” from “Stop all runs.” Define scheduler/retry suspension, process-tree termination and bridge acknowledgement. Show stopping, stopped and partial-failure states, including actions already sent externally.

11. **[med] The backup requirement inherits an unsafe copy strategy.**  
    **Reference:** §Data safety: “Nightly DB backup (02)”; `02` specifies a nightly copy, while `01` selects SQLite WAL mode.  
    **Why it matters:** Copying only the main database during active WAL use can omit committed changes or produce an inconsistent backup. Backup existence alone does not establish recoverability.  
    **Fix:** Require a consistent SQLite backup mechanism, protected backup permissions, integrity checks and a tested restore procedure. Define coverage for run outputs and attachments stored outside the database.