1. **[high] Read-only protection applies too narrowly.**  
   **Reference:** §Guardrails, lines 32–34: “tool use is disabled during Assess.”  
   **Why it matters:** Filter also reads hostile content; Collect runs local commands and adapter probes. Findings then enter tool-enabled chat, cards, and potentially `scout.finding` workflows (`05`, §Triggers). Disabling tools in Assess leaves those other boundaries undefined.  
   **Concrete fix:** Require tool-free Filter and Assess runs, fixed allowlisted collectors with explicit arguments and working directories, and structured validated model output. Preserve untrusted provenance through chat/card handoffs. Define that publishing a finding never authorizes execution; card creation defaults to Ideas, with Hermes eligibility governed by `09`.

2. **[high] Local telemetry can leave the machine without a defined privacy boundary.**  
   **Reference:** §What it watches, line 13; §Pipeline, lines 19–20; §Learning from feedback.  
   **Why it matters:** `run.input_json` and `event.payload_json` can contain prompts, paths, tool output, and personal information. The spec does not say what reaches provider models or web-search queries. Secret-pattern redaction in `12` does not define protection for ordinary private content.  
   **Concrete fix:** Specify an allowlisted, locally aggregated telemetry payload: counts, durations, error categories, and explicitly selected project metadata. Exclude raw prompts, file contents, and event payloads by default. Define provider destinations, retention/deletion rules, and a preview of shared context.

3. **[high] Editable source URLs introduce an unrestricted daemon fetch boundary.**  
   **Reference:** §What it watches, line 15: editable “URL/query.”  
   **Why it matters:** The daemon has access to localhost and the filesystem. Source URLs and feed-provided links could direct collection toward local services, private addresses, unsupported schemes, or oversized responses. The daemon’s inbound authentication rules in `12` do not constrain outbound collection.  
   **Concrete fix:** Define an HTTP(S)-only fetch policy, reject loopback/private/link-local destinations by default, revalidate redirects and resolved destinations, and cap response sizes, timeouts, redirects, and item counts. Source fields must never interpolate into shell commands.

4. **[high] The budget cannot operate reliably when usage meters are unavailable.**  
   **Reference:** §Guardrails, line 33: “max N model runs per day” and subscription meters “below threshold.”  
   **Why it matters:** `03`, §Connection states explicitly permits providers without usage meters. `N` is unset, and one collection could produce hundreds of assessments. Retries, fallback providers, digest generation, and Run now have no counting rules.  
   **Concrete fix:** Set default per-day and per-run limits, maximum items and assessments, and prompt/output caps. Count retries and fallbacks. Define conservative behavior for unknown/stale meters and show the pause reason and reset time. Apply the same limits to manual runs.

5. **[med] Collection and publishing lack a restart-safe persistence contract.**  
   **Reference:** §Pipeline, lines 18–22: “since last run,” Dedupe, Publish.  
   **Why it matters:** Advancing a collection cursor before publication can lose findings; advancing it afterward can duplicate them. Below-threshold items must survive until the weekly digest, but their storage is unspecified. `02` also lacks the source cursor/health and assessment evidence required here.  
   **Concrete fix:** Define stable source-item identities, persisted cursors, retained candidate assessments, and idempotent publication. Commit the finding, Inbox reference, and event consistently; retries must reuse their identities. Document where risk, rationale, affected components, feedback, and source health live.

6. **[med] “Later” contradicts permanent dismissal and corrupts feedback.**  
   **Reference:** §Learning from feedback, line 29; acceptance criterion, line 39: “same title does not return.”  
   **Why it matters:** “Later” means defer, whereas permanent suppression means reject. “Already know” and “too risky” also mean different things from irrelevance. Title matching can suppress an unrelated release or miss the same finding with a rewritten headline. Inbox already supports Snooze (`07`).  
   **Concrete fix:** Make Later a timed Snooze shared with Inbox. Separate feedback categories and train relevance filtering only from appropriate examples. Dedupe by source identity/canonical URL plus release or advisory identity; define when materially updated findings may return. Provide Undo.

7. **[med] Model relevance is treated as decision quality without supporting evidence.**  
   **Reference:** §Pipeline, lines 20–22; §Screen, line 25.  
   **Why it matters:** A 0–100 model score does not establish applicability or urgency. Scout could recommend an upgrade already installed, while a relevant security advisory falls below the threshold. Risk is assessed but neither its scale nor its presentation is specified.  
   **Concrete fix:** Define a scoring rubric and require evidence: source date/link, observed local version or capability, affected component, and confidence/unknowns. Separate urgency from relevance and specify advisory handling. Show risk and applicability in detail; avoid presenting relevance as a precise probability.

8. **[med] The initial scope combines several distinct monitoring products.**  
   **Reference:** §What it watches, lines 9–13; §Acceptance criteria, lines 37–39.  
   **Why it matters:** Release ingestion, dependency advisories, compatibility probes, open-ended research, and behavioral analysis need different collectors and validation. Two feeds producing one finding validates little of that scope. “Features never used” additionally requires feature-use instrumentation that this doc does not define.  
   **Concrete fix:** Specify a first release limited to configured release feeds and manual/scheduled triage. Gate other source kinds behind explicit prerequisites and separate acceptance criteria. Define feature-use events and observation windows before promising self-analysis.

9. **[med] Feed, detail, and source management have no resolved spatial hierarchy.**  
   **Reference:** §Screen, lines 24–26: feed, “Detail,” and “Right rail.”  
   **Why it matters:** It is unclear whether detail replaces the feed, opens a drawer, or becomes a third column. Persistent configuration competes with reviewing findings, especially near the 900px breakpoint in `14`. “Matches mockup” provides no specific reference, and `src/App.tsx` has no Scout route to resolve the ambiguity.  
   **Concrete fix:** Define the primary job as reviewing actionable findings. Give the feed the main area, selected detail a specified drawer/pane, and Sources a secondary collapsible destination. Specify widths, scroll ownership, and the layout at 900px and below. Make Make card primary and change it to Open card after creation.

10. **[med] Typography and density are unspecified for variable-length findings.**  
    **Reference:** §Screen, line 25: “source badge, one-line summary, effort chip.”  
    **Why it matters:** Technical release names vary widely. Forced one-line summaries can hide the actual change while badges and chips consume the available width. There is no hierarchy, spacing rhythm, or readable detail measure.  
    **Concrete fix:** Specify, for example, 16px semibold titles, 14px summaries with 20px leading, 12px metadata, 16px row padding, and an 8px internal spacing rhythm. Allow two summary lines at narrow widths and full text in detail. Keep source/effort visually subordinate; constrain detail prose to roughly 60–75 characters per line.

11. **[med] Glass execution has no Scout-specific verification criteria.**  
    **Reference:** §Screen; inherited glass rules in `14`, lines 22–34.  
    **Why it matters:** `14` already requires text contrast and fallbacks, but this spec never applies them to small badges, selected rows, focus rings, or drawers overlapping the feed. Atmospheric glow and overlapping translucent surfaces change the composited background; base token values alone cannot prove legibility.  
    **Concrete fix:** Explicitly inherit `14` and require checks over the brightest glow and overlapping-panel states: text ≥4.5:1 and essential control/focus boundaries ≥3:1 against adjacent colors. Define an opaque high-contrast fallback. Keep glow static, avoid animated blur, and disable nonessential transitions under reduced motion. Selection must remain distinguishable from keyboard focus.

12. **[med] Screen states and acceptance tests cannot distinguish success from silence.**  
    **Reference:** §Screen, line 26; §Acceptance criteria, lines 37–39.  
    **Why it matters:** No findings could mean nothing relevant, failed collection, exhausted budget, disabled sources, or provider disconnection. The shared states in `14` do not define these Scout-specific distinctions. Requiring a live feed to produce a finding is also nondeterministic.  
    **Concrete fix:** Define first-run, successful-zero, collecting, partial-failure, budget-paused, and disconnected states, with last successful check and next action. Add keyboard selection, focus return after drawers/dismissal, and non-disruptive updates that preserve selection. Use fixed feed/provider fixtures to test threshold boundaries, duplicate publication after restart, shared Inbox state, idempotent Make card, and successful runs with zero findings.