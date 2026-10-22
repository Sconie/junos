⚠️ Spec-only review (no rendered UI, no PRODUCT.md/DESIGN.md, no detector). Mode: **Operate** — Connections / routing is a settings-and-control surface, not a marketing page. Lens: impeccable Operate + design-taste **app screens**.

---

### Verdict

The approach (official CLIs as subprocesses, no token theft) is sound and the state vocabulary is mostly right. As a UI/product spec it is still a **capability dump on a card grid**: five providers of uneven readiness, many fields per card, routing + budget bolted on, and several states/`meters` named without definition. An implementer will invent the usual settings-slop (identical provider cards, decorative meters, vague “degraded”).

---

### Contradictions (inside this doc)

1. **“Subscriptions / no API keys” vs provider table**  
   Goal: plans Jonas already pays for, no per-token API billing. Table allows Nous “Portal login **or key**” and Grok “official API if bundled” / “browser-session adapter”. That reintroduces keys and session scraping while the opening paragraph bans token extraction.

2. **“Never extract tokens / never reverse-engineer” vs Grok path**  
   A browser-session adapter is exactly the fragile, ToS-risky path the intro rejects. Shipping a “coming” card does not resolve the contradiction; it advertises a path the product philosophy forbids.

3. **Usage budget vs “meter only where exposed”**  
   Scheduler yields at a configurable weekly threshold (default 80%). Connections only shows a real meter “where the provider exposes it,” else local run counts / last 429. The budget rule assumes a weekly meter that the UI section admits may not exist. Undefined: what the 80% is *of* when there is no provider meter.

4. **Fallback triggers incomplete vs state list**  
   States: `connected` · `needs_login` · `rate_limited` · `unavailable` · `degraded`. Fallback only mentions `rate_limited` or `needs_login`. Silent on `unavailable` / `degraded` (and on mid-run failure).

5. **Effort: “nearest equivalent” vs “never offer invalid combo”**  
   Mapping to nearest equivalent, then disabling with “n/a for this model,” and also declaring efforts from `models()` — three policies without precedence.

6. **`degraded` named, never defined**  
   Users and UI cannot distinguish it from `unavailable` or partial capability (e.g. CLI present, streaming broken).

---

### Gaps (what the Connections / routing UI still needs to specify)

| Gap | Why it matters (Operate) |
|---|---|
| **Primary job of the screen** | App-screen rule: one question + one frequent action above the fold. Is it “get connected,” “set fallback,” or “don’t burn my cap”? Spec lists all three without priority. |
| **IA split** | Connections (auth/health) vs Routing (default, fallback, overrides, cost guard) vs Budget (threshold, Inbox notice) — one screen or three? Mixing them produces a dense settings wall. |
| **Probe / loading state** | Capability probe (`which`, status, version) has no UI state; risk of spinner-in-content or empty flicker. |
| **Empty / first-run** | No connections yet: teach Reconnect with the exact CLI command (good instinct) — but no empty-state copy or success path after login. |
| **`degraded` + mid-stream failure** | No copy, severity, or recovery. |
| **Budget UX** | “Inbox gets a notice” — tone, dismiss, deep-link to which connection, resume when? |
| **Concurrency** | Open question (1–2 parallel) but routing/fallback assumes failover; no queue UI if a run is waiting. |
| **Shared capacity with manual CLI use** | Called out for the scheduler; no UI honesty (“JunOS + your terminal share this plan”). |
| **Windows / path reality** | `which <cli>` is Unix-flavored; Jonas is on Windows — probe + Reconnect command strings need a real story. |
| **A11y for “drag to reorder”** | No keyboard/list alternative; Operate must not invent drag-only affordances. |
| **Visual system** | No hierarchy, density, type scale, or state color rules — implementers will default to identical cards + chrome meters (app-screen anti-pattern). |

---

### Unrealistic scope

- Treating **Cursor (medium)** and **Nous (medium)** as first-class alongside Claude/Codex before the Phase 1 spike, plus **Grok (low)** as a card, balloons the grid with unverified rows.
- One slice tries to own: multi-provider adapters, Connections chrome (plan, meter, models, reconnect), effort mapping, default + drag fallback + per-task/workflow overrides, cost guard, and a global budget scheduler with Inbox. That is several Operate surfaces; for a thin spec it reads as roadmap stuffed into one doc.
- **Plan name / usage meter / models unlocked** as always-on card fields assumes CLIs expose that data; the doc already hedges that they often don’t — so the default card layout is likely mostly placeholders.

---

### Security / privacy risks (from this doc alone)

1. **Browser-session adapter (Grok)** — Highest risk; conflicts with the stated “no extraction” policy; session cookies, account ban, malware-adjacent optics.
2. **Subprocess = full user session** — Official CLI is better than stealing tokens, but JunOS inherits whatever that login can do. Spec never bounds: working directory, env, network, tool permissions, or whether background workflows can invoke CLIs without a fresh user confirmation.
3. **Shared subscription burn** — Silent or poorly signaled automation can exhaust Jonas’s personal Claude/Codex caps; cost guard + 80% help only if meters/thresholds are real and visible.
4. **Streaming stdout as product data** — Not specified: retention of prompts/completions, logs, “answered by…” headers, or whether Reconnect commands / plan names are stored or synced.
5. **“Show the exact CLI command”** — Good for trust; risk if commands get copied into chat logs or remote telemetry without a privacy note.
6. **Disconnect semantics** — Correct that JunOS only drops its reference; users may think Disconnect signs them out of Claude/Codex. Needs explicit copy to avoid false sense of revocation.

---

### UI / design quality (hierarchy, density, type, motion, legibility, contrast)

**Hierarchy**  
No primary action hierarchy. App screens that work put the frequent job one click away and keep chrome quiet. Here every provider card is implied equal, with plan / method / meter / models / reconnect competing. Route **health** (connect/reconnect) above **policy** (fallback, effort, budget), or split surfaces.

**Density / composition**  
Five near-identical provider cards + meters + model lists = generated-dashboard tell (repeated panels, KPI-like meters without a stated question). Prefer a **list/table of connections** (status, method, last error, one action) and push plan/models/effort into a detail or Routing pane — colour on **data** (remaining budget, rate-limit reset), not on card chrome.

**Typography / labels**  
“Signed in via CLI” is fine as secondary app UI copy; avoid eyebrow chips / tracked uppercase status pills. Effort scale Low→Max needs one short legend of what changes (latency, depth, cap risk) — Operate users need meaning, not four unlabeled ticks. CLI install/reconnect strings: monospace **only** for the command; sentence-case labels around it.

**Spacing / structure**  
Spec implies one overloaded Connections screen. Taste/impeccable Operate: one job per section, larger gap between Connections vs Routing vs Budget than within a section. Drag-reorder fallback belongs with Routing, not on each provider card.

**States / contrast / legibility**  
Five connection states need **non-colour** cues (label + icon/pattern), especially `rate_limited` (reset time in full ink) vs `degraded` (undefined → will become grey mush). Missing values: grey dash / “—” for unknown plan/meter (app-screen honesty), not fake 0% bars. Disabled effort “n/a for this model” must stay readable (contrast), not ghosted into oblivion.

**Motion**  
None specified. For Operate: 150–250ms state feedback only (probe → connected, reconnect success, budget notice appearance). No card entrance choreography; no meter animation that implies precision the provider does not give.

**Copy / emotional journey**  
Fallback header (“answered by Sonnet via Claude, fell back from Codex”) is strong transparency — keep it secondary to the answer so it does not look like an error. Budget Inbox notice is a high-stakes valley: say what paused, which provider, when it may resume; avoid silent skip.

**Grok “coming” card**  
Dead chrome. Either omit until the spike or a single muted line in Open questions — not a fifth card that teaches users to ignore the grid.

---

### What already works in the doc

- Clear anti-fragile auth stance (drive official clients).
- Concrete connection states including `needs_login` + exact reconnect command.
- Disconnect scoped to JunOS only.
- Fallback disclosure in the message header.
- Explicit shared-budget concern with Inbox notice instead of silent burn.
- Effort gated by `models()` so the UI should not offer invalid combos (if that rule wins over “nearest equivalent”).

---

### Highest-leverage fixes (spec-level, not implementation)

1. Resolve key/API/browser-session vs “subscriptions via official CLI only”; drop or quarantine Grok until the spike.  
2. Define `degraded`, budget numerator/denominator without a provider meter, and full fallback triggers.  
3. Split **Connections** (probe, status, reconnect) from **Routing & budget** (default, order, overrides, threshold) — one job each.  
4. Specify honest empty/loading/missing-meter UI and keyboard fallback order.  
5. Add privacy/retention and confirmation bounds for unattended CLI runs.

I can go deeper on a wireframe-level Connections vs Routing layout, or a state matrix (`state × user sees × system does`), if you want that next.
