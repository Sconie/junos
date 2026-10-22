Context loading did not run; I’ll read the existing project context directly. No `PRODUCT.md` / `DESIGN.md` in the repo, so this is a doc-only Operate-mode review of the schema’s product and UI implications.

---

## Verdict

`02-data-model.md` sketches a whole local AI workstation in one SQLite file. As a schema brief it is dense and useful; as a product/UI contract it under-specifies identity, retention, and payload hygiene, and it commits the UI to too many peer surfaces with JSON-first fields that fight Operate density and hierarchy.

---

## Contradictions

1. **Card ↔ source linking is asymmetric.** Invariant: a card references inbox / finding / run via `source_ref_json`. But `scout_finding` also has `card_id`. Two directions, one rule — which is canonical on delete/update?

2. **Message vs run metadata duplicated.** `message` stores `model`, `effort`, `provider` and also `run_id` → `run` with the same fields. Audit trail vs denormalized display copy is unclear; UIs will disagree on the source of truth.

3. **`attachment` vs `file_index`.** Attachment has `file_id` and `path`; `file_index` has `path` / `project_id`. Is `file_id` an FK to `file_index`? Why keep `path` on both?

4. **People without people.** `kanban_card.creator` / `assignee`, `memory_item.owner` — no user/identity table. Strings? Device-local handles? Multi-seat later?

5. **“Secrets never stored” vs payload columns.** `tool_calls_json`, `input_json`, `output_json`, `usage_json`, `config_json`, `definition_json`, `content_md`, `thinking_md` will hold keys, tokens, paths, and PII in practice. The invariant points at “12” but does not constrain these columns.

6. **Status rigor is uneven.** Inbox statuses are closed (`new | seen | snoozed | done | dismissed`). `run`, `agent`, `connection`, `scout_finding`, `workflow_run` statuses are free text — UI and migrations will invent incompatible values.

7. **`snoozed` without time.** Status allows snooze; no `snooze_until` (or equivalent) — inbox UI cannot schedule wake-up from the model.

8. **Kind / domain naming collision.** `run.kind` includes `scout | hermes`; `agent.kind` is `hermes, scout, custom`; `conversation.kind` is `chat | agent`. Same words, different axes — nav and filters will conflate them.

---

## Gaps

| Gap | Why it matters |
| --- | --- |
| No identity / auth / ACL | Assignees, owners, and “editable Hermes memory” need a subject |
| No retention / TTL | `event`, `run`, `message`, `thinking_md` grow forever |
| No indexes / uniqueness | ULID help sort, not query; e.g. `(provider, name)` on `model`, board column integrity |
| No FK / cascade policy | Only one delete rule (source ≠ card); everything else unspecified |
| `workflow_run` ↔ `run` / `run_step` | Orchestration not joinable to the audit trail |
| `routing_rule` vs `agent.config_json` | Where does model order actually live? |
| `embedding_ref` storage | Vectors, privacy, wipe, and backup size unnamed |
| Soft delete / tombstones | Inbox `dismissed` vs hard delete elsewhere |
| Schema version / migrations | Not mentioned |
| DB path | Backups to `~/.junos/backups/`; live DB location absent |
| Preview / list fields | Lists must scrape markdown/JSON for row text |

---

## Unrealistic scope

One local DB owns: connections & routing, chat, agents, runs, cron tasks, workflows, inbox, kanban, scout, projects, file index + embeddings, Hermes memory, append-only events.

For an Operate product, that is many **first-class shells** (chat, queue, board, builder, file browser, memory editor, ops traces). App-screen taste says each screen answers one job; this model treats every domain as equal. Shipping credible UI for all of it is a multi-product roadmap, not one data-model milestone — especially `file_index` + embeddings + nightly full-file backups as the DB grows.

---

## Security / privacy

- **Prompt & tool residue:** `thinking_md`, `content_md`, `tool_calls_json`, run I/O JSON are high-sensitivity. “No secrets in DB” is false unless redaction, allowlists, and size caps are specified.
- **Local corpus in DB:** `file_index.summary`, `ai_tags_json`, `embedding_ref` + `project.path` / `attachment.path` persist filesystem content and locations.
- **Memory as durable context:** `memory_item` is explicitly editable Hermes memory — long-lived personal/work data with no sensitivity tier or export/delete story.
- **Backups & exports:** Nightly copy + “export to JSON per table” with no encryption, access control, or scrub of thinking/tool payloads — plaintext exfil of the whole product brain.
- **Scout:** `url_or_query` + findings store third-party content and links; retention and sharing undefined.
- **Events:** Append-only `payload_json` with no schema — silent PII sink.
- **Single-user assumption unstated:** If that is the threat model, say so; otherwise assignee/owner fields imply multi-actor without isolation.

---

## UI / design-quality risks (impeccable Operate + tasteskill app screens)

Lens: this is **Operate** UI — scanability, one job per screen, colour on data not chrome, honest states, trade vocabulary. The schema quietly pushes the opposite.

### Hierarchy & IA
Peer tables for inbox, kanban, scout, chat, runs, workflows, tasks, memory, and files encourage a **dashboard-of-everything** shell (sidebar of equal destinations). No primary object or “home question.” Product face and one next action are undefined.

### Density
- Chat rows backed by `content_md` + `thinking_md` + `tool_calls_json` invite triple-pane noise unless progressive disclosure is mandated.
- `run_step` I/O JSON encourages raw JSON traces as the default ops UI.
- Kanban cards carry priority, labels, due, assignee, creator, source ref — classic card chrome overload (pills, tags, avatars) with no “one mark that matters” rule.
- Six inbox `kind`s in one list without sort/partition fields → mixed queue, high cognitive load.

### Typography & legibility
Markdown and JSON as the only text shapes force list UIs to either show walls of MD or mute grey previews. No `title` / `excerpt` / plain `summary` on messages; findings have `summary` but cards/inbox use `body_md`. Config surfaces (`efforts_json`, `definition_json`, `columns_json`) read as developer consoles, not Operate settings (forms with real labels).

### Spacing & composition
Dual finding↔card linking plus inbox items risks **stacked chrome** for one fact (badge + linked card + queue row). `pinned` on both conversations and memory creates two “important” systems without visual hierarchy. Provider/model/effort repeated on message and run → metadata strips competing with content.

### Contrast & status colour
Open-ended statuses invite rainbow pills and vanity deltas (`relevance`, `effort_est` without scale or units). App-screen rule: colour on meaning (needs decision), not on every enum. Schema does not define closed status sets or severity — UI will invent both.

### Motion
`event` + live `run` status invite noisy activity feeds and animated status chrome. Missing `updated_at` on hot rows (messages, inbox) makes calm live updates harder; `catch_up` on tasks implies bursty backlog UI with no pacing model. No reduced-motion / “motion only on user-initiated runs” contract.

### Empty / error / loading
`enabled` flags exist; empty vs error vs disabled vs first-run are not modeled. `connection.error` and `run.error` are bare strings — fine for storage, weak for honest empty/error frames and trade copy (“Waiting on approval” vs generic “Items”).

### Slop tells the schema invites
Icon-tile KPI home over connections/usage; zebra tables of runs; uppercase status chips; JSON drawers as primary detail; identical card grids for agents/tasks/workflows. None are required by SQLite — they are the default if the model stays entity-symmetric and JSON-first.

---

## Priority fixes (doc-level, if you revise later)

1. **Cut or stage domains** — say what v1 stores vs later (e.g. kanban/scout/embeddings).
2. **Close enums** and add snooze/time fields where status implies them.
3. **Payload policy** — what may never enter `*_json` / `thinking_md`; backup/export scrub.
4. **One link direction** for card↔source; drop or justify `card_id` vs `source_ref_json`.
5. **List/presentation fields** — excerpt, display name, closed status — so Operate UI is not MD/JSON-first.
6. **State identity** — single-user local vs users table; clarify `owner` / `assignee`.
7. **Retention** for events, runs, thinking, file summaries.

---

**Questions skipped:** doc-only target (no rendered UI); Assessment B / browser detector not applicable. No PRODUCT/DESIGN context in repo.
