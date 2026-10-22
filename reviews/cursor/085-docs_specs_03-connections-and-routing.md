**Verdict:** Solid threat-model intent (drive official CLIs, don’t scrape tokens), but the Connections surface is underspecified as Operate UI and tries to be connection health, routing policy, and budget control at once. Several auth paths contradict the opening rule; Grok/Cursor stretch Phase 1 realism.

Lens: **Operate** (impeccable) + **app screen / settings** (design-taste). No live UI to inspect — this is a spec critique only.

---

### Contradictions

1. **“Never extract tokens / drive official clients” vs listed paths**  
   Nous allows “Portal login **or key**.” Grok allows a **browser-session adapter**. Both reintroduce credential/session capture the intro rejects. Either drop them from the contract or rename the approach (“prefer official CLIs; exceptions need a written threat model”).

2. **Goal vs billing**  
   Goal: no per-token API billing. Nous OpenAI-compatible endpoint + optional key is classic API billing unless you hard-constrain “subscription session only.”

3. **Disconnect semantics vs user mental model**  
   Disconnect “removes only JunOS’s reference, never the CLI’s login” is correct technically, but without copy the UI reads as “signed out of Claude.” Spec needs the consequence sentence (app-screens destructive/settings pattern).

4. **Usage signal split**  
   Card shows provider usage meter *or* “local run counts and last 429” with no hierarchy. Those answer different questions (shared plan vs JunOS burn). Same widget will lie or confuse.

5. **Budget systems overlap**  
   `rate_limited`, cost guard (`maxRunsPerDay`, `preferCheapModel`), and scheduler yield at 80% are three policies. Spec never says which wins when they disagree.

6. **Surface mixing**  
   Fallback disclosure lives in the **message header**; Connections owns cards and routing. One doc, two screens, no IA — easy to ship a Connections page that also tries to explain chat attribution.

---

### Gaps

| Area | Missing |
|---|---|
| Screen question | App-screens §2.2: one question (“Are providers ready?” vs “Where does work go?”). Spec dumps both. |
| `degraded` | Named in the state enum, never defined vs `unavailable` / `rate_limited`. |
| Probe lifecycle | No `checking` / loading while `which` + version + status run; no failure copy when probe errors. |
| First-run / empty | Zero CLIs installed; first Connect; all `needs_login`. |
| Card → detail | Five peers × (plan, method, meter, reset, models, actions) with no list/detail or progressive disclosure. |
| Routing UI | Where live: same page, Settings, or chat-only? Drag-reorder a11y (keyboard, announce order). |
| Effort control | Where it sits (composer vs Connections); disabled + “n/a” legibility (must say *why*). |
| Concurrency | Open question only; UI never shows “busy / queued.” |
| Inbox notice | Trigger, copy, dismiss, link back to Connections/budget. |
| Privacy surface | What of CLI stdout/stderr is stored, shown, or redacted. |

---

### Unrealistic scope

- Shipping **five** provider cards including Cursor (“medium, verify”) and Grok (“low, research spike”) as first-class UI peers. Spec already says ship Grok as “coming” — a dead peer card on the first screen is an app-screen failure (thin / unfinished first viewport).
- **Usage meters “where the provider exposes them”** — most subscription CLIs don’t expose a reliable weekly remaining figure to a subprocess. Default path will be local counts; design for that, treat vendor meters as progressive enhancement.
- Full stack in one slice: probe runners + streaming + effort map + fallback chain + workflow overrides + cost guard + 80% yield + Inbox. That’s several products.
- Cross-provider fallback with honest attribution and effort remapping is a Phase-2 reliability problem, not a Connections-card checkbox.

**Tighter Phase 1:** Claude + Codex only; Cursor behind a verify flag; Grok omitted (not a grey “coming” card); routing = default + ordered fallback; one budget knob.

---

### Security / privacy risks

1. **Browser-session adapter (Grok)** — highest risk in the doc: session cookies, XSS/extension surface, ToS, ban risk. Conflicts with the stated approach; keep as spike notes, not a shippable adapter type on the Connections card.
2. **API key for Nous** — key storage, rotation, leak via logs/UI. If keys exist, Connections must not echo them; Disconnect/key lifecycle needs the same care as secrets.
3. **Subprocess trust boundary** — daemon launches CLIs with user auth. Spec should require: no shell interpolation of model/user text into argv; bounded env; timeouts; cancel; scrubbed logs (tokens, paths, email).
4. **Shared subscription budget** — JunOS burn affects Jonas’s interactive Claude/Codex use. Privacy isn’t only data exfil; it’s **capacity theft** without a loud, actionable notice (spec mentions Inbox — good; needs severity and deep link).
5. **Reconnect shows “exact CLI command”** — good transparency; risk if the string ever embeds machine-specific paths or account ids. Prefer documented canonical commands + Copy, not free-form shell.
6. **Local Hermes vs Portal** — same card can imply cloud when work is local (or the reverse). Data-residency/method label must be unambiguous.
7. **Fallback across providers** — prompt/context may leave one vendor’s trust domain for another; header “answered by X, fell back from Y” is necessary but not sufficient if attachments or system prompts differ in retention.

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Connections is a **settings / peer-object** screen (sparse–medium density), not a dashboard. Through app-screens + Operate:

**Hierarchy / IA**  
- Two jobs compete: **health of adapters** vs **routing & budget policy**. Split views (or primary list + secondary “Routing” section with one h1 area).  
- Avoid a row of five identical “feature cards.” Prefer one list: provider · state · one lead figure · primary action; details on select.  
- One primary action per row context (Reconnect **or** Connect), not Reconnect + Disconnect as equal filled buttons. Disconnect = destructive, last, confirmed, consequence in words.

**Density / spacing**  
- Stuffing plan, method, meter, reset, models, and two actions into every card will read as a generated settings grid (orphans with 5 providers, ragged bottoms).  
- Usage strip only if **quota is the screen’s question**; otherwise put meters inside the selected provider, smaller than the h1 (app-screens §8.2).

**Typography / copy**  
- Operate: one grotesk, tight scale (≈12/14/16/24), sentence case. No display hero.  
- Replace interface-meta (“Signed in via CLI”, “n/a for this model”) with trade language: “Claude Code · session OK”, “Effort not supported on this model”.  
- CLI reconnect commands: real `<code>` / monospace block only there; Copy control; don’t set the whole card in mono.

**State, legibility, contrast**  
- Five states need a **fixed vocabulary**: ink label + one small mark; colour on the failing fact only (not five saturated pills). House floor **4.5:1** on every status word; pale green/red text from kit palettes often fails.  
- `needs_login` / `rate_limited` are decision states — they should outrank `connected` visually (colour = good/bad for the job, not rainbow chrome).  
- Disabled effort control: stay legible and explain why (app-screens flags low-contrast disabled).  
- Missing vendor meter → em dash / “—” at meta size, not a fake full bar or a giant “--”.

**Motion**  
- Operate: **150–250ms** state feedback only (Reconnect → checking → result). No card-entrance choreography, no meter animations that delay the number.  
- `prefers-reduced-motion`: instant state swap, keep copy.

**Specific UI landmines in the current wording**  
- Drag-reorder fallback without keyboard/AT story.  
- Message-header fallback string can get long (“answered by Sonnet via Claude, fell back from Codex”) — needs truncation + detail affordance or it wrecks scan hierarchy in chat.  
- “Coming” Grok card on the first screen.  
- Cost guard / 80% threshold with no control placement, units, or preview of “what this setting produces” (next runs deferred, Inbox example).

---

### Strengths worth keeping

- Clear non-goal: no token scraping / private reverse engineering.  
- Capability probe + runner framing.  
- Disconnect doesn’t wipe vendor login.  
- Effort list driven by `models()` so the UI can’t offer invalid combos.  
- Shared-cap honesty (yield + Inbox vs silent burn).

---

### Highest-leverage doc fixes

1. Resolve the auth contract (CLI-only vs explicit exceptions with threat models).  
2. Define `degraded`, probe/loading, and empty/first-run.  
3. One screen question; split Connections health from Routing/budget.  
4. Design meters for **local JunOS counts** first; vendor meters optional.  
5. Drop or hide unverified providers from the default canvas; no decorative “coming” peers.  
6. Specify status visuals for contrast and decision priority; destructive Disconnect copy.

I can turn this into a tightened outline for the Connections screen (list columns, states, Routing subsection) if you want that next — still Ask mode, so outline only unless you switch to Agent.
