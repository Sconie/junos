**Verdict:** Spec 05 is a solid lifecycle sketch, but as an Operate surface it underspecifies the UI’s one job, conflates Tasks and Workflows, and ships a card-grid + overloaded drawer pattern that both skills would reject for a queue people work in. Security holes sit mainly around `shell`, webhooks, catch-up, and full `run_step` logging of sensitive digests.

Lens: **Operate** (impeccable) + **app screens** (design-taste). This is a worked-in list/ops UI, not a marketing page.

---

### Contradictions

1. **Task vs scheduled workflow** — A Task is “a prompt *(or workflow)* on a schedule,” while Workflows also have `cron` triggers. Unclear whether a cron workflow appears on Tasks, Workflows, both, or as two objects. No ownership rule.

2. **Hermes is already decided and still open** — YAML has `type: hermes`; Tasks target is “model or Hermes”; the open question still asks who owns execution. The proposed answer (daemon schedules, Hermes executes) doesn’t reconcile “Hermes as target” vs “Hermes as step.”

3. **Output destinations disagree** — Tasks drawer: chat, file, Inbox, **notification**. Workflow `output`: inbox, file, chat, **kanban card**. Neither list is the other.

4. **Starter #5 vs launcher model** — “Summarise file or folder (right-click in Files)” is a Files action, not a card in the Workflows grid. Same object, two launch paths, no shared UI rule.

5. **Tabs vs run lifecycle** — Tabs: All / Running / Paused / Failed. Lifecycle: `queued → running → waiting_approval → succeeded | failed | cancelled`. **Paused** is task-level; **Running/Failed** look run-level; `waiting_approval` and `cancelled` have no tab home.

6. **“Matches mockup”** — Asserts fidelity with no linked mock, structure, or hierarchy, so the claim can’t be checked from this doc alone.

---

### Gaps

- **No screen question** (app-screens §2.2). What is biggest: failed/waiting work, next fire, or today’s timeline? Spec lists table + timeline + drawer as peers.
- **No primary job on first paint** — Create task / Run workflow / Retry failed never named as the one-click control.
- **Empty / loading / error / first-run** — Not specified (operate + app-screens §11). Sleep warning is the only edge UX called out.
- **Narrow/phone** — Table + timeline + drawer → list + sheet is unspecified (skills expect tables to collapse to two-line rows).
- **Keyboard / focus** — Not listed here despite the UI system expecting per-spec keyboard notes.
- **Dry-run** — Toggle only; no definition of what is skipped (prompts? tools? outputs?).
- **Approval** — Who, timeout, cancel-while-waiting, expire, re-prompt after edit: absent.
- **`branch`** — Expression language / what “previous output” means: absent.
- **Shell allowlist** — Where it lives, how it’s reviewed/revoked: absent.
- **Overlap** — Per-task only; cross-task storm and global concurrency: absent.
- **Param types** — Only `string` in the example; secrets, enums, files: absent.
- **Acceptance** — Covers daily task, daemon restart, approval. Omits event/webhook/chat triggers, catch-up, overlap, shell, dry-run, starter workflows.

---

### Unrealistic scope

Shipping **six starters** (mail, calendar, news, inbox triage, multi-repo CI, kanban, files, scout) plus **seven step types** and **five trigger classes** in one feature is a platform, not a Tasks v1.

Especially heavy before “form + YAML” settles:

- Event triggers (`kanban.*`, `scout.*`, `inbox.*`) couple this to unfinished sibling systems.
- Localhost **webhook** needs auth, schema, replay, and abuse cases.
- Catch-up **`run all`** after sleep can mean a burst of paid model + tool runs.
- Editable YAML + JSON storage + schedule builder + timeline + drawer + card launcher + param modal is many surfaces for “start with form + YAML.”

A tighter v1: scheduled prompts + manual workflow run + one approval path; defer webhook, branch, shell, and most starters.

---

### Security / privacy risks

| Risk | Why it matters in this doc |
|---|---|
| **`shell` + allowlist** | Allowlist is a standing bypass of approval; no UI, audit, or scope rules here. |
| **Webhook (localhost + token)** | Other local processes can hit it; token storage/rotation/logging not specified. |
| **Untrusted digests in prompts** | Morning briefing / scout / mail / news → model → later `tool`/`shell` steps; no injection / approval escalation called out. |
| **Full `run_step` I/O** | Calendar, mail, repo, file contents persisted; no retention, redaction, or “logs are sensitive” rule. |
| **Catch-up `run all`** | Surprise spend and surprise side effects on wake. |
| **Dry-run undefined** | False sense of safety if tools still run. |
| **Chat `/workflow`** | Param injection / confused deputy via chat not addressed. |
| **Notification output** | May surface on lock screen; sensitivity not mentioned. |
| **Repo health across “Jonas’s repos”** | Broad SCM/CI scope baked into a starter name. |

---

### UI / design quality (hierarchy, spacing, type, density, motion, legibility, contrast)

**IA / hierarchy**

- Two destinations for one job family: **Tasks = table**, **Workflows = card grid**. App-screens treat identical Run-cards (name, description, last run, button) as template residue; operable queues want a **list/table** with one finding line (“2 failed · 1 waiting approval”) and row actions, not a marketing grid.
- Table and **24h timeline** compete. If the product face is “what fired today,” the timeline should answer the screen question and drive filter/selection; the table supports it—not equal chrome.
- Drawer is a **create + edit + schedule + history** dump. Operate prefers progressive disclosure; history belongs on a run detail, not beside the cron builder.

**Density / layout**

- Columns: status, name, schedule (cron + human), target, last, next, **four actions** — too wide for a rail + content layout; identity won’t keep ~⅓ width (app-screens §7.4). Prefer stacked schedule (human + mono cron), last/next as one recency cell, actions as kebab + one contextual control (Retry/Logs on failed).
- “Grid of cards” for workflows fights density and scanability for “run this with params.”

**Typography / legibility**

- No title scale, finding line, or total above the table.
- Cron in mono is fine; human schedule should be the readable line, cron the 12–13px grey subline—not two equal-weight strings.
- Status must not be colour-only (pairs with StatusDot + text elsewhere); many saturated Failed pills become a “stripe of blobs” (§7.6).

**Timeline**

- Spec is one sentence. App-screens calendar/timeline rules want **kind-encoded marks**, legend-as-mark, density rules, today marker. Missing: success/fail/waiting encoding, overflow when many runs, click → filter/select, empty day, TZ label (doc defaults Europe/Copenhagen).

**Motion**

- Unspecified. Operate + app-screens: **feedback only** (150–250ms), no entrance choreography, no decorative timeline playback. `waiting_approval` may pulse if `prefers-reduced-motion` is respected.

**Contrast / surfaces**

- Doc 05 doesn’t set tokens, but product direction is frosted glass + violet. App-screen house rules ban glass/glow and violet-as-chrome. Whatever the shell does, **this** screen needs opaque panel fallbacks and ≥4.5:1 on table ink, dim meta, timeline ticks, and status chips on blur—especially Failed/Paused.

**Forms / Run UX**

- Workflow Run as a “small form” defaults to modal; Tasks already use a drawer—same object should share one pattern.
- Schedule “next 5 run times” is the right substance (“show what the setting produces”); it should be first-class preview, not buried under Custom cron.

**States**

- No empty teaching state (e.g. install/enable one starter with a real next run).
- Sleep warning vs global “daemon down” banner: stacking risk if both appear.

---

### Highest-leverage fixes (for the doc, not implementation)

1. One sentence: **screen question** + what is visually primary (suggest: failed/waiting, then next run).
2. Resolve **Task vs Workflow** (one object with launch modes, or strict split: Tasks = schedules, Workflows = definitions only).
3. Replace workflow **card grid** with a list aligned to Tasks; keep starters as an empty-state or gallery once.
4. Cut v1 step/trigger surface; define dry-run, allowlist, log retention, and catch-up spend guard.
5. Specify row action hierarchy, timeline encoding, empty/loading/error, and narrow layout.

I’m in Ask mode—happy to turn this into a patched outline for 05 if you switch to Agent mode.
