**Verdict:** As an Operate-screen brief, this is a thick control plane sketched as one console. The supervision idea is clear; the layout, security boundary, and motion language are not shippable as written.

Mode: **Operate** (agent console). Lens: impeccable Operate restraint + design-taste app-screens (quiet chrome, colour on meaning, honest states, one primary job).

---

### Contradictions (inside this doc)

1. **Pause vs Stop vs Resume** — API has `pause | resume | stop`. Header lists Pause/Stop/Settings; Resume is missing. Stop “drops queue to paused,” so Pause and Stop both land on `paused` with unclear difference (cancel-current vs freeze?).
2. **Approvals live in two places this screen doesn’t own** — “Inbox items and as a banner in the console,” but the Screen section has no Inbox, no banner slot, no layout for a blocked step waiting on the timeline.
3. **Memory write path** — Bridge is `GET/PUT /hermes/memory` (direct list/edit). Behavior says Hermes writes are “proposed as a diff … until Jonas pins” (optional). Unclear whether PUT is draft, pin, or both; chips vs diffs are two UIs.
4. **Left pane metaphor** — “directive stream, a chat” (`kind=agent`). Stream of directives ≠ conversational chat; which is primary?
5. **Single console vs many agents** — Open question allows several named agents; Screen/header assume one Hermes (name, model, uptime).
6. **Supervises vs drives** — “does not re-implement the agent loop” vs Kanban create/move/pickup, Skills toggles, Memory edit, Queue, Approvals — this is an orchestration console, not a thin viewer.

---

### Gaps

- **Auth/trust on the bridge** — endpoints have no auth, origin, or local-only constraint.
- **States** — no empty / offline / reconnect / error console; `error` is a status enum with no UI.
- **Autonomy UI** — levels are per project but not on this screen; allowlisted folders undefined.
- **Step payload limits** — `input`/`output` size, binary, truncation, redaction.
- **Settings** — header control with no destination or contents.
- **Handoff** — “from anywhere” is product-wide; console doesn’t define how attached context appears.
- **Responsive** — 40/60 + bottom tabs is desktop-only; no phone composition.
- **Mockup** — “matches mockup” with no link/tokens; identity is unspecified.
- **Open questions that block UI** — same machine vs remote (file access, latency); one vs many agents.

---

### Unrealistic scope

One screen is asked to be: live ops header, agent chat, step inspector, memory editor, tool admin, raw logs, task queue, approval surface, plus product-wide handoff and Kanban agency. Acceptance criteria only cover mock status/stream/queue/memory, approval pause, and Stop — far thinner than Behaviors. Either cut to “supervise current run” or treat Memory/Skills/Logs/Queue as separate surfaces.

---

### Security / privacy risks

| Risk | Why it matters |
| --- | --- |
| Unauthenticated bridge | Anyone who can hit the daemon can direct, resume, edit memory, approve |
| SSE `input`/`output` for shell/browser/file/api | Secrets, cookies, mail, paths in the clear on a live UI |
| Raw **Logs** tab | Same leak, persistent |
| **Autonomous = log only** | High blast radius with weak gate; audit not specified |
| Memory GET/PUT of “key facts” | Personal data; no retention, encryption, or pin ACL |
| Skills toggles (network/mail) | Capability escalation without tying to autonomy level |
| Approval auto-deny @ 30m | Partial side effects already done; no rollback story |
| Browser step type | DOM/screenshots of personal sessions |
| Cross-machine Hermes (open Q) | Remote file/tool reach beyond JunOS’s machine model |

This doc needs a hard rule: **what never leaves Hermes into the UI** (redact, summarize, or gate behind explicit reveal).

---

### UI / design quality (hierarchy, density, type, motion, a11y)

App-screen lens: colour on meaning, flat surfaces, one job first, quiet chrome — not a pulsing ops dashboard.

1. **No single job** — Chat, timeline, and four bottom tabs compete. First viewport should answer: *what is Hermes doing, and can I stop it?* Everything else is secondary.
2. **Kill-switch hierarchy** — Stop equal to Pause/Settings. Stop should be the dominant control; Pause quieter; Settings in overflow.
3. **Density / layout** — Header + 40/60 + bottom tab strip is three vertical bands. Timeline (primary for supervision) loses height to Memory/Skills/Logs/Queue. Taste: put those in a drawer/sheet or separate routes; don’t tax the live canvas.
4. **“Cards” + icons + shimmer** — Classic generated-ops tell. Prefer a flat timeline (type, summary, duration, tone step); expand inline. No resting shadows; no decorative shimmer.
5. **Motion** — Pulsing status pill + running shimmer without `prefers-reduced-motion`, without semantic meaning beyond “busy.” Use a single restrained working indicator (e.g. status text + one data-hue mark on the active step).
6. **Status colour-only** — Five states via pill; need label + shape/pattern, not hue alone (contrast + colour-blind).
7. **Typography unspecified** — Header metadata (model, uptime) will fight directives and step summaries. App-screens: small header type (~16–24px max), running text full ink ≥16px; monospace only inside real I/O blocks.
8. **Memory as editable chips** — Chip clusters are fiddly for “key facts”; diffs-to-pin want a list/diff panel, not candy pills.
9. **Approval banner** — Undesigned intrusion into the split; high-stakes moment needs a clear blocked-step treatment on the timeline + one Approve/Deny, not a second Inbox metaphor undefined here.
10. **Legibility of I/O** — Expandable dumps need clamp, “reveal sensitive,” and scroll containment or the right pane becomes unreadable noise.
11. **Identity** — Could be any agent console after removing “Hermes.” No product-specific signature element (e.g. directive → step chain as the face of supervision).
12. **Empty/error copy** — None; app-screens want trade words (“Waiting on approval”, “Hermes offline”, “Queue empty”) not generic Status/Items.

---

### Highest-leverage doc fixes (if you revise later)

1. Narrow Screen to: status + Stop, active directive, live steps, inline approval on the blocked step.  
2. Specify redaction + auth on the bridge before UI acceptance.  
3. Resolve Pause/Stop/Resume and memory draft-vs-pin in one paragraph each.  
4. Replace pulse/shimmer/cards with flat timeline + reduced-motion rules.  
5. Demote Memory/Skills/Logs/Queue out of the permanent bottom strip.

I’m in Ask mode, so I can’t edit the doc; switch to Agent if you want a tightened rewrite of this section.
