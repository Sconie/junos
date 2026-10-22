**Verdict:** The doc defines a capable shared runner, but the Tasks UI and Workflows UI are under-specified as Operate surfaces, overlap conceptually, and leave shell/webhook/param paths under-secured. Mode: **Operate** (work screens). No PRODUCT.md / DESIGN.md in repo; critique is doc-only (no live UI to inspect).

---

### Contradictions

1. **Task vs workflow scheduling** — A Task is “a prompt (or workflow) on a schedule,” while Workflows also take `cron` triggers. Unclear whether scheduling a workflow creates a Task row, a Workflow run schedule, or both. The Tasks table columns (`schedule`, `target`) don’t map cleanly onto multi-step workflows.

2. **Lifecycle vs filter tabs** — Run lifecycle: `queued → running → (waiting_approval) → succeeded | failed | cancelled`. Tasks tabs: All, Running, Paused, Failed. No tab for queued / waiting_approval / cancelled / succeeded; “Paused” is a task state, not a run state — never defined.

3. **Output destinations diverge** — Tasks: chat, file, Inbox, notification. Workflow `output`: inbox, file, chat, kanban card. Notification vs kanban is inconsistent for one runner.

4. **Hermes role** — Open question asks whether Hermes owns execution; body already treats Hermes as a **target** and a **step type**. Proposal and surface language should match.

5. **Editing model** — “JSON, editable as YAML” + “form + YAML” + open “Visual flow editor vs YAML only?” Three stories without a single source of truth for validation errors, diffs, or invalid YAML.

6. **Approval semantics** — `shell` “needs approval unless allowlisted” and a separate `approval` step both pause into Inbox. Unclear whether allowlisted shell skips Inbox, whether branch can skip approval, and whether one Inbox item covers a whole run or one step.

---

### Gaps

| Area | Missing |
|---|---|
| **Objects / jobs** | No inventory of primary job on first paint (app-screens §2.1–2.2): glance status? start a run? fix failures? |
| **States** | Empty, zero, loading, partial failure, daemon-down, offline laptop — only a vague “warning if laptop sleeps” |
| **Waiting approval** | How it appears in table, timeline, drawer, and badges |
| **Workflows when cron-triggered** | Catch-up, overlap, retries, timezone — specified only under Tasks |
| **Params from chat / webhook / events** | How `/workflow name` and event payloads bind to `params`; validation; required vs default |
| **Dry-run** | Meaning for `tool`, `shell`, `hermes`, `output` (no side effects? mock tools?) |
| **Branch** | Expression language, failure if prior step missing, UI for editing conditions |
| **Logs** | Retention, PII redaction, size limits, who can open “Logs” |
| **Timeline** | Scale, overlapping runs, failed vs success marks, click → drawer/logs, timezone of “today” |
| **Create / delete / duplicate** | Only Edit / Pause / Run now implied |
| **Permissions** | Who can Run now, edit allowlists, approve Inbox items |
| **Mobile** | No phone composition; drawer + table + timeline won’t survive collapse without a plan |
| **a11y** | Focus order in drawer, table keyboard ops, status not by color alone |

---

### Unrealistic scope

For one spec slice this is a full automation platform:

- Scheduler with cron, one-shots, catch-up, overlap, retries, timezone  
- Multi-step engine: prompt, tool, hermes, shell, branch, approval, output  
- Triggers: manual, cron, domain events, localhost webhook, chat slash, Files right-click  
- Six starter workflows spanning calendar, mail, news, Inbox, repos/CI, Kanban, Scout  
- Ops UI: filterable table, 24h timeline, dense side drawer, card launcher, param form, YAML editor  

Ship risk: dual IA (Tasks table vs Workflows cards) plus YAML + forms before the runner policies are unified. Starters 3 and 6 pull whole other product areas into v1 acceptance.

Acceptance criteria are thin relative to that surface (one daily task, daemon restart, one approval path) — they don’t cover webhook, shell allowlist, branch, catch-up, or timeline correctness.

---

### Security / privacy

1. **`shell` + allowlist** — Highest risk. Spec doesn’t define allowlist format, path/arg constraints, env secrets, cwd, network, or audit of who changed the list.

2. **Webhook (`localhost`, token)** — Token-in-URL/header, rotation, rate limits, and binding to a workflow id are unspecified. Localhost still means any local process (or anything that can hit loopback) can fire runs; event → workflow → shell chains amplify that.

3. **Prompt/param injection** — `{{topics}}` (and event/chat/webhook params) into prompts and possibly shell/tool args needs escaping rules; untrusted webhook/chat input is classic injection into agent/tool steps.

4. **Morning briefing / mail / calendar** — Aggregating mail and calendar into Inbox/files/notifications without retention, redaction, or “don’t leave the machine” rules is a privacy hole for a personal daemon product.

5. **Repo health across “Jonas’s repos”** — Hardcodes personal identity; also implies broad VCS/CI token scope. Prefer “configured remotes” and least privilege.

6. **Run logs** — “Every step records input, output” can store secrets from tools/mail/shell. No redaction or encryption-at-rest note.

7. **Approval bypass** — Allowlisted shell + event/webhook triggers can automate privileged actions with no human in the loop; that needs an explicit threat model, not only Inbox approval for non-allowlisted cases.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

These screens are **Operate**: scanability, density with restraint, color on data/state, one primary job — not marketing composition.

**Hierarchy & density**

- Tasks packs tabs + table + 24h timeline + side drawer (name, prompt, model/effort, schedule builder with next 5 times, destinations, history/logs). That is multiple jobs on one canvas; app-screens wants every named block’s header + first rows on first paint and **one frequent job one click away**. Spec never names that job or what collapses below the fold.
- Timeline + status column + Failed tab compete to answer “what went wrong?” without a stated visual priority (failed runs as the one data hue vs chrome).

**Workflows “grid of cards”**

- Identical cards (name, description, last run, Run) is the default generated pattern. App-screens favors tables/lists for work queues and warns against decorative card chrome. Prefer a **list/table of workflows** (same vocabulary as Tasks) or a single launcher row; cards only if the card *is* the interaction — and even then, avoid icon-in-tinted-square / soft shadow kits the house style rejects.

**Drawer as settings dump**

- Schedule builder (Hourly/Daily/Weekly/Custom + next 5) + prompt + model/effort + destinations + history is a form + log viewer in one rail. Operate guidance: progressive disclosure; don’t make modal/drawer the first thought for everything. Split **configure** vs **last run / logs** (or tabs inside the drawer with a clear default).

**Typography / spacing / contrast**

- No type scale, table density (row pitch), or status encoding. App-screens: small page titles (~24px median), color on meaning (~3% colored pixels), tables as rules/alignment (no zebra), zeros as zeros, missing as grey dash. Spec only names columns — implementers will invent KPI-tile status pills and rainbow badges.
- Cron + “human text” in one column needs hierarchy (human primary, cron secondary/mono only if it’s real code — house taste dislikes costume monospace for labels).

**Motion**

- None specified. Operate: 150–250ms, state only (row expand, drawer open, run status), no page-load choreography. Timeline “live” updates need reduced-motion behavior.

**Legibility of schedule & timeline**

- “Next 5 run times” is good reassurance; catch-up `run all` can flood the 24h strip — needs aggregation or a “backfill” affordance so the strip stays scannable.
- Daemon-down / sleep warning is correct emotionally (high-stakes miss) but unspecified placement (banner vs per-row vs empty timeline).

**Emotional / trust gaps**

- Failure → Inbox `failure` item is good peak-end hygiene; missing: inline retry from Failed, clear “last error” in the table without opening Logs, and waiting_approval as a first-class calm state (not buried in Running).

**Copy / IA**

- “Tasks (crons) and Workflows” leads with implementation jargon. Trade words (“Morning briefing”, “Paused schedules”, “Needs approval”) beat template nouns (“status”, “target”, “actions”).
- Open questions belong in the doc, but shipping UI that “matches mockup” while editor and executor ownership are undecided will bake the wrong IA.

---

### Priority fixes (if you tighten the doc next)

1. **One object model** — Scheduled thing vs reusable definition vs run; one place for catch-up/overlap/retry/timezone.  
2. **Align tabs/columns with lifecycle** — Including waiting_approval, paused task vs cancelled run.  
3. **Threat model paragraph** — Shell allowlist, webhook auth, param binding, log redaction.  
4. **Tasks screen job + hierarchy** — What wins the first viewport; timeline and drawer as secondary.  
5. **Workflows as a work list**, not a marketing card grid; share table language with Tasks.  
6. **Cut or phase starters** — Especially repo-wide CI and Scout — until the runner and approvals are solid.

I can go deeper on a rewritten IA outline for the Tasks screen only, or a threat-model checklist for shell/webhook — say which you want.
