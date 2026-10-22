1. **[high] “Autonomous” contradicts the mandatory approval policy.**  
   **Reference:** §Behaviors, line 27: “Autonomous (log only).”  
   **Why it matters:** `12-security-and-privacy.md` requires approval for external sends, destructive actions and spending; `00-overview.md` also reserves outward-facing actions for Jonas. Implementers cannot tell which rule wins. Directives without `projectId` also have no defined autonomy policy.  
   **Fix:** Make those approval classes mandatory across all levels. Define the effective policy for unscoped directives and cross-project work, and prevent agents from changing their own permissions.

2. **[high] The bridge describes observation without establishing enforcement.**  
   **Reference:** §Integration contract, line 18: “translates stdout to this schema.”  
   **Why it matters:** A report of a shell command does not establish that JunOS can intercept it before execution. The console could appear to supervise an agent whose tools bypass its approval gates.  
   **Fix:** Require a pre-execution authorization handshake at every tool boundary. Specify how direct shell, browser, file and API access is constrained. Adapters without enforceable interception should expose monitoring only, with execution disabled.

3. **[high] Stop has an untestable and potentially misleading guarantee.**  
   **Reference:** Lines 30 and 37: “cancels the current step” and “halts within a few seconds.”  
   **Why it matters:** Terminating a wrapper may leave subprocesses or remote operations running. Already-sent requests cannot necessarily be recalled. The security spec additionally promises a switch that stops **all** agent runs, whereas this document describes one current step.  
   **Fix:** Distinguish agent Stop from global Stop. Specify cancellation propagation, subprocess termination, queued-work suspension, pending-approval invalidation and a measurable deadline. Show “Stopping” until acknowledged and “Cancellation unconfirmed” when appropriate.

4. **[high] Approval decisions are not bound to an immutable action.**  
   **Reference:** Lines 16 and 28: `{decision}` and a configurable approval timeout.  
   **Why it matters:** The contract does not prevent an action changing after review, approval being submitted twice, or an expired approval executing after reconnect. The console banner also lacks the exact command/diff required by `12-security-and-privacy.md`.  
   **Fix:** Define approval records containing agent, run, step, project, exact arguments/diff, policy version and expiry. Resolve them atomically and once only; reject changed or expired actions. Specify matching details and final state in both Inbox and console.

5. **[high] Agent, directive and run identities disappear across the API.**  
   **Reference:** Lines 9–16 and 41: singleton `/hermes/*` endpoints despite “data model already allows many.”  
   **Why it matters:** Steps contain no run/directive identifier; memory, queue and Stop have no agent scope. Even one agent needs correlations between its chat, scheduled work and Kanban cards. `02-data-model.md` already distinguishes agents, runs and steps.  
   **Fix:** Either explicitly constrain v1 to one agent or scope requests by agent ID. Include `agentId`, `directiveId`, `runId`, `stepId` and project scope in events and controls.

6. **[high] Reconnect and retry semantics can duplicate autonomous work.**  
   **Reference:** §Integration contract, lines 9–15.  
   **Why it matters:** There is no directive idempotency key, event replay cursor, ordering rule or restart reconciliation. A dropped response could cause a directive to be resubmitted; a missed event could leave the UI showing stale approval or execution state. This falls short of the restart guarantees in `01-architecture.md`.  
   **Fix:** Define idempotent submission, persisted event sequence numbers, SSE replay and snapshot reconciliation. Include queued, waiting-for-approval, cancelling and terminal run states. Require reconnect and daemon-restart acceptance tests.

7. **[high] Context handoff and raw output lack a privacy boundary.**  
   **Reference:** Lines 11, 24 and 32: full `input`/`output`, “Logs (raw)” and “context attached.”  
   **Why it matters:** Attached context may contain private material, secrets or unrelated conversation history. Model execution may send it outside the machine. Raw output also risks preserving credentials before the general redaction rule is applied.  
   **Fix:** Define a context manifest showing selected files/messages, destination and exclusions before submission. Apply redaction before streaming and persistence; specify output caps, retention and deletion. Treat tool output as untrusted text, including terminal escape sequences and embedded markup.

8. **[med] The mock-first milestone does not validate the hardest integration claims.**  
   **Reference:** Lines 4, 18 and 34–37.  
   **Why it matters:** The opening describes Hermes through its model family and hosting options without identifying the executable agent runtime. All acceptance criteria can pass against a mock while real approvals, memory updates and cancellation remain unsupported. Shell sandboxing is scheduled later in `13-roadmap.md`.  
   **Fix:** Separate agent runtime from model/provider configuration. Name one initial runtime and supported version, publish its capability matrix, and gate real execution on verified approvals and cancellation. Stage memory/tool editing after that vertical slice.

9. **[med] Memory review conflates approval, activation and pinning.**  
   **Reference:** Lines 24 and 31: “editable chips with pin” and proposals waiting “until Jonas pins them.”  
   **Why it matters:** Pinning does not communicate whether a fact becomes active, immutable or merely prominent. The optional setting leaves unclear whether unreviewed proposals already influence future runs. Chips are also a poor fit for multiline facts and meaningful diffs.  
   **Fix:** Define separate Proposed, Accepted and Rejected states; make pinning an independent retention control. Use readable rows with value, provenance, scope and timestamp, opening a full diff/editor. Specify conflict handling and when accepted changes reach the runtime.

10. **[med] Kanban pickup rules disagree with the board specification.**  
    **Reference:** Line 29: cards “labelled `hermes` in the Ready column.”  
    **Why it matters:** `09-kanban.md` also permits assignment to Hermes and defines one-card concurrency, Review handoff and Blocked outcomes. This shortened rule can leave eligible cards stranded or allow an agent to create, ready and execute its own follow-up work without a clear authorization boundary.  
    **Fix:** Reference one canonical pickup policy covering assignment/labels, atomic claiming, concurrency and outcomes. Explicitly define who may move cards into Ready and whether agent-created follow-ups require Jonas’s triage.

11. **[med] The screen lacks a clear priority for blocked decisions.**  
    **Reference:** Lines 21–24 and 28: metadata-heavy header, chat/activity split and approval banner.  
    **Why it matters:** Uptime, model, animated activity and utility tabs compete with the console’s central question: what is Hermes doing, and does Jonas need to intervene? “Waiting for approval” is not even a status value in the bridge.  
    **Fix:** Lead with current task, project, effective autonomy and the next required decision. Place the actionable approval directly beside its step, with a persistent summary above the timeline. Keep uptime and configuration secondary; keep Stop visible and spatially separate from routine actions.

12. **[med] The 40/60 split has no height, overflow or responsive contract.**  
    **Reference:** Lines 22–24: two live panes plus bottom tabs.  
    **Why it matters:** The split leaves little room for code at narrow widths, while an unconstrained bottom inspector can squeeze both primary panes. Existing `src/pages/Hermes.tsx` also exposes top-level Console/Tasks/Memory/Settings routes, so the intended navigation change is ambiguous.  
    **Fix:** Define pane minimum widths, a gutter, resizable proportions and bounded inspector height. Give panes independent scrolling while preserving composer and Stop visibility. Below the shared 900px breakpoint, use one primary view with Activity/Chat switching and full-screen inspection sheets. State how existing routes migrate.

13. **[med] Timeline density and typography are unspecified for realistic output.**  
    **Reference:** Line 23: step cards with expandable input/output.  
    **Why it matters:** Hundreds of cards or one long command can overwhelm the console. Neither card spacing nor the distinction between summaries, metadata and raw output is defined; repeated glass cards risk becoming visually equal blocks.  
    **Fix:** Specify a compact summary row: readable action text, quieter metadata and aligned tabular durations. Use a consistent spacing scale, roughly 14–16px summaries and 13–14px monospace output with comfortable line height. Collapse details by default, bound large output and provide wrapping/copy controls. Add filtering, paginated history and “Jump to latest” without forced scrolling.

14. **[med] Glass contrast and motion need console-specific acceptance criteria.**  
    **Reference:** Lines 21–23: pulsing status and shimmering running step; shared rules in `14-ui-system.md`.  
    **Why it matters:** The shared fallback rules are useful, but this console does not specify how pulse/shimmer become static, how streaming updates are announced, or how text remains legible over the brightest atmospheric backdrop.  
    **Fix:** Retain the glass direction and test text against actual composited surfaces. Use stable “Running”/“Waiting for approval” labels, restrained live announcements, visible keyboard focus and static reduced-motion states. Define a user-selectable opaque mode alongside the unsupported-blur fallback. An optional **cool blue accent `#78B4F5`** would separate interaction from teal health states: calculated contrast is **8.98:1 against `#0B0C0F`** and **7.14:1 against an opaque `#20242C` fallback**. Use dark text on blue fills; these solid-color ratios still require verification over rendered glass.

