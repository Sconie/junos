**Verdict:** The roadmap’s sequencing principle is sound, but Phase 0–1 already contradict “one path first,” security arrives after unattended automation, and almost no UI craft is scheduled beyond adopting glass tokens—while that glass direction fights the taste skill’s app-screen rules.

---

### Contradictions

1. **“One path early” vs Phase 0–1 scope**  
   Opening principle: Claude chat via subscription first. Phase 0 still requires mock data for *all* screens, five provider spikes, monorepo split, and five new routes. Phase 1’s done-when is Claude *and* Codex. The principle and the gates disagree.

2. **“UI shell already exists” vs Phase 0 route work**  
   If the shell is real, “add Inbox, Agents, Workflows, Scout, Kanban routes” is product work, not foundations. If those screens aren’t real yet, “shell exists” oversells readiness.

3. **Mitigations that depend on later phases**  
   Risk table: “Scout watches releases” for CLI churn—Scout is Phase 4. Early adapter breakage has no early watcher.

4. **Capability before control**  
   Phase 2 ships unattended workflows; Phase 3 ships Hermes + approvals-in-Inbox; Phase 4 finally adds sandboxed shell and approval-rules UI. Agents and schedulers run before the security surface the doc itself treats as hardening.

5. **Dark glass now, light theme “polish”**  
   Phase 0 adopts Translucent Glass; Phase 5 adds light theme. That’s a second visual system deferred to the end, not a token flip—especially with frosted panels.

---

### Gaps

| Area | What’s missing in this doc |
|---|---|
| Time | Only Phase 0 says “days”; spikes alone are five timeboxed days. Phases 1–5 have no bounds. |
| Design craft | No gates for hierarchy, type scale, spacing rhythm, density, motion budget, contrast, or empty/loading/error states. “Adopt tokens (14)” is the entire UI plan. |
| Mock ↔ real | “Keep mock data switchable” has no UX: indicator, per-screen switch, or “this is fake” affordance. |
| Packaging | “Tauri or service install” unresolved—changes window chrome, tray, auto-start, and how phone/tunnel fits. |
| Testing vs UI | Playwright smoke per screen, but no visual/a11y/reduced-motion bar despite a glass-heavy UI. |
| Cross-refs | “tokens (14)” and “spike notes into 03” assume readers know those docs; the roadmap never restates the non-negotiables. |
| Failure modes | No phase owns offline, auth expiry, adapter down, or partial SSE—only happy-path done-whens. |

---

### Unrealistic scope

- **Phase 0 as “days”:** monorepo (`apps/web` + `apps/daemon` + `packages/shared`) + glass tokens + five routes + five spikes is a multi-week foundation if done honestly.
- **Phase 2 done-when:** “daily morning briefing runs unattended for a week without duplicates or lost runs” is an ops soak, not a build exit—calendar-bound and flaky as a gate.
- **Phase 4 dump:** Scout pipeline + indexing/search + Home aggregation + ⌘K + compare + security hardening in one phase is several products’ worth of IA and backend.
- **Phase 5 kitchen sink:** packaging, backups UI, notifications, light theme, and phone-over-tunnel are unrelated; any one can slip the “polish” label.

---

### Security / privacy risks (as sequenced here)

1. **Unattended jobs before approval/sandbox UI** — Phase 2 briefing + Phase 3 Hermes pickup can act with only Inbox approvals; Phase 4 “approval rules UI” and sandboxed shell arrive late.
2. **Auth token with no storage story** — Phase 1 “auth token” only; no roadmap line for where it lives, rotation, or leakage via logs/SSE.
3. **Phone access over a tunnel (Phase 5)** — Exposes the local daemon off-machine with no preceding threat model (auth on tunnel, bind address, TLS, device pairing).
4. **Indexing in Phase 4** — File/project indexing without an earlier privacy gate (what’s scanned, retention, redaction) after chat/history already persist in Phase 1.
5. **Backups UI** — Named without encryption, destination, or secret handling; backups of SQLite + conversation history are high-sensitivity.
6. **Subscription CLIs** — “No API keys” still means host credentials/sessions; roadmap never schedules credential hygiene or run isolation for background jobs (only a usage-budget risk row pointing at 03).

---

### UI / design quality (impeccable + design-taste lens)

Mode for this product: **Operate** (app screens). Taste’s app-screen study favors quiet chrome, colour on data, flat surfaces, no hero chrome. This roadmap locks the opposite metaphor early.

**Glass as Phase 0 identity**  
“Adopt the Translucent Glass tokens” commits to frosted panels / blur. Taste house rules ban glass and backdrop-blur panels for generated looks; impeccable Operate mode wants precision over atmosphere. The roadmap never schedules solid fallbacks, contrast audits, or nested-blur limits—only the adopt step. Risk: pretty shell, weak legibility on dense Inbox/Kanban/logs.

**Hierarchy & density**  
Five routes land in Phase 0 with no IA rule (what’s primary vs secondary, default landing, badge noise). Phase 4 then piles Home aggregation + ⌘K + compare—classic cognitive-load stack with no “one job per screen” gate. App-screen guidance: first viewport must answer the screen’s question and expose the main action; nothing here enforces that per phase done-when.

**Typography / spacing / contrast**  
No typeset or layout milestone. Light theme in Phase 5 implies contrast work was never a Phase 0 exit. Glass + stream/log monospace density will fail WCAG-ish targets unless contrast is a done-when (it isn’t).

**Motion**  
No motion budget, no `prefers-reduced-motion` gate in the roadmap (even though glass UIs often animate blur/opacity). Taste wants purposeful motion with reduced-motion fallbacks; here motion is invisible until someone invents it ad hoc.

**Theme & packaging as afterthought**  
Light theme + Tauri/shell + notifications in “Polish” treats visual system completeness and interruption design as cosmetics. Notifications especially need density rules (batching, quiet hours) or Inbox becomes a second notification surface.

**Mock-first UI debt**  
“Build backend behind it screen by screen” with all screens mock-complete early encourages shipping every route at equal visual weight before any real data teaches hierarchy. Done-whens are functional (“chats,” “briefing runs,” “Scout &lt;30% noise”) never experiential (“scan a morning Inbox in under N seconds,” “Kanban readable at 1440”).

**Strength worth keeping**  
Switchable mocks + screen-by-screen backend is a good Operate strategy—if Phase 0 is narrowed to shell + tokens + *one* real screen path, and glass is treated as a constrained token set with contrast/fallback gates, not a free pass for blur everywhere.

---

### Priority fixes (doc-level, not implementation)

1. Realign Phase 0–1 done-whens with “Claude path first”; demote Codex/other spikes from critical path.  
2. Move sandbox + approval-rules UI before unattended workflows / Hermes pickup (or make Phase 2 require manual approve-all).  
3. Split Phase 4; put security/privacy gates earlier than Scout/⌘K/compare.  
4. Add UI exit criteria: contrast on glass, reduced motion, empty/error states, mock indicator, and a density rule for Inbox/Kanban.  
5. Treat light theme and tunnel/phone as their own phases with threat + visual QA—not “polish.”

---

Questions skipped: Ask-mode doc review only; no live UI or detector run on a rendered target.
