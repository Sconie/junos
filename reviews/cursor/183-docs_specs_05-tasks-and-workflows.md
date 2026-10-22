**Verdict:** The doc is a workable engine sketch (schedule policies, lifecycle, step types) but a weak Operate UI brief: Tasks and Workflows fight each other as products, the Workflows “card grid” is a stock tell, and security-sensitive surfaces (`shell`, webhook token, logged step I/O) are almost undefined.

Mode lens: **Operate** (impeccable) / **app screen** (design-taste). No live UI to inspect — this is a spec critique only.

---

### Contradictions

1. **Two schedulers for one idea.** A Task is “a prompt (or workflow) on a schedule,” and Workflows also have `triggers: [{ type: cron, ... }]`. Unclear whether scheduling a workflow is a Task row, a workflow trigger, or both — and which UI owns pause/next-run/catch-up.
2. **Status vocabularies don’t match.** Task tabs are All / Running / Paused / Failed. Run lifecycle is `queued → running → (waiting_approval) → succeeded | failed | cancelled`. No mapping for queued, waiting_approval, cancelled, or whether “Paused” is schedule-level vs run-level.
3. **Output destinations disagree.** Task drawer: chat thread, file, Inbox, notification. Workflow `output` step: inbox, file, chat, kanban card. Notification vs kanban (and how task vs step delivery relate) are unresolved.
4. **IA vs open question.** Launcher is a “grid of cards”; open question chooses “form + YAML” and defers a visual flow editor — fine for the engine, but the launcher pattern is already a decided (and weak) visual.
5. **Hermes ownership vs acceptance.** Open question still debates daemon vs Hermes; acceptance criteria assume daemon restart semantics and Inbox approval resume without stating the executor contract.

---

### Gaps (especially UI / Operate)

- No **page question**, **h1**, or **primary action** (Create task / New workflow). App-screen rules: noun title, one primary, first screen answers the job.
- No **empty / loading / error / zero** states for table, timeline, drawer, or launcher.
- No **live-run** UX: how Running updates, overlap `queue`, cancel, or `waiting_approval` appear in the table/timeline.
- **Timeline strip** named but not designed: marks for success/fail/running/approval, timezone day boundary, click → run detail, empty day.
- **Drawer** is a kitchen sink (prompt, model, schedule builder, destinations, history/logs) with no progressive disclosure or focus order.
- **Workflow param form**: types beyond string, validation, dry-run output, model override vs step defaults — unspecified.
- **Branch / approval / shell** step types exist in the engine with almost no UI (approval is only “Inbox item”).
- No **responsive / phone** behavior (drawer → sheet? table → list?).
- No **a11y**: status not by color alone, focus in drawer/YAML, log contrast.
- No **retention** for `run_step` I/O/logs (also a privacy issue).
- Starter #5 (Files right-click) and #6 (Scout) reach other surfaces this doc doesn’t specify.

---

### Unrealistic scope

Shipping together: cron + one-shot + catch-up/overlap/retries, six starters (mail, calendar, news, multi-repo CI, kanban, files, scout), step types including `branch` / `hermes` / `shell` / `approval`, plus event + localhost webhook + `/workflow` chat. That’s a full orchestration product; the UI section only sketches a table, a card grid, and a YAML blob. Cut to: daily task + manual workflow + one approval path, then grow triggers/step types.

---

### Security / privacy

| Risk | Why it matters in this doc |
| --- | --- |
| **`shell` + allowlist** | Highest blast radius; “needs approval unless allowlisted” with no allowlist UX, audit, or scope. |
| **Webhook token in editable YAML/JSON** | Secret likely shown in UI, copied into runs/logs, leaked via export/share. |
| **`run_step` records input/output** | Calendar/mail/news/repo data and prompt text retained; no redaction, retention, or who can open Logs. |
| **Delivery fan-out** | Chat / file / Inbox / notification / kanban — multiple exfil paths without sensitivity rules. |
| **Dry-run** | Undefined whether tools/shell still execute. |
| **Event triggers** (`inbox.item.approved`, etc.) | Easy to create loops or privilege confusion if any approved item can resume powerful workflows. |
| **Personal leakage** | “Jonas’s repos” in a shipped starter reads as product copy, not a private note. |

---

### UI / design quality (hierarchy, density, type, motion, contrast)

**Tasks (table + timeline + drawer)**  
Useful Operate bones: filter tabs, schedule preview (“next 5”), Run now, sleep warning. Problems against the app-screen lens:

- **First screen overload** — table + 24h strip + action-heavy rows + fat drawer. Prefer: title + primary Create, filters, table that answers “what runs next / what failed,” timeline as secondary or row detail — not three competing regions.
- **Row actions** (Run now, Pause, Edit, Logs) as four equal controls — noisy; one primary + overflow matches Operate restraint.
- **Timeline** risks decorative chrome (sparkline energy). If kept: kind-encoded marks, shared day axis, legend from real states, color = good/bad not arbitrary status rainbow; don’t burn the sole accent on chrome.
- **Tabs vs lifecycle** — filters that don’t match states teach the wrong model (`waiting_approval` invisible).
- **Typography/hierarchy** — unspecified. Operate: tight rem scale, one family, title ~18–24px, data alignment (times tabular, status as text+mark). Status-first column with no mark language → contrast/legibility debt.
- **Motion** — silent in the doc; Operate allows only short state feedback (drawer, status, timeline update), no load choreography. Spec should say that so implementers don’t “delight” a ops screen.

**Workflows (“grid of cards”)**  
This is the loudest design smell: identical cards (name, description, last run, Run) are exactly the generated-launcher pattern both skills push against on product surfaces. Prefer a **dense list/table** consistent with Tasks (name, triggers, last/next, Run), detail on select — not a marketing card grid inside an ops app.

**Shared product face**  
Tasks = operational table; Workflows = card gallery; definitions = YAML. No single shell language, density, or “one element only this product has” (e.g. next-fire strip as the signature, reused on both). Reads as two kits glued by a runner.

**Copy / cognitive load**  
“Target (model or Hermes)” and schedule “cron plus human text” are good. Drawer + Custom cron + catch-up/overlap policies in one place without progressive disclosure exceeds a sane decision budget for a recurring-job screen.

---

### Priority fixes (if this spec is revised)

1. **One scheduling object** — either Task wraps Workflow+cron, or Workflow triggers own schedule; one list UI.
2. **Align status model** across tabs, table, timeline, lifecycle (include approval/cancelled).
3. **Replace Workflow card grid** with a list consistent with Tasks; keep YAML/form for definition, not for browsing.
4. **Specify the first screen** — title, primary action, empty/error, what the timeline encodes.
5. **Security section** — shell approval/allowlist, webhook secret handling, log retention/redaction, dry-run guarantees.
6. **Cut v1 surface area** — fewer starters and step types until the Tasks operate loop meets acceptance criteria.

---

Questions skipped: full impeccable dual-agent critique / detector (no rendered target; Ask mode; doc-only review as requested).
