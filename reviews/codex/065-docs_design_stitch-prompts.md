1. **[high] Agent supervision lacks an approval state.**  
   **Reference:** §4, lines 52–55: “Pause / Stop / Settings” and live tool activity.  
   **Why it matters:** The console depicts execution without showing when Jonas must review a command or diff. This omits the approval banner required by `06-hermes.md` and the explicit approvals in `12-security-and-privacy.md`.  
   **Concrete fix:** Request a `Waiting for approval` variant with exact action, affected project/files or destination, command/diff, Approve/Deny, and timeout. Keep Stop visible and specify that it cancels the current step and pauses the queue.

2. **[high] Automatic file tagging omits the privacy boundary.**  
   **Reference:** §5, lines 62–65: “Local folders,” “auto-generated tags,” and “Ask about this file.”  
   **Why it matters:** The mockup could imply that browsing a folder automatically authorizes model processing. `11-files-and-projects.md` requires explicitly added folders, secret exclusions, and tagging that is opt-in per folder.  
   **Concrete fix:** Include an Add folder/allowlist flow, indexing status, tagging-off state, and explicit consent for model-based tagging. Before sending file content, show the selected files and destination provider. Mark Cloud as v2.

3. **[high] Connections promise capabilities that the project has not established.**  
   **Reference:** §1 line 23; §2 line 35; §6 lines 72–73: universal usage meters, “Connected via subscription,” and “OAuth” / “Local session.”  
   **Why it matters:** `03-connections-and-routing.md` marks several integrations as unverified and permits usage percentages only where exposed. `src/lib/providers.ts` explicitly labels connection data as placeholders. These prompts invite convincing but unsupported account states and ambiguous credential handling.  
   **Concrete fix:** Distinguish verified, unavailable, needs-login, rate-limited, and research-only providers. Show usage as unavailable or local run counts when appropriate. Specify official-client sign-in, no token extraction, and Disconnect as unlinking JunOS without signing out the CLI.

4. **[high] Raw tool output has no redaction or untrusted-content treatment.**  
   **Reference:** §3 line 45; §4 lines 54–55; §5 line 65: expandable logs, tool input/output, and rendered markdown.  
   **Why it matters:** These surfaces can expose credentials, private file contents, and instructions embedded in external content. The security spec requires secret redaction and treats file/web content as untrusted.  
   **Concrete fix:** Require redacted sample logs and outputs, clear source labels, escaped tool output, and safe markdown previews without active embedded content. Visually distinguish agent proposals from quoted external instructions.

5. **[med] The foundation does not describe the chosen glass system accurately.**  
   **Reference:** §0 line 11: solid `#14161B` panels, “subtle glass blur on overlays,” and 10px corners.  
   **Why it matters:** `14-ui-system.md` specifies frosted panels over an atmospheric background, 12px corners, bounded blur nesting, and accessibility fallbacks. Following this prompt would produce a materially different interpretation.  
   **Concrete fix:** State that the settled direction uses translucent glass panels and atmospheric glow. Specify panel opacity, blur, text/surface tokens, nesting limits, and opaque/high-contrast fallbacks. Require text contrast of at least 4.5:1 over the brightest permitted backdrop—not just the base background.

6. **[med] Home gives routine information precedence over decisions.**  
   **Reference:** §1 lines 19–26: six cards led by Quick ask, schedules, and subscriptions.  
   **Why it matters:** The Home spec prioritizes “Needs you,” including blocked approvals, and also includes board and Scout information. The prompt leaves those out and gives account usage equal prominence to active work.  
   **Concrete fix:** Place “Needs you” immediately after Quick ask, with blocked approvals first. Give active or failed runs the next strongest position; make subscriptions and recents secondary. Define the first viewport’s information order explicitly.

7. **[med] Navigation coverage and scope are inconsistent.**  
   **Reference:** §0 line 12 lists separate Files and Projects destinations; §5 combines them. Inbox, Agents, Workflows, Kanban, and Scout have no prompts.  
   **Why it matters:** The current specifications include those destinations, while `src/App.tsx` is an earlier six-route shell. The document does not say whether it describes that shell, a phased subset, or the intended complete product.  
   **Concrete fix:** Declare the target phase and label deferred screens. Align navigation with `14-ui-system.md`, including combined Files/projects behavior, and provide prompts for the screens required by that phase. Keep approval access available wherever execution is shown.

8. **[med] The layout instructions do not resolve density or grid arithmetic.**  
   **Reference:** §1 line 26: “quick ask spans full width … remaining cards in a 3 + 3 masonry”; §2 lines 33–36: fixed 260px and 300px side panes.  
   **Why it matters:** Five cards remain after Quick ask, so “3 + 3” is ambiguous. Masonry also weakens scanning across unrelated operational information. At 1024px, Chat’s rail and side panes leave only 400px before gutters for the thread, composer, table, and code.  
   **Concrete fix:** Specify actual column spans and reading order. Define minimum thread width, pane-collapse priorities, drawer widths, and internal scroll regions. Use aligned rows for overview blocks and let long code/tables scroll within their own containers.

9. **[med] Responsive behavior is optional despite being a product requirement.**  
   **Reference:** Optional follow-ups, line 81: mobile adaptation covers Home only.  
   **Why it matters:** Chat, task drawers, Files previews, and the Hermes split are the layouts most likely to fail on narrow screens or at increased zoom. `14-ui-system.md` already defines a below-900px navigation and sheet transition.  
   **Concrete fix:** Put those rules in the shared foundation: labeled bottom navigation, full-screen sheets for side panels, one active pane at a time, and contained table overflow. Request narrow-screen and 200% zoom checks for every screen.

10. **[med] Typography and spacing are adjectives rather than a usable system.**  
    **Reference:** §0 line 11: “generous spacing” and “dense but calm”; §2 line 34: “small header.”  
    **Why it matters:** Fonts alone do not establish hierarchy. The prompts leave body size, metadata legibility, row pitch, padding, and reading measure to separate generations, encouraging inconsistent density and tiny secondary text.  
    **Concrete fix:** Define a compact scale—for example, 24px page titles, 16px section headings, 14–16px body text, and 12–13px metadata—plus line heights, spacing increments, panel padding, and table row heights. Carry over the spec’s 760px maximum chat reading width.

11. **[med] Accent and semantic colors lack safe usage rules.**  
    **Reference:** §0 line 11: violet `#8B5CF6`, teal for both “running/healthy”; §1 line 21: teal/red status dots.  
    **Why it matters:** Violet text on the specified `#14161B` panel is approximately **4.27:1**; white text on violet is **4.23:1**. Both fall below 4.5:1 for normal text. Running and healthy also describe different states.  
    **Concrete fix:** Consider the existing source accent **blue `#7C9CFF`**, reserving teal for health/success. Blue reaches **6.94:1** against `#14161B`; `#0B0C0F` labels on blue reach **7.50:1**. Avoid white labels on blue (**2.61:1**). These are opaque-color calculations; validate composited glass separately. Pair status colors with text or icons.

12. **[med] Keyboard and nonvisual interaction requirements are missing.**  
    **Reference:** §0 line 12: icon rail and “⌘K”; §2 line 35: popover and segmented control; §6 line 74: drag-to-reorder.  
    **Why it matters:** Icon identification, focus order, popover dismissal, and routing-order changes are underspecified. The shortcut also ignores the project’s Windows environment.  
    **Concrete fix:** Require accessible names and hover/focus tooltips, visible focus indicators, keyboard-operable picker controls, Escape dismissal with focus restoration, and Move up/down alternatives to dragging. Display Ctrl+K on Windows and ⌘K on macOS.

13. **[med] Scheduling omits fields that determine actual execution.**  
    **Reference:** §3 line 45: schedule builder and output destinations.  
    **Why it matters:** No timezone, sleep/catch-up behavior, overlap policy, or save/cancel controls are requested. “08:00” is ambiguous without a timezone, and the destination list omits Inbox despite the task specification.  
    **Concrete fix:** Show Europe/Copenhagen as an editable timezone, timezone-qualified next-run previews, catch-up/overlap settings under Advanced, and explicit Save/Cancel actions. Include Inbox output and a daemon-asleep warning variant.

14. **[med] Happy-path screenshots dominate, with no shared recovery or motion contract.**  
    **Reference:** §4 lines 52–54 request pulsing and shimmer; §6 line 75 requests only one expired-session example.  
    **Why it matters:** First-run, disconnected, stale, loading, partial-failure, and cancelled states are largely absent. Continuous motion can distract during long sessions; reduced-motion behavior is already required by the UI spec.  
    **Concrete fix:** Add a shared state checklist to every prompt: loading, empty with next action, recoverable error, offline daemon, and stale/disconnected data. Request static equivalents for pulse/shimmer under reduced motion, stable live-log scrolling, and clear Cancel/Retry controls for streamed work.