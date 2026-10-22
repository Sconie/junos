1. **[high] Autonomy levels contradict the security policy.**  
   **Reference:** §Behaviors, line 27: “Autonomous (log only)” and “reads free.”  
   **Why it matters:** `12-security-and-privacy.md` requires approval for external sends, destructive actions and spending, and limits automatic file reads to allowlisted paths. This doc permits broader access and an apparent bypass of those safeguards.  
   **Fix:** Define one authoritative permission matrix. State that autonomy levels cannot override mandatory approval classes or filesystem boundaries; specify the policy for directives without a project.

2. **[high] The bridge describes observation without establishing enforceable control.**  
   **Reference:** §Integration contract, line 18: “translates stdout to this schema”; line 16: `POST /hermes/approvals/:id {decision}`.  
   **Why it matters:** Reading stdout does not establish that JunOS can intercept an action before execution. The contract provides neither an approval-request event nor the action details required to make an informed decision. A working timeline could conceal ineffective supervision.  
   **Fix:** Require a pre-execution tool-call interception mechanism. Define approval requests with run/step/project IDs, exact command or diff, destination, action class and expiry. Bind approval to that immutable action; reject expired, duplicate or mismatched decisions atomically across Inbox and console.

3. **[high] Stop promises a safety guarantee without defining its reach.**  
   **Reference:** §Behaviors, line 30; §Acceptance criteria, line 37: “Stop halts within a few seconds.”  
   **Why it matters:** The spec does not distinguish stopping generation, terminating child processes, cancelling remote work and preventing queued actions. `12-security-and-privacy.md` also describes a kill switch that stops **all** agent runs, whereas this doc describes the current step.  
   **Fix:** Define Pause, Stop run and Stop all separately. Stop must immediately block new dispatch, invalidate pending approvals and attempt cancellation of active work. Specify acknowledgement deadlines, escalation and an honest “cancellation unconfirmed” state for remote or irreversible actions.

4. **[high] Raw activity and automatic context attachment lack privacy boundaries.**  
   **Reference:** §Integration contract, line 11: `input, output`; §Screen, line 24: “Logs (raw)”; §Behaviors, line 32: “context attached.”  
   **Why it matters:** Shell output, API responses, files and chat messages can contain credentials or private material. The architecture persists events and run output, so leakage could propagate into SQLite, exports and backups. Folder/project handoff does not specify which contents leave the machine.  
   **Fix:** Define attachment manifests, exclusions and a preview of outgoing context and destination. Redact sensitive fields before streaming **and** persistence; cap payloads, specify retention/deletion behavior, and render tool output as inert content. Clarify that “raw” logs remain redacted.

5. **[high] Memory approval is optional and has no defined activation boundary.**  
   **Reference:** §Behaviors, line 31: “proposed as a diff … until Jonas pins them (optional setting).”  
   **Why it matters:** Pinning could mean approval, protection from eviction or visual prominence. The spec does not establish whether proposed facts already influence Hermes, whether the agent can alter pinned facts, or how concurrent UI and agent edits reconcile. Persistent injected instructions could become trusted memory.  
   **Fix:** Separate pending, accepted and pinned states. Pending changes must not enter active memory. Define ownership/scope, provenance, revision checks, accept/reject, rollback and whether each supported runtime can enforce this workflow.

6. **[med] The event contract cannot reliably reconstruct a run after interruption.**  
   **Reference:** §Integration contract, lines 9–15; §Acceptance criteria, lines 35–37.  
   **Why it matters:** Steps lack explicit run/directive correlation, sequence and timestamps. There is no replay cursor, snapshot reconciliation or directive idempotency. After reconnecting, the console could duplicate actions, lose approval state or present stale “working” status. This falls short of the restart guarantees in `01-architecture.md`.  
   **Fix:** Specify stable run/step IDs, ordered event envelopes, reconnect/replay and authoritative snapshots. Separate connection health from execution state, including waiting-for-approval and stopping. Add acceptance scenarios for disconnect, daemon restart, duplicate submission and expired approval.

7. **[med] A mock-first UI is being treated as proof of an unspecified integration.**  
   **Reference:** §What Hermes is here, line 4; §Integration contract, line 18; §Open questions, lines 40–41.  
   **Why it matters:** The doc names a model family and hosting options but leaves the actual agent runtime unresolved. Streaming, tool interception, memory editing and tool toggles are distinct capabilities; a mock can implement all of them regardless of what the real runtime supports.  
   **Fix:** Name one initial runtime, version and deployment arrangement. Add a capability matrix and a timeboxed integration spike. Make real pre-action approval and cancellation release gates; disable unsupported controls. Defer remote deployment and multiple agents until that path works.

8. **[med] The layout allocates space before establishing operational hierarchy.**  
   **Reference:** §Screen, lines 21–24: 40/60 split, activity cards and bottom tabs.  
   **Why it matters:** Current task, active project, effective autonomy and blocked approval are more useful than uptime, yet several are absent from the header contract. Two live panes plus an unspecified bottom region can crowd the composer and safety controls on short screens. The existing `src/pages/Hermes.tsx` also uses different route tabs.  
   **Fix:** Define one hierarchy: task/project/policy and required intervention first, directive composer second, recent activity next, diagnostics behind disclosure. Specify pane minimum widths, height allocation, scroll ownership and a stacked layout below 900px. Resolve route tabs versus bottom inspector tabs explicitly.

9. **[med] Timeline density and typography are unspecified for realistic workloads.**  
   **Reference:** §Screen, line 23: “steps as cards … expandable input/output.”  
   **Why it matters:** A long run could become hundreds of similarly weighted panels. Expanded code or output can overwhelm summaries, cause horizontal overflow and push the current action out of view.  
   **Fix:** Specify compact collapsed rows, grouped by run, with summaries dominant and duration secondary. Establish a small type scale—for example, 16px summaries and 14px metadata—with monospace reserved for technical payloads. Define consistent spacing, bounded output viewers, payload truncation, pagination/virtualization and a visible “new activity” control when auto-follow is paused.

10. **[med] Glass legibility lacks screen-specific acceptance checks and accent pairings.**  
    **Reference:** §Screen, lines 21–24; inherited tokens in `14-ui-system.md`.  
    **Why it matters:** The shared 4.5:1 requirement does not define how this console’s dense labels, chips, logs and controls behave over atmospheric glow. If shared text `#E7E8EC` is used on a filled violet `#8B5CF6` control, contrast is approximately **3.46:1**; white reaches only **4.23:1**.  
    **Fix:** Specify foreground/background pairs for each control state and test their composited glass backgrounds. One alternative is ice blue `#7DD3FC`: dark `#0B0C0F` text on that fill gives **11.73:1**, and blue text on opaque `#22232A` gives **9.39:1**. It also separates interaction color from teal health indicators. Require an opaque high-contrast mode and verify the actual glass variants separately.

11. **[med] Persistent pulse and shimmer need explicit motion and accessibility behavior.**  
    **Reference:** §Screen, lines 21 and 23: “pulsing when working” and “running step shimmers.”  
    **Why it matters:** Background work can continue for hours, making perpetual animation distracting. Shared reduced-motion guidance does not define the replacement treatment, keyboard behavior or announcement frequency for this live console.  
    **Fix:** Use static working labels plus elapsed time, with brief state-change feedback. Disable pulse and shimmer under reduced motion; keep glass atmosphere static. Define keyboard navigation for disclosures and tabs, preserve focus during updates, and announce significant state changes without reading every streamed step. Keep Stop and pending approvals visible in opaque and reduced-motion modes.