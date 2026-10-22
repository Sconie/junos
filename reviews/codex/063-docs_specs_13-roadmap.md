1. **[high] Approval enforcement arrives after executable automation.**  
   **Reference:** Phase 2 introduces “prompt/tool/output steps”; Phase 3 adds “approvals in Inbox”; Phase 4 adds “sandboxed shell, approval rules UI.”  
   **Why it matters:** Phase 2 can read files, write outputs, or invoke tools before the controls required by specs 05 and 12 are deliverable. Phase 3’s real Hermes integration also precedes sandboxing.  
   **Concrete fix:** Require backend action classification, allowlists, approval pause/resume, audit records, and cancellation before enabling tool execution. Ship a minimal approval interface in Phase 2. Until shell isolation passes, disable shell steps and agent capabilities that require it.

2. **[high] The first daemon milestone lacks a security acceptance gate.**  
   **Quote:** “junosd with SQLite, auth token, SSE, event table.”  
   **Why it matters:** An auth token alone does not establish the localhost protections specified in 12. The Phase 1 completion criterion permits success without pairing, credential protection, or rejection of unexpected origins and hosts.  
   **Concrete fix:** Add Phase 1 exit checks for loopback binding, authenticated API/event streams, restricted pairing, Origin/Host validation, secret redaction, and sanitized model-output rendering. Include negative tests proving unauthorized requests fail.

3. **[high] The mandatory morning briefing depends on unscheduled integrations.**  
   **Quote:** “a daily morning briefing runs unattended for a week.”  
   **Why it matters:** Spec 05 defines this briefing around calendar, mail, and news, while spec 07 places mail/calendar sources in v2. The roadmap assigns no phase to those connectors. Its Phase 2 gate therefore requires either hidden scope or a briefing that differs from the specified product.  
   **Concrete fix:** Define the Phase 2 briefing as public-feed news delivered to Inbox, explicitly deferring calendar/mail. Alternatively, schedule their connector, authentication, and privacy work before this gate.

4. **[high] Unattended reliability is required before its operating prerequisites.**  
   **Reference:** Phase 2’s week-long unattended run; Phase 5’s “service install”; Risks’ “usage budget in 03, thresholds.”  
   **Why it matters:** Referencing a budget does not schedule its implementation, and the roadmap provides no supported way to keep the daemon running or recover after reboot before the unattended trial. A successful week on an awake laptop would not establish reliable automation.  
   **Concrete fix:** Add a supported daemon startup/recovery method and enforced background-run budgets to Phase 2. Gate completion on restart, sleep/wake, missed-run, overlap, retry, and quota-exhaustion scenarios, alongside the week-long trial.

5. **[high] “Adopt … tokens” can pass without a legible glass interface.**  
   **Quote:** Phase 0: “Adopt the Translucent Glass tokens (14).”  
   **Why it matters:** Spec 14 already requires contrast and fallbacks, but the roadmap’s completion gate checks only whether mock screens run. Translucent panels change apparent contrast across glow positions, overlapping surfaces, and interaction states. Token adoption does not verify those conditions.  
   **Concrete fix:** Add a Phase 0 visual acceptance matrix covering bright and dark backdrop regions, drawers, menus, selected rows, muted text, and focus indicators. Require readable composited text, distinguishable controls, an opaque preference/fallback, reduced-motion behavior, and a blur-performance check. Preserve the chosen glass direction throughout.

6. **[med] The accent migration has no foreground pairing decision.**  
   **Reference:** Phase 0’s token adoption; spec 14’s violet accent; current `src/index.css` uses accent-filled bubbles and selected buttons with dark text.  
   **Why it matters:** Changing a shared accent affects both fills and foregrounds. For example, spec 14’s light text `#E7E8EC` on violet `#8B5CF6` is only **3.46:1**, unsuitable for normal-sized text.  
   **Concrete fix:** Schedule explicit accent foreground, fill, focus, and status tokens. A possible alternative is ice blue `#7DD3FC`, which separates the primary action from teal success indicators: dark `#0B0C0F` text on it measures **11.73:1**, and blue text on opaque `#1B2029` measures **9.80:1**. These are solid-color calculations; glass composites still need verification.

7. **[med] Phase 0 expands the shell before proving the promised vertical slice.**  
   **Quote:** “get one real end-to-end path working early,” followed by all-screen mocks, a monorepo conversion, and five provider spikes.  
   **Why it matters:** Five one-day spikes alone consume five working days before shell and repository work. Cursor, Grok, and Nous research blocks Claude chat despite those adapters arriving much later. Architecture spec 01 also places the repository migration in Phase 1, contradicting this sequencing.  
   **Concrete fix:** Limit foundations to the shared shell essentials and Claude feasibility. Prove streaming Claude chat next; move other provider spikes beside their adapter phases and choose one explicit migration point.

8. **[med] Most phase completion gates leave substantial listed scope unverified.**  
   **Reference:** Phase 3 passes on one Hermes card; Phase 4 passes on Scout dismissal rate; Phase 5 has no completion criterion.  
   **Why it matters:** These gates do not establish that agent chats, Cursor/Nous adapters, indexing, search, Home, compare mode, or packaging work. The claim that “each phase has a done-when” is already false for Phase 5. Scout’s rate also lacks a minimum reviewed sample, making it a weak blocker for unrelated work.  
   **Concrete fix:** Give each listed capability a short acceptance check. Separate deterministic delivery gates from week-long observation trials, define Scout’s denominator and minimum sample, and add a Phase 5 completion criterion.

9. **[med] Privacy and recoverability are not assigned to the phases that create persistent data.**  
   **Reference:** Phase 1 persists history; Phase 4 introduces indexing; Phase 5 names only “backups UI.”  
   **Why it matters:** Specs 02, 11, and 12 require backups, indexing exclusions, explicit folder selection, and opt-in AI tagging. None becomes a roadmap exit condition. Backups UI can reasonably wait; protecting the database and preventing unintended file transmission cannot.  
   **Concrete fix:** Assign automatic backup and a verified restore to Phase 1. Gate Phase 4 on allowlisted folders, ignored/secret-path exclusion, opt-in remote processing, and deletion of derived index data when a folder is removed.

10. **[med] Hierarchy, spacing, typography, and responsive behavior have no delivery owner.**  
    **Reference:** Phase 0 adds routes and tokens; Phase 5 is labelled “Polish.”  
    **Why it matters:** The existing shell has a 220px labelled sidebar and a 720px breakpoint; spec 14 calls for a 64px rail and bottom navigation below 900px. Adopting colors leaves this structural migration unresolved. There are also no roadmap checks for dense Tasks tables, three-pane Inbox layouts, long logs, or readable streaming chat.  
    **Concrete fix:** Assign shared navigation, type scale, spacing scale, row density, primary-action hierarchy, and pane-collapse behavior to foundations. Validate representative Chat, Inbox, and Tasks screens at desktop, narrow widths, and 200% zoom before multiplying the patterns across routes.

11. **[med] Starter workflow scope contradicts the referenced specification.**  
    **Quote:** Phase 2: “3 starter workflows.”  
    **Why it matters:** Spec 05 says “ship with these” and lists six, including workflows dependent on Kanban, Files, and Scout in later phases. Without naming the initial three, Phase 2 has no bounded workflow deliverable. Compare mode similarly appears in Phase 4 here but Phase 3 in spec 04.  
    **Concrete fix:** Name the three Phase 2 workflows and their supported data sources. Explicitly defer the remaining workflows to their dependency phases, and record compare mode’s authoritative phase.

12. **[med] Switchable mock data has no boundary from real execution.**  
    **Quote:** “keep mock data switchable”; Testing: “Playwright smoke test per screen.”  
    **Why it matters:** As real backends arrive screen by screen, mock approvals, synthetic results, and real actions could appear together without a defined boundary. Screen smoke tests would not prove that an approval releases the correct run or that a simulated action cannot invoke a live adapter.  
    **Concrete fix:** Define a visibly labelled demo mode with isolated storage and execution adapters. Add cross-screen tests for task → run → Inbox result, approval → exact paused action, and Hermes card → Review, plus checks that demo mode cannot launch real work.