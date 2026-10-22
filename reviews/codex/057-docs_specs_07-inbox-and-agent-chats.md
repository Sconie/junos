1. **[high] Approval contents can change while Jonas is reviewing them.**  
   **Reference:** §Rules: “same source+key within 24h updates the existing item”; “Approval timeout auto-denies.”  
   **Why it matters:** An approval could display one command and authorize a newer payload. Inbox, Hermes console, and timeout processing can also resolve the same request concurrently.  
   **Concrete fix:** Bind approvals to an immutable action payload, project, run step, version/hash, and expiry. Changed actions require fresh approval. Resolve approval or timeout atomically and once; stale clients must refresh. Show the exact command/diff required by [12-security-and-privacy.md](E:/AI/review-loop/junos/docs/specs/12-security-and-privacy.md:25).

2. **[high] “Approve and remember” has no permission boundary.**  
   **Reference:** §Item kinds, approval actions.  
   **Why it matters:** This action is offered for every approval, while security §Approval policy says external-send, destructive, and spend actions “always ask.” The spec never resolves whether remembered permission overrides that rule. Revocation controls are also deferred to Phase 4.  
   **Concrete fix:** Explicitly exclude always-ask classes from remembered approval. For eligible actions, preview the exact project and action pattern being authorized. Defer this option until rules can be inspected and revoked.

3. **[high] Agent mentions leave context disclosure and authority undefined.**  
   **Reference:** §Agent chats: “`@agent` mentions from any normal chat hand a message to that agent.”  
   **Why it matters:** The receiving agent might use another provider, retain memory, or possess broader tools. It is unclear whether it receives one message, attachments, project files, or the whole conversation. Scout is explicitly read-only elsewhere, but a chat directive has no stated capability boundary.  
   **Concrete fix:** Define a handoff envelope containing explicit message content and selected attachments only. Show the receiving agent/provider and context before sending; exclude history and memory by default. Preserve agent-specific tool restrictions and attribute returned messages to their agent, provider, and run.

4. **[high] “Working Retry” can repeat completed side effects.**  
   **Reference:** §Item kinds, failure actions; §Acceptance criteria: “a working Retry.”  
   **Why it matters:** A failed workflow may already have written files or sent something. [05-tasks-and-workflows.md](E:/AI/review-loop/junos/docs/specs/05-tasks-and-workflows.md:47) permits retrying from a failed step, but this doc does not distinguish that from restarting the entire run.  
   **Concrete fix:** Label the retry target and show completed steps. Resume only eligible failed steps, prevent concurrent duplicate attempts, and require fresh approval where needed. An uncertain external outcome must offer inspection before replay.

5. **[high] Single-letter approval shortcuts are unsafe without focus and selection rules.**  
   **Reference:** §Screen: “`a` approve, `d` deny”; §Rules: “urgent first, then newest.”  
   **Why it matters:** Typing an inline reply could trigger actions. Incoming items can reorder the queue between reviewing a row and pressing its shortcut.  
   **Concrete fix:** Disable shortcuts inside editable controls, menus, dialogs, and IME composition. Make approval shortcuts open the selected request for review. Preserve selection by immutable item ID, keep incoming arrivals from moving the active target, and provide visible focus plus shortcut help.

6. **[high] Untrusted item bodies lack a safe presentation contract.**  
   **Reference:** §Screen: “full body”; §Item kinds: results, findings, “Open,” and “Save to file.”  
   **Why it matters:** Agent and feed content can contain misleading approval instructions, executable markup, tracking images, or dangerous links. The general prompt-injection policy does not specify renderer behavior or distinguish trustworthy controls from generated content.  
   **Concrete fix:** Require sanitized Markdown, restricted URL schemes, blocked remote images by default, and inert command examples. Put authoritative approval details and controls outside the content renderer. Save through a destination picker with path validation and overwrite handling.

7. **[med] The queue’s lifecycle and API do not support its promised actions.**  
   **Reference:** §Item kinds, §Screen, and §API sketch.  
   **Why it matters:** Dismiss, Reply, Retry, Mute, Save, and remembered approval have no contract. “Needs me,” unread, seen, and done are undefined. The schema has no explicit snooze deadline or dedupe key. “Auto-expire” actually means moving to Done, which could be mistaken for deletion.  
   **Concrete fix:** Add a kind-by-action transition table, filter/count definitions, required fields, and response/error shapes. Separate reading, resolving, dismissing, and approval decisions. Define timezone-aware snooze behavior and explicitly describe 14-day handling as archival rather than deletion.

8. **[med] Event streaming does not define recovery or consistent counts.**  
   **Reference:** §API sketch: “Events `inbox.item` stream to the UI for the unread badge.”  
   **Why it matters:** A badge-only update leaves list contents, details, filters, and approvals potentially inconsistent. Reconnection or a second tab can leave already-resolved requests actionable.  
   **Concrete fix:** Define an initial snapshot, event IDs and item versions, reconnect replay or refetch, and updates for every lifecycle transition. Reconcile counts from server state. Show stale/offline status and block approval until current state is confirmed.

9. **[med] One undivided feature set spans several delivery phases.**  
   **Reference:** §Item kinds, §Agent chats, and §Acceptance criteria.  
   **Why it matters:** The document combines results/failures, Hermes approvals, Scout findings, remembered rules, and notifications. [13-roadmap.md](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:16) distributes these across Phases 2–5, while only three happy-path acceptance checks cover the combined scope.  
   **Concrete fix:** Label capabilities and acceptance criteria by phase: results/failures first, Hermes approvals and chats next, Scout and rule management later. Include timeout, stale approval, duplicate retry, and reconnect checks in the relevant phase.

10. **[med] The three-pane layout lacks hierarchy, density, and responsive specifications.**  
    **Reference:** §Screen: “Left filters … Middle list … Right detail pane.”  
    **Why it matters:** Nine filters with counts, repeated metadata, and several equally prominent actions can overwhelm the triage task. “Matches mockup” supplies no specific Inbox artifact to resolve typography or spacing. The global below-900px sheet rule does not define this screen’s navigation.  
    **Concrete fix:** Specify a layout budget—for example, 176px filters, a minimum 320px list, and flexible detail space with consistent 16px gutters. Start with 56–64px two-line rows, 14px titles, 12–13px metadata, and 16px detail text. Separate active queues from archive filters and show one primary action per item. Collapse panes when minimum widths fail; detail Back must restore selection and scroll.

11. **[med] Glass has no Inbox-specific state and contrast contract.**  
    **Reference:** §Screen; inherited [14-ui-system.md](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:22).  
    **Why it matters:** The shared spec already requires contrast and fallbacks, but this document does not distinguish selected, focused, unread, urgent, and disabled states over atmospheric backgrounds. A faint glass border cannot carry all those meanings.  
    **Concrete fix:** Define separate selection fills, focus rings, urgency labels, and text-bearing surface treatments. Verify text at 4.5:1 and essential control/focus indicators at 3:1 against their actual surroundings, including the brightest glow and opaque fallback. An optional **sky-blue accent `#60A5FA`** separates interaction from teal health, amber warning, and red failure: it measures approximately **7.12:1 on opaque `#151619`**; dark `#0B0C0F` labels on blue measure **7.69:1**. White labels on that blue measure only **2.54:1**. These are solid-colour calculations; composited glass needs separate verification.

12. **[med] Live agent cards have no motion or reading-stability rules.**  
    **Reference:** §Agent chats: status cards, run cards, “plan then progress.”  
    **Why it matters:** Repeated progress updates can expand cards, steal scroll position, and create persistent animation across several agents. The global reduced-motion requirement does not define what becomes static.  
    **Concrete fix:** Update run cards in place, collapse verbose steps, and auto-scroll only while the reader remains at the bottom. Otherwise show “New activity.” Use brief feedback transitions; replace pulses and shimmers with static labels under reduced motion. Keep readable opaque surfaces when transparency is reduced or unavailable.

13. **[med] Urgent notifications risk both disclosure and notification fatigue.**  
    **Reference:** §Rules: “Urgent raises a desktop notification”; §Open questions: desktop versus push/email.  
    **Why it matters:** Treating every blocked approval as urgent can produce repeated interruptions. Notifications may expose commands, paths, or private message content on the lock screen. Permission-denied and unavailable desktop delivery are unspecified.  
    **Concrete fix:** Default to a generic notification such as “JunOS needs approval,” with sensitive previews opt-in. Coalesce repeats, define quiet hours and escalation, and keep Inbox as the reliable fallback. Clicking a notification should open and refresh the request before any action.