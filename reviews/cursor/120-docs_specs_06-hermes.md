**Verdict:** `06-hermes.md` is a thin supervision brief that already assumes a full mission-control UI. As an **Operate** surface it has the right kill-switch instinct, but the Screen/Behaviors stack is denser than the Acceptance criteria can carry, and several control/state contracts contradict each other.

Mode: Operate (agent console). Lens: impeccable Operate/critique + tasteskill app-screens (no rendered mock to inspect; this is a spec-only review).

---

### Contradictions

1. **Pause vs Stop collapse to the same state.** Header has Pause/Stop; Stop “cancels the current step and drops queue to paused.” Pause is undefined. Operator cannot tell whether queue is recoverable, drained, or only the current step aborted.

2. **Memory hygiene is both policy and optional.** “Memory writes … are proposed as a diff … until Jonas pins” then “(optional setting).” Pin-required vs auto-write are different products; the bridge `PUT /hermes/memory` does not encode either mode.

3. **Singular console vs many agents.** Screen copy is one Hermes (name, status, model). Open questions admit “several named agents” and cite `agent` table. No switcher, routing, or which agent owns Approvals/Queue.

4. **Left pane is two jobs in one clause.** “directive stream, a chat with Hermes (`kind=agent`).” Unclear whether directives *are* the chat, sit above it, or are a separate feed. Shared chat vs bridge `POST /hermes/directives` ownership is unresolved.

5. **Autonomy vs stream vocabulary.** Balanced gates “shell/network/mail”; stream `type` is `shell|browser|file|api|message` — no `mail`/`network`. Approvals cannot be typed from the wire format as written.

6. **Approvals live in three places with one API.** Inbox + console banner + `POST /hermes/approvals/:id`. No rule for which surface is source of truth, or what happens if Inbox resolves while the console banner is open (and vice versa).

7. **Autonomous = “log only” vs expandable I/O.** Timeline still shows expandable `input`/`output`. Logging vs live disclosure of secrets is not the same policy.

---

### Gaps (spec holes that will break build)

- **No states:** offline/error Hermes, empty timeline, empty queue, failed SSE reconnect, approval countdown UI, Stop-in-progress, Settings contents.
- **No layout contract below desktop:** 40/60 + bottom tabs has no collapse order for ≤1100px / phone (app-screens require a phone composition).
- **Allowlists undefined:** Balanced “writes in allowlisted folders free” — where configured, per project?, what happens on deny.
- **Bridge incompleteness:** no auth, versioning, pagination, redaction, retention, backpressure, or how CLI stdout maps to step `type`/`status`.
- **Timeout:** 30 min auto-deny — no visible deadline, no extension, no audit of who/what was denied.
- **“Matches mockup”** with no linked artifact; Screen prose is the only design truth.
- **Handoff:** “Give to Hermes” attaches “context” with no attachment inventory, size limits, or preview before send.
- **Priority** on directives is unused in UI/behaviors.

---

### Unrealistic scope

Acceptance is mock-only: status, live stream, queue, memory edit, one approval path, Stop “within a few seconds.”

Behaviors imply far more: three autonomy modes, Inbox+banner approvals, Kanban create/move/pickup, memory diffs+pins, skills toggles, raw logs, queue, global handoff, Settings, and an unknown Hermes runtime wrapped into a rich HTTP+SSE API.

That is a Phase-3+ product surface with Phase-1 acceptance. Wire-format-first is sound; shipping the full Screen before the open questions (same machine? one vs many? memory location?) is not.

---

### Security / privacy risks

| Risk | Why it matters |
| --- | --- |
| Expandable step `input`/`output` for shell/browser/file/api | Tokens, paths, mail, cookies, and diffs land in UI and likely DB/logs |
| **Logs** tab “raw” | Unscoped dump; no redaction, retention, or export rules |
| Memory `GET`/`PUT` as editable chips | Free-form agent memory with no sensitivity class or pin ACL |
| Unauthenticated bridge sketch | If Hermes is remote/Docker, the console becomes a remote control plane |
| Approvals timeout default 30 min | Long window for a pending privileged action; auto-deny is good, silence is not |
| Autonomous + full timeline | “Log only” still exposes live I/O to anyone with console access |
| Browser steps | Continuous surveillance of browsing unless summarized/redacted |
| Global “Give to Hermes” | Easy to attach private files/chat without a disclosure preview |
| Same-machine open question | File access and latency are also trust boundary questions |

Supervision without a default-deny + redaction story fights the kill-switch framing.

---

### UI / design quality (hierarchy, spacing, type, density, motion, legibility, contrast)

App-screen question this doc never answers: *what is the one job of the first screen?* As written it is chat + live ops + inspect drawers at once.

**Hierarchy / density**
- Header packs identity, status, model, uptime, Pause, Stop, Settings — well past ~4 visible decisions.
- 40% chat + 60% card timeline + four bottom tabs (Memory / Skills / Logs / Queue) is three competing attention systems. App-screens: every named block should show on the first screen *or* be cut; here the tabs bury Memory/approvals-adjacent work while Approvals also interrupt via banner.
- Activity as **cards** (icon + summary + duration + expandable I/O) is the generated ops-console default. Study preference: flat rows/feeds, tone step or 1px rule, not a card tray per step; durations need tabular figures and one right edge.

**Chrome vs data**
- “Status pill (pulsing when working)” puts colour and motion on chrome. App rule: colour on data that needs a decision; status as pale pill + ink label (or a 6px dot), not a saturated blob. Pulsing fails reduced-motion and competes with the running step.
- “Running step shimmers” is continuous decorative motion. App screens: **no entrance motion**; motion is feedback (row arrive, press, sheet). Prefer a calm “running” mark + duration tick, with `prefers-reduced-motion` that keeps meaning without travel/shimmer.

**Typography / spacing / contrast**
- Spec names no type scale, row pitch, or contrast. For a monitoring feed this should be explicit dense mode (e.g. ~13px body, ~28–42px rows) with full-ink summaries and muted meta — not unspecified “cards.”
- Expandable I/O implies monospace code blocks (allowed) but risks soft-grey secondary text on long dumps; house floor is **4.5:1** for any text tier, including placeholders and meta.
- Memory as **editable chips with pin** is a pill cluster on an Operate surface; better as a short editable list/diff with clear pin affordance (chip squeeze/overflow is a known failure mode).

**IA / emotional fit**
- Stop always visible is the strongest Operate choice in the doc — keep it primary; demote Settings; make Pause’s effect impossible to confuse with Stop.
- Approvals as banner + Inbox + waiting step is good discoverability, bad density: one blocking pattern (inline step gate + single global Inbox) is enough.
- Bottom tabs turn the console into Settings-with-a-timeline. Skills/Logs/Queue are secondary; they should not share equal chrome with the live job unless the screen’s question is “inspect,” not “supervise.”

**Product face**
- Nothing here is JunOS/Hermes-specific beyond the name: generic dual-pane agent console. App-screens want one signature element from the product’s world (e.g. autonomy level as the persistent control, or a single “current directive” hero line) — not pulsing chrome.

---

### Highest-leverage fixes (if you revise the doc)

1. Pick **one primary job** for v1 (e.g. “watch + approve + stop”) and cut or demote Memory/Skills/Logs/Queue.
2. Resolve **Pause ≠ Stop**, **one vs many agents**, and **memory pin required vs optional** in the contract, not as open questions after UI.
3. Replace pulsing/shimmer with **state marks + reduced-motion**; activity as a **flat feed**, not card stack.
4. Add **redaction/retention** for stream I/O and Logs; show handoff attachment preview.
5. Shrink Acceptance so it matches the Screen — or shrink the Screen to the Acceptance.

I did not run browser inspect (no live Hermes UI target in this review). Questions skipped: n/a for a doc-only pass.
