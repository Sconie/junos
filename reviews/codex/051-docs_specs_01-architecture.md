1. **[high] The adapter boundary cannot enforce the approval policy.**  
   **Reference:** §Provider adapter interface — `run(req)` emits `tool` events; `RunRequest` accepts `cwd` and `tools`.  
   **Why it matters:** Reporting a tool action does not establish that JunOS can intercept it before execution. A CLI could write files or send data using its own tools, bypassing the approvals promised in docs 04 and 12. Setting `cwd` also does not define a filesystem boundary.  
   **Concrete fix:** Require each adapter to declare its enforceable permissions and support a pre-execution approval handshake. Reject runs requesting unsupported restrictions. Specify canonical allowed paths, subprocess permissions, and how approval decisions reach the CLI before an action executes.

2. **[high] Restart recovery does not address actions whose outcome is unknown.**  
   **Reference:** §Reliability rules — “Every run is resumable or cleanly failed”; “run all missed.”  
   **Why it matters:** A process can crash after an external action succeeds but before success is recorded. Retrying that step can duplicate the action; marking it failed misrepresents its outcome. Doc 05 explicitly promises no duplicate scheduled runs, but this architecture supplies no durable execution protocol. Unbounded catch-up can also exhaust subscription capacity immediately after startup.  
   **Concrete fix:** Define persisted execution states, unique scheduled-occurrence keys, atomic job claims, and step checkpoints. Use idempotency keys where supported; otherwise introduce an `outcome_unknown` state requiring reconciliation before retry. Bound catch-up by age, count, concurrency, and provider budget.

3. **[high] The “single file” backup assumption is unsafe with WAL.**  
   **Reference:** §Tech choices — “SQLite (WAL) | single file, easy backup”; §Shape — “one file.”  
   **Why it matters:** Doc 02 translates this into a nightly copy of `junos.db`. In WAL mode, committed changes can still reside in the separate WAL file, so copying only the database while it is active can omit committed data. [SQLite WAL documentation](https://www.sqlite.org/wal.html).  
   **Concrete fix:** Replace the single-file operational claim with “one logical database.” Require a consistent snapshot through the selected driver’s SQLite backup API or `VACUUM INTO`, followed by restore verification. [SQLite backup documentation](https://www.sqlite.org/backup.html).

4. **[high] Append-only storage conflicts with meaningful deletion and bounded retention.**  
   **Reference:** §Event bus — “Append-only `events` table”; §Reliability rules — output stored “for audit,” with configurable truncation.  
   **Why it matters:** Doc 02 also stores message content, thinking, and tool inputs/outputs. Deleting a conversation could leave copies in events, run records, indexes, and backups. Per-output truncation limits individual records, not total growth or how long private content survives. Doc 12’s secret-pattern redaction does not cover all sensitive personal content.  
   **Concrete fix:** Define what event payloads may contain, redact before persistence and streaming, and prefer references over duplicate bodies. Specify retention and deletion across derived records and backups, including the expiry period for backup copies. Keep audit metadata after content removal.

5. **[med] The event stream has no consistency or reconnect contract.**  
   **Reference:** §Shape — “SSE/WebSocket”; §Event bus — SSE and views derived from events plus materialized tables.  
   **Why it matters:** The document leaves both transport selection and synchronization semantics unresolved. After a reconnect, the UI could miss an approval, duplicate a message, or show a stale badge. Writing a materialized row and its event separately also creates a crash window where the database and screen disagree.  
   **Concrete fix:** Choose SSE for the initial implementation, with REST commands. Specify a versioned event envelope, stable IDs, ordered replay cursor, duplicate handling, snapshot-to-stream handoff, and resynchronization when history expires. Commit state changes and their events in the same transaction.

6. **[med] The adapter interface cannot express the states required by the product.**  
   **Reference:** §Provider adapter interface — `status(): { connected: boolean; … }`, `cancel(runId)`, and `run(req)`.  
   **Why it matters:** Doc 03 requires `needs_login`, `rate_limited`, `unavailable`, and `degraded`, including reset times. A boolean plus an error string forces the UI or router to interpret prose. The interface also does not establish who assigns `runId`, or what cancellation guarantees about child processes and partial output.  
   **Concrete fix:** Use a discriminated status type with structured reasons and optional retry/reset times. Assign the run ID before execution and pass it into the adapter. Declare tool/approval capabilities and concurrency limits, and define cancellation acknowledgement, terminal events, and preservation of partial output.

7. **[med] Untrusted output has no specified rendering boundary.**  
   **Reference:** §Provider adapter interface — streamed `token`, `thinking`, and `tool` output; §Shape — browser consumes daemon data.  
   **Why it matters:** Docs 04 and 11 require Markdown, code, images, and file previews. The current chat renders plain React text, so rich rendering introduces a new trust boundary. Without explicit rules, provider or file content could become active HTML, unsafe links, or remote image requests that disclose viewing activity.  
   **Concrete fix:** State that daemon content remains untrusted in the browser. Require Markdown with raw HTML disabled or sanitized, safe URL schemes, controlled remote-image loading, and isolated active-document previews. Keep executable UI controls separate from generated content.

8. **[med] Unattended scheduling lacks a Windows lifecycle decision.**  
   **Reference:** §Open questions — “launchd/systemd user service”; §Shape — crons must run while the tab is closed.  
   **Why it matters:** Those service options leave this Windows workspace without an installation or startup path. Closing the browser, signing out, sleeping, and restarting are materially different conditions. Packaging is deferred to Phase 5 in doc 13, while unattended automation is required in Phase 2.  
   **Concrete fix:** Choose a minimal Windows background-process/startup mechanism before Phase 2, independently of the eventual desktop wrapper. Define startup, shutdown, duplicate-instance prevention, inherited CLI environment, and sleep recovery. Document which conditions suspend execution.

9. **[med] “Keep as-is” understates the work needed to execute the chosen glass design.**  
   **Reference:** §Tech choices — “Plain CSS with tokens (see 14) | keep as-is, no framework.”  
   **Why it matters:** `src/index.css` currently defines opaque panels and a small typography/layout system; doc 14 specifies translucent surfaces and a different shell. Keeping CSS is reasonable, but keeping the styling unchanged would miss the selected direction. Live activity also needs rendering rules so growing output does not overwhelm hierarchy, shift controls, or compete with atmospheric effects.  
   **Concrete fix:** Clarify that the CSS approach stays while tokens and shared components migrate. Require a small visual acceptance matrix covering primary/secondary text, spacing, dense rows, focus, approvals, and streaming output. Verify contrast against the brightest permitted composited glass background, define opaque and reduced-motion variants, batch visual updates, collapse verbose tool details, and preserve scroll position while reading history.

10. **[low] The repository migration is assigned to two different phases.**  
    **Reference:** §Repo layout — migrate “once the daemon exists (Phase 1).”  
    **Why it matters:** Doc 13 explicitly places the same conversion in Phase 0. Implementers cannot follow both sequences consistently, and “moving `src/`” omits the Vite entry point, public assets, configuration, and package scripts visible in the current repository.  
    **Concrete fix:** Select one phase and reference the roadmap as the authority. Describe migration of the complete Vite application and define completion as working root-level development and build commands.