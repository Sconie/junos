1. **high — Approval items lack a durable authorization record.**

   **Reference:** [Core tables and invariants](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:26): `inbox_item(... status ... resolved_at)`; statuses are `new | seen | snoozed | done | dismissed`.

   **Why it matters:** Specs 05, 07 and 12 require approval decisions, expiry, paused-step resumption and remembered project rules. “Done” cannot distinguish approval from denial or establish exactly which action was authorized after a restart.

   **Concrete fix:** Define an approval contract containing the requesting run/step, immutable command/diff or action hash, decision, expiry and resolution timestamp. Define scoped, revocable remembered rules separately. Make decision recording, audit emission and execution claiming atomic; reject expired or changed actions.

2. **high — Scheduled runs have no durable occurrence identity.**

   **Reference:** [Task and run definitions](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:16): `run(... source ...)` and `task(... schedule_cron ... next_run_at)`.

   **Why it matters:** Spec 05 promises no duplicate or lost scheduled runs after restart. `next_run_at` alone cannot establish whether a particular occurrence was claimed, queued or completed. One-off scheduling, overlap policy and retry settings also have no defined representation.

   **Concrete fix:** Add explicit task/run linkage and persisted occurrences with a unique `(task_id, scheduled_at)` key and claim state. Define cron versus one-off schedules, overlap policy and retry settings. Document crash recovery, including how external side effects avoid being repeated.

3. **high — Workflow execution cannot reliably resume from the recorded steps.**

   **Reference:** [Workflow tables](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:18): `run_step(... seq, type ...)` and `workflow_run(... workflow_id ... params_json ...)`.

   **Why it matters:** Spec 05 promises retry from a failed step. The schema does not define how a step execution belongs to a workflow execution, which definition step it represents, its attempt/status, or which version of an editable workflow ran. Editing a definition could change the meaning of a resumed execution.

   **Concrete fix:** Persist the definition snapshot/version, stable definition-step IDs, workflow-run linkage, attempt number and step lifecycle. Specify how completed outputs are reused and which interrupted steps require reconciliation before retry.

4. **high — “Nightly copy” is unsafe for the selected WAL configuration.**

   **Reference:** [Backups](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:48): “Nightly copy of `junos.db`.”

   **Why it matters:** Architecture 01 selects WAL. Committed changes can remain in the WAL rather than the main database file, so copying only `junos.db` can omit them. A live file copy also lacks a defined consistent-snapshot procedure. See SQLite’s [WAL documentation](https://sqlite.org/wal.html).

   **Concrete fix:** Require the SQLite backup API or `VACUUM INTO`, followed by restore verification. Define whether referenced attachment/output files are included or explicitly excluded from recovery. Both supported snapshot approaches are documented in SQLite’s [backup guidance](https://sqlite.org/backup.html).

5. **med — The absolute “no secrets” invariant conflicts with unrestricted content persistence.**

   **Reference:** [Messages and run payloads](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:12), plus invariant: “Secrets are never stored in this DB.”

   **Why it matters:** Messages, thinking, tool outputs, errors and events can contain pasted or echoed secrets. Spec 12 mentions redaction for logs and run records, but this document does not cover every persistence path. Backups and exports multiply retained copies; no retention or deletion policy is defined.

   **Concrete fix:** Distinguish prohibited credential storage from potentially sensitive user content. Specify sanitization across operational payloads, restricted access to database/backups/exports, output caps and retention. Explain how deletion affects events, search indexes, embeddings and existing backups; acknowledge pattern redaction’s limits.

6. **med — File indexing lacks a defined consent and search-storage contract.**

   **Reference:** [Project and file tables](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:34): `file_index(... ai_tags_json, summary, embedding_ref)`.

   **Why it matters:** Spec 11 requires explicitly added folders, per-folder AI-tagging opt-in, exclusions, content-hash caching and content search. Spec 10 requires FTS5. This model defines neither where those permissions persist nor how searchable content and derived data are maintained. An embedding reference does not establish whether the underlying content was permitted to leave the machine.

   **Concrete fix:** Define or reference a persisted folder-policy store with indexing scope and AI-processing consent. Specify FTS storage/update rules, content hashes, embedding provenance and cleanup when files disappear or a folder’s permission is revoked.

7. **med — The stated invariants have no enforcement contract.**

   **Reference:** [Core tables](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:5) and [Invariants](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:41).

   **Why it matters:** Relationships, nullability, uniqueness, status transitions and JSON shapes are unspecified. Implementations could accept assistant messages without runs, agent conversations without agents, invalid routing scopes or cards pointing to nonexistent columns. Flexible JSON can carry these contracts, but currently does not define them.

   **Concrete fix:** Add a compact constraint matrix covering foreign keys, required fields, allowed states, uniqueness and deletion behavior. Define versioned JSON schemas. Make source deletion preserve cards with an explicit unavailable-source state, rather than leaving ambiguous links.

8. **med — Inbox snooze and deduplication cannot deliver the promised triage behavior.**

   **Reference:** [Inbox definition](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:26) and `status = snoozed`.

   **Why it matters:** Spec 07 promises snoozing until a chosen time and updating matching source/key items within 24 hours. There is no wake time, defined deduplication key or update timestamp. Items could remain hidden indefinitely or repeatedly return as duplicates, distorting counts and attention hierarchy.

   **Concrete fix:** Add `snoozed_until`, a documented source/key identity and `updated_at`. Define overdue wake-up after restart, deduplication window boundaries and whether incoming updates preserve snoozed or completed states.

9. **med — Chat cannot distinguish saved preferences, actual execution and branch history.**

   **Reference:** [Conversation/message definitions](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:11): conversation has no model/effort settings; messages have one model/provider and no ancestry.

   **Why it matters:** Spec 04 promises remembered conversation choices, tool selections, retries and branching. Spec 03 requires fallback attribution. Inferring preferences from the latest response confuses the selected model with the model that actually answered; without ancestry, replaying a branched thread is ambiguous. The current `src/pages/Chat.tsx` holds selections only in component state.

   **Concrete fix:** Define persisted conversation settings, requested versus actual routing provenance with fallback reasons, and message parent/branch relationships. Specify how retry alternatives and attachments participate in replay.

10. **med — Kanban’s source reference cannot represent its promised working detail.**

    **Reference:** [Kanban tables](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:28) and the invariant allowing one source reference.

    **Why it matters:** Spec 09 promises checklists, multiple artifact links, comments and activity history. None has a defined representation. Putting everything into `body_md` would prevent consistent completion controls and force the drawer to present actionable state as dense prose.

    **Concrete fix:** Keep creation provenance separate from subsequent links. Define stable checklist items with completion/order, typed links and card-linked comments/activity. Small typed JSON collections are sufficient where independent records are unnecessary.

11. **med — Scout cannot preserve the feedback that is supposed to reduce noise.**

    **Reference:** [Scout tables](/E:/AI/review-loop/junos/docs/specs/02-data-model.md:31): `scout_source` and `scout_finding`.

    **Why it matters:** Spec 08 promises collection since the previous run, source health, dismissal reasons and suppression of previously dismissed findings. The model defines no collection cursor, health timestamps, dismissal reason or stable deduplication identity. Repeated suggestions would undermine the feed’s relevance ranking.

    **Concrete fix:** Define per-source collection progress and health, stable finding identity, dismissal reason/time and deduplication rules. Preserve dismissal feedback independently of temporary Inbox items.