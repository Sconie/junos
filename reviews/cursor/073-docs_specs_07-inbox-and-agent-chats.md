**Verdict:** Spec 07 defines a clear Operate surface (“what needs Jonas”) but is too thin for the scope it claims: action vocabulary fights the API, visual craft is entirely deferred to an unnamed mockup, and high-stakes flows (approve / remember / notify / `@agent`) lack the safety and state design an inbox needs.

Mode through the skills: **Operate** (impeccable) / **app screen · inbox** (design-taste). Ambition here is precision and scanability, not marketing expression.

---

### Contradictions (within this doc)

1. **Actions vs API** — The kinds table promises Approve, Deny, Approve and remember, Make card, Dismiss, Snooze, Ask Claude, Open, Save to file, Retry, View logs, Mute, Reply inline. The API only allows `approve|deny|done|snooze|card`. Retry, mute, dismiss, reply, save, “ask Claude,” and “approve and remember” have no contract.
2. **Done vs Dismiss vs `e`** — Filters and auto-expire use **Done**; kinds use **Dismiss**; keyboard uses **`e` done**. Unclear whether these are one state or three.
3. **Filters vs query model** — Eight filters (All, Needs me, Approvals, Findings, Results, Failures, Snoozed, Done) with counts, but the sketch only shows `status=new&kind=approval`. No model for Needs me, Snoozed, Done, or count aggregation.
4. **Keyboard vs kinds** — `a`/`d`/`c`/`s`/`e` cover a subset; Retry, Mute, Reply, Ask Claude, Save, Open have no keys and no “primary action per kind” rule when focus is on a row.
5. **Agent chats vs reuse** — “Same component as Chat (04)” vs a left list of **agent cards** (status, current task, last active). That is specialized chrome, not a badge on the same shell.
6. **Mentions** — Inbox kind `mention` (“Reply inline”) vs `@agent` handoff from any normal chat that “returns its answer inline.” Two mention paths, one word, no ownership.
7. **v1 vs v2** — Custom agents are “v2,” but Agent chats already lists Hermes, Scout, **or a custom persona**. Acceptance criteria only covers Hermes.

---

### Gaps

| Area | Missing |
|---|---|
| **Screen question** | Never stated. For an inbox it should be something like “Who/what is waiting on me?” — that should drive list vs detail weight and what is biggest. |
| **Visual system** | “Matches mockup” with no tokens, type scale, row pitch, selected-row treatment, or priority encoding. Craft is outsourced. |
| **Approval safety** | Detail says “full body”; list does not require a one-line preview of *what* is being approved. Fast `j/k` + `a` without preview is unsafe. |
| **States** | No empty, loading, error, offline, or “Hermes timed out while you were on this item.” |
| **Selection / focus** | Keyboard-first with `/` search — no rule for when shortcuts are armed vs when the field owns keys. |
| **Snooze return** | “Until a time or next morning” — no sort/filter behavior when snooze ends (badge? Needs me? notification?). |
| **Urgent affordance** | Urgent sorts first and notifies; no list/detail visual rule (ink vs chip vs icon). |
| **Mobile** | Three panes (filters · list · detail) with no collapse model. App-screen rule for inbox: **one region at a time**. |
| **Bulk / multi** | None. |
| **Undo** | Approve, deny, auto-deny, mute, dismiss — no undo window. |
| **Counts vs unread** | Stream updates “unread badge”; relation to filter counts and Needs me is undefined. |
| **Copy** | No trade-language empty states (“Nothing waiting on you”, “3 approvals blocked”). |
| **Agent run cards** | Presence asserted; density, collapse, and link-to-timeline behavior unspecified. |

---

### Unrealistic scope

One short doc owns: six item kinds, eight filters, a full keyboard map, dedupe, expiry, snooze, approval timeout, desktop notifications, live events, three-pane inbox, agent-grouped chat, run cards, directives, cross-chat `@agent`, and custom-agent config — with **three** acceptance checks.

Especially heavy for a thin sketch:

- **Approve and remember** (policy engine, not a button label)
- **Ask Claude about it** (new product surface)
- **Custom agents** (prompt, tools, memory) parked as v2 but already in the agent model
- **Mail/calendar** already in open questions while the inbox is described as “everything”

Ship slice that matches acceptance: failures + Hermes approvals + Hermes agent thread. Defer remember-rules, Ask Claude, mute, digests-as-first-class, and custom agents until those have their own contracts.

---

### Security / privacy risks

1. **Approve and remember** — Persistent privilege with no revocation, scope preview, or audit UI in this doc. Highest-risk line in the file.
2. **Auto-deny on timeout** — Silent irreversible deny; no “what was denied / why / how to re-run” in the item after expiry.
3. **Desktop notifications** — Urgent items raise OS notifications; no rule that titles/bodies must be redacted (approvals and findings can be sensitive).
4. **`@agent` from any chat** — Cross-thread handoff can leak context into an agent with a different tool/memory scope; no isolation rule.
5. **Ask Claude about it** — Implies shipping finding content to a model; no data-handling note.
6. **API sketch** — No auth, idempotency, or confirmation for approve/deny; race with Hermes timeout unaddressed.
7. **Mute task** — Can hide ongoing failure signal; no “muted until / show muted” semantics.
8. **Events stream** — `inbox.item` to the UI for badges; no mention of auth or payload minimization.
9. **Custom `agent.config_json`** — Tool allowlist + memory scope is a security surface; named but not constrained here.
10. **Save to file / Make card** — Destination and content sanitization unspecified (path, secrets in bodies).

---

### UI / design-quality (hierarchy, spacing, type, density, motion, legibility, contrast)

Through Operate + app-screen inbox rules:

**Hierarchy**  
Eight equal filters flatten “Needs me.” Urgent is a sort key, not a visual primary. Detail holds “the actions,” so the list becomes a passive index — weak for a triage queue where the main job should be one clear next action. Agent “cards” for status compete with the thread (product UI should use **rows**, not status cards).

**Density**  
Inbox wants medium–dense list work (≈44–56px rows, or tighter single-line). Spec’d fields (title + source icon + age + priority) push two-line rows and competing marks. App-screen rule: **one status mark per row**; priority + kind + source icon is three.

**Typography / spacing**  
Zero scale, measure, or panel rhythm. “Matches mockup” is not a type system. Risk: soft-grey secondary text for age/priority that fails contrast, and identical weight for title vs metadata.

**Chrome / tells**  
Source icons per kind risk the “coloured icon per category” generated-dashboard tell — prefer one quiet glyph set; put colour only on urgent/blocked data. Filter counts are fine; eight filters plus Done/Snoozed is heavy chrome for v1.

**Selection / focus / motion**  
No selected-row treatment (app-screens: selected list row uses nav `--active` fill, not a focus-ring lookalike). No hover/press/focus for Approve/Deny. Operate motion: **150–250ms state feedback only** — doc is silent (acceptable) but high-stakes actions need visible confirmation, not choreography.

**Legibility / contrast**  
Priority as a list column invites pale pills. Prefer structural urgency (sort + full-ink title / quiet secondary) over a fourth label. Age as relative time is good; keep it secondary ink, not another badge.

**Phone**  
Three-pane + left filter rail fails below ~900px unless specified as list → push detail → back (and filters as a sheet or segmented control). Untouched.

**Agent chat**  
“Run cards next to text” without a max stack, collapse, or timeline deep-link pattern will either starve the transcript or turn the thread into a card feed. Directives → plan → progress needs a clear visual sequence (plan block, then progress, then run card) — not specified.

**Emotional / high-stakes**  
Approvals are the peak moment. Spec optimizes for keyboard speed (`a`/`d`) without requiring the irreversible payload to be visible in context. That is a craft and trust failure, not just a missing AC.

---

### What would move this doc most (design lens)

1. **One question + v1 cut** — “What is blocked on me?” → filters: Needs me / Snoozed / Done; kinds: approval, failure, result (findings/digests later).
2. **Unify the action model** — One status enum + one action enum that match keyboard, UI, and API; map kind → primary action.
3. **Approval row contract** — List shows irreversible summary; detail shows full body/diff; remember is a separate confirmed flow with scope + revoke pointer.
4. **Replace “agent cards”** with a dense agent list (status as one mark + last active); keep Chat (04) chrome, don’t invent a second card grid.
5. **Specify the three-pane → phone collapse** and empty/loading/error copy in product language.

I did not run rendered inspect/critique (this is a markdown spec, no PRODUCT/DESIGN.md in-repo). If you want the same lens on the mockup or implementation next, point at that target.
