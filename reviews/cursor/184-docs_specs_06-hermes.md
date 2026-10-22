**Verdict:** Spec mode is right (Operate / supervision console), but the screen tries to be chat + live ops + memory editor + skill admin + queue + approval surface at once, and the bridge contract leaves auth, redaction, and Stop-vs-Pause unresolved. Usable as a skeleton; not shippable as written.

Lens: Impeccable **Operate**; tasteskill **app screens**. Doc-only (no mockup pixels, no PRODUCT/DESIGN.md).

---

### Contradictions

1. **Stop vs Pause** — Header has Pause/Stop; kill switch says Stop “cancels the current step and drops queue to **paused**.” Pause and Stop then land in the same state. Resume semantics for “stopped mid-step” vs “paused” are undefined.
2. **Memory write path** — Contract is `GET/PUT /hermes/memory` (direct edit). Behavior says Hermes writes are **diffs until pinned**. Unclear whether PUT is proposals, pinned facts, or both, and whether the agent can still read unpinned proposals.
3. **Approvals placement** — Approvals are Inbox items **and** a console banner, but the Screen section’s bottom tabs are Memory / Skills / Logs / Queue — **no Inbox**. Primary resolution surface is ambiguous.
4. **Left pane** — “directive stream, a chat” reads as two UIs in 40% width; if it’s one `kind=agent` chat, say so. If two, the split is underspecified.
5. **Queue vs Kanban** — Hermes picks up Ready/`hermes` cards **and** has a Queue tab “handed over from Tasks/Kanban.” Same work, two models, no sync rule (move card ↔ enqueue?).
6. **“Matches mockup”** — No linked mockup, sizes, or states; acceptance can’t be checked against a visual source of truth.

---

### Gaps (product / behavior)

- **Error / offline / reconnect:** `error` and SSE exist; no UI for reconnect, missed steps, or partial streams.
- **Empty / first-run:** Idle agent, empty memory, empty queue, no skills — not specified (app-screen §11 expects these).
- **Settings** in the header — never defined (autonomy? allowlists? timeout?).
- **Allowlisted folders** (Balanced) — where configured, per project vs global, how shown before a write.
- **Approval timeout** — “configurable, default 30 min, auto-deny” with no countdown, notification, or audit of silent denials.
- **Multi-agent** — Open question admits many agents; Screen is singular Hermes (switcher, routing, which memory/skills).
- **Handoff** — “Give to Hermes” from files/projects/chat/cards: what context is attached, truncated, or redacted.
- **Responsive / phone** — Fixed 40/60 + header + bottom tabs; no breakpoint or collapse plan.

---

### Unrealistic scope

One console owns: live SSE timeline with expandable I/O, agent chat, four secondary tabs (including editable memory diffs and skill toggles), Inbox/banner approvals, Kanban coupling, autonomy policy, and global handoff. For a first mock-backed slice, that’s several products.

Acceptance (“mock status, stream, queue, memory”) is smaller than Behaviors — good, but Behaviors will pull implementation toward the full surface unless sliced (e.g. Activity + approvals first; Memory/Skills later).

“Stop within a few seconds” via a CLI wrapper is optimistic if Hermes ignores signals; needs a hard kill path in the wrapper contract.

---

### Security / privacy

Highest risk area in this doc:

| Risk | Why |
| --- | --- |
| **Unauthenticated bridge** | Full control plane (`directives`, `pause`/`stop`, memory, skills, approvals) with no auth, bind address, or localhost-only rule. |
| **SSE `input`/`output`** | Shell/browser/api payloads in the timeline = secrets, tokens, mail, browsing content in UI and Logs. No redaction, retention, or “hide secrets” mode. |
| **Skills `PUT`** | Toggling tools remotely is privilege escalation if the bridge is reachable beyond the machine. |
| **Autonomous = “log only”** | Still allows outward actions without gates; logging ≠ containment. |
| **Memory as “key facts”** | Personal data editable in-chip; pin/diff helps integrity, not confidentiality. |
| **Browser / mail step types** | Credentialed browsing and outbound mail under Balanced/Autonomous need explicit policy, not only “ask.” |
| **Cross-project** | Optional `projectId` + global memory/skills → leakage between projects. |

Auto-deny is safer than auto-approve, but silent deny after 30 minutes without a durable audit trail is an operational and safety gap.

---

### UI / design quality (Operate + app-screen lens)

**Primary job unclear.** App screens need one first-screen question and one primary action. Here the jobs compete: *direct Hermes*, *watch the run*, *approve risk*, *edit memory*. Header packs name, status pill, model, uptime, Pause, Stop, Settings — chrome-heavy; colour/motion will land on chrome, not data (tasteskill: colour on data, ~3% coloured pixels).

**Layout / density.** 40% chat + 60% card timeline + bottom tab strip under both panes will crush vertical space on a laptop. Activity “cards with icon, summary, duration, expandable I/O” stacked live tends toward generated-ops-dashboard density (icon + card chrome + shimmer). Prefer a flat step list (tone step / 1px rule), expand one row at a time, monospace only for real I/O.

**Hierarchy / typography.** No type scale, measure, or h1. Operate wants a tight rem scale and one family; “Memory chips with pin” invites pill/chip clutter and weak scan hierarchy. Status as a **pulsing pill** fights quiet status treatment (dot + ink label; pulse optional and short).

**Motion.** Spec calls for **pulsing** status and **shimmering** running steps. Operate: 150–250ms state feedback, not continuous decoration. App screens: no motion floor — motion is press/hover/focus/open. Continuous pulse/shimmer hurts legibility and ignores `prefers-reduced-motion`.

**Approvals (high-stakes).** Banner + waiting step is right emotionally, but without countdown, scope of the action, and one clear Approve/Deny control, it’s an anxiety valley. Competing Inbox vs banner splits attention (Nielsen: visibility of system status / user control).

**Contrast / legibility.** Coloured status pills and shimmer overlays often fail contrast on secondary text (duration, model, uptime). Raw Logs help debugging; putting them as a peer tab to Memory trains people to live in noisy output.

**What works.** Supervise-don’t-reimplement; mock-first bridge; always-visible Stop; per-project autonomy; memory pin-before-commit — strong product instincts if the UI is scoped to *run + approve* first.

---

### Priority fixes (if you revise the doc)

1. One primary job for v1 (e.g. Activity + approvals); demote Memory/Skills/Logs/Queue.
2. Resolve Stop vs Pause, memory PUT vs pin-diff, Queue vs Kanban, Inbox vs banner.
3. Auth, bind, redaction, retention on stream/logs; tighten Autonomous.
4. Replace pulse/shimmer with short state motion; flat timeline, not card stack; define empty/error/reconnect and a real height plan for the split.

I can turn this into a tightened outline for `06-hermes.md` (still Ask mode: guidance only) if you want that next.
