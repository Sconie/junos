**Verdict:** Solid product intent (read-only upgrade radar → Inbox/Kanban), but the Screen section is a thin three-pane sketch, and the pipeline/scope are much larger than the acceptance criteria. Several guardrails conflict with open questions or with “Ask Claude.”

Mode through the skills: **Operate** / app-screen kinds **inbox + list + settings rail** (not a marketing page). Ambition should be precision and task clarity, not expression.

---

### Contradictions

1. **Read-only vs draft PRs** — Guardrails say Scout never opens PRs; Open questions ask whether it may propose a draft PR. That is not a deferral of detail; it reopens the core safety claim. Close it: v1 = never, or rename the guardrail to “v1 read-only.”

2. **Publish threshold vs “the rest”** — Findings ≥60 become rows + Inbox items; a weekly digest “summarises the rest.” Unclear whether below-threshold items are stored, whether digests include dismissed/deduped items, or whether high scorers also appear in the digest (double noise).

3. **Dismiss semantics** — Acceptance: same **title** never returns. Learning: dismiss reasons become few-shot for the **filter**. Title match and semantic learning can disagree (same upgrade, new title → returns; different title, same idea → blocked or not). Pick one primary dedupe key and say how learning relates.

4. **Assess outputs vs Screen** — Assess scores relevance, effort, **risk**, and “what it would touch.” The Screen shows source badge, summary, **effort chip** only. Risk and touch-surface are either first-class or they are pipeline-only — currently half-specified.

5. **Cadence** — Open question (“daily vs weekly?”) while the Screen already has “cadence settings.” Either cadence is productized (drop the open Q) or the rail is premature.

6. **Filter vs Assess and tools** — “Tool use is disabled during Assess.” Filter also sees untrusted web items; Collect may use fetch/search. Untrusted-data rules are uneven across stages.

---

### Gaps (spec completeness)

- **Identity:** “a normal workflow (05)” vs dedicated Scout screen/`scout_source`/`scout_finding` — is Scout a workflow template, a system agent, or both?
- **Dedupe:** title, URL, content hash, embedding? Against which history window?
- **Threshold 60 / budget N:** no defaults UI, no override, no what happens when budget is hit mid-run.
- **Source health:** what “health” means (HTTP fail, parse fail, 0 items, auth, rate limit) and how it surfaces.
- **States:** empty (no sources / no findings), loading (run in progress), error (collect failed), zero (all dismissed) — required for Operate/app-screens §11; absent here.
- **Master–detail:** selection, keyboard, deep-link to a finding, what the detail shows when nothing is selected.
- **Digest destination and shape** — Inbox? Scout-only? Email? One blob vs per-finding.
- **“Matches mockup”** — no mockup id/path/criteria in this doc, so hierarchy/spacing cannot be reviewed against anything concrete.
- **Retention / archive** of findings and dismissals.
- **Self source:** which columns from `run`/`event`, aggregation grain, and whether prompts/payloads are ever sent to models.
- **Adapter probe:** read-only network probe vs executing CLIs; failure mode when the tool isn’t installed.
- **Phone / narrow layout** for feed + detail + rail.

---

### Unrealistic scope

Watching five+ product release streams, deps/advisories, provider/adapter drift, open-ended web “ideas,” **and** self-telemetry (“features never used,” “repeated manual actions”) is a full monitoring product. Acceptance only requires: manual run against **two feeds**, ≥1 scored Inbox item, Make card, dismiss-by-title.

Highest cut candidates for v1: **Ideas (web search)**, **Self**, and **adapter probe**. Keep Release feeds + optional `npm outdated`, one collect→filter→assess path, and the Inbox bridge.

“Features never used / repeated manual actions” assumes analytics maturity that this doc does not define — easy to over-promise and under-deliver.

---

### Security / privacy risks

| Risk | Why it matters |
|---|---|
| **Untrusted web → models** | Policy (“as data, never as instructions”) is not a mechanism. Need: no tools on **Filter and Assess**, strict separation from system prompts, size limits, maybe strip HTML/scripts. |
| **Ask Claude** | Finding context is web-derived; chat may have tools enabled. That is the main bypass of “tool use disabled during Assess.” |
| **Self → `run`/`event`** | Tables often hold prompts, paths, errors, maybe secrets. Findings + weekly digest + Inbox can exfiltrate into more surfaces and model contexts. |
| **Outbound fetch** | RSS, GitHub API, advisories, web search: what leaves the machine, keys, rate limits, logging of raw pages. |
| **Malicious / tracking links** in detail | “Links” with no safety note (warn, open externally, no auto-fetch of linked pages into Assess). |
| **Feedback poisoning** | Low risk for a personal tool; still, dismiss text in prompts should be treated as untrusted data. |
| **Draft PR open Q** | Would break read-only and expand blast radius (repo write, CI, secret-bearing branches). |

Strongest line in the doc: never install/edit/PR. Weakest: **Ask Claude** + **Self** without data-minimization rules.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

Scout’s job on first paint should be one question: **“What is worth reviewing next?”** The current sketch splits attention across a findings feed, a rich detail pane, and a sources/settings rail.

1. **Hierarchy / one job** — Right rail (sources, health, cadence, run-now) is a second product (Scout admin) on the same canvas. App-screens: secondary stream OR settings, not both fighting the inbox job. Prefer: findings-first; sources behind a single “Sources” control or a subview.

2. **Density / chip soup** — Every row: source **badge** + effort **chip**. Assess also has risk/relevance. App-screens: one status mark per row; colour on data that needs a decision, not chrome. Show relevance or risk as the ranked signal; keep source as plain text; map effort to copy (“~afternoon”) or a single muted mark.

3. **Missing title / freshness** — No screen `h1`, no “Last run … / Next …”, no finding count. Data screens in the study use a noun title + freshness; operators need that more than another badge.

4. **Primary action** — Detail offers Make card, Ask Claude, Dismiss; rail offers Run now. Operate: one primary per screen. Make **Make card** (or **Review**) primary; demote Ask Claude; keep Dismiss secondary; Run now as utility, not a filled brand button.

5. **Spacing / layout** — Unspecified three-region layout will crush at ≤1280px (feed + detail + ~384px rail). Need: two-pane default; rail as drawer; breakpoints stated.

6. **Typography** — Only “one-line summary.” Need: row title vs meta size, detail “why / suggested change” measure (prose ~65–75ch), no display face, fixed rem scale (Operate).

7. **Legibility / contrast** — Effort S/M/L and source “health” invite colour-only encoding (red/green dots). Prefer text + optional semantic colour; don’t rely on chip fill for meaning.

8. **Motion** — Unspecified. Operate: 150–250ms state feedback only (run progress, row select, dismiss). No feed entrance choreography; no motion floor (app-screens explicitly).

9. **Empty / error copy** — Absent. Use trade language (“No findings above threshold since Tuesday”, “Two feeds failed checks”) — not “No items.”

10. **Mockup risk** — “Matches mockup” without constraints invites template inbox tells: badge rows, chip clusters, KPI-like health dots, settings stacked on the queue. Spec should name the composition (e.g. list+detail, sources elsewhere) and ban decorative chrome.

---

### Highest-leverage doc fixes (if you edit later)

1. Freeze **v1 scope** to match acceptance (feeds → score → Inbox; no Ideas/Self/PR).  
2. Reconcile **dismiss/dedupe** and **threshold/digest** storage rules.  
3. Treat **Ask Claude** as a trust boundary (or cut from v1).  
4. Rewrite **Screen** as Operate inbox: one question, two panes, states, one primary, one status mark per row, freshness, no settings rail on the findings canvas.  
5. Add **data minimization** for Self and raw web content (what may enter model context).

Questions skipped: Ask-mode doc review only; no live UI/detector run (no rendered Scout surface).
