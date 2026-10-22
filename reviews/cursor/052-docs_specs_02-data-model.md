**Verdict:** As a schema sketch this is a useful inventory; as the contract for an Operate product it is over-scoped, under-constrained, and quietly hostile to quiet app UI—especially inbox/kanban/chat density and “status colour everywhere.”

Lens: impeccable **Operate/Read** + design-taste **app screens** (data → screen jobs, density, chrome, states). No rendered UI, so this is a schema→UI critique, not a pixel audit.

---

### Contradictions

1. **Card ↔ source linking is stated two ways.** Invariant says a card may reference *one* of inbox / finding / run via `source_ref_json`. The schema also has `scout_finding.card_id`—a second, reverse link. Delete/update rules for the reverse pointer are undefined; “deleting a source never deletes the card” does not say what happens when the *card* is deleted or when both refs disagree.

2. **`source_ref_json` is unconstrained JSON** while the invariant asserts XOR semantics. The doc promises a rule the column type cannot enforce.

3. **Single-operator product vs multi-actor fields.** `kanban_card.creator` / `assignee` and `memory_item.owner` imply actors, but there is no user/agent identity table—only free strings. That fights a stable “who is this row” face (app screens want people as themselves, not opaque strings).

4. **Runs are both central and orphaned.** `message.run_id` is required for audit; `task`, `workflow_run`, and `scout_*` have no FK into `run`. `run.kind` includes `workflow_step | scout | hermes` while those domains also have their own tables—dual modeling without a join story.

5. **Denormalized chat metadata vs run.** `message` stores `model`, `effort`, `provider` *and* points at `run`, which stores `model`, `effort` again. Drift is inevitable; UI will show conflicting chrome.

6. **Attachment truth.** `attachment(file_id, path, …)` plus `file_index(path, …)`—three path-ish notions, no rule for which is canonical when serving or displaying files.

7. **“Secrets never in this DB” vs high-sensitivity columns.** The invariant is narrow (credentials). `thinking_md`, `tool_calls_json`, `input_json`/`output_json`, `memory_item.value_md`, `event.payload_json`, and provider `error` / `usage_json` routinely hold secrets, paths, and prompt content. Saying “see 12” without classifying these columns leaves a false sense of safety.

---

### Gaps (schema + UI contract)

| Gap | Why it matters for UI |
|---|---|
| Almost no enums beyond a few comments | Status/priority/kind will become ad-hoc chips and rainbow legends |
| No FK, uniqueness, or nullability | Broken conversations, dangling boards, duplicate default routing |
| No retention / truncation policy here | Chat + thinking + events grow without list/pagination story |
| No preview/title rules | Lists will fall back to ULIDs or raw markdown dumps |
| No per-step `status` on `run_step` | Timeline can’t show honest loading/error without parsing JSON |
| `workflow.definition_json` unversioned | Builder UI can’t diff/rollback safely |
| Approvals are only `inbox_item.kind=approval` | No link to the exact run/tool/command being approved |
| `embedding_ref` with no store model | Files UI will invent RAG chrome before search exists |
| Backups: copy DB + JSON export | No redaction, encryption, or “what leaves the machine” |

Missing for Operate screens the schema otherwise implies: empty/zero conventions, list sort keys for inbox (beyond `priority`), conversation update/activity, and soft-delete vs hard-delete for messages/runs.

---

### Unrealistic scope

One flat list ships **chat, routing, connections, tasks, workflows, agents, inbox, kanban, scout, projects, file index + embeddings, Hermes memory, and an append-only event log**—with no phasing (“core vs later”).

From an app-screen inventory: that is many products’ worth of objects, magnitudes, and jobs. Especially heavy for v0:

- `file_index` + `ai_tags_json` + `summary` + `embedding_ref` (local RAG)
- Scout as tables *and* `run.kind` *and* (elsewhere) “just a workflow”
- Editable `memory_item` as a first-class surface
- Full kanban with labels, due dates, assignees, source refs

Risk: Home becomes a template dashboard (connection KPIs, run counts, sparkline-ish `usage_json`) instead of one job.

---

### Security / privacy risks

- **Backups of `junos.db`** = unencrypted copies of chats, thinking, tools, memory, paths. “Keep 14” without encryption or exclude-list is the largest practical leak path this doc defines.
- **On-demand JSON export per table** with no redaction = intentional exfiltration surface.
- **Append-only `event.payload_json`** will duplicate sensitive run/inbox payloads forever; audit without retention is a privacy bug.
- **`attachment.path` / `project.path` / `file_index.path`** in the client model invite path disclosure and unsafe file serving if the API mirrors the schema.
- **Provider `error` and `usage_json`** often embed tokens, account ids, or absolute paths—contradicts the spirit of “secrets never stored.”
- **`tool_calls_json` + `thinking_md` retained indefinitely** = highest-value local corpus for theft or prompt-injection replay; no TTL or “hide thinking in export.”
- **String `creator`/`assignee`** with no identity model = spoofable attribution in the board UI (“hermes” as text).

---

### UI / design-quality problems (schema → screens)

**Hierarchy & cognitive load**  
`inbox_item.kind` alone is six kinds (`approval | finding | result | failure | mention | digest`)—past the “>4 visible options” trap unless the UI collapses them. Combined with separate Kanban, Scout, Hermes, Chat, and Connections objects, the IA will want filter chip piles and status legends (taste: no pill clusters / tiny tracked labels).

**Density**  
`kanban_card` packs title, body, creator, assignee, priority, labels, due, source ref—classic overcrowded card. App-screen rule of thumb: colour and marks on *decision* data, not on every metadata field. This shape pushes badge soup.

**Typography & legibility**  
Everything user-facing is `*_md` / JSON. Without max lengths or a plain `summary`/`title` for list rows, message lists, inbox rows, and run steps will render full markdown/JSON—measure and contrast collapse. `thinking_md` vs `content_md` vs tools needs an explicit hierarchy (answer primary; thinking secondary; tools tertiary)—the schema treats them as peers.

**Status / colour / contrast**  
Many parallel status vocabularies (`connection`, `run`, `inbox`, `agent`, `scout_finding`, `workflow_run`, plus `enabled` flags). That invites colour-on-chrome. App screens want ~one data hue and colour for good/bad decisions—not a unique colour per enum. `scout_finding.relevance` without type/range invites heatmaps.

**Spacing / motion**  
SSE + `event` with no “UI-worthy” priority means every append can animate. `last_checked_at` / `next_run_at` / `last_activity_at` encourage live-ticking relative times (motion noise). No field distinguishes “needs a toast” vs “silent feed row.”

**Product face**  
Nothing in the model is JunOS-specific as a *signature element* (e.g. one attention queue). `usage_json` and connection rows steer toward generic subscription dashboards—the exact generated-dashboard tell the taste skill bans (KPI tiles, usage sparklines).

**Glass / chrome**  
The schema doesn’t mandate glass, but metadata-heavy entities + many statuses strongly pressure translucent chips, icon-in-tinted-square kinds, and zebra activity tables. The data model should starve that: fewer enums, one attention object, strict list-preview fields.

---

### Priority fixes (if this doc is the contract)

1. **Phase the schema** — v0: `connection`, `model`, `conversation`/`message`/`run`, `inbox_item`, `event`; defer scout/kanban/embeddings/memory or mark them clearly optional.
2. **Replace loose JSON refs with typed FKs** (or a single `source_type` + `source_id`) and drop or fully specify `finding.card_id`.
3. **One status language** (or a shared `lifecycle` enum) and typed `priority`; kill parallel rainbow enums.
4. **Classify columns** — public / sensitive / never-export; backup encryption; redact `error`/`tool_calls`; TTL for thinking.
5. **Add list-projection fields** — `title`, `preview`, lengths; step `status`; link approvals → `run_id` + action payload.
6. **Define actor ids** (`jonas | hermes | scout | …`) as a closed enum, not free text—feeds quiet people marks, not emoji/badge chrome.

---

Which should this doc optimize for first: a shippable chat+inbox core, or a full command-center schema that UI specs can already assume?
