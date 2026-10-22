**Verdict:** As an Operate / app-screen spec, this is a solid *product* sketch (kinds, rules, keys) but a thin *UI* brief: three panes and an action table without hierarchy, states, density, or responsive behavior. Scope and security also outrun the three acceptance criteria.

Mode: **Operate** (impeccable) · Surface: **inbox / list+detail** (design-taste app-screens). No live UI or mockup was available—review is of the documented intent only.

---

### Contradictions

1. **Actions vs API.** The kinds table lists Dismiss, Ask Claude, Open, Save to file, Retry, View logs, Mute, Reply inline, and “Approve and remember.” The API only allows `approve|deny|done|snooze|card`. Either the API is incomplete or half the UI is fiction.

2. **Status model is underspecified and clashes with filters.** Filters include All / Needs me / Snoozed / Done; API shows `status=new`. How do snooze, auto-expire-to-Done, mute, and dismiss map? Is “Needs me” a filter or a computed view?

3. **`e` = done vs Dismiss.** Keyboard says `e` done; findings get Dismiss. Same action or different? Undo?

4. **Sort vs priority.** Priorities are urgent / normal / low; sort is “urgent first, then newest.” Where do normal vs low land relative to each other? Age vs priority for two normals?

5. **Mentions live in two places.** Inbox kind `mention` (“Reply inline”) vs Agent chats `@agent` (hand off and return inline). Same object, two surfaces, or a fork?

6. **Auto-deny vs “Needs me.”** Approval timeout auto-denies while the screen’s job is human triage. That is a product contradiction: the queue can resolve itself against the user’s intent.

7. **v1 vs v2 in one doc.** Custom agents are labeled v2, but Agent chats (v1) already imply personas, directives, and memory-adjacent behavior. Acceptance criteria never mention custom agents.

---

### Gaps (product / UX)

- **No one-screen question.** App-screens ask for one question (“Who is waiting on me?”) and one finding under the title. The doc never names them, so hierarchy defaults to “generic three-pane mail.”
- **States missing:** empty inbox, empty filter, loading, stream reconnect, action failure, stale detail after another client acted, approval already timed out.
- **Responsive / phone:** three panes (filters | list | detail) with no collapse rule. App-screens: one region at a time on phone; detail pushes; back restores scroll.
- **Selection model:** single select only? Multi-select / bulk approve? Focus vs selected vs keyboard cursor.
- **“Matches mockup”** with no layout numbers (widths, row pitch, title size, pane split). Unimplementable as design.
- **Discoverability of keyboard:** vim keys with no mention of legend, command palette, or non-keyboard path for the same actions.
- **Conflict / idempotency:** double Approve, Approve after auto-deny, Retry while run is already restarting.
- **Notifications content:** what string is shown (title? project? secret-bearing body?).
- **Snooze “next morning”:** whose timezone; DST; what happens if still urgent.
- **Dedupe `source+key`:** who defines `key`; collision across kinds; user-visible “updated” vs silent overwrite.

---

### Unrealistic scope (for this slice)

- Six kinds × distinct action sets × eight filters × desktop notifications × live badge stream × snooze/expire/auto-deny × full agent-chat fork (run cards, directives, `@agent`) × custom agents (prompt, tools, memory) is a large surface; acceptance covers only failed-task Retry, one Hermes approve, and run cards in thread.
- Open questions already pull Gmail/Calendar into the mental model before v1 is closed.
- “Same component as Chat (04) with differences” usually means either under-specified divergence or a rewrite of chat—neither is sized here.

---

### Security / privacy risks

| Risk | Why it matters |
|---|---|
| **Desktop notifications for `urgent`** | Titles/bodies of approvals/findings often carry paths, diffs, or customer data; OS notifications are low-control and often on lock screens. |
| **Approval timeout → auto-deny** | Silent resolution of gated work; audit says “recorded” but no who/why UI, no grace, no “still waiting” escalation. Dangerous for irreversible steps. |
| **“Approve and remember for this project”** | Persistent auto-approve is privilege escalation with no scope, TTL, revoke UI, or audit in the doc. |
| **`@agent` from any normal chat** | Confused-deputy / prompt-injection path: untrusted chat text becomes agent directive; return “inline” may leak tool output into the wrong thread. |
| **Inbox “full body” + “Ask Claude about it”** | Re-sends potentially sensitive run output into another model context; no redaction, retention, or project boundary. |
| **`inbox.item` event stream → sidebar badge** | Authz, tenant isolation, and whether payloads include bodies (not just ids) unspecified. |
| **Custom agent `memory scope` + tool allowlist (v2)** | Cross-project memory and over-broad tools are classic leak vectors; v1 Hermes/Scout chat directives have no stated tool/memory bounds either. |
| **Mute / Dismiss / auto-expire** | Soft-hide of failures and approvals can erase operational signal; retention vs security log not defined. |
| **Save to file / View logs** | Path permissions, secret-bearing logs in UI, clipboard. |

---

### UI / design-quality problems  
*(hierarchy, spacing, typography, density, motion, legibility, contrast — via Operate + app-screens)*

**Hierarchy & IA**
- Eight left filters (All → Done) plus app chrome is a second nav. App-screens: counts only on queues that need action; **All / Snoozed / Done counts** are chrome noise. Prefer a short action queue (Needs me, Approvals, Failures) and park the rest behind one control.
- Middle row is “title, source icon, age, priority” with no stated primary ink. Risk: icons and priority chrome shout louder than the decision. Color should mark **status needing action**, not source brand.
- Detail “actions above” with highly variable action sets will **jump the toolbar** per kind—unstable hierarchy. Prefer a stable primary (Approve / Open / Retry) + overflow for the rest.
- Agent left rail “each agent has a **card**” (status, current task, last active) invites identical peer tiles / status wallpaper. Prefer a quiet list row; status as one muted line or a single data hue on “busy/blocked,” not card chrome.

**Density & spacing**
- No row pitch, pane widths, or gutter. For a triage inbox, expect **medium–dense** list rows (~44–56px), not sparse “dashboard cards.” Three full panes at desktop without a defined primary column width will leave dead strips or crush the list.
- Run cards **inline in chat** next to text: high density risk (nested timelines inside a thread). Spec needs max card height, collapse rule, and “one evidence line + link,” not a full Hermes timeline embed.

**Typography**
- No type roles. Operate/app-screens want ~12/14/16/24, one grotesk, title as a noun (“Inbox”), optional 14px finding line—not a hero. Age/priority as meta at 12px with **4.5:1**; “priority” as color-only fails contrast and color-blind use.
- Relative “age” without tabular alignment will jitter the column as “9m” / “2h” / “Yesterday” change width.

**Legibility & contrast**
- Urgent + notification implies strong signal; if list urgency is a red badge on soft grey meta, either too loud (stripe of alerts) or too quiet (missed). Spec should say: one status mark per row, pale pill + dark ink, never saturated fill on most rows.
- Source icons as the only kind cue fail when icons are grey 16px outlines on busy titles—kind should also be in words or a single shared mark language.

**Motion**
- Operate / app-screens: **no entrance choreography**; motion = press, hover, focus, row arrive, sheet open (~150–250ms). Spec is silent; agent “plan then progress” and live inbox inserts will tempt toast storms and list animations. Call out: insert without layout thrash; progress on the run card as quiet status text, not pulsing chrome.

**Keyboard-first without visual peer**
- Power-user density is good for Operate; without focus rings, selected-row `--active` fill (app-screens house rule for list→detail), and visible shortcuts, it fails a11y and first-run. `j/k` focus must not be mistaken for selection used by the detail pane.

**Phone**
- Unspecified three-pane is the highest design risk: filters + list + detail will not fit. Without a push/detail pattern, this ships as desktop-only by accident.

**Cognitive load**
- Visible decision points: 8 filters + ~5–6 actions per kind + keys + search. Heuristic: keep **≤4 primary choices** in view; park the rest. “Ask Claude about it” on a finding is a fourth conceptual product inside the row actions.

**Design specificity**
- Nothing in the doc is Junos-specific (mark, workspace scope, trade language). As written it is a generic triage + agent mail client—exactly the “well-applied kit” failure mode app-screens warn about. One product-owned element (e.g. Hermes run as first-class row evidence, Scout finding as the lead object) should be named in the brief.

---

### What is already strong

- Clear item kinds and a keyboard-first intent fit Operate.
- Dedupe, snooze, and priority tiers are the right *rules* layer for a personal triage queue.
- Acceptance criteria are concrete for the narrow path (failure → retry, approval → unblock, run cards in thread)—keep that honesty and cut or stage everything else.

---

### Highest-leverage fixes to the doc (not implementing)

1. Freeze a **status/action matrix** that matches the API (or expand the API).  
2. Name the screen question + finding line; cut filter counts to action queues.  
3. Specify **list→detail selection**, phone one-pane flow, empty/error, and notification redaction.  
4. Treat auto-deny and “remember approve” as **security features** with TTL, scope, confirm, and audit UI—or drop them from v1.  
5. Split **Custom agents** to a later spec; keep Agent chats to Hermes/Scout + run cards only until chat (04) divergence is drawn.  

I did not cross-check other specs (per your “only this doc” constraint); Chat (04) / Hermes / security docs may already answer some gaps—or deepen the contradictions.
