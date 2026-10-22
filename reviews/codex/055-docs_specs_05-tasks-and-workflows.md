1. **[high] Approval enforcement is narrower than the security policy.**  
   **Reference:** §Definition, line 34: “`shell` (needs approval unless allowlisted)”; §Triggers allows agent, event, and webhook launches.  
   **Why it matters:** A `tool`, `hermes`, or file-output step can also write, send, spend, or delete. An explicit `approval` step cannot be the security boundary. [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires action-based checks and exact command/diff previews.  
   **Fix:** Require daemon-enforced authorization for every effectful action, regardless of step type or trigger. Bind approvals to the resolved action, arguments, project, and definition version; invalidate them when those change. Specify denial, timeout, and cancellation behavior.

2. **[high] Restart and retry guarantees omit the side-effect boundary.**  
   **Reference:** Lines 15, 48, 52: automatic retries, retry from a failed step, and “does not duplicate or lose scheduled runs.”  
   **Why it matters:** A process can crash after sending or writing but before recording success. Retrying then repeats the action. Persistent scheduling alone cannot satisfy this acceptance criterion.  
   **Fix:** Define durable occurrence IDs, atomic job claims, per-step attempt records, and idempotency keys where supported. Treat uncertain external outcomes as requiring reconciliation before retry. Test crashes immediately before and after an effect, plus restart while awaiting approval.

3. **[high] Dry-run is offered without defining its safety guarantee.**  
   **Reference:** §Workflows launcher, line 19: “a dry-run toggle.”  
   **Why it matters:** Users cannot know whether this runs models, consumes subscription capacity, invokes tools, writes output, or hands work to Hermes.  
   **Fix:** Define dry-run as validation and an execution-plan preview with effectful operations suppressed. Label any live model calls and capacity use separately. Reject dry-run execution for adapters that cannot enforce those restrictions.

4. **[high] Recording every step’s input and output creates an uncontrolled private-data archive.**  
   **Reference:** §Run lifecycle, line 48: “Every step records input, output and duration.”  
   **Why it matters:** The proposed workflows process mail, calendars, and folders. Full payloads can propagate into SQLite, logs, exports, and backups. Secret-pattern redaction in [12](docs/specs/12-security-and-privacy.md) does not cover ordinary sensitive content.  
   **Fix:** Default to metadata and redacted summaries. Specify payload opt-in, size caps, retention, deletion, and backup expiry. Resolve credentials through keychain references; keep them out of definitions and recorded inputs. Require a reviewable source scope before enabling a workflow that reads private data.

5. **[high] Catch-up and event triggers can create an automation storm.**  
   **Reference:** Lines 13–15: “run all,” “queue,” and retries; line 37 includes `inbox.item.approved` events.  
   **Why it matters:** A long outage can enqueue many executions; workflows can emit events that trigger further workflows. Retrying multiplies both load and side effects. [03](docs/specs/03-connections-and-routing.md) already requires background capacity limits, but this spec never applies them.  
   **Fix:** Add a catch-up horizon, maximum backlog, bounded retry policy, concurrency limits, and subscription-budget behavior. Carry event origin and causation IDs; prevent self-trigger loops. Resume approvals by their bound run/step ID rather than creating another run.

6. **[high] “Ship with these” conflicts with the phased delivery plan.**  
   **Reference:** §Starter workflows, lines 39–45; step types and triggers, lines 34–37.  
   **Why it matters:** This promises six starters plus Hermes, shell, branching, approvals, webhooks, and event automation. [13-roadmap.md](docs/specs/13-roadmap.md) places three starters and prompt/tool/output execution in Phase 2, Hermes in Phase 3, and Scout/file indexing in Phase 4. Mail/calendar integrations are deferred in [07](docs/specs/07-inbox-and-agent-chats.md).  
   **Fix:** Mark capabilities and starters by phase. Define Phase 2 around three workflows with available dependencies; expose unavailable integrations as setup requirements. Move the week-long unattended-run criterion from the roadmap into this doc’s release gate.

7. **[med] The example definition cannot serve as a valid execution contract.**  
   **Reference:** YAML example, lines 23–32, especially `- id: gather type: prompt model: sonnet effort: medium`.  
   **Why it matters:** Multiple mapping entries on one block line make the example invalid YAML. The delivery step also never identifies which result it publishes. Branch conditions, input binding, and run-level versus step-level model overrides remain unspecified.  
   **Fix:** Supply one valid, schema-validated example with separate mapping lines and explicit output references. Define dependency order, missing-input behavior, cycle rejection, parameter validation, override precedence, and safe YAML parsing without executable tags.

8. **[med] Task and workflow scheduling have no single source of truth.**  
   **Reference:** Line 4: a task is “a prompt (or workflow) on a schedule”; line 25 embeds cron triggers inside workflow definitions.  
   **Why it matters:** It is unclear whether scheduling a workflow creates a task or a separate scheduler entry. Editing or disabling one could leave the other active. [02-data-model.md](docs/specs/02-data-model.md) also lacks explicit task-to-workflow and workflow-run-to-step relationships, one-off timestamps, and several stated policies.  
   **Fix:** Define one persisted schedule entity referencing a prompt or versioned workflow. Specify ownership, enable/disable behavior, and relationships among task, occurrence, workflow run, and step attempts. List the necessary schema changes here.

9. **[med] Timezone selection does not settle scheduling semantics.**  
   **Reference:** §Scheduling rules, lines 11–16.  
   **Why it matters:** Copenhagen schedules encounter missing and repeated local times. One-off runs, task edits, and downtime spanning a clock change also need predictable behavior. A fixed “24-hour” timeline is ambiguous on those days.  
   **Fix:** Specify daylight-saving behavior, overdue one-off handling, and how edits affect queued occurrences. Show timezone and UTC offset in the next-five preview. Define whether the timeline represents a local calendar day or a rolling 24 hours, and label it accordingly.

10. **[med] Task state, run state, and recovery controls are mixed together.**  
    **Reference:** Line 8: “All, Running, Paused, Failed”; line 48 includes `queued`, `waiting_approval`, and `cancelled`.  
    **Why it matters:** A paused schedule can still have a running execution; an enabled task can have a failed last run. Waiting approvals have no obvious home, and Pause does not explain whether current work stops. Cancellation is named without a control.  
    **Fix:** Separate schedule state from latest/current run state. Define tab filters and counts, expose queued and approval-blocked runs, and distinguish “Pause schedule” from “Cancel run.” State how cancellation reaches CLI processes and Hermes, and whether queued work remains.

11. **[med] The main task-creation path is missing, and the drawer combines too many jobs.**  
    **Reference:** §Tasks screen, line 8; acceptance criterion “Create a daily task,” line 51.  
    **Why it matters:** The referenced [mockup prompt](docs/design/stitch-prompts.md) includes a primary **New task** button, but this spec omits it. One drawer contains configuration, schedule previews, history, and expandable logs; the shared 360–420 px drawer width in [14](docs/specs/14-ui-system.md) makes that a cramped editing surface.  
    **Fix:** Specify New task, Save/Cancel, validation, and unsaved-change handling. Separate Configuration from Run history, with full logs in a dedicated view. Group fields under clear headings with consistent 16–24 px spacing; make prompt and YAML editors expandable.

12. **[med] Table hierarchy and responsive density are not defined.**  
    **Reference:** §Tasks screen, line 8: seven columns, dual-format schedules, four actions, and a timeline.  
    **Why it matters:** Treating every field and action equally will crowd names and next-run information, particularly with an open drawer. The existing [Schedules.tsx](src/pages/Schedules.tsx) is only a five-column placeholder, so it does not resolve these decisions.  
    **Fix:** Prioritize name, current/last outcome, and next run. Put human schedule text first and cron beneath it; use tabular figures for times. Use roughly 52–60 px two-line rows, 14–16 px primary text, and readable 12–13 px metadata. Specify one contextual row action plus an overflow menu, and a compact list/full-screen detail treatment below the shared breakpoint.

13. **[med] Glass readability and motion requirements lack screen-specific acceptance checks.**  
    **Reference:** §Tasks screen and §Workflows launcher; “matches mockup” is the only visual qualification.  
    **Why it matters:** Small cron text, status labels, timeline markers, and logs must remain readable across changing atmospheric backgrounds. [14](docs/specs/14-ui-system.md) supplies general contrast and fallback rules, but this doc does not identify the difficult surfaces or how to verify them.  
    **Fix:** Require contrast checks against the brightest composited glass state: at least 4.5:1 for normal text and 3:1 for essential control boundaries and indicators. Give dense logs a stable, stronger backing. Specify visible keyboard focus, text/glyph status cues, opaque/high-contrast modes, and reduced-motion behavior that removes pulses and shimmer while preserving state.  
    **Optional palette:** An azure action accent `#79B8FF` separates actions from teal health signals. It measures **8.72:1** against solid `#14161B`; dark `#0B0C0F` button text measures **9.42:1** on azure. White text measures only **2.08:1**. Recheck these pairs after glass compositing.

14. **[med] Keyboard access and operational states are absent from the acceptance criteria.**  
    **Reference:** Lines 8, 19, and 50–53.  
    **Why it matters:** Timeline markers, tabs, drawers, YAML errors, and live logs need explicit interaction rules. The shared UI spec calls for a keyboard list in each screen spec; none appears here. Empty, disconnected, stale, and permission-denied states also lack task-specific recovery.  
    **Fix:** Define keyboard tab navigation, drawer focus trapping/restoration, Escape behavior, labeled row menus, and a keyboard-accessible list equivalent to the timeline. Add validation messages beside fields, log auto-follow controls, and restrained status announcements. Include acceptance cases for no tasks, unavailable provider, daemon outage, denied approval, and failed output delivery.

15. **[low] Output destinations disagree with the success criterion.**  
    **Reference:** Line 8 offers chat, file, Inbox, or notification; line 34 adds Kanban; line 51 always expects an Inbox result.  
    **Why it matters:** It is unclear whether Inbox is mandatory, optional, or merely a link to an artifact. Notification-only output could also leave no durable result.  
    **Fix:** Define one destination contract, required destination fields, and durable result storage. State when an Inbox item is created and how delivery failures appear. Make the acceptance criterion explicitly select Inbox, or verify the destination chosen for that test.