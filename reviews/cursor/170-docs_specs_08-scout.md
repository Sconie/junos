**Verdict:** As a product brief, Scout’s intent is clear (read-only upgrade radar → Inbox). As a buildable Operate-surface spec, it is under-specified where models, web fetch, and a three-pane UI meet—and the Screen section reads like a generic “feed + chips + rail” kit, not a designed work screen.

Mode (impeccable): **Operate** — triage queue, not a marketing surface. Lens: design-taste **app screens** (list/inbox + detail), not landing-page rules.

---

### Contradictions

1. **Publish vs digest.** Findings ≥ 60 become Inbox items; a weekly digest “summarises the rest.” Unclear whether “the rest” is below-threshold only, everything not already Inbox’d, or a re-summary of published findings. Overlap / double-notify risk.

2. **What gating uses.** Assess scores relevance, effort, *and* risk; Publish thresholds only “relevance (default 60).” High-risk / low-effort vs low-risk / high-relevance never resolved.

3. **Dedupe vs dismiss.** Pipeline “Dedupe against past findings”; Learning stores dismiss reasons for few-shot; Acceptance requires “same title does not return.” Title match, content hash, source URL, or dismiss-memory? Those can disagree (retitled release notes, same advisory).

4. **Read-only vs open question.** Guardrails: never opens PRs. Open questions: “propose a draft PR?” Deferral softens the hard rule and invites scope creep on day one.

5. **Tool use only during Assess.** Guardrails disable tools “during Assess.” Collect (fetch/search/probe) and Filter (model on untrusted text) are the higher-risk stages; silence there is the contradiction.

---

### Gaps

| Area | Missing |
|---|---|
| Pipeline | Collect windows, retries, failure → source “health,” Filter prompt contract, Assess schema, dedupe key, digest destination/format |
| Threshold | Who edits it; per-source vs global; interaction with budget / meter gate |
| Data model | `scout_source` / `scout_finding` fields; link to Kanban card / Inbox item / chat |
| Screen | Empty / first-run / loading / error / stale-source; selection model; sort beyond relevance; filter by source/effort; bulk dismiss |
| Feedback | Who sees dismiss few-shots; retention; undo dismiss; “later” vs permanently suppressed |
| “Adapter probe” | What it runs, against what, with what credentials |
| Cross-refs | “see 05”, “meters (03)”, “matches mockup” — no mockup or contracts in-doc |

Acceptance covers only happy-path Collect→Inbox, Make card, title suppress. No tests for budget, injection hardening, digest, learning, or source health.

---

### Unrealistic scope

One agent is asked to cover: major CLI/tooling release feeds, `npm outdated` + advisories, provider/model/flag breakage, unbounded “ideas” web search (OSS, blogs, MCP, patterns), *and* self-telemetry over `run`/`event`. That is several product lines (dependency bot, release watcher, research agent, observability insights) under one cadence UI.

“Ideas” especially has no stop condition: query list + web search will always find *something*; Filter/Assess become the product, and the doc never bounds volume, domains, or “enough for this week.”

---

### Security / privacy

**Strong:** read-only posture; untrusted web as data not instructions; tools off in Assess; acting only via separate card / Hermes Ready.

**Weak or missing:**

- **Prompt injection before Assess.** Filter still feeds model on scraped text; Collect may use search/tools. Injection belongs on every model step that sees page content.
- **SSRF / fetch abuse.** Editable source URLs + server-side Collect → internal hosts, `file:`, cloud metadata unless allowlisted.
- **Self → models.** Error rates, unused features, repeated manual actions from `run`/`event` can include prompts, paths, secrets-adjacent logs. No redaction, field allowlist, or “never leave machine” rule.
- **Durable untrusted content.** Findings, suggested changes, Inbox, “Ask Claude” context, dismiss few-shots persist attacker-controlled text. No sanitization, link allowlist, or “don’t execute suggested shell/npm.”
- **Adapter probe / local commands.** Side effects, token use, or leaking env into probe output — undefined.
- **Budget alone ≠ safety.** Meter thresholds don’t stop exfil via model APIs or malicious “suggested change.”
- **Privacy of learning.** Dismiss examples re-injected into Filter prompts — retention and what leaves the box unspecified.

---

### UI / design quality (Operate + app-screen lens)

Screen copy: *feed + source badge + one-line summary + effort chip; detail with three actions; right rail sources/health/cadence/run-now.* That is a template inbox, not a designed Scout surface.

**One question (app-screens §2.2).** Never named. Likely: “What should I look at before I waste a day?” The feed should answer that first; relevance sort alone doesn’t say *why now* vs *noise*. Risk and “what in JunOS it would touch” are Assess outputs but not first-class in the row—effort chip is chrome; risk is invisible.

**Hierarchy / density.** Three competing primary zones (feed, detail, settings rail) with no stated default focus, width, or what collapses. Rail mixes ops (run-now, health) with config (cadence, sources)—two jobs, one panel. Row pattern (badge + chip + summary) pushes **chrome over content**; ink should sit on identity + the deciding score (relevance *or* risk), grey on source/meta—not equal-weight pills.

**Cognitive load.** Detail: Make card / Ask Claude / Dismiss (+ 4 dismiss reasons) without a stated primary job. Most frequent job (triage: keep vs dismiss) should be one click from the list; “Ask Claude” is secondary. >4 visible options without progressive disclosure fails impeccable cognitive-load guidance.

**Typography / spacing / contrast.** None specified. Operate wants a tight rem scale, one family, restrained accent on action/selection/state—not “effort chip” decoration. Relevance 0–100 as color without a legend or contrast rules risks illegible or rainbow chrome (colour-on-chrome anti-pattern).

**States.** No empty (“Scout hasn’t run”), zero findings after a clean run, loading Collect, Assess in progress, source unhealthy, budget blocked, digests-only week. App-screens require empty/zero/loading/error per block; without them implementers ship “No findings” voids.

**Motion.** Silent. Operate: 150–250 ms state feedback only (row select, dismiss confirm, run-now progress)—no feed choreography. Spec should say that so “delight” doesn’t get bolted on.

**Legibility / list craft.** No row pitch, two-line vs one-line, truncation, how links appear in detail, or whether “suggested change” is a wall of model prose. Without measure/length limits, detail becomes unread essay; feed becomes truncated noise.

**Product face.** “Matches mockup” with no mockup + generic badges/chips = kit, not JunOS. Missing: screen title that states the question, trade words in empty states (“No upgrades worth your time this week”), colour on *data* (e.g. risk or touched surface), not source-type rainbow.

**Phone.** Unmentioned. A three-pane Scout is a desktop composition; without a phone story it will ship as a squeezed rail.

---

### Highest-leverage fixes (spec-only)

1. Split or explicitly phase scope: releases + deps first; Ideas and Self as later sources with separate budgets.  
2. One publish rule that uses risk + relevance; one dedupe/dismiss key; digest = below-threshold only.  
3. Threat model paragraph: fetch allowlist, inject hardening on Filter+Assess, redaction for Self, no tools until Assess is proven, suggested-change never auto-run.  
4. Screen: name the one question; list row = summary + one deciding signal; primary action = dismiss/keep; rail = health + run-now only, settings behind a quieter entry; mandatory empty/loading/error/budget-blocked; no motion beyond state.

I’m in Ask mode, so this is review only—no edits to the doc. If you want these folded into `08-scout.md`, switch to Agent mode.
