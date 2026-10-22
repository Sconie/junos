**Verdict:** Spec is a capable *capability* sketch for an Operate surface (file browser + project hand-off), but it under-specifies the UI job and over-commits on entity chrome, cloud, and AI index features—exactly the pattern design-taste warns against for app screens (KPI/sparkline decoration, thin first screen, no states).

Mode: **Operate** (impeccable) / **app screen** (design-taste). Not a marketing page.

---

### Contradictions

1. **Privacy vs Stage 2 indexing**  
   Privacy: content reaches a model only when Jonas attaches it or an enabled workflow reads it. Indexing: Stage 2 sends files to a cheap model for summaries/tags (opt-in per folder). That can be consistent if “opt-in folder = enabled workflow,” but the doc never says so. Same tension for embeddings: “local preferred” implies cloud embeddings exist without saying when content leaves the machine.

2. **“Ask about this file” vs attach-only**  
   Preview’s ask-input “uses the chat model with the file attached” is a quiet always-on attach path. Fine if intentional; it clashes with the stronger privacy framing unless attachment is explicit and visible each time (size, path, model destination).

3. **Read-only first vs rich actions**  
   Open question proposes read-only; Project already lists Open in Chat, Give to Hermes, Open in editor, Show board. Unclear whether “read-only” means the tree (no rename/delete) or the whole surface (actions still mutate via Hermes).

4. **Sources vs navigation**  
   Tree is Projects / Local folders / Cloud, but Git repos are both “auto-detected as projects” and possibly under Local. Overlap (same path as project and folder) is undefined.

5. **Acceptance vs cloud**  
   Acceptance is local-only (“add a folder… within a second”). Cloud is “v2” with no acceptance bar—either cut from v1 narrative or accept that the Sources section oversells the shippable surface.

---

### Gaps (product + UI)

| Gap | Why it matters (Operate / app-screens) |
|---|---|
| **One job / first question** | Purpose names two jobs. App-screens: first screen must answer one question and put the most frequent job one click away. Is that “find a file,” “pick a project for Chat,” or “overview activity”? |
| **IA & density** | Tree + list/grid + columns + preview + ask-bar + project actions + sparklines + Kanban/conversations links = multi-pane IDE density with no layout, breakpoints, or primary vs secondary. |
| **States** | No empty (no folders yet), loading/indexing progress, watcher errors, permission denied, huge-tree truncation, offline `gh`, preview failure, semantic-search cold start. App-screens treat honest empty/zero/loading as required. |
| **Selection & multi-select** | Hand-off to Hermes/Chat for one file vs folder vs many files unspecified. |
| **Preview scope** | PDFs/images/code/md—binary, huge files, password PDFs, SVG/XSS in preview? |
| **“AI tags” column** | When opt-in is off: empty, hidden, or stale? |
| **Natural-language search UX** | Pipeline described; not the control (omnibox vs filter chips vs chat), error when parse fails, or how structured filters are shown/edited. |
| **Responsive / phone** | Zero. Even desktop-first needs collapse rules for tree + preview. |
| **Motion** | None. For Operate that’s mostly good (impeccable: 150–250ms state motion only)—but indexing/progress and pane open/close still need a deliberate, non-decorative budget. |
| **Visual system** | No type scale, density (comfortable vs compact), tone steps, selection chrome, or preview typography. Spec jumps to sparkline ornament before shell. |

---

### Unrealistic scope

- **Project as dashboard hub:** language mix, 14-day activity sparkline, linked Kanban, conversations, tasks—plus four outbound actions. That is a project *home*, not a file browser row. Design-taste: KPIs as type not tiles; **no sparklines on KPIs**; colour on data not chrome. A sparkline on every project is classic generated-dashboard tell and expensive to keep honest (dirty git, `gh` PR count, activity definition).
- **Stage 1+2+embeddings+NL→structured filters** in one slice, with “search finds by content within a second” as acceptance—credible for FTS5 on a capped allowlist; much less so once AI tags/embeddings are implied in the same UX.
- **Cloud v2** in Sources without boundaries (Drive auth, sync model, partial index, rate limits) inflates the mental model of v1.
- **Full preview suite** (especially PDF) is a product of its own; often ships as “open externally” first.

---

### Security / privacy risks

1. **Allowlist ≠ safe content** — Indexing text of allowlisted trees still pulls secrets in unusual paths (`config/secrets.yml`, `*.pem` not named, clipboard dumps, `.env.local` variants). “Secrets patterns” need an explicit denylist + fail-closed behavior (never Stage 1 FTS either, or redact).
2. **Embeddings / cheap-model Stage 2** — Even opt-in: which provider, retention, PII in paths/filenames, can tagging be revoked and purged from DB?
3. **`gh` open PRs** — Network + token scope; failure and privacy (private repo metadata in UI) unstated.
4. **Preview of untrusted files** — Markdown/HTML/SVG in a desktop webview is an XSS/exfil class of bug if not sandboxed.
5. **“Give to Hermes” / Open in Chat** — cwd + context attachment: path traversal, symlink escape outside allowlist, attaching `.env` via “Ask about this file” despite exclude-from-index.
6. **Watcher** — chokidar on large trees: resource exhaustion; ignore rules must be enforced before any read for FTS.
7. **Content-hash cache** — Fine for summaries; clarify that hash cache doesn’t re-send to cloud on every view, and that deleting a folder purges index rows.

---

### UI / design-quality problems (hierarchy, spacing, typography, density, motion, legibility, contrast)

Framed as **what the doc implies if built literally**:

1. **Hierarchy collapse** — Project entity chrome (sparkline, language mix, linked boards) competes with the primary task (pick file/project → hand to model). App-screens: no hero header; first screen shows the job’s objects and controls, not vanity metrics.
2. **Density without a density decision** — Columns `name, project, size, modified, AI tags` + tree + preview + ask input is three regions. Without a default focus (e.g. list-first, preview on demand; project actions in a detail drawer), you get a crowded VS Code clone with weaker IA.
3. **Typography unspecified** — Operate wants a tight rem scale, one family, labels readable; preview code/md needs its own measure and contrast. Spec never separates chrome type from content type.
4. **Sparkline / “AI tags” as costume** — Colourful tags and activity charts on a file manager read as dashboard slop (design-taste §KPI/charts). Prefer quiet status (dirty · N PRs · last commit) in full ink; hue only for actionable state.
5. **Grid view** — Unmotivated for mixed files/projects; risks icon-card grids the house style rejects. Prefer list as default; grid only for image-heavy folders if ever.
6. **“Ask about this file” docked under preview** — Easy to miss hierarchy (is chat primary or secondary?). Risk of a permanent secondary chat competing with main Chat. Clarify as contextual action, not a second product surface.
7. **Legibility / contrast** — AI tags, sparklines, dirty-state badges invite soft grey secondary text and low-contrast chips. Spec should require running text and primary names in full ink; tags as sparse metadata, not a rainbow column.
8. **Motion** — If implementers “delight” indexing with orchestrated load motion, that fights Operate rules. Spec should ban decorative motion; allow only progress and selection feedback.
9. **Empty state** — Acceptance starts at “add a folder” but doesn’t design the zero state (impeccable onboard/harden reflex). That’s the emotional valley of this feature.
10. **Product face missing** — Spec could belong to any “AI file picker.” No Junos-specific object or ritual (e.g. “hand to Hermes” as the one signature control). design-taste: one element only this product has.

---

### Priority fixes for the doc (not implementation)

1. **Pick v1 job:** allowlisted local + git projects → search (FTS) → Open in Chat / Give to Hermes. Defer cloud, embeddings, sparklines, Kanban links, grid, PDF preview.
2. **Reconcile privacy** in one paragraph: what never leaves disk, what opt-in folder enables, what “Ask about this file” sends, purge on remove.
3. **Specify the Operate layout:** regions, default density, selection model, empty/loading/error, preview whitelist, no sparkline KPIs.
4. **Resolve read-only** against the action list.
5. **Narrow acceptance** to FTS + cwd hand-off; treat Stage 2 as a separate opt-in milestone.

I’m in Ask mode, so this is review-only. If you want this written into `reviews/cursor/…`, switch to Agent mode.
