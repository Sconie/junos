Context loading did not run (Ask mode / read-only); no `PRODUCT.md` or `DESIGN.md` in the repo, and this is a **spec**, not a rendered UI — so this is a document critique through those lenses, not a scored live `critique`/`inspect` pass.

**Mode:** Operate / app screen (agent console). Ambition should be precision and scanability, not marketing craft.

---

## Verdict

The integration story (VPS + container + shim + Telegram coexistence) is unusually concrete for a JunOS spec. The **Screen / Behaviors** section is still a generic agent-console wireframe: three competing regions, card+icon timeline, pulsing chrome, and almost no states, hierarchy, or privacy rules for what that UI will literally show. Scope and security risk sit mainly in the bridge surface area and in streaming raw step I/O into the shell.

---

## Contradictions

1. **Status enum vs deployment** — Contract lists `online|idle|working|paused|error`; later adds `unreachable`. The wire type is stale; header/pill behavior for `unreachable` vs `error` is undefined.

2. **“Write-local” vs VPS filesystem** — Autonomy says “wider write-local in allowlisted worktrees,” but Hermes only sees the VPS workspace (git clone / upload). Naming and mental model conflict with the deployment model.

3. **Memory edit path** — Shim mounts memory **read-only** and writes “only through Hermes’s own interface,” while the UI has **editable chips** and optional **diff-until-pin**. Unclear whether Jonas’s edits are always proposals, always PUT-through-Hermes, or direct volume edits when the setting is off.

4. **Approval channels** — Approvals resolve from Inbox **or** Hermes Telegram (first wins), and urgent items also go through a **separate JunOS Telegram bot**. Three surfaces, one digest — winner / stale-button / double-notify behavior is underspecified.

5. **Lifecycle controls vs Screen** — Container section implies Restart / Update image via shim + Docker API; header only lists Pause / Stop / Settings. Ops controls are either missing from IA or hidden without a home.

6. **“No paid API” vs preferred drive path** — Bridge must use free paths; shim may use the shipped web UI HTTP backend, but if that bills, JunOS must not use it. Fallback (CLI-only) and what the console loses are not spelled out.

7. **Open questions section** — Mixes “Resolved” items with open ones; weakens the contract for implementers (what is still blocking Phase 3?).

8. **Embed Hermes web UI (open)** — Conflicts with building a first-class console (chat + timeline + tabs). Two shells = duplicated activity and clashing visual systems.

---

## Gaps

| Area | Missing |
|---|---|
| **Primary job** | Is the first screen “send a directive,” “watch the live step,” or “clear an approval”? App-screen run wants one question and one frequent job one click away. |
| **Left 40%** | “Directive stream, a chat” — one transcript or two stacked panes? How do Telegram-mirrored messages, JunOS directives, and agent replies share thread identity? |
| **Settings** | Autonomy levels, approval timeout, echo-to-Telegram, memory-diff setting — no IA. |
| **States** | Empty queue, idle, unreachable, paused, approval-waiting, stop-not-confirmed, reconnecting SSE — only shimmer + pulse are named. |
| **Responsive** | No phone/tablet composition; Telegram is the phone channel, but console breakpoints are absent. |
| **Gateway spike** | Web UI port/auth/API and memory-on-volume path still open — Memory tab and real shim are blocked. |
| **Skills toggles** | UI-only vs actually disables Hermes tools; failure if Hermes ignores toggle. |
| **Handoff** | Upload retention, deletion, private-repo git credentials, “says so” copy only — no data lifecycle. |
| **Acceptance** | “Stop within a few seconds” with no latency budget for VPS/Docker; mock validated against real Telegram session before Phase 3 while Tailscale/shim aren’t ready — sequencing tension. |
| **Multi-agent** | Data model allows many agents; UI assumes one Hermes. |

---

## Unrealistic scope

For one screen spec, the doc commits to:

- Remote bridge + SSE resume + mock  
- Sidecar shim + Docker lifecycle (restart/update) via socket proxy  
- Telegram mirror + dual-bot approvals + echo  
- Full console (chat, timeline, memory, skills, logs, queue)  
- Kanban pickup + Inbox approvals + “Give to Hermes” everywhere  
- Optional embed of upstream Hermes web UI  

That’s an **ops console + agent product + integration program**. Realistic cut: mock-backed console + contract; shim/CLI path; Telegram observe-only; defer Docker lifecycle UI, web-UI embed, and multi-channel approval parity.

---

## Security / privacy

**Strong:** private network only; Hermes publishes nothing; no `docker.sock` in Hermes; bridge token in keychain; Telegram token stays on VPS; bot allowlist called out; project handoff is explicit copy/clone.

**Risks the UI/spec still invites:**

1. **SSE `input` / `output` on shell|browser|file|api steps** — Expanding cards and “Logs (raw)” will show secrets, tokens, file contents. No redaction, retention, or “don’t persist bodies” rule.

2. **Shim = high-value host** — Docker rights + memory mount + conversation tail. Compromise of shim ≈ control of Hermes and possibly containers. Spec doesn’t bound shim privileges or audit logging.

3. **“Give to Hermes” uploads** — Personal/project files land on VPS volume; no retention, encryption-at-rest, or wipe-after-task.

4. **Echo to Telegram / mirrored chat** — Sensitive directives can hit phone notifications; default-off helps, but no guidance on what must never echo.

5. **Approval via Telegram** — Convenient; weaker binding than a local digest UX unless the “digest-bound gateway check” is mandatory for Telegram answers too (stated for junosd, easy to get wrong in the bot path).

6. **Unconfirmed Hermes web UI auth** — Spike risk of a weakly auth’d panel on the private net (still bad on a shared VPS / compromised peer).

7. **Ring buffer** — Duration, contents (full I/O?), and at-rest exposure on the VPS are unspecified.

---

## UI / design quality (impeccable Operate + design-taste app-screens)

The Screen block reads as **template agent console**, not a JunOS-specific supervision surface.

### Hierarchy & IA
- Header packs identity + live state + model + uptime + destructive controls — chrome competes with the job (app-screens: colour/attention on data and the next action, not a busy hero header).
- **40% chat | 60% card timeline | bottom four tabs** — three regions, no stated focal mass. Squint test fails: everything is medium.
- Bottom **Memory / Skills / Logs / Queue** turns the console into a junk drawer; Logs especially fights “supervise live work.”
- Approval as **banner + Inbox + Telegram** without a single primary approval surface → emotional valley at the highest-stakes moment (Operate: reassure at high stakes, don’t multiply channels in the chrome).

### Density, spacing, components
- “Steps as **cards** with **icon**, summary, duration” — classic generated-dashboard tell (icon tiles / card stacks). App-screens prefer flat rows, tone step or 1px rule, type-led status — not icon cards.
- Memory as **editable chips** — pill/chip clusters; fights the better idea (diff-until-pin). Prefer a short fact list + pending diff.
- Expandable I/O on every step — dense and dangerous; default should be summary-only with explicit reveal and redaction.

### Typography & legibility
- No type roles (directive vs metadata vs step summary vs raw log). Risk: model/uptime/metadata same weight as the current task.
- **Logs (raw)** in a bottom tab implies a cramped monospace dump — fine for a drill-in, poor as a peer of Memory/Queue.

### Motion & contrast
- **Pulsing** status + **shimmering** running step = two continuous chrome motions. Operate: 150–250ms state feedback, not ambient pulse/shimmer; design-taste: motion budget with `prefers-reduced-motion`. Shimmer often tanks contrast and reads as decoration.
- Status pill as the main colour carrier puts hue on chrome, not on the actionable step/approval.

### Product specificity
- Nothing here is Hermes/JunOS-specific beyond labels — could be any agent dashboard (design-taste product-face test fails). Missing: one signature element (e.g. single live “current step” as the hero row; Telegram provenance as text, not badge candy; unreachable as a full-canvas honest state).

### Missing compositions the skills expect
- Unreachable / reconnecting / empty queue / first-run (“mock vs real”)  
- Phone layout (or explicit “desktop only + Telegram on phone”)  
- Focus order for Pause/Stop vs composing a directive  
- Reduced-motion equivalents for pulse/shimmer  

### Embed risk
- Shipping Hermes’s own web UI inside JunOS guarantees **two type systems, two densities, two nav models** — worst outcome under both skills’ consistency rules.

---

## Priority fixes (spec-only)

1. **Freeze the wire contract** — status union includes `unreachable`; document SSE redaction (what is never sent/stored); define memory PUT as Hermes-mediated only; drop or park Restart/Update and web-UI embed.  
2. **One primary job on first paint** — e.g. current task + latest steps as a flat timeline; directive composer; approval as one blocking strip — tabs as secondary.  
3. **Replace card+icon+shimmer language** with Operate/app-screen language: flat step rows, semantic colour on waiting/failed only, short motion on state change, reduced-motion notes.  
4. **Collapse approval to two paths max** (JunOS UI + one Telegram bot), with first-wins and digest rules written once.  
5. **Rename autonomy** away from “write-local”; bound upload/git secrets and log retention.  
6. **Split “Open questions”** into Decided / Blocking Phase 3 / Later so scope stops thrashing.

I can’t score a live UI or run detectors on a markdown wireframe; once a mock exists, a real impeccable `critique` + taste `inspect --app` pass would catch hierarchy/contrast issues the prose can’t.
