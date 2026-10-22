1. **[high] A worktree is treated as a security boundary.**  
   **Reference:** §Execution gateway, “restricted working directory (a git worktree or per-project sandbox user/container)”; §Open questions, “worktree plus deny flags only”.  
   **Why it matters:** These options offer different guarantees. A working directory does not prevent access to other files, inherited credentials or network connections. Calling an unconstrained CLI “read-only” also requires enforcement beyond a UI label. This leaves the central gateway promise conditional on an unresolved mechanism.  
   **Concrete fix:** Require verified filesystem, process and network confinement before enabling an adapter. Record capabilities per adapter/platform; disable unsupported execution. Make this a release gate, rather than deferring effective isolation to later hardening.

2. **[high] Remote requests and human approvals lack separate trust paths.**  
   **Reference:** §Execution gateway, “A compromised Hermes cannot approve itself”; §Hermes on a VPS. Cross-check: 06 exposes an approvals endpoint and mirrors Telegram decisions.  
   **Why it matters:** The spec asserts this property without defining how junosd distinguishes a genuine Jonas decision from a decision forged by the shim or compromised VPS. Numeric Telegram user IDs alone are insufficient if junosd trusts identity assertions supplied by that same bridge.  
   **Concrete fix:** Allow the Hermes bridge to submit action requests only. Accept decisions through the authenticated browser or a JunOS-controlled Telegram integration that independently verifies the sender. Bind decisions to the approval ID and digest, and explicitly reject approval decisions authenticated solely by the Hermes bridge credential.

3. **[high] Stop leaves already-approved actions executable.**  
   **Reference:** §Stop, “revokes pending approvals for that run”.  
   **Why it matters:** An approval can be `approved` but not yet `consumed`. Stop does not revoke that state or explicitly prevent new gateway executions during cancellation. The sequential cancellation steps also leave a race before revocation. “Stop always works” overstates the documented remote guarantee.  
   **Concrete fix:** Atomically mark the affected runs cancelling and invalidate both pending and approved authorizations before issuing cancellation. Require every execution claim to check run state. Define whether Stop affects one run or all runs, and distinguish confirmed local termination from unconfirmed remote cancellation.

4. **[high] The digest binds arguments, but not necessarily the operation Jonas reviewed.**  
   **Reference:** §Execution gateway, action record and “exact command/diff/recipient”.  
   **Why it matters:** Identical arguments can operate on changed files, scripts, symlink targets or repository state. Approving `deploy.ps1` does not bind its contents. Also, a database transaction cannot atomically include an external process start or HTTP side effect; a crash can leave execution uncertain.  
   **Concrete fix:** Bind approvals to immutable payloads, relevant content hashes and target preconditions; revalidate immediately before execution. Specify durable execution claims and recovery states. Treat uncertain execution as requiring reconciliation, never automatically restoring the approval for reuse.

5. **[high] Egress policy does not cover the full meaning of “read”.**  
   **Reference:** §Action classes, “read … search”; §Privacy and data egress; invariant 1.  
   **Why it matters:** A search query or HTTP GET can transmit private context despite being classified as read. Conversely, model requests and remote handoffs transmit data, but the blanket external-send rule would require a fresh approval for every call, potentially blocking the scheduled workflows in 05. The boundary between provider consent and action approval is undefined.  
   **Concrete fix:** Classify data disclosure separately from mutation. Define precisely which model transmissions an allowed-provider setting authorizes, including background jobs and derived context. Require separate approval for other destinations, uploads and messages, regardless of HTTP method.

6. **[high] Prompt-injection protection promises more than the controls enforce.**  
   **Reference:** Invariant 2, “Untrusted content never turns into instructions”; §Untrusted content, tool use disabled “where possible”.  
   **Why it matters:** Wrapping content in prompts cannot establish that guarantee. Balanced mode still permits local writes after reading hostile material, including potentially influential scripts, project instructions or workflow definitions. Those writes can persist an attack until a later trusted execution.  
   **Concrete fix:** Express the enforceable invariant as “untrusted content cannot grant authority”. Keep policy, approval records, credentials and workflow/tool configuration outside agent-writable scopes. Define protected executable/configuration paths and require explicit review for changes that affect later execution.

7. **[med] Deletion lacks a policy for copied and derived content.**  
   **Reference:** §Retention and deletion, “removes its content from … event payloads, run output, FTS and embedding indexes”.  
   **Why it matters:** Content also travels into summaries, attachments, workflow inputs, cards and Hermes volumes. Cross-check: 02 deliberately preserves cards when their source is deleted; 06 uploads copies to the VPS. The current wording can imply broader erasure than the system can deliver. Restoring a backup could also revive deleted content.  
   **Concrete fix:** Define deletion scope and provenance for derivatives. Identify independent copies that remain, disclose remote/provider limitations, and cancel active processing during revocation. Preserve deletion tombstones outside restored snapshots and reapply them before restored data becomes accessible.

8. **[med] The local-process threat exceeds the documented authentication boundary.**  
   **Reference:** §Threat model, “another local process”; §Daemon access, cookie pairing and token file “mode 600”.  
   **Why it matters:** Host/Origin checks address browser-origin threats; they do not authenticate arbitrary native clients. A malicious process running as Jonas may also access same-user files and credentials. POSIX file modes do not specify protection for the Windows service planned in 01.  
   **Concrete fix:** State which local attackers are in scope. Specify Windows ACLs and equivalent Unix permissions, pairing-code expiry and attempt limits, session expiry, and endpoint authentication. If hostile same-user processes remain in scope, require an additional OS isolation boundary rather than claiming the token file solves that threat.

9. **[med] Telegram secret ownership is contradictory, and notification disclosure is unspecified.**  
   **Reference:** §Hermes on a VPS, “Telegram bot token stays on the VPS”; §Open questions, “separate JunOS Telegram bot for alerts”. Cross-check: 07 places the JunOS bot token in junosd’s keychain.  
   **Why it matters:** There are two bots with different owners, but this document describes one token location. Approval notifications may also export private paths, diffs, recipients or secrets to Telegram without a notification-specific disclosure policy.  
   **Concrete fix:** Name both bots, token owners and revocation paths explicitly. Default alerts to minimal metadata; make detailed payload sharing explicit. Route sensitive or oversized approvals to the authenticated detail view.

10. **[med] “Shown identically” across Telegram and the browser is unrealistic and underspecifies safe hierarchy.**  
    **Reference:** §Approval UX requirements. Cross-check: 14 makes the exact action/diff expandable.  
    **Why it matters:** Telegram cannot render the shared React component, and large diffs cannot retain identical layout across channels. A focused detail view may still hide the consequential content inside a collapsed section. A field checklist alone does not ensure an informed decision.  
    **Concrete fix:** Require equivalent decision information with channel-specific renderers. Place action, destination, project and irreversible consequences before approval controls; separate agent explanations from canonical gateway facts. Specify readable body/code sizes, consistent spacing and persistent controls. When a channel cannot display the complete action, offer **Review in JunOS** instead of inline approval.

11. **[med] Safety-critical glass surfaces lack explicit visual acceptance criteria.**  
    **Reference:** §Approval UX requirements and §Stop; delegated styling in 14.  
    **Why it matters:** 14 already supplies glass fallbacks and token contrast checks, but those checks do not establish legibility over every composited backdrop or interaction state. Approval countdowns, long commands and cancelling states need stronger requirements than generic panel styling.  
    **Concrete fix:** Require approval and Stop acceptance checks over the brightest supported backdrop, nested panels, keyboard focus, zoom and narrow layouts. Set minimum contrast targets of 4.5:1 for normal text and 3:1 for essential control boundaries/focus indicators. Keep critical content legible with opaque and forced-colour fallbacks; remove pulsing/shimmer under reduced motion, and announce status changes without moving controls.