1. **[high] Tool restrictions leave untrusted-content stages exposed.**  
   **Reference:** [Guardrails, line 34](docs/specs/08-scout.md#L34): “tool use is disabled during Assess.”  
   **Why it matters:** Filter also reads fetched content, and the digest processes it again. Findings then enter Chat or Hermes through “Ask Claude” and cards. Restricting Assess alone leaves other stages and downstream handoffs without a defined trust boundary. Prompt wording is not enforcement.  
   **Concrete fix:** Require tool-free model execution for Filter, Assess, and digest generation; validate their structured outputs. Preserve source provenance and untrusted-content markers through Chat/card handoffs, and prohibit findings from granting execution permissions.

2. **[high] Editable source URLs lack outbound-request safeguards.**  
   **Reference:** [Sources, line 15](docs/specs/08-scout.md#L15): editable “URL/query.”  
   **Why it matters:** The daemon fetches these URLs locally. Without restrictions, a mistaken source or redirect could reach localhost services or private-network endpoints. Oversized responses and slow sources can also stall scheduled runs. The inbound daemon protections in spec 12 do not govern outbound fetching.  
   **Concrete fix:** Specify supported schemes, reject credentials in URLs, block loopback/private/link-local destinations, and revalidate redirects and resolved addresses. Set response-size, timeout, and redirect limits; require explicit configuration for any private source.

3. **[high] “Self” analysis has no privacy boundary.**  
   **Reference:** [What it watches, line 13](docs/specs/08-scout.md#L13): “queries over `run` and `event` tables.”  
   **Why it matters:** Spec 02 includes prompts and arbitrary payloads in these tables. Scout could send personal content, project details, or tool output to a provider while ostensibly measuring error rates. Secret-pattern redaction from spec 12 does not remove ordinary private information.  
   **Concrete fix:** Define aggregate-only inputs by default: counts, durations, error categories, and feature identifiers over a stated window. Require separate opt-in for raw-content analysis, with a preview of fields sent and retention rules.

4. **[high] The read-only promise is not translated into execution restrictions.**  
   **Reference:** [Source methods, lines 10–11](docs/specs/08-scout.md#L10) and [Guardrails, line 32](docs/specs/08-scout.md#L32): local commands and “adapter probe,” but Scout “never installs, edits code or opens PRs.”  
   **Why it matters:** Scout uses the general workflow runner, whose available steps include shell and Hermes execution. The spec does not define which probes are permitted or prevent editable source configuration from becoming command input.  
   **Concrete fix:** Enumerate fixed read-only collectors and probe commands, with validated arguments, allowlisted working directories, timeouts, and restricted process permissions. Forbid arbitrary shell/Hermes steps in Scout workflows. Clarify that application records are its only permitted writes.

5. **[high] The budget rule cannot handle unavailable usage meters.**  
   **Reference:** [Guardrails, line 33](docs/specs/08-scout.md#L33): “max N model runs per day” and runs only below subscription thresholds.  
   **Why it matters:** Spec 03 explicitly allows providers without usage meters. Their Scout behavior is undefined. “N” also leaves batching, retries, digest calls, and manual runs unaccounted for; a burst of source items could consume the allowance before useful assessment finishes.  
   **Concrete fix:** Set an initial configurable allowance, define what consumes it, cap items and input size, and reserve capacity before each model call. Define a conservative policy for unknown/stale meters and show “Paused for budget” with the next eligible run time.

6. **[med] Required findings and source state have no persistence contract.**  
   **Reference:** [Pipeline and Screen, lines 18–29](docs/specs/08-scout.md#L18).  
   **Why it matters:** The detail view needs rationale, risk, affected components, and suggested change; feedback needs dismissal reasons; collection needs checkpoints and source health. Spec 02’s Scout tables do not explicitly represent these values, and this document names no alternative storage. Only above-threshold findings are persisted, leaving “the rest” for the weekly digest unexplained.  
   **Concrete fix:** Define the stored assessment, feedback, source-checkpoint, and health records, including links to runs. State where below-threshold candidates live until digest generation and when they expire. Identify the required schema additions rather than relying on transient model output.

7. **[med] Collection and publication lack retry-safe semantics.**  
   **Reference:** [Pipeline, lines 18–22](docs/specs/08-scout.md#L18): “since last run,” then create finding and Inbox rows.  
   **Why it matters:** A crash after advancing a checkpoint can lose items; a retry between the two writes can duplicate or orphan records. Generic scheduling rules in spec 05 do not define Scout’s source checkpoints or publication transaction. Dedupe after assessment also repeats expensive work.  
   **Concrete fix:** Use stable source-item identifiers, dedupe before model calls, and define when checkpoints advance. Publish the finding and Inbox item atomically with an idempotency key. Specify partial-source failures and replay behavior.

8. **[med] “Later” is treated as permanent rejection.**  
   **Reference:** [Feedback, line 29](docs/specs/08-scout.md#L29) and [Acceptance, line 39](docs/specs/08-scout.md#L39): `later` is a dismissal reason, while a dismissed title never returns.  
   **Why it matters:** “Later” expresses timing, not irrelevance. Feeding it back as rejection can suppress useful topics. Title-based suppression also misses renamed duplicates and can hide a genuinely new release with a reused title. Spec 07 already provides Snooze.  
   **Concrete fix:** Make Later a timed Snooze, separate it from filter-training examples, and offer Undo. Define identity using source ID, release/version, canonical URL, or advisory ID; state when materially updated findings may return.

9. **[med] Card creation does not complete the promised Hermes handoff.**  
   **Reference:** [Screen, line 25](docs/specs/08-scout.md#L25) and [Guardrails, line 32](docs/specs/08-scout.md#L32).  
   **Why it matters:** “Make card” adds only the `scout` label, but spec 09 requires a Ready card to have assignee or label `hermes` for pickup. Moving the generated card to Ready alone therefore does not establish the behavior described here. Repeated clicks and creation from both Inbox and Scout are also unspecified.  
   **Concrete fix:** Define creation into Ideas, project/assignee selection, and an explicit “Assign to Hermes” action. Enforce one linked card per finding and replace Make card with Open card after creation.

10. **[med] The screen lacks a concrete hierarchy and typography contract.**  
    **Reference:** [Screen, lines 24–26](docs/specs/08-scout.md#L24): “matches mockup”; feed with source badges and effort chips.  
    **Why it matters:** The supplied Stitch prompts contain no Scout screen, and `src/App.tsx` has no Scout route. Badges and chips alone leave the layout open to a generic stack of decorated cards. The spec does not establish whether the recommendation, score, provenance, or controls should dominate. These are specification gaps, not verified rendering defects.  
    **Concrete fix:** Add a Scout wireframe using spec 14’s chosen visual direction. Make the finding title and JunOS impact primary; keep source, date, effort, and risk secondary. Define a compact row layout, consistent spacing, readable body measure, modest title scale, and one dominant detail action. Keep source settings behind a disclosure rather than giving them equal visual weight.

11. **[med] Relevance-only sorting can bury important or unseen findings.**  
    **Reference:** [Screen, line 25](docs/specs/08-scout.md#L25): “sorted by relevance.”  
    **Why it matters:** Older highly scored items can remain above new findings indefinitely. Security advisories have no urgency treatment, and the 0–100 score has no rubric, evidence requirement, or deterministic tie-break. A model’s score can acquire more authority than the supporting facts.  
    **Concrete fix:** Default to actionable, unseen findings with a documented urgency/recency policy. Add New, Snoozed, Dismissed, and Card created views. Require source date, supporting evidence, and “why this affects JunOS”; label scores as model estimates and distinguish them from verified advisory severity.

12. **[med] Scout-specific interaction and failure states are missing.**  
    **Reference:** [Screen, lines 25–26](docs/specs/08-scout.md#L25): detail pane, right rail, cadence settings, run-now.  
    **Why it matters:** Spec 14 provides global responsive and accessibility rules, but Scout never explains how its panes transform, how keyboard selection works, or how source failure differs from “no findings.” Reordering a live feed could also displace the selected item.  
    **Concrete fix:** Define list-to-detail navigation with restored selection/scroll, keyboard actions, accessible row labels, and focus return. Map side panels to sheets below 900px. Specify first-run setup, no new findings, running/cancelled, partial failure, stale source, unavailable provider, and budget-paused states. Preserve existing findings during refresh.

13. **[med] Acceptance criteria reward output rather than trustworthy behavior.**  
    **Reference:** [Acceptance, lines 37–39](docs/specs/08-scout.md#L37): two feeds must produce “at least one scored finding.”  
    **Why it matters:** Real feeds may legitimately contain nothing relevant. This criterion encourages publishing something to pass and does not establish the noise target in roadmap phase 4. Five collector categories, adaptive feedback, probes, self-analysis, and digests also have no staged delivery boundary.  
    **Concrete fix:** Define a first slice using two fixture-backed release feeds. Test both a relevant finding and an irrelevant-only run that publishes nothing. Add retry/dedupe, suppression/snooze, budget, malicious-content, and linked-card cases. Stage other collectors afterward, and define the sample size and measurement window for the roadmap’s dismissal-rate target.