1. **[high] Fallback changes who receives private context without prior authorization.**  
   **Reference:** Routing rules, line 35: “try the next, and tell the user in the message header.”  
   **Why it matters:** The notice arrives after transmission. A conversation or attached project intended for one provider could reach another. File attachment consent in `11-files-and-projects.md` does not define consent to additional recipients.  
   **Fix:** Require an explicit provider allowlist per conversation/project/workflow. Show the permitted fallback destinations before sending; pause if none qualifies. Record the actual recipient and reason in the run.

2. **[high] Official-client execution has no defined approval boundary.**  
   **Reference:** The approach, line 7: the daemon launches official clients using their existing sign-ins.  
   **Why it matters:** This establishes authentication, but does not establish control over the client’s own tools, project instructions, filesystem access or external actions. The approval guarantees in `12-security-and-privacy.md` are incomplete unless adapters enforce them.  
   **Fix:** Specify a tool-disabled default for chat and explicit permission configurations for agent runs. Require adapters to demonstrate that native actions obey JunOS approvals and cancellation; block tool-enabled execution where this cannot be enforced.

3. **[high] The subscription-only promise conflicts with proposed connection methods.**  
   **Reference:** Goal, line 4: “no per-token API billing”; provider table, lines 14–15: “official API if one is bundled,” “browser-session adapter,” and “Portal login or key.”  
   **Why it matters:** The document treats unverified alternatives as part of one approach, although they do not establish subscription coverage or compliance with the official-client constraint. Phase 1 feasibility verification is also later than the Phase 0 spikes required by `13-roadmap.md`.  
   **Fix:** Limit initial delivery to verified subscription-backed adapters. Label the remaining routes experimental and disabled. Make explicit billing eligibility and compatibility with the no-token-extraction rule release gates; resolve them in Phase 0.

4. **[high] Budget enforcement depends on telemetry the spec explicitly allows to be unavailable.**  
   **Reference:** Line 24 permits local run counts when usage is unavailable; line 40 requires yielding above 80% of the weekly meter.  
   **Why it matters:** Local counts cannot establish remaining shared subscription capacity, especially after manual use outside JunOS. The scheduler has no defined behavior for unknown, stale or differently scoped limits.  
   **Fix:** Define usage source, window, freshness and unknown states. Apply the percentage threshold only to valid provider telemetry. For unknown capacity, use an explicitly configured local allowance or pause background work; never represent run counts as subscription percentages.

5. **[high] Retry and fallback can duplicate work after partial execution.**  
   **Reference:** Routing rules, line 35; concurrency remains an open question at line 44.  
   **Why it matters:** The spec does not distinguish rejection before execution from failure after streaming or tool execution. Combined with workflow retries in `05-tasks-and-workflows.md`, another attempt could repeat side effects or consume multiple providers’ allowances.  
   **Fix:** Allow automatic fallback only after a confirmed pre-execution rejection. Preserve partial results and require explicit recovery after execution starts. Define bounded attempts, per-provider queues, cancellation behavior and side-effect reconciliation.

6. **[med] Disconnect has no durable meaning for routing.**  
   **Reference:** Line 24: “Disconnect removes only JunOS’s reference, never the CLI’s login”; line 17 automatically probes installed clients.  
   **Why it matters:** A probe could rediscover a deliberately disconnected provider. The document also leaves queued jobs, active runs and saved routing references unresolved.  
   **Fix:** Persist a JunOS-disabled flag independent of CLI authentication. Exclude disabled connections from routing until explicitly enabled, and specify what happens to queued and active runs. Explain beside the action that the CLI remains signed in.

7. **[med] Route precedence and compatibility are undefined.**  
   **Reference:** Lines 34–37 list defaults, fallback and overrides; line 31 validates effort combinations only.  
   **Why it matters:** `04-chat.md` also remembers a model per conversation, while the data model includes agent routing rules. There is no resolution order, and a fallback may lack required tools, attachments, context capacity or output capabilities.  
   **Fix:** Define one precedence order covering explicit run choice, conversation/task/workflow/agent settings and global defaults. Validate every candidate against the request’s capabilities and privacy constraints. Show the effective route and reject incompatible candidates with a readable reason.

8. **[med] Effort labels imply equivalence that the mapping does not guarantee.**  
   **Reference:** Lines 27–30: “Low / Medium / High / Max,” with “prompt-budget tiers” as a fallback.  
   **Why it matters:** A prompt instruction and a native reasoning setting are different controls. Presenting both as “High” can imply comparable behavior or capacity use. `preferCheapModel` is similarly ambiguous when no price or quota-cost measure is available.  
   **Fix:** Distinguish native effort from prompt-based guidance in the picker and run record. Define each supported mapping explicitly, disable unsupported values, and replace “cheap” with a named preference such as “prefer configured lightweight model.”

9. **[med] Connection states do not define a complete recovery flow.**  
   **Reference:** Lines 22–24 enumerate states and Reconnect/Disconnect actions.  
   **Why it matters:** There is no initial “not configured,” intentional “disabled,” checking or reconnecting state. `degraded` has no actionable meaning, and reset times may be unknown. The boolean adapter status in `01-architecture.md` cannot directly express the specified states.  
   **Fix:** Add a state/action table with transition rules, status freshness and typed failure reasons. Provide state-specific actions: installation help, copy login command, recheck, retry or enable. Keep technical codes such as “429” in expandable details.

10. **[med] The Connections screen has content requirements but no hierarchy or density contract.**  
    **Reference:** Line 24 packs plan, method, usage, reset, models and two actions into each provider; the Connections prompt in `docs/design/stitch-prompts.md` renders these as five peer cards.  
    **Why it matters:** Troubleshooting competes with metadata and model chips, while varying model lists can produce uneven panels. Nothing specifies which action should dominate or how content adapts to narrow screens.  
    **Fix:** Lead each glass panel with provider, readable state and one contextual action. Put usage and freshness next, with method and model details progressively disclosed. Define a compact type scale—for example 24/16/14/12px—consistent padding and gaps, wrapping rules and a single-column mobile layout. Keep Disconnect visually secondary.

11. **[med] Routing configuration is drag-dependent and has no save or feedback model.**  
    **Reference:** Line 35: “Fallback order (drag to reorder).”  
    **Why it matters:** The shared UI spec requires keyboard-first interaction, but this document supplies no alternative. It also leaves users uncertain whether reordering applies immediately or whether a failed save restores the previous order.  
    **Fix:** Provide Move up/Move down controls with keyboard support, retained focus and announced position changes. Choose explicit Save or autosave with pending/saved/error feedback. Preview the resulting route and show how it behaves when every candidate is unavailable.

12. **[med] Glass accessibility requirements are not translated into testable Connections states.**  
    **Reference:** Connection states and screen content, lines 22–24; shared glass rules in `14-ui-system.md`, line 22.  
    **Why it matters:** The shared spec already requires contrast, reduced motion and an opaque fallback, but this screen adds small reset labels, usage tracks, disabled models and changing statuses without defining their treatment. Checking text against the base background alone would miss composited glow and panel states.  
    **Fix:** Require state fixtures over the brightest permitted backdrop and in opaque/high-contrast modes. Specify at least 4.5:1 for normal text and 3:1 for meaningful control/state boundaries, with text labels alongside status colours. Keep usage numerals stable with tabular figures; use brief state transitions and static reduced-motion equivalents.