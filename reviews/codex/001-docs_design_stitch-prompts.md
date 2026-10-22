1. **[high] Risky agent actions have no approval flow.**  
   **Reference:** §2 “tools … (toggles for Files, Web, Hermes, Tasks)”; §4 “shell, browser, file edit, API”; §5 “Give to Hermes.”  
   **Why it matters:** These controls grant or initiate work without showing scope, pending approval, or the exact proposed action. [Security policy](E:/AI/review-loop/junos/docs/specs/12-security-and-privacy.md) requires approvals for external sends, destructive actions, and spending; the prompts omit that interaction entirely.  
   **Concrete fix:** Add a Hermes `Waiting for approval` variant showing the command/diff, affected project, Approve/Deny, and expiry. Specify that tool toggles cannot bypass approval policy, and distinguish agent Stop from the global stop-all control.

2. **[high] File discovery and agent inspection omit privacy boundaries.**  
   **Reference:** §5 “Local folders,” “auto-generated tags,” rendered preview; §4 “expandable input/output” and “raw terminal-style log.”  
   **Why it matters:** The prompts imply unrestricted browsing and automatic AI processing without showing what stays local or reaches a provider. [Files privacy requirements](E:/AI/review-loop/junos/docs/specs/11-files-and-projects.md) require explicitly added folders, secret exclusions, and opt-in AI tagging; the security spec requires redacted logs.  
   **Concrete fix:** Show “Add folder,” indexing scope, excluded paths, and per-folder AI tagging consent. Identify the receiving provider before attaching content. Require redacted previews/logs and synthetic sample data in Stitch.

3. **[high] Provider cards promise capabilities the project has not established.**  
   **Reference:** §1 “62% of weekly limit”; §2 every provider “Connected via subscription” and universal Low/Medium/High/Max; §6 subscription linking and usage meters.  
   **Why it matters:** [Connection specifications](E:/AI/review-loop/junos/docs/specs/03-connections-and-routing.md) mark several integrations as unverified, condition usage meters on available telemetry, and disable unsupported effort levels. [Current provider data](E:/AI/review-loop/junos/src/lib/providers.ts) explicitly marks every connection as a placeholder. The prompts turn uncertainty into apparent product guarantees.  
   **Concrete fix:** Supply a capability matrix with supported, experimental, unavailable, and unknown states. Show “Usage unavailable” when appropriate, disable unsupported efforts, and specify official-client sign-in instructions rather than generic OAuth/session handling.

4. **[med] Navigation omits the product’s attention and approval destinations.**  
   **Reference:** §0 sidebar lists Home, Chat, Hermes, Tasks, Files, Projects; §1 dashboard omits “Needs you.”  
   **Why it matters:** [The UI system](E:/AI/review-loop/junos/docs/specs/14-ui-system.md) includes Inbox, Agents, Workflows, Kanban, and Scout. [Home requirements](E:/AI/review-loop/junos/docs/specs/10-home-and-search.md) prioritize pending approvals. Conversely, the prompts create separate Files and Projects destinations but provide only one combined screen.  
   **Concrete fix:** Declare the targeted release scope and use one matching navigation map throughout. Include Inbox and a prominent pending-approval summary wherever automation is shown; resolve Files versus Projects explicitly.

5. **[med] Later-phase features appear indistinguishable from initial functionality.**  
   **Reference:** §5 Cloud sources, natural-language search, AI tags, and activity sparklines.  
   **Why it matters:** Cloud browsing is v2 in the files spec; indexing/search arrive in Phase 4 of [the roadmap](E:/AI/review-loop/junos/docs/specs/13-roadmap.md). Presenting everything as populated and interactive encourages a much larger implementation than the planned first working chat path.  
   **Concrete fix:** Label each screen with its phase. Provide an initial-release variant with deferred controls omitted or explicitly unavailable, and a separately labelled future-state concept.

6. **[med] Task creation leaves operational decisions and completion actions unspecified.**  
   **Reference:** §3 schedule builder and task drawer.  
   **Why it matters:** “Every weekday at 08:00” is ambiguous without timezone. Missing catch-up and overlap policies conceal what happens after sleep or during a long run. The drawer also names no Save/Create/Cancel actions. These behaviors are already defined in [scheduling rules](E:/AI/review-loop/junos/docs/specs/05-tasks-and-workflows.md).  
   **Concrete fix:** Show editable Europe/Copenhagen timezone, timezone-labelled previews, invalid-cron feedback, and advanced catch-up/overlap settings. Add Create/Save and Cancel actions, plus visible saved, paused, and failed states.

7. **[med] Happy-path compositions lack the states needed for a local-first app.**  
   **Reference:** §§1–5 show populated dashboards, running agents, and existing files; §6 includes only one expired-session example.  
   **Why it matters:** A stopped daemon, missing CLI, empty library, or failed stream needs a different next action. Without explicit variants, generated screens can imply successful connectivity even when the app cannot perform work. The UI-system spec requires these states.  
   **Concrete fix:** Append a shared state checklist: loading, empty with next action, local daemon offline, provider unavailable, error with retry, and stale data. Add Chat streaming/cancelled and Hermes disconnected/waiting variants.

8. **[med] Fixed multi-pane layouts have no fit or collapse rules.**  
   **Reference:** §2 uses 260px and 300px side panels; §3 combines a wide table with an open drawer; §5 combines tree, cards, browser, and preview. Mobile is an optional Home-only follow-up.  
   **Why it matters:** At 1024px, Chat’s side panels and 64px rail already consume 624px before gutters. Neither skill’s app guidance supports simply squeezing the remaining work area. [The UI system](E:/AI/review-loop/junos/docs/specs/14-ui-system.md) already specifies behavior below 900px.  
   **Concrete fix:** Define minimum central-pane widths, when context collapses, and when drawers become overlays or full-screen sheets. Request tablet and 390px variants for each complex screen, with one active pane at narrow widths.

9. **[med] Home’s grid arithmetic is contradictory and its hierarchy is underdefined.**  
   **Reference:** §1 “quick ask spans full width … remaining cards in a 3 + 3 masonry.”  
   **Why it matters:** Six blocks are listed in total; five remain after Quick ask. “3 + 3” therefore cannot describe the remaining block count, and no alternative column-span interpretation is supplied. The equal-card framing also gives subscription telemetry and recent files similar weight to agent work.  
   **Concrete fix:** Replace masonry wording with explicit row/column spans. Give Quick ask and attention-needed items the strongest hierarchy; group subscription information into compact secondary rows. Make reading and keyboard order match the visual order.

10. **[med] The style foundation conflicts with the later chosen visual system.**  
    **Reference:** §0 specifies opaque `#14161B` panels, 10px corners, and glass only on overlays.  
    **Why it matters:** [The later UI system](E:/AI/review-loop/junos/docs/specs/14-ui-system.md) records Jonas’s chosen Translucent Glass direction with translucent panels, 12px corners, and atmospheric backgrounds. Reusing the prompts can generate a competing design system.  
    **Concrete fix:** State which document owns visual truth and align the prompt tokens with it. Preserve the chosen glass identity while carrying over its blur limits, opaque fallback, contrast requirements, and reduced-motion behavior.

11. **[med] The art direction relies on familiar AI-dashboard shorthand.**  
    **Reference:** §0 “mix of Linear, Raycast and a terminal”; §1 greeting plus card grid; §5 project cards with activity sparklines.  
    **Why it matters:** Borrowed product names, violet chrome, repeated rounded cards, badges, and decorative activity charts describe a category more clearly than JunOS itself. Removing these mechanically would also be wrong: the later spec explicitly pins the glass aesthetic.  
    **Concrete fix:** Define the composition around JunOS’s actual job: a directive, its current run, and the next decision Jonas needs to make. Keep the approved palette/material, use compact rows for subscriptions and files, and retain sparklines only when they answer a stated question.

12. **[med] “Dense but calm” lacks typography, spacing, and accessibility specifications.**  
    **Reference:** §0 “generous spacing”; §1 teal/red status dots; §4 pulsing status and progress shimmer.  
    **Why it matters:** Font families and corner radii do not establish hierarchy or rhythm. Unspecified sizing invites tiny metadata and inconsistent density; colour-only dots and continuous motion weaken usability. Both requested skills emphasize readable app typography, consistent spacing, and restrained status treatment.  
    **Concrete fix:** Add a compact scale: approximately 24px screen titles, 14–16px working text, readable secondary labels, consistent 8px-based spacing, and defined row heights. Require text alongside status dots, visible keyboard focus, accessible icon labels, contrast checks, and reduced-motion alternatives.