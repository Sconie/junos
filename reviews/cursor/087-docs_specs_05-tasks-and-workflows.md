**Verdict:** The runner model is clear, but the UI half reads like a generic ops console bolted onto an ambitious automation platform. Gaps and security holes are larger than the contradictions; the specified chrome (tabs + dense table + timeline + drawer, and a workflow card grid) fights Operate / app-screen craft.

Mode: **Operate** (tasks/workflows are work screens). No PRODUCT.md / DESIGN.md in repo; critique is of this spec only (no live UI to measure).

---

### Contradictions

1. **Task vs scheduled workflow** — A Task is “a prompt (or workflow) on a schedule,” while Workflows also take `triggers: [{ type: cron, … }]`. Unclear whether a cron workflow appears in Tasks, Workflows, both, or neither. Scheduling rules (catch-up, overlap, retries) sit only under Tasks.
2. **Lifecycle vs Tasks chrome** — Lifecycle includes `queued`, `waiting_approval`, `cancelled`. Tabs are All / Running / Paused / Failed. No home for waiting-on-approval, cancelled, or succeeded; “Paused” is not in the lifecycle enum.
3. **Output destinations** — Task drawer: chat / file / Inbox / notification. Workflow `output`: inbox / file / chat / kanban card. Notification vs kanban diverge with no mapping.
4. **Hermes role** — Open question asks who owns execution; body already makes Hermes both a Task **target** and a Workflow **step type**. Scheduling vs execution ownership stays unresolved while the UI assumes both.
5. **“Form + YAML” vs graph steps** — Steps use `input: [gather, calendar]` and `branch`. A flat form + YAML editor does not match a DAG/branch model without a third representation (or severe limits the doc never states).

---

### Gaps

| Area | Missing |
| --- | --- |
| Drawer vs policies | Catch-up, overlap, retries, timezone are specified in rules but not in the side-drawer fields |
| Approval UX | “Pauses and posts Inbox item” — no resume affordance on Tasks, deep-link, or timeout |
| `waiting_approval` | Not in tabs, columns, or timeline |
| Empty / loading / error | Zero empty-state, skeleton, or partial-failure UI (app-screens treat these as required) |
| Timeline | No selection, filter, density, legend, or overflow when many runs share an hour |
| Workflow triggers UI | Events / webhook / `/workflow` listed; launcher only covers manual Run + params |
| Dry-run | Toggle named; behavior for `tool` / `shell` / `output` / side effects undefined |
| Allowlist | `shell` “unless allowlisted” — no who edits allowlist, scope, or audit |
| Logs privacy | Full step I/O persisted; no retention, redaction, or secret scrubbing |
| Responsive | Desktop table + drawer + timeline only |
| A11y | No keyboard path for drawer, timeline, or row actions |
| Mockup | “Matches mockup” with no linked artifact or tokens |

Acceptance criteria also skip overlap/catch-up UI, webhook/event paths, and branch/retry-from-step.

---

### Unrealistic scope

Shipping together: seven step types, five trigger kinds, catch-up/overlap/retries, 24h timeline, YAML editor, param forms, dry-run, six starters that pull calendar, mail, multi-repo CI, Kanban, Files, and Scout.

Highest risk cuts for a credible v1:

- Drop or defer `branch`, webhook, and event triggers; keep manual + cron.
- One scheduled object model (either Tasks wrap workflows, or workflows own cron — not both).
- Timeline as a later density feature; table + drawer first.
- Starters that need mail/Scout/multi-repo until those surfaces exist.

“Catch-up: run all” after sleep plus LLM steps is especially costly and surprising; the laptop-sleep warning is not enough without spend/side-effect guardrails.

---

### Security / privacy

- **`shell` + allowlist** — Local code execution; allowlist mistakes are full machine compromise. Needs explicit approval UX, command preview, and audit — not only “needs approval.”
- **Webhook (localhost + token)** — Token in config/logs/chat history; no rotation, binding, or replay rules.
- **Step I/O in `run_step`** — Morning briefing (calendar/mail) and triage store sensitive content in run history shown in the drawer.
- **Param interpolation `{{topics}}`** — User/agent-supplied params into prompts/tools → injection into later steps (especially `shell` / `hermes`).
- **`output` to file** — No path sandbox or overwrite policy.
- **Trigger loops** — `inbox.item.approved` ↔ workflows that `output` to inbox can recurse; `scout.finding` similarly.
- **Chat `/workflow`** — No authz (who may launch; which params).
- **Dry-run ambiguity** — If dry-run still hits tools/network, it is a false safety signal.
- **Repo health across “Jonas’s repos”** — Broad token scope implied; privacy blast radius if logs mirror CI/PR titles.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

**Hierarchy & job** — First screen should answer one job (usually: what failed / what runs next / run something). Spec stacks four competing primaries: filter tabs, seven-column table, timeline strip, and a kitchen-sink drawer. App-screens: every named block should show header + first rows, and the frequent job one click away — here “Run now” is buried in per-row actions next to Pause / Edit / Logs.

**Workflows card grid** — “Grid of cards (name, description, last run, Run)” is stock launcher chrome. App-screens prefer quiet lists/tables, colour on data not chrome, flat surfaces. Identical Run cards read as template, not product-specific (no signature element for *this* automation surface).

**Density & spacing** — Table columns: status, name, schedule (cron + human), target, last, next, actions. Cron + prose in one cell will wrap or truncate; four row actions without an overflow menu is noisy. Drawer packs identity, prompt, model, schedule builder, destinations, and history — no progressive disclosure or section hierarchy.

**Typography** — No scale: schedule human text vs cron vs log monospace vs drawer labels. Operate wants one family, tight rem scale, tabular figures for times — unspecified, so implementers will invent a third size for every column.

**Timeline craft** — App-screens calendar/timeline rules (pitch, marks per kind, legend from kinds, today line, weekend tone) are absent. A decorative 24h strip with undifferentiated run marks will fail contrast and meaning (“restraint hid meaning”).

**Status colour** — Failed / Running / Paused need semantic colour on **data**, not tab chrome. Tabs that duplicate the status column add chrome without information.

**Motion** — No guidance. Operate: 150–250ms for state only (run start, pause, approval wait). Avoid timeline animation-as-decoration and drawer choreography.

**Legibility / contrast** — Human schedule + cron; log walls in-drawer; status-only colour without ink labels — all underspecified and high risk for grey-on-grey “soft status.”

**Cognitive load** — Visible decisions pile up: tab filter, row actions, timeline, drawer fields, plus catch-up/overlap/retries (even if only in docs today). Heuristic pressure: error recovery and visibility of system status are weak while `waiting_approval` is invisible on this screen.

**Copy / product face** — Generic nouns (“Tasks”, “Run”, “Logs”). Starters are the only product-specific voice; the shell UI could be any cron product. Missing trade words (“Missed while asleep”, “Waiting on you”, “Last briefing”).

---

### Priority fixes (spec-only)

1. **One scheduling object** and align tabs/columns to the real lifecycle (`waiting_approval` visible).
2. **Shrink v1 surface**: table + drawer; list not card grid; defer timeline/YAML/branch/webhook.
3. **Put policies in the drawer** (or cut them from v1) and define dry-run, allowlist, and log retention/redaction.
4. **Specify Operate chrome**: primary action, status as data, overflow actions, empty/loading/error, timeline marks only if timeline stays.
5. **Close security loops**: shell approval preview, output path rules, trigger debounce/loop guards, webhook token handling.

---

Questions skipped: full `$impeccable critique` dual-agent + detector path (target is a markdown spec, not a viewable UI; Ask mode / no PRODUCT–DESIGN context).
