**Verdict:** As an Operate-mode spec this is a thin IA sketch, not a buildable inbox/agent-chat surface. The product idea is clear; the action model, API, and visual system contradict each other or are missing, and the 3-pane + agent-card layout as written leans toward dense chrome and under-specified triage.

Mode: **Operate** (impeccable) / **app screen · inbox + list** (design-taste). No PRODUCT.md/DESIGN.md, no mockup linked — review is of this doc only.

---

### Contradictions

1. **Actions table vs API.** Kinds expose Approve-and-remember, Dismiss, Ask Claude, Open, Save to file, Retry, View logs, Mute, Reply inline. The API only accepts `approve|deny|done|snooze|card`. Half the product surface has no write path.

2. **Filters vs status model.** UI has All / Needs me / … / Snoozed / Done; `GET` only sketches `status=new`. “Needs me”, snoozed, and done are undefined as queryable states.

3. **Keyboard set vs actions.** Shortcuts cover done / snooze / approve / deny / make card. No keys for dismiss, retry, mute, reply, save, or “approve and remember” — so “keyboard first” only works for a subset of kinds.

4. **Triage purpose vs digests.** Opening line is “everything that needs Jonas,” but digests are low-priority noise that auto-expire. They dilute the queue the screen is for (app-screens: one question first).

5. **Agent chat = Chat (04) vs different shell.** “Same component” plus “left list groups by agent; each agent has a card” is a second IA. Either it’s a shared thread component with a different shell, or it isn’t the same surface — the doc says both.

6. **Claude vs agents.** Findings get “Ask Claude”; chats bind Hermes / Scout / custom. Unclear whether Claude is a fourth agent, a model, or a one-off action.

7. **Acceptance vs scope.** AC covers Retry, Approve, and Hermes run cards. Spec also commits to six kinds, eight filters, shortcuts, live badge, notifications, `@agent` handoff, and v2 custom agents.

---

### Gaps (block implementation)

| Area | Missing |
|---|---|
| Screen question | Never stated (e.g. “What needs me?”). Without it, “All” leading the filter rail fights the job. |
| Kind → filter map | What lands in Needs me vs Approvals vs Mentions? Mentions aren’t a filter. |
| Dedupe `key` | Shape and ownership undefined. |
| Time | “Next morning”, approval timeout, 14-day expire: timezone, clock source, who sets timeout. |
| Body / rendering | Markdown? HTML? Truncation in list vs detail? |
| Search `/` | Scope, ranking, whether it leaves the current filter. |
| States | Empty, loading, error, offline stream, stale counts — required for app screens (§11), absent. |
| Phone / tablet | 3-pane collapse (list → detail, filters as chips/sheet) unspecified; design-taste requires one region at a time on phone. |
| Visual system | No widths, row pitch, type scale, priority encoding, selection treatment, contrast. “Matches mockup” with no mockup in-doc. |
| Undo | Deny, mute, dismiss, auto-deny — no reverse or confirm. |
| Auth / multi-user | Written for Jonas; no actor, workspace, or who may approve. |

---

### Unrealistic scope

- **One doc = two products:** triage inbox *and* agent-bound chat with run cards, directives, and cross-chat `@agent`.
- **v2 custom agents** (prompt, tools, memory) sit beside v1 AC with no cut line — high leverage, high risk, zero UX for create/edit/test.
- **Open questions already expand:** push/email + Gmail/Calendar as sources before the six kinds have a coherent action/API model.
- **Realtime** (`inbox.item` → badge) without reconnect, ordering, or count reconciliation rules.

Cut for a first ship: Approvals + Failures (+ Mentions if Hermes asks), three filters (Needs me / Snoozed / Done), keyboard for those actions, Hermes agent thread with run cards. Defer digests, “Ask Claude”, Save to file, custom agents, mail/calendar.

---

### Security / privacy

| Risk | Why it matters |
|---|---|
| **Approval timeout → auto-deny** | Silent fail-closed without timeout UX, preview of consequence, or override. Fine for some workflows; dangerous if “deny” means discard work or unblock the wrong path. |
| **Approve and remember** | Persistent project trust with no scope, TTL, audit, or revoke in the UI. |
| **Mute task** | Can hide repeated security/ops failures from the only triage surface. |
| **View logs / Save to file** | Logs and artifacts often hold secrets; no redaction, destination, or ACL. |
| **Desktop notification on urgent** | Lock-screen leakage of approval titles/bodies — content policy missing. |
| **`@agent` from any chat** | Handoff into a tool-enabled agent is a privilege boundary; no confirmation, allowlist, or “what this agent can do” in the flow. |
| **Custom agent `tool allowlist` + chat directives** | Prompt/config injection and over-broad tools; v2 with no threat model. |
| **`inbox.item` stream** | Authz, tenant scoping, and whether payloads include full bodies not specified. |
| **Reply inline to agent questions** | Compromised or confused agent can social-engineer the human; no “sensitive action” gate. |

---

### UI / design quality (hierarchy, density, type, motion, legibility)

Lens: Operate restraint + app-screen inbox rules (quiet chrome, colour on data, dense list, states honest).

**Hierarchy / IA**
- Eight filters with counts put chrome before work. App-screens: nav recedes; colour on data not chrome. Lead with **Needs me** (or make it the default view); demote kind filters or fold into one Filters control.
- List row is title + source icon + age + priority with no primary signal for *why it needs you* (kind verb, blocked step, failure reason). Icons-as-source risk icon noise; prefer a short kind/source label in ink.
- Detail pane is a dumping ground (“full body, linked run or card, and the actions”) with no action hierarchy. Findings offer four peer actions → >4 decision points (impeccable cognitive load). Primary should be kind-specific (Approve / Retry / Reply); secondary in a quieter group.

**Density / layout**
- Classic master–detail is right for an inbox; widths and row pitch are absent. For a long triage session this should be **dense** (~28–42px rows, 13–14px body) with air in gutters — not medium “analytics” cards.
- Agent “card” per agent (status, current task, last active) invites dashboard-tile slop: status pills, tinted icons, mini KPIs. Prefer a quiet grouped list: name + one status line in muted type; colour only when status is actionable (error / waiting on you).
- **Run cards beside chat text** can turn the thread into a second timeline. Spec needs size, max density per message, and that cards are summaries linking out — not full Hermes UI embedded.

**Typography / legibility / contrast**
- No page `h1`, no title second line (count / “N need you”), no type roles. Operate: fixed rem scale, tight steps, one family.
- Age and priority as secondary text need two distinct muted levels and tabular nums for age; priority must not be “another grey label.” Urgent = data signal (left edge, ink weight, or one semantic colour on the row’s status), not a rainbow badge set.
- Digests and results in the same list as blocked approvals without strong visual weight difference will bury urgent under normal.

**Motion**
- Operate: 150–250ms feedback only; no entrance choreography. Spec is silent — risk of live stream reordering the list under the cursor (j/k) and badge pulses. Require: stable selection on update, insert without stealing focus, `prefers-reduced-motion` on any row enter.

**Spacing / selection / phone**
- Selected row should use the same `--active` treatment as nav (app-screens §7), not a heavy border/shadow (house: no resting shadows).
- No phone story: three panes must become list → push detail; filters must not eat the top 40% of the screen.
- Empty inbox: keep frame + one sentence + where work will appear — not a centered illustration.

**Consistency with taste skills**
- Banned-on-marketing tells (gradients, glass, icon feature cards) are less absolute on app screens, but **status-coloured filter chrome, agent KPI cards, and icon grids** still read as template inbox. Spec currently points that way by naming “source icon” and “agent card” without forbidding decoration.

---

### Priority fixes before this is implementable

1. One **screen question** + default view = Needs me; cut or nest the other filters.  
2. **Reconcile actions ↔ API ↔ keyboard** (one table).  
3. Drop or explicitly defer digests, Ask Claude, Save to file, custom agents, mail/calendar.  
4. Spec **empty / loading / error / phone**, row anatomy, pane widths, urgent encoding, selection.  
5. Threat notes for auto-deny, remember, mute, notifications, `@agent`, logs.  
6. Split **Inbox** vs **Agent chats** acceptance (or one vertical slice that doesn’t pretend the rest ships).

---

**Design-specificity:** Low — a generic three-pane queue + agent sidebar; nothing yet that could only be this product’s triage (trade language, Hermes/Scout marks, run-card as *this* timeline’s object).

I can turn this into a tightened outline for the same file (still Ask mode: guidance only) if useful.
