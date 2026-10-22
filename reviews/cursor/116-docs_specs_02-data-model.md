**Verdict:** The schema sketches a full personal OS in one SQLite file, but it under-specifies enums, ownership, retention, and how overlapping “sources of truth” relate. That will force Operate UIs into JSON bags, ambiguous status chrome, and privacy-blind defaults.

Lens: **impeccable** Operate/Read (scanability, states, cognitive load) + **design-taste** app-screens (honest data states, colour on meaning, quiet density, no vanity chrome). Doc-only review; no browser/detector.

---

### Contradictions

1. **Bidirectional card↔finding link**  
   Invariant: a card references one source via `source_ref_json`. Schema also has `scout_finding.card_id`. Two writers for one relationship; delete/orphan rules are undefined if they disagree.

2. **Routing vs per-entity model fields**  
   `routing_rule` scopes `default | task | workflow | agent` with `model_order_json`, while `task` and `message` also store `model` / `effort`. Unclear which wins at run time and what the UI should show as “the” model.

3. **`run` vs `workflow_run`**  
   `run.kind` includes `workflow_step`, but `workflow_run` is a separate table with no link to `run` / `run_step`. Inbox/kanban `source_ref` can point at “one run” — which ID?

4. **`message.run_id` invariant vs schema**  
   “Every assistant message” is linked to a run, but `run_id` is just another column: nullability for user/system messages, tool-only turns, and failed runs before a message exists is unspecified.

5. **`attachment.file_id` and `path`**  
   Dual identity for the same file; conflicts with `file_index` and with the “one path of truth” Operate screens need.

6. **Secrets claim vs payload columns**  
   “Secrets are never stored in this DB” sits next to `config_json`, `input_json`, `tool_calls_json`, `usage_json`, `memory_item.value_md`, and `event.payload_json` — all natural places for tokens, paths, and tool output.

---

### Gaps

| Area | Missing |
| --- | --- |
| Enums | `message.role`, `run.status`, `agent.status`, `connection.status`, priorities, kanban `column` identity, finding `status` |
| Nullability / FKs | Cascade vs null on `conversation.agent_id`, `project_id`, `attachment.message_id`, finding↔card |
| JSON shapes | `source_ref_json`, `output_dest_json`, `definition_json`, `efforts_json`, `columns_json` |
| Time | `updated_at` on conversation, inbox, message; snooze-until for `snoozed`; retention for `event` |
| People | `creator` / `assignee` with no user/identity table |
| UI Operate needs | draft/partial stream state, unread/seen cursors beyond inbox, archive, soft-delete, display name/colour for agents |
| Integrity | Unique constraints (e.g. one default routing rule), `position` reordering, cron/`next_run_at` ownership |
| Search | `embedding_ref` with no store, dimension, or wipe story |

---

### Unrealistic scope

One DB owns chat, runs, cron tasks, workflows, Hermes memory, Scout, kanban, projects, file index + embeddings, and an append-only event log. That is fine for a local MVP **if** the doc admits phases and retention; as written it reads like ship-everything-day-one.

Especially heavy without bounds:

- Unbounded `message` + `thinking_md` + `tool_calls_json`
- `file_index.summary` / `ai_tags_json` / embeddings for whole trees
- `event` append-only with no purge
- Nightly full-file backup + “export JSON per table” with no size/PII story

For app-screen craft: unbounded rows without archive/collapse fields push lists toward KPI/chrome noise or infinite density instead of one clear job per surface.

---

### Security / privacy risks

1. **Backup amplification** — Nightly copy of `junos.db` (14 days) plus on-demand JSON export duplicates chats, CoT (`thinking_md`), tool payloads, memory, and file summaries under `~/.junos/backups/` with no encryption, access mode, or redaction called out here.
2. **CoT and tools as durable PII** — `thinking_md` and `tool_calls_json` often contain secrets and personal context; “secrets not in DB” does not cover them.
3. **Memory as free-form markdown** — `memory_item.value_md` is editable Hermes memory with no sensitivity class or export exclusion.
4. **Filesystem index** — Paths, summaries, tags, embeddings: high-value local surveillance surface if the DB or backups leak.
5. **No tenant/device boundary** — Single anonymous SQLite implies any process with FS access owns the whole life graph; doc does not state that threat model.
6. **Connection row** — `usage_json` / `error` can echo provider payloads; plan/method without saying credentials live elsewhere (only “see 12”) is easy to implement wrong.

---

### UI / design-quality problems (schema → Operate UI)

**Hierarchy / IA**  
`conversation.kind` (`chat | agent`), `agent.kind` (`hermes | scout | custom`), and `run.kind` (`chat | task | workflow_step | scout | hermes`) overlap. Nav and empty states will fight over what an “Agent chat” vs a “Hermes run” vs an inbox `mention` is. App-screens want one product face and one primary job; this model spreads identity across three kind systems.

**Density**  
Six inbox kinds × five statuses, plus kanban labels, priorities, and free-form `body_md`, without presentation hints (short title rules, preview truncation, kind→mark mapping). Expect chip soup and status rainbows — the opposite of “colour on data, not chrome.”

**Typography / legibility**  
Everything important is `*_md` with no preview/excerpt field. Cards and inbox rows will either clip blindly or dump markdown walls. No tabular/numeric types for tokens (`tokens_json`) → weak run summaries (app-screens: KPIs as type, honest zeros/dashes).

**Spacing / structure**  
`kanban_board.columns_json` + `kanban_card.column` as a loose string encourages rename breakage and uneven columns; `position` alone does not define drop targets or collapsed columns. List UIs lack `updated_at` / activity cursors, so sort/sticky hierarchy will be invented in the client.

**Motion**  
`run_step` helps progress, but there is no first-class streaming/partial message or “live step” flag. Clients will fake motion on full row rewrites or poll `event` — easy to get noisy, hard to respect reduced-motion with meaningful progress.

**Contrast / meaning**  
`priority`, `relevance`, `effort_est`, `status` are untyped. UI will invent greys and hues without a stable kind→mark map (the app-screen calendar rule: each kind has its own mark; full colour only for decisions). `connection.status` / `error` similarly invite generic red badges instead of one actionable state.

**States the craft floor expects, schema omits**  
Empty, loading, partial failure, snoozed-until, archived conversation, dismissed-with-reason, missing assignee (`—`), zero tokens. Without columns or invariants for these, screens default to template emptiness or hide errors in `error` strings.

**JSON as UI**  
`definition_json`, `config_json`, `usage_json` push settings/workflow editors toward raw JSON or generated form soup — high cognitive load (>4 decisions) unless a later spec hardens shapes.

---

### Priority fixes (if you tighten only this doc)

1. One ownership story for card↔source (drop either `card_id` or `source_ref` for findings; define delete orphans).  
2. Enumerate every status/kind/role; define nullability of `run_id` and `workflow_run`↔`run`.  
3. Replace the blanket secrets line with: what must never be persisted, what is sensitive-but-stored (CoT, tools, memory), backup encryption/redaction, event retention.  
4. Add Operate fields: excerpts, `updated_at`, archive, snooze_until, agent display identity; freeze JSON schemas for `source_ref` and board columns.  
5. Scope the file: MVP tables vs later (embeddings, full event log, JSON export), so UI can ship quiet lists instead of boiling the ocean.

---

Questions skipped: full impeccable dual-agent critique + detector (target is a schema markdown file, not a viewable UI; Ask mode).
