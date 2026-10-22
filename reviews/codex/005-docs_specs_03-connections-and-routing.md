1. **[high] CLI execution has no enforceable permission boundary.**  
   **Reference:** §The approach: “launches each provider’s official client in non-interactive mode.”
   
   **Why it matters:** Using an official client establishes authentication, but does not establish which files, tools, shell commands, or network actions it may use. The spec never explains how these clients obey the approvals promised in `12-security-and-privacy.md`, especially during unattended runs.
   
   **Concrete fix:** Require each adapter to declare and enforce its permission configuration, working-directory restrictions, approval bridge, timeout, and process-tree cancellation. Disable unattended execution where those guarantees cannot be enforced.

2. **[high] Automatic fallback can disclose context to another provider without prior agreement.**  
   **Reference:** §Routing rules: “try the next, and tell the user in the message header.”
   
   **Why it matters:** Chat history can contain attached files and project context (`04-chat.md`). A notice after the answer arrives is too late to control which provider receives that material.
   
   **Concrete fix:** Make cross-provider fallback opt-in per conversation, project, or workflow. Show eligible destinations before execution, enforce context restrictions, and pause when no approved destination remains.

3. **[high] The subscription-only promise includes routes that have not been shown to meet it.**  
   **Reference:** §Goal: “no per-token API billing”; provider table: “official API if one is bundled,” “browser-session adapter,” and “Portal login or key.”
   
   **Why it matters:** The table mixes confirmed intentions with unresolved authentication and billing paths. A browser adapter also sits outside the stated official-client subprocess approach, while key-based authentication conflicts with the credential arrangement described in `12-security-and-privacy.md`.
   
   **Concrete fix:** Separate committed subscription adapters from research candidates. Gate each candidate on documented entitlement, billing behavior, authentication ownership, and permitted automation. Keep unverified routes out of routing defaults; any paid route needs explicit setup and spend approval.

4. **[high] The mandatory usage guard depends on telemetry the spec explicitly allows to be missing.**  
   **Reference:** §Connection states: usage is shown “only where the provider exposes it”; §Usage budget: jobs yield above a weekly threshold of 80%.
   
   **Why it matters:** Local run counts cannot reveal capacity consumed through manual use. Without an unknown/stale policy, the scheduler cannot reliably honor the promised reserve.
   
   **Concrete fix:** Define quota observations with source, measurement window, timestamp, and freshness. When reliable quota data is absent, use an explicitly labeled local automation allowance and configurable pause policy. Never present run counts as remaining subscription capacity.

5. **[high] Fallback and retry lack a boundary that prevents duplicate actions.**  
   **Reference:** §Routing rules: fallback on `rate_limited`; §Open questions: concurrency “probably 1–2 parallel runs.”
   
   **Why it matters:** The doc does not distinguish rejection before execution from failure after streaming or tool execution begins. Combined with workflow retries in `05-tasks-and-workflows.md`, an ambiguous failure could repeat writes or external actions.
   
   **Concrete fix:** Permit automatic fallback only before output or side effects begin. After execution starts, preserve partial output and require an explicit recovery decision. Define bounded attempts, cooldowns, shared provider concurrency limits, and durable action deduplication.

6. **[med] Disconnect does not define what actually stops.**  
   **Reference:** §Connection states: “Disconnect removes only JunOS’s reference, never the CLI’s login.”
   
   **Why it matters:** Capability probing could rediscover the still-authenticated client. The spec also leaves queued jobs, active runs, and routing references unresolved. “Disconnect” therefore promises more control than its behavior establishes.
   
   **Concrete fix:** Persist a JunOS-disabled state that probing cannot override. Immediately exclude the connection from new runs, explain affected schedules and routes, and define treatment of active runs. Label the action “Disable in JunOS,” with a separate explanation of CLI sign-out.

7. **[med] Connection states cannot be represented by the current adapter contract.**  
   **Reference:** §Connection states: `connected`, `needs_login`, `rate_limited`, `unavailable`, `degraded`.
   
   **Why it matters:** `01-architecture.md` exposes only `connected: boolean` plus an optional error. Authentication, service health, and rate limits can also overlap. “Degraded” has no defined consequence or recovery action.
   
   **Concrete fix:** Specify a shared status contract covering enabled state, authentication, availability, quota/reset information, last check, and actionable error codes. Define initial checking, stale observations, refresh behavior, and which conditions permit execution.

8. **[med] Routing precedence and budget accounting are unspecified.**  
   **Reference:** §Routing rules: default model, fallback order, task/workflow overrides, `maxRunsPerDay`, `preferCheapModel`.
   
   **Why it matters:** A workflow step can name a model, its launcher can override it, and routing can replace it again. The spec never resolves those choices or defines whether retries, fallback attempts, and workflow steps count toward the daily limit. “Cheap” also lacks a defined meaning for subscriptions.
   
   **Concrete fix:** Declare precedence explicitly and show the resolved route before running. Count execution attempts against a named scope and timezone. Replace `preferCheapModel` with a measurable policy such as a user-ranked model order or documented capacity preference.

9. **[med] The effort scale implies equivalence that the mapping does not establish.**  
   **Reference:** §Effort mapping: “else prompt-budget tiers” and “nearest equivalent.”
   
   **Why it matters:** A prompt instruction, output budget, and native reasoning setting represent different controls. Fallback can also land on a model that does not support the requested effort. `models()` validates individual combinations without defining that transition.
   
   **Concrete fix:** Distinguish native effort from approximations, describe each approximation, and record requested versus effective settings. Validate every fallback candidate; require an explicit policy before reducing effort or changing capabilities.

10. **[med] First-time connection and recovery journeys are missing.**  
    **Reference:** §Connection states specifies Reconnect/Disconnect and an “exact CLI command to run.”
    
    **Why it matters:** There is no installation, first sign-in, account verification, cancellation, or post-login recheck flow. A CLI command also needs to identify the machine and terminal where it runs, particularly with later phone access. The current `Connections.tsx` contains only disabled “Connect (soon)” buttons.
    
    **Concrete fix:** Define Install → Sign in → Check connection → Ready, with provider-specific instructions, copyable commands, explicit daemon-machine context, a “Check again” action, and recovery for unsupported versions or failed probes.

11. **[med] The screen specification provides a field inventory without a visual hierarchy.**  
    **Reference:** §Connection states: plan, method, meter, reset, models, Reconnect/Disconnect.
    
    **Why it matters:** The existing screen and Stitch prompt use repeated provider cards. Adding every listed field at equal prominence would make connection problems compete with plan metadata, model chips, and repeated buttons. The spec gives no spacing or typography guidance for this denser content.
    
    **Concrete fix:** Specify an operational hierarchy: provider name, usable state, and recovery action first; quota and freshness second; plan, method, and models in expandable details. Define aligned rows or balanced cards, consistent padding, a restrained type scale, and tabular usage figures. Keep the approved glass direction, with quiet surfaces and color reserved for meaningful states.

12. **[med] Drag-only ordering and speculative “coming” cards weaken usability.**  
    **Reference:** §Routing rules: “drag to reorder”; §Open questions: keep Grok as “coming.”
    
    **Why it matters:** Dragging has no specified keyboard or touch alternative, despite the keyboard-first requirement in `14-ui-system.md`. An unconfirmed provider occupying an equal card adds visual noise and implies a delivery commitment.
    
    **Concrete fix:** Provide labeled Move up/Move down controls, announced position changes, and defined save feedback. Put unsupported providers in a secondary availability section labeled “Not supported”; reserve the main connection list for actionable integrations.