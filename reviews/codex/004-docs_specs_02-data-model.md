1. **[high] Approvals lack a durable authorization record.**  
   **Reference:** Lines 25–27, 38: approval is an `inbox_item.kind`; the only decision-related fields are generic `status` and `resolved_at`.  
   **Why it matters:** “Done” cannot distinguish approved, denied, or timed out. Nothing explicitly binds approval to the exact command/diff, project, or waiting step. This leaves the approval and audit requirements in specs 07 and 12 underspecified.  
   **Concrete fix:** Define an approval record with the requesting run/step, immutable action payload or hash, project scope, expiry, decision, and decision time. Model remembered rules separately, including revocation. Require the executor to validate that the approved action still matches.

2. **[high] Runs cannot reliably reconstruct or resume workflows.**  
   **Reference:** Lines 16–23: `run(... source ...)`, `run_step(...)`, and `workflow_run(...)` have no explicit relationship connecting a workflow execution to its step runs.  
   **Why it matters:** Spec 01 requires restart recovery; spec 05 promises retry from a failed step. A sequence number and unstructured `source` do not establish step identity, attempts, dependencies, or which workflow definition was executed.  
   **Concrete fix:** Specify typed source references, `workflow_run_id`, stable definition-step IDs, attempt numbers, step status/timestamps, and a definition version or snapshot. Define restart handling and replay rules for steps with side effects.

3. **[high] Scheduling cannot meet the “no duplicate or lost runs” guarantee.**  
   **Reference:** Lines 20–21: `task(... schedule_cron, ... catch_up, enabled, next_run_at)`.  
   **Why it matters:** Spec 05 also requires one-off schedules, overlap policy, retries, and catch-up after downtime. These have no defined representation. `next_run_at` alone cannot distinguish an unclaimed occurrence from one already executed before a crash.  
   **Concrete fix:** Add schedule kind/one-off time, overlap and retry settings, and a persisted occurrence record uniquely keyed by task and scheduled time. Define transactional claiming and recovery, with separate identities for occurrences and retry attempts.

4. **[high] The backup procedure conflicts with the chosen WAL architecture.**  
   **Quote:** “Nightly copy of `junos.db`” — line 48.  
   **Why it matters:** Spec 01 selects SQLite WAL. Copying only the main database while the daemon is active can omit committed changes still in the WAL and does not define a consistent backup snapshot.  
   **Concrete fix:** Require SQLite’s online backup mechanism or an explicitly quiesced, consistent snapshot procedure. Specify atomic backup publication, integrity checking, and a tested restore process.

5. **[high] “Secrets are never stored” has no enforceable payload boundary.**  
   **Reference:** Line 45 versus `content_md`, `thinking_md`, tool inputs/outputs, error fields, and `event.payload_json`.  
   **Why it matters:** Credentials can arrive inside pasted messages, command output, URLs, or errors even when dedicated credential storage is external. Those values can then propagate into events, exports, and backups. Spec 12 requires redaction, but this model does not define where it happens or what remains sensitive.  
   **Concrete fix:** Define redaction before persistence across every payload path, bounded output capture, and handling of user-supplied secrets. Document retention/deletion for sensitive content and derived copies, plus backup/export protections. Distinguish “no credential store” from the stronger guarantee of no incidental secrets.

6. **[med] Relationships and integrity rules are too ambiguous for a shared schema contract.**  
   **Reference:** Lines 3–38: table signatures omit types, nullability, foreign keys, uniqueness, indexes, and JSON shapes.  
   **Why it matters:** Several ambiguities affect behavior: does `message.model` reference a ULID or contain a provider model name? What does `attachment.file_id` reference? Which objects can `scope_ref` address? Flexible JSON does not resolve these questions, and spec 10’s FTS5 search has no defined storage or synchronization plan.  
   **Concrete fix:** Add a compact field dictionary or DDL defining reference targets, required fields, enums, uniqueness, deletion behavior, and versioned JSON schemas. Identify indexes and FTS tables for the promised list/search queries.

7. **[med] Event persistence has no atomicity or projection contract.**  
   **Reference:** Line 38: `event(id, type, ref_id, payload_json, created_at) -- append-only`.  
   **Why it matters:** Specs 00 and 01 make events the foundation for Inbox, Home, activity, and workflow triggers. Without transactional rules, a state change can survive while its event is lost, or a replay can trigger the same action twice. `ref_id` also lacks an entity type.  
   **Concrete fix:** Require each entity mutation and its event to commit together. Define typed entity references, event payload versions, replay cursors, and deduplication keys for trigger consumers.

8. **[med] Inbox states cannot implement snoozing, deduplication, or honest attention counts.**  
   **Reference:** Lines 26 and 44: `new | seen | snoozed | done | dismissed`.  
   **Why it matters:** Spec 07 promises snooze-until, source+key deduplication within 24 hours, and automatic expiry. There is no wake time, dedupe key, or update timestamp. This undermines the UI’s hierarchy: urgent approvals, genuinely unread items, and snoozed items cannot be consistently separated.  
   **Concrete fix:** Add `snoozed_until`, a stable source/dedupe key, and relevant update/expiry timestamps. Define transitions and the exact queries behind unread badges and “Needs me.” Keep approval decisions separate from reading/triage state.

9. **[med] Chat persistence omits promised conversation continuity.**  
   **Reference:** Lines 11–14: conversation and message fields.  
   **Why it matters:** Spec 04 promises remembered model/effort choices, branching, cancellation with partial output, and fallback explanations. The model defines no conversation preferences, branch ancestry, partial-message state, or requested-versus-actual route. Reconstructing these from the latest assistant message fails for empty conversations and changed preferences.  
   **Concrete fix:** Define persisted conversation defaults/context, branch or parent-message relationships, message ordering and completion state, and requested/actual routing metadata. Specify which retained outputs are available from each provider rather than assuming `thinking_md` always exists.

10. **[med] File privacy choices and attachment identity are not represented.**  
    **Reference:** Lines 14, 34–35: attachments and file/project indexing.  
    **Why it matters:** Spec 11 requires explicit folder allowlists, per-folder AI-tagging consent, exclusions, and content-hash caching. A project path and `mtime` cannot express those policies. A path-only attachment also leaves unclear whether chat refers to the original file contents or whatever occupies that path later.  
    **Concrete fix:** Define indexed roots with persisted consent/exclusion settings, file content hashes and indexing versions, and attachment snapshot semantics. Specify how removing a root invalidates searchable text, summaries, and embeddings.

11. **[med] Kanban’s editable columns have no stable semantic identity.**  
    **Reference:** Lines 28–30: `kanban_card(... column ...)` and `kanban_board(... columns_json)`.  
    **Why it matters:** Spec 09 lets users edit columns while automation depends on Ready, In progress, Review, and Done. If those are display strings, renaming or removing a column can break pickup rules or leave cards stranded. The schema also omits a defined representation for promised checklists, multiple links, and comments.  
    **Concrete fix:** Give columns stable IDs, editable labels, order, and explicit automation roles. Define rename/delete behavior and card placement invariants. Add contracts for checklists, links, and comments, or explicitly defer those features.

12. **[med] Scout lacks the durable evidence needed for its promised feed quality.**  
    **Reference:** Lines 31–32: `scout_source` and `scout_finding`.  
    **Why it matters:** Spec 08 promises incremental collection, deduplication, health/freshness indicators, risk assessment, suggested changes, and learning from dismiss reasons. None has a defined field or payload contract. Without them, the UI risks becoming a generic scored-card feed with unexplained numbers and recurring dismissed items.  
    **Concrete fix:** Define source cursors/check timestamps and health, canonical finding identity, assessment rationale/risk, proposed change, and dismissal feedback. Mark optional scoring fields as unknown when absent and defer feedback learning explicitly if it exceeds the first release’s scope.