**Verdict:** As an Operate/app-screen brief, this doc describes a full Finder + Spotlight + GitHub + Drive + AI-tagging surface without a single primary job, and its privacy claims already conflict with Stage 2 indexing. Design-wise it reads as a generic three-pane file manager with AI garnish (tags, sparklines), not a focused “hand this to a model” tool.

Lens: **impeccable Operate** (task clarity, density, restraint) + **design-taste app screens** (one question first, colour on data not chrome, no vanity KPIs/sparklines, honest states). Spec-only review — no live UI to measure.

---

### Contradictions

1. **Privacy vs Stage 2.** Privacy: content reaches a model only on attach or an enabled workflow. Indexing: Stage 2 sends files to a cheap model for summaries/tags, plus embeddings. Folder opt-in for tagging does not cover summaries/embeddings, and “local preferred” leaves a cloud path open.

2. **Allowlist vs auto-detect.** Sources say nothing is indexed outside the allowlist, then git repos are “auto-detected.” Unclear whether detection is only inside allowlisted trees or can pull in repos elsewhere.

3. **Read-only vs actions.** Open question proposes read-only first; the entity already lists Open in editor, Give to Hermes, Open in Chat (cwd/context mutation). Policy and chrome disagree.

4. **Acceptance vs Stage 2.** “Search finds a file by content within a second” fits Stage 1 FTS5 for text; NL search (“PDFs from last week about the API”) needs structured filters + semantic Stage 2, which is optional and budget-limited. Same sentence covers two different products.

5. **Cloud in Sources, local in Purpose/acceptance.** Drive / remote GitHub are in Sources as v2, but Purpose and acceptance are local-folder/cwd. Either cloud is out of this surface’s job, or acceptance is incomplete.

6. **Always-on AI tags column vs opt-in tagging.** Browser columns include “AI tags” while tagging is opt-in per folder — empty chrome or a column that lies about coverage.

---

### Gaps

- **One job.** Purpose mixes overview and fast handoff. App-screen run wants one question and one frequent action one click away. Spec never picks: browse tree, find by query, or attach to Chat/Hermes.
- **IA / first screen.** No default view (Projects home vs last folder vs search), no selection model for multi-file handoff, no ranking/filters UI for NL search.
- **States.** No empty (no folders), loading (first index), partial index, watcher error, permission denied, huge-tree degrade, Stage 2 budget exhausted.
- **Hard numbers.** Size cap, ignore defaults, embed batching, “within a second” corpus size — all unspecified.
- **Secret policy depth.** `.env` / key files only; no symlink escape, no “index metadata but never body,” no preview redaction, no post-index purge when a folder is removed from the allowlist.
- **Hermes/Chat blast radius.** “Give to Hermes” / Open in Chat lack scope (path vs tree vs git-tracked), approval UX, and what leaves the machine.
- **Responsive / density.** No collapse of tree + list + preview; no row pitch, column priority, or when grid is allowed.

---

### Unrealistic scope

This is several products in one short page:

| Bundle | Cost |
| --- | --- |
| Allowlisted watcher + FTS5 + content-hash cache | Plausible core |
| + language mix, 14-day sparkline, Kanban/conversation/task links | Extra product surface |
| + `gh` open PRs, dirty/branch | Network + auth + rate limits |
| + markdown/image/PDF/code preview | Real viewer stack |
| + NL → structured + semantic search | Query planner + embeddings |
| + Drive / remote GitHub (v2) | OAuth, sync, conflict model |

Acceptance (“add folder → projects → content search &lt;1s → Open in Chat with cwd”) is a thin vertical slice; the entity/browser/indexing sections imply a much larger build. Sparkline + AI tags + cloud belong in a later milestone or a different screen.

---

### Security / privacy risks

- **Second copy of content:** FTS5 (+ optional embeddings/summaries) is a searchable corpus of allowlisted files. Spec never says encrypt-at-rest, retention, or wipe-on-unlist.
- **Stage 2 exfil:** Any non-local summary/tag/embed model breaks the privacy paragraph; “preferred local” is not a control.
- **Preview bypass:** Preview can show secrets that indexing “excludes” if exclusion is index-only, or if patterns miss `.env.*`, `*.pem`, tokens in JSON/YAML.
- **Symlinks / junction paths:** Watcher on Windows can follow links outside the allowlist unless resolved paths are constrained.
- **`gh` / Drive:** Token scope and whether PR metadata (titles, branches) is stored alongside file index is unspecified.
- **Attach surface:** “Ask about this file” and project handoff are the real exfil paths; no mention of size limits, binary handling, or confirming what will be sent before send.
- **Ignore ≠ security:** `.junosignore` is user-controlled; defaults must be fail-closed for secrets, not hope the user maintains ignore files.

---

### UI / design-quality (hierarchy, density, type, motion, contrast)

Mode is **Operate / app screen**: quiet chrome, data over decoration, one primary action, density with honest empty/loading — not marketing hierarchy.

**What the brief currently specifies (and why it fails the lens)**

- **Generic three-pane file manager** (tree / list|grid / preview) plus AI column and project sparklines. That composition could ship in any “AI workspace” unchanged — low design specificity; high template risk (app-screens: KPI/sparkline vanity, chip tags, crowded chrome).
- **Two competing canvases:** Project entity (overview cards with sparklines, language mix, links) vs file browser. No hierarchy: which is the home, which is drill-in.
- **Density overload:** Columns `name, project, size, modified, AI tags` + grid alternative + preview + ask-input. App screens allow dense tables; they do not allow every metadata field and an AI facet on by default. Tags as pills/chips invite tiny tracked labels — a house-rule tell.
- **Sparkline as project chrome:** App-screens explicitly reject sparklines on KPI-style tiles. Activity belongs as a quiet sort key or a detail-only series, not a decorative strip on every project.
- **“Ask about this file” docked under preview:** Second composer next to global chat risks split attention and unclear model/context. Operate motion/copy: one task path; attach should feel like the same chat system, not a mini-chat per pane.
- **List vs grid unexplained:** Grid for files without strong thumbnails (most code/docs) adds noise; list-first with preview is the denser, clearer Operate pattern.
- **No type / spacing / contrast decisions:** No title size (app median ~16–24px, not a hero), no row height, no mute hierarchy for path vs name, no focus/selection contrast. Spec will default implementers to Inter-ish UI + grey metadata + accent tags.
- **Motion:** Operate wants 150–250ms state feedback only (index progress, selection, preview swap). Spec is silent — good that it doesn’t ask for choreography; still needs “indexing…” / “semantic unavailable” as visible state, not animation theater.
- **Empty / first-run:** No teaching empty state (“Add a folder” as the one control). Without it, first viewport is a hollow shell — the failure mode app-screens warn about (thin first screen, nothing to do).
- **Legibility of NL search:** Turning a sentence into filters + semantic hit list needs visible structured chips (type, date) the user can distrust/edit. Spec jumps to magic query with no confirmable UI.

**Stronger product face (still Operate, not Persuade):** one question — “What do I hand the model?” — first screen = allowlisted projects/folders + search + one primary **Attach / Open in Chat**; preview and git metadata as progressive disclosure; AI tags/summaries behind opt-in and not a default column; activity as sort/filter, not sparklines.

---

### Priority fixes for the doc (not implementing — Ask mode)

1. Pick **one primary job** and demote overview / cloud / sparklines / AI tags to later or secondary.
2. Rewrite **Privacy** so Stage 2 is explicitly opt-in, local-only (or forbidden), and aligned with attach.
3. Resolve **allowlist vs auto-detect**, **read-only vs actions**, and **FTS vs semantic** acceptance criteria.
4. Specify **empty/loading/error**, selection/attach confirmation, and a **list-first** layout without default AI-tag chrome.
5. Add security: resolved-path jail, secret defaults, wipe-on-unlist, attach size/scope.

I can go deeper on any one section (privacy rewrite, IA sketch, or acceptance split) if you want that next — still in Ask mode as guidance only.
