**Verdict:** As an Operate-mode triage screen, the Scout *job* is clear (read-only suggestions → Inbox/Kanban), but the Screen section is a thin generic feed+rail mockup stub, and the pipeline/scope pack more product than the acceptance criteria can prove. Several security notes are good intentions without enforceable UI/data contracts.

Mode lens: **Operate** (impeccable) / **app screen — list to work through** (design-taste). Not a marketing page; familiarity and triage speed beat expression. Ambition here should be precision, not chrome.

---

### Contradictions (inside this doc)

1. **Read-only vs draft PR.** Guardrails say Scout never installs, edits, or opens PRs. Open questions still entertain “propose a draft PR in a branch.” That softens a hard product invariant without saying the guardrail is temporary policy vs architecture.
2. **Publish vs Screen vs Acceptance.** Pipeline auto-creates `scout_finding` **and** Inbox `finding` items at threshold. Screen’s primary act is “Make card” (Kanban). Acceptance only checks Kanban link-back. Unclear whether Inbox items appear automatically, whether “Make card” is the only path to Kanban, or whether Inbox and Kanban are two stages of the same object.
3. **Assess scores risk; Screen ignores it.** Assess scores relevance, effort, risk, and touch-points. The feed shows relevance sort, source badge, one-line summary, effort chip. Risk (and “what it would touch”) never appear in the UI contract—so assessment work isn’t reflected in hierarchy.
4. **Dedupe vs dismiss.** Pipeline “dedupe against past findings”; acceptance is “same title does not return.” Title-equality is weaker than (and possibly inconsistent with) general dedupe; release titles churn.
5. **Cadence.** Open question (“daily vs weekly?”) while the Screen already ships “cadence settings”—product has a control for an undecided policy.

---

### Gaps

| Area | Missing |
|---|---|
| Object model | Fields for `scout_finding` / `scout_source` (status, score breakdown, raw evidence pointer, dismiss reason storage) |
| UI states | Empty (no sources / no findings), loading (Collect/Assess), error (feed fail), stale, partial run |
| Detail chrome | Split pane vs drawer vs modal; how links/suggested change are shown; selected row state |
| Digest | Where the weekly digest lives (Scout, Inbox, mail)—only mentioned in pipeline |
| Threshold | Default 60; not said if editable on Screen or only config |
| Budget | “max N” and meter threshold undefined; no UI for “skipped due to budget” |
| Concurrent runs | Run-now while a scheduled run is in flight |
| Responsive | No phone/narrow layout (app-screens expect a phone composition for list screens) |
| Feedback loop | Dismiss trains the filter; Screen never shows that learning happened or how to undo |
| “matches mockup” | No linked mockup, no density/type/spacing tokens—implementers will invent a dashboard |

Acceptance is thin and flaky: “at least one scored finding” from two feeds depends on the world that day, not on product correctness.

---

### Unrealistic scope

One agent that: polls many vendor release channels, runs `npm outdated` + advisories, probes adapters for breaking flags, does open-web “ideas,” mines local `run`/`event` telemetry, filters with a cheap model, assesses with a strong model, dedupes, publishes to Inbox, digests weekly, and learns from dismissals—while staying budget-capped and read-only.

That’s a monitoring product, not a thin workflow. Highest-risk stretch items: **adapter probe**, **Ideas via web search**, and **Self** (“features never used,” “repeated manual actions”)—those need instrumentation and judgment this doc doesn’t define. Ship order that matches guardrails: Release feeds → Dependencies → Publish/Dismiss learning; defer Ideas/Self/probe until the triage UI and trust model work.

---

### Security / privacy

**Strong already:** read-only acting path; web content treated as data; tools off during Assess; budget/meter gating.

**Under-specified / risky:**

- **SSRF / fetch abuse:** Sources are user-editable URLs fetched by Collect. Spec never constrains schemes, hosts, redirects, or private-network blocking.
- **Prompt injection beyond Assess:** Untrusted RSS/HTML still flows into Filter, Inbox, “Ask Claude” (finding as chat context), and few-shot dismiss examples. Tools-off on Assess alone doesn’t cover chat handoff or Filter.
- **Self over `run` / `event`:** Those tables often hold prompts, paths, secrets, provider payloads. Spec doesn’t say redaction, field allowlists, or retention before models see them.
- **Dismiss → filter prompt:** Fixed reason enum is good; if reasons become free text later, that’s an injection channel into the Filter prompt.
- **Adapter probe:** “Probe” can mean live CLI/network calls; conflicts with read-only spirit and can leak credentials or mutate remote state if badly defined.
- **Draft PR question:** Re-opens write surface after the doc’s main trust claim.
- **Health checks:** Right-rail health that hits external URLs needs the same fetch policy as Collect.

---

### UI / design quality (hierarchy, density, type, motion, legibility)

Through Operate + app-screen rules, the Screen paragraph reads as **generated ops UI**: feed + badges + chips + overloaded right rail. Quiet triage is right; this sketch doesn’t decide hierarchy.

1. **No single first-screen question.** App-screens: every block named by the brief should show header + first rows; the most frequent job is one click away. Here the job is triage (keep / dismiss / escalate), but relevance-sorted cards + “Make card” / “Ask Claude” / Dismiss compete without a primary path.
2. **Colour on chrome, not meaning.** Source badges and effort chips put hue on labels. Risk—the thing that should use semantic colour—is scored and then omitted. App-screens warn: restraint that hides good/bad is a failure.
3. **Chip/badge density.** Effort as S/M/L chip + source badge + (implied) health dots is pill-cluster chrome. Prefer quiet text meta (source name, effort word, score) and reserve colour for risk or “new since last visit.”
4. **Right rail overload.** Sources, last-checked, health, cadence, run-now is settings + status + actions in one column. Cognitive load: too many parallel decisions beside a feed that also needs dismiss reasons. Split **Triage** (feed/detail) from **Sources** (config), or demote cadence/run-now behind one “Sources” entry.
5. **Typography / spacing unspecified.** Operate wants a tight rem scale, one family, scannable list rows. Doc doesn’t set row height, title vs summary measure, or detail prose width—so expect inconsistent density.
6. **Motion.** None specified. Operate: 150–250ms for state only (select row, open detail, run-now progress)—no feed entrance choreography.
7. **Legibility / contrast.** Badges/chips with no contrast contract; health “red/green” without text equivalent fails when colour is the only signal.
8. **Empty / error teaching.** No empty-state copy in the trade’s words (“No findings above 60 since Tuesday” / “Add a release feed”)—app-screens require honest empty frames, not “nothing here.”
9. **Identity.** Nothing JunOS-specific in the composition (no product mark, no signature element like “last Scout run” as the face of the screen). Spec could be any “AI suggestion inbox.”
10. **“Suggested change” on a read-only agent.** Copy invites an action Scout won’t take; clarify as “Suggested next step for you / Hermes” to avoid trust breakage (emotional valley at the high-stakes moment).

---

### Priority fixes (spec-only)

1. Lock the object flow: `scout_finding` → Inbox item (auto?) → optional Kanban via “Make card”; one sentence each.
2. Put **risk** (and “touches”) in the feed hierarchy; demote source/effort to plain meta.
3. Constrain Collect (URL allowlist / SSRF), redaction for Self, and injection boundaries for Filter + “Ask Claude.”
4. Replace “matches mockup” with an Operate layout contract: list+detail, rail contents, empty/loading/error, no badge rainbow.
5. Cut or phase Ideas / Self / adapter probe / draft-PR out of v1 so acceptance can be deterministic.

I’m in Ask mode, so this is review only—no edits to the doc. Switch to Agent mode if you want these folded into `08-scout.md` or a review note under `reviews/`.
