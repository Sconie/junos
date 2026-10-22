1. **[high] Approvals have no durable authorization model.**  
   **Reference:** [lines 26–27, 44](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:26): `kind: approval`, but statuses only describe Inbox triage.  
   **Why it matters:** Specs 05–07 and 12 require approve/deny, timeout, restart-safe resumption, exact command/diff review, and revocable remembered rules. Marking an item `done` cannot establish what was authorized or prevent reuse after the action changes.  
   **Fix:** Define an approval record linked to the exact run step, immutable action/diff, scope, expiry, decision and decision time. Resolve it atomically and validate the action before execution. Keep Inbox status separate from authorization; define scoped, revocable approval rules.

2. **[high] Scheduling and run records cannot uphold the promised recovery guarantees.**  
   **Reference:** [lines 16–23](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:16): `run(...source...)`, `run_step(...seq...)`, and `task(...schedule_cron...)`.  
   **Why it matters:** Spec 05 promises one-off schedules, workflow targets, overlap policies, retries, retry-from-step, and no duplicate or lost runs after restart. The schema does not define scheduled occurrences, attempts, workflow-step identity, durable checkpoints, or these scheduling policies.  
   **Fix:** Define explicit task/workflow-run/definition-step links, occurrence identity with a uniqueness constraint, attempt and step states, and recovery behavior. Add discriminated cron/one-off schedules and executor types, overlap and retry policies. Specify how retries avoid repeating completed external actions.

3. **[high] The backup instruction is unsafe for the chosen WAL architecture.**  
   **Reference:** [Backups, line 48](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:48): “Nightly copy of `junos.db`”.  
   **Why it matters:** Spec 01 selects SQLite WAL. Copying the live database file alone can omit committed changes still in the WAL; it does not guarantee a consistent, restorable snapshot.  
   **Fix:** Specify SQLite’s online backup mechanism or a fully quiesced, checkpointed copy. Publish completed backups atomically, verify restoration, and state whether referenced attachments/output artifacts are included or must be rebuilt.

4. **[high] File indexing lacks a durable privacy boundary.**  
   **Reference:** [lines 34–35](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:34): `project(...path...)` and `file_index(...summary, embedding_ref)`.  
   **Why it matters:** Spec 11 requires explicitly added folders and per-folder consent for AI tagging. Neither the allowed roots nor their consent settings are represented. A project path cannot distinguish permission to list files from permission to send their contents to a model.  
   **Fix:** Define indexed roots with canonical paths, exclusion policy, enabled state and AI-processing consent; link files to their root. Specify revocation behavior for file records, summaries, full-text indexes and embeddings.

5. **[high] “Secrets are never stored” has no ingestion or retention contract.**  
   **Reference:** [lines 12–18, 38, 45–48](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:45): unrestricted message, thinking, tool, run and event payloads; per-table JSON exports.  
   **Why it matters:** These fields can capture credentials and private file content even when connection credentials live elsewhere. Spec 12 requires redaction, but this document does not define where it happens or how sensitive data propagates into events, backups and exports. Append-only history also leaves deletion behavior unresolved.  
   **Fix:** Require redaction before persistence across every payload path. Define size limits, retention, export treatment and deletion propagation, including explicit backup expiry. Distinguish append-only operational history from a privacy purge.

6. **[med] Referential integrity and JSON contracts are largely unspecified.**  
   **Reference:** [line 3 and Invariants](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:3): “JSON columns hold flexible payloads”; cards survive source deletion.  
   **Why it matters:** No foreign-key, nullability, uniqueness, enum or deletion rules explain how these entities remain consistent. Free-form references can leave broken links; model IDs, provider model names and JSON routing orders have no defined identity convention.  
   **Fix:** Document keys, required fields, constraints and deletion behavior. Define typed, versioned JSON shapes and canonical model identifiers. For retained cards, specify whether deleted sources become tombstones or unavailable links with a preserved summary.

7. **[med] The event stream cannot yet guarantee consistent UI projections.**  
   **Reference:** [line 38](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:38): `event(id, type, ref_id, payload_json, created_at)`.  
   **Why it matters:** Spec 01 makes events the basis of Home, Inbox, timelines and live updates. The schema does not define atomic entity/event writes, reference types, payload versions or replay ordering. A crash could leave a changed card without its event, or a notification about a change that never committed.  
   **Fix:** Commit entity changes and their events in one transaction. Define typed references, versioned payloads and a durable replay cursor/order, including reconnect deduplication and projection rebuilding.

8. **[med] Inbox snooze and deduplication cannot survive reload reliably.**  
   **Reference:** [lines 26, 44](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:26): `inbox_item(...)` permits `snoozed` without a wake-up timestamp.  
   **Why it matters:** Spec 07 promises timed snooze and source-plus-key deduplication within 24 hours. Missing wake-up and dedupe fields undermine the queue’s hierarchy: hidden urgent work, repeated notifications and inaccurate unread counts.  
   **Fix:** Add `snoozed_until`, a stable source/deduplication key and `updated_at`. Define whether updates reopen resolved items and exactly which states contribute to unread, Needs me and approval counts.

9. **[med] Conversation records omit promised persistent interaction state.**  
   **Reference:** [lines 11–14](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:11): `conversation(...)` and `message(...)`.  
   **Why it matters:** Spec 04 promises remembered model selection, branching, retries and retained partial output. There is no defined conversation selection, branch ancestry or partial-message state. The current `src/pages/Chat.tsx` uses component state, so existing persistence does not fill the gap.  
   **Fix:** Define persisted model/effort and tool context, message ordering and branch ancestry, and streaming/completed/cancelled/failed states—or explicitly defer branching. Separate the model selected for the next message from the model that produced an existing response.

10. **[med] Editable board columns lack stable automation semantics.**  
    **Reference:** [lines 28–30](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:28): `kanban_card(...column...)`, `kanban_board(...columns_json)`.  
    **Why it matters:** Spec 09 allows column editing while Hermes behavior depends on Ready, Review and Done. Without separate identity, label and semantic role, renaming or deleting a column can silently change execution behavior.  
    **Fix:** Define stable column IDs, editable labels, semantic roles, ordering and WIP limits; reference `column_id` from cards. Specify what happens to cards and automation when a column is removed.

11. **[med] Scout lacks the feedback and freshness data its interface promises.**  
    **Reference:** [lines 31–32](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:31): `scout_source(...)` and `scout_finding(...)`.  
    **Why it matters:** Spec 08 requires source health, last-checked time, incremental collection, persistent dismissal reasons and deduplication. These have no defined representation. Findings can return after dismissal, while the UI cannot distinguish fresh results from a failed or stale source.  
    **Fix:** Define source check time, health/error and collection cursor; finding identity/dedupe key, dismissal reason and feedback timestamp. Preserve dedupe identity when visible findings are archived.

12. **[med] Search and indexing have no persistence or performance contract.**  
    **Reference:** [line 35](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:35): `file_index(...mtime, ai_tags_json, summary, embedding_ref)`.  
    **Why it matters:** Specs 10–11 promise FTS5 content search, content-hash caching and fast results. The model defines neither FTS ownership/synchronization nor a content hash, processing state or query indexes. Files can appear searchable before processing finishes, or display summaries generated from older content.  
    **Fix:** Specify FTS tables and update/delete synchronization, content hashes, summary/embedding versions and indexing states. Define indexes and stable pagination for the primary list/search queries. Keep typography, spacing, contrast and motion rules in spec 14; this document should supply accurate ready, pending, stale and failed states for those layouts.