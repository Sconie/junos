# Tasks (crons) and Workflows

Two ideas that share one runner:
- **Task** = a prompt (or workflow) on a schedule.
- **Workflow** = a reusable, parameterised sequence of steps that can be launched on demand, by a schedule, by an event, or by an agent.

## Tasks screen (matches mockup)
Tabs: All, Running, Paused, Failed. Table columns: status, name, schedule (cron plus human text), target (model or Hermes), last run, next run, actions (Run now, Pause, Edit, Logs). A 24-hour timeline strip shows today's runs. Side drawer: name, prompt, model+effort, schedule builder (Hourly/Daily/Weekly/Custom with next 5 run times), output destination (chat thread, file, Inbox, notification), run history with logs.

### Scheduling rules
- Cron expressions with explicit timezone (default Europe/Copenhagen, editable).
- One-off "at" runs supported.
- Catch-up policy per task: `skip` (default), `run once`, `run all`.
- Overlap policy: `skip if running` (default) or `queue`.
- Retries: N attempts with backoff; final failure creates an Inbox `failure` item.
- Daemon down at fire time: handled by catch-up policy on next start. If the laptop sleeps often, show a warning on the Tasks page.

## Workflows launcher
A grid of cards (name, description, last run, "Run" button). Clicking Run opens a small form for parameters, a model/effort override and a dry-run toggle.

### Definition (stored as JSON, editable as YAML in the UI)
```yaml
name: Morning briefing
params: [{ key: topics, type: string, default: "AI, Denmark" }]
triggers: [{ type: cron, expr: "0 8 * * 1-5" }, { type: manual }]
steps:
  - id: gather    type: prompt   model: sonnet  effort: medium
    prompt: "Summarise overnight news about {{topics}}"
  - id: calendar  type: tool     tool: calendar.today
  - id: write     type: prompt   input: [gather, calendar]
    prompt: "Write a 10-line briefing"
  - id: deliver   type: output   to: inbox
```
Step types: `prompt`, `tool`, `hermes` (hand to Hermes with a goal), `shell` (needs approval unless allowlisted), `branch` (if/else on a previous output), `approval` (pauses and posts an Inbox item), `output` (inbox, file, chat, kanban card).

### Triggers
manual · cron · event (`kanban.card.moved`, `scout.finding`, `inbox.item.approved`) · webhook (localhost, token) · from chat (`/workflow name`).

### Starter workflows (ship with these)
1. Morning briefing (calendar, mail digest, news)
2. Inbox triage (summarise new Inbox items into priorities)
3. Repo health (open PRs, failing CI across Jonas's repos)
4. Weekly review (Kanban done/not done, next week's plan)
5. Summarise file or folder (right-click action in Files)
6. Scout run (see 08)

## Run lifecycle
`queued -> running -> (waiting_approval) -> succeeded | failed | cancelled`. Every step records input, output and duration to `run_step`. Failed steps can be retried from that step.

## Acceptance criteria
- Create a daily task, see its next 5 fire times, "Run now" produces a run with logs and an Inbox result.
- Restarting the daemon does not duplicate or lose scheduled runs.
- A workflow with an approval step pauses and resumes after approval in the Inbox.

## Open questions
- Visual flow editor vs YAML only? Start with form + YAML.
- Should Hermes own task execution or the daemon? Proposed: daemon owns scheduling, Hermes is one possible executor (target).
