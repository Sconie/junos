1. **[high] The supervision UI omits the approval flow.**  
   **Reference:** §§0, 1, 4: navigation without Inbox; Hermes offers “Pause / Stop / Settings” and tool toggles.  
   **Why:** These prompts show an agent executing shell, file and API actions without depicting how Jonas inspects or denies a risky action. This conflicts with the approval requirements in `docs/specs/12-security-and-privacy.md`, and Home omits the “Needs you” priority defined in spec 10.  
   **Fix:** Add Inbox navigation with a pending count, a prominent Home approval summary, and a Hermes `Waiting for approval` state showing the exact command/diff, target, consequence and Approve/Deny controls. Define Stop as always visible, cancelling the current step and pausing the queue.

2. **[high] File intelligence has no visible privacy boundary.**  
   **Quote:** §5: “Local folders,” “AI tag column (auto-generated tags…),” “Give to Hermes.”  
   **Why:** The screen implies automatic access and tagging without showing folder permission or what leaves the machine. Spec 11 requires explicitly added folders, secret exclusions and AI tagging enabled per folder. A project handoff could otherwise appear to authorize an entire directory.  
   **Fix:** Show an empty “Add folder” state, indexed-folder scope, exclusions and an off-by-default AI-tagging setting per folder. Before attaching or handing off content, expose the selected files, receiving model/agent and permission scope.

3. **[high] Connections promise capabilities that the project has not established.**  
   **Quote:** §§1, 2, 6: “62% of weekly limit,” all five provider groups, and “models it unlocks.”  
   **Why:** Spec 03 explicitly marks some integrations as unverified, allows missing usage telemetry, and requires model-specific effort support. The prompts could produce fictional quota precision and universally enabled effort controls. `src/lib/providers.ts` also identifies connections as placeholders.  
   **Fix:** Distinguish connected, login required, rate limited, unavailable, degraded and planned integrations. Show “Usage unavailable” or local run counts when appropriate; disable unsupported model/effort combinations with a reason. Define CLI-owned login and clarify that Disconnect only disconnects JunOS.

4. **[high] The foundation does not actually specify the chosen glass treatment.**  
   **Quote:** §0: “slightly lighter panels (#14161B)” and “subtle glass blur on overlays.”  
   **Why:** This describes opaque working panels with glass restricted to overlays. It diverges from the frosted panels and atmospheric background explicitly chosen in `docs/specs/14-ui-system.md`. Every subsequent prompt inherits that mismatch.  
   **Fix:** Specify translucent panel fills over a controlled atmospheric background, blur strength, border treatment and separate stronger surfaces for menus/drawers. Carry over the spec’s nesting limit and opaque fallback. Require readable text over the brightest background region, including when blur is unavailable.

5. **[high] Colour roles and contrast are underspecified.**  
   **Quote:** §0: “electric violet (#8B5CF6)” and teal for “running/healthy”; §1: “teal/red status dot.”  
   **Why:** There are no foreground tokens or control-state pairs. Calculated solid-colour contrast is **4.27:1** for the violet on `#14161B`, and **4.23:1** for white on violet—both below 4.5:1 for normal text. Glass compositing introduces additional variation. Running also does not necessarily mean healthy.  
   **Fix:** Define text, muted text, action, focus, warning, failure and operational-state roles with explicit foreground/background pairs. A viable alternative is the existing source accent **`#7C9CFF`**: **6.94:1** on `#14161B`, with **`#0B0C0F`** button text at **7.50:1**. Its blue is distinct from teal success and amber warning; white button text would fail at **2.61:1**. Validate final pairs over composited glass, and accompany status colours with words or icons.

6. **[med] Fixed pane widths leave the working content squeezed.**  
   **Reference:** §2: 260px conversation list, 300px Context panel; §3: table plus open drawer; §5: tree, cards, browser and preview.  
   **Why:** At 1024px, Chat’s rail and side panels consume 624px before gutters, leaving only 400px for the conversation. The table and file browser have similarly competing regions. Only Home receives an optional mobile treatment.  
   **Fix:** Specify collapse priorities and minimum working widths: hide Context first, make conversation navigation a drawer, and use full-screen sheets for details at narrow widths. Define table overflow, sticky identifying columns and file-preview replacement behavior. Apply the responsive contract to every prompt.

7. **[med] Home’s grid instruction is contradictory and lacks priority.**  
   **Quote:** §1: six numbered cards; “quick ask spans full width… remaining cards in a 3 + 3 masonry.”  
   **Why:** Five cards remain after Quick ask, not six. Masonry also leaves reading order and alignment ambiguous. Operational urgency receives no visual priority over subscriptions and recent files.  
   **Fix:** Give each remaining block an explicit column span and order. Place pending decisions/failures immediately after Quick ask; keep subscriptions and recents secondary. Set shared gutters, panel padding and row limits with “View all,” rather than filling gaps with extra content.

8. **[med] The prompts mostly depict populated success states.**  
   **Reference:** §§1–5; §6 requests only one expired-session example.  
   **Why:** First launch, stopped daemon, unavailable agent, empty folders and interrupted chat are core experiences for this local app. Spec 14 explicitly requires loading, empty, error, offline and disconnected states. A single provider error does not establish those patterns.  
   **Fix:** Add a shared state contract and a small set of separate state prompts: first-run Home, offline daemon, Chat streaming/cancelled/error, unavailable Hermes, and empty/failed Files. Preserve drafts and partial output; put recovery actions beside the failure.

9. **[med] Scheduling lacks the controls needed to interpret “08:00” safely.**  
   **Quote:** §3: “Every weekday at 08:00” and “preview of the next 5 run times.”  
   **Why:** No timezone, sleep/catch-up policy or overlap setting is visible. Spec 05 requires these. The drawer also contains neither an explicit Save action nor an enable/pause state, making the moment a recurring task becomes active unclear.  
   **Fix:** Show an editable timezone defaulting to Europe/Copenhagen, dated previews with timezone/offset, catch-up and overlap settings, and explicit Save/Cancel controls. State whether saving enables the task; include the specified Inbox output destination.

10. **[med] Accessibility is left for the generator to invent.**  
    **Quote:** §0: “slim left icon sidebar”; §6: “drag-to-reorder list.”  
    **Why:** Neither accessible names/tooltips nor keyboard alternatives are requested. Popovers, tabs, trees and drawers also lack focus behavior. These omissions can make navigation and routing configuration unusable without a pointer.  
    **Fix:** Add a foundation-level interaction contract: named icons, visible focus, keyboard navigation, labelled fields, Escape dismissal and focus return. Provide Move up/down controls for routing order. Show `Ctrl+K` on Windows and `⌘K` on macOS.

11. **[med] Continuous motion has no limits or static equivalent.**  
    **Quote:** §4: “teal pulsing,” “progress shimmer,” and a “live Activity timeline.”  
    **Why:** Persistent animation can compete with reading commands and logs. Incoming activity can also move content while Jonas is inspecting a step. Spec 14 already requires reduced-motion support, but the prompts omit it.  
    **Fix:** Use a static labelled running state under reduced motion, avoid animated atmospheric glow, and limit animation to brief state transitions. Preserve scroll position when reading older activity; offer a “New activity” control instead of forcing autoscroll.

12. **[med] Typography and density have no measurable specification.**  
    **Quote:** §0: “Inter,” “JetBrains Mono,” “generous spacing,” “dense but calm.”  
    **Why:** Font families alone do not establish hierarchy. Provider headers, cron expressions, paths, chips and logs could all receive equally small, muted treatment, producing a polished-looking but tiring workspace.  
    **Fix:** Define a compact scale—for example, 24px page titles, 16px section titles, 14px rows and metadata, and 16px chat text—with explicit line heights. Set consistent panel padding/gutters, tabular time and usage figures, a readable chat measure, and wrapping/expansion rules for long paths, code and logs.

13. **[med] The prompt pack does not distinguish current scope from later concepts.**  
    **Reference:** §0 includes separate Files and Projects destinations; §5 combines them and presents Cloud; §6 presents every integration equally.  
    **Why:** The UI spec uses a combined Files destination and adds Inbox, Agents, Workflows, Kanban and Scout. Cloud is v2 in spec 11. Without a scope label, this document can become a competing navigation specification and imply that later capabilities ship together.  
    **Fix:** Label the pack’s intended milestone, align its shell with that milestone, and explicitly mark deferred destinations/integrations. Add separate prompts only for screens included in that milestone; depict Cloud as deferred rather than populated and functional.

14. **[med] Expandable logs lack a redaction and disclosure rule.**  
    **Quote:** §§3–4: “expandable log output,” “expandable input/output,” and “Logs (raw terminal-style log).”  
    **Why:** Tool arguments and terminal output can contain credentials or private content. Spec 12 requires secret redaction; “raw” leaves that boundary ambiguous, especially for copying or exporting output.  
    **Fix:** Request terminal styling with redacted content, visible redaction markers and safe copy/export behavior. Require synthetic names, paths, messages and credentials in Stitch examples, including any screenshots supplied as references.