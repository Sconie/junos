**Verdict:** The doc defines a strong scheduling/execution model, but the UI it sketches is two half-products (ops table + card launcher) for one runner, with high cognitive load, thin visual encoding, and several security-sensitive capabilities left as one-liners. Mode: **Operate / app screen** (impeccable + tasteskill app-screens). No mockup, PRODUCT.md, or DESIGN.md in-repo to ground “matches mockup.”

---

### Contradictions

1. **Task vs workflow identity** — Opening: a Task can be “a prompt (or workflow) on a schedule.” UI then splits **Tasks** (table + drawer with a prompt) from **Workflows** (card grid). A Morning briefing with `triggers: [{ type: cron }]` could appear in either surface, or both, with no ownership rule.
2. **Status model ≠ tabs** — Lifecycle: `queued → running → waiting_approval → succeeded | failed | cancelled`. Tabs: All / Running / Paused / Failed. No place for waiting approval, cancelled, or “succeeded but noisy”; Paused is not a lifecycle state.
3. **Output destinations disagree** — Task drawer: chat, file, Inbox, **notification**. Workflow `output`: inbox, file, chat, **kanban card**. Same runner, different sinks.
4. **Hermes is three things** — Table “target (model or Hermes)”, step type `hermes`, and an open question on who executes. Spec cannot ship both “Hermes is target” and “Hermes owns execution” without picking one.
5. **Acceptance vs product surface** — Acceptance requires an Inbox result; scheduling UI offers other destinations. Either acceptance is incomplete or destinations are aspirational.
6. **“Form + YAML” vs launcher** — Open question settles on form + YAML; Workflows section only describes a parameter form on Run. No home for definition editing (list vs drawer vs separate editor).

---

### Gaps (product + UI)

| Gap | Why it matters |
| --- | --- |
| No screen question / h1 / primary action | App-screens: first screen answers one job; create vs run vs fix-failures is undefined |
| Empty / zero / loading / error | Operate requires them; zero tasks and “daemon down” are only a vague warning |
| Create / delete / duplicate / rename | Edit exists; birth and death of objects do not |
| `waiting_approval` in Tasks UI | Lifecycle has it; Tasks screen does not |
| Logs / `run_step` presentation | Step I/O can hold mail/calendar/repo content; no redaction, truncation, or density rules |
| Timeline encoding | “24-hour strip” with no marks for success/fail/running/overlap, selection scope, or TZ |
| Dry-run meaning | Toggle only; no preview of steps, tools, or side effects |
| Shell allowlist UX | Capability named; who edits allowlist, where it lives, how approval differs from allowlist |
| Timezone / sleep warning UX | Policy text only; no placement, severity, or remediation CTA |
| Phone / narrow layout | Ops table + drawer + timeline will collapse badly; unmentioned |
| Motion / live update | Running tab implies live data; Operate forbids decorative motion but needs honest refresh |

---

### Unrealistic scope

Shipping **six starters** that touch calendar, mail, news, Inbox, GitHub CI across repos, Kanban, Files context menus, and Scout, plus **event webhooks**, **branch/approval/shell/hermes** steps, catch-up `run all`, overlap `queue`, and retries—while the UI is still “table + cards + YAML”—is a platform, not a v1 Tasks page.

Especially heavy for a laptop-resident daemon: `run all` catch-up after sleep can stampede paid model/tool calls; the doc warns about sleep but does not bound blast radius in UI (estimate, confirm, cap).

Visual flow editor is wisely deferred; keeping `branch` + multi-input `input: [gather, calendar]` in YAML without a readable run graph still asks users to debug DAGs in a drawer/logs.

---

### Security / privacy

- **`shell`** — “approval unless allowlisted” is the highest-risk step; allowlist without audit UI, scope, or path constraints is a footgun.
- **Webhook (localhost + token)** — Token storage, rotation, binding to workflow, and what the payload may trigger are unspecified. Localhost helps; stolen token still fires agent work.
- **`run_step` records full input/output** — Morning briefing / Inbox triage / mail digest will persist PII and secrets-adjacent content in logs reachable from “Logs.” No retention, access, or redaction policy.
- **Repo health / Scout / mail / calendar** — Broad credential reach implied by starters; no least-privilege or “this workflow can access X” surface.
- **Dry-run next to Run** — Easy to miss; dangerous if dry-run still hits tools.
- **Chat `/workflow` and event triggers** — Invocation paths multiply; no authz model for who may start what.
- **Approval only via Inbox** — If Inbox is missed or auto-handled elsewhere, `waiting_approval` can stall or be bypassed depending on unstated rules.

---

### UI / design quality (skills lens)

**Hierarchy & IA**  
Tasks packs tabs + wide table (7+ columns) + 24h timeline + side drawer into one screen—classic ops density without a stated **one question** (“What failed?” vs “What’s next to fire?”). App-screens: put failures / needs-decision above long tables; here Failed is only a tab, and `waiting_approval` is invisible.

Workflows as a **uniform card grid** (name, description, last run, Run) matches a generated-launcher tell: peer cards are allowed for peer objects, but six thin identical cards with no primary ranking (pinned, recently run, failing) reads as a tray, not a product face. Impeccable Operate: prefer familiar list/table consistency with Tasks over a second visual language unless the card carries something only a workflow has (step count, last failure, next trigger).

**Spacing & density**  
Row actions **Run now / Pause / Edit / Logs** = four peer actions per row (cognitive-load flag at >4 visible options when combined with tabs + schedule modes). Schedule builder Hourly/Daily/Weekly/Custom + “next 5 run times” in a drawer competes with prompt + model + destination + history—drawer will scroll into a settings novel. Timeline + full table both want horizontal space; on ≤1280px something must yield (spec doesn’t say which).

**Typography & legibility**  
No type scale, status vocabulary, or tabular-figure rules for cron / next run / duration. Cron beside “human text” needs a clear primary (human) and secondary (expression), or the column becomes noise. Logs of multi-step I/O need mono **only inside real log/code blocks** (both skills); the rest should stay UI sans.

**Contrast & colour**  
Status column will attract traffic-light chrome. App-screens: colour on **data/state that needs a decision**, not on every row; Failed / waiting_approval earn hue; Running/Paused stay quiet marks. Timeline without distinct marks for fail vs success fails the “restraint hid meaning” test.

**Motion**  
Unspecified—good default for Operate (150–250ms state only; no entrance choreography). Spec should explicitly say: live Running updates via quiet status change, not animated timeline fireworks.

**Forms & patterns**  
“Small form” on Run is fine; dumping definition editing into the same modal is not. Side drawer for task edit matches a right-rail pattern; don’t also use a modal for the same object. YAML-in-UI needs an explicit **Read** submode (legible measure, diff on save)—not a monospace blob in a card.

**What’s missing for craft**  
No product-specific signature element (e.g. next-fire strip as the hero data, or a single “needs you” queue). “Matches mockup” with no mockup in-repo means implementers will fill gaps with dashboard kit defaults the skills ban (KPI tiles, icon cards, zebra tables, uppercase headers).

---

### Highest-leverage spec fixes (design-facing)

1. **One object model in the UI** — Scheduled runs live in Tasks; Workflows is definitions + manual/event launch—or one list with a type column. Kill double listing.
2. **Align tabs to lifecycle** — Include Needs approval; map Paused; decide where succeeded/cancelled go.
3. **First screen job** — e.g. primary “New task”, secondary filter to Failed + waiting; timeline answers “what fired today,” not decoration.
4. **Replace or upgrade the workflow card grid** — Prefer a table consistent with Tasks, or cards that show next trigger / last outcome as the data hue.
5. **Specify timeline + status marks** (and TZ) at the level of the calendar house rules—kinds of run, not a generic strip.
6. **Bound dangerous powers in UI** — shell allowlist, dry-run preview, catch-up confirm, log redaction/retention.

I did not run browser/detector checks; this is a spec-only review under Operate / app-screen rules.
