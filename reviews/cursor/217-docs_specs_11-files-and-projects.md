Reviewed on-disk `docs/specs/11-files-and-projects.md` (includes **Rev 2**; Shell was blocked here so I could not verify blob `595fe13` bit-for-bit). Lens: **impeccable Operate** + **design-taste app-screen** rules (file browser / project overview is worked-in UI, not a marketing page).

---

### Verdict
The privacy *intent* (allowlist, opt-in AI, sandboxed preview, revoke-on-remove) is sound, but the doc still packages a **full desktop finder + project CRM + semantic search + agent handoff** without a single primary job, and it **contradicts its own privacy claims** on Stage-2 AI. As UI direction it currently points at the generated-dashboard failure mode (sparklines, tag pills, many equal actions).

---

### Contradictions (inside this doc)

1. **Privacy vs Stage 2**  
   Privacy: content leaves only when Jonas attaches it or an enabled workflow reads it.  
   Indexing: Stage 2 sends file content to a “cheap model” for summaries/tags (even if folder-opt-in). That *is* model access without attach. Opt-in does not make the Privacy sentence true.

2. **“Local embeddings preferred” vs the same Privacy line**  
   “Preferred” implies a cloud fallback is allowed; Privacy reads absolute. Unresolved when local model is missing/slow/fails.

3. **Open in Chat vs project attach (Rev 2)**  
   Actions: Open in Chat “sets `cwd` and context.”  
   Rev 2: attaching a project sends “manifest + on-demand reads, not the tree.”  
   Two different context models; which one Open in Chat uses is undefined.

4. **Read-only first vs Open in editor**  
   Open questions: read-only; edits via Hermes/CLI under approval.  
   Project actions include **Open in editor** with no “view-only / external / gated write” qualifier.

5. **Give to Hermes vs “through git (see 06)”**  
   Actions list Give to Hermes as first-class; Open questions say project files reach Hermes via git. Upload-of-file vs clone-of-repo is unresolved on this surface.

6. **“Excluded paths never appear in the index” vs query-time exclusion**  
   Acceptance says exclusions never index; Rev 2 adds query-time exclusion “as well.” That only makes sense if indexing can race, leak, or partially include — which undermines the acceptance claim unless framed as defense-in-depth with an explicit threat.

7. **Sources vs acceptance**  
   Sources include Cloud (v2). Acceptance only covers add-folder → detect projects → content search. Cloud is simultaneously in scope and out of done-when.

8. **NL search vs Stage 2**  
   “PDFs from last week about the API” needs structured filters (Stage 1) *and* semantic meaning (Stage 2). Spec never says whether NL search is blocked, degraded, or invents meaning when AI tagging/embeddings are off.

---

### Gaps

- **No screen question** (app-screens §2.2): overview? find a file? hand off to an agent? The purpose line tries to be all three.
- **No layout/IA**: tree + list/grid + preview + ask-box + project derived widgets — panes, default focus, keyboard model, and what wins on a laptop width are unspecified.
- **No states**: empty allowlist, first-index progress, Stage-2 backlog/budget exhausted, watcher errors, `gh` auth failure, preview unsupported type, revoke in progress.
- **Unbounded ops knobs**: size cap, ignore semantics, overlapping allowlist roots, symlinks/junctions, cloud placeholders, how many repos get dirty/`gh` polling.
- **Secret handling UX**: default exclude patterns named, but no “why is this missing?”, override, or false-positive recovery.
- **Revocation**: deletes index/FTS/summaries/embeddings; no mention of local DB backups, undo, or that summaries may already have left the machine if Stage 2 used a remote model.
- **“Ask about this file”**: size limit, binary/PDF extraction path, and whether secret-like files can be attached after being hidden from the index.

---

### Unrealistic scope (for one slice)

Bundled as one feature: allowlisted watcher, FTS, optional embeddings + AI tags, NL→structured search, git project intelligence (branch/dirty/`gh` PRs), language mix, **14-day sparklines**, Kanban/conversation/task links, three-source navigator, list+grid, rich preview, chat ask, Hermes handoff, editor open, revoke UX, plus Cloud later.

Especially heavy without bounds: **sub-second content search** over an unbounded allowlist; **per-repo `gh` PR state**; **background AI over every eligible file**.

---

### Security / privacy risks

| Risk | Why it matters |
|------|----------------|
| Stage-2 / embeddings exfil | Summaries and vectors *are* content derivatives; “cheap model” and non-local embeddings are the main leak path. |
| Second copy of data | FTS5 + caches retain plaintext of indexed files; disk encryption / backup of that DB is unstated. |
| Allowlist escape | Symlinks, `..` in on-demand reads, editor/Hermes paths outside the folder Jonas thought he added. |
| Preview surface | Sandboxed iframe (→12) is right; still need explicit bans on active PDF/JS, remote image loads, and treating preview as trusted UI. |
| Attach ≠ index policy | User can still send `.env`-like content via Ask / Open in Chat / Give to Hermes even when indexing hid it. |
| Hermes handoff | Remote VPS agent + local project is a trust-boundary moment; this doc doesn’t require an explicit “what will leave this machine” confirm. |
| `gh` / Cloud (v2) | Token scope, private repo metadata, Drive shared docs — not in this privacy section. |

Strong parts to keep: explicit allowlist, `.junosignore` + secret defaults, AI tagging opt-in per folder, revoke deletes derived data, project attach as manifest + on-demand (not whole tree), sandboxed preview.

---

### UI / design quality (Operate + app-screen lens)

**Hierarchy / job**  
Purpose and actions put four peers on equal footing (Chat, Hermes, editor, board) plus Ask-on-preview. App-screens want one question and one frequent job one click from the first screen; this reads as a kit of capabilities.

**Density**  
Tree + multi-column list (including AI tags) + preview + ask input is a classic three-pane manager. Without column priority, default sort, and a quiet meta tier, it will feel like an admin table with chrome in every corner.

**Dashboard tells to kill in the spec**  
- **14-day activity sparkline** on the project entity matches the banned “KPI tile + sparkline” pattern (colour/chrome, not a decision). Prefer last activity as type (`Today`, `6d`) or a single honest count.  
- **AI tags** as a default column + “badge on the folder row” invites pill clusters and low-contrast chips; treat tags as progressive disclosure after Stage 2, not primary ink.  
- **Language mix + linked Kanban + conversations + tasks** as always-on derived chrome turns Projects into a multi-widget home. Pick the one product-specific signal (e.g. dirty/PR, or linked Ready cards) and link out for the rest.

**Typography / legibility / contrast**  
No type roles. For this surface: page title ~18–24px, body/cells ~13–14px, meta ≥12px and ≥4.5:1 (not soft grey on `#f9fafb`). Paths and sizes need tabular figures / consistent truncation; monospace only for real paths/IDs if the product UI system already does that — not as decorative labels.

**Spacing / composition**  
Unspecified. App-screen tree guidance (indent, ~30px pitch, ink vs grey by level, no divider noise) and list rules (no zebra, one status mark, numbers right-aligned) should be named or deferred to `14-ui-system` with an explicit “this screen uses …” pointer. Grid view with no content rules will become icon cards.

**Motion**  
Only implied by background indexing. Need quiet status (indexed N / queue / AI on), not decorative motion. Any motion must respect `prefers-reduced-motion`; progress is visibility-of-status, not delight.

**Recognition vs recall**  
NL search is powerful but invisible: show applied filters (type, date, folder, AI on/off) as removable chips in ink, not only a magic query box.

**Emotional / high-stakes**  
Revoke and Give to Hermes are irreversible or exfiltrating; they need consequence copy and named-object confirm, not a generic modal. Privacy badge for “AI processing on” is good if it is readable status, not a candy pill.

---

### Highest-leverage spec fixes (still doc-only)

1. Rewrite Privacy to match reality: **indexing Stage 1 local-only; Stage 2 / embeddings / Ask / Hermes each named as explicit egress with defaults off.**  
2. Name **one primary job** for v1 (almost certainly: allowlist → find file by FTS → Open in Chat / attach). Park sparklines, language mix, grid, Cloud, and maybe `gh` PRs.  
3. Reconcile **Open in Chat / manifest attach / Give to Hermes / Open in editor** into one context + trust matrix.  
4. Bound acceptance: corpus size or time budget instead of blanket “within a second.”  
5. Specify **empty/indexing/AI-off/revoke** states and column hierarchy so implementers don’t invent a dashboard.

I can go deeper on a single pane (project list vs file browser vs preview/ask) or cross-check only the claims this doc makes against `06`/`12`/`14` if you want that next — still Ask-mode, review-only.
