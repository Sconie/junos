**Verdict:** This is a dense product-shaped ER dump, not a shippable data contract. It spans chat, agents, inbox, kanban, scout, files+embeddings, memory, and events in one SQLite file, with soft JSON refs and almost no lifecycle, privacy, or UI-state discipline—so Operate screens built on it will default to status chrome, score tiles, and debug density.

---

### Contradictions

- **Dual source of truth for card origins.** Invariant says a card points at one inbox item / finding / run via `source_ref_json`. `scout_finding` also has `card_id`. Which side owns the link? Deletes “never delete the card” but finding→card can go stale either way.
- **Two run models.** `run` (`kind: … | workflow_step | …`) and `workflow_run` both exist. No rule for when a workflow creates `workflow_run` rows vs `run` rows, or how `run_step` relates to workflow steps in `definition_json`.
- **Message vs run denormalization.** `message` stores `model`, `effort`, `provider` and also `run_id`; `run` stores the same. Replays, retries, and routing changes will disagree unless one is canonical.
- **Attachment vs files.** `attachment` has both `file_id` and `path`; `file_index` is a separate path-centric table. Unclear whether attachments are indexed files, ad-hoc paths, or both.
- **Agent vs conversation kinds.** `conversation.kind: chat | agent` plus optional `agent_id`, while `agent.kind` is `hermes | scout | custom` and `run.kind` adds `hermes | scout`. Same words, three namespaces, no join rules.
- **“Secrets never in this DB” vs schema shape.** `agent.config_json`, `connection.*`, `task.prompt`, `message.thinking_md` / `tool_calls_json`, `run.input_json` / `run_step.*`, `event.payload_json` are classic secret/PII sinks. The invariant asserts a property the columns invite violating.
- **People without a people model.** `kanban_card.creator` / `assignee` and `memory_item.owner` are free-form, with no user/identity table—fine for single-user only if stated; as written they look multi-user.

---

### Gaps (contract holes)

- No schema version, migrations, or SQLite pragmas (FK enforcement, WAL, busy timeout).
- Almost no enums beyond a few comments: `connection.status`, `agent.status`, `run.status`, `kanban` `column`, `priority`, `scout_finding.status` / `relevance` scale are unspecified → every screen invents its own vocabulary.
- Missing timestamps on mutable rows (`task`, `agent`, `inbox_item` has resolved but not updated; `workflow`, `scout_source`, etc.) → UI cannot show stale/honest “last changed.”
- No soft-delete / purge / retention for messages, events, findings, embeddings.
- No indexes or query shapes (inbox by status+created, kanban by board+column+position, messages by conversation+created).
- `routing_rule.scope_ref`, `output_ref`, `embedding_ref`, `source_ref_json` are opaque; no shape, cardinality, or integrity rules.
- `workflow.definition_json` / `trigger_kinds_json` unbounded—core product behavior left as “JSON.”
- Backups: nightly file copy + “export JSON per table” with no what/who/redaction/restore story.
- Single-user vs multi-device sync never stated; ULID+ISO UTC alone don’t define conflict behavior.

---

### Unrealistic scope

One local DB is asked to be: connection/router registry, full chat+thinking+tools audit, generic run engine, cron tasks, workflows, multi-agent runtime, inbox, kanban, scout crawl store, project/file search index **with embeddings**, Hermes memory, and append-only event log—plus 14-day backups and full-table export.

For a coherent v1, that’s several products’ worth of entities with no phasing, size budgets (embedding store, tool_calls growth), or “non-goals.” Highest risk of a shallow UI over a warehouse of half-specified JSON.

---

### Security / privacy risks

- **Full conversational & tool residue in cleartext SQLite** (`content_md`, `thinking_md`, `tool_calls_json`, run I/O). Tool outputs often contain tokens, file paths, email snippets.
- **Embeddings + file summaries** (`file_index.summary`, `ai_tags_json`, `embedding_ref`) retain derivations of local files; no sensitivity tier or exclusion list.
- **Backups to `~/.junos/backups/`** as plain DB copies: same blast radius, longer retention, easy to forget when “deleting” in-app.
- **On-demand JSON export** is an exfil / oversharing surface unless scoped and redacted.
- **`event.payload_json` append-only** with no retention = permanent telemetry of whatever you stuff in.
- **Markdown bodies** (`body_md`, `content_md`, finding text) with no sanitization note → stored XSS when rendered.
- **`attachment.path` / `project.path`** without canonicalization rules → path traversal / escape from project roots.
- **Invariant “secrets never stored”** without column-level bans or types (e.g. connection credentials living “elsewhere” but `error` / `usage_json` / `config_json` still free-form) is aspirational, not enforceable.

---

### UI / design-quality problems (schema → Operate UI)

Lens: impeccable **Operate** (scanability, state motion only, consistent vocab) + design-taste **app screens** (colour on data not chrome, honest states, density with substance, no vanity KPIs / pill chrome).

| Risk | Why the schema pushes bad UI |
| --- | --- |
| **Hierarchy collapse** | Flat peer tables (inbox, kanban, scout, runs, events) with no “home object” or preview fields. First screens will become equal-weight nav + KPI strips. |
| **Status / priority chrome** | Many `status` / `priority` / `labels_json` fields, few enums. Classic path to coloured pills, rainbow tags, uppercase micro-labels—exactly the generated-dashboard tells. |
| **Vanity metrics** | `scout_finding.relevance`, `effort_est`, `tokens_json`, `usage_json` invite score tiles and sparklines before a single actionable row. App-screen rule: colour on meaning, KPIs as type not tiles. |
| **Chat density / legibility** | Three parallel blobs per assistant turn (`content_md`, `thinking_md`, `tool_calls_json`) with no default-collapse or summary field. UI will either hide the audit trail or drown the answer. |
| **Debug-shaped surfaces** | Ubiquitous `*_json` columns encourage raw JSON viewers and monospace dumps (house style: monospace only for real code). |
| **People as strings** | `creator` / `assignee` without stable identity → no consistent person mark/initial; assignees become generic badges. |
| **Missing UI states in data** | No partial/failure presentation fields beyond a single `error` string; no unread/seen semantics except inbox; kanban `position` alone doesn’t define drag conflicts or archived columns. Empty/zero/loading honesty has to be invented per screen. |
| **Motion without semantics** | `run` / `run_step` status changes need 150–250 ms state feedback, not choreography—but there’s no step-level status enum, so UIs will fake progress or animate the whole timeline. |
| **Contrast / scan failure** | Long `path`, cron, ULID, and error strings as primary row text → low-contrast secondary noise competing with titles. No dedicated `title`/`preview` on runs, events, or file rows. |
| **Scout → kanban pipeline** | Finding fields read like a research dashboard; combined with `card_id` they’ll spawn dual UIs for one object (finding detail + card) without a single canonical reading order. |
| **Event log trap** | Append-only `event(type, ref_id, payload_json)` specs almost always ship as an illegible admin firehose unless you add human `summary` + severity and strict type enums. |

Operate-mode fix direction (spec-level, not visual): fewer JSON bags, closed enums for anything that paints colour or sorts a queue, one canonical link for card provenance, preview/summary columns for list rows, explicit retention for think/tool/event payloads, and a written single-user threat model so backups/export aren’t an afterthought.

---

### Highest-priority fixes to the doc itself

1. Split **v1 tables** vs later (embeddings, workflows, event log are the usual cut lines).  
2. Resolve **card ↔ finding ↔ inbox ↔ run** to one ownership rule; drop the other key.  
3. Unify **run vs workflow_run** (or define the state machine in one paragraph).  
4. Replace “secrets never…” with **forbidden columns + where secrets live + backup/export redaction**.  
5. Add **enums + list-row preview fields** so inbox/kanban/scout/chat don’t invent chrome to compensate for missing shape.

I didn’t cross-check other specs (per “ONLY this doc”); `see 12` is a pointer, not coverage.
