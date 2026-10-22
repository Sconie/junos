1. **[high] Restart recovery cannot safely distinguish an unfinished action from an action already performed.**  
   **Reference:** Scheduler contract, lines 14–16: “resumes from the first non-completed step using persisted step state.”  
   **Why it matters:** A process can crash after sending a message or writing a file but before recording completion. That step appears incomplete; retrying it can duplicate the action. A new approval authorizes another execution but does not resolve whether the first succeeded. `02-data-model.md` also gives `run_step` no execution status or action identifier.  
   **Concrete fix:** Define persisted step/action states, including `outcome_unknown`. Reconcile uncertain actions using an external receipt or idempotency key where available; otherwise require review before another execution. Add a crash test between external completion and local persistence.

2. **[high] The atomic claim does not enforce when a run is eligible.**  
   **Reference:** Line 13: `WHERE id=? AND status='due'`; lines 14 and 26 define retry deadlines and overlap policies.  
   **Why it matters:** Both future scheduled slots and backed-off retries have status `due`. The stated claim permits executing either early. It also allows two different slots for the same task to be claimed concurrently despite “skip if running.” Slot uniqueness prevents duplicate rows, not overlapping executions.  
   **Concrete fix:** Make deadline, task-enabled state, scheduler-stop state and overlap admission part of the atomic admission transaction. Define which states occupy the task’s execution slot, including approval waits. Test concurrent claimers against different slots of one task.

3. **[high] Lease recovery can leave jobs stranded or permit competing executors.**  
   **Reference:** Line 14: “an expired lease marks the run `failed (lost)` on the next start.”  
   **Why it matters:** An executor can die while the daemon remains alive; waiting for daemon restart leaves the run stuck. Conversely, a delayed executor or surviving subprocess may continue after its lease expires while a retry starts. The spec also does not explain who renews the lease during `waiting_approval`.  
   **Concrete fix:** Add periodic lease reconciliation, conditional heartbeats and completion updates tied to an execution generation, and gateway rejection of stale executors. Define approval-wait lease ownership separately and require cancellation or reconciliation of surviving processes before retry.

4. **[high] The workflow schema cannot express several promised execution guarantees.**  
   **Reference:** Definition, lines 33–46; versioning, line 19; lifecycle, line 60.  
   **Why it matters:** The example is invalid YAML: entries such as `- id: gather type: prompt` need separate mapping lines or flow-map braces. Beyond syntax, the contract leaves dependency ordering, output binding, branch joins, idempotency and retry declarations undefined. The final output step does not identify what it delivers. `02-data-model.md` gives `workflow_run` no `workflow_version` reference despite the immutable-version promise.  
   **Concrete fix:** Supply one valid, executable example and a versioned schema with explicit dependency/output semantics and step policies. Bind each execution to its definition version and persisted step states. Reject invalid definitions before enabling triggers.

5. **[high] Task creation omits the controls that determine which private context can leave the machine.**  
   **Reference:** Task drawer, line 8; launch form, line 31; template inputs, lines 36–43.  
   **Why it matters:** `12-security-and-privacy.md` requires an allowed-provider list per workflow, while `03-connections-and-routing.md` supports task overrides. This document offers model changes without explaining provider consent, project/file scope or propagation of collected outputs into later model calls. A calendar or folder summary could consequently reach an unexpected provider.  
   **Concrete fix:** Include project/context scope and allowed providers in task/workflow configuration. Validate every step and model override against that list, show the execution destination before enabling automation, and define consent for standalone scheduled prompts as well as workflows.

6. **[high] Event and webhook triggers lack a durable, bounded admission contract.**  
   **Reference:** Loop guard, line 17; triggers, line 49: “webhook (localhost, token).”  
   **Why it matters:** An origin chain prevents causal loops but does not deduplicate delivery. `01-architecture.md` explicitly makes event delivery at least once, so reconnects can start the same workflow twice. A valid webhook sender can also submit repeated or oversized requests; the global cap is unnamed and its persistence is unspecified.  
   **Concrete fix:** Persist trigger identity and enforce uniqueness per workflow/event. Specify webhook authentication consistent with §12, token references held in the keychain, payload schemas and size limits, replay handling, durable rate limits, queue bounds and the global-cap value.

7. **[med] Pause, editing and schedule changes have no defined effect on already materialised slots.**  
   **Reference:** Lines 8, 12, 23–26; version guarantee, line 19.  
   **Why it matters:** Pausing could leave future `due` rows executable; editing a prompt could silently change queued work; changing a schedule could leave old and new slots active together. Explicit timezone selection also does not settle Copenhagen’s missing or repeated daylight-saving times.  
   **Concrete fix:** Define a task revision captured by each admitted run, transactional invalidation of obsolete slots, and separate behavior for active runs versus future work. Specify daylight-saving behavior, bounded slot replenishment and catch-up ordering; use the same calculation for execution and the five-run preview.

8. **[med] The document mixes first-release commitments with later-phase features.**  
   **Reference:** Step types, line 46; triggers, line 49; “Starter workflows (ship with these),” lines 51–57.  
   **Why it matters:** `13-roadmap.md` limits Phase 2 to prompt/tool/approval/output steps, adds Hermes and Kanban in Phase 3, and Scout/Files in Phase 4. Here shell, branch, webhooks, agent launches and Scout appear available without phase labels. “Summarise file” is a Phase 2 starter but depends on a Files interaction scheduled later. The example also requires the deferred calendar connector.  
   **Concrete fix:** Mark supported steps, triggers and starters by phase. Give the Phase 2 file summariser an explicit allowlisted file-picker entry point, and make the introductory example runnable with Phase 2 capabilities.

9. **[med] Task status, run status and approval status are conflated in the screen model.**  
   **Reference:** Tabs, line 8; scheduled-run states, line 12; lifecycle, line 60.  
   **Why it matters:** “Paused” describes scheduling, “Running” describes an execution, and “Failed” may describe the latest attempt. A paused task can still have a running job. There is no defined presentation for queued, retrying, waiting approval, skipped or cancelled work, and no Resume action is specified.  
   **Concrete fix:** Separate schedule-enabled state from current execution state and last outcome. Define tab predicates and text/icon treatments. Show “Waiting for approval” with its Inbox link, retry time, skipped reason and cancellation progress; specify Resume and the shared StopControl behavior.

10. **[med] The task editor lacks a creation and save contract, while combining configuration with an unbounded log viewer.**  
    **Reference:** Side drawer, line 8; “form + YAML,” line 68.  
    **Why it matters:** The document lists editable fields but no New task entry point, Save/Cancel behavior, validation or unsaved-change handling. In the 360–420 px drawer specified by §14, prompt editing, schedule preview and expanded run logs compete for space and attention.  
    **Concrete fix:** Specify one visible New task action and an explicit save model. Group configuration into Basics, Execution, Schedule and Delivery; move History into a separate tab or detail view. Preserve invalid drafts, show errors beside fields, and define keyboard focus, dismissal and return-focus behavior.

11. **[med] The table has no layout priorities for constrained widths or realistic data volumes.**  
    **Reference:** Seven table columns and four actions, line 8; launcher card grid, line 31.  
    **Why it matters:** A table beside an open drawer can become cramped even on desktop. Long task names, model names, dual schedule representations and timestamps can produce tiny text or inconsistent row heights. §14’s global responsive rule does not resolve this table’s column behavior.  
    **Concrete fix:** Define a desktop column budget, consistent row pitch and spacing, a sticky header and bounded pagination. Lead with task name and current state; place human schedule above secondary monospace cron, align timestamps with tabular figures, and keep secondary actions in a menu. Specify compact rows or a contained scrolling table at narrower widths.

12. **[med] The timeline is specified as decoration before its operational purpose is defined.**  
    **Reference:** Line 8: “A 24-hour timeline strip shows today’s runs.”  
    **Why it matters:** It is unclear whether this shows planned or actual runs, which timezone defines today, how coincident markers stack, or what selecting one does. Frequent tasks can turn the strip into an illegible cluster; daylight-saving days also need an explicit treatment.  
    **Concrete fix:** Define the question it answers and distinguish scheduled, completed and missed runs using shape/text as well as color. Aggregate crowded intervals, provide keyboard-accessible details and an equivalent list, label timezone and current time, and keep the strip subordinate to the task queue.

13. **[med] Acceptance criteria do not verify the specified screen’s glass execution, typography or motion.**  
    **Reference:** Acceptance criteria, lines 62–65; Tasks screen, line 8.  
    **Why it matters:** §14 already supplies glass tokens, contrast rules and opaque/reduced-motion fallbacks. This document never applies them to its dense table, overlapping drawer, timeline markers or streaming logs. Passing its three acceptance checks could still leave secondary text unreadable over bloom, row selection indistinct, or live updates disruptive.  
    **Concrete fix:** Add surface-specific acceptance checks: a defined type scale and spacing rhythm; text contrast of at least 4.5:1 against the brightest permitted composited backdrop; distinguishable focus, selection and status; and readable opaque fallbacks. Limit motion to brief state feedback, remove travel/pulsing under reduced motion, and keep live logs from stealing focus or forcing scroll when Jonas is inspecting earlier output.