1. **[high] Sandbox enforcement is not a Phase 1 release gate.**  
   **Reference:** [Phase 1, lines 18–22](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:18), versus “sandbox hardening for CLI agents” in Phase 4.  
   **Why it matters:** Choosing a sandbox in Phase 0 and blocking one test tool call does not demonstrate that Claude/Codex cannot bypass the gateway through native tools, subprocesses, filesystem access, or network access. Spec 12 requires these restrictions when adapters launch.  
   **Concrete fix:** Make demonstrable containment a Phase 1 prerequisite for each adapter. Test direct writes, subprocess execution, unauthorized reads and egress. An adapter that fails must remain restricted to an enforceable capability set; defer only additional hardening to Phase 4.

2. **[high] File workflows precede their access and revocation controls.**  
   **Reference:** [Phase 2, line 25](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:25): “Summarise file”; [Phase 4, line 37](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:37): “file/project indexing and search with revocation.”  
   **Why it matters:** Spec 05 launches summarization from Files, while spec 04 already offers file/project attachments. Neither has an assigned early milestone for folder grants, exclusions, size limits, safe previews, or revocation. Privacy controls could consequently arrive after file content is sent to providers.  
   **Concrete fix:** Schedule minimal file selection and access controls before attachments or summarization ship. Keep indexing/search in Phase 4, but require allowlists, secret exclusions, bounded reads, provider consent, and revocation in Phases 1–2.

3. **[high] Security testing does not cover the promised trust boundaries.**  
   **Reference:** [Testing, line 53](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:53).  
   **Why it matters:** Gateway unit tests and screen smoke tests do not establish that cookie authentication, pairing, Origin/Host checks, CSRF, safe rendering, or provider consent work together. These protections are already necessary for the first release.  
   **Concrete fix:** Add mandatory Phase 1 integration tests for unauthenticated API/SSE access, hostile origins/hosts, CSRF, pairing reuse, approval replay/expiry/cancellation, malicious Markdown and remote images, and unauthorized provider fallback/title generation. Run containment tests against real adapters as well as fakes.

4. **[high] The real Hermes milestone can pass without verified remote enforcement.**  
   **Reference:** [Phase 3, lines 29–34](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:29): recorded-session validation and Stop “works … or says honestly that it cannot confirm.”  
   **Why it matters:** A recording validates protocol compatibility, not live approval enforcement or process termination. Spec 06 also says Tailscale is not installed and the shim needs Docker rights—substantial prerequisites absent from this milestone. An unreachable Stop response should not substitute for demonstrating cancellation on a reachable VPS.  
   **Concrete fix:** Add explicit gates for private connectivity, bridge authentication, restricted Docker access, agent-originated approval enforcement, and live container-process cancellation. Test unreachable-state honesty separately. Require both tests before automated Hermes pickup is enabled.

5. **[med] Day-one daemon operation is ambiguously deferred to packaging.**  
   **Reference:** [Phase 5, line 41](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:41): “Tauri wrapper … or service install.”  
   **Why it matters:** Spec 01 explicitly requires a Windows user-level auto-start service from day one. Phase 2’s unattended scheduling depends on predictable daemon startup and recovery; an interactive development process does not satisfy that operational requirement.  
   **Concrete fix:** Assign user-service installation, startup, restart behavior, and visible daemon health to Phase 1. Keep the Tauri wrapper and installer polish in Phase 5.

6. **[med] Persistent data ships without an explicit recovery and deletion milestone.**  
   **Reference:** [Phase 1, line 17](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:17) introduces SQLite; [Phase 5, line 41](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:41) schedules “backups UI.”  
   **Why it matters:** Deferring the UI is reasonable, but the roadmap never assigns the underlying backup, restore, retention, or deletion work required by specs 02 and 12. Chat history and audit records could accumulate before recovery and privacy behavior are verified.  
   **Concrete fix:** Add automatic online backups, integrity checks, a restore drill, retention, and deletion of derived content to the first-release gates. Leave backup management UI for Phase 5.

7. **[med] Subscription budgets appear only as a risk mitigation.**  
   **Reference:** [Risks, line 48](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:48): “usage budget in 03”; [Phase 2, line 25](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:25) enables unattended jobs.  
   **Why it matters:** Referencing a budget does not establish when it becomes enforced. Spec 03 requires background jobs to yield at capacity thresholds and use local caps when meters are unavailable. The week-long automation trial could consume Jonas’s shared subscription allowance first.  
   **Concrete fix:** Make budget enforcement a prerequisite for scheduling, with tests for unavailable meters, exhausted local caps, rate limits, and visible Inbox explanations when jobs yield.

8. **[med] Glass legibility and fallback requirements lack acceptance checks.**  
   **Reference:** [Phase 0, line 11](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:11): “Adopt UI tokens (14)”; [Testing, line 53](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:53): “Playwright smoke per screen.”  
   **Why it matters:** Spec 14 already requires contrast checks, opaque fallbacks, and reduced-motion support, but token adoption and smoke tests do not verify rendered translucent combinations. Blur, bloom, nested panels, and overlays can change the effective background behind text and controls.  
   **Concrete fix:** Add visual/accessibility gates before the first release: verify normal text at ≥4.5:1 and essential control/focus indicators at ≥3:1 against their actual adjacent backgrounds. Cover bright atmospheric regions, permitted panel nesting, disabled blur, increased contrast, and reduced motion. Require readable static status feedback when pulse/shimmer is removed.

9. **[med] Hierarchy, spacing, typography, and density have no review milestone.**  
   **Reference:** [Phase 0, lines 11–14](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:11) accepts mock UI; [Phase 1, lines 19–22](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:19) accepts chat and safety controls without layout criteria.  
   **Why it matters:** The current scaffold uses a 220px sidebar, percentage-width chat bubbles, and generic panels; spec 14 calls for a different shell and constrained reading width. Applying tokens alone will not resolve this gap. Dense approval details and Inbox panes particularly need deliberate information hierarchy.  
   **Concrete fix:** Add a Phase 0 layout review using realistic long messages, diffs, filenames, and populated queues. Require a defined type/spacing scale, consistent gutters, bounded prose width, visible primary actions, and clear distinction between actionable approvals and ordinary results. Verify at narrow desktop widths, responsive widths, and 200% zoom with keyboard navigation.

10. **[med] Phase completion criteria do not cover their assigned scope.**  
    **Reference:** [Phase 2, lines 25–26](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:25), [Phase 3, lines 29–34](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:29), and [Phase 4, lines 37–38](/E:/AI/review-loop/specs-wt/docs/specs/13-roadmap.md:37).  
    **Why it matters:** One daily task does not validate workflow pause/resume, budgets, or Inbox recovery. One Hermes card does not validate terminal isolation, Telegram approvals, or Repo health. Scout’s dismissal rate cannot establish that indexing, revocation, search, and compare mode work. Repo health also depends on GitHub access without an assigned integration milestone.  
    **Concrete fix:** Split each phase into independently gated deliverables with explicit dependencies and acceptance checks. Add GitHub access before Repo health; separate terminal and Telegram readiness from board pickup; give search/revocation their own completion criteria. Keep the week-long trials as reliability evidence alongside these functional gates.