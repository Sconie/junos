## Findings (ranked)

1. **high — Phase 0 locks “Translucent Glass” as foundation**  
   *Quote:* “Adopt the Translucent Glass tokens (14)” (`Phase 0`). Spec 14 defines violet accent `#8B5CF6`, dual radial glows, frosted panels, `backdrop-filter`, Inter.  
   *Why:* design-taste bans glass/blur chrome, violet/indigo assistant palettes, and gradients as background; impeccable’s craft floor treats decorative glass/blur as a refuse default. Phase 0 makes the AI-dashboard look load-bearing before any Operate-mode identity (product mark, face, data-first colour) is decided. Current `src/index.css` already uses Inter + soft card chrome; adopting 14 doubles down.  
   *Fix:* In Phase 0, adopt tokens as **provisional** with an explicit “glass is optional chrome, not identity” note; pin one non-violet accent from the product brief, flat tone-step panels for work surfaces, and a real UI face (not Inter). Keep blur only for true overlays if the Stitch world stays, and gate with an app-screen inspect pass before mock routes ship.

2. **high — Shell/tool approvals land after automation that needs them**  
   *Quote:* Phase 2: “workflow runner with prompt/tool/output steps”; Phase 3: “approvals in Inbox”; Phase 4: “Security hardening: sandboxed shell, approval rules UI.”  
   *Why:* `05` requires approval steps and `shell` (ask unless allowlisted); `04` puts chat tools behind policy in `12`; `12` defers sandbox to Phase 4. A week of unattended morning briefings (Phase 2 done-when) plus Hermes pickup (Phase 3) without sandbox / Settings rules UI is a real prompt-injection and destructive-action window on a localhost daemon with CLI/subprocess power.  
   *Fix:* Pull into Phase 1–2: classification defaults, Inbox approve/deny for any non-read tool/shell, kill switch, and allowlisted cwd. Keep Phase 4 for sandbox + “Approve and remember” Settings only. Do not ship scheduled `shell` or Hermes Autonomous until those land.

3. **high — Phase 0 scope vs “days” + conflict with `01`**  
   *Quote:* Phase 0 “Foundations (days)”: monorepo split, all new routes + mock API, five 1-day spikes. `01`: “Migrate by moving `src/` into `apps/web` once the daemon exists (Phase 1).”  
   *Why:* Five spikes alone consume the “days” budget; monorepo + mock layer + full nav before daemon is busywork that contradicts `01`. “Done when: UI runs on mock data for all screens” also overshoots the existing shell (`App.tsx` has Overview/Chat/Schedules/Hermes/Files/Connections only).  
   *Fix:* Phase 0 = shell remapping + tokens + mock for **Chat/Connections only**; one spike doc into `03`. Move monorepo to Phase 1 with daemon. Cap remaining spikes as Phase 1/3 gates, not Phase 0 exit.

4. **high — Phase 2 done-when needs tools the roadmap never schedules**  
   *Quote:* “a daily morning briefing runs unattended for a week…” vs `05` Morning briefing steps (`calendar.today`, mail digest, news).  
   *Why:* Without calendar/mail/news adapters (or an honest stub), the milestone is either fake or an unbounded integration project. Silent failure risks burning subscription budget (`03` usage guard is only a risk row, not a deliverable).  
   *Fix:* Narrow done-when to: “cron fires once/day, one prompt step, Inbox `result`, no duplicate after daemon restart, budget threshold respected.” Treat calendar/mail as Phase 2+ optional tools with their own done-when.

5. **med — Starter workflow count contradicts `05`**  
   *Quote:* Phase 2 “3 starter workflows”; `05` lists six (briefing, triage, repo health, weekly review, summarise file, Scout run).  
   *Why:* Agents will thrash on which three; Scout-as-workflow is also Phase 4, so shipping “Scout run” in Phase 2 is impossible as written.  
   *Fix:* Name the three (e.g. Morning briefing stub, Inbox triage, Repo health) and mark the rest Phase 3–4; point at `05` with “v1 subset.”

6. **med — Compare-mode phase mismatch**  
   *Quote:* Roadmap Phase 4 “compare mode”; `04-chat.md`: “Compare mode (phase 3).”  
   *Why:* Specs disagree; compare doubles subscription burn and needs routing/budget UI that Phase 4 partially owns.  
   *Fix:* Pick one phase (prefer after multi-provider chat works and usage budget exists—roadmap Phase 4) and edit `04` to match.

7. **med — Inbox split across phases breaks `05` acceptance**  
   *Quote:* Phase 2 Inbox “(results, failures)”; Phase 3 “approvals in Inbox”; `05`: “workflow with an approval step pauses and resumes after approval in the Inbox.”  
   *Why:* Phase 2 cannot meet its own linked acceptance without approval items; shell/tool workflows become unsafe or blocked.  
   *Fix:* Ship one Inbox surface in Phase 2 with kinds `result | failure | approval`; defer findings/digests to Scout (Phase 4).

8. **med — Files/projects and Settings are missing from the critical path**  
   *Quote:* Phase 4 “file/project indexing and search”; Settings never appears; `12` puts approval rules in Settings; `04` Phase 1 needs project `cwd`; Files page already exists in `src`.  
   *Why:* Chat-with-project and allowlists need a minimal project model before Phase 4 indexing. Approval-rules UI has no home. Kill switch (`12`) is unscheduled.  
   *Fix:* Phase 1: allowlisted projects + “Open in Chat” wiring (no full index). Phase 2–3: Settings stub (autonomy, allowlists, kill switch, later rules). Keep FTS/embeddings in Phase 4.

9. **med — ⌘K / Home deferred while Phase 0 claims full shell**  
   *Quote:* Phase 0 “add … routes to the shell”; Phase 4 “Home aggregation, ⌘K palette”; `14`/`10` require top-bar ⌘K and Home cards from day one of the system.  
   *Why:* A 64px icon rail with 10+ destinations and no command palette is an Operate-mode failure (orientation, keyboard-first). Mock Home without Inbox/Scout/board data will be empty KPI/card chrome—exactly the thin dashboard app-screens.md warns against.  
   *Fix:* Phase 0: rename Overview→Home, slim nav to real screens only, stub ⌘K jump list. Phase 4: fill Home cards and search/FTS, not first introduction of ⌘K.

10. **med — Nav/IA contradictions (roadmap vs `14` vs Stitch vs code)**  
    *Quote:* Phase 0 adds Inbox, Agents, Workflows, Scout, Kanban; `14` rail order differs; Stitch prompt 0 uses a shorter rail; code uses emoji icons and “Overview”/“Scheduled.”  
    *Why:* Three IAs invite duplicate Hermes vs Agents, Tasks vs Schedules renames, and unicode-glyph icons (craft floor refuse). Generic “Agents” without a product-specific face reads as template IA.  
    *Fix:* One canonical rail table in `14` referenced by the roadmap; Phase 0 migration map (`/schedules`→Tasks, Overview→Home); replace emoji with one icon set; clarify Agents = agent-chat list, Hermes = console.

11. **med — Security/privacy: remote phone + tunnel as “Polish”**  
    *Quote:* Phase 5 “phone access over a tunnel”; `00` non-goal “mobile app”; `12` remote = private tunnel + same token.  
    *Why:* Tunnel expands the threat model (token theft, DNS/CORS assumptions, pairing UX) after the app already runs agents. Responsive bottom-tab (`14`) without remote-auth/pairing design is incomplete.  
    *Fix:* Split: Phase 5a packaging/backups/notifications; Phase 5b remote access with pairing URL rotation, Tailscale-only note, and a security checklist. Keep “responsive web” separate from “expose daemon.”

12. **med — Design QA absent from Testing approach**  
    *Quote:* “Playwright smoke test per screen” only.  
    *Why:* Roadmap’s largest UX risk is shipping glass + card grids + status pills + Inter everywhere. Smoke tests won’t catch hierarchy, spacing, banned tells, or empty Home.  
    *Fix:* Add: one golden screenshot per primary screen (light later), lint against glass nesting depth / contrast, and an app-screen checklist (first-screen question, no icon-in-tinted-square KPIs, colour on data not chrome).

13. **low — Spike timing vs `03`**  
    *Quote:* Phase 0 done-when “spike notes written into 03”; `03`: “Verify each row … in the Phase 1 spike.”  
    *Why:* Dual owners for the same research; Grok/Cursor/Nous spikes early bias Phase 1 toward Chat while `03` already marks Grok low-confidence.  
    *Fix:* Phase 0: Claude+Codex spikes only; Phase 1 exit updates `03`; Cursor/Nous/Grok spikes gate Phase 3.

14. **low — Phase 5 is an unranked dump**  
    *Quote:* “Packaging (Tauri or service install), backups UI, notifications, light theme, phone access…”  
    *Why:* `01` still open-questions Electron/Tauri vs service; light theme on glass tokens is a redesign, not polish; nightly backups already exist in `02` without UI.  
    *Fix:* Ordered bullets with separate done-whens; decide service-first vs Tauri in Phase 1 open question; treat light theme as a token pass with contrast audit, not a flag flip.

15. **low — UI/design quality debt the roadmap never names**  
    *Refs:* Phase 0 glass adoption; Phase 5 light theme; Home as card grid (`10`/`stitch`); monospace cron as costume (`stitch` Tasks prompt); pulsing Hermes pill (`06`).  
    *Why:* Without roadmap constraints, implementation will copy Stitch: eyebrow-less but still icon-card Home, hairline borders, violet accent, Inter—high “kit” score, low product face (app-screens.md).  
    *Fix:* Add a one-line Phase 0 design done-when: “shell answers what JunOS is in 3s; one accent; no KPI icon tiles; empty states name the next action in product language; focus rings and selection themed.”
