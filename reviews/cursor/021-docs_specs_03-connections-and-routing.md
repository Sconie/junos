**Verdict:** Spec 03 is a solid *auth strategy* note (subprocess CLIs, no token theft), but it is not yet a Connections/routing *product* spec. The UI section reads like a field dump on identical provider cards, and several claims conflict with the “official client only / no secrets” stance.

Mode for this surface: **Operate / app screen** (settings-adjacent), not a marketing page. Critique is of the written UI, not rendered pixels.

---

### Contradictions

1. **Ship-all vs research-spike.** Goal lists five providers as the product. Grok is `low, research spike` and Open questions say ship without it. The screen still implies a full five-card grid including a “coming” card.

2. **“Never extract tokens / drive official clients” vs Grok + Nous.** Grok’s “browser-session adapter” is session/cookie territory, not an official non-interactive CLI. Nous’s “Portal login **or key**” implies JunOS may hold a provider key — at odds with the opening rule and with the single method label `"Signed in via CLI"`.

3. **Usage meter as a first-class field vs “only where the provider exposes it.”** Subscription CLIs often expose little or no shared quota to a wrapper. The primary Connections chrome is framed around meters; the real case is mostly local counters + last 429. That should be the default UI story, not the footnote.

4. **“No per-token billing” vs `preferCheapModel` / “Cost guard.”** Under subscriptions, “cheap” means quota/latency/capability, not money. Naming and copy will teach the wrong mental model.

5. **Fallback copy assumes stable model identity.** Header example: “answered by Sonnet via Claude, fell back from Codex.” Routing is described as provider order + per-task overrides; model equivalence across providers is undefined. The UI can easily lie about what “fell back” means.

6. **`degraded` is named in the state enum and never defined** (unlike the other four states).

---

### Gaps (product + UI)

- **One job for the screen.** App-screen lens: first screen answers one question and puts the frequent action one click away. Unstated here — is it “am I able to run?” or “configure routing/budgets?” Mixing status cards, drag-reorder fallback, cost guards, and effort mapping on one surface without IA.
- **Layout.** No structure: card grid vs list+detail, where routing lives (Connections vs Chat vs Workflows), where budget threshold is edited.
- **State coverage.** Missing: probing/connecting, CLI present but `status` failing, mid-run failure before fallback, daemon offline, zero providers, partial config (Nous key unset). Spec 14 asks every screen for loading/empty/error; 03 only lists connection enums.
- **How meters, rate limits, plan name, and “models unlocked” are obtained.** Without that, the UI invents vanity telemetry or scrapes something fragile/unsafe.
- **Effort control.** Mapped in principle; no rules for multi-model chats, workflow steps, or when the control is global vs per-message.
- **Concurrency (open question) vs UI.** No “busy / queue depth” affordance if only 1–2 parallel runs.
- **Keyboard / a11y.** Drag-reorder with no alternative; status by color alone is banned by the UI system but not addressed here; Reconnect as “show CLI command” needs copy/select/focus behavior.
- **Empty and first-run.** No onboarding for “install Claude CLI → login → JunOS detects.”
- **Disconnect semantics** for non-CLI adapters (key, browser session) are undefined.

---

### Unrealistic scope

- Treating Cursor (medium), Nous (medium), and Grok (low) as the same Phase 1 Connections surface as Claude/Codex.
- Promising plan name + usage meter + reset time per provider without a verified probe API for each.
- Full routing stack in one breath: default model, drag fallback, per-task, per-workflow, cost guard, scheduler yield at 80%, Inbox notices — that’s several screens/systems, not one Connections page.
- Browser-session Grok as a “maybe” in the same adapter table as `claude login` — different product and legal class.

---

### Security / privacy risks

| Risk | Why it matters |
|---|---|
| **Browser-session adapter** | Undercuts the “no token extraction” policy; cookie/session handling is high ban + high leak risk. |
| **Nous key in JunOS** | Directly conflicts with “JunOS stores no provider passwords or tokens” unless keychain + never SQLite/logs is specified here. |
| **Full CLI capability via subprocess** | JunOS inherits whatever that login can do (spend quota, access linked tools). No mention of scoping, timeouts, cwd, env scrubbing, or PATH trust. |
| **Prompt / run content** | Streaming through CLIs puts chat/task content in third-party client logs/history; no retention/redaction note on this surface. |
| **Reconnect command display** | Fine if copy-paste of public CLI commands; dangerous if it ever embeds paths, emails, or org IDs from probe output. |
| **Local usage counters** | Lower risk, but still a usage fingerprint stored with the product; not called out. |

The approach sentence is the right threat posture; the Grok/Nous rows and unspecified probe outputs weaken it.

---

### UI / design quality (impeccable Operate + design-taste app screens)

**Hierarchy.** The Connections paragraph packs plan, method, meter, reset, models, Reconnect, Disconnect into every card — no primary figure, no secondary line. App-screen pattern: one lead status (“3 connected · 1 needs login”), then a quiet list; meters belong on the provider that actually has a plan track (`Charts.plan`-style: both ends labelled, true ratio), not as decoration on every row.

**Density / composition.** Five near-identical provider cards are the dashboard tell (identical panels, status chrome, progress bars). Prefer one list with shared columns (provider · state · method · next action) and a detail drawer for models/effort/routing — not a marketing-style card grid.

**Typography.** No type roles. Method label as quoted UI chrome invites tiny tracked caps / eyebrow chips. Operate mode: one UI family, tight scale; state and action in sentence case at readable size; monospace only for the literal reconnect command.

**Spacing / layout.** Unspecified gutters, title, primary action. Risk of a title + sparse card grid with large empty bands (app-screens flag thin first screens and ragged card rows). Routing “drag to reorder” needs a clear list rhythm (row pitch ~32–44px), not free-floating chips.

**Color / contrast / legibility.** Five states (`connected` … `degraded`) will become five hues on glass (spec 14: violet glass, dim text). App-screens: colour on data/meaning, ~few % coloured pixels; status needs text (or icon+text), not dot colour alone. Usage fills on `rgba` panels often fail 4.5:1 — especially `--text-dim` on glass. Disabled effort “n/a” must not read as broken/offline.

**Motion.** Operate: 150–250ms, state only — no page-load choreography. Spec is silent; avoid pulsing meters, staggered card entrances, and drag animations that delay the task. Fallback banner in the message header should appear as a state change, not a toast parade.

**Copy / emotional fit.** “Cost guard”, “preferCheapModel”, “coming” cards, and long fallback headers are anxiety or noise. High-stakes moment is **Reconnect** and **budget yield** — need calm, exact next step (“Run `claude login`, then Refresh”), not a wall of provider marketing fields. Inbox notice when yielding at 80% needs severity distinct from hard `rate_limited`.

**What would move quality most (if you rewrite only this doc’s UI slice):**
1. Define the screen’s one question and primary action.
2. Default UI to probe-backed facts (CLI installed? session ok?); treat meters as optional enrichment.
3. Split **Connections** (auth/health) from **Routing & budget** (order, caps, yield).
4. Drop or quarantine Grok browser-session and key storage into an explicit security exception — or cut them from v1 UI.

---

*Note: No DESIGN.md/PRODUCT.md in-repo; no live Connections UI to inspect. This is a spec critique through those skills, not a pixel audit.*
