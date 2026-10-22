1. **[high] Stop can disappear while control is still needed.**  
   **Reference:** “whenever any run or agent is active”; “idle (hidden)” (lines 29, 34).  
   **Why it matters:** An unreachable Hermes has unknown activity, not confirmed inactivity. An interactive VPS terminal can also exist without an active run; spec 15 says Stop closes those tabs. The visibility rule leaves both cases ambiguous.  
   **Fix:** Keep Stop visible during active runs, open controllable terminal sessions, cancellation and unconfirmed remote state. Preserve “stop not confirmed” until reconciled. Specify whether the global action stops all runs, pauses scheduling and closes terminals; distinguish it from cancelling one chat response.

2. **[high] ProviderDisclosure describes notification where consent may be required.**  
   **Reference:** “one-line notice when context goes to a new provider” (line 31).  
   **Why it matters:** Spec 12 requires explicit confirmation *before* sending outside the allowed-provider list. A notice alone can satisfy this component’s wording while violating that privacy invariant.  
   **Fix:** Define separate modes: informational notice for an already allowed provider, and blocking confirmation for a new destination. Before confirmation, show the destination and scope of history, attachments and tool results being sent; cancellation must send nothing.

3. **[high] A sandboxed file preview still needs network isolation.**  
   **Reference:** “Previews of files use a sandboxed iframe” (line 30).  
   **Why it matters:** Spec 12 excludes scripts and same-origin access, but neither restriction alone blocks remote images, styles or other resource requests. A preview can consequently bypass SafeMarkdown’s click-to-load privacy rule and contact a tracking endpoint automatically.  
   **Fix:** Require a restrictive preview-document CSP, with network resources blocked by default, alongside explicit sandbox flags. Route approved resource loads through a controlled path and test that opening a hostile preview produces no unsolicited requests.

4. **[med] Glass contrast verification does not define the backgrounds being tested.**  
   **Reference:** “dim text verified >= 4.5:1 on panel”; “a small contrast test over the token pairs” (lines 19, 25).  
   **Why it matters:** A translucent panel has no independent background colour: contrast depends on bloom, underlying content and the permitted second panel layer. The border is also only approximately **1.32:1** against a single panel over `--bg`; it cannot serve as the sole required boundary for an input or control.  
   **Fix:** Define the permitted compositing stacks and test their lightest effective backgrounds, including hover, selected and opaque states. Require 4.5:1 for normal text and 3:1 for necessary control boundaries and state indicators. Keep decorative hairlines separate from control-border tokens. The base dim-text pair itself passes at approximately **7.58:1**.

5. **[med] Typography, spacing and density are largely unspecified.**  
   **Reference:** Font families and one radius token (lines 20–22); “12-column grid” and “760 px” chat width (line 34).  
   **Why it matters:** These values do not establish heading hierarchy, body size, leading, gutters, row heights or control density. Inbox, logs, chat and approval diffs have different reading needs. The current scaffold already uses different gaps and paddings, so adopting the colour tokens will not produce a coherent system.  
   **Fix:** Add a compact role table: page title, section title, body, metadata and code, with size/weight/line-height; a spacing scale; grid gutters; and compact versus comfortable row heights. Define tabular numbers, numeric alignment, long-path wrapping and horizontally scrollable code blocks.

6. **[med] The responsive rule leaves multi-pane screens without a usable middle range.**  
   **Reference:** “side drawers 360–420 px”; “Below 900 px … side panels become full-screen sheets” (lines 34, 46).  
   **Why it matters:** Just above 900 px, the rail, drawer and gutters leave little width for chat or Inbox content. Below that breakpoint, “full-screen sheets” does not explain how conversation lists, detail panes, composers and navigation interact.  
   **Fix:** Specify minimum pane widths and collapse panes when those minima cannot fit. Define list → detail → back behaviour with preserved scroll position, persistent approval actions, keyboard-safe composer placement and bottom-bar safe-area padding. Check 390, 768, 900 and 1024 px, plus zoomed layouts.

7. **[med] Accessibility requirements name roles without defining interaction.**  
   **Reference:** “Keyboard-first … ARIA roles for tabs/dialogs/lists”; “icons with tooltips” (lines 34, 43).  
   **Why it matters:** Roles alone do not provide focus trapping, restoration, tab keyboard behaviour or accessible names. Tooltips cannot be the sole label for icon navigation. Streaming output and countdowns can also overwhelm screen-reader announcements.  
   **Fix:** Specify accessible names, `aria-current`, keyboard-accessible tooltips, dialog focus/escape/restore behaviour, target sizes and a skip link. Define restrained announcements for streaming, approval resolution and Stop outcomes. Show **Ctrl+K on Windows** and ⌘K on macOS.

8. **[med] Motion and opaque fallbacks are intentions rather than implementable rules.**  
   **Reference:** “`prefers-reduced-motion` and `prefers-contrast: more` … respected” (line 25).  
   **Why it matters:** Spec 06 explicitly requests pulsing status and shimmering steps. This doc does not say which effects disappear or how activity remains visible without them. Opaque fallback colours are also undefined, and supported blur can still perform poorly.  
   **Fix:** Add motion tokens and explicit substitutions: static labelled activity indicators, no shimmer or atmospheric animation under reduced motion, and no animated blur. Define opaque surface/border tokens and an app-level “Reduce transparency” setting that also works when blur is supported.

9. **[med] “One component” across web and Telegram is not a complete approval contract.**  
   **Reference:** ApprovalCard used in “Inbox, Hermes console, chat and Telegram previews”; exact action “expandable” (line 28).  
   **Why it matters:** Telegram cannot render the same React component or arbitrary expandable diffs. Long actions may be truncated, while shortcuts must only work with the action visible under spec 12. The spec leaves unclear when the user has enough information to approve.  
   **Fix:** Share a canonical approval view model with separate web and Telegram renderers. Specify mandatory visible fields and truncation behaviour. When Telegram cannot present the complete action safely, provide “Review in JunOS” rather than an approval button; bind every decision to the same approval record.

10. **[med] Connection failures are collapsed into an inaccurate daemon diagnosis.**  
    **Reference:** “offline daemon (global banner ‘junosd not running’ with start command)” (line 40).  
    **Why it matters:** A lost event stream does not establish that the daemon stopped. Spec 01 separately defines reconnecting and resynchronisation; pairing expiry and an unreachable VPS need different recovery actions. Incorrect advice can encourage duplicate starts while leaving stale operational data looking current.  
    **Fix:** Define connecting, reconnecting, resyncing, pairing-required and confirmed-daemon-offline states separately. Preserve existing content with an “as of” timestamp, disable decisions until refreshed, and show a start command only when appropriate.

11. **[med] Navigation and component scope have drifted from the roadmap.**  
    **Reference:** Destination list (line 34) and undifferentiated “Components to build once” (line 37).  
    **Why it matters:** Terminal is a specified Phase 3 screen but has no navigation entry. Meanwhile the shell includes later-phase destinations and a command field whose working palette arrives in Phase 4. Without phase rules, the first release risks dead controls or unnecessary implementation scope.  
    **Fix:** Add a phase-to-route/component matrix. Place Terminal explicitly, show only available destinations or clearly labelled previews, and introduce shared components when their first real consumer ships.

12. **[low] The reference-image paths imply visual authority that is unavailable.**  
    **Reference:** “Reference images: `/design/stitch-glass/` and `/design/stitch-softdark/`” (line 3).  
    **Why it matters:** Spec 00 says the Stitch designs are absent and historical prompts are not authoritative. “Hand-match first” therefore has no inspectable target for panel opacity, hierarchy or density.  
    **Fix:** Mark the images as pending and establish the written tokens as authoritative. Attach a small approved reference set before visual acceptance, including a dense approval view and an opaque fallback.

13. **[low] The accent choice could separate interaction from health status more clearly.**  
    **Reference:** Soft-green `--accent: #7FD6A4` beside teal `--ok: #2DD4BF` (lines 6, 16–18).  
    **Why it matters:** Both occupy a similar green/cyan region; small selection and health indicators can look related despite their different meanings. Text/icon redundancy helps accessibility but does not fully clarify the visual hierarchy.  
    **Fix:** Consider a restrained blue accent such as **#8AB4F8**, retaining teal/amber/red for status. It gives approximately **9.28:1** with `--accent-fg` and **8.49:1** against the base composited panel. Validate it across the defined glass stacks before adoption.