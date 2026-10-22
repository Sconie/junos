**Verdict:** The sequencing principle (real Claude chat first) is sound, but Phase 0 hard-commits to a glass shell and Phase 4–5 park security, theme, and mobile where both design skills say they should not live. As a roadmap for an Operate product, this doc under-specifies craft and overloads later phases.

---

### Contradictions

1. **Principle vs Phase 0 done-when.** Principle: backend screen-by-screen. Phase 0: “UI runs on mock data for **all** screens” with Inbox, Agents, Workflows, Scout, Kanban routes already in the shell. That invites a full fake product before one real job works — and fights “one end-to-end path early.”

2. **Security after tools.** Phase 2 ships a workflow runner with tool/output steps and unattended runs; Phase 3 ships Hermes + approvals. Phase 4 is the first time “sandboxed shell” and “approval rules UI” appear. Approvals in Inbox without an approval-rules UI is half a control plane.

3. **“No API keys” vs later adapters.** Phase 1 done-when: Claude/Codex via subscriptions, no API keys. Phase 0/3 still carry Nous Portal, Cursor, Grok. The roadmap never says whether those stay subscription-only, key-based, or optional — so Phase 1’s bar is absolute language for a subset of providers.

4. **Glass foundation vs light theme as polish.** Phase 0 adopts “Translucent Glass tokens (14)”; Phase 5 adds “light theme.” Glass + late light theme usually means contrast/token debt, not polish.

5. **Scope-creep rule vs Phase 5.** Risks: every phase has a done-when; no phase starts before the last passes. Phase 5 has **no** done-when, and “Tauri **or** service install” is an unresolved product fork, not a finish line.

6. **Phone as polish vs Operate layout.** Impeccable Operate treats responsive behavior as structural (sidebar collapse, tables, columns). “Phone access over a tunnel” in Phase 5 treats mobile as packaging, not IA.

---

### Gaps

- No calendar beyond Phase 0 “days”; Phases 1–5 are unbounded.
- No mock→real cutover rules (per route? per endpoint? feature flag?).
- Auth is one bullet (“auth token”) — no binding, rotation, local-only vs remote, or what phone-tunnel auth looks like.
- No retention/encryption/redaction for SQLite chat history, event table, Scout indexing, or backups UI.
- No accessibility, contrast, focus, or `prefers-reduced-motion` gates anywhere.
- No empty / loading / error / first-run work (impeccable Operate + tasteskill app-screens treat these as build-time, not polish).
- No design QA: no DESIGN.md/PRODUCT.md, no density pass, no “one question per screen,” no visual regression.
- Testing lists unit/contract/Playwright but never lands in a phase’s done-when.
- “Spike notes into 03” / “tokens (14)” are opaque inside this doc; Grok’s “legitimate path” has no decision owner or deadline.

---

### Unrealistic scope

| Slice | Why it’s heavy |
|---|---|
| **Phase 0 “days”** | Monorepo split + glass tokens + five routes + mock API + five 1-day provider spikes. For one operator, that is weeks if spikes slip. |
| **Phase 1** | Daemon + SQLite + auth + SSE + events + two adapters + Connections states + streaming + history + routing fallback — a full product slice, not “chat works.” |
| **Phase 2 done-when** | “Unattended for a week without duplicates or lost runs” is a strong reliability bar; the phase also invents scheduler, Tasks, Inbox, workflows, and three starters. |
| **Phase 4** | Scout + file/project index/search + Home aggregation + ⌘K + compare + security hardening. That is three products and the security program in one phase. |
| **Phase 5** | Packaging choice + backups + notifications + light theme + remote phone access — each is its own project. |

---

### Security / privacy risks (as this doc sequences them)

- **Tool-using automation before sandbox.** Unattended workflows (Phase 2) and agent pickup (Phase 3) precede sandboxed shell (Phase 4).
- **Phone over a tunnel** with no threat model: exposure surface, auth, TLS, bind address, or “local only” guarantee.
- **Subscription burn:** risk table notes background jobs vs limits; Phase 2 still ships daily briefing before budgets are a phase deliverable (only “usage budget in 03”).
- **Local corpus growth:** chat/events early; Scout indexing later; backups UI last — no phase owns “what leaves the machine” or “what is stored at rest.”
- **CLI adapters** (Claude/Codex/Cursor/etc.): process output, working directories, and credential handling are all implied but never gated in a done-when.

---

### UI / design-quality problems (impeccable Operate + tasteskill app-screens)

These are risks **encoded by the roadmap**, not a live visual audit.

1. **Glass as Phase 0 identity.** Tasteskill app-screens explicitly reject glass / backdrop blur / neon-on-dark chrome; colour should sit on data, surfaces opaque with tone steps. Locking “Translucent Glass” in foundations makes the default product look the skills treat as template chrome — and fights legibility/contrast on dense Inbox, Kanban, and logs.

2. **Shell routes before real jobs → thin, fake screens.** “Mock data for all screens” plus many nav destinations is how you get empty KPI strips, placeholder boards, and vanity charts. App-screens: first screen must answer one job with real (or honest empty) data; fake dashboards are a house ban.

3. **Hierarchy / cognitive load dumped into Phase 4.** Home aggregation + ⌘K + compare + Scout in one phase with no IA rule. Impeccable flags >4 competing primary actions; this phase invents several global entry points at once with no “primary surface” call.

4. **Density without a density plan.** Chat, Tasks, Inbox, Kanban, Scout, Connections, effort picker — Operate allows density, but the roadmap never schedules a layout/typeset pass. Polish jumps to theme and packaging instead of spacing rhythm, table/list density, and scan hierarchy.

5. **Typography & contrast unowned.** Light theme last implies shipping long on one (likely dark glass) theme. No contrast target, no semantic state colours (error/warn/success) in any phase. Translucent panels over busy backgrounds are a classic contrast failure for streaming logs and approvals.

6. **Motion absent.** Operate: 150–250ms, state only, no load choreography. Glass UIs often animate blur/opacity; without a motion budget and reduced-motion, Phase 0–2 can bake decorative motion into the shell.

7. **Notifications and approvals timing.** High-stakes moments (failures, Hermes Review, approvals) land in Phases 2–3; notifications wait until Phase 5. Emotional journey / peak-end is left to Inbox alone with no alert design.

8. **Phone / adapt as afterthought.** If tunnel phone access is in scope, shell IA, touch targets, and composer/chat layout need an Adapt phase — not a packaging bullet.

9. **No craft done-whens.** Missing examples that would make design real in this doc: “Chat empty state teaches the first send”; “Inbox row hierarchy readable at 12–14px labels without glass wash”; “Kanban columns distinguishable by type marks, not glow”; “Scout findings <30% noise” is product quality, not visual quality — and nothing equates “useful” with scannable hierarchy.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Reorder: **approval policy + sandbox before** unattended tools; **auth model before** tunnel phone.
2. Narrow Phase 0 done-when to **shell + Chat mock only**; other routes stub or hidden until their phase.
3. Replace “Translucent Glass” as non-negotiable Phase 0 with “tokens from 14, **opaque Operate surfaces**, glass only if 14 still requires it after contrast review” — or accept an explicit conflict with the design skills.
4. Give Phase 5 a done-when; split packaging vs theme vs remote access.
5. Add one **Operate craft** gate per phase (empty/error/focus/contrast), not a single late “Polish.”

I did not open `14-ui-system.md` or `12-security-and-privacy.md`; this is scoped to contradictions and risks **inside** `13-roadmap.md` read through those two skills.
