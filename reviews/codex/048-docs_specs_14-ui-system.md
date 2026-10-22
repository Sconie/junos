1. **[high] Untrusted-content rendering has no safety contract.**  
   **Reference:** “MarkdownView with code blocks, DiffView” — [Components, line 28](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:28).  
   **Why it matters:** These components will display model output and local or retrieved content. The spec does not constrain HTML, URLs, embedded resources, or executable previews. Unsafe rendering could compromise the authenticated daemon client; remote images could disclose viewing activity. This is a specification gap, not an observed exploit in the current plain-text chat.  
   **Concrete fix:** Require raw HTML disabled or sanitized, allowed URL schemes, no automatic remote-resource loading, and isolated previews for active documents. Keep command execution and approval controls outside content-rendering components.

2. **[high] Approval and emergency-stop interfaces are missing from the shared system.**  
   **Reference:** [Components, line 28](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:28) and [Layout, line 25](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:25).  
   **Why it matters:** [Security §Approval policy/Data safety](E:/AI/review-loop/junos/docs/specs/12-security-and-privacy.md:16) requires exact command/diff review, scoped remembered permissions, and a kill switch. Spec 14 defines neither a reusable approval surface nor persistent stop access. Home’s inline approvals and Inbox’s `a` shortcut make consistent review especially important.  
   **Concrete fix:** Specify an ApprovalPanel showing action, target/project, exact command or diff, consequences, expiry, and separately selected permission scope. Distinguish pending, submitted, expired, and denied states. Place “Stop all runs” consistently in the shell, with acknowledged/pending-stop feedback.

3. **[high] The palette lacks safe foreground/background pairings.**  
   **Reference:** `--accent: #8B5CF6`, `--border: rgba(255,255,255,0.08)`, “text contrast at least 4.5:1” — [Tokens, lines 13–22](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:13).  
   **Why it matters:** Calculated from the tokens without atmospheric glow, `--text` on violet is **3.46:1**; violet text on the 4% white panel is approximately **4.28:1**. Both fail the stated requirement for normal text. The border is approximately **1.24:1** against that panel: suitable for decoration, insufficient if it alone identifies an input boundary. An accent focus ring also disappears against an accent-filled control without separation.  
   **Concrete fix:** Define `on-accent`, link, control-border, and focus tokens with explicit pairings. A possible accent is sky blue **#67B7F7**: approximately **8.37:1** as text on the flat panel and **9.03:1** with **#0B0C0F** text on its fill. It separates primary actions from teal health status. Validate final composites over the glow; use an offset or two-colour focus indicator.

4. **[med] “Keyboard-first” delegates to conflicting shortcuts and incomplete interaction rules.**  
   **Reference:** “Keyboard-first (list in each spec)” — [Accessibility, line 34](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:34).  
   **Why it matters:** [Inbox](E:/AI/review-loop/junos/docs/specs/07-inbox-and-agent-chats.md:17) assigns `c` to creating a card from an item, while [Kanban](E:/AI/review-loop/junos/docs/specs/09-kanban.md:18) assigns `c` “anywhere.” The doc also leaves focus containment, restoration, Escape, accessible icon names, and keyboard board movement undefined. The shell advertises only macOS’s `⌘K` despite this Windows workspace.  
   **Concrete fix:** Add a shortcut precedence table; suppress character shortcuts inside editable controls; provide remapping or disabling. Define modal versus nonmodal drawer focus, popover navigation, focus return, keyboard alternatives to dragging, and platform-aware `Ctrl+K`/`⌘K` labels.

5. **[med] One breakpoint does not resolve the application’s multiple-pane layouts.**  
   **Reference:** “Below 900 px … bottom tab bar … side panels become full-screen sheets” — [Responsive, line 37](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:37).  
   **Why it matters:** Chat has conversation, thread, and context panes; Inbox has filters, list, and detail. These can become unusably narrow above 900 px. Below it, merely replacing side panels does not define list/detail navigation, board behaviour, wide tables, or composer clearance above the bottom bar and software keyboard.  
   **Concrete fix:** Define minimum usable pane widths and collapse order per layout. Specify single-pane navigation with Back and preserved selection/scroll; how More exposes remaining routes; table/board overflow; and safe-area, dynamic viewport, and keyboard handling. Include acceptance widths of 390, 768, 1024, and 1440 px plus 200% zoom.

6. **[med] Typography specifies families but no readable hierarchy.**  
   **Reference:** `--font-ui`, `--font-mono`, “max readable line length for chat 760 px” — [Tokens/Layout](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:18).  
   **Why it matters:** A pixel width cannot establish readable measure without font size and line height. Titles, card headings, controls, metadata, prose, and logs have no defined relationships. Dense operational text and long assistant responses need different treatment.  
   **Concrete fix:** Add role-based tokens—for example 24/30 page titles, 16/24 section headings, 14/20 controls and tables, 16/25 chat prose, and 12/16 metadata. Limit prose to roughly 60–75 characters per line while allowing code and tables independent overflow. Specify mono usage, tabular figures, and font-loading/fallback behaviour.

7. **[med] Grid and surface tokens do not establish spacing, density, or priority.**  
   **Reference:** “12-column grid,” `--panel`, `--panel-strong`, and the component inventory — [Layout, line 25](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:25).  
   **Why it matters:** There are no gutters, padding rules, row heights, control sizes, or primary-action conventions. Every component could become an equally prominent frosted box. This particularly affects Home’s eight competing blocks and Tasks’ dense table.  
   **Concrete fix:** Define a 4 px spacing scale, standard page/card padding, section gaps, and compact/comfortable row presets. Assign surface roles to ordinary groups, selected items, and overlays. Give each screen one primary task; make blocked approvals and failures more prominent than routine status. Specify a consistent icon family and readable focus/touch targets.

8. **[med] Glass fallbacks and motion requirements are intentions rather than implementable rules.**  
   **Reference:** “never nested more than two deep,” “solid-colour fallback,” “respect `prefers-reduced-motion` and `prefers-contrast`” — [Rules, line 22](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:22).  
   **Why it matters:** Browser support does not imply that transparency is comfortable or fast. Nesting depth alone does not bound the cost of many large blurred panels. No fallback colours, motion durations, shimmer/pulse behaviour, or contrast-mode mappings are provided.  
   **Concrete fix:** Define opaque panel tokens and a user-selectable reduced-transparency mode; map increased contrast and forced colours explicitly. Set motion durations and reduced-motion replacements for skeletons, status pulses, drawers, and atmospheric effects. Keep the atmosphere static and benchmark blur area/layer count during scrolling and streaming.

9. **[med] The universal state model omits stale data and uncertain action outcomes.**  
   **Reference:** “error (with retry and detail), offline daemon … ‘junosd not running’” — [States, line 31](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:31).  
   **Why it matters:** A lost connection does not establish that the daemon stopped. Authentication failure, reconnecting, stale data, and an unavailable provider require different recovery. A generic Retry after an uncertain run submission or approval could repeat an action. [Home](E:/AI/review-loop/junos/docs/specs/10-home-and-search.md:14) also requires independent card failures.  
   **Concrete fix:** Separate transport, authentication, provider, and operation states. Preserve useful data with freshness timestamps; localize partial errors. For uncertain mutations, reconcile operation status before offering resubmission. Define redacted, user-readable error details and announced status changes.

10. **[med] The component list and shell have no phased delivery contract.**  
    **Reference:** “Components to build once” and the full navigation/top bar — [lines 25–28](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:25).  
    **Why it matters:** [Roadmap](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:5) expects all screens on mock data in Phase 0 “days,” while command palette functionality arrives in Phase 4. The spec does not distinguish lightweight mock surfaces from complete shared components. This encourages premature infrastructure or controls that appear operational before they are wired.  
    **Concrete fix:** Mark component and shell capabilities by phase. Define visibly identified mock data, unavailable-action behaviour, and minimum component acceptance criteria. Build shared abstractions when the first real flow needs them.

11. **[low] The visual authority cannot be inspected from the referenced paths.**  
    **Reference:** `/design/stitch-glass/`, `/design/stitch-softdark/`, and “match to Stitch export when available” — [Direction/Tokens](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:3).  
    **Why it matters:** Those reference directories are absent from this checkout; `public/` contains only the favicon. The available Stitch prompt describes different panel values and navigation. “Hand-match first” therefore leaves execution dependent on an unavailable reference.  
    **Concrete fix:** Add accessible, versioned reference captures and identify which values this spec overrides. Record desktop and narrow-screen examples with annotations for hierarchy, glass opacity, spacing, and interaction states.