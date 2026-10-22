**Verdict:** `02-data-model.md` is a dense catalog of ~26 peer tables, not a model that clearly serves Operate-mode jobs. Internally it contradicts itself on events/retention, under-specifies links the UI must trust (approvals, workflows, claims), and quietly invites high-density, badge-heavy, JSON-dump surfaces.

*Lens: impeccable (Operate/Read) + design-taste app-screens. Spec-only critique — no rendered UI to inspect.*

---

### Contradictions (inside this doc)

1. **Append-only vs mutable events**  
   `event` is “append-only; seq drives SSE resume,” but invariants say deleting a source also removes “events payloads that embedded it.” You cannot both keep an immutable `seq` timeline and rewrite/delete historical payloads without breaking resume, idempotency, or “what did the UI already see?”

2. **Payloads are minimal — except when they aren’t**  
   “`event.payload_json` holds references and minimal metadata, not message bodies” sits next to deletion of payloads that “embedded” source content. Either payloads never embed (then that deletion clause is wrong) or they sometimes do (then the minimal-metadata rule is false).

3. **Card survival vs cascade delete**  
   “Deleting a source never deletes the card” vs “Deleting a source row also removes derived rows (… FTS, embeddings).” Cards keep `source_ref_json` that can point at gone rows, with no `source_missing` / tombstone field — UI will show broken “Open source” affordances or silent dead links.

4. **Finding ↔ card ownership**  
   Cards may reference a finding via `source_ref_json`; `scout_finding` also has `card_id`. Two write paths, no invariant for which is canonical or what happens when they disagree.

5. **`workflow.definition_json` vs `workflow_version.definition_json`**  
   Both store definitions. Tip-of-tree vs version history is undefined — editors, “edit current,” and run-against-which-version UIs will invent conflicting truth.

---

### Gaps that block correct UI / runtime behavior

| Gap | Why it matters |
|---|---|
| **`inbox_item.status` includes `snoozed` but no `snooze_until`** | Cannot resurface or sort snoozed items; list will lie or need out-of-band state. |
| **No first-class link `inbox_item` → `approval`** | Approval UX needs one record; dual status machines (`inbox_item.status` vs `approval.status`) with only `source_ref_json` invites Approve-on-stale and duplicate decisions. |
| **Kanban automation without claim fields** | Invariant says automation depends on column `kind`, but `kanban_card` has no `claimed_by` / lease — pickup races and “Hermes is working on…” cannot be modeled safely here. |
| **`workflow_run` orphaned from `run` / `run_step`** | `run.kind` includes `workflow_step`, but no FK/join story — timeline UI cannot show one coherent execution. |
| **`message.run_id` “every assistant message”** | User/tool/system rows, failed runs, and streamed partials unspecified (null? multiple messages per run?). |
| **`attachment`: `file_id` and `path`** | Canonical identity vs `file_index` unclear — Files vs Chat will show different paths. |
| **FTS / embeddings named, not modeled** | Invariants and retention talk about FTS/embeddings; schema has only `embedding_ref`. Deletion/search behavior is hand-waved. |
| **Enums half-specified** | Rich enums for inbox/approval/kanban kinds; `run.status`, `connection.status`, `agent.status`, `scout_finding.status`, priorities left open — StatusDot/Chip systems will freestyle. |
| **Almost no `updated_at` / soft-delete** | Live SSE UIs need optimistic merge and “deleted elsewhere”; only kanban/memory get `updated_at`. |
| **No layout/meta for workflows** | `definition_json` alone does not support a canvas builder; implies either raw JSON (hostile Operate UI) or a second undocumented store. |

---

### Unrealistic scope

- **One flat MVP surface:** chat, routing, tasks, workflows (+ versions + runs), agents, inbox, kanban, scout, projects, file index + embeddings, Hermes memory, scheduler leases, approval gateway, provider allowlists, and SSE event log — all co-equal, no phasing or “v1 tables vs later.”
- **JSON escape hatches everywhere** (`config_json`, `definition_json`, `usage_json`, `input_json`, `output_json`, `tokens_json`, `labels_json`, …) defer schema decisions into the UI, which then either hides structure or dumps trees.
- **Nightly backup + “export JSON per table on demand”** with no redaction/scope controls is an operational product of its own, specified in two lines.

For a personal daemon this *can* fit one SQLite file, but as a **spec for implementable UI**, it reads like Phase 1–4 collapsed into one ERD.

---

### Security / privacy risks (from this doc alone)

1. **Sensitive content in cleartext SQLite:** `thinking_md`, `tool_calls_json`, `action_json` (exact commands/diffs), `memory_item.value_md`, message bodies, scout URLs/summaries — then **14 nightly backups** under `~/.junos/backups/` and **full-table JSON export**. “Secrets are never stored in this DB” does not cover CoT, diffs, memory, or tokens in `usage_json`/`tokens_json`.
2. **`approval_rule.arg_pattern`** — pattern language, injection, and over-broad remember-rules are unspecified; dangerous defaults become a data problem.
3. **`provider_allow` / routing** — no audit fields on who changed allowlists; compromise or foot-gun isn’t reconstructible from this model.
4. **Embeddings:** `embedding_ref` with retention-on-delete, but no statement that vectors stay local / aren’t exported with JSON dumps.
5. **Single-user strings (`creator`, `assignee`, `decided_by`, `lease_owner`)** — fine for Jonas-only, but no channel binding in-schema for “Telegram vs UI” beyond `decided_channel` on approval; inbox actions lack the same.
6. **Export path** is a privilege escalation for anyone with filesystem access to the profile — worth calling out next to “secrets never in DB.”

---

### UI / design-quality problems the schema encourages

*(Operate mode + app-screens: colour on data not chrome; KPIs as type; quiet lists; one job; honest states; no pill/badge clusters; density with meaning.)*

1. **No primary object / job hierarchy**  
   Twenty-six peers push a product shell where Inbox, Kanban, Scout, Files, Workflows, Memory all feel equally “home.” App-screens want one question per screen and the frequent job one click away; this ERD doesn’t name that — it names storage.

2. **Badge & chip farm**  
   Parallel `priority` (inbox + kanban), `relevance`, `labels_json`, multiple `kind`/`status` enums, and `effort` on messages/runs/tasks → UI will over-encode with chips, pills, and coloured status dots (exactly the generated-dashboard / dense-ops failure mode both skills push against). Prefer one urgency signal per surface and put the rest in detail.

3. **JSON-first detail panes**  
   Run steps, workflow definitions, usage, tool calls: without an invariant that **`summary` is the list row and JSON is progressive disclosure**, Timeline/StepCard becomes a scroll of trees — hierarchy and legibility collapse.

4. **`thinking_md` beside `content_md`**  
   Same-weight columns invite dual markdown walls (cognitive load, contrast-on-glass later, motion to “reveal thinking”). Model should mark thinking as secondary (or separate store) so default chat hierarchy stays content → tools → meta.

5. **Kanban `columns_json` + string `column`**  
   Display names change; cards orphan; board headers and WIP counts desync. Automation-on-`kind` is right; missing stable column ids and claim fields will produce empty columns and wrong “active” affordances — density without trust.

6. **Error as a single free-text `error`**  
   Connection/run errors need short `error_code` + human line for scan; full trace in drawer. As written, tables and toasts will paste stacks (legibility, density).

7. **Live updates without merge keys**  
   SSE on `event.seq` is good; lack of `updated_at`/tombstones forces coarse refetch → skeleton flicker or stale ApprovalCard enablement (motion as noise, not feedback).

8. **Labels and creator markers**  
   `labels_json` + string creators push emoji/marker chrome on cards (09’s robot marker is a symptom). App-screens want people/objects as quiet identity, not sticker rows.

9. **Contrast / dim text later**  
   Not a palette doc, but storing long `body_md` / `summary` / `thinking_md` with no length guidance guarantees dim secondary text and cramped drawers (360–420 px in the wider UI system) filled past readable measure.

10. **Empty/loading honesty**  
    No modeled empty reasons (`no_sources`, `awaiting_approval`, `lease_expired`). Screens will show generic “No items” instead of trade words (“Nothing needs you,” “Waiting on approval”) that app-screens call for.

---

### Highest-leverage fixes (if you revise this doc)

1. Resolve **event immutability vs retention** (tombstone events vs vacuumed log vs payload-redaction-in-place with rules).  
2. Add **`snooze_until`**, **`approval_id` on inbox**, **claim lease on kanban**, and a **`workflow_run` ↔ `run`** link.  
3. Make **`source_ref` one-way** (or single owner) and define dangling-ref UI state.  
4. Collapse **definition** to versions-only (workflow row points at `current_version`).  
5. Split **user-visible summary fields** from **audit JSON**, and treat **thinking / action_json / memory / exports** as sensitive in the same breath as “no secrets in DB.”  
6. Mark **phase boundaries** on the table list so UI density matches shipping order.

---

Questions skipped: full impeccable dual-agent critique and browser detect — target is a markdown schema, not a viewable surface.
