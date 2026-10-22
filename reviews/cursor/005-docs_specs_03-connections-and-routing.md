## Findings (ranked)

### 1. High — Browser-session path contradicts the core auth stance
**Where:** Provider table, Grok row: *“or a browser-session adapter”*; Approach: *“does not copy OAuth tokens… That is fragile and may breach provider terms”*; cross-check `12-security-and-privacy.md` Credentials + threat (3) leaked provider sign-ins.

**Why:** A browser-session adapter *is* session/cookie reuse. It undercuts the only hard safety claim in 03, raises ban/ToS risk, and conflicts with 12’s “JunOS stores no provider passwords or tokens.”

**Fix:** Drop browser-session from the table. Spike outcomes only: (a) official subscription CLI/API, or (b) omit Grok. Prefer the already-stated “coming” / ship-without path; never list session scraping as an option.

---

### 2. High — “Portal login or key” breaks “subscriptions, not API keys”
**Where:** Nous row: *“Portal login or key”*; Goal / title: *“subscriptions instead of API keys”* / *“no per-token API billing”*; cross-check `00-overview.md` principle 1, `12` Credentials, Phase 1 done-when in `13-roadmap.md`.

**Why:** A stored Portal key is exactly the credential model the product rejects. Implementers will put keys in SQLite/`usage_json`/env and contradict 12.

**Fix:** Split Nous into two adapters: (1) subscription/session path only on Connections; (2) optional local Hermes (no Portal key). If Portal requires a key, treat it as an explicit Settings secret in the OS keychain with a different label—not a “connection” peer to Claude CLI.

---

### 3. High — Five connection states vs boolean adapter API
**Where:** Connection states: `connected · needs_login · rate_limited · unavailable · degraded`; cross-check `01-architecture.md` `status(): Promise<{ connected: boolean; … }>`.

**Why:** UI and data model (`02` `connection.status`) need a rich enum; the adapter contract cannot express rate limits, missing CLI, or degraded probes. States will be faked in the UI or lost at the boundary.

**Fix:** Align `ProviderAdapter.status()` with the same enum (+ `plan`, `usage`, `resetAt`, `error`, `cliVersion`). Define `degraded` (e.g. probe OK but streaming broken / version unsupported) or remove it until defined.

---

### 4. High — Usage meters will lie when providers don’t expose limits
**Where:** Connections screen: *“usage meter and reset time (only where the provider exposes it; otherwise show local run counts and last 429)”*; Usage budget: *“weekly meter… default 80%”*; Home (`10`) and stitch also show “62% of weekly limit.”

**Why:** Local run counts ≠ shared subscription capacity (manual Claude/Codex use is invisible). App-screen rules demand honest zeros/missing values; a progress bar of local counts reads as “plan usage” and invites overspend—the risk `13` already flags.

**Fix:** Two distinct UI affordances: (1) **Provider-reported** usage only when probed; (2) **JunOS budget** (runs today / soft cap) labeled as such. Never draw a single “weekly limit” bar from local counts. Default budget threshold should key off JunOS counters + last 429, not a fictional weekly %.

---

### 5. High — Fallback rules ignore `unavailable` / `degraded` (and chat Connect flow)
**Where:** Routing: fallback only if first is `rate_limited` or `needs_login`; Chat (`04`): disabled providers show Connect; composer must explain why send fails.

**Why:** Missing CLI or half-broken adapter won’t fall back; user gets a hard fail while a working second provider sits idle. Contradicts the point of drag-reorder fallback.

**Fix:** Fallback on `unavailable`, `degraded`, `needs_login`, `rate_limited` (and transport errors). Only skip fallback when user pinned a model and opted out. Document interaction with chat “Connect” (open Connections vs copy CLI command).

---

### 6. Med — Spec invents Claude “prompt-budget tiers”
**Where:** Effort mapping: *“Claude: thinking/effort level flags where supported, else prompt-budget tiers.”*

**Why:** Unrealistic adapter scope: inventing tiers that aren’t vendor flags means prompt hacking, inconsistent cost/latency, and no ground truth in run records. Conflicts with *“UI never offers an invalid combo”* from `models()`.

**Fix:** If the CLI/SDK has no effort flag for a model, mark efforts unsupported (`efforts_json: []`) and disable the control—same as “others.” No synthetic budget tiers in v1.

---

### 7. Med — Cost guard vs usage budget vs approvals: no precedence
**Where:** Routing `maxRunsPerDay` / `preferCheapModel`; Usage budget 80% yield + Inbox notice; `12` Approval class `spend`; Scheduler in `01` / Tasks in `05`.

**Why:** Three throttles, no order: workflow may run while global budget yields, or yield without Inbox; `preferCheapModel` undefined (which model? same provider?). Background jobs can still burn the shared plan.

**Fix:** One ordered policy: (1) connection state, (2) global provider budget, (3) workflow `maxRunsPerDay`, (4) `preferCheapModel` as explicit model id/tier from `models()`. Map budget exhaustion to Inbox `failure`/`digest` and optional `spend` approval for above-threshold interactive runs.

---

### 8. Med — Subprocess CLIs inherit full sessions; 03 never ties to tool/approval policy
**Where:** Approach: launch official client with existing sign-in; cross-check `01` tools on `RunRequest`, `04` tool toggles, `12` prompt injection + external-send/destructive.

**Why:** Driving a logged-in CLI is safer than token theft but still lets injected content trigger provider-side tools/network under Jonas’s account. 03 is silent; security lives only in 12.

**Fix:** In 03, require: adapters default to no provider tools / readonly; JunOS tool bridge always behind 12; never pass untrusted web/file content into a tool-enabled CLI run without approval. Note account-ban risk if adapters enable shell/browser features.

---

### 9. Med — Connections UI specified as identical provider “feature cards”
**Where:** *“plan name, method label… usage meter… models unlocked, Reconnect/Disconnect”*; stitch §6: *“grid of provider cards… logo… status badge… usage meter… small chips”*; current `Connections.tsx` already a equal card grid.

**Why (design-taste / app-screens):** Classic generated settings: logo tile, badge, meter, chip row, two buttons—five identical panels. Hierarchy doesn’t match roadmap reality (Claude/Codex Phase 1; others later). Colour/chrome on badges vs data; no single primary job on first paint.

**Fix:** Spec a **settings list**, not a marketing card grid: one vertical stack, provider name + one-line state in ink, usage as a thin plan track only when real, models as a single secondary line (not chip clouds). Primary action per row from state (`Install CLI` / `Run: claude login` / `Reconnect`). Put Routing in a second section with title + description (settings layout from app-screens §8.2), not another card row.

---

### 10. Med — “Coming” Grok card is a vanity empty state
**Where:** Open questions: *“keep the card as coming”*; Goal still lists Grok as a first-class target.

**Why:** Occupies equal weight with working providers; teaches users a dead control. App-screens: empty state keeps frame and names the next action—or omit the object.

**Fix:** Hide Grok until spike succeeds. Optional footnote: “More providers after Claude & Codex.” Don’t ship a disabled SuperGrok-shaped card.

---

### 11. Med — Connect / Reconnect / Disconnect interaction is underspecified
**Where:** *“Reconnect with the exact CLI command”*; *“Disconnect removes only JunOS’s reference, never the CLI’s login.”*

**Why:** No Connect success path (probe after login), no copy/open-terminal behavior, no “I’ve signed in—Recheck,” no explanation that Disconnect ≠ logout. High-stakes auth UX without reassurance (impeccable Operate / harden).

**Fix:** State machine per provider: `unavailable` → install/docs; `needs_login` → copyable command + “Recheck status”; `connected` → Disconnect (= disable in JunOS) with helper text “Does not sign you out of {CLI}.” Toast/Inbox on probe failure with stderr snippet (redacted).

---

### 12. Med — Method label locked to CLI while table allows non-CLI
**Where:** UI: *“Signed in via CLI”*; Nous/Grok rows allow API/key/browser; stitch allows *“OAuth”, “Local session”*.

**Why:** Hardcoded label will be wrong for Nous/local and fights stitch; invites implementing OAuth in UI against 03’s policy.

**Fix:** `method` from data model only: `cli` | `portal` | `local` | `unsupported`. Render labels from that enum; delete OAuth from stitch/Connections unless a real official OAuth device-flow exists.

---

### 13. Med — Concurrency “probably 1–2” left open while Phase 1 ships routing
**Where:** Open questions: concurrency; Phase 1 (`13`): adapters + routing fallback.

**Why:** Parallel CLI runs can trip rate limits, corrupt sessions, or violate ToS. Fallback + background Scout/tasks (`08`) without a global semaphore is unrealistic for v1.

**Fix:** Decide before Phase 1: global per-provider concurrency `1` (default), queue with visible “Waiting on Claude…” in message header. Document interaction with fallback (don’t fan out).

---

### 14. Low — Effort “n/a” copy and dual specs with Chat
**Where:** *“picker disables… shows n/a for this model”*; `04`: segmented control *“greyed where the model has no such level.”*

**Why:** “n/a” is template UI copy; two specs can diverge (tooltip vs label vs hide).

**Fix:** Single rule in 03: control disabled; accessible name “Effort not supported for {model}”; no “n/a” badge. Point 04 at 03.

---

### 15. Low — No screen-level states, a11y, or density for Connections/Routing
**Where:** 03 UI paragraph only; `14-ui-system.md` requires loading/empty/error/offline; drag-reorder with no keyboard path.

**Why:** Daemon down, zero providers, probe in flight, and DnD-only reorder fail Operate/a11y bars (`14`: keyboard-first, status not by colour alone).

**Fix:** Add acceptance: skeleton rows; empty “No CLIs detected” + install links; offline banner from 14; status text + `StatusDot`; reorder via buttons or select order, not drag-only.

---

### 16. Low — Routing section scope creep vs data model
**Where:** Routing: default model, fallback order, per-task/workflow overrides, cost guard; `02` `routing_rule` scopes: `default | task | workflow | agent`.

**Why:** Connections screen becomes a full policy editor; agent overrides mentioned in data model but not here; Home already duplicates subscription meters (`10`).

**Fix:** Connections v1: provider health + one default + one fallback list. Move per-task/workflow/agent overrides to those screens; cost guard fields on workflow editor (`05`). Home subscription strip: link to Connections, don’t re-spec meters here.

---

### 17. Low — Typography/hierarchy silence invites glass-chip chrome
**Where:** 03 lists content fields but no hierarchy; product UI tokens in `14` (Inter, violet accent, glass, chips); stitch chips/badges/meters.

**Why:** Without Operate guidance, implementation will follow stitch: Inter, violet pills, frosted cards, tiny uppercase badges—tells both skills flag (generic AI dashboard; glass/violet assistant palette).

**Fix:** In 03, bind to Operate rules: one `h1` “Connections”; section `h2` “Routing”; body 14–16px ink; status as sentence (“Session expired — run `claude login`”), not a coloured pill alone; meters as type + thin track; defer glass/chip aesthetics to a deliberate exception note if keeping Stitch Soft Dark.
