**Verdict:** As a single-user localhost threat model, the bones are right (loopback bind, token, CORS/Host, action classes, untrusted content). The doc is too thin to implement safely or to design the high-stakes UI it invents: class boundaries conflict, prompt-injection has a weasel hole, and Approvals / pairing / kill switch / Settings rules are named without Operate-grade hierarchy, density, or state design.

---

### Contradictions (inside this doc)

1. **Token storage vs “no secrets in plain files.”** Credentials say JunOS-owned secrets go in the OS keychain, never SQLite/logs/repo — but the daemon auth token lives in `~/.junos/token` as a file. Either the token is a special case (say so) or this contradicts the keychain rule.

2. **`write-local` auto vs `destructive` always-ask.** Edits in allowlisted folders are auto in Balanced; delete/force-push/shell-outside-allowlist always ask. Unclear: overwrite/truncate, `git clean`, rewrite of `.env`, or “edit” that deletes file contents — write or destructive?

3. **Shell classification incomplete.** “Shell outside allowlist” → destructive. Shell *inside* allowlist is unlisted: auto? ask? spend? That hole undercuts the threat model’s #1 risk (agent destructive actions).

4. **Prompt injection vs approval table.** After untrusted content, only `external-send` and `destructive` need approval. `write-local` and `spend` can still fire auto (Balanced / if misclassified). Injection that exfiltrates via file write or paid API is not covered by the stated rule.

5. **“Models given no tools while reading untrusted content when avoidable.”** “When avoidable” conflicts with treating web/file/mail/feeds as always untrusted. Implementers will treat the exception as the rule.

6. **Remote access vs threat model.** Threat model is single-user localhost; then “Remote access, if ever…” softens the boundary without saying whether that is in scope or explicitly out for v1.

---

### Gaps

| Area | Missing |
|---|---|
| Pairing URL | TTL, single-use enforcement, what happens if the URL is opened twice, clipboard/history leakage, who may open it (any local browser?) |
| Token lifecycle | Rotation, revoke on logout/reinstall, multi-UI clients, what if `token` file is copied |
| Origin/CORS | Exact UI origin(s); file:// vs localhost app; Electron/custom scheme |
| Allowlists | Who defines project folders; can the agent widen them; path traversal / symlink escape |
| Spend | How cost is detected before the call; estimated vs actual; provider billing lag |
| Audit | Who can export; export contains secrets?; retention; tamper-evidence |
| Backups | Where nightly DB backups live; encryption at rest; restore UI; backup of `token`/keychain |
| Provider privacy | What leaves the machine to CLIs/APIs; retention; no “we store no provider tokens” ≠ “your chat isn’t uploaded” |
| Kill switch | Scope (runs only vs daemon?); in-flight tools; stuck approvals; restart behavior |
| Denial / expiry | Reject, timeout, concurrent approvals, agent blocked waiting |
| Settings rules | Pattern language, over-broad match UI, conflict when two rules apply |
| Sandbox | Open question deferred; no interim hardening (cwd jail, env scrub, network deny) |

---

### Unrealistic / under-scoped claims

- **Phase 4 sandbox as a footnote** while shell + auto write-local are in the default policy is the biggest scope mismatch. Without a sandbox story *now*, “destructive always ask” is a UX gate, not a security control (approve once → unconstrained shell).
- **“Approve and remember” + action patterns** is a full policy engine. Spec’d in one sentence; easy to ship unsafe defaults (e.g. remember `curl *`).
- **Redact “known secret patterns”** in logs — pattern lists rot; no mention of structured secret types, false negatives, or never-log fields.
- **Hermes on branch/worktree “unless set otherwise”** — the escape hatch is undefined; one setting undoes the safety story.

---

### Security / privacy risks (as specified)

1. **XSS / malicious UI origin = full daemon.** Bearer token in the UI + localhost daemon means any script in the UI origin owns the machine-side agent. Spec never mentions CSP, UI trust boundary, or treating the UI as hostile.
2. **Pairing URL is a capability URL.** One-time helps; still leakable via referrer, shared screen, terminal scrollback, crash reports. No binding to localhost-only open or user gesture.
3. **CORS + Origin/Host** helps against drive-by web; does little against other local processes that skip Origin (curl, other apps). Token file readability by same-user malware is acknowledged only weakly in risk (2).
4. **Auto write-local in Balanced** + prompt injection on files in the project = silent corruption / exfil to disk without Inbox.
5. **Keychain open question** — until resolved, Hermes/webhook tokens may land in env or config “temporarily,” which the credentials section forbids but doesn’t prevent.
6. **No privacy section for user content** — mail, feeds, files sent to models; deletion; export; whether audit `event` stores full payloads.

---

### UI / design quality (Impeccable Operate + design-taste app-screens)

Mode for these surfaces: **Operate** (approvals, Settings rules, kill switch) — precision and scanability over expression. App-screen rules: colour on meaning not chrome; one job; honest states; quiet density.

**What’s specified (thin):** Approvals as Inbox items with exact command/diff; “Approve and remember”; rules in Settings; kill switch stops all runs.

**Problems the spec creates by silence:**

1. **Hierarchy / IA** — Approvals dumped into Inbox compete with ordinary agent chat. High-stakes interrupts need a distinct queue (or hard visual priority), not the same density as mail. App-screens: the most frequent job is one click from the first screen; a buried kill switch fails that.
2. **Density** — “Exact command/diff” without caps, folding, or progressive disclosure will either truncate the dangerous part or flood the viewport. Operate wants dense *data*, not a wall of undifferentiated monospace.
3. **Typography** — Diffs/commands are the only place monospace is earned (taste skill: monospace only for real code). Spec doesn’t separate summary line (human, full ink, ~14–16px) from payload (tabular/mono, secondary). Risk: everything mono → “technical costume,” hard to scan class (spend vs read).
4. **Contrast / legibility** — Class is life-critical. Spec doesn’t require non-colour cues (label + icon weight). Red/green-only diffs fail craft-floor contrast and colour-blind use. Secondary grey for the *actual command* would violate “running text in full ink.”
5. **Spacing / composition** — No layout for Approve / Deny / Approve-and-remember. Three equal buttons = cognitive overload (>4 options nearby if you add “edit rule”). Primary should be the safe default (Deny or Approve once — pick one and stick); remember must not share primary weight (Operate: accent only on primary action).
6. **Motion** — Kill switch and approval arrival need state feedback (150–250ms), not celebration. Spec invites a big red panic control that becomes decorative chrome if always visible and unused; if hidden, undiscoverable. Taste app-screens: no floating button unless it’s the one primary and covers nothing — a floating kill FAB is a tell unless designed as the shell’s one emergency control.
7. **States (harden gap)** — Missing: pending, expired, superseded by newer diff, approved-but-failed, rule matched auto-skip (user should *see* why something didn’t ask). Empty Inbox for approvals needs product language (“Nothing waiting — agents run under Balanced”), not “No items.”
8. **Settings rules list** — “Visible and revocable” without row anatomy: pattern preview, last used, scope chips, one-click revoke. Easy to ship a generic table (zebra, uppercase headers, icon tiles) that taste skill bans for app screens.
9. **Emotional arc at high stakes** — Destructive/spend should peak on clarity (what dies / what costs), end on reversible confidence (audit link, undo window if any). Spec stops at “show exact command.”
10. **Pairing first-run** — Undesigned. Capability URL flows usually fail on hierarchy (huge URL, tiny warning) and copy (“paste this” without saying what it grants).

**Design-spec debt to add (minimal):** one approval item anatomy (title = class + object; body = summary; disclosure = diff); button priority; kill-switch placement in shell; rule row fields; contrast rules for danger; `prefers-reduced-motion` on interrupt animation.

---

### Priority order if you tighten the doc

1. Resolve class boundaries (shell-in-allowlist, write-vs-delete, spend detection) and close the prompt-injection hole for `write-local` / `spend`.  
2. Reconcile token file vs keychain; specify pairing TTL/single-use and UI XSS assumptions.  
3. Either pull sandbox into earlier phases or downgrade auto write-local / shell until it exists.  
4. Spec the three Operate surfaces (Approval item, Rules settings, Kill switch) at wireframe level: hierarchy, states, contrast — not only policy.

I did not cross-read other specs; findings are from this file alone against the two skills’ Operate/app-screen bar. No live UI to inspect, so this is a spec critique, not a rendered `$impeccable critique`.
