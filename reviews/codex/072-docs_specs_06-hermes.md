1. **[high] Autonomy levels contradict the security policy.**  
   **Reference:** §Behaviors, “Autonomous (log only)” and “Ask-first (every outward/destructive step needs approval).”  
   **Why it matters:** [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires approval for external sends, destructive actions and spending, and requires Ask-first approval for local writes. This doc permits conflicting implementations. Optional `projectId` also leaves the applicable policy unclear.  
   **Concrete fix:** Reference spec 12 as authoritative. Define levels as overrides within its mandatory boundaries, specify a restrictive default for unscoped directives, and show the effective project and autonomy level beside the composer.

2. **[high] Reading stdout cannot establish approval enforcement.**  
   **Reference:** §Integration contract, “translates stdout to this schema,” plus `POST /hermes/approvals/:id {decision}`.  
   **Why it matters:** Activity reporting does not establish that a tool call can be intercepted before execution. The contract contains neither an approval-request event nor the exact action being approved. The console could appear to supervise actions already completed.  
   **Concrete fix:** Require an adapter capability for blocking tool calls before execution. Define approval requests containing run/step IDs, project, exact command or diff, destination, expiry and action fingerprint. Resolve them once, rejecting expired or changed actions. Keep execution disabled where interception is unsupported.

3. **[high] Stop promises more than the contract can demonstrate.**  
   **Reference:** §Behaviors, “Stop cancels the current step and drops queue to paused”; §Acceptance criteria, “within a few seconds.”  
   **Why it matters:** Spec 12 says the kill switch stops **all agent runs**. This doc specifies one current step, without addressing child processes, remote operations, pending approvals or restart behavior. A disconnected console also cannot establish that execution stopped.  
   **Concrete fix:** Distinguish Pause, Stop run and Stop all. Define cancellation propagation, queue preservation, approval invalidation and persistent paused state. Show `Stopping`, `Stopped` and `Stop unconfirmed` from daemon acknowledgements; specify a measurable deadline and escalation behavior.

4. **[high] Attached context and raw output have no privacy boundary.**  
   **Reference:** §Screen, “Logs (raw)” and expandable input/output; §Behaviors, “context attached.”  
   **Why it matters:** File content, command arguments and outputs can contain credentials or private material. Spec 11 excludes secret files by default, while spec 12 requires redaction; this doc does not explain how those protections apply to handoffs, streams or logs.  
   **Concrete fix:** Define attachment scope and model destination before dispatch, inherit exclusions, and distinguish a reference from copied content. Redact before streaming or persistence, cap output and retention, sanitize rendered agent output, and require an explicit reveal action for sensitive details.

5. **[high] The “minimal interface” cannot correlate or recover its own work.**  
   **Reference:** §Integration contract, particularly `/directives`, `/status` and `/stream`.  
   **Why it matters:** A directive returns an ID, but streamed steps have no directive, run, project or agent reference. Step lifecycle values, reconnect cursors, replay and submission deduplication are unspecified. Reloads and retries could duplicate work or show an incomplete audit trail, contrary to spec 01’s restart guarantees.  
   **Concrete fix:** Define a versioned event envelope with event sequence, timestamp, agent/run/directive/step IDs and typed lifecycle payloads. Specify idempotent submission, snapshot-plus-replay recovery, terminal outcomes and approval events. Either scope v1 explicitly to one agent or include agent identity throughout.

6. **[med] Mock-first delivery hides an unresolved feasibility dependency.**  
   **Reference:** §What Hermes is here describes a model family; §Integration contract assumes a controllable agent runtime but leaves CLI/gateway/Docker unresolved.  
   **Why it matters:** Model access does not establish support for tool interception, cancellation, memory editing or skill toggles. The mock acceptance criteria can pass without proving the integration’s central capabilities. “Give to Hermes” from Files also depends on functionality scheduled later in spec 13.  
   **Concrete fix:** Identify the target executable/service, version and deployment boundary in a short integration spike. Record supported capabilities. Limit the first milestone to one runtime, directive submission, activity, enforceable approval and verified Stop; stage memory, tools and cross-screen handoffs behind demonstrated support.

7. **[med] Memory pinning conflates persistence with approval.**  
   **Reference:** §Behaviors, “proposed as a diff … until Jonas pins them (optional setting)”; §Screen, “editable chips with pin.”  
   **Why it matters:** It is unclear whether proposed facts already influence the agent, what pinning protects, or whether rejecting a proposal is possible. Chips also provide little room for reviewing multiline changes. Spec 02 has no explicit proposal/version model.  
   **Concrete fix:** Separate `proposed`, `accepted` and `rejected` states from pinning. Keep proposals out of active memory until accepted, define provenance and version checks, and use a readable diff editor with Accept/Reject, save feedback and conflict handling.

8. **[med] Kanban permissions are broader than the referenced rules.**  
   **Reference:** §Behaviors, “move its own cards” and pickup of labelled Ready cards.  
   **Why it matters:** Spec 09 permits pickup through assignment **or** label and explicitly reserves Done for Jonas. This doc omits assignment-based eligibility and could authorize Hermes to complete its own cards.  
   **Concrete fix:** Import spec 09’s eligibility and transition rules directly: atomic claim, concurrency limit, run linkage, Review on success, Blocked on failure, and no agent transition to Done.

9. **[med] The fixed split lacks a responsive and vertical-space contract.**  
   **Reference:** §Screen, “Left 40%,” “Right 60%,” plus bottom tabs.  
   **Why it matters:** Percentages do not allocate the gutter or define minimum usable widths. Chat, activity and an open bottom inspector compete for height; no scroll ownership or composer behavior is specified. Spec 14’s generic sheets do not resolve this console layout.  
   **Concrete fix:** Define a resizable split using fractions after the gutter, pane minimums and a bounded inspector height. Keep the composer and Stop accessible. Below the width needed for both panes, switch between Directive and Activity views with an inspector sheet. Specify checks at 1440, 900 and 390px.

10. **[med] Approval priority and live-stream navigation are underspecified.**  
    **Reference:** §Screen gives activity 60% of the width; §Behaviors places approvals in “a banner.”  
    **Why it matters:** The immediate supervision question—what needs Jonas now—can lose prominence to a stream of equally styled cards. Continuous insertion can also move content during inspection or make keyboard and screen-reader use noisy.  
    **Concrete fix:** Lead with the current task, effective policy and blocked decision. Put exact approval evidence beside Approve/Deny, above routine activity. Define follow-live behavior, suspend autoscroll during inspection, preserve focus, show a “new steps” count, and announce meaningful state changes without reading every log update.

11. **[med] Glass legibility requirements are not tied to the console’s dense surfaces.**  
    **Reference:** §Screen, cards with expandable input/output and raw Logs; inherited glass tokens in spec 14.  
    **Why it matters:** Spec 14 already requires 4.5:1 text contrast, but this doc provides no acceptance cases for overlapping panels, atmospheric highlights, selection or focus. Dense code and approval diffs need predictable backing even while the surrounding panels remain glass.  
    **Concrete fix:** Specify a stable backing for logs/diffs within the glass panels, test composited contrast over the brightest backdrop, require 3:1 essential control/focus boundaries, and provide an explicit opaque mode. An optional icy-blue accent, `#7DD3FC`, distinguishes interaction from teal health states: **10.85:1** on an opaque `#14161B` surface; dark `#0B0C0F` button text gives **11.73:1**. Light `#E7E8EC` text on that accent gives only **1.36:1**. These are solid-pair calculations; glass composites still need verification.

12. **[med] Pulse and shimmer lack bounded, accessible behavior.**  
    **Reference:** §Screen, “pulsing when working” and “running step shimmers.”  
    **Why it matters:** Two persistent animations compete with reading during long runs. Spec 14 mentions reduced motion, but the console does not define equivalent static states or distinguish running from stalled activity.  
    **Concrete fix:** Use a persistent textual state and elapsed time, with brief transition feedback rather than continuous shimmer. Define static reduced-motion behavior, avoid animating blur, and show last-event time plus an explicit stale/disconnected state.

13. **[med] Typography, spacing and density have no console-specific baseline.**  
    **Reference:** §Screen, activity “as cards” with expandable details and a bottom inspector.  
    **Why it matters:** Spec 14 names fonts but supplies no console type scale or row rhythm. Repeating padded cards for every shell/file event can bury useful history; making everything small or monospace would reduce readability.  
    **Concrete fix:** Specify, for example, 14px UI summaries, 12–13px metadata and 13px code with roughly 1.5 line height; consistent 16px panel gutters and 8px internal gaps. Use compact collapsed steps, group repetitive activity, reserve monospace for commands/output, align durations with tabular figures, and contain long-line scrolling within details.

14. **[low] The specified navigation has no migration mapping.**  
    **Reference:** §Screen’s Memory/Skills/Logs/Queue tabs versus [src/pages/Hermes.tsx](src/pages/Hermes.tsx), which currently exposes Console/Tasks/Memory/Settings routes.  
    **Why it matters:** Implementing the doc literally could produce duplicate Memory locations and competing Tasks/Queue concepts. “Matches mockup” does not establish which navigation is authoritative.  
    **Concrete fix:** State which routes remain, which move into the console inspector, and how Tasks differs from Queue. Preserve useful deep links and define keyboard navigation and focus return for the chosen structure.