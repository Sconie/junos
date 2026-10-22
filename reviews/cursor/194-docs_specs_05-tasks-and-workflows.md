**Verdict:** The scheduler contract (rev 2) is unusually strong for a product spec; the UI half is still a mockup checklist and fights that contract’s state machine. Operate / app-screen rules would reject the Tasks table and Workflows card grid as specified before any pixels land.

*Ask mode / doc-only: no live UI, no `impeccable detect`, no PRODUCT.md/DESIGN.md in repo. Lens = impeccable Operate + design-taste app screens.*

---

### Contradictions

1. **Three status systems, one screen**  
   Tabs: All / Running / Paused / Failed.  
   `scheduled_run`: `due | claimed | running | succeeded | failed | skipped`.  
   Run lifecycle: `queued → running → (waiting_approval) → succeeded | failed | cancelled`.  
   Unmapped: Paused, claimed, skipped, queued, waiting_approval, cancelled, `failed (lost)`. The Failed tab cannot mean both “last outcome failed” and “row currently `failed` awaiting retry.”

2. **Retry semantics vs UI**  
   Contract: retry reuses the same row and flips `failed` → `due`. Lifecycle: “Failed steps can be retried from that step.” Also: non-idempotent steps “never retried … without a new approval.” Spec never says whether “Retry” in the UI is allowed, approval-gated, or forbidden for side-effect steps.

3. **Task vs workflow ownership**  
   Task = “a prompt **(or workflow)** on a schedule,” yet Tasks and Workflows are separate surfaces, and workflows also have `triggers: [{ type: cron … }]`. A Morning briefing can be a Task, a Workflow with cron, or both — schedule, pause, and “last/next run” have no single owner.

4. **Catch-up vs uniqueness**  
   `run once` “collapses all missed fires into one” while slots are unique on `(task_id, due_at)`. Spec never says which rows become `skipped` vs which one runs — implementers will invent diverging behaviour.

5. **Dry-run scope**  
   Dry-run blocks gateway `write-local`+, but `prompt` / `hermes` steps still run (cost, provider egress, tool use inside the model loop). That is not a dry run for the dangerous half of this product.

6. **Hermes**  
   UI already has “target (model or Hermes)”; Open questions still asks who owns execution. Half-decided.

7. **Acceptance vs destinations**  
   Acceptance requires an Inbox result; the drawer allows chat / file / Inbox / notification. Pass criteria don’t match the product surface.

---

### Gaps (spec holes that block a faithful build)

| Area | Missing |
| --- | --- |
| Materialisation | How far ahead `scheduled_run` rows are created; who creates them; timezone change mid-horizon |
| Pause | What Pause does to `due` rows, in-flight leases, and next materialisation |
| Overlap `queue` | Queue bound, ordering, interaction with catch-up and uniqueness |
| Waiting approval | How Tasks shows `waiting_approval` if Inbox is the only resume path |
| Logs | Retention, redaction, whether step I/O is full prompt text |
| Params | Types beyond `string`; validation; secrets in params |
| Empty / loading / error | First-run Tasks, empty Failed tab, daemon-down, claim stuck |
| Responsive | Table + 24h strip + drawer on phone (app-screens: tables → two-line lists; one pane at a time) |
| IA | When to open Tasks vs Workflows; where a cron-triggered workflow appears |
| “Matches mockup” | Mockup not in the doc — hierarchy unverifiable |

---

### Unrealistic scope (for one slice)

Shipping **lease/heartbeat scheduler + idempotent step graph + event depth/rate limits + workflow versioning + YAML editor + 24h timeline + side drawer + six starters** (news, Inbox, GitHub, Kanban, Files, Scout) is several phases compressed into one acceptance trio. Starters 3–4 admit Phase 3; starters 1–2–5–6 still pull connectors and cross-spec surfaces. `branch` + approval + shell + webhook + `/workflow` is a full automation platform, not a Tasks MVP.

---

### Security / privacy

- **Webhook (localhost + token):** no token storage, rotation, binding to workflow version, or abuse if anything else on the host can hit localhost.
- **Step logs = full input/output:** calendar/mail/news prompts, file paths, shell stdout — default-retain is a local data leak; no redaction policy.
- **Dry-run still runs prompts:** secrets in context still leave the machine to model APIs.
- **Event triggers** (`inbox.item.approved`, `scout.finding`, `kanban.card.moved`): Inbox triage + approval events are a self-trigger footgun even with depth guards; no authz model for who may emit events.
- **`/workflow name` from chat:** no mention of confirmation for write-class workflows.
- **`shell` + gateway:** “external/destructive always asks” — prompt/tool steps that *cause* writes via other tools are out of scope of that sentence.
- **`{{params}}` into prompts:** classic injection into later `tool`/`shell` steps; no sandboxing story.
- **Output to file / notification:** path rules and notification spam/exfil unstated.
- **Repo health across “Jonas’s repos”:** GitHub token breadth implied, never bounded.

---

### UI / design quality (Operate + app-screens)

**Mode:** Operate. Screen kinds: **list** (Tasks) + **home/launcher** (Workflows). Ambition should be precision and one clear job — not marketing density.

**Hierarchy / one question**  
App-screens §2.2: name the one question and put the main job one click away. Spec never states it. Implied jobs fight: “what’s due/failing?” vs “create/edit schedule” vs “run a workflow.” A Failed-first finding (“2 lost leases · 1 waiting approval”) would match the skill; a flat All table with four tabs does not.

**Tasks table — density and actions**  
Four trailing actions (Run now, Pause, Edit, Logs) violate §7.8 (one kebab, or one visible action when the row needs doing). On medium density (44–56px rows) four actions wrap or shrink hit targets; on phone (§12) they become a stack of buttons. Better: primary on failing/due rows only; rest in a menu; Logs on the drawer’s history.

**Status chrome**  
Status column + Failed tab + timeline = triple encoding. Risk of saturated pills on every row (§7.6 / §14: pale tint + dark text; one status mark; don’t paint a fifth of the list as filled CTAs). Map tab filters to the real state machine or the tabs are lying labels.

**24-hour timeline strip**  
One sentence for a calendar-like control. App-screens calendar/timeline rules want: today mark, kind-encoded marks, readable pitch, empty-day honesty, timezone. Without that it ships as a decorative sparkline — a listed tell (§14). Spec also doesn’t say whether the strip is the hero answer (“when did things fire?”) or chrome under the table (then it steals first-screen density for little job value).

**Side drawer**  
Name, prompt, model+effort, schedule builder (with next 5), destinations, history+logs = settings + editor + run viewer in one sheet. Cognitive load: far more than four visible decision points. Split: edit schedule/prompt vs run detail; don’t bury “waiting approval” only in Inbox with no bridge from the row.

**Workflows “grid of cards”**  
Peer object cards are allowed (§13) with limits: equal widths, no icon-on-top, no orphan, one gap. Spec’s “name, description, last run, Run” will default to marketing feature cards unless constrained. For a launcher, a quiet list/table with one Run control usually scans better than a card grid — and matches Tasks vocabulary.

**Tabs**  
Counts belong only on queues that need action (§3.2): Failed (and maybe Waiting) — not decoration on All. “Paused” as a peer of Running without defining Pause is IA noise.

**Typography / legibility**  
“Cron plus human text” in one cell needs the two-line stack (§7.4): human schedule in ink, cron in 12px grey tabular/mono — otherwise cron becomes unreadable mush. Last/next run should be relative words for recency + absolute on the second line; all times need the task timezone visible once on the screen (default Europe/Copenhagen is easy to misread when travelling).

**Spacing / first screen**  
Table + tabs + timeline + row actions at 1440×900 will push history and the sleep warning below the fold. §2.2: every named block shows header + first rows on the first screen; time-sensitive failures before long tables. Spec orders chrome as if everything is equal.

**Motion**  
Unspecified — fine default for Operate (150–250ms feedback only; app-screens: no entrance choreography). Still need explicit drawer open, row claim→running, and timeline tick behaviour so nobody “delights” the ops screen later.

**Contrast / states**  
Daemon-sleep warning, empty Failed, loading skeletons, lease-lost vs user-failed — no visual language. Error stays in-block with Retry (§11); a global banner for sleep is OK if quiet and dismissible, not amber cream ground (inspector trap).

**Copy / trade language**  
“Target (model or Hermes)” is insider jargon on a list meant for daily ops. Prefer product words (“Runs on…”) and keep Hermes as an advanced detail.

---

### Highest-leverage fixes (if you revise the doc)

1. **One state dictionary** shared by tabs, table, timeline, lifecycle, and `scheduled_run` — including Pause, skip, lost lease, waiting approval.  
2. **One ownership rule:** scheduled thing lives in Tasks; Workflows are definitions; cron on a workflow creates/links a Task.  
3. **UI strip to Operate:** table + one finding strip (failures/due); drawer split; actions → one primary + menu; timeline only if marks/kinds/timezone are specified.  
4. **Dry-run and logs** privacy: what still executes; what is redacted; retention.  
5. **Cut starters** to what acceptance can prove without Phase 3 connectors.

---

Questions skipped: full impeccable dual-agent critique + detector (doc-only / Ask mode; no runnable UI target).
