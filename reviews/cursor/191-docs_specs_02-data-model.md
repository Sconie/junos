Context loading did not run; I’ll read the existing project context directly. No `PRODUCT.md` / `DESIGN.md` in the repo. Review is of the workspace `docs/specs/02-data-model.md` as present (Ask mode blocked verifying commit `2e87f7e`).

---

## Verdict

This schema is a **whole-product platform catalog** (chat, runs, cron, workflows, agents, inbox, approvals, kanban, scout, files/embeddings, memory, SSE) packed into one SQLite doc. As a long-horizon map it’s useful; as a shippable v1 model it’s oversized, internally inconsistent on retention/audit, and it **pre-loads Operate UI with too many first-class objects and badge/status surfaces**—exactly the density/chrome problems both design skills warn against.

---

## Contradictions

1. **Append-only events vs delete-on-source**  
   `event` is “append-only; seq drives SSE resume,” but invariants say deleting a source also removes derived rows including “events payloads that embedded it.” You cannot be append-only *and* hard-delete events for privacy without a tombstone/redaction model. SSE clients holding a high `seq` also break if rows disappear.

2. **Payload minimality vs “embedded” content**  
   Same bullet: payloads are “references and minimal metadata, not message bodies,” yet deletion talks about payloads that “embedded” the source. Pick one: refs-only (scrub/delete by `ref_id`) or embedded snapshots (then the “not bodies” claim is false).

3. **Dual definition of workflow**  
   `workflow.definition_json` and `workflow_version.definition_json` with no rule for which is live, whether `workflow` is a cache of latest, or how runs pin a version. Drift is guaranteed.

4. **Dual approval surfaces**  
   `inbox_item.kind: approval` and a full `approval` table (CAS, digest, expiry, consume). No link (`inbox_item` ↔ `approval.id`). UI and state machines will diverge (approve in inbox vs approve in approval row).

5. **Bidirectional scout ↔ kanban**  
   Card may point at a finding via `source_ref_json`; `scout_finding.card_id` points back. Invariant doesn’t say which is authoritative when they disagree, or what happens when one side is cleared.

6. **“Secrets never stored” vs columns that will hold them**  
   Claim points at spec 12, but this model freely stores `tool_calls_json`, `run`/`run_step` I/O JSON, `approval.action_json`, `message`/`thinking_md`, `memory_item.value_md`, connection `error`. Tool args, dumps, and paste-into-memory will put secrets in the DB unless redaction is specified *here*.

7. **Message vs run denormalization**  
   Assistant `message` stores `model`, `effort`, `provider` *and* `run_id`; `run` stores the same. No sync invariant → audit UI shows conflicting facts.

8. **Scheduling dual state**  
   `task.next_run_at` plus `scheduled_run` rows with leases/retries. Unclear source of truth after crash, catch-up, or disable.

---

## Gaps (schema completeness)

| Gap | Why it matters |
|---|---|
| No `file` table while `attachment.file_id` exists | Orphan concept; `path`+`file_id`+`file_index` triangle unexplained |
| FTS/embeddings mentioned in deletes, not in tables | Retention refers to stores this doc doesn’t define |
| No `workflow_run` → `run` / step linkage | Workflow UX can’t show a single execution tree |
| Free-string actors (`creator`, `assignee`, `owner`, `decided_by`, `lease_owner`) | No identity model → weak ACL, weak UI avatars/consistency |
| Approval CAS with no version/etag/row version | “Compare-and-set” is stated, not modeled |
| `action_digest` algorithm unspecified | Can’t reason about replay or integrity |
| Enums underspecified (`status` on connection/run/agent/finding/scheduled_run, `effort`, `provider`) | UI will invent incompatible badges |
| Almost no `updated_at` / soft-delete | Sort/filter and undo-friendly UI underspecified |
| No migration / schema version | Local SQLite product will need it immediately |
| Backup/export sensitivity unlabeled | Nightly copies + “export JSON per table” with no classification |

---

## Unrealistic scope

Roughly **ten product surfaces** share one DB as peers: Connections/routing, Chat, Runs, Tasks, Workflows (+ versions), Agents (Hermes/Scout/custom), Inbox, Approvals/rules, Kanban, Scout, Projects/files/embeddings, Memory, Event bus.

For a local `~/.junos` SQLite app, that is a multi-year surface area if treated as one release schema. Missing: **phasing**, **which tables are v1 vs later**, and **which entities are projections** (e.g. inbox as view over approvals/findings/runs) vs stored truth. Without that, implementers will build every table a screen—and the IA collapses into a sidebar of products.

---

## Security / privacy risks (in this doc)

- **Blast radius:** one DB + 14 plaintext nightly backups + on-demand full-table JSON export = total history (chats, thinking, tools, memory, files metadata) in one leak.
- **Policy vs reality:** “secrets never stored” is aspirational; the columns above are secret-shaped unless redaction, allowlists, and max retention are specified per column class.
- **`thinking_md` / tool I/O:** high-sensitivity; no TTL, no separate store, no “exclude from export/backup” flag.
- **`memory_item` editable:** durable injection into agent context; no audit trail, no sensitivity tag.
- **`approval_rule.arg_pattern`:** schema invites regex allowlisting of tool args (bypass-prone); no binding to digest/canonicalization.
- **`file_index.path` / `attachment.path`:** local FS paths in UI/search increase accidental disclosure and path-confusion risk.
- **SSE `event` + delete:** privacy deletion fights resume cursors; easy to “fix” by leaving payloads or to break clients by deleting seq gaps.
- **Embeddings:** `embedding_ref` implies content-derived vectors outside/alongside DB; delete invariant is hand-wavy without naming the store.

---

## UI / design-quality problems the model encodes

Lens: Impeccable **Operate** (task completion, scanability, cognitive load) + tasteskill **app screens** (colour on data not chrome, one job per screen, no KPI/badge theater, quiet density).

**1. IA / hierarchy — too many primary nouns**  
Each table cluster wants a nav item. App-screens: first screen answers *one* question; this model pushes a “Welcome to your AI OS” dashboard of queues (inbox + kanban + scout + approvals + runs). Expect competing priorities and no clear peak action.

**2. Status / badge chrome explosion**  
Many independent `status` / `priority` / `kind` enums (`inbox`, `approval`, `run`, `connection`, `finding`, `agent`, `scheduled_run`, kanban column `kind`, card `priority`, `labels_json`). Default UI path is coloured pills, uppercase labels, icon-in-tinted-square row markers—exactly what both skills ban. Spec never defines a **shared status vocabulary** or “colour only when a decision is required.”

**3. Dual timelines (message vs run_step)**  
Chat bubble fields (`model`, `effort`, `provider`, `thinking_md`, `tool_calls_json`) plus parallel `run`/`run_step` audit = stacked hierarchy in one thread. High density, weak scan path: users don’t know whether to read the message or the run. Operate mode wants one readable spine.

**4. JSON-as-product (`definition_json`, `config_json`, `usage_json`, `efforts_json`, `output_dest_json`)**  
Without shaped sub-schemas, UI becomes monospace JSON (taste: monospace only for real code) or endless custom forms. Typography/hierarchy suffer either way.

**5. Tag / label / pin clutter**  
`labels_json`, dual `pinned` (conversation + memory), `ai_tags_json` on files → chip rows, pin icons, tag filters. Fights legibility and “words of the trade” empty states; encourages generic “Items / Tags / Status” chrome.

**6. Scores without display rules**  
`scout_finding.relevance`, `effort_est` invite progress bars, rainbow heat, tiny secondary figures. App-screens: colour encodes good/bad for decisions, not decorative metrics. No contrast/legibility contract (what’s primary ink vs muted).

**7. Motion / live stream temptation**  
`event.seq` SSE enables live tickers, toast storms, animated inbox badges. No reduced-motion or “batch quiet updates” note in the model’s consumer contract—motion budget will be spent on chrome, not task feedback.

**8. Kanban column `kind` is good; board UX still heavy**  
Automation-by-kind is sound. Still: seven kinds (`ideas…custom`) plus labels/priority/assignee/due/`source_ref` is a dense card face unless the UI spec caps visible fields. Schema doesn’t mark which fields are list-row vs detail-only—so list rows will show everything.

**9. Missing presentation constraints that Operate UIs need**  
No guidance on list density (which columns exist for inbox/run/task), truncation limits for `*_md` / JSON, or empty/loading/error as data states (app-screens care about honest empty frames). Design quality will be invented per screen → inconsistency.

**10. Cognitive load**  
Impeccable: flag decision points with >4 visible options. This model’s natural settings/routing surface alone (`routing_rule` scopes + `provider_allow` + models + efforts + connections) is a combinatorial maze before chat starts.

---

## What works

- ULIDs + UTC ISO timestamps; SQLite as system of record.  
- Kanban automation keyed by column `kind`, not display name.  
- `scheduled_run` uniqueness + lease fields show real scheduler thinking.  
- Approval as single-use CAS is the right *idea* (needs columns to match).  
- Explicit “secrets not in this DB” and backup-via-SQLite-API (not WAL copy) are the right instincts—if reconciled with JSON payload reality.

---

## Priority fixes (spec-only)

1. Resolve **event append-only vs retention** (tombstones / redacted payloads / seq gaps policy).  
2. Collapse **inbox approval vs `approval` table** to one source of truth.  
3. Make **workflow / workflow_version** and **finding ↔ card** single-writer.  
4. Replace “secrets never” with **column classes** (forbidden / redacted / short-TTL / export-excluded).  
5. Mark **v1 vs later** tables; demote scout/kanban/workflows/embeddings if chat+run+task is the core.  
6. Add a short **UI projection** note: which entities are primary nav vs details; shared status semantics; list vs detail fields—so Implement UI doesn’t ship pill soup.

I did not open other specs (per “ONLY this doc”); several bullets defer to `12` without restating enough to be self-consistent here.
