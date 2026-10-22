**Verdict:** As an Operate-surface brief, `15-terminal.md` is a thin security/policy sketch, not a buildable terminal UI. The gating model (human free / agent gated / separate agent tab) is the one strong decision; almost everything that makes a terminal trustworthy—layout, states, contrast, connection chrome, and terminal-specific threat model—is missing or internally fuzzy.

Lens: Impeccable **Operate** (task tool, earned familiarity, state motion) + design-taste **app screens** (quiet chrome, honest states, density for work). No PRODUCT.md/DESIGN.md in repo; reviewed the working-tree doc only (Ask mode blocked git verification of `595fe13`).

---

### Contradictions

1. **One surface vs two paths to Hermes**  
   “Sits next to the Hermes console” and “Hermes console and the VPS tab share one path” fight each other. Same path + two adjacent UIs means duplicate affordances, unclear which is source of truth, and competing density in one viewport.

2. **“Appear in it” vs “never mixed”**  
   Opening: agent/Hermes commands “appear in it too.” Behaviour: separate labelled agent tab, never mixed with Jonas’s input. Tabs resolve this only if “it” = the terminal chrome, not one buffer—worth stating explicitly.

3. **“Cannot attach to a PTY” vs browser attachment**  
   Security notes say a web page/local process cannot attach; the product *is* browser → PTY. Intent is “unauthenticated/other origin,” but as written it overclaims and under-specifies the real attach surface (authenticated WS/SSE).

4. **Human ungated everywhere vs agent isolation**  
   Human keystrokes skip the gateway on local *and* VPS/Hermes-container shells. Agents are locked out of human tabs but the human channel is full remote shell with session auth alone. That is a coherent “Jonas is root” product choice—but it contradicts the spirit of “digest-bound… for destructive… actions” unless you say: *human interactive = trusted; only non-interactive actors are gated*.

---

### Gaps (spec cannot ship from this)

| Area | Missing |
|---|---|
| **IA / layout** | How terminal + Hermes console + run logs share space (split, tabs, drawer). Who wins focus. |
| **Tab model** | One agent tab vs one per run; rename; close; reconnect; local vs VPS indicators. |
| **Connection lifecycle** | Connecting, live, idle-warning, revoked, Stop, Tailscale down, shim down—copy and UI for each. |
| **Approval UX** | Agent commands go through gateway (12)—where does approve/deny show relative to the agent tab? |
| **Scrollback / audit** | Live full output vs truncated stored; can Jonas open audit from the tab? |
| **Redaction** | Pattern list, live vs stored, false negatives (`cat`, base64, multiline). |
| **PTY identity** | User/uid for local PTY; Windows shell (open question is blocking on win32). |
| **Input modes** | Paste, bracketed paste, Ctrl-C/Z, resize, multiple tabs resource limits. |
| **a11y** | Focus order into xterm, announcing connection state, reduced motion for flicker. |
| **Cross-refs** | Defers to 01/06/12 without restating the few UI-binding rules this surface needs. |

Open questions (shell default, scrollback across restarts) are real product forks; leaving both open makes v0.1 implementation guesswork.

---

### Unrealistic scope (for “draft v0.1, same day”)

In one short doc this commits to: local PTY ownership in junosd, remote shell via Tailscale shim + bridge token, Hermes-in-container, xterm.js over shared auth channel, dual trust domains (human/agent), approval gateway integration, event logging, secret redaction, idle timeout, token revoke → tab close.

That is a full remote-access product, not a panel next to logs. Realistic cut for a first revision: **one machine** (local *or* VPS), human-only interactive, agent output as read-only stream—then add the second hop and agent tab.

---

### Security / privacy risks

High:

- **Session = shell.** Hijacked or XSS’d browser session gets ungated local + VPS + Hermes container. No step-up, no typed confirmation for remote, no “dangerous paste” gate.
- **Terminal escape / OSC / title / clipboard (OSC 52)** unmentioned. Agent or remote output can attack the browser or exfil via clipboard if xterm features aren’t locked down.
- **Live secrets vs stored redaction.** Audit store redacts; the interactive buffer (and likely `event` “result”) can still hold secrets. Screen share, crash dumps, and “copy last command” are privacy holes.
- **Bridge token in the browser path.** Revoke-closes-tabs is good; token storage, XSS reachability, and whether the token is scoped per tab are unspecified.

Medium:

- **Agent cannot write human tabs**—can agents **read** them? Sidecar / shared scrollback / logging of human keystrokes to `event` is a privacy landmine if yes.
- **Idle timeout only on VPS.** Local elevated shells can sit forever.
- **Truncation** without size/retention = weak forensics *and* unclear privacy bound.
- **“Secrets patterns”** without a deny-list / allow-fail policy → false confidence.

Low / clarify:

- Origin-checked session (12) is the right dependency; still need explicit “no anonymous PTY,” “no other localhost process,” and “resize/input only on owning session.”

---

### UI / design quality (hierarchy, spacing, type, density, motion, legibility, contrast)

This is an **Operate / app-screen** surface: quiet chrome, the buffer is the product, colour on state not decoration. The spec barely describes UI, which *is* the design failure—implementers will invent a generic dark xterm in a card.

1. **Hierarchy** — No primary object on first paint: machine (Local / VPS), trust domain (You / Agent), connection state. App-screens: shell names product + scope; here scope is the machine and whether the buffer is trusted. “Clearly labelled agent tab” is insufficient for a high-stakes trust boundary—needs persistent, non-colour-only distinction (wording + structure), not a pill badge costume.

2. **Density / composition** — Three operational surfaces side by side (terminal, Hermes console, run logs) without a composition rule will produce thin empty chrome or overlapping scroll regions. App-screens: every named block shows header + first content on first screen; pick one primary work surface.

3. **Typography** — Terminal content *must* be monospace (legitimate exception to “no mono costume”). Spec never sets size, line height, or how UI chrome (tabs, status) stays in the app grotesk at 12–14px while the buffer stays mono—classic Operate scale, not display type.

4. **Contrast / legibility** — No theme: dark buffer in light JunOS shell (or full dark). Risk: grey-on-grey status, ANSI default colours failing WCAG against the chosen ground, selection/caret unthemed (craft-floor: browser surfaces). Agent vs human tabs need contrast that survives deuteranopia—not red/green alone.

5. **Spacing** — No tab bar pitch, status strip, or padding between chrome and xterm. Crowded tab labels (“VPS · Hermes · agent · local”) will truncate without a naming scheme.

6. **Motion** — Operate: 150–250ms, state only. Spec ignores reconnect flicker, approval flash, and scrolljacking on flood. Needs: no entrance choreography; optional subtle state change on connect/disconnect; `prefers-reduced-motion` for animated cursors/spinners.

7. **States (app-screens §11)** — Empty (no tab yet), connecting, live, idle closing, token revoked, Stop, error, agent waiting on approval—none specified. Empty should keep frame + one sentence + one action (“Open local shell”), not a blank xterm.

8. **Emotional / trust journey** — Destructive agent commands need reassurance at the peak (approval), not only a log line. Human remote shell to Hermes container needs a visible “you are on VPS” cue so muscle memory doesn’t treat it like local.

9. **Slop traps to forbid in implementation** — Gradient terminal chrome, glass overlays, icon-in-tinted-square machine cards, rainbow status dots, “Welcome to your terminal” empty illustration. Colour on connection/trust state only; flat surfaces; words of the trade (“Local PC”, “VPS”, “Agent run”, “Bridge revoked”).

---

### Priority fixes before this leaves draft

1. Resolve Hermes console vs VPS tab (merge, or different jobs).  
2. Write the trust sentence: human interactive ungated; agents gated; agents cannot read/write human PTYs (pick read policy).  
3. One composition diagram: shell chrome + tab types + status + where approval appears.  
4. State table + copy for connect/idle/revoke/error/empty.  
5. Terminal threat addendum: ANSI/OSC, clipboard, paste, live vs stored secrets, PTY user, token scope.  
6. Close or default the Windows shell question.  
7. Cut v0.1 to one hop + human-only, or admit this is a later-roadmap epic.

I can go deeper on a state/copy table or a threat checklist next if you want that as the follow-up—still Ask-mode, so guidance only.
