**Verdict:** The scheduler contract is the strongest part of this spec; the UI surface and the Task/Workflow split are the weakest. As an Operate screen (queue + launcher), the doc overloads one Tasks view, underspecifies how workflow crons actually fire, and leaves a few security edges that conflict with invariants in 12.

Lens: **impeccable Operate** (scanability, states, motion restraint) + **design-taste app-screens** (tables/lists, density, row actions, no template chrome). Review is of `docs/specs/05-tasks-and-workflows.md` only; other specs cited only where this doc claims or contradicts them. Could not re-verify commit `595fe13` via git in Ask mode; review is against the workspace file content.

---

### Contradictions

1. **Three incompatible status models**  
   - Tabs: All / Running / **Paused** / Failed  
   - `scheduled_run`: `due | claimed | running | succeeded | failed | skipped` (plus prose “failed (lost)”, not in the enum)  
   - Run lifecycle: `queued → running → (waiting_approval) → …`  
   “Paused” is never a run status (likely `task.enabled`), `queued` ≠ `due`/`claimed`, and `waiting_approval` never appears on `scheduled_run`. Implementers will invent mapping; filters and badges will disagree.

2. **“Task = prompt or workflow on a schedule” vs the persistence model**  
   Cron materialisation is only `scheduled_run` keyed by `task_id`. Workflows also have `triggers: [{ type: cron, … }]`, but there is no path that creates slots for a workflow cron, no `workflow_id` on `scheduled_run`, and no rule that a Task is a thin wrapper around a workflow. Same idea said two ways; one runner is claimed, two schedules are not unified.

3. **Retry policy fights itself**  
   - Side-effect rule: only `idempotent` steps auto-retry; external actions need a **new** approval.  
   - Lifecycle: “Failed steps can be retried from that step.”  
   - Gateway (invoked here): approvals are single-use.  
   Unclear whether UI “Retry” means re-claim the same `scheduled_run`, spawn a new run, or resume mid-`workflow_version`—and what happens when the failed step was non-idempotent.

4. **Claim vs run**  
   Atomic claim sets `claimed`, but nothing defines the transition to `running`, what happens if the process dies between claim and start, or whether “Run now” creates a `due` row or bypasses the table.

5. **Overlap vs catch-up**  
   `skip if running` / `queue` and bounded catch-up are both specified; interaction when the laptop wakes with N missed fires *and* a still-leased run is undefined (queue forever? skip? new rows?).

---

### Gaps (blocking for a correct build)

| Gap | Why it matters |
|---|---|
| **Materialisation horizon** | “Created ahead of time” with no window → either empty slots or unbounded `scheduled_run` growth. |
| **Workflow cron execution path** | Starter YAML has a cron trigger; contract only describes task slots. |
| **Pause / cancel / Stop** | Row “Pause” vs lifecycle `cancelled` vs global StopControl (14/12) never linked. |
| **Global event rate cap** | “Global cap” named, no number; per-workflow 10/h alone is not enough. |
| **`provider_allow` on launch** | Launcher has model/effort override; 12 requires allowed providers per workflow—form omits it. |
| **Param schema & injection** | `{{topics}}` + webhook/event/chat params: types, required fields, and whether untrusted event payloads can enter prompts. |
| **DST / timezone edge** | Explicit TZ is good; unique `(task_id, due_at)` under DST fold/gap is not discussed. |
| **Lease length / heartbeat interval** | Lease exists; durations and clock-skew behaviour do not. |
| **Screen states** | 14 requires loading/empty/error/offline; 05 only has the happy mockup. |
| **Keyboard / focus** | Safety-adjacent actions (Run now, Pause) with no focus model; 14 says keyboard-first. |
| **Phone / &lt;900px** | 8-ish table columns + timeline + 360–420px drawer will not survive the rail→tab collapse in 14 without a list redesign. |

---

### Unrealistic scope (for “first release” framing elsewhere)

The **runner contract** (claim, lease, catch-up, idempotent resume, versioned defs, loop guard, dry-run) is already a full Phase 1–2 deliverable.

On top of that, this single doc also ships: `branch`, `hermes`, `shell`, event bus triggers, localhost webhooks, chat `/workflow`, form+YAML editing, schedule builder with next-5 preview, 24h timeline, side drawer with history, **and** six starters (two explicitly Phase 3). That is several products. Open question “visual flow editor vs YAML” is correctly deferred; the rest of the step/trigger surface is not.

Acceptance criteria cover only: create daily task, daemon restart, approval pause. They do not cover dry-run, catch-up caps, loop guard, webhook, or branch—so the written bar is smaller than the written design.

---

### Security / privacy risks

Strong alignments with 12: gateway for side effects, dry-run blocking write-local+, non-idempotent steps needing fresh approval, loop depth on event triggers.

Residual risks **inside this doc**:

1. **Webhook (`localhost, token`)** — Token in keychain is implied by 12, but 05 does not require: bind address, path allowlist, body size limits, replay resistance, or that webhook payloads are **data** (12 untrusted-content rule) not instructions. A local process with the token can fire any workflow that accepts the hook.

2. **`inbox.item.approved` → workflow** — Easy to build approval→automation→new approval loops; depth/rate help, but “pause the workflow” without a clear resume/disable UX is an ops footgun.

3. **Prompt / log egress** — Tasks send prompts on a schedule; run logs and Inbox results will hold model I/O. No retention/redaction callout here (12 has patterns; 05 should say logs are SafeMarkdown’d and secret-redacted).

4. **YAML-as-definition** — Editable YAML in UI is a power feature; no mention of schema validation, rejected unknown step types, or blocking `shell`/`hermes` without classification. Invalid or hostile defs become a local RCE/exfil path *through* the gateway if classification is wrong.

5. **Chat `/workflow name`** — On-demand launch from chat with no confirmation step specified for workflows that include write/external steps (gateway still asks, but surprise approval spam is a UX/security failure mode).

6. **Dry-run skip** — “Tool steps must declare dry-run behaviour or are **skipped**” can hide that a real run would have taken a dangerous path; safer default is fail closed (“cannot dry-run”) for undeclared tools.

---

### UI / design quality (Operate + app-screens)

This is an **app screen**, not a marketing page. Ambition should be precision and one job, not ornament.

**Hierarchy / cognitive load**  
The Tasks screen tries to be: filter tabs + dense table + 24h timeline + full editor drawer (name, prompt, model, schedule builder, destinations, history). That is multiple jobs on one surface. Impeccable Operate wants the tool to disappear into the task; taste §2 wants the first screen to answer one question with the primary control one click away. Here the primary job (“what needs attention / what fires next”) fights the editor.

**Table density & actions**  
App-screens §7.8: prefer **one** trailing action (or kebab); four always-visible actions (Run now, Pause, Edit, Logs) will dominate the row, especially once status chips and dual schedule text (cron + human) land. Prefer: status mark + name + next run as the scan path; overflow for Edit/Logs; promote Run/Pause only for Failed / due-soon rows.

**Timeline strip**  
A 24h strip of “today’s runs” is the right *kind* of signature element (taste: one product-specific data mark). Spec does not define marks by outcome (succeeded / failed / skipped / waiting), overlap when many tasks fire, or empty/sleeping-laptop state beyond a vague warning. Without kind-encoded marks (cf. timeline house rules), it becomes decorative chrome or an unreadable tick soup.

**Workflows “grid of cards”**  
Identical Run-cards are a generated-dashboard tell (taste house rules / app tells). Better Operate pattern: compact list or table (name, trigger summary, last run, one Run), with the parameter form as a sheet—not a marketing card grid. Cards are allowed when they *are* the interaction; a uniform card wall still fails the “could be any product” test.

**Drawer as kitchen sink**  
360–420px (14) cannot hold prompt + schedule builder + next-5 + destinations + run history without tiny type, scrolling hell, or collapsed sections that hide the schedule preview the acceptance criteria depend on. Split: edit sheet vs run-detail sheet.

**Typography / legibility / contrast**  
- Schedule cell with both cron and human text needs a two-line pattern (ink + dim)—spec does not say which is primary.  
- Status by colour alone is forbidden by 14; 05 only says “status” column—require StatusDot + text (Running / Failed / Paused).  
- Timeline + table both compete for “when”; pick one as primary scan, demote the other.

**Spacing / density**  
Personal command center with few crons → **medium** density (taste §10), not monitoring density. Do not shrink type to fit eight columns; drop or fold columns (target, last run) before crushing row pitch.

**Motion**  
Operate: 150–250ms state feedback only; no entrance choreography. Spec is silent (good). Do not animate the timeline as a “delight” strip; update in place with a freshness stamp.

**Glass (product tension)**  
14 commits Translucent Glass; taste bans glass for app screens. For *this* doc: prefer flat panel + tone step for the table/timeline (data first). If glass stays as product law, keep blur off the dense table and timeline so contrast and row rules stay readable (`prefers-contrast: more` already in 14).

---

### What to keep

- Persisted slots + atomic claim + lease + bounded catch-up + retry-on-same-row is the right durability story for a sleeping laptop.  
- Dry-run definition tied to gateway classes.  
- `workflow_version` so edits do not mutate in-flight runs.  
- Event loop guard + Inbox failure on breach.  
- Acceptance trio (next-5 preview, restart safety, approval pause) is the right *minimum* bar—if scope is cut to match it.

---

### Highest-leverage fixes (spec-only)

1. Unify status vocabulary and map tabs → fields.  
2. Decide: either Tasks own all cron materialisation (workflows only via Task wrapper), or extend `scheduled_run` for workflows—write one path.  
3. Cut v1 step/trigger surface to prompt / tool / approval / output + manual/cron; park branch, webhook, hermes step, event triggers.  
4. Redescribe UI as: **attention list** (Failed + due soon) + quiet table; timeline as secondary; edit and history as separate sheets; Workflows as list not card grid.  
5. Close webhook/param/untrusted-content and Retry-vs-approval holes in one short “Safety” subsection that points at 12 without re-litigating it.

I can turn this into a patch outline for `05` (still Ask mode: guidance only) or a tighter “v1 slice” acceptance list if you want that next.
