# JunOS: overview and index

Status: draft v0.1 (2026-10-21). Nothing here is final; every doc ends with open questions.

## What JunOS is
A personal AI command center for one user (Jonas). One place to chat with any model he already pays for, run scheduled and on-demand workflows, supervise the Hermes agent, see what needs his attention, track work on a board, and browse files and projects.

## Principles
1. **Subscriptions, not API keys.** (A release gate per adapter; see the scope note in 03.) Chat and agents run through the CLIs and sessions Jonas already pays for (Claude, Codex, Cursor, Grok/X, Nous Portal). See [03-connections-and-routing](03-connections-and-routing.md).
2. **Local first.** JunOS stores its records on Jonas's machine and provider logins stay in the official clients. Context you send to a model still goes to that provider; see "Privacy and data egress" in 12.
3. **One event stream.** Every run, message, task and finding becomes an event. Inbox, Home and Kanban are views over it.
4. **Human stays in charge.** External-send, destructive and spend actions need an exact, single-use approval enforced by JunOS's own execution gateway (12). This overrides autonomy settings, remembered rules and provider defaults.
5. **Boring and changeable.** Small pieces, plain SQLite, plain markdown, easy to swap.

## Delivery tiers
- **Current scaffold**: mock UI only, no daemon.
- **First release (Phases 0-2)**: safe core, subscription chat (Claude and Codex), Connections, Tasks and Inbox.
- **Later vision (Phases 3-5)**: Hermes, Kanban, Scout, files, search.
Each screen below lists its phase in 13-roadmap.

## Design status
Translucent Glass is the settled direction (frosted panels, atmospheric dark background). The accent is soft green (decided 2026-10-22): see 14. `14-ui-system.md` is the implementation authority; the Stitch exports in /design are reference images, and `design/stitch-prompts.md` is historical input.

## Navigation model
Primary: Home, Chat, Inbox, Tasks, Kanban, Hermes. Secondary: Workflows, Scout, Files and projects, Connections, Settings. Agent chats are a filter of Chat, not a separate destination, until there is more than one agent. Home is a summary, Inbox the decision queue, Hermes the supervision surface.

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
| Terminal | [15-terminal](15-terminal.md) |
| Connections | [03-connections-and-routing](03-connections-and-routing.md) |

## Cross-cutting docs
- [01-architecture](01-architecture.md): processes, adapters, event bus, tech choices
- [02-data-model](02-data-model.md): SQLite schema and entities
- [12-security-and-privacy](12-security-and-privacy.md): threat model, approvals, secrets
- Settings (providers, allowed providers, approval rules, backups, retention): specified across 03, 11 and 12
- [13-roadmap](13-roadmap.md): phases, milestones, definition of done
- [14-ui-system](14-ui-system.md): design tokens, layout, components, states

## Non-goals (for now)
Multi-user, mobile app (responsive web only), public hosting, billing, a plugin marketplace.
