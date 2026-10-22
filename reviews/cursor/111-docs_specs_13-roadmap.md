**Verdict:** The sequencing principle is sound, but Phase 0 contradicts it, Phase 4–5 are product-sized dumps labeled “awareness/polish,” and locking **Translucent Glass** in Phase 0 while deferring light theme, motion, and craft creates known design-taste / craft-floor failures you’ll pay for late.

---

### Contradictions

1. **“One path early” vs Phase 0.** Principle: one end-to-end Claude chat path first. Phase 0: monorepo split, mock API, *all* screen routes, and five provider spikes before any real chat. Done-when is “mock data for all screens,” not “Jonas can chat.”
2. **Automation before approval/sandbox.** Phase 2 ships scheduler + workflow tool/output steps + a week of unattended runs. Inbox *approvals* land in Phase 3; sandboxed shell + approval-rules UI in Phase 4. Unattended tools run for weeks without the controls the later phases admit you need.
3. **Glass now, light theme “polish.”** Phase 0 adopts Translucent Glass (14); Phase 5 bolts on light theme. Dual-theme after glass/blur/violet dark tokens are baked in usually means broken contrast, hierarchy, and density—not polish.
4. **Risk gate vs empty calendars.** Risks say no phase starts until the last passes, but only Phase 0 is timeboxed (“days”); Phase 5 has **no done-when** at all, so the gate can’t fire.
5. **Spikes vs ship order.** Phase 0 spikes Cursor/Grok/Nous; adapters ship in Phase 3. Spike notes into 03 can go stale; the doc doesn’t say re-verify before build.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No craft / design QA phase | Tokens in P0; packaging/theme/phone in P5; nothing for hierarchy, states, density, motion, a11y across real data |
| Testing not phased | Unit/contract/Playwright listed once; unclear what must pass before each done-when |
| Phase 5 incomplete | Packaging *or* service, backups, notifications, light theme, tunnel—five items, no acceptance |
| “Compare mode” appears cold | First mention in Phase 4; no definition or dependency |
| Notifications unspecified | Channel, urgency, overlap with Inbox unread |
| Mock switch semantics | “Keep mock data switchable” with no rule for mixed mock/real or production footguns |
| Early data durability | SQLite + history in P1; backups UI only in P5 |

---

### Unrealistic scope

- **Phase 0 “days”:** repo reshape + full shell IA + five spikes is already a multi-week foundation for one person.
- **Phase 1** is a full local product: daemon, auth, SSE, events, two adapters, Connections, streaming, history, fallback.
- **Phase 4** packs Scout pipeline, file/project index + search, Home aggregation, ⌘K, compare, *and* security hardening—each is a phase elsewhere.
- **Phase 5 “Polish”** is distribution, data safety, OS integration, second theme, and remote access.

Done-whens for P2 (week without lost runs) and P4 (≤30% Scout noise) are good; they also imply long soaks that don’t fit a linear “next phase starts” story without parallel track language.

---

### Security / privacy risks (in this doc)

1. **Unattended Phase 2 tools** without sandbox or approval-rules UI → highest practical risk in the plan.
2. **Phone over a tunnel (P5)** expands the attack surface; Risks table covers CLI churn and scope creep, not remote access, token theft, or tunnel misconfig.
3. **Auth token (P1)** named once; no roadmap note on bind address, storage, rotation, or “mock vs live” auth.
4. **Phase 4 indexing** of files/projects with no privacy/redaction milestone (history + index before backups UI compounds retention risk).
5. **Subscription burn** is mitigated in Risks; **data exfil via adapters/workflows** is not.

---

### UI / design quality (impeccable Operate + design-taste)

Lens: Operate/Read restraint, craft-floor, app-screen rules (quiet chrome, colour on data, honest states), house bans (no glass-as-default, no assistant violet/indigo, no gradients, Inter-as-default smell).

**Committed direction vs craft**

- Phase 0 **adopts Translucent Glass**—frosted panels, blur, atmospheric gradients, violet accent (as defined in 14). Design-taste house rules ban glass, gradients, and that assistant palette; craft-floor treats glass/blur as decoration unless the brief earns it. The brief *does* pin Glass, so this is intentional—but the roadmap never budgets the hard parts Glass creates: **legibility on frosted panels**, nested-blur perf, solid fallbacks, `prefers-contrast` / `prefers-reduced-motion`. Those stay implicit in 14 while the roadmap only schedules “light theme” later.

**Hierarchy & density**

- Adding Inbox, Agents, Workflows, Scout, Kanban routes in Phase 0 before real backends yields a **dense icon rail of empty Operate surfaces**—app-screen failure mode: chrome without the one job and real first rows.
- Phase 4 Home + Scout + ⌘K + compare dumps **many entry points** with no distill pass → cognitive load and competing hierarchy (Home glance vs Inbox vs palette).

**Typography & contrast**

- No roadmap work on type scale, measure, or dim-on-glass contrast; light theme in P5 is the only explicit visual follow-up. Expect **dim text on glass** and a late theme that fights the dark Glass world instead of sharing one type/spacing system.

**Spacing / motion**

- No motion budget, signature moment, or reduced-motion gate—yet Glass UIs often lean on blur/atmosphere as “motion.” Risk: either dead UI or scattered decorative motion at packaging time.
- Notifications + phone tunnel in the same “polish” bucket with no density pass for bottom-tab / sheet layouts under real content.

**What the roadmap gets right**

- Shell-first, mock-switchable, screen-by-screen backend is a solid Operate strategy.
- Concrete done-whens (chat works; briefing week; Hermes Ready→Review; Scout noise %) beat feature laundry lists.
- Hermes mock-first matches “build against a contract.”

---

### Highest-impact fixes (if you revise the doc)

1. Shrink Phase 0 to: monorepo + mock layer + **Chat (+ Connections) only**; other routes when their phase starts.
2. Move **approval policy + sandbox** to land with or before any workflow tool/shell step (before the P2 week soak).
3. Split Phase 4; give Phase 5 a done-when; add tunnel/auth to Risks.
4. Either treat Glass as pinned and add an explicit **craft gate** (contrast on glass, states, reduced motion, one type scale)—or delay token lock until after P1 proves the chat surface.
5. Don’t call light theme / packaging / remote access “polish.”

I’m in Ask mode, so this is review-only—no doc edits. Switch to Agent if you want the roadmap patched.
