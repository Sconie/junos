**Verdict:** Clear intent (Jonas captures → Hermes executes → Review), but as an Operate-surface spec it under-specifies the board’s one question, card eligibility, and states—and the Screen paragraph is a generic Linear/Trello kit (filters + swimlanes + drawer), not a designed JunOS work surface.

Mode (impeccable): **Operate**. Lens: design-taste **app screens** (board + detail drawer), not landing-page rules.

---

### Contradictions

1. **Inbox naming.** Column is `Inbox/Ideas`; semantics only define **Ideas**; Review “creates an Inbox `result`.” Same word for a column, a product surface, and an event type—implementers will collide names and IA.

2. **Pickup eligibility.** Ready cards with assignee `hermes` *or* label `hermes`. Those can diverge (label only, assignee only, both). Unclear which wins, and whether triage’s suggested label silently enables pickup.

3. **Blocked is optional, failure path requires it.** Failure/block “moves to Blocked with the reason and an Inbox failure,” but Blocked is optional. No fallback if the column is off.

4. **Hermes → Done vs who owns columns.** “Hermes never moves a card to Done; Jonas does.” Silent on whether Hermes may move *Jonas* cards, reorder Ready, or leave Review. Autonomy (06) is cited but not mapped to column transitions.

5. **Creator vs marker vs filter.** Creator enum includes `scout | workflow:<id>`; UI marker is only for Hermes (`🤖`); filters are “mine, Hermes, project, label”—no Scout/workflow filter, so auto-cards are hard to find without labels.

6. **Review → Inbox result.** Only “Moving Hermes work here creates an Inbox `result`.” Scout/workflow/Jonas cards finishing into Review don’t get a notify path—or do they? Spec disagrees with itself on “shared work board” vs Hermes-only signaling.

7. **Ideas landing vs Ready pickup.** Auto-added cards “land” in Ideas; Hermes only picks Ready. Triage “suggests” edits via Inbox, “not silent edits.” Nothing says who promotes Ideas → Ready, so Hermes pickup can starve while Ideas fill.

---

### Gaps

| Area | Missing |
|---|---|
| Screen question | What the first viewport answers (“What’s in flight?”, “What can Hermes take?”, …) |
| Card model | Stable id, position/sort, uniqueness, archive of Done, soft-delete, duplicates |
| Column config | Who edits columns/WIP; hard vs soft WIP; empty column behavior |
| Eligibility | Single rule for Hermes pickup; interaction with autonomy/approvals |
| Realtime | How “appears live” works; conflict on concurrent drag/PATCH |
| Drawer | Field order, edit vs read, markdown preview, link previews, activity density |
| Capture | Paste bulk limits; capture from chat/file/Inbox field mapping; undo |
| States | Empty board, empty column, loading, Hermes offline, pickup refused, WIP exceeded |
| A11y / DnD | Keyboard path beyond `c`; screen reader for moves; reduced motion |
| Phone | Horizontal board collapse story |
| API | Authz, idempotency, bulk limits, comment vs activity log |
| Cross-refs | “matches mockup”, “autonomy (06)”, “triggers in 05”—no contracts in-doc |

Acceptance is three happy paths (keyboard add, live Hermes card, mock pickup → Review). No tests for Blocked-off, WIP, triage non-silent rule, drag conflicts, or non-Hermes creators.

---

### Unrealistic scope

One MVP surface is asked for: editable columns + optional Blocked + WIP, swimlanes (project *and* assignee), multi-filter, DnD, right drawer with rich fields (markdown, checklist, links, activity), global `c` + `/card` + paste-many + capture from three origins, live Hermes status bar, triage workflow, Hermes pickup with run links/artifacts, and event fan-out for triggers.

That’s a full project-tracker product. The open questions correctly defer GitHub/Linear and multi-board—but swimlanes + drawer + live agent status alone are already past “shared Ideas → Ready” MVP.

---

### Security / privacy

**Strong:** Triage suggestions via Inbox (not silent board mutation); Hermes doesn’t auto-Done; autonomy still applies on pickup.

**Weak or missing:**

- **Untrusted card body.** Scout findings, workflow output, Hermes splits, paste-from-chat → durable markdown. No rule that card text is data not instructions, or that Hermes must not re-execute shell/links from the card.
- **XSS / link abuse.** Markdown + links (file, PR, conversation, finding, run) in a drawer with no sanitization, allowlist, or “open externally” policy.
- **Secret leakage.** File/run/conversation links and activity log can surface paths, prompts, env-adjacent output in a shared board UI.
- **API sketch has no authz.** Who may `POST /cards`, move columns, or read boards—local-only is not a threat model.
- **Pickup side effects.** Start moves card + attaches run link; failure writes Inbox. Prompt-injected titles/bodies in Ready could steer Hermes work or spam Inbox.
- **Emoji marker ≠ provenance.** `🤖` is UI chrome; security needs creator/assignee fields and audit, not a glyph.
- **Bulk paste / capture.** High volume of attacker- or model-controlled text into Ideas with no rate limit or review gate before Ready.

---

### UI / design quality (Operate + app-screen lens)

Screen copy: *board + swimlane toggle + filters + DnD + right drawer + “Hermes is working on” + add-card per column.* That is stock kanban chrome, not a surface with a face or a single primary job.

**One question (app-screens §2.2).** Never named. Likely candidates fight each other: capture ideas fast vs see Hermes status vs triage Ready. Without a winner, the top bar, filter row, and drawer all compete as “primary.”

**Hierarchy / density.** Five+ columns × card chrome (priority, labels, due, checklist, marker) will read as sticker piles. App screens want colour on *data that decides*, not rainbow P0–P3 + label pills. Spec never says card face (title only? title + one signal?) vs drawer-only fields—so implementers will put everything on the card.

**Cognitive load.** Swimlane toggle + four filter kinds + DnD + drawer + per-column add + Hermes status = many decision points visible at once. Most frequent job (quick add, or “what’s blocking Review?”) should be one click; the rest progressive. Equal-weight filter chips are chrome-over-content.

**Typography / spacing / contrast.** Unspecified. Operate wants one family, tight rem scale, restrained accent on selection/state/action. Risk: soft-grey meta on cards under 4.5:1; priority colours as text without dark-ink pairs; WIP numbers that shout louder than card titles.

**Motion.** Silent. DnD and live card arrival need **state feedback only** (150–250 ms); no load choreography. Spec should forbid celebratory “card spawn” animation so “delight” isn’t bolted on.

**Legibility.** Markdown body + activity log in a drawer with no measure, truncation, or “summary vs full log” will become unread essays. Checklist and links need a list craft (row pitch, one primary link), not a dump.

**Product face.** “Matches mockup” with no mockup + robot emoji = kit. Missing: screen title that states the question, trade empty copy (“Nothing Ready for Hermes”, “Review is clear”), colour on in-flight / blocked / overdue—*not* creator-type rainbow. Hermes status belongs as one quiet status line answering the question, not a permanent hero banner unless that’s the named job.

**Phone.** Unmentioned. Multi-column boards fail on small screens; without a phone story (single column + column picker, or list-by-status), this ships as a squeezed desktop.

**Add-card affordance.** Inline add at the **bottom of every column** repeats the same CTA five times and buries capture under scroll. For “add in under 3 seconds,” one primary capture (command/`c`) should own the job; column footers are secondary.

---

### Highest-leverage fixes (spec-only)

1. **One eligibility rule** for Hermes (e.g. Ready + assignee `hermes` only); define Blocked-off failure; who promotes Ideas → Ready.  
2. **Phase the UI:** single board, no swimlanes v1; card face = title + one status signal; drawer holds the rest; filters = mine / needs Review first.  
3. **Threat paragraph:** markdown sanitize, link allowlist, card text not executable, activity redaction, API authz, pickup respects autonomy with explicit deny → Inbox.  
4. **Screen:** name the one question; mandatory empty/loading/error/WIP/Hermes-offline; motion = DnD + live insert only; phone = status list, not five columns; drop emoji for a text/creator affordance.

Ask mode — review only, no edits to `09-kanban.md`. Switch to Agent mode if you want these folded into the doc.
