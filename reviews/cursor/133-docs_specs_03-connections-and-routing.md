**Verdict:** The adapter strategy is sound (official CLIs, no token theft), but the Connections UI is underspecified as an Operate settings surface, and the doc contradicts its own “no API keys” frame (Nous key, possible browser-session Grok). Biggest craft risk: five identical status cards + vague meters + undefined `degraded`, which both skills treat as generated “integrations dashboard” slop.

Context loading did not run; no PRODUCT.md/DESIGN.md in repo. Review is from this doc only, through impeccable **Operate** and design-taste **app screens**.

---

### Contradictions

1. **Title vs Nous row.** “Subscriptions instead of API keys” / “never extract tokens,” but Nous allows “Portal login **or key**.” A key path is exactly the model the doc rejects for everyone else.

2. **One method label for all paths.** Connections always shows `"Signed in via CLI"`, while Grok may be browser-session and Nous may be a key. One label will lie for at least one provider.

3. **`degraded` is listed, never defined.** Five states in the enum; only four get behavior. UI and routing cannot implement what the doc names.

4. **Fallback order vs state set.** Fallback triggers on `rate_limited` or `needs_login` only. Silent on `unavailable`, `degraded`, and “CLI missing after connected.” Users will assume “try next” covers all failures.

5. **“Cost guard” vs subscription capacity.** Copy frames money; the mechanism is shared usage caps with Jonas’s manual use. Misnames the control and the Inbox notice.

6. **Disconnect semantics vs mental model.** Disconnect “removes only JunOS’s reference, never the CLI’s login” — correct and careful — but the screen still reads like account logout unless copy says the CLI stays signed in.

7. **Effort “n/a” vs model list.** Picker disables and shows n/a when unsupported, but Connections also shows “models unlocked” with no rule for effort support mismatches or plan-gated models.

---

### Gaps (this doc should answer)

| Missing | Why it matters |
|---|---|
| Screen job + layout | App-screens: one question first (“Can I run work right now?”). No list vs cards, order, primary action, or where Routing lives (same view vs separate). |
| Definition of `degraded` | Enum is incomplete without it. |
| All-providers-failed | Fallback header assumes a winner; no empty/error for chat when every adapter fails. |
| Usage meter contract | “Only where exposed; else local run counts and last 429” — no units, window, or how a count becomes a bar. Taste: limits bars need both ends labelled. |
| Budget notice UX | Inbox notice at 80% — severity, dismiss, deep-link to Connections, conflict with active workflow. |
| Reconnect presentation | “Exact CLI command” — copy button, run-outside-JunOS, paste hazards, multi-step login. |
| Key / browser-session UI | If those paths stay, fields, storage, and Disconnect must differ from CLI. |
| Concurrency in UI | Open question “1–2 parallel” — no queue, busy, or “waiting on Claude” state. |
| First-run / empty | All `needs_login` / CLIs missing — no setup strip or progress (app-screens first-run). |
| Accessibility of drag-reorder | Fallback order — keyboard, live region, non-pointer path. |
| Egress sentence | Local daemon ≠ private prompts; not stated on this privacy-sensitive surface. |
| Visual / density intent | No shell, type, contrast, or “medium list” density — will inherit glass/card kits from elsewhere. |

---

### Unrealistic scope

For a Phase-1 spike-heavy area, the doc still commits UI to **five live provider cards** including Grok at **low / research spike**, plus effort mapping, drag fallback, per-task/workflow overrides, cost/usage guard, scheduler yielding, and Inbox notices.

Shipping “coming” for Grok is fine; designing full meter/reconnect/method parity for unverified adapters before the spike is not. Cursor and Nous are already “medium, verify” but treated as same-fidelity Connections rows as Claude/Codex.

---

### Security / privacy risks

- **Subprocess = full CLI power.** Not extracting tokens is good; JunOS still drives authenticated agents that can touch files, PRs, and billed capacity. Doc never separates “chat completion” from “agent with tools.”
- **Browser-session adapter (Grok option).** Even as “adapter,” session cookies in a daemon are high-value and closer to the anti-pattern the intro forbids. Spike should gate this as non-goal unless terms-clear.
- **Nous API key** undercuts the security story and needs vaulting, display masking, and rotation — unspecified.
- **Reconnect commands in UI.** Exact shell commands invite blind paste; risk of wrong binary/flags or phishing-like “run this.” Prefer deep-link to vendor docs + “I signed in” refresh, or copy with clear out-of-band framing.
- **Disconnect ≠ revoke.** Users may believe JunOS logout killed provider access; CLI session remains. Copy and confirmation must say so (destructive-adjacent clarity).
- **Usage / plan metadata.** Plan name, meters, 429 times in UI are screenshot/leak surface; shared weekly budget with personal use is sensitive work-pattern data.
- **Streaming output.** No redaction policy for secrets that CLIs echo into JunOS logs/UI.
- **Silent egress.** Goal is “plans Jonas already pays for”; prompts/history still leave the machine. Connections is the right place for one honest line.

---

### UI / design quality (Operate + app-screens)

Mode: **Operate** settings / integrations list — scanability and honest states over expression.

1. **Hierarchy.** Field dump (plan, method, meter, models, Reconnect/Disconnect) with no lead answer. App-screens: answer figure or status leads; one primary per row/screen. Likely failure: five equal “integration cards” with logos in tinted squares (banned tell).

2. **Status vocabulary.** Five states need distinct marks, not a rainbow of pills. Colour = good/bad for *capacity*, not decoration. `rate_limited` and budget ≥80% are the decision signals; `connected` stays quiet chrome.

3. **Usage as data, not chrome.** Taste: plan/quota views get a usage strip with true ratio and labelled ends. Proxy “local run counts” must not fake a full meter — grey dash / count + “last 429” is more honest than a meaningless bar.

4. **Density.** Five providers = sparse–medium settings list, not a dashboard KPI row. Prefer one divided list (provider · status · action) over a card grid; rows ~44–56px, body 14px, meta 12px at ≥4.5:1.

5. **Typography / labels.** Fixed string `"Signed in via CLI"` as a chip/eyebrow risks tiny tracked uppercase labels (banned). Put method in the secondary line in sentence case. Effort Low/Medium/High/Max needs one control height and legible disabled “n/a” (study flags ~1.4:1 disabled text).

6. **Spacing / settings layout.** No section split between **Connections** (auth health) and **Routing** (default, fallback drag, cost guard). App-screens: one view per area or clear stacked sections with 32px rules — not one scrolling mash of meters and drag handles.

7. **Motion.** Drag-reorder and reconnect need 150–250ms state feedback only. No pulse/glow on “connected.” Budget yield → Inbox is a notice, not a toast storm.

8. **Legibility / contrast.** Reset times, “fell back from Codex” headers, and disabled effort need full-ink / secondary tiers on opaque surfaces. If the product still pins glass elsewhere, this screen must require opaque wells for status and commands — blur under CLI text fails contrast.

9. **Empty / error / loading.** Missing: CLI probe in progress (skeleton rows, not spinners), `unavailable` with install path, all-down chat failure. Empty section keeps frame + one sentence + action where data will sit.

10. **Emotional fit.** Intro is rightly paranoid about bans and terms; UI that looks like a glossy “AI hub” with five vendor tiles fights that trust. Quiet list + honest “coming” / “verify” beats fake parity.

11. **Chat header fallback copy.** Long “answered by Sonnet via Claude, fell back from Codex” will wrap and compete with the answer. Needs a short primary line + expandable detail (Operate: don’t make users parse routing on every message).

---

### Highest-leverage fixes (guidance only)

1. Resolve **key vs no-key**: drop Nous key from v0 or rewrite the title/principle; kill or quarantine browser-session Grok until the spike.  
2. Define **`degraded`**, expand fallback triggers, and specify **all-failed** UI.  
3. Split **Connections** (health, reconnect, disconnect copy) from **Routing** (default, order, guards); lead each row with status, not plan chrome.  
4. Specify **honest usage** (labelled real meter vs count + last 429 — never a fake bar) and rename Cost guard → usage/cap guard.  
5. One sentence on **egress + Disconnect doesn’t revoke CLI login**; gate any non-CLI auth behind an explicit security note.

I can apply the same lens to `14-ui-system.md` or `12-security` next if you want those cross-checked against this Connections surface.
