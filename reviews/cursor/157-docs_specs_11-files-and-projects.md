**Verdict:** Spec `11` sketches a capable local file/project shell, but it is still a feature inventory — not an Operate-mode screen brief. Through impeccable (Operate) and design-taste app-screen rules, the biggest problems are an undecided primary job, privacy wording that undercuts itself, and UI that already reads like a templated “smart file manager” (tree + list/grid + tags + sparkline + preview + ask).

**Mode:** Operate (file/project workbench). Ambition should be precision and task clarity, not expression.

---

### Contradictions

1. **Attach-only privacy vs Stage 2 / Ask / workflows**  
   Privacy says content reaches a model only when Jonas attaches it *or* a workflow he enabled reads it. Stage 2 (“AI summary and tags”), “Ask about this file”, and “Open in Chat” / “Give to Hermes” are all content→model paths. The doc never maps each path to the same consent model (opt-in folder vs attach vs workflow). “Workflow he enabled” is a hole large enough to swallow the attach-only story.

2. **Allowlist vs git auto-detect**  
   Sources say only explicitly added folders are indexed; also “Git repos (auto-detected as projects)”. Unclear whether detection is scoped *inside* the allowlist only, or whether any discovered repo becomes a project entity (and thus browsable/indexable).

3. **Read-only first vs write-shaped actions**  
   Open question proposes read-only first, but Actions already include Open in editor, Give to Hermes, Open in Chat (cwd + context), and Ask. Those are not a read-only surface; the doc never says which ship in v1.

4. **Cloud in Sources, nowhere in Acceptance**  
   Cloud (Drive, remote GitHub) is named as a source “v2”, but acceptance and indexing are local-watcher shaped. Readers will treat Cloud as in-scope chrome (tree root “Cloud”) without behavior.

5. **“Within a second” vs Stage 2**  
   Acceptance: content search within a second after add. Indexing: Stage 1 FTS5 always; Stage 2 embeddings/tags background and budget-limited. NL search that needs semantic tags cannot meet that bar; the doc doesn’t say Stage-1-only for the acceptance case.

6. **Secrets excluded vs FTS5 of text files**  
   Stage 1 indexes text into FTS5; secrets are “excluded by default.” Order of operations, pattern list, and whether a secret that was briefly readable before `.junosignore`/pattern rules still left residue in the DB are unspecified — privacy claim and indexing pipeline conflict until ordered.

---

### Gaps (spec / product)

- **No “one question”** (app-screens §2.2). Is this “hand this folder to a model”, “find a file”, or “see project health”? Hierarchy, panes, and acceptance should fall out of that; they don’t.
- **No selection / multi-file handoff model.** Give one file, many files, whole project? Clipboard vs chat attach vs Hermes payload?
- **No empty / loading / error / permission / partial-index states.** Critical for a watcher + index product; impeccable Operate expects these as first-class.
- **No layout:** pane count, default widths, what collapses on narrow, whether preview is master–detail or optional.
- **Unspecified knobs:** size cap, Stage 2 budget, embedding fallback if “local preferred” fails, `gh` auth/rate limits, refresh of dirty/PR state, symlink/junction policy, binary handling.
- **Project derived fields** (language mix, sparkline, linked Kanban/conversations/tasks) have no UI home — entity dump without a view.
- **Destructive / revoke path** missing: remove folder from allowlist, purge index, revoke AI tagging mid-flight.
- **Preview security model** missing (especially PDF/HTML/code in a webview).

---

### Unrealistic scope

Packed into one short doc:

| Cluster | Cost |
|---|---|
| Allowlisted watcher + FTS + optional embeddings + NL→structured search | Full local search stack |
| Git enrichment (`gh` PRs, dirty, branch) | Network + auth + polling UX |
| Project graph into Kanban/chat/tasks | Cross-product linking |
| Tree + list + grid + preview + Ask | Full IDE-lite chrome |
| Cloud Drive / remote GitHub | Whole second product |

For a v1 that matches Purpose (“overview + fast handoff”), a credible cut is: allowlisted tree + Stage-1 search + project open/handoff + simple preview — **not** grid, AI tags column, sparklines, semantic search, and Cloud roots in the same IA.

---

### Security / privacy risks

- **Local index as second copy of disk.** FTS5 (+ optional embeddings/summaries) retains content. Exclusion failures, hash-cache bugs, and “re-index only on mtime” vs rename/move are privacy bugs, not polish.
- **“Local embedding preferred” without hard fail-closed.** If cloud fallback exists and isn’t named, Stage 2 can violate the on-machine promise silently.
- **Secrets patterns are illustrative, not a policy.** `.env` / “key files” miss common cases (`*.pem`, `id_rsa`, `credentials.json`, `.npmrc`, cloud SDK tokens, etc.). Default-deny for unknown sensitive paths is safer than a short allow-exclusions list — unspecified.
- **cwd / whole-project handoff.** Open in Chat with project `cwd` can expose far more than an attached file; approval policy is gestured at only in the Hermes open question.
- **`gh` / Cloud.** Token use, private repo metadata in UI, Drive OAuth scope — not mentioned under Privacy.
- **Preview surface.** Rendering untrusted project files (HTML, PDF JS, SVG) in-process is a classic XSS/exfil path if the shell is a webview; zero guidance.
- **AI tags / summaries stored.** Even opt-in per folder, summaries of secrets that slipped past filters become long-lived model-derived artifacts.

---

### UI / design quality (hierarchy, density, type, motion, legibility)

Lens: Operate + app-screens (quiet chrome, one job first, tables as rules/alignment, colour on data not chrome, no dashboard jewelry).

**Hierarchy / composition**

- Tree (Projects / Local / Cloud) + list/grid + columns + preview + Ask input = three+ competing regions with no primary. App-screens: the largest block answers the screen’s one question; this spec never names that block.
- Project actions (Chat, Hermes, editor, board) are four peer CTAs — >4 visible decision points without progressive disclosure (cognitive load).
- Purpose is handoff; chrome reads as “everything browser.” Risk of a thin first screen: navigator chrome and empty preview while the job (pick → hand off) is buried.

**Density / tables / grid**

- Columns `name, project, size, modified, AI tags` without column priority, truncation, or sticky header. App-screens full-list rules: state totals, sticky header, paging/range — absent.
- **Grid view** for arbitrary files tends toward icon-card grids (app-screen / page “tells”). Spec doesn’t say grid is media-only or what non-image cells show → likely slop.
- **AI tags** as a column invites chip clusters and tiny tracked labels — high noise next to name/mtime. Better as secondary detail in the preview, not a fifth primary column.
- **14-day activity sparkline** on the project entity is exactly the KPI-tile jewelry app-screens warns against (sparklines on overview metrics). If activity matters, prefer a single typed figure or last-commit line in ink, not a decorative sparkline.

**Typography / legibility / contrast**

- No type roles (page title vs path vs meta vs code preview). Operate wants a tight rem scale (≈12/14/16/24), tabular numbers for size/dates, monospace only for real code/IDs.
- Meta-heavy UI (paths, sizes, dirty, tags) will default to soft grey tertiary text; house floor is **4.5:1** including placeholders — unspecified, so contrast debt is likely.
- Code/markdown preview measure and font unspecified; preview pane often becomes an illegible dump.

**Spacing / layout**

- No pane rhythm, gutter, or “selected row drives detail” rule (app-screens: list→detail uses `--active` fill, not hover-as-selection).
- Ask-at-bottom on the preview stacks a second chrome band under content — fights the browse job; better as an explicit mode or one clear action (“Ask”) that opens chat with attach already set.

**Motion**

- Watcher-driven index updates with no guidance → risk of row flicker, sparkline animation, or tag pop-in as decoration. Operate: 150–250ms, state only, no load choreography. Spec should say: quiet replace of mtime/size; no animate-in for tags; indexing progress as a single status, not per-row theater.

**Empty / first-run**

- No empty state for “no folders allowlisted” — the product’s actual onboarding moment. Operate/onboard: empty states teach the interface (“Add a folder Jonas trusts”), not “Nothing here.”

**Product face**

- Spec could belong to any “AI file manager.” Nothing Jonas-specific (allowlist trust, Hermes handoff, local-first) is expressed as a signature UI element — e.g. a persistent “trusted folders” strip or a single dominant Hand off control. That is a specificity miss under both skills.

---

### Priority fixes (if this doc is rewritten)

1. **Pick one v1 question** and delete competing chrome until the first screen answers it (likely: “What can I hand to a model, from folders I trust?”).
2. **Unify consent:** Stage 2, Ask, Chat cwd, Hermes — each named with opt-in scope and fail-closed cloud rules.
3. **Order indexing vs secrets** and define purge/revoke; drop or defer sparklines, grid, AI-tag column, Cloud roots, semantic search.
4. **Specify the Operate layout:** one search, tree or projects rail, list (not grid) with 2–3 priority columns, optional preview, one primary handoff action; empty/loading/error; selection→detail; contrast/type density in one short “UI notes” subsection.

I did not run a live impeccable critique (no rendered UI; Ask mode). This is a spec-only pass through those lenses.

Questions skipped: none — review complete as requested.
