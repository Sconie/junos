**Verdict:** The sequencing principle is sound (“one real path, then widen”), but the roadmap itself violates that principle, postpones security until after unattended automation, and locks UI into **Translucent Glass**—a direction both skills treat as a tell, not a foundation.

---

### Contradictions

1. **Principle vs Phase 0.** You want one Claude subscription path early; Phase 0 requires glass tokens, five new routes, a monorepo split, a mock API for *all* screens, and five provider spikes before any real chat. That is “shell completeness first,” not “one path first.”

2. **Phase 1 done-when vs “one path”.** Done-when requires Claude *and* Codex, Connections real states, routing fallback, and history—two providers and routing before the single path is proven.

3. **Mock-all-screens vs screen-by-screen.** Principle: build backend behind the shell screen by screen. Phase 0 done-when: mock data for all screens. That freezes IA and density for surfaces that haven’t been shaped yet (Home, Scout, Kanban, Workflows).

4. **Security after automation.** Phase 2 ships scheduler, tool steps, and a week of unattended runs. Phase 4 is where sandboxed shell and approval-rules UI appear. Inbox already shows results/failures in Phase 2; approvals land in Phase 3. Tooling can act before the approval/sandbox story exists.

5. **Glass now, light theme later.** Phase 0 adopts Translucent Glass; Phase 5 adds light theme as “polish.” Glass systems are usually dark, blur-heavy, and contrast-fragile. Deferring light = shipping illegibility or a second design system as an afterthought.

6. **Inbox role drift.** Phase 2 = results/failures; Phase 3 = approvals + agent chats. Same surface, three jobs, no hierarchy or density rule—classic Operate-mode overload (impeccable) / inbox-as-dump (app-screens).

---

### Gaps

| Gap | Why it matters |
|---|---|
| No UX/shape gate before “add routes” | Routes land without one question per screen, primary action, or empty/loading/error states (app-screens §2 / §11). |
| No a11y / contrast / reduced-motion done-whens | Glass + motion-heavy shells fail here first; roadmap never measures them. |
| No mock→real cutover | “Keep mock data switchable” with no rule for when mock is wrong (false green, dual sources of truth). |
| Indexing / Scout / compare with no privacy posture in the roadmap | What is read, stored, sent to models, retained—absent from phases and risks table. |
| Backups only in Phase 5 | SQLite + history from Phase 1; data-loss risk is earlier than packaging. |
| Phone only in Phase 5 | No phone composition until “tunnel”; density/type never planned for small screens (app-screens §12). |
| Testing vs design quality | Unit/contract/Playwright smoke—nothing on visual hierarchy, contrast, or empty-state honesty. |
| Phase 5 is a grab bag | Packaging *or* service, backups UI, notifications, light theme, phone tunnel—five different products. |

---

### Unrealistic scope

- **Phase 0 “days”:** monorepo + tokens + five routes + five timeboxed spikes + mock-complete UI is a multi-week foundation, not a short phase.
- **Phase 2 done-when:** “daily morning briefing for a week without duplicates or lost runs” is a calendar-bound reliability gate; one flaky provider day blocks the phase.
- **Phase 4:** Scout pipeline + file/project index + search + Home aggregation + ⌘K + compare + security hardening is several products. Home + ⌘K + compare especially invite dashboard-template density (taste skill’s anti-pattern list).
- **Phase 5:** Tauri *or* service install alone is a phase; stacking theme, notifications, backups, and remote phone access guarantees polish never finishes.

---

### Security / privacy risks (as sequenced here)

1. **Unattended workflows + tools before sandbox/approvals UI** (P2 before P3/P4)—highest structural risk in the doc.
2. **“Auth token” early, phone tunnel late**—tunnel without spelling auth binding, TLS, and exposure model in the roadmap invites “works on LAN” then accidental WAN.
3. **File/project indexing + Scout + compare** with no retention, redaction, or “what leaves the machine” rule in this doc.
4. **Subscription CLIs / no API keys**—still process and filesystem trust; roadmap treats that as a product win, not a boundary to harden before automation.
5. **Notifications (P5)** after agents/Scout—easy content leak (titles, snippets) if not scoped.
6. **Hermes mock→real** with Kanban create/pickup—agent write path before packaging/backup story is mature.
7. **Risks table** covers CLI churn, quotas, Hermes unknown, Grok, scope creep—not local-data exposure, tunnel, or tool approval timing.

---

### UI / design-quality problems (impeccable Operate + taste app-screens)

**Glass is the wrong foundation for this product.**  
design-taste house rule: no glass, no backdrop blur, no floating pill nav. App-screens: colour on data not chrome; surfaces flat; nav recedes; ~3% coloured pixels. “Translucent Glass tokens (14)” pushes chrome-first aesthetics (blur, glow, stacked translucency) that fight Operate mode: scanability, contrast, density, and light theme.

**Hierarchy / IA**  
Phase 0 dumps Inbox, Agents, Workflows, Scout, Kanban into the shell with no primary path emphasis. Principle says Claude chat is the spine; nav treats everything as equal. Home aggregation + ⌘K + compare in one phase invites competing “command centers.”

**Density**  
Mock-all-screens early freezes card grids, KPI strips, and busy boards before real data magnitudes are known. App-screens warn: first screen must show real jobs and data, not empty chrome.

**Typography / spacing**  
No type scale, measure, or spacing rhythm in any phase. Phase 5 “light theme” without typeset/layout work = palette swap on an unhardened hierarchy.

**Legibility / contrast**  
Glass + deferred light theme is a known failure mode (text on blur, low-contrast secondary grey). Roadmap never gates on readable ink on ground.

**Motion**  
Unmentioned. Taste/impeccable: purposeful motion + `prefers-reduced-motion`; glass UIs usually over-animate chrome. Risk of fade-in decoration instead of state feedback (streaming chat, run progress, approvals).

**States**  
No empty / zero / loading / error work in done-whens. For Inbox, Tasks, Scout, Kanban—those states *are* the product. App-screens: honest zeros, empty keeps its frame.

**Polish phase anti-pattern**  
Putting light theme, notifications, and phone access in “Polish” treats accessibility and second theme as finish, not structure. Impeccable would put tokens, contrast, and primary Operate surfaces first; glass-first then light-later is the reverse.

---

### Highest-leverage fixes (guidance only; Ask mode)

1. Reorder: real Claude chat path → then second provider → then automation; put sandbox + approval policy **before** unattended tool workflows.  
2. Replace or heavily constrain “Translucent Glass” for Operate screens (flat surfaces, colour on status/data); treat light theme as Phase 0/1, not Phase 5.  
3. Shrink Phase 0 done-when to: monorepo + mock for *chat/connections only*; other routes stubbed, not “designed.”  
4. Split Phase 4 and Phase 5; give Home/⌘K/compare and packaging/tunnel their own done-whens including privacy and contrast.  
5. Add design done-whens: empty/error states, contrast, reduced motion, one primary job per screen.

---

Context loading / live UI detect did not run: target is a roadmap markdown file, not a rendered surface; this is a doc critique through those skills’ Operate / app-screen rules, not a pixel critique of the shell.
