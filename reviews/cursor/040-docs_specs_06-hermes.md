**Verdict:** As an Operate-mode supervision console, the intent is right (supervise, don’t re-implement the loop; kill switch; approvals). The Screen + Behaviors sections already sketch a **generic agent-ops dashboard** that packs too many jobs, hardcodes slop-adjacent chrome (status pill, step cards, shimmer), and leaves the trust boundary underspecified relative to what the stream API exposes.

Mode: **Operate** (app screen). No rendered UI — critique is of the specified composition.

---

### Contradictions

1. **Stop vs Pause.** Header has Pause/Stop; API has `/pause | /resume | /stop`. Behavior says Stop “cancels the current step and drops queue to **paused**.” So Stop lands in the same state as Pause? Or Pause freezes mid-step without cancel? Undefined, and the UI can’t label the difference.

2. **Memory write path.** Bridge has `PUT /hermes/memory` (direct edit). Behavior says Hermes writes are “proposed as a diff… until Jonas pins.” Unclear whether PUT is Jonas-only, Hermes-only, or both — and whether Autonomous mode bypasses the pin gate.

3. **Autonomy vs Memory hygiene.** Ask-first / Balanced / Autonomous are about outward/destructive steps. Memory hygiene is a separate gate. Spec never says which wins when Autonomous + “propose until pin.”

4. **Approvals surface vs API.** Approvals are Inbox + console banner + `POST /approvals/:id`. The Screen never shows an Approvals region; bottom tabs are Memory / Skills / Logs / Queue. Banner + Inbox may be enough, but the primary job (“unblock Hermes”) is not named as first-class on this screen.

5. **Handoff payload vs API.** “Give to Hermes” attaches context from files/chat/cards. Directive schema is only `{text, projectId?, priority}` — no `attachments` / `contextRefs`.

6. **Supervise vs control surface.** Opening promise is “does not re-implement the agent loop.” The screen then owns chat, live steps, editable memory, skill toggles, raw logs, queue, approvals, Kanban pickup — that’s a full agent control plane. Fine product-wise, but the framing and the surface fight each other.

7. **“Matches mockup”** with no linked mockup, tokens, or empty/error states — unfalsifiable.

8. **Singular console vs multi-agent.** Open question admits `agent` table allows many; Screen is one Hermes. No switcher, no which-agent for Queue/Memory.

---

### Gaps

- Bridge **auth, binding (localhost vs network), TLS, and who may call** `/hermes/*`.
- **Disconnect / offline / error** UI for `state: error` and SSE drop (acceptance only covers happy mock + Stop).
- **Allowlisted folders** for Balanced — where defined, per-project how, UI to see them.
- **Settings** in the header — contents unknown (timeout? autonomy? pin policy?).
- **Reduced motion** for pulsing pill + shimmer; focus order with banner + Inbox.
- **Phone / narrow width** — dual 40/60 + bottom tabs has no collapse story (app-screens §12 territory).
- **Step redaction** — what of `input`/`output` is shown vs truncated vs hidden.
- Acceptance omits autonomy levels, memory pin flow, Kanban `hermes` pickup, multi-agent, handoff.
- Queue vs directives vs Kanban cards — three “work waiting” concepts, no ownership diagram.

---

### Unrealistic scope

One screen + four bottom tabs + Inbox + Kanban + global handoff is a **v1 product**, not a thin console over a mock bridge. Wire-format-first is good; baking Memory CMS, Skills admin, raw Logs, and Queue into the same viewport before “how Hermes runs today” is answered is early.

Acceptance is appropriately small; the Screen section is not. Spec should split **must-ship console** (status, stream, approve, stop) from **later tabs** (memory hygiene, skills, logs).

---

### Security / privacy

Highest risk in the doc: **SSE steps include full `input` and `output` for `shell|browser|file|api`.** That will surface secrets, file bodies, mail, tokens. No redaction, retention, or “hide payloads by default / reveal with confirm.”

Other risks the spec invites but doesn’t constrain:

| Risk | Why |
| --- | --- |
| Unauthenticated bridge | Any local/network client becomes Hermes remote control |
| Autonomous = “log only” | Destructive/outward actions without a human in the loop |
| Skill toggles | Enabling browser/shell/mail with no second factor or blast-radius copy |
| Editable memory chips | Personal facts in a chip UI; pin/diff model unclear under Autonomous |
| 30 min approval timeout → auto-deny | Safer than auto-approve, but long hang + silent deny needs loud UX |
| Handoff from chat/files | Over-scoping context into the agent without a visible attachment list |
| Same-machine open question | Remote Hermes + file tools = trust boundary the UI doesn’t show |
| Raw Logs tab | Unbounded PII dump next to the “friendly” timeline |

Kill switch always visible and approval auto-deny are the right instincts; they need to dominate chrome over uptime/model vanity.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

**One question missing.** App-screens §2.2: every screen answers one question first. This never names it. Candidates: “Is Hermes safe to leave running?” or “What is it doing right now, and does it need me?” Header (name, **status pill**, model, uptime, Pause/Stop/Settings) answers “dashboard chrome,” not the job.

**Hierarchy.** Pause/Stop (high stakes) share a bar with model/uptime (meta). Approvals are a banner, not the visual peak. Emotional journey for Operate: reassurance at high-stakes moments — here the kill switch is present but not compositionally primary.

**Density / IA.** First viewport must hold every named block’s header + first rows (app-screens). Spec names: header, directive chat, activity timeline, **and** four bottom tabs. At 1440×900 that forces either a crushed timeline or tabs that hide Memory/Queue — both fail “substance on the first screen.” Bottom-tabbing Memory (high-stakes edits) under a dual-pane live console is especially wrong: pin/diff needs calm, not a drawer under a shimmering feed.

**Cards + icons + shimmer.** “Steps as cards with icon… running step shimmers” is the generated ops-dashboard tell: icon tiles, card trays, decorative loading. App-screens: colour on **data/state**, surfaces flat, no hero header; Operate motion: state, not decoration (150–250ms). Prefer a **dense step list** (type, one-line summary, duration right-aligned tabular, expand for I/O) over icon-cards. Running = duration ticking + status word, not shimmer.

**Status pill + pulse.** Pills are allowed for real state machines (app-screens §7.6) with pale tint + dark text, one mark, ≥11px. “Pulsing when working” is chrome attention steal; if only one agent is working, a quiet state line + accent on the **active step** carries more meaning than a throbbing pill.

**Typography / legibility.** No type roles. Risk: tiny tracked meta for model/uptime (banned tell), and expandable shell dumps as unread walls. Need: body ≥14px ink for summaries; monospace **only** for real I/O; measure/clamp; failed vs ok as ink + word, not rainbow.

**Spacing / composition.** Fixed 40/60 with no grid math, gutter, or what collapses first. Chat + timeline as twin heroes compete; for supervision, **activity should win width**, directives a narrower command rail (or directive as composer, not a full shared `kind=agent` chat unless that chat *is* the directive channel — currently ambiguous).

**Contrast.** Unspecified. Semantic states (working / paused / error / needs approval) need one hue family at three intensities, not a loud pill plus shimmer plus banner.

**Motion budget.** Pulse + shimmer + (likely) SSE list inserts without `prefers-reduced-motion` or “motion = state only.” Impeccable Operate forbids orchestrated chrome motion.

**Product face.** Nothing JunOS-specific — could be any agent wrapper. Missing signature element: e.g. approval as the only saturated control, or a single “needs you” strip bound to the waiting step — not KPI-like uptime.

**Copy / trade words.** “Skills/Tools,” “Logs (raw),” “status pill” are template nouns. Stronger: “Waiting on you,” “Held 12m,” “Denied by timeout,” “Pinned fact.”

---

### Highest-leverage spec fixes (guidance only)

1. **Name the one question** and demote model/uptime; make Stop + pending approval the header’s primary actions.  
2. **v1 Screen = status + step list + approve/deny + Stop**; Memory / Skills / Logs / Queue as separate routes or a later milestone.  
3. Replace card/shimmer language with a **flat step list** + honest running state; require reduced-motion.  
4. Align API with behaviors: directive `contextRefs`, memory `propose` vs `pin`, Pause ≠ Stop semantics, redaction flags on stream payloads.  
5. Add a **Privacy** subsection: default-hide step I/O, retention, bridge bind to localhost + auth, Autonomous not default.

I’m in Ask mode — I can’t edit the doc. Switch to Agent if you want these folded into `06-hermes.md`.
