1. **[high] Approval and emergency-stop controls are missing from the shared system.**  
   **Reference:** §Layout and §Components to build once (lines 25–28).  
   **Why it matters:** `12-security-and-privacy.md` requires explicit approvals showing the exact command/diff and a UI kill switch. Approvals also appear on Home and in Inbox, while `06-hermes.md` requires Stop to remain visible. Without shared rules, these critical controls can vary or disappear behind drawers and mobile navigation.  
   **Concrete fix:** Specify a shared approval component showing action, target/project, command/diff, consequences, expiry, and any remembered-rule scope. Separate one-time approval from remembered approval. Reserve a persistent shell control for stopping active agent runs, including pending, acknowledged, and failed-stop states.

2. **[high] Rich-content components have no rendering trust boundary.**  
   **Quote:** “MarkdownView with code blocks, DiffView” (line 28).  
   **Why it matters:** Chat, Scout, file previews, and agent output contain untrusted content. The component contract leaves raw HTML, executable links, remote images, and embedded content unspecified. Remote resources can disclose that private content was viewed; active content could compromise the local client. This directly intersects the threat model in spec 12.  
   **Concrete fix:** Require escaped text and sanitized Markdown, disable raw HTML and active embeds by default, allowlist link protocols, and block remote resource loading until explicitly requested. Render commands and diffs as inert content; execution must use a separate approved action.

3. **[high] “Error with retry” does not distinguish safe retries from duplicate actions.**  
   **Quote:** “error (with retry and detail), offline daemon … disconnected provider” (line 31).  
   **Why it matters:** A lost response does not establish that a workflow launch, message send, or approval failed. A generic Retry can repeat work. After an event-stream disconnect, the UI could also display stale agent status or an already-resolved approval. Specs 01 and 05 explicitly require reliable run lifecycles and protection against duplicate execution.  
   **Concrete fix:** Distinguish failed reads, confirmed failed actions, and actions with unknown outcomes. Refresh authoritative state before offering action retries; use deduplicated mutation requests. Add reconnecting/stale indicators and disable expired, resolved, or unverifiable approvals. Preserve drafts during connection failures.

4. **[med] The colour tokens do not define safe foreground/background pairs.**  
   **Reference:** §Tokens, especially `--accent`, `--border`, and the “4.5:1” rule (lines 11–22).  
   **Why it matters:** Calculated from the supplied colours, `--text` on the violet accent is approximately **3.46:1**, below the doc’s own target. Dark `--bg` text on that accent reaches approximately **4.62:1**. The border composited over a panel on the plain background is only about **1.24:1**: suitable for subtle decoration, insufficient as the sole identifying edge of a control. Glow and stacked glass introduce further variation.  
   **Concrete fix:** Add semantic pairs such as `--action-bg/fg`, `--field-border`, `--focus-ring`, and selected/hover states. Explicitly specify dark text for the current filled accent, or choose another tested pair. Test text and essential control indicators over the brightest allowed glow, stacked panels, and opaque fallback—not only `--bg`.

5. **[med] Glass fallback requirements cover browser support but not user-controlled opacity or motion.**  
   **Quote:** “solid-colour fallback via `@supports not …`; respect `prefers-reduced-motion` and `prefers-contrast`” (line 22).  
   **Why it matters:** A browser can support blur while the user still needs opaque surfaces. “Respect” supplies no implementable behavior. Hermes explicitly uses pulsing and shimmer, and skeletons add another potential source of continuous motion. Allowing two blur layers also does not establish a performance budget.  
   **Concrete fix:** Define opaque surface tokens and an explicit Reduce transparency setting, with appropriate system-preference handling. Specify that reduced motion removes pulse, shimmer, atmospheric animation, and sheet travel while retaining static status/progress. Keep blur layers stationary and require a representative scrolling/streaming performance check.

6. **[med] Typography, spacing, and density—the main hierarchy tools—are absent.**  
   **Reference:** §Tokens defines font families and one radius; §Layout supplies a grid and chat width.  
   **Why it matters:** There are no type sizes, weights, line heights, spacing steps, padding, control heights, or row pitches. Consequently, a dense task table and a reading-focused chat can receive the same card treatment, while Home’s eight modules compete equally. A 760 px chat limit alone does not control readable line length across fonts and text sizes.  
   **Concrete fix:** Add a compact type scale, explicit body/meta roles, line heights, and a spacing scale such as 4/8/12/16/24/32 px. Define table and form density separately from chat reading density. Establish primary/secondary/tertiary action treatments and use a character-based prose measure, with separate overflow rules for code and tables.

7. **[med] The responsive breakpoint does not resolve competing pane widths.**  
   **Quote:** “side drawers 360–420 px”; “Below 900 px … side panels become full-screen sheets” (lines 25, 37).  
   **Why it matters:** Just above 900 px, the rail and a 420 px drawer leave roughly 416 px before gutters, conversation navigation, or Inbox filters. Chat and Inbox both require multiple panes. Below the breakpoint, the spec does not explain how conversation lists, filters, and detail views become navigable, or how the composer survives the virtual keyboard.  
   **Concrete fix:** Define minimum useful widths per pane and collapse supplementary panes when their container cannot accommodate them. Specify narrow-screen list → detail → back behavior, retained selection/scroll position, composer keyboard handling, and bottom-bar safe-area spacing. Keep horizontal scrolling confined to content that needs it.

8. **[med] Navigation prioritization and short-window behavior are unresolved.**  
   **Quote:** “Slim left rail (64 px, icons with tooltips)” with twelve destinations (line 25).  
   **Why it matters:** Twelve recognizable icon-only destinations impose substantial recall demands. At a 48 px item pitch, navigation alone consumes 576 px before branding and spacing. Pinning Connections and Settings at the bottom requires explicit overflow behavior. Mobile prioritizes Kanban while hiding Tasks and Workflows, but no rationale or “More” behavior is defined.  
   **Concrete fix:** Group destinations by frequent work, provide an expandable labelled rail, and define a scrollable middle region with persistent bottom utilities. Require accessible names, focus-triggered tooltips, and an identifiable current destination. Define More as a labelled menu containing every omitted route.

9. **[med] “Keyboard-first” omits the interaction rules needed to make it safe.**  
   **Quote:** “Keyboard-first … visible focus ring in accent, ARIA roles for tabs/dialogs/lists” (line 34).  
   **Why it matters:** Roles alone do not define focus placement, trapping, restoration, dismissal, or keyboard operation. Spec 07 assigns single-letter shortcuts including `a` to approve, and spec 09 assigns `c` globally; these need explicit protection while typing. The `⌘K` label also omits the Windows/Linux equivalent.  
   **Concrete fix:** Define focus and dismissal behavior for drawers, sheets, popovers, and the palette. Suppress global letter shortcuts in editable controls and scope approval shortcuts to a focused approval context. Document Ctrl+K/Cmd+K, provide keyboard alternatives to board dragging, and define restrained announcements for streaming and status changes.

10. **[med] The component catalogue has no delivery boundary.**  
    **Quote:** “Components to build once” (line 28).  
    **Why it matters:** The list combines foundational controls with later-phase features such as CronPreview, Kanban, DiffView, and CommandPalette. Roadmap 13 starts with a shell and working chat, then adds automation, agents, and awareness. The wording can turn that incremental path into an upfront component-library project; it also gives no reason why every component must already be shared.  
    **Concrete fix:** Assign components to their first consuming phase. Build foundational tokens and controls first, then extract shared patterns when their real use is established. Separate visual shell placeholders from functional acceptance criteria.

11. **[low] Token migration leaves an existing shared text role undefined.**  
    **Reference:** `--text-dim` in §Tokens (line 16), versus `--muted` in `src/index.css`.  
    **Why it matters:** The current `.muted` and navigation styles consume `--muted`, and several pages use that class. Adopting the proposed token block without a mapping leaves these rules dependent on the old stylesheet or causes fallback styling, undermining secondary-text hierarchy.  
    **Concrete fix:** Add a token migration table and a temporary alias such as `--muted: var(--text-dim)`, then identify the canonical name. Record how existing panel, border, hover, and selected treatments map to the new glass roles.