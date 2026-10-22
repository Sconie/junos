Context loading did not run; reviewing the spec directly as an **Operate / settings** surface (Connections + routing), using impeccable Operate guidance and design-taste app-screen rules as the lens. No PRODUCT.md/DESIGN.md and no rendered UI—critique is of what this doc would force into the product.

---

## Verdict

The technical stance is clear and sound: drive official CLIs, don’t scrape tokens. As a product/UI spec it is thin. Connections is treated as a feature list, not a screen with one job, honest states, or a privacy boundary. Routing and budget are sketched; the Connections UI risks becoming five provider “cards” with meters and badges—the generated settings pattern the app-screen skill warns against.

---

## Contradictions

1. **Auth model vs “no API keys” framing**  
   Title/goal say subscriptions instead of API keys. Nous Portal row allows “Portal login **or key**.” That’s a second auth path the rest of the doc never reconciles (where is the key stored, who owns it, is it shown on the same screen as CLI sign-in?).

2. **Grok: research vs ship posture**  
   Table marks Grok **low, research spike**; open questions say ship without it and keep the card as “coming.” The Connections screen paragraph still lists providers as if they all expose plan name, meter, models, Reconnect—without a “not available / research” state. `unavailable` is defined as “CLI missing,” which is the wrong semantic for “we never built a legitimate path.”

3. **`degraded` is listed but undefined**  
   States are `connected · needs_login · rate_limited · unavailable · degraded`. Only four get meaning. `degraded` has no trigger, no copy, no UI treatment—yet it will compete with `rate_limited` and partial capability (CLI present, streaming broken, models() empty).

4. **Usage truth vs display promise**  
   Screen “shows … usage meter and reset time (only where the provider exposes it; otherwise local run counts and last 429).” Routing/budget elsewhere assume a **weekly meter** and default **80%** threshold. Local run counts are not a weekly subscription meter. The UI can honestly show one thing while the scheduler decides from another—users will think the bar is the shared Claude/Codex cap.

5. **Fallback messaging vs “default chat model”**  
   Fallback tells the user in the **message header** who answered. Default chat model and per-task overrides are named but not ordered against fallback (does override skip fallback? does fallback replace the chosen model mid-stream?). One sentence of UI policy, no precedence.

6. **Disconnect semantics**  
   “Disconnect removes only JunOS’s reference, never the CLI’s login” is good. Reconnect “show[s] … the exact CLI command”—that implies the user leaves the app for a terminal, while the state is still `needs_login` inside JunOS. Not contradictory, but the doc never says whether JunOS polls for login success or waits for manual Refresh—so Reconnect as a button is incomplete.

---

## Gaps

**Product / system**

- No probe→state machine: what commands, timeouts, exit codes map to each state; how often probes run; what happens mid-stream if login expires.
- No streaming/error contract for adapters (partial JSON, tool-use failures, non-zero exit after tokens already streamed).
- Effort mapping: “n/a for this model” vs disabled for provider—unclear when the control vanishes vs greys out; no default when switching models.
- Cost guard: `maxRunsPerDay` / `preferCheapModel` — who sets them, where in UI, interaction with the 80% yield rule, what “prefer cheap” means when only one model is connected.
- Concurrency “probably 1–2” is an open question sitting under ship-critical routing; queueing behavior when at limit is unspecified.
- No mention of multi-machine / shared home directory / WSL vs native Windows CLI paths (Jonas is on win32)—high for a CLI-subprocess product.

**Connections screen (Operate job)**

- No **one question** for the screen (app-screens §2.2). Candidates: “Which providers can answer right now?” or “How much of my shared caps are left?” The brief piles both without choosing which leads.
- No first-run / empty path: zero CLIs installed, none logged in, all “coming.”
- No loading / probe-in-progress / stale probe time (freshness stamp is a studied pattern for this kind of data).
- No error-inside-the-row pattern (probe failed vs needs login vs rate limited).
- Routing UI (default model, drag fallback, overrides, cost guard) is named but not placed—same screen, separate Routing view, or buried in chat settings? Settings house rule: **one view per area**; this doc dumps Connections + Routing + Budget into one mental page.
- No copy for Inbox notice when background jobs yield—tone, severity, recover action.
- Accessibility/responsive: not mentioned (CLI command as primary reconnect is hostile on phone and to non-terminal users).

---

## Unrealistic scope

- **Five providers in one connections model**, with Grok admitted as unproven and Cursor/Nous at “verify,” still shapes the same UI surface (plan, meter, models, reconnect). Shipping shape should be “two high-confidence adapters + explicit stubs,” not a full peer card grid.
- **“Capability probe + runner” for every vendor** plus streaming JSON modes that “change flags often” is a permanent integration tax; Phase 1 spike is named but the Connections UI is written as if meters and model lists already exist.
- **Shared subscription budget scheduler** (yield at 80%, Inbox notice, local counts vs real meters) is a product of its own; treating it as a bullet under routing underestimates UX and correctness work.
- **Drag-reorder fallback + per-task + per-workflow overrides + cost guard** is three policy layers before the user has reliable `connected` on two CLIs.

---

## Security / privacy risks

The “don’t extract tokens” rule is the strongest part of the doc. Remaining risks the spec leaves open:

1. **Subprocess = full user authority**  
   Official CLI still inherits the user’s files, network, and often tools. JunOS “not extracting tokens” does not bound what a routed agent run can do once the CLI is up. No mention of cwd sandbox, env scrubbing, or which secrets appear in prompts/logs.

2. **Logging and message headers**  
   “answered by Sonnet via Claude, fell back from Codex” leaks provider/model into UI (and likely logs). Fine for a personal daemon; dangerous if chats sync, get exported, or are shown on shared screens—unaddressed.

3. **Showing the “exact CLI command”**  
   Useful, but commands and paths can expose usernames, install locations, or account emails in screenshots/support. Spec should say: display vs copy-to-clipboard, redact home paths.

4. **Nous “or key”**  
   Reintroduces secret storage the title rejects. Needs vault rules, never-log, never-render full key—or drop keys from this doc’s approach.

5. **Browser-session adapter (Grok)**  
   Explicitly floated. That is the fragile/ToS-adjacent path the intro rejects for OAuth scraping. Even as a spike option it weakens the security story; open questions correctly lean “ship without,” but the table still legitimizes it.

6. **Rate-limit / usage data**  
   Persisting “last 429” and local run counts is telemetry about the user’s work volume. Retention and whether it leaves the machine are unspecified (privacy-relevant for a personal OS).

7. **Disconnect vs reconnect**  
   Clear that Disconnect doesn’t log out the CLI—good. Missing: whether JunOS can *invoke* `claude login` / open a browser (phishing-adjacent if spoofed) vs only showing a command the user runs.

---

## UI / design quality (hierarchy, spacing, type, density, motion, legibility, contrast)

Read as an app **settings / connections** screen (Operate: familiarity and scanability over expression).

**Hierarchy / composition**

- The screen paragraph is a laundry list: plan name, method label, usage meter, reset, models, Reconnect/Disconnect. That reads as **one card per provider with every field always on**—peer card grid + status chrome, which app-screens flags unless peers are truly equal and sparse. Prefer: status + one lead figure (can run / can’t) + one primary action; meter only when it’s the screen’s question.
- No page title, no one finding (“2 of 4 ready · Claude near cap”), no primary job one click away (Reconnect on the failing row, not a global button).
- Method label **“Signed in via CLI”** is interface-about-interface copy; trade words would be “Claude Code · logged in” / “CLI not found.”
- Eyebrow-like method labels and status stacks invite **tiny uppercase / pill badges**—banned tell on pages; on app screens status pills are allowed only with limits (sentence case, ≥11px, high contrast pairs). Spec doesn’t constrain that, so implementers will default to rainbow status chips.

**Density / spacing**

- Five providers × (meter + models + two actions) is medium-dense settings content without a defined row pitch or “label column + panel” settings layout (§8.2). Risk: either cramped multi-metric cards or large empty card frames when meters are “n/a.”
- Models unlocked as a list inside each card will blow vertical rhythm; no disclosure (“3 models”) or separate model picker ownership (chat vs connections).

**Typography / legibility**

- Effort scale Low/Medium/High/Max and “n/a for this model” need a disabled pattern that **stays legible and says why** (§8.1)—spec only says “disables the control.” Classic failure: grey-on-grey “n/a.”
- CLI reconnect commands are monospace-by-nature; app rules allow mono for real commands/IDs—spec should place them in a joined read-only field + Copy (§8.1), not as running body text.
- Fallback string in message headers will fight chat hierarchy if it’s long; no max length or secondary-meta size.

**Usage meter / contrast / meaning**

- Meter without both-end labels (“12.7k of 20.0k”) and without **good/bad direction** (usage up is usually bad) will look like a decorative progress bar. Local counts labeled like a plan meter is a trust failure, not just a data gap.
- `rate_limited` with reset time needs one semantic warning treatment (notice strip), not red-as-texture on every row.

**Motion**

- Operate: 150–250ms, state not choreography; no page-load theater. Spec is silent—good by omission—but drag-reorder fallback needs motion that confirms order (short), and probe refresh should update a freshness stamp, not pulse the whole card.

**States the UI must own (currently missing)**

| State | Design need |
| --- | --- |
| First run | Frame + title + install/login as the data area action |
| Probing | Skeleton at real row height, labels visible |
| Coming (Grok) | Distinct from `unavailable` CLI missing |
| Partial (models() empty) | Define vs `degraded` |
| Yielded jobs | Inbox notice pattern, not only a log line |
| Budget threshold | Configurable 80%—where edited, how previewed |

---

## Highest-leverage fixes (spec-only)

1. Split **Connections** (probe, login, disconnect) from **Routing & budget** (default, fallback order, caps)—two views, two h1 questions.  
2. Define `degraded` or delete it; add `coming` / `unsupported`.  
3. Make usage display **honest by type**: provider meter vs local runs vs unknown—never one interchangeable bar.  
4. Narrow v1 providers to high-confidence rows; stubs without peer meters.  
5. Drop or isolate Nous keys and Grok browser-session from the “official client only” story.  
6. Specify Reconnect as copy-command + poll/refresh, with row-level primary action and in-row errors.

---

Questions skipped: full impeccable dual-assessment critique (no live UI target; Ask mode; context launcher unavailable). I can go deeper on routing precedence or a wireframe-level Connections layout next if you want that.
