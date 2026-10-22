**Verdict:** Revision 2 correctly moves the gateway ahead of execution, but as a ship plan it still packs Phase 1–2 too densely, defers real safety/UX controls (sandbox hardening, phone, theme, notifications), and leaves Operate-mode UI mostly as screen names with no hierarchy, density, or high-stakes interaction design.

*Lens: impeccable (Operate mode, craft floor) + design-taste `app-screens` (quiet chrome, colour on data, first screen answers the job). Doc-only; no rendered UI.*

---

### Contradictions

1. **Control-before-execute vs sandbox timing** — Principle: never ship an executing feature before its gate. Phase 0 chooses a sandbox; Claude/Codex run in Phase 1; **sandbox hardening is Phase 4**. That inverts the principle for process isolation.

2. **“Vision” vs concrete later phases** — “First release = Phases 0–2. Everything later is vision,” yet Phases 3–5 have concrete deliverables and done-whens. Unclear what is committed vs aspirational.

3. **Scout as early mitigation** — Risks table uses “Scout watches releases” for CLI churn, but Scout is Phase 4. Phase 1 already depends on fragile CLIs; the mitigation does not exist yet.

4. **Dual approval surfaces** — Phase 1: ApprovalCard; Phase 2: Inbox (approvals, results, failures); Phase 3: Telegram + Inbox through the same gateway. Same policy is good; the doc never says which surface is canonical for “needs me now,” so hierarchy and routing can fork.

5. **“Consented fallback” vs deny-by-default** — Phase 1 pairs deny-by-default gateway with “allowed-providers list with consented fallback.” Fallback scope (model? tool? network?) is undefined and can punch a hole in deny-by-default.

6. **First release vs Phase 2 soak** — First release is Phases 0–2; Phase 2 done-when needs a **week** of unattended success. Ship gate vs calendar soak is not separated.

---

### Gaps

| Area | Missing in this doc |
|---|---|
| Auth beyond browser | Pairing UX, session lifetime, revoke device; Telegram allowlist / bot threat model (Phase 3) |
| Approval UX | How altered digests are shown; Approve/Deny hierarchy; expiry and single-use feedback |
| Stop | Global vs per-run, placement, unavailable/honest-failure UI (only Phase 3 Hermes mentions honesty) |
| Privacy | Chat/history retention, SQLite at rest, Scout/index retention, Telegram copies of approvals |
| IA / design system | Tokens (14) only; no PRODUCT/DESIGN, type roles, density, empty/error/loading, focus |
| a11y | Nothing for keyboard, focus, contrast on Approval/Stop (safety-critical Operate UI) |
| Notifications | Phase 5 “polish,” but Phase 2 automation and Inbox need interrupt paths earlier |
| Workflow value | “Morning briefing without mail/calendar” — content and empty state undefined |
| Within-phase order | Phase 1 lists gateway and adapters together; sequential “gateway first” is principle-only |

---

### Unrealistic scope

**Phase 1** alone is a full product: daemon + SQLite + SSE + pairing/auth/CSRF + Gateway v1 + Approval/Stop UI + two adapters + Connections + streaming chat + history + providers + markdown + CSP. One “done when” covers chat *and* approval *and* Stop.

**Phase 2** adds scheduler semantics (claim/leases/catch-up/idempotency), Tasks, logs, Inbox, workflow runner, loop guards, three workflows, plus a week soak including crash recovery.

**Phase 0** is five one-day spikes plus monorepo, tokens, stubs, mock API — already a sprint before safe core.

**Phase 3** piles Hermes (mock→real), Telegram bot, Terminal (local+VPS), Kanban, more adapters — a second product on top of chat+automation.

Risk: “scope creep” mitigation (“done-when; gateway before executors”) does not cut **width inside** Phase 1–2.

---

### Security / privacy risks

1. **Local daemon + pairing** — High-value execution target; pairing strength and cookie binding are named but not acceptance-tested in done-whens.

2. **Telegram approvals (Phase 3)** — Remote approve channel for gateway actions. Bot token, chat binding, and spoofed approval messages are unmentioned; “same gateway” is necessary but not sufficient.

3. **Terminal (local + VPS)** — “Agent-run commands gated” leaves interactive shell privilege unclear; easy bypass of agent policy if the tab is a raw shell.

4. **Hardening after execution** — CLI agents in Phase 1–3; sandbox hardening in Phase 4. Window of unconstrained/weakly sandboxed tool use.

5. **Streaming + secret redaction** — Redaction is listed; race of tokens into UI/logs before redact is not.

6. **Indexing + Scout (Phase 4)** — Revocation is good; collection before clear retention/UI consent is not sequenced.

7. **Tauri in Phase 5** — Threat model shift (deeper FS/OS) after browser-first assumptions; not called out as a security phase.

8. **Audit** — Audit events exist; integrity, retention, and who can clear them do not.

---

### UI / design quality (impeccable + design-taste)

This roadmap schedules **screens**, not **Operate craft**. Against app-screens / craft floor:

1. **Dark-first, light in Phase 5** — Light/contrast as polish fights “pick light/dark from the use scene” and usually breaks tokens. App-screens study is majority light; deferring light invites grey-on-grey body text and weak Approve/Deny contrast.

2. **Phone in Phase 5** — Approvals, Stop, and Inbox are the job in Phases 1–2. Phone as shrink-later violates “phone is its own composition.” Telegram is a partial escape hatch, not a designed mobile Operate surface.

3. **Shell before product face** — Phase 0 “route stubs for all screens” risks a full nav of empty vision destinations (Home, Scout, Kanban, Terminal…) before chat works — classic “kit, not this product” / crowded chrome with no job on the first screen.

4. **Inbox density** — Approvals + results + failures in one place with no primary question (“what needs me?”). High risk of card grids, status chrome, and colour-on-chrome instead of colour-on-decision.

5. **ApprovalCard / Stop underspecified** — Shared components are named; hierarchy is not (summary vs digest, destructive affordance, disabled/loading, reduced motion). Stop must stay findable and high-contrast; roadmap is silent.

6. **Home + ⌘K + compare (Phase 4)** — Aggregate + command palette + compare is a cognitive-load spike with no density budget or “one job per view.”

7. **Motion** — Only implied via streaming. No policy: purposeful stream vs decorative motion; approvals must not delay behind entrances; `prefers-reduced-motion` absent.

8. **Typography / legibility** — Tokens without roles: chat prose vs code vs digests vs run logs. House rule risk: monospace-as-“technical” costume, or digests too small to verify before approve.

9. **Connections “unified statuses”** — Status colour as meaning (good/bad, not just up/down) is required by app-screens; not specified. Risk row “label read-only in UI” never lands in a phase done-when.

10. **Notifications as polish** — For unattended Phase 2, interrupt design is functional. Burying it in Phase 5 leaves Inbox as a silent queue.

11. **Scout done-when (≤30% noise dismissals)** — No UI for dismiss reason / feedback loop; metric without Operate affordance.

12. **No empty/error/loading** in any phase — Automation and adapters will hit these constantly; craft floor treats them as required, not polish.

---

### What the doc gets right

- Revision 2 ordering: gateway / approvals / Stop / localhost before automation.
- Deny-by-default + digest-bound single-use approvals + audit + Stop state machine.
- CSP + safe markdown called out with chat.
- Hermes mock validated against a recorded real session before “done.”
- Honest Stop failure for VPS Hermes in Phase 3 done-when.
- Starter workflows trimmed so Phase 2 does not depend on GitHub/Kanban.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Split Phase 1 into **1a gateway+Stop+auth** and **1b chat adapters**, each with its own done-when.  
2. Move **sandbox hardening** (and any “label unconstrained CLI”) to before or with first executing adapter.  
3. Promote **phone layout for Approval/Stop/Inbox**, **notification path for approvals**, and **theme/contrast tokens** out of Phase 5 polish into Phase 0–1.  
4. One sentence of **approval IA**: primary surface, how digest mismatch is shown, Stop placement.  
5. Clarify **committed (0–2) vs vision (3–5)** and separate **ship** from **week soak**.  
6. Add a short **privacy/retention** bullet for SQLite, chat, index, Telegram.

I can go deeper on any one phase’s done-when wording, or cross-check this against specs `03`/`05`/`09`/`14`/`15` if you switch out of “this doc only.”
