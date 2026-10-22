**Verdict:** Spec is a thin Operate brief with a solid read-only intent, but the Screen section under-specifies the working UI, and a few product/security seams (SSRF, finding-as-chat-context, Self telemetry) need locking before build.

Mode: **Operate** / app screen (triage queue + side settings), not a marketing page. Critique is of the doc’s implied UI and product shape only—no rendered mockup in-repo.

---

### Contradictions

1. **Read-only vs open PR question** — Guardrails say Scout never opens PRs; Open questions still ask about draft PRs. That reopens a closed product decision and will confuse implementers.
2. **Dedupe vs acceptance** — Pipeline dedupes “against past findings”; acceptance is “same title does not return.” Title collision ≠ content dedupe (renamed releases, same upgrade under new titles).
3. **Assessed fields vs UI** — Assess scores relevance, effort, **risk**, and “what it would touch.” Screen shows relevance sort, source badge, effort chip only—risk and touch-surface never appear, so Assess work has no UI home.
4. **Dismiss → filter only** — Feedback is few-shot for the **Filter** prompt; Assess still scores survivors. A “too risky” dismiss won’t teach Assess risk unless that’s intentional (unsaid).
5. **“Ask Claude” vs Hermes** — Guardrails say Hermes can act after Kanban Ready; primary CTA names Claude. Agent identity is inconsistent.

---

### Gaps

| Area | Missing |
|---|---|
| Data | Schemas for `scout_source` / `scout_finding` (status, health, scores, links, dismiss metadata, retention) |
| Pipeline | What “Collect since last run” means per kind; Filter/Assess prompts; threshold UI; storage of below-threshold items; digest destination |
| Budget | “Max N” and meter threshold are undefined here (only “see 03”) |
| Adapter probe | How it runs, credentials, failure = unhealthy? |
| Screen states | Empty, loading, run failed, budget blocked, unhealthy source, all-dismissed, first-run |
| Interaction | Undo dismiss; confirm Make card; concurrent Run now vs schedule; sort ties; dismissed items visibility |
| Responsive | No phone/narrow layout (app-screens treat this as its own composition) |
| Mockup | “Matches mockup” with no link, tokens, or density targets |

Cadence is both an open question and a right-rail control—decide daily/weekly defaults in the doc.

---

### Unrealistic scope

One agent spanning release feeds, `npm outdated` + advisories, provider/adapter probes, open-ended web “Ideas,” and Self analytics over `run`/`event` is several products. Highest risk of noise and schedule blow-ups: **Ideas** (web search) and **Self** (product analytics). Ship Collect→Publish for 1–2 release feeds first (matches acceptance); treat Ideas/Self as phase 2.

Learning-from-dismiss as durable few-shot is real ML/product work; specify example cap, freshness, and that reasons stay enum-only.

---

### Security / privacy

**Good:** read-only; web as data not instructions; tools off during Assess; budget/meter gate.

**Risks the doc doesn’t cover:**

1. **SSRF / fetch abuse** — Editable source URLs → Collect must allowlist schemes/hosts, block link-local/metadata, cap size/time.
2. **Secondary injection** — “Ask Claude” with finding as context: finding body is attacker-influenced (RSS, blogs). Same untrusted-data rules as Assess, or sanitize/quarantine.
3. **Self → secrets** — Error text in `run`/`event` can hold tokens/paths; findings must redact before Inbox/model.
4. **Retention** — How long raw fetched content and prompts are stored; who can read them.
5. **Adapter probe** — Can burn quota or leak key material; scope as read-only metadata checks.
6. **Dismiss few-shots** — Stick to fixed reason codes; free-text “reason detail” becomes prompt-injection surface.
7. **Draft PR** — Don’t reopen until trust; it breaks the main safety story.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

The Screen paragraph specifies a **three-job surface** (triage feed, detail actions, source admin) without hierarchy, density, or states. Through the skills:

**Hierarchy / IA**
- No named page question (“What should I review?”) or primary job. App-screens: most frequent job one click from first screen—here that’s unclear vs Run now / source editing.
- Mixing **triage** and **source settings** in one right rail is a classic density failure; settings belong behind a quieter path; rail should be health + Run now at most.
- No product/shell identity, title, or empty-state voice (“Waiting on the first Scout run”)—screen reads as a generic findings kit.

**Density / layout**
- Feed + detail + rail on one desktop canvas needs an explicit grid (list width, detail measure, rail ~280–320px) and what must appear above the fold. Unspecified → either cramped chips or a thin first screen.
- Detail stacks why / links / suggested change / three actions with no progressive disclosure—high cognitive load (Operate heuristic).

**Typography / legibility**
- “One-line summary” vs detail “why it matters” needs two type roles (list ~13–14px full ink; detail body 14–16px, ~45–75ch). Spec is silent → soft-grey summaries are likely.
- Relevance 0–100: show as scannable type/data, not decorative chrome. Risk (decision-critical) should get the hue budget, not source badges.

**Colour / contrast / meaning**
- App-screens: colour on data that needs a decision. Spec colours badges/chips; omits risk. Health in the rail needs semantic states (ok / stale / error), not a green dot kit.
- Avoid Self “KPI tiles + sparklines + tinted icon squares”—banned generated-dashboard tells if Self ever surfaces metrics on this screen.

**Components / tells to forbid in the mockup**
- Effort as a soft pill chip is fine if quiet; don’t stack source badge + effort pill + relevance bar + health dots into ornament.
- No hairline card grids, glass rail, gradient accents, or emoji status.
- Dismiss-with-reason: prefer **inline** reason picker (Operate: modal last), not a dialog for every dismiss.

**Motion**
- Spec silent. Operate: 150–250ms for state only; no entrance choreography on a working queue. Define: subtle insert for new findings, pulse only on Run now progress, full `prefers-reduced-motion` cut of travel—not confetti on Publish.

**Missing states (harden)**
- Empty, zero findings above threshold, source errors, budget/meter blocked, Assess failure mid-run—each needs copy and a single next action. Without them the UI can’t be trusted.

---

### Priority fixes to the doc (not implementing)

1. Close the PR open question; keep read-only absolute.  
2. Align dedupe (stable id / canonical URL / content hash) with acceptance.  
3. Put **risk + touch-surface** in the list/detail hierarchy; demote source settings off the triage rail.  
4. Add fetch allowlist, redaction for Self, and untrusted-context rules for “Ask …”.  
5. Replace “matches mockup” with: one job, layout regions, type roles, semantic colours, and the empty/error/budget states.  
6. Phase scope: feeds first; Ideas/Self later.

---

Questions skipped: Ask-mode doc review (no live UI / detector run); no PRODUCT.md/DESIGN.md in repo.
