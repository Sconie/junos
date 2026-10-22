1. **[high] Approval identity is not protected against updates or timeout races.**  
   **Reference:** §Rules: “same source+key within 24h updates the existing item”; “Approval timeout auto-denies”; §API sketch.  
   **Why it matters:** Nothing excludes pending approvals from mutable deduplication or binds a decision to the exact action reviewed. A refreshed payload or simultaneous timeout could approve different work or resume a step twice. Spec 12 requires the exact command/diff and an audit trail.  
   **Concrete fix:** Give each approval an immutable action snapshot, project, run/step ID, version and expiry. Show that snapshot prominently. Decide atomically only while pending and unexpired; reject stale versions, make duplicate requests idempotent, and cancel obsolete approvals when their run stops.

2. **[high] “Approve and remember” lacks enforceable boundaries.**  
   **Reference:** §Item kinds, approval actions.  
   **Why it matters:** Spec 12 says external sends, destructive actions and spending “always ask,” while remembered rules could apparently bypass that requirement. The roadmap also postpones the rules management UI until Phase 4, after approvals arrive in Phase 3. Jonas could grant persistent authority without being able to inspect or revoke it.  
   **Concrete fix:** State which action classes can be remembered; preserve fresh approval for the always-ask classes. Preview the exact project and action pattern before saving. Ship inspection and revocation alongside remembered approvals, or defer this action until that UI exists.

3. **[high] Single-letter approval shortcuts are unsafe around inline replies and live sorting.**  
   **Reference:** §Screen: “`a` approve, `d` deny,” “`e` done,” “`s` snooze”; mentions support “Reply inline.”  
   **Why it matters:** The spec does not restrict shortcuts while typing or define whether selection follows focus, row position or item identity. A new urgent item could move the list immediately before a keypress. Done and Snooze also have undefined effects on an approval whose timeout continues running.  
   **Concrete fix:** Disable list shortcuts inside editable controls and during IME composition. Bind actions to a stable selected item ID and version. Require deliberate activation after reviewing a risky approval. Specify that Done never grants permission and Snooze never extends its deadline; define the timeout outcome visibly.

4. **[high] `@agent` delegation has no context or capability boundary.**  
   **Reference:** §Agent chats: “mentions from any normal chat hand a message to that agent”; agents include Scout and custom personas.  
   **Why it matters:** It is unclear whether delegation sends one message, the full thread, attachments, project files or memory—and whether a mention authorizes tools. This creates an accidental disclosure path and an ambiguous escalation from ordinary chat to autonomous work. Scout is explicitly read-only in spec 08.  
   **Concrete fix:** Define a bounded handoff payload and show the recipient, provider and included context before sending. Treat only explicit user-authored mentions as dispatch instructions. Enforce agent capabilities server-side, preserve Scout’s read-only policy, and require normal approval checks for every delegated action. Include cancellation and run provenance.

5. **[high] “Retry” does not specify what work will repeat.**  
   **Reference:** §Item kinds, failure actions; acceptance criterion “a working Retry.”  
   **Why it matters:** Spec 05 permits retrying from a failed workflow step. “Retry” here could instead rerun the whole task, duplicating earlier file writes, external sends or paid operations. A failed response does not establish that an external operation failed to happen.  
   **Concrete fix:** Label the actual operation—such as “Retry failed step”—and show its scope. Create a linked retry attempt, prevent concurrent retries, re-evaluate permissions and invalidate obsolete approvals. For uncertain external outcomes, require reconciliation before repeating the operation.

6. **[med] Full-body rendering and desktop notifications leave privacy handling undefined.**  
   **Reference:** §Screen: “full body”; §Rules: “Urgent raises a desktop notification”; actions include View logs and Save to file.  
   **Why it matters:** Findings and agent output can contain untrusted Markdown, remote images, sensitive paths or secrets. Remote image loading can disclose viewing activity; notification previews can expose private content outside the app. Spec 12’s log redaction does not define these presentation rules.  
   **Concrete fix:** Require a shared sanitized Markdown renderer, disallow executable HTML and unsafe URLs, and block remote media unless explicitly loaded. Default notifications to a generic count with previews opt-in. Redact sensitive output before display/export, and put Save to file behind an explicit destination and overwrite check.

7. **[med] The action contract cannot support the advertised screen.**  
   **Reference:** §Item kinds versus §API sketch, which accepts only `approve|deny|done|snooze|card`.  
   **Why it matters:** Retry, Mute task, Dismiss, Reply, Save to file, Ask Claude and remembered approval have no specified command mapping. Spec 02 also lacks explicit persisted fields for snooze time, dedupe key, update time and approval decisions. Implementations could disagree about which object changes and what survives restart.  
   **Concrete fix:** Add an action matrix specifying applicable item kinds, endpoint, payload, resulting state, audit event and failure behavior. Define durable storage for scheduling and decisions. Distinguish muting notifications from pausing task execution, and make repeated Make card requests return the existing linked card.

8. **[med] Filters, unread counts and automatic completion have no consistent meaning.**  
   **Reference:** §Screen filters; §Rules: “Auto-expire low-priority items after 14 days to Done”; §Events unread badge.  
   **Why it matters:** “Needs me,” All and badge counts have no predicates. Opening an item might mark it seen without resolving it, while auto-expiration makes unreviewed material appear completed. Snooze restoration, deduplication of dismissed items and reconnect reconciliation are unspecified.  
   **Concrete fix:** Define filter predicates and separate unread state from resolution. Record expiry as an explicit reason rather than implying human completion. Specify whether deduped updates reopen items, whether snoozed items retain unread state, and how counts reconcile after reconnect. Add distinct empty, no-results, loading, offline and action-failure states.

9. **[med] The priority rule can bury old blockers and create notification storms.**  
   **Reference:** §Rules: all blocked approvals are urgent; “urgent first, then newest.”  
   **Why it matters:** Routine approval requests can continually overtake older approvals approaching their deadline. Every new urgent item also requests a desktop notification. Live reordering competes with the stable reading and keyboard selection this triage interface needs.  
   **Concrete fix:** Order pending approvals by deadline, then age, with a stable tie-breaker. Define urgency separately from merely needing permission. Batch notifications, suppress repeat alerts for deduped updates, and offer quiet hours. While Jonas is reading, preserve selection and expose new arrivals through a “New items” control.

10. **[med] The three-pane layout has no width budget or usable collapse sequence.**  
    **Reference:** §Screen: left filters, middle list, right detail pane.  
    **Why it matters:** Spec 14 supplies a global rail and a below-900px sheet rule, but this screen adds three working regions without minimum widths. Approval commands and diffs can become unreadably narrow before that breakpoint. “Matches mockup” is not a usable reference: the referenced design directories are absent from this checkout.  
    **Concrete fix:** Specify a desktop budget—for example, 176px filters, a 320px minimum list and a flexible detail pane with a 420px minimum. Collapse filters into a menu when those widths no longer fit; use list-to-detail navigation on narrow screens. Preserve list scroll, selection and focus on Back, and contain horizontal scrolling within code/diff blocks.

11. **[med] The spec lists content but does not establish visual hierarchy or density.**  
    **Reference:** §Screen list fields and detail actions; §Agent chats: each agent gets a status/current-task/last-active card.  
    **Why it matters:** Titles, priorities, ages, counts and source icons could all receive equal emphasis. Approval actions could become three equally prominent buttons. Repeated agent cards can consume the space needed for conversations, while icon-only sources require recognition or hover.  
    **Concrete fix:** Define a compact row recipe: 14–15px semibold title, 12–13px source/project/age metadata, roughly 56–64px rows and consistent 8/12/16px spacing. Use text labels for consequential states and tabular count alignment. Give the detail pane one prominent contextual action, with secondary actions quieter and remembered permission separate. Prefer compact agent group headers unless an agent’s current task needs attention.

12. **[med] Glass contrast and motion requirements are not translated into screen-level acceptance checks.**  
    **Reference:** §Screen and §Agent chats run cards; inherited visual rules in spec 14.  
    **Why it matters:** Spec 14 requires contrast and reduced-motion support, but this spec never identifies the hardest cases: muted metadata over glow, selected rows, approval controls, nested run cards or progress updates. “Plan then progress” could also produce constant animation, scroll movement and screen-reader announcements.  
    **Concrete fix:** Require contrast checks against the brightest composited background, including hover, selected and focus states. Specify 4.5:1 for normal text and 3:1 for essential control/focus indicators. Define an opaque preference fallback, static reduced-motion progress, stable scrolling and concise live announcements; keep repetitive steps collapsed.

    A suitable accent candidate is **blue `#7C9CFF`**, already present in `src/index.css`: it separates interaction from teal health states. On a proposed opaque fallback of `#1C1D20`, its contrast is **6.47:1**; dark `#0B0C0F` labels on blue are **7.50:1**. Light `#E7E8EC` labels on that blue are only **2.13:1**, so filled controls need dark labels. These are calculated solid-colour ratios; glass composites still need verification.

13. **[med] Delivery scope and acceptance criteria do not match.**  
    **Reference:** §Agent chats promises Hermes, Scout and custom personas; §Acceptance criteria contains only three happy paths.  
    **Why it matters:** The roadmap spreads results/failures across Phase 2, approvals/agent chats across Phase 3, Scout/rules management across Phase 4 and notifications across Phase 5. This document presents them as one surface without availability boundaries. Reusing Chat is also substantial work: current `Chat.tsx` has in-memory messages and a placeholder response, and `App.tsx` has no Inbox or Agents routes.  
    **Concrete fix:** Mark each item kind and action with its delivery phase and unavailable-state behavior. Start with results/failures, then add safe approvals and one Hermes thread; defer Scout/custom-agent behavior explicitly. Expand acceptance criteria to cover stale approvals, restart recovery, duplicate retries, typing-safe shortcuts, context boundaries, narrow layouts, glass contrast and reduced-motion behavior.