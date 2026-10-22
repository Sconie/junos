**Verdict:** `08-scout.md` is a solid product sketch (read-only upgrade scout → reviewable findings) but it is not yet an implementable Operate-surface spec. The pipeline and guardrails are clearer than the Scout screen, which is one paragraph of chrome (“badge”, “chip”, “right rail”) without hierarchy, states, or density—and several product rules conflict with each other.

Mode through the skills: **Operate / app list+detail** (not Persuade). Familiarity and scanability beat expression; colour on data/actions, not chrome.

---

### Contradictions

1. **Two homes for the same finding.** Pipeline publishes `scout_finding` **and** Inbox `finding` items; Screen describes a separate Scout feed with Make card / Ask Claude / Dismiss. Unclear which surface owns triage, whether actions sync, and whether Scout is a viewer or a second inbox.
2. **Sort vs score.** Feed is “sorted by relevance”; Assess also scores effort and risk; Publish gates on relevance ≥ 60 only. Relevance is not listed as a visible row field—effort chip is. The thing that decides publish is not the thing the UI emphasizes.
3. **Dedupe vs dismiss acceptance.** Pipeline: “Dedupe against past findings.” Acceptance: “same **title** does not return.” Feedback learning uses dismiss *reasons*, not titles. Three different identity stories (opaque dedupe key vs title vs few-shot).
4. **Filter vs Assess.** Both judge relevance (cheap drop vs 0–100 score). Boundary of “irrelevant” vs “scored low” is undefined—easy double-work or contradictory outcomes.
5. **Below-threshold fate.** Publish: ≥ threshold → rows + Inbox; “weekly digest summarises **the rest**.” Are the rest persisted, discarded, or only digest text? Digest has no Screen presence.
6. **Read-only vs open question.** Guardrails forbid PRs; Open questions reopen draft PRs. Fine as deferral, but “never” and “should we?” should be one policy (v1 vs later).
7. **Cadence.** Open question asks daily/weekly; Screen already assumes “cadence settings” and sources have cadence. Product decision is half-made.

---

### Gaps

- **No object model.** `scout_source` / `scout_finding` fields are implied (name, kind, URL/query, cadence, enabled, relevance, effort, risk, links, suggested change, dismiss reason)—not specified. No lifecycle (`new` / `dismissed` / `carded` / `expired`).
- **No “one question” for the screen** (app-screens §2.2). Without “What should Jonas act on next?”, layout priority is guesswork.
- **Budgets are placeholders.** “Max N model runs,” meter threshold (points at 03), default 60—none editable/ops-defined here.
- **Adapter probe, Self queries, Ideas queries**—methods named, contracts not (what is probed, which SQL, who edits the query list vs `scout_source`).
- **Source health**—shown in the rail, never defined (HTTP fail? stale? parse error? auth?).
- **Run-now** vs scheduled overlap, partial Collect failures, and “last-checked” semantics missing.
- **Make card / Ask Claude**—link shape, idempotency, which chat/agent, whether finding text is immutable context.
- **No empty / loading / error / first-run** (app-screens §11; Operate components).
- **No keyboard, selection, totals, paging**—Inbox (07) is keyboard-first; Scout is silent. Phone: three panes with no collapse rule.
- **“Matches mockup”** with no linked mockup or measurable layout—untestable acceptance for UI.

---

### Unrealistic scope

Watching Claude Code, Codex, Cursor, Hermes, Vite, React **plus** `npm outdated`/advisories **plus** provider/adapter probes **plus** open-ended web “ideas” **plus** self telemetry is a product, not a thin scheduled agent. Ideas-via-web-search is unbounded noise against a two-stage LLM filter. Few-shot dismiss learning without caps (count, age, token budget, poison review) will bloat or skew the filter. Dual-model Assess on every survivor across many feeds will blow an unspecified daily N unless Collect is aggressively capped. Flooding Inbox with every ≥60 finding fights “triage what needs Jonas.”

---

### Security / privacy

**Good:** read-only acting path; untrusted web as data; tools off during Assess; budget/meter hook.

**Missing / risky:**

| Risk | Why |
|---|---|
| Editable source URLs | SSRF / scanning internal hosts if Collect fetches freely |
| Prompt injection | Framing “as data” helps; Filter stage and Ask Claude (finding as chat context) are still attack surfaces; tools-off only called out for Assess |
| Local “command” sources | `npm outdated` is fine if fixed; generic command-from-config is RCE |
| Raw fetch retention | Release notes / pages may hold credentials or PII; no retention/redaction |
| `run` / `event` Self | Telemetry often contains secrets/paths; no redaction policy |
| Authenticated provider/GitHub checks | Credential scope and storage unstated |
| Digest / Inbox copies | Same untrusted text duplicated into more surfaces |

Open question on draft PRs would undermine the strongest guardrail if answered “yes” too early.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

The Screen section under-specifies an inbox-like **list → detail → settings rail** and already leans on **generated-dashboard tells**: source **badge**, effort **chip**, multi-pane chrome without a title-row status or a single primary action.

| Concern | Problem in the doc |
|---|---|
| **Hierarchy** | No screen title / last-run status in the canvas. Row promotes badge + summary + chip; relevance (the real rank key) may be invisible. Violates “identity + one key figure in ink; one status mark per row.” |
| **Density** | No row pitch, total (“N findings”), cap, or sticky header. Full list screens need range (“1–50 of …”). |
| **Typography** | No type roles (title 14–16, row 13–14, meta 12 grey). “One-line summary” without measure/truncation invites wrap chaos or ellipsis without tooltip. |
| **Spacing / layout** | Three regions undetailed; settings (cadence, sources) mixed into the triage rail—high cognitive load next to the job. Phone: must be one region at a time—unspecified. |
| **Colour / chips** | Effort S/M/L as colourful chips + per-source badges = colour on chrome. Prefer monochrome source label + one pale effort mark, accent only on primary action / selected row. |
| **Contrast / legibility** | Health as colour-only dots fails. Grey meta under 12px / low contrast is likely if implementers invent it. |
| **Motion** | Operate: 150–250ms state only (run progress, row select). Spec says nothing—risk of decorative feed motion or load choreography. |
| **States** | Empty Scout, failed Collect, zero sources, dismiss confirmation, run-in-progress—absent. Empty should keep frame + one sentence + first action (add source / run now). |
| **Actions** | Make card vs Ask Claude vs Dismiss are peers; no primary. Dismiss-with-reason needs an inline pattern, not a default modal. |
| **Specificity** | Could be any “AI suggestions” product. No Scout-specific face (e.g. last run as the status line, source health as the signature strip). |

**Heuristic pressure (spec as UI brief):** Visibility of status weak (no run/health in title); Consistency vs Inbox weak; Error prevention/recovery weak (no failed-source UX); Aesthetic/minimalist at risk from badge+chip chrome; Recognition vs recall weak (learned dismissals invisible/uneditable).

---

### Highest-leverage fixes (still doc-only)

1. Pick **one triage home** (Scout *or* Inbox) and mirror actions; or define Scout as read-only archive and Inbox as the work queue.  
2. Define finding **identity** (source + external id / URL hash), dismiss behavior, and sort key; show that key in the row.  
3. Cut v1 source kinds (e.g. release feeds + `npm outdated` only); defer Ideas/web search and draft PRs.  
4. Replace “badge/chip/rail” with an app-screen brief: one question, title row with last run, list density, selected state, one primary action, empty/error, phone single-pane.  
5. Expand guardrails: fixed allowlisted Collect methods, URL allowlist/block private ranges, redaction for Self events, retention, and tools-off for **Filter + Ask Claude context**.

I’m in Ask mode—happy to turn this into a tightened outline for `08-scout.md` if you switch to Agent mode, or to score a concrete mockup against the same lenses.
