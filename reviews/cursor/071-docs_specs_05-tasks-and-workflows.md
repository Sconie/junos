**Verdict:** The doc describes a capable scheduler + mini-orchestration product, but the Tasks and Workflows surfaces fight each other, the UI sketch is a dense “admin template” (tabs + table + timeline + drawer + card grid), and security/privacy for logs, shell, and catch-up is underspecified for something that can touch mail, calendar, repos, and the filesystem.

Mode lens: **Operate** (impeccable) / **app screen** (design-taste). No PRODUCT.md/DESIGN.md and no rendered UI—this is a spec critique only.

---

### Contradictions

1. **Task vs workflow ownership**  
   A Task may be “a prompt (or workflow) on a schedule,” while Workflows also have `cron` triggers and their own launcher. The doc never says which object owns the schedule, which screen shows it, or whether a cron workflow appears in Tasks, Workflows, both, or neither.

2. **Two different “target/executor” stories**  
   Tasks table: “target (model or Hermes).” Workflow steps include `prompt`, `tool`, `hermes`, `shell`, etc. Open question still asks whether Hermes owns execution, while the body already treats Hermes as one executor. The runner model is half-decided twice.

3. **Output destinations disagree**  
   Task drawer: chat, file, Inbox, notification. Workflow `output`: inbox, file, chat, kanban card. Notification vs kanban (and any shared vocabulary) is unresolved.

4. **“Matches mockup” with no visual contract**  
   The Tasks screen is asserted to match a mockup, but the doc doesn’t name layout, density, or states. That locks “table + tabs + 24h strip + drawer” without criteria to judge against.

5. **Form + YAML vs “visual flow editor?”**  
   Body says start with form + YAML; open questions reopen visual editor. Fine as a question, but acceptance criteria don’t constrain which authoring path ships.

---

### Gaps

| Area | Missing |
| --- | --- |
| Object model | How Task ↔ Workflow link; identity when a task *is* a workflow; rename/delete/version |
| States | Drawer/row UI for `queued`, `waiting_approval`, `cancelled`; tab set omits succeeded/idle/draft |
| Empty / loading / error | First-run, no tasks, daemon down, log fetch fail, YAML parse error |
| Cost / rate limits | Scheduled LLM spend, concurrent run caps, backoff UI |
| Params | Validation beyond `type: string`; secrets vs plain params; defaults vs overrides |
| Timeline | Encoding for success/fail/running/skipped; timezone of “today”; interaction (click → run?) |
| AuthZ | Who may Run / approve / edit allowlists / call webhooks |
| Observability | What Logs show; retention; redaction |
| Mobile / narrow | Drawer + table + timeline collapse behavior |
| Copy / a11y | Human cron strings, status labels, focus order in drawer, timeline without color-only meaning |

Acceptance criteria cover create/run/restart/approval only—not authoring safety, catch-up UX, or the Workflows grid.

---

### Unrealistic scope

Shipping in one slice:

- Cron + one-off + TZ + catch-up + overlap + retries  
- Full step graph: prompt, tool, hermes, shell, branch, approval, output  
- Triggers: manual, cron, events, localhost webhook, chat `/workflow`  
- Six starters spanning calendar, mail, news, Inbox, multi-repo CI, Kanban, Files, Scout  

That is closer to **n8n/Zapier-lite + agent runner** than a Tasks MVP. Design-taste’s app-screen run asks for *one primary job* on the first screen; this doc invents two products (scheduler ops + workflow studio) without a cut line.

More realistic MVP: Tasks as scheduled prompts only; Workflows as manual + one cron starter; shell/webhook/branch later. Starters 3–6 and Scout are expansion packs, not “ship with these” unless Hermes/tools/Scout already exist.

---

### Security / privacy risks

1. **`run_step` records full input/output** — Mail digests, calendar, repo metadata, file contents, and tool payloads become durable logs. No retention, redaction, or “don’t log secrets” rule. High privacy risk for a personal daemon.

2. **`shell` with allowlist bypass** — Approval-unless-allowlisted is the right instinct; missing: allowlist format, path/arg constraints, who edits it, audit of allowlisted runs.

3. **Webhook (localhost + token)** — Token storage, rotation, binding to `127.0.0.1` only, and behavior if the port is exposed via tunnel/proxy are unspecified. Chat `/workflow name` adds an unauthenticated-looking trigger surface unless chat is already tightly gated.

4. **Catch-up `run all` / overlap `queue`** — After sleep, can burst LLM calls, duplicate Inbox/notifications, or re-send digests. No cost/safety ceiling or “preview catch-up” UX.

5. **Prompt params → template injection** — `{{topics}}` (and richer params later) can steer model/tool behavior; no trust boundary between param source and step graph.

6. **Hardcoded “Jonas’s repos”** in starter 3 — Spec reads single-user/personal; multi-machine or shared config would leak identity and repo scope assumptions.

7. **Approval only via Inbox** — No timeout, escalate, or cancel-from-Tasks; `waiting_approval` can stall indefinitely with unclear lock on overlap policy.

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Operate + app-screens lens: quiet chrome, colour on data, tables as alignment, one job one click away, motion only for state (150–250ms), no dashboard cosplay.

**Tasks screen (as specified)**  
- **Competing foci:** filter tabs + data table + 24h timeline + action-heavy rows + fat side drawer. App-screens warn against a thin first screen *and* against packing every block without a primary question. Here the question (“what runs next / what failed?”) is never named, so hierarchy defaults to “show everything.”  
- **Row actions (4):** Run / Pause / Edit / Logs on every row raises cognitive load (impeccable: flag >4 visible options). Prefer one primary + overflow; Pause should toggle label by state.  
- **Tabs omit useful work states:** All / Running / Paused / Failed skips “needs approval,” “succeeded today,” or schedule-idle. Failed-as-tab is good; approval is a first-class lifecycle state with no filter.  
- **24h timeline:** App-screens calendar/timeline rules want distinct marks per kind, legend from the same marks, and colour only for decisions. Spec only says “shows today’s runs”—likely to ship as a generic sparkline/strip (a known generated-dashboard tell) unless success/fail/skipped/approval are encoded and keyboard-reachable.  
- **Drawer overload:** name, prompt, model+effort, schedule builder (+ next 5), destinations, full history. That is a settings page stuffed into a drawer—poor scan hierarchy; split “Edit definition” vs “Run history,” or use a full detail route.  
- **Laptop-sleep warning:** Good honesty; unspecified placement (banner vs row vs empty state) so it will either nag always or disappear.

**Workflows launcher**  
- **“Grid of cards”** is the stock launcher pattern design-taste pushes against for sameness (identical cards, weak hierarchy). For Operate, a **scannable list/table** (name, trigger summary, last run, one Run) matches Tasks and reduces dual visual languages.  
- **Run → small form** (params, model override, dry-run): solid progressive disclosure; dry-run *result* UI is missing (what does the user see?).  
- **YAML in the UI:** Power-user correct; without inline validation, diff, and a non-YAML form path for starters, it becomes an intimidation surface and a source of silent misconfig.

**Cross-cutting design gaps in the spec**  
- No type scale, density target, or status colour rules → implementers will invent badges, zebra tables, and KPI-like status chips (app-screens anti-patterns).  
- No motion brief → risk of decorative drawer/timeline animation; Operate wants state feedback only.  
- No contrast/legibility rules for status dots, timeline segments, or “Paused” vs “Failed.”  
- No empty-state copy in the product’s voice (“No tasks yet” template vs trade words like “Nothing scheduled for today”).  
- Starter names are fine; the **Workflows grid + Tasks table** split without a shared shell pattern will feel like two apps.

---

### Highest-leverage fixes (if you revise the doc)

1. Pick one scheduling object and one home screen; demote the other to an entry point.  
2. Cut MVP step/trigger surface; move shell, webhook, branch, and most starters behind a flag.  
3. Specify log redaction + retention before “record every input/output.”  
4. Redescribe UI as Operate: primary question, table-first Workflows (or shared Runs view), timeline marks + legend, drawer split, overflow actions.  
5. Close Hermes/daemon in the body; delete or answer the open question so implementers don’t fork.

I can go deeper on a rewritten IA outline for Tasks-only MVP vs full Workflows, still Ask-mode / doc-only, if useful.
