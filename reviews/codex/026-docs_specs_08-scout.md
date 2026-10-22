1. **[high] Untrusted findings lose their safety boundary during handoff.**  
   **Reference:** §Screen: “Ask Claude … opens chat with the finding as context”; §Guardrails disables tools only “during Assess.”  
   **Why it matters:** A malicious release note can survive summarisation and enter a tool-enabled chat or executable Kanban card. Calling content “data” does not enforce isolation. §05 also supports `scout.finding` workflow triggers, creating another handoff path.  
   **Concrete fix:** Require tool-free Filter, Assess and digest generation; validate their structured output. Preserve source provenance and the untrusted-content boundary through chat, cards and workflow events. “Make card” must create an unassigned Ideas card; execution requires Jonas’s separate handoff under §09.

2. **[high] Editable source URLs create an unrestricted daemon fetch surface.**  
   **Reference:** §What it watches: sources have editable “URL/query”; §Pipeline: “fetch new items.”  
   **Why it matters:** Without destination validation, configured URLs or redirects could reach localhost services, private network resources or local files. Large responses and stalled connections could also monopolise scheduled runs.  
   **Concrete fix:** Define HTTP(S)-only fetching, reject embedded credentials, block loopback/private/link-local destinations by default, and validate every redirect and resolved destination. Set time, response-size, redirect and item-count limits. Treat any intentional private feed as an explicit exception.

3. **[high] Self-analysis has no privacy boundary before provider use.**  
   **Reference:** §What it watches: “queries over `run` and `event` tables”; §Learning: dismissal reasons enter model prompts.  
   **Why it matters:** §02 stores prompts, outputs, errors and event payloads in these records. Sending raw rows could disclose private conversations, paths or project content to a provider. §12’s secret-pattern redaction does not cover ordinary sensitive information.  
   **Concrete fix:** Specify an allowlisted aggregate input—counts, durations, error categories and bounded time windows—with raw prompts, outputs, paths and payloads excluded by default. State what leaves the machine, which provider receives it, and how long Scout retains source excerpts and feedback.

4. **[high] The budget rule cannot handle unknown subscription usage or bound work.**  
   **Reference:** §Guardrails: “max N model runs per day” and “only when subscription meters are below threshold (03).”  
   **Why it matters:** §03 explicitly permits unavailable meters. “N” is unset, and each source item can generate multiple calls. Retries, fallback providers, digests, probes and Run now have no accounting rules, so a busy feed can exhaust capacity despite the guardrail.  
   **Concrete fix:** Set concrete defaults for calls, items, input/output size, concurrency and elapsed time. Count retries and all model-using stages. Reserve capacity atomically before starting calls; specify an unknown-meter policy and whether manual runs share the cap. Show a paused-budget state with a resume condition.

5. **[med] Collection has no durable progress or publication contract.**  
   **Reference:** §Pipeline: “fetch new items since last run,” then “Publish.”  
   **Why it matters:** §02’s `scout_source` has no cursor, last-success or health fields, although §Screen requires last-checked time and health. Restarting between collection and publication could skip items or duplicate findings, Inbox entries and events.  
   **Concrete fix:** Specify per-source checkpoints, attempt/success timestamps and errors. Advance checkpoints only after durable processing, and make publication idempotent across retries and restarts. Explicitly inherit §05’s scheduling rules, including overlap between Run now and scheduled runs.

6. **[med] Dismissal, snoozing and deduplication have conflicting semantics.**  
   **Reference:** §Learning lists “later” as a dismiss reason; §Acceptance says a dismissed item “of the same title does not return.”  
   **Why it matters:** §07 already defines Snooze. Treating “later” as negative feedback can suppress useful topics, while title-only suppression can hide a later security update with the same heading. Scout and Inbox also have separate status fields without synchronisation rules.  
   **Concrete fix:** Make “later” a snooze action excluded from negative training examples. Define stable source-item identity, canonical URLs and a material-update policy. Specify shared transitions across finding and Inbox status, an Undo action, and an idempotent “Make card” that becomes “Open card.”

7. **[med] The weekly digest has no specified source of retained evidence.**  
   **Reference:** §Pipeline: only findings above threshold become rows; “a weekly digest summarises the rest.”  
   **Why it matters:** Below-threshold candidates have no defined storage, provenance or retention. It is unclear whether “the rest” includes irrelevant items discarded by Filter. Meanwhile, §02 lacks explicit fields for the promised risk, affected JunOS area and assessment rationale.  
   **Concrete fix:** Define bounded candidate storage with stage outcomes and source references. Distinguish discarded items from assessed candidates eligible for the digest. Specify persisted rationale, risk, affected component and source version/date, plus the digest’s schedule and delivery destination.

8. **[med] The scope promises inferences that the named telemetry cannot support.**  
   **Reference:** §What it watches: “features never used, repeated manual actions”; §Assess: “what in JunOS it would touch.”  
   **Why it matters:** §02 does not define feature-use or manual-interaction instrumentation. Reliable recommendations about affected code also need a bounded inventory of installed versions and architecture; none is supplied. These features add substantial instrumentation and analysis work beyond feed monitoring.  
   **Concrete fix:** Define an initial release around release feeds and dependency advisories matched to installed versions. Defer behavioural analysis until explicit, privacy-limited telemetry exists. Supply a curated component inventory and allow “affected area unknown” instead of requiring invented precision.

9. **[med] “Screen (matches mockup)” leaves the core review hierarchy undefined.**  
   **Reference:** §Screen: feed, detail and a right rail containing sources and settings.  
   **Why it matters:** The doc does not identify its mockup, and `src/App.tsx` has no Scout route or implementation to resolve the ambiguity. Feed, detail and settings could become three equally weighted glass columns. Relevance alone also hides freshness and urgency.  
   **Concrete fix:** Link a specific reference and define list/detail behaviour. Make findings the dominant region; keep source configuration secondary and collapsible. Show readable title, source, release date, affected component and effort in each row; expose risk and evidence in detail. Define deterministic sorting, New/Snoozed/Dismissed filters, and stable selection while new findings arrive.

10. **[med] Glass legibility, spacing and typography lack Scout-specific acceptance conditions.**  
    **Reference:** §Screen’s “source badge, one-line summary, effort chip”; inherited §14 glass tokens.  
    **Why it matters:** §14 supplies a useful baseline, but it does not establish how Scout’s dense metadata remains readable over glow, how long titles expand, or how the active row differs from hover. One-line truncation can remove the information needed to judge a finding.  
    **Concrete fix:** Specify a restrained type scale—for example, 24px page title, 16px finding title, 14px body/metadata—with consistent 16px row padding and 24px region gaps. Permit two-line titles and full detail text. Require contrast checks over the brightest permitted composited background, stronger glass tint where needed, and opaque/high-contrast fallbacks.  
    **Palette option:** Use the existing source accent `#7C9CFF` for actions and selection, retaining teal for health. Calculated contrast is **7.50:1** against `#0B0C0F` and **5.71:1** against an example darker panel `#242732`. Filled blue buttons need dark text: `#E7E8EC` on that blue is only **2.13:1**. Validate the final glass composites separately.

11. **[med] Run feedback and accessible interaction are not defined.**  
    **Reference:** §Screen: “run-now,” source health, detail actions and dismissal reasons.  
    **Why it matters:** §14 requires general states and responsive sheets, but Scout does not distinguish collecting, assessing, partial failure, no new items or budget pause. Dynamic relevance sorting can displace keyboard focus; opening detail and dismissal prompts has no specified focus behaviour.  
    **Concrete fix:** Define run progress, cancellation and per-source retry, preserving successful results after partial failures. Specify keyboard list navigation, focus restoration, labelled health states and announced action results. Below 900px, define separate finding-detail and Sources sheets. Keep sorting stable during interaction; reduced motion should replace row travel and shimmer with static status feedback.

12. **[med] Acceptance criteria reward output quantity instead of correctness and safety.**  
    **Reference:** §Acceptance: “two feeds” must produce “at least one scored finding.”  
    **Why it matters:** A correct run may find nothing relevant. The current checks do not establish read-only enforcement, restart safety, budget handling or trustworthy presentation. §13 additionally expects under 30% dismissal noise, but this doc defines neither its denominator nor how snoozes count.  
    **Concrete fix:** Use fixed fixtures containing relevant, irrelevant, duplicate, updated and malicious items, with an explicit zero-findings success case. Add acceptance checks for private-input exclusion, prohibited tool calls, unknown usage, partial failures, restart-safe publication and card idempotency. Define the noise metric and require keyboard, narrow-screen, contrast, opaque-fallback and reduced-motion checks.