**Verdict:** As an Operate-surface brief, this doc specifies a dense cron/ops console without a single primary job, conflates task-level and run-level state, and leaves security-sensitive execution (shell, webhooks, full step I/O) underspecified. UI guidance is IA-only; against the app-screen / Operate lens it reads like a template dashboard waiting to become illegible.

Mode: **Operate** (tasks table + workflows launcher). No `PRODUCT.md` / `DESIGN.md` in repo; this is a **spec-only** review (no rendered UI).

---

### Contradictions

1. **Two ways to schedule the same thing.** A Task is “a prompt (or workflow) on a schedule,” but workflows also declare `triggers: [{ type: cron }]`. Unclear whether a cron workflow *is* a Task, creates a Task, or bypasses the Tasks screen entirely—and which UI owns pause / next-run / catch-up.

2. **Tabs ≠ lifecycle.** Tabs are All / Running / Paused / Failed. Lifecycle is `queued → running → (waiting_approval) → succeeded | failed | cancelled`. **Paused** looks like schedule state; **waiting_approval**, **queued**, and **cancelled** have no home. Filtering “Running” while many rows are waiting on Inbox will confuse operators.

3. **Output destinations disagree.** Task drawer: chat, file, Inbox, **notification**. Workflow `output`: inbox, file, chat, **kanban card**. Notification vs kanban is unresolved; “Inbox result” in acceptance criteria doesn’t match all destinations.

4. **Editing model vs open question.** Body implies a rich form drawer + schedule builder; open questions still debate “form + YAML” vs visual editor. Implementers get two authorities.

5. **Hermes role.** Columns say target is “model or Hermes”; open question still asks whether Hermes owns execution. “Target” vs “executor” is not locked.

---

### Gaps (product / IA)

- No **primary job** for the first screen (monitor failures vs author schedules vs launch workflows)—app-screens expect one frequent job one click away.
- **Paused** vs run states, and whether tabs filter tasks or runs, never defined.
- **Empty / loading / error** for table, timeline, drawer, workflow grid—required for Operate, absent here.
- Timeline: encoding for success / fail / approval / overlap-skip, click behavior, timezone label, what “today” means if TZ ≠ local.
- Retries: “N attempts with backoff” with no N, backoff, or partial-success rules for multi-step workflows.
- Catch-up `run all` and overlap `queue`: no caps → storm risk (scope + reliability).
- `branch` / `approval` / dry-run: no UX for inspecting branch predicates, or whether dry-run skips tools/shell/outputs.
- Dual entry to history (“Logs” action vs drawer “run history”) without a rule.
- Phone / narrow layout: none (app-screens treat this as first-class).
- Cross-links (`scout`, Files right-click, `/workflow`) named but ownership and deep-link UX not specified.

---

### Unrealistic scope

Shipping in one slice: cron + one-off + catch-up/overlap + retries + daemon sleep semantics + workflow DAG (`prompt` / `tool` / `hermes` / `shell` / `branch` / `approval` / `output`) + four trigger classes + webhook + chat slash-command + six starters (mail, calendar, multi-repo CI, kanban, files, scout) + YAML editing + optional flow editor later.

That’s closer to an automation platform than a v1 Tasks page. Acceptance criteria only cover daily task + daemon restart + one approval path—far narrower than the feature list, which is a red flag for cut scope.

---

### Security / privacy risks

| Risk | Why it matters |
| --- | --- |
| **`shell` + allowlist** | Allowlist is a privilege boundary; no who-edits, storage, or audit. |
| **Webhook (localhost + token)** | Token lifecycle, rotation, binding to workflow, and behavior if the port is tunneled are unspecified. |
| **`{{params}}` in prompts** | Untrusted / wide params → prompt injection into later steps and tools. |
| **Full `run_step` I/O** | Morning briefing (mail/calendar), repo health, file summarise → secrets and PII in durable logs; no retention, redaction, or access control. |
| **Inbox on failure / approval** | Sensitive step output may land in a shared attention surface. |
| **Dry-run** | If it still hits calendar/mail/shell, “dry” is misleading. |
| **Event triggers** | `inbox.item.approved` → workflow → more Inbox can loop; no debounce/idempotency. |
| **Files summarise** | Path scope and secret-file exclusion not stated. |

---

### UI / design quality (impeccable Operate + design-taste app-screens)

**Hierarchy & composition**  
Tabs + full table + 24h timeline + kitchen-sink drawer is multiple compositions fighting for the first viewport. App-screens: on ~1440×900, named blocks should show header + first rows without the screen feeling like a stacked template. Timeline and table both narrate “runs”—pick one as primary (timeline as glance, table as work), demote the other.

**Workflows “grid of cards”**  
Identical cards (name, description, last run, Run) is the default launcher pattern. For an Operate product, a scannable list/table with one primary Run and status in type/data hue usually beats a card grid. If cards stay, they need a product-specific signal (not icon tiles / tinted chrome)—the brief gives none.

**Density & cognitive load**  
Four row actions (Run now, Pause, Edit, Logs) exceeds a comfortable visible option set—prefer one primary + overflow. Drawer packs authoring, scheduling, destinations, and history: Operate prefers progressive disclosure over modal-as-first-thought.

**Typography & legibility**  
“Cron plus human text” in one column will wrap/clash (tabular times vs prose schedule). No type scale, measure, or tabular-figure rule. YAML in UI is fine as real code; competing form + YAML without a clear primary editor splits attention.

**Color / contrast / status**  
Failed/Paused as chrome (tabs) invites color-on-chrome; app-screens want color on data (status cell, timeline marks). Sleep warning has no placement/severity pattern → likely low-contrast banner or noisy toast.

**Timeline**  
“Strip of today’s runs” with no mark system will become colored dots. App-screens’ calendar/timeline rules (kind marks, today in data hue, labels that don’t collide) are exactly what this needs and the doc omits.

**Motion**  
Unspecified. Operate: 150–250ms, state only—no load choreography, no glow/pulse on Running. Spec should ban decorative motion explicitly or runners will add it.

**Empty & failure UX**  
No teaching empty state for zero tasks; no “catch-up skipped while asleep” presentation beyond a vague warning—high-stakes reliability moment with no reassurance pattern.

**Design specificity**  
Nothing in the brief is Junos-specific (no signature element, trade vocabulary, or shell identity). As written, this could be any cron admin. That’s a taste/Operate miss: quiet chrome, distinctive data.

---

### Highest-leverage doc fixes (if you edit later)

1. One scheduling authority: Task *or* workflow cron—not both without a mapping.  
2. Align tabs with task vs run state; give `waiting_approval` a first-class filter or badge.  
3. Cut v1 surface: table + drawer *or* timeline detail—not both fully featured; workflows as list; YAML secondary.  
4. Cap catch-up/queue; define log retention/redaction; lock shell allowlist + webhook token rules.  
5. Add Operate UI non-negotiables: primary job, empty/error, status color-on-data, timeline marks, reduced-motion, no card-grid chrome.

I can go deeper on any one section (e.g. only security, or a proposed IA rewrite) if useful—Ask mode, so I won’t edit the file unless you switch modes.
