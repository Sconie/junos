## Findings (ranked)

1. **[high] Approvals are triage rows, not authorization records**  
   **Reference:** `inbox_item(... kind, ... status, priority, ... resolved_at)` + Invariants (`inbox_item.status`: `new | seen | snoozed | done | dismissed`)  
   **Why it matters:** Specs 07 and 12 require Approve / Deny / Approve-and-remember, timeout auto-deny, and an exact command/diff. `done` cannot mean approved vs denied vs timed out; there is no table for remembered rules (project + action pattern) that Settings must list and revoke. That breaks the human-in-charge loop and invites a generic Inbox of chips instead of a decision surface.  
   **Concrete fix:** Add `approval(id, run_id, step_id, action_class, payload_hash_or_snapshot, project_id, expires_at, decision, decided_at, inbox_item_id)` and `approval_rule(id, project_id, action_pattern, created_from_approval_id, revoked_at)`. Keep `inbox_item` as the notification projection; never encode the decision only in inbox status.

2. **[high] “Secrets never in this DB” is unenforceable against the columns listed**  
   **Reference:** Invariants — “Secrets are never stored in this DB; see 12.” vs `message.content_md` / `thinking_md` / `tool_calls_json`, `run.input_json` / `error`, `run_step.input_json` / `output_json`, `memory_item.value_md`, `event.payload_json`, Backups “Export to JSON per table”  
   **Why it matters:** Spec 12 only keeps *provider* credentials out of SQLite. Pasted keys, CLI output, URLs, and tool traces will land in these fields, then in nightly copies and JSON exports. Claiming “never stored” trains implementers to skip redaction and retention.  
   **Concrete fix:** Replace the invariant with: “No credential *store*; payloads are redacted before write.” Name redact-on-write points, max capture sizes, retention (messages / thinking / events), and that backups/exports inherit the same redaction. Encrypt-at-rest or exclude sensitive tables from on-demand JSON export.

3. **[high] Nightly file copy is unsafe under the WAL architecture in 01**  
   **Quote:** “Nightly copy of `junos.db` to `~/.junos/backups/` (keep 14).”  
   **Why it matters:** Spec 01 chooses SQLite WAL. Copying only the main file while `junosd` runs can miss committed pages still in the WAL and yield unrestorable backups—undermining the data-safety story in 12.  
   **Concrete fix:** Require `sqlite3_backup` / `.backup`, or stop-the-world checkpoint then copy; document restore test, checksum, and that `-wal`/`-shm` are not the backup unit.

4. **[high] Workflow execution cannot be reconstructed or safely retried**  
   **Reference:** `run(...)`, `run_step(...)`, `workflow_run(...)` with no join; `run.source` opaque  
   **Why it matters:** Spec 05 promises `queued → … → waiting_approval`, step I/O on `run_step`, and retry from a failed step; 01 requires resumable runs after restart. Without `workflow_run_id`, definition-step id, attempt, and a frozen definition snapshot, you cannot resume, audit, or show an honest timeline (Operate UI collapses to a generic step list).  
   **Concrete fix:** `workflow_run.definition_snapshot_json`; `run.workflow_run_id`; `run_step(definition_step_id, attempt, status, started_at, finished_at)`; typed `source` (`chat|task|workflow|…` + FK). State side-effect replay rules for `shell` / `output`.

5. **[high] Scheduler fields cannot guarantee “no duplicate or lost runs”**  
   **Reference:** `task(... schedule_cron, timezone, ... catch_up, enabled, next_run_at)`  
   **Why it matters:** Spec 05 also requires one-off “at”, overlap (`skip if running` | `queue`), retries with backoff, and catch-up after sleep/crash. A single `next_run_at` and boolean-looking `catch_up` cannot claim an occurrence across daemon restart—acceptance in 05 and Phase 2 “Done when” fail.  
   **Concrete fix:** Enum `catch_up` (`skip|once|all`); add `overlap`, `retry_max`, `retry_backoff_json`, `schedule_kind` + `run_at`; add `task_occurrence(task_id, scheduled_for, claimed_at, run_id)` with unique `(task_id, scheduled_for)`.

6. **[high] Schema ships Phase 0–4 product surface with no migration cut**  
   **Reference:** Core tables block (~20 entities including Scout, Kanban, embeddings, Hermes memory, workflows) vs roadmap Phase 1 (chat + connections + events)  
   **Why it matters:** Unrealistic for a single first migration; encourages mock Home/Inbox/Kanban shells (already visible in `src/pages/Overview.tsx` card grid) and forever-stub UIs. design-taste / impeccable Operate mode: thin first screens with equal nav destinations read as template dashboards.  
   **Concrete fix:** Split DDL by phase (P1: `connection`, `model`, `routing_rule`, `conversation`, `message`, `attachment`, `run`, `run_step`, `event`; later tables gated). Mark deferred columns explicitly in this doc.

7. **[med] `event` vs `events` + no projection contract**  
   **Reference:** `event(...)` here vs “Append-only `events` table” in 01; overview “One event stream… Inbox, Home and Kanban are views over it”  
   **Why it matters:** Dual naming forks code. Materialized `inbox_item` / `kanban_card` without “mutation + event in one transaction” causes missed badges, double workflow triggers, or Home that lies.  
   **Concrete fix:** Pick one table name; require typed `ref_type` + `ref_id`; transactional outbox; document which tables are projections and how they rebuild from events.

8. **[med] Two incompatible `priority` systems left undefined**  
   **Reference:** bare `priority` on `inbox_item` and `kanban_card`  
   **Why it matters:** Spec 07 uses `urgent|normal|low`; spec 09 uses `P0–P3`. One column name → Chip soup, wrong sort for “Needs you”, and colour-only status (banned by 14 and app-screen rules: colour on meaning, not chrome).  
   **Concrete fix:** Document distinct enums (`inbox_priority`, `card_priority`) or one shared ordered enum with mapping tables; forbid free integers/strings.

9. **[med] Inbox cannot implement snooze, dedupe, or honest unread hierarchy**  
   **Reference:** status enum includes `snoozed`; no `snoozed_until`, dedupe key, or `updated_at`  
   **Why it matters:** Spec 07: snooze until / next morning, dedupe by source+key in 24h, auto-expire low items, unread badge. Without wake time and keys, filters and sidebar counts are wrong—Operate hierarchy fails (urgent approvals vs digests).  
   **Concrete fix:** Add `snoozed_until`, `dedupe_key`, `updated_at`, `expires_at`; separate read state from decision state for approvals.

10. **[med] Kanban columns are display strings; board features from 09 are missing**  
    **Reference:** `kanban_card.column`, `kanban_board.columns_json`; card fields omit checklist / links / comments  
    **Why it matters:** Hermes pickup depends on semantic Ready / In progress / Review / Done (09). Renaming breaks automation or strands cards. Missing checklist/links/comments forces either silent scope cut or ad-hoc JSON—UI becomes title+labels pills (generic AI kanban).  
    **Concrete fix:** `kanban_column(id, board_id, label, position, role: ideas|ready|doing|review|done|blocked|custom)`; cards FK to `column_id`. Add `checklist_json` / `links_json` or child tables, or explicitly defer with “v2” in this doc.

11. **[med] Scout learning and honesty fields are absent**  
    **Reference:** `scout_finding(... relevance, effort_est, status, ...)`  
    **Why it matters:** Spec 08 needs dismiss reasons as few-shots, source health/last-checked, risk, suggested change, stable identity for dedupe. A naked `relevance` score becomes a vanity KPI card (app-screens: no unexplained meters). Recurring dismissed items erode trust.  
    **Concrete fix:** `dismiss_reason`, `rationale_md`, `risk`, `suggested_change_md`, `canonical_key`; `scout_source(last_checked_at, cursor_json, health, last_error)`. Treat missing scores as unknown in UI, not `0`.

12. **[med] Chat continuity promised in 04 is not modeled**  
    **Reference:** `conversation(...)`, `message(...)`  
    **Why it matters:** Spec 04: remember model/effort per conversation, branch from message, keep partial output on cancel, show fallback route in header. Without `parent_message_id`, conversation defaults, completion state, and requested vs actual model, the thread UI invents state or looks broken.  
    **Concrete fix:** `conversation.default_model`, `default_effort`, `project_id` (already partly there); `message.parent_id`, `status(streaming|complete|cancelled|error)`, `requested_model`, `actual_model`, `fallback_from`.

13. **[med] File privacy / allowlist / FTS / embeddings underspecified**  
    **Reference:** `project(path, ...)`, `file_index(... embedding_ref)`; no FTS tables; no indexed-root entity  
    **Why it matters:** Specs 10–11 require allowlisted roots, opt-in AI tags, content-hash cache, FTS5, local-preferred embeddings. Indexing a bare `path` with remote `embedding_ref` is a privacy footgun; search UIs will fake results.  
    **Concrete fix:** `indexed_root(id, path, ai_tagging_opt_in, exclude_globs_json)`; `content_hash`, `indexed_at` on files; declare FTS5 virtual tables; constrain `embedding_ref` to local store or null until Phase 4.

14. **[med] Cost-guard and usage budget have nowhere to live**  
    **Reference:** `connection.usage_json`; `routing_rule(... model_order_json)`; workflow only `definition_json`  
    **Why it matters:** Spec 03: threshold (default 80%), `maxRunsPerDay`, `preferCheapModel`, local run counts when providers hide meters. Without structured counters, Home/Connections usage bars become decorative gradients (design-taste/app tell).  
    **Concrete fix:** Persist provider usage snapshot fields + `local_run_counts_json`; settings/budget row; workflow/task cost-guard fields outside opaque JSON or version the JSON schema.

15. **[med] Hermes autonomy and memory hygiene are missing from `project` / `memory_item`**  
    **Reference:** `project(...)`; `memory_item(owner, key, value_md, pinned, ...)`  
    **Why it matters:** Spec 06: autonomy per project; memory writes proposed as diffs until pinned. Schema only has flat editable memory → UI becomes generic chip editor, not a review queue.  
    **Concrete fix:** `project.autonomy_level`; `memory_item.status(proposed|pinned|rejected)`, `proposed_value_md`, `source_run_id`.

16. **[med] Freeform `*_json` label/tag bags push Chip / pill-cluster UI**  
    **Reference:** `labels_json`, `tags_json`, `ai_tags_json`, `efforts_json`, `columns_json`, …  
    **Why it matters:** design-taste house rules ban pill clusters and tiny tracked labels; impeccable Operate wants trade words and one clear next action. Unvalidated JSON arrays make every screen a Badge row and break filters/⌘K facets.  
    **Concrete fix:** Normalize labels (or cap + Zod schemas in `packages/shared`); document allowed keys; prefer enums for status/effort/column roles so the UI can use type/weight instead of chips.

17. **[med] No retention policy on append-only `event` + heavy run payloads**  
    **Reference:** `event` “append-only”; rich `run` / `run_step` JSON; Inbox auto-expire only in 07, not here  
    **Why it matters:** Local-first still fills disk; exports grow; Scout “self” queries over `run`/`event` get slower. Privacy risk compounds with (2).  
    **Concrete fix:** Document retention/compaction (e.g. events >90d summarized; step outputs truncated; soft-delete conversations). Align Inbox 14-day expiry with a real `expires_at` job.

18. **[low] Attachment identity is ambiguous (`file_id` + `path`)**  
    **Reference:** `attachment(id, message_id, file_id, path, mime)`  
    **Why it matters:** Unclear whether chat pinned a snapshot or a live path; after edits/moves, “Ask about this file” and audit disagree.  
    **Concrete fix:** Prefer `file_index_id` + `content_hash` at attach time; store path as display only.

19. **[low] Naming / enum drift invites forked UI copy**  
    **Reference:** `run.kind: chat | task | workflow_step | scout | hermes` vs `agent.kind`; `connection.status` vs 03’s `connected|needs_login|…`  
    **Why it matters:** Status pills and filters diverge across Connections / Hermes / Runs; generic “status” dots without shared vocabulary (14: no info by colour alone).  
    **Concrete fix:** Single shared enums in this doc (or point to `packages/shared`); map adapter statuses 1:1.

20. **[low] Schema silence on Home’s primary job encourages eight equal cards**  
    **Reference:** Doc lists peer entities with no “attention” projection; paired with 10’s eight Home cards  
    **Why it matters:** App-screen / design-taste: first screen answers one question with one next action; equal entity cards → template command-center (matches current Overview shell). Data model should define the query behind “Needs you” (approvals first), not only raw tables.  
    **Concrete fix:** Add a short “Read models” section: e.g. `needs_you` = open approvals ∪ urgent inbox, ordered; Home must not require eight symmetric aggregates on day one.

21. **[low] Creator markers and score fields invite emoji / vanity chrome**  
    **Reference:** Cross-check 09 (`🤖` for Hermes) enabled by string `creator`; Scout `relevance`  
    **Why it matters:** design-taste bans emoji ornament and unexplained scores; 14 already risks glass/violet chrome—data shouldn’t force more costume.  
    **Concrete fix:** Stable `creator` enum + text/icon from UI system (not emoji in stored data); show Scout relevance only with rationale text; never as a lone percentage tile.
