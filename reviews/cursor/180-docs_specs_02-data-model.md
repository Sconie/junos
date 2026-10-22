**Verdict:** The schema is a capable single-user daemon sketch, but it over-models product surface area, leaves integrity and retention underspecified, and encodes several UI anti-patterns (status rainbows, triple-stored “same thing,” dump-first payloads) that Operate-mode / app-screen craft would reject.

Lens: Impeccable **Operate** (task UI, scanability, states) + design-taste **app screens** (colour on data not chrome, honest density, one job per screen). This is a schema review, not a rendered-UI critique.

---

### Contradictions

1. **Card ↔ source linking is dual and fuzzy.** Invariant says a card references one inbox item / finding / run via `source_ref_json`, but `scout_finding.card_id` is a second link. Deleting/updating one side can desync the other; “one reference” is not enforceable.

2. **`attachment.file_id` has no table.** Only `file_index` exists. `file_id` vs `path` vs `file_index.id` is unresolved—three identity stories for one file.

3. **`message.run_id` vs “every assistant message”.** Column is on all messages; user/tool roles are unspecified. Runs also cover `task | workflow_step | scout | hermes`, which may never produce a chat message—audit trail claim is only half-true.

4. **Two run graphs.** `run` / `run_step` and `workflow_run` sit side by side with no FK. Unclear whether a workflow step *is* a `run` or only lives under `workflow_run`.

5. **Findings live twice.** `scout_finding` and `inbox_item.kind = finding` (plus optional kanban card). Same object, three list UIs, no canonical row.

6. **“Secrets never in this DB” vs reality of columns.** `content_md`, `thinking_md`, `tool_calls_json`, `input_json` / `output_json`, `config_json`, `connection.error`, `event.payload_json`, `memory_item.value_md` will hold tokens, paths, diffs, and mail. The invariant contradicts the payload shape unless redaction/retention is part of *this* model (12 alone is not enough).

7. **Timestamp policy is uneven.** Intro mandates ISO UTC, but editable entities (`task`, `workflow`, `conversation`, `agent`, `inbox_item`) mostly lack `updated_at` while `kanban_card` / `memory_item` have it—breaks “recent” / sync semantics the Home/Search UI will need.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No delete/cascade / soft-delete rules (except card orphaning) | Orphan messages, dangling `run_id`, zombie findings |
| No `snoozed_until` while status includes `snoozed` | Inbox can’t wake items; UI will fake it |
| No link `task` → `run`, `workflow_run` → `run` | Activity and audit UIs can’t join cleanly |
| No retention / size caps in this doc | Conflicts with “nightly full DB copy, keep 14” once thinking + tool JSON grow |
| No schema version / migrations | ULID + JSON blobs without versioning = silent breakage |
| No unique keys (`provider+name`, `project.path`, board column membership) | Duplicate models/projects; kanban `column` free string vs `columns_json` |
| `output_ref` / `embedding_ref` opaque | UI and backup story don’t know what’s on disk vs in SQLite |
| Preferences / a11y (density, reduced motion, contrast) absent | Design skills treat these as product requirements; data model can’t express them |
| `owner` / `creator` / `assignee` as bare strings | No stable identity for people/agents in lists |
| Search: no FTS / index story for `content_md`, `summary`, tags | Spec implies rich retrieval (`embedding_ref`) without query surface |

---

### Unrealistic scope

One SQLite file is asked to be: chat store, agent memory, workflow engine, cron scheduler, kanban, scout, file corpus + embeddings pointer, and append-only audit log—**before** retention, blob offload, or compaction.

Especially heavy for “keep 14 nightly copies”:

- `thinking_md` + `tool_calls_json` + per-step `input_json`/`output_json`
- `file_index` at project scale
- unbounded `event` stream

Export “JSON per table on demand” without size/redaction policy is a footgun, not a feature. Dual orchestration (`task` cron **and** `workflow` **and** agent kinds) is a lot of first-class surface for a v1 schema.

---

### Security / privacy

- **Sensitive-by-default columns** with no classification, TTL, or redaction flags—backup and export amplify leakage.
- **Backups/export unencrypted** in the doc (`~/.junos/backups/`).
- **`attachment.path` / `project.path`**: absolute paths in UI, logs, and exports (home-directory disclosure).
- **`connection.error` / tool payloads**: classic accidental secret sinks; 12’s “redact known patterns” isn’t reflected here (e.g. no `redacted_bool` / separate safe summary).
- **`scout_source.url_or_query`**: query strings often carry keys.
- **Approvals in `inbox_item.body_md`**: command/diff forever in DB + backups.
- **Append-only `event`**: good for audit, bad for privacy without compaction and export controls.

---

### UI / design-quality (schema → screen)

Operate / app-screen lens: colour on data, one job per screen, quiet chrome, honest density, no template tells.

1. **Hierarchy / IA** — Overlapping entities (inbox ↔ finding ↔ card ↔ run ↔ message) push a “dashboard of everything” shell: KPI-ish connection `usage_json`, mixed inbox kinds, kanban, runs. That fights “one question first” and invites the generated-dashboard tell set (status tiles, sparkline bait, pill rows).

2. **Density** — Messages pack `content_md` + `thinking_md` + `tool_calls_json` as peers. Without collapsed/summary fields, chat defaults to a wall (cognitive load ≫ 4 decision points). `run_step` with raw JSON invites monospace dumps outside real code blocks (house-banned pattern).

3. **Typography / legibility** — No separate `title`/`summary` vs body for runs, inbox, or steps (`run_step.summary` is the rare good field). UIs will elevate `ai_tags_json`, `labels_json`, `relevance`, `effort_est` as tiny tracked labels/pills—exactly the chrome the skills reject.

4. **Contrast / colour** — Many parallel `status` enums (`connection`, `run`, `inbox`, `agent`, `finding`, `workflow_run`) plus freeform kanban `column` encourage a status rainbow on chrome. App-screen rule: hue on meaningful data change, not every badge. Shared priority scales aren’t defined → inconsistent visual weight between inbox and board.

5. **Spacing / composition** — Kanban as a core table biases toward card grids; inbox mixes approval / failure / digest without grouping keys → one flat, noisy list unless the UI invents structure the schema doesn’t support (`pinned` only on conversation/memory).

6. **Motion** — Live `run.status` + high-volume `event` rows imply flicker/toasts with no digest aggregation fields (except `kind=digest`) and no user motion preference store. Risk: animation as substitute for hierarchy.

7. **Empty / error states** — Free-text `error` fields push raw provider strings into the primary surface; no `error_code` / user-facing `error_summary`. App screens want honest empty frames, not exception stacks.

8. **Identity / specificity** — String `assignee`/`creator`/`owner` block the “stable person tint / agent as itself” pattern; everything becomes generic “Items / Status / Records.”

---

### Highest-leverage fixes (guidance only; Ask mode)

1. **One canonical object graph** — Pick finding *or* inbox row as source of truth; card holds a typed FK (`source_type`, `source_id`), drop the duplicate `card_id` or derive it.
2. **Split hot vs cold** — Message body in DB; thinking/tool/run IO in capped blobs with TTL; `event` compaction; encrypted backups.
3. **UI-facing projections** — `list_title`, `list_summary`, `severity` (one shared scale), `collapsed_json`—so screens aren’t forced to render storage shape.
4. **Unify runs** — `workflow_run` as parent; steps are `run` rows (or drop `run` for non-chat). Wire `task_id` / `workflow_run_id` on `run`.
5. **Fix attachments** — `file_index_id` only; path resolved from index; no parallel `file_id`.

---

**Doc quality:** Dense and useful as a whiteboard dump; too thin as a build contract (invariants cover one card rule and one audit claim, then stop). For Operate UI, the schema currently optimizes for storage flexibility over scannable hierarchy—which is where design quality will fail first.

I can go deeper on any one table’s UI implications, or cross-check against `07`/`09`/`12` if you want that next (still Ask mode).
