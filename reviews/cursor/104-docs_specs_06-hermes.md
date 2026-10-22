⚠️ Spec-only review (no rendered UI / detector). Mode: **Operate** / app screen. Lens: impeccable Operate + design-taste `app-screens`.

## Verdict

The supervision idea is clear; the Screen section sketches a high-chrome ops dashboard that fights both skills. As written, one viewport is asked to be chat, live inspector, memory editor, tool admin, logs, and queue — with pulse/shimmer/cards and no trust boundary on the bridge. Craft and security are under-specified relative to Behaviors.

---

## Contradictions (inside this doc only)

1. **Pause vs Stop vs Resume**  
   Bridge has `pause | resume | stop`. Header shows Pause/Stop/Settings — no Resume. Stop “drops queue to paused,” so Pause and Stop both end at `paused` with no stated difference (freeze vs cancel-current-then-pause).

2. **Approvals in places the Screen doesn’t own**  
   Behaviors: approvals are Inbox items *and* a console banner. Screen: no Inbox, no banner slot, no blocked-step treatment on the timeline. Approval API exists; layout doesn’t.

3. **Memory: direct PUT vs propose-then-pin**  
   Bridge: `GET/PUT /hermes/memory` (list/edit). Behavior: Hermes writes are “proposed as a diff … until Jonas pins” (optional). Unclear whether PUT is draft, pin, or both — chips vs diffs are two UIs.

4. **Left pane: stream vs chat**  
   “directive stream, a chat … `kind=agent`.” A directive feed and a conversational thread are different IA. Which is primary for handoff (“Give to Hermes”)?

5. **One Hermes vs many**  
   Open questions allow several named agents (`agent` table). Header/Screen assume one name, model, uptime.

6. **“Supervise” vs own the loop**  
   Intro: JunOS does not re-implement the agent loop. Same doc: Kanban create/move/pickup, Skills toggles, Memory edit, Queue, Approvals, Pause/Stop. That is an orchestration console, not a thin viewer.

---

## Gaps

| Area | Missing |
| --- | --- |
| **Bridge trust** | No auth, bind address, local-only, or origin rule on `/hermes/*` |
| **States** | Empty / offline / reconnect / first-run; `error` in enum with no console treatment |
| **Autonomy UI** | Levels per project, but nowhere on this screen; allowlisted folders undefined |
| **Step payloads** | Size limits, truncation, binary, redaction for `input`/`output` |
| **Settings** | Header control with no destination or contents |
| **Handoff** | Product-wide button; console never shows how attached context appears in a directive |
| **Approval timeout** | 30 min auto-deny — no countdown, partial-side-effect, or rollback UX |
| **Responsive** | Fixed 40/60 + bottom tabs; no phone “one region at a time” composition |
| **Mockup / tokens** | “Matches mockup” with no link, type scale, or colour roles |
| **SSE life cycle** | Reconnect, backpressure, step ordering when offline |

Acceptance only covers mock status/stream/queue/memory, approval pause, and Stop — thinner than Behaviors.

---

## Unrealistic scope

One Screen is: live ops header, agent chat, step inspector, memory editor, skills admin, raw logs, task queue, approval surface — plus product-wide handoff and Kanban agency. App-screens: the frequent job should be one click from the first screen; everything else is secondary or another route.

Cut target for a shippable Operate brief: **what is Hermes doing, and can I stop / approve it?** Memory / Skills / Logs / Queue belong in a drawer, sheet, or separate surfaces — not a permanent bottom tax on the live canvas.

---

## Security / privacy

| Risk | Why it matters |
| --- | --- |
| Unauthenticated bridge | Anyone who can reach the daemon can direct, resume, edit memory, approve |
| SSE `input`/`output` (shell/browser/file/api) | Secrets, cookies, mail, paths live in the UI stream |
| Raw **Logs** tab | Same leak, persistent and searchable |
| **Autonomous = log only** | High blast radius; audit/retention unspecified |
| Memory GET/PUT of “key facts” | Personal data; no retention, encryption, or pin ACL |
| Skills toggles (network/mail) | Capability escalation not tied to autonomy level |
| Approval auto-deny @ 30m | Side effects may already have run; no rollback |
| Browser step type | Personal session DOM / screenshots implied |
| Cross-machine Hermes (open Q) | Remote file/tool reach beyond a single-machine model |

Hard rule the doc needs: **what never leaves Hermes into the UI** (redact by default, summarize, or explicit “reveal sensitive”).

---

## UI / design quality

App-screen lens: colour on meaning (~3% coloured pixels), flat surfaces, quiet chrome, one job first, honest states — not a pulsing ops dashboard. Impeccable Operate: motion = state feedback (150–250ms), not decoration; Stop must outrank Settings.

1. **No single job** — Chat, timeline, and four bottom tabs compete. First viewport should answer: *what is Hermes doing, and can I stop it?*

2. **Kill-switch hierarchy** — Stop is peer to Pause/Settings. Stop should dominate; Pause quieter; Settings in overflow. Destructive last and labelled with consequence (app-screens settings / Operate).

3. **Density / layout** — Header + 40/60 + bottom tab strip = three vertical bands. Timeline (the supervision job) loses height to Memory/Skills/Logs/Queue. Prefer demoting those off the permanent strip.

4. **“Cards” + icons + shimmer** — Generated-ops tell. App-screens loading: flat grey bars at real size, **no shimmer gradient**. Prefer a flat timeline row (type, summary, duration, tone step); expand I/O inline. No resting shadows.

5. **Motion** — Pulsing status pill + running shimmer, no `prefers-reduced-motion`. App screens have **no motion floor**; pulse/shimmer is costume. One restrained working mark (status label + one data-hue on the active step) is enough.

6. **Status colour-only** — Five states via pill. Need text label + shape/pattern, not hue alone (contrast + colour-blind). Status pills: pale tint + dark same-hue text; saturated fill only for the rare call-to-action.

7. **Typography unspecified** — Model/uptime will fight directives and step summaries. App scale: title ~18–24px, body/meta 12–14px, full ink ≥14px for running text; monospace only inside real I/O / IDs.

8. **Memory as editable chips** — Chip clusters are weak for “key facts”; propose-then-pin wants a list/diff panel, not candy pills. Chips are for row status, not primary editing.

9. **Approval as undesigned banner** — High-stakes moment needs a blocked step on the timeline + one Approve/Deny (and timeout), not a second Inbox metaphor undefined here. Prefer inline over modal-first (Operate).

10. **I/O legibility** — Expandable dumps need clamp, scroll containment, and “reveal sensitive,” or the right pane becomes noise.

11. **Identity** — After removing “Hermes,” this could be any agent console. No product-specific signature (e.g. directive → step chain as the face of supervision).

12. **Empty / error copy** — None. App-screens want trade words (“Waiting on approval”, “Hermes offline”, “Queue empty”), frame kept, Retry inside the failed block — not a full-screen banner.

13. **Contrast / a11y** — No focus, live-region for SSE, keyboard path for Pause/Stop/Approve, or reduced-motion. Status/shimmer as the only “working” cue fails craft-floor contrast and motion rules.

---

## Highest-leverage doc fixes

1. Narrow Screen to: status + Stop, active directive, live steps, inline approval on the blocked step.  
2. Spec redaction + auth on the bridge before UI acceptance.  
3. Resolve Pause/Stop/Resume and memory draft-vs-pin in one paragraph each.  
4. Replace pulse/shimmer/cards with flat timeline + reduced-motion.  
5. Demote Memory/Skills/Logs/Queue out of the permanent bottom strip.

I’m in Ask mode, so I can’t edit the doc or write `reviews/cursor/104-…`; switch to Agent if you want that file filled or a tightened rewrite of the Screen section.
