1. **[high] Gateway enforcement stops short of Hermes’s own execution.**  
   **Reference:** [Behaviors, line 48](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:48): risky actions “always need a digest-bound approval enforced by the junosd gateway”; lines 34–37 also preserve direct Telegram access.  
   **Why it matters:** The bridge describes submitting instructions and observing logs, but no mechanism intercepts Hermes’s shell, browser, network or file actions before execution. [Spec 12](E:/AI/review-loop/specs-wt/docs/specs/12-security-and-privacy.md) explicitly says stdout is not enforcement. Private networking and container isolation do not close this gap.  
   **Fix:** Require a demonstrated tool interception and enforcement path before enabling executing directives. Define what remains possible through Telegram when junosd is offline; gated actions must fail closed. Use the read-only fallback from spec 12 when enforcement cannot be established.

2. **[high] The new Docker access requirement weakens the stated isolation boundary.**  
   **Reference:** [Open questions, line 63](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:63): the shim “needs docker rights on the VPS”; line 30 specifies only a “restricted socket proxy.”  
   **Why it matters:** The restriction is unspecified. Permissions supporting arbitrary container creation or exec could let a compromised shim reach secrets, change mounts or bypass Hermes’s non-root restrictions. Keeping the socket out of Hermes alone does not protect the host.  
   **Fix:** Specify narrowly scoped shim operations against a fixed container: fixed executable, validated arguments, fixed user, and no caller-controlled container, mount, privilege or image options. Separate routine bridge access from privileged lifecycle operations.

3. **[high] “Give to Hermes” has conflicting transfer rules and insufficient disclosure.**  
   **Reference:** [Deployment, line 23](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:23) allows uploads; line 53 attaches context “from anywhere”; line 62 records git as the decided project handoff.  
   **Why it matters:** Implementers could upload local material automatically despite the git decision and [spec 11’s](E:/AI/review-loop/specs-wt/docs/specs/11-files-and-projects.md) exclusions. Reaching the VPS also does not identify which model provider subsequently receives the content.  
   **Fix:** Define git as the project path and explicitly decide whether individual-file uploads remain supported. Before transfer, show destination, selected files or commit, exclusions and downstream provider. Route uploads and pushes through the exact-action approval policy; include remote-copy retention and deletion behavior.

4. **[high] One shared Telegram session conflicts with project-scoped autonomy and privacy.**  
   **Reference:** [Telegram, line 34](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:34): “same memory, same session”; line 48 makes autonomy per project, while `projectId` is optional in the directive contract.  
   **Why it matters:** Interleaved phone and desktop instructions can inherit the wrong project, working directory, tools or private context. Neither a session-to-project mapping nor handling of concurrent directives is defined.  
   **Fix:** Bind every run to an explicit project or an explicitly unscoped, restricted context. Define session routing, serialization and memory scope. Show project and origin on directives and steps, and prevent session history from silently crossing project boundaries.

5. **[med] The bridge contract cannot support its promised reconnect and retry behavior reliably.**  
   **Reference:** [Integration contract, lines 9–16](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:9), plus the “short ring buffer” at line 22.  
   **Why it matters:** Events lack run/directive correlation and defined ordering; directives lack an idempotency key. There is no recovery rule when the replay buffer expires. A dropped response can therefore produce duplicate work, missing history or steps attached to the wrong conversation. [Spec 01](E:/AI/review-loop/specs-wt/docs/specs/01-architecture.md) already requires explicit resync behavior.  
   **Fix:** Add request idempotency, run/directive/session IDs, event sequence and epoch, typed state transitions, and a snapshot/resync response for expired cursors. Include `unreachable` and cancellation states in the actual schema.

6. **[med] Stop’s acceptance criterion contradicts its remote failure semantics.**  
   **Reference:** [Acceptance criteria, line 59](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:59): “Stop halts within a few seconds”; line 51 permits “stop not confirmed.” Docker restart policy is also required at line 31.  
   **Why it matters:** A successful mock cancellation cannot prove remote process termination, prevent automatic restart or establish what happened during a network partition.  
   **Fix:** Define acknowledged cancellation, grace-period expiry and unconfirmed cancellation separately. Specify cancellation of child processes, suspension of queue pickup, approval revocation and restart behavior. Test an unreachable VPS, shim restart and an in-flight side effect.

7. **[med] Label-based Kanban pickup contradicts the authoritative assignment rule.**  
   **Reference:** [Behaviors, line 50](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:50): “pick up cards labelled `hermes` in the Ready column.”  
   **Why it matters:** [Spec 09](E:/AI/review-loop/specs-wt/docs/specs/09-kanban.md) explicitly says a label alone never triggers execution; pickup requires `kind=ready`, assignee `hermes` and an atomic claim. Following this document could start work assigned to Jonas.  
   **Fix:** Replace the label rule with spec 09’s assignment, column-kind and lease requirements, and make that rule part of bridge acceptance.

8. **[med] Raw logs and mirrored history lack a bridge-specific privacy boundary.**  
   **Reference:** [Integration contract, line 11](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:11) streams complete input/output; lines 22, 33 and 45 introduce buffering, mirrored conversations and raw logs.  
   **Why it matters:** These create additional copies of private conversations and potentially credentials. Spec 12’s local persistence redaction does not establish what enters the VPS replay buffer, browser stream or recorded validation session.  
   **Fix:** Define redaction before buffering and transmission, bounded payload sizes, history selection, retention and deletion propagation. Require sanitized recording fixtures and safe text/Markdown rendering for every streamed field.

9. **[med] The integration spike does not gate the capabilities the UI promises.**  
   **Reference:** [Adapter uncertainty, line 39](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:39), contrasted with memory editing, tool toggles, session sharing and lifecycle controls at lines 28–35.  
   **Why it matters:** Terminal access or an HTTP backend does not establish structured events, permission hooks, cancellation, concurrent memory editing or stable session control. Validating one recorded session proves much less than these operational capabilities.  
   **Fix:** Make the spike produce a versioned capability matrix with supported/unsupported states and evidence. Gate controls accordingly. For memory, define proposal versus committed state, version checks and approve/reject behavior; pinning alone should not ambiguously mean both approval and prominence.

10. **[med] The screen gives activity volume more explicit priority than decisions and control.**  
    **Reference:** [Screen, lines 42–45](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:42) prioritizes status, model, uptime and a 60% activity pane; approvals are only “a banner” at line 49.  
    **Why it matters:** During a blocked or failed run, the important question is what needs Jonas’s attention. A generic banner can obscure the exact action while uptime and animated activity compete for attention.  
    **Fix:** Define a persistent current-run summary with project, current task and blocking state. Require the shared ApprovalCard from spec 14 in the console, with the action visible before approval. Keep StopControl visible; make model and uptime secondary metadata.

11. **[med] The 40/60 split and bottom tabs have no usable sizing or responsive contract.**  
    **Reference:** [Screen, lines 43–45](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:43).  
    **Why it matters:** The document does not say whether inspectors consume height, overlay content or replace a pane. Narrow windows, zoom and expanded output can squeeze the composer or create several competing scroll regions. Spec 14’s global breakpoint does not resolve this internal layout.  
    **Fix:** Specify pane minimum widths, a resizable desktop split, a collapsible inspector and a persistent composer. Below the supported width, switch between Conversation and Activity rather than retaining percentages. Define scroll ownership and verify at 1440, 768 and 390px, plus 200% zoom.

12. **[med] Glass legibility and console typography lack measurable acceptance criteria.**  
    **Reference:** [Screen, lines 44–45](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:44): expandable input/output, raw logs and editable memory chips.  
    **Why it matters:** Spec 14 provides useful tokens and fallbacks, but token-pair checks alone do not establish contrast over the actual composited atmospheric background and nested surfaces. The console also leaves text size, line height, spacing and long-content behavior undefined. The current Hermes source is a placeholder, so it supplies no visual evidence.  
    **Fix:** Require at least 4.5:1 for ordinary text and 3:1 for necessary control boundaries and indicators on final composited surfaces. Define readable body/log sizes, consistent row spacing and bounded output previews. Use strong or opaque backing for dense logs and approval diffs; test the existing opaque and increased-contrast fallbacks. Present long memory entries as expandable rows rather than wrapping editable chips.

13. **[med] Continuous animation and streaming updates have no attention-management rules.**  
    **Reference:** [Screen, lines 42–44](E:/AI/review-loop/specs-wt/docs/specs/06-hermes.md:42): pulsing status and shimmering running steps.  
    **Why it matters:** Two persistent animations can compete with approvals and reading. Frequent arrivals can also move inspected content or flood assistive announcements. Spec 14 requires reduced motion, but this document does not define the console’s replacement behavior.  
    **Fix:** Use one restrained working indicator with a text label; disable pulse and shimmer under reduced motion. Batch arrivals, preserve focus and scroll position, auto-follow only while already at the newest event, and show a “new steps” control otherwise. Announce meaningful state changes rather than every log fragment.