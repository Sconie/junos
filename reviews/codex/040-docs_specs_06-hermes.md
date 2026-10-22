1. **[high] Activity reporting cannot enforce approvals.**  
   **Reference:** Integration contract, lines 11–18: “translates stdout to this schema.”  
   **Why it matters:** Parsing output can reveal an action after execution. The contract provides no pre-execution approval event or mandatory tool interception, despite promising to gate risky actions.  
   **Concrete fix:** Require a bridge capability handshake and a blocking, pre-execution authorization hook for every tool invocation. Reject execution when authorization is unavailable; keep unsupported integrations in observation-only mode.

2. **[high] Autonomy levels contradict the shared security policy.**  
   **Quote:** Line 27: “Autonomous (log only)” and “reads free.”  
   **Why it matters:** [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md:20) limits automatic reads to allowlisted files and requires approval for external sends, destructive actions, and spending. “Log only” appears to bypass those protections. Directives also allow an omitted `projectId`, leaving their policy undefined.  
   **Concrete fix:** Make spec 12 the mandatory policy floor. Define each level against its action classes, restrict reads to approved scopes, and specify a restrictive default for directives without a project. Display the effective project and autonomy level beside the composer.

3. **[high] The kill-switch promise exceeds the defined cancellation contract.**  
   **Quote:** Lines 30 and 37: “Stop cancels the current step”; “Stop halts within a few seconds.”  
   **Why it matters:** No cancellation acknowledgement, child-process handling, remote cancellation, or failure state is defined. An already submitted API action may complete after Stop. Spec 12 also describes stopping **all agent runs**, whereas this document describes one current step.  
   **Concrete fix:** Define Stop’s scope and a state transition such as `stop requested → stopping → stopped | unable to confirm`. Suspend queue pickup immediately, cancel owned work and process descendants, specify a measurable acknowledgement deadline, and show actions whose completion remains uncertain.

4. **[high] Approval decisions are not bound to an exact, immutable action.**  
   **Reference:** Lines 16 and 28: `{decision}` and approval through both Inbox and console.  
   **Why it matters:** The spec leaves approval payloads, expiry races, duplicate decisions, and changed commands unspecified. Jonas could approve a preview that no longer matches the action executed.  
   **Concrete fix:** Define a durable approval record containing run/step/project IDs, exact command or diff, affected destination, policy version, expiry, and payload hash. Resolve it atomically through one service used by both surfaces. Changed actions require fresh approval; expired or resolved approvals cannot execute again.

5. **[high] Context attachment and raw telemetry lack privacy boundaries.**  
   **Quote:** Lines 11, 24 and 32: step `input/output`, “Logs (raw),” and “context attached.”  
   **Why it matters:** These channels can copy private files, credentials, or unrelated conversation content into model requests, event storage, and backups. Secret-pattern redaction in spec 12 does not define which ordinary private content may be transmitted.  
   **Concrete fix:** Specify attachment scope, exclusions, size limits, recipient/runtime, and a reviewable context summary before handoff. Redact before persistence and streaming, define retention/deletion behavior, and render tool output as untrusted text with terminal escape sequences neutralized.

6. **[high] The integration prerequisite is unresolved, but acceptance only proves a mock.**  
   **Reference:** Lines 4, 18 and 35; “how Hermes runs today” remains unknown.  
   **Why it matters:** The document moves from a family of models to an assumed agent runtime with editable memory, tool toggles, approvals, streaming, and cancellation. A mock can satisfy all three acceptance criteria without demonstrating that the selected runtime supports those controls.  
   **Concrete fix:** Separate model/provider identity from the agent runtime. Add a timeboxed integration spike that records runtime/version, deployment location, supported hooks, memory ownership, and cancellation behavior. Gate real execution on demonstrated approval and Stop support; defer unsupported memory/tool editing.

7. **[med] Stream and queue semantics cannot support reliable recovery.**  
   **Reference:** Lines 9–15 define steps and pending tasks without run correlation, replay, or submission idempotency.  
   **Why it matters:** Reconnects and retries can duplicate directives, lose activity, or associate steps with the wrong task. This conflicts with [01-architecture.md](docs/specs/01-architecture.md:59)’s restart reliability requirement.  
   **Concrete fix:** Add directive/run/step/project IDs, ordered event IDs, timestamps, terminal states, reconnect replay, and idempotency keys. Define durable queue states and atomic Kanban pickup. Align eligibility with [09-kanban.md](docs/specs/09-kanban.md:25), which permits assignment **or** a label, while this document mentions only the label.

8. **[med] The screen gives activity more space than the information needed to supervise it.**  
   **Reference:** Lines 21–24: uptime in the header, a fixed 40/60 split, step cards, and bottom tabs.  
   **Why it matters:** Current goal, active project, effective permissions, and blocked decisions lack a defined hierarchy. A busy timeline can dominate while the reason for the work remains buried in chat. The bottom panel’s height and scrolling behavior are unspecified.  
   **Concrete fix:** Lead with current task, project, and an actionable “Needs your approval” state. Keep Stop persistently reachable and visually distinct from Pause and Settings. Use resizable panes with minimum widths, compact collapsed step rows, and an explicitly sized collapsible inspector. Specify spacing—for example, 24px between regions, 16px panel padding, and 8px within related metadata.

9. **[med] Glass legibility is inherited as a slogan rather than specified for this dense console.**  
   **Reference:** Lines 23–24; [14-ui-system.md](docs/specs/14-ui-system.md:22) requires 4.5:1 text contrast on glass.  
   **Why it matters:** Small durations, code, chips, and nested step details need explicit surface and text roles. Contrast against a base background alone does not establish contrast over atmospheric glow.  
   **Concrete fix:** Define 14–16px summaries, 12–13px metadata, and 13–14px monospace output with approximately 1.5 line height. Give expanded logs and diffs a stable dark backing within the glass panels. Require contrast checks over the brightest permitted backdrop, visible control/focus boundaries, and opaque fallbacks.

   A suitable alternative accent is sky blue `#7DD3FC`: it separates interaction from teal health and amber warnings. Calculated solid-color contrast is **10.85:1** against `#14161B`, and **11.73:1** against `#0B0C0F`. Use dark text on blue fills: existing light text `#E7E8EC` gives only **1.36:1**. These values are palette checks, not verification of rendered glass.

10. **[med] Pulse and shimmer have no console-specific motion or reading rules.**  
    **Quote:** Lines 21 and 23: “pulsing when working”; “running step shimmers.”  
    **Why it matters:** Persistent simultaneous animation competes with monitoring and reading. Live arrivals also need rules so updates do not pull Jonas away from an expanded command or approval.  
    **Concrete fix:** Prefer a static labeled running state with restrained transition feedback. Explicitly disable pulse and shimmer under reduced motion. Follow new activity only while the reader is at the end; otherwise show a “New steps” control. Preserve focus and expansion state, and announce meaningful state changes without reading every log update.

11. **[med] Narrow-screen behavior and keyboard operation remain undefined.**  
    **Reference:** Lines 22–24 specify percentages and tabs without minimum sizes or interaction behavior.  
    **Why it matters:** Spec 14’s general responsive rule does not explain how directive chat, activity, inspector, and approvals coexist on this screen. A fixed split can leave both primary panes unreadable at narrow widths or high zoom.  
    **Concrete fix:** Define a single-pane Console/Activity switch below a content-driven breakpoint, with inspector details in a sheet and pending approvals immediately accessible. Specify keyboard expansion, tab navigation, focus restoration, accessible labels for pin/toggle controls, and contained scrolling for long output. Add acceptance checks at 390px and 200% zoom.

12. **[med] Memory chips conflate pinning, approval, and persistence.**  
    **Quote:** Lines 24 and 31: “editable chips with pin”; proposed diffs “until Jonas pins them.”  
    **Why it matters:** Pinning usually expresses importance or retention, while accepting a diff authorizes a change. Chips also cannot comfortably represent long facts, provenance, conflicts, or pending edits.  
    **Concrete fix:** Use compact key/value rows with expandable content, source, scope, and revision history. Provide explicit Accept/Reject actions for proposed changes and a separate Pin control. Define concurrent-edit handling and whether rejected or unapproved facts can influence the agent.

13. **[low] Navigation ownership is ambiguous relative to the existing shell.**  
    **Reference:** Line 24’s bottom tabs versus [src/pages/Hermes.tsx](src/pages/Hermes.tsx:4)’s Console/Tasks/Memory/Settings routes.  
    **Why it matters:** The document does not say whether it replaces those routes or adds another navigation layer. Shared agent chat also risks becoming a separate conversation from the console’s directive stream.  
    **Concrete fix:** Specify one route hierarchy, map existing Tasks to Queue, locate Skills and Logs deliberately, and define shared conversation/run identity between Hermes Console and Agent chats. Preserve deep links to pending approvals and individual steps.