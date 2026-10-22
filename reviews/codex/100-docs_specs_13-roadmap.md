1. **[high] Baseline adapter containment is not a release gate.**  
   **Reference:** Phase 0: “sandbox approach chosen”; Phase 4: “sandbox hardening for CLI agents”; Phase 1 tests only “a test tool call”.
   
   **Why it matters:** A gateway can reject its own requests while a real CLI still writes files or makes network calls independently. The roadmap permits completion without demonstrating the enforcement required by §12, **Execution gateway**. The read-only mitigation also needs enforcement, rather than a UI label.
   
   **Fix:** Require baseline containment in Phase 1. Test both real adapters against denied writes, child-process execution and unauthorized network destinations. An adapter that cannot meet this gate ships with tools disabled and enforced read-only access. Reserve additional hardening for Phase 4.

2. **[high] The remote Stop acceptance criterion can pass without working cancellation.**  
   **Reference:** Phase 3: “Stop works on the real VPS Hermes **or says honestly that it cannot confirm**.”
   
   **Why it matters:** This makes a permanently ineffective cancellation implementation sufficient to finish the phase. “Stop not confirmed” is necessary failure feedback, but cannot substitute for cancellation when the bridge is healthy.
   
   **Fix:** Require two separate tests: with a reachable shim, Stop cancels the real run and its child processes within a defined deadline; with a broken tunnel, the UI shows unconfirmed status and blocks further JunOS dispatch until reconciliation. Keep the honest fallback without treating it as the successful execution test.

3. **[med] Data protection has no scheduled baseline implementation.**  
   **Reference:** Phase 1 introduces history and audit records; Phase 5 lists “backups UI”.
   
   **Why it matters:** §§02 and 12 require nightly, integrity-checked SQLite backups, retention and deletion of derived content. The roadmap schedules the interface but never assigns the underlying backup, restore or deletion machinery. The first release could therefore accumulate private records without those protections.
   
   **Fix:** Assign backup creation, retention and a tested restore path to Phase 1. Schedule deletion across conversation content, event payloads and run output before first release. Keep backup management UI in Phase 5.

4. **[med] “Summarise file” has an unresolved earlier-phase dependency.**  
   **Reference:** Phase 2 calls its starters workflows “that need only Phase 1-2 pieces”, including “Summarise file”; file/project indexing and search arrive in Phase 4.
   
   **Why it matters:** §05 describes the starter as a right-click action in Files. Neither an operational Files surface nor a minimal alternative file-selection path is assigned to Phase 1–2. This creates pressure to pull the broader file system forward or bypass its consent and exclusion rules.
   
   **Fix:** Define the starter as an explicit one-file attachment workflow, with size limits, exclusions and provider disclosure, and schedule that dependency in Phase 1–2. Alternatively defer the starter until Phase 4.

5. **[med] Service installation is deferred beyond the unattended-run milestone.**  
   **Reference:** Phase 2 requires a daily task running unattended across daemon restarts; Phase 5 offers “Packaging … or service install”.
   
   **Why it matters:** §01 explicitly requires a Windows user-level auto-start service from day one. Restart recovery tests do not establish that the daemon actually returns after login or reboot. Packaging and operational installation have been conflated.
   
   **Fix:** Put minimal service installation, startup diagnostics and login/reboot recovery in Phase 1. Keep the Tauri wrapper and polished installer in Phase 5. Include a real service restart in Phase 2 acceptance.

6. **[med] Token adoption and smoke tests do not establish glass UI quality.**  
   **Reference:** Phase 0: “Adopt UI tokens (14)”; Testing: “Playwright smoke per screen”.
   
   **Why it matters:** §14 already specifies contrast checks, opaque fallbacks and reduced-motion behavior, but no roadmap milestone requires them to pass. Tokens alone also leave typography, spacing and density unresolved. Approval details and Stop can become visually subordinate to surrounding panels even when the controls technically work.
   
   **Fix:** Add a first-release visual and accessibility gate covering:
   
   - Text contrast over the brightest composited glass backdrop: at least **4.5:1** for normal text; **3:1** for large text and essential control boundaries.
   - No-blur, increased-contrast and reduced-motion modes.
   - Defined type sizes, line heights, spacing and row density, checked with long messages, commands, diffs and populated queues.
   - Keyboard operation, zoom and representative desktop/tablet/narrow layouts, with Stop visible and the action, target and warning readable before approval.

7. **[med] Future route stubs have no release visibility policy.**  
   **Reference:** Phase 0: “route stubs for all screens”; Phase 4: “Home aggregate, ⌘K palette”.
   
   **Why it matters:** The first release ends at Phase 2, while §14’s shell leads with Home and includes several later destinations. The current scaffold also lands at `/`. Without an explicit policy, the release can open on a placeholder and present navigation dominated by unfinished features.
   
   **Fix:** Specify Chat or Inbox as the first-release landing page. Keep future stubs available for development but omit them from release navigation. Schedule the usable shell and first-release navigation in Phase 1; defer the populated Home aggregate to Phase 4.

8. **[med] Phase 4 can finish without validating most of its scope.**  
   **Reference:** Phase 4 includes indexing, search, revocation, Home, command palette, compare mode and sandbox hardening, but is done when Scout has “under 30% of findings dismissed as noise”.
   
   **Why it matters:** Scout’s dismissal rate proves none of those other capabilities. It is also ambiguous when findings remain unread or the sample is very small. Phase 5 has no completion criterion despite the risk mitigation claiming “each phase has a done-when”.
   
   **Fix:** Split Phase 4 into independently verifiable milestones. Require folder revocation to purge indexes/caches and cancel jobs; search to respect exclusions; compare mode to disclose both recipients; and Home/palette to meet their interaction criteria. Define Scout’s reviewed sample and denominator. Give Phase 5 explicit acceptance criteria as well.