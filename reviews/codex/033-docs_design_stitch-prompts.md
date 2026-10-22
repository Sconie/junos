1. **[high] Approval and intervention states are missing.**  
   **Reference:** §§2–4: tool toggles, “Run now,” shell/browser/file/API activity, and Pause / Stop.  
   **Why it matters:** The prompts show execution without showing how Jonas reviews risky actions. This omits the approval flow required by `12-security-and-privacy.md` and the waiting-approval banner required by `06-hermes.md`. Home also omits the “Needs you” card from `10-home-and-search.md`.  
   **Concrete fix:** Add an approval-required example with the exact command or diff, affected paths or destination, and Approve / Deny. Show queued work waiting for a decision. Specify that Stop cancels the current step and pauses the queue; distinguish it from Pause.

2. **[high] File browsing implies automatic access and AI processing.**  
   **Quote:** §5: “Local folders,” “Cloud,” “AI tag column (auto-generated tags),” and “Give to Hermes.”  
   **Why it matters:** Nothing communicates folder allowlisting, excluded secrets, opt-in tagging, or what content will leave the machine. Those boundaries are explicit in `11-files-and-projects.md`. Expandable raw inputs/outputs in §4 also lack the redaction requirement from the security spec.  
   **Concrete fix:** Include an “Add allowed folder” empty state, per-folder AI-tagging opt-in, excluded-file feedback, and an attachment summary identifying the receiving model and included files. Require synthetic sample content and redacted logs in generated screens.

3. **[high] Provider cards promise capabilities the project has not established.**  
   **Quote:** §§1, 2, 6: “62% of weekly limit,” “Connected via subscription,” universal Low / Medium / High / Max, and OAuth / Local session labels.  
   **Why it matters:** `03-connections-and-routing.md` marks Grok as a research spike, other integrations as needing verification, usage meters as conditional, and effort levels as model-dependent. `src/lib/providers.ts` explicitly contains placeholders. The prompts would turn uncertain integrations into apparently working features.  
   **Concrete fix:** Supply examples for unavailable, needs-login, rate-limited, degraded, and unverified providers. Use “Usage unavailable” when necessary; disable unsupported effort levels. Specify official-client sign-in instructions and clarify that Disconnect removes JunOS’s reference without signing the CLI out.

4. **[high] The foundation does not actually specify the chosen glass execution.**  
   **Quote:** §0: solid panels `#14161B`, “Rounded corners 10px,” and “subtle glass blur on overlays.”  
   **Why it matters:** This describes predominantly opaque screens with glass overlays. The chosen direction in `14-ui-system.md` uses frosted panels over an atmospheric background, 12px radii, defined translucency, and explicit accessibility fallbacks. Following this prompt can produce the wrong material treatment.  
   **Concrete fix:** Put the glass surface recipes directly into prompt 0: background atmosphere, panel opacity, blur, borders, text colours, and stacking limits. Carry over the spec’s 4.5:1 text requirement, opaque fallback, higher-contrast treatment, and reduced-motion support. Validate contrast over the brightest background regions and overlapping panels.

5. **[med] Navigation and screen coverage disagree with the documented product.**  
   **Reference:** §0 lists eight destinations, including separate Files and Projects; §5 combines Files & Projects.  
   **Why it matters:** `14-ui-system.md` instead includes Inbox, Agents, Workflows, Kanban, and Scout, with Files as one destination. The prompts omit those screens without declaring themselves a subset. Settings appears in navigation but has no prompt.  
   **Concrete fix:** Declare the document’s phase and coverage, align the shared navigation with the UI spec, and define where Projects opens. Label deferred destinations explicitly rather than generating apparently complete navigation to unspecified screens.

6. **[med] Home has an impossible grid instruction and weak priority.**  
   **Quote:** §1: Quick ask spans full width, followed by “remaining cards in a 3 + 3 masonry.”  
   **Why it matters:** Only five cards remain. Their differing content lengths also make equal visual weight and masonry order unreliable. Subscription meters and recent files can dominate while approvals—the most consequential information—are absent.  
   **Concrete fix:** Replace “3 + 3 masonry” with explicit column spans and reading order. Put pending decisions immediately after Quick ask, then active work and upcoming runs; place subscriptions and recents lower. Define card padding, gutters, row limits, and “View all” links.

7. **[med] Fixed panes lack a usable minimum-width plan.**  
   **Reference:** §2 fixes conversation and context panes at 260px and 300px; §3 opens a drawer beside a seven-column table; §5 adds a tree, browser, and preview.  
   **Why it matters:** At a 1024px viewport, Chat leaves only 400px before gutters and padding after subtracting its panes and 64px rail. The other screens are similarly vulnerable to cramped content. Making only Home mobile-friendly as an optional follow-up does not resolve desktop resizing or zoom.  
   **Concrete fix:** Specify collapse thresholds and minimum working widths. Move context and previews into sheets when necessary; define contained table scrolling and wrapping for long paths and model names. Align narrow-screen navigation with the below-900px rule in `14-ui-system.md`.

8. **[med] Typography and colour roles are too vague to protect legibility.**  
   **Quote:** §0: “dense but calm”; §2: “tiny provider logo”; repeated unspecified grey labels and tinted surfaces.  
   **Why it matters:** No body size, metadata floor, line height, spacing scale, or focus treatment is supplied. The two opaque surface colours differ by only **1.08:1**, so they provide little separation by themselves. If violet becomes a filled button, white text on `#8B5CF6` is **4.23:1**, below 4.5:1 for normal text.  
   **Concrete fix:** Define a compact type scale, 14–16px working text, readable metadata, consistent spacing, and explicit text/control/focus colours. Consider warm amber `#F5B544` for primary actions: it separates action from teal health status and gives **9.98:1** against `#14161B`; dark `#0B0C0F` text on amber gives **10.78:1**. These are opaque-pair calculations; glass combinations still need validation.

9. **[med] Happy-path mockups omit essential interaction and recovery states.**  
   **Reference:** §6 requests one expired-session card; other screens mostly show populated, working states.  
   **Why it matters:** `14-ui-system.md` requires loading, empty, error, offline-daemon, and disconnected-provider states. The prompts also omit streaming cancellation, visible keyboard focus, accessible icon labels, and dialog focus behaviour. Status dots in Upcoming runs depend on colour alone.  
   **Concrete fix:** Add a shared state checklist and targeted follow-up prompts for first use, daemon offline, partial loading failure, disconnected composer, and cancelled output. Require labelled statuses, accessible rail tooltips, keyboard-operable pickers, Escape dismissal, and focus return. Show Ctrl+K for this Windows environment.

10. **[med] Scheduling looks precise while omitting time semantics and save behaviour.**  
    **Reference:** §3: cron builder, next five run times, and 24-hour timeline.  
    **Why it matters:** The prompt omits timezone, daylight-saving behaviour, overlap/catch-up policy, validation, and Save / Cancel. `05-tasks-and-workflows.md` defines these operational rules. A convincing mockup could still leave Jonas unsure when a task will run or whether changes were saved.  
    **Concrete fix:** Show editable `Europe/Copenhagen`, timezone-qualified previews, invalid-cron feedback, Save / Cancel, and an advanced section for catch-up and overlap. Give timeline markers readable time labels or keyboard-accessible details.

11. **[med] Continuous motion has no limits or quiet alternative.**  
    **Quote:** §4: “Working, teal pulsing,” “live Activity timeline,” and “progress shimmer.”  
    **Why it matters:** Persistent pulse, shimmer, and incoming activity compete with the directive stream. The prompt never specifies reduced motion, stable scroll position, or how to inspect earlier events without being pulled back to the newest step.  
    **Concrete fix:** Use static labelled progress under reduced motion, bound decorative animation, and avoid animating blur. Preserve scroll position while reading history; show a “New activity” control instead of forcing autoscroll. Keep Stop stationary and visible.

12. **[low] Generation instructions can produce duplicate screens and premature scope.**  
    **Reference:** §0 asks Stitch to design Home; §1 asks for Home again. §5 includes cloud sources without marking their phase.  
    **Why it matters:** The opening says one screen per prompt, but the foundation already generates the next screen. Cloud access is v2 in the files spec, and the roadmap stages functional delivery rather than promising every integration immediately.  
    **Concrete fix:** Make prompt 0 style-and-shell instructions only, then generate Home once. Mark each screen’s implemented, mocked, and deferred capabilities, including cloud sources. Specify those distinctions visually so design polish does not imply backend readiness.