1. **[high] Approval rules leave bypasses through tools and Hermes.**  
   **Reference:** §Definition, line 34: “`shell` (needs approval unless allowlisted)”; `tool`, `hermes`, and `output` have no equivalent requirement.  
   **Why it matters:** A tool can send mail, Hermes can run commands, and an output step can overwrite files. Approval based on step type conflicts with `12-security-and-privacy.md`, which classifies the actual action and requires approval for external sends, destructive actions, and spending.  
   **Concrete fix:** Require every executor to enforce the shared action policy immediately before effects occur. Bind approval to the exact action, resolved parameters, destination, and workflow revision; changed actions require fresh approval.

2. **[high] Restart and retry guarantees lack a recovery contract.**  
   **Reference:** §Run lifecycle: “Failed steps can be retried from that step”; §Acceptance criteria: “does not duplicate or lose scheduled runs.”  
   **Why it matters:** A crash after writing a file or sending a request, but before recording success, can repeat the effect on restart. `02-data-model.md` does not establish occurrence uniqueness, step attempts, or durable checkpoints connecting workflow runs to steps. Default `skip` also makes “no lost scheduled runs” ambiguous.  
   **Concrete fix:** Define unique scheduled-occurrence IDs, atomic enqueueing, persisted step attempts and checkpoints, and idempotency keys where supported. Mark uncertain external effects for review instead of automatically replaying them. Distinguish intentional skipped occurrences from lost work.

3. **[high] Recording every step’s input and output creates an undefined privacy archive.**  
   **Reference:** §Run lifecycle, line 48: “Every step records input, output and duration.”  
   **Why it matters:** Mail, calendars, file contents, tool credentials, and sensitive model output can enter logs and subsequently backups or exports. The blanket recording requirement does not incorporate the redaction and size caps required by `01-architecture.md` and `12-security-and-privacy.md`.  
   **Concrete fix:** Specify redaction before persistence, bounded payload sizes, retention and deletion rules, and permission summaries for enabled workflows. Store references or summaries by default; make retaining sensitive full payloads explicit.

4. **[high] “Dry-run” promises safety without defining what runs.**  
   **Reference:** §Workflows launcher, line 19: “a dry-run toggle.”  
   **Why it matters:** Users cannot know whether this invokes models, reads private files, delegates to Hermes, or executes tools. Even a read-only model call can disclose data and consume subscription capacity.  
   **Concrete fix:** Define dry-run as validation and a preview of resolved steps, permissions, destinations, and estimated calls, with no executor invocation. If a simulation mode is also wanted, name it separately and disclose its reads and provider calls.

5. **[high] Event triggers can recurse or resume the wrong approval.**  
   **Reference:** §Triggers: `kanban.card.moved`, `scout.finding`, `inbox.item.approved`, and webhook triggers.  
   **Why it matters:** Workflows can create further triggering events, including through Kanban output. An approval event could both resume a blocked run and launch another workflow. “Localhost, token” also leaves webhook credential scope and replay behavior unspecified.  
   **Concrete fix:** Define event filters, origin and correlation IDs, deduplication, recursion limits, and trigger rate limits. Approval resumption must match one pending run step and consume the decision once. Reference the daemon authentication rules and require scoped webhook credentials and replay handling.

6. **[high] The workflow example is invalid YAML and omits essential execution semantics.**  
   **Reference:** §Definition, lines 27–32: `- id: gather    type: prompt   model: sonnet`; delivery has no `input`.  
   **Why it matters:** Multiple block mapping entries cannot be written on one line this way. Beyond parsing, the spec does not say whether execution is sequential or dependency-driven, what delivery receives, how branches select successors, or how model overrides interact with step settings. This prevents a reliable editor and runner from sharing one contract.  
   **Concrete fix:** Provide a valid, versioned example backed by a shared schema. Define step inputs, dependency ordering, branch targets, model precedence, parameter validation, and invalid-reference handling. Validate YAML before saving or enabling a workflow.

7. **[high] Launch scope contradicts the roadmap and depends on deferred integrations.**  
   **Reference:** §Starter workflows: “ship with these” lists six; §Definition and §Triggers include Hermes, shell, branching, approvals, events, and webhooks.  
   **Why it matters:** `13-roadmap.md` limits Phase 2 to prompt/tool/output steps and three starters, introduces Hermes and approvals in Phase 3, and places Scout and file indexing in Phase 4. `07-inbox-and-agent-chats.md` defers mail/calendar sources to v2, although the morning briefing requires them.  
   **Concrete fix:** Add an explicit release matrix. Specify which three workflows can run with available Phase 2 adapters; label remaining starters and step/trigger types by later phase. Require approval infrastructure before enabling any action that needs it.

8. **[med] Catch-up and queue policies can create unbounded background work.**  
   **Reference:** §Scheduling rules: `run all`, `queue`, and “N attempts with backoff.”  
   **Why it matters:** Frequent tasks after a long shutdown can enqueue thousands of runs, amplified by retries. The spec does not incorporate the background usage guard in `03-connections-and-routing.md` or define timeouts and concurrency limits.  
   **Concrete fix:** Bound catch-up age, occurrence count, queue depth, attempts, and run duration. Define per-provider concurrency and budget deferral. Show backlog size and the reason work is waiting, with controls to discard obsolete runs.

9. **[med] Tasks and workflow schedules have competing ownership.**  
   **Reference:** Opening definition: a task is “a prompt (or workflow) on a schedule”; the workflow example also embeds a cron trigger.  
   **Why it matters:** It is unclear whether these create one schedule or two, where a scheduled workflow appears, or whether pausing a task disables its workflow trigger. `02-data-model.md` also gives `task` no explicit workflow reference or parameter binding.  
   **Concrete fix:** Choose one canonical schedule entity. Define how workflow cron triggers reference or generate it, how parameters are stored, and how pause, edit, deletion, and “Run now” affect that schedule.

10. **[med] Time handling is incomplete, and “24-hour” is incorrect on DST transition days.**  
    **Reference:** §Scheduling rules: explicit timezone and one-off runs; §Tasks screen: “A 24-hour timeline strip shows today’s runs.”  
    **Why it matters:** A Copenhagen calendar day can contain 23 or 25 hours. Repeated or nonexistent local times affect cron execution, previews, and catch-up. The workflow’s cron example has no timezone, and the drawer does not specify a one-off editor.  
    **Concrete fix:** Define DST behavior, timezone inheritance, one-off timestamp semantics, and the effect of timezone edits. Display zone and offset in previews. Make the timeline represent the actual local day and label repeated hours distinctly.

11. **[med] The screen omits its creation action and conflates task state with run state.**  
    **Reference:** §Tasks screen: tabs “All, Running, Paused, Failed” and actions “Run now, Pause, Edit, Logs.”  
    **Why it matters:** A task can be enabled, have a failed last run, and currently be running. The tabs and “status” column do not distinguish these dimensions. There is no specified New task, Resume, or Cancel action, despite creation acceptance criteria and a `cancelled` lifecycle state. The Stitch prompt includes New task; `src/pages/Schedules.tsx` currently offers only an empty table.  
    **Concrete fix:** Specify a visible **New task** action and an actionable empty state. Separate schedule state, active-run state, and last outcome. Define filters, Resume, cancellation, and how waiting approvals link to the Inbox.

12. **[med] Table and drawer density lack hierarchy, spacing, and responsive rules.**  
    **Reference:** §Tasks screen, line 8: seven columns, four actions, timeline, and a drawer containing both editing fields and run logs.  
    **Why it matters:** With the 360–420 px drawer specified in `14-ui-system.md`, the remaining table can become cramped. Treating every field and action equally produces a generic control panel where the task name, next execution, and failure reason compete with cron syntax and logs.  
    **Concrete fix:** Give name and the next relevant action priority; make human schedule text primary and cron secondary monospace. Specify a two-line row rhythm, tabular time figures, stable column alignment, and one visible contextual action. Separate drawer configuration from history, group fields with consistent spacing, and define a compact layout below the shared 900 px breakpoint. Include keyboard navigation and drawer focus behavior.

13. **[med] The workflow launcher is a generic card grid with insufficient operational context.**  
    **Reference:** §Workflows launcher: cards contain “name, description, last run, ‘Run’ button.”  
    **Why it matters:** Equal cards give all workflows the same visual weight while hiding trigger state, last outcome, required connections, and potential effects. The spec also offers no clear authoring entry point, despite promising form and YAML editing.  
    **Concrete fix:** Define Create/Edit and enable/disable flows. Make each entry show its purpose, trigger summary, last outcome, and readiness; provide a searchable row view as the collection grows. Before running, show destinations and required permissions beside the parameters. Preserve the chosen glass identity while keeping repeated entries quiet—avoid decorative icon tiles, redundant badges, and nested frosted panels.