## Findings (ranked)

### 1. High — Styling choice locks in anti-slop / craft-floor violations
**Ref:** Tech choices → *“Styling | Plain CSS with tokens (see 14) | keep as-is, no framework”*

**Why:** `14-ui-system.md` is “Translucent Glass”: `--bg-glow` radial **gradients**, `backdrop-filter` **glass**, violet `#8B5CF6`, Inter. That directly conflicts with design-taste house rules (no glass/blur, no gradients, no assistant violet/indigo) and app-screen guidance (flat opaque surfaces; Inter-as-default = kit look). Architecture’s “keep as-is” also conflicts with current `src/index.css` (flat panels, blue accent `#7c9cff`) and with `13` Phase 0 (“Adopt the Translucent Glass tokens”). The architecture doc is the tech contract; pointing at 14 without a craft gate freezes a generic AI-dashboard look into the stack.

**Fix:** In `01`, replace the Note with an explicit Operate-mode constraint: plain CSS tokens only; opaque panels + tone steps; one ground / one ink / one accent chosen for JunOS (not violet glass); no glass/blur/glows; type not Inter-by-default. Point 14 at that contract (or mark glass as mock-only / deferred). Resolve “keep as-is” vs “adopt Stitch” in one sentence.

---

### 2. High — Auth surface under-specified vs threat model
**Ref:** Shape → *“HTTP + SSE/WebSocket (localhost, token-protected)”*; Why not hosted → Tailscale “later”

**Why:** `12-security-and-privacy.md` requires bind `127.0.0.1`, bearer token + pairing URL, strict CORS/Host checks. Architecture only says “token-protected,” which is how localhost daemons get DNS-rebinding / drive-by abuse. Optional Tailscale without restating “same token + private tunnel only” invites a later half-secure remote path.

**Fix:** Add a short “Daemon boundary” bullet: bind loopback only; bearer from `~/.junos/token`; UI pairing; CORS/Host rules; remote = tunnel + same auth (link 12). Drop or annotate WebSocket until chosen (see #3).

---

### 3. High — Transport contradiction (SSE vs WebSocket)
**Ref:** Shape line 6 vs Event bus → *“Append-only `events` table, SSE to the UI”*; also `04`/`13` (SSE only)

**Why:** Dual transport doubles client state, reconnect, and auth for streaming runs. Specs elsewhere assume SSE. Leaving both open is scope creep and ambiguous security (WS Origin handling differs).

**Fix:** Pick one in Shape and Event bus (SSE to match 04/13). If WS is needed later, open question only—not the primary pipe.

---

### 4. High — File indexer / watcher with no privacy boundary in the diagram
**Ref:** Shape → *“File indexer / watcher”*; Reliability → *“Output of runs is stored…”*

**Why:** `11-files-and-projects.md` scopes indexing to an allowlist, ignores secrets, opt-in AI tags. Architecture lists a watcher as a first-class daemon piece with no allowlist / non-goals. Combined with “UI cannot touch filesystem; daemon can,” this is the highest local data-exfil risk (Scout/workflows can read indexed content). Run output retention without retention/redaction pointer also conflicts with 12’s redaction stance.

**Fix:** Annotate the Shape line: “allowlisted folders only; see 11/12.” Add one reliability/privacy rule: run payloads redacted; retention = backup policy in 02; no secret paths in the index.

---

### 5. High — Unrealistic “full product in one process” vs phased roadmap
**Ref:** Shape (API, bus, scheduler, workflows, all providers, Hermes, indexer, Scout) vs `13` Phases 0–4; Open questions (Tauri/launchd)

**Why:** The diagram reads as Phase-4 completeness. That fights `13`’s “one end-to-end path first” and invites building adapters/Hermes/Scout before chat works. Provider `id` union already includes `'grok'` while `03` marks Grok **low confidence**.

**Fix:** Split Shape into “Phase 1 core” (API, bus, SQLite, Claude/Codex adapters, auth) vs “later modules.” Make `ProviderAdapter.id` `'claude' | 'codex' | …` extensible (or comment grok as spike-gated). Align monorepo move with `13` Phase 0 (see #8).

---

### 6. Med — Incomplete / inconsistent event model
**Ref:** Event bus event types list; table name `events` vs `02` table `event`

**Why:** `05` triggers need `kanban.card.moved`, `inbox.item.approved`; Hermes approvals/memory/activity aren’t listed; naming `events` vs `event` will fork schema work. Claiming Inbox/Home are “queries over events” undersells that `02` already materializes `inbox_item`, `kanban_card`, etc.—easy to build a dual-write mess.

**Fix:** Rename to match `02` (`event`). Expand the type list (or say “canonical list in 02 + appendix catalog”) including approval/Hermes/workflow. Clarify: events are the audit/stream; screens read materialized tables updated by the bus.

---

### 7. Med — Provider contract over-specified; Hermes/indexer under-specified
**Ref:** Provider adapter interface (full TS); Shape lists Hermes bridge + File indexer with no interface

**Why:** Adapters get a clear boundary; Hermes has a full contract in `06` but architecture doesn’t point to it; indexer has none. Teams will invent parallel APIs. `RunRequest` tools/systemPrompt also skip the approval/cwd allowlist story from 04/12.

**Fix:** Add one-liners + links: Hermes bridge = wire format in 06; indexer = allowlist + stages in 11. Note on `run`: tools gated by 12 approval classes; `cwd` must be project-allowlisted.

---

### 8. Med — Repo layout timing contradicts roadmap
**Ref:** *“Migrate by moving `src/` into `apps/web` once the daemon exists (Phase 1).”* vs `13` Phase 0: convert to `apps/web` + `apps/daemon` + `packages/shared` first

**Why:** Two different “start here” orders; shared Zod package can’t land cleanly if UI stays flat `src/` until Phase 1.

**Fix:** Match `13`: monorepo + mock API in Phase 0; daemon implementation in Phase 1. One sentence in both docs.

---

### 9. Med — Catch-up / reliability naming drift
**Ref:** Reliability → *“`skip`, `run once`, or `run all missed`”* vs `05` → *“`skip` | `run once` | `run all`”* (+ overlap/retry policies missing here)

**Why:** Architecture claims “reliability rules” but omits overlap and retries that prevent duplicate burns of subscription budget (`03` usage budget). Naming drift causes schema enums to fork.

**Fix:** Use `05`’s exact enum; add “overlap + retries: see 05; budget yield: see 03.”

---

### 10. Med — No Operate-mode UI architecture (hierarchy / shell / density)
**Ref:** Doc covers process topology only; UI reduced to Vite/React/TanStack/Zustand + “see 14”

**Why:** Through impeccable Operate mode and design-taste app-screens: a command center lives or dies on shell IA, one primary job per screen, quiet chrome, product-specific face—not only CSS tokens. Overview lists ~11 screens; current `App.tsx` is a 220px labeled rail with emoji icons—architecture never constrains rail density, badge hierarchy, or “no KPI-tile / icon-card dashboard” patterns that `05`’s “grid of cards” and `14`’s Card-heavy component list encourage.

**Fix:** Add a short “UI shell (Operate)” subsection: single shell owns nav + offline-daemon banner; icon rail only with text/tooltip a11y; colour on status data not chrome; ban dashboard tells (icon-in-tinted-square KPIs, glass nav, emoji as nav). Defer marketing/Persuade patterns. Point screen layouts to per-spec docs, not Stitch glass as architecture.

---

### 11. Med — “Secrets must not live in browser storage” without pairing/state story
**Ref:** Shape rationale paragraph

**Why:** Correct principle, but UI still needs a durable session to the daemon. Without pairing (12), implementers will put the bearer in `localStorage`—the failure mode the sentence warns about.

**Fix:** State the allowed path: one-time pairing → memory/session only, or OS-backed store; never `localStorage` for the daemon token; link 12.

---

### 12. Med — Process execution (`execa` / pty) without sandbox pointer
**Ref:** Tech choices → *“`execa` for CLIs, pty only where a CLI demands it”*

**Why:** This is the agent attack surface (prompt injection → shell). `12` defers sandbox to Phase 4; architecture presents pty as a neutral tech choice with no approval/allowlist gate.

**Fix:** Note: CLI/pty only via adapters + approval policy (12); unrestricted shell = Phase 4 sandbox; default deny outside allowlist.

---

### 13. Low — DB driver left as “better-sqlite3 or libsql”
**Ref:** Shape → Event bus + SQLite line; Tech table → “SQLite (WAL)” only

**Why:** Two drivers imply different deploy/sync stories (libsql remote is a privacy footgun for a “local first” product).

**Fix:** Pick one for v1 (e.g. better-sqlite3, single file `~/.junos/junos.db`); forbid remote libsql unless explicitly revisited in 12.

---

### 14. Low — UI state stack not in repo yet, over-committed early
**Ref:** *“TanStack Query + small Zustand store”* vs `package.json` (React Router only)

**Why:** Fine as proposal, but “small Zustand” often becomes a second server-state cache fighting Query—classic over-engineering for a single-user localhost app.

**Fix:** Phase 1: TanStack Query + URL/local UI state; add Zustand only when a concrete cross-route ephemeral need appears. Say so in the table Note.

---

### 15. Low — Design silence on typography / spacing / motion craft floor
**Ref:** Implicit via “see 14” (Inter, 12px radius, blur 18px, soft-dim `#9AA0AC`)

**Why:** App-screen laws: few type sizes, running text in full ink (not soft grey), section rhythm, reduced motion. Architecture never states a craft floor, so each screen spec invents hierarchy; soft-dim body text reads unfinished (taste skill).

**Fix:** One bullet under UI: type scale ≤5 sizes; body in `--text` not `--text-dim`; spacing tokens only; `prefers-reduced-motion` required (already in 14—promote to architecture invariant).

---

### 16. Low — Open questions duplicate / weaken packaging decision
**Ref:** Open questions (Electron/Tauri; launchd/systemd) vs `13` Phase 5 Packaging

**Why:** Harmless, but architecture “open” while roadmap already schedules packaging invites premature wrapper work (tray/auto-start) before Phase 1 chat works.

**Fix:** Mark both as Phase 5; architecture open questions = “deferred to 13 Phase 5.”
