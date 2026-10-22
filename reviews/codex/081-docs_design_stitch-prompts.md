1. **[high] Approval and emergency-stop states are missing.**  
   **Reference:** §§2–4, “tools the model can use (toggles…)”, “Pause / Stop / Settings”, and “Give to Hermes” in §5.  
   **Why it matters:** Tool availability does not explain permission to act. The prompts never show a run waiting for approval, the proposed command/diff, Approve/Deny, or a global stop. These are required by [security](E:/AI/review-loop/junos/docs/specs/12-security-and-privacy.md:25) and [Hermes behavior](E:/AI/review-loop/junos/docs/specs/06-hermes.md:28).  
   **Concrete fix:** Add a waiting-for-approval variant with the exact action, affected project/files or external destination, and Approve/Deny. Keep Stop visible during activity and inspection; distinguish pausing the queue, cancelling one run, and stopping all agents.

2. **[high] File intelligence has no visible privacy boundary.**  
   **Reference:** §5, “AI tag column (auto-generated tags…)”, rendered previews, and “Ask about this file”.  
   **Why it matters:** The design implies automatic analysis of browsable files without showing which folders are indexed or when content leaves the machine. The [file spec](E:/AI/review-loop/junos/docs/specs/11-files-and-projects.md:26) requires per-folder opt-in tagging and explicit attachment or enabled workflows before sending content to a model.  
   **Concrete fix:** Show “Add allowed folder”, indexing scope, excluded-file behavior, and an off-by-default AI-tagging control. Before sending, identify the attached files and destination provider. Require sanitized Markdown previews and redacted log examples; never paste real private files, tokens, or logs into Stitch.

3. **[high] Provider cards promise capabilities the project has not verified.**  
   **Reference:** §§1, 2 and 6: “62% of weekly limit”, “Connected via subscription”, four effort levels, and models each subscription “unlocks”.  
   **Why it matters:** The prompts present all five providers as equivalent working integrations. The [routing spec](E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md:14) explicitly leaves Grok unresolved, makes usage meters conditional on available data, and disables unsupported effort levels. [Current provider data](E:/AI/review-loop/junos/src/lib/providers.ts:1) is explicitly placeholder-only.  
   **Concrete fix:** Request capability-driven examples: verified connection, login required, CLI missing, rate limited, and integration under research. Use “Usage unavailable” rather than invented percentages; disable unsupported effort options and show fallback routing in message headers. Label all illustrative data as mock data.

4. **[high] The foundation does not faithfully specify the chosen glass direction or its legibility safeguards.**  
   **Reference:** §0, opaque `#14161B` panels and “subtle glass blur on overlays”.  
   **Why it matters:** This limits glass to overlays, whereas the settled direction uses frosted panels over atmospheric backgrounds. It also omits the contrast, blur-depth and opaque-fallback requirements already in the [UI system](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:22). Independent generations could produce inconsistent materials or unreadable text over bright glow.  
   **Concrete fix:** Specify shared translucent panel tokens, controlled background glow, stronger surfaces behind dense text, and bounded blur layers. Require text contrast of at least 4.5:1 against the brightest composited background, 3:1 for meaningful control boundaries, and opaque alternatives for unsupported blur, increased contrast, or user preference.

5. **[med] Navigation and Home omit the product’s attention-management core.**  
   **Reference:** §0 sidebar and §1 dashboard.  
   **Why it matters:** Inbox, Agents, Workflows, Kanban and Scout are absent despite appearing in the [intended shell](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:25). Home omits “Needs you”, including approvals, which the [Home spec](E:/AI/review-loop/junos/docs/specs/10-home-and-search.md:6) prioritizes. Conversely, Files and Projects are separate destinations although §5 supplies one combined screen.  
   **Concrete fix:** Align the shell with the intended information architecture, or explicitly label this document a phased subset. Define the Projects destination or consolidate it under Files. Put pending approvals and failures ahead of passive subscription and recent-file information.

6. **[med] Home’s grid instruction contradicts its content count and leaves hierarchy unresolved.**  
   **Reference:** §1, “quick ask spans full width… remaining cards in a 3 + 3 masonry”.  
   **Why it matters:** Six blocks are listed; after Quick ask, five remain. A six-position arrangement therefore invites an orphan slot or invented content. Masonry also leaves reading order and alignment ambiguous for frequently changing operational data.  
   **Concrete fix:** Specify exact spans for the actual blocks, one consistent gutter, capped row counts and a deliberate reading order. Give actionable exceptions the largest useful area; group recent projects/files if needed to close the grid without filler.

7. **[med] Fixed columns have no minimum usable workspace or collapse rules.**  
   **Reference:** §2’s 260px conversation list and 300px Context panel; §3’s open drawer; §5’s tree and preview pane.  
   **Why it matters:** At 1024px, Chat leaves only 400px before gutters after subtracting the 64px rail and two side panels. Tables and code become cramped. Only Home receives an optional mobile prompt, despite the [UI system](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:37) defining responsive behavior across screens.  
   **Concrete fix:** Specify representative 1440px, 1024px and 390px layouts. Collapse Context first, then the conversation list; use full-screen sheets below 900px. Define table overflow, code scrolling, preview behavior and a chat reading-width cap.

8. **[med] Typography and spacing are adjectives rather than a usable system.**  
   **Reference:** §0, “generous spacing”, “dense but calm”; §§1–6, “tiny”, “small” and “compact”.  
   **Why it matters:** Font families alone do not establish hierarchy. These instructions permit tiny metadata, inconsistent padding and oversized headings competing with operational content. Long paths, model names and logs have no wrapping rules.  
   **Concrete fix:** Add a compact scale—for example, 24/30px page titles, 16/24px body text, 14/20px controls and metadata, and 13–14px monospace. Define 24px canvas gutters, 16px panel gaps, 20px panel padding and 40–44px standard rows. Specify truncation with accessible full values, readable line lengths and tabular numerals for aligned metrics.

9. **[med] Accent roles and foreground pairings are unspecified.**  
   **Reference:** §0, electric violet `#8B5CF6`, teal status color; §2, violet-tinted messages.  
   **Why it matters:** The prompt does not distinguish action, selection and status colors or specify text on accent fills. White on solid `#8B5CF6` is approximately **4.23:1**; the UI system’s `#E7E8EC` is **3.46:1**—both below 4.5:1 for normal text. These are calculated pairings, not measured mockup failures.  
   **Concrete fix:** Consider cool blue `#7CB4FF` for actions and selection, retaining teal for healthy states. It separates those roles without tying activity to the action color. Dark `#0B0C0F` text on that blue gives **9.15:1**; blue text on solid `#14161B` gives **8.47:1**. Recheck every translucent composite rather than assuming these solid-color ratios carry over.

10. **[med] Tasks omit the controls that make scheduling predictable.**  
    **Reference:** §3’s schedule builder and next-five-runs preview.  
    **Why it matters:** No timezone, missed-run policy, overlap policy or sleeping-daemon state is shown. These are explicit [scheduling requirements](E:/AI/review-loop/junos/docs/specs/05-tasks-and-workflows.md:11); “08:00” alone cannot explain when an unattended job will execute.  
    **Concrete fix:** Show an editable `Europe/Copenhagen` timezone, dated previews with UTC offsets around DST changes, and advanced catch-up/overlap controls. Include an offline warning and distinguish task configuration state from the outcome of its last run.

11. **[med] Most operational states are absent.**  
    **Reference:** All screen prompts; §6 supplies only “Session expired, reconnect”.  
    **Why it matters:** Designs based exclusively on populated, connected screens conceal first-run and recovery problems. The [UI system](E:/AI/review-loop/junos/docs/specs/14-ui-system.md:30) requires loading, empty, error, offline-daemon and disconnected-provider states.  
    **Concrete fix:** Add focused follow-up prompts for those variants using the same shell. Give each empty/error state a next action, allow Home cards to fail independently, and show stale-data timestamps. Include Chat streaming, cancel and retained partial-output states.

12. **[med] Persistent activity effects have no motion or live-update policy.**  
    **Reference:** §4, “teal pulsing”, “progress shimmer”, and live Activity timeline.  
    **Why it matters:** Continuous pulse, shimmer and atmospheric effects can compete with instructions and logs. Incoming steps can also shift content while Jonas is inspecting it. Reduced-motion handling is absent.  
    **Concrete fix:** Use bounded feedback for transitions and static “Working” text as the persistent signal. Under `prefers-reduced-motion`, remove pulse, shimmer, background travel and smooth scrolling. Preserve scroll position when inspecting older steps; offer “Jump to latest” and avoid announcing every streamed token.

13. **[med] Status, navigation and routing interactions lack accessible equivalents.**  
    **Reference:** §0 icon-only rail and `⌘K`; §1 teal/red dots; §6 drag-to-reorder fallback list.  
    **Why it matters:** Color-only status and unlabeled icons impair recognition; dragging alone excludes keyboard use. The shortcut hint is also incomplete for this Windows-first environment.  
    **Concrete fix:** Require accessible names and focus/hover tooltips on rail items, text or distinct icons beside status dots, visible focus states, and keyboard-operable popovers/dialogs with focus return. Provide Move up/down controls for routing order and platform-aware `Ctrl+K`/`⌘K` hints.

14. **[med] Files presents later-phase capabilities as immediately available.**  
    **Reference:** §5, “Cloud (Google Drive, GitHub repos)”, automatic tags and natural-language search.  
    **Why it matters:** [Cloud sources are v2](E:/AI/review-loop/junos/docs/specs/11-files-and-projects.md:9), while AI enrichment is optional and indexing/search arrive later in the roadmap. The prompt encourages a fully working-looking screen without distinguishing available functions from planned ones.  
    **Concrete fix:** Mark each prompt’s target phase. For an initial Files screen, prioritize allowlisted local folders and basic search; show cloud sources as clearly unavailable until connected and implemented. Specify indexing progress and “AI enrichment off” rather than populated intelligence by default.

15. **[low] The foundation prompt starts a screen before its requirements arrive.**  
    **Reference:** §0, “Start by designing the Home / Overview dashboard (see next prompt for details)”.  
    **Why it matters:** Prompt 0 requests generation without Home’s content, then prompt 1 requests Home again. That creates an unnecessary opportunity for competing layouts and style drift.  
    **Concrete fix:** Make prompt 0 establish shared materials, tokens and shell only; let prompt 1 generate Home once. Require subsequent prompts to preserve that approved foundation.