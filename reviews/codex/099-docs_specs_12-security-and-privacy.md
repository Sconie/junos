1. **[high] The CLI sandbox is optional in precisely the cases that need it.**  
   **Reference:** Execution gateway, line 22; Open questions, line 77.  
   A worktree and working directory do not establish a security boundary. “Read-only” also does not establish that a CLI cannot read unrelated credentials or transmit files. Permission flags and optional hooks leave the gateway’s enforcement claim dependent on adapter behavior.  
   **Concrete fix:** Require each adapter to demonstrate enforced filesystem, process and network restrictions before enabling it. Separate the provider connection from tool network access, isolate CLI credentials from child tools, and fail closed when interception is incomplete. Make these Phase 0/1 release gates.

2. **[high] The Hermes boundary does not enforce the stated invariants on VPS actions.**  
   **Quote:** “The gateway enforces the junosd-side rules on every action Hermes asks JunOS to perform or approve.”  
   This protects requests reaching JunOS, but says nothing about commands, network sends or deletions Hermes executes directly inside its container—including through its existing Telegram channel in spec 06. A separate workspace and non-root user limit damage without making approval mandatory.  
   **Concrete fix:** Require a trusted VPS executor outside Hermes’s control that intercepts side effects and validates JunOS authorization. Otherwise explicitly limit the guarantee to JunOS-mediated actions, label independent Hermes activity accordingly, and disable directives that imply stronger supervision.

3. **[high] “A compromised Hermes cannot approve itself” lacks an authentication boundary.**  
   **Reference:** Execution gateway, line 23; Hermes on a VPS, line 68.  
   The document specifies a bridge token and approval channels, but does not distinguish authority to request an action from authority to approve it. An agent-controlled request must not be able to supply a trusted `decided_by` or approval-channel label.  
   **Concrete fix:** Define separate capabilities for agent requests, shim execution and human decisions. Derive approver identity server-side from the browser session or verified Telegram update. Bind Telegram callbacks to the approval and authorized user/chat; never expose approval authority to Hermes’s process.

4. **[high] Stop leaves approved actions and concurrent dispatches unresolved.**  
   **Quote:** “revokes pending approvals for that run.”  
   An approval already marked `approved` can remain executable after Stop. Pausing the queue also does not prevent an action already dequeued from starting. “The current run” leaves concurrent workflows and agents ambiguous.  
   **Concrete fix:** Specify global versus run-level Stop. Atomically mark the affected runs cancelled, invalidate both pending and approved authorizations, and recheck cancellation immediately before dispatch. Require explicit resume behavior and report in-flight remote effects as unconfirmed until reconciled.

5. **[high] Provider requests conflict with “external-send always asks.”**  
   **Reference:** Invariants, line 10; gateway scope, line 16; Action classes, line 31; Privacy, line 58.  
   Sending context to a provider is an external transmission. The document never explains whether clicking Send creates the required single-use approval, or how an unattended scheduled model call can run while external-send approvals cannot be remembered. Provider allowlisting and action approval are different permissions.  
   **Concrete fix:** Define a separate, bounded model-inference permission covering provider, context sources and scheduled scope. Specify how manual Send authorizes its exact request and how opt-in scheduled inference is authorized. Keep mail, uploads, publishing and purchases under separate action approvals.

6. **[high] The digest binds arguments, but not necessarily what will actually execute.**  
   **Quote:** “any changed argument needs a new approval.”  
   Unchanged arguments can reference changed content: a file upload, a script, a git branch or a path redirected through a symlink/junction. Jonas could approve one diff or payload and execute another.  
   **Concrete fix:** Bind approval to immutable payload hashes and relevant preconditions: file contents/base version, git commit and remote, resolved destination, executable and script identity. Revalidate at dispatch and require new approval when any approved material changes.

7. **[high] Approval consumption and external execution cannot share the promised SQLite transaction.**  
   **Quote:** “`approved -> consumed` in the same transaction that starts the action.”  
   SQLite cannot atomically commit a remote HTTP effect or process launch. A crash between dispatch and recording the outcome leaves an ambiguous result; single-use approval alone does not establish exactly-once execution.  
   **Concrete fix:** Persist an execution intent and consume authorization atomically, then dispatch with a stable execution ID. Use destination idempotency where available. Record uncertain outcomes explicitly and reconcile them before permitting retries; never automatically restore approval after an uncertain dispatch.

8. **[high] Policy-changing writes have no protected classification.**  
   **Reference:** gateway scope, line 16; Action classes, lines 26–33; Remembered approvals, line 36.  
   The gateway covers task and Hermes mutations, but only project file edits have a defined local-write policy. Changes to provider permissions, folder allowlists, approval rules, workflow definitions or security configuration could increase an agent’s authority if treated as ordinary writes.  
   **Concrete fix:** Add a protected configuration class requiring authenticated human action. Prevent agents from granting themselves access, changing authorization rules or modifying the trusted executor. Classify ordinary local records separately and resolve multi-class actions using the strictest applicable policy.

9. **[high] “Safe rendering” does not fully address network egress from previews and reads.**  
   **Reference:** Untrusted content, lines 64–65.  
   Blocking Markdown images does not specify whether file previews may load remote images, styles, fonts or embedded documents. Sandboxing scripts and origin access does not itself define a no-network preview policy. Search/fetch tools also lack destination restrictions, although spec 08 already constrains Scout sources.  
   **Concrete fix:** Define preview-specific CSP and resource blocking. Route approved remote loads through a controlled fetcher with redirect and private-address checks. Treat outbound URLs, query strings and request bodies as potential disclosures, including requests classified as reads.

10. **[med] Deletion promises omit retained copies and concurrent jobs.**  
    **Quote:** “deleting a conversation, file index entry or card removes its content…”  
    Spec 02 permits independent cards to retain content after source deletion; spec 06 mirrors data to the VPS and Telegram. Backups retain older copies, and an in-flight job could recreate deleted indexes or output. The current wording overstates the deletion boundary.  
    **Concrete fix:** Define deletion scope across attachments, derived records, CLI artifacts, VPS copies and Telegram messages. Cancel or fence in-flight jobs, disclose copies that remain, and apply deletion tombstones during backup restoration so removed data is not silently resurrected.

11. **[med] The local-process threat exceeds the specified credential protections.**  
    **Reference:** Threat model, line 6; Daemon access, line 49; Credentials, line 55.  
    A token file with “mode 600” is incomplete for the Windows-first deployment in spec 01. The document also does not distinguish another OS user from a malicious process running as Jonas, which may share access to credentials and local records. Pattern redaction does not resolve that boundary.  
    **Concrete fix:** Specify Windows ACLs for the token, database and backups; pairing expiry and attempt limits; and session revocation behavior. State the same-user-process limitation explicitly and isolate agent processes under separate credentials. Minimize captured output before applying secret redaction.

12. **[med] “Shown identically” across Telegram and the browser is unrealistic and risks leaking approval content.**  
    **Quote:** “Shown identically wherever it appears … the one shared component in 14.”  
    Telegram cannot render the React component or safely accommodate arbitrary commands and diffs. Sending the “exact action/diff” there may also disclose private content to an additional service, while truncation could conceal the consequential part of an action. Spec 07’s separate bot makes this a real additional destination.  
    **Concrete fix:** Specify one approval data contract with channel-specific renderers. Default Telegram to a redacted summary and “Review in JunOS.” Permit inline approval only for bounded actions whose complete material details fit; require opt-in before sending sensitive payloads to Telegram.

13. **[med] Approval requirements list fields without defining a safe reading hierarchy.**  
    **Reference:** Approval UX requirements, line 42; spec 14’s expandable monospace action/diff.  
    Actor, target, expiry and an arbitrarily long diff can produce a dense card where the actual consequence is difficult to find. The requirement that the action be “visible” does not resolve collapsed content, truncated recipients, narrow sheets or sticky buttons covering the final lines.  
    **Concrete fix:** Require consequence and destination first, scope and actor second, then the exact payload in a bounded code/diff region. Keep material recipients and irreversible effects visible without expansion. Specify readable type, grouped spacing, wrapping for long paths, separate code scrolling and a non-obscuring action footer at narrow widths and enlarged text.

14. **[med] Safety-critical glass surfaces lack explicit visual acceptance criteria.**  
    **Reference:** Approval UX requirements and Stop; cross-reference spec 14’s translucent tokens, contrast checks and motion preferences.  
    Spec 14 provides useful general rules, but spec 12 does not require approval details, focus indicators and Stop states to remain legible over the brightest permitted bloom or stacked panels. Token-pair checks alone do not establish contrast against the final composite. Countdown and live activity updates could also compete with the decision.  
    **Concrete fix:** Require rendered checks over worst-case backgrounds: at least 4.5:1 for normal text and 3:1 for essential control boundaries and focus indicators. Give safety details a sufficiently opaque backing within the glass treatment. Require opaque/forced-colour fallbacks, reduced-motion behavior, no pulsing or shimmer around approval decisions, and restrained countdown announcements. Distinguish Approve, Deny and Stop through labels and structure as well as colour.