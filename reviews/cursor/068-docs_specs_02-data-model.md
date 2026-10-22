**Verdict:** As a schema sketch this is ambitious and mostly coherent; as a product/UI contract it is under-specified and over-broad. It encodes a multi-product surface (chat + agents + inbox + kanban + scout + workflows + files + memory) without display contracts, ownership, or retention — which is where Operate/app-screen quality will fail.

Mode: **Operate** (task UI implied by the model). No PRODUCT.md/DESIGN.md in repo; review is of this doc alone. Browser/detector critique does not apply to a markdown schema.

---

### Contradictions

1. **Dual source-of-truth for “where did this card come from?”**  
   Invariant: cards point at one of inbox / finding / run via `source_ref_json`. But `scout_finding` also has `card_id`. That is two link directions with no rule for which wins when they disagree, or what the UI shows when one side is deleted (invariant only covers “deleting a source never deletes the card,” not the reverse FK).

2. **Model/effort authority is triplicated.**  
   `routing_rule.model_order_json`, `task.model` / `task.effort`, and `run` / `message` each carry model+effort. The doc never says which layer is authoritative for display (“why did this use Opus?”) or for the next send.

3. **Kind vocabularies collide.**  
   `conversation.kind`: `chat | agent`  
   `run.kind`: `chat | task | workflow_step | scout | hermes`  
   `agent.kind`: `hermes, scout, custom`  
   So “agent,” “hermes,” and “scout” mean different things in different tables. UI labels and filters will invent inconsistent names.

4. **Attachment identity.**  
   `attachment(file_id, path, …)` — both a file id and a path. No rule which is canonical for open/preview, or what happens when path moves but `file_index` stays.

5. **People without a people model.**  
   `kanban_card.creator` / `assignee`, `memory_item.owner` imply actors, but there is no user/identity table. Either the product is single-user (then assignee/creator are theater) or multi-user (then the model is incomplete). Both readings cannot be true for UI.

6. **“Secrets never stored; see 12”** — dangling within this doc. Meanwhile `tool_calls_json`, `input_json`, `output_json`, `thinking_md`, `memory_item.value_md`, and `connection.error` are classic secret-leak surfaces. The invariant and the columns fight each other.

---

### Gaps (especially for Operate UI)

Missing contracts the screens need:

| Gap | Why the UI cares |
|---|---|
| No enums for `connection.status`, `run.status`, `agent.status`, kanban `column` | Status chrome will be improvised; color systems proliferate |
| No read/unread or cursor on `conversation` / `message` | Chat + inbox both claim attention; no shared “what’s new” |
| No draft / partial / streaming message or run state | Loading and interrupt UX have nowhere to land |
| No `updated_at` on inbox, messages, findings | Sort/“last touched” and realtime refresh are guesswork |
| No retention / redaction model | Only backups; thinking + tool payloads grow without a UI for purge |
| No index/query expectations | Dense lists (inbox, runs, files) will be slow or over-fetched |
| `*_json` / `*_md` with no display schema | Settings and detail panes become JSON/Markdown dumps |
| No soft-delete / tombstone despite “audit trail” | Deleting a message/run vs keeping history is undefined |
| Workflow/agent versioning absent | Builder UI cannot show “what ran” vs “what’s edited now” |
| Scout has `cadence_cron` but no `timezone` (tasks do) | Schedule UI will be wrong across DST |

---

### Unrealistic scope

One SQLite file is asked to be:

- provider connection + usage metering  
- model catalog + routing  
- chat with thinking + tools  
- generic run/step engine  
- cron tasks + workflows + workflow runs  
- agents (Hermes/Scout/custom)  
- inbox (6 kinds)  
- kanban  
- scout crawl + findings  
- project/repo index + embeddings  
- editable agent memory  
- append-only event log  
- backup/export  

That is several products’ worth of objects with **no primary object, no MVP cut, and no “one job” for the home screen**. Per app-screen rules, that almost always ships as: equal sidebar items, a thin overview, and KPI/status tiles with no single next action — the generated-dashboard failure mode, driven by the schema’s flat peer list rather than by visual taste alone.

`workflow.definition_json`, `file_index.embedding_ref`, and full `thinking_md` + `tool_calls_json` persistence are especially heavy for a “nightly copy of junos.db” product shape.

---

### Security / privacy risks

- **Chat/tool payloads in cleartext SQLite**, then **nightly plaintext copies** under `~/.junos/backups/` and **JSON export per table** — no encryption, ACL, or export filtering mentioned.  
- **`file_index`**: local `path` + `summary` + `ai_tags_json` + `embedding_ref` is a searchable mirror of the user’s disk; high sensitivity, no consent/scope field.  
- **`attachment.path`**: UI “open file” + path storage invites path disclosure and stale/unsafe paths.  
- **`memory_item` “editable”** with only `owner` — no sensitivity tier, no audit of edits.  
- **`event` append-only `payload_json`**: permanent incidental PII/secret logging with no TTL.  
- **Scout `url` / findings into inbox/kanban**: external content becomes local durable data; no quarantine or trust flag for UI.  
- Multi-actor field names without auth boundaries create a **false multi-user story** (assignee) while the store is likely single-process local — confusing for both privacy and UX.

---

### UI / design-quality problems implied by this model

Lens: impeccable **Operate** (precision, states, cognitive load) + design-taste **app screens** (quiet chrome, color on data, honest states, one job, trade vocabulary).

**Hierarchy / IA**  
Twenty peer tables read as twenty peer nav destinations. Nothing is marked primary (e.g. conversation vs inbox vs board). First screen has no “one question.” Expect a kit shell, not a product face.

**Density**  
- Messages: `content_md` + `thinking_md` + `tool_calls_json` as siblings → default UI shows three stacked panes or tabs with equal weight; answer hierarchy dies.  
- Cards: priority + labels_json + due + assignee + source_ref → badge/pill farms on every card (app-screen anti-pattern: chrome over data).  
- Inbox: six `kind`s × five `status`es → filter chip explosion and >4 visible decision points on the list chrome alone.

**Typography / legibility**  
Opaque JSON columns (`usage_json`, `efforts_json`, `definition_json`, `output_dest_json`, `config_json`) push “advanced” screens toward monospace dumps and tiny labels — Operate wants a fixed rem scale and trade words, not schema field names as UI copy (`scope_ref`, `output_ref`, `embedding_ref`).

**Spacing / composition**  
Same work item can appear as finding → inbox item → kanban card → run, with loose refs. Lists will duplicate rows or feel empty when the “real” object lives one hop away. No model support for a single work surface with one composition.

**Motion**  
`event` + run lifecycle invite live tickers and step timelines animating every `run_step`. Operate guidance: 150–250ms state feedback only — no orchestrated load. The schema offers a firehose without a “user-visible state change” subset.

**Contrast / color**  
Partial status enums + `priority` on both inbox and kanban + `relevance` on findings encourage rainbow chips and competing semantic hues. App-screen bar: ~3% colored pixels, color on meaning not chrome — this model doesn’t define a single status vocabulary, so UI will over-color.

**States the model doesn’t support (so UI will fake them)**  
Empty, zero, loading, partial stream, snooze-until, failed-with-code, disconnected-provider — only free-text `error` fields. Empty states will say “No items” instead of trade language (“No approvals waiting”).

**Cognitive load**  
Three places to pick models, overlapping agent/scout/hermes concepts, and cross-linked inbox/board/finding are classic >4-option decision traps on settings and on “where do I look?”

---

### What would move quality most (doc-level, not implementation)

1. **Cut or phase the object graph** — name the v1 primary object and demote the rest (or mark “later”).  
2. **One link model for derived work** (card ↔ source), one model/effort authority, one status vocabulary with display names.  
3. **Add display contracts** for markdown/thinking/tools (what’s primary, collapsed, copyable) and forbid raw JSON as the settings UI.  
4. **Privacy appendix in this file**: what’s encrypted, what’s excluded from backup/export, retention for thinking/tools/events/files.  
5. **Identity**: either remove creator/assignee/owner or define a user/agent principal table and ACL.

---

Questions skipped: Ask-mode doc review; no interactive critique close-out required beyond the above. If you want the same lens on `00-overview` / `01-architecture` for cross-doc contradictions, say which file next.
