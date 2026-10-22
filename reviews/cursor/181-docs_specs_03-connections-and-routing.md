**Verdict:** The approach (official CLIs, no token theft) is sound, but the Connections/Routing surface is under-specified as Operate UI, mixes incompatible auth stories, and papers over missing meters with fake-budget UX that will burn shared caps or lie to the user.

Lens: Impeccable **Operate** (task UI, states, restraint) + design-taste **app screens** (colour on data not chrome, one job first, honest empty/usage, settings density). Spec-only review — no rendered UI.

---

### Contradictions

1. **Title vs Nous row.** Goal/title: subscriptions, no API keys / no per-token billing. Nous: “Portal login **or key**.” That reintroduces key storage and possibly metered billing under the same Connections card.

2. **“Never extract tokens” vs Grok “browser-session adapter”.** The opening rejects fragile, ToS-risky auth. A browser-session adapter is the same class of risk (session cookies, automation bans). Low confidence does not resolve the principle conflict.

3. **Weekly meter vs local substitutes.** Connections UI may show “local run counts and last 429” when the provider exposes nothing. Usage budget still gates on “weekly meter … above … 80%.” Local counts are not a weekly meter — scheduler and UI disagree on what “budget” means.

4. **`degraded` is listed, never defined.** Five states in the enum; four get meaning. UI and routing cannot treat `degraded` consistently with `unavailable` / `rate_limited`.

5. **Hardcoded method label vs multiple auth modes.** Screen always says “Signed in via CLI,” but the table allows Agent SDK, Portal key, and browser session. Label and reality diverge.

6. **Fallback copy vs effort “n/a”.** Routing can answer via a fallback model; effort control disables per model. Spec never says whether the user’s chosen effort remaps, drops, or blocks when the fallback model lacks that effort.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No screen job / IA | Connections vs Routing vs Cost guard vs Effort — one screen or many? App-screens: one question first |
| `degraded`, probe failure, mid-run crash, stale CLI version | Operators only get the happy enum |
| Loading / probing state | Capability probe is async; no skeleton or “checking…” |
| Empty / first-run (zero CLIs) | Empty states must teach; not specified |
| Primary action when `needs_login` | Reconnect and Disconnect listed as peers — recovery should win |
| What “plan name” / “models unlocked” are sourced from | Probe? Static map? Stale cache? |
| Concurrency UX | Open Q says 1–2 parallel; no “busy / queued” presentation |
| Logging / retention of CLI streams | stdout may hold prompts, paths, code, secrets |
| Relationship of `maxRunsPerDay` / `preferCheapModel` to the 80% yield | Two budget systems, no precedence |
| Where routing lives relative to chat/workflows | Drag-reorder + per-task overrides with no surface map |
| A11y: focus order, drag alternatives, contrast for states/meter | Operate requires full control states |
| Motion / reduced-motion | None; probe→connected will get invented animation |
| Phone / sparse density | Settings-like list; no layout rule |

---

### Unrealistic scope

One short doc asks Phase 1 to: verify five vendor CLIs, ship a Connections product, effort mapping, fallback routing with honest headers, cost guards, shared-cap budgeting, Inbox notices, **and** either a Grok research spike or a shipped “coming” card.

Especially soft:

- Cursor “medium, verify” and Grok “low” mean the screen ships incomplete by design.
- Dual Claude paths (CLI print mode **and** Agent SDK) without a choose-one rule doubles integration surface.
- Hermes-local tucked into the Nous row is scope bleed from another subsystem.

Shipable v1 is closer to: Claude + Codex only, honest `unavailable` for the rest, routing + budget after meters are real.

---

### Security / privacy

- **Browser-session adapter** conflicts with the doc’s own ban rationale (ToS, ban risk, fragile secrets). Treat as out of scope or rename the principle.
- **Confused deputy:** JunOS runs signed-in CLIs as subprocesses with the user’s FS/env. Who may start runs (only local Jonas? any workflow?) is unspecified — background jobs can spend personal caps and exfiltrate via prompts.
- **Stream capture:** JSON/print mode output is sensitive; no redaction, retention, or “errors only in `connection.error`” rule here.
- **Reconnect shows the exact CLI command** — good transparency; ensure it never embeds tokens/session strings in UI, logs, or Inbox.
- **Disconnect does not revoke CLI login** — correct technically; must be explicit in copy or users will think JunOS “logged out” the provider.
- **Nous key** — storage, encryption, and display (masked vs full) absent; contradicts “no API keys” framing.
- **Shared caps with manual use** — privacy isn’t only data-at-rest; it’s also not silently competing with Jonas’s interactive Claude/Codex sessions (budget section starts this, UI doesn’t finish it).

---

### UI / design-quality

Operate / app-screen lens: colour on data, quiet chrome, one job, honest density, no template tells.

1. **Hierarchy / IA** — One paragraph dumps plan, method, meter, reset, models, Reconnect, Disconnect onto every card. No lead figure, no primary action, no page title/job (“Can I run?” vs “How much quota left?”). Settings rule: usage strip only when usage *is* the question — here every card gets a meter, inviting a row of fake KPI tiles.

2. **Status rainbow** — Five connection states plus rate-limit reset plus “coming” will become coloured pills/badges. App-screens: hue on status that needs a decision (`needs_login`, over budget), plain words otherwise; one status mark per row.

3. **Meter as chrome** — “Usage meter” without “type/data, not gauge/sparkline/tinted tile” will ship the banned KPI pattern. Prefer a plan-style track (spent / committed / cap) or bare numbers + grey dash when unknown — not a decorative ring.

4. **Dishonest empty / substitute data** — Local run counts presented where users expect provider quota is a trust failure (same class as inventing vanity %). Show “Provider doesn’t expose usage” + last 429 time; don’t imply a weekly %.

5. **“Coming” Grok card** — Dead chrome on the first screen. Prefer omit, or one sentence in an empty frame that teaches the spike outcome — not a disabled product card.

6. **Density / cognitive load** — Effort Low→Max always visible (“n/a” disabled), fallback order, cost guard, 80% yield, per-workflow overrides: easily >4 decision points without progressive disclosure. Drag-reorder without keyboard path fails Operate hardening.

7. **Typography / legibility** — Method label and model lists risk tiny tracked uppercase chrome. Reconnect command should be real monospace (allowed for commands), copyable, not toast-sized. Fallback header in chat needs a quiet pattern or it becomes noise on every message.

8. **Contrast / colour** — No semantic tokens for `rate_limited` / budget warn / `needs_login`. Threshold “80%” needs a clear good/bad direction (usage up = bad → negative hue on the figure, not a green “up” delta).

9. **Spacing / composition** — Five equal provider cards read as an icon-card grid (page house-ban; weak on app screens too). Column count should follow live providers; a lone connected provider shouldn’t sit in a sparse 3-column hole.

10. **Motion** — Unspecified. Operate: 150–250ms state feedback only; no connect confetti / orchestrated probe choreography. Respect `prefers-reduced-motion`.

11. **Emotional / recovery** — Cap exhaustion and `needs_login` are high-stakes (work blocked, personal plan burned). Spec has no reassurance copy, no single obvious recovery CTA, no severity for the Inbox notice.

12. **Product face** — Nothing JunOS-specific; interchangeable “AI provider settings” kit. Needs trade words (“Signed in via Claude Code”, “Yielding — shared weekly cap”) and one real element (shared-cap strip that answers the budget question) — not generic status tiles.

---

### Highest-leverage fixes (if you revise the doc)

1. Freeze auth principle: official CLI/SDK only; drop or quarantine browser-session; resolve Nous key vs title.  
2. Define `degraded`, probing, and what the UI shows when **no** provider meter exists — and make the scheduler use the same definition.  
3. Split **Connections** (health + reconnect) from **Routing & budget** (fallback, caps, cost guard); give each one job and one primary action.  
4. Specify status/meter as words + data (plan track or numbers), not pill/KPI chrome; omit “coming” cards.  
5. Add stream-handling / confused-deputy / Disconnect-copy privacy notes so this doc doesn’t fight a later security spec in silence.

I can turn this into a `reviews/cursor/…` note in Agent mode if you want it filed like the data-model review.
