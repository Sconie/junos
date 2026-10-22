1. **[high] Approval policy has no enforcement boundary.**  
   **Reference:** §Shape, lines 11–17; §Provider adapter interface, line 32: `cwd?, tools?, systemPrompt?`.  
   **Why it matters:** The daemon launches clients that can execute tools themselves, but the architecture never explains how their actions pass through JunOS approvals. A `tools` request field alone cannot guarantee the policy in spec 12 or the tool restrictions in spec 08.  
   **Concrete fix:** Define a daemon-owned execution policy enforced before each action. Require adapters to declare whether they can intercept tool execution; restrict unsupported adapters to non-executing runs. Resolve project directories against canonical allowlisted paths, including symlink/junction escapes. Bind approvals to the exact action and inputs.

2. **[high] Restart safety promises more than the execution model supports.**  
   **Reference:** §Reliability rules, lines 59–60: “Every run is resumable or cleanly failed” and “run all missed.”  
   **Why it matters:** A process can perform an external action and crash before recording success. Retrying that step can repeat the action. Specs 05 and 13 explicitly require no duplicate or lost scheduled runs, but this doc defines neither durable execution claims nor recovery rules.  
   **Concrete fix:** Persist scheduled occurrences with unique task/time keys, claim them transactionally, checkpoint steps, and distinguish retry-safe work from actions with uncertain outcomes. Require review before repeating an uncertain external action. Cap catch-up batches and define concurrency and cancellation of child processes.

3. **[high] The event stream lacks a consistency and reconnect contract.**  
   **Reference:** §Event bus, line 35: “Append-only `events` table, SSE to the UI”; views combine events and materialized tables.  
   **Why it matters:** State updates and event publication can diverge after a crash. Reconnecting clients can miss or duplicate approvals, unread counts, and run results. Spec 02 also names the table `event`, while this doc calls it `events`.  
   **Concrete fix:** Choose one schema name. Commit state changes and their events in the same transaction; define event IDs, payload versions, ordering, replay cursors, client deduplication, and snapshot recovery when a cursor expires.

4. **[high] “Secrets must not live in browser storage” leaves pairing and streaming authentication unresolved.**  
   **Reference:** §Shape, lines 6 and 17: “token-protected” and “secrets must not live in browser storage.”  
   **Why it matters:** Spec 12 supplies a pairing URL and bearer headers, but neither document explains credential lifetime after pairing or refresh. Native `EventSource` does not expose arbitrary bearer-header configuration, so the chosen SSE client matters. An improvised implementation could put a persistent credential in URLs or browser storage.  
   **Concrete fix:** Specify the production UI origin, pairing exchange, credential lifetime and rotation, and authenticated streaming mechanism. For example, use a same-origin daemon-served UI with an HttpOnly session cookie and explicit CSRF protection, or document an in-memory bearer plus fetch-based SSE flow. Keep credentials out of stream URLs.

5. **[high] Audit storage can retain private content indefinitely.**  
   **Reference:** §Event bus, line 35; §Reliability rules, line 61: output stored “for audit,” with configurable truncation.  
   **Why it matters:** Truncation limits individual records, not retention or total growth. Specs 02 and 05 persist prompts, messages, tool inputs, and outputs; backups create further copies. These can contain private file contents or credentials even when JunOS never deliberately stores provider tokens.  
   **Concrete fix:** Define redaction before persistence and streaming, retention periods, total storage limits, restrictive filesystem permissions, and deletion behavior covering events, run artifacts, search indexes, and backups. Separate durable audit metadata from expiring sensitive payloads.

6. **[med] The adapter contract cannot represent the states the UI requires.**  
   **Reference:** §Provider adapter interface, lines 24–32: `connected: boolean`, untyped run-event comment, and `cancel(runId)`.  
   **Why it matters:** Spec 03 requires `needs_login`, `rate_limited`, `unavailable`, and `degraded`, with reset times and usage availability. A boolean collapses these into misleading UI states. `run()` also provides no explicit contract for obtaining the ID needed to cancel it.  
   **Concrete fix:** Define shared discriminated schemas for connection states, optional usage with provenance/freshness, adapter capabilities, errors, and run events. Allocate a run ID before execution; specify cancellation acknowledgement and partial-output handling. Gate unsupported providers and capabilities behind probe results.

7. **[med] Unattended operation lacks a Windows lifecycle plan.**  
   **Reference:** §Shape, line 17: “crons must run while the tab is closed”; §Open questions, lines 64–65: Tauri versus tab, `launchd/systemd`.  
   **Why it matters:** Jonas’s current environment is Windows, but its startup mechanism is absent. Packaging is deferred to Phase 5 in spec 13, while Phase 2 already expects a daily briefing to run unattended for a week.  
   **Concrete fix:** Define the initial Windows background-process installation and startup mechanism, shutdown/restart behavior, sleep/wake handling, singleton lock, health endpoint, and troubleshooting command. Keep the later wrapper decision independent of daemon reliability.

8. **[med] The database is described as a single backup-ready file despite WAL mode.**  
   **Reference:** §Shape, line 9: “one file”; §Tech choices, line 44: “SQLite (WAL) … easy backup.”  
   **Why it matters:** Spec 02 proposes a nightly copy of `junos.db`. Copying only that file while WAL writes are active can omit committed data. The architecture currently encourages the wrong backup implementation.  
   **Concrete fix:** Specify SQLite’s supported online backup mechanism or a coordinated checkpoint/closed-database procedure. Include restore verification and schema migration compatibility; describe the database as one logical store rather than one live filesystem file.

9. **[med] Live updates have no presentation budget for the glass UI.**  
   **Reference:** §Provider adapter interface, line 28; §Event bus, line 35; §Tech choices, line 41.  
   **Why it matters:** Tokens, tool steps, and activity updates can repeatedly invalidate queries, rerender long histories, and shift attention. Over frosted panels, continuous shimmer or movement also competes with text. Spec 14 mentions reduced motion, but the architecture does not say how updates preserve reading position, focus, or announcement priority.  
   **Concrete fix:** Separate transient token deltas from durable domain events; batch visible text updates and invalidate only affected queries. Paginate histories, preserve scroll position, and announce completed messages or actionable state changes rather than every token. Keep Stop/Approve controls stable and provide static reduced-motion states.

10. **[med] “Keep as-is” styling has no migration or visual acceptance contract.**  
    **Reference:** §Tech choices, line 42: “Plain CSS with tokens (see 14) … keep as-is, no framework.”  
    **Why it matters:** Keeping plain CSS is workable, but current `src/index.css` implements opaque panels, a 220px sidebar, and a 720px breakpoint; spec 14 proposes glass, a 64px rail, and a 900px breakpoint. Neither this architecture nor its referenced UI system establishes a complete spacing/type scale or concrete validation of contrast across composited glass states.  
    **Concrete fix:** Clarify that the styling technology stays while the visual system migrates. Assign shared shell/component ownership and require checks for text contrast over the brightest glow, focus and control contrast, readable typography, consistent row/panel spacing, narrow-screen density, and opaque/high-contrast/reduced-motion fallbacks.

11. **[low] Repository migration has two incompatible milestones.**  
    **Reference:** §Repo layout, line 56: move `src/` “once the daemon exists (Phase 1).”  
    **Why it matters:** Spec 13 places the monorepo conversion and shared mock API in Phase 0. Implementers cannot follow both sequences, and the timing affects shared schemas and frontend API integration.  
    **Concrete fix:** Choose one milestone and state exactly what moves, including Vite configuration, entry HTML, TypeScript configuration, scripts, and lockfile ownership. Align the roadmap reference with that sequence.