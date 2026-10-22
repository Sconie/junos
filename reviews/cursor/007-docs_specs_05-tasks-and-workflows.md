## Ranked findings — `docs/specs/05-tasks-and-workflows.md`

1. **high** — Dual schedule owners  
   **Ref:** “Task = a prompt (or workflow) on a schedule” + workflow `triggers: [{ type: cron, … }]` vs `task.schedule_cron` in `02`.  
   **Why:** Same fire time can be owned by a task *and* a workflow cron (or a task that “is” a workflow). Acceptance (“no duplicate… runs”) is untestable until one owner is named.  
   **Fix:** One scheduler entity. Prefer: workflows own definitions + triggers; a “task” is a saved schedule pointing at either a single prompt *or* `workflow_id`. Drop cron from the other side; update `02` accordingly.

2. **high** — `run` / `workflow_run` / `run_step` mismatch  
   **Ref:** “Every step records… to `run_step`” vs `02`: both `run` (`kind: task | workflow_step`) and `workflow_run`.  
   **Why:** Unclear whether one multi-step execution is one `workflow_run` with N `run_step`s, N `run` rows, or both. Logs, Inbox `source_ref`, Home “upcoming runs”, and retry-from-step will diverge.  
   **Fix:** Spec the mapping in 05: e.g. one `workflow_run` → one parent `run` (`kind: workflow`) → N `run_step`; simple tasks → one `run` (`kind: task`) with 0–1 steps. Align `02` `run.kind` (drop or redefine `workflow_step`).

3. **high** — Shell + webhook before hardening  
   **Ref:** Step `shell` (“approval unless allowlisted”); trigger `webhook (localhost, token)`; `12` sandbox “Phase 4”; `13` Phase 2 ships the runner.  
   **Why:** Threat model #1/#2: allowlisted shell on a sleeping laptop is still local RCE; a localhost webhook + token is another process’s call surface. Approvals don’t help if the machine is unattended and an allowlist was remembered.  
   **Fix:** Phase 2: `prompt` / `tool` / `output` / `approval` only. Defer `shell`, `hermes`, and webhooks to Phase 3–4 with sandbox + keychain token + explicit CORS/Host rules from `12`. Until then, “Run now” for risky steps must require a live Inbox approve (no remember) when daemon was recently woken by catch-up.

4. **high** — Subscription budget ignored  
   **Ref:** 05 scheduling/retries/overlap vs `03` “background jobs yield… 80%” / `maxRunsPerDay` / `preferCheapModel`.  
   **Why:** Unattended morning briefing + catch-up + queue will burn the same Claude/Codex quota as interactive chat; `12` treats spend as always-ask, but crons never ask.  
   **Fix:** Every task/workflow inherits global budget + optional `maxRunsPerDay` / `preferCheapModel`. On yield: skip + Inbox notice (as in `03`). Surface meter + “paused by budget” on the Tasks screen, not only a sleep warning.

5. **high** — Starter pack vs roadmap and other specs  
   **Ref:** Six starters (mail, calendar, repos CI, Files right-click, Scout) vs `13` Phase 2 “3 starter workflows”; `07` mail/calendar “v2”; Scout/Files Phase 4.  
   **Why:** Phase 2 “done when” depends on integrations that don’t exist yet; scope balloons past the automation milestone.  
   **Fix:** Ship three that only need local daemon + one model + Inbox: (1) prompt → Inbox digest, (2) Inbox triage summary, (3) weekly Kanban text digest from local DB. Mark mail/calendar, repo health, Files action, Scout as later starters once those screens/adapters exist.

6. **high** — `run all` catch-up + `queue` overlap  
   **Ref:** Catch-up `run all`; overlap `queue`; sleep warning only.  
   **Why:** Wake after a weekend can enqueue dozens of model/tool runs—quiet spend + surprise Hermes/shell work. Contradicts `03` concurrency “1–2” and human-in-charge.  
   **Fix:** Default catch-up `skip` (keep); rename `run all` to `run all (max N)` with hard cap (e.g. 3) and always Inbox summary of skipped fires. Prefer `skip if running` only in v1; if `queue`, cap depth = 1 and show queued count in the table.

7. **med** — Step taxonomy exceeds Phase 2 runner  
   **Ref:** `branch`, `hermes`, `shell`, event triggers vs `13` “prompt/tool/output steps”.  
   **Why:** Mini control-flow + agent handoff is a second product inside the scheduler; acceptance only covers schedule + approval pause.  
   **Fix:** v1 step types = `prompt | tool | output | approval`. Document `branch` / `hermes` / `shell` / webhooks / rich events under “Later” with explicit phase tags.

8. **med** — Workflows “grid of cards” (generic AI UI)  
   **Ref:** “A grid of cards (name, description, last run, Run)”.  
   **Why:** design-taste app-screens: equal peer-card grids with a button per tile are a generated-launcher tell; “nothing was decided.” Operate mode wants scan + one primary job, not a marketing card wall. Conflicts with “one question first” / sparse chrome.  
   **Fix:** One list or table (name, last run, next trigger, status) + one primary “Run” on the selected row; optional compact “pinned” strip (≤3) if you need favorites—not a uniform card grid. Keep Run params in a sheet, not a card face.

9. **med** — Tabs mix orthogonal axes  
   **Ref:** “Tabs: All, Running, Paused, Failed.”  
   **Why:** Paused ≈ `enabled=false`; Running/Failed ≈ last/`active` run status. Users can’t answer “show enabled tasks that failed last night” without mental math (cognitive load / IA).  
   **Fix:** Filters: status chips for last run (`ok | failed | never`) + toggle “Paused only”; default list = enabled schedules. “Running” as a live section above the table (0–N active runs), not a peer tab.

10. **med** — 24h timeline strip underspecified  
    **Ref:** “A 24-hour timeline strip shows today's runs.” (also stitch Tasks prompt)  
    **Why:** App-screen rules: colour on data, no vanity chrome; a strip without compare/missed/budget meaning becomes decorative markers. Drawer already has history.  
    **Fix:** Either cut for v1, or define it as data: markers for fired / skipped-by-budget / failed / queued, with today + “missed while asleep” ticks, tabular time labels, one data hue for failures only—no sparklines/KPI tiles above it.

11. **med** — Drawer as kitchen sink  
    **Ref:** Side drawer: name, prompt, model+effort, schedule builder, output dest, run history.  
    **Why:** Operate surfaces need one job per view; editing definition + reading logs in a 360–420px drawer (`14`) will truncate prompts/logs and hide hierarchy.  
    **Fix:** Canvas = schedule list + selected run log (main column). Drawer or full-page editor = definition only. “Logs” opens the run detail route/panel, not a second history buried under the form.

12. **med** — No required UI states / keyboard  
    **Ref:** Whole Tasks/Workflows UI sections vs `14` “States every screen needs” and `07` keyboard-first Inbox.  
    **Why:** Empty scheduler and failed daemon are the real first-run experience; without them the mockup-only table reads as template.  
    **Fix:** Spec empty (“New task” / “Run a starter”), loading skeletons matching row pitch, per-row error, offline banner. Keys: `j/k`, `Enter` open, `r` run now, `p` pause, `/` filter—mirror Inbox.

13. **med** — Event triggers can loop  
    **Ref:** `inbox.item.approved`, `kanban.card.moved`, `scout.finding`.  
    **Why:** Workflow posts approval → approve → retrigger; kanban output → move → retrigger. Silent automation loops violate “human stays in charge.”  
    **Fix:** Triggers carry `source_run_id` exclusion; default debounce; ban same-workflow re-entry on events it emitted; document max depth = 1 for v1.

14. **med** — Dry-run undefined  
    **Ref:** “dry-run toggle” on Run form.  
    **Why:** Meaningless for `tool`/`shell`/`hermes`/`output` without semantics → false safety.  
    **Fix:** Define: resolve params + show step plan + estimated model calls; no side effects, no provider calls (or cheap no-tools prompt only if labeled “sample”). Disable dry-run when definition contains non-simulated steps until those have mocks.

15. **med** — Schema gaps vs scheduling rules  
    **Ref:** overlap, retries, one-off `at`, notification dest vs `task(… catch_up, enabled, next_run_at)` only.  
    **Why:** Implementers invent columns or drop policies; restart/dedupe acceptance depends on persisted overlap/retry state.  
    **Fix:** Add to `02` (or `definition_json`): `overlap`, `retry_json`, `one_shot_at`, `last_run_at`, `last_status`; clarify `enabled` vs paused; drop “notification” until Phase 5 or map to Inbox only.

16. **med** — Untrusted inputs in starters not tied to `12`  
    **Ref:** Morning briefing “news”, mail digest; Scout-as-workflow.  
    **Why:** Prompt-injection path from web/mail into later `tool`/`shell` steps is the top threat in `12`; 05 never says Assess/read steps are tool-less.  
    **Fix:** Rule: steps that ingest web/mail/files run with tools off; any following tool/shell/external-send requires approval class from `12`. Reference that rule next to step types.

17. **med** — Hermes as task target before bridge  
    **Ref:** Table “target (model or Hermes)”; open Q “daemon owns scheduling…”; Hermes Phase 3.  
    **Why:** Phase 2 Tasks UI promises a target that can’t execute; duplicates Queue concepts in `06`.  
    **Fix:** Phase 2 targets = model adapters only. Hermes target = Phase 3, as `output`/`step: hermes` once bridge exists. Keep open Q resolved: daemon schedules; Hermes is executor only via explicit step.

18. **med** — Two rail destinations for one runner  
    **Ref:** `14` nav: Workflows and Tasks separate; 05 “share one runner.”  
    **Why:** Split IA for one mental model; Home already surfaces “upcoming runs.”  
    **Fix:** One “Automations” route with segments Schedules | Library (definitions) | Runs—or keep two routes but make Tasks = run/schedule ops only and Workflows = definition library with no second cron UI.

19. **low** — YAML-in-UI as default craft path  
    **Ref:** “stored as JSON, editable as YAML”; open Q visual editor.  
    **Why:** Fine as power escape hatch; as primary edit surface it pushes monospace walls and fights form clarity (impeccable Operate: precision, known patterns).  
    **Fix:** Form-first for params/triggers/ordered steps; YAML behind “Advanced”; validate with shared Zod (`01`). Defer visual graph until branch steps exist.

20. **low** — Row action chrome density  
    **Ref:** “actions (Run now, Pause, Edit, Logs)” on every row.  
    **Why:** App-screen tables: one trailing action pattern; four verbs + status chip + timeline reads busy and “template admin.”  
    **Fix:** Primary ink action = Run now on failed/idle; kebab for Pause/Edit/Logs; one status mark per row (pale tint + text, not colour-only—`14` a11y).

21. **low** — Responsive silence  
    **Ref:** Table + timeline + drawer; `14` &lt;900px → bottom tabs / full-screen sheets.  
    **Why:** Dense ops table becomes unusable; timeline + drawer will stack into empty scroll (taste “first screen thin”).  
    **Fix:** &lt;900px: list-of-two-line-rows; timeline optional disclosure; edit/run history as full-screen sheets (as `14`).
