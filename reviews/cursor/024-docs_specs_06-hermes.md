**Verdict:** As an Operate-surface brief, `06-hermes.md` correctly aims at supervise-don’t-reimplement, but the specified console is an overcrowded ops dashboard with decorative motion, dual approval paths, and a bridge contract that under-specifies auth and data exposure. Scope for acceptance is mock-thin while the Screen/Behaviors sections describe a full agent control plane.

Mode: **Operate** (agent console). Design-taste: **app screen**. No live UI or PRODUCT/DESIGN.md — this is a spec critique of the described surface only.

---

### Contradictions

1. **Left column is two products.** “Directive stream” and “a chat with Hermes (`kind=agent`)” are listed as one 40% pane. Directives are also created from “Give to Hermes” elsewhere. Unclear whether the left side is chat, a directive queue, or both stacked.
2. **Memory write model fights itself.** Bridge: `GET/PUT /hermes/memory` (direct edit). Behavior: Hermes writes are “proposed as a diff … until Jonas pins them (**optional** setting).” Acceptance: “memory edit.” Default path (optional off) vs hygiene-on vs PUT-from-UI is unresolved.
3. **Pause vs Stop vs status.** Header has Pause/Stop; kill switch only defines Stop → “paused”; API has pause/resume/stop; status enum is `online|idle|working|paused|error`. `online` vs `idle`, and whether Pause and Stop land on the same state, are undefined.
4. **Approvals live in two places.** “Inbox items **and** a banner”; resolution “from the Inbox” in acceptance. No rule for which is authoritative, or what the banner does after Inbox resolve / auto-deny.
5. **Autonomy vs memory hygiene.** Autonomous is “log only”; memory hygiene is optional. Does Autonomous still propose memory diffs, or write straight through?
6. **“Matches mockup”** with no mockup linked — layout claims are uncheckable.

---

### Gaps (product / contract)

- No auth, tenancy, or localhost-only binding on `/hermes/*`.
- Approval body is `{decision}` only — no reason, expiry, or who approved.
- SSE fields `input`/`output` unbounded — no truncation, redaction, or “sensitive” flag for UI.
- No disconnect / reconnect / stale-stream behavior.
- Autonomy level is “per project” but has no UI home (header? Settings? project chrome?).
- Settings target undefined; Resume not in the header story.
- Multi-agent (`agent` table) vs single-console header (“name, status…”) unresolved (called out as open, but Screen assumes one).
- Empty / offline / error compositions absent (Hermes down, empty queue, empty memory, stream lag).
- Phone / narrow layout absent for an always-visible kill switch.
- Logs “raw” — source, retention, and relation to the step stream unspecified.

---

### Unrealistic scope

Acceptance needs mock status, stream, queue, memory. The same doc also commits to: live step cards with expandable I/O, four bottom tabs (Memory / Skills / Logs / Queue), Inbox + banner approvals, three autonomy modes + allowlists, Kanban pickup (`hermes` label), CLI→schema wrapper, and “Give to Hermes” on files/projects/chat/cards. That is a control-plane epic framed as one console screen. Highest leverage cut for v1: **live status + step feed + Stop + one approval surface**; defer Skills/Logs/Memory chips/Kanban pickup.

---

### Security / privacy

| Risk | Why the doc creates it |
| --- | --- |
| **Live secret exfiltration via UI** | Stream types include `shell\|browser\|file\|api` with `input`/`output` expandable — credentials, tokens, file bodies, and page content will show up unless redacted at the bridge. |
| **Unauthenticated local API** | Contract is bare HTTP/SSE; whoever can reach the daemon can directive, stop, edit memory, toggle skills, approve. |
| **Autonomous + allowlist underspec** | “Writes in allowlisted folders free” / “log only” with no allowlist ownership, path canonicalization, or network/mail tool boundaries. |
| **Memory as soft ACL** | Key facts editable; hygiene optional → silent persistence of sensitive facts. |
| **Context overshare** | “Give to Hermes” attaches context from chat/files/cards — no attach preview, strip, or deny list. |
| **Browser steps** | Type `browser` implies capture of third-party content into the timeline/logs. |
| **30‑min auto-deny** | Safer than auto-allow, but silent timeout without a durable audit row in acceptance is a trust gap. |
| **Same-machine open question** | File access and blast radius hinge on it; UI/contract don’t branch on local vs remote Hermes. |

---

### UI / design quality (impeccable Operate + design-taste app-screens)

**One job of the first screen** should be: *what is Hermes doing, can I approve/deny, can I stop?* The spec instead packs header chrome + chat/directives + card timeline + four bottom tabs. App-screens: every named block should show on the first desktop view; the primary job one click away. Approvals split across banner + Inbox fails that.

**Generated-ops tells (flag hard):**

- **Status pill that pulses** + **running step shimmer** — motion as decoration. Operate: 150–250 ms state feedback, no choreography; app screens: no motion floor, motion = press/hover/focus/open. Continuous pulse/shimmer also fights `prefers-reduced-motion` and **hurts legibility of the row you most need to read**.
- **“Steps as cards” with icons** — tray-around-every-item. Prefer a dense activity **list/feed** (summary + duration + expand), not a card stack. Colour on status/data, not chrome.
- **Editable memory chips + pin** — chip walls scan poorly; pin is a second status mark on the same object (app-screens: one status mark per row). Better as a short key/value list with pending-diff state.
- **Four bottom tabs** under a 40/60 split — third horizontal band, four secondary jobs competing with the live feed. Skills toggles (high blast radius) beside Logs is a dangerous adjacency.
- **Header density** — name, status, model, uptime, Pause, Stop, Settings. Uptime is vanity meta for this job; Pause/Stop/Settings need clearer primary/destructive hierarchy (Stop should dominate visually; Settings recede).
- **Approval banner + timeline + chat** — three attention channels; peak-end rule fails when the high-stakes moment (approve shell/network) is a generic banner rather than an inline gate on the waiting step.
- **Product face missing** — composition could be any agent IDE. No Hermes/JunOS-specific signature element (e.g. current directive as the hero line, allowlist/autonomy as the one “product” control).
- **Typography / contrast unspecified** — Operate wants one grotesk, tight rem scale, ~12/14/16/24; app title ≤ ~24–32px. Without tokens, implementers will invent display headers and soft-grey body (reads unfinished; contrast risk on pills/meta).
- **Expandable I/O** — correct place for monospace; unspecified max height, wrap, and contrast means either clipped secrets or a wall of low-contrast log soup. Logs tab “raw” amplifies density without a reading measure.
- **Responsive** — kill switch “always visible” is incompatible with an unspecified phone layout; Stop must not fall under a bottom-tab fold.

**Hierarchy sketch the skills would prefer:** one quiet shell; current task as the page title; step feed as the canvas (not cards); Approve/Deny inline on the blocked step; Stop as the one filled destructive control; Memory/Skills/Queue as separate routes or a single secondary panel — not four tabs under the live scene.

---

### Priority fixes for the doc (not implementation)

1. **Define the single primary job and cut the first-screen chrome** (feed + inline approval + Stop).
2. **One approval surface; one memory-write model; Pause/Stop/status state machine.**
3. **Bridge: auth, redaction, size limits; UI: no pulse/shimmer — static state + short transitions.**
4. **Split Skills/Memory out of the live console** or demote to Settings; keep autonomy/allowlist visible and explicit.
5. **Shrink acceptance to the supervise loop**; mark Kanban handoff, chip memory, and Logs as follow-ons.

I can turn this into a rewrite outline for `06-hermes.md` (still Ask mode — outline only) if you want that next.
