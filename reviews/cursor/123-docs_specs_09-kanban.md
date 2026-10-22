**Verdict:** The doc is a workable product sketch for a personal Hermes-fed board, but as a buildable Operate-screen spec it is thin on composition and dense on features. The biggest risks are dual Hermes eligibility rules, an undefined card face vs drawer hierarchy, and live agent chrome that will fight scanability and the app-screen craft rules.

---

### Contradictions

1. **Column name vs semantics.** The pipeline starts as `Inbox/Ideas`, then the bullet is **Ideas**. “Inbox” already names another surface; this invites wrong mental model and duplicate naming.

2. **Hermes eligibility is two systems.** Ready says cards *labelled* `hermes`; pickup says assignee `hermes` **or** label `hermes`. Assignees are `jonas | hermes | none` — so label and assignee can disagree (assignee Jonas + label hermes). Spec never says which wins.

3. **Where auto-cards land.** “Auto-added cards land here” (Ideas) vs Hermes “may split the work into cards” after a directive — those often should be Ready/scoped, not Ideas. Unclear by creator.

4. **Review → Inbox `result` only for Hermes.** “Moving Hermes work here creates an Inbox `result`.” Jonas (or Scout) cards moved to Review: silent? Same column, different side effects is easy to get wrong.

5. **Title vs body.** Title: “Jonas adds, Hermes fills.” Body: Scout, workflows, triage. The framing understates non-Hermes writers.

6. **One board vs `/boards/:id`.** Open question proposes one board + project field; API is multi-board shaped. Either drop board ids for v1 or drop the “one board” proposal.

7. **WIP vs Hermes concurrency.** Optional column WIP vs “one card In progress at a time” for Hermes — same knob or two? If Jonas is In progress and Hermes picks up, is that allowed?

8. **“Matches mockup” with no mockup in the doc.** Unverifiable; conflicts with “editable columns” / optional Blocked, which mockups rarely show as variants.

---

### Gaps (build-blocking)

| Area | Missing |
| --- | --- |
| Card face | What shows on the tile vs only in the drawer (title only? priority? due? checklist count? links?) |
| Drawer | Sections, edit model, comment vs activity, when it opens (click vs select) |
| Ordering | Position semantics for `PATCH` / DnD (index, rank string, conflict on live updates) |
| Column edit | How defaults become custom; renaming Inbox/Ideas; removing Blocked mid-flight |
| Keyboard | Beyond `c` / `/card`: move columns, open drawer, assign Hermes, filter — required for “under 3 seconds” and a11y |
| States | Empty board, empty column, loading, offline daemon, failed live update |
| Live updates | SSE/event payload, who “appears live,” conflict when Jonas drags while Hermes moves |
| Triage | Accept/reject of suggested priority/labels (Inbox-only is named; board feedback isn’t) |
| Done | Archive, hide, search Done; unbounded Done column |
| Mobile | UI system puts Kanban in the bottom tab bar; this spec is desktop board-only |
| Acceptance | No criteria for filters, swimlanes, drawer, WIP, Blocked, keyboard move, triage |

---

### Unrealistic scope (for one screen / early phase)

Packed into one surface: editable columns, optional Blocked + WIP, swimlanes (project **and** assignee), four filter dimensions, DnD, right drawer, live Hermes presence bar, inline add per column, bulk paste, capture from chat/file/Inbox, checklist, activity log, rich links, triage workflow, event bus hooks, and Hermes state machine with Inbox side effects.

For a personal v1, the realistic core is: fixed columns, keyboard add, Hermes Ready→In progress→Review, card drawer with markdown body, simple filters. Swimlanes + WIP + bulk + triage + live presence are a second slice. Acceptance criteria only cover three happy paths — that mismatch is the scope smell.

---

### Security / privacy

- **Markdown body + links** — XSS if HTML is allowed; `file:` / path links are a local exfil and open-outside-root risk; untrusted URLs from Scout/Hermes need a policy.
- **Hermes/Scout/workflow auto-create** — card text can copy secrets from chat, findings, or run logs onto a persisted board (and later GitHub/Linear sync, already an open question).
- **Pickup reads card content** — title/body are a prompt-injection surface into Hermes; autonomy/approvals (06) are cited but not how card text is sandboxed.
- **Activity log / run links** — may retain failure output and artifacts; no retention or redaction.
- **API sketch** — no authz, board scoping, or event payload minimization; `kanban.card.*` for triggers can leak titles/bodies to workflows.
- **Bulk paste** — high chance of pasting credentials into Ideas with no warning.
- **Emoji/creator marker** — weak as a trust signal; spoofable if clients can set `creator`.

Single-user JunOS lowers multi-tenant risk; it does not remove persistence, sync, or agent-injection risk.

---

### UI / design quality  
*(Impeccable **Operate** mode + design-taste **app screens**: scan first, quiet chrome, density with meaning, no template tells.)*

**Hierarchy / composition**  
“Screen” is a feature list, not a composition. No primary job (“What needs me vs what Hermes owns?”), no first-viewport priority, no card anatomy. Risk: generic kanban chrome that fails the product-face test (could be any board).

**Chrome vs data**  
Top Hermes presence + swimlane toggle + filters + column WIP + per-column add + drawer stacks chrome. App-screen research: colour/attention on data, not chrome; often no filled primary; quiet shell. A persistent “Hermes is working on…” bar will dominate every glance unless it is one quiet status line tied to the In progress card itself.

**Density**  
Unbounded card fields with no face/drawer split → either unreadably fat cards or mystery-meat tiles. Swimlanes × columns explodes empty space and scrolling; the doc never caps visible lanes or defines collapsed lanes. Add-at-bottom-of-every-column repeats controls and buries add on long columns (prefer one `c` / column header affordance).

**Typography / legibility**  
No type roles for column title, card title, meta, WIP count. Meta (creator, P0–P3, due, labels) will default to tiny tracked labels or pills — taste bans tiny uppercase letter-spaced labels; app screens want sentence case ~11–12px floor and **one** status mark per row. P0–P3 + labels + 🤖 + assignee is multiple competing marks.

**Contrast / colour**  
Spec inherits the product glass system (violet accent, dim `#9AA0AC`, blur panels) unless overridden. That fights taste house rules (no glass, no violet/indigo “assistant” palette, text tiers ≥4.5:1). On frosted panels, dim meta and pale priority chips are the first legibility failures; status must not be colour-only (also in 14-ui-system).

**Motion**  
“Appears live” with no budget: every Hermes/Scout insert animating will feel noisy. Operate screens need small, once-per-event feedback, column move as the meaningful motion, and a `prefers-reduced-motion` path. DnD without keyboard equivalent fails harden/a11y.

**Template / slop tells to avoid when implementing**  
🤖 emoji as creator badge; pill clusters for filters; WIP as loud badges; glass floating drawer; gradient presence bar; icon-only column headers. Prefer trade copy (“Ready for Hermes”, “Waiting on you”) over generic “Inbox/Ideas”.

**What the doc gets right (keep)**  
Clear purpose (Jonas captures, agents fill, Hermes executes); Hermes must not mark Done; triage as suggestions not silent edits; keyboard-first acceptance seed (`c` / 3 seconds); local-only before Linear/GitHub.

---

### Highest-leverage spec fixes (if you revise the doc)

1. Fix Hermes eligibility to **one** rule (recommend: assignee only; label is filter sugar).  
2. Specify **card face** (3–5 fields) vs drawer; kill emoji marker for a text/creator chip.  
3. Cut v1 UI to: fixed columns, filters (mine / Hermes), drawer, no swimlanes.  
4. Add keyboard map, empty/loading/error, live-update conflict, and Done hygiene.  
5. Add a short threat note: markdown sanitization, secret-paste warning, event payload minimization, no sync until redaction policy exists.

I’m in Ask mode, so I can’t edit the spec; switch to Agent mode if you want those fixes applied in `docs/specs/09-kanban.md`.
