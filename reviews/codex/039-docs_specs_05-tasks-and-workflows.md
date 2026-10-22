1. **[high] Approval rules cover shell steps but leave other execution paths ambiguous.**  
   **Reference:** “`shell` (needs approval unless allowlisted)” and `tool`/`hermes` step types, §Definition.  
   **Why it matters:** A tool or Hermes step can send mail, delete files, or spend money without being a shell command. The wording also allows a shell allowlist to appear to override the action classifications in `12-security-and-privacy.md`.  
   **Concrete fix:** Require every step and nested agent action to pass the shared approval policy. Bind approval to the exact action, arguments, project, and workflow revision; invalidate it when these change. Enforce file allowlists and output-path restrictions in the daemon.

2. **[high] “Dry-run” promises safety without defining it.**  
   **Reference:** “a dry-run toggle,” §Workflows launcher.  
   **Why it matters:** Users cannot tell whether a dry run invokes models, consumes subscription capacity, reads private files, or executes tool, shell, Hermes, and output steps.  
   **Concrete fix:** Define dry-run as validation and execution-plan preview with side effects blocked. Show intended reads, destinations, permissions, and unresolved branches. If model-assisted simulation is offered, make it a separate, explicitly described action.

3. **[high] Restart and retry guarantees exceed the execution contract.**  
   **Reference:** “Restarting the daemon does not duplicate or lose scheduled runs” and “Failed steps can be retried from that step.”  
   **Why it matters:** A crash after an external action succeeds but before its result is recorded can cause a duplicate send or write on retry. `02-data-model.md` provides no explicit occurrence identity, durable claim, or step-attempt checkpoint.  
   **Concrete fix:** Specify unique scheduled-occurrence IDs, durable dispatch/checkpoints, and per-step attempt records. Use destination idempotency keys where available. Mark uncertain external outcomes for reconciliation instead of automatically replaying them. Narrow the acceptance criterion to guarantees the runner can enforce.

4. **[high] Raw step logging conflicts with privacy requirements.**  
   **Reference:** “Every step records input, output and duration to `run_step`,” §Run lifecycle.  
   **Why it matters:** Mail, calendar entries, file contents, tool credentials, and webhook payloads could become durable database records and enter backups. Secret-pattern redaction in `12-security-and-privacy.md` does not address ordinary sensitive content.  
   **Concrete fix:** Apply redaction and size limits before persistence; default to metadata and bounded summaries for sensitive steps. Define retention, deletion, backup implications, and explicit opt-in for full payload capture.

5. **[high] Event and webhook triggers have no bounded execution contract.**  
   **Reference:** §Triggers, especially `inbox.item.approved`, `kanban.card.moved`, and “webhook (localhost, token).”  
   **Why it matters:** Workflow outputs can emit events that launch more workflows. Replayed webhooks or approval events can repeat actions, and untrusted trigger data can flow into privileged steps.  
   **Concrete fix:** Define event IDs, deduplication, causation tracking, self-trigger suppression, rate/concurrency limits, and a maximum chain depth. Specify webhook authentication, token rotation, payload limits, and replay handling; reference §12’s origin/host policy. Treat trigger payloads as untrusted data.

6. **[med] Tasks and workflow cron triggers can schedule the same work twice.**  
   **Reference:** “Task = a prompt (or workflow) on a schedule” versus `triggers: [{ type: cron, … }]`.  
   **Why it matters:** The document gives schedules two owners without saying how they relate. Workflow triggers also omit the timezone and catch-up rules required for tasks.  
   **Concrete fix:** Make each workflow cron trigger create or reference one task owned by the scheduler. Show that relationship in both screens, and define whether pausing a workflow disables its scheduled tasks.

7. **[med] Scheduling policies omit the cases most likely to exhaust capacity.**  
   **Reference:** §Scheduling rules: `run all`, `queue`, and “N attempts with backoff.”  
   **Why it matters:** A sleeping laptop can accumulate a large backlog. Queueing and retries can then multiply runs, conflicting with the subscription budget in `03-connections-and-routing.md`. Copenhagen daylight-saving changes also create missing or repeated local times.  
   **Concrete fix:** Define DST behavior, maximum catch-up age/count, queue limits, retry ceilings, execution timeouts, and budget precedence. Show timezone and UTC offset in the five-run preview. Distinguish a budget-deferred occurrence from a failed run.

8. **[med] The workflow example is invalid YAML, and the execution schema is incomplete.**  
   **Reference:** §Definition, for example `- id: gather    type: prompt   model: sonnet  effort: medium`.  
   **Why it matters:** Multiple mapping entries cannot be written this way. The example also leaves dependency-to-prompt binding, branch behavior, output selection, and validation rules undefined, preventing reliable form/YAML round-tripping.  
   **Concrete fix:** Provide a valid example backed by a versioned schema. Define parameter types, references, dependencies, branch conditions, and output inputs. Validate unique IDs, missing references, cycles, and provider-supported model/effort combinations before enabling a workflow.

9. **[med] Lifecycle and task filters mix different kinds of state.**  
   **Reference:** Tabs “All, Running, Paused, Failed”; lifecycle `queued -> running -> (waiting_approval) -> succeeded | failed | cancelled`.  
   **Why it matters:** A paused schedule can still have a running invocation; an enabled task can have a failed last run. Approval denial, timeout, cancellation, and restart recovery have no explicit transitions. The acceptance criterion also requires an Inbox result despite other selectable destinations.  
   **Concrete fix:** Separate schedule state from run state and last-run outcome. Define filter membership, approval expiry/denial, cancel behavior, and recovery transitions. Make success acceptance criteria destination-specific, with a linked run record in every case.

10. **[med] “Ship with these” contradicts the phased delivery plan.**  
    **Reference:** Six starter workflows and eight step types versus `13-roadmap.md` Phase 2’s three starters and `prompt/tool/output` runner.  
    **Why it matters:** Morning briefing requires calendar/mail integrations described as v2 in §07; Scout and file indexing arrive in Phase 4. The document turns later capabilities into apparent initial commitments.  
    **Concrete fix:** Add a phase/capability matrix within this spec. Name the three Phase 2 starters and their available tools. Keep later templates unavailable with a clear dependency explanation until their integrations exist.

11. **[med] The Tasks composition lacks a hierarchy and density budget.**  
    **Reference:** §Tasks screen: seven columns, four actions, timeline, and a drawer containing configuration plus history/logs.  
    **Why it matters:** The specification does not repeat the mockup’s primary **New task** action or clarify that row actions are a menu. With §14’s 360–420px drawer open, the table can become cramped. Configuration and expanding logs compete for attention. `src/pages/Schedules.tsx` is only a placeholder, so “matches mockup” provides no implemented safeguard.  
    **Concrete fix:** Specify a 24px page title and primary New task action; prioritize name, next run, and last outcome. Put cron syntax beneath human-readable scheduling text and secondary actions in a menu. Use separate Configuration/History drawer views, consistent 16–24px section spacing, 14px row text, and tabular time figures. Below 900px, use the full-screen sheet from §14 and define a compact task-list layout.

12. **[med] The timeline is underspecified for dense runs and nonvisual use.**  
    **Reference:** “A 24-hour timeline strip shows today’s runs.”  
    **Why it matters:** It is unclear whether this includes planned, running, and completed occurrences. Closely spaced markers can overlap; colour alone cannot communicate status. On DST transition days, a local day is not always 24 elapsed hours.  
    **Concrete fix:** Define the time basis, displayed states, collision clustering, labels, and selection behavior. Provide a textual list equivalent and keyboard-accessible details. Keep the strip subordinate to the task list and allow it to collapse on narrow screens.

13. **[med] Glass execution requirements are not translated into acceptance criteria for this surface.**  
    **Reference:** §Tasks screen and §Workflows launcher; cross-check §14’s contrast, fallback, and motion rules.  
    **Why it matters:** Dense timestamps, muted cron strings, status marks, focus rings, and logs are the elements most vulnerable to changing backgrounds beneath glass. The global rules exist, but this spec never identifies the states that must satisfy them.  
    **Concrete fix:** Add checks for default, selected, hover, focused, and disabled states over the brightest atmospheric background: text at least 4.5:1 and essential control/focus boundaries at least 3:1 against adjacent surfaces. Specify opaque log/editor surfaces and high-contrast/no-blur fallbacks. Under reduced motion, remove sliding, shimmer, and continuous status animation; use static text/icon status.

14. **[med] Editing and launch forms lack a keyboard and error-recovery contract.**  
    **Reference:** Side drawer, parameter form, and “Start with form + YAML”; §14 requires a keyboard list in each spec.  
    **Why it matters:** There is no defined Save/Cancel flow, dirty-edit handling, validation focus, drawer focus return, or relationship between form edits and YAML edits. An invalid edit could disable an unattended workflow or discard working configuration.  
    **Concrete fix:** Define labelled controls, inline errors with a focusable summary, modal-sheet focus containment, focus return, and explicit Save/Cancel behavior. Preserve invalid drafts while keeping the last valid enabled revision active. Specify lossless switching between form and YAML, including how unsupported advanced fields remain visible.