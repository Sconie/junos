**Verdict:** The core approach (official CLIs as subprocesses, no token theft) is sound and distinctive. The doc then undercuts itself with a browser-session escape hatch, conflates three Operate jobs into one screen dump, and leaves the Connections/routing UI so underspecified that a builder will default to five identical status cards with meters and pills.

*Context loading did not run; no PRODUCT.md/DESIGN.md in the repo. Mode: Operate (settings + connection status). Lens: impeccable Operate + design-taste app-screens.*

---

### Contradictions

1. **Anti-scraping thesis vs Grok path.** Goal/approach forbid copying OAuth tokens and reverse-engineering private endpoints. The Grok row still offers a “browser-session adapter.” That is the forbidden pattern under another name (cookies/session from a browser). Same for any path that is not an official client.

2. **Title vs Nous.** “Subscriptions instead of API keys” vs Nous “Portal login **or key**.” A stored key reintroduces secret handling the rest of the doc is written to avoid.

3. **Budget clocks disagree.** Routing has `maxRunsPerDay`; usage budget yields at a **weekly** meter (default 80%); Connections shows “usage meter and reset time” *or* “local run counts and last 429.” Three different notions of capacity with no mapping. A user can hit the daily guard while the weekly meter looks fine, or the reverse.

4. **Two failure channels for the same problem.** Fallback announces provider switches in the **message header**; budget exhaustion notifies **Inbox**. Same underlying issue (capacity), two surfaces, no rule for when which fires, or whether fallback may burn the next provider after a yield.

5. **Equal product list vs unequal confidence.** Goal lists five providers as the product. Table marks Cursor/Nous “verify” and Grok “research spike.” Shipping UI that treats them as peers (“coming” card for Grok) fights the confidence column.

6. **`degraded` is named, never defined.** States are `connected` · `needs_login` · `rate_limited` · `unavailable` · `degraded`. Four are clear; `degraded` has no trigger, copy, or action.

---

### Gaps

- **No screen job.** Connections, routing (default + fallback drag-reorder + per-task/workflow overrides), effort mapping, and cost guard are one paragraph cluster. App-screens want one question and one primary action on the first screen. This doc never picks that question.
- **No state matrix for UI.** For each connection state: what is visible, what is disabled, what the one action is, what empty/loading/error looks like. Reconnect “shows the exact CLI command” but not copy affordance, success detection, or what happens if the user runs it in another terminal.
- **Probe contract missing.** “`which` + status + version + streaming run” does not specify timeouts, stderr handling, non-zero exit, partial JSON streams, or how a hung CLI is killed—core reliability for a daemon that owns the user’s paid plans.
- **How plan name / usage / “models unlocked” are obtained.** Most subscription CLIs do not expose a clean weekly meter to a subprocess. Without a source of truth, the Connections “usage meter” is speculative UI.
- **Windows (your host OS).** PATH, WSL vs native CLIs, and “show the exact CLI command” are unaddressed; this will dominate real install friction.
- **Effort × cost guard × fallback.** Invalid combos are blocked for effort, but not how Low effort interacts with `preferCheapModel`, or whether fallback preserves the user’s effort choice.
- **Concurrency** left open while fallback and background jobs assume multi-provider behavior.
- **Privacy surface of prompts/transcripts** retained by JunOS when streaming CLI output—not mentioned.
- **A11y for drag-reorder** (keyboard alternative)—not mentioned; Operate surfaces need it.

---

### Unrealistic scope

- Five providers including one with **no confirmed legitimate path**, plus capability probes, streaming runners, effort maps, drag-order fallback, per-task/workflow overrides, daily + weekly budgets, and Inbox notices—before Phase 1 has verified Cursor/Nous flags against current docs.
- **Usage meters “where the provider exposes them”** is likely “almost nowhere.” Local run counts + last 429 are a different product; pretending they are the same meter will mis-train users about shared caps with manual Claude/Codex use.
- **“Models unlocked”** as a Connections field assumes plan introspection the CLIs may never give; that alone can stall the screen.
- Grok “keep the card as coming” is product debt on day one (dead panel in the primary list).

Ship shape that matches the confidence column: Claude + Codex first (high), Cursor/Nous behind a verified spike, Grok omitted until a legitimate path exists—not a grey card.

---

### Security / privacy risks

| Risk | Why it matters |
|---|---|
| **Browser-session adapter** | Session/cookie capture, ToS/ban risk, MFA/session fixation; contradicts the doc’s own safety argument. |
| **Nous API key** | Reintroduces secret storage, rotation, leak surface the architecture was meant to dodge. |
| **Subprocess = full CLI powers** | Official agents often have filesystem/network tools. JunOS routing “chat” through them expands blast radius beyond “send a prompt.” Needs explicit capability bounding or user-visible warning. |
| **Shared subscription DoS** | Background jobs can exhaust the same cap Jonas uses manually. 80% yield helps, but silent fallback to the next provider can still burn *another* plan. |
| **Disconnect semantics** | Removes JunOS’s reference only—correct, but easy to misread as “logged out.” If JunOS is compromised, CLI login still works for a relaunch. Copy must be brutal. |
| **Reconnect command display** | Good (user runs login). Auto-executing login from the daemon would be worse (unexpected browser, phishing-adjacent if UI is spoofed). Spec should forbid auto-login. |
| **Prompt/output retention** | Streaming JSON into the daemon without retention/redaction rules is a privacy gap for a personal OS. |

The high-confidence path (official CLI, user-owned login, Disconnect ≠ revoke CLI) is the right story. Keep every low-confidence escape hatch out of the normative text.

---

### UI / design quality (hierarchy, spacing, type, density, motion, legibility, contrast)

What the doc *implies* builders will ship, scored against Operate + app-screens:

1. **Five equal provider cards** (plan, method label, meter, reset, models, two actions) is the generated-settings default: repeated panels, tiny method eyebrow (“Signed in via CLI”), status pills, gauge meters. App-screens: colour on data not chrome; KPIs as type not tiles; no icon-in-tinted-square; one primary action per screen. Spec should say: one list of providers as **rows** (name + state + one action), usage as **type** (“62% of weekly Claude”), not a progress chrome per card; method as secondary sentence, not a badge.

2. **No hierarchy between Connect and Route.** Dumping fallback drag-reorder, default model, cost guard, and per-workflow overrides onto “the Connections screen” guarantees a dense settings wall. Split: **Connections** = can I run? **Routing** = what runs when? **Budget** = when do we stop? Or one screen with three clearly titled sections and one left edge—not five metric cards above a drag list.

3. **State colour without a vocabulary.** Five states invite rainbow pills. Operate wants a small semantic set (error / warning / success / muted). Spec needs: `needs_login` and `unavailable` are action-needed (ink + one button); `rate_limited` is warning with reset as the lead figure; `connected` is quiet; `degraded` must earn a definition before it earns a colour.

4. **Effort Low / Medium / High / Max.** Four options plus “n/a for this model” is already at the cognitive-load edge. Disabled Max still consumes a slot and reads as broken. Prefer a control that only renders supported steps (segmented control sized to options, not a permanent four-stop dial).

5. **Fallback header copy** (“answered by Sonnet via Claude, fell back from Codex”) competes with the message for hierarchy. Put it as one muted meta line, not a second headline; don’t animate it in (Operate: 150–250ms state feedback only, no entrance choreography).

6. **“Coming” Grok card** is empty chrome. App-screens empty states should teach; a permanently disabled peer card teaches “this product is unfinished.” Hide until real.

7. **Meters and contrast.** “Usage meter” without specifying track/fill contrast, missing-data display (grey dash, not a fake 0%), or good/bad direction (usage *up* is usually bad → negative semantic, not green “more activity”). Local counts vs provider meters must not share one visual language if the data quality differs—otherwise a decorative bar lies.

8. **Motion.** Unspecified → builders add card hover lifts and meter animations. Spec should ban decorative motion; allow only reconnect success, state change, and drag feedback.

9. **Typography / spacing / density.** Zero tokens, type scale, or row pitch. For a list of five providers, app-screens density (roughly 32–44px row pitch with a subline) beats card grids. One h1 (“Connections”), optional one grey scope line (“Uses CLIs already signed in on this machine”), primary action only if something needs login.

10. **Legibility of the reconnect command.** Monospace for a real command is allowed (code); the surrounding UI must not bury it in a small caption. Full ink, copy button, plain language above (“Run this in a terminal, then return”).

---

### Highest-leverage fixes to the doc (not implementing—guidance only)

1. Delete or quarantine browser-session and “or key” behind “non-goals / rejected.”
2. Define `degraded` or remove it; unify budget time bases (pick daily *or* weekly as the user-facing meter).
3. Split IA: Connections vs Routing vs Budget; write the one question each screen answers.
4. Specify Connections as a **stateful list**, not a KPI dashboard; type-led usage; no “coming” peers.
5. Normative Phase 1 scope = high-confidence rows only; medium/low are spikes with exit criteria, not UI entitlements.

If you want this turned into an edited spec (or a short Connections wireframe brief), switch to Agent mode and say which of those five to apply first.
