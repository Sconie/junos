## Findings

1. **Severity: high — Three places to talk to Hermes, none owned**  
   **Ref:** Agent chats (“Same component as Chat… Left list groups by agent”); `06` Hermes screen (“Left 40%: directive stream, a chat with Hermes”); `14` rail (“Chat, Agents, … Hermes”).  
   **Why:** Chat-with-agent-badge, an Agents screen, and the Hermes console all claim the same job. Operators will not know which is canonical; Phase 3 builds three overlapping UIs.  
   **Fix:** Pick one primary surface (recommend Hermes console for Hermes; Agents list only for multi-agent / custom). Spec that Chat shows an agent badge that deep-links into that surface, and delete or demote the duplicate.

2. **Severity: high — Approval actions omit the security contract**  
   **Ref:** Item kinds “Approve, Deny, Approve and remember for this project”; `12` “Approvals are explicit Inbox items showing the exact command/diff… scoped rule (project + action pattern), visible and revocable in Settings.”  
   **Why:** Approving without a mandatory command/diff preview is a destructive-action footgun. “Remember” without showing the pattern and Settings revoke path trains unsafe muscle memory (worse with Home’s inline Approve in `10`).  
   **Fix:** Detail pane must render exact command/diff (and class from `12`) before enable Approve; “remember” preview + link to Settings; same payload for Home inline actions.

3. **Severity: high — Acceptance requires Retry; API and action table don’t**  
   **Ref:** Actions for `failure`: “Retry, View logs, Mute task”; API `action: approve|deny|done|snooze|card`; Acceptance “working Retry.”  
   **Why:** Implementers will ship Done/Snooze and leave Retry as a dead UI or invent an ad-hoc endpoint; Mute/Dismiss/Ask/Reply are also unspecified.  
   **Fix:** Expand action enum (`retry`, `dismiss`, `mute`, `ask`, `reply`, `open`, `save`) with per-kind matrix, or cut Retry from acceptance until the API exists.

4. **Severity: high — Filters don’t match the data model**  
   **Ref:** Filters “All, Needs me, Approvals, Findings… Snoozed, Done”; API `?status=new&kind=approval`; `02` status `new | seen | snoozed | done | dismissed`.  
   **Why:** “Needs me” is undefined; filters mix kind and status; `seen`/`dismissed` never appear; badge/`status=new` semantics unclear. Counts and queries will disagree.  
   **Fix:** Define filters as queries (e.g. Needs me = `status in (new,seen)` ∧ kind ∈ {approval,mention,failure} ∧ not snoozed). Map Done vs Dismissed; document badge = count of Needs me (or `new` only).

5. **Severity: high — `@agent` handoff skips the approval/tool story**  
   **Ref:** “`@agent` mentions from any normal chat hand a message to that agent and return its answer inline”; `04`/`12` tools behind approval policy.  
   **Why:** Inline agent answers with tools can run write/external/destructive work without an Inbox pause, or return untrusted agent output into a normal chat.  
   **Fix:** Spec that `@agent` creates a directive/run under the same autonomy level; tool classes still gate via Inbox; inline reply is text/summary only until approvals clear (or block `@agent` until Phase 3 policy is written).

6. **Severity: high — Desktop notifications for urgent, with no privacy budget**  
   **Ref:** “Urgent raises a desktop notification”; Open questions push/email; `13` Phase 5 “notifications”; `12` threat model.  
   **Why:** Notifications often mirror titles/bodies (approvals may include paths, diffs, mail). Spec pulls Phase 5 into earlier phases without redaction rules.  
   **Fix:** Defer OS notifications to Phase 5, or v1 = in-app + badge only; if OS notify: title = kind + “needs you”, body redacted; never full command/diff/mail.

7. **Severity: med — “Matches mockup” with no Inbox/Agents mock**  
   **Ref:** “Screen (matches mockup)”; `docs/design/stitch-prompts.md` has Home/Chat/Tasks/Hermes/Files/Connections only; `src/App.tsx` has no Inbox/Agents routes.  
   **Why:** Layout is invented Gmail-three-pane without a reference; Stitch/nav already drifted from `14`.  
   **Fix:** Add a Stitch (or hand) mock for Inbox + Agents, or drop “matches mockup” and lock layout in this doc (widths, density, selection).

8. **Severity: med — Spec locks a generic “AI OS” look the taste skills reject**  
   **Ref:** Inherits `14` Translucent Glass: gradients, blur/glass, Inter, violet accent; list “source icon… priority”; agent “card showing status.”  
   **Why:** design-taste app-screen bans: glass/gradients/glows, violet-as-chrome, Inter-kit face, icon-per-row category chrome, card grids for peers. impeccable Operate wants restraint and task clarity, not mission-control garnish.  
   **Fix:** In this spec: opaque tone-step panels; priority as type/order not coloured chrome; one grey glyph set or none; agent rows not status “cards”; colour only on urgent/blocked data.

9. **Severity: med — Eight filters + three panes = high cognitive load, no phone story**  
   **Ref:** Filter list (8); three columns; `14` “Below 900 px… side panels become full-screen sheets”; design-taste: inbox = one region at a time; impeccable: >4 visible options is a load flag.  
   **Why:** Primary job (“who is waiting?”) is buried; narrow viewports undefined.  
   **Fix:** Default to Needs me + search; other filters behind one Filters control; document list→detail push on &lt;900px with back restoring scroll.

10. **Severity: med — Custom agents (v2) inside a Phase 3 doc**  
    **Ref:** “### Custom agents (v2)” + acceptance “Agent chat with Hermes…”; `13` Phase 3 = Hermes + agent chats.  
    **Why:** Personas, tool allowlists, memory scope are a second product; bloating 07 delays Hermes.  
    **Fix:** Move custom agents to a later section/spec; keep v1 = Hermes (+ Scout if needed) only.

11. **Severity: med — Dual approval APIs, no single writer**  
    **Ref:** `06` `POST /hermes/approvals/:id`; `07` `POST /inbox/:id/action {approve|deny}`; `05` `inbox.item.approved` trigger.  
    **Why:** Two writers race, miss audit events, or unblock Hermes without Inbox status.  
    **Fix:** Inbox action is the only user-facing API; daemon maps to Hermes bridge and emits `event` + `inbox.item.approved`.

12. **Severity: med — Dedupe `source+key` not in schema**  
    **Ref:** “same source+key within 24h”; `02` `inbox_item(… source_ref_json …)` no `dedupe_key`.  
    **Why:** Unimplementable without inventing columns; Scout has its own dedupe (`08`) — double systems.  
    **Fix:** Add `dedupe_key` (or define key derivation from `source_ref_json`) and one shared rule with Scout.

13. **Severity: med — Keyboard `/` fights Chat slash commands**  
    **Ref:** Inbox “`/` search”; `04` composer “`/` commands”; same component for agent chats.  
    **Why:** Shared focus/keymap will steal search or slash menus.  
    **Fix:** Inbox search = `⌘F` / plain focus in search field; reserve `/` for chat composer only.

14. **Severity: med — “Ask Claude” hardcodes a provider**  
    **Ref:** Finding actions “Ask Claude about it”; `00` multi-subscription principle; `08` same label.  
    **Why:** Breaks routing when Claude is disconnected; teaches a single-vendor UI.  
    **Fix:** “Ask in Chat” with current default/routing model; optional override.

15. **Severity: med — Auto-expire and silent Done without audit UX**  
    **Ref:** “Auto-expire low-priority items after 14 days to Done”; Home “Needs you”; `05` Inbox triage workflow.  
    **Why:** Digests/findings can vanish from Needs you without review; triage automation may fight expiry.  
    **Fix:** Expire to archive/`dismissed` with toast/log; exclude `approval`/`failure`/`mention`; document interaction with triage workflow.

16. **Severity: med — Mention / Reply path unspecified**  
    **Ref:** `mention` → “Reply inline”; no API action `reply`; agent chat thread not named.  
    **Why:** Reply may not reach the waiting agent; step stays blocked.  
    **Fix:** Reply posts to bound `conversation`/`directive`, resolves inbox item, records `event`.

17. **Severity: med — No empty / loading / error / offline for Inbox**  
    **Ref:** Spec silent; `14` “States every screen needs”; design-taste empty/loading rules.  
    **Why:** First-run and daemon-down will look broken.  
    **Fix:** Add states: empty Needs me (“Nothing waiting — Hermes idle / next task …”); skeleton rows; per-pane error + Retry; respect global offline banner.

18. **Severity: med — Urgent priority only for approvals**  
    **Ref:** “`urgent` (blocked approvals), `normal`, `low` (digests).”  
    **Why:** Blocked failures, spend, or time-critical mentions stay `normal` and miss notifications/sort.  
    **Fix:** Define urgent = anything blocking a run or requiring a decision within timeout; map failures that block Kanban/Hermes.

19. **Severity: low — Mail/calendar as Inbox v2 vs Morning briefing**  
    **Ref:** Open question mail/calendar v2; `05` starter “Morning briefing (calendar, mail digest…).”  
    **Why:** Briefing implies mail/calendar integration before Inbox sources exist.  
    **Fix:** Align: briefing v1 = local/files only, or promote read-only mail/calendar with Inbox.

20. **Severity: low — Agent “run cards” only wired to Hermes timeline**  
    **Ref:** “linking to the Hermes activity timeline”; agents include Scout/custom.  
    **Why:** Scout/custom runs dead-end or fake Hermes links.  
    **Fix:** Link `run_id` → generic run/timeline; Hermes deep-link only when `agent.kind = hermes`.

21. **Severity: low — Kanban column name “Inbox/Ideas” vs product Inbox**  
    **Ref:** `09` column `Inbox/Ideas`; this doc’s Inbox queue.  
    **Why:** Copy/nav collision.  
    **Fix:** Rename board column (e.g. Ideas) in `09`/`07` glossary.

22. **Severity: low — Snooze “next morning” ignores timezone**  
    **Ref:** “Snooze until a time or next morning”; `05` default Europe/Copenhagen.  
    **Why:** Wrong wake time when laptop TZ ≠ task TZ.  
    **Fix:** Resolve “next morning” in user/default timezone from settings/`05`.

23. **Severity: low — No bulk / undo for high-stakes actions**  
    **Ref:** Keyboard `a`/`d`/`e`; impeccable control/freedom.  
    **Why:** Fast deny/done on wrong row; no undo window.  
    **Fix:** Toast with Undo (5–10s) for Done/Dismiss/Deny; optional multi-select later.
