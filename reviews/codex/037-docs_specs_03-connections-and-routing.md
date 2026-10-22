1. **[high] Official CLI execution does not establish a permission boundary.**  
   **Reference:** §The approach: “launches each provider’s official client … using the sign-in the user already completed.”  
   **Why it matters:** The spec does not constrain inherited tools, project instructions, plugins, environment variables, or CLI permission settings. A subprocess could act outside JunOS’s approval policy in [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md), even though its output is streamed into JunOS.  
   **Concrete fix:** Require each adapter to declare and enforce its effective tool permissions, working directory, configuration sources, and approval mechanism. Start chat adapters without action tools; enable them only after proving that JunOS can gate their execution.

2. **[high] Fallback can disclose context to another provider without prior consent.**  
   **Reference:** §Routing rules: “try the next, and tell the user in the message header.”  
   **Why it matters:** This notice arrives after disclosure. [04-chat.md](docs/specs/04-chat.md) allows attachments and replays conversation history when switching models, so fallback can transfer private history, file content, and system instructions across providers.  
   **Concrete fix:** Make cross-provider fallback explicitly opt-in per conversation or workflow. Show the permitted destinations and context scope before execution. Pause when no approved destination remains, and record each attempted destination.

3. **[high] Fallback lacks a safe boundary after partial execution.**  
   **Reference:** §Routing rules: fallback when a provider becomes `rate_limited` or `needs_login`.  
   **Why it matters:** These failures can occur after output or tool execution has begun. Automatically starting another provider could repeat writes or external actions; task retries in [05-tasks-and-workflows.md](docs/specs/05-tasks-and-workflows.md) compound that risk.  
   **Concrete fix:** Allow automatic fallback only before meaningful execution starts. After partial output or a tool call, preserve the result and require an explicit retry or checkpoint resume. Bound attempts, prevent route cycles, and distinguish logical runs from provider attempts.

4. **[high] The capacity guard depends on telemetry the document explicitly permits to be unavailable.**  
   **Reference:** §Connection states allows “local run counts and last 429”; §Usage budget requires yielding above “80%” of the weekly meter.  
   **Why it matters:** Local counts cannot establish remaining subscription capacity or account for manual use. The budget rule therefore has no defined behavior for some supported connections. Concurrent jobs can also cross a threshold together.  
   **Concrete fix:** Define separate policies for known, stale, and unavailable usage data. Include the measurement window and freshness. For unavailable telemetry, use explicit background-run limits and cooldowns without presenting an estimated percentage as measured capacity. Reserve capacity atomically before launching concurrent jobs.

5. **[high] Subscription-only scope is not an adapter eligibility requirement.**  
   **Reference:** §Goal promises “no per-token API billing”; the provider table permits a Grok API/browser adapter and a Nous “login or key.”  
   **Why it matters:** Those alternatives do not, by themselves, establish subscription entitlement or compliance with the official-client approach. “Official” also does not establish that unattended orchestration is supported. This is unresolved feasibility presented alongside the product promise.  
   **Concrete fix:** Require a documented supported integration path, entitlement, billing behavior, and credential owner before enabling an adapter. Keep paid API modes outside subscription fallback unless separately enabled with a spend policy. Treat browser-session access as a distinct research outcome with its own privacy boundary.

6. **[med] Disconnect has no enforceable routing semantics.**  
   **Reference:** §Connection states: “Disconnect removes only JunOS’s reference, never the CLI’s login.”  
   **Why it matters:** The CLI remains discoverable and authenticated. The next capability probe could reconnect it unless explicit intent is persisted; queued jobs and fallback rules might continue using it. Users may also interpret “Disconnect” as signing out.  
   **Concrete fix:** Persist a JunOS-disabled state that probes cannot override. Define treatment of active runs, queued jobs, and route references. Explain beside the action that the CLI stays signed in, and provide separate sign-out instructions.

7. **[med] Connection states and the adapter contract cannot express the same information.**  
   **Reference:** §Connection states lists five states; [01-architecture.md](docs/specs/01-architecture.md) exposes `status()` primarily as `connected: boolean`.  
   **Why it matters:** The router needs distinctions that the interface does not require. The list also omits intentionally disabled, checking, incompatible-version, and unsupported-integration states. Requiring a reset time assumes one is always known.  
   **Concrete fix:** Specify a shared typed status result with reason, check time, optional retry/reset time, capabilities, and explicit enabled state. Define transitions and recovery actions. Show “reset time unavailable” rather than inventing a countdown.

8. **[med] Routing precedence and capability compatibility are undefined.**  
   **Reference:** §Routing rules lists a default, fallback order, task/workflow overrides, and `preferCheapModel`.  
   **Why it matters:** It is unclear which setting wins, whether an explicit model choice permits substitution, or what “cheap” means under subscription caps. A fallback may lack the required effort, context capacity, attachment support, or tools.  
   **Concrete fix:** Define one precedence order and a capability filter before applying fallback order. Make explicit model choices either strict or visibly substitution-enabled. Replace `preferCheapModel` with a defined selection policy based on verified capabilities and available quota information.

9. **[med] Prompt instructions are presented as equivalent to native effort controls.**  
   **Reference:** §Effort mapping: “thinking/effort level flags where supported, else prompt-budget tiers.”  
   **Why it matters:** A prompt requesting more reasoning does not establish the same behavior or resource control as a native setting. The UI can claim “Max” even when no corresponding control was applied. This weakens [04-chat.md](docs/specs/04-chat.md)’s requirement that effort changes be visible in the run record.  
   **Concrete fix:** Offer only verified native effort values for each model/version. Treat prompt verbosity or response-length instructions separately. Record requested and effective effort, and define what happens when fallback cannot honor the requested value.

10. **[med] Provider information has no hierarchy or density contract.**  
    **Reference:** §Connection states requires plan, method, usage, reset time, unlocked models, and two actions.  
    **Why it matters:** The linked design prompt places these in five peer cards. Long model-chip lists can dominate the screen and push routing controls below them. The current [Connections.tsx](src/pages/Connections.tsx) is only a shell, so it supplies no resolved hierarchy.  
    **Concrete fix:** Specify a compact summary: provider identity, readable status, usage/freshness, and one state-dependent action. Put model inventories and diagnostics behind expansion. Define shared spacing and type roles—for example, 16px panel padding, 8px related-field gaps, 24px section gaps, 14–16px primary text, and 12–13px metadata.

11. **[med] Drag-only ordering and unspecified persistence make routing settings fragile.**  
    **Reference:** §Routing rules: “Fallback order (drag to reorder).”  
    **Why it matters:** No keyboard or single-pointer alternative is defined. The document also does not say when changes take effect or whether a reorder affects active runs. The shared UI spec explicitly expects keyboard behavior in individual specs.  
    **Concrete fix:** Add labelled Move up/Move down buttons, retain focus after movement, and announce the new position. Specify save behavior and confirmation feedback. Apply route changes to future runs; keep an immutable route snapshot for active runs.

12. **[med] Glass accessibility rules exist globally, but this screen lacks execution checks.**  
    **Reference:** §Connection states’ meters, metadata, and actions; [14-ui-system.md](docs/specs/14-ui-system.md), §Tokens.  
    **Why it matters:** The shared spec already requires text contrast and fallbacks. Connections combines small reset labels, muted method text, status marks, meters, and focus indicators over translucent surfaces; those elements need testing against the brightest glow and overlapping-panel states.  
    **Concrete fix:** Add screen acceptance checks for text contrast, meaningful meter/control boundaries, and visible focus over the composited background. Preserve numeric usage and status text in opaque/high-contrast modes. Keep status updates from shifting rows, and disable pulsing, shimmer, and animated meter transitions under reduced motion.

13. **[low] The verification phase contradicts the roadmap.**  
    **Reference:** §The approach says “Phase 1 spike before building”; [13-roadmap.md](docs/specs/13-roadmap.md) schedules provider spikes in Phase 0.  
    **Why it matters:** Phase 1 depends on the adapters and fallback behavior those spikes must validate. The current wording makes the dependency ambiguous.  
    **Concrete fix:** Change this to Phase 0 and define the required spike evidence: supported versions, authentication path, billing mode, streaming/error fixtures, cancellation, permission controls, and available usage telemetry.