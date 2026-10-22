**Verdict:** As a security/behavior sketch, draft v0.1 is directionally clear (human vs agent, local vs VPS). As a shippable Operate surface spec it is under-specified: internal model conflicts, almost no UI states, and several security/privacy holes that matter more than chrome polish.

*Lens: Impeccable **Operate** (task UI, state feedback, earned familiarity) + design-taste **app screens** (quiet chrome, density with a job, honest states). Spec-only review of `docs/specs/15-terminal.md` (workspace draft v0.1 / 2026-10-22); Ask mode blocked verifying blob `2e87f7e`.*

---

### Contradictions (inside this doc)

1. **Where agent/Hermes output lives**  
   Opening: agent/Hermes commands “appear in it too.” Behaviour: separate labelled **agent** tab, “never mixed with Jonas’s input,” and “Agents cannot write to Jonas’s interactive tabs.”  
   Unclear whether “it” means the terminal *product* (panel chrome) or the same PTY stream. Implementers can read this as either shared scrollback or hard isolation.

2. **Tabs vs machines**  
   “Tabs for two machines” vs “Local tabs” / “VPS tabs” (plural) vs one agent tab. Is the model **one tab per host**, **N tabs per host**, or **fixed three tabs** (local / VPS / agent)? “Tabs close when the token is revoked” sounds VPS-only; local multiplicity is undefined.

3. **Channel**  
   “SSE/WebSocket channel rules as 01” without saying which transport owns **interactive** I/O. Bidirectional keystrokes + resize almost always want a single websocket (or equivalent); naming both without a pick is a fork waiting to happen.

4. **Gating boundary**  
   “Jonas’s own typing is not gated” vs agent commands gated for “external-send, destructive and spend.” Unstated: Jonas pasting a script that *is* external-send/spend; Hermes running *inside* a VPS tab Jonas opened; agent commands that only touch the local filesystem. The approval story and the “free typing” story can collide.

---

### Gaps (must decide before build)

| Area | Missing |
| --- | --- |
| IA / layout | How the terminal sits “next to” Hermes console + run logs (split, drawer, tab set, focus steal). |
| Session model | Create/close/rename tabs; reconnect after refresh; what “Stop” kills (process, tab, all VPS, daemon). |
| Host identity | How local vs VPS vs Hermes-in-container is shown *before* any keystroke (cwd, host, user, container). |
| Agent UX | How gated commands appear while waiting for approval; cancel; failure; which digest/action is pending. |
| Output policy | Live vs stored: truncation size, retention, whether **Jonas’s** interactive sessions are audited at all. |
| Redaction | Pattern list ownership, live display vs storage only, binary/noisy PTY, false negatives. |
| Resize / copy | cols/rows, clipboard, selection, find-in-buffer — expected terminal jobs, zero lines. |
| Lifecycle | Daemon restart, Tailscale blip, shim restart, token rotate mid-session. |
| Open questions | Windows shell default and scrollback persistence are called out; font/theme/a11y are not even open questions. |

---

### Unrealistic scope (for this draft)

Bundling in one thin spec: **ConPTY/local PTY owned by junosd**, **remote shell over Tailscale shim**, **Hermes container entry**, **xterm.js**, **approval gateway (12)**, **append-only audit**, **secret redaction**, and **agent isolation**. Any one of local PTY-on-Windows or trustworthy redaction is a project; treating them as co-equal “Behaviour” bullets oversells readiness. Prefer a phased cut: e.g. VPS-only read/write shell *or* local-only, then agent tab, then audit/redact.

---

### Security / privacy risks

- **Browser session = full ungated shell** on Jonas’s PC (and VPS). Origin-checked auth (good) is necessary but not sufficient: XSS in any JunOS UI, extension abuse, or session theft becomes RCE. Spec never states session binding, CSRF posture beyond “origin-checked,” or short-lived tab capability tokens.
- **Audit storage of terminal output** (even truncated) is a **credential and PII sink**. Redacting “secrets patterns” from *stored* output does not protect the **live** buffer, screenshots, or shoulder-surfing; patterns will miss novel secrets.
- **Agent tab as log of gated commands** may still show secret-bearing stdout unless display policy matches storage policy.
- **“Other local process cannot attach to a PTY”** is asserted; no threat model for junosd compromise, debug ports, or shared scrollback files on disk.
- **Idle timeout only for VPS** leaves local PTYs as long-lived attack windows if the browser stays open.
- **Bridge token** revoke closes tabs — good — but no UI/security requirement for visible “connected as …” / token expiry warning before drop.

---

### UI / design quality (Operate + app-screen lens)

This is an **Operate** surface: the tool should disappear into the task. The doc specifies almost no visual or interaction design, so the main design failure is **absence**, which invites terminal-slop defaults (neon CRT, glow cursor, purple accents, decorative motion) that both skills reject for product UI.

**Hierarchy / IA**  
- Highest-stakes cue is **which machine accepts keys**. “Clearly labelled agent tab” is weak: labels alone fail under stress. Need persistent host/context chrome (name + connection state), not only tab text.  
- Three neighbours (terminal, Hermes console, run logs) without a primary job or focus model → cognitive overload (Operate: earned familiarity; app screens: one job one click from the first view).

**Density / spacing**  
- Terminal content should be dense; **chrome** should stay quiet (app-screen: colour on data/state, not decoration). Spec doesn’t separate buffer vs chrome, padding, or tab-strip height — easy to ship a fat header and a cramped PTY.

**Typography / legibility**  
- Monospace for the buffer is correct (real terminal). Unspecified: size floor, line-height, ligatures off, bold/bright ANSI mapping, wrap vs truncate. Chrome should stay the product grotesk at ~12–14px; don’t display-set “Terminal.”

**Contrast**  
- No theme tokens, dark/light, or ANSI-on-theme rules. Classic green-on-black often fails WCAG for UI chrome and selection; agent vs human tabs need more than hue if colour-blind.

**Motion**  
- Operate / app screens: motion = state feedback only (connect, disconnect, approval pending, Stop). No scroll-entrance choreography on lines. Spec is silent → likely accidental animation from xterm addons or “nice” CSS.

**States (biggest UX gap)**  
Missing: connecting, reconnecting, idle-warn, token revoked, Stop confirm, approval waiting, empty “no session,” error with next action, reduced-motion. App-screen rule: empty/error must teach the interface; “nothing here” fails.

**Persona red flag**  
Jonas under time pressure mistypes into **VPS/Hermes** thinking he’s local — catastrophic. Spec’s security model assumes he always knows the target; UI does not yet enforce that awareness.

---

### What the doc does well

Human keystrokes ungated; agent path through gateway; agents barred from interactive tabs; auth’d browser-only PTY; VPS idle timeout + token revoke; truncated + redacted audit intent. That split is the right product spine — it needs a sharper session/UI model and a narrower v1 cut.

---

### Highest-leverage fixes (spec-only)

1. Resolve the **three-stream model** in one diagram: Jonas-local · Jonas-VPS · agent-gated — no shared PTY, shared chrome OK.  
2. Define **host identity UI** and **connection/approval states** as normative, not polish.  
3. Split **v1 scope** (pick one host path) from audit/redaction maturity.  
4. Spell **what is stored** (agent-only vs all sessions), retention, and live vs stored redaction.  
5. Add an explicit **anti-slop** note for this surface: flat chrome, no glow, motion = connection/approval only, monospace limited to the buffer.

I couldn’t re-read blob `2e87f7e` in Ask mode; if the committed file differs from the workspace draft, re-run the review against that blob in Agent mode.
