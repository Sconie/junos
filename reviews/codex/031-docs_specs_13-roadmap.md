1. **[high] Approval enforcement arrives after unattended tool execution.**  
   **Reference:** Phase 2 introduces “prompt/tool/output steps”; Phase 3 adds “approvals in Inbox”; Phase 4 adds “sandboxed shell, approval rules UI.”  
   **Why it matters:** Automation can perform writes before Jonas can approve them. Real Hermes execution also precedes sandboxing. This leaves the safeguards required by [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) outside the phases that first need them.  
   **Concrete fix:** Gate Phase 1 tool access on enforced permissions and cancellation. Require approval pause/resume, exact command/diff review, timeout denial, audit logging, and a global stop before Phase 2 tools run unattended. Require sandboxing before real shell-capable agents; defer only the advanced rules editor.

2. **[high] The daemon’s first release has an incomplete security gate.**  
   **Quote:** Phase 1: “junosd with SQLite, auth token, SSE, event table.”  
   **Why it matters:** An auth token alone does not establish the localhost protections specified in doc 12: loopback binding, strict origin/host validation, secure pairing, secret storage, and log redaction. The milestone can pass without these controls.  
   **Concrete fix:** Add these as Phase 1 prerequisites, including Windows token-file permissions. Require negative tests for missing/invalid tokens, hostile origins/hosts, pairing-token leakage, and secret-bearing logs.

3. **[high] Automatic routing fallback lacks a privacy boundary.**  
   **Quote:** Phase 1 includes “routing fallback.”  
   **Why it matters:** Chat supports replaying history across providers and attaching files ([04-chat.md](docs/specs/04-chat.md)). A fallback can therefore disclose the same context to another provider. The roadmap requires no consent policy or destination preview before this becomes real.  
   **Concrete fix:** Require an approved fallback-provider list per conversation/workflow. Before the first cross-provider transfer, show the destination and context scope; stop rather than silently reroute when approval is absent. Test that a provider failure cannot expand the permitted audience.

4. **[high] The Phase 2 acceptance scenario depends on integrations outside its scope.**  
   **Quote:** “a daily morning briefing runs unattended for a week”; “3 starter workflows.”  
   **Why it matters:** The briefing in [05-tasks-and-workflows.md](docs/specs/05-tasks-and-workflows.md) needs calendar, mail, and news, while doc 07 defers mail/calendar sources to v2. Doc 05 also lists six starter workflows without identifying which three ship here. The milestone has no agreed implementable boundary.  
   **Concrete fix:** Name the three workflows and their dependencies. Make the initial briefing use explicitly configured feeds and local inputs, or schedule the missing authenticated integrations and read permissions before this milestone.

5. **[med] The foundational phase contradicts the early vertical-slice principle.**  
   **Quote:** “get one real end-to-end path working early” versus five one-day spikes, a monorepo conversion, and mock UI “for all screens” before Phase 1.  
   **Why it matters:** Five spike days already precede migration and screen work. Each is also a blocking dependency under “no phase starts before the last passes,” including providers unnecessary for the first Claude conversation. Doc 01 places the migration in Phase 1 instead.  
   **Concrete fix:** Limit Phase 0 to the Claude feasibility spike, minimum shared contracts, and Chat/Connections states. Move optional-provider spikes alongside their delivery phases, choose one migration point, and replace “days” with a bounded estimate and explicit deferrals.

6. **[med] Unattended reliability precedes an agreed operating model and recovery proof.**  
   **Reference:** Phase 2’s week-long unattended run; Phase 5’s “Tauri or service install” and “backups UI.”  
   **Why it matters:** The roadmap never defines how the daemon stays running or restarts during the Phase 2 trial. It also does not schedule the underlying nightly backups required by docs 02/12; a later backup UI does not establish recoverability.  
   **Concrete fix:** Establish a repeatable background launch/restart method before Phase 2. Start automated backups with persisted Phase 1 history, and require a restore check. Test sleep/wake, restart during execution, catch-up, and overlap policies rather than relying solely on an uneventful week.

7. **[med] Token adoption has no glass-legibility or palette acceptance gate.**  
   **Quote:** Phase 0: “Adopt the Translucent Glass tokens (14).”  
   **Why it matters:** Token replacement does not verify contrast across glow positions, overlapping panels, selections, and focus states. It can also regress existing styling: `src/index.css` uses the accent as a filled background with dark text. With doc 14’s violet, `#E7E8EC` text on `#8B5CF6` is only **3.46:1**; the existing dark label `#0E0F13` achieves a marginal **4.52:1** on that solid fill.  
   **Concrete fix:** Add Phase 0 acceptance checks for actual composited backgrounds, normal text at ≥4.5:1, control/focus indicators at ≥3:1, and an explicit opaque mode alongside the unsupported-blur fallback. Consider a blue action palette: `#E7E8EC` on solid `#1D4ED8` gives **5.47:1**; `#93C5FD` on an opaque `#202127` fallback gives **8.90:1**. This separates actions from teal success states; translucent variants still need measurement.

8. **[med] UI quality is deferred without measurable hierarchy, typography, or density criteria.**  
   **Reference:** Phase 0 ends when mock screens run; the testing section promises “Playwright smoke test per screen”; Phase 5 is “Polish.”  
   **Why it matters:** Route smoke tests can pass with unreadable logs, competing actions, cramped tables, or overflowing panes. The current source has a 220px sidebar and a 720px responsive breakpoint, while doc 14 specifies a 64px rail and navigation changes below 900px. “Adopt tokens” does not cover that structural work.  
   **Concrete fix:** Add a UI gate to each delivering phase: one clear primary task, defined type/spacing/row-density tokens, realistic long-content fixtures, and loading/empty/error/offline states. Review Chat, Inbox, Tasks, and Hermes at desktop, tablet, and 390px, including 200% zoom, keyboard navigation, readable pane widths, and contained overflow.

9. **[med] Motion and blur performance have no delivery owner.**  
   **Reference:** Phase 0 adopts glass; Phase 3 delivers the Hermes console; Phase 5 lists general polish.  
   **Why it matters:** Doc 06 specifies pulsing status and shimmering activity, while doc 14 requires reduced motion and limits blur nesting. The roadmap never makes these requirements a condition of shipping either surface.  
   **Concrete fix:** Add reduced-motion and opaque/high-contrast checks to Phase 0, then verify them again with the Phase 3 live stream. Disable pulse/shimmer and unnecessary travel under reduced motion, preserve textual status, batch activity updates, and measure scroll/input responsiveness with representative logs and the allowed blur layers.

10. **[med] “Switchable” mocks can misrepresent operational state.**  
    **Quote:** “keep mock data switchable.”  
    **Why it matters:** Once real connections and approvals exist, unlabeled fixtures can make a simulated approval, successful run, or connected provider appear authoritative. No rule separates mock state, persistence, or commands from live execution.  
    **Concrete fix:** Require a persistent Demo indicator, isolated fixture storage and event streams, and a hard boundary preventing demo actions from reaching real adapters. Specify how switching modes handles active runs and cached data.

11. **[med] Phase gates do not cover their promised scope, and Phase 5 has none.**  
    **Reference:** Phase 3 passes after one Hermes handoff despite also promising Cursor/Nous; Phase 4 passes on Scout noise despite also promising indexing, Home, search, compare, and security. The Risks table says “each phase has a done-when.”  
    **Why it matters:** Major features can remain unverified while a phase passes. Scout’s “under 30% dismissed” also treats unread findings as potentially useful and lacks a minimum reviewed sample. Compare mode is assigned to Phase 3 in doc 04 but Phase 4 here; Settings has no delivery phase despite supporting approval rules.  
    **Concrete fix:** Add a small acceptance checklist for every promised capability, reconcile phase assignments, and explicitly schedule Settings. Define Scout noise over reviewed findings with a minimum sample and volume cap. Give Phase 5 a release gate covering install/restart, restore, notifications, light-theme contrast, and authenticated private-tunnel access.