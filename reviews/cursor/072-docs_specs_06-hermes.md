**Verdict:** As an Operate-mode agent console brief, the *job* is clear (supervise Hermes: direct, watch, approve, stop). The Screen/Behaviors slice is thin on craft and dense on risk: it sketches a template ops dashboard (status pill, step cards, shimmer) while the bridge streams full tool I/O with almost no security contract.

Mode: **Operate** (app screen). Lens: impeccable Operate restraint + tasteskill app-screen house rules. No live UI / detector — findings are from the doc alone.

---

### Contradictions

1. **Stop vs Pause vs `paused`**  
   Header has Pause/Stop; kill switch says Stop “cancels the current step and drops queue to **paused**.” Then Pause and Stop both land in the same state, or Pause is undefined. Status enum is `online|idle|working|paused|error` — no `stopped`, and `online` vs `idle` overlap.

2. **“Gates risky actions” vs Autonomous**  
   Intro: JunOS gates risky actions. Behaviors: Autonomous = “log only.” That is ungated autonomy unless “log only” still means something else (it doesn’t say).

3. **Approvals: two UIs, one acceptance path**  
   Behaviors: Inbox **and** console banner. Acceptance: resolved from the Inbox only. Banner role (inform vs decide) is unresolved; dual entry points invite divergent decisions.

4. **Left pane is two things**  
   “directive stream” and “a chat with Hermes (`kind=agent`)” are not the same IA. Directives API is `POST {text,…}`; chat implies a thread. Which is the source of truth?

5. **Memory: pin required vs optional**  
   “Proposed as a diff … until Jonas pins” vs “(optional setting)” vs acceptance “memory edit.” Unclear whether PUT `/hermes/memory` can bypass the pin gate.

6. **Singular console vs many agents**  
   Screen is one Hermes; open questions admit many named agents and the data model already allows it. Layout/header don’t scale to that.

---

### Gaps (spec can’t ship from this alone)

| Area | Missing |
|---|---|
| **Bridge** | Auth, binding (localhost?), error shapes, SSE reconnect/backfill, approval `{decision}` schema, who creates approval ids |
| **Policy** | Allowlisted folders for Balanced; what counts as outward/destructive; per-project level UI; conflict when directive spans projects |
| **States** | Idle / empty queue / empty memory / Hermes `error` / disconnect / approval timeout (auto-deny) UX |
| **Craft** | Type scale, density tier, contrast, focus, `prefers-reduced-motion`, phone fold (40/60 + bottom tabs won’t survive) |
| **Referenced but undefined here** | “matches mockup,” shared chat `kind=agent`, “see 09” for Kanban — this screen’s content model depends on them |
| **Ops** | Concurrent directives; Pause semantics; Settings contents; Logs retention/redaction |

Acceptance is wisely mock-scoped; Behaviors are production-policy. That mismatch is a planning gap.

---

### Unrealistic scope (for one short spec)

Packed into ~40 lines: full REST+SSE bridge, unknown CLI wrap, three autonomy modes, Inbox+banner approvals, Kanban create/pickup, memory diffs, skills toggles, raw logs, cross-app “Give to Hermes,” plus a multi-pane live console.

Reasonable MVP cut (aligned with acceptance): mock status + step stream + one approval path + Stop + memory list/edit. Defer Autonomous, Kanban pickup, skills, raw Logs, and “from anywhere” handoffs — or own them in separate specs with contracts.

Open questions (how Hermes runs, co-location, one vs many) are load-bearing; UI and file-access assumptions can’t be finalized until answered.

---

### Security / privacy risks

Highest severity for a personal agent console:

1. **SSE `{input, output}` for `shell|browser|file|api`** — secrets, tokens, mail, file contents land in the UI and likely Logs. No redaction, truncation, or “sensitive step” treatment.
2. **No auth on the bridge** — any local (or misbound) client can directive, toggle skills, edit memory, approve.
3. **Autonomous = log only** — destructive/network/mail without a gate; contradicts the product’s supervision claim.
4. **Raw Logs tab** — unrestricted exfil surface next to the live timeline.
5. **Memory GET/PUT** — durable personal facts; pin hygiene is optional; no mention of export, deletion, or sync to Nous Portal.
6. **Skills toggles** — enabling browser/shell/mail from UI without confirmation or capability scope.
7. **30 min auto-deny** — good fail-closed default; no alert/audit requirement stated in this doc.
8. **Same-machine open question** — remote Hermes + file steps implies path/ACL and data-in-transit issues not addressed.
9. **Handoff attaches “context”** — undefined payload (full file? thread? secrets in chat?).

---

### UI / design quality (hierarchy, density, motion, legibility)

Screen as written reads as a **generated ops dashboard**, not a Hermes-specific Operate surface.

**Hierarchy / composition**
- Four competing regions (header chrome, chat, step cards, four bottom tabs) with no primary question (“what is Hermes doing *right now*, and what do I need to do?”). App-screen rule: the frequent job is one click from the first screen — here Approve and Stop compete with Settings, tabs, and stream noise.
- 40/60 is a split ratio, not a layout system (no shared edges, title treatment, or “one element only this product has”).
- Bottom tabs under a live dual pane: classic density trap; Memory/Skills/Logs/Queue will fight the timeline for attention during a run.

**Template / house-rule collisions (tasteskill app-screens)**
- **Status pill + pulse** — colour/motion on chrome; pulsing is decoration, not feedback. App screens: motion = press/hover/focus/sheet; no motion floor; avoid KPI/status jewelry.
- **Step “cards” + icon + expandable I/O** — peer card stack with icons is an explicit tell; prefer a dense **feed/table of steps** (type · summary · duration · status), expand in place or a detail pane.
- **“Running step shimmers”** — directly against loading rules: final layout, flat grey placeholders, **no shimmer gradient**, no layout shift.
- **Approval “banner”** — errors/notices belong in the failing block, not a full-width chrome shout; a sticky step row or Inbox-linked decision panel fits Operate better.
- **Editable memory “chips” with pin** — chip clouds get noisy; key facts want a scannable list (fact · proposed/pinned · actions), not a tag dump.

**Density / typography / contrast**
- Live agent streams want **dense** monitoring (≈13px body, tight rows) with calm frame — doc specifies neither. Risk: card padding + icons → sparse chrome, unreadable when steps flood.
- No type roles (title ~24px max on app screens, section, mono **only** for real I/O blocks). Expanding raw `input`/`output` without mono + measure + collapse will nuke legibility and contrast (long wraps, light grey meta).
- Status colour for `working|error|paused` unspecified — study note: common greens fail 4.5:1 as text; need ink+pill pairs, not a glowing pill.

**Motion**
- Pulse + shimmer as the only named motion = the wrong budget. Prefer: running = quiet progress/elapsed time; new step = subtle insert; approval needed = clear static affordance; honor `prefers-reduced-motion` (undocumented).

**Missing craft states**
- Empty: idle Hermes, no steps, empty Memory/Queue.  
- Error: bridge down, step failed, approval expired.  
- Phone: unaddressed; this chrome will not fold cleanly.

---

### Priority fixes if you revise only this doc

1. Freeze **control semantics**: Pause ≠ Stop; map Stop to a distinct terminal/paused-queue state; drop or redefine Autonomous relative to “gates risky actions.”  
2. One **approval surface** (Inbox primary; console shows the waiting step, not a second decide UI).  
3. Replace pill/cards/shimmer with Operate language: status as text+dot, step **list**, loading without shimmer, approval as in-row decision.  
4. Add a **security subsection**: bridge auth/bind, I/O redaction, Logs policy, Autonomous forbidden or explicitly scoped, memory pin non-optional for agent writes.  
5. Split MVP acceptance from Kanban/skills/handoff/Autonomous so scope matches the mock bar.

I can turn this into a tighter rewrite outline for `06-hermes.md` (still Ask mode — outline only) if you want that next.
