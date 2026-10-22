# JunOS

A personal AI command center. Early scaffold: every section is an empty shell.

## Sections

- **Overview**: landing page linking to everything else
- **Chat**: provider, model and effort picker (not wired to any model yet)
- **Scheduled**: crons and recurring tasks
- **Hermes**: its own tabbed interface for the Hermes agent
- **Files & projects**: overview of what you are working on
- **Connections**: future home for linking Claude, Codex, Cursor, Grok and Nous Portal subscriptions instead of API keys

## Run it

```sh
npm install
npm run dev
```

Stack: Vite, React, TypeScript, React Router.

Requires Node.js 20.19+ or 22.12+. Run `npm run lint`, `npm run typecheck`, and `npm run test`.
