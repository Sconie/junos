1. **[high] Deduplication can change an approval while it is being reviewed.**  
   **Reference:** Rules, line 21: “same source+key within 24h updates the existing item”; Rev 2, lines 55–57.  
   **Why it matters:** Freezing list order does not freeze the selected action. A later request could replace its body or target while the approval control still references an earlier gateway record. The spec does not define an immutable Inbox-to-approval binding.  
   **Concrete fix:** Exempt approvals from generic deduplication. Bind each approval item to one immutable `approval_id` and action digest. Changed arguments create a new approval and visibly supersede the old item; repeated delivery of the same approval updates delivery metadata only.

2. **[high] Agent mentions leave the context and session boundary undefined.**  
   **Reference:** Agent chats, line 40: “`@agent` mentions from any normal chat hand a message to that agent.”  
   **Why it matters:** It is unclear whether this sends only the selected message, the conversation history, attachments, or project files. Spec 06 also says Hermes uses the same session and memory as Telegram. Separate-looking JunOS threads could therefore share private context unexpectedly. Specs 04 and 12 require explicit provider boundaries.  
   **Concrete fix:** Define the exact handoff payload, destination provider, project and session mapping. Show these before sending; default to the selected message only. Label shared Hermes sessions and apply the originating conversation’s provider restrictions to handoffs and replies.

3. **[high] Telegram authorization is specified, but outbound privacy is not.**  
   **Reference:** Open questions, line 51: urgent items are pushed through a separate bot “with Approve/Deny inline buttons.”  
   **Why it matters:** Checking Jonas’s numeric ID protects who can answer; it does not determine which private titles, paths, diffs or message bodies leave the machine. Nor does every urgent item necessarily represent an approval.  
   **Concrete fix:** Specify a minimal, redacted notification payload and configurable preview privacy. Offer decision buttons only for pending gateway approvals. When the exact action cannot be safely and completely reviewed in Telegram, provide an authenticated “Review in JunOS” link instead. Bind callbacks to the approval record and recheck status at decision time.

4. **[med] “Working Retry” does not define safe recovery.**  
   **Reference:** Item kinds, line 12; acceptance criterion, line 46.  
   **Why it matters:** A failed run may already have completed side effects. Spec 05 requires persisted step recovery and fresh approval where applicable; spec 07 does not connect Retry to those rules or explain retries after the automatic attempt cap.  
   **Concrete fix:** Define Retry as a server-validated recovery request showing the failed step, completed effects and resumption point. Specify exhausted-attempt behavior, prevent duplicate submissions, and require fresh approval for repeated protected actions. Add acceptance cases for partial completion and repeated clicks.

5. **[med] Done, Snoozed, unread and “Needs me” lack a coherent state contract.**  
   **Reference:** Screen, line 17; Rules, lines 22–24; API sketch, lines 29–32.  
   **Why it matters:** `e` can apparently mark an approval Done while its run remains blocked. Snoozing can hide it past expiry. “Needs me” and badge counts have no defined predicates. The schema in spec 02 also has no explicit snooze deadline or dedupe key.  
   **Concrete fix:** Add a transition table separating presentation state from approval state. Pending approvals must remain discoverable until resolved; snoozing must not extend expiry. Define filter/count predicates, persisted snooze deadlines and timezone behavior, including what happens when a snoozed item receives an update.

6. **[med] The advertised actions exceed the API contract.**  
   **Reference:** Item kinds, lines 9–14 versus API sketch, line 30.  
   **Why it matters:** Reply, Retry, Mute task, Save to file, Dismiss and Approve-and-remember have no request contract. Several create side effects or lasting policy changes; a generic action endpoint leaves validation, permission checks and failure behavior ambiguous.  
   **Concrete fix:** Map every visible action to a typed request or referenced existing endpoint. Define eligibility, gateway handling, pending/error states and repeat-request behavior. “Approve and remember” must preview its bounded rule before submission; Save to file must use the file-write policy.

7. **[med] The three-pane layout has no usable width or reading hierarchy specification.**  
   **Reference:** Screen, line 17; agent run cards, line 38.  
   **Why it matters:** Filters, a multi-field list and a full approval diff compete for width. Spec 14 supplies a grid and a below-900px sheet rule, but neither determines when this particular layout becomes unreadable. “Matches mockup” provides no identifiable Inbox reference in `docs/design/stitch-prompts.md`.  
   **Concrete fix:** Specify pane minima and collapse filters before squeezing the action detail. For example, reserve approximately 200px for filters, 320px for the list and 480px for detail, plus shell and gutters; switch layouts when that budget fails. Define row pitch, spacing and type roles—such as 14px titles, 12–13px metadata, 16px detail text—and make run cards compact summaries with expandable evidence.

8. **[med] Glass safety rules lack Inbox-specific acceptance checks.**  
   **Reference:** Screen, line 17; shared ApprovalCard requirement, line 55.  
   **Why it matters:** Spec 14 already requires opaque fallbacks, reduced motion and contrast checks. Spec 07 does not establish how those guarantees apply to dense metadata, selection, keyboard focus, diffs and expiry updates across multiple glass panes. Token-pair tests alone do not cover every composited background.  
   **Concrete fix:** Require visual checks over the brightest atmospheric background and permitted glass layering: readable metadata, distinct selection and focus, and sufficient control contrast. Use an opaque backing for critical action text where needed. Test opaque/high-contrast modes and reduced motion; prohibit pulsing urgency and animated list movement during review.

9. **[med] Keyboard shortcuts and live updates can disrupt editing and review.**  
   **Reference:** Screen, line 17; Rev 2, line 55.  
   **Why it matters:** Scoping Approve/Deny is useful, but `e`, `s`, `c`, `/` and `j/k` still have no scope around inline replies or search. Spec 09 separately assigns `c` globally. Frozen sorting also leaves selection, focus and scroll behavior undefined when the selected item resolves remotely.  
   **Concrete fix:** Define shortcut precedence and disable single-letter commands in editable controls. Specify list/detail focus transfer, focus return after actions and stable selection by item ID. Announce remote resolution without moving focus; announce expiry transitions rather than every countdown tick.

10. **[med] Delivery scope and acceptance criteria mix several roadmap phases.**  
    **Reference:** Agent chats, lines 35–43; acceptance criteria, lines 45–48.  
    **Why it matters:** Spec 13 places the basic Inbox in Phase 2, Hermes/Telegram/agent chats/Kanban in Phase 3 and Scout in Phase 4. This document presents their combined actions without phase labels, while its acceptance criteria cover only three happy paths.  
    **Concrete fix:** Add a phase matrix within this document and hide unavailable sources/actions until their dependencies ship. Keep Phase 2 acceptance independent of Hermes. Add explicit cases for approval races, expiry during snooze, reconnect/resync, failed mutations, safe retry and keyboard review.