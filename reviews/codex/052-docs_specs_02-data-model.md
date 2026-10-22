1. **[high] Approvals have no durable authorization record.**  
   **Reference:** Lines 25–27, `agent.config_json` and `inbox_item`; line 38, `event`.  
   **Why it matters:** Specs 06, 07 and 12 require exact-action approval, timeout denial, and revocable project rules. An Inbox status such as `done` cannot distinguish approval from denial or bind permission to the command that eventually executes.  
   **Concrete fix:** Define an approval record linking the run/step, project, immutable proposed action, decision, decision time and expiry. Persist scoped approval rules separately. Require atomic resolution and revalidation before execution.

2. **[high] Scheduled runs cannot reliably prevent duplicates after restart.**  
   **Reference:** Lines 16–21, `run` and `task`.  
   **Why it matters:** Spec 05 promises one-off scheduling, overlap policies, retries and restart safety. The schema has no explicit scheduled occurrence, attempt number, overlap policy or one-off timestamp; `run.source` has no defined relationship to its task. `next_run_at` alone does not establish whether an occurrence already executed.  
   **Concrete fix:** Add a typed task reference, scheduled occurrence time, unique occurrence identity, attempts and execution policy. Define transactional claiming and restart recovery. Represent cron and one-off schedules explicitly.

3. **[high] Workflow execution lacks the identity and state needed to resume safely.**  
   **Reference:** Lines 18 and 22–23, `run_step`, `workflow`, `workflow_run`.  
   **Why it matters:** Spec 05 allows approval pauses and retrying a failed step. Steps have no stable definition-step ID, execution status or attempt identity, and no explicit relationship connects a step run to `workflow_run`. Editing `definition_json` during a paused run could change what resumes.  
   **Concrete fix:** Snapshot or version the definition for each workflow run. Link executions to that run and to stable step IDs; persist status, attempts, checkpoints and approval references. Specify how retries avoid repeating completed external actions.

4. **[high] The backup instruction conflicts with the WAL architecture.**  
   **Quote:** “Nightly copy of `junos.db`” — line 48.  
   **Why it matters:** Spec 01 chooses SQLite WAL. Copying the live main file alone can omit committed changes still in the WAL and does not define a consistent recovery snapshot. Per-table JSON exports also have no consistency guarantee.  
   **Concrete fix:** Specify SQLite’s online backup mechanism or a coordinated, verified snapshot procedure. Make exports transactionally consistent and include schema version information. Define restore verification before rotating older backups.

5. **[high] “Secrets are never stored” lacks a policy for the payload columns and retained copies.**  
   **Reference:** Lines 12–18, 26, 36, 38 and 45–48.  
   **Why it matters:** Prompts, thinking, tool arguments, errors and events can contain credentials or private file content even when credentials are owned by CLI stores. An append-only event history and backups can retain that information after a conversation is deleted. Spec 12’s redaction requirement is not carried into this storage contract.  
   **Concrete fix:** Define redaction before every persistence path, payload size caps, retention periods and deletion propagation across derived data, events, exports and backups. Specify storage access restrictions and how sensitive payloads can be purged while retaining minimal audit metadata.

6. **[med] Relationships and JSON fields have no enforceable contracts.**  
   **Reference:** “JSON columns hold flexible payloads” — line 3; Core tables, lines 7–38.  
   **Why it matters:** Types, required fields, foreign keys, uniqueness and deletion behavior are mostly unspecified. For example, `attachment.file_id` presumably targets `file_index`, but that is not stated. `scope_ref` and source references can become dangling or refer to the wrong entity type.  
   **Concrete fix:** Add a compact contract for each table: types, nullability, keys, references and deletion rules. Define versioned schemas for JSON payloads and tagged references. Identify which constraints SQLite enforces and which the daemon validates.

7. **[med] Snooze and deduplication cannot be reconstructed from the Inbox schema.**  
   **Reference:** Lines 26–27 and 44, `inbox_item`.  
   **Why it matters:** Spec 07 requires snooze-until, deduplication by source/key within 24 hours, and expiry after 14 days. There is no wake-up time or dedupe key. Updating a duplicate also has no defined effect on its age, unread state or urgency, making counts and ordering ambiguous.  
   **Concrete fix:** Define `snoozed_until`, source/dedupe identity, update time and expiry semantics. Document status transitions and the exact queries behind unread badges, Needs me and Snoozed.

8. **[med] Chat persistence does not support the promised conversation behavior.**  
   **Reference:** Lines 11–14 and 43, `conversation` and `message`.  
   **Why it matters:** Spec 04 promises remembered model/effort choices, branching, retries, retained partial output and fallback attribution. There is no branch ancestry, message completion state or persisted conversation configuration. A single model/provider pair cannot explain both the requested route and the model that answered.  
   **Concrete fix:** Add conversation settings, message ancestry and explicit completion/cancellation state. Define requested versus actual routing metadata and ordering. State whether provider-native tool messages are preserved for replay.

9. **[med] File indexing has no persisted consent or cache identity.**  
   **Reference:** Lines 34–35, `project` and `file_index`.  
   **Why it matters:** Spec 11 requires explicitly allowed folders, per-folder opt-in AI tagging, ignore rules and summaries cached by content hash. Project membership does not establish permission to index or transmit content, and `mtime` alone cannot identify the content behind a cached summary.  
   **Concrete fix:** Model approved roots and their indexing/AI-processing settings; link indexed files to them. Add content hash and index freshness/version metadata. Specify cleanup when consent is revoked or a file disappears.

10. **[med] Kanban conflates a card’s origin with its later work history.**  
    **Quote:** “A card may reference one inbox item, one finding, or one run” — line 42.  
    **Why it matters:** A card created from a finding can later accumulate multiple Hermes runs, retries and artifacts. The single source reference cannot represent that history without losing its origin. Spec 09 also requires checklists, comments, links and activity that are absent from the model. Editable columns have no defined stable identity.  
    **Concrete fix:** Preserve one immutable origin and model subsequent links/activity separately. Define checklist/comment storage and stable column IDs, including what happens when an occupied column is removed.

11. **[med] Scout cannot persist the feedback that is supposed to reduce noise.**  
    **Reference:** Lines 31–32, `scout_source` and `scout_finding`.  
    **Why it matters:** Spec 08 requires incremental collection, deduplication, dismissal reasons, risk assessment and source-health timestamps. None has an explicit storage contract. A dismissed suggestion can reappear, while the sources rail cannot reliably distinguish stale data from a healthy source with no new findings.  
    **Concrete fix:** Define source checkpoints and health timestamps, canonical finding identity, dismissal reason/time and assessment metadata. Specify deduplication behavior across repeated collection and changed titles.

12. **[med] Unbounded content has no list/detail presentation contract.**  
    **Reference:** `content_md`, `body_md`, `input_json`, `output_json` and `payload_json` throughout Core tables.  
    **Why it matters:** Specs 06–10 place these records in live timelines, Inbox panes and Home cards. Without bounded summaries, pagination and explicit availability states, implementations may dump raw payloads into glass panels, produce uneven row density, or show unknown values as zero. Those choices weaken hierarchy and legibility regardless of the palette.  
    **Concrete fix:** Define lightweight list projections, cursor ordering, bounded previews and lazy-loaded detail payloads. Distinguish missing, pending, stale and failed values. Cross-reference spec 14 for typography, spacing, composited contrast and reduced-motion/opaque fallbacks; keep those visual rules out of database fields.