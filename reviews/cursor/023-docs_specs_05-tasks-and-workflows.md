**Verdict:** The engine sketch is coherent; the UI section reads like a packed admin template and underspecifies Operate/app-screen craft. Highest risks are status-model confusion, an overloaded drawer, card-grid Workflows, and unscoped shell/webhook/log surfaces.

Mode: **Operate** (impeccable) / **app screen** (tasteskill). No PRODUCT.md/DESIGN.md; review is of this doc only.

---

### Contradictions

1. **Task vs Workflow IA** — Opening line: a Task can be “a prompt (or workflow) on a schedule,” but the UI is two surfaces (Tasks table + Workflows card grid) with no rule for when a scheduled workflow appears where, or whether editing one edits the other.
2. **Status vocabulary** — Tabs: All / Running / Paused / Failed. Lifecycle: `queued → running → (waiting_approval) → succeeded | failed | cancelled`. **Paused** is never a run state; **waiting_approval**, **cancelled**, **queued**, **succeeded** never get tabs. Unclear whether “status” means schedule enabled vs last-run outcome.
3. **Outputs disagree** — Drawer: chat / file / Inbox / **notification**. Step `output`: inbox / file / chat / **kanban card**. Notification and kanban are each specified once and nowhere else.
4. **Open questions already half-answered** — Body assumes daemon scheduling + Hermes as target; open question still asks who owns execution. “Form + YAML” is proposed while the body already centers YAML.
5. **Starter vs example** — “Morning briefing (calendar, mail digest, news)” vs YAML that only uses `calendar.today` and a news-ish prompt—no mail/news tools.
6. **Hermes doubled** — Table target “model or Hermes” and step type `hermes` overlap without a rule for which path wins.

---

### Gaps

- No **Create** primary, empty/loading/error/offline, or keyboard map (other specs claim those belong per screen).
- No meaning of **dry-run**, param types beyond `string`, event payloads, or webhook request shape.
- **Timeline strip**: no marks for success/fail/running/approval, hover/click, or empty day.
- Drawer mixes **edit + history + logs** with no inspect-vs-edit split.
- No retention/redaction for `run_step` I/O; no mobile/sheet behavior for the drawer.
- Catch-up `run all` and retries **N** have no caps (cost/DoS).

---

### Unrealistic scope

One short spec commits to: cron + one-shot + catch-up + overlap + retries, a multi-step engine (`prompt` / `tool` / `hermes` / `shell` / `branch` / `approval` / `output`), four trigger classes, YAML+form editing, and **six** starters that each need real integrations (mail, multi-repo CI, Kanban, Files, Scout). That’s several products. Ship slice: one Tasks table + manual/cron prompt tasks + Inbox failure + one starter—defer branch/shell/webhook/card grid.

---

### Security / privacy

| Risk | Why it matters |
| --- | --- |
| **`shell`** | RCE even with allowlist; approval UX and allowlist governance unspecified. |
| **Webhook (localhost + token)** | Token in YAML/logs; “localhost” ≠ safe if bound broadly or tunneled. |
| **Full step I/O in logs** | Mail/calendar/repo titles → long-lived PII in `run_step`. |
| **Chat `/workflow`** | Untrusted text into params/prompts. |
| **Starters** | Mail digest, calendar, private PRs → model + Inbox/file exfil paths. |
| **Approval only called out for `shell`** | `hermes` / `tool` / outputs can be as sensitive. |

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Through Operate + app-screens:

**Hierarchy** — No page `h1`, scope line, or single primary action. Tabs + 7-column table + 24h strip + drawer compete; the screen’s job (“what fires next / what failed”) never leads.

**Workflows “grid of cards”** — Template launcher (identical cards, description, Run). For an ops surface, prefer a **dense list/table** (name, last run, trigger, one Run). Cards burn space and read as marketing.

**Tasks table density** — Four row actions (Run / Pause / Edit / Logs) violate app-screen norms (one trailing action or kebab; promote action only when the row needs doing, e.g. Failed → Logs/Retry). Schedule as cron **and** human text needs a **two-line row pitch (~40–44px)**, not single-line 36–45px.

**Timeline strip** — Useful if it’s the answer figure (today’s runs). Spec leaves it decorative: need kind-encoded marks, ink on failures, no rainbow status, click → run detail. App-screen motion rule: feedback only, **no** load choreography.

**Side drawer** — God-object. Operate: progressive disclosure; don’t park schedule builder + YAML/form + history/logs in one 360–420px rail. Split **Edit** vs **Run detail**; keep CronPreview (“next 5”) adjacent to schedule, not below a scroll of logs.

**Tabs vs states** — Prefer tabs that match operator jobs: e.g. **Scheduled / Needs attention** (`failed` + `waiting_approval`) / **Paused**—or filters, not a false lifecycle. Don’t use color-only status; require label + mark (contrast on dim text).

**Typography / legibility** — Cron in mono is fine; UI labels should stay the UI face. `--text-dim` for primary schedule prose will fail contrast if that’s the reading path—human schedule in full ink, cron secondary.

**Form + YAML** — Two editors for one object invites drift. Default: structured form; YAML behind an advanced disclosure with a single source of truth.

**Motion** — Unspecified. Cap at 150–250ms state changes (drawer open, row status, strip update); `prefers-reduced-motion` required for any strip animation.

---

### Priority fixes to the spec (not code)

1. One status model (task enabled vs run state) and tabs that match it; surface `waiting_approval`.
2. Unify output destinations; define dry-run.
3. Replace workflow card grid with a list; demote row actions; specify timeline marks.
4. Split drawer; add Create, empty, and failure→Inbox as the first-screen loop.
5. Cap catch-up/retries; tighten shell/webhook/log redaction before starters that touch mail/repos.

---

Which should this screen optimize for first: **reliability of cron tasks**, or **composable multi-step workflows**?
