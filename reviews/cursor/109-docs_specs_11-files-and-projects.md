**Verdict:** The spec packs a full IDE-grade library (browser + indexer + AI + cloud + Hermes) into one surface without choosing a primary job, and several privacy claims conflict with Stage-2 indexing. As Operate / app-screen UI, it leans toward generated-dashboard tells (sparklines, tag chrome, multi-pane density) rather than a quiet, job-first file tool.

Mode: **Operate** (file/project work surface). Lens: impeccable Operate + design-taste `app-screens` (not marketing-page rules).

---

### Contradictions

1. **Privacy vs Stage 2**  
   Privacy: content only goes to a model when Jonas attaches it or an enabled workflow reads it; AI tagging is opt-in per folder.  
   Indexing: Stage 2 runs “AI summary and tags” and embeddings in the background. Summaries are model calls over file content whether or not the user “attached” anything. Opt-in tagging does not clearly cover summaries or embeddings.

2. **“Local preferred” vs hard privacy**  
   Embeddings: “local embedding model preferred so content stays on the machine.” Preferring local is not a guarantee. That softens the privacy sentence into a hope.

3. **Allowlist vs auto-detected git**  
   Sources: only explicitly added local folders are indexed; also “Git repos (auto-detected as projects).” Unclear whether detection is *inside* allowlisted roots only, or a separate discovery path. If the latter, “nothing else is ever indexed” is false.

4. **Acceptance vs Stage 2 optionality**  
   Acceptance wants content search “within a second.” Stage 1 FTS can support that for text; NL search (“PDFs from last week about the API”) needs Stage 2 semantic/AI work that is optional, budget-limited, and background. The acceptance bar does not say which path must meet 1s.

5. **Re-index policy**  
   “Re-index only on mtime change; summaries cached by content hash.” If mtime stays and content changes (copy, some tools), hash cache and mtime gate disagree. Spec never says which wins.

6. **Read-only open question vs implied write surfaces**  
   Open question proposes read-only first. Preview + “Ask about this file” + “Open in Chat” / “Give to Hermes” are fine as read/handoff, but “Open in editor” and linking Kanban/tasks invite edit flows the privacy/approval story does not define.

---

### Gaps

- **Primary job of the first screen** — Overview of projects vs find a file vs hand off to a model. App-screen rule: one question and the most frequent job one click away; this lists three jobs with equal weight.
- **Scope of auto-detect** — Only under allowlisted paths? Nested repos? Monorepos? Detached worktrees?
- **What “Open in Chat / Give to Hermes” sends** — Path only, tree, README, selected files, or silent Stage-2 summaries?
- **Empty / loading / error / permission-denied** — First run with zero folders; indexing in progress; `gh` failure; preview failure; folder removed while watched.
- **Secrets beyond filenames** — `.env` / key *files* excluded; keys inside `.ts` / `.json` / paste buffers not addressed.
- **Cloud (v2)** — OAuth scopes, whether Drive content is pulled into local index, retention, and whether Stage 2 runs on cloud blobs.
- **Windows realities** — Long paths, drive letters, WSL↔Windows roots, symlink/junction escape from allowlist.
- **Size cap / mime / binary** — Cap value unset; whether PDFs get FTS, OCR, or preview-only; what “AI tags” means for binaries.
- **Responsive / phone** — Unmentioned; multi-pane browser will not survive a narrow width without a defined collapse.
- **Concurrency / multi-window** — Watcher + index + preview of large PDFs; cancel/budget UX when Stage 2 is “budget-limited.”

---

### Unrealistic scope

For one spec slice, this is several products at once:

| Bundle | Cost |
| --- | --- |
| Tree + list + grid + columns + preview (md/image/PDF/code) + inline Ask | Full document browser |
| chokidar + FTS5 + embeddings + cheap-model summaries + NL→structured query | Search platform |
| Project graph + language mix + 14-day sparkline + Kanban + chats + tasks + `gh` PRs | Activity dashboard |
| Hermes/Chat/editor handoff + cloud v2 | Integrations surface |

“Add a folder → projects detected → content search &lt; 1s” is only plausible for small trees on Stage 1. A real home/dev directory will blow past that without progressive indexing UX (which is unspecified).

Shipping **list and grid**, **five columns including AI tags**, and a **preview + Ask** dock before a single trusted find/handoff path is scope that fights density and hierarchy.

---

### Security / privacy risks

- **Stage 2 as silent exfil** — Background summaries/tags to a “cheap model” can leave the machine unless local-only is mandatory when privacy mode is on.
- **Embeddings soft requirement** — Non-local embeddings upload corpus chunks; conflicts with “content stays on the machine.”
- **Allowlist escape** — Symlinks/junctions from an allowed folder into `~/.ssh`, other drives, or cloud sync dirs; not mentioned.
- **Over-broad allowlist** — User adds `E:\` or home; watcher + FTS (+ optional AI) becomes a full-disk index. No warn/confirm, quotas, or “this looks like a home directory” guard.
- **`gh` / dirty / PRs** — Network + token use for every detected repo; no rate-limit, offline, or “don’t probe remotes” mode.
- **Preview of untrusted files** — PDF/image/code preview is a parser attack surface; no sandbox/isolation note.
- **Handoff to models** — “Give to Hermes” / Chat with cwd+context can pull far more than the user sees in the list row; need an explicit attach manifest.
- **Cloud v2** — Drive/GitHub-not-cloned expands the trust boundary; privacy section is still local-centric.
- **Secret exclusion by pattern only** — False safety; high-entropy / key-shaped content inside normal source files still indexable and Stage-2-eligible.

---

### UI / design-quality (hierarchy, spacing, typography, density, motion, legibility, contrast)

Grounded in impeccable **Operate** (task over expression; density OK; motion = state only) and design-taste **app-screens** (colour on data not chrome; no sparkline-on-KPI; flat surfaces; first screen shows the job).

1. **No single composition / job**  
   Tree (3 roots) + list/grid + 5 columns + preview + Ask is a kit layout. The first screen does not answer one question (“where is X?” or “hand this project to Hermes?”). Risk: thin overview chrome above the fold, real work buried.

2. **Sparkline = template tell**  
   “14-day activity sparkline” on the project entity is exactly what app-screens call out: sparklines on summary tiles, colour on chrome. Prefer type + one honest activity fact (last commit, dirty, open PR count) or a real small chart with a stated finding—not decorative sparklines per row.

3. **Density without hierarchy**  
   Columns `name, project, size, modified, AI tags` plus tree plus preview will collapse measure and contrast on a laptop. AI tags as a permanent column punish folders where tagging is off (empty/noisy column). Tags also invite pill/badge chrome the house style rejects on marketing pages and treats as chrome noise on app screens unless they are the data.

4. **Competing Ask surfaces**  
   “Ask about this file” under the preview duplicates Chat. Two composers → inconsistent affordances (Operate failure) and unclear which model/cwd/attachment rules apply.

5. **Grid + list with no rule**  
   Dual views without when/why doubles chrome (toggle, density modes) for little Operate value. File work usually wants one strong list/table; grid is for visual assets—spec never scopes grid to images.

6. **Typography / spacing unspecified → default IDE clone**  
   No type scale, row height, pane split, or preview chrome. Default outcome: Inter-like UI, zebra-ish tables, uppercase column headers, icon-in-tinted-square file types—generated admin, not Junos-specific. App-screens want product face + trade words (“Untracked”, “Dirty”, “Not indexed”) not generic “Items / Status.”

7. **Motion**  
   Unspecified. Sparkline animation and pane choreography would violate Operate (150–250ms state only; no load theatre). Need: index progress, selection, preview swap—nothing else.

8. **Legibility / contrast**  
   Secondary fields (size, tags, sparkline) will go soft-grey; app-screens want running data in full ink, grey only for true empty/missing (“—”). Semantic “AI tags” in muted chips will fail contrast and scan.

9. **Empty / first-run absent**  
   Zero folders is the real first screen; without an empty state that teaches allowlist + one CTA (“Add folder”), the browser is a dead multi-pane shell (emotional valley; onboard gap).

10. **Preview as second product**  
    Rendering md / images / PDFs / code in-pane is a high craft cost (contrast in code, PDF zoom, image letterboxing). Spec treats it as one line; design risk is a mediocre preview that steals space from the find/handoff job.

---

### Priority fixes (if you tighten the doc only)

1. Pick **one** v1 job: allowlisted find (Stage 1) **or** project handoff to Chat/Hermes—not both at full fidelity.  
2. Make privacy **hard**: no Stage 2 / non-local embeddings unless folder opt-in; spell attach manifest for Hermes/Chat.  
3. Drop or defer sparkline, grid, AI-tags column, cloud, language-mix; keep tree + list + one handoff action.  
4. Define empty/indexing/error and symlink/home-dir guards.  
5. Resolve git auto-detect **strictly inside** allowlisted roots.

I did not run a live impeccable critique/detector (this is a markdown spec, not a rendered screen). Switch to Agent mode if you want this written into `reviews/cursor/…`.
