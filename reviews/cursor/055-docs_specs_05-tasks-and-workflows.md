**Verdict:** This is a solid *engine* sketch dressed as a *screen* brief. The runner model is clearer than the UI, and several scheduling/state concepts contradict each other. As Operate UI (impeccable) / app-screen (design-taste), the Tasks table is the right shape; the Workflows card grid and the overloaded drawer are the main design risks.

---

### Contradictions

1. **Task vs workflow scheduling is dual-pathed.** A Task is “a prompt (or workflow) on a schedule,” while Workflows also have `triggers: [{ type: cron, … }]`. Same fire can live as a Task wrapper *or* a workflow cron—ownership, editing surface, and “Pause” semantics are undefined.

2. **Filter tabs ≠ run lifecycle.** Tabs are All / Running / Paused / Failed. Lifecycle is `queued → running → (waiting_approval) → succeeded | failed | cancelled`. Paused is a *definition* state; Running/Failed look like *run* states; `waiting_approval`, `queued`, and `cancelled` have no home. Operators cannot answer “what’s stuck on me?” from the tab row.

3. **Output destinations disagree.** Drawer: chat thread, file, Inbox, notification. Step `output`: inbox, file, chat, kanban card. Notification and kanban each appear in only one place.

4. **Target column vs step-level models.** Table “target (model or Hermes)” vs steps that each set `model` / `hermes` / tools. Unclear what the column shows for a multi-step workflow.

5. **Open question vs shipped behavior.** “Should Hermes own task execution or the daemon?” is still open, but acceptance criteria and starters already assume a working path. Spec both proposes and assumes an answer.

6. **“Matches mockup” with no mockup contract.** No layout, density, or state inventory—easy for implementation to invent chrome the skills would reject.

---

### Gaps

| Area | Missing |
|---|---|
| IA | One screen or two? How do you open a workflow from a task row? |
| Policies in UI | Catch-up, overlap, retries are specified for the runner but absent from the drawer |
| Approval | Inbox item shape, timeout, who can approve, cancel-while-waiting |
| Branch | Condition language, UI for if/else, what “retry from step” means after a branch |
| Dry-run | What it skips (outputs? side effects? shell?) |
| Empty / loading / error | First-run, daemon down, timezone warn (mentioned once, no placement) |
| Logs | Redaction, retention, per-step vs stream, secret scrubbing |
| Params | Types beyond `string`, validation, secrets vs plain defaults |
| Events / webhook | Payload schema, idempotency, auth rotation |
| Responsive | Phone/tablet for table + timeline + drawer |

Acceptance criteria cover create/run/restart/approval only—not overlap, catch-up, webhooks, shell, or branch.

---

### Unrealistic scope

For one spec slice this packs a full automation product: cron + one-shot + catch-up + overlap + retries + DAG steps (`prompt` / `tool` / `hermes` / `shell` / `branch` / `approval` / `output`) + manual/cron/event/webhook/chat triggers + YAML editor + schedule builder + 24h timeline + drawer + card launcher + six starters (mail, calendar, multi-repo CI, scout, files).

Especially heavy for v1:

- `branch` + visual-vs-YAML still open  
- `shell` + allowlist  
- localhost webhook  
- Starter “Repo health … across Jonas’s repos” (personal ops, not product-generic)

A credible cut: **Tasks table + drawer (prompt cron only) + one linear workflow with approval + Inbox**, YAML read-only or form-first. Defer cards, branch, webhook, shell, and most starters.

---

### Security / privacy

- **`shell`:** Arbitrary local execution; “approval unless allowlisted” needs allowlist format, path/args constraints, and audit. High risk if underspecified.
- **Webhook (localhost + token):** Token storage, rotation, binding to one workflow, replay. “Localhost” is not a trust model if anything on the machine can hit it.
- **Prompt interpolation `{{topics}}`:** Injection into model/tool/shell context; no escaping/allowlist rules.
- **Starter workflows (mail, calendar, repos, scout):** Broad personal data in logs and Inbox; no retention/redaction policy here.
- **Run logs (“every step records input, output”):** Likely to capture tokens, mail bodies, calendar detail—needs scrubbing and access rules.
- **Event triggers** (`inbox.item.approved`, etc.): Can chain approvals into further privileged steps without a second gate.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

**Mode:** Operate / app screen — scanability and one job beat expression. Familiar table patterns earn their place; invented chrome does not.

**What’s aligned**

- Tasks as a **filterable table** with schedule, last/next run, and actions fits list/ops screens.
- Schedule builder with **next 5 fire times** is concrete and trust-building (good for timezone/cron anxiety).
- Workflow Run as a **small parameter form** (not a full builder on every launch) is the right restraint.
- Form + YAML over a flow editor matches “start simple.”

**Problems the lenses would flag**

1. **No single screen question.** App-screens: first viewport answers one job. Defaulting to “All” with a full table + timeline does not surface “needs attention” (failed, waiting approval, daemon/sleep warning). Failed exists as a tab but not as the lead.

2. **Action density in rows.** Four actions per row (Run now, Pause, Edit, Logs) exceeds typical table guidance (one primary where needed; rest in row menu/drawer). Cognitive load and cramped cells; poor contrast/hit targets if icon-only.

3. **Timeline strip underspecified → likely slop or illegibility.** 24h strip is a strong *product* idea (signature element), but without marks for status, overlap, hover, empty day, or reduced motion it will become either decorative noise or an unreadable sparkline. Colour must encode *good/bad/needs decision*, not rainbow status chrome. Motion: state only, ~150–250ms—no load choreography.

4. **Drawer is a density bomb.** Name, prompt, model+effort, schedule builder, destinations, run history+logs in one side panel = no hierarchy. Operate wants progressive disclosure (Definition / Schedule / Delivery / History). Catch-up/overlap/retries missing here means advanced behavior is invisible until it surprises the user.

5. **Workflows “grid of cards”** is a textbook generated-dashboard tell (identical peer cards + Run). For a launcher of named automations, prefer a **compact list/table** (name, description, last run, one Run)—same information, less template chrome. Cards only if few peers and equal geometry; don’t default to a marketing-style grid inside the app.

6. **Tabs as status taxonomy.** Mixing Paused with Running/Failed trains the wrong mental model. Prefer: scope filters for *definitions* (Active / Paused) and a separate urgency strip or default sort for *runs* (failed, waiting approval).

7. **Typography / contrast / hierarchy unspecified.** Status, cron vs human schedule, and timeline all need ink hierarchy (primary name, secondary schedule, tertiary last/next). Spec never states sentence-case headers, no zebra, tabular times, or semantic colour limits—implementations will invent uppercase tracked headers and traffic-light pills.

8. **YAML + form dual surface.** Fine if YAML is clearly “advanced” and form is source of truth for common fields; dangerous if both edit the same doc with no conflict model. Monospace only inside the editor (house rule), not on the launcher.

9. **Sleep/daemon warning** is the right honest empty/edge pattern—but placement (“on the Tasks page”) isn’t designed (banner vs inline vs disabled Run now).

10. **No product face.** Nothing Junos-specific (e.g. timeline as the signature, trade language like “Next fire” / “Missed while asleep”)—easy to ship a generic “Automations admin” kit.

---

### Priority fixes (if you revise the doc only)

1. Pick one scheduling owner: Task wraps schedule *or* workflow cron—not both without a rule.  
2. Align tabs/lifecycle/`waiting_approval` and say what the first screen optimizes for.  
3. Unify output destinations; put catch-up/overlap/retries in the Schedule section of the drawer.  
4. Replace workflows card grid with a list; keep Run → small form.  
5. Cut or stage: shell, webhook, branch, most starters; spell allowlist + log redaction before shell ships.  
6. Specify the 24h timeline as the one distinctive element (marks, contrast, empty, reduced motion)—or drop it from v1.

I did not run impeccable’s dual live critique (no rendered UI; Ask mode). This is a spec-only pass through those Operate / app-screen lenses.
