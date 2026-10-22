**Verdict:** Spec 11 is a thin Operate surface brief that piles three products (project overview, file manager, AI attach rail) into one screen and leaves hierarchy, states, privacy boundaries, and density unspecified. Through impeccable Operate + design-taste app-screens, the described UI is a high risk of “generated file browser”: tree + list/grid + preview + sparkline + AI tags + chat dock, with no single question the first screen answers.

Mode: **Operate** (worked-in tool). Taste lens: **app screen**, not a marketing page.

---

### Contradictions

1. **Indexing allowlist vs auto-detect**  
   Sources: only explicitly added local folders are indexed; “nothing else is ever indexed.” Also: git repos are “auto-detected as projects.” Unclear whether detection can invent projects/index paths outside the allowlist, or only decorate folders already allowlisted.

2. **Privacy “content only when attached” vs Stage 2**  
   Privacy: content hits a model only when Jonas attaches it or an enabled workflow reads it. Indexing Stage 2: AI summary/tags via a cheap model, plus embeddings (local “preferred”). Opt-in tagging softens summaries; embeddings for “semantic search” still process file bodies. The doc never says whether embeddings are local-only, opt-in, or on by default with Stage 1.

3. **Secrets excluded vs attach paths**  
   Secrets “excluded by default” from the index, but the main jobs are Open in Chat, Give to Hermes, and “Ask about this file.” No rule that excluded/secret paths cannot be attached or previewed once opened.

4. **Read-only open question vs implied mutability**  
   Open question proposes read-only; the surface already lists Open in editor and model/Hermes handoff. “Read-only” of the index vs of files is undefined.

5. **Acceptance vs Stage 2 / Cloud**  
   Acceptance: content search “within a second,” projects detected, excluded paths absent. Stage 2 is optional/budget-limited; Cloud is v2. Either acceptance only covers Stage 1 FTS (say so), or “within a second” after embeddings is oversold.

6. **Purpose: two primaries**  
   “Overview of files and projects” and “fast way to hand any of them to a model” compete. The entity model and actions lean project; the browser and search lean files. No stated primary.

---

### Gaps (spec / product)

- **One question for the screen** (app-screens §2.2): e.g. “Where is X?” vs “What should I hand the model?” vs “What changed in my repos?” Missing; drives layout.
- **Empty / first-run / loading / error**: no folders yet; indexing catch-up; watcher failure; `gh` failure; permission denied; Stage 2 budget exhausted. App-screens treat these as mandatory; the doc only has happy-path acceptance.
- **Selection & bulk**: multi-select for Hermes/Chat? Drag? Folder vs file attach?
- **Preview security & failure**: markdown/HTML/XSS, huge PDF, binary, truncated preview, “file too large.”
- **Concrete caps**: size cap, ignore rules, Stage 2 budget, FTS vs semantic when embeddings aren’t ready.
- **Symlinks / junction escape** from allowlisted roots.
- **Sort, filter, keyboard, focus** for tree ↔ list ↔ preview ↔ ask field.
- **What “Give to Hermes” / “Open in Chat” attach**: whole tree, open file, selection, summary-only?
- **Project derived fields** (language mix, sparkline, Kanban, conversations, tasks): where they live (detail only vs every row) is unspecified → density bomb if all show in the list.

---

### Unrealistic scope (for one surface)

Bundled without phasing UI:

| Bundle | Why it hurts |
| --- | --- |
| Project intelligence (`gh` PRs, dirty, language, 14d sparkline, Kanban/chat/task links) | Overview product |
| Full tree + list **and** grid + rich preview | Classic file manager |
| NL search + FTS + embeddings | Search product |
| Per-file AI tags/summaries | Background AI product |
| Cloud Drive + remote GitHub in the same navigator | v2 integration product |
| Inline “Ask about this file” | Mini-chat inside the browser |

A credible cut: allowlist + Stage 1 FTS + project detect from those roots + list + preview + single “send selection to Chat/Hermes.” Sparkline, grid, AI tags, NL parse, Cloud later.

“Search by content within a second” after add needs a defined corpus size and Stage 1-only semantics, or it’s a trap for implementers.

---

### Security / privacy risks

- **Local index as shadow copy**: Stage 1 FTS stores text of allowlisted trees. Laptop theft, backups, and sync of the Junos DB are unaddressed (retention, encryption at rest, wipe on folder remove).
- **Embeddings**: “local preferred” implies non-local is allowed; that breaks the privacy paragraph unless forbidden or gated like tagging.
- **Opt-in ambiguity**: “AI tagging is opt-in per folder” vs Stage 2 “optional, background, budget-limited” — product toggle vs user consent.
- **Secret exclusion is index-only**: weak if preview/attach still work; `.env` patterns don’t cover all secrets.
- **Markdown/code preview**: untrusted HTML/script in rendered markdown is a classic local XSS / exfil risk if the shell is a webview.
- **PDF/image preview**: DoS via huge or malicious files; no cap tied to preview.
- **`gh` for open PRs**: network + token; failure and scope not specified; may surprise on “local-only” mental model.
- **Hermes / Chat handoff**: no attach size limit, no redaction, no “this folder has secrets” warning.
- **Cloud v2** in Sources without extending Privacy (Drive contents to models/index).

---

### UI / design quality (impeccable Operate + taste app-screens)

**Hierarchy & one job**  
Three regions (tree, list/grid, preview) plus an ask field plus project chrome (sparkline, tags, linked boards) with no priority. App-screens: answer one question on the first screen; put the frequent job one click away. Spec makes every block first-class → thin, busy, or both.

**Density**  
Columns `name, project, size, modified, AI tags` + preview + ask is a full-list screen plus a detail pane plus a composer. Taste: identity column gets the width; meta goes grey/secondary; one status mark per row. “AI tags” as a column invites pill chips and secondary ink competing with the filename.

**Sparklines**  
“14-day activity sparkline” on the project entity is exactly the tell app-screens ban on KPI/overview chrome (0/23 studied screens). If activity matters, one honest small chart or a single recency line (“Last commit 2h · dirty”), not sparklines on cards/rows.

**List vs grid**  
Grid view for arbitrary files tends toward icon cards (taste house ban on icon-topped / identical card rows). Prefer list as default; grid only if it’s a real media browser with fixed media slots, not a second layout for the same table.

**Typography & legibility**  
No type roles. For Operate: one grotesk, tight scale (~12/14/16/24), page title ≤ ~24–32px, paths truncated with clear identity, tabular figures for size/dates, monospace only for real code in preview—not for AI tags or tree chrome.

**Spacing & composition**  
No shell: rail width, preview split, whether project “overview” is a separate route from “browse.” Risk of a dashboard header (language mix + sparkline + linked cards) above the browser—hero-header anti-pattern for app screens.

**Motion**  
Unspecified. Operate: 150–250ms state feedback only (index progress, selection, pane open)—no load choreography. Indexing progress needs an honest state, not a decorative pulse on every row.

**Contrast & color**  
Dirty/branch/PR/AI-tag colors will land on chrome if unspecified. Taste: colour on data that needs a decision; quiet borders/tone steps; running text in full ink. “AI tags” and git dirty must not become a rainbow row.

**Cognitive load**  
Actions listed: Open in Chat, Give to Hermes, Open in editor, Show board, Ask about this file, plus view modes and NL search—well over four simultaneous choices without progressive disclosure (impeccable cognitive-load concern).

**Empty / error copy**  
No trade language (“No folders allowlisted”, “Still indexing 1.2k files”, “Excluded by .junosignore”). Spec silence here usually ships as “No data” illustration territory—another app-screen tell.

**What’s missing as design substance**  
No signature element from *this* product (Jonas’s allowlisted workspace, Hermes handoff). Without that, implementers will ship generic Finder + ChatGPT sidebar.

---

### Priority fixes if you revise only this doc

1. Pick **one primary job** and one first-screen question; demote the rest to secondary routes or later phases.  
2. Reconcile **privacy ↔ Stage 2 ↔ attach**: local-only processing defaults; opt-in matrix; secrets never indexed *or* attached without an explicit override.  
3. Define **allowlist vs project detection** in one sentence.  
4. Drop or quarantine **sparkline + grid + AI tag column + inline ask** from v1 layout; keep list + preview + one handoff action.  
5. Add **empty / indexing / error / preview-fail** and concrete **size/budget** numbers so acceptance is testable.  
6. Specify **preview trust boundary** (plain text / sandboxed markdown) and **attach limits**.

I’m in Ask mode, so this is review only—switch to Agent mode if you want the spec rewritten against these points.
