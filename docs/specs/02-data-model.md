# Data model (SQLite)

IDs are ULIDs (sortable). Timestamps are ISO 8601 UTC. JSON columns hold flexible payloads.

## Core tables
```
connection(id, provider, plan, method, status, last_checked_at, usage_json, error)
model(id, provider, name, efforts_json, enabled)
routing_rule(id, scope, scope_ref, model_order_json)        -- scope: default | task | workflow | agent

conversation(id, title, kind, agent_id, project_id, created_at, pinned)   -- kind: chat | agent
message(id, conversation_id, role, model, effort, provider, content_md,
        thinking_md, tool_calls_json, run_id, created_at)
attachment(id, message_id, file_id, path, mime)

run(id, kind, source, model, effort, status, started_at, finished_at,
    input_json, output_ref, tokens_json, error)             -- kind: chat | task | workflow_step | scout | hermes
run_step(id, run_id, seq, type, summary, input_json, output_json, duration_ms)

task(id, name, prompt, schedule_cron, timezone, target, model, effort,
     output_dest_json, catch_up, enabled, next_run_at)
workflow(id, name, description, definition_json, trigger_kinds_json, enabled)
workflow_run(id, workflow_id, status, params_json, started_at, finished_at)

agent(id, name, kind, status, config_json)                  -- hermes, scout, custom
inbox_item(id, kind, title, body_md, source_ref_json, status, priority, created_at, resolved_at)
                                                              -- kind: approval | finding | result | failure | mention | digest
kanban_card(id, board_id, column, title, body_md, creator, assignee, project_id,
            priority, labels_json, due_at, position, created_at, updated_at, source_ref_json)
kanban_board(id, name, columns_json)
scout_source(id, name, kind, url_or_query, cadence_cron, enabled)
scout_finding(id, source_id, title, summary, url, relevance, effort_est, status, card_id, created_at)

project(id, name, path, repo_url, tags_json, last_activity_at)
file_index(id, path, project_id, mime, size, mtime, ai_tags_json, summary, embedding_ref)
memory_item(id, owner, key, value_md, pinned, updated_at)   -- Hermes memory, editable

event(id, type, ref_id, payload_json, created_at)           -- append-only
```

## Invariants
- A card may reference one inbox item, one finding, or one run via `source_ref_json`; deleting a source never deletes the card.
- `message.run_id` links every assistant message to the run that produced it (audit trail).
- `inbox_item.status`: `new | seen | snoozed | done | dismissed`.
- Secrets are never stored in this DB; see 12.

## Backups
Nightly copy of `junos.db` to `~/.junos/backups/` (keep 14). Export to JSON per table on demand.
