**Verdict:** As an Operate-mode inbox/queue spec, the intent is clear (read-only suggestions → Inbox/Kanban), but the Screen section is too thin to ship a trustworthy UI, and several pipeline/guardrail lines conflict or leave high-risk edges open.

Mode used: **Operate** (list + detail + settings rail). Lens: impeccable Operate + design-taste **app screens** (not marketing-page rules).

---

### Contradictions

1. **Read-only vs draft PR** — Guardrails say Scout never installs, edits, or opens PRs. Open questions ask whether it may propose a draft PR. That is an unresolved product fork, not a deferred detail; the Screen already implies “act elsewhere” via Make card / Hermes.

2. **Dedupe vs dismiss acceptance** — Pipeline: “Dedupe against past findings.” Acceptance: “A dismissed item of the **same title** does not return.” Same title ≠ same finding (changelog retitles, forks, advisories). Unclear whether dismiss, score, source URL, or content hash wins.

3. **Publish vs digest** — Findings ≥60 become `scout_finding` + Inbox; “a weekly digest summarises **the rest**.” Unclear whether sub-threshold items ever appear in UI, only in digest, or nowhere until next week — and where the digest lives (this screen? Inbox? email?).

4. **Cadence** — Open question (“daily vs weekly?”) while the Screen already has “cadence settings” and sources have per-source cadence. The open question should die or become defaults only.

5. **“Ask Claude”** — Purpose is JunOS / multi-tool watching; the primary CTA names one vendor. Conflicts with a multi-provider product unless this is intentionally Claude-only.

---

### Gaps (spec can’t be built as written)

| Area | Missing |
|---|---|
| Screen job | One-sentence “this screen answers…” (e.g. triage upgrades vs configure watches) |
| Layout | No IA for empty first-run, zero findings, failed run, partial source failure |
| Selection | Feed ↔ detail selection model; what shows when nothing is selected |
| Sort/filter | Relevance only; no filter by source, effort, risk, dismissed, date |
| Threshold / budget | Default 60 and “max N” with no owner, UI, or override |
| Models | “Cheap” / “stronger” unnamed; which step can fail closed |
| Data model | Fields for `scout_source` / `scout_finding` beyond prose |
| Health | “Health” on sources undefined (HTTP? parse? model? stale?) |
| Mockup | “Matches mockup” with no link, structure, or density target |
| Responsive | Three regions (feed / detail / right rail); no phone rule |
| Feedback loop | Dismiss → filter few-shot: retention, PII scrubbing, max examples |
| Digest | Channel, audience, retention, link-back to findings |

App-screen inventory (objects, magnitudes, frequency of use, empty/loading/error) is almost entirely absent — that is the main design gap.

---

### Unrealistic scope

Five watch kinds in one agent and one screen: release feeds across many tools, local deps/advisories, provider/adapter probes, open-web “ideas,” and product telemetry. That is several products (release watcher, Dependabot-lite, competitive intel, ops health) sharing one feed.

Risks for v1:
- Idea/web-search + Assess will dominate cost and noise before release feeds are trustworthy.
- Adapter probes + dependency commands blur “scheduled research” into live environment touching.
- Acceptance (“two feeds → one Inbox finding”) does not prove Ideas, Self, or Provider paths.

More realistic cut: ship Collect→Filter→Assess→Publish for **release feeds only**, with Sources + Make card / Dismiss; defer Ideas and Self (or keep Self as local metrics, not LLM “suggestions”).

---

### Security / privacy

**Strong:** read-only default; web as data not instructions; tools off during Assess; budget tied to meters.

**Weak / missing:**

1. **Editable source URLs** — SSRF / internal fetch if Collect hits arbitrary URLs from the Scout screen. Needs allowlist, scheme limits, no link-local/metadata hosts.

2. **Untrusted content beyond Assess** — Filter also sees web text; “never as instructions” should cover Filter + digest generation, not only Assess.

3. **Prompt-injection via dismiss few-shots** — User-chosen reasons are structured, but if free text is allowed later (or titles/summaries from the web are echoed into the filter prompt), poisoned examples can train the filter wrong. Cap, sanitize, and isolate examples from tool-capable turns.

4. **Self / `run` + `event`** — Telemetry → model → Inbox can exfiltrate paths, prompts, errors, secrets in logs. Redaction rules before Assess are unspecified.

5. **Adapter probe** — Unspecified auth, rate limits, and whether probes use live API keys.

6. **npm outdated / advisories** — Local command surface; needs cwd, timeout, no network surprise if the tool graph expands.

7. **“Ask Claude” / Make card** — Finding text (from the web) becomes chat/Kanban context; treat as untrusted paste, not system policy.

8. **Draft PR open question** — Reopening write access undoes the main trust story; keep deferred and out of the Screen.

---

### UI / design quality (hierarchy, density, type, motion, legibility)

Operate + app-screens expect a **queue you work**: one primary job one click from the first screen, honest states, quiet chrome, colour on meaning not badges.

**What’s good in the prose**
- Feed sorted by relevance + one-line summary = scannable list.
- Detail carries substance (why, links, suggested change) instead of empty chrome.
- Right rail for sources / cadence / run-now matches a stable secondary stream (app-screens ~384px rail pattern).
- Primary actions are task verbs (Make card, Dismiss), not vanity KPIs.

**Problems the doc invites**

1. **Template row chrome** — Every row: source badge + effort chip (+ implied risk/relevance). App-screens: **one status mark per row**; dual chip/badge stacks read as generated dashboard. Prefer: relevance as sort only (not a pill), effort as quiet text or one mark, source as plain label or monochrome mark.

2. **Three competing jobs on one canvas** — Triage findings, configure sources, run Scout. Without a clear title/subtitle and primary action placement, the rail will fight the feed. Title row should answer freshness (“Last run …”) and put **Run now** once, not bury it only in the rail.

3. **No states** — First-run (no sources), empty (sources healthy, nothing above threshold), loading (run in progress), error (feed failed / budget blocked). App-screens §11 and impeccable Operate treat these as required; the spec omits them → implementers invent “No data” illustrations (banned tell).

4. **Hierarchy / density unspecified** — No row height, type scale, or density band. For a triage inbox, **medium density** (≈44–56px rows) fits; detail needs a clear reading measure for “why it matters,” not a wall of equal-weight chips.

5. **Detail action cluster** — Make card / Ask Claude / Dismiss(+reason) is three strong actions. Without hierarchy (one primary, others secondary) and without Dismiss as a small confirm+reason flow, cognitive load spikes (Operate: >4 visible options is a smell; three peer CTAs is already heavy).

6. **Motion** — Unspecified. Operate: 150–250ms, state only (selection, run progress, dismiss). Do **not** add feed entrance choreography or “delight” on a scheduled agent screen.

7. **Contrast / legibility** — Source badges and effort chips often ship as tinted pills with weak contrast. Spec should require pale tint + dark text of same hue (app-screens status pills), full ink for the one-line summary, grey only for meta (time, source name).

8. **Product face missing** — Screen could be any “AI findings inbox.” No Scout-specific signature (e.g. last-run strip, source health as the meaningful hue, words of the trade: “Watching,” “Stale,” “Below bar”) — the app-screens warning about “well-applied kit, not a product.”

9. **Phone** — List+detail+rail must collapse to **one region at a time**; unspecified → broken mobile.

10. **Impeccable craft-floor tells to forbid in implementation** — Icon-in-tinted-square source kinds, gradient health dots, glass rail, emoji empty states, rainbow risk chips. The doc doesn’t ban them; it should, briefly, or point at shared JunOS UI rules.

---

### Priority fixes (if you tighten only this doc)

1. Resolve read-only vs draft PR; delete or hard-defer the PR question.  
2. Define dedupe key + dismiss semantics (not title-only).  
3. Cut v1 source kinds; match Acceptance to that cut.  
4. Specify Screen: one question, title+freshness, row anatomy (one mark), selection, empty/loading/error, rail width/purpose, phone collapse.  
5. Add security: URL allowlist, redaction before models, Filter under same untrusted-content rules, probe/auth limits.  
6. Rename or generalize “Ask Claude”; define digest destination.

---

Questions skipped: full impeccable dual-agent critique (no rendered Scout UI / mockup in-repo to detect). This is a **spec-only** design/product review under Ask mode.
