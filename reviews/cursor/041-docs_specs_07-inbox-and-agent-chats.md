**Verdict:** The doc is a workable product sketch for an Operate inbox, but as a buildable UI/UX spec it is under-specified, internally inconsistent on actions/status, and overscoped for one slice—especially once agent chats, `@agent` handoff, and custom agents land in the same file.

Mode: **Operate** (task surface). Lens: impeccable Operate restraint + design-taste **app-screen / inbox** rules (quiet chrome, one job first, dense honest lists, motion as feedback only).

---

### Contradictions (within this doc)

1. **Actions vs API vs filters don’t align.**  
   Kind table lists Approve/Deny, Make card, Dismiss, Retry, View logs, Mute, Reply, Open, Save, etc. API only allows `approve|deny|done|snooze|card`. Filters include Needs me / Snoozed / Done. “Dismiss” vs `done`, “Mute task” vs inbox item status, and whether Retry is an inbox action or a task action are undefined—same word, three systems.

2. **Urgent = only “blocked approvals”** clashes with the inbox’s own job. Failures and unanswered mentions also block work; digests are `low`, but findings/results have no priority rule. Sort is “urgent first, then newest,” so non-approval blockers never surface as urgent unless shoehorned into approvals.

3. **Approval timeout auto-denies** vs **“Approve and remember for this project.”** Remember-on-approve implies durable policy; auto-deny with no parallel “deny and remember,” no confirm, and no visibility of what was auto-denied turns memory into a silent footgun.

4. **Agent chats: “same component as Chat (04)”** vs **left list of agent “cards”** (status, current task, last active). That’s a different IA and density model than a normal chat thread list; “same component” and “agent cards” can’t both be true without a spelled-out fork.

5. **`@agent` from any normal chat** lives in this doc but changes Chat’s contract (handoff, inline answer, agent binding). The acceptance criteria only cover Hermes agent chat + inbox approval/retry—not mentions—so the feature is both in-scope and out-of-acceptance.

6. **“Matches mockup”** with no mockup, pane widths, row anatomy, or empty/selected states. Unverifiable against the UI system’s glass/dark tokens and against app-screen list rules.

---

### Gaps (build / UX)

| Area | Missing |
|---|---|
| Screen question | No one-liner (“Who needs me?”). Without it, 8 filters + 6 kinds + detail actions fight for hierarchy. |
| Status model | `new` in API vs filters All / Needs me / Done / Snoozed—no state machine. |
| Selection & bulk | Single-select assumed; no multi-approve, no “mark all done,” no undo after `e`. |
| Detail content | “Full body” — format? Markdown? Truncation? Secrets redaction? Linked run/card layout? |
| Empty / loading / error | None. Critical for a queue (Operate + app-screens §11). |
| Responsive | Desktop three-pane only. App-screen rule for inbox: **one region at a time** on phone; not specified. |
| Counts | Filters “with counts”—of what (unread? actionable? all-time?)? Stale counts? |
| Dedupe `source+key` | Key undefined; “updates existing” can hide repeated failures or approvals. |
| Snooze “next morning” | Whose timezone? After wake? Recurring? |
| Notifications | Urgent → desktop notification, but payload, grouping, mute, focus/DND, and click-target unspecified. |
| Agent directive UX | Plan → progress: interrupt? concurrent directives? failure mid-run? where does plan live vs run card? |
| Custom agents (v2) | Cramped into the same doc with no UI, auth, or rollout gate relative to v1 acceptance. |

---

### Unrealistic scope (for one spec / one acceptance set)

Shipping in one go: six item kinds, eight filters, full keyboard map, realtime `inbox.item` badge, snooze/expire/dedupe, desktop notifications, Hermes approvals, Scout findings, failure retry/logs/mute, digests, three-pane inbox, agent-bound chats, run cards, chat directives, cross-chat `@agent`, **and** custom agent presets (prompt, tools, memory).

Acceptance only proves three happy paths. Everything else is implied done or silently deferred—classic “spec as wishlist.”

**Realistic cut for v1:** Needs-me queue (approvals + failures + mentions), three-pane + `j/k` + approve/deny/done/retry, one agent chat (Hermes) with run cards. Park digests, snooze sophistication, “approve and remember,” `@agent`, custom agents.

---

### Security / privacy risks

- **Approve / Approve-and-remember from Inbox** — high-impact control with one key (`a`) and no confirm/step-up; remember-for-project is persistent privilege escalation for the agent.
- **Auto-deny on timeout** — irreversible workflow effect without mandatory audit UX in the detail pane (“auto-denied at … because …”).
- **Desktop notifications** — titles/bodies often leak on lock screens; digests/findings/approvals may contain repo paths, secrets, or PII.
- **View logs / Save to file / full body** — log and result payloads routinely contain tokens, env, customer data; no redaction or ACL called out.
- **`@agent` handoff** — unclear what context leaves the human chat (full thread vs single message); memory-scope agents make this a data-exfil path.
- **Custom agents: system prompt + tool allowlist + memory scope** — prompt injection via inbox “Ask Claude” / mention reply; allowlist without deny-by-default and no mention of who can edit `agent.config_json`.
- **Events `inbox.item` → sidebar badge** — needs authz scoping (single-user assumed?) so badges/items can’t cross projects/sessions.
- **Mute task** — can hide recurring failures and create a blind spot; no “muted because” in UI.

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility)

Framed as **Operate / app inbox**, not marketing:

1. **Hierarchy** — Eight equal filters + middle list (title, source icon, age, priority) + right actions dump everything to one visual weight. App-screens: answer the screen question first (e.g. count of Needs me + the selected item’s primary action). Filters should be secondary chrome, not a third peer column of equal loudness.

2. **Density** — No row pitch, pane widths, or title measure. App-screen list guidance: ~44–56px rows for medium list screens, selected row = nav `--active` fill (not a novelty highlight), totals stated. “Source icon” per row risks the banned “coloured icon per category” tell; prefer one quiet glyph set, meaning in type/status text.

3. **Cognitive load** — >4 visible decision points on first paint (8 filters + multi-action detail + keyboard legend implied). Collapse to All / Needs me / Done (or snoozed under Needs me). Kind-specific actions belong in the detail pane for the selected kind only—not a permanent action strip of every verb.

4. **Typography / legibility** — Unspecified. For Operate: one UI face, tight scale, full-ink primary text, dim only for age/meta. “Priority” must not be colour-only (urgent vs normal vs low). Age (“2h”) needs a stable format and tabular figures if aligned.

5. **Spacing / layout** — Classic mail three-pane is fine; the doc doesn’t close the grid (filter width, list min-width, detail measure). Risk: filter column with counts becomes a KPI strip; detail “full body” blows past ~65–75ch for prose with no max width.

6. **Agent “cards”** — Card language invites bordered tiles, status chromes, and dashboard slop. Prefer a flat agent list: name, one status word, one line current task, relative last-active—same left-edge as chat, no tile shadows/glass stacks inside the list.

7. **Motion** — None specified. Operate + app-screens: **no motion floor**; only press/hover/focus, pane swap, badge update (~150–250ms). Avoid orchestrated “new item” choreography; stream insert with stable sort and focus preservation.

8. **Contrast / glass tension** — This doc doesn’t set tokens, but “source icon + priority + glass panels” (from the product UI direction elsewhere) will fail contrast if priority chips and icons sit on `rgba` panels. Spec should require status as text + shape, and action buttons with solid fills for Approve/Deny—not ghost controls on frosted glass.

9. **Run cards in-thread** — “Next to text” without size hierarchy will compete with the message. Treat run cards as compact, one-line summary + link (timeline), not mini-dashboards (no sparklines, no icon tiles).

10. **Keyboard-first without teachability** — Good for power users; no discoverability (footer hint, `?` overlay) → Help heuristic fails. Also collision risk: `/` search vs global command palette patterns; `c`/`a`/`d` in a chat-like surface need focus-context rules (inbox list vs detail vs reply composer).

---

### Heuristic snapshot (spec as intended UI)

| Heuristic | Score | Issue |
|---|---|---|
| Visibility of status | 2 | Badge/events yes; auto-deny/snooze/mute/dedupe poorly visible |
| Match real world | 3 | Triage queue is clear |
| User control | 1 | Auto-deny, remember, mute, expire without undo/confirm |
| Consistency | 1 | Actions/API/filters/Chat fork disagree |
| Error prevention | 1 | One-key approve + remember; timeout deny |
| Recognition vs recall | 2 | Shortcuts dense; no on-screen map |
| Flexibility | 3 | Keyboard map is a strength if scoped |
| Minimalist design | 1 | 6 kinds × 8 filters × agent cards × v2 agents |
| Error recovery | 1 | Retry yes; undo/audit for deny/remember weak |
| Help | 1 | Open questions only; no in-product guidance |

**Rough total: ~16/40** — concept is right; specification quality is not ship-ready.

---

### Highest-leverage fixes (if you revise the doc only)

1. One state machine: `needs_me | snoozed | done` × kind; map every button to one transition; delete API/UI mismatches.  
2. One screen question + primary column = Needs me list; filters ≤4.  
3. v1 scope box; move `@agent`, custom agents, digests, remember-approve to explicit later.  
4. Security callouts: confirm on approve/remember; notification redaction; log/result ACL; agent handoff context boundary.  
5. UI appendix: pane widths, row fields (no colour-only priority), empty/loading, phone = list then sheet, motion = feedback only, run card = one-line.

I didn’t run the impeccable browser detector (this is a markdown spec, not a rendered surface). Context launcher was blocked in Ask mode; review is from the skills’ Operate/app-screen rules applied to the doc text alone.
