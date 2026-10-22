**Spec critique (doc only):** this is an Operate-mode file/project surface. The doc names a clear job (“hand anything to a model or Hermes”) but specifies a full desktop file manager plus project dashboard plus AI index — without deciding primary hierarchy, states, or hard privacy boundaries.

---

### Contradictions

1. **Privacy vs Stage 2** — “Content is only sent to a model when Jonas attaches it or a workflow he enabled reads it” sits next to always-available Stage 2 summaries/tags/embeddings via “a cheap model,” with only “local preferred.” Opt-in tagging does not clearly cover embeddings or whether the cheap model may be cloud.
2. **Allowlist vs auto-detect** — Sources say only explicitly added folders are indexed, then “Git repos (auto-detected).” Unclear whether detection is only inside the allowlist or can surface repos elsewhere.
3. **v1 acceptance vs Cloud in Sources** — Cloud is in the source tree (`Projects / Local / Cloud`) while acceptance criteria are local-only. Shipping Cloud as a pane that doesn’t work (or indexing cloud in v1) contradicts the stated Done bar.
4. **“Within a second” vs NL + semantic search** — FTS on Stage 1 can plausibly hit ~1s; “PDFs from last week about the API” needs Stage 2 + structured filters and will miss that bar until indexing catches up. The acceptance criterion doesn’t distinguish “filename/content FTS” from “NL + semantic.”
5. **Read-only first vs actions** — Open question proposes read-only UI, but actions (`Give to Hermes`, `Open in Chat` with `cwd`) are write-adjacent under approval policy. Indexing itself is a write to SQLite. “Read-only” needs a precise object (disk vs index vs agent tools).

---

### Gaps (spec is silent where an Operate screen needs decisions)

| Gap | Why it matters |
|---|---|
| Empty / first-run | No folders yet: what is the one job on first paint? |
| Index lifecycle | Progress, budget remaining, paused, failed, stale, partial results while Stage 2 runs |
| Size cap / “build output” | Unspecified numbers and globs → inconsistent ignore behavior |
| Symlinks / junctions | Classic allowlist escape; not mentioned |
| Preview failures | Unsupported type, password PDF, huge file, binary mistaken as text |
| Selection model | Single file vs multi-select for “hand to Hermes”; what travels (path, summary, full text)? |
| `Give to Hermes` vs `Open in Chat` | Different payloads, autonomy, and cwd expectations undefined |
| Where derived project fields live | Language mix, sparkline, linked cards/conversations — card? inspector? row chrome? |
| Search UX | Query language, filters UI, ranking when FTS and semantic disagree |
| Errors | `gh` missing/unauth, path deleted, permission denied, watcher crash |
| Density / breakpoints | No phone/narrow layout; three-pane + preview will collapse badly |
| Motion / feedback | No guidance for selection, attach, index refresh (Operate: 150–250ms state motion only) |

---

### Unrealistic scope

Bundled into one surface without a cut line:

- Tree + list **and** grid + preview suite (md / image / PDF / code) + inline “Ask about this file”
- Project CRM fields (language mix, 14-day sparkline, Kanban, conversations, tasks, open PRs via `gh`)
- Full NL → structured filter + FTS + embeddings pipeline with budget limits

For v1, the doc’s own acceptance criteria only need: allowlist folder → detect projects → FTS find by content → Open in Chat with cwd → exclusions honored. Everything else is a second product.

**App-screen lens:** a 14-day activity sparkline on the project entity is the template tell this skill explicitly rejects (colour/chrome on vanity metrics, not on the job). Language mix is the same class unless it drives a concrete action.

---

### Security / privacy risks

1. **Local index ≠ “not sent to a model”** — Stage 1 FTS stores file text in SQLite. Spec never covers encryption at rest, DB location, export, backups, or wiping when a folder is removed from the allowlist.
2. **“Preferred” local embeddings** — Soft language; a cloud fallback for Stage 2 is an exfil path on an opt-in that users will read as “stays on machine.”
3. **Secret patterns are path-shaped** — `.env` / key files miss secrets in `config.json`, `.npmrc`, committed history, notebooks, screenshots. No redaction before FTS or before attach.
4. **cwd + agent tools** — Open in Chat / Give to Hermes with project cwd is the real privilege boundary; approval policy is only an open question here, not a requirement of this screen.
5. **`gh` for open PRs** — Network + token; scopes and failure modes absent. Surfacing PR metadata may leak private repo existence in shared UI later.
6. **Cloud (v2)** — Drive/GitHub-not-cloned with Stage 2 is high-risk if mentioned in Sources without a hard “no cloud model on cloud files” rule.
7. **Watcher scope** — Without symlink policy and hard path containment, “allowlist” is weaker than it reads.

---

### UI / design quality (hierarchy, density, type, motion, legibility)

**Mode:** Operate (task UI). Ambition should be precision and scanability, not expression.

**Primary-job failure** — Purpose states two jobs (overview *and* hand-off). App-screen rule: first screen answers one question and puts the frequent job one click away. Spec never picks which wins: browse tree, search, or attach. Without that, you get a three-pane Finder clone with AI chrome.

**Hierarchy / density risks implied by the column set**

- Columns `name, project, size, modified, AI tags` put tags (secondary, often empty until Stage 2) at equal weight with name/modified → chip clutter, tiny labels, weak scan path.
- Grid + list + preview + ask-box is four competing focus regions; no default density or when grid is allowed (grids invite card-slop on file UIs).
- Project entity packs sparkline + language mix + linked board/chat/tasks → dashboard-inside-browser; Home already has “Recent projects and files” (per sibling specs) — this screen should not re-hero vanity metrics.

**Typography / legibility** — No type roles (path mono vs UI sans, preview measure, code size). Preview + “Ask…” input “at the bottom” risks a squeezed preview and a chat strip competing with the file name. Operate guidance: one family, tight scale, prose measure for markdown preview (~65–75ch), not full-bleed chat width.

**Spacing / composition** — Tree | list | preview with no widths, collapse rules, or “preview optional until selection.” Classic empty half-pane problem when nothing is selected.

**Motion** — Unspecified. Risk of decorative index animations or entrance choreography; need only state feedback (indexing pulse, selection, attach confirmation) with `prefers-reduced-motion`.

**Contrast / chrome** — AI tags and git dirty/PR badges invite multi-hue pills. App-screen house style: colour on data that needs a decision (dirty? secrets excluded? index failed?), not on every tag chip.

**Copy / affordances** — “Ask about this file” is clear; “Give to Hermes” / “Show board” need outcome copy (what Hermes receives; board empty state). No empty-state teaching copy for zero allowlisted folders.

**design-taste “tells” this spec invites if built literally**

- Icon-rail tree + KPI-like sparklines + tag chips + dual view toggles + cloud section before it works  
- Feature-complete file manager instead of one signature element for *this* product (e.g. “attach to chat/Hermes” as the persistent primary action on selection)

---

### Highest-leverage cuts (if the doc were revised)

1. **One job for v1:** search allowlisted files → select → Open in Chat / Give to Hermes. Preview and project CRM are secondary.
2. **Hard privacy:** Stage 2 off by default; embeddings local-only or absent in v1; document SQLite retention and un-allowlist wipe; symlink jail.
3. **Acceptance:** split “FTS &lt;1s” from “NL/semantic when Stage 2 ready”; drop Cloud from the navigator until v2.
4. **UI:** list-first, preview on demand; tags not a default column; no sparkline; one primary action on the selection; define empty/indexing/error states.
5. **Resolve read-only:** UI doesn’t mutate disk; agents mutate only under approval policy named as a dependency, not an open question.

---

**Verdict:** Strong problem statement, underspecified Operate screen. The dangerous parts are soft privacy language around Stage 2, an unbounded file-manager scope vs thin acceptance criteria, and a layout that will ship as dense AI-Finder unless the primary job and states are written down.

I didn’t run live UI critique tooling — this is document-only, as requested. Switch to Agent mode if you want this written into `reviews/`.
