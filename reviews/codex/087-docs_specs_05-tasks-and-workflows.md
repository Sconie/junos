1. **[high] Approval rules cover shell steps but leave other execution paths ambiguous.**  
   **Reference:** [Step types, line 34](docs/specs/05-tasks-and-workflows.md#L34): “`shell` (needs approval unless allowlisted).”  
   **Why it matters:** Tool calls, Hermes directives, and output steps can also send data, overwrite files, or incur costs. The wording could let these bypass the action-based policy in [12, Approval policy](docs/specs/12-security-and-privacy.md#L16). Workflow authoring or enabling a schedule must not implicitly authorize every subsequent action.  
   **Fix:** Require daemon-side policy checks for every resolved action, regardless of step type or trigger. Bind approvals to the exact action, arguments, destination, and workflow revision; invalidate approval when those change. Specify denial and timeout outcomes.

2. **[high] Restart and retry guarantees lack a durable execution contract.**  
   **Reference:** [Run lifecycle and acceptance criteria, lines 48–53](docs/specs/05-tasks-and-workflows.md#L48): “Failed steps can be retried from that step”; restarting must not “duplicate or lose scheduled runs.”  
   **Why it matters:** A crash after an external action succeeds but before its success is recorded can repeat that action. The data model has no explicit occurrence key, step-attempt state, or persisted approval checkpoint linking `workflow_run` to `run_step`.  
   **Fix:** Specify durable schedule-occurrence IDs, atomic claiming, persisted step attempts, workflow-version snapshots, and restart reconciliation. Retry automatically only where repetition is safe or an idempotency key is supported; otherwise surface “outcome unknown” for review.

3. **[high] Dry-run has no safety definition.**  
   **Reference:** [Workflows launcher, line 19](docs/specs/05-tasks-and-workflows.md#L19): “a dry-run toggle.”  
   **Why it matters:** Users may reasonably expect no side effects, while tools, model calls, Hermes handoffs, file outputs, and event publication could still execute.  
   **Fix:** Define dry-run as a validated execution preview with writes, sends, shell execution, Hermes execution, and triggering events suppressed. List any permitted reads or provider calls explicitly, including their privacy and usage implications. Mark simulated outputs clearly.

4. **[high] Catch-up and event triggers can create uncontrolled execution bursts.**  
   **Reference:** [Scheduling rules, lines 13–15](docs/specs/05-tasks-and-workflows.md#L13) and [Triggers, line 37](docs/specs/05-tasks-and-workflows.md#L37): `run all`, `queue`, retries, and event-driven execution.  
   **Why it matters:** A long offline period can enqueue many runs; workflow outputs can generate events that trigger more workflows. Per-task overlap control does not prevent cross-workflow loops or provider saturation. [03](docs/specs/03-connections-and-routing.md#L39) already requires background jobs to respect usage budgets.  
   **Fix:** Define catch-up age/count limits, queue bounds, global/provider concurrency limits, retry ceilings, and budget-blocked behavior. Carry correlation IDs and event ancestry; prevent recursive self-triggering and require explicit event filters.

5. **[high] Logging every input and output conflicts with privacy requirements unless constrained.**  
   **Reference:** [Run lifecycle, line 48](docs/specs/05-tasks-and-workflows.md#L48): “Every step records input, output and duration.”  
   **Why it matters:** Mail, calendar entries, private files, webhook credentials, and command arguments can become durable copies in SQLite and backups. Secret-pattern redaction in [12](docs/specs/12-security-and-privacy.md#L11) does not address sensitive personal content.  
   **Fix:** Define redaction before persistence, metadata-only logging for sensitive steps, size and retention limits, and payload deletion behavior. Keep secret references rather than secret values. Show which provider and destination will receive workflow inputs, and require allowlisted file access.

6. **[high] The workflow example is invalid YAML, and execution semantics are incomplete.**  
   **Reference:** [Definition, lines 21–34](docs/specs/05-tasks-and-workflows.md#L21), particularly `- id: gather    type: prompt   model: sonnet`.  
   **Why it matters:** Multiple mapping entries cannot be written on one line in that form. Beyond parsing, the example does not establish whether steps run sequentially or by dependencies, how `deliver` receives `write`, or how branches and parameter substitution work.  
   **Fix:** Provide one valid, schema-validated example with explicit output references. Define dependency ordering, branch outcomes, typed parameters, escaping, model identifiers, and validation errors for unknown references, cycles, unsupported capabilities, and unsafe interpolation.

7. **[med] “Ship with these” exceeds the roadmap’s available dependencies.**  
   **Reference:** [Starter workflows, lines 39–45](docs/specs/05-tasks-and-workflows.md#L39).  
   **Why it matters:** This promises six starters, whereas [Phase 2](docs/specs/13-roadmap.md#L16) promises three and only prompt/tool/output steps. Mail/calendar sources are deferred to v2 in [07](docs/specs/07-inbox-and-agent-chats.md#L50); Kanban, Scout, and file indexing arrive later. The briefing example nevertheless assumes `calendar.today` exists.  
   **Fix:** Label features and starters by phase. Name the three Phase 2 starters and their supported tools. Keep dependency-blocked templates visibly unavailable with a reason; distinguish mocked demonstrations from operational workflows.

8. **[med] Schedule behavior is underspecified at precisely the times users need predictability.**  
   **Reference:** [Scheduling rules, lines 11–16](docs/specs/05-tasks-and-workflows.md#L11).  
   **Why it matters:** An explicit Copenhagen timezone does not decide what happens during missing or repeated daylight-saving hours, timezone changes, paused intervals, or an overdue one-off run. “No lost runs” also needs qualification against intentional `skip`.  
   **Fix:** Define these cases and show timezone-qualified next-run previews. Distinguish intentionally skipped occurrences from failures or lost work. Add acceptance cases for daylight-saving transitions, sleep/restart, schedule edits, and one-off completion. Specify where one-off schedules and policy settings persist.

9. **[med] Task configuration and execution state are conflated.**  
   **Reference:** [Tasks screen, line 8](docs/specs/05-tasks-and-workflows.md#L8): “All, Running, Paused, Failed”; [Run lifecycle, line 48](docs/specs/05-tasks-and-workflows.md#L48).  
   **Why it matters:** A paused task can still have an active run; an enabled task can have a failed last run. Approval waits and queued runs have no clear representation. Although cancellation exists in the lifecycle, no cancellation action is specified.  
   **Fix:** Separate enabled/paused scheduling state from active-run state and last outcome. Define filter membership, expose “Needs approval,” show queue counts, and distinguish Pause schedule from Cancel run. Specify resumption after approval and what edits affect an already queued run.

10. **[med] The main task-management actions are missing from the screen contract.**  
    **Reference:** [Tasks screen, line 8](docs/specs/05-tasks-and-workflows.md#L8) and [Open questions, line 56](docs/specs/05-tasks-and-workflows.md#L56).  
    **Why it matters:** The acceptance criteria require creating a task, but the screen omits New task, Save, validation, and unsaved-change handling. It defines a task as a prompt *or workflow*, yet the drawer only specifies prompt fields. The referenced [Stitch brief](docs/design/stitch-prompts.md) does include New task.  
    **Fix:** Specify a prominent New task action, prompt/workflow selection, workflow parameters, Save/Cancel, validation, and archive/delete behavior. Define notification output separately from storing a durable result; the acceptance criterion currently assumes every destination produces an Inbox result.

11. **[med] Table, timeline, and drawer compete without a hierarchy or density budget.**  
    **Reference:** [Tasks screen, line 8](docs/specs/05-tasks-and-workflows.md#L8).  
    **Why it matters:** Seven columns, dual schedule labels, four actions, a timeline, and a configuration/history drawer can crowd the task names and next-run information. “Matches mockup” supplies no enforceable layout; [Schedules.tsx](src/pages/Schedules.tsx#L1) currently contains only a five-column empty table.  
    **Fix:** Prioritize task name, readable schedule, next run, and actionable status. Put raw cron beneath the schedule in monospace and secondary actions in a labelled menu. Set a starting density contract—14px row text, 12–13px metadata, 48–56px rows, consistent 16/24px spacing—and separate drawer configuration from history. Below the table’s usable width, use two-line task rows and the full-screen sheet specified in [14](docs/specs/14-ui-system.md#L36).

12. **[med] Timeline and glass execution lack task-specific accessibility criteria.**  
    **Reference:** [Tasks screen, line 8](docs/specs/05-tasks-and-workflows.md#L8): “A 24-hour timeline strip shows today’s runs.”  
    **Why it matters:** Small clustered markers can become illegible over atmospheric glow, and colour alone cannot distinguish scheduled, running, failed, or approval-blocked work. This doc supplies no keyboard map despite [14](docs/specs/14-ui-system.md#L33) requiring one per spec. Global motion and contrast rules also need concrete application here.  
    **Fix:** Specify marker grouping, collision handling, timezone labels, textual equivalents, and keyboard-accessible details. Require 4.5:1 text contrast over the brightest permitted glass composite and 3:1 for essential control/state indicators. Use stronger glass backing for logs and editors, labelled status icons, visible focus, drawer focus restoration, restrained update motion, and static reduced-motion plus opaque/high-contrast fallbacks. Add checks at desktop, tablet, phone, and 200% zoom.