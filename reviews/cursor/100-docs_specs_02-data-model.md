Context loading did not run; no PRODUCT.md/DESIGN.md in the repo. Review is of this doc alone, through Operate/app-screen craft (impeccable + design-taste).

---

## Verdict

`02-data-model.md` is a dense entity dump, not a product data contract. It names many surfaces (chat, runs, inbox, kanban, scout, Hermes memory, embeddings, workflows) without enough enums, nullability, ownership, or retention rules for quiet, scannable app UI—or for the privacy claims it makes. Design risk is high: freeform JSON and string identities will push the product toward generic “status / items / records” chrome instead of one clear object per screen.

---

## Contradictions (internal)

1. **Dual card↔source links**  
   Invariant: a card may reference one source via `source_ref_json`. Schema also has `scout_finding.card_id`. Which side is canonical? If both exist, delete/unlink and “never delete the card” become ambiguous; list UIs will show inconsistent provenance.

2. **`message.run_id` vs “every assistant message”**  
   Invariant says every assistant message links to a run. Schema does not say nullable for user/system rows, or what happens for failed/streamed/partial assistant messages with no finished run. Audit UI and message list states are underspecified.

3. **Two “run” worlds**  
   `run` (+ `run_step`) vs `workflow_run`. Chat/task/scout/hermes live on `run`; workflows get a parallel table. Inbox `source_ref_json` and card refs can point at “a run”—which kind? Operators need one timeline metaphor; this forces two.

4. **`attachment.file_id` and `path`**  
   Both present. Is `path` denormalized from `file_index`, a non-indexed upload, or something else? Files UI and message chrome cannot know whether to resolve via index or filesystem.

5. **Agent vs run kinds**  
   `agent.kind`: hermes | scout | custom. `run.kind`: chat | task | workflow_step | scout | hermes. Scout/Hermes are both agents and run kinds—relationship (agent owns runs? runs orphan?) is undefined, so agent detail screens cannot show a trustworthy activity feed.

6. **“Secrets never stored” vs payload columns**  
   `connection.usage_json`, `connection.error`, `agent.config_json`, `message.tool_calls_json`, `run.input_json` / `error`, `event.payload_json` routinely hold tokens, URLs with keys, or tool args in real systems. The invariant asserts a policy the schema does not encode (no redaction rules, no column allowlists).

---

## Gaps (schema / product)

| Gap | Why it hurts |
| --- | --- |
| Almost no nullability, FKs, or ON DELETE | UI cannot know empty vs missing; cascade bugs become UX bugs |
| Status/priority enums incomplete | Only inbox status is fully spelled; `connection`, `run`, `agent`, `scout_finding`, cards lack closed sets → badge soup and inconsistent colour meaning |
| No `user` / identity model | `creator` / `assignee` are bare strings; app-screen rule of stable person tint + initials has nothing durable to hang on |
| No indexes, FTS, or list projections | Inbox, search, kanban, file browser all need ordered/filtered pages; model is storage-shaped, not screen-shaped |
| No streaming / message lifecycle | No `pending \| streaming \| complete \| error` → chat density and motion (typing vs committed) undefined |
| No retention / purge for `event`, messages, runs, findings | Append-only + nightly backups contradict long-term privacy and disk reality |
| `routing_rule.scope_ref` untyped | Settings/routing UI cannot validate or deep-link |
| `memory_item.owner` untyped | Hermes memory editor: whose memory, what scope, conflict with conversation? |
| `embedding_ref` with no store contract | Privacy and “what is on disk” unclear |
| Soft delete / archive absent | Inbox `dismissed` vs hard delete; kanban archive; conversation pin without archive |

---

## Unrealistic scope

For one SQLite file labeled as the data model, the surface area is a full agent OS:

- multi-provider connections + routing  
- chat + tools + thinking  
- scheduled tasks + workflows + workflow runs  
- inbox of 6 kinds  
- kanban boards  
- scout sources + findings  
- projects + file index + AI tags + embeddings  
- Hermes editable memory  
- append-only event log  
- backups + per-table JSON export  

That is several products’ worth of entities before any UI craft (one question per screen, honest empty/zero states, colour on data not chrome). Risk: every screen becomes a thin table over JSON bags (`definition_json`, `config_json`, `efforts_json`, `labels_json`)—exactly the “kit not product” failure mode in the app-screen guidance.

A credible cut would separate **v1 durable core** (connection, conversation/message/run, inbox, project) from **later** (workflows, embeddings, multi-board kanban, scout cadence). The doc does not.

---

## Security / privacy

1. **Backups are full content copies** — Nightly `junos.db` → `~/.junos/backups/` (14 days) plus on-demand JSON export. That duplicates `content_md`, `thinking_md`, tool calls, findings, memory, file paths. No encryption, access control, or backup redaction. Claim “secrets never in this DB” does not protect chat/memory/tool payloads.

2. **`thinking_md` and `tool_calls_json` persisted by default** — High sensitivity; no retention, visibility flag, or “store thinking: off” field. UI that shows thinking by default raises legibility *and* privacy cost.

3. **`file_index` + `attachment.path`** — Local paths and summaries/embeddings of user files; backup/export spreads that map of the machine.

4. **`memory_item` editable Hermes memory** — Cross-session personal data with only `owner`/`key`; no sensitivity tier, export exclusion, or wipe semantics.

5. **`event` append-only** — Audit gold for product, liability for privacy if unbounded and backed up forever.

6. **Single-file SQLite, no tenant boundary** — Fine for personal local app if stated; unspoken multi-user fields (`assignee`) imply collaboration without authz model.

---

## UI / design-quality problems (schema → Operate UI)

Lens: Operate mode (impeccable) + app screens (colour on data, density, honest states, product-specific objects—not generic records).

**Hierarchy & IA**  
Too many first-class nouns with overlapping jobs (`inbox_item` kinds vs `scout_finding` vs `run` result vs kanban card). Home/inbox will compete for “what needs me?” without a single primary object or derived view. No fields that encode *urgency for the shell* (e.g. inbox count by kind, next approval)—screens will invent KPI tiles on top of under-modeled data.

**Density**  
`message` packs role, model, effort, provider, markdown, thinking, tool_calls—chat rows will either truncate into illegible meta chips or expand into walls of secondary grey. App-screen guidance: running text in full ink; grey only for secondary. Schema encourages metadata-first chrome.

**Typography / legibility**  
Heavy reliance on `*_md` and JSON without preview/plain fields (`summary` exists on findings/files but not on inbox beyond `title`/`body_md`, not on runs). List rows need one-line primary + optional secondary; model often only has blobs.

**Contrast / colour semantics**  
`priority`, `status`, `relevance`, `effort_est` without closed enums or scales → UI will invent rainbow badges (generated-dashboard tell). Colour should mark decision-needed state (approval, failure), not every enum.

**Spacing / motion**  
No message/run lifecycle → no principled motion (commit vs stream vs error). Kanban `position` alone does not define animation-safe reorder (updated_at exists on cards; not on column moves as events).

**Identity & “product face”**  
No stable people/objects for tinted initials, project marks, or scout-source identity—assignees and creators as strings push generic avatars. `project` has `name`/`path` but conversations/files/cards link weakly for a unified project canvas.

**Empty / zero / error**  
Almost no support for honest empty frames: disabled models, failed connections (`error` string only), snoozed inbox (`snoozed` status but no `snooze_until`), catch-up tasks without UX fields for “skipped N runs.” Empty states will stay template copy (“No items”).

**Filter/sort UI**  
`labels_json` / `tags_json` / `ai_tags_json` block clean facet UI (multi-select labels as first-class rows would). Search across conversations/files/findings has no FTS or shared projection.

---

## Priority fixes (if this doc is revised)

1. Resolve **card ↔ finding ↔ source_ref** to one direction; document delete/unlink.  
2. Close **status/kind enums** for every table the UI badges.  
3. Split **v1 tables** vs later; shrink JSON bags into fields list screens actually show.  
4. Replace “secrets never stored” with **column-level sensitivity + backup/export redaction + retention**.  
5. Add **nullability, FKs, and list-oriented fields** (preview text, snooze_until, message state, person ids).  
6. Unify **run vs workflow_run** (or explicitly separate timelines in product language).

---

Questions skipped: full impeccable dual-agent critique / detector (target is a markdown schema, not a viewable UI; Ask mode; context launcher unavailable).
