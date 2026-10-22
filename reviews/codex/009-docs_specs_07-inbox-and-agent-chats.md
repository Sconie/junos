1. **[high] Approval decisions are not bound to an immutable action.**  
   **Reference:** §Rules, lines 21–24; §API sketch, line 30.  
   **Why it matters:** Dedupe can update an item while Jonas reviews it. The action API supplies no revision or pending-state check, so approval could authorize changed content or race with timeout, another tab, or the Hermes console. Spec 12 requires the exact command/diff to be approved.  
   **Fix:** Bind each approval to an immutable action payload, run/step ID, revision and expiry. Resolve it atomically once; reject stale decisions and show the final outcome across both surfaces. Exclude approval payloads from ordinary dedupe updates.

2. **[high] “Approve and remember” has no defined safety boundary.**  
   **Reference:** §Item kinds, line 9.  
   **Why it matters:** The label promises project scope without explaining the action pattern being remembered. Spec 12 says external-send, destructive and spend actions “always ask”; this shortcut could silently override that policy. The rules-management UI is deferred to Phase 4 in spec 13.  
   **Fix:** Define eligible action classes and precedence explicitly. Before saving, show the project, matched action and limits. Defer this option until saved rules can be inspected and revoked; retain one-time approval meanwhile.

3. **[high] Agent handoffs leave context disclosure and execution authority implicit.**  
   **Reference:** §Agent chats, lines 35–40.  
   **Why it matters:** Reusing Chat introduces attached files, project context, history and tool toggles. “Hand a message” does not say which of these cross into another agent or provider, or whether a mention starts execution. This leaves spec 11’s explicit disclosure boundary undefined.  
   **Fix:** Specify the handoff payload and destination: selected message, explicitly selected context, project and effective tool permissions. Show these before dispatch, preserve untrusted-content boundaries, and apply spec 12 independently to subsequent actions.

4. **[high] Retry can repeat completed side effects.**  
   **Reference:** §Item kinds, line 12; §Acceptance criteria, line 46.  
   **Why it matters:** A failed workflow may already have written files or sent an external request. “Working Retry” does not distinguish retrying the failed step from restarting the whole run. Spec 05 explicitly supports retry from the failed step.  
   **Fix:** Define Retry as resuming a specific failed step with preserved inputs and a linked attempt record. Guard against duplicate clicks and automatic retries already in progress. Require reconciliation or renewed approval when an external action’s outcome is uncertain.

5. **[med] The triage lifecycle and API do not cover the promised interface.**  
   **Reference:** §Item kinds; §Screen; §API sketch, lines 29–32.  
   **Why it matters:** Reply, dismiss, mute, save and remembered approval have no contract. “Needs me,” unread and Done lack membership rules; spec 02 distinguishes `new`, `seen`, `snoozed`, `done` and `dismissed`. A successful “Make card” could leave an item actionable indefinitely.  
   **Fix:** Add an action/state matrix defining allowed transitions, source-side effects and badge/filter membership. Specify search, pagination, reconnect reconciliation and action failures. Define whether card creation resolves the item and prevent duplicate cards.

6. **[med] Snoozing an approval conflicts with its timeout.**  
   **Reference:** §Screen, line 17; §Rules, lines 23–24.  
   **Why it matters:** The universal `s` shortcut appears to allow snoozing approvals until next morning, while spec 06 defaults to denial after 30 minutes. The item could expire while hidden, without Jonas understanding that consequence.  
   **Fix:** Display the approval deadline. Disable snooze beyond expiry, or explicitly explain that snoozing does not extend authorization time. Define timezone, daylight-saving behavior and restart recovery for snoozed items.

7. **[med] Agent chat overstates shared capabilities and omits execution controls.**  
   **Reference:** §Agent chats, lines 36–40.  
   **Why it matters:** Scout is specified as a read-only suggestions pipeline in spec 08, yet this doc gives agents a common directive behavior and links their run cards to the Hermes timeline. Chat’s stream cancellation also does not establish how to stop an executing agent.  
   **Fix:** Define capabilities per agent: answer, assess, execute, pause and stop. Keep Scout within its read-only scope. Link cards to agent-neutral run details and expose queue, waiting-for-approval, failure and cancellation states. Clarify whether Hermes console and agent chat share one canonical thread.

8. **[med] The three-pane layout lacks a usable width and navigation contract.**  
   **Reference:** §Screen, line 17; §Agent chats, line 37.  
   **Why it matters:** Filters, list and detail compete with the global rail. Spec 14’s generic fullscreen-sheet rule does not resolve which pane remains visible or how users return. Long titles and command diffs could become unreadably narrow.  
   **Fix:** Specify minimum pane widths, resizing/collapse behavior and separate scroll regions. At constrained widths, use list → detail navigation with preserved selection and scroll. Define wrapping for titles and contained horizontal scrolling for code/diffs.

9. **[med] Keyboard shortcuts can trigger consequential actions while typing.**  
   **Reference:** §Screen, line 17.  
   **Why it matters:** Single-letter approve/deny shortcuts coexist with inline replies and search. The doc does not restrict shortcut scope or distinguish keyboard focus from selected item.  
   **Fix:** Suppress shortcuts in editable controls and dialogs; make character shortcuts disableable or remappable. Define list/detail focus movement and visible selection. Have approval shortcuts open a focused action review rather than authorize immediately.

10. **[med] Visual hierarchy is underspecified where the product needs precision.**  
    **Reference:** §Screen, line 17; §Agent chats, lines 37–38.  
    **Why it matters:** Titles, source icons, ages, priorities, counts, agent cards and run cards are listed without relative emphasis or density. This invites a generic stack of equally prominent glass cards that obscures the triage task. Spec 14 establishes the chosen glass identity, but not this screen’s composition.  
    **Fix:** Preserve that identity while specifying compact aligned list rows, a clear title/body/meta type scale and consistent spacing tokens. Give the selected item and its primary action strongest emphasis; render secondary actions quietly. Use compact expandable run summaries and reserve monospace for commands, code and IDs.

11. **[med] Notifications can become noisy and disclose sensitive information.**  
    **Reference:** §Rules, line 20; §Open questions, line 51.  
    **Why it matters:** Every blocked approval becomes urgent and raises a desktop notification. There is no permission-denied fallback, quiet period, dedupe rule or limit on lock-screen content. Agent-generated titles may contain private project details.  
    **Fix:** Keep an in-app urgency signal independent of OS permission. Default desktop messages to generic text, make previews opt-in, and define rate limits and quiet hours. Keep push/email outside the initial scope until delivery and disclosure rules are specified.

12. **[med] The acceptance criteria conceal several release phases.**  
    **Reference:** §Acceptance criteria, lines 45–48; §Custom agents; §Open questions.  
    **Why it matters:** Spec 13 separates results/failures in Phase 2, Hermes approvals/chat in Phase 3, Scout in Phase 4 and notifications in Phase 5. This document presents them together without marking release boundaries. Existing `src/App.tsx` has no Inbox/Agents routes, and `src/pages/Chat.tsx` is a local placeholder, so “same component” is a future dependency.  
    **Fix:** Label requirements and acceptance criteria by phase. Define the first slice around persisted results/failures, safe retry and loading/empty/error states; add approval races, agent handoffs and Scout behavior to their respective phase gates.