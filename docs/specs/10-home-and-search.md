# Home and global search

## Home
A glance page, not a place to work. Greeting and date, then cards (from the mockup):
1. **Quick ask**: input plus model chip, sends into Chat.
2. **Needs you**: top 5 Inbox items (approvals first) with inline Approve/Deny.
3. **Upcoming runs**: next 5 tasks with cron, next time, status dot.
4. **Hermes**: state, current card or task, last 3 actions, Open button.
5. **Board snapshot**: counts per column, Hermes's current card, blocked cards.
6. **Subscriptions**: per provider state and usage bar.
7. **Scout**: latest 3 findings.
8. **Recent projects and files**.

Rules: each card loads independently (skeleton, then data, then error state with retry); data comes from one `GET /home` aggregate or per-card queries plus the event stream; no card may block the others.

## Command palette (⌘K)
- Jump to any screen, conversation, project, file, card, task.
- Actions: New chat, New card, New task, Run workflow, Ask Hermes, Switch model.
- Natural-language mode: typing a sentence offers "Ask <current model>" as the last row.
- Results grouped by type with recent first; fuzzy match; executes on Enter.

## Global search
Full-text (SQLite FTS5) across messages, cards, findings, inbox items, file names and file summaries. Semantic search over files comes with the file index (11). Filters: type, project, date.

## Acceptance criteria
- Home renders in under 1 second from local data; a failing card does not break the page.
- ⌘K opens in under 100 ms and can create a card without leaving the page.

## Rev 2 additions
- `GET /home` returns per-card payloads with `status: ok | error | stale` and `as_of`, so independent loading has a defined contract; cards also update from the SSE stream.
- ⌘K navigation never sends text to a model on its own; "Ask <model>" is an explicit row, and the provider disclosure from 04 applies.
- Home is a summary; the Inbox is the authority for decisions.
