**Verdict:** The spec is a solid privacy-first indexing brief, but it under-specifies the *Operate* screen (one job, hierarchy, density, states) while packing dashboard-ish project chrome and unresolved privacy edges around Stage-2 AI.

Mode for this surface: **Operate** (impeccable) / **app screen** (design-taste). Critique is of the doc only—no live UI, no detector.

---

### Contradictions

1. **Allowlist vs auto-detect.** Sources say nothing is indexed outside explicitly added folders, then “Git repos (auto-detected as projects).” Unclear whether detection is only *inside* allowlisted trees or a machine-wide scan. That changes both trust and scope.

2. **Privacy vs Stage 2.** Privacy: content reaches a model only when Jonas attaches it or an enabled workflow reads it. Indexing: optional AI summaries/tags via a “cheap model,” plus embeddings. Even with “AI tagging opt-in per folder,” summaries/embeddings *are* model reads. Local-vs-cloud is hand-waved (“preferred local”), so the privacy sentence overclaims.

3. **AI tags column vs opt-in.** Browser columns include “AI tags” as if first-class; tagging is opt-in per folder. Spec never says: hide column, empty state, or how search behaves without tags.

4. **Acceptance vs NL search.** Acceptance: content search “within a second” after add. NL example (“PDFs from last week about the API”) needs filters + semantic Stage 2, which is budget-limited/background. One-second FTS ≠ one-second semantic/NL.

5. **Read-only vs actions.** Open question proposes read-only; actions include “Open in editor” and “Give to Hermes.” Fine if editor/Hermes are the only writers—but the doc doesn’t say that, so implementers can invent in-app edit.

6. **Cloud in Sources, absent from acceptance.** Cloud is “v2” in Sources but still listed as a first-class tree root. Ship surface looks like three sources; v1 criteria only cover local add.

---

### Gaps (product / IA)

- **One screen question.** Purpose is both “overview of files and projects” and “fast handoff to a model/Hermes.” App-screen craft wants *one* primary job on the first screen and that job one click away. Spec never picks primary vs secondary (search-first? project picker? attach-to-chat?).
- **Project ↔ folder relationship.** How a `project(path)` is born from allowlist roots, nested repos, or multiple checkouts of the same `repo_url` is undefined.
- **What “Give to Hermes” / “Open in Chat” send.** Path only? Tree? Ignore rules? Diff? Dirty files? Size caps on attach?
- **Operational UX:** indexing progress, pause/budget, failures, partial index, empty allowlist, permission denied, huge trees, symlink/junction behavior.
- **Defaults:** size cap, secret patterns beyond `.env`/“key files,” `.junosignore` precedence vs built-in ignores.
- **Linked objects** (Kanban, conversations, tasks) named on the entity with no navigation or empty rules.
- **Responsive / a11y / keyboard:** tree+list+preview is a classic trap; doc is silent.

---

### Unrealistic scope

For one surface, the doc stacks: allowlisted watcher + FTS + optional embeddings/summaries + NL search + git metadata/`gh` PRs + language mix + 14-day sparkline + linked boards/chats/tasks + list *and* grid + rich preview (md/image/PDF/code) + inline “Ask about this file” + Cloud v2. That’s several products. Without a hard v1 cut (e.g. allowlist + FTS + project open-in-chat + list+preview; defer grid, sparkline, language mix, semantic, Cloud, PR counts), craft and schedule will both slip into generic “AI file manager” chrome.

“Within a second” after add, for content search on a large tree, is an acceptance landmine unless scoped (e.g. FTS on files under N MB already staged).

---

### Security / privacy risks

| Risk | Why it matters |
| --- | --- |
| **Stage 2 “cheap model”** | If remote, summaries/tags leave the machine while Privacy reads like attach-only. Needs explicit: local-only vs cloud, and what leaves. |
| **Embeddings + FTS store content** | Local index is still a sensitive corpus (paths, snippets). Multi-user OS accounts, backups, and export aren’t mentioned. |
| **Secret excludes are thin** | `.env` / “key files” miss common leaks (`*.pem`, `id_rsa`, `credentials.json`, `.npmrc`, cloud creds). Stage 1 FTS can index secrets before anyone “attaches.” |
| **Symlinks / junctions** | Watcher on allowlist can follow links *outside* the allowlist unless forbidden. |
| **`gh` open PRs** | Network + token; PR titles/bodies in UI are a side channel; offline/unauth behavior undefined. |
| **“Ask about this file”** | Preview of PDF/image doesn’t equal safe attach (size, binary, redaction). Path/`cwd` handoff to CLI models needs safe quoting and approval alignment. |
| **Content-hash summary cache** | Hash collisions / replaced files with same hash are edge cases; more importantly, cache retention and wipe-on-remove-folder aren’t specified. |

Allowlist + `.junosignore` + opt-in tagging are the right bones; the doc doesn’t close the loop between those and Stage 1 text indexing.

---

### UI / design-quality (hierarchy, spacing, type, density, motion, legibility, contrast)

Lens: impeccable **Operate** (scanability, restraint, state motion 150–250ms) + design-taste **app screens** (colour on data not chrome; no KPI sparklines/tiles; flat surfaces; product face without dashboard costume; honest empty/zero/loading; first screen shows the job).

**Hierarchy / IA**

- No stated first-screen composition: tree vs results vs project overview vs preview. Risk: three-pane default with equal visual weight and four peer actions (Chat / Hermes / Editor / Board)—past a comfortable decision set without a primary action.
- “Ask about this file” docked under preview creates a second chat surface competing with product Chat; hierarchy and when to escalate to full Chat are unspecified.

**Density / layout**

- File browsers want dense, aligned lists (app-screen tables: rules + alignment, not zebra/card grids). “List and grid” without rules invites icon-card grids and thumbnail chrome—the generated-dashboard adjacent failure mode.
- Preview-everything (md/image/PDF/code) without pane proportions, collapse behavior, or “preview unavailable” will fight the list for space on laptop widths.

**Typography / contrast / legibility**

- Columns “AI tags,” language mix, dirty state, PR counts → badge/pill clusters and soft-grey secondary text. App-screen rules: running data in full ink; colour for meaning (dirty vs clean, failing index), not decorative tags. Spec doesn’t define tag visual language (count caps, wrap, contrast).
- Project “language mix” + sparkline reads as KPI ornament. Design-taste explicitly: **KPIs are type, not tiles; no sparkline on a KPI.** Prefer last commit / dirty / branch as type, not a 14-day chart unless it’s the screen’s one data question.

**Motion**

- Live watcher updates with no debounce/batching → list jitter. Operate motion should signal state (indexing, dirty refresh), not perpetual reshuffle; `prefers-reduced-motion` unmentioned.
- No guidance against orchestrated “AI indexing complete” celebrations.

**Empty / loading / error (craft floor)**

- Spec acceptance assumes a folder is added and search works. Empty allowlist, first-run “add a folder,” indexing skeleton vs spinner, and “excluded by secret pattern” feedback are unspecified—exactly where Operate UIs feel unfinished or untrustworthy.

**Product face vs kit**

- Entity fields (sparkline, language mix, linked cards) push implementers toward generic project dashboard cards. Nothing in the doc demands a Junos-specific signature (e.g. handoff-to-Hermes as the one obvious control, trade words like “Allowlisted” / “Not indexed” instead of “Items” / “Records”).

---

### Highest-leverage fixes (spec only)

1. **Pick v1 job:** e.g. “From an allowlisted tree, find a file and Open in Chat / Give to Hermes”—defer Cloud, grid, sparklines, language mix, semantic Stage 2, PR badges.
2. **Rewrite Privacy** to cover Stage 1 local corpus + Stage 2 local/remote explicitly; make AI columns conditional on opt-in.
3. **Resolve auto-detect:** only git roots *under* allowlisted paths.
4. **UI brief in Operate terms:** primary action, list density, preview secondary, no project KPI tiles/sparklines, empty/indexing states, motion = state only, ≤1 accent on actionable handoff.
5. **Harden excludes + symlink policy + attach size/approval** before “Ask about this file” ships.

---

Questions skipped: full impeccable dual-agent critique / detector (no implementable UI target; Ask mode; doc-only review as requested).
