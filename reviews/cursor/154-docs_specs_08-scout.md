**Verdict:** As an Operate-surface brief, Scout’s job is clear (suggestions only, not changes), but the Screen paragraph is too thin to build from without inventing hierarchy, states, and density—and the pipeline/scope stretch far past the acceptance bar while leaving several security edges half-specified.

Mode for the UI: **Operate** / app **list+detail** (inbox-like queue), not Persuade. Design ambition here is precision and scanability, not expression.

---

### Contradictions

1. **Two homes for the same object.** Publish writes `scout_finding` *and* Inbox `finding` items, while Screen is its own “feed of findings.” Unclear whether Scout is the Inbox, a parallel inbox, or a source that also floods Inbox—triplicates selection, dismiss, and “Make card.”
2. **Read-only vs open question.** Guardrails forbid installs/edits/PRs; Open questions ask about draft PRs. Fine as deferral, but Acceptance still only covers suggestion flow—draft-PR should stay out of v1 language entirely or be marked non-goals.
3. **Dedupe identity.** Pipeline “dedupe against past findings” vs Acceptance “same title does not return.” Title collision ≠ same finding (renamed releases, advisories). Learning is dismiss-reason → filter few-shots; Acceptance only tests title suppress—those are different mechanisms.
4. **Filter vs Assess ownership of feedback.** Dismiss reasons “feed the filter,” but relevance scoring lives in Assess. Unclear whether dismiss reshapes Filter, Assess, threshold, or all three.
5. **“Make card” vs Hermes.** Guardrails say acting is a card Jonas or Hermes moves to Ready; Screen’s primary path is “Make card” + “Ask Claude.” Hermes’ entry point from a finding is undefined.
6. **Adapter probe vs read-only.** Provider “adapter probe” can mean network/config side effects; that sits awkwardly next to “never installs, edits code.”

---

### Gaps (spec can’t be built without inventing)

- No data model for `scout_source` / `scout_finding` (fields, statuses, health codes, link to Inbox/Kanban IDs).
- Threshold default 60: scale semantics, per-source overrides, what happens to 0–59 beyond “weekly digest.”
- Digest: channel, storage, UI, relation to Screen/Inbox—absent from Screen.
- Cadence left open while Screen promises “cadence settings.”
- Collect failure modes: auth, rate limits, partial runs, retries—only “health” in the rail.
- “Suggested change” / “what it would touch”: format, size limits, whether it can include file paths or diffs.
- Magnitudes: typical findings/day, feed length, how many sources—needed for density (app-screens inventory).
- Mobile / narrow layout: omitted.
- Empty, loading, error, zero-run, source-disabled states: omitted (Operate + app-screens require them).
- “Matches mockup”: mockup not in the doc—non-binding.

---

### Unrealistic scope (vs Acceptance)

Acceptance is a thin happy path: two feeds → one scored Inbox item; Make card; title dismiss. The body commits to five source kinds (releases, deps/advisories, provider probes, web “ideas,” self telemetry), dual-model pipeline, editable sources UI, health, run-now, budget/meters, learning from dismiss, weekly digest, and Inbox + Scout + Kanban + chat. That is a product slice larger than the acceptance gate implies; either cut source kinds for v1 or raise acceptance to match.

“Ideas” via open web search is especially open-ended (noise, cost, injection surface) relative to release/outdated feeds.

---

### Security / privacy

**Strong:** read-only posture; web as data not instructions; tools off during Assess; budget caps.

**Risks / underspec:**

| Risk | Why |
|---|---|
| User-editable source URLs | SSRF / internal fetch if Collect hits arbitrary hosts |
| Untrusted HTML/Markdown in findings | Shown in UI; “Ask Claude” re-injects it into a tool-enabled chat—indirect prompt injection after Assess |
| Tools disabled only in Assess | Filter (and Collect post-process) still see hostile content; if those stages can call tools, gap |
| Self source (`run` / `event`) | Errors and payloads may leak secrets/PII into findings, Inbox, digests, chat context |
| Few-shot dismiss reasons | Enum today is safer; free-text later becomes prompt-injection into Filter |
| Security advisories + “suggested change” | Risk of recommending unsafe upgrades without provenance/trust ranking |
| Adapter probe | Credentials, rate limits, accidental writes if probe isn’t strictly read |

Also missing: retention/redaction for fetched bodies, and whether finding detail stores raw remote content or a sanitized summary.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

Screen is one dense sentence: feed (badge + summary + effort chip) → detail (why / links / suggested change / three actions) → right rail (sources, health, cadence, run-now). Against the skills:

**Hierarchy / one question**  
App-screens ask for one first question (“What should I act on next?” / “What’s newly worth reviewing?”). Spec doesn’t name it, so nothing is specified as largest: relevance score, effort, source, or time. Three peer actions (Make card / Ask Claude / Dismiss) fight for primary; Operate/app-screens want **one** primary per screen (often near-black fill, rest quiet).

**Composition**  
Feed + detail + settings rail packs **work queue + admin** into one canvas. App-screens: right rail is for a *stable secondary stream* (selection detail or recent), not cadence/health/run-now. Source admin belongs in settings or a sheet; mixing it raises cognitive load and fights the list’s left edge.

**Density / scanability**  
Sorted only by relevance—no time grouping, source filter, status (new / dismissed / carded), or score display rules. “One-line summary” + chips risks **chip soup** (source badge + effort chip): colour on chrome, not on the decision signal. Prefer score/effort as type or a single quiet status mark; keep source as plain text or one neutral glyph.

**Typography**  
No type scale: title, row primary, meta, detail body, rail labels. Operate wants a tight rem scale (≈1.125–1.2), one family, prose measure for “why it matters,” tabular figures if scores show. Effort as S/M/L chip invites tiny tracked labels—app house style prefers sentence-case readable meta.

**Spacing / layout**  
No gutters, rail width, row height, or selection pattern (master–detail vs stacked). Risk of ragged rows and a stretched empty detail pane on first load.

**Motion**  
None specified. For Operate/app-screens: no entrance choreography; 150–250 ms for run-now progress, health flip, row select, dismiss. `prefers-reduced-motion` unmentioned.

**Legibility / contrast**  
Coloured source badges and effort chips are classic contrast failures (pastel fills, coloured text on tint). Spec should require ink-on-ground for primary text; status colour only on the score/risk that needs a decision (and good/bad, not arbitrary brand hues per source).

**States (biggest craft gap)**  
Missing empty (“No findings above threshold—last run …”), loading/skeleton for Collect, per-source error in the rail, dismiss confirmation/undo, and post–Make-card feedback. Empty states should use trade words (“Nothing above 60 since Tuesday”), not “No items.”

**Product face**  
Nothing JunOS-specific in the UI brief (mark, workspace scope, signature element). As written, the screen is a generic “AI findings inbox.”

---

### Priority fixes for the doc (if you revise it)

1. Pick **one primary surface** (Scout *or* Inbox as home) and one primary action.
2. Split **findings work** from **source/cadence admin**.
3. Define finding identity, dismiss semantics, and what learning actually updates.
4. Lock Collect trust boundaries (URL allowlist, sanitize store, no tools until after sanitize; chat gets summary not raw feed).
5. Specify empty/loading/error, sort/filter, type hierarchy, and strip decorative chips—or the implementer will invent dashboard slop.

I did not run impeccable’s live dual-agent critique (no implemented UI). This is a **spec-only** Operate/app-screen review of `docs/specs/08-scout.md`.
