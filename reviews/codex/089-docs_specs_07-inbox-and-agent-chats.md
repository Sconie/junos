1. **[high] Approval updates can invalidate what Jonas reviewed.**  
   **Reference:** Rules: “same source+key within 24h updates the existing item”; approval timeout; API sketch.  
   **Why it matters:** An approval’s payload could change while its detail pane is open. Inbox and Hermes console can also resolve the same request, while timeout races with approval. No revision check or atomic resolution is specified.  
   **Fix:** Bind each approval to an immutable command/diff, project, run, step, revision and expiry. Resolve atomically through one daemon service shared with the console; reject stale or expired decisions and make repeated submissions idempotent. Exclude approvals from ordinary deduplication.

2. **[high] “Approve and remember” ships without a reviewable permission boundary.**  
   **Reference:** Item kinds, approval actions.  
   **Why it matters:** [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) requires an exact command/diff and visible, revocable scoped rules. This doc provides neither the permission preview nor its management path. The roadmap defers the approval-rules UI until Phase 4, after approvals arrive in Phase 3.  
   **Fix:** Specify a trusted approval header showing project, action class, target and exact operation, separate from agent-authored explanation. Make remembering a secondary action that previews the precise rule. Gate it until rule inspection and revocation exist, and clarify which action classes may be remembered.

3. **[high] Agent mentions have no context-disclosure or execution contract.**  
   **Reference:** Agent chats: “`@agent` mentions from any normal chat hand a message to that agent.”  
   **Why it matters:** It is unclear whether this forwards one message, conversation history, attachments or project files—and whether it requests advice or starts autonomous work. Scout is explicitly read-only in [08-scout.md](docs/specs/08-scout.md), whereas this doc gives agents a general directive interface.  
   **Fix:** Define exactly what gets forwarded and show recipient, context and project before sending. Distinguish “ask” from “delegate”; enforce each agent’s capabilities and the approval policy server-side. Define unavailable-agent, cancellation and response-attribution behavior.

4. **[high] “Working Retry” can repeat completed side effects.**  
   **Reference:** Failure actions and acceptance criteria.  
   **Why it matters:** [05-tasks-and-workflows.md](docs/specs/05-tasks-and-workflows.md) permits retrying from a failed step. This doc does not distinguish that from restarting the entire run, or handle an external operation that succeeded before its response was lost.  
   **Fix:** Specify the retry boundary and show it beside the action. Create a linked attempt, prevent duplicate submissions, preserve completed steps and require reconciliation before repeating an operation with an unknown outcome.

5. **[med] The Inbox state model is incomplete and mixes unrelated dimensions.**  
   **Reference:** Screen filters, Rules and API sketch.  
   **Why it matters:** “Needs me,” unread, kind and lifecycle status have no defined relationship. The data model includes `dismissed`, but this doc offers no dismissed view. It also leaves unclear whether `e` can hide a pending approval, whether snoozing affects its deadline, and whether an updated Done item reopens. Automatic expiry to Done implies completion without review.  
   **Fix:** Define a transition table and exact filter/count predicates. Keep approval resolution separate from triage status; preserve its deadline during snooze. Distinguish automatic archival from user completion, provide access to dismissed items, and define “next morning” using the configured timezone.

6. **[med] The API sketch cannot support several promised actions or reliable badge updates.**  
   **Reference:** Item kinds versus `POST /inbox/:id/action`; `inbox.item` events.  
   **Why it matters:** Reply, Retry, Mute task, Save to file, Dismiss, Ask Claude and remembered approvals have no stated endpoint or delegation path. The list query lacks pagination and search semantics. A disconnected event stream can leave counts stale.  
   **Fix:** Map each visible action to a typed request or referenced API, including validation and errors. Define paginated queries, server-derived counts, event revisions and reconnect/refetch behavior. Specify safe destination selection and overwrite handling for Save to file.

7. **[med] Untrusted detail content and desktop notifications lack surface-specific privacy rules.**  
   **Reference:** “full body,” View logs, Ask Claude, and “Urgent raises a desktop notification.”  
   **Why it matters:** Findings and logs can contain hostile markup, private paths or secrets. Notification previews can expose sensitive material outside the app; Ask Claude can disclose a finding to a provider without defining the transmitted content. General guardrails in spec 12 do not settle these presentation choices.  
   **Fix:** Require sanitized Markdown, inert embedded content, safe link schemes and redacted logs. Default notifications to generic wording with opt-in previews. Show the context sent to Claude and carry its untrusted-source designation into chat.

8. **[med] The three-pane layout has no dimensional or responsive contract.**  
   **Reference:** “Screen (matches mockup).”  
   **Why it matters:** No specific Inbox mockup is identified. Filters, list and full-body detail must share space with the global shell, but minimum widths, scroll ownership and collapse behavior are absent. Spec 14’s full-screen-sheet rule does not define navigation back to the selected list item.  
   **Fix:** Name the reference artifact and specify pane minimums, resizing and collapse order. On narrow screens, show list or detail with Back restoring selection and scroll. Define independent scrolling and keep detail actions visible without covering content.

9. **[med] Row hierarchy, typography and action emphasis are underspecified.**  
   **Reference:** “title, source icon, age, priority” and “the actions above.”  
   **Why it matters:** A source icon does not explain the project or requested decision. Giving every blocked approval urgent priority creates a flat hierarchy; newest-first ordering can bury the earliest deadline. Equal treatment of Approve, Deny and persistent authorization weakens informed decisions.  
   **Fix:** Specify a consistent two-line row: 14px semibold title, 12–13px source/project metadata, aligned age or deadline, and textual status. Start with 56–64px rows and consistent 8px spacing increments. Distinguish selected, unread and keyboard-focused states. Order pending approvals by deadline, and separate persistent authorization from the immediate decision.

10. **[med] Glass execution has no Inbox-specific legibility or motion checks.**  
    **Reference:** Screen and acceptance criteria; inherited UI system in [14-ui-system.md](docs/specs/14-ui-system.md).  
    **Why it matters:** Spec 14 already requires contrast and fallbacks, but this doc never applies them to dense metadata, selected rows, approval diffs or nested run cards. The current source uses opaque panels, so it cannot establish the intended glass result.  
    **Fix:** Add acceptance checks over the brightest atmospheric background, including muted text, focus and selection. Specify stronger backing beneath dense detail content, opaque/contrast fallbacks, and static reduced-motion states for progress and activity. An optional accent is the incumbent blue `#7C9CFF`: it separates interaction from teal health and amber warning, with **7.50:1** contrast against dark button text `#0B0C0F`. By comparison, `#E7E8EC` text on the proposed violet fill gives **3.46:1**. Recheck all translucent composites.

11. **[med] Keyboard shortcuts can trigger decisions while composing.**  
    **Reference:** Screen: `a` approve, `d` deny, `e` done, `c` make card, `/` search.  
    **Why it matters:** Inline replies and shared chat introduce editable fields. Unscoped handlers could approve an item while Jonas types. Spec 09 also assigns `c` globally, creating an explicit shortcut collision. Live sorting can move the selection beneath the user.  
    **Fix:** Scope shortcuts to the focused Inbox list and suppress them in editable controls and dialogs. Preserve selection by item ID during updates; announce new arrivals without stealing focus. Define focus transfer into detail, return behavior, visible shortcut help and screen-reader announcements.

12. **[med] Delivery scope and acceptance criteria do not match the promised surface.**  
    **Reference:** Agent chats, Custom agents, Open questions and Acceptance criteria.  
    **Why it matters:** The roadmap spreads results/failures, approvals/agents and Scout across Phases 2–4, while this document presents them together. Custom personas are v2 but appear among the initial chat targets; notifications are mandatory in Rules yet deferred in the roadmap. Three happy-path checks leave these boundaries unresolved.  
    **Fix:** Label features by phase and define which agent targets actually execute directives. Gate unavailable actions with clear explanations. Add acceptance cases for stale approvals, timeout races, retry duplication, restart/reconnect recovery, failed actions retaining user input, narrow layouts, keyboard use and glass accessibility.