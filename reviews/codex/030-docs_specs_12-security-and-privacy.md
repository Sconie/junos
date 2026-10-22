1. **[high] Approval enforcement is unspecified until after agents ship.**  
   **Reference:** §Prompt injection: “wrapped as data”; §Open questions: “Sandbox for shell steps … in Phase 4.”  
   **Why it matters:** Prompt framing cannot enforce permissions. Specs 01/04 launch CLI agents in Phase 1, and 06 introduces Hermes before Phase 4. Their own shell, file and network tools could bypass JunOS’s approval table entirely. A worktree does not contain those capabilities.  
   **Fix:** Require an enforceable adapter capability contract before enabling tools: all side effects pass through JunOS policy, or an equivalent verified provider restriction. Fail closed when an adapter cannot enforce it. Define canonical path checks, symlink/junction handling, credential-store exclusions and network restrictions.

2. **[high] “Always ask” conflicts with autonomy and remembered permissions.**  
   **Reference:** §Approval policy, lines 20–25.  
   **Why it matters:** External sends, destructive actions and spending “always ask,” yet “Approve and remember” creates exceptions. Spec 06 additionally offers Autonomous “log only.” Shell permission also differs between the two documents. These conflicts determine whether consequential actions execute unattended.  
   **Fix:** Define one precedence order covering hard prohibitions, action classes, autonomy levels and remembered grants. State which classes can be remembered, whether spending needs a budget, and how compound actions inherit the strictest applicable permission. Make Autonomous subordinate to explicit safety limits.

3. **[high] Provider-bound data has no explicit privacy policy.**  
   **Reference:** §Approval policy: “read … search | auto”; §Prompt injection, line 28.  
   **Why it matters:** Reading a file locally and sending its contents to a provider are different permissions. Spec 03 automatically falls back across providers; 04 replays history and generates titles using another model; 11 permits background AI tagging. None is clearly governed here. Injection could also leak content through search queries without an `external-send` action.  
   **Fix:** Separate local access from permission to disclose. Record allowed providers and data scopes per project/workflow, cover search queries and derived summaries, and block fallback to an unapproved destination before transmission. Show the destination and included context when consent is needed.

4. **[high] Approval is not bound to an immutable executable action.**  
   **Reference:** §Approval policy: “showing the exact command/diff.”  
   **Why it matters:** A displayed command alone omits working directory, resolved executable, recipient, payload and current file state. Retries or changed workflow inputs could execute something different from what Jonas approved.  
   **Fix:** Bind a single-use, expiring approval to a run/step and immutable action digest, including arguments, cwd, target, payload or diff, and relevant preconditions. Revalidate before execution; changed inputs require fresh approval. Resolve concurrent decisions atomically and deny on expiry.

5. **[high] Pairing and daemon-token handling leave the authentication boundary incomplete.**  
   **Reference:** §Daemon access, lines 7–9; §Credentials, line 13.  
   **Why it matters:** The pairing URL’s contents, lifetime and redemption rules are undefined. A long-lived bearer token in a URL could enter history or logs. “Mode 600” does not specify Windows ACLs, and a file-readable token cannot protect against every process running as the same user. The plaintext daemon token also needs an explicit exception to the keychain rule.  
   **Fix:** Use a short-lived, single-use pairing code, then issue a revocable authenticated session without retaining credentials in URLs or persistent browser storage. Define token rotation, Windows owner-only ACLs, keychain exceptions, exact permitted origins/hosts, and authentication for HTTP and event streams. State the same-user-process limitation.

6. **[high] Untrusted content can attack the browser as well as the model.**  
   **Reference:** §Prompt injection lists “web, files, mail, feeds,” but only specifies model handling.  
   **Why it matters:** Specs 04/07/11 render markdown, approval bodies and file previews. Script-capable content in the authenticated UI could read private data or invoke approval endpoints. The daemon’s CORS protection would not stop code executing inside its trusted UI origin.  
   **Fix:** Require a shared sanitized markdown renderer, disable raw HTML, allowlist URL schemes, block automatic remote media, and isolate active document previews. Add a restrictive content security policy. Render commands and diffs as escaped text, with agent-supplied explanations visibly separated from trusted action metadata.

7. **[high] The approval UI lacks a safety hierarchy and keyboard contract.**  
   **Reference:** §Approval policy, line 25: “explicit Inbox items.”  
   **Why it matters:** Spec 07 provides a single-key `a` approval shortcut and lets deduplication update existing items. This document does not prevent accidental approval, approving an unseen selection, or confusing a one-time decision with persistent permission.  
   **Fix:** Specify a stable detail view ordered as action and consequence → destination/project → exact payload/diff → decision controls. Keep Deny and Approve once explicit; place remembered permission in a separate scope-review step. Require deliberate keyboard activation, suppress shortcuts in editors, and invalidate approval when the reviewed action changes.

8. **[med] Secret-pattern redaction is too narrow for the stored data surface.**  
   **Reference:** §Credentials: “Logs and run records redact known secret patterns.”  
   **Why it matters:** Spec 02 stores prompts, messages, tool inputs/outputs, errors and event payloads. Credentials can appear outside familiar patterns, and redacting only a log view leaves copies in SQLite, streams, exports or backups. Provider credentials staying in CLI stores does not prevent an agent from reading them.  
   **Fix:** Prefer structured allowlisted audit fields, redact registered secret values before persistence or streaming, exclude credential paths from agent access, and minimize captured environment/header data. Apply the same policy to exports and backups; describe pattern matching as a secondary safeguard.

9. **[med] Privacy retention and deletion are absent.**  
   **Reference:** §Data safety: “Run output size caps” and an exportable audit trail.  
   **Why it matters:** Size caps do not limit retention. Spec 02 retains conversations, attachments, memory, file summaries and an append-only event stream; 11 adds cached summaries and embeddings. Removing a source could leave sensitive derivatives indefinitely.  
   **Fix:** Define retention defaults and deletion behavior for each data class, including caches, indexes, exports and backups. Explain how removing a folder revokes access and purges derivatives. Keep necessary audit metadata minimal, and distinguish local deletion from data already sent to providers.

10. **[med] The backup promise inherits an unsafe and incomplete recovery procedure.**  
    **Reference:** §Data safety: “Nightly DB backup (02).”  
    **Why it matters:** Spec 01 selects SQLite WAL; 02 specifies a nightly copy of only `junos.db`. Copying the main file during active WAL use can miss committed data or produce an inconsistent snapshot. Same-disk backups also do not cover disk failure, and referenced attachments/output files are unaddressed.  
    **Fix:** Require a SQLite-consistent online backup or coordinated snapshot, include referenced assets, verify restoration, and report backup failures. State the recovery window, backup access controls and same-disk limitation.

11. **[med] “Stops all agent runs” promises more than the cancellation contract supports.**  
    **Reference:** §Data safety, line 33.  
    **Why it matters:** Spec 06 stops the current Hermes step and pauses its queue; spec 05 also has scheduled jobs, retries and catch-up runs. Neither defines global cancellation of descendants or prevents immediate restart. Already submitted external actions may remain in flight.  
    **Fix:** Define Stop all as a daemon-controlled latch: suspend dispatch, invalidate pending approvals, cancel adapters, terminate owned process trees and require explicit resume. Show stopping, stopped and cancellation-failed states, with any external action whose outcome remains unknown.

12. **[med] Safety-critical glass surfaces have no specific legibility acceptance criteria.**  
    **Reference:** §Approval policy, line 25, and §Data safety, line 33; cross-check with spec 14.  
    **Why it matters:** Spec 14 supplies general glass, contrast and reduced-motion rules, but this document does not apply them to approvals or emergency controls. Dense diffs, glows and moving activity behind a decision surface can obscure the exact action. Typography, spacing and responsive overflow are unspecified.  
    **Fix:** Add acceptance criteria for these surfaces: stable frosted panels with bounded backgrounds; 4.5:1 text and 3:1 essential control/focus contrast across composited states; opaque/high-contrast alternatives; static reduced-motion status. Use a clear heading, 14–16px decision text, readable monospace diffs, consistent 16–24px grouping, and persistent controls that never cover content at narrow widths or 200% zoom. Verify long paths and large diffs.

    An optional **ice-blue accent, `#7DD3FC`**, would distinguish actions from teal success and amber warnings. It measures **11.73:1 against `#0B0C0F`**, or **9.42:1 against opaque `#20232B`**. Use dark text on filled accent buttons. The current spec-14 text `#E7E8EC` on violet `#8B5CF6` measures **3.46:1**, below the normal-text target; translucent states still need separate measurement.