**Verdict:** The roadmap’s sequencing fights its own principle, and Phase 0 locks in a visual system both design skills treat as a failure mode. Security and design are both scheduled as late “hardening/polish,” after real automation and a multi-surface shell already ship.

---

### Contradictions

1. **Narrow path vs Phase 0 breadth**  
   Opening principle: one real E2E path (Claude via subscription), then widen. Phase 0 instead: monorepo split, mock API, **all** shell routes (Inbox, Agents, Workflows, Scout, Kanban), and **five** provider spikes. Done-when is “mock data for all screens,” not a working Claude chat. The principle’s E2E lands in Phase 1; Phase 0 is the opposite of “one path early.”

2. **Glass tokens vs the skill lenses**  
   Phase 0: “Adopt the Translucent Glass tokens (14).”  
   - Impeccable craft floor: refuse glass/blur as decoration.  
   - design-taste: **No glass**, no backdrop-blur panels, no floating pill nav; app screens want colour on data, not chrome.  
   Foundations literally adopt the banned chrome pattern.

3. **Automation before controls that make it safe**  
   Phase 2: scheduler, workflow runner with **tool** steps, unattended week.  
   Phase 3: Hermes + approvals **in Inbox**.  
   Phase 4: sandboxed shell + approval **rules UI**.  
   So tools and agents run before sandbox and policy UI exist. Testing lists “approval policy” with no phase that owns implementing it.

4. **Light theme as Phase 5 polish**  
   If glass tokens are dark-chrome foundations, light theme as afterthought contradicts “pick light/dark from the use scene” (craft floor) and leaves Phases 0–4 without a second theme or contrast plan.

5. **Scope-creep rule vs Phase 0 packing**  
   Risks say each phase has a done-when and the next doesn’t start until the last passes — but Phase 0 is several phases of work under one gate.

6. **Phase 5 has no done-when**  
   Breaks the mitigation table’s own rule.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No calendar sizing for Phases 1–5 | Only Phase 0 says “days”; done-whens need wall-clock weeks |
| Mock → real ownership | “Switchable mocks” never gets a kill-switch / per-screen readiness rule |
| First-run / Connections setup | Phase 1 done-when needs subscriptions working; no onboarding callout |
| Failure visibility before notifications | Phase 2 needs a week unattended; notifications are Phase 5 |
| Backup story early | SQLite in Phase 1; backups UI only in Phase 5 |
| Privacy / data-leaving-machine | Prompts via CLIs, indexing, Scout — no phase owns retention or redaction |
| Daemon bind / token threat model | “auth token” with no localhost-only, storage, or rotation |
| Design craft beyond tokens | No type scale, density, states matrix, motion, a11y, or product face |
| Inbox IA | Phase 2 (results/failures) vs Phase 3 (approvals) — one surface, two jobs, no merge plan |
| Compare + Home + ⌘K + Scout | Four awareness surfaces in one phase with one Scout-noise metric |

---

### Unrealistic scope

- **Phase 0 “days”:** tokens + route sprawl + `apps/web`/`apps/daemon`/`packages/shared` + mock layer + five 1-day spikes is already a multi-week foundation if spikes slip.
- **Phase 2 / 4 done-whens** need a clean week of real use, not “code complete.” That is calendar risk, not a checkbox.
- **Phase 3** stacks Hermes (mock→real), Kanban rules, agent chats, **and** Cursor/Nous/(Grok) adapters under one gate.
- **Phase 4** mixes indexing quality (hard), Scout noise &lt;30% (hard), Home aggregation, ⌘K, compare mode, **and** security hardening — one “Awareness” label for unrelated risk classes.
- **Playwright per screen** after Phase 0 adds every route amplifies test cost before any real backend path exists.

---

### Security / privacy risks (as scheduled)

1. **Tool-capable workflows (P2) and Hermes (P3) before sandboxed shell (P4)** — highest sequencing risk in the doc.
2. **Auth token + SSE daemon (P1)** with no bind address, token storage, or “local only vs LAN” — especially dangerous once Phase 5 adds **phone over a tunnel** (remote exposure framed as polish).
3. **File/project indexing (P4)** with no mention of what is read, stored, or sent to providers — privacy gap next to Scout/Home.
4. **Subscription CLIs** — prompt/content egress is inherent; roadmap never names logging, retention, or “what never leaves disk.”
5. **Approvals after unattended automation** — Phase 2’s week-long briefing can fail or act without the Phase 3/4 approval story.

---

### UI / design quality (impeccable Operate + taste app-screens)

This product is **Operate / app-screen** work: scanability, quiet chrome, real data, one job per screen — not a marketing glass showcase.

1. **Hierarchy / chrome** — Shipping every major nav route in Phase 0 before one real loop works predicts empty shells, &gt;4 peer nav destinations, and chrome-first IA. Taste: nav recedes; first screen must answer the job with real rows, not kit.

2. **Glass = contrast & legibility debt** — Blur/translucency is a classic body-text contrast failure (craft floor: ≥4.5:1). Adopting glass tokens with no contrast gate is a design-quality landmine.

3. **Typography & density** — Never specified. Chat, Inbox, Kanban, Scout, and Home need different density rules; the roadmap treats them as feature ticks. Taste: KPIs as type not tiles; tables as alignment; no hero header chrome.

4. **Spacing / rhythm** — “Build backend behind the shell” with no layout pass risks nested cards, hairline dividers, and identical panel grids — all house-rule fails in taste and craft floor.

5. **Motion** — Streaming chat (P1) and Scout/Inbox updates need intentional motion + `prefers-reduced-motion`. Roadmap is silent; default will be either none or scattered fades.

6. **States** — Only Connections “real states” (P1). Empty/loading/error for Tasks, Inbox, Kanban, Scout, Home are unspecified — craft floor treats missing states as unfinished Operate UI.

7. **Product face** — Taste: one face from the product’s world, mark/name in the shell, colour on data. Roadmap chooses a **category glass kit** instead of a subject-derived system.

8. **Phone / adapt late** — Phase 5 tunnel access without an earlier phone composition plan treats responsive as packaging, not layout.

9. **⌘K + compare in “Awareness”** — Power-user density on top of an unproven information architecture; easy to ship palette chrome before the underlying lists are legible.

10. **Phase 5 “Polish”** — Light theme, notifications, packaging bundled as polish. For Operate UI, theme contrast, failure notification, and readable density are not polish; they are the craft floor.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Reorder Phase 0 around **one Claude mock→thin-real path**; defer Scout/Kanban/Agents routes until their phase.  
2. Replace “adopt Translucent Glass” with “tokens that meet contrast + flat surfaces; glass only if 14 is rewritten against the craft floor.”  
3. Pull **sandbox + approval policy** to before or with Phase 2 tool steps.  
4. Give Phase 5 a done-when; split “remote access” out of polish into an explicit security gate.  
5. Add a thin **Operate UI bar** per phase: empty/error/loading, density note, no new nav item without a primary job and real data.

I can go deeper on any one phase’s done-when or draft a reordered phase table if you want that next (still Ask mode: advice only).
