Context loading did not run (Ask mode blocked the impeccable launcher); reviewing from the skills and this doc alone. No PRODUCT.md / DESIGN.md in the repo.

**Verdict:** Spec is a workable Operate-mode outline, but the screen is over-scoped and under-specified for a supervision console—especially security of the live stream and a UI that stacks chrome, cards, chips, and motion without a single primary job.

---

### Contradictions

- **Pause vs Stop:** Bridge has `pause | resume | stop`. Behaviors say Stop “cancels the current step and drops queue to paused.” If Stop leaves the agent *paused*, Pause and Stop collapse; resume semantics and “kill switch” language don’t match.
- **Directive stream vs chat:** Left pane is both “directive stream” and “a chat with Hermes (`kind=agent`).” Unclear whether directives are messages, a separate feed, or both (and which is source of truth).
- **Memory write path:** Contract is `GET/PUT /hermes/memory` (list/edit). Behaviors say Hermes writes are “proposed as a diff … until Jonas pins.” Spec never says whether Hermes PUTs drafts, the UI holds drafts, or both can edit live facts.
- **Autonomy vs Approvals:** Ask-first / Balanced / Autonomous vs “Approvals appear as Inbox items and as a banner.” Autonomous is “log only”—does the approval UI still appear, or is it inert? Auto-deny after 30m under Autonomous is undefined.
- **One agent vs many:** Open questions note `agent` table allows many; the Screen section is a single Hermes console (name, model, uptime). Multi-agent shell is neither deferred nor designed.
- **“Matches mockup”:** No mockup path, link, or acceptance against visuals—unfalsifiable.

---

### Gaps

- **Bridge auth / trust boundary:** No authn/z, TLS, localhost binding, or who may call the daemon wrapper.
- **SSE payload danger:** Steps include `input` / `output` for `shell|browser|file|api` with no truncation, redaction, retention, or “secrets never leave Hermes” rule.
- **Approvals schema:** `POST /approvals/:id {decision}`—no shape for what is being approved, risk class, timeout UI, or what the banner shows.
- **Settings:** Header lists Settings; never specified (autonomy level? allowlisted folders? timeout? memory-pin default?).
- **States:** Status includes `error`; no error, empty, reconnect, or offline UI for stream / queue / memory.
- **Responsive / density:** No breakpoint for 40/60 + bottom tabs; no max height for timeline cards or chip overflow.
- **Handoff context:** “Context attached” is unbounded (file contents, secrets, full thread?).
- **Logs:** “raw” of what, retention, and whether they duplicate the SSE timeline.
- **Shared chat `kind=agent`:** Differences from normal chat (streaming, approvals inline, who can send) unset.
- **Kanban:** “see 09” with no local contract for label `hermes`, Ready pickup, or ownership of moves.

---

### Unrealistic scope

One screen owns: live chat/directives, live step timeline with expandable I/O, Memory + Skills + Logs + Queue, Inbox/banner approvals, Pause/Stop/Settings, Kanban bidirectional sync, and global “Give to Hermes.” That’s a full ops product, not a thin supervisor shell.

Building UI against a mock bridge is fine; wrapping “CLI stdout → full HTTP + SSE + memory + skills + approvals + queue” before knowing how Hermes runs today (already an open question) is the hard dependency—and the UI surface assumes that contract is complete.

---

### Security / privacy risks

| Risk | Why it matters |
| --- | --- |
| Unauthenticated bridge | Local or LAN exposure = remote control of shell/browser/file/api |
| Full step `input`/`output` in UI + Logs | Credentials, mail, browsed pages, file contents in the console |
| Autonomous = log only | Outward/destructive actions without a gate; “kill switch” is reactive |
| Memory CRUD in UI | Personal facts editable and listable; diffs still expose proposed content |
| Browser / mail / network tools | Session cookies, outbound mail, arbitrary network once approved |
| Handoff “context attached” | Easy to over-share into the agent |
| SSE longevity | Stream is a continuous exfil channel if the daemon is reachable |

Minimum the doc should lock: trust boundary, redaction rules, default autonomy, and what never appears in the timeline.

---

### UI / design quality (Operate + app-screen lens)

Mode: **Operate**—precision and restraint beat expression. App-screen rules: colour on data not chrome; quiet surfaces; first screen answers one job; honest states; avoid template chrome.

**Hierarchy / primary job**  
Header (name, pill, model, uptime, Pause/Stop/Settings) + 40% chat + 60% card timeline + four bottom tabs + approval banner + Inbox. No stated primary question (“What is Hermes doing?” vs “What should it do next?”). Both compete; neither wins.

**Density**  
Activity “cards with icon, summary, duration, expandable input/output” plus Memory “editable chips with pin” is a density bomb. Expandable I/O will dominate the 60% pane; chip clouds don’t scan. App screens want lists/timelines with type and alignment, not icon-card stacks.

**Chrome & tells**  
Pulsing status pill + shimmering running step + status as coloured chrome = attention on chrome, not on the step that needs a decision. Prefer calm status type and one clear running row; reserve colour for approval / error / blocked.

**Motion**  
Pulse + shimmer with no `prefers-reduced-motion`, no “motion only for state change once,” and no budget. For Operate, motion should confirm state, not decorate.

**Typography / legibility**  
No type scale. Expandable shell/API dumps need monospace **only inside code blocks**, truncation, and “show more”—otherwise the timeline becomes unreadable prose soup. Memory chips fight long facts (truncation/edit affordance missing).

**Spacing / layout**  
Fixed 40/60 + bottom tabs assumes tall desktop; no rule for stacking on short laptop heights or what collapses first. Four bottom tabs + header actions push decision count past comfortable scan.

**Contrast / status**  
“Status pill” with no tone system (online / idle / working / paused / error) risks low-contrast greys or rainbow pills. Error and “needs approval” should be the only loud states.

**Missing craft for high stakes**  
Stop always visible is good. Approval as banner + Inbox is good. What’s missing: calm confirmation of auto-deny, empty Memory/Queue, stream disconnect, and a single place to resolve the blocked step without hunting Inbox vs console.

**Product face**  
Nothing Hermes-specific beyond the name—“agent console with timeline cards” could be any product. Per app-screens: one signature element (e.g. the blocked step as the hero row, or the directive as the only primary compose surface) should be named in the spec.

---

### Highest-leverage doc fixes

1. Pick one primary job and demote the rest (e.g. supervise activity + approve; Memory/Skills/Logs secondary or separate routes).  
2. Resolve Pause vs Stop and autonomy vs approval matrix in one table.  
3. Specify stream redaction, auth, and what `input`/`output` may contain.  
4. Replace “cards + chips + pulsing pill + shimmer” with a quiet timeline + one approval callout; define empty/error/reconnect.  
5. Link or drop “matches mockup”; defer multi-agent and Kanban to explicit non-goals if v1 is mock-only.

---

Which should this console optimize for first: **issuing directives**, or **supervising/approving live steps**? That choice should drive the next edit to this spec.
