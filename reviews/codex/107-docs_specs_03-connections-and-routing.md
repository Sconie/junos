1. **[high] Adapter eligibility does not include enforceable tool restrictions.**  
   **Reference:** §The approach, lines 17–21: “capability probe + runner”: `which`, `status`, version check, then streaming run.  
   **Why it matters:** An authenticated, compatible CLI is not necessarily safe to execute. [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires CLI tools to pass through the gateway, with read-only execution when enforcement is unavailable. The probe described here does not establish either capability.  
   **Concrete fix:** Require each adapter’s validation record to declare gateway interception, sandbox restrictions, cancellation behavior and supported execution mode. Enable tool use only after enforcement tests pass; otherwise expose an explicitly labelled read-only mode.

2. **[high] The subscription-only promise lacks a runtime billing check.**  
   **Reference:** §Goal: “no per-token API billing”; line 19: “‘No API keys’ is a release gate.”  
   **Why it matters:** Absence of JunOS-managed API keys does not establish which account or billing mode a subprocess will use. The spec does not define how inherited environment, client configuration or authentication changes affect eligibility.  
   **Concrete fix:** Make verified subscription authentication and billing mode part of admission and pre-run checks. Specify permitted environment/configuration inputs, reject ambiguous or metered modes, and invalidate eligibility when the account or relevant configuration changes.

3. **[high] Disconnect has no persistent routing prohibition.**  
   **Reference:** Line 26: “Disconnect removes only JunOS’s reference, never the CLI’s login.”  
   **Why it matters:** The CLI remains authenticated, while probing can rediscover it as connected. There is no specified disabled state or rule preventing queued work and fallback from selecting it again. Disconnect therefore has an unclear privacy boundary.  
   **Concrete fix:** Persist an explicit JunOS enablement flag separately from authentication health. Disconnect must exclude the provider from probes that automatically enable routing, new dispatches and fallback. Define treatment of queued and active runs, and explain that CLI sign-in remains intact.

4. **[high] Safe fallback depends on evidence the adapter contract does not provide.**  
   **Reference:** Line 37: fallback is allowed when a run “failed before any tool side effect.”  
   **Why it matters:** After a process crash, timeout or lost stream, missing output cannot prove that no action happened. [01-architecture.md](docs/specs/01-architecture.md) provides generic run events but no authoritative execution outcome for this decision.  
   **Concrete fix:** Define persisted attempt outcomes such as `not_started`, `no_effect_confirmed`, `effect_recorded` and `outcome_unknown`. Use gateway records and confirmed process termination as evidence. Permit automatic fallback only for the first two; require review for unknown outcomes.

5. **[med] Usage limits are policy intentions rather than enforceable budgets.**  
   **Reference:** Lines 39–42: `maxRunsPerDay`, the 80% threshold, local counters and rate-limit reset times; line 46 leaves concurrency open.  
   **Why it matters:** Concurrent jobs can all pass a budget check before their usage is counted. The spec also leaves retries, workflow steps, missing reset times and multiple quota windows undefined. A rate limit without a reset time has no recovery rule.  
   **Concrete fix:** Reserve capacity atomically before dispatch, conservatively starting with one concurrent run per provider. Define what counts as an attempt, which jobs share a budget, quota-window handling and interactive priority. For unknown resets, specify bounded backoff and a controlled probe; show whether usage is provider-reported or locally estimated.

6. **[med] The “single enum used everywhere” conflicts with the adapter interface and conflates independent states.**  
   **Reference:** Lines 23–24 versus `status(): Promise<{ connected: boolean; ... }>` in [01-architecture.md](docs/specs/01-architecture.md).  
   **Why it matters:** The boolean cannot express the required states. A provider can also be authenticated while rate-limited, or support one model while another is unavailable. No precedence or routability rules resolve those combinations.  
   **Concrete fix:** Establish one shared status contract containing authentication, enablement, availability, quota scope, freshness and reason. Derive the displayed badge and routing eligibility consistently from those fields; update the architecture cross-reference accordingly.

7. **[med] One-off provider consent does not define the actual disclosure payload.**  
   **Reference:** Line 37: “‘Send once to \<other provider\>’ … re-submits that single request.”  
   **Why it matters:** “Single request” may sound like the latest prompt, although [04-chat.md](docs/specs/04-chat.md) allows replaying conversation history, attachments and tool results. It is also unclear whether confirmation remains valid if that context changes before dispatch.  
   **Concrete fix:** Specify a confirmation showing the destination provider, model and included context categories, with expandable details. Bind consent to that destination and an immutable context snapshot; changes require fresh confirmation. Record the exception without changing the persistent allowlist.

8. **[med] Effort mapping promises equivalence that the fallback does not establish.**  
   **Reference:** Lines 29–33: Claude uses effort flags “else prompt-budget tiers,” while the UI presents Low / Medium / High / Max.  
   **Why it matters:** A prompt-budget tier does not inherently mean the same thing as native reasoning effort. The model-support declaration could make a simulated setting look like a verified provider capability.  
   **Concrete fix:** Distinguish native effort from prompt hints and output limits in adapter metadata and UI copy. Disable unsupported native effort rather than silently substituting another mechanism. Persist the actual transmitted setting.

9. **[med] The Nous fallback silently introduces a separate deployment scope.**  
   **Reference:** Line 15: “otherwise Hermes models run locally.”  
   **Why it matters:** Local inference needs a runtime, model storage, hardware checks and lifecycle management that this spec does not define. It also blurs Nous Portal authentication with the existing Docker-on-VPS Hermes deployment described in [06-hermes.md](docs/specs/06-hermes.md).  
   **Concrete fix:** Leave Nous Portal unavailable unless its supported route is verified. Treat local inference as a separately scoped adapter with explicit installation consent and requirements. Identify the remote Hermes connection separately from both.

10. **[med] The Connections content inventory has no visual hierarchy or density contract.**  
    **Reference:** Line 26 lists plan, method, usage, reset, models and actions without prioritization.  
    **Why it matters:** The current scaffold uses equal provider cards; expanding each with every listed field risks making unsupported providers and secondary metadata as prominent as actionable failures. The shared glass rules in [14-ui-system.md](docs/specs/14-ui-system.md) do not determine this screen’s composition.  
    **Concrete fix:** Specify provider identity, readable status and the relevant next action as the first row; usage and reset second; model inventories and diagnostics in expandable details. Separate usable connections from research/unavailable entries. Define spacing and type roles—for example, 16px provider names, 14px status/body text, 16px internal padding and 24px between groups—with a single-column narrow layout. Add contrast checks over the brightest permitted glass background and verify opaque and reduced-motion states.

11. **[med] Routing configuration is drag-dependent and has undefined save behavior.**  
    **Reference:** Lines 36–39: default model, fallback order “drag to reorder,” and overrides.  
    **Why it matters:** Dragging alone excludes keyboard operation. There is no specified treatment of unsaved changes, unavailable entries or conflicts between default, task and workflow rules. These settings directly affect where private context goes.  
    **Concrete fix:** Add labelled Move up/Move down controls, keyboard focus retention and reorder announcements. Define override precedence, save/cancel behavior and an effective-route preview. Show excluded providers with their reason instead of silently changing the order.

12. **[low] Grok’s “coming” state contradicts its unsupported status.**  
    **Reference:** Line 14 says “not available”; line 45 says the card stays “coming” while a spike continues. [13-roadmap.md](docs/specs/13-roadmap.md) explicitly defers that spike until a supported route is known.  
    **Why it matters:** “Coming” implies planned delivery and makes an unsupported integration resemble a temporary connection problem.  
    **Concrete fix:** Use “Unavailable — no supported integration” consistently, provide explanatory details instead of a connection action, and remove the claim that a spike is continuing.