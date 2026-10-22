1. **[high] Shared content rendering has no security or privacy contract.**  
   **Reference:** §Components: “MarkdownView with code blocks, DiffView”; §States: error “detail.”  
   **Why it matters:** These surfaces display model output, files and web content identified as untrusted in `12-security-and-privacy.md`. Unspecified HTML, URL and image handling could allow script execution or remote requests that disclose viewing activity. Error details can expose credentials or sensitive paths.  
   **Concrete fix:** Require escaped code/diffs, sanitized Markdown, disabled raw HTML, allowed URL schemes, and blocked remote images until explicitly loaded. Apply secret redaction to error details, logs and copy/export actions.

2. **[high] Approval and emergency-stop controls are missing from the shared system.**  
   **Reference:** §Components and §Layout omit both; `12-security-and-privacy.md` requires exact command/diff approvals and a UI kill switch.  
   **Why it matters:** Approvals appear on Home, Inbox and Hermes. Without a common contract, one surface could permit approval without showing its consequences. The global stop requirement has no defined location outside Hermes.  
   **Concrete fix:** Specify a shared approval component showing project, destination, action class, exact command/diff, expiry and narrowly scoped remembered permissions. Expired/resolved requests must disable actions. Define a persistent “Stop all runs” control with pending, confirmed and failed states.

3. **[high] The palette cannot safely serve all implied accent roles.**  
   **Reference:** §Tokens: `--accent: #8B5CF6`, translucent panels, and “text contrast at least 4.5:1.”  
   **Why it matters:** Calculated over the base background, violet text reaches only **4.28:1** on the 4% white panel and **3.98:1** on the 7% panel, before glow. `--text` on a violet fill is **3.46:1**. The single border token gives approximately **1.24:1** against the base panel, insufficient when it alone identifies an input.  
   **Concrete fix:** Define tested foreground/background pairs for links, buttons, controls and focus. Consider **ice blue `#7DD3FC`**: **10.88:1** on the base panel and **11.73:1** with `#0B0C0F` button text. It separates action colour from teal health states. Keep atmospheric colour subdued and verify every pair over the brightest permitted glow.

4. **[med] The responsive rule changes navigation but leaves the working layouts unresolved.**  
   **Reference:** §Responsive: “Below 900 px … bottom tab bar”; §Layout: drawers “360–420 px.”  
   **Why it matters:** Chat has three regions, Inbox has three panes, and Hermes has a 40/60 split. Those layouts can become unusable above 900px too. Tables, boards, bottom tabs and the composer have no overflow or keyboard rules.  
   **Concrete fix:** Define minimum content widths and container-driven pane collapse. Specify list → detail → back navigation, sheet width bounded by the viewport, table/board scrolling, safe-area padding and composer placement above the virtual keyboard. Cover 390px, tablet, short desktop and zoomed layouts.

5. **[med] Typography, spacing and density are almost entirely unspecified.**  
   **Reference:** §Tokens defines font families and one radius; §Layout specifies a grid and a 760px chat width.  
   **Why it matters:** A 12-column grid does not establish hierarchy. Implementers still choose heading sizes, leading, card padding, row pitch and control heights independently. A pixel width alone cannot guarantee readable chat lines.  
   **Concrete fix:** Add a compact role scale—for example, 24/30 page titles, 16/24 section titles, 14/20 operational text and 16/26 chat prose—plus a 4px spacing scale, gutters and row/control heights. Use roughly `65–75ch` for prose, independent overflow for code/tables, and tabular numerals for changing metrics. Define where primary, secondary and destructive actions belong.

6. **[med] “Keyboard-first” lacks the interaction rules needed to make it reliable.**  
   **Reference:** §Accessibility: “ARIA roles for tabs/dialogs/lists”; §Layout shows only “⌘K.”  
   **Why it matters:** Roles do not provide keyboard behaviour. Other specs introduce single-letter shortcuts, drag-and-drop and approval actions. Without scope rules, typing in a composer could trigger navigation or an approval. Windows users also receive the wrong shortcut hint.  
   **Concrete fix:** Specify native semantics first, focus entry/return, modal trapping, Escape behaviour, tab arrow keys and accessible control names. Suspend global letter shortcuts in editable fields; scope approval shortcuts to the active approval detail. Provide keyboard alternatives to dragging and display `Ctrl+K` or `⌘K` by platform.

7. **[med] The icon rail hides too much information without an escape route.**  
   **Reference:** §Layout lists twelve icon destinations in a 64px rail, with tooltips.  
   **Why it matters:** Tasks versus Workflows and Chat versus Agents require recognition of similar concepts through icons alone. No active-state treatment, expandable labels, short-height overflow or touch tooltip alternative is defined. Inbox urgency can become a small, ambiguous badge.  
   **Concrete fix:** Retain the compact rail but offer an expandable labelled mode. Define icon vocabulary, accessible names, selected state and badge meaning. Allow the destination list to scroll while keeping essential controls reachable. Give mobile More a labelled destination list and preserve the current location visibly.

8. **[med] Glass fallbacks and motion preferences are named but not specified.**  
   **Reference:** §Tokens: “never nested more than two deep,” unsupported-blur fallback, and “respect `prefers-reduced-motion` and `prefers-contrast`.”  
   **Why it matters:** Supported blur can still be costly or difficult to read. Two nested blurred layers are not a performance budget. Other specs require pulses, shimmer and streaming, but this document provides no common behaviour for them.  
   **Concrete fix:** Define opaque surface tokens and a persistent Reduce transparency setting. Explain high-contrast/forced-colour behaviour. Set a layer rule—for example, shell glass plus one active overlay, with opaque inner surfaces—and test it during scrolling/streaming. Reduced motion should remove pulses, shimmer and animated glow, replacing them with static status text while preserving progress information.

9. **[med] The universal state list is too coarse for a live command centre.**  
   **Reference:** §States: loading, empty, error, offline daemon and disconnected provider.  
   **Why it matters:** Provider states also include login expiry, rate limiting, missing CLI and degradation (`03-connections-and-routing.md`). Runs can wait for approval or be cancelled. A disconnected event stream can leave believable but stale data onscreen; a generic Retry can repeat an action whose outcome is unknown.  
   **Concrete fix:** Add shared patterns for reconnecting/stale data, partial failures, waiting approval and cancellation. Preserve drafts and existing content, show freshness, distinguish refresh from rerun, and block duplicate submissions. Clarify that global daemon failure coexists with independent card errors, as required by the Home spec.

10. **[med] Component scope is not aligned with the phased delivery plan.**  
    **Reference:** §Components: twenty shared components “to build once”; §Layout includes the full navigation and command palette.  
    **Why it matters:** `13-roadmap.md` starts with working chat, while Kanban arrives in Phase 3 and the command palette in Phase 4. This document does not distinguish mock navigation from working functionality or foundational components from later specialised ones.  
    **Concrete fix:** Tag components and shell features by first required phase. Define only the shared foundations and chat controls needed initially; add CronPreview, Kanban and other specialised patterns with their features. Specify how unavailable routes appear and ensure mock provider/agent states cannot be mistaken for live connections.

11. **[med] The token adoption instructions leave a concrete compatibility gap.**  
    **Reference:** §Tokens: “starting values”; `src/index.css` consumes `--muted`, while this document introduces `--text-dim`.  
    **Why it matters:** Adopting these tokens does not update existing secondary text. The current stylesheet also uses solid `--panel` backgrounds directly, so replacing the variable with translucent white alone does not implement the intended glass treatment. Different screens could end up with different token systems.  
    **Concrete fix:** Specify the canonical token names, temporary aliases and component recipes that consume them. Include explicit recipes for atmospheric background, glass surface, opaque surface and overlay stacking. State which existing CSS values must migrate together.