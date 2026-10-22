**Verdict:** The supervision idea is clear, but the screen packs too many jobs into one composition, and the bridge + autonomy model leave several security-critical behaviors underspecified. Mode for this surface: **Operate / app screen** (not marketing).

---

### Contradictions

1. **Chat vs directives** — The left pane is “a chat with Hermes” (`kind=agent`), but the bridge only defines `POST /hermes/directives`. No message/history endpoint. Is the left pane free-form conversation, or a directive log dressed as chat?

2. **Stop vs paused** — Stop “cancels the current step and drops queue to **paused**,” while Pause is a separate control. Naming and state machine collide: after Stop, is Resume valid? Is the queue cleared or held?

3. **Memory write path** — Bridge has `GET/PUT /hermes/memory` (direct edit), while behavior says Hermes writes are “proposed as a diff … until Jonas pins them.” Unclear whether PUT is Jonas-only, whether Hermes can bypass the diff, and what “optional setting” disables.

4. **Queue ownership** — `GET /hermes/queue`, bottom **Queue** tab (Kanban handoffs), and Kanban actions (create/move/pick up `hermes` cards) are three sources of truth with no stated sync rule.

5. **Singular API vs many agents** — Paths are `/hermes/...` and the header is one “name,” but open questions note the data model already allows many agents. Multi-agent is half-acknowledged, half-assumed away.

6. **Approvals vs Autonomous** — Approvals are Inbox + banner and block the step; Autonomous is “log only.” Whether the banner still appears (informational) or disappears entirely is undefined—high-stakes UX gap.

---

### Gaps

- **Bridge lifecycle:** SSE auth, reconnect, replay/backfill, disconnect/error UI, mock vs live indicator.
- **Step payload shape:** What is safe to show in `summary` vs full `input`/`output`; truncation; binary/browser screenshots.
- **Approval card content:** Risk category, truncated command, project, timeout countdown (default 30 min auto-deny has no UI).
- **Autonomy UX:** Where the per-project level is set/shown; what “allowlisted folders” are; how Balanced vs Ask-first looks different in the timeline.
- **States:** Empty (never run), idle, working, paused, error, bridge down—only “pulsing when working” is mentioned.
- **Responsive:** Desktop-only or collapsing split? Unstated; 40/60 + bottom tabs will fail on short laptop viewports without a plan.
- **Settings vs Skills:** Header Settings vs bottom Skills/Tools—boundary undefined.
- **Handoff:** “Give to Hermes” is behavior-only; context attachment schema and how it appears in the directive stream are missing.
- **Acceptance:** Covers mock render, approval, Stop—not memory diff/pin, autonomy levels, Kanban pickup, or multi-agent.

---

### Unrealistic scope

One “screen” section commits to: live SSE timeline, agent chat, pause/resume/stop, approvals, Inbox coupling, four bottom tabs (memory editor with diffs/pins, skill toggles, raw logs, queue), three autonomy modes, Kanban writeback, and global handoff. That is a **console product**, not a single view. The CLI-wrapper promise (“translates stdout to this schema”) is also optimistic relative to typed steps, approvals, and reliable Stop.

---

### Security / privacy

Highest risk: **Activity cards expand `input`/`output` for `shell|browser|file|api`.** That is a secrets and PII surface (tokens in env/commands, page content, file bodies, mail). Spec has no redaction, masking, copy-protection, or “reveal” gate.

Other issues:

- **Autonomous = log only** removes the human gate for outward/destructive work; Stop is the only control—easy to miss while the stream scrolls.
- **Balanced allowlisted writes** with no allowlist definition → path traversal / symlink escape risk if Hermes and junosd share a filesystem (open question).
- **Raw Logs** tab duplicates the stream with fewer safeguards—highest exfiltration/share risk.
- **Memory PUT** and **Skills toggles** are powerful; no confirmation, audit, or “who can call this” (local daemon assumed, not stated).
- **Approvals in Inbox** can leak intent in notification text.
- **30 min auto-deny** is a good fail-closed default; needs visibility so a missed banner doesn’t silently drop work—or so Auto-approve isn’t added later without review.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

**One job:** Supervise the agent (see what it’s doing; approve or stop). The layout fights that: directive chat (40%) + step cards (60%) + bottom tab stack + approval banner + header chrome. App-screen rule of thumb: the primary job is one click from the first screen; here approvals can lose to chat + tabs.

**Hierarchy / density**

- Header packs name, status pill, model, uptime, Pause/Stop/Settings—secondary metadata (model/uptime) competes with primary controls (Stop).
- “Steps as **cards** with **icon**, summary, duration, expandable I/O” + “**shimmers**” matches generated-ops chrome (icon tiles, card chrome, motion on chrome). App-screens: colour/motion on **data/state**, flat surfaces, quiet separation (tone step or 1px), not icon+card theater.
- Bottom tabs under a split view bury Memory/Queue and steal height from the timeline—the pane that should dominate.

**Motion**

- Pulsing status pill + shimmering running step = continuous motion. Operate guidance: 150–250ms state feedback, not ongoing decoration. No `prefers-reduced-motion` story; shimmer also hurts scan/legibility of the active step.

**Typography / legibility / contrast**

- No type scale or roles (primary step summary vs chrome vs I/O). I/O needs monospace and a tight measure; leaving it in the same card body as the summary will blur hierarchy.
- Status “pill” with pulse often fails contrast and distracts from the step text (the actual signal).
- Editable memory **chips** read as tag clouds—weak for “key facts” you must trust and edit; a short pinned list/table scans better.

**Spacing / composition**

- Fixed 40/60 with no density notes (row pitch, collapsed vs expanded step, how many steps visible). On 900px-tall screens, bottom tabs + header + banner push the live step below useful focus.
- Four bottom concerns mix **settings** (Memory, Skills) with **ops** (Logs, Queue)—IA smell; Settings belongs with header Settings or a single config surface.

**What’s missing for craft (states)**

- Empty / error / reconnect / approval-waiting are unspecified. App-screens treat honest empty/error frames as part of the product; acceptance only checks the happy mock path.

**Slop tells to preempt in the mockup**

- Pulsing pill, shimmer cards, icon-led step cards, chip clouds, “Logs” as a junk drawer. Prefer: strong step list (summary + duration + state colour on the status word/dot only), approval as the loudest interrupt, Stop visually dominant, chat/directives secondary or collapsible, memory as a review queue of diffs—not a chip playground.

---

### Priority fixes for the doc (if you revise it)

1. Pick **one primary column** (activity + in-place approval); demote chat and config.
2. Resolve **Stop/paused**, **memory diff vs PUT**, and **queue vs Kanban**.
3. Specify **redaction / reveal** for step I/O and raw logs.
4. Define **autonomy × approval × banner** behavior in one table.
5. Replace pulse/shimmer/chips/card-icon language with Operate-density: state colour, flat rows, reduced-motion, empty/error.

I can turn this into a tightened outline for a v2 of `06-hermes.md` (still Ask mode: guidance only) if you want that next.
