1. **[high] Approval enforcement is too narrow for unattended execution.**  
   **Reference:** §Definition, line 34: “`shell` (needs approval unless allowlisted)”; §Triggers permits agent and webhook launches.  
   **Why it matters:** Tools, provider agents, Hermes and output steps can also write files, send data or perform destructive actions. [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires approval by action class; an allowlisted shell must not bypass those rules.  
   **Concrete fix:** Require every executor to enforce the shared policy at each actual action. Bind approval to the resolved command/diff, destination, project and workflow version. Specify denial, timeout and restart behavior; approval must never be inferred from a trigger.

2. **[high] Restart and retry guarantees omit the duplicate-side-effect problem.**  
   **Reference:** §Run lifecycle: “Failed steps can be retried from that step”; §Acceptance criteria: “does not duplicate or lose scheduled runs.”  
   **Why it matters:** A process can crash after writing a file or delivering output but before recording success. Retrying can duplicate the action. The absolute acceptance promise also conflicts with intentionally skipped occurrences under the default catch-up policy.  
   **Concrete fix:** Distinguish scheduled occurrences, runs and attempts. Persist unique occurrence IDs and step checkpoints; use idempotency keys where supported. Mark uncertain external outcomes for reconciliation instead of automatic replay. Define “no loss” as every occurrence being accounted for, including deliberate skips.

3. **[high] Catch-up and event triggers can create unbounded work.**  
   **Reference:** §Scheduling rules: “`run all`,” “`queue`,” and retries; §Triggers includes `inbox.item.approved` and `kanban.card.moved`.  
   **Why it matters:** Waking a laptop after days could enqueue hundreds of jobs. A workflow that creates or moves cards can trigger another workflow repeatedly. This also needs to respect the capacity budget in [03-connections-and-routing.md](docs/specs/03-connections-and-routing.md).  
   **Concrete fix:** Define maximum catch-up age/count, queue depth, concurrency, attempt count and run duration. Add trigger deduplication, origin/correlation IDs and recursion limits. Show backlog and budget deferrals, with controls to discard queued occurrences.

4. **[high] “Dry-run” has no safety contract.**  
   **Reference:** §Workflows launcher, line 19: “a dry-run toggle.”  
   **Why it matters:** Users cannot tell whether this means validation only, model calls without delivery, or real tools with selected writes suppressed. Calendar/mail reads still expose private data, and model calls still consume capacity.  
   **Concrete fix:** Define dry-run as validation and a resolved execution plan by default, with tool, shell, Hermes and output effects blocked. Any optional live reads or model calls need explicit labeling. List unsupported simulation steps and show that no real delivery occurred.

5. **[high] Recording every step’s input/output creates an undefined private-data archive.**  
   **Reference:** §Run lifecycle, line 48: “Every step records input, output and duration”; starter workflows include calendar and mail.  
   **Why it matters:** Secret-pattern redaction in spec 12 does not remove sensitive message bodies, calendar details or file contents. Retrying from stored inputs also makes retention and deletion behavior consequential.  
   **Concrete fix:** Specify metadata-only logging by default, opt-in payload capture, redaction before persistence, size/retention limits and backup handling. Declare permitted folders, model destinations and output paths per workflow; reject path traversal and require an explicit overwrite policy.

6. **[high] The runnable definition is invalid YAML and lacks execution semantics.**  
   **Reference:** §Definition, lines 27–32: `- id: gather type: prompt model: sonnet effort: medium`.  
   **Why it matters:** Multiple mapping entries cannot be written on one line in that form. Beyond syntax, the example never states which output `deliver` consumes, while branch behavior and downstream input handling remain undefined.  
   **Concrete fix:** Provide a valid, schema-validated example with each property on its own line. Define ordering/dependencies, output references, parameter validation, template escaping, branch selection and skipped-step behavior. Reject cycles, unknown tools and unsupported model/effort combinations before enabling a workflow.

7. **[med] The promised launch scope conflicts with the roadmap and available integrations.**  
   **Reference:** §Starter workflows: “ship with these” lists six; line 34 includes seven step types.  
   **Why it matters:** [13-roadmap.md](docs/specs/13-roadmap.md) puts three starters and prompt/tool/output steps in Phase 2, Hermes and approvals in Phase 3, and Scout/file indexing in Phase 4. Spec 07 leaves mail/calendar sources for v2, yet the flagship starter depends on them.  
   **Concrete fix:** Add an explicit phase boundary inside this doc. Name the three initial starters, their available connectors and supported step types. Mark the remaining workflows/triggers as later, and hide or explain unavailable capabilities in the launcher.

8. **[med] The scheduling model cannot yet represent its advertised behavior.**  
   **Reference:** §Scheduling rules, lines 11–15; YAML cron trigger, line 25.  
   **Why it matters:** The workflow trigger omits the required timezone. One-off runs have no date/time editor. Copenhagen’s daylight-saving transitions create missing or repeated local times. The draft task schema in spec 02 also omits workflow binding, one-off scheduling, overlap and retry settings.  
   **Concrete fix:** Define one schedule schema shared by tasks and workflow triggers, including timezone, one-off timestamp and policies. Specify DST handling, timezone changes and preview behavior. Use a single scheduling owner so a task wrapping a cron-triggered workflow cannot accidentally register it twice.

9. **[med] Task state, run state and user controls are conflated.**  
   **Reference:** §Tasks screen: “All, Running, Paused, Failed”; §Run lifecycle includes `queued`, `waiting_approval` and `cancelled`.  
   **Why it matters:** A paused task may still have a running invocation or a failed last run. Approval-blocked and queued work lack a clear place. “Pause” does not explain whether it stops execution, disables future scheduling or holds queued runs.  
   **Concrete fix:** Separate **schedule enabled/paused** from **current run** and **last outcome**. Define filter membership and visible counts. Add Resume and run-specific Cancel/Stop controls, clarify Run now on paused tasks, and show approval-blocked runs with a direct Review approval action.

10. **[med] The table and drawer lack a workable density and hierarchy contract.**  
    **Reference:** §Tasks screen, line 8: seven columns, cron plus prose, four actions, a timeline, and an editor/history drawer.  
    **Why it matters:** A 360–420 px drawer from spec 14 leaves little room for the table. Giving all this information equal weight makes names, next execution and failures harder to scan. The mockup specifies an actions menu; this doc leaves that ambiguous.  
    **Concrete fix:** Make task name, state and next run the primary scan path. Put human-readable schedules first, with cron secondary; keep actions in a labeled overflow menu. Define row pitch around 48–56 px, body text at 14–16 px, metadata at least 12 px, and consistent 16/24 px spacing. Separate configuration from history within the drawer, with clear Save/Cancel and unsaved-change behavior.

11. **[med] Glass execution needs screen-specific contrast and motion checks.**  
    **Reference:** §Tasks screen and §Workflows launcher; inherited glass rules in spec 14.  
    **Why it matters:** Spec 14 already requires contrast, blur limits and fallbacks, but this doc does not specify how those apply to cron text, timeline markers, status chips, logs and drawer controls over changing atmospheric backgrounds.  
    **Concrete fix:** Add acceptance checks for the brightest composited background and stacked drawer state: 4.5:1 normal text and 3:1 meaningful control/focus indicators. Keep primary names and results in full-contrast ink. Require an explicit opaque/high-contrast mode and reduced-motion behavior that removes travel, pulsing and shimmer while preserving status.  
    An optional accent candidate is **sky blue `#7DD3FC`**, which separates actions from teal success, amber warning and red failure. Against an opaque `#14161B` surface it gives **10.85:1**; use dark labels on blue fills, since white gives only **1.67:1**. Recheck composited glass separately.

12. **[med] Timeline, keyboard and narrow-screen behavior remain unspecified.**  
    **Reference:** §Tasks screen: “A 24-hour timeline strip”; spec 14 promises a keyboard list in each screen spec, but this doc provides none.  
    **Why it matters:** Closely timed markers can overlap, and a fixed 24-hour scale is misleading on DST transition days. Hover-only details exclude keyboard users. The seven-column table also has no defined transformation when the drawer becomes a full-screen sheet.  
    **Concrete fix:** Label the timeline’s date/timezone, distinguish planned occurrences from actual runs, cluster collisions and provide a textual agenda equivalent. Define keyboard access to tabs, rows, menus, parameters and cron previews; drawer focus entry/return and Escape behavior; and announced run-state changes. At narrow widths, use task rows with secondary metadata and one detail view at a time.