**Verdict:** Spec is a solid Operate-mode product sketch (triage queue + agent threads), but it is under-specified as a buildable UI/security contract. The biggest risks are action-model inconsistency, silent auto-deny, and a three-pane inbox that invites chrome/status soup without hierarchy, density, or state design.

Mode (Impeccable): **Operate**. Surface kind (design-taste): **app screen / inbox**. No DESIGN.md or linked mockup in-repo; “matches mockup” is unverifiable here.

---

### Contradictions

1. **Actions table ≠ API ≠ keyboard.** Kinds list Approve/Deny/Remember, Dismiss, Retry, View logs, Mute, Reply, Open, Save, Ask Claude. API only: `approve|deny|done|snooze|card`. Keys only: `e/s/a/d/c` (+ `j/k`, `/`). Dismiss vs Done, Retry, Mute, Reply, and “Approve and remember” have no wire or shortcut.

2. **Status vs filter vs priority collide.** Filters: All, Needs me, Approvals, Findings, Results, Failures, Snoozed, Done. API: `status=new`. Rules: priorities `urgent|normal|low`, sort urgent→newest, auto-expire to Done, snooze. Unclear whether Snoozed/Done are statuses, filters over status, or something else; whether “Needs me” is approvals+mentions or a third axis.

3. **Agent chats: same Chat component *and* a different shell.** “Same component as Chat (04)” vs left list grouped by agent with status/task/last-active “cards” plus run cards and directive/plan/progress. That is a different IA, not a thin skin.

4. **Approval philosophy fights itself.** Inbox is “everything that needs Jonas,” but “Approval timeout auto-denies and records it.” Silent deny of a blocked Hermes step is the opposite of human triage unless timeouts, warnings, and undo are specified (they aren’t).

5. **Scope tag drift.** Custom agents are “v2”; mail/calendar “v2”; core Inbox + Agent chats + `@agent` + streaming + notifications read as v1 with no phased cut.

---

### Gaps (product / UX contract)

- **One screen question never named.** Taste/Impeccable Operate: inbox should answer “Who/what is waiting on me?” first. Spec jumps to chrome (8 filters) before the primary work object.
- **Item model incomplete:** read/unread, selection, multi-select, bulk actions, empty/loading/error/offline, pagination or virtualization, search scope (`/` over what?), timezone for “next morning,” what “Mute task” persists, what “Make card” copies, what “Ask Claude” opens.
- **Detail pane layout unset:** body, linked run/card, kind-specific actions — no hierarchy, sticky action bar, or confirmation for Approve/Deny/Retry.
- **Cross-surface handoffs unset:** mention → reply vs open Agent chat; result → Hermes timeline; finding → Scout/Kanban.
- **Responsive / phone:** three-pane + keyboard-first with no collapse (list→detail, filter drawer). Taste app-screens treat phone as its own composition.
- **Acceptance criteria thin vs feature surface:** three ACs for six kinds, streaming badge, snooze, expire, auto-deny, agent run cards, `@agent`.

---

### Unrealistic scope

Packing into one short spec: six heterogeneous item kinds, full keyboard map, live `inbox.item` stream, desktop notifications, dedupe, TTL, snooze, auto-deny, three-pane UI, Chat reuse with run cards/directives, `@agent` routing, plus v2 custom agents (prompt, model, tool allowlist, memory). That is several products’ worth of edge cases; the AC list only proves two paths (failure retry, Hermes approve) and one agent-thread rendering.

Cognitive load: **8 filters** already exceed the “>4 visible options” critique flag before the list or detail actions appear; per-kind action sets make the right pane a shifting control strip.

---

### Security / privacy

| Risk | Why it matters |
|---|---|
| **Inbox approve unblocks Hermes** | Privileged control plane with no confirm, step summary, or authz called out. |
| **Timeout auto-deny** | Automated security-sensitive decision; “records it” ≠ recoverable audit UX. |
| **Approve and remember for this project** | Sticky authorization; scope, revocation, and display of remembered grants missing. |
| **Notification titles / badge stream** | Urgent items may leak task/finding text on lock screen; SSE auth/tenancy unspecified. |
| **View logs / Save to file / digests / findings body** | Likely secrets or PII; no redaction or notification hygiene. |
| **`@agent` from any chat** | Confused-deputy / prompt-injection path into agent tools; no trust boundary. |
| **Custom agents tool allowlist (v2)** | Privilege expansion in the same doc as triage. |
| **Mail/calendar as sources (open Q)** | High-sensitivity data into the same queue — correctly deferred, but unreadiness should stay hard. |

---

### UI / design quality (skills lens)

**Hierarchy.** Middle list is “title, source icon, age, priority” with no primary ink rule. Taste: only identity + key signal in full ink; one status mark per row. Spec implies icon + priority + age competing. Urgent is defined as behavior (notification) not as a scannable list treatment (dot, weight, or left edge — craft-floor warns against thick colored borders as default decoration).

**Filters as chrome.** Eight labeled filters with counts is template-inbox density. Prefer a short “Needs me / Other” (or kind chips that collapse) so the list answers the job; counts need freshness rules or they become noise.

**Spacing / density.** No row pitch, pane widths, or sticky headers. Taste medians: ~45px one-line / ~72px two-line; selected row uses nav `--active` fill (not hover outline). Without this, implementers will invent card-y rows and zebra/hover fills.

**Typography.** “Matches mockup” only. Operate: one family, fixed rem scale (~1.125–1.2), no display face in list/detail. Age/priority as tiny tracked caps or monospace “tech” labels would be banned tells.

**Color / contrast.** Kind icons + priority + urgent notifications invite rainbow chrome. Rule of thumb from app-screens: ~≤5% colored pixels; color on decision state (blocked approval), not every source. Secondary age/meta must stay ≥4.5:1 if used as text — grey-on-grey risk unaddressed.

**Motion.** Unspecified. Operate: 150–250ms state feedback only; no load choreography. Reusing Chat risks message entrance animations in a triage queue — wrong mode.

**Legibility.** Relative “age” without absolute time on focus/detail; digests/results bodies unbounded — detail pane needs measure and scroll plan. Keyboard-first with no legend/empty-state teaching fails craft-floor “empty states that teach.”

**Agent chat “cards.”** Status cards per agent + run cards beside text: high risk of icon-in-tinted-square / KPI-tile slop. Prefer quiet rows (name, one status word, last active) and run cards as compact timeline excerpts, not decorative tiles.

**States missing from the design contract:** empty inbox, zero in a filter, partial stream reconnect, action in-flight (Approve loading), approval already timed out, snoozed-until display, agent offline/busy. Without them the screen will look finished and fail in use.

---

### Priority fixes (if you revise the doc)

1. Freeze a **status machine** (`new|snoozed|done` × kind × priority) and map every filter/API/key to it.  
2. Split **v1**: Needs-me triage (approvals, failures, mentions) + Hermes agent thread; park findings/digests/custom agents/mail.  
3. Replace auto-deny with **explicit timeout UX** (warn → escalate → deny) or require opt-in per approval type.  
4. Add an **Operate visual contract**: one question, row anatomy, selection, action bar by kind, empty/loading/error, notification copy rules, reduced-motion = no decorative motion.  
5. Security: confirm + audit for approve/deny/remember; notification redaction; `@agent` and tool-allowlist boundaries.

I’m in Ask mode, so this is review-only. If you want, I can turn the priority fixes into a concrete rewrite outline for `07` (still without editing the file).
