# Kanban board (Jonas adds, Hermes fills)

## Purpose
A shared work board. Jonas drops ideas in quickly; Hermes (and Scout and workflows) add cards automatically; Hermes can also pick up and do cards.

## Columns (default, editable)
`Inbox/Ideas` -> `Ready` -> `In progress` -> `Review` -> `Done`; optional `Blocked`.
Semantics:
- **Ideas**: anything unrefined. Auto-added cards land here.
- **Ready**: scoped enough to start. Cards labelled `hermes` here are eligible for pickup.
- **Review**: finished work waiting for Jonas. Moving Hermes work here creates an Inbox `result`.
- WIP limit per column (optional) shown in the header.

## Card fields
title, body (markdown), creator (`jonas | hermes | scout | workflow:<id>`), assignee (`jonas | hermes | none`), project, priority (P0-P3), labels, due date, checklist, links (file, PR, conversation, finding, run), activity log.

## Who fills it, and how
1. **Jonas**: quick add (`c` anywhere, or `/card` in chat), paste text to create several cards, capture from chat message, file or Inbox item.
2. **Hermes**: after any directive it may split the work into cards; it logs follow-ups it noticed; it summarises finished work on the card. Hermes-created cards carry a `🤖` marker and `creator=hermes`.
3. **Scout**: "Make card" from a finding, label `scout`.
4. **Workflows**: `output: kanban` step, e.g. weekly review creates next week's cards.
5. **Triage pass** (workflow, daily): reads Ideas, suggests priority, labels, project, duplicates, and rewrites vague titles. Suggestions appear as an Inbox item, not silent edits.

## Hermes pickup rules
- Only cards in Ready with assignee `hermes` (or label `hermes`).
- One card In progress at a time by default (configurable).
- On start: card moves to In progress and gets a run link. On finish: moves to Review with a summary and artifacts. On failure or block: moves to Blocked with the reason and an Inbox failure.
- Autonomy level (06) still applies: pickup does not bypass approvals.
- Hermes never moves a card to Done; Jonas does.

## Screen (matches mockup)
Board with swimlane toggle (by project / assignee). Filters: mine, Hermes, project, label. Drag and drop. Card drawer on the right. Top bar shows "Hermes is working on: <card>". Add-card inline at the bottom of each column.

## API sketch
```
GET /boards/:id            POST /cards          PATCH /cards/:id {column, position, ...}
POST /cards/bulk           POST /cards/:id/comments
```
Every change emits `kanban.card.*` events (used by triggers in 05).

## Acceptance criteria
- Add a card in under 3 seconds by keyboard.
- A Hermes-created card appears live on the board with the marker.
- A Ready `hermes` card is picked up by a mock Hermes and ends in Review with a summary.

## Open questions
- Sync with GitHub Issues / Linear later? Start local-only.
- Multiple boards per project, or one board with a project filter? Proposed: one board, project field.
