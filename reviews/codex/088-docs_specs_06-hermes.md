1. **[high] Autonomy modes contradict mandatory approvals.**  
   **Reference:** §Behaviors: “Autonomous (log only)” and Ask-first’s “outward/destructive” restriction.  
   **Why it matters:** [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires approval for external sends, destructive actions, and spending; it also requires approval for local writes in Ask-first. “Reads free” leaves allowlist boundaries unclear. Optional `projectId` leaves project policy undefined for unscoped directives.  
   **Fix:** Make §12 authoritative. Define each mode using its action classes, restrict reads to approved paths, and give unscoped directives a restrictive default. Explicitly prohibit autonomy settings from bypassing mandatory approvals.

2. **[high] Observing stdout does not establish control over execution.**  
   **Reference:** §Integration contract: “translates stdout to this schema”; §Behaviors: “the step waits.”  
   **Why it matters:** A wrapper can report an action after it happened without being able to block it. The contract contains neither an approval-request event nor a required interception point before tools execute.  
   **Fix:** Require a runtime hook that blocks tool dispatch until the daemon authorizes it. Define approval events carrying the exact arguments/diff, target, action class, expiry, and run/step IDs. Bind decisions to that immutable payload and reject stale or duplicate decisions. Unsupported runtimes must remain read-only.

3. **[high] Stop promises more than the contract can demonstrate.**  
   **Reference:** §Behaviors: “Stop cancels the current step”; §Acceptance criteria: “halts within a few seconds.”  
   **Why it matters:** Shell descendants, browser jobs, remote requests, pending approvals, and automatic Kanban pickup may continue. [§12](docs/specs/12-security-and-privacy.md) describes a switch stopping *all* agent runs, whereas this doc describes one current step.  
   **Fix:** Separate Pause, Stop this agent, and Stop all. Stop must disable new dispatch and pickup, invalidate pending approvals, cancel owned subprocesses, and report acknowledged versus unconfirmed cancellation. Define a measurable deadline and explain that completed external effects cannot be undone.

4. **[high] “Context attached” has no privacy boundary.**  
   **Reference:** §Behaviors: “Give to Hermes” attaches context; §Screen: expandable input/output and “Logs (raw).”  
   **Why it matters:** A file or project handoff could include secrets, unrelated conversation history, or private folder contents. Tool output can then persist those contents in events, logs, and backups. Local storage does not establish whether execution sends them to a remote model.  
   **Fix:** Define attachment scope, exclusions, size limits, recipient/runtime, and snapshot semantics. Preview outgoing context before dispatch; require fresh confirmation when scope expands. Apply §12 redaction before persistence and streaming, and specify retention and deletion across stored outputs.

5. **[high] Runtime uncertainty is treated as an implementation detail.**  
   **Reference:** §What Hermes is here identifies a model family; §Integration contract leaves CLI/gateway/Docker and memory location unknown.  
   **Why it matters:** The spec assumes an existing agent loop with interruptible tools, editable memory, tool toggles, and live events. Those capabilities do not follow from access to a model endpoint. A successful mock cannot validate them.  
   **Fix:** Separate agent runtime, model provider, and bridge transport. Gate real integration on a capability spike proving pre-execution approval, cancellation, structured events, and supported memory access. Ship one named local runtime first; defer remote and multiple-agent support.

6. **[med] The stream cannot reliably reconstruct an interrupted run.**  
   **Reference:** §Integration contract: `/hermes/stream` step payload.  
   **Why it matters:** Steps lack explicit run/directive correlation, ordering, timestamps, update semantics, and replay rules. After reconnect or daemon restart, the console could duplicate steps, miss approval requests, or display an old run as active—contrary to [architecture reliability rules](docs/specs/01-architecture.md).  
   **Fix:** Define durable event IDs, run/directive/step IDs, sequence, timestamps, lifecycle states, and replay cursors. Reconcile replay with a status snapshot and make directive submission idempotent.

7. **[med] Memory pinning conflates approval with retention.**  
   **Reference:** §Behaviors: proposed memory diffs remain pending “until Jonas pins them”; §Integration contract: `GET/PUT /hermes/memory`.  
   **Why it matters:** Pinning usually means keeping an item prominent or durable, not accepting a write. There is no rejection flow, revision protection, deletion behavior, or statement about whether pending facts influence the agent. Long values also do not fit editable chips.  
   **Fix:** Separate Accept/Reject from Pin/Unpin. Pending proposals must not affect active memory. Use readable rows with an editor and diff view; define revisions, conflict handling, provenance, deletion, and the runtime’s authoritative memory store.

8. **[med] The primary safety information has no clear visual priority.**  
   **Reference:** §Screen prioritizes name, model, uptime, and equal-looking Pause/Stop/Settings controls; approvals appear as a banner.  
   **Why it matters:** The supervisor’s first question is what needs intervention. Current task, project, effective autonomy, and blocked action are less explicitly placed than uptime. A generic banner can be overwhelmed by a busy timeline.  
   **Fix:** Specify a persistent task/project/autonomy strip and a prominent approval region containing the action, target, consequence, expiry, and Approve/Deny controls. Keep uptime secondary. Give Stop a distinct, stable position.

9. **[med] The 40/60 layout leaves density and responsive behavior unresolved.**  
   **Reference:** §Screen: “Left 40%,” “Right 60%,” and “Bottom tabs.”  
   **Why it matters:** The shared chat in [§04](docs/specs/04-chat.md) includes conversation navigation, thread, composer, and context panel; these cannot simply fit inside the left pane. Bottom-tab height and scroll ownership are unspecified. Existing [Hermes routes](src/pages/Hermes.tsx) also use Console/Tasks/Memory/Settings rather than this tab structure.  
   **Fix:** Specify an embedded chat variant containing only thread and composer. Define minimum pane widths, resizable split, independent scroll regions, and a bounded inspector area. Below the width threshold, show one pane at a time while retaining Stop and approval access. Reconcile the route and tab model explicitly.

10. **[med] Glass legibility lacks console-specific acceptance rules.**  
    **Reference:** §Screen: cards, expanded output, logs, status pills; shared tokens in [§14](docs/specs/14-ui-system.md).  
    **Why it matters:** §14 already requires 4.5:1 text contrast, but this doc does not specify how dense output and nested cards preserve it over atmospheric glow. It also leaves typography and spacing undefined. The proposed light text `#E7E8EC` on violet `#8B5CF6` would yield only **3.46:1** if used for filled controls.  
    **Fix:** Require contrast checks on actual composited backgrounds, including the brightest glow and expanded states. Start with 14/20px summaries, 12/18px metadata, 13/20px monospace output, 16px card padding, and 8px internal gaps; use tabular durations and stronger output backing. Add an explicit opaque preference alongside §14’s fallback. An optional ice-blue accent `#7DD3FC` separates selection from teal health status: **10.45:1** on `#171A20`, **7.45:1** on `#303440`; dark `#0B0C0F` button text gives **11.73:1** on that accent.

11. **[med] Persistent motion and live updates have no attention budget.**  
    **Reference:** §Screen: “pulsing when working” and “running step shimmers.”  
    **Why it matters:** Both effects can run throughout long tasks, competing with approvals and making logs harder to follow. The doc also omits scroll-follow behavior and screen-reader announcements. §14’s general reduced-motion rule does not define their replacements.  
    **Fix:** Use static status text and an elapsed timer as the baseline; limit animation to brief transitions. Under reduced motion, remove pulse and shimmer entirely. Follow incoming steps only while the reader is at the bottom; otherwise show a new-events count. Announce state changes and approvals without announcing every output chunk.

12. **[med] Acceptance criteria validate a demo, not safe supervision.**  
    **Reference:** §Acceptance criteria covers mock rendering, one approval, and Stop.  
    **Why it matters:** The criteria omit bridge disconnection, expired approval, daemon restart, cancellation failure, rejected memory, and inaccessible layouts. Status lacks an explicit disconnected or waiting-for-approval state, making stale “working” status plausible.  
    **Fix:** Add focused acceptance cases for blocked execution before approval, timeout denial, reconnect/replay, restart with pending work, confirmed versus unconfirmed Stop, memory rejection, and context exclusion. Include keyboard operation, narrow viewport, reduced motion, opaque mode, and contrast checks. Require a real-runtime smoke test before enabling writes.

13. **[low] Kanban permissions are broader here than in the linked specification.**  
    **Reference:** §Behaviors: Hermes can “move its own cards” and pick up labelled Ready cards.  
    **Why it matters:** [§09](docs/specs/09-kanban.md) permits pickup by assignment **or** label and explicitly reserves Done for Jonas. This shorthand could authorize the wrong transitions or omit eligible work.  
    **Fix:** Reference §09 as authoritative and state permitted transitions, including Review as Hermes’s completion state. Require atomic pickup and deduplication between card pickup and explicit directives.