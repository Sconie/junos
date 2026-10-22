**Verdict:** As a system shape doc, `01-architecture.md` is clear and mostly coherent. As a product/UI architecture (Operate mode), it under-specifies the working surfaces it invents, and a few security and reliability claims are thinner than the surface diagram implies.

Lens: impeccable **Operate** (task UI, restraint, state honesty) + design-taste **app screens** (data on the canvas, not chrome; one job per screen; honest empty/error/reconnect). This is a **doc** review, not a live UI critique—there is nothing to inspect yet.

---

### Contradictions

1. **Auto-start is both decided and open.**  
   “Decided… user-level auto-start service **(Windows)** from day one” sits next to “Run the daemon as a launchd/systemd user service from day one?” That is not fully open; it is **Windows-settled / Unix-unsettled**. The open-questions list should say that, or Unix gets the same decision.

2. **“Everything on localhost” vs the shape.**  
   “Keep everything on localhost” conflicts with Hermes (+ shim) on a **VPS**, and with the optional move of **junosd** to the VPS. The intent is clear (no hosted *subscription* backend), but the wording oversells locality. Prefer: “subscription secrets and provider CLIs stay on Jonas’s trust boundary; Hermes may live on a private VPS.”

3. **“Same SSE channel per subscription” vs “the event stream.”**  
   Event bus + types look like **one** global append-only stream; transport says run output shares “the same SSE channel **per subscription**.” Unclear whether that means one multiplexed connection, one connection per provider, or one per chat/run. Browser HTTP/1.1 connection limits make this a real architecture fork, not wording.

4. **Views-as-event-queries vs materialized tables.**  
   “Views … are queries over events **plus a few materialized tables**” is fine, but the diagram lists Inbox, Home feed, Kanban, Scout, activity as if they are peers of the same projection model. Kanban/card mutations and scout findings usually need stronger write models than “query the event log.” The tension is acknowledged lightly; the risk of treating everything as an activity feed is not.

---

### Gaps

| Area | What’s missing in *this* doc |
|---|---|
| **Trust boundary diagram** | Who can call whom: browser → junosd, junosd → CLIs, junosd → Hermes. Cookie auth is named; CSRF, binding to loopback, and Tailscale-later auth are not. |
| **SSE contract completeness** | `seq`, `Last-Event-ID`, `resync` are good starts. Missing: event payload size/backpressure, snapshot endpoints for resync, reconnect backoff, whether `seq` is global or per-channel. |
| **Failure UX ownership** | “Reconnecting” banner + re-read approvals before Approve is the right instinct. No policy for offline Home/Inbox, partial provider outage, or daemon-down first paint. |
| **Process & secrets lifecycle** | CLI sessions “live here,” daemon auto-starts, DB at `~/.junos/junos.db`. No file-mode/encryption, no “what the UI may show of secrets,” no log redaction for truncated run output. |
| **Phase vs shape** | The shape ships gateway, scheduler, workflows, 5 adapters, Hermes, indexer, Scout. Phase 1 only says “move `src/` once the daemon exists.” What is *minimum* daemon for Phase 1 is undefined. |
| **UI system hook** | “Plain CSS with tokens (see 14)” is a tech choice, not an Operate brief: primary job, shell, density, or which of Inbox / Home / Kanban / Scout owns the first screen. |
| **Phone path** | Tailscale “later for phone access” with no note that Operate phone rules (shell collapse, density, touch targets) will apply—or that phone is out of scope until then. |

---

### Unrealistic scope (for one architecture slice)

The diagram commits to a full local agent OS: multi-provider adapters, approval gateway, cron catch-up modes, workflow runner, file watcher, Scout, Hermes bridge, SSE fanout, monorepo split, Windows service. That is a **product roadmap**, not a minimal architecture.

Unrealistic if Phase 1 is implied to include the whole tree. Realistic if the doc adds a hard cut line, e.g. Phase 1 = API + one adapter + event bus + chat run stream; Scout/Kanban/indexer/Hermes are later modules behind the same interfaces.

Laptop-sleep note is honest; “move junosd to VPS” as the escape hatch quietly expands threat model (provider logins on the VPS) and ops (remote daemon, remote DB backup)—worth calling a **separate deployment mode**, not a footnote.

---

### Security / privacy risks (called out or under-specified here)

**Strong instincts already in the doc**

- UI cannot touch CLIs/filesystem; daemon can.  
- No subscription tokens in a hosted backend / browser storage.  
- Side effects only through the execution gateway.  
- Approvals revalidated before enabling Approve (at-least-once SSE).  
- junosd dials out to Hermes; VPS does not hold other providers’ logins.

**Risks this doc leaves open**

1. **Localhost cookie auth** — Loopback is not a security boundary against other local processes/malware. Cookie-only without clarifying SameSite, CSRF on state-changing POSTs, and binding the server to `127.0.0.1` (not `0.0.0.0`) is incomplete once anything beyond “only Jonas’s browser” is true. Tailscale phone access makes this acute.

2. **SQLite at `~/.junos/junos.db`** — Chat, tool output, scout findings, and audit trails will hold sensitive content. No mention of permissions, backup hygiene, or encryption. Truncated run storage “for audit” can still retain secrets from tool output.

3. **Provider CLIs as the identity** — Daemon-spawned CLIs inherit the user session. File indexer/watcher + workflow tools + Scout expand the blast radius of a bad approval or prompt injection. Gateway is the control; this doc does not require deny-by-default paths, cwd allowlists, or network egress policy (even at a one-line level).

4. **Hermes path** — Tailscale/WireGuard/SSH tunnel is named; mutual auth, what Hermes may invoke back toward the laptop, and whether the shim can initiate work are deferred. Architecture should at least state directionality and “no inbound from public internet.”

5. **SSE replay** — Replaying from `Last-Event-ID` can re-surface sensitive payloads to any client that holds the cookie. Retention and who may subscribe need a privacy bound, not only an idempotency bound.

6. **Auto-start service** — Always-on daemon with CLI access increases exposure when the machine is unlocked or shared. Worth an explicit “single-user workstation assumption.”

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility, contrast)

The architecture **defines many Operate surfaces** (Inbox, Home feed, activity timeline, Kanban, Scout, chat runs, connection status, reconnecting, approvals) but **does not design them**. Through the two skills, that is the main UI failure of *this* doc—not token choice.

**Hierarchy / IA**  
App-screen rule: the first screen answers one question and puts the most frequent job one click away. Listing Inbox + Home feed + activity + Kanban + Scout as equal event views invites a **dashboard of feeds**—high cognitive load, no primary job. Architecture should name the default shell and the default “what am I supposed to do?” (e.g. Inbox triage vs Home overview), and demote the rest.

**Density**  
Event-sourced “activity timeline” + Home feed + Inbox tends toward noisy, low-signal lists (generated-dashboard tell: vanity activity). Prefer denser **work queues** (few columns, stable row pitch, honest zeros) over card feeds unless Home’s one question is narrative.

**Typography & contrast**  
“Plain CSS + tokens (see 14)” is fine for Operate (one family, tight scale, fixed rem—impeccable Operate). This doc should still constrain **product UI**, not marketing: no fluid display hero type in the app shell; running text in full ink; semantic color for connection/run/approval state, not chrome. Without that, later specs will invent Persuade-mode type on an Operate product.

**Spacing / layout**  
No shell model (nav + canvas + optional inspector). For a multi-pane agent console, missing shell = inconsistent gutters, competing side panels, and approval UI that floats as a modal by default (Operate: exhaust inline/progressive first).

**Motion**  
SSE + run streams encourage decorative token churn and “live” animation. Operate/impeccable: **150–250ms state feedback**, no load choreography; design-taste app screens: motion is not the product. Spec should say stream updates update **data**, not celebrate with motion; `prefers-reduced-motion` keeps content; reconnecting is a calm banner, not a pulse circus.

**Legibility & states**  
Strength: reconnecting banner; never act on stale approvals. Gaps the skills would fail: empty Inbox/Home, provider disconnected, daemon down, truncated output indicator, approval pending vs expired. App screens require empty/zero/loading/error as first-class; architecture only specifies reconnect + approval re-read.

**Taste / anti-slop**  
Risk of shipping “AI ops console” slop: KPI tiles for usage, gradient status, icon-in-tinted-square provider cards, monospace everywhere “because agents.” Architecture should forbid treating Connections/usage as a vanity dashboard and reserve monospace for real terminal/code (you already have a terminal spec elsewhere—this doc should not imply the whole UI is a terminal aesthetic).

**Phone**  
Optional Tailscale access without a phone composition note will produce a shrunk desktop. Either “desktop-only until Phase N” or “phone = Inbox + approve/deny only.”

---

### What already works (keep)

- Clear split: browser = view/control; daemon = secrets, CLIs, cron, FS.  
- SSE + HTTP instead of WebSocket, with seq / replay / resync / idempotent handlers.  
- Gateway as sole side-effect path; Scout as “just a scheduled workflow.”  
- Honest laptop-sleep limitation.  
- Shared Zod types + plain CSS tokens (good Operate stack: Query for server state, small Zustand for UI).

---

### Highest-leverage doc fixes (still Ask-mode guidance only)

1. Split **Phase-1 daemon** from the full shape; mark Scout/Kanban/indexer/Hermes as modules.  
2. Resolve SSE: one multiplexed stream vs per-subscription connections; define resync snapshots.  
3. Rewrite locality claim; add a one-paragraph trust boundary (loopback bind, cookie/CSRF, single-user, DB sensitivity).  
4. Add an **Operate UI paragraph**: default shell, primary job, density bias (queues over feeds), motion = state only, required connection/empty/daemon-down states—leave tokens to 14.  
5. Close or split the Windows vs launchd/systemd open question.

I can go deeper next on any one axis (SSE contract, gateway trust boundary, or Operate shell IA) still against this file only—or compare it to `12` / `14` if you want cross-spec consistency (that would leave “only this doc” scope).
