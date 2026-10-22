1. **[high] Agent controls omit the approval boundary.**  
   **Reference:** §§2, 4–5: tool toggles, “Give to Hermes,” and expandable shell/file/API activity.  
   **Why it matters:** These prompts show execution without showing permission requests, making enabled tools look like unrestricted authority. This conflicts with the approval policy in `docs/specs/12-security-and-privacy.md`.  
   **Concrete fix:** Add a waiting-for-approval console state with the exact command/diff, affected project, destination, and Approve/Deny controls. Show permission scope beside tool toggles. Specify that Stop remains visible and pauses queued work.

2. **[high] File discovery and AI tagging lack privacy controls.**  
   **Reference:** §5: “Local folders,” “AI tag column (auto-generated tags…),” and “Ask about this file.”  
   **Why it matters:** The design implies automatic access and processing without showing which folders were authorized or when content leaves the machine. `docs/specs/11-files-and-projects.md` requires explicitly added folders, exclusions, and opt-in AI tagging per folder.  
   **Concrete fix:** Include an “Add folder” empty state, indexing scope/exclusions, and an off-by-default AI-tagging setting. Before attachment or agent handoff, show the selected files and destination provider. Require redacted sample logs and sanitized markdown previews.

3. **[high] Provider cards promise capabilities that remain unverified.**  
   **Reference:** §§1, 2, 6: “62% of weekly limit,” “Connected via subscription,” and universal model/effort choices.  
   **Why it matters:** `docs/specs/03-connections-and-routing.md` marks Grok as a research spike, other adapters as needing verification, usage as conditional on provider availability, and effort as model-dependent. `src/lib/providers.ts` explicitly marks connections as placeholders. The prompts risk turning assumptions into convincing product claims.  
   **Concrete fix:** Distinguish Available, Needs login, Research pending, and Unsupported. Show “Usage unavailable” or local run counts when no quota exists; disable unsupported effort levels. Reconnect should explain the official-client login step, and Disconnect should clarify that it removes JunOS’s reference.

4. **[high] The foundation does not specify the chosen glass treatment or its readability safeguards.**  
   **Reference:** §0: opaque panel colour `#14161B` and “subtle glass blur on overlays.”  
   **Why it matters:** This describes a different material distribution from the frosted panels in `docs/specs/14-ui-system.md`. It also omits text colours, composited contrast requirements, blur limits, and opaque fallbacks, leaving execution to chance.  
   **Concrete fix:** Define translucent base/raised panels, atmosphere placement, text/scrim tokens, and blur depth. Require text contrast of at least 4.5:1 over the brightest permitted backdrop, no more than two nested blur layers, and opaque variants for unsupported blur and increased-contrast preferences.

5. **[med] Navigation and screen coverage disagree with the wider specification.**  
   **Reference:** §0 sidebar; §§1–6 screen inventory.  
   **Why it matters:** The sidebar omits Inbox, Agents, Workflows, Kanban, and Scout from the UI-system spec, while splitting Files and Projects into destinations served by one prompt. Home also omits “Needs you,” including pending approvals. Conversely, §5 presents Cloud sources that the file spec reserves for v2.  
   **Concrete fix:** Declare the intended phase. For current-phase mockups, use consistent navigation and visibly defer future destinations. Put pending approvals before passive Home summaries; label Cloud as unavailable until its phase.

6. **[med] Home’s grid arithmetic and visual priority are unresolved.**  
   **Reference:** §1: six numbered blocks, Quick ask full width, then “remaining cards in a 3 + 3 masonry.”  
   **Why it matters:** Only five blocks remain after Quick ask. The instruction cannot produce two complete rows of three without inventing content or leaving an orphan. Masonry also weakens scan order across unrelated operational summaries.  
   **Concrete fix:** Specify exact spans and reading order—for example, a full-width Quick ask followed by a larger Needs-you region and smaller operational summaries on aligned rows. Define capped row counts and “View all” links rather than stretching cards.

7. **[med] Fixed panes have no minimum working width or collapse rules.**  
   **Reference:** §2: 260px conversation pane plus 300px Context pane; §3 open drawer; optional mobile follow-up.  
   **Why it matters:** At 1024px, the rail and two Chat panes leave only 400px before gutters for messages, tables, code, and the composer. Only making Home mobile leaves the working screens unresolved.  
   **Concrete fix:** Define desktop and compact layouts for every screen: collapse Context first, then move conversations behind a sheet. Specify drawer width, internal table/code scrolling, and single-pane navigation below 900px, matching the UI-system spec.

8. **[med] Almost every prompt assumes a populated, healthy system.**  
   **Reference:** §§1–6; only §6 explicitly requests an error example.  
   **Why it matters:** A local daemon and several independently connected providers make empty, offline, stale, and partially failed states routine. The existing source already contains empty Files and Tasks screens, but the prompts provide no design for progressing from those states.  
   **Concrete fix:** Request companion states for first run, loading, per-panel failure with Retry, disconnected provider, and daemon offline. Keep successful panels usable and show freshness timestamps for retained data.

9. **[med] “Dense but calm” lacks measurable typography and spacing.**  
   **Reference:** §0: “generous spacing”; §§2, 4–6 combine headers, chips, controls, logs, and metadata.  
   **Why it matters:** Font families alone do not establish hierarchy. Stitch can satisfy the content list by shrinking text, multiplying chip styles, or squeezing rows—especially in the project cards and Chat composer.  
   **Concrete fix:** Add a compact scale: 24px page titles, 16px section titles, 14–16px body, and 12px metadata; use roughly 1.5 line height for prose. Define 24px page gutters, 16px gaps, 20px panel padding, and consistent row heights. Reserve monospace for technical content and constrain Chat prose to the specified 760px maximum.

10. **[med] Accent roles are ambiguous and can produce insufficient contrast.**  
    **Reference:** §0 violet accent and teal “running/healthy”; §1 teal/red dots; §2 tinted messages.  
    **Why it matters:** Running and healthy are different states, and colour-only dots do not communicate their meaning reliably. The supplied violet is approximately **4.27:1 against `#14161B`**; white text on violet is **4.23:1**, below the document’s 4.5:1 normal-text target.  
    **Concrete fix:** Consider warm amber `#F3BD70` for actions/selections, with neutral text and teal reserved for successful outcomes. Amber against `#14161B` is **10.62:1**; `#0B0C0F` labels on amber are **11.48:1**. Give warnings a distinct labelled treatment, and pair every status colour with text/icon. These ratios use solid colours; validate glass composites separately.

11. **[med] Persistent pulse and shimmer have no motion contract.**  
    **Reference:** §4: “Working, teal pulsing” and “progress shimmer.”  
    **Why it matters:** Continuous effects compete with reading live instructions and logs. The prompts omit the reduced-motion requirement already present in the UI-system spec.  
    **Concrete fix:** Use a static Working label plus elapsed time as the baseline. Specify brief state transitions, an option to pause activity auto-scroll, and reduced-motion behaviour that removes pulse, shimmer, and animated atmosphere while preserving status.

12. **[med] The task editor omits controls that determine actual scheduling behaviour.**  
    **Reference:** §3 drawer fields and next-five-runs preview.  
    **Why it matters:** The task spec requires an explicit timezone, catch-up policy, overlap policy, retries, and Inbox delivery. Without these, “Daily at 08:00” looks precise while leaving sleep/restart and timezone behaviour unexplained.  
    **Concrete fix:** Show Europe/Copenhagen beside the schedule and preview; place catch-up, overlap, and retry settings under Advanced. Add Inbox as a destination, inline cron validation, explicit Save/Cancel controls, and a warning when the daemon cannot run during sleep.

13. **[med] Important controls lack keyboard and recovery specifications.**  
    **Reference:** §0 icon rail; §2 open picker; §6 “drag-to-reorder” fallback list.  
    **Why it matters:** An icon rail needs discoverable labels; popovers need predictable focus handling; drag-only ordering excludes keyboard operation. Routing changes can also send subsequent context to a different provider without a visible cue.  
    **Concrete fix:** Require accessible names and focus/hover tooltips, visible focus rings, keyboard picker navigation, Escape dismissal with focus return, and Move up/down alternatives to dragging. Show fallback availability and the actual answering provider in the message header.