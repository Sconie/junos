**Verdict:** As an Operate / inbox app-screen brief, the job is clear (“what needs Jonas”), but the doc under-specifies the working UI and over-commits on divergent actions, statuses, and agent surfaces. Several product rules contradict the API and filter model; auto-deny and “remember” approvals are the highest product and security risks.

Mode: **Operate** (impeccable) · surface kind: **inbox / list+detail** (design-taste app-screens). Spec-only review — no rendered UI or inspector.

---

### Contradictions

1. **Kinds vs filters don’t match.** Kinds include `mention` and `digest`; filters are All / Needs me / Approvals / Findings / Results / Failures / Snoozed / Done. Mentions and digests have no dedicated filter; “Needs me” and “Done” are undefined against kinds (status vs kind mix).

2. **Actions table vs API.** Table actions include Dismiss, Retry, View logs, Mute, Reply, Open, Save to file. API only allows `approve|deny|done|snooze|card`. Most primary jobs can’t be expressed.

3. **Keyboard vs actions.** Shortcuts cover done / snooze / approve / deny / card / search. No keys for Retry, Reply, Open, Dismiss. `d` = deny sits next to `j/k` navigation — high mis-hit cost for a destructive act.

4. **Status model is split.** Filters imply snoozed/done; API uses `status=new`. Unread badge, Done, Snoozed, and “new” are never reconciled.

5. **Sort vs dedupe.** “Urgent first, then newest” + “same source+key within 24h updates the existing item” — unclear whether update bumps recency, preserves age, or reshuffles priority.

6. **Agent chat shell vs “same component as Chat.”** Same component as 04, but also a left agent list with status/task/last-active “cards” and run cards in-thread — that’s a different chrome contract, not a skin.

7. **`mention` double life.** Inbox kind “agent asked a question” vs `@agent` handoff from normal chat that “returns its answer inline” — one path is triage queue, the other is synchronous chat. Not distinguished.

---

### Gaps (product + Operate completeness)

| Gap | Why it matters |
|---|---|
| Empty / loading / error / zero states | App-screens §11 / impeccable harden — inbox without “nothing needs you” and failed-stream states will ship as a template hole |
| Phone / narrow layout | Three-pane master-detail has no collapse rule (list-only → detail-only is mandatory for inbox) |
| Row anatomy | Title / icon / age / priority named; no pitch, truncation, selected vs hover, or which field is primary ink |
| Priority visualization | Enum only; no rule for sparse urgent mark vs loud pills on every row |
| “Needs me” definition | Core filter with no membership rule |
| Approval timeout UX | Auto-deny with no countdown, warning, or undo window |
| “Approve and remember” semantics | Scope, key, revocation, and audit not specified |
| Mute / Dismiss / Snooze side effects | Task muted how? Dismiss vs Done vs Deny? |
| Volume / paging | No cap, “load more”, or archive story for a growing queue |
| Search (`/`) | Fields and ranking unspecified |
| A11y | Keyboard listed; focus trap, announce on selection, and contrast floors absent |
| Agent busy / concurrent directive | Plan-then-progress with no conflict or cancellation model |

---

### Unrealistic / soft scope

- One short doc owns: 6 item kinds, 8 filters, streaming badge, desktop notifications, full action matrix, keyboard map, Hermes approvals, Scout findings, agent chat + run cards + `@agent`, and v2 custom agents.
- Acceptance criteria only cover failure→Retry, Hermes approve, and Hermes run cards — fine for a slice, but the written screen is much larger.
- Custom agents (v2) in the same file dilutes the v1 screen question (“who is waiting?”) with a persona builder.

---

### Security / privacy risks (from this doc alone)

1. **`POST /inbox/:id/action` unblocks Hermes** — high-impact mutation; needs authz, CSRF/session binding, and idempotency. Spec is silent.
2. **Approval timeout auto-denies** — silent policy change on agent/workflow state; must be auditable and visible before expiry.
3. **“Approve and remember for this project”** — persistent privilege; prompt-injection or mistaken approve becomes standing authority.
4. **`@agent` from any normal chat** — cross-conversation data handoff into an agent with tools; injection and over-sharing risk.
5. **“Ask Claude about it” / “View logs” / “Save to file”** — finding/result/log content may leave the machine or hit a model; log panes often leak secrets.
6. **`inbox.item` stream → sidebar badge** — live channel needs same auth as REST; badge itself can leak that sensitive work finished.
7. **Custom `agent.config_json` tool allowlist** — config is a security surface; no validation/least-privilege story here.

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Screen question is good: *what needs Jonas?* The specified chrome fights that question.

**Hierarchy & cognitive load**  
Eight left filters + counts + middle metadata + kind-specific action sets in the detail pane is >4 simultaneous decisions (impeccable cognitive-load rule). Primary job (approve / retry / reply) is not visually owned on the first screen; “Make card” and “Ask Claude” sit at the same level as Approve/Deny in the table.

**Filter IA**  
Mixing kinds (Approvals) with states (Snoozed, Done) and a fuzzy “Needs me” produces overlapping chips — classic generated-inbox tell. App-screens prefers sparse scope controls and one clear selected state in the list that drives the detail pane.

**List density & legibility**  
Only four fields named. No row height, no “identity gets primary ink / meta in secondary,” no rule that age is relative words (“2h”) not weak grey. Risk: source **icons alone** (recognition fails) and **priority pills on most rows** (colour on chrome; app-screens wants ~≤3% colour, one status mark per row, saturated fill only when rare).

**Detail pane**  
“Full body, linked run or card, and the actions above” — no primary vs secondary action hierarchy, no confirm for Deny/auto-deny, no long-body measure. High-stakes Approve/Deny need calm layout and clear consequence copy (emotional journey / error prevention).

**Agent chats**  
“Card” per agent (status, current task, last active) invites KPI-tile chrome on a navigation list. Prefer quiet rows. **Run cards beside text** with no density, elevation, or motion rules risks chat-as-card-grid (shadows/glows at rest = house-rule fails) and competing hierarchy with the message stream.

**Typography**  
No type roles. For Operate, expect ~12/14/16/24, one grotesk, meta ≥ ~4.5:1 (not `#999` ages). Spec doesn’t constrain this, so implementation will default to soft grey meta and weak title weight.

**Motion**  
Desktop notification + live badge only. No press/selection feedback budget (Operate: 150–250 ms state only; app-screens: no motion floor, feedback only). No `prefers-reduced-motion` for toast/badge.

**Spacing / composition**  
Three-pane “matches mockup” with no widths, gutter, or selected-row treatment (`--active` fill vs hover outline — app-screens inbox house rule). Phone composition omitted — first fold will fail if all three panes try to share 390px.

**Empty / end states**  
None. Without trade-word empty copy (“Nothing waiting — Hermes is quiet”), the screen reads as an unfinished template.

---

### Highest-priority fixes (spec edits, not build)

1. Reconcile **status × kind × filters × API actions** into one state machine; drop or defer actions the API can’t perform.
2. Define **Needs me**, approval **timeout UX**, and **remember** (key, scope, revoke).
3. Specify **list row** (pitch, ink tiers, one urgent mark, selected = active fill) and **one primary action** per kind in the detail pane.
4. Split or fence **agent chat / @agent / custom agents** so Inbox v1 stays a triage queue.
5. Add **authn/authz, audit, and data-egress** notes for approve, remember, logs, Ask Claude, and the event stream.
6. Add **empty/loading/error**, **narrow breakpoint**, and **destructive confirm** for deny/auto-deny.

I can go deeper on any one section (e.g. a proposed status/action matrix only, or an agent-chat density brief) if you want that next.
