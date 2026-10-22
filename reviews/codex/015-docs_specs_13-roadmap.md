1. **[high] Approval controls arrive after automation that needs them.**  
   **Reference:** Phase 2 introduces “prompt/tool/output steps”; Phase 3 adds “approvals in Inbox”; Phase 4 adds “sandboxed shell, approval rules UI.”  
   **Why it matters:** Phase 2 can execute tools and write outputs before users can review risky actions. This conflicts with the approval lifecycle in `05-tasks-and-workflows.md` and mandatory controls in `12-security-and-privacy.md`. CLI-backed chat also needs an explicit tool policy from Phase 1.  
   **Concrete fix:** Require enforced permissions, cancellation, audit logging, and a minimal approval UI before enabling tools. Keep shell execution disabled until isolation is ready; defer only advanced rule editing.

2. **[high] The Phase 2 completion gate depends on integrations outside its scope.**  
   **Quote:** “a daily morning briefing runs unattended for a week.”  
   **Why it matters:** Spec 05 defines that briefing as calendar, mail digest, and news. No phase delivers those connectors, while spec 07 explicitly defers mail/calendar sources to v2. The “no phase starts before the last passes” rule can therefore block the roadmap.  
   **Concrete fix:** Define a v1 briefing using explicitly supported public feeds and Inbox delivery, or schedule read-only connectors and their authentication before this gate. Name the three starter workflows and reconcile them with spec 05’s six-workflow shipping list.

3. **[high] Routing fallback lacks a privacy release gate.**  
   **Reference:** Phase 1 includes “routing fallback”; Phase 4 includes “file/project indexing and search.”  
   **Why it matters:** Spec 03 permits automatic provider fallback, and spec 04 replays conversation history when switching models. Sensitive context could reach an unexpected provider. Spec 11’s folder allowlists and opt-in AI tagging also have no roadmap acceptance gate.  
   **Concrete fix:** Require an approved provider set per conversation/workflow before fallback, with visible destination disclosure. Gate indexing on exclusion tests, per-folder AI consent, and proof that excluded content never enters indexes or outbound requests.

4. **[med] The gates do not establish that their phases are complete or reliable.**  
   **Quotes:** Phase 3 passes after one Ready-to-Review handoff; Phase 4 passes with “under 30% dismissed as noise”; Phase 5 has no completion criterion.  
   **Why it matters:** A happy-path handoff proves nothing about denied approvals or interrupted runs. Seven daily briefings provide little coverage of restart, overlap, retries, or daylight-saving behavior. Scout can pass with barely any findings or feedback, while indexing, Home, search, and compare mode remain broken.  
   **Concrete fix:** Add a short acceptance checklist per phase, including deterministic restart/retry tests and each major deliverable. Define Scout’s minimum reviewed sample and noise denominator. Give Phase 5 installation, upgrade, restore, and remote-access gates.

5. **[med] Phase 0 delays the first useful path with broad speculative work.**  
   **Reference:** “Foundations (days)” requires all-screen mocks, a repository restructure, and five one-day spikes.  
   **Why it matters:** The spikes alone can consume five working days before UI and migration work. Researching late-phase providers and mocking every screen contradicts the opening priority of getting one real Claude path working early. Architecture spec 01 also places the repository move in Phase 1, once the daemon exists.  
   **Concrete fix:** Limit Phase 0 to the Claude spike, minimal daemon/shared contract, and Chat/Connections states. Move other spikes immediately before their adapters, stage screen work with each phase, and explicitly resolve the migration timing.

6. **[med] Visual acceptance stops at token adoption.**  
   **Quotes:** “Adopt the Translucent Glass tokens”; “Playwright smoke test per screen.”  
   **Why it matters:** Tokens do not establish hierarchy, spacing, typography, or usable density. The current shell uses repeated cards and broadly shared panel styling; simply applying glass risks spreading a generic dashboard treatment across very different tasks. Spec 14’s chosen glass direction needs particular care around contrast and competing surfaces.  
   **Concrete fix:** Add a visual gate to every screen milestone: one dominant task, restrained secondary surfaces, a defined type scale and spacing rhythm, realistic sparse/dense data, and readable glass/fallback states. Review screenshots at desktop, tablet, and phone widths. Preserve the chosen direction while making approvals, run progress, and conversation content visually distinct.

7. **[med] Accessibility and operational states are absent from phase gates.**  
   **Reference:** Phase 0 passes when screens run on mocks; Phase 5 is titled “Polish.”  
   **Why it matters:** Nothing requires the loading, empty, error, offline-daemon, and disconnected-provider states mandated by spec 14. Keyboard navigation, focus restoration, streaming announcements, and narrow-screen approval flows could remain unverified until late. A route smoke test will not establish these behaviors.  
   **Concrete fix:** Include those states and keyboard-only task completion in each screen’s definition of done. Verify zoom/reflow, touch targets, non-colour status cues, and focus handling before that screen becomes operational.

8. **[med] Mock/live switching has no trust boundary.**  
   **Quote:** “keep mock data switchable.”  
   **Why it matters:** Once real providers and approvals exist, an ambiguous switch can make simulated connection states, usage, or successful runs look authoritative. The roadmap never defines whether switching is per screen, per session, or global.  
   **Concrete fix:** Specify an unmistakable global demo mode with isolated data and disabled real execution. Require production flows and acceptance gates to use real daemon state; clearly distinguish unavailable usage from simulated values.

9. **[med] Unattended operation has no installation or recovery milestone.**  
   **Reference:** Phase 2 requires unattended runs; Phase 5 schedules “Tauri or service install” and “backups UI.”  
   **Why it matters:** The daemon could remain a manually launched development process through the automation phases. Automatic backups are required by specs 02/12 but never assigned to a phase; deferring their UI leaves the underlying protection ambiguous.  
   **Concrete fix:** Add a minimal supported daemon startup/restart mechanism before the unattended gate, with explicit sleep/offline behavior. Implement automatic backups and a restore check when persisted history arrives; retain backup management UI for Phase 5.

10. **[low] Compare mode has conflicting phase assignments.**  
    **Reference:** Roadmap Phase 4 lists “compare mode”; `04-chat.md:16` assigns it to Phase 3.  
    **Why it matters:** The documents give different scope boundaries for implementation and acceptance.  
    **Concrete fix:** State the authoritative assignment in the roadmap and explicitly identify the other phase reference as superseded.