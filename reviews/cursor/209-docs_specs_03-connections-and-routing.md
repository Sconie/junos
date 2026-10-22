Context loading did not run (Ask mode blocked the skill launcher); no `PRODUCT.md` / `DESIGN.md` in the repo. Reviewed the workspace copy of `docs/specs/03-connections-and-routing.md` through **impeccable Operate** + **design-taste app-screen** rules. Could not verify git object `595fe13` from here.

**Mode:** Connections + routing controls are Operate / app-screen work (scan, states, one job), not a marketing page.

---

### Verdict

The adapter stance (official CLIs, no token theft) is sound and matches the goal. As a shippable Connections + routing UI contract, the doc is thin: state vocabulary fights itself, Grok labeling is inconsistent, several fields are unspecified (`degraded`, meters, “cheap”), and the Connections surface is specified as a packed five-card kit without hierarchy, empty/error composition, or motion/a11y for drag-reorder.

---

### Contradictions

1. **Grok card copy vs table vs open question**  
   Table: card stays **"not available"** until an official route exists. Open questions: card stays **"coming"** while the spike continues. Roadmap-adjacent language in this doc also says Grok is out of scope / no supported route. Three different promises for one card.

2. **“Coming” is not in the shared enum**  
   States are `connected | needs_login | rate_limited | unavailable | degraded | unknown`. There is no `coming`. UI cannot implement “coming” without inventing a seventh state or overloading `unavailable` / `unknown`.

3. **“Single enum used everywhere” then immediately not**  
   “Single enum used everywhere: UI, Home, router, Hermes pill” is undercut by “Hermes’s own states … are a separate enum.” Unclear what the top-bar provider pill shows (connection probe vs Hermes agent state) and whether Home can mix both without a third mapping.

4. **Scope of “no API keys” vs Nous / local Hermes**  
   Goal is plans Jonas already pays for via official clients. Nous row: Portal client if possible, else “Hermes models run locally,” plus “No API-key storage.” Local Hermes is not a subscription connection in the same sense as Claude/Codex CLI login. Is local Hermes a Connections card, absent, or only the Hermes console?

5. **Method label is one string for all**  
   “Signed in via CLI” is prescribed globally. Grok has no CLI; Nous may be Portal or local; Cursor is “verify.” That label will be wrong or empty for several rows unless the method is per-adapter.

6. **Fallback UX vs “allowed providers”**  
   Automatic fallback stays inside the allowed list (good). Failure offers **“Send once to \<other provider\>”** after confirmation. Unclear whether “other” must still be on the allowed list, any connected provider, or any verified adapter—privacy meaning changes completely.

---

### Gaps (contract incomplete for implementers / UI)

| Gap | Why it matters |
|---|---|
| **`degraded` undefined** | No trigger, copy, or recovery. Distinct from `rate_limited` / `unavailable`? |
| **Usage meter source & units** | “Where the provider exposes it” with no probe contract; else local run counts. UI needs: % vs absolute, reset clock, shared-with-manual-use warning. |
| **`preferCheapModel` / “cheap”** | No ranking, no per-provider map, no UI explanation when the cheap pick is worse. |
| **Effort “n/a” presentation** | Disabling the control is right; missing: disabled reason, focus order, whether Max still appears for models that only support Low/High. |
| **Fallback list UI** | Drag-reorder only; no keyboard reorder, no empty allowed-list, no “all rate-limited” composition. |
| **Probe lifecycle** | When `unknown` → probed; refresh interval; failure to run `status` vs missing binary. |
| **Concurrency (open)** | Affects `rate_limited` / queueing UI and whether two chats can share one CLI session. |
| **Side-effect detection** | “Never re-run after any tool side effect” needs a definition for CLI adapters that don’t report tools cleanly. |
| **Disconnect semantics** | Removes JunOS reference only. Missing: does Disconnect stop scheduled use of that provider? Auto-reconnect after `needs_login`? |

---

### Unrealistic / oversized scope

- **Five provider cards in v1** while only Claude + Codex are “high” / initial validation; Cursor and Nous are research; Grok is unavailable. Shipping five equal cards invites a template grid of identical panels (design-taste app-screen failure: first screen thin on real jobs, loud on chrome).
- **Usage meters as first-class UI** when most CLIs do not expose clean plan meters; fallback to local counters + last 429 is honest but means the “meter” is often a fake-looking progress UI over guesswork—risk of looking like vanity KPIs.
- **Cross-CLI effort mapping + `models()` effort matrix** is a full adapter API; this doc only sketches it.
- **Safe automatic fallback** across heterogeneous CLIs (especially Cursor “medium, verify”) is harder than the paragraph implies; tool-side-effect gating is the expensive part.

Tighter v1: two live cards (Claude, Codex), others as a single “Not connected / research” section or disabled rows with one honest sentence—not full meter + models + disconnect chrome.

---

### Security / privacy risks (within this doc’s approach)

**Strengths:** no OAuth scraping; no API-key store; Disconnect doesn’t touch CLI login; allowed-list + confirmed one-off send; no re-run after side effects; budget yield at 80% with Inbox notice.

**Risks / underspec:**

1. **Authenticated subprocess = full account power.** Not extracting tokens does not reduce blast radius: JunOS driving `claude`/`codex` inherits Jonas’s plan session. A prompt-injection or over-broad `cwd` still spends quota and can act as him inside that client’s permissions. This doc should require explicit pointer to gateway/sandbox constraints (it only owns routing).
2. **Context egress on fallback / “Send once”.** Confirmation exists; missing: what is disclosed (provider name, model, that attachments/cwd go too)—a one-line ProviderDisclosure-style requirement belongs here, not only “confirmation.”
3. **Streaming CLI stdout** may contain secrets from tools/files; routing/logging retention for that stream is unstated.
4. **Reconnect shows the exact CLI command.** Fine for power users; still a footgun if copy-paste runs in a shared terminal log. Prefer deep-link / “Open in Terminal” over raw secrets-adjacent command strings if any login flow prints tokens (verify per CLI).
5. **Shared subscription budget.** Yield at 80% is good; missing: per-provider vs global threshold, and whether background Hermes/workflows count against the same meters shown on Connections.
6. **Cursor / Nous “verify” rows** increase ToS and session-abuse uncertainty while still appearing on the same trust surface as Claude/Codex.

---

### UI / design-quality problems (impeccable Operate + design-taste app screens)

Connections is a **settings/ops list**, not a dashboard of KPI tiles. Speccing every card with plan + method + meter + reset + models + Reconnect/Disconnect pushes a **five-up identical card row**—the generated-dashboard tell (icon/status chrome, meters as tiles, little product-specific substance).

**Hierarchy**  
No page question (“Which providers can JunOS use right now?”), no single lead answer (e.g. default model / who’s connected), no h1/second-line contract. Everything on the card is peer weight → scan failure.

**Density**  
Per card: identity, auth method, quota, models, two destructive/recovery actions. App-screen settings want one job per row/section; put meters and model lists behind expand / detail, keep the list to **name + state + one action**.

**Typography / legibility**  
- Method label as a repeated eyebrow-style chip (“Signed in via CLI”) is the banned “tiny label above content” pattern unless it’s body-weight secondary text.  
- Effort `Low / Medium / High / Max` as always-visible segmented control is **four options at the cognitive-load edge**; “n/a for this model” must stay readable when disabled (Operate: disabled controls explain why; taste flags unreadable disabled).  
- CLI reconnect command in UI needs mono for the command only—not mono costume on the whole card.

**Spacing / composition**  
Drag-reorder fallback list + cost-guard fields + Connections cards with no layout rule (one column list vs card grid, gutters, phone). Below ~900px (product is desktop-first elsewhere) drag handles and dual actions will crush.

**Contrast / state color**  
Six connection states + separate Hermes enum will tempt color-only pills. Spec should require **ink label + mark** (StatusDot + text), and define hue only for actionable bad states (`needs_login`, `rate_limited`), not a rainbow per enum value. Soft grey body for secondary meter text must stay ≥4.5:1 on glass/dark panels (craft-floor)—unspecified here.

**Motion**  
Operate: 150–250ms, state feedback only—no card entrance choreography. Spec never mentions probe refresh, meter update, or reorder motion; without that, implementers will add decorative fade-in on five cards. Drag-reorder needs a **non-pointer** path or it’s an a11y miss, not a polish miss.

**Copy / empty / error**  
- “not available” vs “coming” is user-facing contradiction.  
- No empty Connections (zero CLIs installed), no “junosd can’t probe,” no skeleton-while-probing.  
- Inbox notice when over budget is named; Connections screen doesn’t say it surfaces the same budget state (Home pill vs this page).

**Substance the skills demand**  
One product-specific element is missing: e.g. a single **shared weekly capacity** strip (real question for subscription routing) instead of five mini-meters. Colour on data (how much of the shared cap is left), not on chrome.

---

### Highest-priority fixes in the doc (not implementation)

1. Pick one Grok UX: omit card, or `unavailable` with fixed copy—delete “coming.”  
2. Define `degraded` or remove it.  
3. Split “Connections list” (name, state, Reconnect) from “Routing” (default, fallback order, cost guard, effort).  
4. Specify meter behavior when the provider exposes nothing (local counters labeled as local, never dressed as plan %).  
5. Clarify “Send once” provider set + disclosure of what leaves the machine.  
6. Align Hermes: Connections does not own Hermes agent state; pill mapping in one sentence.

I’m in Ask mode—I can’t edit the spec; switch to Agent mode if you want those revisions applied.
