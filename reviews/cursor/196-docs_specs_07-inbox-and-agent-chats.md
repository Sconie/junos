**Verdict:** The IA is sound for an Operate triage surface (one queue, keyboard-first, approve only in focused detail), but the doc under-specifies the visual/interaction system and over-reaches on channels and agent surfaces. The biggest ship risks are blind Telegram approvals, an API that doesn’t match the action matrix, and a three-pane layout with almost no density, state, or phone rules.

*Reviewed working-tree `docs/specs/07-inbox-and-agent-chats.md` (Rev 2 + 2026-10-22 decisions). Ask mode blocked verifying blob equality with commit `595fe13`.*

Mode: **Operate** (impeccable) / **app screen · inbox + list** (design-taste). Ambition should be precision and restraint, not expression.

---

### Contradictions

1. **Action vocabulary vs API** — The kinds table lists Dismiss, Retry, View logs, Mute, Reply, Open, Save, Ask Claude; the API only allows `approve|deny|done|snooze|card`. Either the API is incomplete or half the UI is undefined.

2. **Done vs Dismiss vs Mute** — Filter `Done`, key `e` done, finding **Dismiss**, failure **Mute task**. Same lifecycle? Different? Unclear whether dismiss expires, mutes suppress future items, or done is the only terminal state.

3. **Filters mix kind and status** — `Approvals` / `Findings` are kinds; `Needs me` / `Snoozed` / `Done` are states. `All` + counts with no rule for double-counting (e.g. urgent approval in Needs me *and* Approvals).

4. **“Mention” naming collision** — Inbox kind `mention` = “agent asked a question.” Agent chats also have `@agent` mentions from normal chats. Two flows, one word.

5. **Urgent definition vs real triage** — Urgent = “blocked approvals” only. Failures and findings that also “need Jonas” stay `normal` unless something else raises them — fights the opening line (“everything that needs Jonas”).

6. **Sort freeze vs live stream** — Rev 2: no re-sort while detail is open; also `inbox.item` streams for the badge. Unspecified whether the open row can jump, disappear, or go stale under the user.

7. **Telegram vs ApprovalCard bar** — Rev 2 requires actor / exact action / diff / irreversibility in Inbox; the open question makes Telegram Approve/Deny first-class for urgent items with no parity requirement. That’s a product contradiction: same irreversible act, two safety levels.

---

### Gaps

| Area | Missing |
|---|---|
| Auth / tenancy | API and event stream have no auth, actor, or “single-user only” statement |
| Race / dual channel | Concurrent Inbox + Telegram decide; timeout auto-deny vs Telegram approve |
| Dedup | `source+key` undefined; what is `key` per kind? |
| Snooze | Timezone / wall clock for “next morning” |
| Search `/` | Fields, ranking, whether Done/Snoozed are included |
| Volume | Pagination, cap, what “14-day expire” does to search |
| States | Empty, loading, approve-in-flight, approve-failed (Hermes moved on), offline |
| A11y | Focus trap in three panes; urgent without color-only; live region for stream |
| Phone | Three panes; design-taste: one region at a time — not mentioned |
| Visual system | Density, type scale, selection/hover, priority encoding, motion — “matches mockup” with no mockup in-doc |
| Home summary | What Home shows and that it must **not** expose approve/deny |
| Agent chat | Shortcut conflicts with Chat (04); run-card layout; directive vs progress message types |
| Custom agents v2 | Boundary vs v1 Hermes/Scout; who can create; memory isolation |

Acceptance criteria cover three happy paths; they don’t cover timeout, Telegram, stale, or dual-channel races — the hard parts of Rev 2.

---

### Unrealistic scope (for one spec / early slice)

Bundled into one doc:

- Full multi-kind triage product (6 kinds, 8 filters, keyboard map, desktop notifs)
- Hermes approval gateway + **Telegram bot** as a second decision surface
- Scout findings → cards / Claude
- Agent chat parity with Chat + run cards + directives
- Cross-chat `@agent` handoff
- Custom agents (v2) and mail/calendar (v2) still sitting in the same mental model

That’s several products. A realistic v1 cut: **Inbox approvals + failures + one Hermes agent thread**, with Telegram either deferred or limited to *notify + deep link*, not approve.

---

### Security / privacy

**High**

- **Telegram Approve/Deny without ApprovalCard parity** — Compromised Telegram session or a terse button label can authorize write/external/spend-class steps. Spec already forbids “Approve and remember” for external/destructive/spend; it does **not** forbid Telegram from approving those same classes.
- **Desktop notifications for urgent** — Lock-screen / banner text can leak action target, paths, or message snippets. Need redacted notification body.
- **`Save to file` / View logs / full detail body** — Agent output often contains secrets, tokens, or PII; no redaction, path policy, or log ACL.

**Medium**

- Event stream `inbox.item` for sidebar badge — no auth/subscription scope in the sketch.
- **`@agent` from any normal chat** — prompt-injection / confused-deputy path into an agent with tools; no trust boundary.
- **“Approve and remember”** — durable privilege expansion; needs rule preview, scope display, and revoke (points at 12, but Inbox UX for “you’re about to persist trust” is unspecified).
- Custom agent `memory scope` (v2) — cross-agent leakage if scopes aren’t real isolation.

**Already good (keep)** — Bot token in keychain; numeric user-id allowlist; gateway checks button presses like any approval; stale/expired non-reanswerable; approve shortcuts only in focused detail.

---

### UI / design quality (skills lens)

**What’s working (as planned)**

- Clear **one job**: triage what needs Jonas (app-screens §2.2).
- Familiar **mail three-pane** pattern — Operate “earned familiarity,” not novelty.
- **Approve only in focused detail** + no list-row approve — strong error prevention.
- **Sort freeze while detail open** — prevents the classic “approve the wrong row” valley.
- Shared **ApprovalCard (14)** — right place for high-stakes hierarchy.

**Hierarchy**

- Eight left filters with counts will dominate chrome; design-taste: colour/count noise on chrome, not data. Default should open on **Needs me** (or Approvals) with quieter secondary filters.
- List row = title + source icon + age + priority: four competing signals. Prefer **identity + one status mark + age**; encode kind via source, not a second badge.
- Agent list “each agent has a **card**” — for an Operate nav, rows with status beats a card grid (taste: cards only when they hold interaction; here the interaction is “open thread”).

**Density / spacing**

- Spec is silent; inbox is a long-session queue → aim **dense/medium**: ~36–44px single-line rows (or ~56–72px two-line), one gutter, sticky list header, total above the list (“12 need you”). Three equal panes with padded “cards” will feel like a template, not a tool.
- Detail “full body” without a typed layout per kind → wall of prose. Approvals get ApprovalCard; findings/results/failures need the same discipline (summary strip → evidence → actions).

**Typography**

- No scale. Operate/impeccable: one family, tight steps (~1.125–1.2), title ~18–24px, row title ink, age/meta muted — not a marketing hero. Avoid tiny tracked uppercase filter labels (taste house rule).

**Legibility / contrast**

- Priority as colour-only fails a11y and taste (“colour says good/bad”). Urgent needs position (pin), label, or mark — not only red.
- Soft grey for primary row titles would fail “running text in full ink.”
- Stale/resolved approvals need a **distinct** quiet treatment (struck or “Resolved · via Telegram”) so they don’t look actionable.

**Motion**

- App screens: motion = feedback only (150–250ms). Spec shouldn’t invent list choreography. Do specify: selection change, detail swap, approve success/fail, badge pulse — and `prefers-reduced-motion`.
- Streaming reorders while reading = motion-as-harm; freeze already helps — also freeze scroll position and show “N new above” rather than jumping.

**Phone**

- Absent. design-taste §12: list → push detail → back restores scroll. Eight filters must collapse to chips/sheet so the first row stays in the top ~60% of the screen.

**Cognitive load**

- Visible decision points on a list row can exceed ~4 if every kind’s actions leak onto the row. Keep row to open/select; park actions in the detail (already partly done for approve/deny).

---

### Heuristic scores (planned UX, not rendered UI)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | Stream/badge ok; no loading/stale/freshness; sort freeze invisible |
| 2 | Match real world | 3 | Inbox metaphor fits |
| 3 | User control | 2 | Auto-deny + Telegram decide without clear undo/audit in this doc |
| 4 | Consistency | 2 | Inbox vs Telegram vs Chat @agent; Done/Dismiss |
| 5 | Error prevention | 3 | Focused approve is strong; Telegram undercuts it |
| 6 | Recognition | 2 | 8 filters + overlapping “mention” |
| 7 | Flexibility | 3 | Keyboard map is a real power-user win |
| 8 | Minimalist | 2 | Scope sprawl; cardy agent list; count chrome |
| 9 | Error recovery | 1 | Failed approve/retry races unspecified |
| 10 | Help | 1 | No empty/first-run copy; shortcuts undiscoverable |
| **Total** | | **21/40** | Needs cut + harden before build |

**Design specificity:** Category-interchangeable “mail three-pane + agent cards” unless JunOS/Hermes/Scout vocabulary and ApprovalCard content do the identity work. Spec doesn’t pin that face.

---

### Priority issues

1. **[P0] Telegram approve without ApprovalCard-grade disclosure** — Same gateway decision, weaker UI → irreversible mistakes / abuse. Fix: notify + deep link only, or Telegram only for low-risk classes with mandatory summary fields.
2. **[P0] API / lifecycle mismatch** — Implementers will invent dismiss/retry/mute. Fix: one state machine (`new|snoozed|done|resolved|…`) and one action enum that covers the table.
3. **[P1] No dual-channel / timeout race rules** — Fix: single decision record, idempotent actions, UI for “already decided elsewhere.”
4. **[P1] Visual + responsive system missing** — Fix: one paragraph on density, selection, urgent encoding, per-kind detail skeleton, phone push-detail; link or embed the mockup.
5. **[P2] Scope** — Split agent-chat `@` routing and custom agents out of the Inbox v1 acceptance path.

---

### Minor

- `Ask Claude about it` vs opening an agent chat: two AI doors for one finding.
- Digests as inbox items fight “needs me”; better as a digest surface or low shelf.
- Cross-refs to 04 / 12 / 14 without in-doc contracts for shortcuts and card fields.

---

If you want a follow-up, the highest-leverage rewrite is a **v1 slice box** (kinds, channels, acceptance) plus a half-page **Operate visual contract** (density, selection, urgent, phone). I’m in Ask mode so I can only advise — switch to Agent mode if you want that edit drafted.
