1. **[high] Untrusted content has no shared rendering or privacy contract.**  
   **Reference:** [Components to build once](docs/specs/14-ui-system.md#components-to-build-once): “MarkdownView with code blocks, DiffView.”
   
   **Why it matters:** These components will display model responses, Scout findings and local files. Spec 12 treats that content as untrusted, but this doc does not define HTML sanitization, permitted URL schemes or remote-resource loading. Remote images can disclose that a private document was opened; executable markup can threaten the authenticated UI.
   
   **Concrete fix:** Require escaped text by default, sanitized Markdown, no executable HTML, explicit safe link schemes, and blocked remote images until the user chooses to load them. Keep model/file content visually distinct from trusted application controls.

2. **[high] Approval and emergency-stop controls are missing from the shared system.**  
   **Reference:** [Layout](docs/specs/14-ui-system.md#layout) and [Components](docs/specs/14-ui-system.md#components-to-build-once) specify the shell and reusable controls without either safety surface.
   
   **Why it matters:** [Spec 12](docs/specs/12-security-and-privacy.md#approval-policy) requires exact command/diff review and a switch that stops all runs. Approvals also appear inline on Home and in Inbox. Without a shared presentation contract, those surfaces can expose different evidence or encourage accidental approval.
   
   **Concrete fix:** Add a shared approval component showing project, action class, exact command/diff, affected destination, expiry and decision state. Separate one-time approval from remembered permission. Place a labelled global “Stop all runs” control in the shell, with pending, acknowledged and failed states.

3. **[high] The palette lacks safe foreground/background pairs and control contrast.**  
   **Reference:** [Tokens](docs/specs/14-ui-system.md#tokens-starting-values-match-to-stitch-export-when-available): `--accent: #8B5CF6`, `--border: rgba(255,255,255,0.08)`; “text contrast at least 4.5:1.”
   
   **Why it matters:** Calculated from these values, `--text` on a solid violet accent is **3.46:1**, and violet text on `--panel-strong` over the base background is **3.98:1**. The border against the base glass panel is approximately **1.24:1**—fine for decoration, insufficient if it alone identifies a control boundary. Atmospheric glow introduces further variation.
   
   **Concrete fix:** Define semantic pairs for primary actions, links, selection, status and focus, with separate decorative and interactive borders. A viable alternative accent is **periwinkle blue `#7C9CFF`**, already present in `src/index.css`: **7.50:1** against `#0B0C0F`, and **6.47:1** against the base strong panel. Use dark labels on blue fills and reserve teal for healthy/running states. Validate all pairs over the brightest permitted glow and nested surfaces; these calculations exclude glow.

4. **[med] Glass accessibility and motion fallbacks are named but not specified.**  
   **Reference:** [Token rules](docs/specs/14-ui-system.md#tokens-starting-values-match-to-stitch-export-when-available): “respect `prefers-reduced-motion` and `prefers-contrast`”; opaque fallback only when blur is unsupported.
   
   **Why it matters:** Supporting blur does not mean the user can comfortably read through it. “Respect” leaves implementations free to retain shimmer, pulse and moving glow. [Hermes](docs/specs/06-hermes.md#screen-matches-mockup) explicitly calls for pulsing status and shimmering steps.
   
   **Concrete fix:** Specify opaque surface tokens and a persisted “Reduce transparency” setting. Define increased-contrast and forced-colour behavior. Under reduced motion, remove shimmer, pulse, animated atmosphere and sliding transitions while retaining static progress labels. Establish a small duration scale and prohibit continuously animated blur.

5. **[med] The responsive rules do not resolve the actual multi-pane layouts.**  
   **Reference:** [Layout](docs/specs/14-ui-system.md#layout): “side drawers 360–420 px”; [Responsive](docs/specs/14-ui-system.md#responsive): only a 900 px breakpoint.
   
   **Why it matters:** At 900 px, a 64 px rail and 420 px drawer leave only **416 px before gutters** for the main workspace. Chat also needs a conversation list; Inbox has filters, list and detail. Replacing side panels with sheets below 900 px does not explain what happens to those other panes, wide code blocks, tables or the Kanban board.
   
   **Concrete fix:** Define minimum usable pane widths and collapse panes when those widths cannot be maintained. Specify list→detail navigation with scroll restoration, locally scrolling code/tables, board navigation, sheet stacking, bottom safe-area padding and composer behavior when the phone keyboard opens.

6. **[med] Twelve icon-only destinations create recognition and height problems.**  
   **Reference:** [Layout](docs/specs/14-ui-system.md#layout): “Slim left rail (64 px, icons with tooltips)” with twelve destinations.
   
   **Why it matters:** Agents, Hermes, Workflows, Tasks and Scout are difficult to distinguish by icon alone. Tooltips do not provide persistent labels. At a practical 44 px target pitch, twelve destinations consume 528 px before branding, grouping and padding, making short desktop windows problematic.
   
   **Concrete fix:** Define an expandable labelled rail, destination groups, accessible names and current-page indication. Specify a scrollable navigation region with persistent access to Connections and Settings. Make tooltips available on keyboard focus and define the complete labelled “More” menu on smaller screens.

7. **[med] “Keyboard-first” lacks rules that prevent conflicting or unsafe shortcuts.**  
   **Reference:** [Accessibility and input](docs/specs/14-ui-system.md#accessibility-and-input): “Keyboard-first (list in each spec)” and “ARIA roles.”
   
   **Why it matters:** [Inbox](docs/specs/07-inbox-and-agent-chats.md#screen-matches-mockup) uses `c` to make a card and `a` to approve; [Kanban](docs/specs/09-kanban.md#who-fills-it-and-how) specifies `c` anywhere. Without shared scoping, shortcuts can fire while typing or act on an item whose details are not open. ARIA roles alone do not establish usable keyboard behavior.
   
   **Concrete fix:** Define shortcut precedence and disable single-letter shortcuts in editable fields. Require the reviewed approval to be explicitly active before its shortcut works. Specify native semantics, roving focus where appropriate, dialog focus containment/restoration, Escape behavior, and platform-correct `Ctrl+K`/`⌘K` hints.

8. **[med] Typography, spacing and action hierarchy are too incomplete to produce consistent density.**  
   **Reference:** [Tokens](docs/specs/14-ui-system.md#tokens-starting-values-match-to-stitch-export-when-available) define font families and one radius; [Layout](docs/specs/14-ui-system.md#layout) supplies a grid and a 760 px chat maximum.
   
   **Why it matters:** There are no font sizes, weights, line heights, spacing steps, row heights, gutters or action variants. A 760 px measure says little without typography. Home has eight content groups, while logs and tables need different density; a universal Card risks giving everything equal emphasis.
   
   **Concrete fix:** Add a small role scale—for example, 24/32 page titles, 16/24 section titles, 14/20 UI text and 16/26 chat prose—with rem-based sizing. Define spacing steps, panel padding, row heights, numeric alignment and mono usage. Establish primary/secondary/destructive action treatments and distinguish glance, reading and operational layouts. Keep chat prose near 65–75 characters per line, with separate overflow rules for code.

9. **[med] The state model conflates failures and omits stale or uncertain outcomes.**  
   **Reference:** [States every screen needs](docs/specs/14-ui-system.md#states-every-screen-needs): loading, empty, error, offline daemon and disconnected provider.
   
   **Why it matters:** [Connections](docs/specs/03-connections-and-routing.md#connection-states) distinguishes login expiry, rate limits, unavailable clients and degradation. [Home](docs/specs/10-home-and-search.md#home) requires independent card failures. This doc does not explain whether existing content survives refresh failure or how the UI handles a lost connection after submitting an action. A generic Retry could repeat a workflow that already started.
   
   **Concrete fix:** Separate initial loading, refreshing, stale data, transport reconnection and provider-specific states. Preserve drafts and last-known content with timestamps. Distinguish retrying a read from repeating an action; reconcile action status before offering resubmission. Define live announcements that convey state changes without announcing every streamed token.

10. **[med] The component inventory has no delivery boundary.**  
    **Reference:** [Components to build once](docs/specs/14-ui-system.md#components-to-build-once) puts CommandPalette, DiffView, CronPreview, Kanban and basic controls in one undifferentiated list.
    
    **Why it matters:** [The roadmap](docs/specs/13-roadmap.md#phase-0-foundations-days) targets foundations in days, while the command palette arrives in Phase 4. “Build once” can turn this short system spec into a prerequisite to implement every complex widget before the first real chat path works.
    
    **Concrete fix:** Mark components by first required phase. Establish tokens, shell, basic controls and state primitives first; implement complex components when their first working screen needs them. Add per-component acceptance requirements rather than requiring a complete reusable library upfront.