1. **[high] Approval guarantees lack an enforceable execution boundary.**  
   **Reference:** Approval policy; Prompt injection; “Sandbox for shell steps … in Phase 4.”  
   **Why it matters:** Official CLIs and Hermes can execute tools themselves. Receiving streamed tool events does not establish that JunOS can intercept an action before execution. Meanwhile, `13-roadmap.md` introduces automation in Phase 2. Wrapping malicious content as data and using a worktree do not constrain filesystem or network access.  
   **Concrete fix:** Require each adapter to demonstrate approval interception and cancellation before enabling tools. Otherwise run it without tools or with enforced filesystem/network restrictions. Make these prerequisites for automation, with acceptance tests covering denied actions, path escapes, and injection-triggered execution.

2. **[high] “Always ask” conflicts with remembered approvals and autonomy modes.**  
   **Quote:** External-send, destructive, and spend “always ask”; “Approve and remember” creates a rule.  
   **Why it matters:** The document never states whether remembered rules override mandatory approval. `06-hermes.md` further defines Autonomous as “log only” and says Balanced asks for shell/network/mail, leaving contradictory policy implementations possible.  
   **Concrete fix:** Define one authoritative matrix across autonomy modes. State which classes can receive standing grants, which require confirmation every time, and how overlapping classes combine. Default to denial for unknown actions; use the strictest applicable requirement.

3. **[high] Approval is not bound to an immutable action.**  
   **Quote:** “Inbox items showing the exact command/diff.”  
   **Why it matters:** A displayed command is insufficient if its arguments, target files, destination, or payload change before execution. Retries, duplicate clicks, and the Inbox’s 24-hour deduplication rule (`07`) also need explicit behavior for approvals.  
   **Concrete fix:** Bind each decision to a single-use action ID containing the run/step, executable, arguments, working directory, destination, payload/diff hash, and expiry. Reapprove material changes and changed file preconditions. Define retry behavior and exclude distinct approvals from generic Inbox deduplication.

4. **[high] The privacy boundary for model uploads is missing.**  
   **Reference:** “read … search | auto”; external-send examples omit inference requests.  
   **Why it matters:** A local read can become disclosure when its contents enter a hosted model’s context. Other specs introduce provider fallback (`03`), automatic title generation (`04`), and background file summaries (`11`), without this document defining which transfers Jonas authorized.  
   **Concrete fix:** Distinguish local access from transmission. Define consent scopes for providers, folders, background processing, and fallback destinations. Show the receiving provider and included data before granting that scope; require renewed consent when a fallback crosses it.

5. **[high] Daemon authentication has an incomplete bootstrap and secret lifecycle.**  
   **Quote:** Token stored in `~/.junos/token` “(mode 600)”; UI obtains it through “a one-time pairing URL”; “Any JunOS-owned secret … goes in the OS keychain.”  
   **Why it matters:** The token file contradicts the keychain rule. Windows access protection is unspecified, as are pairing expiry, browser persistence, revocation, and rotation. A URL containing the long-lived bearer token could expose it through history or logs. File permissions also do not isolate the daemon from every process running as Jonas.  
   **Concrete fix:** Explicitly choose keychain storage or a documented token-file exception with platform-specific access controls. Pair through an expiring, single-use code exchanged for a revocable session; prohibit bearer tokens in URLs and logs. Define browser session storage and acknowledge the same-user process boundary.

6. **[high] Prompt-injection defenses omit the rendering layer.**  
   **Quote:** Web/file/mail/feed content is “untrusted: wrapped as data.”  
   **Why it matters:** This addresses model instructions but leaves browser execution, remote resource loading, and spoofed approval controls unspecified. The planned markdown, image, PDF, and code previews (`04`, `11`) create additional ways for untrusted content to affect the UI.  
   **Concrete fix:** Specify sanitized markdown, disabled raw HTML, restricted URL schemes, isolated active-document previews, and an explicit policy for remote images/resources. Render approval controls exclusively from validated daemon action records, visually separate from model-authored content.

7. **[high] Redaction and data retention do not cover the actual stored data.**  
   **Quote:** “Logs and run records redact known secret patterns”; audit events are exportable.  
   **Why it matters:** Pattern matching cannot guarantee removal of arbitrary secrets or private content. The data model also stores messages, thinking, step inputs/outputs, memory, and indexed content; backups and exports can preserve copies after the visible item disappears.  
   **Concrete fix:** Define allowed fields and retention per data category. Redact before persistence, event streaming, and export; omit sensitive fields by default. Specify deletion across indexes, caches, and backup expiry, plus access protection for the entire JunOS data directory.

8. **[high] The kill switch promises more than its cancellation contract defines.**  
   **Quote:** “Kill switch in the UI stops all agent runs.”  
   **Why it matters:** Cancelling one adapter request does not establish that child processes, Hermes, queued work, retries, or scheduler triggers stop. The UI could report success while work continues; completed external effects cannot be recalled.  
   **Concrete fix:** Define a daemon-wide stopped state that blocks new execution, invalidates pending approvals, pauses queues/retries, and cancels tracked process trees and bridge runs. Show **Stopping**, **Stopped**, or **Could not confirm stop**, with remaining activity listed. Require explicit resumption and a stop path when the browser is unavailable.

9. **[med] The backup reference does not establish recoverability.**  
   **Quote:** “Nightly DB backup (02).”  
   **Why it matters:** `01` chooses SQLite WAL mode, while `02` specifies a nightly copy of `junos.db`. Copying that file alone during live writes does not establish a consistent backup. There is no restore verification or recovery scope.  
   **Concrete fix:** Require a SQLite-supported consistent backup procedure, protected backup storage, and a verified restore procedure. State whether attachments and referenced outputs are included and make the retention window explicit.

10. **[med] Approval UI lacks the hierarchy needed for informed consent.**  
    **Quote:** “Inbox items showing the exact command/diff.”  
    **Why it matters:** A large command or diff can dominate while hiding the recipient, affected paths, risk, or whether permission persists. The three-pane Inbox (`07`) makes this particularly sensitive to density and narrow widths.  
    **Concrete fix:** Specify the reading order: action and consequence → agent/project → destination or affected files → exact payload/diff → decision. Use clear labels such as **Approve once** and **Deny**, with remembered permission as a separate, initially unchecked choice. Set readable body/code sizes, explicit spacing between groups, untruncated targets, and a full-screen review layout on narrow screens.

11. **[med] Glass execution requirements are not applied to security-critical surfaces.**  
    **Reference:** Approval policy and kill switch have no surface-specific legibility or motion requirements.  
    **Why it matters:** `14-ui-system.md` supplies general contrast and fallback rules, but approvals additionally depend on readable diff markers, focus states, risk labels, and stable controls over changing atmospheric backgrounds.  
    **Concrete fix:** Require approval and emergency controls to meet text contrast of at least **4.5:1** and essential control/focus contrast of **3:1** against the actual composited background. Give payload areas a stable backing within the glass panel. Specify tested opaque/high-contrast fallbacks, labelled diff changes beyond colour, and reduced-motion behavior that removes shimmer/pulsing without removing status information.