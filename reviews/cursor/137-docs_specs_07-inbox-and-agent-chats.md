**Verdict:** Spec is a solid product outline for an Operate triage surface, but it under-specifies the UI system, over-scopes v1 (especially Agent chats + custom agents), and leaves high-stakes approval/privacy behavior dangerously vague.

Lens: **Operate** (impeccable) + **app inbox/list screen** (design-taste). No live UI to inspect—this is a doc-as-brief review.

---

### Contradictions

1. **Actions table vs API.** Table promises Dismiss, Retry, Mute, Reply, Ask Claude, Open, Save, “Approve and remember”; API only allows `approve|deny|done|snooze|card`. Either the API is incomplete or half the UX is fiction.
2. **Filters vs status model.** Filters include Needs me / Snoozed / Done (and kinds), but the sketch only shows `status=new`. Unread (sidebar badge) is never a first-class status/filter.
3. **Sort vs priority.** “Urgent first, then newest” ignores how `normal` vs `low` order among themselves, and whether age can bury a still-open approval.
4. **Two “mention” concepts.** Inbox `mention` = agent asked Jonas; Agent chats `@agent` = Jonas hands work to an agent. Same word, different jobs—easy to build the wrong affordance.
5. **“Matches mockup” with no layout contract.** Three panes + keyboard map are asserted without row anatomy, selection, or empty states—so implementers will invent chrome the design skills would reject.

---

### Gaps (product + Operate)

- **No one-screen question.** App-screens want “Who needs me?” as the thing the largest block answers. Filters and kinds are listed; the primary job is not.
- **No states:** empty, loading, error, zero counts, offline, action-in-flight, failed Retry.
- **No list craft:** row pitch, two-line vs one-line, selected vs hover vs focus, sticky header, total (“12 needing you”), paging/load-more.
- **No responsive/phone story** for a three-pane inbox (study/house rules call this out; this doc is silent).
- **Approval timeout** has no duration, confirm UX, or undo; **snooze “next morning”** has no timezone; **dedupe `source+key`** is undefined.
- **Inbox ↔ Agent chat handoff** unspecified: when does a question live in Inbox vs the agent thread?
- **“Ask Claude about it” / Make card / Save to file / Mute** have no target, retention, or undo.
- **Motion** unspecified; Operate wants 150–250ms state feedback only—not badge theater on every `inbox.item`.

---

### Unrealistic scope

For one slice, this packs: six kinds × kind-specific actions × eight filters × full keyboard map × live badge stream × Hermes approvals × Scout findings × Agent chat with run cards/directives/`@agent` × custom agents (v2) × notification channels still open.

**Cut for v1:** custom agents, mail/calendar, and probably `@agent` cross-chat until Inbox approvals + failure Retry are solid. “Same component as Chat (04)” plus run cards and directives is already a second product surface, not a delta.

Acceptance only covers failure Retry, Hermes approve, and Hermes run cards—far narrower than the body, which is a healthy signal the body is oversized.

---

### Security / privacy

| Risk | Why it matters |
|---|---|
| **Approve and remember for this project** | Persistent privilege with no TTL, scope, audit, or revoke UI. |
| **Approval timeout auto-denies** | Silent deny can unblock or strand workflows; no notify/undo. |
| **`@agent` from any chat** | Cross-thread injection and accidental context bleed into agent memory. |
| **Custom `memory scope` / `tool allowlist` (v2)** | Spec names power without isolation, retention, or review. |
| **View logs / findings / digests in one queue** | Likely secrets, PII, and repo paths in a detail pane with no redaction or ACL note. |
| **`inbox.item` stream → sidebar badge** | Authz, tenant scoping, and what the badge reveals (count vs title preview) unspecified. |
| **Desktop notification for urgent** | Full titles on a lock screen = data leak; open question about push/email makes it worse. |

Highest-stakes gap: treating **Approve** like a list shortcut (`a`) with **remember** beside it and no confirm/consequence copy.

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Mode is Operate: scanability and familiarity beat expression. Against that, the brief reads like a **generic three-pane mail client** plus agent chrome—not a Junos triage face.

1. **Hierarchy.** Eight left filters with counts will out-shout the list. Colour/weight should mark *what needs a decision* (blocked approval, failure), not every kind equally. Digests and urgent approvals must not share the same row weight.
2. **Density / spacing.** Middle list fields (title, source icon, age, priority) need an explicit one- vs two-line pitch (app-screens: ~45px single, ~72px with media). Without it you get cramped icons or sparse voids in the detail pane.
3. **Typography.** No type roles: title ink vs meta grey, tabular age, what gets primary ink. Risk of uppercase filter labels, tiny tracked “URGENT” chips, and monospace ages—classic generated-product tells.
4. **Contrast / status.** Priority + kind + source icon invites a pill rainbow. Taste rule: colour on data/state that needs a decision; neutral chips otherwise; one status mark per row. Urgent must stay readable without painting half the list.
5. **Selection / detail.** Spec never says selected row = nav `--active` fill (house rule for inbox→detail). Without that, focus rings, hover, and “current item” collide.
6. **Action overload.** Detail panes with 3–4 equal actions fail the >4 decision-points heuristic. Primary (Approve / Retry / Reply) should be one filled control; the rest quiet or under a kebab—especially Deny vs Approve and remember.
7. **Agent “cards” in the left list.** Status + current task + last active as cards pushes dashboard chrome into a chat switcher. Prefer a quiet grouped list; put live task state in the thread (run cards), not as KPI tiles.
8. **Keyboard-first without teaching.** `j/k/e/s/a/d/c/` with no on-screen legend or empty-state coaching fails discoverability; high-stakes `a`/`d` need more than a keycap.
9. **Motion.** Live badge + urgent notifications need a quiet unread pulse and reduced-motion fallback—not entrance choreography. Operate: motion = state change only.
10. **Empty / Done / Snoozed.** Auto-expire to Done and snooze create large “quiet” views; without trade copy (“Nothing blocking you”, “3 snoozed until morning”) the screen goes template-blank.
11. **Phone.** Three panes unspecified = either unusable or a second unplanned design. Collapse to list→detail stack with filters as a compact scope control, not eight always-visible nav items.
12. **Legibility of age.** “Age” alone is vague; prefer relative words for triage (“2h”, “Yesterday”) and keep them secondary grey so titles stay scannable.

---

### Highest-leverage fixes (if you revise the doc)

1. Freeze a **v1 action/status matrix** that matches the API (and drop or defer the rest).  
2. Name the **one question**, row anatomy, selection, empty/error, and phone collapse.  
3. Specify **approval UX**: timeout, confirm, remember scope/TTL/revoke, notification privacy.  
4. Split **Inbox mention** vs **`@agent`**, and park custom agents fully behind v2.  
5. Declare visual rules: one primary action per kind, colour only on urgent/failure, no filter/priority pill parade.

I can turn this into a tightened section-by-section rewrite outline next if you want—still Ask mode, so guidance only unless you switch to Agent.
