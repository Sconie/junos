1. **[high] Approval records cannot safely authorize an action.**  
   **Reference:** Lines 26–27, `inbox_item`; lines 41–45, invariants.  
   **Why it matters:** An approval is only an Inbox kind with generic display states. There is no defined binding to the exact command/diff, waiting step, expiry, decision, or remembered permission. Specs 06, 07 and 12 require these. An old approval could otherwise authorize a changed action, and “Done” cannot distinguish approval from denial.  
   **Concrete fix:** Define a durable approval record linked to the run/step, immutable action payload or hash, project, expiry, decision and decision time. Make resolution atomic and single-use; store remembered rules separately with scope and revocation.

2. **[high] The scheduler lacks the records needed to prevent lost or duplicate executions.**  
   **Reference:** Lines 20–21, `task(... schedule_cron ... catch_up ... next_run_at)`.  
   **Why it matters:** Spec 05 promises one-off schedules, overlap policies, retries and restart recovery. `next_run_at` alone does not record which scheduled occurrence was claimed or completed. A crash between launching a task and updating its schedule can repeat work or skip it.  
   **Concrete fix:** Add a schedule discriminator and one-off timestamp, overlap/retry settings, and durable occurrence records with a unique `(task_id, scheduled_for)` key. Define atomic claiming and restart handling, including how interrupted external actions are reconciled.

3. **[high] Workflow execution has no defined relationship to its persisted steps.**  
   **Reference:** Lines 16–18 and 22–23, `run`, `run_step`, `workflow_run`.  
   **Why it matters:** `run_step` belongs to `run`, but neither links explicitly to `workflow_run` or a stable definition-step ID. Steps also lack status and attempt identity. The resume-from-failure and approval-pause behavior in spec 05 cannot be reconstructed reliably, especially after the workflow definition changes.  
   **Concrete fix:** Choose one execution hierarchy. Link each step execution to its workflow execution and definition-step ID; record attempts, lifecycle status, timestamps and a definition version or snapshot. Specify which step types are safe to retry.

4. **[high] “Secrets are never stored” has no enforceable storage boundary.**  
   **Reference:** Line 45; `content_md`, `thinking_md`, `tool_calls_json`, run inputs/outputs, errors and event payloads.  
   **Why it matters:** These fields can receive pasted credentials, file contents and subprocess output. Spec 12 mentions log/run redaction, but this document does not extend it to messages, events, indexes, backups or exports. The absolute invariant is unsupported by the proposed write paths.  
   **Concrete fix:** Define redaction before persistence across every payload-bearing field, keychain references for owned secrets, and explicit handling of sensitive attachments. Add retention and deletion rules covering derived indexes, events and backup expiry; document the limits of pattern-based redaction.

5. **[high] The prescribed backup can miss committed data under WAL.**  
   **Reference:** Line 48, “Nightly copy of `junos.db`”; architecture spec 01 selects SQLite WAL.  
   **Why it matters:** A live main-file copy alone does not necessarily include transactions still held in the WAL. A backup may appear successful while omitting recent conversations or approval decisions. Per-table JSON exports also lack a defined consistent snapshot.  
   **Concrete fix:** Require SQLite’s online backup mechanism or a coordinated snapshot procedure. Define transactional exports, schema/version metadata, restricted backup permissions and a restore verification check.

6. **[high] Table integrity and the event-stream contract are unspecified.**  
   **Reference:** Line 3, “JSON columns hold flexible payloads”; lines 5–38, core tables.  
   **Why it matters:** There are no declared nullability rules, foreign keys, unique constraints, JSON shapes or migration strategy. The document also does not require an entity mutation and its event to commit together. Inbox, Home and Kanban could disagree after a partial write, undermining the “one event stream” principle in spec 00.  
   **Concrete fix:** Specify key relationships, deletion policies, required fields, checked enums and versioned JSON schemas. Require entity changes and corresponding events in one transaction, define event ordering/replay cursors, and add indexes for the named list/filter queries.

7. **[med] File indexing has no persisted consent or exclusion model.**  
   **Reference:** Lines 34–35, `project` and `file_index`.  
   **Why it matters:** Spec 11 allows explicitly added folders, per-folder AI opt-in, exclusions and content-hash caching. Neither table records those settings or a folder’s indexing provenance. After restart, the daemon lacks a specified source of truth for what it may index or send to a model.  
   **Concrete fix:** Define indexed roots with canonical paths, exclusion rules and AI-processing consent. Link files to roots, record content hashes and indexing state, and specify removal of extracted text, summaries and embeddings when a root is revoked. Include FTS5 storage and update behavior promised by specs 10–11.

8. **[med] Chat persistence cannot reproduce the promised conversation experience.**  
   **Reference:** Lines 11–14, `conversation`, `message`, `attachment`.  
   **Why it matters:** Spec 04 promises remembered model/effort choices, branching, context/tool selections and partial output on cancellation. The schema has no conversation settings, parent-message relationship, explicit message order or partial/cancelled state. An attachment path also does not identify which file version was actually supplied.  
   **Concrete fix:** Persist conversation settings, message ancestry/order and streaming outcome. Define attachment identity and snapshot/hash semantics, plus how retained partial messages link to cancelled runs.

9. **[med] Inbox states cannot support snooze, deduplication or clear decision hierarchy.**  
   **Reference:** Line 26 and line 44, `inbox_item.status`.  
   **Why it matters:** Spec 07 requires timed snooze, deduplication within 24 hours, unread counts and urgent-first sorting. There is no `snoozed_until`, dedupe key or independent read state; the priority vocabulary is undefined here. An urgent approval can therefore lose its unread identity when opened, while snoozed items have no defined return time. This directly weakens scanability and attention management.  
   **Concrete fix:** Separate read state from resolution state. Add snooze time, dedupe identity and checked priorities; define filter/count semantics and ordering. Keep approval outcomes distinct from ordinary dismissal or completion.

10. **[med] Kanban’s source invariant contradicts its required context links.**  
    **Reference:** Line 42, “one inbox item, one finding, or one run”; lines 28–30, card/board fields.  
    **Why it matters:** Spec 09 requires links to files, PRs, conversations, findings and runs, plus checklists and activity. A single source slot cannot preserve an originating finding alongside the execution run and resulting PR. Editable column names also lack a defined stable identity for Hermes’s Ready/Review automation.  
    **Concrete fix:** Separate immutable origin from multiple typed context/artifact links. Define checklist storage and the activity query. Give columns stable IDs and explicit semantic roles so renaming a column does not change agent eligibility.

11. **[med] Scout cannot persist the feedback loop it promises.**  
    **Reference:** Lines 31–32, `scout_source` and `scout_finding`.  
    **Why it matters:** Spec 08 requires incremental collection, source health, dismiss reasons, duplicate suppression, risk and suggested changes. Those facts have no defined storage location. The feed risks resurfacing dismissed findings and showing effort/relevance without the explanation needed to judge them.  
    **Concrete fix:** Add source cursors/check timestamps and health, stable finding dedupe keys, dismissal reason/time, and structured assessment details. Define score ranges and effort values so sorting and chips remain consistent.

12. **[med] Persisted states are too vague to drive honest, restrained UI feedback.**  
    **Reference:** Lines 7, 16–18 and 25: connection/run/agent `status`; steps have only `duration_ms`.  
    **Why it matters:** The UI needs to distinguish queued, running, awaiting approval, interrupted, unavailable and stale data. Without canonical states, timestamps and progress semantics, implementations may show indefinite activity pulses, misleading status colours or empty values that resemble loading. Glass makes clear text hierarchy and limited motion particularly important.  
    **Concrete fix:** Define state enums and transitions, step start/end times, freshness timestamps and nullable usage semantics. Cross-reference spec 14 for labelled status presentation, readable contrast over composited glass, and static equivalents for reduced motion and opaque fallback modes. Typography, spacing and palette belong in that UI contract; this schema should supply the facts those treatments communicate.