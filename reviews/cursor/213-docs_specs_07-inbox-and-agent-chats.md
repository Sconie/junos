**Verdict:** Spec 07 is a workable Operate brief for a personal triage queue, but it underspecifies the screen as a product UI (density, states, hierarchy, responsive collapse) while packing high-stakes approval + Telegram + agent memory into one thin doc. Several internal inconsistencies will bite implementers before design polish matters.

*Lens: Operate (impeccable) + app-screens (design-taste-frontend). Doc-only review — no PRODUCT.md/DESIGN.md, no mockup pixels, no detector. Commit `595fe13` not re-verified in this session (shell blocked); review is of the file as read.*

---

### Contradictions

1. **Filter model vs status model**  
   Filters include All / Needs me / Approvals / … / Snoozed / Done, but the API only sketches `status=new`. Done, snoozed, and “Needs me” are never defined as statuses or query params. Rev 2 adds “resolved / cannot re-answer” without saying whether those land in Done, stay under Approvals with a resolved badge, or get a third state.

2. **Actions table vs API**  
   UI actions include Dismiss, Mute task, Retry, View logs, Reply inline, Ask Claude, Save to file, Open, Approve and remember. The POST body only allows `approve|deny|done|snooze|card`. Half the product surface has no API shape.

3. **Keyboard map vs kind-specific actions**  
   Global `e` done / `s` snooze / `c` make card apply to kinds where those actions are not listed (e.g. digest = Open only; failure = Retry / logs / mute). Spec never says what happens when the shortcut does not apply — noop, error toast, or wrong mutation.

4. **Sort freeze vs live stream**  
   Rev 2: list does not re-sort while detail is open. Also: `inbox.item` streams for the sidebar badge. Unclear whether a new urgent item may jump the list under an open detail, only update the badge, or both — classic race for “keyboard first” triage.

5. **Authority conflict (soft)**  
   “Inbox is the single authoritative queue for decisions” while Telegram can Approve/Deny and agent-chat tool approvals share the same gateway record. Fine if “authoritative” means shared gateway + inbox is the UI of record; as written it reads like Inbox-only, which Telegram contradicts.

6. **Priority taxonomy incomplete**  
   Urgent = blocked approvals; low = digests; everything else is “normal”. Findings, failures, and mentions that block work have no priority story, so urgent-by-notification may miss the real blockers.

---

### Gaps (especially for Operate / app-screens)

**Jobs & one question (app-screens §2.1–2.2)**  
Never states the screen’s one question (e.g. “What needs my decision now?”). Without that, hierarchy defaults to a generic three-pane kit.

**Missing product UI states**  
No empty Inbox, empty filter, loading skeletons, stream reconnect, Retry failure, approval already decided mid-click, or “auto-deny recorded” confirmation. App-screens §11 treats these as required for every block.

**List & detail content model**  
Middle row: title, source icon, age, priority — no preview line, no actor, no irreversibility cue on the row. Rev 2 pushes actor/diff/target/expiry into ApprovalCard in the detail only. For an approval queue, the list will look like a generic notification list until you open each row (recognition vs recall).

**Counts**  
Filters “with counts” — not said whether counts are global, unread-only, or filter-scoped, or how they update under stream + snooze + auto-expire.

**Search `/`**  
No scope (title only vs body), no ranking, no “search within current filter”.

**Agent chats**  
“Same component as Chat (04)” plus run cards, agent cards, directives, plan→progress, `@agent` handoff — no layout for run cards vs text, no streaming/progress affordance, no failure of a directive, no how `@agent` appears when the agent is busy. Custom agents v2 (prompt, tools, memory scope) is a second product inside one acceptance criterion set.

**Responsive**  
Desktop three-pane only. App-screens §12: several panes → one region at a time on phone. Spec is silent — unrealistic if JunOS is desktop-only; a gap if not.

**Motion**  
Silent. For Operate that is mostly fine (motion = feedback only), but approval success/deny, Telegram dual-channel resolve, and stream inserts need at least state feedback — not page-load choreography.

**Visual system**  
“Matches mockup” with no tokens, type scale, density band, or contrast requirements in-doc. No DESIGN.md in repo either.

---

### Unrealistic scope (for one spec + three ACs)

| In scope in this doc | Weight |
|---|---|
| Six item kinds + eight filters + keyboard triage | Medium |
| Shared ApprovalCard + irreversibility + sort freeze | Medium |
| Telegram bot as second approval surface | High (ops + security) |
| Agent chats = Chat + run cards + directives + @mentions | High |
| Custom agents (prompt, tools, memory) as v2 | High |
| Mail/calendar sources v2 | Deferred (good) |

Acceptance criteria only cover failure→Retry, mocked Hermes approve, and Hermes thread with run cards. That leaves Telegram parity, stale/resolved UX, keyboard safety, stream/sort behavior, and agent `@` handoff untested by the AC list — too much product for three checks.

---

### Security / privacy risks

1. **Telegram Approve/Deny** — Bot token in keychain + Jonas-only user ID is a start, but the open question does not require: callback authenticity / replay protection, approval ID binding, timeout alignment with gateway, or what the bot message contains (diff / target / secrets). A chat message that mirrors “exact action/diff” is a privacy leak on Telegram’s servers.

2. **Desktop notifications for urgent** — Spec does not constrain notification body. Showing full approval target/diff in OS notifications is a shoulder-surfing / lock-screen risk.

3. **“Approve and remember”** — Scoped rule with no TTL, audit trail, or revoke UI here (points at 12). Easy to ship a sticky privilege without a visible “remembered rules” surface in Inbox.

4. **Auto-deny on timeout** — Correct default for safety if timeouts are short and visible; dangerous if expiry is long and the only notice is after the fact. Spec does not require pre-expiry warning in UI or Telegram.

5. **Agent `config_json` (system prompt + tool allowlist + memory scope)** — Memory scope without isolation/redaction rules invites cross-agent data bleed; tool allowlist without tying to the same approval gateway as tool-call approvals creates two trust models.

6. **`@agent` from any normal chat** — Implicit privilege expansion: any chat that can mention an agent can trigger agent work. No authz boundary in this doc.

7. **API sketch is unauthenticated** — Fine as a sketch; still a gap that “checked by the gateway like any approval” is only stated for Telegram buttons, not for `POST /inbox/:id/action`.

8. **Ask Claude about a finding / Save to file** — May exfiltrate Scout content to another model or disk; no sensitivity tagging.

---

### UI / design-quality problems (hierarchy, spacing, typography, density, motion, legibility, contrast)

Framed as **what the spec currently invites**, not a pixel audit.

**Hierarchy**  
Three equal panes + eight filters + per-kind action sets without a declared primary job. App-screens: biggest block answers the one question; one primary action per screen. Here, Approve/Deny compete with Make card / Ask Claude / Open on the same detail chrome — high-stakes actions will look like peer buttons unless hierarchy is specified (near-black primary for Approve only when focused; Deny as negative text/outline; everything else tertiary).

**Density**  
Inbox is a work-through queue → **medium–dense** (≈44–56px rows, or denser for long sessions). Spec lists four fields only and no subline; likely either too sparse (wasted middle column) or icon+title noise. Age and priority need tabular/recency treatment (“2m”, “Yesterday”) and a single status mark per row — not a priority pill *and* an urgent color *and* a kind icon saying the same thing.

**Spacing / layout**  
Left filter rail with eight items + counts risks chrome louder than data (accent-on-nav tell). Prefer neutral active state, counts in muted tabular figures. Right detail as ApprovalCard is good; list↔detail selection must use `--active` fill, not a focus-ring lookalike (app-screens §7.8). No statement of sticky filter header, sticky list header, or detail scroll vs list scroll.

**Typography**  
No type roles. For Operate: one family, tight scale, noun title (“Inbox”), not a hero. Agent “card” per agent in the left list risks card-grid / icon-in-tinted-square dashboard tells — prefer dense rows (status · task · last active) unless “card” means a quiet panel.

**Legibility / contrast**  
Priority and source icon alone will push meaning into color/icon. Spec should require ink for title, muted for age/source, semantic color only for urgent/failure, and ≥4.5:1 on body and actions. Disabled approve on stale items must stay readable and state *why* (expired / decided on Telegram / run cancelled) — not greyed mystery buttons.

**Motion**  
Do not animate list resort under open detail. Allow short (150–250ms) feedback on approve/deny and a non-shifting insert for new items (badge + optional quiet top insert). No orchestrated load sequence.

**Cognitive load**  
Filters: 8 options visible (>4 decision points on the chrome alone). Collapse to All / Needs me / Snoozed / Done with kind as secondary chips, or keep kinds but make “Needs me” the default landing. Keyboard: document a cheat sheet / `?` — Help heuristic is weak for a shortcut-first surface.

**Agent chat density**  
Run cards “next to text” can shatter the chat measure. Prefer run cards as full-width blocks in the thread (one left edge), not side-by-side chrome that fights message bubbles from spec 04.

---

### Priority fixes for the next revision (design + product)

1. Define **status machine** (new / snoozed / done / resolved) and map every filter + API action to it.  
2. Split or stage **Telegram**, **Inbox v1**, and **Agent chats**; expand ACs to match whatever stays.  
3. Specify **list row anatomy** for approvals (actor, action summary, expiry, irreversibility cue) so the queue is scannable.  
4. Lock **keyboard semantics** per kind and **sort/stream policy** while detail is focused.  
5. Add **empty / loading / error / stale** and **phone: one pane at a time** (or explicit desktop-only).  
6. Tighten **notification + Telegram payload** policy (minimal PII; full diff only in authenticated UI).  
7. Design note: **density band**, **one primary action**, **selection/active styles**, **no accent-on-filter-rail** — so “matches mockup” cannot drift into generated-dashboard tells.

---

**Strengths worth keeping:** clear personal triage job; keyboard-gated approve/deny (error prevention); ApprovalCard shared with irreversibility; sort freeze while detail open; stale approvals non-reanswerable; write-local-only “remember”; mail/calendar explicitly v2.

I can go deeper next on a rewrite outline for the Screen section only, or a contradiction matrix against specs 04 / 12 / 14 if you want cross-spec consistency (still Ask mode — guidance only).
