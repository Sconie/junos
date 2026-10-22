**Verdict:** The approach (official CLIs, no token theft) is sound and rightly cautious on Grok. As a Connections / routing *product* surface, the spec under-specifies Operate UI and overloads one screen with states, meters, models, reconnect, fallback, effort, and cost guards—while contradicting itself on Grok’s status and leaving security edges (logging, cross-provider send, credential boundary) thin.

*Lens: impeccable Operate + design-taste app-screens. Prose-only review (no rendered UI / detector).*

---

### Contradictions

1. **Grok label:** Table says the card stays **"not available"** until an official route exists; Open questions say v1 ships with a **"coming"** card while the spike continues. Those are different promises (dead vs roadmap).
2. **Goal vs scope:** Goal lists Claude, Codex, Cursor, Grok/X, Nous as peers; later text demotes Cursor/Nous to research and Grok to out-of-scope. The Connections UI will still look like five equal providers unless the doc mandates unequal treatment (verified vs research vs unavailable).
3. **`unavailable` vs “coming” / “not available”:** The shared enum has `unavailable` but not `coming`. Either fold “coming” into copy under `unavailable`, or add a state—don’t invent a sixth visual outside the enum.
4. **`degraded` is named, never defined:** Triggers, copy, meter behavior, and whether routing may still use the provider are missing—so implementers will invent a vague amber state.
5. **“No API keys” vs Nous:** Goal is subscription CLIs; Nous may fall back to local Hermes models. That’s fine product-wise, but it breaks the “plans Jonas already pays for / signed in via CLI” framing unless local runs get a distinct method label and auth story.

---

### Gaps (product + UI)

| Gap | Why it matters |
|---|---|
| No screen job / IA | App-screens: one question first. Is Connections “which providers work?” or also routing, effort, budgets? |
| No layout | List vs identical cards, first-viewport contents, phone—unspecified → default “row of status cards.” |
| `unknown` / first probe | Loading, skeleton, and “not probed yet” copy missing. |
| `degraded` + version skew | Wrong CLI version, partial stream, auth OK but models() fails—undefined. |
| Usage visualization | Meter vs local counters vs last-429; threshold (80%) has no UI (plan-track vs silent yield). |
| Effort control placement | Chat chrome vs Connections; disabled “n/a” vs hidden. |
| Fallback / “(12)” | Allowed-provider list referenced, not defined here; drag-reorder a11y, header affordance unspecified. |
| Cross-send confirmation | Confirm pattern (inline vs modal), what is shown (provider, model, that tools won’t re-run). |
| Dual enums on Home | Connection states vs Hermes agent states—composition/priority unstated. |
| Motion / a11y / contrast | No reduced-motion, focus, or status color rules; status-only-in-color risk. |
| Logging / retention | Streaming JSON may hold chat content; not addressed. |

---

### Unrealistic scope

- Shipping **five provider cards** while only Claude/Codex are “high” confidence invites fake parity (research and dead cards dressed like live ones).
- **Meters “where exposed”** will often be absent; local counters + last 429 become the real feature and are underspecified relative to CLI adapters.
- One surface packing **connect + models + effort + fallback order + cost guard + reconnect CLI commands** is a settings kitchen sink; Operate wants one primary job per screen.
- Concurrency “probably 1–2” left open will fight `rate_limited` and budget yielding in practice.

---

### Security / privacy

**Strong:** No OAuth scraping; official non-interactive clients; Disconnect doesn’t wipe CLI login; no re-run after tool side effects; Grok browser scraping explicitly out.

**Risks / missing fences:**

1. **Daemon = user agent** — Spawning signed-in CLIs inherits full account power. Spec needs a hard rule: never read/copy credential files; only invoke documented CLI entrypoints; pin/allowlist binaries from `which` + version probe.
2. **Cross-provider “Send once”** — Explicit confirm helps accidents; it does not disclose that the same prompt may leave Vendor A for Vendor B. Needs a one-line privacy note in that confirm.
3. **Telemetry of streams** — Print/streaming JSON is conversation content. Say what is logged, where, and retention (especially on `rate_limited` / errors).
4. **Reconnect shows “exact CLI command”** — Useful, but easy to look like a shady paste-this terminal instruction. Prefer deep-link / “Open Claude login” when the CLI supports it; keep the command in a copyable secondary, not the primary CTA chrome.
5. **Cursor “medium, verify”** — Research pressure toward undocumented headless paths; keep the same “no reverse-engineer / no private endpoints” gate as a release blocker, not a soft note.

---

### UI / design quality (hierarchy, density, type, motion, legibility)

Mode: **Operate** (settings / connections). Ambition = precision and restraint, not marketing.

**Hierarchy**  
Status (“usable now?”) should lead; plan name, method, models, and meters are secondary. Dumping all of those as peer fields on every card flattens hierarchy and reads as a dashboard kit.

**Density / composition**  
A grid of identical provider cards + pill statuses + meters + dual actions is the generated Connections pattern (colour on chrome, not data). Prefer a **single-column list/table**: one left edge, status as ink, meter only when data exists, one primary action per row (Reconnect *or* Disconnect by state—not both always). Routing (fallback drag, cost guard) belongs in a **separate section or screen** with its own h1/job.

**Status chrome**  
Six connection states (+ Hermes + “coming”) will become pill clusters / tiny tracked labels. App-screens: colour on meaning, sentence-case readable status, missing meter as grey dash—not a fake full bar. Map good/bad carefully: high usage toward cap is **negative**, not a celebratory fill.

**Typography**  
No type scale. Risk: display-size provider names, monospace everywhere because CLIs, and “Signed in via CLI” as an **eyebrow** above the title. Operate: one UI sans, tight scale; method as a 14px secondary line under the name, not a badge.

**Meters**  
Use a plan-style track (spent / committed / overrun), not KPI tiles, sparklines, or icon-in-tinted-circle usage widgets. Local-only counters should say so in plain trade copy (“JunOS run count — provider exposes no meter”), not mimic a vendor dashboard.

**Unavailable / Grok**  
A glowing “Coming soon” card is Persuade residue on an Operate screen. Honest empty: short reason + no primary CTA (or “Notify” only if real). Don’t compete with Reconnect on live rows.

**Effort Low → Max**  
Segmented control is fine; disabled segments must not look like the whole control is broken. Prefer hiding unsupported efforts when `models()` already knows—not a row of grey “n/a” that scans as error.

**Motion**  
Specify **state-only, 150–250ms**, no connection confetti / orchestrated card entrance. Fallback and rate-limit changes need calm feedback, not attention theater.

**Legibility / contrast**  
`unknown`, `degraded`, and muted meters will land as grey-on-grey unless you define ink vs secondary vs danger/warning and ban status-by-color-alone. Running status text in full ink; grey only for true secondary (method, “no meter”).

**Emotional / high-stakes**  
Rate-limit + budget yield + “Send once to other provider” are trust valleys. Spec copy for Inbox notice and confirm should reassure (what stopped, when it resets, what the one-shot does *not* change)—not only the mechanism.

---

### Priority fixes for this doc

1. Resolve **Grok: `unavailable` copy vs “coming”**; remove roadmap tease from the enum story.  
2. Define **`degraded`** and first-run **`unknown`**.  
3. Split **Connections (auth/health)** from **Routing (fallback/budget/effort)**—or state one primary job and demote the rest.  
4. Prescribe **list layout + status-led hierarchy**; ban equal five-card marketing grid for v1.  
5. Add **privacy/logging/credential** fences and cross-provider confirm disclosure.  
6. Make **local counters + 80% yield** visible UI, not only scheduler behavior.

---

Which should this screen optimize for first: **“which providers can run right now?”** or **“how does this chat route and spend budget?”**—those want different first viewports.
