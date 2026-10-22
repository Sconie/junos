1. **[high] Approval shortcuts can activate while the action is hidden.**  
   **Reference:** [Shared components, line 28](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:28): “exact action or diff … expandable”; shortcuts work when the card is focused.  
   **Why it matters:** Focus alone does not ensure the action is visible. A collapsed card could accept approval without showing what will execute, contradicting `12-security-and-privacy.md`, which requires the action to be visible for keyboard approval.  
   **Fix:** Require the exact action, target and irreversible consequences to be visible before enabling approval shortcuts. Specify pending-submission, rejected, expired and concurrently resolved states; only a successful gateway response may display “Approved.”

2. **[high] Stop visibility depends on activity being known, leaving uncertainty uncovered.**  
   **Reference:** [Shared components, line 29](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:29): visible “whenever any run or agent is active”; “idle (hidden).”  
   **Why it matters:** After daemon disconnection or an unreachable VPS, the UI cannot establish that execution has ended. The specification lists `stop not confirmed` but does not say whether it remains visible through disconnection, navigation or full-screen sheets. Hiding it could imply that stopping succeeded.  
   **Fix:** Keep Stop and its unresolved status visible until authoritative confirmation. Define its accessible placement inside modal sheets and dialogs, and show last-known activity, connection state and completed side effects separately.

3. **[med] ProviderDisclosure specifies notification without the required consent interaction.**  
   **Reference:** [Shared components, line 31](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:31): “one-line notice when context goes to a new provider.”  
   **Why it matters:** `12-security-and-privacy.md` requires explicit confirmation before sending outside the allowed-provider list. A notice alone is insufficient, especially when switching models replays history and attachments.  
   **Fix:** Define separate component modes: an informational notice for an already allowed provider, and a blocking confirmation for a provider outside the list. The confirmation must identify the destination, included context, and whether authorization applies once or changes the allowed list.

4. **[med] The border token cannot reliably identify controls.**  
   **Reference:** [Tokens, lines 12–19](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:12), and [contrast checks, line 25](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:25).  
   **Why it matters:** Compositing the specified 10% white border over the 5% white panel on `--bg` produces approximately **1.32:1** contrast. That is reasonable for decorative separators, but insufficient where the border alone identifies an input or control against its surroundings. The required checks cover text pairs only.  
   **Fix:** Separate decorative borders from control boundaries and state indicators. Require **3:1** contrast for essential non-text indicators, and test composited backgrounds, nested panels and opaque fallbacks. The soft-green button pair itself passes comfortably at approximately **11.23:1**.

5. **[med] The responsive rule changes navigation but does not resolve workspace density.**  
   **Reference:** [Layout, line 34](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:34): “side drawers 360–420 px”; [Responsive, line 46](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:46): full-screen sheets below 900 px.  
   **Why it matters:** Just above 900 px, the rail and a 420 px drawer leave only 416 px before gutters and any conversation list. Chat and Inbox both require multiple regions. The specification also leaves tables, Kanban, the composer and the software keyboard unresolved below the breakpoint.  
   **Fix:** Define minimum usable pane widths and collapse panes when those minima cannot fit. Specify list-to-detail navigation with preserved scroll, contained table/board scrolling, composer clearance, safe-area padding and behavior at 200% zoom.

6. **[med] Typography and spacing lack enough rules to produce a consistent hierarchy.**  
   **Reference:** [Tokens, lines 20–22](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:20), and [Layout, line 34](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:34).  
   **Why it matters:** Font families, one radius and a 12-column grid do not establish heading levels, reading rhythm, row density or control sizing. The 760 px chat limit also changes meaning with font size. `src/index.css` contains incumbent sizes and spacing, but this document does not say which survive.  
   **Fix:** Define a compact type scale, weights and line heights; a shared spacing scale; gutters, panel padding, row heights and control targets. Set prose measure around **65–75ch**, with separate overflow rules for code and tables. Include one dense Inbox and one Chat composition as acceptance examples.

7. **[med] Accent usage does not establish action hierarchy.**  
   **Reference:** [Tokens, line 6](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:6): accent for “selection, focus and primary actions.”  
   **Why it matters:** Selected navigation, segmented effort controls and multiple primary buttons can all receive equal emphasis. ApprovalCard also has no visual distinction between Approve and Deny, or between routine and irreversible approval. The component list does not specify hover, pressed, disabled or submitting treatments.  
   **Fix:** Define filled, secondary, quiet and destructive action variants. Reserve the strongest accent fill for the current task’s primary action; use restrained selection treatments elsewhere. Specify all interaction states and distinguish irreversible approval through explicit wording and consequence text.

8. **[med] Motion and opaque fallbacks are named but remain untestable.**  
   **Reference:** [Rules, line 25](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:25): preferences “respected,” with opaque panels and stronger borders.  
   **Why it matters:** No fallback colors, motion limits or substitutions are defined. This matters because `06-hermes.md` explicitly requests pulsing status and shimmering steps, while every screen may show skeletons. A blur-support check also does not accommodate someone who wants opacity despite having browser support.  
   **Fix:** Specify opaque surface tokens and an in-app reduced-transparency option. Define brief functional transitions, static reduced-motion skeletons/status indicators, and no continuous decorative animation. Add acceptance checks for forced colors, reduced motion and increased contrast.

9. **[med] “Keyboard-first” omits focus behavior and shortcut precedence.**  
   **Reference:** [Accessibility and input, line 43](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:43), and [Layout, line 34](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:34): icon rail with tooltips and a `⌘K` field.  
   **Why it matters:** ARIA roles do not define keyboard behavior. `09-kanban.md` assigns `c` globally, while Inbox assigns it contextually; either could interrupt typing without shared rules. Tooltips alone also leave icon navigation poorly discoverable on touch. The architecture targets Windows first, where the displayed shortcut should be Ctrl+K.  
   **Fix:** Define shortcut scopes, suppress character shortcuts in editable fields, and document platform-specific modifiers. Require accessible navigation names, focus-triggered tooltips, touch labels, dialog focus containment/restoration, Escape behavior and keyboard alternatives to dragging.

10. **[med] Generic error-and-retry states do not distinguish failed execution from an unknown outcome.**  
    **Reference:** [States every screen needs, line 40](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:40): “error (with retry and detail), offline daemon.”  
    **Why it matters:** Losing the connection after submitting an action does not establish that it failed. A generic Retry can encourage duplicate execution. `01-architecture.md` already defines reconnecting and resynchronization, while `03-connections-and-routing.md` forbids replaying requests that performed side effects.  
    **Fix:** Add shared reconnecting, stale, resynchronizing and outcome-unknown states. Preserve entered content and last-known data. Reconcile run status before offering an execution retry, and distinguish “Refresh status” from “Run again.”

11. **[med] The shared approval component has no viable Telegram rendering contract.**  
    **Reference:** [Shared components, line 28](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:28): “one component” across browser surfaces and Telegram previews.  
    **Why it matters:** Telegram cannot directly render the browser’s expandable DiffView or focus behavior. Long commands and diffs need a defined overflow policy; a shortened preview must not conceal the action behind enabled approval buttons.  
    **Fix:** Specify one shared approval data contract with separate browser and Telegram renderers. Require identical safety fields and gateway binding. If Telegram cannot display the necessary action details, provide an authenticated detail link and defer approval until those details are reviewed.

12. **[low] The component and navigation inventory obscures release scope.**  
    **Reference:** [Layout and components, lines 34–37](E:/AI/review-loop/specs-wt/docs/specs/14-ui-system.md:34).  
    **Why it matters:** Home, Kanban, Hermes, Scout, Files and CommandPalette appear alongside first-release functionality without phase labels. `13-roadmap.md` places several in Phases 3–4, while `15-terminal.md` adds a terminal with no destination specified here. This can turn “build once” into an unnecessary upfront component program.  
    **Fix:** Add a small route/component phase matrix, distinguish mock stubs from shipping destinations, and specify the terminal entry point. Build shared components when their first scheduled consumer needs them.