**Verdict:** The roadmap’s principle (“one real path early”) fights its Phase 0–4 shape. Security and design quality land too late for the automation and multi-surface UI the middle phases already ship.

---

### Contradictions

1. **Principle vs Phase 0.** “Get one real end-to-end path working early” is undercut by Phase 0: Translucent Glass tokens, five new routes, monorepo split, mock API for *all* screens, and five timeboxed spikes—before chat works.
2. **“One path” vs Phase 1 done-when.** Phase 1 requires Claude *and* Codex with history and routing fallback—two providers, not one narrow path.
3. **Approvals without approval UI.** Phase 2–3 ship Inbox approvals, workflows, and Hermes autonomy; “approval rules UI” and “sandboxed shell” wait until Phase 4. Testing already assumes an “approval policy,” but the roadmap never says when that policy exists as product surface.
4. **Phase 3 done-when vs scope.** Done-when is only the Hermes Ready→Review card path; Cursor/Nous (and optional Grok) are in the same phase with no exit criteria.
5. **Notifications timing.** Phase 2 Inbox (failures, results) with no delivery story until Phase 5 “notifications”—so unattended automation has nowhere durable to alert except a screen you must already be looking at.
6. **Mock forever.** “Keep mock data switchable” has no phase where mocks die; that fights “done when” realism and Playwright-as-signal.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No UI craft milestones | Tokens in Phase 0; no empty/loading/error/offline, density, hierarchy, or a11y “done when” until vague Phase 5 |
| No motion / `prefers-reduced-motion` | Glass UIs over-animate; skills treat reduced-motion as floor, not polish |
| No responsive / phone composition | Phase 5 is “phone access over a tunnel,” not a phone layout; rail→tabs and sheet panels are never phased |
| Backups | SQLite from Phase 1; “backups UI” only in Phase 5—data-loss risk sits outside the phase gates |
| Kill switch / audit export | Not in any phase list (security/privacy surface for agents that start in Phase 2–3) |
| Home / ⌘K / compare | Dumped into Phase 4 with Scout + indexing—no IA order or “one job per screen” |
| Spike → product mapping | Five spikes in Phase 0; only Claude/Codex in Phase 1; Cursor/Nous/Grok deferred with thin criteria |
| Packaging fork | “Tauri or service install” unresolved—blocks tray, autostart, notification affordances |

---

### Unrealistic scope

- **Phase 0 as “days”:** Monorepo + design tokens + full shell IA + mock layer for ~10 screens + **5×1-day spikes** is already more than “days,” before any real backend.
- **Phase 2 done-when:** “Daily morning briefing runs unattended for a week” is a calendar soak, not a build gate—blocks Phase 3 for a week of wall time even if code is ready.
- **Phase 4:** Scout pipeline + indexing/search + Home aggregation + ⌘K + compare + sandbox + approval rules UI is a product release masquerading as one phase.
- **Phase 5 “Polish”:** Packaging, backups, notifications, light theme, and remote phone access are product/infra, not polish.
- **Playwright smoke per screen** from a Phase 0 shell with many empty routes multiplies brittle UI tests before behavior exists.

---

### Security / privacy risks (as sequenced here)

1. **Hardening after capability.** Streaming chat (Phase 1), unattended workflows/shell steps (Phase 2), Hermes with approvals (Phase 3)—then sandbox + approval rules UI in Phase 4. The dangerous surface ships before the controls called out as “hardening.”
2. **Auth token early, remote later.** Phase 1 auth + Phase 5 tunnel with no interim checklist (bind address, CORS, pairing, token storage) in *this* doc’s phases—easy to “just expose” under polish pressure.
3. **Subscription burn.** Risk table mentions usage budgets; no phase owns “background jobs respect budget” before Phase 2 automation.
4. **Indexing in Phase 4** after agents already touch projects—file/project index expands the blast radius of prompt injection and accidental exfil with no earlier read-only/index policy gate in the roadmap.
5. **Backups deferred** while SQLite holds history, runs, and Inbox—contradicts treating data loss as a first-class risk (named elsewhere, invisible here until Phase 5).

---

### UI / design-quality problems  
*(impeccable Operate mode + design-taste app-screen lens; brief = Translucent Glass wins over house “no glass” bans)*

**Hierarchy & IA**  
Phase 0 adds Inbox, Agents, Workflows, Scout, Kanban to the shell at once. Operate-mode products need one primary job per phase; a full icon rail of empty destinations creates medium-everything density—no screen leads. Home and ⌘K (the natural “what needs me?” and “do the thing”) arrive only in Phase 4, after Chat/Tasks/Agents/Kanban already exist—so early UX has no aggregation spine.

**Spacing, typography, density**  
“Adopt tokens (14)” is not a layout system. No phase owns type scale, section rhythm, readable measure for chat vs tables, or table/kanban density. Risk: glass panels + accent chrome before content hierarchy—colour on chrome, not on data (app-screen anti-pattern).

**Legibility & contrast**  
Frosted panels and dim text are called out as needing ≥4.5:1 in the UI system, but this roadmap never gates contrast, solid fallbacks without blur, or `prefers-contrast`. Shipping glass in Phase 0 and **light theme in Phase 5** almost guarantees dark-only hierarchy that breaks when inverted (borders, blur, accent on light).

**Motion**  
No phase mentions purposeful motion, streaming affordances, or reduced-motion. Streaming chat (Phase 1) and Scout/Inbox updates will invent motion ad hoc—noise, not signature; accessibility debt.

**Phone / tunnel**  
Tunnel ≠ UI. Without a phased phone composition (bottom tabs, sheets, thumb targets, what *not* to show), Phase 5 access will be a squeezed desktop glass shell—legibility and density failure under the skills’ phone pass.

**Polish-as-theme**  
Light theme, notifications, and packaging as “Phase 5: Polish” trains the team to treat dual-theme, alert hierarchy, and install surface as cosmetics. For an Operate product, those are core trust surfaces (can I see urgency? can I recover? can I open it every morning?).

**Taste / anti-slop tension (doc-internal)**  
Adopting Translucent Glass early without also phasing EmptyState, Skeleton, offline banner, and “one next action” (all named in the UI system, absent here) is how you get a pretty shell with mock cards—the exact “kit, not product” failure app-screen guidance warns about. Phase 0 “UI runs on mock data for all screens” rewards that outcome.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Reconcile the principle with phases: shrink Phase 0 to shell + mock for **Chat + Connections** only; defer extra routes until their phase.  
2. Move **approval policy + sandbox (even v0) + backups** before or into Phase 2; keep Phase 4 for richer rules UI / Scout hardening, not first controls.  
3. Split Phase 4; give Home/⌘K an earlier “spine” phase or fold a minimal Home into Phase 2 Inbox.  
4. Rename Phase 5; add explicit UI done-whens: contrast on glass, empty/error/offline, reduced-motion, phone composition (not only tunnel), light theme as token-dual from Phase 0 if you truly need it.  
5. Align each phase’s done-when with *everything* listed in that phase (or cut the extras).

I can turn this into a phase-by-phase rewrite sketch in Ask mode, or apply edits in Agent mode if you want the doc changed.
