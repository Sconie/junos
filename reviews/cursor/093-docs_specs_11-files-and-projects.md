**Verdict:** As an Operate-mode app screen, this spec sketches a capable file/project hub, but it under-specifies the UI while over-scoping the data plane, and the privacy claims don’t hold against Stage 2 / cloud / auto-detect as written.

Mode: **Operate** (file browser + project handoff). Lens: impeccable Operate restraint + design-taste app-screen rules (quiet chrome, data over decoration, one primary job, honest states).

---

### Contradictions

1. **Privacy vs Stage 2.** Privacy: content leaves only on attach or an enabled workflow. Indexing: Stage 2 sends files to “a cheap model” for summaries/tags; local embeddings are only “preferred.” Those conflict unless Stage 2 is explicitly local-only (or framed as an enabled workflow with the same consent surface as attach).

2. **Allowlist vs auto-detect.** Sources: nothing is indexed except explicitly added folders. Also: git repos are “auto-detected as projects” (and `gh` for open PRs). Unclear whether detection is scoped inside allowlisted roots or can invent projects outside them.

3. **Acceptance vs indexing stages.** Acceptance wants content search “within a second.” Stage 2 (embeddings / AI tags / NL understanding) is optional, background, budget-limited. FTS5 can meet the bar; “PDFs … about the API” cannot be promised at 1s if Stage 2 hasn’t finished—or if it’s off.

4. **Read-only vs Open in editor.** Open question proposes read-only first (edits via Hermes/CLI under approval). Actions already include “Open in editor,” which is a direct edit path outside that policy.

5. **Cloud in Sources vs silence in Privacy.** Cloud (Drive, remote GitHub) is listed as a source, but Privacy only discusses local attach/tagging/secrets. Indexing or caching cloud blobs is a different trust model and isn’t reconciled.

---

### Gaps (product + UI)

- **Primary job.** Purpose is “overview + hand to model/Hermes,” but the File browser section leads with tree/list/grid/columns/preview/ask—no stated default: project picker vs file search vs attach.
- **IA of the three roots** (Projects / Local / Cloud): empty cloud, mixed roots, and how a git project relates to a local folder aren’t defined.
- **Selection → handoff.** Multi-select? Whole project vs file vs folder? Token/size caps before “Open in Chat” / “Give to Hermes”? Confirmation when the payload is large or sensitive?
- **States:** empty (no folders), first-run add-folder, indexing in progress, Stage 2 deferred, search timeout, `gh` unauthenticated, watcher errors, preview unsupported types—none specified (impeccable Operate expects these as first-class).
- **Preview + “Ask about this file”.** Who owns the model call, streaming, and failure? How does this differ from Inbox/Chat? Risk of a second chat surface with no IA.
- **Derived project fields** (language mix, sparkline, Kanban, conversations, tasks): where they render, what if missing, and what is v1 vs later.
- **Responsive / phone:** not mentioned; app-screen chapter expects a deliberate phone composition or an explicit “desktop-only.”
- **Accessibility:** tree keyboard model, preview focus trap, contrast for tags/sparklines—absent.

---

### Unrealistic scope

Packed into one thin spec:

| Bundle | Why it’s heavy |
| --- | --- |
| Allowlisted watcher + FTS5 + optional embeddings + NL→structured search | Full local search stack |
| Git enrichment + `gh` PRs | Network/auth/rate limits |
| Project graph linked to Kanban, chats, tasks | Cross-product entity model |
| Preview for md/images/PDF/code | Several renderers + security surface |
| In-pane “Ask about this file” | Mini-chat product |
| Cloud Drive + remote GitHub | Separate auth and sync product (“v2” but already in Sources) |

Acceptance only covers: add folder → detect projects → content search in ~1s → Open in Chat sets cwd → exclusions honored. Everything else is unspecified delivery risk. A credible v1 is closer to: allowlisted folders, Stage 1 index, project list with Open in Chat / Give to Hermes, simple search—defer grid, AI tags column, sparkline, cloud, and in-pane ask.

---

### Security / privacy risks

- **Stage 2 + “cheap model”:** path/mime alone can be sensitive; file bodies are worse. Opt-in per folder is necessary but not sufficient without: model locality, redaction, audit of what was sent, and pause while indexing.
- **Secret exclusion by pattern** (`.env`, “key files”): misses tokens in source, `*.pem` variants, cloud creds JSON, `.npmrc`, clipboard exports, etc. Excluded from index ≠ excluded from “Open in editor” / Hermes cwd / recursive attach.
- **Give to Hermes / Open in Chat on a repo:** dirty tree + secrets on disk; needs scope summary (file count, size, skipped secrets) before send.
- **PDF/image/code preview:** parser/renderer CVEs; untrusted file content in a privileged desktop shell—needs sandboxing note.
- **`gh` / remote metadata:** leaks interest in repos; needs auth scope and offline behavior.
- **Cloud indexing:** local cache of Drive/GitHub content is a second copy of private data; retention and deletion when a folder is removed from the allowlist are unspecified.
- **`.junosignore` + size cap:** good, but no policy for symlinks escaping the allowlist or re-adding ignored paths via project actions.

---

### UI / design-quality problems (hierarchy, density, type, motion, legibility)

Reading the File browser + Project entity as the implied screen:

1. **No one question for the first viewport.** App-screen rule: answer the job and put the frequent action one click away. Here the implied chrome is tree + dual view modes + five columns + preview + ask field—template IDE density without a declared hero action (“Hand to Hermes” / “Open in Chat”).

2. **14-day activity sparkline on projects.** App-screen study: no sparklines on KPI-like tiles; colour on data, not chrome. A sparkline per project card is classic generated-dashboard tell and competes with name/path/branch—the signals that actually matter for handoff.

3. **“AI tags” as a first-class column.** Tags from a background model are weak, delayed, and often wrong; putting them beside name/modified elevates speculative metadata over facts. Prefer search/filter later, not a permanent column.

4. **List and grid views with no grid rules.** File grids drift into icon cards (banned tell on marketing pages; on app screens, still noisy unless the job is visual—images only). Spec should pick list-first for code/docs, grid only for media.

5. **Preview pane + ask at bottom.** Stacks reading and chatting in one column: hierarchy collision (is the file or the model primary?). Operate motion guidance: no decorative choreography; if anything moves, it’s index progress and selection feedback (150–250ms), not preview theatre.

6. **Project actions (4) + browser modes (2) + sources (3).** Cognitive load: too many equal-weight actions. Rank one primary, demote the rest to a menu; don’t present Open in Chat / Hermes / editor / board as a flat peer row on every card.

7. **Typography / density unspecified.** For Operate: one family, tight rem scale, tables as rules and alignment—not zebra, not header bands, numbers right-aligned. Spec never says density target (glance vs all-day browser), so implementers will invent padded “cards” and soft grey secondary text (legibility risk).

8. **Language mix + linked counts** as derived chrome risks a KPI-tile row (“12 chats · 3 boards”)—colour on chrome, not on the file/project decision. If shown, use plain type, not tinted stat tiles.

9. **Contrast / legibility.** “AI tags,” dirty state, branch, PR badges—if all are muted chips, the row fails scanability; if all are accent, the screen screams. Spec needs a single semantic colour budget (e.g. dirty/error only).

10. **Empty/first-run.** No teaching empty state (“Add a folder Jonas actually uses”)—Operate empty states should teach the affordance, not “No files.”

---

### Highest-leverage fixes (spec-only)

1. Rewrite Privacy so Stage 2, cloud, and `gh` are explicit consent + locality rules—or cut Stage 2/cloud from this doc’s v1.  
2. Resolve allowlist vs auto-detect in one sentence; bind git detection to allowlisted paths.  
3. Split v1 acceptance from v2 cloud/AI-tags/sparklines/in-pane ask.  
4. Specify one primary screen job and a quiet list-first layout; kill or defer sparkline + AI-tags column + grid.  
5. Add handoff confirmation (scope, size, skipped secrets) and the missing empty/indexing/error states.

I only reviewed this file; I didn’t cross-check other specs. If you want the same pass against Inbox/Chat/Kanban for cross-doc contradictions, say which docs to include.
