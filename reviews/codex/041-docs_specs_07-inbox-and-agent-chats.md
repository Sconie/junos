1. **[high] Approval decisions aren’t bound to a specific operation.**  
   **Reference:** Item kinds; Rules; API sketch (lines 9, 24, 30).  
   **Why it matters:** The action endpoint carries only an item ID and decision. Nothing specifies how it rejects an approval after timeout, cancellation, or a change to the command. Dedupe could also update an approval’s body after Jonas reviewed it. Security §12 requires the exact command/diff and an audit trail.  
   **Fix:** Define an immutable approval payload containing project, run/step, command/diff, expiry, and revision. Resolve it atomically, reject stale decisions, and record the outcome before resuming execution. Changed operations require new approval.

2. **[high] “Approve and remember” ships before its safety controls.**  
   **Reference:** Item kinds, line 9.  
   **Why it matters:** Security §12 requires scoped, visible, revocable rules; roadmap §13 postpones the approval-rules UI until Phase 4, after Inbox approvals in Phase 3. The spec neither limits eligible action classes nor explains what the remembered permission covers.  
   **Fix:** Ship one-time approval first. Enable remembering only alongside rule inspection/revocation, with a preview of the exact project and action pattern. Explicitly preserve the policy’s “always ask” classes.

3. **[high] Agent mentions lack a context and authority boundary.**  
   **Reference:** “`@agent` mentions … hand a message to that agent” (line 40); directives (line 39).  
   **Why it matters:** It is unclear whether the handoff includes one message, the thread, attachments, or project files—and whether mentioning an agent starts executable work. This risks unintended disclosure and execution, particularly when quoted findings contain untrusted instructions.  
   **Fix:** Specify explicit composer selection of the recipient, preview the context sent, inherit project/tool permissions, and distinguish “ask” from “start directive.” Render the actual agent/provider and linked run inline; quoted or retrieved mentions must never dispatch automatically.

4. **[high] Global single-letter shortcuts can authorize actions while typing.**  
   **Reference:** “`a` approve, `d` deny, `c` make card” and inline Reply (lines 13, 17).  
   **Why it matters:** No focus restrictions are defined. Typing a reply could trigger approval or dismissal. `c` also conflicts with Kanban §09’s global quick-add shortcut, and live sorting could change the selected item before activation.  
   **Fix:** Scope shortcuts to the focused Inbox list, exclude editable controls and IME composition, and define shortcut precedence. Make `a` focus/open the approval review; commit with an explicit control bound to the reviewed item revision.

5. **[high] Retry can repeat already completed side effects.**  
   **Reference:** Failure actions and acceptance criterion (lines 12, 46).  
   **Why it matters:** “Retry” does not identify whether it restarts a task, workflow, or failed step. Tasks §05 permits retry from the failed step; restarting everything could repeat file writes, sends, or spending.  
   **Fix:** Show the retry boundary and previously completed effects. Create a linked attempt, prevent duplicate submissions, and require fresh approval where the operation or permission has changed. Define “Mute task” separately from pausing execution.

6. **[high] Untrusted bodies and output actions have no rendering or file boundary.**  
   **Reference:** “full body”; “Save to file”; “View logs”; “Ask Claude about it” (lines 10–17).  
   **Why it matters:** Findings and agent output can contain hostile markup, remote tracking images, misleading links, sensitive logs, or suggested file paths. The document does not connect these entry points to security §12’s untrusted-content policy.  
   **Fix:** Require sanitized markdown, blocked executable URL schemes, remote-image blocking by default, and redacted logs. File saving must use a user-selected permitted destination with overwrite review. “Ask Claude” should preview the context and respect disconnected-provider states while preserving the finding’s untrusted provenance.

7. **[med] Inbox lifecycle, counts, and actions have no coherent contract.**  
   **Reference:** Filters, Rules, API sketch, unread badge (lines 17–32).  
   **Why it matters:** `Needs me`, unread, seen, Done, dismissed, approved, and denied are not mapped together. Data model §02 lacks explicit snooze time, dedupe key, or approval outcome fields. The API omits several advertised actions, including inline reply and remembering approval.  
   **Fix:** Add a transition/action matrix per kind, count definitions, and persisted lifecycle fields. Define which actions resolve an item and whether Done includes dismissed/expired outcomes. Keep dedupe scoped to the same underlying occurrence; reopening meaningful updates must restore attention without overwriting approval history.

8. **[med] Agent chats leave execution controls and thread identity ambiguous.**  
   **Reference:** “Same component as Chat”; grouped agent list; directives and run cards (lines 35–40).  
   **Why it matters:** Chat §04 includes model switching, branching, retry, and cancellation, while Hermes §06 has separate directive and stop controls. The spec does not say which survive in agent mode, whether Hermes console and Agents show the same conversation, or whether canceling a response stops the agent.  
   **Fix:** Define shared conversation/directive/run IDs and an agent-mode capability matrix. Show queued, working, waiting for approval, offline, failed, and canceled states. Keep Stop reachable from the agent thread and explain whether it stops one directive or all agent work.

9. **[med] Urgency and live sorting can make triage unstable.**  
   **Reference:** All blocked approvals are urgent; urgent-first/newest sort; streaming updates (lines 20, 25, 32).  
   **Why it matters:** Routine approvals can saturate urgency, while older unresolved requests sink. Incoming items can move rows during keyboard navigation. Desktop notifications may expose sensitive titles on the lock screen.  
   **Fix:** Separate “needs a decision” from urgency; surface approval deadlines and oldest waiting requests. Preserve selection by ID and buffer new arrivals behind a “New items” affordance. Define reconnect reconciliation, notification grouping, permission-denied behavior, and private notification text.

10. **[med] The three-pane layout lacks usable dimensions and hierarchy.**  
    **Reference:** “Screen (matches mockup)” and agent cards (lines 16–17, 37).  
    **Why it matters:** The spec gives no pane widths, row pitch, typography, truncation rules, or action hierarchy. Neither `src/App.tsx` nor `src/pages/Chat.tsx` supplies an Inbox implementation to inherit. A source icon alone also hides the project/run identity needed for confident approval.  
    **Fix:** Define a desktop layout budget—for example, a 176–208px filter pane, a list at least 320px wide, and a detail pane at least 400px wide. Use 56–64px two-line rows, 14–16px primary text, 12–13px metadata, and consistent 8/16/24px spacing. Show kind, project/source, and deadline; separate selection, unread, and urgency. Keep one primary contextual action, with persistent permission grants secondary.

11. **[med] Glass contrast is inherited as an aspiration, not an acceptance test.**  
    **Reference:** Screen/detail pane and shared Chat component (lines 17, 35), against UI system §14.  
    **Why it matters:** §14 requires 4.5:1 text contrast, but atmospheric backgrounds vary beneath panels. The proposed violet `#8B5CF6` gives white text only **4.23:1**, so it cannot safely carry normal-size white button labels. Selection and focus also need distinct, legible treatment.  
    **Fix:** Specify worst-case composited contrast tests for body, metadata, selected rows, buttons, and focus indicators, with bounded panel opacity and explicit opaque/high-contrast fallbacks. Consider cool blue `#67B7FF` for action/focus: it distinguishes actions from teal health states and gives **9.12:1** with `#0B0C0F` labels, or **7.33:1** as text on opaque `#20232B`. These are solid-color calculations; glass composites still require verification.

12. **[med] Responsive, recovery, and motion behavior remain unspecified.**  
    **Reference:** Screen, event stream, agent progress (lines 17, 32, 39).  
    **Why it matters:** UI system §14 supplies general states and a 900px breakpoint, but three panes can become cramped before then. The spec does not define focus restoration, failed inline replies, expired detail views, or how streaming content affects scrolling and assistive technology.  
    **Fix:** Collapse filters/detail when minimum widths no longer fit; use list-to-detail navigation on narrow screens and restore list position on Back. Define loading, empty, filtered-empty, offline, stale, and action-error states. Preserve reply drafts, announce meaningful state changes without token-by-token announcements, and retain a “Jump to latest” control. Reduced motion must remove shimmer, pulsing, and animated reordering while keeping textual progress visible.

13. **[med] Phase boundaries and acceptance criteria understate the work.**  
    **Reference:** Custom agents, acceptance criteria, open questions (lines 42–52).  
    **Why it matters:** Roadmap §13 separates results/failures, approvals/agent chats, Scout, approval-rule management, and notifications across several phases. This document presents most as one surface with only three happy-path checks. Scout is also offered as a conversational directive recipient without a corresponding chat contract in §08.  
    **Fix:** Mark each capability by phase and define unsupported-action behavior. Start with results/failures, then one Hermes conversation and one-time approvals. Defer Scout chat until its capabilities are specified. Add acceptance checks for stale approval, timeout races, duplicate retry, restart/reconnect, keyboard typing safety, context disclosure, narrow layouts, and glass contrast/fallbacks.