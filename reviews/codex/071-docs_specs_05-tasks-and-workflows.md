1. **[high] Approval requirements apply only to shell steps**
   
   **Reference:** §Definition: “`shell` (needs approval unless allowlisted)”; step types include `tool`, `hermes`, and file output.
   
   **Why it matters:** A tool, Hermes directive, or output step can write files, send data, or perform destructive actions without invoking a shell. The wording leaves a bypass around the action-based policy in [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md:16).
   
   **Concrete fix:** Require every executor and output destination to enforce that policy. Bind approval to the exact resolved action, parameters, project, and workflow revision; changed actions require fresh approval. Define deny, timeout, and restart behavior.

2. **[high] Retries and restart guarantees do not account for completed side effects**
   
   **Reference:** §Scheduling rules: “Retries: N attempts”; §Run lifecycle: “Failed steps can be retried from that step”; acceptance: “does not duplicate or lose scheduled runs.”
   
   **Why it matters:** A step can finish an external action and crash before recording success. Retrying could send a message twice, overwrite a file, or repeat a Hermes directive. Persisting schedules alone cannot guarantee exactly-once effects. “No lost runs” also needs qualification because `skip` deliberately discards missed executions.
   
   **Concrete fix:** Define a durable occurrence ID, atomic run claiming, persisted step checkpoints, and destination-specific idempotency keys. Treat uncertain non-idempotent actions as needing reconciliation before retry. Specify that intentionally skipped occurrences are recorded with a reason.

3. **[high] “Dry-run” has no enforceable meaning**
   
   **Reference:** §Workflows launcher: “a dry-run toggle.”
   
   **Why it matters:** Users may reasonably expect no changes, while prompt steps can invoke tools, Hermes can act autonomously, and output steps can write. Even a read-only preview may send private content to a provider.
   
   **Concrete fix:** Define dry-run as validation plus an execution plan showing inputs, providers, permissions, destinations, and estimated calls. Block side effects in the runner. Make any optional live model preview a separately disclosed action, and reject steps that cannot be safely previewed.

4. **[high] Event triggers can create unbounded automation loops**
   
   **Reference:** §Triggers: `kanban.card.moved`, `scout.finding`, `inbox.item.approved`; §Definition: output can create a Kanban card.
   
   **Why it matters:** Workflows consume events and produce more events, but there are no filters, deduplication rules, recursion limits, or concurrency caps. Approval events could also start unrelated workflows when their intended role is to resume one specific step.
   
   **Concrete fix:** Require trigger filters, event deduplication, causation IDs, maximum chain depth, and per-workflow concurrency/rate limits. Resume approvals through their bound run and step. Scope and rotate webhook tokens, validate payloads, and reject replayed deliveries.

5. **[high] Recording every input and output creates an undefined private-data archive**
   
   **Reference:** §Run lifecycle: “Every step records input, output and duration to `run_step`”; starters include mail, calendar, and folder summaries.
   
   **Why it matters:** These records can retain private messages, file contents, credentials, and sensitive model output beyond the original task. Secret-pattern redaction in the security spec does not define retention for ordinary private content.
   
   **Concrete fix:** Specify redaction before persistence and streaming, payload size limits, configurable retention, and deletion behavior covering run records, events, and backups. Default to metadata and bounded excerpts; make full payload capture explicit. Show the resolved folder scope and provider before enabling workflows that read files.

6. **[high] Catch-up and queue policies can overwhelm the laptop and subscription budget**
   
   **Reference:** §Scheduling rules: `run all`, `queue`, and retries with backoff.
   
   **Why it matters:** Waking after days offline can enqueue hundreds of runs, each with retries. The spec does not explain how these policies interact with the background-job budget in [03-connections-and-routing.md](docs/specs/03-connections-and-routing.md:39).
   
   **Concrete fix:** Define a catch-up window, maximum backlog, queue expiry, run timeout, and provider/global concurrency limits. Apply budget checks before every attempt. Specify DST behavior for missing and repeated local times, and display missed, skipped, queued, and budget-blocked occurrences distinctly.

7. **[med] Tasks and workflows have overlapping scheduling ownership**
   
   **Reference:** Opening definition: “Task = a prompt (or workflow) on a schedule”; the workflow example also contains a cron trigger.
   
   **Why it matters:** It is unclear whether a scheduled workflow produces a Task, owns a separate schedule, or appears twice. The data model has no explicit task-to-workflow link, one-off timestamp, or workflow revision binding ([02-data-model.md](docs/specs/02-data-model.md:20)).
   
   **Concrete fix:** Declare one canonical schedule entity owned by the daemon. Have workflow cron triggers create or reference that entity and appear once in Tasks. Define bindings for workflow ID, revision, parameters, one-off time, overlap, and retry settings; snapshot the resolved definition for each run.

8. **[med] The workflow example is invalid YAML and does not define data flow completely**
   
   **Reference:** §Definition, lines 27–32: `- id: gather type: prompt model: sonnet effort: medium`; delivery specifies only `to: inbox`.
   
   **Why it matters:** Multiple unquoted mappings on one line are invalid in this block-style YAML. Separately, the example does not say how delivery receives the briefing, whether steps execute serially, or which model the `write` step inherits. An implementer cannot reproduce the example reliably.
   
   **Concrete fix:** Put each mapping field on its own line and validate the example against the actual schema. Specify ordering, dependency references, output references, model inheritance, parameter types, and branch semantics. Parse YAML safely as data, reject unknown fields, and show actionable validation errors before saving.

9. **[med] “Ship with these” contradicts the staged delivery plan**
   
   **Reference:** §Starter workflows lists six workflows; §Definition lists eight step types.
   
   **Why it matters:** Phase 2 promises three starters and only prompt/tool/output steps. Approvals and Hermes arrive in Phase 3; Scout and indexing arrive in Phase 4. Mail/calendar sources are described as v2 in [07-inbox-and-agent-chats.md](docs/specs/07-inbox-and-agent-chats.md:52). The briefing acceptance criterion therefore depends on capabilities without a consistent delivery phase.
   
   **Concrete fix:** Add a phase-and-dependency table to this doc. Name the three Phase 2 starters and their available connectors. Defer unsupported starters and step types, and distinguish a fixture-backed demonstration from a production unattended workflow.

10. **[med] Task state and run state are conflated, hiding work that needs attention**
    
    **Reference:** §Tasks screen: tabs “All, Running, Paused, Failed”; §Run lifecycle includes `queued` and `waiting_approval`.
    
    **Why it matters:** An enabled task can have a failed previous run and a healthy upcoming schedule. A paused task can still have an active run. Neither situation fits a single status cleanly, and waiting approvals have no explicit representation. The listed actions also omit Resume and Cancel.
    
    **Concrete fix:** Separate schedule state from latest/current run state. Define tab filtering precisely and expose “Needs approval,” queued, and blocked states. Provide Resume for paused schedules and Cancel for active runs. State whether Pause affects future occurrences, queued occurrences, or current execution, and link waiting runs directly to their approval.

11. **[med] Creation and editing lack a complete interaction contract**
    
    **Reference:** §Tasks screen lists drawer fields but no create/save flow; §Workflows launcher describes only running existing cards.
    
    **Why it matters:** “Create a daily task” is an acceptance criterion, yet the spec omits the New task entry point that exists in the Stitch prompt. Workflow creation, YAML/form switching, validation, unsaved changes, and editing during execution are undefined.
    
    **Concrete fix:** Specify one primary **New task** action, labelled Save/Cancel controls, field validation, dirty-state handling, and save-failure recovery. Define workflow creation/editing access. Preserve form data when switching to YAML and bind active runs to their original revision.

12. **[med] The table and drawer need an explicit density and typography plan**
    
    **Reference:** §Tasks screen places seven columns, dual-format schedules, four actions, configuration, and expandable logs on one surface.
    
    **Why it matters:** The shared UI system permits only a 360–420 px drawer. Showing all this together risks narrow columns, wrapped timestamps, competing actions, and logs overwhelming the editing task. The current [Schedules.tsx](src/pages/Schedules.tsx:6) is only a placeholder, so “matches mockup” does not establish the missing behavior.
    
    **Concrete fix:** Lead with task name and readable schedule; put cron syntax in secondary detail. Keep one contextual row action and move secondary actions into a labelled menu. Divide the drawer into **Configuration** and **Run history**. Specify a spacing/type scale—for example, 14–16 px primary text, 12–14 px metadata, tabular timestamps, and monospace only for cron/code/logs. Define priority columns at narrow widths and use the full-screen sheet below 900 px.

13. **[med] Glass execution and the timeline lack surface-specific accessibility criteria**
    
    **Reference:** §Tasks screen: status indicators, “24-hour timeline strip,” and expandable logs.
    
    **Why it matters:** [14-ui-system.md](docs/specs/14-ui-system.md:22) already requires contrast and fallbacks, but this doc does not say how dense task metadata, timeline markers, or a drawer over the table satisfy them. Concurrent runs can overlap in the strip; motion and color alone cannot reliably communicate state.
    
    **Concrete fix:** Add acceptance checks for text contrast of at least 4.5:1 over the brightest composited glass background, distinguishable controls/focus, and text labels alongside status colors. Give the drawer sufficient surface opacity to suppress underlying table text. Require an opaque/high-contrast fallback and static reduced-motion states. Make timeline runs keyboard accessible, group collisions, provide a textual list alternative, and label the displayed timezone—including 23/25-hour DST days. Verify these states at narrow widths and 200% zoom.