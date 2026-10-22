# Files and projects

## Purpose
An overview of Jonas's files and projects, and a fast way to hand any of them to a model or Hermes.

## Sources
- **Local folders** that Jonas explicitly adds (allowlist; nothing else is ever indexed).
- **Git repos** (auto-detected as projects: name, branch, last commit, dirty state, open PRs via `gh`).
- **Cloud** (v2): Google Drive, GitHub repos not cloned locally.

## Project entity
`project(name, path, repo_url, tags, last_activity_at)` plus derived: language mix, 14-day activity sparkline, linked Kanban cards, conversations, tasks.
Actions: Open in Chat (sets `cwd` and context), Give to Hermes, Open in editor, Show board.

## File browser
Tree navigator (Projects / Local folders / Cloud), list and grid views, columns: name, project, size, modified, AI tags. Preview pane renders markdown, images, PDFs, code; "Ask about this file" input at the bottom uses the chat model with the file attached.

## Indexing
- Watcher (chokidar) on allowlisted folders; ignore `node_modules`, `.git`, build output, files over a size cap, anything in `.junosignore`.
- Stage 1 (always, cheap): path, mime, size, mtime, FTS5 text for text files.
- Stage 2 (optional, background, budget-limited): AI summary and tags per file via a cheap model; embeddings for semantic search (local embedding model preferred so content stays on the machine).
- Natural-language search: "PDFs from last week about the API" -> structured filter (type, date) plus text/semantic query.
- Re-index only on mtime change; summaries cached by content hash.

## Privacy
Content is only sent to a model when Jonas attaches it or a workflow he enabled reads it. AI tagging is opt-in per folder. Secrets patterns (`.env`, key files) are excluded by default.

## Acceptance criteria
- Add a folder, see projects detected, search finds a file by content within a second.
- "Open in Chat" from a project makes a CLI-backed model run with that directory as cwd.
- Excluded paths never appear in the index.

## Open questions
- Read-only first? Proposed: yes; edits only through Hermes or a CLI model under the approval policy.

## Rev 2 additions
- **Revocation**: removing a folder deletes its index rows, FTS entries, summaries, embeddings and caches, and cancels queued jobs; the UI confirms what was removed.
- Search respects exclusions (`.junosignore`, secret patterns) at query time as well as index time, and shows when AI processing is on for a folder (badge on the folder row).
- File previews render in a sandboxed iframe (12). Attaching a project to chat sends a manifest plus on-demand reads, not the tree.
