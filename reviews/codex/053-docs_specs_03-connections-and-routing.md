1. **[high] Official CLI execution has no approval-enforcement contract.**  
   **Reference:** §The approach, line 7: “launches each provider’s official client in non-interactive mode.”  
   **Why it matters:** These clients can execute tools themselves. The spec never explains how their filesystem, shell and network actions obey JunOS’s approval policy in `12-security-and-privacy.md`. Merely receiving streamed tool events does not establish control before execution.  
   **Concrete fix:** Require chat-only adapters to disable native tools. Enable agent execution only where the adapter can enforce working-directory boundaries, intercept approvals before execution, and cancel the process tree. Mark unsupported capabilities unavailable; never solve headless execution by bypassing permissions.

2. **[high] Automatic fallback changes the recipient of private context without a defined consent boundary.**  
   **Reference:** §Routing rules, line 35: “try the next, and tell the user in the message header.”  
   **Why it matters:** Notification after answering comes after disclosure. Chat can contain conversation history, files and project context (`04-chat.md`); fallback could send these to a different provider, including moving from local execution to a hosted service.  
   **Concrete fix:** Make cross-provider fallback opt-in per conversation/workflow, with an explicit allowed-provider list and local-only constraint. Show the destination before enabling fallback, preserve context exclusions, and record which provider received each attempt.

3. **[high] The subscription-only promise conflicts with the proposed integration paths.**  
   **Reference:** §Goal, line 4: “no per-token API billing”; provider table, lines 14–15: “official API if one is bundled” and “Portal login or key.”  
   **Why it matters:** An official endpoint or existing login does not establish that execution uses an included subscription allowance. The proposed key path also conflicts with the credential model in `12-security-and-privacy.md`, which leaves provider credentials in official CLI stores.  
   **Concrete fix:** Add an integration gate recording authentication method, billing mode and evidence of subscription coverage. Ship only verified subscription routes under this promise. Keep paid API and local-model routes separately labelled and disabled until explicitly configured, with paid execution subject to the spend policy.

4. **[high] The scheduler’s mandatory budget depends on telemetry the spec explicitly allows to be unavailable.**  
   **Reference:** Line 24 permits local counts instead of provider usage; §Usage budget, line 40 requires yielding above “80%” of the weekly meter.  
   **Why it matters:** Local run counts cannot reveal capacity consumed through manual use. Unknown or stale usage leaves the scheduler unable to enforce its stated protection. Concurrent jobs can also pass the same threshold check before either updates usage.  
   **Concrete fix:** Define usage source, measurement window, freshness and unknown states. When reliable telemetry is absent, use explicitly labelled local attempt limits and conservative background concurrency. Reserve capacity atomically before dispatch; count retries and fallback attempts against limits. Never display local counts as subscription percentage.

5. **[med] Fallback selection lacks precedence, compatibility and retry boundaries.**  
   **Reference:** §Routing rules, lines 34–37.  
   **Why it matters:** Default model, conversation choice (`04-chat.md`), task settings and workflow overrides can disagree. A fallback model may not support the chosen effort, tools or attachments. The spec also leaves unclear whether rate limiting after partial output or tool execution permits replay, risking duplicate actions.  
   **Concrete fix:** Define one precedence order, a bounded attempt policy and capability filtering. Allow automatic fallback only before output or side effects, unless safe continuation is explicitly supported. Otherwise preserve the partial run and offer a labelled retry. Persist requested route, attempted routes, actual model and fallback reason.

6. **[med] Disconnect has no durable meaning or policy for dependent work.**  
   **Reference:** Line 24: “Disconnect removes only JunOS’s reference, never the CLI’s login.”  
   **Why it matters:** A subsequent capability probe could rediscover the still-authenticated CLI. Neither the connection schema in `02-data-model.md` nor the listed states distinguishes intentional disconnection from a missing installation. Scheduled work and fallback rules may continue referring to it.  
   **Concrete fix:** Persist an explicit JunOS-enabled flag that probes cannot override. Label the action “Disable in JunOS,” explain that CLI login remains, and define treatment of queued and running jobs. Exclude disabled providers from routing immediately and show affected tasks before applying the change.

7. **[med] The connection states cannot describe several required recovery paths.**  
   **Reference:** §Connection states, lines 21–24; capability probe, line 17.  
   **Why it matters:** `unavailable` means only “CLI missing,” while unsupported versions, failed probes, intentional disabling and unknown status have no defined treatment. `degraded` has no meaning or action. The adapter interface in `01-architecture.md` returns only `connected: boolean`, so it cannot faithfully supply the richer UI.  
   **Concrete fix:** Specify a shared status contract separating enabled state, authentication, installation/version compatibility, health and capacity. Include reason, last-checked time, nullable reset time and recovery action. Show “Reset unknown” where necessary; provide initial installation/login guidance as well as Reconnect.

8. **[med] The effort scale promises equivalence that the mapping does not establish.**  
   **Reference:** §Effort mapping, lines 27–30: “prompt-budget tiers” and “nearest equivalent.”  
   **Why it matters:** Prompt instructions, output budgets and native reasoning settings are different controls. Silently substituting one for another makes “High” misleading and weakens the chat requirement that effort changes be visible in run records.  
   **Concrete fix:** Declare each model’s native control and supported values. Disable effort when no meaningful native mapping exists; expose output limits separately. Record the requested level and actual provider parameter, and explain any approximation beside the picker.

9. **[med] The Connections screen specifies an inventory of fields without a visual priority.**  
   **Reference:** Line 24 lists plan, method, usage, reset, models and actions; `docs/design/stitch-prompts.md` §6 places these in peer cards above routing.  
   **Why it matters:** Five equally prominent cards with model chips and recovery buttons can bury the important questions: what can run now, what needs attention, and where will the next request go? The existing `Connections.tsx` grid permits cards as narrow as 220px, without a richer layout contract.  
   **Concrete fix:** Define the reading order: route summary, providers needing attention, remaining providers, then routing settings. Within each provider, lead with name and textual state, followed by usage/window and one contextual action; disclose model lists and diagnostics. Specify, for example, 16–24px panel padding, 12–16px group spacing, 14px operational text and tabular usage figures. Stack fields on narrow screens.

10. **[med] Dragging is the only specified way to edit fallback priority.**  
    **Reference:** Line 35: “Fallback order (drag to reorder).”  
    **Why it matters:** Keyboard and assistive-technology users have no defined alternative. The generic “keyboard-first” rule in `14-ui-system.md` does not specify this interaction, focus behavior or how reordered priorities are announced.  
    **Concrete fix:** Add Move up/Move down buttons with provider-specific accessible names, retain focus after movement, and announce the new position. Define immediate persistence or explicit Save/Cancel feedback. Keep these controls usable on touch screens without precision dragging.

11. **[med] Glass execution lacks screen-specific contrast and motion acceptance criteria.**  
    **Reference:** §Connection states and screen contents, lines 22–24; inherited tokens and fallback rules in `14-ui-system.md`.  
    **Why it matters:** This screen combines small method labels, usage tracks, status badges and interactive routing controls over atmospheric glass. The global text-contrast rule does not define control boundaries, meaningful meter contrast, focus visibility or the treatment of live updates.  
    **Concrete fix:** Require 4.5:1 normal-text contrast over the brightest supported composited backdrop and 3:1 for meaningful control/state indicators. Use text alongside status colour. Test opaque/high-contrast modes; keep usage updates static and disable nonessential motion under reduced motion. An optional **sky-blue accent `#38BDF8`** would distinguish selection from teal health indicators: it gives **8.45:1 against solid `#14161B`**, and dark `#0B0C0F` labels give **9.13:1 on that accent**. These solid-pair calculations still need verification over the actual glass.

12. **[low] Integration verification is scheduled in two different phases, with no acceptance gate in this spec.**  
    **Reference:** Line 19 says “Phase 1 spike”; `13-roadmap.md` schedules provider spikes in Phase 0.  
    **Why it matters:** Phase 1 implementation could begin before the feasibility and billing questions are resolved. Keeping an unsupported provider labelled “coming” also implies a delivery commitment that the research may not support.  
    **Concrete fix:** Align verification with Phase 0 and define the evidence required before enabling each adapter. Add acceptance cases for expired login, unknown usage, disabled provider persistence, fallback privacy restrictions and cancellation. Label unresolved integrations “Not supported yet,” with their actual research status.