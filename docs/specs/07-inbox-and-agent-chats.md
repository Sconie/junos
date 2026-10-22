# Inbox and Agent chats

## Inbox
One triage queue for everything that needs Jonas or that finished while he was away.

### Item kinds
| Kind | Source | Actions |
|---|---|---|
| approval | Hermes or workflow step needs a yes/no | Approve, Deny (and, for write-local items only, "Approve and remember" with a scoped rule; never offered for external-send, destructive or spend, see 12) |
| finding | Scout | Make card, Dismiss, Snooze, Ask Claude about it |
| result | task or workflow output | Open, Save to file, Make card |
| failure | failed run | Retry, View logs, Mute task |
| mention | agent asked a question | Reply inline |
| digest | daily/weekly summary | Open |

### Screen (matches mockup)
Left filters (All, Needs me, Approvals, Findings, Results, Failures, Snoozed, Done) with counts. Middle list (title, source icon, age, priority). Right detail pane with full body, linked run or card, and the actions above. Keyboard first: `j/k` move, `e` done, `s` snooze, `a` approve, `d` deny, `c` make card, `/` search.

### Rules
- Priorities: `urgent` (blocked approvals), `normal`, `low` (digests). Urgent raises a desktop notification.
- Dedupe: same source+key within 24h updates the existing item.
- Auto-expire low-priority items after 14 days to Done.
- Snooze until a time or "next morning".
- Approval timeout auto-denies and records it.
- Sort: urgent first, then newest.

### API sketch
```
GET /inbox?status=new&kind=approval
POST /inbox/:id/action {action: approve|deny|done|snooze|card, until?}
```
Events `inbox.item` stream to the UI for the unread badge on the sidebar.

## Agent chats
A chat with a specific agent instead of a bare model. Same component as Chat (04) with differences:
- Conversation `kind = agent`, bound to an `agent_id` (Hermes, Scout, or a custom persona).
- Left list groups by agent; each agent has a card showing status, current task and last active.
- Messages can contain **run cards** (what the agent did) next to text, linking to the Hermes activity timeline.
- Agent can be given a directive by chat; the agent replies with plan then progress.
- `@agent` mentions from any normal chat hand a message to that agent and return its answer inline.

### Custom agents (v2)
A named preset: system prompt, default model/effort, tool allowlist, memory scope. Examples: "Code reviewer", "Research assistant". Stored in `agent.config_json`.

## Acceptance criteria
- A failed task shows up in the Inbox with a working Retry.
- An approval raised by a mocked Hermes can be approved from the Inbox and unblocks the step.
- Agent chat with Hermes shows directives and run cards in one thread.

## Open questions
- Notifications: desktop only, or also push/email for urgent items? Option: send urgent items through the existing Hermes Telegram bot (or a second JunOS bot), with Approve/Deny inline buttons.
- Mail/calendar as inbox sources (Gmail, Google Calendar): v2, read-only first.

## Rev 2 additions
- Approval items use the shared ApprovalCard (14) and show actor, exact action/diff, target, expiry and irreversibility. Approve/deny shortcuts only work in the focused detail view, not on list rows, and the list does not re-sort while a detail is open.
- Inbox is the single authoritative queue for decisions; Home shows a summary of it.
- Stale approvals (expired, already decided via Telegram, run cancelled) are shown as resolved and cannot be re-answered.
- Tool-call approvals from agent chats resolve through the same gateway record.
