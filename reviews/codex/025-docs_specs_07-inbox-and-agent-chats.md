1. **[high] Approval decisions are not bound to an immutable action.**  
   **Reference:** Item kinds; Rules: “same source+key within 24h updates the existing item”; API sketch.  
   **Why it matters:** An approval’s command or diff could change while Jonas reviews it. Duplicate clicks, a timeout, or simultaneous decisions in Inbox and Hermes could also resolve the same step inconsistently.  
   **Concrete fix:** Exclude approvals from mutable deduplication. Bind each decision to an approval ID, payload version/hash, project, run and step. Resolve atomically from pending to approved, denied or expired; reject stale decisions and make repeats idempotent. Show the exact command/diff and expiry required by specs 06 and 12.

2. **[high] “Approve and remember” ships before its required management controls.**  
   **Reference:** Approval actions: “Approve and remember for this project.”  
   **Why it matters:** Spec 12 requires scoped rules visible and revocable in Settings, but roadmap 13 defers the approval rules UI to Phase 4, after approvals arrive in Phase 3. The relationship between remembered rules and “always ask” action classes is also unresolved.  
   **Concrete fix:** Gate this action until rule inspection and revocation ship. Define eligible action classes, narrow matching, project boundaries and expiry. Preview the precise permission being saved separately from the one-time approval.

3. **[high] Agent handoff has no context or permission boundary.**  
   **Reference:** Agent chats: “`@agent` mentions from any normal chat hand a message to that agent”; “Same component as Chat (04).”  
   **Why it matters:** It is unclear whether a mention forwards one message, conversation history, attachments or project files—and whose tools, model and memory scope apply. Reusing Chat’s context and model controls could silently change an agent’s authority or expose unrelated material.  
   **Concrete fix:** Specify the handoff payload and show recipient, project, attachments and effective capabilities before sending. Default to explicitly selected context; enforce the recipient’s policy server-side. Define whether model/tool controls are hidden, locked or explicit overrides, and preserve Scout’s read-only restrictions.

4. **[high] Single-key approval shortcuts can trigger unintended decisions.**  
   **Reference:** Screen: “`a` approve, `d` deny,” alongside inline replies and search.  
   **Why it matters:** No focus rules prevent typing in a reply, search field or editor from activating an approval. Live reordering also leaves the decision target ambiguous.  
   **Concrete fix:** Enable list shortcuts only when list focus is active; ignore editable fields and composition input. Make `a` focus/open the selected approval’s decision control, with deliberate activation. Preserve selection by item ID and define focus after resolution.

5. **[high] “Working Retry” leaves duplicate side effects undefined.**  
   **Reference:** Failure actions and acceptance criterion: “A failed task shows up in the Inbox with a working Retry.”  
   **Why it matters:** A workflow may have sent a message or written a file before failing. Replaying the whole run could repeat those effects. Spec 05 supports retrying from the failed step, but this document does not adopt that behavior.  
   **Concrete fix:** Distinguish task rerun from failed-step retry. Show the restart point, preserve completed steps and link the new attempt to its predecessor. Require renewed approval for changed actions and reconciliation where a previous external action’s outcome is unknown.

6. **[high] Untrusted bodies and output actions lack handling rules.**  
   **Reference:** “full body,” “View logs,” “Save to file,” and “Ask Claude about it.”  
   **Why it matters:** Findings and outputs can contain hostile markup, remote tracking images, secrets or suggested file paths. “Ask Claude” also sends content to a provider without defining the payload or disconnected-provider behavior.  
   **Concrete fix:** Require sanitized Markdown, safe link schemes, remote images blocked by default and redaction before display/export. Use a daemon-validated destination picker with overwrite handling. Open “Ask Claude” as a reviewable draft containing explicit context, retaining untrusted-content boundaries.

7. **[med] Inbox lifecycle and advertised actions exceed the API contract.**  
   **Reference:** Item kinds, filters, Rules and API sketch.  
   **Why it matters:** The sketch omits dismiss, reply, retry, mute, save and remembered approval. “Needs me,” unread counts and Done membership are undefined. Spec 02 has `new | seen | snoozed | done | dismissed`, but no explicit fields for snooze time, dedupe key or approval expiry. Generic Done could hide a still-blocking approval.  
   **Concrete fix:** Add a per-kind action/state matrix and define filter/count predicates. Persist snooze, expiry and dedupe metadata; define timezone-aware “next morning.” Keep approval execution state separate from read/archive state, and specify action responses, failures and update events.

8. **[med] Mandatory scope spans several roadmap phases without labels.**  
   **Reference:** Item kinds, Agent chats and Acceptance criteria.  
   **Why it matters:** Roadmap 13 introduces results/failures in Phase 2, approvals/agent chats in Phase 3, Scout in Phase 4 and notifications in Phase 5. This doc presents them together, includes Scout chat without a conversational contract, and links every agent’s run cards to a Hermes-specific timeline. Existing `Chat.tsx` is a local placeholder, so reuse is an implementation dependency.  
   **Concrete fix:** Label requirements and acceptance criteria by phase. Start agent chat with Hermes; defer Scout chat until its supported directives are defined. Link run cards to generic run details with executor-specific extensions, and identify shared Chat infrastructure as prerequisite work.

9. **[med] Triage order can bury failures, and live updates can destabilize review.**  
   **Reference:** Rules: “urgent (blocked approvals)” and “urgent first, then newest.”  
   **Why it matters:** Failures have no escalation rule, so an important failed task may sit below routine results. Continuous new arrivals can indefinitely bury older unresolved items; dedupe updates have no defined effect on age or ordering.  
   **Concrete fix:** Separate priority from item kind. Define escalation and aging, display approval deadlines, and specify created versus updated timestamps. Freeze ordering during active review or show a “new items” affordance while retaining the selected item and scroll position.

10. **[med] Pane geometry, typography and action hierarchy are underspecified.**  
    **Reference:** Screen’s filters/list/detail layout; Agent chats’ agent cards and run cards “next to text.”  
    **Why it matters:** Combined with the global rail, three panes can squeeze decision evidence at intermediate widths. No row pitch, type scale, wrapping rules or action ranking prevents dense badges, agent cards and equal-weight buttons from competing with the actual decision.  
    **Concrete fix:** Specify pane minimum widths and collapse behavior, including list-to-detail navigation below 900px and Back restoring position. Establish a density baseline—for example, 48–56px two-line rows, 14px titles, 12–13px metadata and 16–24px pane padding. Give each detail one primary action; place remembered approval separately. Stack expandable run cards within the thread’s reading column.

11. **[med] Glass contrast requirements are not translated into screen-level checks.**  
    **Reference:** Screen and Agent chats; inherited UI system 14.  
    **Why it matters:** Spec 14 already requires text contrast, blur limits and fallbacks, but 07 does not identify how selection, focus, deadlines, muted metadata and approval evidence remain distinguishable over atmospheric glow. A general token promise does not verify those combinations.  
    **Concrete fix:** Add acceptance fixtures at the brightest background positions, selected/hovered states, supported blur layering and opaque/high-contrast fallbacks. Check text at ≥4.5:1 and essential control/focus indicators at ≥3:1. A possible accent is ice blue `#7DD3FC`: calculated contrast is **10.85:1** on opaque `#14161B`, or **11.73:1** for `#0B0C0F` text on that accent. It separates interaction from teal health and amber urgency; actual glass composites still need checking.

12. **[med] Streaming, motion and recovery behavior remain implicit.**  
    **Reference:** `inbox.item` stream; agent replies with “plan then progress”; shared Chat component.  
    **Why it matters:** The document does not define reconnect reconciliation, pending-action feedback, interrupted directives, cancellation or draft preservation. Repeated progress cards and inherited pulse/shimmer effects could also compete with reading. Spec 14’s global states need concrete behavior here.  
    **Concrete fix:** Define submitting, acknowledged, running, waiting approval, interrupted and terminal states. Preserve reply drafts and selection; reconcile missed events after reconnect and retain failed actions for retry. Update progress in place, avoid forced scrolling when reading earlier content, batch screen-reader announcements, and replace ongoing animation with static status under reduced motion.

13. **[med] Desktop notifications have no privacy or delivery contract.**  
    **Reference:** Rules: “Urgent raises a desktop notification”; Open questions.  
    **Why it matters:** Approval titles may reveal commands, project names or personal content on a lock screen. Delivery while the browser is closed is also undefined, despite the Inbox’s “while he was away” purpose.  
    **Concrete fix:** Specify opt-in permission, generic notification text by default, authenticated navigation to details, deduplication and quiet hours. State whether closed-browser delivery requires the later desktop wrapper. Keep pending approvals discoverable in-app when notifications are denied or unavailable.