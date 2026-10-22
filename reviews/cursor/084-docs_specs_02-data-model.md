**Verdict:** This schema sketches a whole product OS (chat, agents, workflows, kanban, scout, memory, embeddings) in one SQLite file, but leaves the Operate-mode UI under-specified: hot lists lack the fields that make quiet, dense screens work, and loose JSON refs plus “secrets never here” without redaction rules create privacy and craft risk.

Mode for surfaces this drives: **Operate** (impeccable) / **app screens** (design-taste). Review is of the doc only; no rendered UI.

---

### Contradictions

1. **Dual source links for cards** — Invariant says a card refs one inbox item / finding / run via `source_ref_json`, but `scout_finding` also has `card_id`. Which side owns the link? UI will show broken or duplicate “open source” affordances.
2. **`attachment` vs `file_index`** — Attachment has both `file_id` and `path`; file index is a separate table. Canonical identity for “open file / preview / mime” is unclear, so list rows and detail panes will invent competing models.
3. **Orchestration overlap** — `task`, `workflow` + `workflow_run`, and `run` / `run_step` (kinds: chat | task | workflow_step | scout | hermes) all represent work. No stated mapping (e.g. does a workflow_run spawn runs?). Settings, history, and status colour will fork into several inconsistent timelines.
4. **Conversation vs agent** — `conversation.kind: chat | agent` and `agent_id`, while every `message` carries `model` / `effort` / `provider`. Agent runs also live on `agent` + `run.kind`. Three places to hang “what ran” → three UIs.
5. **Routing scope vs conversation** — `routing_rule.scope` is `default | task | workflow | agent`, but `conversation` has `project_id` with no project (or conversation) routing scope. Project-scoped model order is implied by the entity graph and missing from routing.
6. **“Secrets never stored” vs dump columns** — `connection.error`, `agent.config_json`, `run.input_json` / `error`, `run_step.input_json` / `output_json`, `message.tool_calls_json` routinely hold tokens, paths, and payloads. The invariant is aspirational unless those columns are denylisted or redacted.

---

### Gaps (schema → broken or generic UI)

Fields Operate screens need that this doc does not define:

| Surface | Missing for good lists / density |
| --- | --- |
| Chat / conversation list | `updated_at` or `last_message_at`, preview snippet, unread/seen — only `created_at` + `pinned` |
| Inbox | Sort/order invariant with `priority` + `status`; snooze until; actor |
| Runs / audit | Human `summary` on `run`; streaming/partial state beyond opaque `status` |
| Kanban | Typed `columns` contract; uniqueness of `position`; who `creator` / `assignee` are (no user table) |
| Scout | What `relevance` / `effort_est` mean for colour-on-data (not vanity KPIs) |
| Files | How `embedding_ref` / `summary` / `ai_tags_json` appear in search UI; truncation |
| Almost everything | Enums: only inbox status is fully listed; `connection.status`, `run.status`, `agent.status`, finding/card statuses undefined → badge/contrast chaos |

Also missing: FKs/cascades, uniqueness, indexes, schema version, retention for append-only `event`, and a typed shape for `*_json` / `source_ref_json` (discriminated union). Soft refs force either raw JSON editors (slop) or undocumented derived views.

---

### Unrealistic scope

Roughly **20+ first-class tables** spanning connection/routing, chat, runs, cron tasks, workflow engine, agents, inbox, kanban, scout pipeline, projects, semantic file index, Hermes memory, and an event log — plus nightly backup and per-table JSON export.

For a first shippable Operate product this is several apps. design-taste’s app-screen rule is one primary job per screen and honest magnitudes; this model invites a sidebar of every noun and a dashboard of KPI tiles (`usage_json`, token counts, relevance, effort_est) with no stated “one question.”

Unrealistic for UI craft: shipping all of these without a **primary object** and a **thin read model** (list row DTOs) guarantees either empty shells or generated-dashboard density.

---

### Security / privacy risks

- **`thinking_md` on every assistant message** — High-sensitivity chain-of-thought in the same DB as chat; backups and “export JSON per table” copy it wholesale.
- **Backups to `~/.junos/backups/` (14 days) + on-demand full-table JSON** — No redaction, encryption-at-rest, or export scope. Paths, repo URLs, memory, embeddings refs, tool payloads, and errors leave the live DB together.
- **Filesystem identity** — `project.path`, `attachment.path`, `file_index.path` in exportable rows; path disclosure and over-broad file access if the app trusts these strings.
- **`memory_item` “Hermes memory, editable”** — No owner model beyond opaque `owner`; editable memory is a prompt-injection and exfil surface if shown/edited without clear tenancy.
- **`embedding_ref`** — Vectors of user content; location, access, and deletion with source files unspecified.
- **Invariant without mechanism** — “Secrets never stored; see 12” does not name forbidden columns, scrubbing on `error`, or how connection credentials are referenced. `config_json` / `input_json` will become the secret store by accident.
- **Multi-actor fields without auth** — `creator` / `assignee` as free text with no user/session table: fine for single-user local, dangerous if the UI ever implies shared boards.

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility, contrast)

Through impeccable Operate + design-taste app-screens:

1. **No list-row contract** — Hot paths (inbox, conversations, runs, findings, cards) only have markdown/JSON bodies. Quiet dense UIs need one-line titles, secondary lines, and tabular figures — not `body_md` / `content_md` in the first column. Without that, UIs either truncate blindly (illegible) or render full markdown in lists (density collapse).
2. **Hierarchy will flatten** — Many peer entities, no documented aggregate or “home” object. Likely shell: equal-weight nav for Inbox / Chat / Kanban / Scout / Agents / Workflows / Files — the opposite of “navigation recedes” and “one job from the first screen.”
3. **Colour-on-data underspecified** — Status/priority/relevance exist as names without enums or semantics. Screens will invent rainbow status chips (generated-dashboard tell) instead of one data hue on the decision that matters (e.g. approvals only).
4. **JSON columns push settings/forms to dump UIs** — `definition_json`, `config_json`, `output_dest_json`, `labels_json`, `ai_tags_json` with no form model → monospace blobs, hairline key/value tables, or icon-card grids of “capabilities.” All banned tells for app screens unless you add explicit form schemas.
5. **Audit vs scan conflict** — Keeping `thinking_md`, `tool_calls_json`, and per-step `input_json`/`output_json` is good for audit, bad if the default run detail is a full dump. Missing `summary` / collapsed-by-default flags means motion and hierarchy have nothing to progressive-disclose.
6. **Motion / live runs** — `run.status` + timestamps only. No progress, current step pointer, or partial output ref for streaming chat. Live surfaces will fake motion in the UI with no data to pace it — or freeze until `finished_at`.
7. **Kanban density** — `columns_json` + string `column` + `position` without invariants → column drift, unstable sort, ragged boards. `labels_json` invites pill clusters.
8. **Contrast / legibility** — Markdown-as-storage with no plain-text `preview` or sanitization note: list previews will be grey `#`/`*` noise or unsafe HTML if rendered carelessly. Secondary metadata (`effort`, `provider`, token counts) will compete with titles unless a type scale is implied by the model (it isn’t).
9. **Empty / zero / error states** — No guidance for empty inbox, failed run, disabled scout source, or missing embedding. App-screen craft requires honest empty frames; the schema doesn’t name those states beyond a few status fields.
10. **Scout metrics as KPI trap** — `relevance` and `effort_est` on findings are exactly the fields that become four tinted KPI tiles + sparklines unless the product forbids that. Prefer them as sort keys or one muted secondary line.

---

### Priority fixes (if you revise this doc only)

1. Pick a **v1 subset** of tables and mark the rest deferred; name the primary job object.
2. Add **list projections**: `preview`, `updated_at` / `last_activity_at`, typed status enums, and a single `source_ref` discriminated union (drop competing `card_id` or document ownership).
3. Replace unbounded JSON in user-facing entities with **named columns or versioned form schemas**; keep raw JSON for true append-only audit (`event`, maybe `run_step`) behind a collapsed detail.
4. Make privacy concrete: **column denylist**, backup/export redaction (no `thinking_md` / tool payloads by default), encryption or “local profile” note, and scrubbing rules for `error`.
5. Wire **workflow_run ↔ run**, **attachment ↔ file_index**, and **routing ↔ project** so the UI has one timeline and one file identity.

---

Questions skipped: Ask-mode doc review (not a live impeccable critique of a rendered target); no PRODUCT.md/DESIGN.md in repo to pin brand.
