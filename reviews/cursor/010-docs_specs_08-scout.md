## Findings

1. **[high] Trust boundary stops at Assess; Filter, digest, and handoffs stay open**  
   **Ref:** Guardrails — “tool use is disabled during Assess”; Pipeline Filter/Assess/Publish; Screen — “Ask Claude”.  
   **Why:** Untrusted feed/blog/MCP text is still model input in Filter and the weekly digest. Findings then land in Chat/cards without a stated untrusted marker, so a later tool-enabled turn can treat Scout prose as instruction (threat #1 in `12-security-and-privacy.md`).  
   **Fix:** Require tool-free, schema-validated model steps for Filter, Assess, and digest. Tag finding bodies as untrusted data through Inbox, Chat, and Kanban. Never let a finding unlock tools or approvals by itself.

2. **[high] “Self” queries can ship private run/event payloads to providers**  
   **Ref:** What it watches — “queries over `run` and `event` tables”.  
   **Why:** `02-data-model.md` keeps prompts, tool I/O, and errors in those tables. “Error rates / slow runs” without an aggregation rule easily becomes raw content sent to Claude/Codex. Pattern redaction in 12 does not remove ordinary private project text.  
   **Fix:** Default Self to aggregates only (counts, durations, error classes, feature IDs, window). Opt-in for any raw sample, with a preview of fields leaving the machine and a retention rule.

3. **[high] Editable source URLs have no outbound fetch policy**  
   **Ref:** “Sources live in `scout_source`… URL/query”; Collect — “fetch new items”.  
   **Why:** Daemon-side fetch of user-editable URLs can hit loopback/LAN (SSRF), follow redirects to credentials, or hang on huge payloads. `12` hardens inbound daemon access, not Scout’s outbound collectors.  
   **Fix:** Allowlist schemes; strip URL credentials; block private/link-local after DNS; re-check redirects; cap size/timeouts/redirects; document any private-source exception.

4. **[high] Read-only guardrail conflicts with collectors and the shared workflow runner**  
   **Ref:** Methods — `npm outdated`, “adapter probe”; Guardrails — “never installs, edits… or opens PRs”; `01` — Scout is “a scheduled workflow”; `05` step types include `shell` / `hermes`.  
   **Why:** Without a fixed collector allowlist, “Scout as workflow” can inherit shell/Hermes steps, or treat URL/query as command input. Probe/`npm` also blur “read-only” unless arguments and cwd are locked down. Open question about draft PRs further undermines the promise.  
   **Fix:** Enumerate fixed collectors (RSS, GitHub releases API, `npm outdated --json`, named probe commands) with validated args, timeouts, and no arbitrary shell/Hermes. Writes limited to Scout/Inbox tables. Drop or quarantine the draft-PR question behind a separate phase and capability flag.

5. **[high] Schema cannot hold what the screen and learning loop require**  
   **Ref:** Screen (why / links / suggested change / health / last-checked); Learning (dismiss reasons); Assess (risk, JunOS touchpoints); `02` — `scout_source` / `scout_finding` columns.  
   **Why:** `scout_finding` has title/summary/url/relevance/effort/status/card_id only—no risk, rationale, suggested change, links, dismiss reason, or dedupe key. Sources lack `last_checked_at` / health. Below-threshold items for the weekly digest have no home.  
   **Fix:** Spec the missing columns (or `assessment_json` + `feedback` table), source checkpoint/health fields, and where sub-threshold candidates live until digest then expire. Point to concrete `02` edits.

6. **[med] Dismiss `later` + title dedupe fights Inbox snooze and suppresses useful repeats**  
   **Ref:** Learning — reason `later`; Acceptance — “same title does not return”; `07` — findings get Snooze.  
   **Why:** `later` is timing, not rejection; feeding it as few-shot noise training and forever-banning the title hides renamed/reissued releases and contradicts Inbox snooze.  
   **Fix:** Map `later` to timed snooze (reuse `07`); exclude it from filter examples; dedupe on source+stable id (release tag, advisory id, canonical URL); allow material updates to resurface; add Undo.

7. **[med] Two triage surfaces with no job split (Scout feed vs Inbox)**  
   **Ref:** Screen — full feed + Make card / Dismiss / Ask Claude; `07` — same actions on `finding`; Home — “latest 3 findings”.  
   **Why:** Operate UIs need one primary job. Parallel full triage in Scout and Inbox invites duplicate dismiss/card races and unclear “where do I work this?” Hierarchy is undefined.  
   **Fix:** Make Scout the source ops + browse surface (sources, run health, archive). Make Inbox the decision queue for new findings. Or: Scout list is read-only with “Open in Inbox.” Enforce one linked card and idempotent actions.

8. **[med] Screen spec is generic “badge + chip + right rail” with no real mockup**  
   **Ref:** “Screen (matches mockup)”; “source badge… effort chip”; Right rail equal to feed; `00`/`14` cite Stitch glass mockups; `docs/design/stitch-prompts.md` has no Scout prompt; `/design/stitch-*` missing; `src/App.tsx` has no Scout route.  
   **Why:** design-taste app-screen tells: saturated status chips, chrome-heavy meta, equal-weight side rail, no stated first-screen question. “Matches mockup” is unverifiable, so implementers default to AI-dashboard chrome on top of Translucent Glass (violet/glass is the brief in `14`—keep it; don’t add a chip carnival).  
   **Fix:** Add a Scout wireframe under the chosen glass tokens: noun title (~24px), compact rows (title + one-line impact primary; source/date/effort/risk as quiet meta, pale tint pills not filled white-on-color chips), one primary detail action, sources behind a disclosure/tab. Define spacing rhythm and ~65–75ch body measure for rationale. Ship empty/loading/error per `14`.

9. **[med] “Make card” does not complete the Hermes path the guardrail implies**  
   **Ref:** Guardrails — Hermes acts after card moved to Ready; Screen/Kanban — label `scout` only; `09` pickup needs assignee/label `hermes`.  
   **Why:** A Scout card in Ready without `hermes` never auto-picks up; the promised handoff is incomplete. Double Make card from Scout + Inbox is undefined.  
   **Fix:** Create into Ideas with `source_ref` to the finding; optional “Assign to Hermes”; one card per finding; swap CTA to Open card after create.

10. **[med] Phase-4 Scout scope is a product, not a slice**  
    **Ref:** Five source kinds + Filter/Assess/Dedupe/Publish + feedback learning + weekly digest + budget + Self analytics; `13` Phase 4 also ships indexing, Home, ⌘K, compare; Done-when = week of useful findings &lt;30% noise.  
    **Why:** Acceptance only needs “two feeds → one finding,” which neither stages collectors nor measures the noise goal—encourages shipping everything at once or gaming “at least one finding.”  
    **Fix:** v1 = two fixture-backed release feeds + Filter/Assess/Publish + dismiss/snooze + budget. Stage Ideas/Self/MCP/probes later. Acceptance: relevant fixture publishes; irrelevant-only run publishes nothing; measure dismiss rate over N findings / 7 days.

11. **[med] Budget rule is incomplete for meterless providers and batch cost**  
    **Ref:** “max N model runs per day” + threshold from `03`; `03` — some providers have no usage meter.  
    **Why:** N, what counts (Filter vs Assess vs digest vs Run now), item caps, and behavior when meters are missing/stale are undefined—Scout can burn shared subscription quota.  
    **Fix:** Configurable daily model-call budget with reservation; item and token caps; conservative pause when usage unknown; UI “Paused for budget” + next eligible time; Run now respects the same ceiling or an explicit override.

12. **[med] Operate states, keyboard, and responsive behavior are unspecified**  
    **Ref:** Screen one paragraph; `14` — every screen needs loading/empty/error; &lt;900px rail → bottom tabs (Scout not in primary five → More); app-screens — right rail collapses / list→detail.  
    **Why:** Source failure vs empty feed vs budget pause vs provider disconnected will look identical unless specified. No `j/k`-style contract unlike Inbox. Live resort by relevance can steal selection.  
    **Fix:** Spec first-run (add two sources), empty, running, partial source failure, stale source, budget-paused, provider unavailable. Keyboard select/dismiss/card; preserve selection across refresh; &lt;900px: list→full-screen detail, sources as sheet/tab.

13. **[med] Relevance-only sort + opaque 0–100 score over-trusts the model**  
    **Ref:** Feed “sorted by relevance”; Assess scores 0–100; threshold 60; risk scored but not shown in the list.  
    **Why:** Stale high scores bury new advisories; no rubric/evidence requirement; security risk invisible in the row chrome that *is* specified (effort chip).  
    **Fix:** Default sort: unseen + actionable, then recency/urgency policy; show risk/effort as quiet meta; require evidence links + “touches X in JunOS”; label score as estimate; document threshold tuning.

14. **[low] “Ask Claude” hardcodes a provider against routing**  
    **Ref:** Screen — “Ask Claude”; `03`/`04` — routed models and fallbacks.  
    **Why:** Breaks the subscriptions-not-keys product story and fails when Claude is `needs_login`.  
    **Fix:** “Ask in chat” with current default/fallback model; show which model answered.

15. **[low] Effort vocab fights the UI system**  
    **Ref:** Assess — effort S/M/L “chip”; `03`/`14` — Low/Medium/High/Max and SegmentedControl (effort).  
    **Why:** Two effort languages in one product confuse Operate consistency.  
    **Fix:** Map Scout estimates to the shared scale (or clearly name them “change size: S/M/L” and never call them effort).

16. **[low] Ideas/web-search collector is an unbounded cost and injection surface**  
    **Ref:** Ideas — “web search by a configured query list”.  
    **Why:** Open-ended search multiplies model+network spend and untrusted HTML vs curated release feeds; unrealistic beside v1 release watching.  
    **Fix:** Defer Ideas to a later slice; if kept, cap queries/results/day and reuse the same untrusted-content pipeline as feeds.
