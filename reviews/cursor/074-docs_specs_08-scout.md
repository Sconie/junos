**Verdict:** As an Operate/app-screen brief, `08-scout.md` is a thin inbox+settings mashup with a strong read-only intent, but several product contradictions, an unbounded research scope, real prompt/SSRF/privacy exposure, and almost no UI craft (states, hierarchy, density, or triage job).

Mode: **Operate** (impeccable) / **app screen — list+detail inbox** (design-taste). No live UI or mockup in-repo to inspect; critique is of what the doc specifies.

---

### Contradictions

1. **Dismiss `later` vs hard dedupe** — Learning stores `later` as feedback, but acceptance requires “a dismissed item of the same title does not return.” `later` implies resurfacing; title-block forbids it.
2. **What gets stored vs what gets shown** — Publish only creates rows for score ≥ 60, yet “weekly digest summarises the rest” and Dedupe runs “against past findings.” Unclear whether sub-threshold items are persisted, digest-only, or discarded.
3. **Read-only Scout vs acting affordances** — Guardrail: Scout never changes code; acting is a Kanban card / Hermes Ready. Screen also has **Ask Claude** with the finding as context — a second action path that can bypass the card gate unless constrained elsewhere in this doc (it isn’t).
4. **Work surface vs config surface** — Feed/detail is triage; the same screen’s right rail owns sources, cadence, health, run-now. That mixes “process findings” with “operate the watcher,” which fights Operate clarity (one job per surface).
5. **Open question vs stated guardrail** — Draft PR is deferred, which matches read-only — fine — but leaving it on the page without a firm “out of scope for v1” keeps the product story soft.

---

### Gaps (spec is underdetermined)

- **No object model** for `scout_source` / `scout_finding` (fields, statuses, score axes, links, “suggested change” shape, health enum).
- **No UX states**: empty (no sources / no findings), first run, Collect partial failure, Assess timeout, budget exhausted, unhealthy source, loading/skeleton.
- **Triage IA missing**: only “sorted by relevance.” No new vs dismissed vs actioned, no filters, no “already made a card.”
- **Threshold / budget / meters**: defaults named (`60`, “max N”, subscription threshold) but no UI or who edits them.
- **Digest**: channel, UI, and relation to Inbox `finding` items unspecified.
- **Scoring**: relevance / effort / risk rubrics undefined → inconsistent Assess and opaque chips.
- **“Adapter probe”** and **Self** queries: method and what’s safe to send to a model are blank.
- **Responsive / narrow layout**: three regions (feed, detail, rail) with no collapse rules.
- **A11y / motion**: no focus order, live regions for run-now, or reduced-motion note (Operate should prefer state feedback over choreography anyway).
- **“Matches mockup”** with no link or embedded decisions — hierarchy and density are unowned.

---

### Unrealistic scope

Watching Claude Code, Codex, Cursor, Hermes, Vite, React **plus** `npm outdated`/advisories **plus** provider/CLI drift **plus** open-web “ideas” **plus** self telemetry is a full research product, not one scheduled workflow slice.

Especially heavy:

- **Ideas** via “configured query list” + web search → unbounded noise, cost, and quality.
- **Assess** with a stronger model per survivor + daily budget + weekly digest + Inbox fan-out → notification and token load without caps tied to source count.
- **Few-shot learning from dismissals** as the noise strategy — fragile at scale; not a substitute for source allowlists and tighter Collect filters.

Cadence still an open question while the screen already promises cadence controls — ship one default matrix (e.g. releases daily, ideas weekly) or the rail is speculative UI.

---

### Security / privacy risks

| Risk | Why the doc is weak |
|---|---|
| **SSRF / internal fetch** | Editable source URLs; no allowlist, scheme, or egress rules. |
| **Prompt injection** | Untrusted web → Filter/Assess “as data” is good intent, but injection still works in “data”; only Assess disables tools — Filter/Collect unspecified. |
| **Shell in Collect** | `npm outdated` / local commands vs “read-only” — needs a fixed allowlist, not a free agent shell. |
| **Self → model** | `run` / `event` queries can leak prompts, secrets, paths, or PII into Assess context; no redaction policy. |
| **Finding → Ask Claude** | Malicious release/blog text becomes chat context with tools likely enabled. |
| **Poisoned learning** | Dismiss reasons (and finding text in few-shots) can steer Filter; treat as untrusted like web content. |
| **Secrets in fetch** | GitHub API / private feeds: token handling absent. |

Read-only + “no PRs” is the right spine; it does not cover fetch egress, model context hygiene, or the Ask Claude escape hatch.

---

### UI / design quality (skills lens)

Scout is a **work queue**, not a dashboard. App-screen rules: answer one question first, colour on meaning not chrome, flat surfaces, honest empty/zero states, one primary job one click away. The Screen paragraph under-specifies all of that and skews toward template inbox chrome.

**Hierarchy / IA**

- No stated screen question (e.g. “What should Jonas triage this week?”).
- Feed lists badges + one-line summary + effort chip; relevance is the sort key but may not be shown — hierarchy is muddled.
- Detail packs why / links / suggested change / three actions without a primary action order (triage: Keep path vs Dismiss should dominate).
- Right rail competes with the feed for attention (settings chrome vs findings data — taste: colour/attention on data, not chrome).

**Density / spacing / layout**

- Implicit three-pane desktop layout with no density target (row height, summary measure, how many findings above the fold).
- Sources + cadence + health + run-now in one rail is a settings panel glued onto triage — high cognitive load (>4 competing controls beside the list).
- No phone/narrow composition (app-screens expect an explicit phone plan for list→detail).

**Typography / legibility**

- “One-line summary” of changelogs will truncate the only signal; no second line, title+why, or expandable row.
- Effort as S/M/L **chip** without a defined type scale or tabular score — chip/badge clutter is a generated-UI tell; prefer plain type (effort as text, score as tabular figures).
- Source **badge** same issue: prefer a quiet source name/column over pill chrome.

**Contrast / colour**

- “Health” unspecified (colour-only dots are an a11y trap). Need ink + label, colour only for actionable bad state.
- Risk scoring mentioned in Assess but not on the Screen — either show risk where it changes decisions or drop it from the pipeline paragraph.

**Motion**

- Unspecified (good default for Operate: 150–250ms state feedback only). Still need explicit feedback for run-now, Collect in progress, and publish-to-Inbox — without page-load choreography.

**Empty / error / first run**

- No copy in product language (“No sources yet”, “Last run failed”, “Below threshold this week — see digest”). Taste/impeccable both treat empty states as teaching the job; absence here is a craft gap.

**Product face**

- Nothing JunOS-specific in the UI brief (adapter touch-list, “what in JunOS it would touch” from Assess is strong product material but not surfaced as the row’s primary signal). As specified, this could be any “AI suggestions inbox.”

---

### Priority fixes for the doc (not implementing)

1. Resolve **dismiss semantics** (`later` vs never-return) and **persistence** of sub-threshold items vs digest.
2. Split **Triage** vs **Sources/settings** (or demote rail to a single “Run” + link to settings).
3. Bound v1 sources (feeds + deps only); park Ideas/Self/probes behind explicit later milestones.
4. Add **egress allowlist**, **Collect command allowlist**, **context redaction**, and **Ask Claude** rules (strip/ignore instructions; or require Make card first).
5. Specify the screen as an Operate queue: one question, row anatomy (source · summary · JunOS touch · effort/risk as type), primary/secondary actions, empty/loading/error, narrow layout — drop badge/chip-led chrome.

I can go deeper on a rewritten Screen section outline only, or cross-check this against `05`/`03`/`07` if you want that next (still Ask mode).
