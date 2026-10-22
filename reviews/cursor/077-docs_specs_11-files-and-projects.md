**Verdict:** The doc describes a useful product idea (allowlisted files → hand to a model) but packs Finder, Spotlight, GitHub Desktop, and a project dashboard into one underspecified Operate screen. Internally it contradicts itself on indexing and privacy; design-wise it leans toward generated-dashboard chrome instead of a quiet file tool.

Mode: **Operate** (app screen). Lens: impeccable Operate + design-taste app-screens (quiet chrome, one job, tables not tiles, no sparkline vanity).

---

### Contradictions

1. **Allowlist vs auto-detect** — Sources say only explicitly added local folders are indexed (“nothing else is ever indexed”), then Git repos are “auto-detected as projects.” Unclear whether detection implies indexing outside the allowlist, or only decorating folders already on it.

2. **Privacy vs Stage 2** — Privacy: content goes to a model only when attached or a workflow reads it. Indexing Stage 2: AI summary/tags (and optionally embeddings) process file content in the background. “Opt-in per folder” softens but does not erase the clash; “local embedding preferred” leaves a cloud path open.

3. **Two products in one purpose** — Purpose is “overview + hand to a model.” Project entity adds language mix, 14-day sparkline, linked Kanban/conversations/tasks, Open in editor, Show board. That is a project hub, not a file browser. One screen cannot lead with both without muddying the first question.

4. **Acceptance vs features** — Acceptance: add folder → detect projects → content search &lt;1s; Open in Chat sets cwd. Same doc adds NL+semantic search, grid view, PDF/image preview, Cloud v2, `gh` open PRs. The bar and the feature list disagree on what “done” means.

5. **List columns on a grid** — “list and grid views, columns: name, project, size…” Columns are a list pattern; a grid with “AI tags” invites card/chip chrome the app-screen rules treat as template tells.

6. **Read-only open question vs actions** — Proposed read-only UI vs “Open in editor,” preview, and “Ask about this file” (which is a write into the chat system). Edit policy is unresolved while outbound actions are already assumed.

---

### Gaps (product + Operate)

- **One job / one first-screen answer** — App-screens require a single question and the primary action one click away. Missing: is the job “find a file,” “pick a project cwd,” or “attach context to Hermes”?
- **IA** — No split between Projects overview, folder tree, project detail, and search results. Tree tabs (Projects / Local / Cloud) are named, not laid out (widths, selection → preview, what scrolls).
- **States** — No empty (no folders yet), indexing progress, partial index, watcher error, permission denied, offline `gh`, Stage 2 budget exhausted, search timeout.
- **Selection & bulk** — Multi-select for “Give to Hermes,” folder vs file, max attach size: unspecified.
- **Keyboard** — No list for this surface (nav, preview, ask field, escape).
- **Sort / filter / path depth** — NL search is named; ordinary sort/filter and deep trees are not.
- **Lifecycle** — Remove folder from allowlist → purge index? Content-hash cache invalidation across renames?
- **Concrete caps** — Size cap, ignore defaults, Stage 2 budget, embedding backend: all TBD.
- **Responsive** — Silent (elsewhere the product collapses rails; this surface’s tree+list+preview will break first).

---

### Unrealistic scope

Shipping the full list as one MVP is unrealistic:

| Bundle | Why it’s heavy |
| --- | --- |
| Tree + list + grid + preview (md / image / PDF / code) + inline ask | Several product surfaces |
| FTS + NL structured filters + embeddings + AI tags | Search platform, not a browser |
| Git status + `gh` PRs + language mix + sparkline + Kanban/chat links | Project OS, not Files |
| Cloud v2 in the same Sources section | Different trust model and latency |

A credible v1 from this doc’s own acceptance criteria: allowlisted folders, project detection from those paths, FTS, Open in Chat / Give to Hermes, exclusions honored. Everything else is Phase N or a separate Project home.

---

### Security / privacy risks

- **Stage 2 is exfil by design** unless local-only is mandatory (not “preferred”) and opt-in is default-off with clear copy of what leaves the machine.
- **FTS5 index of file bodies** — At-rest store of allowlisted content; no retention, encryption, or “clear index” story.
- **Secret exclusion by pattern** — `.env` / key filenames miss secrets in source, notebooks, screenshots, `.pem` variants, cloud sync copies.
- **Symlinks / junctions / `..`** — Watcher on an allowlisted root can follow links outside the allowlist unless explicitly refused.
- **“Ask about this file” / Open in Chat cwd** — Attaching or setting cwd can expand model/tool reach beyond the single file (repo-wide tools). Needs the same approval story as Hermes.
- **`gh` for open PRs** — Network + token scope for a Files overview; fails closed and privacy-sensitive on shared machines.
- **Cloud (v2)** — Broadens indexing and model-attach surface before local privacy is nailed.
- **PDF/image preview** — Untrusted-file rendering risk not acknowledged.
- **`.junosignore`** — User-editable ignore can un-hide sensitive paths; no “protected patterns always win” rule.

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Through Operate + app-screens:

1. **Hierarchy** — No page title, primary action, or lead object. Risk: chrome (tree sources, view toggles, AI tags, ask box) outranks the files. App-screens: noun title, one primary, colour on data not chrome.

2. **Sparkline + “language mix” on projects** — Classic generated-dashboard tell. Study/app rules: no sparklines on KPI-like chrome; colour on meaningful data. A quiet `main · dirty · 3 PRs` line beats a 14-day chart.

3. **Density / composition** — Unspecified three-pane geometry. Without fixed tree width, list identity column priority, and preview as secondary rail, you get either sparse voids or crushed columns. Identity column (name/path) should dominate; size/mtime secondary; “AI tags” must not become a pill row.

4. **Grid view** — High risk of icon-topped cards and tag chips. If grid exists, it should be a dense icon+name matrix, not a card gallery.

5. **“Ask about this file” in the preview foot** — Second primary job inside the inspector. Competes with Open in Chat / Hermes; invites a chat strip that never belongs in a file tool’s first viewport. Prefer a single “Use in Chat” that routes to Chat with attach.

6. **Typography / legibility** — Paths, mono filenames, and dim metadata need an explicit scale (Operate: tight rem scale, one UI face, mono only for paths/code). Doc is silent → default Inter + grey-on-glass mush if paired with the glass direction elsewhere.

7. **Contrast** — Dirty/branch/`gh` state, AI tags, and dim mtimes unspecified. Status must not be colour-only (esp. dirty vs clean).

8. **Motion** — Operate: 150–250ms state feedback only. Doc implies live watcher + background Stage 2 with no “indexing…” / reduced-motion story → either silent stalls or decorative thrash.

9. **Empty / first run** — No “Add a folder” empty state that teaches the allowlist. First screen will feel thin or like a stock files template.

10. **Cognitive load** — Source tabs + view mode + columns + preview + ask + project actions (4+) on one canvas. Distill to: navigate → select → one handoff action.

---

### Highest-leverage doc fixes (if you edit later)

1. Pick **one** lead job; demote project dashboard fields or move them to a Project detail.
2. Resolve **allowlist-only indexing** vs git auto-detect in one sentence.
3. Make Stage 2 **default off**, **local-only** embeddings/summaries, or drop AI tags from v1.
4. Align Acceptance with a thin v1; park Cloud, grid, sparklines, `gh`, semantic search.
5. Specify **three-pane layout**, states, keyboard, and one primary handoff — no inline ask field.

I did not run `impeccable critique` against a live UI (spec-only, Ask mode). Questions skipped: N/A for a doc audit.
