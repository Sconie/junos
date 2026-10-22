1. **[high] The read-only boundary does not survive the full pipeline.**  
   **Reference:** “tool use is disabled during Assess” (line 34); “Ask Claude” and “Make card” (line 25).  
   **Why it matters:** Filter and digest generation also consume untrusted content. A malicious recommendation can then enter chat or a Hermes card as apparently trusted instructions. Disabling tools in Assess alone does not protect those later steps.  
   **Fix:** Require tool-free processing throughout Scout’s model stages, enforced by the runner. Preserve source provenance and untrusted-content boundaries in findings, chat drafts, and cards. “Ask Claude” should open an unsent draft; “Make card” should create an unassigned Ideas card. Specify that execution requires the eligibility and approval rules in specs 09 and 12.

2. **[high] Editable sources lack a safe collection contract.**  
   **Reference:** Source “URL/query” editing (line 15), “local command” and “adapter probe” (lines 10–11).  
   **Why it matters:** The daemon can access local files, networks, and authenticated clients. Unrestricted URLs or redirects could reach local services; loosely defined probes could become arbitrary shell execution. Large or hanging responses could stall scheduled work.  
   **Fix:** Define permitted source schemas, HTTP(S) destinations, redirect validation, response-size limits, timeouts, and concurrency caps. Block loopback/private destinations for public-web sources. Local checks must use fixed executable/argument templates and allowlisted project directories, never commands derived from source content.

3. **[high] “Self” monitoring has no privacy boundary.**  
   **Reference:** “queries over `run` and `event` tables” (line 13).  
   **Why it matters:** Those records can contain prompts, paths, tool output, and personal information. Sending them to a subscription-backed model still transmits data outside the machine. Secret-pattern redaction in spec 12 does not cover ordinary sensitive content.  
   **Fix:** Define a local aggregation interface exposing only necessary counts, durations, and error categories. Exclude raw prompts, outputs, paths, and event payloads by default. Specify retention and explicitly selected context for any deeper analysis.

4. **[high] The budget rule cannot handle unavailable usage meters.**  
   **Reference:** “max N model runs per day” and “only when subscription meters are below threshold” (line 33).  
   **Why it matters:** Spec 03 explicitly allows providers without usage meters. This leaves Scout either permanently blocked or free to consume unknown capacity. Per-item Filter/Assess calls, retries, and the digest can also multiply usage beyond a nominal workflow count.  
   **Fix:** Set an actual default allowance and define a model run as an adapter invocation, including retries and digests. Reserve capacity before calls; cap items and input sizes. Define behavior for unknown/stale meters, share the background-job budget, and show a visible “Paused: budget unavailable/exhausted” state. Run-now must obey the same limits.

5. **[high] The promised findings and source health cannot be reconstructed reliably.**  
   **Reference:** Assessment fields (line 20), detail content and source health (lines 25–26), stored dismissal reasons (line 29).  
   **Why it matters:** Spec 02’s Scout tables lack risk, affected components, suggested change, dismissal reason, last-check time, health, and collection cursor. Below-threshold findings are not explicitly persisted, although the weekly digest needs them.  
   **Fix:** Specify durable records or explicit linked payloads for these fields, including originating run, assessment version, and collected candidates. Define finding statuses and transitions, and distinguish a successful empty check from a failed check.

6. **[med] Collection and publication have no restart or replay semantics.**  
   **Reference:** “fetch new items since last run,” Dedupe, and Publish (lines 18–22); “same title does not return” (line 39).  
   **Why it matters:** A crash between inserting a finding and creating its Inbox item can lose delivery or duplicate it. Titles are unstable and nonunique: unrelated releases can share a title, while the same release can be renamed. Inbox’s 24-hour dedupe rule in spec 07 does not resolve this.  
   **Fix:** Define stable source-item keys, persisted cursors, and idempotent finding/Inbox publication. Advance cursors only after durable processing. Deduplicate before expensive assessment where possible, and define when a materially updated item may resurface.

7. **[med] “Later” is treated as permanent rejection.**  
   **Reference:** Dismiss reasons include `later` and feed Filter (line 29); dismissed titles never return (line 39).  
   **Why it matters:** Deferral becomes negative relevance training and permanent suppression. This conflicts with the finding Snooze action already specified in spec 07.  
   **Fix:** Use Snooze with a return time for “later.” Separate relevance feedback from risk preference and “already known.” Make dismissal reversible and define how feedback applies to a particular finding, source, or topic.

8. **[med] The initial scope exceeds what the acceptance criteria establish.**  
   **Reference:** Five source kinds (lines 9–13); acceptance requires only two feeds (line 37).  
   **Why it matters:** Web discovery, dependency checks, provider probes, and usage analysis are separate integrations. “Features never used” additionally requires instrumentation that `run` and `event` records do not automatically provide. Passing a feed demo would leave most advertised behavior unverified.  
   **Fix:** Declare an initial release limited to configured feeds/releases and bounded scoring. Explicitly defer the other collectors behind separate acceptance gates. Either specify feature-usage instrumentation or narrow “Self” to metrics the recorded data actually supports.

9. **[med] The screen has no defined hierarchy, density, or responsive composition.**  
   **Reference:** “Screen (matches mockup)” and its feed/detail/right-rail description (lines 24–26).  
   **Why it matters:** No Scout mockup is identified; `stitch-prompts.md` has no Scout screen, and `src/App.tsx` has no Scout route. The prose leaves open whether detail competes with sources for space, how summaries wrap, and which action leads. Shared spec 14 defines the shell but not this composition.  
   **Fix:** Specify one concrete layout: finding list plus selected detail on wide screens, with sources/settings behind a secondary control; a single pane with back navigation on narrow screens. Define a 24px title, 14–16px reading text, readable metadata, consistent 16/24px spacing, wrapping summaries, and a bounded detail measure. Make “Make card” the leading detail action and Run-now secondary.

10. **[med] Glass legibility and accent usage lack Scout-specific acceptance conditions.**  
    **Reference:** Source badges, effort chips, and health indicators (lines 25–26), inheriting spec 14’s translucent surfaces.  
    **Why it matters:** Small metadata and focus indicators must remain readable across glow positions, selected rows, and overlays. Static color pairs cannot establish contrast on composited glass. The starting violet also provides only **4.27:1 against `#14161B`**, while white on violet provides **4.23:1**—insufficient for ordinary small text in those pairings.  
    **Fix:** Require contrast checks on the brightest actual composited backgrounds and define opaque/high-contrast fallbacks. Consider **ice blue `#7DD3FC`** for links, selection cues, and one primary action: it separates recommendations from teal health states and provides **10.85:1 against `#14161B`**, or **11.73:1 with `#0B0C0F` button text**. These are calculated opaque-pair values; glass still requires composited verification.

11. **[med] Live updates have no interaction or motion contract.**  
    **Reference:** Relevance-sorted feed and Run-now (lines 25–26).  
    **Why it matters:** Newly scored findings could reorder the list while Jonas reads or navigates it. The spec supplies no Scout keyboard behavior, focus restoration, update announcements, or reduced-motion behavior beyond the shared principle in spec 14.  
    **Fix:** Keep selection and scroll stable; offer “New findings available” instead of moving focused rows. Define keyboard list/detail navigation, visible focus, named controls, and polite completion announcements. Use static status text under reduced motion, avoid continuous shimmer/pulsing, and make controls comfortably operable at zoom and touch sizes.

12. **[med] Operational states and acceptance tests cover only a favorable run.**  
    **Reference:** Right-rail health (line 26); three acceptance criteria (lines 36–39).  
    **Why it matters:** No relevant findings, a broken feed, a disconnected Claude account, a partial run, and a budget pause need different explanations. “Get at least one scored finding” also depends on live content and can reward publishing noise. Relevance-only sorting gives no visibility to aging findings or uncertain assessments.  
    **Fix:** Specify first-run, successful-empty, partial-failure, stale, running, cancelled, and budget-paused states with targeted recovery. Define behavior when Claude is unavailable, plus age, risk, and evidence in finding details. Use deterministic feed fixtures to verify thresholding, suppression, restart recovery, safe handoff, and idempotent card creation; align the quality check with roadmap 13’s noise target.