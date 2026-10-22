1. **[high] Approvals have no durable authorization record.**  
   **Reference:** Lines 18, 26–27: `run_step(...)` and Inbox `kind: approval`.  
   **Why it matters:** Neither table records the exact action approved, its project scope, expiry, decision, or consumption. The approval and timeout behavior promised in specs 06, 07 and 12 cannot safely survive restarts or distinguish approval of an original action from a changed command.  
   **Fix:** Define an approval record linked to a run step, containing an immutable action snapshot/hash, scope, expiry, decision and timestamps. Specify atomic, single-use consumption and separate revocable rules for “Approve and remember.”

2. **[high] Scheduled execution cannot meet the no-duplicates/no-loss promise.**  
   **Reference:** Lines 16–23: `run`, `task`, `workflow_run`.  
   **Why it matters:** `next_run_at` does not identify which scheduled occurrence was claimed or completed. There is no explicit task-to-run relationship, occurrence key, retry attempt, or durable claim. Spec 05 requires catch-up, overlap handling and safe daemon restarts.  
   **Fix:** Add `task_id`, `scheduled_for`, execution origin and attempt metadata, with a unique task/occurrence key. Define transactional claiming and restart recovery. Add explicit one-off scheduling, overlap and retry settings rather than expecting cron and `catch_up` to cover them.

3. **[high] The backup procedure conflicts with WAL storage.**  
   **Quote:** Line 48: “Nightly copy of `junos.db`”.  
   **Why it matters:** Spec 01 selects SQLite WAL mode. Copying only the live main file can omit committed data still in the WAL; it is not a reliable database snapshot.  
   **Fix:** Require SQLite’s online backup mechanism or another documented consistent snapshot procedure. Define restore verification, schema-version handling and whether attachment/output files are included.

4. **[high] “Secrets are never stored” is unsupported by the payload model.**  
   **Reference:** Lines 12–18, 36, 38 and 45: messages, thinking, tool inputs/outputs, memory and append-only events.  
   **Why it matters:** These fields can receive credentials and private file content even when JunOS deliberately stores no login tokens. Spec 12 mentions redaction, but this document does not establish which write paths apply it. JSON exports and 14 retained backups multiply exposure.  
   **Fix:** Define shared redaction before persistence and event emission, payload size limits, retention and purge behavior for sensitive content, and export safeguards. Distinguish prohibited credential storage from user content that may contain sensitive information; document how deletion interacts with audit events and backups.

5. **[high] Relationships and JSON payloads lack enforceable contracts.**  
   **Quote:** Line 3: “JSON columns hold flexible payloads.” Lines 41–45 supply only four invariants.  
   **Why it matters:** Foreign keys, required fields, uniqueness and deletion rules are unspecified. For example, `attachment.file_id` has no declared target, and `scope_ref`/`source_ref_json` have no typed reference format. Implementations can produce dangling links and inconsistent UI behavior while still following this sketch.  
   **Fix:** Specify column types/nullability, foreign keys and delete policies, constrained enums, and versioned JSON schemas. Define tagged references such as `{type, id}` and validate their permitted targets. Enforce assistant-message/run linkage conditionally by message role.

6. **[med] Workflow history cannot identify or resume a particular execution reliably.**  
   **Reference:** Lines 16–23: `run`, `run_step`, `workflow`, `workflow_run`.  
   **Why it matters:** `run_step` lacks a workflow step key, status and attempt number; `run` lacks an explicit `workflow_run_id`. Editing `definition_json` also changes the only declared definition associated with past executions. Spec 05 promises retry from a failed step.  
   **Fix:** Link executions explicitly, snapshot or version the workflow definition, and record each step’s stable definition key, state, attempt and timestamps. Define which completed outputs are reused during retry.

7. **[med] Chat persistence omits choices and relationships required by the interaction design.**  
   **Reference:** Lines 11–14: `conversation(...)`, `message(...)`, `attachment(...)`.  
   **Why it matters:** Spec 04 promises remembered model/effort choices, conversation context, branching and retained partial output. The model has no explicit persisted selection, branch ancestry, message ordering contract, or partial/cancelled message state. ULID sorting alone does not define how retries and branches appear.  
   **Fix:** Persist conversation model/effort/context settings; define message parentage and stable thread order; record streaming/completion state. Specify whether attachments are immutable snapshots or live file references so later file edits do not silently alter replayed context.

8. **[med] Inbox state cannot support snoozing, deduplication or trustworthy attention counts.**  
   **Reference:** Lines 26 and 44: `status: new | seen | snoozed | done | dismissed`.  
   **Why it matters:** There is no `snoozed_until`, deduplication key or update timestamp. Spec 07 requires timed snoozing and updating matching items within 24 hours. It is also unclear whether an updated, previously seen item becomes unread. This undermines urgent-first hierarchy and sidebar counts.  
   **Fix:** Add snooze and deduplication fields, define priority values, and specify read/reopen behavior when content changes. Keep approval decision state separate from whether its notification was seen or dismissed.

9. **[med] File indexing has no persisted privacy boundary or cache identity.**  
   **Reference:** Lines 34–35: `project(...)`, `file_index(...)`.  
   **Why it matters:** Spec 11 requires explicitly added folders, per-folder AI-tagging consent, exclusions and summaries cached by content hash. None has a declared home here. A file’s `mtime` alone cannot establish that its summary matches its content or that remote processing was permitted.  
   **Fix:** Define indexed-root records with canonical paths, exclusions and processing consent. Add content hashes and summary/embedding provenance. Specify removal of derived data and search entries when consent is revoked or a root is removed.

10. **[med] Kanban’s single-source invariant is too restrictive for its promised workflow.**  
    **Quote:** Line 42: “A card may reference one inbox item, one finding, or one run”.  
    **Why it matters:** A Scout card can originate from both a finding and an Inbox item, then accumulate execution runs. Spec 09 also promises checklist items, comments, links and activity. Replacing one source reference loses provenance; squeezing all relationships into it contradicts the invariant.  
    **Fix:** Separate immutable origin from multiple linked artifacts and execution records. Define persisted checklist/comment data, stable column identifiers and reorder semantics; specify what source links display after their targets are deleted.

11. **[med] Connection data does not distinguish unavailable information from zero usage.**  
    **Reference:** Lines 7–9: `usage_json`, `efforts_json`, `model_order_json`.  
    **Why it matters:** Spec 03 requires honest usage meters, reset times, unsupported effort states and fallback explanations. Undefined JSON shapes permit missing usage to become “0% used” or unsupported effort to become a selectable default. The run record also lacks an explicit requested-versus-actual route history.  
    **Fix:** Define usage value, unit, window, source and observation time, with explicit unknown/unsupported states. Persist requested and actual model/provider plus fallback attempts and reasons. Use these same values in connection meters and message headers.

12. **[med] The model leaves dense activity views without a bounded presentation contract.**  
    **Reference:** Lines 18 and 38: `run_step(... input_json, output_json ...)`, `event(... payload_json ...)`.  
    **Why it matters:** These records drive the activity timeline and Home feed in specs 01 and 06. Unbounded payloads and unspecified event ordering encourage oversized rows, noisy updates and repeated fetching of raw logs. That weakens hierarchy and responsiveness, particularly in layered glass panels.  
    **Fix:** Define bounded summary projections separately from expandable payloads, paginated detail retrieval, payload truncation indicators and stable event cursors. Keep raw logs behind disclosure; let spec 14 govern typography, spacing, contrast and reduced-motion behavior.