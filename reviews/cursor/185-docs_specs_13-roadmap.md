**Verdict:** The sequencing principle (gateway before executors) is sound and the Phase 0→2 “first release” cut is clearer than most roadmaps. As a product/UI plan it still under-specifies Operate-mode craft, and it has a few real contradictions—especially sandbox and Scout used as mitigations before they exist.

Lens: **impeccable Operate** (task UI, restraint, state/motion) + **design-taste app-screens** (quiet chrome, substance on first screen, no template shell). Doc-only; no live UI to inspect.

---

### Contradictions

1. **Principle vs Phase 1 done-when**  
   Principle: one E2E path early (Claude via subscription). Phase 1 done-when requires Claude *and* Codex. That widens the first ship gate beyond the stated principle.

2. **“Control before execution” vs sandbox timing**  
   Revision/principle put gateway, approvals, Stop, localhost *before* automation. Phase 1 still ships executing Claude/Codex adapters; **sandbox hardening is Phase 4**. Phase 0 only “chooses” a sandbox approach. Choosing ≠ enforcing. For CLI agents, that breaks the spirit of the principle the same way late gateway did.

3. **Risks table vs phase order**  
   “Scout watches releases” mitigates CLI format churn, but Scout is Phase 4. Phases 1–3 absorb that risk with no in-phase watcher. Same pattern: mitigation named before the feature exists.

4. **Inbox triage workflow in Phase 2**  
   Starter workflows include “Inbox triage” while mail/calendar are explicitly deferred (Morning briefing). Either “Inbox” means JunOS Inbox (approvals/results)—then the name collides with email triage—or mail is implied and contradicts the cut.

5. **Localhost protections claimed, not listed**  
   Rev. 2 says localhost protections move earlier. Phase 1 lists Origin/Host, CSRF, pairing, cookie auth—not localhost bind/exposure rules. The revision claim is stronger than the phase bullets.

6. **Approvals UI before Inbox**  
   Shared `ApprovalCard` + Stop in Phase 1; Inbox (approvals, results, failures) in Phase 2. Unclear where Phase 1 approvals surface (modal-only? chat-inline?). Two homes for the same control invites inconsistent hierarchy later.

---

### Gaps (product / IA / craft)

| Gap | Why it matters |
|---|---|
| No default landing / shell IA for Phases 1–3 | Home is Phase 4. Until then: Chat? Connections? Empty stub nav? App-screens: shell must name product + scope and put the main job one click away. |
| Phase 0 “route stubs for **all** screens” | Builds full nav chrome with empty destinations—classic template dashboard (sidebar + dead links). Prefer stubs only for the Phase 1–2 job path. |
| No empty / loading / error / offline states in any phase | Operate mode requires full state vocabulary before “done.” Especially Stop, approvals, SSE drop, adapter down. |
| No motion policy | Operate: 150–250ms, state-only, no page-load choreography. “Polish” (Phase 5) is where bad delight usually gets dumped. |
| Stop / Approval hierarchy unspecified | Highest-stakes controls; no “always reachable during stream/run,” confirm-vs-instant, or stacking when many approvals arrive. |
| Notifications in Phase 5 vs unattended week in Phase 2 | Done-when is a week of daemon runs; user learning of failures may be “open Inbox and look.” Unattended without push is a product gap, not just polish. |
| Backups UI in Phase 5; SQLite from Phase 1 | Data durability is a Phase 1 risk with no interim story (even CLI backup). |
| Phone access last; Telegram approvals in Phase 3 | Fine if Telegram is the mobile path—but then “phone access” should say *web UI* vs *approval channel*, or Phase 3 silently becomes the mobile product. |
| Light theme as Phase 5 | Implies dark-only until then. Retrofitting light breaks contrast/hierarchy; app-screens corpus is mostly light. Tokens (14) should own both from Phase 0 or say “one theme until 5.” |
| Compare mode, ⌘K, Home, Scout in one “Awareness” bucket | Four different jobs (search, command, aggregate, pipeline). No priority or first-screen question per surface. |
| Design specificity absent | “Adopt UI tokens (14)” ≠ product face (mark, one signature element, trade vocabulary). Roadmap never says what makes JunOS *not* a generic agent console. |

---

### Unrealistic scope

- **Phase 1** is a full product: daemon, auth, SSE, gateway policy machine, two adapters, Connections, streaming chat, history, provider allowlist, markdown+CSP, ApprovalCard, Stop. That is several “first releases,” not one phase.
- **Phase 1 done-when** mixes UX proof (chat) with security proof (digest binding, altered call reject, Stop kill+audit). Any one failing blocks “phase done”; better as a short security gate checklist *inside* the phase.
- **Phase 2 done-when** (“daily task for a week, including forced restarts”) is an ops soak, not a build milestone—calendar risk for “first release = 0–2.”
- **Phase 3** stacks Hermes (mock→VPS), Telegram bot, Terminal (local+VPS), Kanban atomic pickup, extra adapters. Each is its own integration risk; one done-when (Ready→Review card) ignores the rest.
- **Phase 0 spikes**: five × 1 day is honest timeboxing; writing results “into the spec” without naming *which* spec section owns go/no-go invites orphan spike notes.

---

### Security / privacy risks (from this doc alone)

1. **Execute before harden** — Adapters + workflows (1–2) before sandbox hardening (4). Gateway/approvals reduce blast radius; they do not replace process isolation for CLI agents.
2. **Telegram approvals (Phase 3)** — New channel for high-privilege actions. Doc says “same gateway” (good) but says nothing about what metadata/prompt/tool args leave the machine, bot token storage, or linkability to local identity.
3. **File/project indexing + revocation (Phase 4)** — Good intent, late. Agents/Terminal in Phase 3 can already touch files; indexing without a prior “what can leave disk / what is logged” story is a privacy sequencing smell.
4. **Secret redaction (Phase 1)** — Named once; no scope (events? SSE? logs? UI? adapter transcripts?). Easy to “done” while secrets still hit SQLite or chat history.
5. **Hermes on VPS + Stop honesty** — Done-when allows “cannot confirm” Stop. Correct for integrity; dangerous if UI still shows a confident Stop success state (not specified).
6. **CSP + safe markdown (Phase 1)** — Right place. No mention of attachment/file preview or streaming partial HTML—common XSS footguns next to markdown.
7. **Usage budget** cited via spec 03 when meters unavailable — Roadmap doesn’t say Phase 1/2 UI exposes budget/exhaustion; background jobs can burn subscription silently until Scout/polish.

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility, contrast)

These are failures *implied* by the plan, not pixel bugs:

**Hierarchy**  
Critical controls (Stop, approve/deny) are introduced as “shared components” with no placement rules. Chat + Tasks + Inbox + Console + Terminal + Kanban will compete for primary chrome; without a Phase 1–2 information architecture, everything becomes equal weight in the stub nav.

**Density**  
Phase 0 “all screens” + Phase 3 multi-surface agent board + Phase 4 Home/⌘K/Scout/compare is high density without progressive disclosure. App-screens rule: first screen shows the blocks the brief needs *and* the frequent job one click away—not a gallery of future modules.

**Typography / contrast**  
Tokens in 0, light theme in 5 = contrast and type scale validated on one theme. Terminal (15) in Phase 3 with no contrast/theme note risks unreadable agent output (legibility is the Terminal’s whole job).

**Spacing / composition**  
No mention of shell layout (rail vs top bar), panel rhythm, or approval stacking spacing. Risk of card-grid Inbox and KPI-tile Home when those land—exactly the anti-patterns both skills ban for app screens (icon tiles, sparklines, hero headers).

**Motion**  
Unspecified. Streaming chat and Stop need state feedback; Phase 5 “polish” is the wrong bucket for entrance choreography. Prefer: motion budget in foundations (tokens/14), Operate-only.

**Legibility / scanability**  
Inbox as “approvals, results, failures” with no triage hierarchy (severity, age, blocking vs FYI) will read as a flat list. Scout’s done-when is noise ratio—UI for dismiss/reason is unnamed, so the metric may be gamed or unmeasurable in product.

**Emotional / high-stakes UX** (impeccable)  
Altered-call rejection and Stop are peak anxiety moments. Roadmap proves them technically; it never specifies reassurance copy, irreversible vs reversible framing, or audit visibility in the UI at the moment of action.

---

### What the doc does well

- Gateway-before-automation reorder is the right kind of revision.
- Deny-by-default classes, digest-bound single-use approvals, audit events, CSP/markdown, pairing/CSRF are the right Phase 1 security spine.
- Honest scope cuts (Morning briefing without mail; Repo health/Weekly → Phase 3).
- Hermes mock validated against a recorded real session before “done.”
- Stop may admit it cannot confirm on real Hermes—rare and valuable honesty if the UI matches.

---

### Highest-leverage fixes (still doc-only recommendations)

1. Move **sandbox enforce** (even v1) to Phase 1 with adapters; keep Phase 4 as deepen/harden.  
2. Align Phase 1 done-when with **Claude-only** (or mark Codex as stretch).  
3. Replace “stubs for all screens” with **stubs for Phase 1–2 paths**; hide or omit later routes.  
4. Put **approval surface + Stop placement** in Phase 1; treat Inbox as the queue/history, not the first home.  
5. Pull a **minimal notify path** (even OS/toast or Telegram-later) into Phase 2 before the week-long soak.  
6. Own **dual theme + motion + empty states** under Phase 0 tokens / UI system, not Phase 5 polish.  
7. Fix Risks: Scout-watch → “contract tests + version probe” until Phase 4; rename or redefine **Inbox triage** workflow.

I did not open `14-ui-system.md` or other specs—review is confined to `13-roadmap.md` as requested.
