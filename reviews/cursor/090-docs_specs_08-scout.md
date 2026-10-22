**Verdict:** Spec `08` is a solid read-only agent brief with one clear job, but the Screen section is under-specified as an Operate surface, and Collect/Assess leave several security and product gaps that the guardrails do not fully close.

Mode: **Operate** / app screen (inbox-like list + secondary rail). No live UI or mockup in-repo to inspect; critique is of the Screen contract as written.

---

### Contradictions

1. **Read-only vs open PR question** — Guardrails forbid installs, edits, and PRs; Open questions still float “propose a draft PR.” That reopens the main safety claim instead of locking it.
2. **Assess outputs vs Screen** — Assess scores relevance, effort, risk, and “what in JunOS it would touch.” The Screen only shows source badge, one-line summary, and effort chip. Risk and touch-surface are produced then dropped from triage UI (while Dismiss still has `too risky`).
3. **Dedupe vs acceptance** — Pipeline says “dedupe against past findings”; acceptance only requires “same title does not return.” Title-only dedupe fights the richer intent and will re-surface reworded releases.
4. **Cadence twice** — Sources are “editable… cadence” on Screen, and cadence is also an Open question. Either decide defaults or mark Screen as “placeholder until open questions close.”
5. **“Ask Claude”** — Product language elsewhere is Hermes / providers; this action hard-codes a vendor. Either mean “open agent chat” or name the bound agent.

---

### Gaps (spec completeness)

| Gap | Why it matters |
|---|---|
| No layout contract | “Feed… Detail… Right rail” never says master–detail, split panes, or navigation. Density and selection state are undefined. |
| No empty / loading / error / unhealthy-source states | First run, all sources failing, and zero-above-threshold are the real Scout moments; app-screen rules require them. |
| No volume / freshness | No “N findings,” “last run,” or “Updated …” next to the title — Operate screens need a freshness stamp when the job is “what’s new.” |
| Threshold & budget are placeholders | “default 60,” “max N,” “meters below threshold” — not implementable or testable as written. |
| Digest destination missing | Weekly digest is published but never placed (Inbox `digest`? Scout tab? email?). |
| Filter vs Assess trust boundary | Untrusted web is hardened for Assess only; Filter (cheap model) also sees that content. |
| Learning loop schema | Dismiss reasons → few-shot is named; no cap, decay, or “don’t train on poisoned titles.” |
| “matches mockup” | No path or link — Screen cannot be validated. |
| Responsive / phone | Silent. Slim shell (14) implies Scout must collapse the right rail somehow. |

---

### Unrealistic scope

For one scheduled agent, the watch table alone is a product: five source kinds (releases, deps, providers, open-web ideas, self-telemetry), two-model pipeline, Inbox + Kanban + chat hooks, editable sources UI, feedback learning, and a digest.

Acceptance (“two feeds → ≥1 scored finding”) is far weaker than a useful Scout. Ideas via “configured query list + web search” is unbounded noise relative to release feeds. Self-analytics over `run` / `event` is a second product (observability) smuggled into upgrade-watching.

**Cut for v1 (spec-level):** release feeds + deps only; defer Ideas and Self; ship learning after noise is measured.

---

### Security / privacy

**Good:** read-only acting path; web as data not instructions; tools off in Assess; acting only via card / Hermes Ready.

**Under-specified risks in this doc:**

1. **User-editable `URL/query` on sources** — Server-side fetch of arbitrary URLs is classic SSRF unless scoped (allowlist schemes/hosts, block link-local/metadata).
2. **Filter also consumes untrusted HTML/RSS** — Prompt-injection surface is not limited to Assess.
3. **“Ask Claude” with finding as context** — Untrusted titles/summaries/links enter a chat that *does* have tools. That bypasses “tools disabled during Assess.”
4. **Rendered finding body** — “why it matters,” links, suggested change: if markdown/HTML, need sanitization (not mentioned).
5. **Adapter probe** — “CLI flag changes… adapter probe” can be live side effects; conflicts with read-only unless probes are documented as dry/cached.
6. **Self source** — Error rates, unused features, repeated manual actions can leak paths, prompts, or secrets from `event` payloads into model context and Inbox.
7. **Dismiss → few-shot** — Operator feedback is fine; ensure only Jonas’s dismissals train the filter, with a max example count.
8. **`npm outdated` / local command** — Method is “local command”; no sandbox, timeout, or “never execute source-provided shell.”

---

### UI / design quality (Screen as Operate / app-screen)

Through impeccable Operate + design-taste app-screens:

**Hierarchy** — No page `h1`, no one-line scope (“what Scout watches / last run”), no stated primary job above the fold. Relevance drives sort but may be invisible — operators cannot calibrate the 0–100 scale. Risk is assessed then hidden; effort chip without risk inverts triage priority.

**Density / composition** — Feed + detail + right rail (sources, health, cadence, run-now) packs **findings work** and **agent ops/settings** on one canvas. App-screen guidance: right rail = stable secondary stream or selected-object detail — not a settings panel. Source CRUD + cadence belongs in Settings or a Scout config drawer; rail should show selected finding meta or last-run health only.

**Chips / badges** — “source badge” + “effort chip” on every row is the generated-dashboard tell (status chrome on every row). Prefer: source as quiet secondary text; effort only when ≥ M, or one monochrome mark; colour on data that needs a decision (high risk / high relevance), not on every badge.

**Actions** — Three peers: Make card, Ask Claude, Dismiss. Operate wants **one primary**. Make card = primary; Ask / Dismiss = secondary or overflow. Dismiss-with-reason needs an inline pattern (not only a modal), or the learning loop will be skipped.

**Typography / legibility** — “One-line summary” with no measure, truncation, or title vs summary hierarchy. Detail fields (“why it matters,” “suggested change”) need type roles (title / body / meta / link), not a flat dump. Colourful source badges risk contrast failure — unspecified.

**Spacing / rhythm** — No row pitch, rail width, or gap. Implied three-region layout will either starve the feed or crowd the rail without a `1fr ~360–384px` (or similar) contract aligned with the UI system’s drawer widths.

**Motion** — None. For Operate that is mostly right (no page choreography). Still need state motion: run-now progress, source health flip, row dismiss — 150–250ms feedback only; `prefers-reduced-motion` silent.

**States & honesty** — Missing empty (“No findings above threshold — N watched, last run …”), failed source, and partial-run. Without them the screen reads broken on day one.

**Copy / product face** — Generic feed chrome; nothing JunOS-specific (no tie to Hermes Ready, subscription meters, or “touches adapter X”). Trade words beat “finding / chip / badge.”

---

### Priority fixes (spec only)

1. Freeze **read-only** (kill or explicitly park the draft-PR question).
2. Align **Assess → schema → Screen**: show relevance and risk (or stop scoring unused dimensions); show “touches …”.
3. Split **findings UI** from **source/cadence admin**.
4. Harden **Collect + Filter + “open chat with finding”** for untrusted content and SSRF; sanitize render.
5. Narrow v1 sources; define N, threshold, digest home, and real acceptance (noise rate, not “≥1 finding”).
6. Specify master–detail layout, one primary action, empty/error/health, freshness, and rail width — enough that “matches mockup” is unnecessary.

---

Questions skipped: Ask mode / doc-only review; no live UI to score heuristics numerically.
