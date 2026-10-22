**Verdict:** As a local SQLite map this is a coherent sketch, but it models ~10 product surfaces at once, under-specifies the fields Operate UIs need for honest states, and leaves several privacy holes that the “secrets never in this DB” line does not cover.

Lens: Impeccable **Operate** (task UI: scanability, states, cognitive load) + design-taste **app screens** (one question per screen, colour on data, quiet density, no vanity metrics). No rendered UI to inspect—this is schema → UI risk only.

---

### Contradictions

1. **Secrets vs payloads.** Invariant says secrets never live here (points at 12). Spec 12 agrees for provider tokens/keychain. This schema still stores the soft-secret surface: `thinking_md`, `tool_calls_json`, `run.input_json` / `run_step.*_json`, `task.prompt`, `workflow.definition_json`, `agent.config_json`, `memory_item.value_md`, `event.payload_json`, and provider `error` strings. Those are often more sensitive than the API key.

2. **`message.run_id` “every assistant message”** vs schema. Column is unconstrained; user/system/tool roles, failed runs, and streamed partials are undefined. “Every” is stronger than the columns allow.

3. **Card ↔ finding dual link.** Invariant: card references source via `source_ref_json` only. `scout_finding.card_id` is a second pointer. Two sources of truth; delete/orphan rules only cover one direction.

4. **Approval kinds vs status machine.** `inbox_item.kind` includes `approval`, but status is only `new | seen | snoozed | done | dismissed`. No approve/reject/remember outcome. Spec 12’s approval story cannot be stored as first-class state here.

5. **Attachment identity.** `attachment(file_id, path, …)` plus separate `file_index`—which path is canonical, and what `file_id` points at, is undefined.

6. **Kanban column as string** vs `kanban_board.columns_json`. Rename/reorder of board columns vs cards’ `column` values will desync; no invariant.

7. **Backups vs “data safety” framing.** Nightly full `junos.db` copy + “export JSON per table” retains the high-sensitivity payloads above for 14 days (and forever if exports pile up). That fights a privacy-first read of the invariants section.

---

### Gaps (model & UI contract)

| Gap | Why it hurts |
|---|---|
| No identity model | `creator`, `assignee`, `memory_item.owner` are bare fields—strings? agents? No people table → app-screens “people as identity” (stable initial/hue) has nothing to bind to |
| Missing status enums | `run.status`, `workflow_run.status`, `agent.status`, `scout_finding.status`, `connection.status` are unnamed → UI invents colours and labels |
| Snooze without `snooze_until` | Status `snoozed` can’t drive resurfacing |
| No conversation `updated_at` / last message | Recents, pinning, and inbox-vs-chat ordering will be wrong or expensive |
| No message draft / stream / error state | Chat Operate UI needs partial, failed, cancelled |
| `workflow_run` ↔ `run` / `run_step` unlink | Can’t show one honest run timeline for a workflow |
| Task: no last outcome | Schedule UI can’t answer “did last run fail?” without scanning `run` |
| No FTS / search index entity | Search as a product surface isn’t modeled (only raw tables) |
| `event` append-only, no retention | Unbounded growth; audit UI will choke |
| Magnitudes unspoken | No expected counts (msgs/day, findings/week, file_index size) → designers will draw KPI tiles and dense tables for empty or huge worlds alike |
| No UI preference / disclosure flags | e.g. show thinking, density, reduced motion—disclosure of `thinking_md` becomes ad hoc |

---

### Unrealistic scope

Roughly **20 tables** spanning connections, routing, chat, runs, cron tasks, workflows, agents, inbox, kanban, scout, projects, file index + embeddings, Hermes memory, and an event log—in one SQLite file, with nightly full copies.

For a single-user localhost agent OS that can be a deliberate “one DB” choice, but as a **shipable Operate surface set** it’s a full suite with no phasing or “minimum tables for v1” cut. Highest cost/risk combo: `file_index` + `embedding_ref` + full `run_step` I/O JSON + `message.thinking_md` + forever `event`. That’s the first place SQLite size, backup time, and export UX break.

JSON-everywhere (`*_json`, `definition_json`, `config_json`) also postpones modeling: the UI will either dump JSON or invent a second undocumented schema inside blobs.

---

### Security / privacy risks

- **Cleartext high-value content** in the main DB (prompts, thinking, tool I/O, memory, local file summaries/paths). Keychain-only for “secrets” does not cover this.
- **`error` / tool output** often echo tokens or file contents; no redaction field or policy on the row.
- **`memory_item` editable by design** → durable prompt-injection / poisoned memory with no trust/provenance columns.
- **`file_index.path` + `summary` + `ai_tags_json`** = local filesystem intelligence store; backup/export widens blast radius.
- **`scout_source.url_or_query` + cadence** = scheduled fetch of untrusted content into `scout_finding` / inbox with no “untrusted” flag on the row (harder to treat differently in UI).
- **Export-per-table** is a one-click exfil of the whole product brain unless gated, filtered, and redacted—none of that is in this doc.
- Single-file DB + 14 backups under `~/.junos/` with no encryption mention in this doc.

---

### UI / design-quality problems (schema → screen)

Framed as what this model **pushes** the UI toward (Impeccable Operate + app-screen house taste):

**Hierarchy / IA**  
Peer entities (inbox, chat, kanban, scout, tasks, workflows, agents, projects, memory, connections) with weak typed links invite a **sidebar of equal destinations**—the opposite of “one question per screen” and “nav recedes.” Three “what’s new” pipes (`inbox_item`, `event`, kanban/`scout_finding`) will compete unless one is clearly primary.

**Density**  
`kanban_card` (~14 fields) + `labels_json` + priority + due + source ref encourages badge-heavy cards. `run_step` with full I/O invites an always-expanded forensic dump instead of summary-first. Mixed inbox kinds in one row shape force either overloaded rows or a lowest-common-denominator list.

**Typography / legibility**  
Opaque enums and JSON blobs push UIs toward monospace dumps and tiny meta lines (provider, effort, tokens, relevance, effort_est). App-screen rule: running text in full ink; grey only for secondary—this schema is meta-heavy and content-light on several objects (`connection.usage_json`, `tokens_json`, `relevance`).

**Colour / contrast**  
Unspecified status/priority vocab → rainbow status chips and priority pills (colour on chrome). `relevance` / token counts invite vanity KPIs and sparklines from `usage_json` / `tokens_json`—exactly the generated-dashboard tell app-screens ban. Colour should mark **decision state** (needs approval, failed run), which isn’t modeled cleanly for approvals.

**Spacing / composition**  
No “summary vs detail” split in the model (`run_step.summary` exists; message thinking/tools do not). Expect stacked panels: markdown + thinking + tools + attachments + run meta—tight vertical rhythm with no documented collapse defaults.

**Motion**  
No progress, phase, or percent on `run` / `workflow_run` → indeterminate spinners or fake motion. `task.catch_up` implies burst updates with no batching/aggregation fields for a calm inbox.

**Empty / loading / error**  
Almost no first-class empty or failure presentation data (beyond a string `error` on a few tables). Empty states will fall back to generic “No items” instead of trade language (“Nothing waiting for approval”).

**Product face**  
Nothing in the schema is JunOS-specific as a signature object (no workspace mark, no single “today’s finding” aggregate). The closest unique object is Hermes `memory_item` / scout findings, but both are buried among generic SaaS tables (board, card, labels, cron)—high risk of **kit UI**.

---

### Highest-leverage fixes (still doc-only suggestions)

1. **Split “v1 tables” vs later** (e.g. defer kanban + file embeddings + full workflow graph).  
2. **Replace dual card↔finding links** with one typed `source_ref` and cascade/orphan rules.  
3. **Model approval outcomes and snooze_until**; map inbox kinds to row layouts or separate queues.  
4. **Name every status enum**; add the few Operate fields (`updated_at`, last task result, run progress).  
5. **Privacy: classify columns** (public / sensitive / export-excluded), cap or externalize `thinking` / step I/O, and define backup/export redaction—don’t rely on “no secrets” alone.  
6. **Kill or constrain vanity metrics fields** (`relevance`, raw `tokens_json` as UI fodder) unless tied to one screen question.

---

If you want a follow-up, the next useful pass is the same lens on `14-ui-system.md` or `07-inbox-and-agent-chats.md` against this schema—still Ask mode, still review-only.
