**Verdict:** As an Operate / inbox-style screen brief, the product intent is clear (read-only suggestions → Inbox/Kanban), but the Screen section is under-specified for craft, and the pipeline mixes unbounded watch scope with soft security controls and unresolved product contradictions.

Lens: **impeccable Operate** + **design-taste app screens** (queue/inbox + detail + right rail). No rendered UI — critique of the written UI contract only.

---

### Contradictions

1. **Read-only vs draft PR.** Guardrails ban installs, code edits, and PRs; Open questions reopen “propose a draft PR.” That is not deferred scope — it flips the product promise. Either strike the question or redefine Scout as “suggests diffs / branch plans” without opening PRs.

2. **Dedupe vs acceptance.** Pipeline: “Dedupe against past findings.” Acceptance: “same title does not return.” Title-equality ≠ content/fingerprint dedupe (release notes retitle; same CVE many titles). Spec needs one rule: title, URL, content hash, or `(source_id + external_id)`.

3. **Publish vs digest.** Findings ≥60 become `scout_finding` + Inbox; “weekly digest summarises **the rest**.” Unclear whether “the rest” is below-threshold only, or also re-summarises published items. Also: Inbox gets items on publish, but digest destination/format is missing.

4. **Cadence answered twice.** Open question asks daily/weekly; Screen already has editable cadence per source. Open question should be “recommended defaults,” not undecided product.

5. **Filter learning vs Assess.** Dismiss reasons feed the **Filter** prompt; Assess still scores survivors. A dismissed theme can reappear if Assess scores a near-duplicate ≥60. Learning loop is incomplete unless Assess (or publish) also consumes dismissals.

6. **“Suggested change” vs read-only.** Detail includes suggested change while Scout must not edit. Without saying suggestions are prose/diff proposals only (never applied), implementers will treat Scout as a change agent.

---

### Gaps (product / pipeline)

| Gap | Why it matters |
|---|---|
| Screen’s **one question** unnamed | App-screen rule: one question drives hierarchy (“What is worth my time this week?” vs “What will break adapters?”). Spec never picks. |
| Magnitudes | Typical findings/week, source count, feed length, how often Run now is used — missing; density and budget can’t be designed. |
| Score calibration | Relevance 0–100, threshold 60, effort S/M/L — no rubric, examples, or inter-run stability. |
| Budget `N` | “Max N model runs/day” undefined; Collect/Filter/Assess/digest all burn runs. |
| Stage failures | Fetch fail, empty feed, model refuse, timeout, meter above threshold — no UX or status model. |
| Finding lifecycle | new / seen / carded / dismissed / snoozed? Inbox 07 mentions Snooze; Scout screen does not. |
| Positive learning | “Make card” / “Ask Claude” unused as signals; only dismiss trains the filter. |
| Self source | Which `run`/`event` fields enter prompts? Risk of leaking chat/file contents into findings and Inbox. |
| Adapter probe | “Probe” undefined — read-only CLI `--help` vs live API calls that spend quota or mutate. |
| “Matches mockup” | No IA, states, or type/density tokens in-doc; implementers will invent chrome. |

Acceptance is thin: one manual run + Make card + title dismiss. Missing: threshold/budget behavior, source health, digest, learning actually reducing noise, and security non-goals (no tool use on Assess).

---

### Unrealistic scope

Watch list is a **research lab**, not one agent:

- Release feeds across multiple CLIs/IDEs + Vite/React  
- `npm outdated` + advisories  
- Provider/model/flag probing  
- Open-ended web “ideas” search  
- Self-telemetry over runs/events  

Plus Filter + Assess + weekly digest under a shared daily budget.

**Risk:** Either Scout is chronically starved (misses releases) or it burns the meter and becomes noise. Spec should ship a **v1 source set** (e.g. releases + deps only), defer Ideas/Self, and bound Assess (max survivors/run, max tokens/item).

“Ideas” via configured queries is unbounded recall with no quality bar — highest cost/noise surface for least acceptance coverage.

---

### Security / privacy

Strengths worth keeping: read-only intent; web as data not instructions; tool use disabled on Assess; acting only via Kanban/Hermes.

Weak / missing:

1. **Indirect prompt injection** — RSS, blogs, GitHub bodies, advisories can contain instruction-shaped text. “Passed as data” is policy, not a control. Need structural separation (e.g. fenced untrusted blocks, no system-prompt merge, strip tool/HTML, deny links that look like instructions), and the same for **Filter**, not only Assess.

2. **Tool use only called out for Assess** — Collect/Filter unclear. If Filter can call tools, injection gets an escape hatch.

3. **Self telemetry → model → Inbox** — Findings may quote error payloads, paths, prompts. Need redaction policy before Assess/publish.

4. **Outbound privacy** — Fetching release URLs and search queries leaks interest graph / stack. Spec silent on logging, retention, and whether URLs hit third parties vs cached mirrors.

5. **Supply-chain trust** — Findings can urge dependency upgrades; “Make card” → Hermes is the real blast radius. Spec should say Scout never asserts “safe to upgrade” without citing advisory id / breaking-change notes, and suggested change stays non-executable.

6. **Dismiss few-shots** — User reasons become durable prompt material; can themselves be poisoned if a finding’s title/summary is echoed into the example. Sanitize examples (reason enum + short user note, not full finding body).

---

### UI / design quality (Operate + app-screen)

Surface type: **inbox/list + object detail + right rail** — familiar Operate pattern; failure mode is chrome louder than the job.

**Hierarchy / IA**

- Three jobs in one screen (triage findings, configure sources, run now) without stating the primary question or primary action. App screens: one primary per screen; settings often belong elsewhere or behind a quieter control.
- Right rail packs **sources + health + cadence + run-now**. Taste’s right-rail guidance: stable secondary stream (selection detail or recent), not a settings panel. Mixing ops health with cron editors will compete with the feed.
- Feed sorted **only by relevance** — no recency, status, or source filter. High stale scores stick; Operate users need “new since last visit” as a first-class signal.

**Density / spacing**

- Row content implied: badge + summary + effort chip — no row height, selection, or empty/loading states. For a work queue: selected row = active fill (not hover ring); state totals above the list; load-more with range.
- Detail fields (why, links, suggested change) unspecified in length — risk of wall-of-prose vs scannable blocks (claim → evidence links → next action).

**Typography / legibility**

- No type scale or measure. Operate: one family, tight rem scale, prose ~65–75ch in detail. Relevance as a number needs tabular figures and a clear secondary role (don’t let “87” outshout the summary).
- “One-line summary” is good; “why it matters” needs a stated max (e.g. 2–3 short paragraphs) or the detail pane becomes Read-mode essay inside Operate chrome.

**Chips / badges / contrast**

- Spec leads with **source badge + effort chip**. App screens allow status pills carefully: pale tint + dark same-hue text; **one status mark per row**; saturated fills only for rare CTAs. Two chrome marks before the summary is already loud — prefer source as plain text/meta, effort as S/M/L ink or one muted mark, relevance as the sortable figure.
- Soft pastel chips often fail contrast; spec should require WCAG text contrast on every chip, not “subtle” greys for the summary.

**Motion**

- Silent. Operate: 150–250ms, state only (select row, dismiss removal, run-now progress). No page-load choreography, no staggered “AI thinking” theater on the feed.

**Signature / anti-slop**

- Screen as written is a generic “AI suggestions feed + settings rail.” Nothing JunOS-specific (run health, adapter break risk, subscription meter context). Without a signature element (e.g. “will touch: adapter X” as the lead meta, or meter-aware “skipped: over budget”), it will read as kit UI.
- Overview names “Translucent Glass” mockups elsewhere — glass/blur/pill nav are anti-patterns in the taste house style for app chrome. This doc doesn’t fight that; it inherits the risk via “matches mockup.”

**States & control**

- Missing: empty (first run / all quiet), loading (run in progress), error (source unhealthy), partial (some sources failed). Source “health” is named with no vocabulary (ok / stale / error / auth).
- Dismiss-with-reason on every reject is high friction for an Operate queue; need one-click dismiss + optional reason, or reason only when teaching the filter.
- Three equal actions (Make card / Ask Claude / Dismiss) with no primary. For a finding queue, **Make card** or **Dismiss** should lead; “Ask Claude” is secondary. Naming locks the product to Claude if the stack is multi-model.

**Phone**

- No adaptive behavior. Three-pane (feed | detail | rail) will collapse badly; spec needs a single-column triage path.

---

### Highest-leverage fixes (if you revise the doc)

1. Freeze **v1 scope** + explicit non-goals (no Ideas web crawl, no draft PRs).  
2. One **dedupe + dismiss** identity; teach Filter **and** publish from dismissals.  
3. Name the screen’s **one question**, primary action, and finding states; move cadence editing out of the triage rail.  
4. Harden untrusted content for **all** model stages; redact Self; define adapter probe as read-only.  
5. Replace badge/chip-first row copy with **summary-led rows**, one muted meta line, tabular relevance, and full empty/loading/error/health vocabulary.

I can turn this into a tighter patch list against the markdown headings if you want that next (still Ask mode — guidance only).
