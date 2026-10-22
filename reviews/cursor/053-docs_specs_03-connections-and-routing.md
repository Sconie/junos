**Verdict:** The auth stance (“drive official clients, don’t scrape tokens”) is the strongest part of the doc. As a Connections/Routing **product surface** spec it is thin, internally inconsistent on Grok/Nous, and sketches a settings UI that will default to identical provider cards, under-specified meters, and mixed jobs on one screen.

*Lens note: Operate (impeccable) + app-screen settings (design-taste). No PRODUCT.md/DESIGN.md; no rendered UI — this is a prescription review, not a detector/screenshot pass.*

---

### Contradictions

1. **“Never extract tokens / reverse-engineer” vs Grok “browser-session adapter”**  
   A browser-session adapter is usually cookie/session reuse — the exact class of approach the opening rejects. That is not a small open question; it breaks the product’s stated legitimacy story.

2. **“No per-token API billing” / “subscriptions instead of API keys” vs Nous “Portal login or key”**  
   Shipping a key path under a no-keys goal either reintroduces API billing or quietly becomes “store secrets we said we wouldn’t.”

3. **Fallback order vs connection states**  
   Fallback triggers only on `rate_limited` or `needs_login`. `unavailable` and `degraded` are first-class states but are not in the failover rule — so a missing CLI can hard-fail instead of falling through.

4. **One “usage meter” for two incompatible truths**  
   Provider-exposed quota vs “local run counts and last 429” are different semantics. Showing both as a meter teaches the wrong mental model of shared subscription capacity (especially with the 80% budget rule).

5. **“preferCheapModel” under subscription routing**  
   Subscriptions are usually quota/weight, not $. “Cheap” is undefined and fights the goal framing.

6. **`degraded` is named, never defined**  
   No meaning, no UI treatment, no routing behavior.

---

### Gaps (product + IA)

The doc lists capabilities; it does not shape a screen.

| Missing | Why it matters |
|---|---|
| Screen map | Connections vs default model vs fallback vs cost guard vs Inbox notice — one view or several? App-screens: **one view per area**. |
| Screen’s one question | Is this “Am I signed in?” or “Who answers next?” Those are different jobs. |
| Probe/loading state | Capability probes need in-progress UI; only end states are listed. |
| Empty / first-run | Zero CLIs installed: frame + one sentence + primary action (app-screens §11) — absent. |
| Failure copy | Version mismatch, non-zero exit, mid-stream auth loss, timeout — nothing. |
| Concurrency vs fallback | Open “1–2 parallel” vs automatic failover — queue, skip, or error? |
| Per-task / per-workflow overrides | Named with no placement, precedence, or conflict rules. |
| How plan name / models / reset time are obtained | Without scraping — still unspecified; UI invents fields it may not have. |
| Fallback consent | Header discloses *after* another provider already saw the prompt. |
| Streaming / partial answer on failover | Does the user see a half answer then a second? |
| Keyboard path for “drag to reorder” | Recognition/efficiency + a11y gap. |

---

### Unrealistic scope

- Treating **Grok (low, research spike)** and **Cursor (medium, verify)** as peer rows with Claude/Codex invites a five-card Connections grid before the path is real; “coming” is honest only if it is not built like a live adapter.
- **Real shared-cap budgeting** cannot be done from local run counts alone while Jonas also uses the CLIs by hand — the 80% scheduler rule will be wrong often.
- Effort mapping + drag fallback + workflow overrides + cost guard + Inbox notices + five heterogeneous runners is multiple subsystems compressed into one short spec.
- “Verify each row in Phase 1 before building” is right; the Goal/Connections sections already read ship-shaped.

---

### Security / privacy

| Risk | Severity |
|---|---|
| Browser-session adapter (Grok) | High — contradicts policy; session/cookie territory; ban risk the doc itself warns about. |
| Prompt sent to fallback providers without prior consent | High privacy — multi-vendor leakage on every failover. |
| Daemon inherits full CLI session capabilities | High blast radius — not scoped; PATH/`which` first-hit not hardened. |
| CLI stdout/stream persistence (prompts, paths, emails) | Medium — retention/redaction unspecified. |
| Storing a Nous (or any) API key under a no-keys story | Medium — secret store + billing/terms drift. |
| Disconnect only drops JunOS’s reference | Medium UX/security confusion — user may believe provider session is gone. |
| Reconnect shows “exact CLI command” | Low if copy-only; higher if auto-executed with elevated rights. |
| Status probes as provider-side audit noise | Low — still worth stating. |

The official-client approach is sound; the holes are **Grok’s exception**, **key storage**, **fallback multi-send**, and **no data-handling rules for streams**.

---

### UI / design quality (what this spec will produce)

Mode: **Operate** settings — restraint, scanability, earned familiarity. Risk: a **row of identical provider cards** (plan chip, method eyebrow, meter, model list, Reconnect/Disconnect) — the generated-settings pattern both skills push against.

**Hierarchy / IA**  
Flat dump: states → card contents → effort → routing → budget. No h1 job, no section split. App-screens settings want label column + panel, **one save model**, destructive actions last with confirmation. Here Reconnect/Disconnect sit as peer actions on every card; Disconnect should be quiet/destructive with consequence copy (“JunOS will stop using Claude; your `claude` login stays”).

**Density**  
Five providers × many fields + effort + drag list + cost guard will either overflow one viewport or become nested chrome. Sparse settings density (padding 20–24, clear bands) needs **fewer fields per row** and meters only when usage is the question — not on every identity card.

**Typography / labels**  
“Signed in via CLI”, “n/a for this model”, plan name, method label invite **eyebrow / meta / pill stack**. Prefer one status sentence in body ink (“Needs `claude login`”) over method chips. Effort Low→Max is four visible options at the cognitive-load edge; disable with reason is good — keep the reason at ≥12px and ≥4.5:1 (study flags washed-out disabled controls).

**Usage meter**  
Unspecified → default KPI tile / sparkline / gradient track. App-screens: plan use = **labelled track** (spent / committed / cap), colour on the data, honest zero/missing as grey dash — never a fake weekly curve from local counts. If the provider exposes nothing, don’t draw a meter; show “Last 429 · local runs today: N”.

**Status colour / contrast**  
Five states without a semantic palette. Risk: soft green/amber/red pills under contrast floor. Status = one small mark + words in ink; red only on the failing fact.

**Motion**  
Drag-reorder is the only implied motion. Operate: 150–250ms, state not choreography; no card entrance theater. Spec should require keyboard reorder and `prefers-reduced-motion` (instant reorder, no slide).

**Legibility / empty / coming**  
Grok “coming” needs empty-state discipline (keep frame, one sentence, no decorative dead card). Budget → Inbox notice needs severity, one sentence, link to the control that raised it — not a silent banner farm.

**What’s missing for craft**  
No type scale, spacing, or “show what the setting produces” (e.g. beside fallback order: next provider that would answer *this* chat). Without that, the screen is a control sheet, not a routing instrument.

---

### Priority fixes (if you revise only this doc)

1. **Kill or quarantine Grok browser-session** — research spike only; no adapter language until it fits the official-client rule.  
2. **Split views**: Connections (auth/probe) vs Routing (default, fallback, overrides, budget).  
3. **Define `degraded` / `unavailable` in routing** and forbid dual-meaning “usage meters.”  
4. **Fallback = explicit consent or same-provider-only** until the header warning is not after-the-fact.  
5. **UI contract**: list layout not twin cards; status as sentence; plan-track only with real quota; Disconnect destructive+confirm; disabled effort with readable reason; no drag-only reorder.

---

**Heuristic snapshot (prescribed UI, not pixels):** status visibility starts strong (states + fallback header) but fails on probe/loading and dual meters; user control weak on multi-provider send and Disconnect clarity; error prevention/recovery thin; minimalist design at risk from five-card chrome.

Questions skipped: full impeccable dual-agent critique/detector (target is a markdown spec, not a viewable surface).
