1. **[high] Official CLI execution has no defined approval boundary.**  
   **Reference:** §“The approach,” line 7: “the daemon launches each provider’s official client in non-interactive mode.”  
   **Why it matters:** Launching a signed-in client does not establish how JunOS constrains its file, shell or network tools. The adapter could execute actions before JunOS can apply the approvals promised in `12-security-and-privacy.md`, §§Approval policy and Prompt injection.  
   **Concrete fix:** Require each adapter to declare and enforce its sandbox, allowed tools, working directory and approval mechanism. Disable autonomous execution when an adapter cannot enforce JunOS policy; never resolve non-interactive approval problems by bypassing permissions.

2. **[high] Fallback can disclose context to another provider without prior authorization.**  
   **Reference:** §“Routing rules,” line 35: “try the next, and tell the user in the message header.”  
   **Why it matters:** The notification arrives after another provider has received the conversation and potentially attached files. Selecting Codex does not necessarily authorize sending that material to Claude or another service.  
   **Concrete fix:** Define an explicit allowlist of fallback providers per conversation, project or workflow, including permitted attachment/context scope. Show the effective route before sending; pause if no authorized fallback remains.

3. **[high] Fallback and retries have no boundary against duplicate actions.**  
   **Reference:** §“Routing rules,” line 35; cross-check `05-tasks-and-workflows.md`, which also specifies retries.  
   **Why it matters:** A provider can become rate-limited after emitting partial output or executing a tool. Replaying the request through another provider could duplicate writes or external actions.  
   **Concrete fix:** Allow automatic fallback only before output or side effects begin, unless the operation is demonstrably safe to replay. Record attempts under one logical run, bound retries, and require review when execution outcome is uncertain.

4. **[med] The budget guarantee depends on telemetry the document explicitly says may be unavailable.**  
   **Reference:** Line 24 permits “local run counts and last 429”; line 40 requires yielding above a weekly meter threshold of 80%.  
   **Why it matters:** Local counts cannot reveal usage from Jonas’s manual sessions. The scheduler has no defined behavior when the weekly meter is missing, stale or measured over another window. Concurrent jobs could also pass the same check together.  
   **Concrete fix:** Define known, stale and unknown quota states, with measurement window and freshness. For unknown capacity, use an explicit conservative background-run allowance rather than an invented percentage. Reserve capacity atomically and specify cooldown/resume behavior.

5. **[med] Proposed integration paths contradict the subscription-only, official-client contract.**  
   **Reference:** Lines 4–7 promise no per-token billing and official clients; lines 14–15 propose a browser-session adapter, an API endpoint/key and local models.  
   **Why it matters:** These are different authentication, billing and execution models. An OpenAI-compatible endpoint alone does not establish subscription entitlement, and a browser adapter falls outside the stated subprocess approach.  
   **Concrete fix:** Separate verified subscription adapters from research candidates and optional API/local modes. Require evidence of entitlement, billing behavior and supported authentication before enabling a candidate. Align the verification milestone with the Phase 0 spikes in `13-roadmap.md`.

6. **[med] Disconnect and recovery states do not define operational behavior.**  
   **Reference:** Lines 22–24 list connection states and say Disconnect “removes only JunOS’s reference.”  
   **Why it matters:** It is unclear whether queued jobs, fallback routing or capability probes can immediately reuse the still-authenticated CLI. Initial setup, reconnecting, failed probes and unknown reset times also lack explicit behavior.  
   **Concrete fix:** Add a persisted JunOS-enabled flag separate from authentication health. Disconnect must exclude the provider from future dispatch and define treatment of queued/running jobs. Specify state transitions, state-appropriate actions, first-connect instructions and an explicit “reset time unavailable” presentation.

7. **[med] Routing precedence and capability compatibility are unspecified.**  
   **Reference:** Lines 34–37 list defaults, fallback order and overrides without resolution rules.  
   **Why it matters:** A workflow step, workflow override and default can disagree. A fallback may lack the requested effort, attachments or tools. `preferCheapModel` also has no defined meaning under subscription caps.  
   **Concrete fix:** Specify one precedence order and resolve it to an effective route before dispatch. Filter candidates by required capabilities and privacy permissions; pause when none qualifies. Define “cheap” using an explicit capacity policy or replace it with a concrete preferred model.

8. **[med] “Effort” conflates native reasoning controls with prompt instructions.**  
   **Reference:** Lines 27–31: Claude may use “prompt-budget tiers”; other providers use the “nearest equivalent.”  
   **Why it matters:** A prompt requesting more thought is not a guaranteed reasoning-budget control. Identical Low/Medium/High/Max labels can imply equivalence the adapters cannot provide.  
   **Concrete fix:** Distinguish native, approximate and unsupported mappings. Record the actual setting sent, label approximations clearly, and disable unsupported levels rather than silently substituting a prompt.

9. **[med] The Connections screen has an inventory of fields but no hierarchy or density contract.**  
   **Reference:** Line 24 combines plan, method, quota, reset time, models and connection actions.  
   **Why it matters:** Long model lists and diagnostics can overwhelm connection health and recovery actions. The peer-card treatment in `docs/design/stitch-prompts.md` does not resolve this information hierarchy.  
   **Concrete fix:** Define a compact summary: provider identity, textual status, labelled quota/reset and one state-appropriate action. Disclose models and diagnostics progressively; demote Disconnect. Specify readable type, consistent spacing and narrow-screen stacking—for example, 16px provider names, 14px status/data and 12px secondary metadata.

10. **[med] Fallback ordering specifies dragging without a keyboard alternative.**  
    **Reference:** Line 35: “Fallback order (drag to reorder).”  
    **Why it matters:** No alternative is specified for a consequential setting, despite `14-ui-system.md` requiring keyboard-first interaction.  
    **Concrete fix:** Provide labelled Move up/Move down buttons alongside dragging, retain focus after movement, announce the new position, disable boundary actions and use at least 44px touch targets.

11. **[med] Glass execution lacks screen-specific contrast and motion acceptance criteria.**  
    **Reference:** Lines 22–24 introduce status indicators, meters and recovery controls; the material safeguards live only in `14-ui-system.md`.  
    **Why it matters:** These operational signals must remain readable over atmospheric glow, in expanded error states and during updates. The spec does not say how to verify them or prevent distracting meter/status animation.  
    **Concrete fix:** Require 4.5:1 text contrast and 3:1 essential control/indicator contrast against the brightest permitted composited backdrop. Keep status meaning textual, avoid continuous pulsing, and specify reduced-motion and opaque high-contrast fallbacks. An optional sky-blue accent, `#67B7FF`, gives **9.12:1** against `#0B0C0F` and stays distinct from the teal success signal; use dark text on filled accent controls and verify glass combinations separately.