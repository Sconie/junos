1. **[high] Security controls arrive after executable automation.**  
   **Reference:** Phase 2 introduces “prompt/tool/output steps”; Phase 3 introduces Hermes; Phase 4 schedules “sandboxed shell, approval rules UI.”  
   **Why it matters:** Workflows and agents can act before their safety boundary is complete. This conflicts with [12-security-and-privacy.md](/E:/AI/review-loop/junos/docs/specs/12-security-and-privacy.md:16), which requires approvals, scoped permissions, redaction, and a kill switch. Phase 1 also lists only an “auth token,” leaving pairing and origin validation unassigned.  
   **Concrete fix:** Make loopback binding, secure pairing, Host/Origin validation, and redaction Phase 1 gates. Require enforceable approval policy, cancellation, audit records, and sandboxing before enabling tool execution. The richer rules editor can remain in Phase 4.

2. **[high] Automatic routing fallback lacks a privacy gate.**  
   **Reference:** Phase 1: “routing fallback.”  
   **Why it matters:** Fallback can send conversation history and attached private context to a different provider. The routing spec describes notification in the response header, which happens after disclosure; the roadmap has no milestone for provider consent or context restrictions.  
   **Concrete fix:** Include per-conversation permitted providers in Phase 1. Pause before sending context to an unapproved provider, show the destination and included context, and test that cancellation or denial sends nothing.

3. **[high] Hermes mock success cannot establish that the real integration is feasible.**  
   **Reference:** Risks: “Hermes interface unknown | define wire format first, build against a mock”; Phase 3 requires a real Ready-to-Review result.  
   **Why it matters:** A mock proves the proposed interface, not that Hermes supports it. [06-hermes.md](/E:/AI/review-loop/junos/docs/specs/06-hermes.md:18) still needs the runtime, deployment location, and memory location. Discovering incompatibilities in Phase 3 could invalidate the console, approvals, and board integration together.  
   **Concrete fix:** Add an early, bounded real-Hermes spike proving directive submission, event streaming, approval interception, and stop behavior. Record unsupported capabilities and a fallback milestone before committing to the complete console.

4. **[high] Phase 2’s starter workflows depend on integrations with no delivery phase.**  
   **Reference:** “3 starter workflows” and the unattended “daily morning briefing.”  
   **Why it matters:** [05-tasks-and-workflows.md](/E:/AI/review-loop/junos/docs/specs/05-tasks-and-workflows.md:39) names six starters, including calendar/mail briefing and GitHub repo health. Mail/calendar sources are explicitly v2 in [07-inbox-and-agent-chats.md](/E:/AI/review-loop/junos/docs/specs/07-inbox-and-agent-chats.md:50). Neither those connectors nor their authorization flows are scheduled here.  
   **Concrete fix:** Name the three Phase 2 workflows and their available inputs. Start with a news-only briefing, local Inbox triage, and a local-data review; explicitly defer connector-dependent variants or assign their implementation first.

5. **[med] Phase 0 contradicts the promise of an early vertical slice.**  
   **Reference:** “get one real end-to-end path working early” versus “UI runs on mock data for all screens,” five provider spikes, and repository conversion before Phase 1.  
   **Why it matters:** Five one-day spikes already consume five working days before layout migration and screen work. The current source is a sparse shell, so “all screens” entails substantial product design rather than simply connecting existing interfaces.  
   **Concrete fix:** Limit Phase 0 to shared foundations, Chat/Connections mocks, and Claude feasibility. Deliver Claude streaming next, then Codex. Move other provider spikes and screen construction nearer their consuming phases.

6. **[med] Phase completion gates do not verify the promised reliability.**  
   **Reference:** Phase 2: “runs unattended for a week without duplicates or lost runs”; Testing: unit tests and per-screen smoke tests.  
   **Why it matters:** A successful week may never exercise crashes, sleep, retries, overlapping schedules, or timezone changes. A briefing can pass while workflow recovery and cancellation remain broken. Reliable operation also depends on daemon startup, currently left open in the architecture.  
   **Concrete fix:** Add deterministic acceptance scenarios for restart around dispatch, retry after partial completion, sleep/catch-up, overlap, and Copenhagen DST. Require recoverable run states and working cancellation. Use the week-long run as a soak test after these pass.

7. **[med] Glass adoption has no visual acceptance gate.**  
   **Reference:** Phase 0: “Adopt the Translucent Glass tokens (14)”; done when screens run on mocks.  
   **Why it matters:** Token adoption alone cannot establish legibility over variable glow and overlapping panels. Spec 14 already requires contrast, reduced motion, and an opaque fallback, but no phase verifies them. Smoke tests will not catch unreadable secondary text or distracting live-state animation.  
   **Concrete fix:** Gate Phase 0 on representative glass panels with actual typography and controls: minimum 4.5:1 normal-text contrast over the brightest composited background, 3:1 essential control/focus indicators, opaque and increased-contrast modes, reduced-motion behavior, and usable rendering without backdrop blur. Repeat these checks as screens become real.

8. **[med] Hierarchy, spacing, typography, and density have no scheduled design deliverable.**  
   **Reference:** Phase 0 specifies tokens and routes; Phase 5 is titled “Polish” but lists infrastructure and features.  
   **Why it matters:** Material treatment does not define the working interface. The current CSS has a generic card grid and two-column split, while the planned product includes dense logs, triage panes, and a board. Without an early layout baseline, each screen can acquire different padding, title scales, and competing primary actions.  
   **Concrete fix:** Add a Phase 0 component-and-layout baseline: type roles, spacing scale, row heights, readable chat measure, primary/secondary action hierarchy, and density examples. Validate an Inbox list/detail view and a dense run log with realistic long content before expanding across screens.

9. **[med] “Keep mock data switchable” needs an explicit boundary from live execution.**  
   **Reference:** Opening principle and Phase 0’s mock API layer.  
   **Why it matters:** Tasks and approvals become dangerous if mock status or identifiers can mix with a live daemon. Independently, empty fixtures can make layouts appear successful while concealing overflow and poor density.  
   **Concrete fix:** Specify an unmistakable demo indicator, separate mock/live data stores, and disabled real mutations in demo mode. Require fixtures for populated, empty, loading, failed, disconnected, and long-content states, with counts derived from the displayed records.

10. **[med] Phase assignments conflict with the supporting specs.**  
    **Reference:** Phase 0 repository conversion, Phase 0 spikes, and Phase 4 compare mode.  
    **Why it matters:** Architecture schedules the repository move once the daemon exists in Phase 1; Connections calls for Phase 1 verification spikes; Chat labels compare mode “phase 3.” These discrepancies make sequencing and completion ambiguous.  
    **Concrete fix:** Add an explicit phase-assignment table and identify the roadmap as authoritative. State that repository conversion is Phase 0, distinguish Phase 0 feasibility spikes from later adapter implementation, and explicitly record compare mode’s move to Phase 4.

11. **[med] Scout’s quality gate is underspecified and can block unrelated work indefinitely.**  
    **Reference:** Phase 4: “under 30% dismissed as noise”; Risks: “no phase starts before the last passes.”  
    **Why it matters:** There is no minimum sample, denominator, or treatment of unreviewed findings. The Scout spec’s dismissal reasons also include “already know,” “too risky,” and “later,” which are not equivalent to irrelevant noise. This subjective gate can hold packaging and backups UI behind feed tuning.  
    **Concrete fix:** Define a reviewed sample, label noise separately from deferral, and measure relevance against that sample. Make Scout tuning an independent release criterion rather than a prerequisite for all Phase 5 work.

12. **[med] Phase 5 bundles separate releases and has no completion criterion.**  
    **Reference:** “Packaging … backups UI, notifications, light theme, phone access over a tunnel”; Risks claims “each phase has a done-when.”  
    **Why it matters:** Installation, recovery, remote access, responsive interaction, and a second theme have different dependencies and failure modes. The roadmap also never assigns the backend nightly backup required by the data model. Phone access needs more than connectivity: navigation, touch targets, and pane behavior must work.  
    **Concrete fix:** Split this into independently testable milestones: installation/autostart, backup-and-restore, notifications, light theme, and private phone access. Assign backend backups before retaining real history; require an actual restore test. Gate phone access on authenticated tunnel access and usable list/detail, approval, and chat flows at phone width.