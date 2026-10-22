# Scout agent (watches for upgrades to JunOS)

## Purpose
A scheduled agent that looks for improvements Jonas could make to JunOS and his AI setup, and turns them into reviewable suggestions, not changes.

## What it watches
| Source kind | Examples | Method |
|---|---|---|
| Release feeds | Claude Code, Codex CLI, Cursor, Hermes/Nous, Vite, React changelogs and GitHub releases | RSS/Atom, GitHub releases API |
| Dependencies | `npm outdated`, security advisories for JunOS packages | local command |
| Provider changes | new models, new effort levels, plan or limit changes, CLI flag changes that could break an adapter | release notes plus adapter probe |
| Ideas | similar open-source projects, relevant blog posts, MCP servers, agent patterns | web search by a configured query list |
| Self | JunOS error rates, slow runs, features never used, repeated manual actions | queries over `run` and `event` tables |

Sources live in `scout_source` and are editable on the Scout screen (name, kind, URL/query, cadence, enabled).

## Pipeline (a normal workflow, see 05)
1. **Collect**: fetch new items since last run.
2. **Filter**: cheap model drops irrelevant items.
3. **Assess**: stronger model scores each survivor on relevance (0-100), estimated effort (S/M/L), risk, and says what in JunOS it would touch.
4. **Dedupe** against past findings.
5. **Publish**: findings >= threshold (default 60) become `scout_finding` rows and Inbox `finding` items; a weekly digest summarises the rest.

## Screen (matches mockup)
Feed of findings sorted by relevance with source badge, one-line summary, effort chip. Detail: why it matters, links, suggested change, "Make card" (Kanban, label `scout`), "Ask Claude" (opens chat with the finding as context), Dismiss with reason (feeds the filter, see below).
Right rail: sources list with last-checked time and health, cadence settings, and run-now.

## Learning from feedback
Dismiss reasons (`not relevant`, `already know`, `too risky`, `later`) are stored and included in the filter prompt as few-shot examples, so noise falls over time.

## Guardrails
- **Read-only.** Scout never installs, edits code or opens PRs. Acting on a finding is a separate card, done by Jonas or by Hermes after he moves it to Ready.
- Budget: max N model runs per day and runs only when subscription meters are below threshold (03).
- Web content is untrusted: it is passed to models as data, never as instructions, and tool use is disabled during Assess.

## Acceptance criteria
- Run Scout manually against two feeds and get at least one scored finding in the Inbox.
- "Make card" creates a Kanban card linking back to the finding.
- A dismissed item of the same title does not return.

## Open questions
- Cadence: daily for releases, weekly for ideas?
- Should Scout be allowed to propose a draft PR in a branch? Defer until trust is built.

## Rev 2 additions
- Read-only must hold across the pipeline: collection uses fetch-only clients, Assess runs with tools disabled, and "Make card" / "Ask Claude" are separate user-triggered steps. Web content is stored as data and rendered through the safe pipeline in 12.
- The "Self" source reads only aggregate counters (error rates, durations), never message or file content, and is off until enabled.
- Editable sources are validated: only http(s) feeds and allowlisted local commands; no arbitrary shell as a source.
