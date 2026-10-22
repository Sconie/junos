1. **[high] Approval enforcement has no defined boundary.**  
   **Reference:** §Approval policy, lines 17–28; §Open questions, line 38.  
   **Why it matters:** The daemon launches official CLIs (01/03), while Hermes can execute shell, browser, file and API steps (06). Nothing requires these executors to stop *before* an action so JunOS can authorize it. Observing a tool call afterward cannot enforce “always ask.” Deferring sandboxing until Phase 4 leaves earlier automation dependent on unspecified cooperation.  
   **Concrete fix:** Require every executor to support a pre-execution authorization hook or enforced capability restrictions. Disable unsupported capabilities. Make those controls a prerequisite for enabling automation, with denial, bypass and cancellation acceptance tests.

2. **[high] The approval rules contradict the autonomy modes.**  
   **Quote:** “external-send … always ask”; “Approve and remember” creates an “action pattern” rule.  
   **Why it matters:** Spec 06 also defines Autonomous as “log only” and Balanced as asking for shell/network/mail. This document allows automatic search and does not explain whether remembered rules override “always ask.” Identical actions could receive different treatment depending on the executor.  
   **Concrete fix:** Add one authoritative precedence table covering autonomy level, action class and remembered grants. Define which classes permit standing authorization, their expiry and scope, and how compound actions receive the strictest applicable classification.

3. **[high] Automatic local writes can become an execution or exfiltration bypass.**  
   **Quote:** “write-local … auto in Balanced”; untrusted content is “wrapped as data.”  
   **Why it matters:** Editing an allowlisted project can change executable scripts, agent instructions, workflow definitions or hooks. A branch/worktree does not prevent those files from later executing. Likewise, search or network reads can transmit private content even without an API write. Wrapping content does not establish a security boundary.  
   **Concrete fix:** Distinguish ordinary document edits from executable/configuration changes; protect policy files and agent instructions. Classify outbound requests by destination and transmitted data. Require explicit authorization for sensitive egress, including search queries derived from private content.

4. **[high] Approval is not bound to an immutable action.**  
   **Quote:** “Inbox items showing the exact command/diff.”  
   **Why it matters:** The spec does not bind approval to arguments, working directory, recipient, payload or file version. A queued action could change after review, and retries or duplicate clicks could repeat an external effect. Spec 07’s generic Inbox action endpoint does not supply these guarantees.  
   **Concrete fix:** Store a single-use approval bound to a normalized action digest and relevant preconditions. Revalidate immediately before execution; invalidate changed or expired requests. Define atomic resolution, restart behavior and idempotency for retries.

5. **[high] The daemon credential and pairing lifecycle is incomplete.**  
   **Quote:** “stored in `~/.junos/token` (mode 600)”; “one-time pairing URL”; “Any JunOS-owned secret … goes in the OS keychain.”  
   **Why it matters:** The token file conflicts with the blanket keychain requirement. Unix mode notation leaves Windows protection undefined, and pairing does not specify expiration, replay prevention, browser storage or rotation. “Another local process” is named as a threat without distinguishing another OS user from a process running as Jonas.  
   **Concrete fix:** Explicitly document the token-storage exception or use protected OS storage. Specify Windows ACLs, pairing expiry and single use, removal of pairing material from browser history, session handling and token revocation. State the limits of protection against same-user processes.

6. **[high] Privacy stops at secret-pattern redaction.**  
   **Reference:** §Credentials, lines 12–14; §Data safety, lines 31–34.  
   **Why it matters:** Spec 02 persists messages, thinking, tool inputs/outputs, memory and events; spec 11 adds file text and embeddings. These can contain private material that matches no secret pattern. Spec 03’s fallback routing and spec 04’s history replay can also send that material to another provider without a defined privacy decision.  
   **Concrete fix:** Add a data-flow and retention table covering local stores, provider transfers, indexes, exports and backups. Define provider/fallback consent, deletion propagation and notification-preview defaults. Apply redaction before persistence and export, while acknowledging its limits.

7. **[high] Untrusted content has no rendering-security contract.**  
   **Reference:** §Prompt injection, line 28.  
   **Why it matters:** The section addresses model instructions but omits the browser boundary. Specs 04/11 require Markdown, image and PDF rendering. Untrusted output can contain unsafe links, active markup or remote images that disclose viewing activity; script execution in the privileged UI could expose daemon access.  
   **Concrete fix:** Require a shared safe-rendering policy: disable or sanitize raw HTML, restrict URL schemes, gate remote resources, isolate document previews and define a restrictive content policy. Keep agent-authored explanations visually distinct from daemon-generated authorization details.

8. **[med] The kill switch promises more than its semantics establish.**  
   **Quote:** “Kill switch in the UI stops all agent runs.”  
   **Why it matters:** Spec 06 describes stopping the current Hermes step and pausing its queue. This document does not cover workflow subprocesses, scheduler triggers, retries, disconnected bridges or daemon restart. A stopped run could be replaced immediately by another queued run.  
   **Concrete fix:** Define a daemon-wide, persistent stop latch that blocks new execution, cancels pending approvals and terminates supported process trees. Require explicit resume. Show acknowledged stopping, stopped and unreachable states, including actions whose external effects cannot be recalled.

9. **[med] The backup reference does not establish recoverability.**  
   **Quote:** “Nightly DB backup (02).”  
   **Why it matters:** Spec 01 proposes SQLite WAL; spec 02 specifies a nightly copy of `junos.db`. A bare file-copy requirement does not establish a consistent live backup. Backups also retain sensitive data and may omit referenced run outputs or attachments.  
   **Concrete fix:** Require a supported consistent snapshot method, document which associated files are included, protect backup access and define restore verification. State the recovery-point limit and distinguish database recovery from recovery of edited project files.

10. **[med] Approval UI lacks the hierarchy needed for informed consent.**  
    **Quote:** “showing the exact command/diff.”  
    **Why it matters:** A command alone does not explain consequences. Spec 10 allows inline Home approvals, while spec 07 provides an `a` shortcut. Neither guarantees that destination, payload or destructive impact is visible before authorization. Exact diffs can also expose secrets.  
    **Concrete fix:** Require a shared review surface ordered as **action and consequence → project/destination → affected data → technical evidence**. Separate “Approve once” from standing permission, provide a clear Deny action, and prevent shortcuts from authorizing an unreviewed item. Redact secrets without concealing the scope of disclosure.

11. **[med] Security-critical surfaces inherit styling without a specific readability contract.**  
    **Reference:** §Approval policy, line 25; §Data safety, line 33.  
    **Why it matters:** Spec 14 supplies general glass styling and accessibility rules, but this document never defines how approvals, rule management or emergency controls remain legible. Generic status pills, equal-weight cards and muted technical text could obscure the decision. This is a specification gap; the current Hermes screen is a placeholder, so rendered defects cannot yet be established.  
    **Concrete fix:** Specify a quiet, high-contrast approval surface within the chosen visual direction: plain-language summary in UI type, selectable monospace commands/diffs, consistent spacing between consequence and evidence, wrapping for long destinations, and persistent actions on narrow screens. Reserve warning emphasis for actual risk; require keyboard, zoom and long-content checks.

12. **[med] “Anything that costs money” has no executable definition.**  
    **Quote:** “spend … anything that costs money … always ask.”  
    **Why it matters:** The architecture depends on paid subscriptions, and spec 03 contemplates a Portal key or API path. The policy does not distinguish consuming included capacity from creating a new charge, nor say what happens when cost is unknown. Unattended workflows therefore lack a predictable rule.  
    **Concrete fix:** Define spend as incremental financial commitment, identify which adapters can incur it, and block unknown billing modes by default. If budget authorization is supported, bind it to a provider, maximum amount and expiry; manage subscription capacity separately.