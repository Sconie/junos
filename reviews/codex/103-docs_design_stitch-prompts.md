1. **[high] Safety controls are missing from the shared shell and agent prompts.**  
   **Reference:** §0 top bar; §4 “buttons Pause / Stop / Settings.”  
   Stop is available only inside Hermes, and no prompt depicts a pending approval. Generated screens would omit the controls required by `12-security-and-privacy.md` and `14-ui-system.md`: global Stop, exact-action approval, expiry, and honest cancellation states.  
   **Fix:** Add the shared StopControl wherever a run is active, plus an ApprovalCard example showing actor, action/diff, target, expiry and Approve/Deny. Include `cancelling`, expired/resolved approvals, and remote **“stop not confirmed.”**

2. **[high] Provider routing lacks the consent boundary for sending private context.**  
   **Quote:** §6 “fallback order (drag-to-reorder list)”; §2 “tools the model can use (toggles…).”  
   The prompts show convenient routing and tool access without explaining which providers may receive attachments/history or that toggles merely request capabilities. This conflicts with the allowed-provider and permission rules in specs 03, 04 and 12.  
   **Fix:** Show a conversation/workflow’s allowed providers, a disclosure before sending context to a new provider, and fallback restricted to that list. Label tools as requests subject to project permissions. Specify that command-palette navigation never submits a prompt automatically.

3. **[high] Files appear automatically processed and freely transferable to remote Hermes.**  
   **Quote:** §5 “AI tag column (auto-generated tags…)” and “Give to Hermes.”  
   No folder opt-in, processing indicator, exclusion boundary or remote-transfer disclosure appears. Hermes works on a VPS; this action can move private local content off the machine. Specs 06 and 11 explicitly distinguish local access from git/upload handoff.  
   **Fix:** Depict an explicitly added folder, AI tagging off until enabled, the processing provider, and excluded-file states. Before handoff, show the selected files/repository, remote destination and transfer method, with the required approval. State that previews use the safe rendering pipeline.

4. **[med] Connection cards promise capabilities the project has not established.**  
   **Quote:** §2 every disconnected provider gets “a Connect link”; §6 cards include “OAuth,” “Local session,” usage meters and unlocked models.  
   Spec 03 makes Claude/Codex initial targets, Cursor/Nous conditional, and Grok unavailable. Usage percentages are conditional on provider telemetry; the scaffold’s provider flags are explicitly placeholders. The prompts invite convincing but unsupported product claims.  
   **Fix:** Provide fixtures for verified, unverified, unavailable, needs-login and rate-limited providers. Use official-client sign-in instructions; define Disconnect as removing JunOS’s reference. Show **“Usage unavailable”** or labelled local counts when no meter exists. Disable unsupported model/effort combinations.

5. **[med] The foundation does not describe the settled glass execution or measurable contrast.**  
   **Quote:** §0 opaque panel colours and “subtle glass blur on overlays.”  
   This confines glass to overlays rather than defining frosted panels over the atmospheric background. Text, muted text, borders and accent foregrounds are unspecified, leaving legibility dependent on the generated backdrop. For example, white on the prescribed violet `#8B5CF6` is approximately **4.23:1**, below a 4.5:1 normal-text target.  
   **Fix:** Specify panel tint/opacity, bounded backdrop luminance, blur depth, foreground roles and opaque/high-contrast fallbacks. Soft green `#7FD6A4` is a viable accent candidate: `#0B0C0F` text on it gives approximately **11.23:1**. Keep teal status distinguishable through text/icons. Validate contrast on composited glass, not just solid swatches.

6. **[med] Navigation omits the decision queue and contradicts the current information architecture.**  
   **Quote:** §0 “Home, Chat, Hermes, Tasks… Files, Projects.”  
   Inbox is absent despite being part of the first release and the authority for approvals/results. Files and Projects become separate destinations even though §5 combines them; the current specs and scaffold also combine them.  
   **Fix:** Align the shell with `14-ui-system.md`: primary Home, Inbox, Chat, Tasks, Kanban and Hermes; secondary Workflows, Scout and Files/projects. Give Inbox an unread/approval badge and add its screen prompt. Mark later-phase destinations appropriately.

7. **[med] The desktop layouts lack a viable width budget and collapse rules.**  
   **Reference:** §2 fixed 260px conversation list and 300px Context panel; §3 table plus open drawer; §5 tree, project cards, browser and preview.  
   At 1024px, Chat’s fixed panes and 64px rail leave only **400px before gutters** for the thread. The Tasks and Files compositions face similar crowding. A mobile Home follow-up does not resolve these working screens.  
   **Fix:** Define a minimum usable center width and collapse secondary panes before reaching it. Use one active sheet at narrow widths, preserve list scroll position, and confine wide tables/code blocks to internal scrolling. Specify desktop, tablet and 390px variants for each multipane screen.

8. **[med] Home’s grid arithmetic and visual priority are unresolved.**  
   **Quote:** §1 “quick ask spans full width… remaining cards in a 3 + 3 masonry.”  
   There are only five remaining cards. No spans, heights or order resolve that mismatch, and masonry makes scanning less predictable. Subscriptions and recent files receive similar emphasis to operationally urgent work, while the specified “Needs you” summary is absent.  
   **Fix:** Add Needs you, establish it as the operational priority, and assign explicit 12-column spans. Use aligned groups with bounded row counts and View all links. Keep Quick ask compact and place blocked approvals/failures before passive inventory.

9. **[med] The task editor omits essential scheduling context and completion controls.**  
   **Quote:** §3 drawer fields and “preview of the next 5 run times.”  
   The preview has no timezone, and the drawer specifies neither Save/Cancel nor validation. Catch-up, overlap and daemon-down behaviour from spec 05 are invisible, making unattended execution easy to misunderstand. Inbox is also missing from output destinations.  
   **Fix:** Show Europe/Copenhagen as an editable timezone beside dated previews, including daylight-saving offsets where relevant. Add Save/Cancel, invalid-cron feedback, one-off scheduling and an Advanced section for catch-up/overlap. Include Inbox output and a daemon-offline scheduling notice.

10. **[med] State coverage is too narrow to produce trustworthy operational screens.**  
    **Quote:** §6 “Include one card in an error state”; other prompts primarily show populated, working screens.  
    Empty installations, stale telemetry, partial failures, offline daemon and unreachable VPS are unspecified. An attractive working-state mockup cannot establish whether missing data looks like zero or whether old activity looks live.  
    **Fix:** Request a compact state sheet per screen: loading, empty with next action, partial error with Retry, stale with timestamp, and offline/unreachable. Include a timestamp on usage/activity snapshots and retain existing data during refresh.

11. **[med] Typography and spacing are adjectives rather than a usable system.**  
    **Quote:** §0 “generous spacing” and “dense but calm”; §2 “small header”; §4 “compact cards.”  
    Font families alone do not control hierarchy. Repeated cards, chips, monospace metadata and logs can all compete at the same size, particularly over glass.  
    **Fix:** Define a small scale—for example, 24px page titles, 16px section headings, 14px UI text and 12px metadata—with weights and line heights. Use 16px chat prose with a readable maximum width, an 8px spacing rhythm, consistent panel padding/gutters and explicit row heights. Give secondary metadata lower emphasis without sacrificing contrast.

12. **[med] Motion, status and icon navigation lack accessible alternatives.**  
    **Quote:** §4 “teal pulsing” and “progress shimmer”; §1 “teal/red status dot”; §0 “icon sidebar.”  
    Continuous effects can distract during supervision, colour-only dots obscure state, and an eight-item icon rail without named tooltips is difficult to learn or operate by keyboard.  
    **Fix:** Make pulse/shimmer optional and replace them with static labelled progress under reduced motion. Pair every status dot with text or an icon. Specify accessible names, hover/focus tooltips, visible focus, keyboard popover operation and Escape/focus-return behaviour. Show `Ctrl+K` on Windows.

13. **[low] The document’s instructions conceal its historical status and delivery scope.**  
    **Quote:** Opening “paste prompt 0 first”; §5 cloud sources; optional light/mobile variants.  
    `00-overview.md` explicitly calls this historical input and names spec 14 as implementation authority. Here it reads like a current, complete generation recipe, mixing first-release functionality with later Hermes, indexing, cloud and responsive work.  
    **Fix:** Add a short historical-status notice and authority link. Label prompts and features by delivery phase, and distinguish illustrative fixtures from verified capabilities. If retained as a reusable recipe, reconcile its navigation, safety components and tokens before directing anyone to paste it.