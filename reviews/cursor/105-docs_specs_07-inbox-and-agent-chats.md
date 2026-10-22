**Verdict:** As an Operate-mode triage queue, the IA is mostly right (three-pane inbox + agent-bound chat). As a shippable UI/security brief it is thin: status/action models contradict themselves, visual/behavior states are almost absent, and a few lines smuggle in a second product (custom agents + sticky approvals).

Mode used: **Operate** (impeccable) / **app screen · inbox** (design-taste). Critique is of the doc only — no mockup/UI to inspect.

---

### Contradictions

1. **Status model fights itself.** Filters include `Snoozed` and `Done`; rules auto-expire to Done and snooze “until a time”; API only shows `status=new` and actions `approve|deny|done|snooze|card`. There is no coherent state machine (`new` / `snoozed` / `done` / `muted`? does approve imply done?).
2. **Actions table ≠ API.** Kinds list Retry, View logs, Mute, Reply, Dismiss, Save to file, Ask Claude, Open — API action enum covers a fraction. Either the API is incomplete or the UI over-promises.
3. **`Needs me` vs kinds.** Unclear which kinds qualify (approvals + mentions only? failures?). Without that mapping, filter counts and “urgent” will disagree.
4. **Priority vs kind.** `urgent` = blocked approvals only; failures and mentions that also need Jonas stay `normal`. Sort then puts a failed run under a digest if timestamps win after urgent — unlikely intent.
5. **Approval timeout auto-denies** vs **Approve and remember**. Sticky approve and silent auto-deny are opposite trust postures; no undo, no “deny reason,” no conflict if Hermes already moved on.
6. **Mentions in two places.** Inbox kind `mention` (“Reply inline”) vs Agent chats `@agent` from any chat. Same object? Two paths? Who owns the reply thread?
7. **“Same component as Chat (04)”** vs agent-specific left rail (group by agent, status, current task). That is a different shell; “same component” is false unless Chat already has that layout.
8. **`e` = done** while filters also have Done and auto-expire to Done — is Done archive, ack, or hide? Does `e` on an open approval dismiss without deny?

---

### Gaps (product / UX)

- No **screen question** (“Who is waiting on me?”). Without it, All + eight filters + three panes have no primary hierarchy.
- No **empty / loading / error / zero** states (design-taste §11; impeccable harden).
- No **selection, multi-select, undo, or bulk** — fatal for a keyboard-first queue.
- No **volume model** (items/day, list virtualization, badge unread vs Needs me).
- No **conflict rules** (approve after timeout; retry while run active; snooze then new event with same dedupe key).
- No **search** semantics (`/` is listed; fields and scope are not).
- Agent chat: no rules for **run-card layout**, streaming, failed directive, or interrupting an in-flight agent.
- Custom agents (v2) named with **system prompt / tools / memory** but no acceptance path — orphan scope.
- Open questions (push/email, mail/calendar) sit next to v1 acceptance that already assumes desktop notifications — notification channel still undecided while behavior is specified.

---

### Unrealistic scope

Shipping in one slice: real-time badge stream, full keyboard map, six item kinds with divergent actions, sticky project memory for approvals, Hermes unblock, Scout findings → cards, agent directives + run cards + cross-chat `@agent`, plus a v2 agent builder. That is several products. Cut to: **Needs-me queue (approval + failure + mention) + Hermes agent thread with run cards**; park sticky remember, Ask Claude, digests-as-inbox, custom agents, mail/calendar.

---

### Security / privacy

| Risk | Why it matters |
|---|---|
| **Desktop notification titles/bodies** | Approvals/findings often contain repo, file, or customer text; OS notifications leak on lock screen. Spec only says “raises a desktop notification.” |
| **Ask Claude about it** | Unspecified redaction: finding + linked run/logs may exfiltrate secrets into another model context. |
| **View logs** | Failures often contain env, tokens, prompts; no ACL or redaction. |
| **Approve and remember** | Persistent auto-approve is a privilege grant; no scope, expiry, audit, or revoke UI. |
| **Auto-deny on timeout** | Irreversible side effects with no confirmation channel if Jonas is AFK; pairs badly with remember. |
| **`@agent` from any chat** | Cross-conversation handoff without authz (who may invoke which agent, with what tools). |
| **Custom agent tool allowlist + memory scope** | Named but undefined — classic over-privilege hole. |
| **`inbox.item` stream → sidebar badge** | Auth, tenant isolation, and whether payloads include bodies (badge vs full item) unspecified. |
| **Save to file** | Path sandbox / overwrite unspecified. |

---

### UI / design quality (Operate + app-screen lens)

**Hierarchy.** Eight filters with counts is past the cognitive-load line (>4 visible options). App-screens: counts only on queues that need action — **Done / Snoozed / All** should not shout. Primary should be **Needs me** (or a single unanswered count in the shell), not a flat filter laundry list.

**Density / composition.** Classic mail 3-pane is fine for Operate familiarity, but the list row is underspecified for triage: title + source **icon** + age + priority with no **one-line reason** (why it needs you). Icons-as-source is chrome; meaning should be type and copy (“Hermes · waiting on deploy approve”), not a glyph row.

**Priority encoding.** Priority is a field with no visual system. Risk: colored pills / left bars on every row (dashboard tell). Better: urgent = ink weight + “Needs you” in the detail header; color only on the decision controls (Approve/Deny), not on list chrome.

**Agent left list “cards”.** Status + current task + last active on every agent card invites KPI-tile chrome. Prefer a quiet list: name, one status word in ink/grey, task as secondary line — no status dots in brand hues, no card chrome.

**Typography / spacing / contrast.** Zero tokens: no type scale, row pitch, pane widths, or contrast rules. For an inbox, specify roughly: row ~40–48px, title 14px ink, meta 12px secondary, detail prose ≥16px full ink (not grey body). Without that, implementers default to soft-grey everything (reads unfinished).

**Motion.** Keyboard-first queue needs **150–250ms state feedback** on select / approve / snooze, not entrance choreography. Spec is silent — either motion will be bolted on as decoration or actions will feel dead.

**Legibility / a11y.** Shortcuts (`a/d/e/s/c`) with no discoverability, conflict with browser/OS, or screen-reader labels. Urgent-only desktop notifications with no in-UI live region. Color-only priority would fail contrast/meaning checks.

**Phone.** Unspecified. Three panes do not collapse; without a list→detail stack this is desktop-only by accident.

**Empty states.** No trade copy (“Nothing waiting on you”, “3 snoozed until morning”). Generic “No items” is exactly what both skills flag.

**Run cards in chat.** “Next to text” with no density rule will produce stacked mini-dashboards. Cap: one compact run summary (status + link), not a timeline embed in the bubble.

**“Matches mockup”.** Anchors craft to an unseen artifact — hierarchy and spacing cannot be reviewed or enforced from this doc alone.

---

### Highest-leverage doc fixes (if you revise it)

1. One state diagram + one action matrix (kind × state → actions → API).  
2. One screen question and a reduced filter set; counts only on actionable queues.  
3. Explicit notification privacy (title template, no secret bodies) and approve-remember audit/expiry.  
4. Pane/row/type density numbers and empty/error states; defer custom agents and Ask Claude out of v1 acceptance.

I can turn this into a redline checklist against `04-chat` / Hermes specs later if you want cross-doc consistency — still Ask mode, so that would stay advisory.
