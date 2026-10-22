1. **[high] Approval enforcement is promised without a control boundary.**  
   **Reference:** §Approval policy; §Open questions: “Sandbox for shell steps … in Phase 4.”  
   **Why it matters:** The official CLIs execute subprocesses themselves (03), and Hermes owns its agent loop (06). Approving daemon steps does not necessarily control their internal shell, file, browser or network actions. A worktree does not restrict access to credentials, other folders or the network. These capabilities arrive before Phase 4 hardening.
   **Concrete fix:** Require each adapter to demonstrate enforceable tool restrictions before enabling agent execution. Disable unsupported capabilities, deny unknown tools by default, and make restricted execution a prerequisite for unattended runs.

2. **[high] “Always ask” conflicts with remembered rules and Autonomous mode.**  
   **Reference:** §Approval policy: external-send, destructive and spend “always ask”; “Approve and remember.”  
   **Why it matters:** The document never says which rule wins. Meanwhile, 06 defines Autonomous as “log only” and Balanced as asking for shell/network/mail. Implementations could legitimately produce opposite outcomes for the same action.
   **Concrete fix:** Define one authoritative policy matrix covering every autonomy level, explicit approval, remembered permissions and hard prohibitions. State which classes cannot be remembered. Specify how overlapping classes combine, with the most restrictive requirement winning.

3. **[high] Read and local-write permissions leave exfiltration paths open.**  
   **Reference:** §Approval policy: “read … search | auto”; §Prompt injection gates external-send and destructive actions.  
   **Why it matters:** Search queries and HTTP reads can transmit private content. An allowed file edit can modify an executable script, workflow or configuration that later sends data. Merely wrapping hostile content as data does not prevent either route.
   **Concrete fix:** Classify actions by effects, destinations and data crossing boundaries. Separate local reads from network requests; restrict sensitive reads and executable configuration writes; enforce destination and filesystem permissions outside the model.

4. **[high] Pairing and browser authentication lack a complete lifecycle.**  
   **Reference:** §Daemon access: “one-time pairing URL”; §Credentials: secrets go in the OS keychain.  
   **Why it matters:** It is unclear whether the URL contains the permanent bearer token, where the browser retains credentials, or how sessions expire and revoke. URLs can expose credentials through history or logging. The plaintext daemon token is also an unexplained exception to the keychain rule; “mode 600” does not define Windows ACL protection.
   **Concrete fix:** Specify an expiring, single-use pairing code exchanged for a revocable browser session; keep permanent credentials out of URLs. Define session storage, rotation, logout, restart behavior, Windows permissions and authentication for SSE/WebSocket connections. Require bearer/session validation independently of CORS.

5. **[high] Untrusted rendered content can reach the privileged UI without a stated defense.**  
   **Reference:** §Prompt injection covers model behavior but omits browser content handling.  
   **Why it matters:** Chat renders Markdown and tool cards (04); Files previews Markdown, images and PDFs (11). Active content, unsafe links or remote resources could expose data or compromise the UI that authorizes daemon actions.
   **Concrete fix:** Add a rendering security contract: sanitize Markdown, prohibit executable HTML, validate URL schemes, block remote resources by default, isolate active previews and apply a restrictive content security policy. Render commands and diffs as inert text.

6. **[high] Approvals are not bound to the exact action eventually executed.**  
   **Reference:** §Approval policy: “showing the exact command/diff.”  
   **Why it matters:** A command alone omits working directory, destination, inputs and expected effects. Files or arguments may change while approval waits. Retries can repeat an external send, and the 24-hour Inbox deduplication rule in 07 could replace evidence for a pending decision.
   **Concrete fix:** Bind approval to an immutable action ID and payload containing arguments, canonical paths, destination and relevant file versions. Invalidate approval when these change; consume it once; specify expiry, replay protection and retry behavior. Exclude pending approvals from generic Inbox deduplication.

7. **[high] The kill switch promises more than its contract establishes.**  
   **Reference:** §Data safety: “Kill switch in the UI stops all agent runs.”  
   **Why it matters:** Stopping a visible subprocess may leave descendants, remote Hermes work or scheduled jobs active. The UI can also disconnect while the daemon continues. In 06, Stop cancels the current step and pauses the queue—a narrower guarantee.
   **Concrete fix:** Define a daemon-wide stop that blocks new dispatch, pauses queues and schedules, invalidates pending approvals, and cancels process trees and bridge operations. Show “Stopping,” confirmed stopped and cancellation failure states. Provide a local stop command when the UI is unavailable.

8. **[med] Privacy promises omit provider routing and retained content.**  
   **Reference:** §Credentials: “Logs and run records redact known secret patterns”; §Data safety: audit is exportable.  
   **Why it matters:** Pattern matching misses ordinary private text and unfamiliar credentials. The schema stores prompts, thinking, tool inputs/outputs and memory (02). Automatic fallback and title generation (03–04) introduce additional provider disclosures without a policy here.
   **Concrete fix:** Define collection, retention, deletion and export rules for each content type. Redact before persistence, including error paths. Require folder/conversation permissions to constrain fallback providers and background model calls; show which provider will receive attached content. Explain deletion behavior for indexes, caches and backups.

9. **[med] The backup reference does not establish recoverability.**  
   **Reference:** §Data safety: “Nightly DB backup (02).”  
   **Why it matters:** Architecture specifies SQLite WAL, while 02 proposes copying only `junos.db`. That does not specify a transaction-consistent backup of a live database. Fourteen copies beside the original also share its disk-loss risk.
   **Concrete fix:** Require a SQLite-supported consistent snapshot, a restore check and a documented recovery procedure. Protect backup permissions, include referenced run-output files where necessary, and offer a separately stored backup destination.

10. **[med] Approval hierarchy and density are unspecified for the decision that matters most.**  
    **Reference:** §Approval policy: “explicit Inbox items showing the exact command/diff.”  
    **Why it matters:** A long command or diff can bury the recipient, project, affected files and consequence. The three-pane Inbox (07) and narrow drawers (14) make this particularly likely. The current source contains no approval surface that resolves these questions.
    **Concrete fix:** Specify the reading order: action and consequence, target/project, affected data, then expandable evidence. Use 14–16px body text, readable monospace evidence, consistent 16–24px grouping and an expandable wide diff view. Separate “Approve once” from a secondary “Create permission…” flow showing the proposed scope.

11. **[med] Glass accessibility requirements are too general for security decisions.**  
    **Reference:** §Approval policy and §Data safety’s kill switch; cross-reference 14’s “text contrast at least 4.5:1 on the glass.”  
    **Why it matters:** This document never requires approval evidence, warnings or Stop to remain legible across atmospheric glow, stacked panels and fallback states. Generic reduced-motion support also leaves countdowns, changing approval queues and running indicators undefined.
    **Concrete fix:** Require security surfaces to meet 4.5:1 text contrast over the brightest supported composite background, plus 3:1 for necessary control boundaries and focus indicators. Use a stronger glass scrim where needed, offer an explicit opaque mode, and preserve visible status text with motion disabled. Keep the selected approval stable as new items arrive.

12. **[med] Keyboard approval can bypass deliberate review.**  
    **Reference:** §Approval policy requires explicit approval; 07 assigns single-key `a` to approve.  
    **Why it matters:** The security spec does not establish whether a list selection, newly arrived item or focused detail pane is sufficient to authorize an action. A shortcut or shifting queue could approve an item whose evidence was never reviewed.
    **Concrete fix:** Require the approval detail to be open and its identity stable before authorization. Disable global approval shortcuts inside editors and inputs; use deliberate confirmation for destructive or paid actions. Define focus restoration, screen-reader announcements and an unmistakable expired/already-resolved state.