**Verdict:** Strong product intent (one triage queue + agent-bound chat), but the spec is thin as an Operate-screen brief: filter/kind/API/keyboard disagree, high-stakes actions lack confirmation and privacy bounds, and the UI is a classic three-pane sketch with no hierarchy, density, states, or contrast rules—easy to ship as generic inbox chrome.

Lens: **impeccable Operate** (task UI, restraint, states, motion-as-feedback) + **design-taste app screens** (inbox = list-to-work-through; colour on meaning not chrome; one question first; honest empty/loading). Spec-only review—no rendered UI to inspect.

---

### Contradictions

1. **Kinds vs filters**  
   Kinds: approval, finding, result, failure, **mention**, **digest**.  
   Filters: All, Needs me, Approvals, Findings, Results, Failures, Snoozed, Done.  
   Mentions and digests have no home; “Needs me” is undefined vs Approvals (and mentions). Snoozed/Done are statuses, not kinds—fine, but never modeled next to `status=new`.

2. **Actions table vs keyboard vs API**  
   Table includes Dismiss, Ask Claude, Open, Save to file, Retry, View logs, Mute, Reply, Approve-and-remember.  
   Keys: `e` done, `s` snooze, `a`/`d` approve/deny, `c` card.  
   API: `approve|deny|done|snooze|card`.  
   Dismiss ≠ done? Retry/mute/reply/remember have no API or keys. Digest “Open” has no key.

3. **Priority story conflicts with triage**  
   Urgent = blocked approvals only. Failures and mentions also “need Jonas” but stay `normal` unless you invent rules—so “Needs me” and notifications won’t match urgency.

4. **Agent chat vs Chat (04)**  
   “Same component as Chat” plus agent-grouped **cards** (status, current task, last active) plus **run cards** in-thread. That’s a different IA (roster + live agent state), not a skin of bare model chat—unless 04 already owns that, this doc overclaims reuse.

5. **Mentions land in two places**  
   Inbox kind `mention` (“Reply inline”) vs `@agent` from any chat (hand off, answer inline). Same word, unclear whether both create inbox items, only one, or neither after reply.

6. **v1 acceptance vs v2 custom agents**  
   Acceptance is Hermes/Scout triage; custom agents + `agent.config_json` sit in the same doc without a cut line—scope bleed into “ship everything.”

---

### Gaps (behavior & product)

- **No item model**: fields for title, body, source, key (dedupe), priority, status, project, linked run/card, unread.
- **Dedupe** “source+key” and **approval timeout** duration/UX are unspecified; auto-deny with no visible countdown is a trust killer.
- **“Approve and remember for this project”** needs project binding and what is remembered (step? tool? forever?).
- **Empty / loading / error / offline** for list, detail, and stream badge—app-screen floor; omitted.
- **Selection**: empty detail, multi-select, bulk done/snooze.
- **Mobile / narrow**: three panes won’t fit; no collapse rule (list-only → detail push).
- **“Matches mockup”** with no link or named file—unfalsifiable.
- **Agent directive → plan → progress**: who owns the run, how cancel/edit works, how it ties to Hermes timeline.
- Notifications open question is good; still no rule for **what text** may leave the app.

---

### Unrealistic scope

For one slice: 6 kinds × distinct actions, 8 filters, keyboard ops, desktop notify, dedupe, 14-day expire, snooze presets, approval timeout, live stream, three-pane inbox, agent chats with run cards, cross-chat `@agent`, plus v2 personas—then “Ask Claude about it” and mail/calendar as near-future.  

Ship slice that matches acceptance only: failure→Retry, Hermes approval→unblock, Hermes thread with directive + run cards. Defer remember-policy, Ask Claude, Mute, digests-as-first-class, custom agents, mail/calendar.

---

### Security / privacy

| Risk | Why it matters |
|---|---|
| **Desktop notify on urgent** | Titles/bodies on lock screen / shared displays; no redact/summary rule. |
| **Auto-deny on timeout** | Silent deny of gated steps; no audit UX in this doc beyond “records it.” |
| **Approve and remember** | Sticky privilege; wrong remember = lasting over-permission. |
| **API sketch** | No auth, idempotency, or CSRF notes; `POST .../action` is privilege-bearing. |
| **`inbox.item` stream → badge** | Who can subscribe; leakage of kind/title in events. |
| **`@agent` from any chat** | Confused-deputy / injection if agent tools fire from untrusted text. |
| **Ask Claude / Save to file / View logs** | Cross-model egress, filesystem scope, log PII—none bounded. |
| **Mute task** | Hides failures; needs visibility elsewhere or it’s a silent fail mode. |

---

### UI / design quality (hierarchy, density, type, motion, contrast)

**Mode:** Operate inbox + agent queue—not a marketing page. Ambition = precision, not expression.

**What’s right**
- One job: “everything that needs Jonas or finished while away.”
- Keyboard-first fits power Operate use.
- Kind→actions table is the right *kind* of substance for a triage screen.

**What’s missing or at risk**

1. **One screen question** (app-screens §2.2) — Implied (“what needs me?”) but the first paint is eight filters + list meta, not a lead figure/count (“3 need you”) or a default landing on Needs me. Without that, it reads as generic mail client.

2. **Hierarchy** — List row is title / source icon / age / priority with no type scale, secondary line, or selected-row rule. App-screens: selected row uses `--active` fill (not a loud border or tinted icon tile); identity in ink, meta in muted grey at ≥4.5:1. Unspecified → default AI inbox (coloured priority pills, icon-in-circle).

3. **Filter density / cognitive load** — Eight destinations, several overlapping. Impeccable cognitive-load flag: >4 visible peer options. Prefer fewer primary scopes (e.g. Needs me / Waiting / Done) and kind as secondary, or collapse mention+digest into Needs me / Low.

4. **Detail pane action heap** — High-stakes Approve/Deny beside Make card / Ask Claude with no primary/secondary ranking. Operate: one primary per context; destructive Deny needs confirmation or undo—especially with `d` as a single keystroke (focus trap when `/` search or reply is open is unspecified).

5. **“Agent cards”** — Roster-as-cards invites template chrome. Prefer quiet rows (name, status dot, one-line current task, relative last active)—status colour on the *state*, not card chrome.

6. **Run cards in chat** — Nested cards next to prose will dominate the thread if treated as marketing cards (shadow, radius, icon header). Spec should say: compact run summary (title, state, link to Hermes), same surface as messages, no extra elevation.

7. **Typography & spacing** — Zero tokens. Operate/impeccable: one grotesk, tight scale (~12/14/16/24), rem not fluid display. App density for a working inbox: medium (rows ~44–56px, body 14). Age/priority as tiny tracked caps or grey-on-grey will fail contrast house floor.

8. **Motion** — Correctly absent (no choreography). Still need press/hover/focus/selection feedback (150–250ms) and `prefers-reduced-motion`; none stated.

9. **States & copy** — No empty (“Nothing waiting—Scout findings land here”), no zero vs missing, no stream-disconnected. Trade words > “No items.”

10. **Legibility of priority** — “Urgent first” without non-colour encoding (order, weight, label) fails colour-blind / meaning-from-chrome rules. Colour only on the blocked fact, not a rainbow of kinds.

---

### Highest-leverage fixes (spec only)

1. Align **kind × status × filter × API × keys** in one matrix; delete or defer actions with no API.  
2. Default view **Needs me**; cut filter count; define mention/digest.  
3. Bound **notify text**, **auto-deny** (timeout + visible state + undo), **remember**.  
4. Replace “matches mockup” with pane widths, row anatomy, selection, empty/loading, and approve/deny as primary in detail.  
5. Split **v2 custom agents** out; keep acceptance-sized agent chat (Hermes + run summaries, not card theater).

I can turn this into a tighter acceptance/checklist patch for the doc if you switch out of Ask mode.
