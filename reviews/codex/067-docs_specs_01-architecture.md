1. **[high] Approval enforcement has no architectural owner.**  
   **Reference:** [Provider adapter interface, lines 24–32](E:/AI/review-loop/junos/docs/specs/01-architecture.md:24): `run(req)` and optional `tools?`.  
   **Why it matters:** A CLI launched with filesystem and shell access can act before JunOS receives a tool event. Displaying approvals afterward cannot enforce spec 12’s “always ask” policy. The roadmap also places automation before its explicit approvals milestone.  
   **Fix:** Specify a mandatory daemon policy boundary before every side effect, including provider-native tools and Hermes actions. Require adapters to declare enforceable permission capabilities; disable unattended execution when approval interception is unavailable.

2. **[high] Browser authentication and authenticated streaming are unresolved.**  
   **Reference:** [Shape, lines 6–17](E:/AI/review-loop/junos/docs/specs/01-architecture.md:6): “token-protected” and “secrets must not live in browser storage.”  
   **Why it matters:** Spec 12 introduces a bearer token and pairing URL, but neither document completes the browser session lifecycle. Native `EventSource` cannot attach an arbitrary bearer header. An implementation may consequently put credentials in stream URLs, browser history, or persistent storage.  
   **Fix:** Choose one transport and authentication mechanism. For example, serve the production UI from the daemon, exchange a short-lived pairing code for a protected session cookie, validate origins and protect mutations against CSRF. Alternatively, specify memory-only bearer authentication with fetch-based SSE, including reload and re-pairing behavior.

3. **[high] Restart safety is promised without durable execution semantics.**  
   **Reference:** [Reliability rules, lines 59–60](E:/AI/review-loop/junos/docs/specs/01-architecture.md:59): “Every run is resumable or cleanly failed”; “run all missed.”  
   **Why it matters:** A crash after an external action but before its completion record leaves an ambiguous outcome. Retrying can repeat that action. Unbounded catch-up can also flood providers after extended downtime. The adapter accepts `cancel(runId)` without defining how the caller obtains that ID.  
   **Fix:** Allocate and persist run IDs before execution; define durable step checkpoints, scheduled-occurrence uniqueness, idempotency keys, and an `outcome_unknown` reconciliation state. Bound catch-up by age, count, concurrency, and usage budget. Define cancellation acknowledgment and child-process cleanup.

4. **[high] The event stream lacks an atomicity and reconnection contract.**  
   **Reference:** [Event bus, line 35](E:/AI/review-loop/junos/docs/specs/01-architecture.md:35): “Append-only `events` table, SSE to the UI.”  
   **Why it matters:** Without transactional updates, a run can complete without its Inbox result appearing. Without replay and deduplication, reconnecting can lose updates or show duplicates. There is also a naming contradiction: this document says `events`, while spec 02 defines `event`.  
   **Fix:** Select one table name; commit entity changes and their events together. Define event IDs, payload versions, ordering, replay cursors, deduplication, and snapshot recovery when a cursor expires. Publish only committed events.

5. **[high] Append-only audit storage has no privacy or deletion boundary.**  
   **Reference:** [Event bus, line 35](E:/AI/review-loop/junos/docs/specs/01-architecture.md:35) and [Reliability rules, line 61](E:/AI/review-loop/junos/docs/specs/01-architecture.md:61): stored run output “for audit.”  
   **Why it matters:** Prompts, file contents, tool output, and private messages can accumulate across run records, events, indexes, and backups. Truncation limits size; it does not prevent disclosure. Spec 12’s secret-pattern redaction does not cover ordinary sensitive content.  
   **Fix:** Define an allowlisted event payload schema, redact before persistence and streaming, and store references instead of duplicating content. Specify retention and deletion across records, search indexes, and backups; distinguish permanent audit metadata from deletable content.

6. **[med] The adapter contract cannot express the UI’s required connection states.**  
   **Reference:** [Provider adapter interface, lines 26–28](E:/AI/review-loop/junos/docs/specs/01-architecture.md:26): `connected: boolean` and optional `usage`.  
   **Why it matters:** Spec 03 requires `needs_login`, `rate_limited`, `unavailable`, and `degraded`, with different recovery actions. A boolean encourages misleading status pills and unusable controls. Missing usage data also makes the background budget threshold impossible to enforce reliably.  
   **Fix:** Use a discriminated connection state with reason, retry/reset time, and last-check timestamp. Declare capabilities for streaming, tools, cancellation, effort, and usage reporting. Define a conservative budget policy when usage is unknown.

7. **[med] Always-on behavior depends on an installation decision left open.**  
   **Reference:** [Shape, line 17](E:/AI/review-loop/junos/docs/specs/01-architecture.md:17) and [Open questions, lines 64–65](E:/AI/review-loop/junos/docs/specs/01-architecture.md:64): crons run with the tab closed; service installation remains undecided.  
   **Why it matters:** A separately launched daemon still needs startup, supervision, and recovery. The service examples cover macOS/Linux, while this workspace is on Windows. Spec 13 postpones service installation until Phase 5 despite unattended automation in Phase 2.  
   **Fix:** Specify the Windows launch and supervision path before automation ships, including single-instance locking, restart behavior, logs, and UI reconnection. State explicitly that sleep/offline periods use catch-up rather than guaranteed execution.

8. **[med] “Single file, easy backup” is unsafe guidance for WAL storage.**  
   **Reference:** [Tech choices, line 44](E:/AI/review-loop/junos/docs/specs/01-architecture.md:44).  
   **Why it matters:** With WAL enabled, committed data may remain in the WAL sidecar. Spec 02’s nightly copy of only `junos.db` can omit recent committed changes.  
   **Fix:** Require a consistent SQLite backup operation rather than copying the live database file. Define restore verification and retention, and qualify “single file” as a logical database description.

9. **[med] “Keep as-is” leaves the glass migration without a visual acceptance gate.**  
   **Reference:** [Styling choice, line 42](E:/AI/review-loop/junos/docs/specs/01-architecture.md:42): “Plain CSS with tokens (see 14) … keep as-is.”  
   **Why it matters:** The CSS approach can stay, but `src/index.css` currently has opaque panels, a 220px sidebar, and a 720px breakpoint; spec 14 describes glass panels, a 64px rail, and a 900px navigation change. Neither a token swap nor retaining existing component geometry establishes consistent hierarchy, spacing, typography, or density.  
   **Fix:** Clarify that “keep” applies to the styling technology. Make spec 14 the visual contract and require representative Chat, Inbox, and Tasks checks at desktop, tablet, and phone widths. Include a spacing scale, body size/line-height, row density, readable text measure, and a clear primary action for each screen.

10. **[med] Glass legibility and motion requirements are referenced but not verifiable.**  
    **Reference:** [Styling choice, line 42](E:/AI/review-loop/junos/docs/specs/01-architecture.md:42), inheriting spec 14’s translucent surfaces, glow, and accessibility rules.  
    **Why it matters:** Contrast depends on the composited background, not just foreground tokens. Blur support also does not establish that transparency is comfortable or performant. A rapid event stream can continually animate or move operational content.  
    **Fix:** Require contrast checks over the brightest supported glow and layered surfaces, explicit opaque/high-contrast modes, and reduced-motion behavior that removes pulses, shimmer, and travel while retaining status information. Batch streamed updates and preserve scroll/focus. Define foreground/background role pairs. A candidate accent is sky blue `#7DD3FC`: dark text `#0B0C0F` on that fill gives **11.73:1**; blue on opaque `#202126` gives **9.64:1**. It separates actions from teal success states; actual glass composites still need checking.

11. **[low] Repository migration is assigned to two different phases.**  
    **Reference:** [Repo layout, line 56](E:/AI/review-loop/junos/docs/specs/01-architecture.md:56): move `src/` “once the daemon exists (Phase 1).”  
    **Why it matters:** Spec 13 assigns the monorepo conversion to Phase 0. Contributors cannot tell which layout the mock API and initial daemon should target.  
    **Fix:** Choose one milestone and align this document with it. Define the minimum transition deliverable: workspace configuration, working web build, daemon entry point, and shared schema imports.