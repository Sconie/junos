1. **[high] Approval enforcement arrives after unattended execution.**  
   **Reference:** Phase 2 introduces “prompt/tool/output steps”; Phase 3 adds approvals; Phase 4 adds “sandboxed shell, approval rules UI.”  
   **Why it matters:** Workflows can act before the roadmap delivers the controls required by `12-security-and-privacy.md`. Phase 1’s CLI adapters can also execute tools, so the exposure starts before automation.  
   **Concrete fix:** Require daemon-side action classification, allowlists, approval pause/resume, cancellation, and audit records before enabling tools. Ship approval handling with Phase 2 at the latest. Until containment exists, explicitly disable shell steps and unsupported tool execution.

2. **[high] Phase 1’s daemon gate omits essential access controls.**  
   **Quote:** “junosd with SQLite, auth token, SSE, event table.”  
   **Why it matters:** A token alone does not satisfy the localhost threat model. Spec 12 also requires loopback binding, strict Origin/Host validation, pairing, and secret redaction. The current done condition could pass without these protections.  
   **Concrete fix:** Add those requirements to Phase 1’s exit gate, with checks that unauthenticated requests and unexpected origins/hosts are rejected and pairing secrets never appear in logs.

3. **[high] Automatic fallback lacks a privacy boundary.**  
   **Reference:** Phase 1’s “routing fallback.”  
   **Why it matters:** Spec 03 automatically tries another provider; spec 04 replays conversation history. A provider outage could therefore send private history or attachments to another service without a deliberate choice. Automatic title generation through the “cheapest connected model” creates a related disclosure path.  
   **Concrete fix:** Gate fallback on an explicit per-conversation provider allowlist. Show the destination before first disclosure, apply the same restriction to title generation, and test that disallowed providers receive no context.

4. **[high] The automation milestone depends on integrations outside its defined scope.**  
   **Quote:** “a daily morning briefing runs unattended for a week.”  
   **Why it matters:** Spec 05’s briefing uses calendar, mail, and news, but the roadmap schedules no connector work; spec 07 explicitly defers mail/calendar sources to v2. A functioning scheduler cannot satisfy that intended briefing by itself.  
   **Concrete fix:** Define the Phase 2 briefing as news-only using named feeds, or explicitly include read-only calendar/mail integration, authentication, permissions, and failure handling. Name the three starter workflows; spec 05 currently lists six.

5. **[med] One successful week does not establish scheduler reliability.**  
   **Quote:** “without duplicates or lost runs.”  
   **Why it matters:** Seven ordinary runs may never exercise restart recovery, sleep/wake, retries, overlap, approval expiry, or timezone changes—the behaviors required by specs 01 and 05. “No lost runs” also needs to distinguish intentional catch-up skips from failures.  
   **Concrete fix:** Keep the week-long soak, but precede it with deterministic recovery tests. Specify occurrence identity, retry behavior, catch-up outcomes, and interrupted-run status so duplicates and losses are measurable.

6. **[med] Phase 0 postpones the promised early end-to-end path.**  
   **Reference:** “Foundations (days),” five one-day spikes, repository migration, and mock UI “for all screens.”  
   **Why it matters:** The gate requires broad speculative work before the first real Claude conversation. Five spikes already consume five days before shell expansion and migration; unresolved secondary providers can block the core product.  
   **Concrete fix:** Make Phase 0 deliver one Claude capability probe and the minimum Chat/Connections scaffold. Move other spikes and screen scaffolds to their consuming phases. Schedule an early Hermes feasibility check, because its real runtime remains unresolved in spec 06.

7. **[med] Adopting glass tokens has no legibility or fallback acceptance gate.**  
   **Quote:** “Adopt the Translucent Glass tokens (14).”  
   **Why it matters:** Spec 14’s values are explicitly provisional. Token adoption does not verify contrast over atmospheric glow, nested panels, focus rings, or opaque fallbacks. Motion and contrast preferences could remain untested through every phase.  
   **Concrete fix:** Require representative glass components to pass contrast checks over the brightest supported backdrop, opaque/high-contrast fallbacks, and reduced-motion states before Phase 0 passes. An optional ice-blue accent, `#7DD3FC`, would distinguish actions from teal success states: **9.42:1** against opaque `#20232B`, with `#0B0C0F` button text at **11.73:1**. These are opaque-pair values; verify actual glass composites separately.

8. **[med] Screen smoke tests cannot establish hierarchy, spacing, typography, or density.**  
   **Reference:** “UI runs on mock data for all screens” and “Playwright smoke test per screen.”  
   **Why it matters:** These gates can pass while screens remain visually inconsistent or difficult to operate. The current shell has a 220px labelled sidebar and a 720px breakpoint; spec 14 calls for a 64px rail and different navigation below 900px. No phase explicitly owns that transition or a shared type/spacing scale.  
   **Concrete fix:** Add visual acceptance to each screen’s delivery: one dominant task, consistent type and spacing roles, realistic dense and empty datasets, readable long content, visible keyboard focus, and responsive checks at desktop, tablet, phone, and 200% zoom. Review loading, error, offline, and disconnected states alongside the happy path.

9. **[med] “Keep mock data switchable” leaves production behavior ambiguous.**  
   **Quote:** “keep mock data switchable.”  
   **Why it matters:** As routes become real at different times, synthetic connection states, runs, or approval items could appear alongside live controls. That makes operational status difficult to trust.  
   **Concrete fix:** Define a visibly labelled demo mode with isolated storage and no live execution. Production failures must show offline/error states rather than silently substituting fixtures. Include mode separation in the end-to-end checks.

10. **[med] Backups and remote access need separate delivery gates.**  
    **Reference:** Phase 5 bundles “backups UI” and “phone access over a tunnel” under “Polish.”  
    **Why it matters:** Persistent history starts in Phase 1, while unattended writes start in Phase 2. The roadmap never schedules the nightly backups required by specs 02/12 or a restore check. Remote access also changes the access boundary and requires more than packaging polish.  
    **Concrete fix:** Deliver automatic backups and a verified restore with initial persistence; leave backup management UI for Phase 5. Give phone access its own gate for private tunnel access, device pairing/revocation, compatible origin checks, and touch approval flows.

11. **[med] Phase gates do not consistently cover their promised scope.**  
    **Reference:** Phase 3 passes on one Ready→Review handoff; Phase 4 passes on “under 30% dismissed as noise”; Phase 5 has no done condition.  
    **Why it matters:** Cursor/Nous adapters, search, Home, compare mode, and packaging can remain incomplete while their phases nominally pass. Scout’s metric also treats ignored findings as success and defines neither sample size nor reviewed-item denominator.  
    **Concrete fix:** Give every listed deliverable an acceptance criterion or explicitly defer it. Measure Scout noise among reviewed findings, separate “later” from irrelevant results, and require a stated sample size plus reliable collection/publication. Add a Phase 5 exit gate.

12. **[low] Phase assignments conflict with the supporting specs.**  
    **Reference:** Roadmap Phase 0 migration and Phase 4 compare mode.  
    **Why it matters:** Spec 01 schedules the repository move once the daemon exists in Phase 1; spec 04 places compare mode in Phase 3. Implementers have competing dependency orders.  
    **Concrete fix:** State the authoritative assignments in the roadmap and identify the supporting references that must be aligned before implementation.