1. **[high] Untrusted content has no safe rendering contract.**  
   **Reference:** [Components, line 28](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:28): “MarkdownView with code blocks, DiffView.”  
   **Why it matters:** Chat, file previews, and agent output contain untrusted content. The spec leaves HTML, executable URLs, remote images, and embedded documents undefined. Remote images can disclose viewing activity; unsafe rendering could expose the authenticated UI. This is a gap against the threat model in `12-security-and-privacy.md`.  
   **Fix:** Require escaped code/diffs, raw HTML disabled or sanitized, an explicit URL-scheme allowlist, and remote media blocked until requested. Define isolated PDF previews and safe external-link handling. Apply the contract to every preview surface.

2. **[high] Required safety controls are missing from the shared UI system.**  
   **Reference:** [Layout and components, lines 25–28](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:25).  
   **Why it matters:** `12-security-and-privacy.md` requires a UI kill switch and approvals showing exact commands/diffs. Neither has a shared component or placement rule here. Home also offers inline approvals (`10-home-and-search.md`), so different screens could present materially different decision information.  
   **Fix:** Specify a persistent “Stop all runs” control, pending/confirmed/failure states, and one shared approval component. Show the action, target project/path or recipient, command/diff, and scope of any remembered permission before approval. Require equivalent access from mobile sheets.

3. **[high] Glass accessibility requirements lack concrete fallback surfaces and acceptance cases.**  
   **Reference:** [Glass rules, line 22](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:22): “solid-colour fallback” and “text contrast at least 4.5:1.”  
   **Why it matters:** The fallback has no specified colour. Feature detection covers unsupported blur, but provides no opaque option when blur is supported. Contrast also depends on the glow, underlying content, and permitted nesting. The supplied border composites to approximately **1.24:1** against the plain panel over `--bg`; that is insufficient wherever the border alone identifies an interactive control.  
   **Fix:** Define opaque panel/popover tokens, a user-selectable reduced-transparency mode, and explicit higher-contrast/forced-colour behavior. Specify text and control-indicator contrast separately. Verify plain, glow-backed, nested, and fallback surfaces; decorative dividers can remain subtle.

4. **[med] The palette defines colours without defining safe foreground/background pairs.**  
   **Reference:** [Colour tokens, lines 15–16](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:15).  
   **Why it matters:** There is no `on-accent`, link, selection, or destructive-action pairing. `--text` on the current violet accent measures **3.46:1**, below the doc’s own text requirement. Existing CSS already uses accent fills for selected effort buttons and user messages, making these pairings consequential during adoption.  
   **Fix:** Specify semantic pairs and their permitted uses. One alternative is **clear blue `#73B8FF`**, keeping teal for success and amber/red for warnings/errors: it separates interaction from status and gives **9.34:1** against `#0B0C0F`. Use that dark colour for text on blue-filled controls; light text on this blue is only **1.71:1**. Recheck translucent variants after compositing.

5. **[med] Twelve icon-only destinations have no discoverability or short-window strategy.**  
   **Reference:** [Layout, line 25](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:25): “64 px, icons with tooltips.”  
   **Why it matters:** Agents, Hermes, Tasks, and Workflows are difficult to distinguish through icons alone. Twelve 44px targets already consume 528px before gaps and shell chrome. Tooltips do not resolve touch access or explain how navigation behaves in a short desktop window.  
   **Fix:** Define an expandable labelled rail, accessible names, focus-triggered tooltips, a non-colour current-page marker, and scrolling for the main destinations while keeping utility links reachable. Specify labels and ordering inside mobile “More.”

6. **[med] The responsive rule handles navigation but leaves working layouts unresolved.**  
   **Reference:** [Responsive, line 37](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:37), plus the 360–420px drawers in Layout.  
   **Why it matters:** Chat has conversation/thread/context panes; Inbox has filters/list/detail. At widths just above 900px, these compete for space. Below that threshold, full-screen sheets alone do not define back navigation, keyboard clearance, table overflow, or Kanban access.  
   **Fix:** Define minimum pane widths and collapse panes when those widths cannot be maintained. Specify single-pane list/detail navigation with preserved scroll position, safe-area padding, a composer above the virtual keyboard, contained table/code scrolling, and a mobile Kanban column selector.

7. **[med] Typography, spacing, density, and action hierarchy remain unspecified.**  
   **Reference:** [Tokens and Layout, lines 5–25](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:5).  
   **Why it matters:** Two font families, one radius, and a 12-column grid do not establish a consistent operational interface. There are no font sizes, weights, line heights, gutters, row heights, or primary-action rules. “760 px” also does not establish readable text measure without typography.  
   **Fix:** Add a small type and spacing scale—for example, 16/24px reading text, 14/20px operational text, 12/16px metadata, and 24/32px page titles; spacing steps of 4/8/12/16/24/32px. Define comfortable/compact row pitches, tabular numerals, grid gutters, a chat measure around 65–75 characters, and one visually dominant action per working region.

8. **[med] “Keyboard-first” lacks the interaction contracts needed by the listed components.**  
   **Reference:** [Accessibility, line 34](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:34): “Keyboard-first (list in each spec).”  
   **Why it matters:** Most screen specs do not supply complete keyboard behavior. ARIA roles alone do not define focus placement, modal trapping, focus restoration, or picker navigation. Streaming output and toasts also need announcement rules.  
   **Fix:** Define shared keyboard behavior for dialogs, drawers, tooltips, segmented controls, pickers, and the command palette. Include Escape dismissal, focus restoration, named icon controls, status announcements without announcing every streamed token, and platform-aware `Ctrl+K`/`⌘K` hints.

9. **[med] The universal state list conflates initial loading, refresh, and uncertain execution.**  
   **Reference:** [States, line 31](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:31): “Loading (skeleton)” and “error (with retry and detail).”  
   **Why it matters:** Skeletons during refresh can erase useful context. A lost daemon connection does not establish that a task stopped, and retrying a mutation can repeat an action. `04-chat.md` also requires streaming cancellation with partial output retained, which this shared state model omits.  
   **Fix:** Separate initial loading, refreshing, stale data, reconnecting, running, waiting approval, cancelled, and failed states. Preserve existing content and drafts. Reconcile run state before offering another execution; expose diagnostic details only after redaction.

10. **[med] Motion and blur performance rules cannot be verified as written.**  
    **Reference:** [Glass rules, line 22](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:22): “never nested more than two deep (performance)” and “respect `prefers-reduced-motion`.”  
    **Why it matters:** Nesting depth does not bound the area or number of blurred surfaces. A large scrolling panel can cost more than several small ones. “Respect” leaves animated atmosphere, skeleton shimmer, drawer transitions, and streaming auto-scroll undefined.  
    **Fix:** Keep atmospheric glow static, prohibit blur/filter animation, and define short transition tokens. For reduced motion, remove translation, shimmer, and decorative movement. Specify auto-scroll only while the reader remains at the bottom, plus a representative scrolling test on the intended hardware.

11. **[med] The component catalogue has no phase boundary or migration contract.**  
    **Reference:** [“Components to build once,” line 28](/E:/AI/review-loop/junos/docs/specs/14-ui-system.md:28), and the command field in Layout.  
    **Why it matters:** The list combines Phase 1 chat needs with later Kanban, workflow, and search features. The roadmap places the command palette in Phase 4. Existing code also uses `--muted`, a 220px labelled sidebar, and a 720px breakpoint, while this document introduces different names and dimensions without mapping them. This invites premature component work and partial token adoption.  
    **Fix:** Assign each component and shell affordance a first-use phase; build shared components when their first real screen needs them. Define how unavailable destinations behave, and add a concise migration mapping for token names, navigation labels/routes, and breakpoints.