1. **[high] Safety controls arrive after tool execution.**  
   **Reference:** [Phase 1–4, lines 12–28](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:12): tool workflows ship in Phase 2, approvals in Phase 3, and “sandboxed shell, approval rules UI” in Phase 4.  
   **Why it matters:** CLI-backed chat and unattended workflows can act on files or external systems before the roadmap requires enforcement of the policy in spec 12. A successful chat or morning briefing does not establish that tools are constrained.  
   **Concrete fix:** Make daemon-enforced permissions, workspace boundaries, redaction, cancellation, and denial of unauthorized actions Phase 1 prerequisites. Include approval handling before Phase 2 tool steps. Keep shell execution disabled until isolation is verified.

2. **[high] Provider fallback has no privacy acceptance gate.**  
   **Reference:** [Phase 1, line 13](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:13): “routing fallback.”  
   **Why it matters:** Spec 03 permits automatic fallback; spec 04 replays conversation history when switching models. Private conversations and attached files could therefore reach another provider before Jonas sees the attribution in the response header.  
   **Concrete fix:** Require explicit allowed providers per conversation/workflow, disclosure of the context being transferred, and approval before first transfer to a new provider. Test that disallowed fallback pauses without transmitting content.

3. **[high] The morning-briefing milestone depends on integrations outside its phase.**  
   **Reference:** [Phase 2, lines 17–18](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:17): “3 starter workflows” and an unattended daily morning briefing.  
   **Why it matters:** Spec 05 defines that briefing around calendar, mail, and news, while spec 07 defers mail/calendar sources to v2. The roadmap assigns neither their authentication nor their connectors. Spec 05 also names six starter workflows rather than three.  
   **Concrete fix:** Name the three Phase 2 workflows and their required tools. Define a feed-only briefing for this milestone, or explicitly bring read-only mail/calendar connectors and their permissions into scope.

4. **[high] Persistence ships without an assigned recovery milestone.**  
   **Reference:** [Phase 1, line 14](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:14) promises persisted history; [Phase 5, line 32](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:32) lists “backups UI.”  
   **Why it matters:** Specs 02 and 12 require nightly backups, but the roadmap never assigns the backup mechanism or restore verification. The UI can wait; recovery cannot remain implicit once real history and automation records accumulate. Architecture spec 01 also proposes SQLite WAL, so backup consistency needs deliberate handling.  
   **Concrete fix:** Add automatic, consistent database backups and a verified restore to Phase 1’s completion gate. Leave backup browsing and configuration UI in Phase 5.

5. **[med] Phase 0 contradicts the stated early vertical slice.**  
   **Reference:** [Lines 3–9](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:3): one working Claude path first, but five provider spikes, all-screen mocks, new routes, visual adoption, and repository restructuring precede it.  
   **Why it matters:** The spikes alone consume five timeboxed days before integration work. Secondary providers and broad mock coverage delay the first useful result. Spec 01 also places the repository move in Phase 1, once the daemon exists.  
   **Concrete fix:** Limit Phase 0 to the Claude streaming feasibility check and minimal shared scaffolding. Move other provider spikes beside their implementation phases, build mocks as screens become relevant, and choose one explicit migration point.

6. **[med] Completion gates do not cover the capabilities they release.**  
   **Reference:** [Phase completion statements and risks, lines 14–41](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:14), especially “each phase has a done-when.”  
   **Why it matters:** One Hermes card reaching Review does not validate approvals, cancellation, bridge reconnects, or Cursor/Nous adapters. One uninterrupted briefing week does not exercise restart recovery or retry duplication. Phase 5 has no completion gate at all.  
   **Concrete fix:** Give each phase a short acceptance checklist covering its shipped capabilities and failure paths. Include forced restart/retry tests for automation and pause/deny/stop tests for Hermes. Define Phase 5’s install, restore, and remote-access checks.

7. **[med] Switchable mocks lack a boundary from real execution.**  
   **Reference:** [Line 3 and Phase 0](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:3): “keep mock data switchable” and “UI runs on mock data for all screens.”  
   **Why it matters:** As screens become operational, mixed simulated and live state could show fictitious connection health, run outcomes, or approvals alongside real controls. The roadmap does not define whether switching affects display data, storage, or execution.  
   **Concrete fix:** Specify a clearly labelled demo mode with separate storage and no live mutation endpoints. Require an explicit transition into live mode and test that demo actions cannot invoke providers or agents.

8. **[med] Token adoption is treated as sufficient proof of glass UI quality.**  
   **Reference:** [Phase 0, lines 6–9](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:6): adopt tokens, then pass when mocked screens run.  
   **Why it matters:** Spec 14 already requires contrast, opaque fallbacks, and reduced-motion behavior, but no phase verifies them. Changing translucent surfaces also changes the effective contrast beneath text, controls, and focus rings. Smoke tests cannot establish legibility.  
   **Concrete fix:** Add a Phase 0 visual gate on representative Chat and Inbox screens: text contrast ≥4.5:1 across the brightest glow, discernible controls/focus, opaque and increased-contrast modes, and reduced-motion alternatives for shimmer and pulsing states. Repeat this gate as each screen becomes real.

9. **[med] Layout, spacing, and typography migration have no owner.**  
   **Reference:** [Phase 0, line 6](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:6) specifies tokens and routes only.  
   **Why it matters:** The existing source uses a 220px labelled sidebar, a 720px responsive breakpoint, and chat bubbles capped at 70%. Spec 14 describes a 64px rail, a 900px breakpoint, and a 760px reading limit. Tokens alone will not reconcile these differences or establish hierarchy in dense Inbox, Tasks, and Hermes screens.  
   **Concrete fix:** Assign shell and component migration explicitly. Require a documented type/line-height scale, consistent spacing, readable chat measure, clear primary actions, and realistic dense/long-content fixtures. Review desktop, narrow layouts, and zoomed text before declaring each screen complete.

10. **[med] Scout’s quality metric can pass with insufficient evidence and block unrelated work.**  
    **Reference:** [Phase 4, line 29](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:29): “under 30% dismissed as noise”; [line 41](E:/AI/review-loop/junos/docs/specs/13-roadmap.md:41): no next phase until the previous passes.  
    **Why it matters:** Findings left unread could appear successful, and a handful of reviewed items produces an unstable percentage. Packaging, notifications, and phone access then depend on a subjective recommendation-quality trial rather than their technical prerequisites.  
    **Concrete fix:** Define the denominator as explicitly reviewed findings, specify a minimum sample, and track useful/actionable results separately from dismissal. Make the week-long evaluation a Scout-specific release gate so independent delivery work can proceed.