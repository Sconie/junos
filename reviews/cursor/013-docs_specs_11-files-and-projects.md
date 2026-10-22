## Findings (ranked)

1. **high — Privacy claim vs Stage 2 indexing**  
   *Quote:* “Content is only sent to a model when Jonas attaches it or a workflow he enabled reads it” vs “Stage 2 … AI summary and tags per file via a cheap model”.  
   *Why:* Background tagging *is* sending file contents to a model without an attach/workflow act. That contradicts the privacy sentence and principle 2 (“Local first”) if the “cheap model” is a cloud subscription adapter.  
   *Fix:* Rewrite Privacy to: Stage 2 may send content only when (a) folder opt-in is on, (b) the chosen summarizer is named (local-only vs subscription), (c) secrets/excludes still apply. Or drop cloud Stage 2 from v1 and keep summaries local-only.

2. **high — Secrets exclusion is pattern-thin; Stage 1 still stores content**  
   *Quote:* “Secrets patterns (`.env`, key files) are excluded by default”; Stage 1: “FTS5 text for text files”; acceptance: “Excluded paths never appear in the index.”  
   *Why:* Tokens in `config.json`, `.pem` variants, `credentials.yml`, shell history, or pasted secrets in markdown still get FTS-indexed into `file_index` / SQLite and nightly backups (`02`, `12`). “Excluded” is undefined (path ignore vs no-FTS vs no-preview vs no-AI).  
   *Fix:* Define tiers: never index / index metadata only / index text / Stage 2 eligible. Expand default deny list; optional content-scan for high-entropy strings before FTS; document that backups contain indexed text.

3. **high — “Ask about this file” / “Give to Hermes” skip prompt-injection rules**  
   *Quote:* Preview “Ask about this file” attaches the file; Actions: “Give to Hermes”; `06` attaches context; `12` treats file content as untrusted.  
   *Why:* Spec never says these paths wrap content as data, strip tools, or require approval when tools follow untrusted file text—the exact risk `12` ranks #1.  
   *Fix:* Cross-link `12`: preview-ask = chat with file as untrusted attachment; Hermes handoff = directive + path refs, not raw dump with tools enabled; tool calls after file context need the same approval classes.

4. **high — First-screen composition is a stock “AI dashboard + Finder” mashup**  
   *Refs:* Project entity “14-day activity sparkline”; File browser tree + list/grid + AI tags + preview + ask box; Stitch prompt mirrors project-card row with sparklines.  
   *Why (taste / impeccable Operate):* App-screen house rules ban sparklines on card strips and treat icon/tag card rows as generated tells. This screen has no single job stated: browse, search, hand off, or project health. Hierarchy is a card strip over a three-pane browser with a second chat composer—competing primary actions (“Open in Chat”, “Give to Hermes”, “Ask about this file”).  
   *Fix:* Pick one primary job for v1 (e.g. find file → open/hand off). Drop sparkline and language-mix chips from the default row (put activity on a project detail view). Default to list + preview only; grid and AI-tag column behind opt-in. One CTA per selection, not three peers.

5. **high — Acceptance “search finds a file by content within a second” is unrealistic**  
   *Quote:* “Add a folder, see projects detected, search finds a file by content within a second.”  
   *Why:* First index of a multi-GB allowlisted tree (Stage 1 extract + FTS) will not meet 1s end-to-end; Stage 2/embeddings make it worse. Sets a false done-when for Phase 4 (`13`).  
   *Fix:* Split criteria: metadata browse immediate; FTS for files already Stage-1’d <1s; initial index shows progress + “searchable when ready”; no Stage 2 in the acceptance.

6. **med — Cloud in the navigator while marked v2**  
   *Quote:* Sources: “Cloud (v2): Google Drive…”; File browser: “Projects / Local folders / Cloud”.  
   *Why:* UI ships a dead third root and invites OAuth/sync scope into Phase 4 awareness work (`13` lists indexing, not Drive). Same in Stitch prompt.  
   *Fix:* Spec and mock: only Projects + Local folders in v1; Cloud as Settings “Coming later” or omit the section entirely.

7. **med — Stage 2 “cheap model” vs subscriptions-only**  
   *Quote:* “via a cheap model”; `00` / `03`: no API-key billing, use subscription CLIs.  
   *Why:* Background tagging of many files will burn shared subscription budget (`03` usage budget) or imply a separate API key the product forbids. “Preferred” local embeddings leave cloud embedding as an unstated fallback that ships content off-machine.  
   *Fix:* Lock Stage 2 to local embedder + local/tiny summarizer only for v1; if subscription model, require explicit per-folder budget and pause when meter > threshold.

8. **med — Indexing rules contradict themselves (mtime vs content hash)**  
   *Quote:* “Re-index only on mtime change; summaries cached by content hash.”  
   *Why:* Same-mtime rewrite / copy tools / git checkout quirks skip re-index; hash cache without when-to-hash is unclear (always hash? only Stage 2?).  
   *Fix:* Watcher: mtime **or** size change → Stage 1; Stage 2 key = content hash; document hash sampling for large binaries (skip).

9. **med — Derived project UI has no data model / events**  
   *Quote:* `project(…)` plus “language mix, 14-day activity sparkline, linked Kanban cards, conversations, tasks”; `02` only has `project` + `file_index`.  
   *Why:* Sparkline and language mix need stored series or live git stats; “open PRs via `gh`” needs network, auth, rate limits, and failure UI—none specified. Linked boards/tasks imply joins not named.  
   *Fix:* Either add schema/API (`project_stats`, refresh cadence, `gh` offline behavior) or cut derived chrome from v1 to name/path/branch/dirty only.

10. **med — Nav IA contradicts other docs**  
    *Refs:* This doc = one “Files and projects” screen; `14` rail = single “Files”; Stitch = separate “Files” and “Projects”.  
    *Why:* Implementers will build two routes or one and mismatch shell/mockups.  
    *Fix:* One rail item “Files”; projects are a root in the tree (as this spec). Update Stitch/`14` to match; drop a second Projects icon.

11. **med — “Open in editor” is undefined and straddles the UI/daemon boundary**  
    *Quote:* Actions: “Open in editor”; `01`: “The UI cannot touch … the filesystem; the daemon can.”  
    *Why:* Which editor, which path encoding, Windows vs WSL, failure if unset—unspecified. Easy to implement as a silent no-op.  
    *Fix:* Daemon `POST /projects/:id/open-editor` using `$VISUAL` / Settings default (Cursor/VS Code/…) or remove until Settings exists.

12. **med — Read-only open question vs write policy elsewhere**  
    *Quote:* “Read-only first? Proposed: yes…” vs `12` `write-local` auto in Balanced; `05` “Summarise file or folder”; Hermes writes in allowlisted folders.  
    *Why:* Unresolved, so Files UI may promise edit affordances or block workflows that `12`/`06` allow.  
    *Fix:* Close the question: Files UI is browse/preview/hand-off only; all writes go through Chat/Hermes/workflows under `12`. Say so in Acceptance.

13. **med — Preview surface is a security/UX blank**  
    *Quote:* “Preview pane renders markdown, images, PDFs, code”.  
    *Why:* Markdown/HTML in preview is a classic XSS vector in localhost apps; large PDFs/images need size caps; no loading/error/unsupported states though `14` requires them every screen.  
    *Fix:* Sandboxed markdown (no raw HTML), size/mime gates, explicit unsupported empty state, virus/secret warnings for binary download/open.

14. **med — No indexing / empty / permission UX**  
    *Why:* Purpose is “overview + hand to model”, but no first-run “Add folder”, indexing progress, allowlist management, or “AI tagging off → empty AI tags column”. Taste: empty sections must keep frame and name the next action; a permanent empty AI column is chrome without meaning.  
    *Fix:* Spec states: empty, indexing %, paused (budget), error, tagging opt-in badge; hide AI Tags column unless folder opted in.

15. **med — Three-pane + project strip ignores responsive rules**  
    *Refs:* Tree | list/grid | preview; `14`: below 900px rail → bottom tabs (Files only under “More”).  
    *Why:* Unusable stack on phone/tablet; no “one region at a time” rule (app-screens).  
    *Fix:* Desktop three-pane; <1100px list→detail push; phone: projects list then files then preview sheet; declare Files under More with the same flow.

16. **med — Natural-language search duplicated and underspecified**  
    *Quote:* NL example in Indexing; global search in `10` also claims file FTS + semantic from (11).  
    *Why:* Two search UIs, one parser, unclear where NL lives (Files-only vs ⌘K). Scope creep for Phase 4.  
    *Fix:* v1: structured filters + FTS in Files; NL only in ⌘K/`10`; semantic after local embeddings land.

17. **low — Ignore rules are hand-wavy**  
    *Quote:* “ignore `node_modules`, `.git`, build output, files over a size cap, anything in `.junosignore`.”  
    *Why:* “Build output” and size cap unspecified → inconsistent indexes and surprise CPU use.  
    *Fix:* Default globs (`dist`, `build`, `.next`, `target`, …), default cap (e.g. 2–5 MiB text / larger binary metadata-only), document `.junosignore` syntax.

18. **low — “Git repos auto-detected” vs allowlist-only**  
    *Quote:* Allowlist folders; “Git repos (auto-detected as projects…)”.  
    *Why:* Ambiguous whether detection walks only allowlisted roots or scavenges the disk (privacy regression).  
    *Fix:* “Within allowlisted folders only; nested `.git` → project entity.”

19. **low — Typography / density not specified for this Operate screen**  
    *Why:* Spec defers to glass/Inter/violet (`14`)—pinned brief, but this doc adds AI-tag chips, tech tags, sparklines, and dual CTAs that will read as generic “Linear×Raycast” costume (Stitch’s own words) without a density/type scale for list rows vs preview.  
    *Fix:* In this spec (or `14`): row pitch, primary ink on name only, tags as quiet mono/grey not accent pills, preview type scale, no sparkline ornament.

20. **low — Entity shorthand drifts from `02`**  
    *Quote:* `project(name, path, repo_url, tags, last_activity_at)` vs `project(id, name, path, repo_url, tags_json, last_activity_at)`.  
    *Why:* Minor, but tags vs `tags_json` and missing `id` confuse implementers.  
    *Fix:* Reference `02` types; list only UI-facing fields and derived queries here.

---

**Cross-check note:** No `src/` implementation of indexer/browser yet; contradictions are doc-to-doc (`02`, `10`, `12`, `13`, `14`, `06`, Stitch), not code drift.
