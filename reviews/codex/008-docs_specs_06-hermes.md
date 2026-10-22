1. **[high] Autonomy levels contradict the security policy.**  
   **Reference:** Behaviors: “Autonomous (log only)” and “reads free” (line 27).  
   **Why it matters:** `12-security-and-privacy.md` requires approval for external sends, destructive actions and spending, and limits automatic reads to allowlisted files. This spec permits a broader interpretation, with no policy for directives lacking `projectId`.  
   **Concrete fix:** Make the security policy the mandatory floor for every autonomy level. Define projectless directives as restricted by default, show the effective project/policy before submission, and prevent agent tools from modifying that policy.

2. **[high] The bridge promises enforcement through an observation-only integration.**  
   **Reference:** “translates stdout to this schema” (line 18); approval endpoint (line 16).  
   **Why it matters:** Reading stdout does not establish that JunOS can intercept an action *before* execution. The contract contains no approval-request event, action classification or binding between an approval and the exact operation. A mock could pass while real commands bypass supervision.  
   **Concrete fix:** Require a pre-execution tool hook or mediated executor. Define approval requests with immutable action parameters, project/run/step IDs, expiry and single-use decisions. Disable execution when an adapter cannot enforce these controls.

3. **[high] Stop has conflicting scope and no verifiable completion semantics.**  
   **Reference:** “Stop cancels the current step and drops queue to paused” (line 30); “halts within a few seconds” (line 37).  
   **Why it matters:** `12-security-and-privacy.md` says the kill switch stops **all agent runs**. This document describes one step, without covering child processes, remote work, new queue submissions or pending approvals. The UI could report a successful stop while work continues.  
   **Concrete fix:** Distinguish Pause, Stop current run and Stop all agents. Specify cancellation acknowledgement, process-tree handling, approval invalidation and a latched dispatch block. Show “Stopping” until confirmed, with an explicit failure state; test a bounded local stop and unavailable remote executor.

4. **[high] Context handoff and raw telemetry lack an explicit privacy boundary.**  
   **Reference:** “context attached” (line 32); streamed `input, output` (line 11); “Logs (raw)” (line 24).  
   **Why it matters:** The contract cannot describe attachments, their provenance or their destination. A project handoff could disclose substantially more than the selected item, while secrets could reach SSE clients or persisted events before display-time redaction. This is especially unresolved for remote Hermes.  
   **Concrete fix:** Define attachment manifests, content limits, exclusions and local-versus-provider destinations. Preview what a handoff includes. Apply the exclusions from `11-files-and-projects.md` and redact telemetry before streaming or persistence; define retention and safe rendering of untrusted output.

5. **[high] Mock acceptance conceals unresolved integration feasibility.**  
   **Reference:** Model-based definition of Hermes (line 4), unknown runtime/memory location (line 18), deployment questions (lines 40–41), mock acceptance (lines 35–36).  
   **Why it matters:** The document does not distinguish the agent runtime from its model provider. Nevertheless, it commits to live supervision, memory editing, tool toggles and cancellation across an unspecified deployment. `13-roadmap.md` expects a real Ready-to-Review execution path.  
   **Concrete fix:** Name one supported runtime, version and deployment for v1. Require a capability spike covering streaming, pre-action approvals, cancellation and memory ownership. Mark unsupported features explicitly and add one real integration acceptance path before enabling autonomous execution.

6. **[med] The event contract cannot reliably connect directives, steps and recovery.**  
   **Reference:** Integration contract (lines 9–16).  
   **Why it matters:** Steps have an `id` but no directive/run correlation, ordering, timestamps or defined status lifecycle. There is no replay cursor or reconnect behavior, despite the durable event stream in `01-architecture.md`. Retrying a directive after a lost response could execute it twice.  
   **Concrete fix:** Reuse the shared run/event envelope with correlation IDs, sequence, timestamp and typed states. Define idempotent directive submission, reconnect/replay and daemon-restart reconciliation. Include `waiting_approval`, disconnected and stale states.

7. **[med] Memory “pinning” conflates review, persistence and protection.**  
   **Reference:** `GET/PUT /hermes/memory` (line 13); proposed diffs “until Jonas pins them (optional setting)” (line 31).  
   **Why it matters:** It is unclear whether unpinned facts affect execution, whether pinning accepts a proposal or locks a fact, and whether JunOS or Hermes owns the authoritative store. Whole-store writes can overwrite concurrent agent changes. Editable chips also cannot adequately present multiline facts or meaningful diffs.  
   **Concrete fix:** Separate Accept/Reject from Pin. Define pending versus active memory, ownership, scope and revision checks. Use a readable fact list with a diff editor, provenance and explicit save/conflict feedback.

8. **[med] Approval decisions are secondary to activity decoration.**  
   **Reference:** Header contents (line 21), 40/60 chat/activity split (lines 22–23), approval banner (line 28).  
   **Why it matters:** Model and uptime receive permanent header space, while the current task, project, autonomy level and blocked action have no specified hierarchy. A banner alone does not explain the exact decision required by `12-security-and-privacy.md`.  
   **Concrete fix:** Lead with current task, project and effective autonomy. When blocked, place the exact command/diff, reason, expiry and Approve/Deny actions beside the relevant step. Keep Stop persistently reachable and make routine metadata secondary.

9. **[med] The pane layout has no usable size or scrolling contract.**  
   **Reference:** “Left 40%,” “Right 60%,” and “Bottom tabs” (lines 22–24).  
   **Why it matters:** Percentages leave column minimums, inspector height and competing scroll regions undefined. At narrow widths the composer, expanded output and bottom inspector could crowd each other or push Stop out of reach. The general breakpoint in `14-ui-system.md` does not resolve this console’s internal panes.  
   **Concrete fix:** Specify a resizable desktop split with minimum widths and a bounded inspector. At narrow widths, switch between conversation and activity in one region; open details in sheets. Keep approval state and Stop visible, and define follow-live behavior that preserves manual scroll position.

10. **[med] The visual prescription risks repetitive “AI mission control” styling.**  
    **Reference:** Pulsing status pill (line 21); icon cards and shimmering running step (line 23).  
    **Why it matters:** Repeated animated cards compete with failures and approvals, while the document leaves type roles, row density and spacing unspecified. Both requested skills favor precise task hierarchy over decorative activity. The chosen glass direction in `14-ui-system.md` can remain without making every step another glass panel.  
    **Concrete fix:** Specify a compact timeline with aligned durations, restrained type icons and a consistent spacing rhythm. Use UI text for summaries, monospace only for actual commands/output, and one clear mark for the active step. Replace continuous shimmer with a static running label and optional reduced-motion-safe feedback.

11. **[med] Navigation and conversation ownership diverge from the existing app.**  
    **Reference:** Bottom Memory/Skills/Logs/Queue tabs (line 24); shared agent chat (line 22).  
    **Why it matters:** `src/pages/Hermes.tsx` already defines Console/Tasks/Memory/Settings routes, while `07-inbox-and-agent-chats.md` provides another Hermes conversation surface. Without a mapping, implementation may duplicate memory screens, task queues or conversation histories.  
    **Concrete fix:** State which routes remain and which tabs are console inspectors. Bind console directives and Agent Chats to the same conversation and run IDs. Define Queue as pending execution, distinct from scheduled Tasks.

12. **[med] Acceptance criteria omit the failures most likely to undermine trust.**  
    **Reference:** Acceptance criteria (lines 35–37).  
    **Why it matters:** Rendering a mock and approving one step do not validate timeout denial, simultaneous decisions from Inbox and console, reconnects, stop failures, secret redaction or accessible controls. Generic state guidance elsewhere does not specify Hermes-specific outcomes.  
    **Concrete fix:** Add targeted acceptance cases for expired/duplicate approvals, daemon restart during execution, disconnected Hermes, failed cancellation and conflicting memory edits. Include keyboard operation, non-color status, restrained live announcements and narrow-screen access to approval and Stop controls.