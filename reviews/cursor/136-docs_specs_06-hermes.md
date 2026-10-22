**Verdict:** As an Operate surface (agent supervision), the contract and kill-switch intent are clear; the Screen section reads like a dense ops dashboard kit (pulse, shimmer, step cards, chips, four bottom tabs) without hierarchy, states, or privacy boundaries strong enough to build safely.

Mode for this surface: **Operate / app screen** (not marketing). Lens: Impeccable Operate + design-taste `app-screens` (colour on data not chrome; flat loading; one primary job; honest states).

---

### Contradictions (within this doc)

1. **Stop vs Pause** — Stop “cancels the current step and drops queue to paused,” but Pause/Resume also exist. Stop and Pause collapse into the same end state; Resume after Stop is undefined (resume cancelled work? drain queue?).
2. **Supervision vs Autonomous** — Intro: JunOS “gates risky actions.” Autonomy: **Autonomous = log only**. Those conflict unless Autonomous is explicitly “no gates,” which then weakens the console’s reason to exist for high-risk runs.
3. **Approvals: two UIs, one acceptance path** — Behaviors: Inbox **and** console banner. Acceptance: resolved **from the Inbox** only. Can the banner approve, or is it display-only?
4. **Directives vs chat** — Left: “directive stream, a chat with Hermes.” Contract only has `POST /directives`. Are chat messages directives, a parallel channel, or the same thread with different chrome?
5. **Memory: PUT vs propose-then-pin** — Contract: `GET/PUT /hermes/memory`. Behavior: Hermes writes are diffs until pin (optional). Who may PUT? Does pin call PUT, or is there a separate approve API?
6. **One console vs many agents** — Screen is singular (one status/model/uptime). Open questions admit many agents. No UI for picker, routing, or which agent owns the stream.
7. **Queue ownership** — `GET /hermes/queue` plus Kanban pickup of `hermes` Ready cards. Two queues without saying which is source of truth or how they stay in sync.
8. **Status enum vs Stop** — States are `online|idle|working|paused|error`. Stop lands on `paused`; no `stopped` / draining / disconnecting. `online` vs `idle` overlap is unexplained.

---

### Gaps

| Area | Missing |
|---|---|
| **State machine** | Transitions for pause/resume/stop/error/reconnect; what the stream does when paused; whether new directives enqueue or reject |
| **Bridge lifecycle** | Auth, versioning, SSE reconnect/backfill, mock vs real swap, “Hermes offline” vs daemon offline |
| **UI states** | Empty (never run), loading (first connect), error, stale stream, approval waiting, auto-deny aftermath — acceptance only covers happy mock path |
| **Settings** | Header lists Settings; contents (autonomy, allowlists, timeout, memory-pin default) undefined |
| **Allowlists** | Balanced needs “allowlisted folders”; no editor, storage, or per-project UX |
| **Approval payload** | What the banner/Inbox shows (step summary, redacted I/O, risk class); timeout UX; “Approve and remember” not in this doc |
| **Step I/O presentation** | Truncation, secret redaction, binary/browser dumps, max expand size |
| **Keyboard / a11y** | No shortcuts; pulsing/shimmer with no `prefers-reduced-motion`; status by colour+pulse alone |
| **Responsive** | 40/60 + bottom tabs unaddressed under ~900px |
| **Acceptance** | No AC for Skills, Logs, autonomy levels, handoff, memory diffs, Pause, or multi-agent |
| **“Matches mockup”** | No path/link; unverifiable |

---

### Unrealistic scope

Shipping **chat + live SSE timeline + four bottom panels + approvals + Kanban handoff + memory diff editor + skills toggles + global “Give to Hermes”** while the run mode of Hermes is still an open question is a large Phase-2 surface for a thin bridge.

Especially heavy without a settled process model: translating CLI stdout into typed steps with expandable `input`/`output`, live shimmer, and Inbox-coupled approvals. Mock-first is right; the Screen still specifies production chrome before the wire is known.

Per-project autonomy + folder allowlists + optional memory pinning is a **policy product** inside one console page — easy to underspec and overbuild.

---

### Security / privacy risks

1. **SSE `input` / `output` and Logs “raw”** — Shell, browser, file, and API payloads in the UI/logs are a secret and PII sink (tokens, cookies, mail, paths). No redaction, retention, or “don’t persist raw” rule.
2. **Unauthenticated-looking `/hermes/*`** — No auth, binding to localhost, or bridge token in this doc (security spec may cover it elsewhere; this contract still looks like a local RCE remote if exposed).
3. **Autonomous + tools** — Log-only with Skills toggles is “full agency with a journal.” Enabling a skill has no confirm / blast-radius copy.
4. **Balanced writes** — Free writes in allowlisted folders without defining the list = silent over-broad FS access.
5. **Auto-deny at 30 min** — Fail-closed is good; no note on partial side effects already executed before the gated step.
6. **Memory** — Key facts via GET/PUT; optional pin means Hermes can persist lasting personal context unless the setting is on by default (default not stated).
7. **Remote Hermes** — Open question on same machine; if not, streaming file/shell I/O off-box is a privacy decision this doc never makes.
8. **Stop “within a few seconds”** — No forced kill / orphan-process behavior if the child ignores cancel.

---

### UI / design quality (skills lens)

This is a **monitoring + control** screen. App-screen rules want: one question answered first, colour/motion on **meaning**, flat loading, quiet chrome, honest empty/error. The Screen section fights that.

**Hierarchy / IA**  
Three simultaneous primary regions (directive chat, activity cards, bottom Memory/Skills/Logs/Queue) plus a packed header (name, status pill, model, uptime, Pause, Stop, Settings). No “when working, timeline dominates; when idle, compose dominates.” The job of the screen (“supervise this run”) is not one click clearer than “edit memory chips.”

**Density**  
Ops density can be correct, but stacking a chat column, a card timeline, and a fourth tab strip guarantees competing scan paths. Logs vs Activity duplicate the same stream at two densities. Queue vs Kanban (implied) duplicates work intake.

**Motion (Impeccable Operate + app-screens loading)**  
- Status pill **pulsing** while working → motion on chrome; fine only if tied to a text state and disabled under `prefers-reduced-motion`.  
- Running step **shimmers** → app-screens house rule: loading uses flat skeleton bars, **no shimmer gradient**. Spec encodes a banned tell.  
Operate also: 150–250 ms state motion; no decorative choreography. Continuous pulse/shimmer is the opposite.

**Components / tells**  
“Steps as **cards** with **icon**, summary, duration, expandable I/O” risks the generated-ops pattern: icon rail + card stack for every row. App-screens allow a tight **feed as rows**; prefer row pitch + type over icon-in-card chrome.  
**Editable chips** for memory: small targets, weak hierarchy for long facts; diffs belong in a list/diff view, not chip soup.  
**Status pill** is acceptable as a semantic pill if contrast and text are real; don’t rely on pulse colour alone (UI system elsewhere asks for text/icon with status — this doc doesn’t).

**Typography / legibility**  
No type scale, measure, or mono rules for Logs/I/O. Expandable shell dumps will blow scanability unless truncated with “show more” and tabular meta (`ms`, status) separated from walls of mono.

**Spacing / layout**  
Fixed 40/60 with bottom tabs has no grid/gutter, no rule for approval banner eating vertical space, no empty-frame behavior. First viewport likely: header chrome + split panes + tab chrome before a usable step list — the thin-first-screen failure mode from app-screens testing.

**Contrast**  
Doc doesn’t specify tokens. Pulsing/shimmer on glass-like panels (if the product mockup is translucent) is a contrast and reduced-motion hazard; this file still mandates those effects without fallbacks.

**Emotional / high-stakes UX**  
Kill switch always visible is a strength. Approval wait + auto-deny is high-stakes but underspecified (countdown? consequences?). Autonomous mode with no extra friction is an emotional valley with no reassurance pattern.

**What’s solid**  
Supervise-don’t-reimplement; mockable wire format; Stop always visible; approvals fail closed on timeout; memory hygiene as opt-in pin; handoff as a single verb.

---

### Priority fixes if this spec is revised

1. One state diagram: pause / stop / resume / error / offline; separate Stop from Pause.  
2. Redaction + retention for step I/O and Logs; default memory-pin on.  
3. Replace shimmer/pulse with flat “running” row treatment + text status; note reduced motion.  
4. Collapse IA: primary = activity + compose; Memory/Skills/Logs as secondary (drawer or settings), not four equal tabs.  
5. Single approval resolve path (banner = Inbox deep link, or banner can decide).  
6. Narrow acceptance to mock status/stream/stop/approval; defer Skills/memory-diff polish.

I’m in Ask mode, so this is review only. If you want the doc patched to match, switch to Agent mode.
