**Verdict:** Spec 11 is an Operate/app-screen surface written as a feature laundry list. It mixes three jobs (inventory, browse, hand-to-model), under-specifies consent and allowlist boundaries, and encodes several “generated dashboard” UI defaults the skills treat as failure modes—especially with no hierarchy, states, or density rules.

Mode: **Operate** (impeccable) / **app screen** (design-taste). There is no PRODUCT.md/DESIGN.md; the brief is this doc alone.

---

### Contradictions

1. **Allowlist vs auto-detect**  
   Sources: only folders Jonas adds are indexed. Also: git repos are “auto-detected as projects.” Unclear whether detection is *inside* allowlisted trees only, or a machine-wide scan. That is the core trust boundary of the feature.

2. **Privacy vs “hand to a model”**  
   Privacy: content reaches a model only when Jonas attaches it or an enabled workflow reads it. Purpose / actions: Open in Chat (sets `cwd` **and context**), Give to Hermes, “Ask about this file” with the file attached. “Context” is undefined—README? tree? dirty files?—so the privacy rule and the primary actions can conflict on first use.

3. **Index exclusion vs tree/preview**  
   Acceptance: excluded paths never appear in the index. Silent on whether `.env` / key files still show in the tree or preview. Pattern-exclude from FTS while still browsing them is a different product than “never appear.”

4. **Stage 2 vs opt-in**  
   Indexing: Stage 2 is “optional, background, budget-limited.” Privacy: AI tagging opt-in per folder. Embeddings are listed in Stage 2 without the same opt-in sentence. Tagging can be off while embeddings still process full file text.

5. **Read-only vs Open in editor**  
   Open question proposes read-only first; Actions already include Open in editor. Fine if editor is external, but the doc never says edits are out-of-band.

6. **v1 acceptance vs v2 sources**  
   Cloud (Drive, remote GitHub) is in Sources; Acceptance only covers local add-folder / search / Open in Chat. Scope and done-definition disagree.

---

### Gaps (product + Operate craft)

Missing for an app screen the skills would refuse to ship without:

| Gap | Why it matters |
|---|---|
| **One primary job** | Inventory says answer one question first; this doc never picks among “find a file,” “pick a project,” and “attach to chat.” |
| **Objects & magnitudes** | No counts (folders, files, projects), no “cold index” vs “warm” behavior, no what a new install looks like. |
| **IA / layout** | Tree + list/grid + columns + preview + ask box—no pane priority, breakpoints, or what collapses. |
| **States** | Empty (no folders), indexing, partial index, watcher errors, `gh` failure, preview unsupported type, search zero-results—all absent. |
| **Search contract** | NL → structured filter needs a parser (local model? rules?). “Within a second” for content search after add is undefined for large trees / binary / PDF. |
| **Project derived fields** | Language mix, sparkline, linked Kanban/conversations/tasks—no data sources or failure when links missing. |
| **Hermes / Chat handoff** | Payload (paths vs contents), approval policy hook, cwd semantics for multi-root. |
| **`.junosignore` + size cap** | Cap value, ignore semantics, symlink/junction policy. |
| **Preview security** | How markdown/HTML/PDF/code are sandboxed (especially markdown). |

---

### Unrealistic scope

Packed into one thin spec:

- Allowlisted watcher + FTS5 + optional embeddings + NL search  
- Git intelligence (`gh` PRs, dirty state, branch)  
- Multi-source browser (local / projects / cloud v2)  
- Rich preview (md, images, PDF, code) + inline ask  
- Cross-links to Kanban, conversations, tasks  
- Sparklines and language-mix analytics  

That is closer to a files product + project hub + lightweight IDE sidecar than one overview. Cloud and Stage 2 alone are each a milestone; Acceptance reads like “folder add + FTS” only—cut or phase explicitly.

“Search finds a file by content within a second” after add is optimistic without: incremental FTS budget, PDF/text extraction cost, and “searchable = Stage 1 only until extract finishes.”

---

### Security / privacy risks

1. **Silent full-text corpus** — Stage 1 FTS on all text in allowlisted trees is a local search index of Jonas’s work. Doc frames privacy as “not sent to a model,” which is weaker than “what is stored, where, and how to purge.”

2. **Embeddings / summaries** — Even “local preferred” means file bodies are read and transformed; summary cache by content hash is a second sensitive store. Opt-in should cover **all** Stage 2, not only tags; say what happens on folder revoke (delete index rows, embeddings, summaries).

3. **Secret patterns are incomplete** — `.env` / key files only. Misses tokens in config, `.pem` variants, clipboard exports, `credentials.json`, etc. Default deny for high-risk globs + never preview raw secrets is safer than “excluded from index.”

4. **Watcher escape** — Symlinks/junctions from an allowlisted root to `$HOME` / other drives can index far more than intended. Spec needs “do not follow symlinks outside allowlist” (or never follow).

5. **Open in Chat / Ask / Hermes** — High-stakes sends. Need preflight: what will leave the machine (paths only vs contents, size, secret scan), and a confirm. “Sets context” without a manifest is a footgun.

6. **`gh` / network** — Open PRs imply authenticated GitHub calls; document token use, offline degradation, and that PR metadata is another channel of private repo signal.

7. **Preview pane** — Markdown with HTML, PDF JS, or syntax highlighters can be XSS/local-exfil vectors in desktop shells. Spec should require inert preview (no script execution).

8. **Cloud v2** — Drive/GitHub remote indexing expands the trust and retention story; leaving it in Sources without privacy/AC is a future hole.

---

### UI / design-quality problems  
*(hierarchy, spacing, typography, density, motion, legibility, contrast — through Operate + app-screens)*

The doc never specifies visuals, but the **implied UI** already fights the skills:

**Hierarchy / jobs**  
Four competing surfaces (source tree, list/grid, preview, ask). App-screens: most frequent job one click from the first screen; first screen shows every named block’s header and first rows. Here the first screen’s question is unset—so implementers will default to a crowded VS Code/Finder clone with an AI dock.

**Density**  
Columns “name, project, size, modified, AI tags” + grid + preview is high chrome before any user data. AI tags as a column encourages pill/chip metadata (page house style bans; app screens still want quiet labels, not tag confetti). Prefer tags in a detail/inspector, not a primary column.

**Sparkline (14-day activity)**  
App-screens study callout: no sparklines on KPI-style tiles; colour on data that needs judgment, not decorative activity chrome. A per-project sparkline is a classic generated-dashboard tell unless it answers a concrete question (e.g. “stale > N days”) with a honest empty/zero state.

**Typography / legibility**  
No type scale, no code-preview font rules, no contrast for md/PDF/code. Operate: one family, tight rem scale, running text in full ink. Preview of code/md needs explicit min size, line length, and light/dark behavior—or the pane will ship grey-on-grey.

**Spacing / layout**  
No grid, margins, or pane split rules. Risk: equal visual weight on tree, table, and chat so nothing is the “canvas.” App-screens want shell + one canvas answering one question; chat-ask belongs as a deliberate secondary mode, not a permanent bottom bar competing with browse.

**Motion**  
Unspecified (good default for Operate: 150–250ms state only, no load choreography). Still missing: indexing progress, search-in-progress, and `prefers-reduced-motion` for any expand/preview transitions someone will add later.

**Contrast / state colour**  
Dirty git state, PR counts, AI-tag confidence, indexing budget—none say how colour encodes meaning. Restraint without a data hue for the one thing that matters reads as a kit (app-screens warning).

**Empty / first-run**  
No empty-state copy in the trade’s words (“Add a folder Jonas actually works in” vs “No items”). Onboard path is an Acceptance bullet only.

**Design specificity**  
Replace “Jonas” with any user and the UI is a generic AI file manager. Skills ask for one product-owned element (e.g. handoff-to-Hermes as the hero action with a clear payload preview)—not language-mix + sparkline + AI tags.

---

### Priority fixes (spec-only)

1. **Phase:** v1 = allowlisted folders + Stage 1 FTS + project detect *within* those folders + Open in Chat with explicit path/cwd manifest; defer cloud, embeddings, sparklines, Kanban links.  
2. **Resolve allowlist:** auto-detect never walks outside added roots; define symlink policy.  
3. **Unify consent:** Stage 2 (tags **and** embeddings/summaries) opt-in per folder; Chat/Ask/Hermes always show what will be sent.  
4. **UI brief:** one primary job; list-first; preview optional; ask as explicit mode; no sparkline; tags not a default column; name empty/loading/`gh`-fail states.  
5. **Hardening:** secret globs + no-preview for matches; inert preview; purge-on-remove; search SLA only for Stage 1 text extract complete.

---

**Questions skipped:** full impeccable dual-assessment / browser detect — target is a markdown spec, not a rendered surface (Ask mode, no UI to inspect).
