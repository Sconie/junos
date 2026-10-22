**Verdict:** The strategy (drive official CLIs, don’t scrape tokens) is sound, but the Connections/routing UI is underspecified for an Operate surface, and a few product choices quietly undo the security story.

Mode for this surface: **Operate** (settings / routing control). Lens: impeccable Operate restraint + design-taste app-screen rules (colour on data not chrome, honest states, one primary job, no vanity meters).

---

### Contradictions

1. **“Subscriptions instead of API keys” vs the table** — Goal bans per-token API billing, but Nous allows “Portal login **or key**” and Grok allows “official API if bundled.” Those are different products from “plans Jonas already pays for via signed-in clients.”

2. **“Never extract tokens / official clients only” vs Grok’s browser-session adapter** — A browser-session adapter is the exact class of fragile, ToS-sensitive approach the opening paragraph rejects. Keeping it as a row option contradicts the hard rule.

3. **`degraded` is listed, never defined** — States are `connected · needs_login · rate_limited · unavailable · degraded`, but only some get behavior. Fallback only triggers on `rate_limited` or `needs_login`, so `unavailable` / `degraded` are ambiguous (fail? skip? show error?).

4. **Usage meter vs “providers often don’t expose it”** — UI promises plan name, usage meter, reset time; then says show local run counts / last 429 otherwise. The budget section then schedules on a “weekly meter” at 80%. If the meter is local run counts, it is **not** the same as subscription capacity shared with manual CLI use — the doc treats them as interchangeable.

5. **`preferCheapModel` on subscription routing** — “Cost guard” language assumes token/price tiers. On flat subscription caps, “cheap” is undefined (latency? quality? rate-limit headroom?). Conflicts with the goal framing.

6. **Disconnect semantics vs Reconnect** — Disconnect “removes only JunOS’s reference, never the CLI’s login,” while Reconnect shows the exact CLI command. Users will reasonably think JunOS owns the session; the model is “JunOS is a pointer” but the UI verbs sound like account management.

---

### Gaps

| Area | Missing |
|---|---|
| Screen job | One primary question for Connections (connect health vs routing vs budget). Spec dumps all three onto one screen. |
| Layout / IA | No list vs detail, grouping, empty/first-run, or what “coming” for Grok looks like beyond a card. |
| `degraded` | Criteria, copy, whether routing may use the provider. |
| Auth UX | Where the user runs `claude login` / etc. (external terminal? embedded? deep link?). Success detection after Reconnect. |
| Fallback consent | Whether auto-fallback may send the same prompt to provider B without confirmation (privacy + expectation). |
| Mid-run failure | Stream dies, timeout, partial JSON, CLI crash — retry vs next fallback vs user-visible error. |
| Concurrency | Open question, but UI needs busy / queued / “1 of 2 slots” if cap is 1–2. |
| Budget UX | Threshold UI, override for “run anyway,” how Inbox notice acts (snooze? pause workflows?). |
| Effort control | Where it lives (composer vs settings), disabled/`n/a` treatment, mapping table incompleteness for Cursor/Grok/Nous. |
| Model identity | How `models()` names map across providers when the header says “answered by Sonnet via Claude.” |
| Accessibility | Drag-to-reorder fallback with no keyboard/alternative. |
| Observability / secrets | Whether CLI stdout/JSON (possibly containing paths, snippets, tokens in errors) is logged or shown. |

---

### Unrealistic scope

- Shipping **five** adapters while two are “medium, verify” and one is “low, research spike” plus browser/API forks is a multi-spike program, not one Connections screen.
- Full **routing product** in the same doc: default model, drag-reorder fallback, per-task + per-workflow overrides, cost guard, budget scheduler, Inbox coupling — that’s settings + chat + jobs, not one page.
- **Honest usage meters** for providers that don’t expose them cannot be faked with local 429 counters without mis-teaching the user about remaining subscription headroom.
- “Capability probe + runner” for every provider (which / status / version / stream) as a stable product surface underestimates CLI flag churn (the doc itself says flags change often).

Phase-shaped cut that matches the doc’s own confidence column: Claude + Codex first; Cursor/Nous behind verify; Grok omitted or “coming” with **no** browser adapter in scope.

---

### Security / privacy risks

1. **Subprocess = full session power** — JunOS inherits whatever the CLI can do. Compromise or a malicious workflow prompt is account-level, not “JunOS API key” scoped. Spec never says least-privilege, allowlists, or confirmation for high-impact tools.

2. **Silent fallback** — Header notice after the fact (“fell back from Codex”) is not consent. Prompt/context may leave the provider the user thought they were talking to.

3. **Browser-session adapter** — Even as a spike option, it reintroduces session/cookie handling the preamble calls out as ban-risk. Drop it from the legitimate path.

4. **Disconnect does not revoke** — Fine technically; unsafe if communicated as “disconnected from Claude.” Need copy that the CLI session remains valid system-wide.

5. **Shared quota with personal use** — Background jobs yielding at 80% is good; without clear labeling of JunOS vs manual consumption (and pause controls), the product can burn a paid plan the user needs for interactive work.

6. **Telemetry surface** — Plan name, meters, models unlocked, last 429, local run counts are account metadata. No retention/redaction rules here.

7. **Reconnect command display** — Exact CLI strings are helpful; also a phishing/confusion vector if an error state ever shows a substituted command. Spec should pin commands to a verified allowlist per adapter.

---

### UI / design quality (spec as brief)

Connections is an **app screen**: quiet chrome, colour on status/data, honest empties, one frequent job one click away. This doc specifies **content fields**, not composition — so the default implementation will be a **row of identical provider cards** (plan · meter · models · two buttons): the generated-settings pattern design-taste warns against.

**Hierarchy**
- No primary action. Is the job “fix what’s broken,” “pick default route,” or “protect budget”? Three jobs → three regions or a drill-in; not five equal cards.
- Status should lead (connected / needs action), not sit equal with “models unlocked” and method label.
- Fallback drag-list and cost guard belong under **Routing**, not inside each provider card.

**Density / spacing**
- Per card: plan, method, meter, reset, models, Reconnect, Disconnect — plus effort/`n/a` elsewhere — will overflow into cramped multi-line cards or a badge farm.
- App-screen guidance: show the blocks that matter above the fold with real rows; don’t invent KPI tiles for usage when the provider gives no meter.

**Typography / legibility**
- Status enums invite tiny tracked uppercase chips (“RATE_LIMITED”) — banned tell; prefer sentence-case status lines (“Rate limited · resets 14:02”).
- “Signed in via CLI” is jargon; Operate copy should say what to do (“Signed in with Claude Code · Reconnect if chats fail”).
- Fallback header string is long; will truncate or wrap badly in chat chrome — needs a short form + detail elsewhere.

**Contrast / colour**
- Spec doesn’t assign meaning to colour. App rule: colour on data that needs a decision (`needs_login`, over budget), not on every provider logo/chip.
- Local run counts shown as a “usage meter” will look like remaining quota (false precision / vanity meter). If approximate, label it “JunOS runs this week,” not a fill bar implying subscription %.

**Motion**
- No state-change behavior (probe → connected, rate-limit countdown, fallback hop). At minimum: status text updates without layout jump; reduced-motion keeps content visible (impeccable animate floor).
- Drag-reorder without motion/focus affordance will feel broken; needs visible focus order and non-drag alternative.

**States (honest)**
- Empty: no CLIs installed.
- Zero usage: “0 runs,” not an empty chart.
- Loading while probing.
- Error: probe failed vs needs login vs missing binary — three different fixes; one “Reconnect” is wrong for `unavailable` (install/CLI path) vs `needs_login`.
- `coming` for Grok: static non-card or single line in Routing, not a disabled meter card that looks broken.

**Effort picker**
- Disabling with “n/a for this model” is correct; avoid greyed control clusters that look like a fourth density problem. Hide when unsupported; don’t show a dead four-step scale.

---

### Priority fixes for the doc (if you revise it later)

1. Define every connection state and exact routing behavior per state.  
2. Split **Connections** (health/auth) from **Routing & budget** (default, fallback, caps).  
3. Resolve API-key / browser-session paths: in or out of the hard rule.  
4. Replace fake subscription meters with honest signals when vendors don’t expose usage.  
5. Require explicit fallback policy (auto vs ask) for privacy.  
6. Add empty/loading/error copy and the Reconnect success path.  
7. Narrow v1 providers to high-confidence rows only.

I didn’t run a live impeccable detector or taste inspector — this is a **spec-only** review; there is no rendered Connections UI to measure.
