1. **[high] Approval enforcement is missing from the execution boundary.**  
   **Reference:** [Shape and adapter interface](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:7): “Workflow runner (steps, retries, approvals)” and `run(req)`.
   
   **Why it matters:** Approvals appear owned by workflows, while provider CLIs and Hermes can also execute tools. Nothing in this contract requires those execution paths to pause before an external or destructive action. The policy in §12 therefore has no defined enforcement point.
   
   **Concrete fix:** Add a daemon-owned policy gate shared by every executor. Require adapters to support enforceable tool restrictions and approval handshakes; reject unattended execution when they cannot. Bind approval to the exact action, arguments and project, and recheck changed actions.

2. **[high] Restart reliability promises exceed the recovery contract.**  
   **Reference:** [Reliability rules](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:58): “Every run is resumable or cleanly failed” and “run all missed.”
   
   **Why it matters:** A daemon can crash after a command succeeds but before recording completion. Retrying may repeat a file write or external action; marking it failed does not establish whether the action happened. Catch-up can also produce an unbounded backlog, conflicting with subscription budgets in §03.
   
   **Concrete fix:** Define durable run/step states, unique scheduled-occurrence IDs, worker leases and orphan-process recovery. Record uncertain outcomes explicitly and require reconciliation before retrying non-idempotent actions. Bound catch-up by age, count and provider concurrency.

3. **[high] Persistent audit data has no privacy or deletion boundary.**  
   **Reference:** [Event bus](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:34) and [Reliability rules](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:61): “Append-only” events and stored run output.
   
   **Why it matters:** Messages, tool arguments and outputs can contain private file content or credentials. Size truncation does not prevent sensitive capture, and append-only storage leaves deletion undefined. §12 mentions log redaction, but this architecture does not place it before persistence or address event payloads and backups.
   
   **Concrete fix:** Specify redaction before storage and streaming, minimal event payloads referencing separately retained content, per-content retention limits, and deletion behavior covering projections, search indexes and backup expiry. Distinguish local orchestration/storage from content sent to providers.

4. **[med] The event stream cannot yet guarantee consistent UI state.**  
   **Reference:** [Event bus](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:35): views query events plus materialized tables.
   
   **Why it matters:** No transaction boundary, replay cursor or snapshot protocol is defined. A reconnecting browser could miss an approval, duplicate a result, or display an old run state. The document also calls the table `events`, while §02 defines `event`.
   
   **Concrete fix:** Choose one table name and define a versioned event envelope with event ID, run/entity ID and sequence. Commit entity changes and their events atomically. Specify cursor-based replay, duplicate handling and snapshot recovery when a cursor expires.

5. **[med] The adapter contract cannot express the states the UI requires.**  
   **Reference:** [Provider adapter interface](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:24): `connected: boolean`, `error?: string`, and `cancel(runId)`.
   
   **Why it matters:** §03 requires `needs_login`, `rate_limited`, `unavailable` and `degraded`, with recovery actions and reset times. A boolean plus free text cannot reliably drive those controls. Cancellation also takes a run ID that neither `RunRequest` nor the documented return contract establishes.
   
   **Concrete fix:** Use a discriminated connection-state type with structured recovery and retry information. Add capability declarations for tools, resumability and cancellation. Supply a daemon-owned run ID before execution and define cancellation acknowledgement, partial-output retention and terminal states.

6. **[med] Browser authentication and streaming are not joined into one workable protocol.**  
   **Reference:** [Shape](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:6): “HTTP + SSE/WebSocket … token-protected”; [daemon rationale](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:17): secrets must not live in browser storage.
   
   **Why it matters:** §12 specifies bearer headers and pairing, but native `EventSource` does not expose arbitrary request headers. WebSocket authentication needs its own mechanism. Without a decision, implementation may put a reusable token into URLs or persistent browser storage.
   
   **Concrete fix:** Select one initial transport—for example, fetch-based SSE with an in-memory bearer token—and define pairing, reload/re-pair behavior, expiry and rotation. Explicitly incorporate §12’s loopback, Origin and Host checks.

7. **[med] “Single file, easy backup” conflicts with the proposed WAL backup approach.**  
   **Reference:** [Tech choices](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:44): “SQLite (WAL) | single file, easy backup.”
   
   **Why it matters:** §02 proposes nightly copies of `junos.db`. With an active WAL database, copying that file alone can omit committed data still in the WAL. The stated simplicity encourages an unsafe implementation.
   
   **Concrete fix:** Describe SQLite as one logical database and require a consistent snapshot through the selected driver’s backup facility, or a controlled shutdown/checkpoint procedure. Include restore verification and schema-version compatibility.

8. **[med] Continuous scheduling depends on an unresolved installation model.**  
   **Reference:** [Daemon rationale](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:17) and [Open questions](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:63).
   
   **Why it matters:** Closing the tab is handled by a separate process, but startup, crashes, logout and sleep remain unspecified. The proposed service choices name launchd/systemd, leaving this Windows workspace without an explicit path. A service may also run with a different environment from the signed-in provider CLIs.
   
   **Concrete fix:** Define the first supported platform and user-session launcher, restart policy, singleton lock, CLI discovery and credential-store access. Make sleep/logout limitations explicit and distinguish daemon availability from provider availability in the UI.

9. **[med] Provider feasibility is presented as more settled than the supporting spec allows.**  
   **Reference:** [Daemon rationale](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:17): “subscriptions are reachable only through local CLIs and sessions”; adapter IDs include all five providers.
   
   **Why it matters:** §03 explicitly leaves Grok unconfirmed and Cursor/Nous subject to verification. The architecture does not distinguish a supported subscription adapter from an unavailable placeholder or an API-backed integration.
   
   **Concrete fix:** Make the architecture conditional on verified adapter capabilities. Define the initial supported subset, keep unresolved providers disabled, and specify that API billing or browser-session integration requires a separate explicit decision.

10. **[med] The styling handoff lacks a verification gate for readable glass.**  
    **Reference:** [Tech choices](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:42): “Plain CSS with tokens (see 14).”
    
    **Why it matters:** §14 already specifies glass, contrast and fallbacks, but the architecture does not define how those requirements enter the UI migration. Current CSS has hard-coded spacing and accent-filled chat bubbles; simply changing token values cannot establish hierarchy, density or accessible foreground/background combinations.
    
    **Concrete fix:** Require a shared token/component migration with role-specific foregrounds, typography/line-height and spacing scales. Gate it on representative chat, approval and dense-table states at desktop and narrow widths, including opaque/high-contrast and reduced-motion variants. Test contrast over the brightest composited glow, plus focus indicators and live-stream behavior without forced scrolling. A possible accent is **ice blue `#67C7EB`**, which separates actions from teal success states and gives **9.98:1** against `#0E0F13` when paired with that dark button text; composited glass still needs separate checks.

11. **[low] The repository migration has two different milestones.**  
    **Reference:** [Repo layout](/E:/AI/review-loop/junos/docs/specs/01-architecture.md:56): migrate “once the daemon exists (Phase 1).”
    
    **Why it matters:** §13 schedules the monorepo conversion in Phase 0. Contributors cannot tell which layout subsequent work should target.
    
    **Concrete fix:** Choose one milestone and align this section with §13. Include Vite configuration, TypeScript references, scripts and shared-package imports in the migration boundary.