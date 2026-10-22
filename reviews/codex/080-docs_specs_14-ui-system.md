1. **[high] Untrusted-content rendering has no security contract.**  
   **Reference:** “MarkdownView with code blocks, DiffView” (§ Components).  
   **Why it matters:** These components will display model output, files, and Scout findings—content explicitly treated as untrusted in `12-security-and-privacy.md`. The spec leaves HTML, link protocols, remote images, and executable actions undefined. Remote images could disclose viewing activity; unsafe rendering could expose the authenticated UI.  
   **Concrete fix:** Require sanitized Markdown, raw HTML disabled by default, escaped code/diffs, allowed link protocols, and remote images blocked until explicitly loaded. Render proposed commands as inert text; opening content must never execute a daemon action.

2. **[high] The shared shell omits required safety controls and approval presentation.**  
   **Reference:** § Layout lists search, provider status, and avatar; § Components has no approval component.  
   **Why it matters:** `12-security-and-privacy.md` requires a UI kill switch and approvals showing the exact command/diff. `06-hermes.md` requires Stop to remain visible. This system spec gives neither a global placement nor a shared approval contract, allowing consequential actions to become ordinary card buttons.  
   **Concrete fix:** Reserve a persistent global Stop control while agents run. Define an ApprovalPanel showing project, action class, exact command/diff, destination, expiry, and explicit Approve/Deny actions. Separate remembered-rule creation from one-time approval and display its scope before submission.

3. **[high] Accent and foreground combinations can violate the stated contrast requirement.**  
   **Reference:** `--accent: #8B5CF6`, `--text: #E7E8EC`; “text contrast at least 4.5:1.”  
   **Why it matters:** Calculated contrast is **3.46:1** for the text colour on violet. Violet text on approximately `#151619`—the 4% white panel over the base background—is **4.27:1**. Thus common button and link treatments can fail despite using the prescribed tokens.  
   **Concrete fix:** Specify paired foreground/background tokens for every interactive state. A suitable alternative is the existing source accent, **periwinkle `#7C9CFF`**, which separates actions from teal health states: **6.94:1** on `#151619`, and **7.50:1** with dark `#0B0C0F` button text. Light `#E7E8EC` button text would still fail at **2.13:1**. Validate final combinations over the brightest permitted glow and nested surfaces.

4. **[med] Glass fallbacks and control boundaries are not sufficiently specified.**  
   **Reference:** 8% white border; unsupported-blur fallback; “respect `prefers-contrast`.”  
   **Why it matters:** The border is approximately **1.24:1** against the base glass panel. That is reasonable decoration, but insufficient when it alone identifies an input or control. The fallback only addresses unsupported blur; it does not define an opaque mode for someone who needs greater legibility despite browser support.  
   **Concrete fix:** Separate decorative borders from control and focus boundaries, requiring 3:1 where necessary to identify controls and states. Provide concrete opaque surface tokens, a user-selectable opaque mode, and high-contrast/forced-colour behaviour. Define the permitted background luminance range so contrast can be tested reproducibly.

5. **[med] The responsive rules leave an unusable intermediate layout.**  
   **Reference:** 64 px rail, 360–420 px drawers; sheets only “below 900 px.”  
   **Why it matters:** At 900 px, a 420 px drawer and rail leave only **416 px before gutters**. Chat also requires a conversation list (`04-chat.md`), while Inbox requires filters, list, and detail (`07-inbox-and-agent-chats.md`). A single breakpoint does not explain which panes yield first.  
   **Concrete fix:** Define pane minimum widths and collapse order based on available content width. Collapse secondary navigation before squeezing the main task; open detail as an overlay when its minimum width cannot fit. Specify contained horizontal scrolling for code, diffs, and tables, plus composer visibility above the mobile keyboard and bottom navigation.

6. **[med] “Keyboard-first” lacks the interaction rules these components need.**  
   **Reference:** § Accessibility and input; “icons with tooltips”; “⌘K field.”  
   **Why it matters:** ARIA roles alone do not define keyboard behaviour. Drawers need focus handling, model pickers need selection rules, and icon navigation needs accessible names. Cross-spec single-letter shortcuts—including approval and global card creation—could fire while typing without explicit scope rules.  
   **Concrete fix:** Specify focus entry/return, modal focus trapping, Escape behaviour, arrow-key selection, and accessible names. Make tooltips available on focus. Suppress global single-letter shortcuts in editable fields and inappropriate modal contexts; require deliberate focus for approval shortcuts. Display and support **Ctrl+K on Windows/Linux** and **⌘K on macOS**.

7. **[med] Error and connection states collapse materially different conditions.**  
   **Reference:** “offline daemon … ‘junosd not running’ with start command,” “disconnected provider,” and generic “retry and detail.”  
   **Why it matters:** Unreachable does not prove the daemon stopped: pairing, authentication, origin checks, and stream reconnection can fail separately. `03-connections-and-routing.md` already defines five provider states. A generic retry can also duplicate a state-changing action whose acknowledgement was lost.  
   **Concrete fix:** Define separate daemon unavailable, pairing required, unauthorized, reconnecting, and stale-data states. Preserve drafts and show last-update information. Map provider states to their specific recovery actions, redact diagnostic details, and reconcile uncertain mutations before offering Retry.

8. **[med] Typography, spacing, density, and action hierarchy are largely undefined.**  
   **Reference:** Font-family tokens, one radius, a 12-column grid, and a 760 px chat maximum.  
   **Why it matters:** Font names and column counts cannot establish hierarchy. Home’s eight sections, task tables, and activity timelines could receive identical card treatment and compete equally. A pixel width also does not guarantee a readable line length across font sizes.  
   **Concrete fix:** Add a small type scale, weights, and line heights—for example 24/16/14/12 px roles, with 14/20 UI text and 16/24 reading text. Define spacing steps, gutters, panel padding, row heights, target sizes, and primary/secondary/destructive action treatments. Use a character-based reading measure, and specify wrapping/truncation and tabular numerals for operational data.

9. **[med] Motion guidance does not define a usable reduced-motion experience.**  
   **Reference:** “respect `prefers-reduced-motion`”; Skeleton and Timeline components.  
   **Why it matters:** `06-hermes.md` explicitly requests pulsing status and shimmering running steps. The shared spec does not say which effects stop, how progress remains understandable, or how streaming and activity updates affect scrolling and announcements.  
   **Concrete fix:** Define duration/easing tokens and reduced-motion replacements: static skeletons, labelled running states, immediate sheet transitions, and no animated glow or smooth auto-scroll. Preserve reading position when new activity arrives; announce meaningful state changes without announcing every streamed token.

10. **[med] The twelve-destination icon rail has no overflow or discoverability policy.**  
    **Reference:** § Layout navigation order and § Responsive “More.”  
    **Why it matters:** Tooltips require inspection of each icon; Agents, Hermes, Scout, and Workflows are especially easy to confuse. Twelve destinations plus branding and bottom utilities can exceed short desktop windows. “More” does not define how the remaining destinations stay accessible.  
    **Concrete fix:** Define labelled navigation groups, an expandable labelled rail, and a scrollable navigation region with persistent utilities. Specify the More menu’s complete destination mapping and active-route indication. Keep pending approvals and running-agent status visible regardless of the current navigation layout.

11. **[med] The component inventory reads as an immediate build commitment without phase boundaries.**  
    **Reference:** “Components to build once,” including Kanban, CronPreview, DiffView, and CommandPalette.  
    **Why it matters:** `13-roadmap.md` sequences these capabilities across several phases and places the palette in Phase 4. Building the entire shared kit upfront would expand the “days” foundation phase and freeze abstractions before real workflows establish their requirements.  
    **Concrete fix:** Mark components and shell destinations by their first delivery phase. Specify the initial chat/connection primitives first, introduce specialised components alongside their owning screen, and clearly distinguish mocked, unavailable, and working capabilities.