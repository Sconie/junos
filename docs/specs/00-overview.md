# JunOS: overview and index

Status: draft v0.1 (2026-10-21). Nothing here is final; every doc ends with open questions.

## What JunOS is
A personal AI command center for one user (Jonas). One place to chat with any model he already pays for, run scheduled and on-demand workflows, supervise the Hermes agent, see what needs his attention, track work on a board, and browse files and projects.

## Principles
1. **Subscriptions, not API keys.** Chat and agents run through the CLIs and sessions Jonas already pays for (Claude, Codex, Cursor, Grok/X, Nous Portal). See [03-connections-and-routing](03-connections-and-routing.md).
2. **Local first.** Data and credentials live on Jonas's machine. The web UI is a client of a local daemon.
3. **One event stream.** Every run, message, task and finding becomes an event. Inbox, Home and Kanban are views over it.
4. **Human stays in charge.** Agents propose, Jonas approves anything destructive or outward-facing.
5. **Boring and changeable.** Small pieces, plain SQLite, plain markdown, easy to swap.

## Screens (match the Stitch "Translucent Glass" mockups in /design)
| Screen | Spec |
|---|---|
| Home | [10-home-and-search](10-home-and-search.md) |
| Chat (model + effort picker) | [04-chat](04-chat.md) |
| Agent chats | [07-inbox-and-agent-chats](07-inbox-and-agent-chats.md) |
| Inbox | [07-inbox-and-agent-chats](07-inbox-and-agent-chats.md) |
| Tasks / crons | [05-tasks-and-workflows](05-tasks-and-workflows.md) |
| Workflows launcher | [05-tasks-and-workflows](05-tasks-and-workflows.md) |
| Hermes console | [06-hermes](06-hermes.md) |
| Scout | [08-scout](08-scout.md) |
| Kanban | [09-kanban](09-kanban.md) |
| Files and projects | [11-files-and-projects](11-files-and-projects.md) |
| Connections | [03-connections-and-routing](03-connections-and-routing.md) |

## Cross-cutting docs
- [01-architecture](01-architecture.md): processes, adapters, event bus, tech choices
- [02-data-model](02-data-model.md): SQLite schema and entities
- [12-security-and-privacy](12-security-and-privacy.md): threat model, approvals, secrets
- [13-roadmap](13-roadmap.md): phases, milestones, definition of done
- [14-ui-system](14-ui-system.md): design tokens, layout, components, states

## Non-goals (for now)
Multi-user, mobile app (responsive web only), public hosting, billing, a plugin marketplace.
