**Verdict:** As an Operate-mode screen brief, this doc sketches a capable scheduler but under-specifies the working UI, overloads two overlapping product surfaces (Tasks vs Workflows), and leaves high-privilege execution (shell, webhook, mail/calendar) without enough safety or state design to ship cleanly.

Lens: **impeccable Operate** (task completion, density, state, motion as feedback) + **design-taste app screens** (quiet chrome, honest data states, tables/forms/timelines, no dashboard-kit tells). No rendered UI — this is a spec-only critique.

---

### Contradictions / blur

1. **Task vs Workflow scheduling is double-booked.** A Task is “a prompt *(or workflow)* on a schedule,” while Workflows also take `cron` triggers. Unclear whether a scheduled workflow appears in the Tasks table, only in the launcher, or both — and which Pause/Edit/Logs surface is authoritative.

2. **Executor story conflicts with itself.** Table target is “model or Hermes”; step type `hermes` hands a goal to Hermes; open question proposes “daemon owns scheduling, Hermes is one possible executor.” Three models of ownership without a single default for the UI to label.

3. **Output destinations disagree.** Task drawer: chat thread, file, Inbox, notification. Workflow `output`: inbox, file, chat, kanban card. Notification and kanban are each mentioned once and never reconciled (or given empty/failure behavior).

4. **“Matches mockup” with no mockup constraints.** Tabs, columns, timeline, drawer, and card grid are asserted without hierarchy, density caps, or what yields when space is tight — so implementers will invent a dashboard kit.

---

### Gaps (product / lifecycle)

- **No primary job for the first screen.** App-screen rule: one question + the most frequent action one click away. Here the Jobs compete: scan health, run something now, fix failures, edit schedule. No default sort, no “needs attention” bucket above the table.
- **States incomplete.** Lifecycle lists `queued → running → waiting_approval → …` but the Tasks tabs are All / Running / Paused / Failed — no Queued, no Waiting approval, no Cancelled. Drawer/history UX for `waiting_approval` is missing.
- **Empty / loading / error / zero** not specified (required for Operate and app-screen §11). First-run with zero tasks, timeline with no runs today, failed log fetch, YAML parse error — all unspecified.
- **Run now vs schedule vs overlap.** Overlap is `skip` or `queue`, but the table doesn’t say how “queued behind self” or “skipped because running” appears in status / last run / timeline.
- **Retries / backoff** have no UI (attempt N of M, next retry time, stop retrying).
- **Logs:** row action “Logs” *and* “run history with logs” in the drawer — which is canonical, and is log streaming live?
- **Parameter form + dry-run** for workflows: no preview of resolved prompts, no validation errors, no “what this will touch” summary before Run.
- **Branch / approval / multi-step** have no run visualization beyond flat `run_step` recording — open question defers a flow editor, but the runtime still needs a readable step list with status.
- **Phone / narrow layout** absent; tables + drawers + timeline usually break first.
- **Timezone UX:** default Europe/Copenhagen is good; missing DST edge copy, and whether “next 5 run times” are local or UTC in the UI.

---

### Unrealistic scope (for one ship)

Starter set alone spans calendar, mail, news, multi-repo CI, Kanban, Files right-click, and Scout — plus step types `prompt | tool | hermes | shell | branch | approval | output`, and triggers `manual | cron | event | webhook | chat`. That is a full orchestration product. Acceptance criteria only cover: daily task, daemon restart idempotency, one approval pause. **Ship surface ≫ acceptance surface.**

YAML-in-UI on JSON storage adds a second editor (form + YAML) before the first path is proven; open question correctly prefers form + YAML, but still implies both editors in v1.

---

### Security / privacy risks

| Risk | Why it matters |
| --- | --- |
| **`shell` with allowlist** | Allowlist scope, path/args matching, and who can edit it are undefined → local RCE as the user. |
| **Webhook (`localhost`, token)** | Token storage, rotation, scope, body size, and SSRF-ish “localhost” ambiguity (daemon bind address, LAN) unspecified. |
| **Event triggers** (`inbox.item.approved`, etc.) | Approval → workflow → new inbox item → re-trigger loops not addressed. |
| **`/workflow name` from chat** | Chat-initiated privileged runs need authz equal to the UI; not stated. |
| **Full step I/O in `run_step`** | Morning briefing / mail digest / calendar / repo data retained as inputs/outputs — retention, redaction, and who can open Logs undefined. |
| **YAML/JSON editing** | Unvalidated defs can smuggle oversized prompts, unexpected tools, or delivery to surprising destinations. |
| **Cross-repo “Jonas’s repos” starter** | Broad token/scope assumption; failure and partial-access UX missing. |

Daemon-sleep warning is the right instinct; it should also cover “missed runs while encrypted credentials were locked” if applicable — not stated.

---

### UI / design-quality (hierarchy, density, type, motion, contrast)

**Mode:** Operate / app screen — familiarity and scanability over expression. Brand shows in precise details, not hero chrome.

**Hierarchy & IA**
- Tasks page stacks tabs + dense 8-column table + 24h timeline + action-heavy rows + a kitchen-sink drawer. Nothing declares the page question (e.g. “What failed or is due?” vs “Browse everything”).
- Workflows as **“a grid of cards”** is the default launcher kit (identical name/description/last-run/Run tiles). App-screen guidance prefers a working list or framed sheet with one primary run path — not a marketing card grid. Prefer a compact list/table consistent with Tasks, or a single “Run…” entry point.
- Dual editors (schedule builder *and* cron; form *and* YAML) multiply decision points without a progressive disclosure plan.

**Density & cognitive load**
- Four row actions (Run now, Pause, Edit, Logs) exceed the “keep decision points ≤4 visible” heuristic; app tables usually use one trailing kebab + one contextual primary (e.g. Retry on Failed).
- Drawer fields (name, prompt, model+effort, schedule modes, next 5 times, output, full history) is a settings page stuffed into a sheet — likely scroll hell, weak label/field rhythm, no “one save model.”
- Schedule column as “cron plus human text” doubles meta in the primary scan column; human text in-row, cron in detail.

**Timeline (24h strip)**
- Spec stops at “shows today’s runs.” Per app-screen timeline rules you still need: kind encoding (success / fail / skipped / approval / queued), today marker, readable labels vs tooltip-only, and legend from the same marks. A strip of undifferentiated dots fails “colour on data, not chrome” and fails honesty for skip/catch-up.

**Typography / spacing / contrast (all unspecified → high slop risk)**
- No type scale (app median title ~24px, cells ~14, meta ~12), no tabular figures for times, no status chip contrast pairs (pale tint + dark text of same hue; avoid saturated pills on most rows).
- Status as both tab filter and per-row chrome risks duplicate marks (“one status mark per row”).
- Failed / Paused / Running without defined ink vs grey will either wash out (grey body text) or scream (rainbow pills).

**Forms**
- Parameter form + model override + dry-run is right-sized *if* labels sit above fields, one control height, and dry-run shows a concrete preview — none of that is written.
- Schedule builder Hourly/Daily/Weekly/Custom needs Custom’s cron validation and timezone adjacent to “next 5,” not buried.

**Motion**
- Operate + app screens: **no entrance choreography**; motion only for press/hover/focus, sheet open, row status change (~150–250ms), with `prefers-reduced-motion`. Spec never mentions live run updates — without it, Running/Failed will feel stale; with it, unbounded animation on the timeline would violate the motion floor.

**Legibility / a11y gaps**
- Logs and YAML are monospace-heavy; no note that monospace is for code/IDs only, body stays the UI face.
- Drawer + table actions need visible focus, disabled reasons (“Pause” while already paused), and non-colour-only status (icon/dot + label).
- Laptop-sleep warning is called out but not placed (banner vs row badge vs schedule field) — easy to ship as a dismissible toast that fails the job.

**Product face missing**
- Nothing product-specific (no signature element for “what ran while you were away,” no trade vocabulary beyond generic “Tasks/Workflows”). Easy to ship as a generic cron admin.

---

### Priority fixes (spec-level, not implementation)

1. **Pick one scheduling home.** Either Tasks *are* scheduled workflow instances, or Workflows own cron and Tasks are prompt-only — then align tabs, Pause, and next-run.
2. **Cut v1 step/trigger surface** to what acceptance tests: prompt + output + approval (+ maybe one tool). Defer shell, webhook, branch, chat slash-command, and most starters.
3. **Specify the Tasks first screen:** attention list (failed / waiting approval / due soon) above a quieter full table; row actions → one primary + overflow.
4. **Define timeline marks, empty/loading/error, and log retention/redaction** in the same breath as the happy path.
5. **Replace workflow card grid** with a list consistent with Tasks; keep Run → parameter sheet with dry-run preview.
6. **Security appendix:** shell allowlist rules, webhook auth, trigger loop guards, chat authz, secrets in logs.

---

Questions skipped: full impeccable dual-agent critique + detector (no viewable target; Ask mode / spec-only). If you want the same lens applied to an actual Tasks mockup or implementation next, point at the file or route.
