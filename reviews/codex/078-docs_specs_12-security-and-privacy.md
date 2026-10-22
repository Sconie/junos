1. **[high] Enforcement is deferred until after agents gain execution access.**  
   **Reference:** §Open questions: “Sandbox for shell steps … in Phase 4”; §Data safety: “git branch/worktree.”  
   **Why it matters:** The roadmap enables CLI execution in Phase 1, workflows in Phase 2, and Hermes in Phase 3. The doc never requires these executors to route every action through a shared policy boundary. A worktree separates edits but does not restrict filesystem, credential, or network access.  
   **Concrete fix:** Require each adapter to demonstrate enforceable tool permissions before enabling execution. Disable unsupported capabilities. Specify canonical path checks, symlink/junction escape prevention, restricted subprocess environments, and shell/network restrictions before unattended operation.

2. **[high] “Always ask” conflicts with remembered approvals and autonomy modes.**  
   **Reference:** [Approval policy, lines 20–25](docs/specs/12-security-and-privacy.md#approval-policy); cross-check: `06-hermes.md`, §Behaviors.  
   **Why it matters:** External sends, destructive actions, and spending “always ask,” yet remembered rules have no exclusions and Hermes supports “Autonomous (log only).” Compound actions can match several classes. “Anything that costs money” also leaves subscription-backed model runs ambiguous.  
   **Concrete fix:** Define one policy matrix covering autonomy mode, action class, and remembered rules. State which classes cannot be remembered, make the strictest matching class prevail, and distinguish subscription usage from new financial commitments.

3. **[high] Approval is not bound to the operation that eventually executes.**  
   **Reference:** §Approval policy: “showing the exact command/diff”; “project + action pattern.”  
   **Why it matters:** The spec does not prevent arguments, file contents, recipients, or destinations changing after review. Workflow retries (`05-tasks-and-workflows.md`) could reuse approval or repeat an external action. Broad command patterns could authorize materially different operations.  
   **Concrete fix:** Bind a single-use approval to an immutable operation containing executor, project, resolved paths, arguments, destination, payload/diff hash, and expiry. Revalidate before execution; invalidate changed operations and prevent duplicate approval submissions. Require idempotency handling for external-action retries.

4. **[high] Pairing and token handling leave the daemon’s main credential underspecified.**  
   **Reference:** §Daemon access: “one-time pairing URL,” token file “mode 600”; §Credentials: JunOS-owned secrets go in the keychain.  
   **Why it matters:** The daemon token is an unexplained exception to the keychain rule. Its browser lifetime, storage, rotation, and revocation are undefined. A pairing URL could expose credentials through history or logs. POSIX permissions do not specify Windows protection. The named threat of another local process also needs a clear same-user trust boundary.  
   **Concrete fix:** Exchange a short-lived, single-use pairing code for a revocable UI session; keep the long-lived daemon credential out of URLs and browser persistent storage. Specify token-file versus keychain ownership, Windows ACLs, exact allowed origins/hosts, missing-origin handling, and authentication for event streams/WebSockets. State what protection is possible against processes running as the same user.

5. **[high] Prompt-injection precautions omit hostile content rendered by the UI.**  
   **Reference:** §Prompt injection: untrusted content is “wrapped as data”; cross-check: MarkdownView in `14-ui-system.md`, file previews in `11-files-and-projects.md`.  
   **Why it matters:** Model instructions do not protect the browser. Mail, feeds, model output, markdown, and previews could contain active markup, misleading links, remote tracking resources, or fake approval controls. A compromised UI would sit beside authenticated daemon access.  
   **Concrete fix:** Add a rendering boundary: sanitize markdown, disallow raw active HTML and unsafe URL schemes, block remote resources by default, isolate document previews, and apply a restrictive content-security policy. Trusted approval controls must be visually and structurally separate from untrusted content.

6. **[high] The privacy boundary covers credentials but not content sent to providers.**  
   **Reference:** §Credentials: “no provider passwords or tokens”; §Approval policy: reads are automatic.  
   **Why it matters:** Keeping sign-ins in official CLIs does not keep files and conversations local. Routing fallback (`03`), history replay and automatic title generation (`04`), and background tagging (`11`) can send content to different providers. This doc does not distinguish permission to read locally from permission to transmit.  
   **Concrete fix:** Define separate local-read and provider-transmission permissions. Specify allowed providers per conversation/project, consent for tagging and title generation, and behavior when fallback changes the destination. Show the receiving provider before transmission, with a local-only option where supported.

7. **[med] Pattern redaction cannot support the stated storage guarantees by itself.**  
   **Reference:** §Credentials: “Logs and run records redact known secret patterns”; §Data safety: audit is exportable.  
   **Why it matters:** The data model persists message content, thinking, tool inputs/outputs, run inputs, and event payloads. Secrets can be unfamiliar formats, and private content need not resemble a secret. The doc defines neither retention nor deletion across exports, indexes, and backups.  
   **Concrete fix:** Specify allowlisted audit fields and redaction before persistence, streaming, notification, and export. Define retention and deletion behavior for each store, including backup expiry. State the limits of pattern detection and provide a way to suppress sensitive run content.

8. **[med] The backup promise does not establish recoverability.**  
   **Reference:** §Data safety: “Nightly DB backup (02).”  
   **Why it matters:** `02-data-model.md` specifies a nightly copy of `junos.db`, while `01-architecture.md` selects WAL mode. An unspecified live-file copy is not a sufficient backup procedure. The doc also leaves referenced outputs, attachments, backup protection, and restore validation undefined.  
   **Concrete fix:** Require a consistent SQLite backup procedure, identify all data needed for restoration, protect backup access, and validate restoration periodically. State the expected recovery point and expose backup failures.

9. **[med] “Stops all agent runs” promises more than the cancellation contract defines.**  
   **Reference:** §Data safety: “Kill switch in the UI stops all agent runs”; cross-check: Hermes Stop cancels the current step and pauses its queue (`06`).  
   **Why it matters:** Global stop, provider cancellation, and Hermes stop have different scopes. Schedules, retries, child processes, and remote work could continue or restart. The UI could imply success while an external action remains in progress.  
   **Concrete fix:** Define a daemon-wide stop latch that blocks new dispatch, pauses schedules/queues/retries, and cancels tracked executors. Specify child-process handling and remote cancellation limits. Display “Stopping,” “Stopped,” or “Cancellation unconfirmed,” and require explicit resume.

10. **[med] Approval presentation prioritizes technical detail without a decision hierarchy.**  
    **Reference:** §Approval policy: Inbox items show “the exact command/diff”; cross-check: three-pane Inbox and single-key approval in `07`.  
    **Why it matters:** A long command or dense diff can bury the recipient, affected files, cost, or irreversible effect. The spec gives no typography, spacing, wrapping, or action-placement requirements for this safety-critical surface.  
    **Concrete fix:** Require an approval layout with action and consequence first, destination/project second, and expandable exact details third. Use readable body text and monospace only for technical payloads; preserve full paths through wrapping or contained scrolling. Separate “Approve once” from persistent-rule creation, keep Deny visible, and prevent approval shortcuts while typing or before the item is deliberately reviewed.

11. **[med] Glass accessibility rules are not translated into security-surface acceptance criteria.**  
    **Reference:** §Approval policy and §Data safety’s kill switch; cross-check: `14-ui-system.md`, §Tokens and §Accessibility.  
    **Why it matters:** The shared system already requires 4.5:1 text contrast and fallbacks, but this doc does not specify verification for approval text, diff colors, focus indicators, or stop controls over varying glow and overlapping panels. Reduced motion alone also does not establish an opaque option for supported blur.  
    **Concrete fix:** Reference §14 explicitly and require testing over the brightest/darkest composited backgrounds and allowed panel nesting. Require 4.5:1 normal text contrast and 3:1 essential control/focus contrast. Provide a user-selectable opaque mode, static reduced-motion states, and non-color labels for risk and diff changes. Keep glass while making these controls reliably legible.

12. **[low] The security promises have no acceptance criteria.**  
    **Reference:** The document ends with §Open questions.  
    **Why it matters:** Statements such as “always ask,” “never in … logs,” and “stops all” cannot currently serve as clear release gates. Other feature specs include acceptance criteria, but this cross-cutting policy does not.  
    **Concrete fix:** Add checks for unauthorized daemon access, pairing-code reuse, expired/changed approvals, path escapes, hostile rendered content, sensitive-data persistence, backup restoration, and stop/resume behavior. Assign each requirement to the first phase that exposes the relevant capability.