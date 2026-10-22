1. **[high] Automatic fallback lacks consent for a new data recipient.**  
   **Reference:** [Routing rules, line 35](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:35): “try the next, and tell the user in the message header.”  
   **Why it matters:** Notification after execution comes after conversation history, attachments, or project context may have reached another provider. Choosing a model does not clearly authorize every provider in a fallback chain.  
   **Concrete fix:** Require an explicitly approved provider allowlist per conversation/task/workflow before dispatch. Show the effective route before sending; pause when fallback would cross that boundary. Record the recipient and reason for each attempt.

2. **[high] Official agent clients have no defined enforcement boundary.**  
   **Reference:** [The approach, line 7](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:7): the daemon launches official clients using existing sign-ins.  
   **Why it matters:** Authentication does not establish which files, native tools, shell commands, or existing client permissions a run can use. The approval policy in `12-security-and-privacy.md` needs enforcement inside each adapter; daemon tool toggles alone cannot establish that.  
   **Concrete fix:** Require adapters to declare and verify sandbox, working-directory, tool-access, and approval capabilities. Launch with explicit arguments and permissions. Block unattended runs when the adapter cannot enforce JunOS’s policy, and verify cancellation terminates child processes.

3. **[high] The subscription-only promise conflicts with the proposed connection methods.**  
   **Reference:** [Goal and provider table, lines 4–15](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:4): “no per-token API billing,” alongside “official API,” “browser-session adapter,” and “Portal login or key.”  
   **Why it matters:** These routes do not establish the same billing or credential guarantees. A browser adapter also falls outside the stated official-client-only approach, while a Portal key needs a storage policy that reconciles with spec 12.  
   **Concrete fix:** Make Claude/Codex the initial subscription-only scope, subject to spike verification. Gate other adapters on documented entitlement, billing, authentication, and automation support. Any paid API mode must be explicit, separately authorized, and excluded from automatic subscription fallback.

4. **[high] The budget safeguard depends on telemetry the spec explicitly permits to be unavailable.**  
   **Reference:** [Connection display, line 24](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:24) permits local counts instead of provider usage; [Usage budget, line 40](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:40) requires yielding above 80% of a weekly meter.  
   **Why it matters:** Local runs cannot measure shared consumption from manual client use. Unknown or stale usage could therefore bypass the advertised safeguard. `preferCheapModel` also has no defined meaning for subscription capacity.  
   **Concrete fix:** Represent usage as reported, estimated, stale, or unknown, with its actual window and timestamp. Define a conservative policy for unknown usage, plus local attempt/concurrency limits. Reserve capacity before dispatch, count retries and fallbacks, and define when paused work resumes. Never present local counts as a subscription percentage.

5. **[high] Fallback has no boundary for partial output or completed side effects.**  
   **Reference:** [Routing rules, line 35](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:35): fallback when a provider becomes `rate_limited` or `needs_login`.  
   **Why it matters:** The document does not restrict fallback to failures before execution. A client could emit output or perform a tool action before failing; restarting elsewhere could duplicate actions, especially alongside workflow retries in spec 05.  
   **Concrete fix:** Permit automatic fallback only for failures confirmed to occur before execution. After output or tool activity begins, preserve the attempt and require explicit resume/retry semantics. Bound attempts, prevent routing cycles, and link all attempts to one logical run.

6. **[med] Disconnect cannot be reliably distinguished from failed authentication.**  
   **Reference:** [Connection states and actions, lines 22–24](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:22): Disconnect removes JunOS’s reference while CLI login remains.  
   **Why it matters:** There is no explicit disabled/disconnected state. A subsequent probe could rediscover the signed-in CLI and restore eligibility. The architecture’s `status()` interface exposes only `connected: boolean`, which also cannot distinguish the listed states.  
   **Concrete fix:** Persist JunOS enablement separately from authentication and health. Define disconnect behavior for queued and active runs; exclude disabled connections from probing-driven reactivation and routing. Show “Disabled in JunOS; CLI remains signed in.”

7. **[med] Connection recovery is incomplete for first-time setup and uncertain status.**  
   **Reference:** [Connection states, lines 22–24](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:22): `needs_login` assumes expiration; `unavailable` means a missing CLI; `degraded` is undefined.  
   **Why it matters:** Missing installation, first login, unsupported version, failed probe, and temporary outage need different actions. Reset times and plan names may also be unknown. The current source is only a placeholder, so it supplies no established recovery behavior.  
   **Concrete fix:** Add a state/action matrix covering checking, disabled, installation required, login required, ready, limited, and probe failure. Specify safe installation/login guidance, copy-command affordances, recheck behavior, freshness, and unknown reset-time copy. Use platform-aware executable discovery rather than prescribing `which` universally.

8. **[med] Routing precedence and capability compatibility are undefined.**  
   **Reference:** [Routing rules, lines 34–37](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:34): default model, fallback order, task/workflow overrides.  
   **Why it matters:** Spec 04 also remembers a conversation’s model; spec 05 allows workflow-step models. The router has no rule for resolving these choices or deciding whether a fallback supports the required tools, attachments, context, and effort.  
   **Concrete fix:** Define one precedence order and whether explicit selections permit fallback. Store ordered provider/model targets with capability requirements. Show the effective route and its source before execution; pause when no compatible target exists.

9. **[med] Effort mapping permits an unlabeled change in meaning.**  
   **Reference:** [Effort mapping, lines 27–31](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:27): “prompt-budget tiers” and “nearest equivalent.”  
   **Why it matters:** A prompt instruction or budget tier is not established here as equivalent to a native reasoning setting. A shared “High” label could imply comparable behavior that the adapters cannot guarantee.  
   **Concrete fix:** Return native supported values and an explicit mapping type: native, approximate, or unsupported. Label approximations, record the actual setting sent, and define what happens when fallback cannot preserve the requested effort.

10. **[med] The screen’s field inventory lacks hierarchy and density rules.**  
    **Reference:** [Connections screen, line 24](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:24): plan, method, meter, reset, models, Reconnect, Disconnect.  
    **Why it matters:** Expanding every field across the existing five-card grid would give model chips and metadata substantial visual weight while actionable failures compete for attention. Neither this paragraph nor the shared UI spec defines the screen’s reading order.  
    **Concrete fix:** Lead with provider identity, readiness, and the relevant recovery action. Follow with usage/reset information; disclose model lists and diagnostics on demand. Specify aligned content bands, approximately 20–24 px panel padding, 14–16 px body text, and tabular usage figures. Collapse to one column on narrow screens, with routing defaults still easy to reach.

11. **[med] Drag-only routing and terminal-only recovery leave interaction gaps.**  
    **Reference:** [Routing rules, line 35](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:35): “drag to reorder”; [Connection states, line 22](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:22): show the CLI command.  
    **Why it matters:** The spec supplies no keyboard or single-pointer alternative to dragging, despite spec 14’s keyboard-first requirement. It also omits focus and recovery behavior after leaving the app to sign in.  
    **Concrete fix:** Add Move up/Move down controls, accessible position announcements, visible focus, and touch-sized targets. Provide Copy command and Recheck connection actions; retain focus and expand the relevant provider’s instructions after a failed check.

12. **[med] Glass execution has no screen-specific acceptance criteria.**  
    **Reference:** [Connection states and usage display, lines 22–24](/E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:22), inheriting the glass system from spec 14.  
    **Why it matters:** Spec 14 establishes text contrast and general fallbacks, but this screen adds small metadata, usage tracks, status badges, disabled controls, and changing values. Their legibility and motion behavior remain unspecified. This is an execution gap; the glass direction itself is settled.  
    **Concrete fix:** Require 4.5:1 text contrast over the brightest composited atmosphere and 3:1 for essential control/progress boundaries. Pair status colors with text, label meters with values and windows, and keep unavailable data readable. Specify static loading indicators, no ambient status pulsing under reduced motion, and an opaque high-contrast mode that preserves the same hierarchy. Validate these states at narrow widths and 200% zoom.