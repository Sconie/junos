1. **[high] HTTP(S) validation does not constrain where Scout can connect.**  
   **Reference:** [Rev 2 additions, line 48](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:48): “only http(s) feeds.”  
   **Why it matters:** Those schemes still permit requests to localhost, private-network services, and the Hermes private interface. Redirects and DNS changes can bypass an initial URL check. Safe rendering in spec 12 protects displayed content, not server-side fetching.  
   **Concrete fix:** Require public destinations by default; validate resolved addresses and every redirect, reject embedded credentials, and enforce connection, response-size, and decompression limits. Any private source needs an explicit host-specific exception.

2. **[high] “Fetch-only” collection contradicts the command and probe sources.**  
   **Reference:** Lines 10–11 specify “local command” and “adapter probe”; [line 46](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:46) says “collection uses fetch-only clients.”  
   **Why it matters:** Implementers cannot tell which execution capabilities are permitted. An allowlisted executable alone does not constrain its arguments, working directory, inherited credentials, or configuration. Only Assess explicitly disables model tools.  
   **Concrete fix:** Separate HTTP, aggregate-query, and fixed subprocess collectors. Specify executable, argument schema, permitted directory, restricted environment, timeout, and output cap for each subprocess. Explicitly disable tools for Filter and digest generation as well as Assess; source content must never construct commands.

3. **[med] The budget is neither quantified nor mapped to pipeline work.**  
   **Reference:** [Guardrails, line 33](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:33): “max N model runs per day”; Filter and Assess run before Dedupe.  
   **Why it matters:** One Scout run could assess hundreds of items, while repeated content consumes capacity before being discarded. It is unclear whether manual runs, retries, and digests share the limit. Spec 03 already supplies a no-meter fallback, but Scout does not define its accounting unit.  
   **Concrete fix:** Define a configurable default cap on provider invocations, counting retries, manual runs, filtering, assessment, and digests. Add per-run item/input limits, reserve capacity before dispatch, and perform deterministic deduplication before model calls. Reference spec 03’s counter-based fallback explicitly.

4. **[med] The weekly digest and finding details lack a persistence contract.**  
   **Reference:** [Pipeline, line 22](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:22): only findings above threshold “become `scout_finding` rows”; the digest “summarises the rest.”  
   **Why it matters:** The document never says where “the rest” survives until digest time. Spec 02 also lacks explicit storage for assessment rationale, risk, proposed changes, dismissal reasons, and finding-to-run provenance. Generic run output could hold these, but no relationship is specified.  
   **Concrete fix:** Define a retained candidate/assessment record, or an explicit reference to persisted run output. Distinguish filtered-out, below-threshold, published, and dismissed items; specify digest eligibility, retention, and the data powering the detail view.

5. **[med] Title-based suppression can hide new releases and advisories.**  
   **Reference:** [Acceptance criteria, line 39](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:39): “A dismissed item of the same title does not return.”  
   **Why it matters:** Publishers reuse titles, while the same announcement can appear under different titles across feeds. Permanent title matching can suppress materially changed security information and still allow duplicates.  
   **Concrete fix:** Use source-native item IDs, canonical URLs, and release/advisory versions as identity. Define cross-source merging and when a meaningful update resurfaces; retain title matching only as supporting evidence.

6. **[med] “Later” means permanent dismissal instead of postponement.**  
   **Reference:** [Learning from feedback, line 29](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:29): `later` is a dismissal reason used to train the filter.  
   **Why it matters:** Deferring useful work becomes negative relevance feedback and, under line 39, prevents its return. Spec 07 already offers Snooze for findings, creating inconsistent behavior between Scout and Inbox.  
   **Concrete fix:** Make “Later” invoke the shared Snooze action with a return time. Exclude snoozes from negative relevance examples and define which dismissal reasons actually affect relevance, risk tolerance, or duplicate suppression.

7. **[med] Collection checkpoints and publication are not restart-safe by contract.**  
   **Reference:** [Pipeline, lines 18–22](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:18): “since last run” followed by finding and Inbox creation.  
   **Why it matters:** Spec 05 protects scheduled-run claiming, but it does not determine when Scout advances each source cursor or atomically publishes its outputs. A crash can otherwise lose items, duplicate Inbox entries, or leave a finding without its notification.  
   **Concrete fix:** Define per-source checkpoints, stable item keys, and transactional/idempotent publication of the finding, Inbox item, and event. Advance checkpoints only after durable processing; failed sources must not advance with successful ones.

8. **[med] The layout delegates hierarchy and density to an unavailable mockup.**  
   **Reference:** [Screen, lines 24–26](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:24): “matches mockup,” with feed, detail, and source-management rail.  
   **Why it matters:** Spec 00 says the Stitch designs are absent, and `src/App.tsx` has no Scout route. Nothing establishes whether detail creates a third column, replaces the rail, or opens a drawer. That ambiguity directly affects summary legibility, spacing, and badge density.  
   **Concrete fix:** Specify a feed plus collapsible source rail, with finding detail replacing the rail or opening in the shared drawer. Define one gutter, row padding, and type roles—for example, 14–16px summaries and 12–13px metadata. Permit two-line summaries at narrow widths. Explicitly map both panels to spec 14’s full-screen-sheet behavior below 900px.

9. **[med] The scan hierarchy hides the information needed to judge urgency.**  
   **Reference:** [Line 25](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:25): rows show “source badge, one-line summary, effort chip” and sort by relevance.  
   **Why it matters:** Source and effort receive explicit visual treatment, while publication date, affected component/version, and assessed risk do not. Old high-scoring findings can dominate indefinitely, and badges can outweigh the actual recommendation.  
   **Concrete fix:** Lead with the recommendation; use a quiet secondary line for affected component/version, source, and age. Separate implementation risk from advisory urgency. Define relevance tie-breaking and New/All/Snoozed filters. Make “Make card” the primary detail action, with discussion and dismissal secondary.

10. **[med] Run and source health states cannot distinguish inactivity from failure.**  
    **Reference:** [Line 26](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:26): “last-checked time and health, cadence settings, and run-now.”  
    **Why it matters:** “Checked” could mean attempted, succeeded, or skipped for budget. Spec 14’s generic loading/error states do not explain partial collection, zero relevant findings, or budget deferral. Repeated Run now clicks also have no stated behavior.  
    **Concrete fix:** Specify last attempt, last success, next scheduled run, and source-level failure/retry. Distinguish “No new findings,” “Paused for capacity,” and partial success. Define Run now behavior during an active run and expose progress, logs, and the shared Stop control without moving the selected finding during updates.

11. **[low] Moving a card to Ready is presented as sufficient for Hermes pickup.**  
    **Reference:** [Guardrails, line 32](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:32): “Hermes after he moves it to Ready.”  
    **Why it matters:** Spec 09 requires both a Ready column and explicit `assignee=hermes`; a label alone never triggers execution. Scout’s wording gives an incomplete handoff instruction.  
    **Concrete fix:** State that generated cards start in Ideas, and Hermes requires explicit assignment plus Ready. Define repeated “Make card” clicks to open the existing linked card.

12. **[low] Acceptance criteria do not verify the risky behavior or glass execution.**  
    **Reference:** [Acceptance criteria, lines 36–39](/E:/AI/review-loop/specs-wt/docs/specs/08-scout.md:36).  
    **Why it matters:** Live feeds may legitimately produce zero qualifying findings. The three checks cannot establish safe collection, recovery, synchronized triage, or readable Scout rows over atmospheric glass. Spec 14 already requires opaque and reduced-motion fallbacks; Scout needs coverage of their actual application.  
    **Concrete fix:** Use deterministic feed fixtures with qualifying, rejected, duplicate, and updated items. Add negative collection and crash/retry cases. Require Scout-specific visual checks at desktop, tablet, narrow width, and 200% zoom: text contrast ≥4.5:1 over the brightest permitted composited background, visible focus/selection, readable metadata, opaque fallbacks, and reduced-motion updates that preserve focus and scroll position.