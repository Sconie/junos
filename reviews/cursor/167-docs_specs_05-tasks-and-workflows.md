Context loading did not run (Ask mode blocked the launcher); no `PRODUCT.md` / `DESIGN.md` in-repo. Review is of this spec only, in **Operate / app-screen** mode (impeccable) with **design-taste app-screen** rules as the quality floor.

---

## Verdict

The doc defines a credible scheduling + orchestration core, but it **blurs Task vs Workflow**, ships a **full orchestration surface** as if it were one screen, and describes UI that defaults to **template ops chrome** (status tabs, action-heavy rows, identical workflow cards, an underspecified timeline) without a single primary question, states, or encoding rules. Security edges (`shell`, webhook, logged step I/O) are named but not constrained enough to build safely.

---

## Contradictions

1. **Task vs workflow ownership of schedules**  
   A Task is “a prompt *(or workflow)* on a schedule,” while a Workflow also has `triggers: [{ type: cron, … }]`. The Tasks table columns (schedule, next run, Pause) and the Workflows “grid of cards” both claim scheduled work. The doc never says which object owns cron, Pause, catch-up, or the 24h strip when a workflow is scheduled.

2. **Status model mismatch**  
   Screen tabs: `All | Running | Paused | Failed`.  
   Run lifecycle: `queued → running → (waiting_approval) → succeeded | failed | cancelled`.  
   No mapping: Is “Failed” the task’s last run, a sticky task state, or “has open failed runs”? Where does `waiting_approval` / `cancelled` / `queued` show? “Paused” is task-level; “Running” is often run-level — same tab row, different nouns.

3. **Output destinations disagree**  
   Task drawer: chat, file, Inbox, **notification**.  
   Workflow `output` step: inbox, file, chat, **kanban card**.  
   Same product concept, two sets; acceptance only exercises Inbox.

4. **Executor target said three ways**  
   Table “target (model or Hermes)”, step types `prompt`/`hermes`, Run form “model/effort override”. Unclear whether Hermes is a target, a step type, both, and which wins on override.

5. **Open question vs shipped step set**  
   “Start with form + YAML” while shipping `branch` (and a dense step graph). Branch without a graph (or a very constrained if/else UI) fights the chosen start; leaving “visual flow editor” open papers over that.

6. **“Matches mockup” with no mockup contract**  
   Hierarchy, density, and chrome are asserted against an external mockup this file never binds (layout regions, type sizes, status encoding). Unverifiable and easy to contradict in implementation.

---

## Gaps

| Area | Missing |
| --- | --- |
| **Screen job** | No one question (“What needs me?” / “What fires next?”). App-screens require this to size the primary block and the primary control. |
| **IA** | Separate Tasks vs Workflows surfaces are implied; when a scheduled workflow appears in which, and how “Run now” relates to Task “Run now”, is undefined. |
| **States** | No empty / loading / error / offline-daemon / zero-runs behavior for table, timeline, drawer, or workflow grid. |
| **Approval UX** | Lifecycle has `waiting_approval`; Tasks UI has no tab, badge, or row treatment for it (only Inbox resume in acceptance). |
| **Timeline** | “24-hour timeline strip” with no mark language (queued vs running vs failed vs approval), legend, stacking for overlap, or click → run. |
| **Table density** | Seven columns + four actions; no truncate/priority columns, sticky identity column, or &lt;900px behavior. |
| **Schedule truth** | Cron + human text + “next 5 run times” + timeline must stay one schedule source; no single-source rule. |
| **Dry-run** | Toggle named; side effects / writes / Inbox items undefined. |
| **Catch-up UX** | Policies named; no preview before `run all` after sleep (high-stakes). |
| **a11y / keyboard** | None (tabs, table, drawer, YAML editor, Run form). |
| **Retention / PII** | Step I/O logged; no retention, redaction, or who can open Logs. |
| **Params** | Types beyond `string`, validation, secrets, defaults vs required. |
| **Allowlist** | `shell` “unless allowlisted” — who edits, scope (cwd/env/network), audit. |

---

## Unrealistic scope

For one “Tasks and Workflows” slice this is a **mini Airflow + cron UI + approvals + webhooks**:

- Seven step types including `shell`, `branch`, `hermes`, `approval`
- Triggers: manual, cron, three product events, localhost webhook, chat `/workflow`
- Six starter workflows spanning calendar, mail, news, Inbox, multi-repo CI, Kanban, Files, Scout
- Catch-up × overlap × retries × daemon sleep, plus YAML authoring in-product

A credible thin cut is closer to: **scheduled prompts + manual workflow run + one approval path + Inbox delivery**, with `shell`/webhook/`branch`/multi-repo health deferred. Shipping all starters implies many other specs (08 Scout, Kanban, Files, mail/calendar tools) are already real.

Starter #3 naming “Jonas’s repos” also freezes personal product copy into the ship list.

---

## Security / privacy risks

1. **`shell` steps** — Local code execution. Approval-or-allowlist is the whole control plane; without allowlist model, audit, and default-deny, this is the highest-risk line in the doc.

2. **Logged step I/O** — “Every step records input, output…” plus Morning briefing (mail/calendar/news) means **Logs are a sensitive store**. No ACL, retention, or export warning.

3. **Webhook trigger** — “localhost, token” only. Missing: bind address, token storage/rotation, rate limits, body size, auth failure behavior, and whether any process on the machine can fire workflows.

4. **Catch-up `run all`** — After sleep/laptop off, replaying many runs can spam Inbox, write files, or re-trigger side effects. Needs confirmation UI and a safe default stronger than burying `skip` in scheduling rules.

5. **Chat `/workflow name`** — Trigger surface from chat; no confirmation, argument injection, or “who can invoke” rules.

6. **File / chat / kanban outputs** — Path and destination scoping unspecified (write anywhere vs app-managed paths).

7. **Hermes / tool steps** — Calendar/mail tools in starters inherit whatever those connectors can read; the workflow doc doesn’t require least-privilege or per-workflow tool grants.

8. **YAML/JSON editing** — Powerful enough to change `shell` and outputs; no mention of validation, diff-before-save, or privilege separation from “Run”.

---

## UI / design-quality (skills lens)

Operate mode: scanability, one job, honest data, quiet chrome. Design-taste app screens: colour on data/status not chrome; tables as rules + alignment; peer “cards” only when careful; timelines kind-encoded; motion = feedback only; no entrance theatre; name the screen’s question and put the frequent job one click away.

### Hierarchy
- Spec leads with **four status tabs + wide table + timeline + packed drawer** with no primary answer block (e.g. next fire / needs approval / last failure). That reads as a generic cron admin, not a product screen with a face.
- Drawer dumps **authoring + scheduling + delivery + history** into one panel → many decision points visible at once (cognitive load). Split: edit definition vs run history vs schedule, or progressive disclosure.
- Workflows as a **uniform card grid + Run** is the marketing “feature card” pattern applied to an ops launcher. Prefer a list/table consistent with Tasks (same objects, different entry), or a tight peer grid with **no** icon tiles / equal empty cards.

### Density & spacing
- Seven columns + four row actions is **dense ops table** territory the app-screen study barely covers; without row pitch, secondary-line rules, and which columns drop first, implementers will ship cramped or zebra/kebab chrome.
- Timeline + full table both “first screen” without sizing: risk of a thin decorative strip and a table that pushes the job below the fold (app-screens: everything named should show header + first rows at 1440×900).

### Typography & legibility
- “Cron plus human text” is the right idea (clarify); specify type roles (human schedule primary; cron secondary/mono only for the expression).
- YAML-in-UI is legitimate monospace-for-code; the spec doesn’t say form-first for normal edits vs YAML as escape hatch — without that, the default UI becomes a code editor (legibility and error cost).

### Timeline / status / contrast
- Timeline needs a **kind/status mark system** (and legend as those marks), not a pretty activity sparkline. Colour-only Failed/Running tabs violate “no information by colour alone” unless every state has text/icon.
- Glass/frosted mockups (if that’s what “matches mockup” means) are high risk for **table + dim secondary text** contrast; this doc never sets contrast or status-on-data rules for the strip or dots.

### Motion
- App screens: **no entrance motion**; feedback only (drawer open, row status, Run press). Spec is silent → easy to animate the 24h strip or card grid “to life” and look generated.

### Template tells the wording invites
- Status filter tabs as the main IA  
- Per-row Run / Pause / Edit / Logs  
- Identical workflow cards  
- Underspecified “timeline strip”  
- Side drawer as catch-all settings  

Those are exactly the generated-dashboard / ops-template moves the skills push against unless constrained.

### Copy / product face
- Trade words help (“Next run”, “Needs approval”, “Daemon was asleep — N runs skipped”) vs generic “Status / Actions”.  
- Laptop-sleep warning is good emotional honesty; specify placement (title row / banner) and the action (“Review catch-up”).

---

## Priority fixes (if you revise this doc only)

1. **One ownership model**: Task = schedule wrapper; Workflow = definition — or collapse to one object. State where cron, pause, timeline, and catch-up live.  
2. **Align statuses**: tabs ↔ run lifecycle, including `waiting_approval`.  
3. **Name the Tasks screen question** and the one primary control; demote the drawer and timeline to support that answer.  
4. **Encode the timeline** (marks, legend, click target) or cut it from v1.  
5. **Shrink v1 step/trigger/starter set**; put `shell`, webhook, `branch`, and multi-repo health behind explicit later gates with security notes.  
6. **Define log sensitivity + shell allowlist + catch-up confirmation** before acceptance criteria.  
7. **Replace “grid of cards”** with a list pattern (or strict peer-card rules: no icons-in-tiles, real last-run data, ragged/orphan rules).  
8. **Add empty/loading/error/offline and &lt;900px** behavior in one short subsection.

I’m in Ask mode, so I can’t edit the file; switch to Agent mode if you want those revisions applied.
