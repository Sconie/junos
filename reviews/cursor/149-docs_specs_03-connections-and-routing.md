Context loading did not run; there is no `PRODUCT.md` / `DESIGN.md` in-repo, so this is a **spec-only** critique (Operate / app-screen lens). No rendered UI to inspect.

---

## Verdict

The architecture pitch (drive official CLIs, don’t steal tokens) is clear and responsible. As a **Connections screen + routing product spec**, the doc is thin: it lists fields and states without hierarchy, jobs, or edge UI, and it quietly reintroduces the auth patterns it forbids (keys, browser sessions). Scope and metering look optimistic for a Phase 1.

---

## Contradictions

1. **Title vs Nous** — Framing is “subscriptions instead of API keys,” but Nous is “Portal login **or key**.” That reopens a secret store the rest of the doc is designed to avoid.

2. **Anti-pattern vs Grok path** — “Never extract tokens / never reverse-engineer” vs “browser-session adapter” for Grok. A session adapter *is* the fragile, terms-risky path the intro rejects. “Coming” card doesn’t resolve that; it still legitimizes the spike.

3. **One effort scale that isn’t one** — “One UI scale: Low / Medium / High / Max” vs disabling the control as “n/a for this model.” That’s two UIs (real scale vs dead control) without saying how the picker looks when half the chain is n/a.

4. **Two budgets, no relationship** — Workflow `maxRunsPerDay` / `preferCheapModel` vs scheduler “weekly meter… default 80%.” Connections also shows “usage meter and reset time” *or* “local run counts and last 429.” Daily vs weekly vs provider reset vs local counters will disagree in the UI with no source-of-truth rule.

5. **`degraded` is named, never defined** — States include `degraded` next to `unavailable` / `rate_limited` with no meaning, triggers, or copy. Implementers will invent three different readings.

6. **Goal lists five providers as peers; confidence table says otherwise** — Grok is a research spike / optional “coming”; Cursor and Nous are “verify.” The Goal reads like a committed multi-provider promise.

---

## Gaps

| Area | Missing |
|---|---|
| **Primary job** | Why open Connections? Fix broken auth, pick default model, or admire five cards? App-screen rule: one question + one frequent action on the first screen. |
| **Layout / IA** | No list vs cards, sort order, grouping, or what collapses on phone. |
| **Probe / loading** | Capability probe (`which`, status, version) has no UI state (probing, stale, last checked). |
| **Failure UI** | Spawn fail, non-zero exit, mid-stream crash, wrong CLI version — not in states. |
| **First-run / empty** | Zero CLIs installed: teach install vs wall of `unavailable`. |
| **Fallback UX** | Header line “answered by X, fell back from Y” — when, how sticky, multi-hop, interaction with per-task overrides. |
| **Precedence** | Default model vs fallback order vs per-task / per-workflow — undefined. |
| **Concurrency** | Left open (1–2) but routing + background yield assume it. |
| **Windows** | Jonas is on win32; `which`, paths, and CLI login UX are unspecified. |
| **A11y** | Drag-reorder fallback with no keyboard path; live regions for rate-limit / budget notices. |
| **Logging / PII** | Whether prompts, stderr, or CLI JSON are retained — silent. |

---

## Unrealistic scope

- **Accurate shared subscription meters** from CLIs are the hard part; the doc treats “where the provider exposes it” as a small branch, then invents local proxies that **won’t match** Claude/Codex/Cursor caps Jonas feels in those apps.
- **Five adapters + streaming + fallback + cost guard + scheduler yield + Inbox notice** in one connections/routing slice is a lot before Grok is even real.
- **Cursor “medium, verify”** and **Grok “low”** are called out correctly, then still pulled into the same shipping narrative as Claude/Codex “high.”
- **Effort mapping** across providers with different semantics (thinking flags vs reasoning effort vs nothing) will thrash the model picker unless Phase 1 ships Claude+Codex only and freezes the scale.

---

## Security / privacy risks

1. **Browser-session adapter** — Highest risk in the doc: session cookie / storage scraping adjacent to “we don’t extract tokens.” If the spike can’t stay inside an official client, drop Grok rather than half-implement.

2. **Nous API key** — Undermines the trust story; needs vaulting, rotation, “never in argv/logs,” and UI that doesn’t look like “paste a secret into JunOS” if the product promise is CLI sign-in.

3. **Subprocess surface** — Prompts on argv (visible in process lists), inherited env leaking other secrets, working directory, and whether stream JSON hits disk. Spec is silent.

4. **Reconnect copy = shell commands** — Good for clarity; risky if commands ever include tokens/flags, or if users paste CLI output containing session material into chat. Spec should forbid secrets in shown commands.

5. **Disconnect semantics** — Only drops JunOS’s reference; CLI login remains. Fine technically; easy to misread as “Claude is logged out of everything.” Trust/privacy copy gap.

6. **Usage / rate data** — Showing plan name and meters aggregates personal account metadata into JunOS; retention and who can see it (local-only?) unstated.

7. **Fallback without consent** — Auto-trying the next provider can send the **same user content** to another vendor. Privacy/terms issue as much as UX; needs explicit policy (always allow / ask once / never for certain workflows).

---

## UI / design-quality (hierarchy, spacing, typography, density, motion, legibility, contrast)

Lens: **Operate** (impeccable) + **app screens** (design-taste): quiet chrome, colour on data, one job, honest states — not marketing cards.

**Hierarchy / density**  
Each provider is asked to show: plan name, method label, usage meter, reset (or local counts + last 429), models unlocked, Reconnect, Disconnect. That’s a **dense status dashboard per row** with no primary/secondary split. Likely failure: five identical cards (generated-settings tell), equal visual weight, scan fails when one is `needs_login`.

**What the first screen should answer (unstated)**  
Something like: “What’s broken, and reconnect it.” Spec instead implies a gallery of five providers including a “coming” Grok card — vanity empty that app-screen rules call out (nothing to do / fake completeness).

**Typography / labels**  
“Signed in via CLI” as a **method label** invites tiny tracked uppercase / eyebrow chrome. Prefer one readable status line in sentence case (“Signed in with Claude Code”) and put plan/effort in the data, not a badge stack.

**Colour / contrast / meters**  
Budget logic cares about **80% weekly** — that’s the one place colour should land (approaching cap / rate limited), not on icons or card chrome. Spec doesn’t say how meters look when the provider exposes nothing (local counts): risk of grey-on-grey “fake KPI” or a decorative sparkline. Missing values should be a dash / “Unknown,” not a pretend full bar.

**Effort control**  
Disabled “n/a” needs a defined disabled style and nearby explanation; otherwise Max looks broken. Four named levels plus disabled is already at the edge of cognitive load next to model + provider.

**Fallback reorder**  
“Drag to reorder” alone is an app-screen a11y miss; also no spacing/rhythm for a short ordered list vs a card grid (two different compositions fighting).

**Chat header fallback message**  
Competes with model/provider chrome already implied elsewhere; long strings (“answered by Sonnet via Claude, fell back from Codex”) hurt hierarchy and mobile measure. Needs a short pattern + detail on expand.

**Motion**  
Probe → connected, reconnect, rate-limit flash, fallback — none specified. Operate guidance: **150–250ms state feedback only**, no load choreography. Spec should say that explicitly or implementers will animate card entrances.

**Empty / error / loading**  
`unavailable` and `needs_login` are named; probing, partial connect (CLI present, login OK, models() fails), and budget-Inbox notice presentation are not. Empty states should use **trade words** (“Claude Code not on PATH”) not “Status: unavailable.”

**Phone**  
No composition: meters + model lists + two actions per provider will crush small widths without a stated collapse (status row → detail).

**Slop risks this spec invites if built literally**

- Row of five provider **feature cards** with icons in tinted squares  
- Pill badges for method / “coming”  
- KPI-tile usage meters with sparklines  
- Monospace everywhere for “tech” feel (commands are the one legitimate mono use)  
- Equal neon attention on Connected vs Needs login  

---

## Highest-leverage fixes (spec-only)

1. **Phase 1 = Claude + Codex only**; Cursor/Nous/Grok as explicit later with confidence gates — rewrite the Goal to match.  
2. **Define `degraded` or delete it**; define meter source priority (provider → local → unknown).  
3. **Kill or isolate** browser-session and API-key paths from the “no token extraction” promise.  
4. **Connections IA**: one job (“repair auth / see budget”), status-first list (not five hero cards), colour only on cap/rate-limit, “coming” not on the main surface.  
5. **Routing privacy**: when fallback may send content to another provider — ask vs auto — and how that appears in the message chrome without a novel.  
6. **Subprocess + logging privacy** paragraph: no secrets on argv, what is retained, Disconnect copy that doesn’t imply global logout.

---

Questions skipped: critique snapshot / detector / browser evidence N/A for a markdown-only target in Ask mode.
