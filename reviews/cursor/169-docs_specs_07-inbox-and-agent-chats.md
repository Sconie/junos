**Verdict:** Spec 07 sketches a solid mail-style triage idea, but as written it packs an inbox product, an agent directory, and a custom-agent platform into ~50 lines—with action/state gaps, high-stakes security underspecified, and almost no Operate/app-screen design detail.

---

### Contradictions (inside this doc)

1. **Kinds vs filters don’t line up.** Kinds include `mention` and `digest`; filters are All / Needs me / Approvals / Findings / Results / Failures / Snoozed / Done. Mentions and digests have no home. “Needs me” is never defined (approvals only? mentions too?).

2. **Actions vs keyboard vs API disagree.** Row actions include Dismiss, Ask Claude, Open, Save to file, Retry, View logs, Mute, Reply. Shortcuts cover only done / snooze / approve / deny / make card / search. The POST body only allows `approve|deny|done|snooze|card`—no retry, dismiss, mute, reply, or “remember.”

3. **Done vs Dismiss vs expire.** Filters have Done; finding actions have Dismiss; rules auto-expire to Done. No state machine. Unclear whether dismiss ≠ done, whether expired items are “done,” or whether `e` “done” maps to dismiss for findings.

4. **Sort vs snooze.** Sort is “urgent first, then newest,” but snoozed items’ visibility in All / Needs me is unspecified—classic inbox trap (snoozed reappear in All and look “new”).

5. **v1 vs v2 blur.** Acceptance is Hermes approval + failure retry + run cards. Same doc adds custom agents, `@agent` from any chat, “Approve and remember,” digests, mute—without saying what’s in scope for the acceptance bar.

6. **“Matches mockup” with no mockup, layout, or density.** Claims visual fidelity but specifies only three columns and a filter list—nothing about selection, empty states, or breakpoints.

---

### Gaps

| Area | Missing |
|---|---|
| Screen question | No “one question” (e.g. “What is blocked on Jonas?”). Without it, eight filters + three panes compete equally. |
| Status model | API uses `status=new`; UI has Snoozed / Done; no `seen`, unread, or badge rules. |
| Priority | Only approvals are `urgent`. Failures and unanswered mentions are left `normal`/`low` with no rationale. |
| Dedupe | `source+key` undefined; unclear if updates bump sort, reset age, or overwrite body. |
| Approval timeout | Auto-deny with no duration, countdown, or “about to deny” UX (Hermes elsewhere uses 30m—this doc is silent). |
| “Approve and remember” | No pattern grammar, project scope, visibility, or revoke path in *this* surface. |
| Mute / Snooze “next morning” | Mute duration/unmute; morning = whose TZ? |
| Mentions | Reply inline: inbox composer vs agent thread? Does reply clear the item? |
| Agent list “cards” | Status / current task / last active fields and refresh behavior undefined. |
| `@agent` handoff | Authz, which agent, streaming vs blocking, failure UX, whether tools run with chat context. |
| Responsive | No phone/tablet behavior for three panes (app-screen rule: one region at a time). |
| States | Empty, loading, error, zero-count filters, offline stream—all absent. |
| Acceptance | No keyboard, snooze, dedupe, notifications, mentions, or mobile. |

---

### Unrealistic scope

For one slice, this doc commits to:

- Full mail client IA (filters, detail, shortcuts, snooze, expire, notifications)
- Cross-product aggregation (Hermes, Scout, tasks, workflows, digests)
- Persistent approval memory
- Agent-directory UI + run cards + directives
- Cross-chat `@agent` routing
- Custom agent platform (`config_json`: prompt, model, tools, memory)

That’s several milestones. Custom agents + `@agent` alone can exceed Inbox v1. Safer cut: Inbox triage + Hermes approval/failure paths first; agent chat as Chat(04) badge + run cards; defer custom agents and `@agent`.

---

### Security / privacy

Highest risk items the doc names but doesn’t constrain:

1. **Approve and remember** — lasting privilege escalation. Needs exact command/diff in the item (not only title), scoped rule preview, and revoke. Listing the button without that is unsafe.

2. **Auto-deny** — silent security decision. Needs audit (“auto-denied at T”), and no race where late Approve applies after timeout.

3. **Retry on failure** — may re-run shell/Hermes work. Spec doesn’t say whether Retry reuses prior approval or demands a new one.

4. **View logs / result bodies** — secrets in logs; no redaction or “sensitive” handling.

5. **Agent tool allowlist + memory scope** (v2) — `config_json` without threat model; memory scope can leak across projects.

6. **`@agent` from any chat** — injects human thread into an agent with tools; return “inline” can leak tool output into shared/normal chat context.

7. **Desktop notifications** — urgent titles/bodies on a lock screen; no “hide body” / preview policy.

8. **SSE `inbox.item` → sidebar badge** — local app assumption OK, but no note on multi-window / who can read the stream.

9. **Mail/calendar v2 (open question)** — read-only still pulls personal content into the same triage queue; privacy boundary should be named before “v2.”

---

### UI / design quality (impeccable Operate + design-taste app-screens)

Mode: **Operate / inbox list screen.** Ambition = precision and scanability, not expression. Motion = feedback only (no entrances).

**Hierarchy / density**

- Eight filters with counts will dominate the left rail. App-screen rule: counts only on queues that need action, noun clear from the label (“Approvals 3”), not a count on every bucket including Digests/Done.
- Middle row “title, source icon, age, priority” underspecifies the scan order. For triage, **priority/kind mark + title + age** should lead; source icon is secondary (and risks tinted-icon chrome).
- Right pane “full body + linked run + all actions” will stack primary and rare actions equally. Primary should be kind-specific and one-click (Approve/Deny for approvals; Retry for failures); secondary in a quieter cluster/menu.
- Agent side “each agent has a card” fights app-screen taste (peer status cards, chrome over data). Prefer a quiet list: name, one status mark, last active—not a card grid of agent KPIs.

**Typography / legibility / contrast**

- No type roles (list title vs meta vs body markdown). Meta (age, source) will default to under-contrast greys unless floored at ~4.5:1.
- Markdown bodies + run cards in one thread need a measure and max width (Chat’s ~760px is a natural anchor; this doc doesn’t set one).
- Priority as color-only fails Operate a11y; needs text/mark (“Urgent”) plus optional hue on the **data**, not the whole row chrome.

**Spacing / layout**

- Three-pane inbox is fine on desktop; doc never states column widths, selection fill (`--active` on selected row, not a focus-ring lookalike), or gutter rules—so implementers will invent uneven panes and ragged detail.
- No empty-state copy in product voice (“Nothing waiting on you”)—template empty states will fill the gap.

**Motion**

- Live badge + new rows: unspecified. App-screens: no entrance choreography; only row-arrive / selection / panel open feedback (~150–250ms). Streaming that animates every item will feel like a marketing page inside a queue.

**Product face**

- Spec is category-generic (“triage queue”). Nothing product-specific (workspace scope, “blocked Hermes step” as the signature object, trade words). Risk: a well-applied kit, not Juno’s inbox.

**Phone**

- Silent on collapse. Without “list → push detail → back preserves scroll,” the mockup three-pane will be unusable under the shell’s &lt;900px sheet pattern.

---

### Highest-leverage fixes to the doc (not implementing—guidance)

1. Define the **state machine** (`new|seen|snoozed|done|dismissed`) and map every filter + shortcut + API action to it.  
2. Define **Needs me** and drop or nest mention/digest.  
3. Split **v1 acceptance** from custom agents / `@agent` / mail.  
4. Spec **Approve and remember** + **Retry vs re-approval** + notification preview privacy in this file (or explicit pointer with required fields).  
5. Replace “matches mockup” with: one screen question, selected-row treatment, primary actions per kind, desktop column intent, phone push-detail, empty/loading/error.  
6. Agent chats: list not cards; run cards as compact timeline chips, not a second dashboard.

I can turn this into a line-edited proposed outline for 07 (still Ask mode—text only) if you want that next.
