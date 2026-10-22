**Verdict:** The supervision contract and kill-switch intent are clear; as a UI/product spec it still reads like a packed ops dashboard with unresolved trust/IA, and several bridge vs behavior mismatches that will bite implementation.

Mode lens: **Operate** (impeccable) / **app screen** (design-taste). Not Persuade. Ambition here should be precision and scanability, not ornament.

---

### Contradictions

1. **Memory write path fights itself.** Bridge allows `PUT /hermes/memory` as direct edit; Behaviors say Hermes writes are “proposed as a diff … until Jonas pins.” Spec never says whether the UI PUT is pin-only, whether Hermes can bypass the gate, or which side is source of truth.
2. **Directive stream vs chat.** Left pane is both “directive stream” and “a chat with Hermes (`kind=agent`).” Commands, conversation, and “Give to Hermes” handoffs are three models in one surface with no merge rules.
3. **`paused` is overloaded.** Status enum includes `paused`; Stop “drops queue to paused.” Unclear whether pause is agent state, queue state, or both, and how that differs from Pause vs Stop.
4. **Autonomy vs approvals.** Ask-first / Balanced / Autonomous are defined, but stream step types (`shell|browser|file|api|message`) are never mapped to which level requires `approvals/:id`. Autonomous “log only” also sits oddly next to always-on Stop and Inbox approvals.
5. **Approvals have three homes.** Inbox item + console banner + blocking step, plus `POST /approvals/:id`. No primary path or dismissal rules when the same decision appears twice.
6. **`projectId?` vs per-project autonomy.** Directives may omit project; autonomy is “per project.” Default project / global level is undefined.
7. **Skills naming.** API is `/hermes/skills`; UI tab is “Skills/Tools.” Same object or not?

---

### Gaps (spec holes that block a trustworthy build)

| Area | Missing |
|---|---|
| **Screen job** | No one-line “this screen answers ___.” App-screen run expects that first. |
| **States** | Offline / unreachable Hermes, SSE drop, empty queue, empty memory, approval timeout UI, error state beyond a pill. |
| **Stream contract** | Reconnect, backfill, pagination, max payload size, redaction of secrets in `input`/`output`. |
| **Allowlists** | Balanced “writes in allowlisted folders free” with no UI or schema for the allowlist. |
| **Settings** | Header Settings control with no contents (autonomy? model? timeout? redaction?). |
| **Multi-agent** | Open question admits many agents; screen is single-agent chrome only. |
| **Handoff** | “Context attached” has no size, schema, or preview before send. |
| **Kanban** | “See 09” only; pickup/create/move failure and ownership not specified here. |
| **a11y / motion** | Pulsing pill + shimmer with no `prefers-reduced-motion`, focus order, or live-region rules for SSE. |
| **Layout** | No breakpoints; 40/60 + bottom tabs will collapse on short laptop viewports. |
| **Visual system** | “Matches mockup” with no tokens, density targets, or type scale. |

---

### Unrealistic / under-scoped ambition

Shipping **live step I/O**, **chat**, **approvals**, **editable memory diffs**, **skill toggles**, **raw logs**, **queue**, **Kanban bridge**, and **global handoff** as one console is a product surface area, not a single screen. The dangerous part is unbounded step `input`/`output` (browser/file dumps) plus a raw Logs tab—easy to mock, hard to keep usable and safe.

Memory-as-pinned-diffs is a full trust UX; the doc treats it as a tab of chips. Autonomy allowlists are similarly hand-waved.

Mock-first is sound; the wire format is not yet minimal enough (no auth, errors, pagination, or redaction).

---

### Security / privacy risks

- **Bridge has no auth, tenancy, or bind assumption.** If anything is reachable beyond the local daemon, `PUT` memory/skills and directive injection are full agent control.
- **Full step I/O in the timeline + raw Logs** will surface tokens, mail, file contents, and URLs. No retention, redaction, or “hide secrets” rule.
- **Autonomous “log only”** still persists sensitive actions; logging ≠ private.
- **Same-machine file access** is an open question but Balanced already assumes folder allowlists—policy without a trust boundary.
- **Approval auto-deny at 30m** with no notification/audit requirement → silent failed outward actions (mail/network).
- **Stop** cancels the current step with no cleanup/side-effect contract (partial writes, open browser sessions).
- **Editable memory “key facts”** is a PII store with pin UX but no sensitivity tiers.

---

### UI / design quality (hierarchy, density, motion, legibility)

Through Operate + app-screens, the described layout is a **stock agent console**: header status pill, icon+summary cards, shimmer, bottom tab strip. That fails the “could belong to any product” test and leans on chrome the taste skill warns against (pulsing pills, card stacks, decorative loading).

**Hierarchy / IA**  
Three jobs compete above the fold: steer (chat/directives), watch (timeline), decide (approvals). Bottom tabs add a fourth cluster (Memory / Skills / Logs / Queue → four options, cognitive-load smell). Settings is a fifth orphan. Nothing states the primary action on first paint (app-screens: most frequent job one click away).

**Density / layout**  
40% chat + 60% card timeline + bottom tabs on one viewport will crush the timeline. Expandable I/O per card without max-height, virtualization, or “summary first” rules → scroll and noise. Editable memory **chips** invite pill clutter; prefer a quiet list/diff.

**Typography / legibility**  
No type scale. Step I/O needs a real monospace/`pre` treatment (allowed for code); summaries should stay full ink at readable size, not soft grey. Status/model/uptime in the header will become a metadata strip unless hierarchy is capped (app-screens: quiet shell, ~16–24px titles).

**Motion**  
Continuous **pulse** on working + **shimmer** on the running step skew decorative. Operate: 150–250ms state feedback, not ongoing chrome motion. Prefer a single semantic state change (e.g. steady “Working” + progressing step row) and a reduced-motion path.

**Contrast / colour**  
Status pill will need semantic colours that encode meaning (error vs working), not rainbow chrome. Colour should sit on **state/data**, not every card icon.

**Trust moments**  
Approvals are high-stakes but split across banner + Inbox + blocked step—emotional valley without one obvious resolve path. Kill switch always visible is the strongest trust detail in the doc; Pause vs Stop still need distinct copy and confirmation rules for destructive stop.

**Empty / error**  
No trade-language empty states (“No steps yet—send a directive” vs generic “Nothing here”). Offline Hermes is unspecified, so the status pill can lie.

**What would move quality most (spec-only):**  
1) One primary job + demote Memory/Skills/Logs to Settings or secondary.  
2) Timeline as a flat list (tone step, not icon cards); I/O behind explicit expand with redaction.  
3) One approval surface; map step types → autonomy.  
4) Replace pulse/shimmer with short state motion + `prefers-reduced-motion`.  
5) Resolve memory PUT vs pin-diff and bridge auth/redaction before UI polish.

---

I’m in Ask mode, so this is review only. If you want these folded into the spec as concrete edits, switch to Agent mode.
