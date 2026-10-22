Context loading did not run (Ask mode); no `PRODUCT.md` / `DESIGN.md` in-repo. Review is of **this spec only**, in **Operate / app-screen** mode (impeccable) with **design-taste app-screen** rules as the quality floor. No live UI to inspect.

---

## Verdict

The sequencing idea (one real chat path, then widen; mock-switchable shell) is sound, but the doc **contradicts that principle in Phase 0**, pushes **security and remote access after unattended automation**, and **locks a glass/dark-first visual system** that the design-taste lens treats as a hard anti-pattern—with almost no craft budget (hierarchy, density, states, motion, light theme) until a catch-all Phase 5 that has no done-when.

---

## Contradictions

1. **“Screen by screen” vs Phase 0 dump**  
   Principle: build backend behind the shell *screen by screen*.  
   Phase 0: add Inbox, Agents, Workflows, Scout, Kanban routes at once and **Done when: UI runs on mock data for all screens**. That is a full product shell of empty destinations, not incremental surfaces.

2. **“One end-to-end path early” vs five spikes first**  
   Principle prioritizes Claude chat via subscription. Phase 0 still timeboxes spikes for Claude, Codex, Cursor, Grok, *and* Nous before Phase 1’s working chat. Spikes can inform adapters, but the roadmap makes multi-provider discovery a Phase 0 gate equal to “chat that works.”

3. **Automation and Hermes before security hardening**  
   Phase 2: unattended workflows with tool/output steps for a week. Phase 3: Hermes + approvals + Kanban pickup. Phase 4: “Security hardening: sandboxed shell, approval rules UI.”  
   High-stakes Operate surfaces and sandbox arrive *after* the product is already running tools unattended.

4. **Phase 4 hardening vs Phase 5 phone tunnel**  
   Remote “phone access over a tunnel” lands in Polish with no security done-when and no callout that tunnel access expands the auth boundary. Hardening is framed as shell sandbox + approval UI only.

5. **“No API keys” vs real subscription auth**  
   Phase 1 done-when: chat “through subscriptions, no API keys.” That is a product claim, not a security model—CLI sessions, OAuth caches, and local credential material still exist. The roadmap treats “no API keys” as if it removes secret handling.

6. **Scope-creep gate vs calendar done-whens**  
   Risks: “no phase starts before the last passes.” Phase 2/4 done-whens need **a week** of live behavior. Either phases stall for calendar time or “passes” is quietly redefined—both contradict the written gate.

7. **Phase 5 has no Done when**  
   Every earlier phase has an exit criterion; Polish does not. Packaging, backups UI, notifications, light theme, and phone tunnel can all ship half-done with no stop rule—while Risks claim done-whens prevent creep.

---

## Gaps

| Area | Missing |
| --- | --- |
| **Phase 0 “tokens (14)”** | No in-doc definition of what adopting tokens means (components? routes only? dark-only?). Implementers get a pointer, not a checklist. |
| **Mock ↔ real switch** | Who flips it, per-screen vs global, and whether mock can accidentally hit real providers/spend. |
| **Auth beyond “auth token”** | Rotate/revoke, SSE auth, multi-client, pairing—roadmap names the token once. |
| **Approval UX timing** | Approvals appear in Phase 3 (Inbox) but “approval rules UI” waits until Phase 4—rules vs one-shot approvals never sequenced. |
| **Failure UX across phases** | Streaming errors, duplicate-run prevention UI, Scout noise triage, Hermes reject—only success done-whens. |
| **Data/privacy lifecycle** | Backups UI in Phase 5 with no earlier story for what SQLite/event logs retain (chat, mail, diffs). |
| **Design/QA** | Testing is unit/contract/Playwright smoke—no visual regression, contrast check, or empty/loading/error states as phase exits. |
| **a11y / motion / density** | Never scheduled; light theme alone is the only explicit visual follow-up. |
| **Compare mode / ⌘K / Home** | Named in Phase 4 with no “one job per surface” or IA cut—easy to ship three overlapping entry points. |
| **Grok** | Risk says ship without it; Phase 0 still spends a spike day—no rule that a failed spike deletes scope from later phases. |

---

## Unrealistic scope

- **Phase 0**: monorepo split + glass tokens + five routes + five provider spikes + mock API for *all* screens is a lot for “days,” and it front-loads IA chrome before any real path.
- **Phase 2 done-when**: a daily briefing “for a week without duplicates or lost runs” is an ops reliability bar (scheduler + idempotency + Inbox), not a feature slice—easy to fake-pass with a short happy path.
- **Phase 3**: Hermes bridge + console + approvals + agent chats + Kanban rules + Cursor/Nous (and maybe Grok) as one phase after “chat works” is a second product.
- **Phase 4**: Scout pipeline + indexing/search + Home aggregation + command palette + compare + sandbox + approval rules UI—awareness *and* security in one bucket.
- **Phase 5**: Tauri *or* service install, backups UI, notifications, light theme, phone tunnel—five different product problems with no exit criterion.
- **“Scout … under 30% dismissed as noise”**: quality metric without a measurement method, sample size, or UI for dismissal feedback into the pipeline.

A thinner cut that matches the principle: Phase 0 = shell + mock for **Chat + Connections only**; Phase 1 = Claude path done-when; one spike per *next* adapter when that phase needs it; sandbox/approval rules before any unattended tool step; Polish items each get a done-when or get cut.

---

## Security / privacy risks

1. **Unattended tools before sandbox** — Phase 2’s week-long briefing with tool steps is RCE/spend risk on approval fatigue or mis-routed steps; hardening is Phase 4.

2. **Auth token as a one-liner** — Phase 1 “auth token” with no storage, rotation, or SSE story. Later phone tunnel multiplies blast radius of that same vague token.

3. **Phone access over a tunnel in Polish** — Treated as packaging convenience, not a threat-model change (remote caller ≠ localhost).

4. **Mock layer left “switchable”** — If mocks can be left on in a build that still has real adapters, or vice versa, you get false confidence or accidental real calls.

5. **Chat/history + Scout + indexing in SQLite** — Persisted conversations and file index land by Phase 1/4; backups UI only in Phase 5—sensitive data exists long before backup/restore/redaction UX.

6. **“No API keys” framing** — Downplays provider CLI credential stores and log leakage from streamed CLI output (history, run logs, Inbox).

7. **Hermes + Kanban create/pickup** — Agents acting on board state before sandbox/rules UI is fully specified in the roadmap’s own order.

---

## UI / design-quality (skills lens)

Operate mode: one job per screen, scanability, honest states, brand in precise detail. Design-taste app screens: colour on data/status not chrome; quiet flat surfaces; product name/scope in the shell; first viewport shows the job’s data and primary action; **no glass / backdrop blur / floating pill nav**; light screens dominate the study set; motion = feedback, not theatre; density that answers the screen’s question above the fold.

### Hierarchy
- Phase 0 stuffing every major route into the shell creates **nav-first product identity** before any screen has a real primary question. App-screen rule: the frequent job is one click from the first view—here the first views are mocks.
- Phase 4 piles Home + ⌘K + compare + Scout with no statement of **which surface owns “what needs me?”**—classic overlapping IA and competing headlines.
- Phase 5 “notifications” with no placement (system vs Inbox vs toast) risks a third attention channel on top of Inbox.

### Spacing / density
- “UI already exists as a shell” + mock-all-screens encourages **empty canvases and card-shaped placeholders**—the exact thin first-screen failure the app-screen chapter warns about (judges prefer denser honest data).
- Scout noise metric implies a **triage-dense** Inbox/Scout UI; roadmap never budgets list density, filters, or dismissal patterns.
- Kanban + Hermes in one phase with no column/card content rules → risk of pretty board chrome without the Review summary as the hero payload.

### Typography
- Roadmap never schedules type work beyond “Adopt … tokens.” Light theme in Phase 5 without a typeset pass implies **dark glass metrics** (blur, translucency) drive legibility until late.
- Model IDs, logs, cron, diffs need monospace *only* for real code; nothing says body stays full-ink readable size on glass.

### Contrast / colour / material
- **Phase 0 adopts Translucent Glass** — design-taste house rule: **No glass. No backdrop blur panels.** Impeccable Operate also wants precision over atmosphere. The roadmap makes the banned material the foundation of the whole UI timeline.
- Frosted panels over “atmospheric dark” (implied by the named direction) fight **text contrast** and status colour-on-data; trust surfaces (approvals, kill/stop, Connections) need opaque high-contrast panels the roadmap never requires.
- **Light theme deferred to Polish** — long stretch of dark-only; taste study is majority light; roadmap treats light as cosmetic, not a contrast/legibility track.

### Motion
- Streaming chat (Phase 1), scheduler runs (Phase 2), Scout (Phase 4), notifications (Phase 5) all need **honest busy/progress/stopped** feedback. Roadmap never mentions `prefers-reduced-motion`, entrance vs feedback, or bans on shimmer/pulse theatre.
- Risk: mock UIs teach decorative motion that later fights Operate calm.

### Legibility / states
- No phase exit requires empty, loading, error, offline-daemon, or partial-index states—yet Playwright “smoke test per screen” will green-path past them.
- Connections “real states” (Phase 1) is the right instinct; it is not generalized to Inbox/Scout/Kanban/Home.
- Phone layout appears only as “phone access over a tunnel”—**no mobile composition** for Chat/Inbox (Operate on a thumb).

### Cognitive load
- Phase 0 route list alone is already many top-level destinations before any workflow is real (>4 competing places to go).
- Phase 4 awareness cluster (Scout + search + Home + ⌘K + compare) without a single “home question” will exceed the decision-point ceiling on day one of that phase.

---

## Priority fixes (if this doc is revised)

1. **Realign Phase 0** with the principle: tokens + Chat/Connections mock only; other routes when their phase starts; spikes on-demand, not a five-provider gate.  
2. **Move sandbox + approval-rules UI before** any unattended tool workflow (reorder vs Phase 2/3).  
3. **Give Phase 5 a done-when** (or split packaging / backups / notifications / theme / remote)—and treat tunnel phone access as a **security phase item**, not polish.  
4. **Replace or constrain “Translucent Glass”** for Operate surfaces: opaque panels, contrast ≥4.5:1, no blur on approvals/Inbox/Connections; if brand keeps glass, say where it is forbidden.  
5. **Add craft exits**: per phase, name the screen’s one job, required states (empty/loading/error), and that light theme / density are not optional leftovers.  
6. **Make calendar done-whens** (week of briefing / Scout noise) explicitly **soak tests that don’t block** the next build phase, or the “no phase starts before last passes” rule is fiction.

Questions skipped: Ask mode review-only; no follow-up command menu.
