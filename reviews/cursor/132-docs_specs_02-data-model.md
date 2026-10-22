**Verdict:** As a local SQLite sketch this is usable, but as the foundation for Operate UI it is under-specified where lists, states, and audit need concrete fields—and over-scoped as equal peers. The design risk is a flat “everything app” shell with badge/status chrome instead of one-job screens.

Lens: impeccable **Operate** (task UI, density, state, motion-as-feedback) + design-taste **app screens** (colour on data not chrome, honest states, one question per screen, no template KPI/badge soup). This is a schema review, not a rendered-UI critique—no PRODUCT.md/DESIGN.md and no live surface to inspect.

---

### Contradictions

1. **`message.run_id` vs roles** — Invariant says every *assistant* message links to a run; the column is on all messages with no nullability. User/system/tool rows are unspecified, so UIs will guess or show broken “run” affordances.

2. **Denormalized model triple** — `message` and `run` both carry `model`, `effort`, `provider`. App-screen rule: a fact shown twice is one variable. List vs detail can disagree after retries/reroutes with no source of truth.

3. **`run` vs `workflow_run`** — Parallel lifecycle fields (`status`, `started_at`, `finished_at`) and `run.kind` includes `workflow_step`, but there is **no FK** between them. Timeline, inbox “failure”, and kanban `source_ref` cannot reliably answer “which step of which workflow?”

4. **`attachment` vs `file_index`** — Both `file_id` and `path` on attachment; `file_index` is a separate path-keyed table. Unclear whether chat files are indexed, duplicated, or stale when paths move—preview/open will be inconsistent.

5. **Kanban column drift** — Card `column` is a free string; board has `columns_json`. Renames/removes leave cards in phantom columns (classic board UI bug).

6. **Card `source_ref_json` “one of”** — Invariant claims exclusivity (inbox | finding | run); schema cannot enforce shape or cardinality. UI will invent badges for multi-source or empty refs.

7. **`hermes` overload** — Appears as `run.kind`, `agent.kind`, and implied `memory_item.owner`. Same word, three object types → IA and empty-state copy will blur “agent / run / memory.”

---

### Gaps (schema → broken or guessed UI)

| Gap | Why it matters for Operate UI |
| --- | --- |
| No `updated_at` / `last_activity` on conversation, inbox, task, workflow, agent, scout | Sort/“fresh” hierarchy defaults to `created_at` → wrong scan order |
| `inbox_item` status includes `snoozed` with no `snooze_until` | Cannot schedule return or explain “until when” |
| No message lifecycle (`streaming` / `complete` / `failed` / `cancelled`) | Chat must fake state; error vs partial content is unclear |
| No `run`↔`workflow_run` (or `task`) link | Cross-surface “open source” from inbox/kanban is guesswork |
| JSON columns unconstrained (`usage_json`, `tool_calls_json`, `definition_json`, `source_ref_json`, …) | No stable row fields for dense lists → either thin rows or dump JSON |
| `creator` / `assignee` as free strings; no actor table | People-as-identity (stable tint/initial) from app-screens has nothing to hang on |
| Orphan policy without tombstone | “Deleting a source never deletes the card” but no `source_missing` / label → dead links and empty bodies |
| No retention on `event`, `thinking_md`, `run_step` | Unbounded growth; history UIs get heavy without pagination contract |
| No indexes / FKs / cascade rules (except the one card note) | Delete semantics and list performance left to implementers |
| Priority/relevance types undefined | Shared severity colour language across inbox + kanban + scout will diverge |

---

### Unrealistic scope

One DB treats as first-class peers: connections/routing, chat, runs/steps, cron tasks, workflows + runs, agents, inbox (6 kinds), kanban, scout + findings, projects, file index + embeddings, Hermes memory, append-only events.

That is a full agent OS. At this fidelity, each domain is a stub (`definition_json`, `config_json`, `efforts_json`). Expectation risk: shipping every surface with equal nav weight—the app-screen failure mode of a template dashboard (many objects, no single question). Prefer phasing (what is v1 durable vs derived) or nesting (e.g. scout/hermes under agent + inbox, not top-level equals).

---

### Security / privacy

- **“Secrets are never stored; see 12”** is necessary but weak next to `input_json`, `output_json`, `tool_calls_json`, `error`, `usage_json`, `config_json`, `definition_json`—these routinely hold tokens, paths, prompt injection content, and API payloads unless redaction is specified *here*.
- **`thinking_md`, `content_md`, `memory_item.value_md`, file `summary` / `ai_tags_json`** are high-sensitivity cleartext in `junos.db`.
- **Backups:** nightly copy to `~/.junos/backups/` (14 keeps) + on-demand **JSON export per table** with no encryption, ACL, or export-scope (exclude thinking/memory?). Local malware or shared machine = full history.
- **`embedding_ref` + filesystem `path`s** extend the trust boundary beyond the DB; not acknowledged.
- No field-level retention or “forget” for memory/messages (privacy UX and legal hygiene).

---

### UI / design-quality risks (from what this model forces)

**Hierarchy & IA**  
Schema lists ~20 entities with no product hierarchy. Without a primary object graph, Home/Inbox/Kanban/Chat will compete; colour and badges migrate onto chrome (status chips for every `kind`) instead of onto the one finding—against app-screen “colour on data, not chrome” and Operate “one task.”

**Density & legibility**  
Inbox/kanban/scout lists need short title, one evidence line, severity, and one action. The model gives `title` + `body_md` / `summary` and opaque JSON. Likely outcomes: markdown walls in list rows, or truncated mush. No structured preview (`headline`, `evidence_line`, `action`) for scanability at 14–16px.

**Typography / contrast**  
Freeform `error` / `status` strings without severity or code → inconsistent tone and colour (grey-on-grey “failed” vs screaming red everywhere). `thinking_md` vs `content_md` has no presentation contract (collapsed secondary vs equal weight)—easy to ship two same-size markdown columns and kill hierarchy.

**Spacing / composition**  
`labels_json` + `ai_tags_json` + six inbox kinds + five statuses invite pill clusters and identical card rows—page house-rule “no pill badges / identical cards”; app screens allow quiet labels, not rainbow tags. Boards with free `column` + `position` but no WIP/limits invite endless columns.

**Motion**  
Runs have status + steps but no progress/phase/current_step pointer. UIs will poll and decorate with spinners or orchestrated “agent thinking” motion. Operate wants 150–250ms state feedback, not load choreography; schema should make *which step is current* trivial to bind.

**States (empty / zero / error)**  
Missing: draft conversation, cancelled run, dismissed-with-reason, source-deleted card, snooze expiry, disabled model still referenced by routing. Empty states will be generic (“No items”) because kinds aren’t tied to job-specific copy fields.

**What the model does get right for UI**  
ULIDs + UTC timestamps; pinned conversation/memory; run ↔ assistant message audit intent; run_step sequence for honest timelines; append-only `event`; card surviving source delete (if orphan UX is specified); secrets out of DB (if JSON redaction is real).

---

### Priority fixes (spec-only; not implementing)

1. Resolve **run graph**: FK `run.workflow_run_id` / `task_id`, nullable `message.run_id`, single source for model/effort/provider.  
2. Add **list/scan fields** and time semantics: `updated_at` / `last_message_at`, `snooze_until`, message/run status enums, optional `severity` shared by inbox/kanban/scout.  
3. **Constrain or document JSON shapes** (especially `source_ref_json`, tool calls, workflow definition versioning).  
4. **Privacy section in this doc**: what is encrypted, what backups/exports exclude, redaction rules for JSON blobs, retention for thinking/events/memory.  
5. **Scope the entity map** for v1 so IA can answer one question per screen instead of equal peers for every table.

---

If you want a follow-up, the highest-leverage next pass is mapping each table to one Operate screen question (per app-screens §2.2) and marking fields required for that first viewport—still Ask-mode / advisory only unless you switch to Agent mode.
