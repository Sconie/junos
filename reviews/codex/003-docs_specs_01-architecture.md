1. **[high] Approval enforcement has no defined execution boundary.**  
   **Reference:** §Shape: “Workflow runner (steps, retries, approvals)”; §Provider adapter interface: `cwd?, tools?`.  
   **Why it matters:** Official CLIs and Hermes can execute their own tools. An approval step in the workflow runner does not establish how those actions are intercepted before execution. This leaves the guarantees in `12-security-and-privacy.md` unenforceable.
   **Concrete fix:** Define a daemon-owned execution policy applied to every adapter, workflow, and Hermes action. Specify allowed directories, tool permissions, approval interception, and fail-closed behavior. Disable tool execution for integrations that cannot enforce the policy.

2. **[high] Restart recovery does not prevent duplicate external actions.**  
   **Reference:** §Reliability rules: “Every run is resumable or cleanly failed”; “run all missed.”  
   **Why it matters:** A process can crash after sending a message or writing a file but before recording success. Retrying may repeat the action; simply failing the run leaves its outcome unknown. Catch-up can also flood providers with stale work. This undermines the no-duplicates acceptance criterion in `05-tasks-and-workflows.md`.
   **Concrete fix:** Specify persisted schedule-occurrence IDs, atomic job claiming, step checkpoints, and idempotency keys where supported. Mark uncertain external outcomes for reconciliation before retrying. Bound catch-up by age, count, and provider concurrency.

3. **[high] Durable state and event delivery have no consistency contract.**  
   **Reference:** §Event bus: “queries over events plus a few materialized tables.”  
   **Why it matters:** `02-data-model.md` also defines mutable run, message, inbox, and card tables. The architecture never identifies the authoritative representation or requires state changes and events to commit together. A crash could leave an approval visible after resolution, or hide a completed run. SSE reconnect behavior is likewise unspecified.
   **Concrete fix:** Choose canonical entity tables with a transactional event log, or explicitly define event-sourced projections. Require atomic writes, ordered event IDs, snapshot-plus-cursor loading, reconnect replay, client deduplication, and full refresh when a cursor expires.

4. **[high] “Single file, easy backup” conflicts with WAL and the proposed backup procedure.**  
   **Reference:** §Tech choices: “SQLite (WAL) | single file, easy backup.”  
   **Why it matters:** Active WAL databases can hold committed changes outside the main database file. `02-data-model.md` proposes a nightly copy of `junos.db`, which can omit recent transactions or produce an unsuitable backup if implemented as a plain live-file copy.
   **Concrete fix:** Replace the single-file assurance with a requirement to use SQLite’s supported online backup mechanism or a coordinated closed-database snapshot. Include a restore-and-integrity check.

5. **[high] Audit persistence lacks a privacy and deletion boundary.**  
   **Reference:** §Event bus: “Append-only”; §Reliability rules: “Output of runs is stored … for audit.”  
   **Why it matters:** Output truncation limits individual record size, not retention. Prompts, file excerpts, tool output, and secrets could persist across events, run records, messages, and backups. The redaction rule in `12-security-and-privacy.md` does not define how those copies are deleted.
   **Concrete fix:** Define minimal audit metadata separately from sensitive content, redact before persistence, and set retention and total-storage limits. Specify conversation/project deletion across projections and retained backups, with an explicit policy for audit exceptions.

6. **[med] The adapter status contract cannot express the required UI states.**  
   **Reference:** §Provider adapter interface: `status(): Promise<{ connected: boolean; … error?: string }>`.  
   **Why it matters:** `03-connections-and-routing.md` requires `needs_login`, `rate_limited`, `unavailable`, and `degraded`, including reset times and recovery actions. A boolean plus free-text error makes routing and UI behavior depend on interpretation. It also cannot distinguish unknown usage from zero usage.
   **Concrete fix:** Return a discriminated status type with structured reason codes, retry/reset time, recovery action, and usage availability/freshness. Declare capabilities for tools, thinking, cancellation, and effort support so controls reflect actual provider behavior.

7. **[med] Cancellation has no specified run identity or completion semantics.**  
   **Reference:** §Provider adapter interface: `run(req)` and `cancel(runId)`; `RunRequest` contains no run ID.  
   **Why it matters:** The contract does not establish how the daemon’s durable run ID maps to the subprocess being cancelled. It also omits waiting-for-approval and cancelled events, despite the lifecycle in `05-tasks-and-workflows.md`. The UI cannot reliably distinguish “Stop requested” from “Stopped.”
   **Concrete fix:** Pass the daemon-created run ID and cancellation signal into execution. Define typed lifecycle events, process-tree termination, cancellation acknowledgement, and partial-output retention. State how unsupported cancellation is exposed.

8. **[med] Always-on operation depends on an unresolved deployment decision.**  
   **Reference:** §Shape: “crons must run while the tab is closed”; §Open questions: “launchd/systemd user service.”  
   **Why it matters:** Scheduling depends on daemon installation, startup, shutdown, and sleep behavior. The proposed service options also omit the Windows environment in which this project is being developed, while packaging is deferred to Phase 5 in `13-roadmap.md`.
   **Concrete fix:** Choose a minimal Windows daemon lifecycle before unattended scheduling: startup mechanism, single-instance protection, logs, restart policy, and service status. Distinguish tab closure, daemon shutdown, sleep, and machine-off behavior.

9. **[med] The diagram presents uncertain integrations as an established baseline.**  
   **Reference:** §Shape: “Provider adapters (one per subscription)”; §Why not a hosted backend: subscription access presented categorically.  
   **Why it matters:** `03-connections-and-routing.md` explicitly marks Grok as unconfirmed and other routes as requiring verification. The diagram also includes scheduling, workflows, Hermes, indexing, and Scout without distinguishing the first deliverable from the eventual system. This makes dependencies and scope look more settled than the supporting specs establish.
   **Concrete fix:** Separate the initial slice—authenticated daemon, SQLite/events, verified adapters, persisted chat—from later modules. Label uncertain integrations as conditional on capability spikes. Reconcile the migration timing here, Phase 1, with the Phase 0 move in `13-roadmap.md`.

10. **[med] “Keep as-is” leaves the visual implementation contract ambiguous.**  
    **Reference:** §Tech choices: “Plain CSS with tokens (see 14) | keep as-is.”  
    **Why it matters:** The current `src/index.css` implements opaque panels, a 220px sidebar, and generic equal-card grids. The linked UI spec calls for translucent surfaces, a 64px rail, and different responsive behavior. Preserving current styling can therefore produce a partial theme change while retaining weak hierarchy. Neither instruction establishes shared spacing, typography, or component variants.
    **Concrete fix:** Clarify that “keep” applies to the CSS approach. Assign ownership for shared tokens and components, including type roles, spacing/density scales, action hierarchy, and responsive layouts. Preserve the chosen glass direction while requiring opaque reading surfaces and restrained effects for dense work.

11. **[med] Raw activity and attention-worthy information share an undefined presentation pipeline.**  
    **Reference:** §Event bus: “Views (Inbox, Home feed, activity timeline) are queries over events.”  
    **Why it matters:** Token output, routine steps, failures, and approvals have different urgency and reading needs. Without explicit projection rules, the architecture encourages equally weighted activity cards and constantly shifting feeds—the generic dashboard pattern that obscures the next action. `10-home-and-search.md` already prioritizes approvals, but this document does not explain how that priority survives aggregation.
    **Concrete fix:** Define separate projections for actionable attention and detailed activity. Group routine steps under runs, keep approvals and failures prominent, paginate history, and batch streaming updates. Require stable scroll/focus and restrained live announcements so incoming events do not disrupt reading or keyboard work.