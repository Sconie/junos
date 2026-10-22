1. **[high] Approval policy has no enforcement boundary inside provider processes.**  
   **Reference:** “The UI cannot touch CLIs or the filesystem; the daemon can” (lines 17, 22–32).  
   **Why it matters:** `RunRequest.tools?` does not establish how a CLI’s native shell, file, or network tools are restricted. A tool event received after execution cannot enforce the approvals promised in `12-security-and-privacy.md`.  
   **Concrete fix:** Add a mandatory execution-policy boundary: validated project roots, explicit tool permissions, approval interception before execution, and process-tree cancellation. Adapters that cannot enforce the requested policy must reject the run. Make this a prerequisite for tool-enabled runs.

2. **[high] Restart safety is promised without defining how side effects are reconciled.**  
   **Reference:** “Every run is resumable or cleanly failed”; catch-up policies (lines 58–60).  
   **Why it matters:** A process can complete a file write or external action, then crash before recording success. Retrying may duplicate the action; marking the run failed does not establish whether it happened. This conflicts with the no-duplicate acceptance criteria in `05-tasks-and-workflows.md`.  
   **Concrete fix:** Define durable run/step states, unique scheduled-occurrence IDs, checkpoints and startup reconciliation. Automatically retry only operations known to be safe; surface uncertain side effects for review. Bound “run all missed” by age and count.

3. **[high] The event architecture lacks atomic writes and reconnect semantics.**  
   **Reference:** “Append-only `events` table, SSE to the UI”; views query events and materialized tables (line 35).  
   **Why it matters:** The doc does not choose which data is authoritative or require entity changes and events to commit together. A crash or dropped stream could leave Inbox, Home and Kanban disagreeing. `02-data-model.md` also names the table `event`, rather than `events`.  
   **Concrete fix:** Choose one model explicitly—for example, authoritative entity tables with an event written in the same SQLite transaction. Specify ordered event IDs, replay cursors, duplicate handling and snapshot recovery when a cursor expires. Standardize the table name.

4. **[high] Audit storage can retain sensitive content indefinitely.**  
   **Reference:** Append-only event payloads; “Output of runs is stored … for audit” (lines 35, 61).  
   **Why it matters:** `02-data-model.md` also stores messages, thinking, tool inputs and outputs. An output-size cap limits individual records, not retention or total disk growth. Secret-pattern redaction in doc 12 does not address ordinary private file content copied into events and backups.  
   **Concrete fix:** Define minimal event payloads, redact before persistence, and keep large content behind references. Specify retention, total storage limits, conversation/project deletion and backup expiry. Clarify that append-only operation still permits controlled privacy deletion and compaction.

5. **[high] “Single file, easy backup” is unsafe guidance for the proposed live database.**  
   **Reference:** SQLite WAL, “single file, easy backup” (line 44).  
   **Why it matters:** A running WAL database can have committed changes outside the main `.db` file. This wording supports the nightly main-file copy described in `02-data-model.md`, which can omit recent committed data.  
   **Concrete fix:** Replace the claim with an explicit consistent-backup procedure using SQLite’s backup mechanism, or a coordinated shutdown/checkpoint procedure. Require a restore check and identify which run-output files must accompany the database.

6. **[med] Authentication is delegated without resolving browser pairing and streaming.**  
   **Reference:** “HTTP + SSE/WebSocket … token-protected”; “secrets must not live in browser storage” (lines 6, 17).  
   **Why it matters:** Doc 12 introduces a pairing URL and bearer header, but the architecture leaves token exchange, refresh and stream authentication unspecified. Native browser `EventSource` cannot directly set an arbitrary bearer header, creating pressure to place a reusable token in a URL.  
   **Concrete fix:** Choose the transport and authentication flow: for example, a short-lived, single-use pairing exchange with an in-memory session and authenticated `fetch` streaming. Specify reconnect behavior and prohibit reusable credentials in URLs or logs. Cross-reference doc 12’s loopback, Origin and Host restrictions.

7. **[med] The adapter contract cannot express the routing and recovery states the UI needs.**  
   **Reference:** `status(): Promise<{ connected: boolean; … error?: string }>` and `RunRequest` (lines 24–32).  
   **Why it matters:** Doc 03 requires distinct `needs_login`, `rate_limited`, `unavailable` and `degraded` states, reset times and capability discovery. A boolean plus free-text error makes dependable fallback routing and useful recovery actions difficult. The contract also leaves run-ID assignment and approval waits unclear.  
   **Concrete fix:** Define typed connection states, capability flags and structured errors with retry/reset metadata. Assign a run ID before execution and define ordered run events, approval waits, terminal outcomes and cancellation acknowledgements. Treat unverified providers as optional capabilities.

8. **[med] Background execution has no Windows lifecycle plan.**  
   **Reference:** “crons must run while the tab is closed”; launchd/systemd open question (lines 17, 63–65).  
   **Why it matters:** This workspace runs on Windows, while the only service options named target other operating systems. Packaging is deferred to Phase 5 in doc 13, but unattended automation is required in Phase 2. Closing the tab, logging out and sleeping the machine are different lifecycle conditions.  
   **Concrete fix:** Specify an initial Windows launch/autostart mechanism, single-instance protection, shutdown behavior, logs and sleep/wake reconciliation before automation ships. Define a configurable data directory, defaulting large indexes and output caches to E:.

9. **[med] Live-update architecture omits controls that preserve hierarchy and reading position.**  
   **Reference:** Streaming run events and event-driven views (lines 28, 35); proposed UI-state split (line 41).  
   **Why it matters:** Token-by-token rendering, expanding logs and reordered lists can produce layout shifts, steal scroll position and overwhelm assistive announcements. Glass panels make stable text placement and restrained motion particularly important during long sessions.  
   **Concrete fix:** Add a shared stream-consumption policy: batch text updates, paginate or virtualize long histories, preserve scroll unless following the latest output, and avoid moving focused rows. Keep approvals and failures visibly actionable. Define reduced-motion behavior and announce meaningful state changes rather than every token.

10. **[med] “Keep as-is” leaves the shared visual system’s migration undefined.**  
    **Reference:** “Plain CSS with tokens (see 14) | keep as-is” (line 42).  
    **Why it matters:** `src/index.css` currently uses opaque panels, `--muted`, a 220px sidebar and a 720px breakpoint. Doc 14 specifies translucent surfaces, `--text-dim`, a 64px rail and a 900px breakpoint. Neither the ownership nor migration of these shared primitives is defined, inviting inconsistent spacing, density, typography and fallback behavior across screens.  
    **Concrete fix:** Clarify that plain CSS stays while the existing tokens and shell migrate. Name one shared token/shell layer and require reusable density and typography primitives. Make doc 14’s contrast, motion and opaque-fallback requirements acceptance gates: test text over the brightest permitted glow and panel stack, visible focus/control boundaries, zoomed layouts and opaque mode.