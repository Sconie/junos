1. **[high] Untrusted content can cross into tool-enabled contexts.**  
   **Reference:** § Guardrails: “tool use is disabled during Assess”; § Screen: “Ask Claude”; § Learning from feedback.  
   **Why it matters:** Filter also reads external content. Findings then enter chat, cards, and future filter prompts; disabling tools only during Assess leaves those later boundaries unspecified. Chat supports tools under spec 04.  
   **Fix:** Require tool-free Filter and Assess execution at the adapter level. Preserve untrusted provenance in findings, feedback examples, chats, and cards. Opening a finding in chat must not automatically send it or enable tools; a suggested change must never become execution authority.

2. **[high] Editable source URLs lack a safe collection contract.**  
   **Reference:** § What it watches: sources have editable “URL/query”; § Pipeline: “fetch new items.”  
   **Why it matters:** The local daemon could fetch loopback services, private network addresses, or redirected destinations. Large responses, malformed feeds, and slow servers could also stall collection. Spec 12’s inbound daemon protections do not constrain outbound fetching.  
   **Fix:** Define allowed schemes and destinations, revalidate redirects and resolved addresses, reject embedded credentials, and cap redirects, response size, time, and concurrency. Any intentional local source should require an explicit scoped exception.

3. **[high] Self-analysis has no defined privacy boundary.**  
   **Reference:** § What it watches: “queries over `run` and `event` tables.”  
   **Why it matters:** Spec 02 stores run inputs and event payloads, while spec 05 records step inputs and outputs. Sending those records to Filter or Assess could disclose prompts, paths, private project details, or secrets beyond the pattern redaction in spec 12.  
   **Fix:** Specify a local aggregation layer that exports only approved metrics—counts, durations, error categories, and feature identifiers. Exclude raw prompts, outputs, and payloads by default. Define retention and the permitted context sent through “Ask Claude.”

4. **[high] Collection and publication cannot yet recover reliably from interruption.**  
   **Reference:** § Pipeline: “since last run,” followed by separate finding and Inbox writes.  
   **Why it matters:** There is no per-source checkpoint or commit rule. Advancing a cursor before publication can lose findings; retrying after partial publication can duplicate them. A failed source also needs to recover independently of successful sources.  
   **Fix:** Define durable per-source cursors, stable source-item identities, and transactional or idempotent finding/Inbox publication. Advance checkpoints only after durable processing. Apply spec 05’s overlap, retry, and cancellation policies explicitly to scheduled and manual Scout runs.

5. **[high] The budget rule depends on meters that may not exist.**  
   **Reference:** § Guardrails: “max N model runs per day” and “only when subscription meters are below threshold.”  
   **Why it matters:** Spec 03 explicitly allows providers without usage meters. “N” has no default, and a single collection can fan out into many assessments; deduplication happens only after those calls. Digest generation and retries are unaccounted for.  
   **Fix:** Set conservative defaults for calls, candidates, input size, and concurrency. Define behavior for unknown or stale meters, reserve budget before dispatch, and count retries and digests. Perform deterministic deduplication before model calls. Show a clear budget-paused state and resume time.

6. **[med] The promised evidence and feedback have no defined durable representation.**  
   **Reference:** § Assess promises risk and affected JunOS areas; § Detail promises rationale and suggested change; § Learning stores dismissal reasons.  
   **Why it matters:** Spec 02’s `scout_finding` contains none of those fields. Its source table also lacks last-check and health fields. Without a storage contract, details may disappear after reload or diverge between Scout and Inbox.  
   **Fix:** Specify structured assessment output and its persistence mapping: rationale, risk, affected areas, proposed change, evidence links, assessed version, run reference, dismissal reason, and source health/checkpoint state. Explicitly identify anything stored through existing run or event records.

7. **[med] “Later” is treated as rejection, and title-based suppression is too broad.**  
   **Reference:** § Learning includes `later`; § Acceptance: “A dismissed item of the same title does not return.”  
   **Why it matters:** “Later” means defer, while training on it as negative feedback may suppress useful work. Titles can change across syndicated copies or remain identical across materially different releases. Inbox already supports Snooze in spec 07.  
   **Fix:** Make “Later” a snooze with a return time. Reserve dismissal for rejection, add undo, and key suppression by source identity plus release/advisory/version rather than title alone. Define synchronized state between Scout and Inbox.

8. **[med] Assessment promises more certainty than its inputs support.**  
   **Reference:** § Assess: score relevance, effort, risk, and “what in JunOS it would touch.”  
   **Why it matters:** The spec never identifies which local facts Assess receives. Release notes alone cannot establish installed versions, affected dependencies, actual feature use, or implementation effort. “Features never used” also requires instrumentation and an observation window.  
   **Fix:** Define a minimal versioned local inventory and assessment rubric. Separate source facts from model estimates; allow “unknown” for effort and risk. Defer behavioral self-analysis until the required events and time window exist.

9. **[med] The screen’s pane arrangement and action hierarchy are unresolved.**  
   **Reference:** § Screen: feed, detail, and a right rail containing sources and settings.  
   **Why it matters:** It is unclear whether detail replaces the feed, opens a drawer, or creates a third column. Sources, cadence controls, and Run now can compete with the primary job of reviewing findings. Spec 14’s generic grid and drawer widths do not resolve this.  
   **Fix:** Define a desktop list/detail arrangement, with source configuration behind a secondary “Sources” control. Make “Make card” the selected finding’s primary action; keep Ask and Dismiss secondary. Specify pane minimum widths, one gutter, and collapse behavior before content becomes cramped. Below 900px, show one pane at a time and restore list selection and scroll on Back.

10. **[med] One-line summaries omit the information needed for triage.**  
    **Reference:** § Screen: “source badge, one-line summary, effort chip,” sorted by relevance.  
    **Why it matters:** Long release titles will truncate, while freshness, affected version, and assessed risk are absent from the list. Relevance-only ordering can keep old findings above new ones indefinitely. Multiple equally prominent badges would further weaken hierarchy.  
    **Fix:** Define a repeatable row: 14–16px semibold title, up to two summary lines, and 12–13px metadata for source, version, age, and effort. Use a consistent roughly 72–88px row pitch and 16–24px panel padding. Add stable tie-breaking, New/Reviewed filters, and a freshness sort; give exceptional risk a textual marker rather than coloring every chip.

11. **[med] Glass contrast needs concrete foreground/background pairings.**  
    **Reference:** § Screen’s badges, chips, and actions; inherited tokens in spec 14.  
    **Why it matters:** The shared 4.5:1 requirement is sound, but it does not specify safe pairs for Scout’s compact controls. For example, `#E7E8EC` text on solid violet `#8B5CF6` is approximately **3.46:1**, insufficient for normal-sized labels. Translucent surfaces also vary with the backdrop.  
    **Fix:** Define tested text, chip, selection, and focus pairs over the brightest permitted glass composite and opaque fallback. An optional ice-blue accent, `#7DD3FC`, gives approximately **11.73:1** with `#0B0C0F` button text and **10.85:1** as text on opaque `#14161B`; it also separates actions from teal health indicators. These are solid-pair calculations—glass composites still need verification.

12. **[med] Scout-specific states, keyboard behavior, and motion are unspecified.**  
    **Reference:** § Screen: health, run-now, relevance-sorted feed; spec 14 supplies only global state requirements.  
    **Why it matters:** “No findings” could mean no changes, everything filtered out, failed collection, or a budget pause. Incoming findings could reorder the selected row. Generic reduced-motion support does not define how this continuously updated screen behaves.  
    **Fix:** Specify first-run, successful-empty, partial-failure, stale, disconnected, and budget-paused states with appropriate next actions. Keep existing results visible during refresh. Announce new results without automatically reordering an active selection. Define keyboard navigation and focus restoration; keep glow static and avoid pulsing health indicators or animated blur. State the reduced-motion and opaque equivalents.

13. **[med] Handoff and acceptance criteria leave major failures untested.**  
    **Reference:** § Screen: “Make card,” “Ask Claude”; § Acceptance: two feeds produce at least one finding.  
    **Why it matters:** Repeated clicks may create duplicate cards. Spec 09 requires both Ready status and Hermes assignment/label for pickup, whereas Scout mentions only moving to Ready. “Ask Claude” has no disconnected-provider behavior. Live feeds cannot reliably guarantee a relevant result.  
    **Fix:** Define idempotent card creation into Ideas, then replace the action with “Open card.” Keep Hermes assignment and Ready movement explicit. Open Ask Claude as a reviewable draft with a disconnected-provider recovery path. Use fixed feed fixtures for acceptance, including zero qualifying results, restart/retry deduplication, snooze, privacy boundaries, and narrow-screen/keyboard behavior. Phase the first release around feed collection before adding web discovery and self-analysis.