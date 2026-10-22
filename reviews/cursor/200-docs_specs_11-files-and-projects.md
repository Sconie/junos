**Verdict:** Spec 11 is a workable v1 outline for an allowlisted file/project browser, but it underspecifies the Operate UI, leaves privacy boundaries porous, and packs too much “project intelligence” into one surface without a clear primary job.

Mode: **Operate** (file browser / project picker). Lens: impeccable Operate + design-taste app screens. No live UI — review of implied product only.

---

### Contradictions

1. **Privacy vs Stage 2 indexing**  
   Privacy says content goes to a model only when Jonas attaches it or an enabled workflow reads it; Stage 2 sends file content to a “cheap model” for summaries/tags (and optionally embeddings). Opt-in per folder softens this, but the default rule and Stage 2 still conflict unless Stage 2 is explicitly framed as a workflow Jonas enabled.

2. **“Secrets excluded by default” vs FTS5 / semantic search**  
   Stage 1 indexes text into FTS5; Stage 2 can embed. Rev 2 says query-time exclusion too — good — but the doc never says whether a renamed `.env`, secrets *inside* normal files, or previously indexed rows before an exclusion was added are scrubbed. Acceptance (“excluded paths never appear”) doesn’t cover content-level secrets.

3. **Read-only vs preview / attach / Open in Chat**  
   Open question: “Read-only first; edits only through Hermes or CLI.” Preview + “Ask about this file” + attach-to-chat are reads; Open in editor and cwd for a CLI model are not purely read-only. “Read-only” needs a scope (index/UI vs filesystem mutations).

4. **Project detection vs allowlist**  
   Sources: only explicitly added folders are indexed; git repos are “auto-detected as projects.” Unclear whether detection runs only inside allowlisted roots or can surface repos outside them (and thus whether path discovery leaks outside the allowlist).

5. **Attach payload**  
   Rev 2: attaching a project sends “a manifest plus on-demand reads, not the tree.” File browser still has tree/list/grid and “Ask about this file.” Manifest vs tree vs on-demand reads aren’t defined (depth, ignore rules, what the model can request next).

---

### Gaps (blocking for implementation)

| Area | Missing |
| --- | --- |
| **Primary job** | Purpose lists overview *and* handoff to model/Hermes. App-screen rule: one job first. Which wins on first paint — browse, search, or hand off? |
| **Empty / first-run** | No empty state when no folders are added; no “what gets indexed” copy; no failure if watcher/gh/`gh` auth fails. |
| **Error / loading** | No states for index lag, Stage 2 budget exhaustion, preview fail, sandbox fail, cloud v2 unavailable. |
| **Scale** | “Search finds a file by content within a second” — no corpus size, file-count, or machine assumptions. |
| **AI tags column** | Column always implied; tagging is opt-in. What shows when off? |
| **Sparkline / language mix / linked Kanban** | Derived fields named with no data contract, empty/zero treatment, or when they load. |
| **Actions** | Open in Chat, Give to Hermes, Open in editor, Show board — no priority, overflow, or when disabled. |
| **Preview** | Markdown/images/PDFs/code — no size limits, binary handling, or “too large / unsupported” UI. |
| **Cloud v2** | Listed in Sources with no auth, sync, or UI difference from local. |
| **Revocation UX** | “UI confirms what was removed” — no confirm copy, undo, or partial-failure behavior. |
| **`.junosignore` / secret patterns** | No format, no pattern list, no “why is this missing?” affordance. |
| **Design system** | No tokens, density, type scale, or pointer to `14-ui-system.md` for this surface. |

---

### Unrealistic scope

For a thin “files and projects” slice, the entity model already assumes: git metadata + dirty state + open PRs via `gh`, 14-day activity sparkline, language mix, linked Kanban/conversations/tasks, Stage 2 AI + embeddings, NL → structured search, sandboxed multi-format preview, chat attach protocol, and cloud connectors.

That’s several products (Finder + Spotlight + IDE project picker + semantic search + Drive). Risk: ship a crowded shell where nothing meets the 1s search acceptance, or Stage 2/PR enrichment distracts from allowlist + FTS.

**Sharper v1 cut (suggested):** allowlist folders → Stage 1 FTS + tree/list → project detect *inside* allowlist → Open in Chat / attach file. Defer: grid+AI tags, sparklines, language mix, PR badges, Stage 2, cloud, “Ask about this file” chrome on every preview.

---

### Security / privacy risks

1. **Local embeddings “preferred”** — not required. Cloud embeddings = bulk content leave the machine; needs hard default + visible folder badge (Rev 2 badge is only “AI processing on,” not where).

2. **Watcher + index as a side channel** — allowlisted trees still hold secrets in non-dotfile names; “secret patterns” on path alone is weak. No mention of redaction before Stage 2 or of never sending excluded paths to any model API.

3. **Preview in sandboxed iframe** — right direction (points at 12); missing: CSP, `sandbox` flags, no same-origin bridge, PDF/JS in markdown, `file://` or blob URL rules.

4. **“Ask about this file” / attach** — path, size, and content go to whichever chat model is configured (possibly remote). No size cap, no confirm for large/sensitive mime types, no audit of what left the machine.

5. **Open in Chat sets `cwd`** — powerful; needs same approval story as terminal/Hermes (cross-spec), and warning when cwd is large or contains secrets.

6. **Revocation** — deleting index rows is necessary but not sufficient if summaries were already sent to a remote model or logs; doc is silent on remote retention.

7. **`gh` for open PRs** — network + token use from a file browser; surprise privacy surface if not gated.

---

### UI / design quality (implied surface)

Surface shape: **tree + list/grid + preview + search + project enrichment** — classic dense Operate screen. Against impeccable Operate and design-taste app screens:

**Hierarchy / IA**  
Three roots (Projects / Local / Cloud), four project actions, AI tags, sparkline, Kanban links, and preview chat input compete for “what is this screen for?” First paint should answer one question (e.g. “which project do I hand to the model?”) with search and handoff one click away — not a dashboard of derived metrics.

**Density**  
Columns `name, project, size, modified, AI tags` plus optional grid and preview pane is a lot for a default. App-screen guidance: tables as rules and alignment, no decorative chrome; KPIs as type not tiles — a 14-day sparkline on every project row is exactly the template tell to avoid unless activity *is* the job.

**Typography**  
Unspecified. Operate wants a tight rem scale (one family, ~1.125–1.2 steps), not marketing-size titles. Paths and code in preview need a clear mono *only* for code (design-taste: no monospace outside real code). Spec should say preview body vs chrome type roles or inherit 14.

**Spacing / layout**  
Tree | list | preview is fine if one primary pane owns width and the others are subordinate. Spec doesn’t say default split, collapse rules, or phone/narrow behavior (app-screens §12). Risk: three equal panes → everything medium, nothing scannable.

**Motion**  
Operate: 150–250ms, state only — no page-load choreography. Spec is silent (good if inherited); don’t animate sparklines or Stage 2 “tagging…” in ways that feel like marketing motion.

**Legibility / contrast**  
AI tags, dirty-state, PR counts, and “AI on” badges will land as chips/eyebrows if unspecified — design-taste bans tiny tracked uppercase labels and pill clusters on marketing pages; on app screens, quiet badges are OK only if secondary and high-contrast enough. Folder “AI processing” badge needs explicit secondary treatment so it doesn’t read as primary status.

**States the UI must design (currently absent)**  
- No folders allowlisted  
- Indexing in progress / Stage 2 budget hit  
- Search zero results vs excluded-by-policy  
- Preview unsupported / too large / sandbox blocked  
- Cloud v2 not connected  
- Project with no git / `gh` unavailable  

Empty states should use product language (“Add a folder Jonas works in”), not “No items.”

**Anti-patterns this spec invites**  
Icon-topped “project cards,” sparkline KPI tiles, gradient activity charts, badge rows for language mix + PRs + AI tags, and a chat input glued under every preview (always-on chrome). Prefer: one dense list, selection → preview, explicit “Ask” / “Open in Chat” actions, enrichment behind a detail drawer or project header — not every row.

---

### Priority fixes to the doc

1. Resolve the Stage 2 vs “content only when attached” rule in one sentence (opt-in folder = enabled workflow; local-only embeddings default).  
2. Name the **one primary job** and cut or phase derived project chrome.  
3. Define allowlist vs git auto-detect so nothing outside allowlisted roots is discovered or indexed.  
4. Specify attach/manifest, preview sandbox constraints, and sensitive-file confirm.  
5. Add empty/loading/error/excluded search states and a minimal layout (panes + default columns).  
6. Make the 1s search criterion measurable (e.g. N files / corpus size).

---

I’m in Ask mode, so this is review-only. If you want the same lens applied to `12-security-and-privacy.md` or `14-ui-system.md` for cross-spec alignment, say which next.
