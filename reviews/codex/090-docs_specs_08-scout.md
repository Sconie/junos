1. **[high] Read-only protection stops at the wrong stage.**  
   **Reference:** Guardrails, lines 32–34: “tool use is disabled during Assess”; Pipeline includes Filter, and the source list includes local commands and adapter probes.  
   **Why it matters:** Untrusted feeds reach Filter first. Disabling tools only during Assess leaves earlier processing and later chat handoffs without an explicit capability boundary. A prompt saying “read-only” does not enforce one.  
   **Fix:** Require tool-free Filter, Assess, and digest generation. Run collection through fixed, validated collectors with allowlisted commands and working directories. Preserve the untrusted-content boundary when findings enter chat, cards, or Hermes.

2. **[high] Editable source URLs have no fetch security contract.**  
   **Reference:** What it watches, line 15: editable “URL/query.”  
   **Why it matters:** The daemon could fetch local services or private network resources through a configured URL or redirect. Oversized feeds and slow responses could also monopolise Scout.  
   **Fix:** Specify allowed schemes, reject loopback/private/link-local destinations by default, revalidate redirects, and enforce timeouts, response-size limits, and safe feed parsing. Treat source values as arguments rather than shell command text.

3. **[high] Self-analysis can expose private run content to providers.**  
   **Reference:** What it watches, line 13: “queries over `run` and `event` tables.”  
   **Why it matters:** Those tables contain inputs, errors, and flexible payloads in `02-data-model.md`. Scout could send private prompts, file paths, or tool output to its models. Secret-pattern redaction in spec 12 does not cover all personal information.  
   **Fix:** Define an allowlisted telemetry view containing aggregate counts, durations, and sanitised error categories. Exclude raw prompts, outputs, and event payloads by default; make deeper inspection an explicit, scoped opt-in with retention limits.

4. **[high] The budget cannot reliably bound unattended work.**  
   **Reference:** Pipeline, lines 19–20; Guardrails, line 33: “max N model runs per day” and subscription-meter threshold.  
   **Why it matters:** N is undefined, assessment fans out per survivor, and spec 03 explicitly allows providers whose usage meters are unavailable. Retries, fallback providers, and the digest have no accounting rules.  
   **Fix:** Set concrete defaults for daily invocations, items per source, assessment batch size, and input size. Count retries, digests, and fallbacks against the budget. Define conservative behavior for unknown/stale meters, reserve capacity before dispatch, and show why Scout is paused. Run-now must respect the same limits.

5. **[med] Deduplication and publishing are not restart-safe.**  
   **Reference:** Pipeline, lines 18–22; acceptance criterion, line 39: “same title does not return.”  
   **Why it matters:** Titles change, unrelated releases share titles, and the same release appears in multiple feeds. Deduping after assessment also wastes capacity. Separate finding and Inbox writes can duplicate or diverge after retries; Inbox’s 24-hour dedupe in spec 07 is insufficient.  
   **Fix:** Define stable source-item IDs and canonical release/advisory keys. Deduplicate before model calls, then merge related findings afterward. Specify durable collection checkpoints and transactional, idempotent finding/Inbox publication. Make repeated “Make card” return the existing linked card.

6. **[med] “Later” is treated as rejection instead of postponement.**  
   **Reference:** Learning from feedback, line 29; permanent title suppression, line 39.  
   **Why it matters:** Training the filter on “later” can suppress useful suggestions permanently. “Already know” also expresses a different preference from “not relevant.” Spec 07 already provides Snooze, but this screen omits it.  
   **Fix:** Use Snooze with a return time for “later.” Define suppression scope for each dismissal reason, add undo, and keep postponed findings out of negative filter examples.

7. **[med] Required assessment evidence has nowhere explicit to persist.**  
   **Reference:** Assess, line 20; detail view, line 25.  
   **Why it matters:** Scout promises risk, affected JunOS areas, rationale, and suggested changes. The `scout_finding` schema in spec 02 has no explicit fields or referenced assessment artifact for these. The UI also omits risk and evidence freshness from its scanning hierarchy.  
   **Fix:** Specify a persisted assessment artifact linked to the finding and run, containing rationale, risk, affected components, source/version/date, and suggested change. Expose material risk and source date in the feed; distinguish model estimates from verified facts.

8. **[med] Relevance-only ordering can bury fresh, actionable findings.**  
   **Reference:** Screen, line 25: “sorted by relevance.”  
   **Why it matters:** Old high-scoring suggestions can dominate indefinitely. There is no defined default status filter, tie-breaker, freshness policy, or way to inspect dismissed findings. A consequential advisory may sit below speculative feature ideas.  
   **Fix:** Default to active findings, define deterministic ordering with urgency and freshness rules, and offer relevance/newest sorting plus status/source filters. Preserve the selected finding and scroll position when results update; announce new arrivals without moving the row being read.

9. **[med] “Matches mockup” provides no usable Scout layout contract.**  
   **Reference:** Screen, lines 24–26.  
   **Why it matters:** `docs/design/stitch-prompts.md` contains no Scout screen, and `src/App.tsx` has no Scout route. The spec names a feed, detail view, and source rail without deciding how they coexist. That leaves hierarchy, density, spacing, and typography to implementation guesswork.  
   **Fix:** Link a concrete Scout reference or replace the claim with a layout definition. For example: dominant findings list, detail drawer on selection, and a collapsible source rail; one shared gutter; 14–16px summaries with 12–13px metadata; expandable two-line summaries for long titles. Define behavior at 900px and 200% zoom, including back navigation and restored list position.

10. **[med] Shared glass rules need Scout-specific acceptance checks.**  
    **Reference:** Screen, lines 25–26; acceptance criteria, lines 36–39.  
    **Why it matters:** Spec 14 already requires contrast, fallbacks, focus visibility, and reduced motion, but Scout never applies these to dense source badges, effort chips, selected rows, health labels, and stacked detail surfaces. Those elements are particularly sensitive to varying glow behind glass.  
    **Fix:** Require checks over the brightest atmospheric background and overlapping panels: at least 4.5:1 for normal text and 3:1 for essential control/focus indicators. Give health a text label, define opaque high-contrast surfaces, and keep reduced-motion loading and updates static. Use one clear primary action in the detail view and restrained secondary actions. Treat accent selection as open.

11. **[med] Operational states are missing from the screen contract.**  
    **Reference:** Right rail, line 26: “last-checked time and health, cadence settings, and run-now.”  
    **Why it matters:** A healthy source is different from a successful Scout run. The screen cannot currently distinguish no relevant findings from failed collection, partial success, exhausted budget, disconnected models, or an ongoing run. Spec 14’s generic states do not explain these differences.  
    **Fix:** Define queued/running/partial/failed/budget-paused states, last successful scan, next scheduled scan, and per-source failures. Provide cancellation and scoped retry, disable duplicate launches, and distinguish first-run setup from “checked successfully; nothing new.” Specify keyboard row navigation and focus restoration after dismissal.

12. **[med] Acceptance criteria test lucky output rather than the promised behavior.**  
    **Reference:** Lines 37–39: two feeds must yield “at least one scored finding.”  
    **Why it matters:** Live feeds may legitimately produce nothing relevant. Meanwhile, all five source kinds, feedback learning, digest delivery, budget enforcement, and recovery remain outside acceptance. The roadmap’s noise target in spec 13 also lacks a defined measurement here.  
    **Fix:** Use fixed feed fixtures with known qualifying, irrelevant, duplicate, and hostile items. Add checks for restart/retry idempotency, budget exhaustion, unknown usage, Snooze, partial failures, and accessible glass states. Define a first release around two named collectors; explicitly defer the others. Specify the noise metric’s denominator and observation period.