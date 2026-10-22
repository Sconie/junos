1. **[high] Workflow versions and recovery state are disconnected.**  
   **Reference:** [Lines 18–23, 39](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:18): `workflow_run(...workflow_id...)`, `run_step(...seq, type...)`, and a separate `workflow_version`.  
   **Why it matters:** §05 promises immutable definitions for running workflows and recovery from the first incomplete step. Nothing binds an execution to its version, links its step runs together, or records step completion and attempts. Restarting could use an edited definition or repeat a completed side effect.  
   **Concrete fix:** Add `workflow_run.workflow_version_id`, link each step execution to its workflow run and stable definition step ID, and persist status, attempt, timing and execution outcome. Define how uncertain outcomes after a crash block automatic retries.

2. **[high] Privacy and execution permissions have no complete persistence contract.**  
   **Reference:** [Lines 34–43](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:34): `project(...)`, `file_index(...)`, `provider_allow(id, scope, scope_ref, providers_json)`.  
   **Why it matters:** §§11–12 require explicitly approved folders, opt-in AI processing, revocation, project autonomy and provider restrictions. A project path or indexed file does not establish consent. `provider_allow` also leaves valid scopes, uniqueness, defaults and missing-record behavior undefined. These omissions affect what the daemon may read, execute or send after restart.  
   **Concrete fix:** Define durable folder/project grants, processing consent and policy settings, either here or through an explicit external configuration contract. Specify provider scope enums, one policy per scope, default-to-selected-provider behavior and fail-closed handling of missing or invalid policies.

3. **[high] Deletion cannot reliably remove copied private content.**  
   **Reference:** [Lines 12–18, 53](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:53): content appears in messages, tool calls and run inputs/outputs; deletion only explicitly names “events … FTS, embeddings.”  
   **Why it matters:** §12 additionally requires deletion from run output. The model defines no ownership or provenance linking copied attachment content, workflow inputs or tool results back to their source. Deleting a conversation or revoking a folder could leave searchable or reusable copies behind.  
   **Concrete fix:** Specify ownership and deletion rules for each content-bearing field and external artifact. Track provenance for copied content, define cleanup of run inputs/outputs and caches, and preserve cards through nullable references. Reconcile “append-only” events with privacy deletion by defining permitted payload redaction or purging.

4. **[high] The event sequence declaration is invalid SQLite.**  
   **Reference:** [Line 45](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:45): `seq INTEGER UNIQUE AUTOINCREMENT`.  
   **Why it matters:** SQLite permits `AUTOINCREMENT` only on an `INTEGER PRIMARY KEY`. An in-memory SQLite check of this declaration returned `near "AUTOINCREMENT": syntax error`. This blocks the sequence underpinning SSE replay.  
   **Concrete fix:** Use `seq INTEGER PRIMARY KEY AUTOINCREMENT` and retain the ULID as `id TEXT NOT NULL UNIQUE`. Clarify that the sequence is an explicit exception to the general ULID rule.

5. **[high] Kanban has no storage for the promised atomic pickup.**  
   **Reference:** [Lines 28–29](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:28): `kanban_card` omits claim ownership and lease fields.  
   **Why it matters:** §09’s claim operation explicitly uses `claimed_by` and `claim_lease_expires`. Without them, overlapping pickup attempts and restart recovery cannot follow the specified contract; Hermes could execute the same card twice.  
   **Concrete fix:** Add the claim owner, lease expiry and active run reference. Define atomic eligibility checks for Ready plus Hermes assignee, lease renewal, release and recovery.

6. **[med] Scheduler configuration cannot represent the supported behavior.**  
   **Reference:** [Lines 20–23, 38](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:20): `task(...schedule_cron, timezone, target...)`.  
   **Why it matters:** §05 supports one-off schedules, tasks targeting workflows, overlap policies, retry limits/backoff and bounded catch-up. These have no defined fields or configuration structure. The uniqueness of a schedule slot does not enforce “skip if running” across different slots.  
   **Concrete fix:** Define a typed schedule and executor target, including workflow reference, plus overlap, retry and catch-up settings. Specify which settings are snapshotted for queued runs and how concurrent slots enforce the overlap policy.

7. **[med] Inbox state is too thin to support reliable triage and approval hierarchy.**  
   **Reference:** [Lines 26, 51](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:26): `inbox_item(...status, priority...)` with `snoozed`, but no wake time or explicit approval relationship.  
   **Why it matters:** §07 promises timed snoozing, 24-hour deduplication and resolved approval states across Inbox and Telegram. A snoozed item cannot know when to return; a generic item status cannot establish whether its action remains executable. Stale urgent items would undermine the queue’s visual hierarchy and trust.  
   **Concrete fix:** Add `snoozed_until`, a defined dedupe key and update timestamp. Define a typed approval relationship and derive action availability from the authoritative approval record, independently of Inbox read/dismissal state.

8. **[med] Conversation structure omits controls and provenance promised by Chat.**  
   **Reference:** [Lines 11–14](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:11): `conversation(...)` has no remembered model/effort or branch relationship; messages have no origin-channel or external identity fields.  
   **Why it matters:** §04 promises remembered selection and branching; §06 promises Telegram badges and mirrored history catching up after reconnect. These gaps can produce reset controls, lost branch context or duplicate mirrored messages. The assistant-run invariant also needs a rule for imported Hermes replies.  
   **Concrete fix:** Persist conversation preferences and branch ancestry; define message ordering, channel provenance and unique external message IDs. Specify whether imported assistant replies create local run records.

9. **[med] Integrity rules are mostly prose without enforcement semantics.**  
   **Reference:** [Core tables and Invariants](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:5): relationships, nullability and most enum constraints are unspecified.  
   **Why it matters:** The explicit scheduler uniqueness constraint contrasts with undefined constraints elsewhere. Duplicate policy rows, repeated workflow version numbers, orphan messages or nonexistent board-column keys would make routing and UI state ambiguous. “JSON columns hold flexible payloads” gives no validation boundary.  
   **Concrete fix:** Add a compact constraint matrix covering keys, required fields, foreign keys and delete behavior, enum checks, uniqueness and versioned JSON schemas. State that foreign-key enforcement is enabled on every SQLite connection.

10. **[med] Editable Hermes memory cannot represent proposed changes safely.**  
    **Reference:** [Line 36](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:36): `memory_item(id, owner, key, value_md, pinned, updated_at)`.  
    **Why it matters:** §06 promises proposed memory diffs before acceptance. One value and a pin flag cannot distinguish an accepted fact from a pending proposal, or detect an intervening remote edit. The Memory UI could display unaccepted content as established memory or overwrite a newer value.  
    **Concrete fix:** Define accepted and proposed revisions, their author/source and remote revision identifier. Make acceptance a version-checked operation, and specify uniqueness of `(owner, key)`.

11. **[med] Backups and exports lack a privacy and recovery contract.**  
    **Reference:** [Line 57](/E:/AI/review-loop/specs-wt/docs/specs/02-data-model.md:57): backups to `~/.junos/backups/`; “Export to JSON per table on demand.”  
    **Why it matters:** These artifacts contain conversations, file summaries and action details even when credentials are excluded. Access restrictions are unspecified. SQLite integrity checks also cannot establish that referenced run-output artifacts or embeddings are recoverable, and independently exported tables may describe different moments.  
    **Concrete fix:** Require user-restricted filesystem permissions, define a consistent export snapshot, and document which referenced artifacts are included or rebuilt. Add schema-version metadata and a restore check; explain the 14-day survival of deleted content in backups.