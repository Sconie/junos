## Ranked findings — `docs/specs/12-security-and-privacy.md`

1. **high** — § Prompt injection + § Approval policy (`write-local` / Balanced)  
   > “tool calls that follow untrusted content … require approval for **external-send and destructive**”  
   > “write-local … **auto in Balanced**”  
   **Why:** Threat #1 is prompt injection, but under default Balanced (also default in `06-hermes.md`) an injected “edit this file” path never hits approval. Exfiltration and silent repo/config damage stay in auto.  
   **Fix:** After any untrusted content in a run, treat `write-local` (and ideally `read` of non-public paths) as ask until the run ends; or require a fresh user turn before auto-write resumes. State that explicitly in the table.

2. **high** — § Credentials vs § Daemon access  
   > “Any JunOS-owned secret … goes in the **OS keychain**, never in SQLite, logs, or the repo.”  
   > “Random auth token … stored in **`~/.junos/token`** (mode 600)”  
   **Why:** Self-contradiction. Mode 600 only blocks other OS users; threat #2 is “another **local process** … calling the daemon,” which as the same user can read `~/.junos/token` and forge bearer calls. CORS/`Origin` do not stop that.  
   **Fix:** Put the daemon token in the keychain (or derive it from an OS-backed secret); treat the file path as migrate-away. Document that same-user malware is out of scope **or** add OS IPC / private socket auth that does not rely on a readable bearer file.

3. **high** — § Daemon access vs `01-architecture.md`  
   > “the UI reads it via a **one-time pairing URL**”  
   > (`01`) “secrets must **not** live in browser storage”  
   **Why:** After pairing, the SPA still needs a durable auth material for REST/SSE. Spec never says where it lives (memory only? session? cookie?). That leaves either a broken UI or a silent violation of the architecture rule—and a XSS/extension path to the daemon.  
   **Fix:** Specify storage: e.g. in-memory + re-pair on reload, HttpOnly cookie set by a tiny local bootstrap page, or Tauri secure storage in Phase 5. Ban `localStorage` for the token. Define pairing TTL, single-use, and bind to `Origin`.

4. **high** — § Approval policy vs `06-hermes.md` Autonomy  
   > Table: external-send / destructive / spend = **always ask**; write-local only names Balanced / Ask-first.  
   > (`06`) **Autonomous (log only)**  
   **Why:** Autonomous is undefined here and, read with 06, implies skipping the “always ask” classes. That breaks overview principle 4 and makes 12 non-authoritative.  
   **Fix:** Add a third column or mode matrix: Autonomous may auto `read`/`write-local` only; never auto `external-send` / `destructive` / `spend` without a separate, explicit “I accept full risk” project flag that still logs and rate-limits.

5. **high** — § Open questions (sandbox) vs `13-roadmap.md`  
   > “Sandbox for shell steps … in **Phase 4**.”  
   > (`13`) Hermes + approvals = **Phase 3**; sandboxed shell = **Phase 4**.  
   **Why:** Phase 3 ships agent shell gated only by Inbox approve/deny, with no containment. One mis-tap or remembered rule = full user privileges. Unrealistic for the stated threat #1.  
   **Fix:** Require a minimal sandbox (or refuse non-allowlisted shell) as a Phase 3 exit criterion; keep richer isolation for Phase 4. Until then, default shell class to deny, not ask.

6. **high** — § Approval policy (“Approve and remember”) + injection  
   > “Approve and remember creates a scoped rule (project + action pattern)”  
   **Why:** A single injected ask that the user remembers permanently widens auto for that pattern—including after future untrusted content. No TTL, no “untrusted-run invalidates remember,” no ban on remembering `external-send`/`destructive`.  
   **Fix:** Disallow remember for `external-send` / `destructive` / `spend`; TTL + usage cap for `write-local`; clear remember rules when a run ingested untrusted content; show rule text in the approve UI before create.

7. **med** — § Data safety kill switch vs `06-hermes.md`  
   > “Kill switch in the UI stops **all** agent runs.”  
   > (`06`) Stop “cancels the **current** step and drops queue to paused.”  
   **Why:** Operators will assume one control; implementers will ship Hermes-only Stop. Background tasks/workflows/Scout keep running.  
   **Fix:** Split controls in 12: **Pause Hermes** vs **Halt all runs** (cancel scheduler + workflows + agents). Put Halt in a fixed chrome location (rail/top bar), not only Hermes header.

8. **med** — § Approvals UX vs `10-home-and-search.md`  
   > “Approvals are explicit Inbox items showing the **exact command/diff**.”  
   > (`10`) Home “Needs you” … **inline Approve/Deny**  
   **Why:** Inline approve without the diff trains rubber-stamping—the opposite of high-stakes Operate UX (impeccable / app-screens: one clear decision with full evidence).  
   **Fix:** Home shows title + risk class only; Approve opens Inbox detail (diff/command) or expands in place. Never approve from a one-line card.

9. **med** — § Approval policy `spend` class  
   > “spend | anything that costs money | always ask”  
   **Why:** Product is subscription-first (`00`, `03`); “money” is mostly shared quota. Unclear whether falling back providers, high effort, Scout batch, or embeddings count. Unenforceable class.  
   **Fix:** Redefine as **quota/budget** actions (above threshold, preferCheap override, maxRunsPerDay breach, paid API if ever) and point at `03` usage budget; drop vague “costs money.”

10. **med** — § Credentials redaction  
    > “Logs and run records redact **known secret patterns**.”  
    **Why:** Pattern redaction misses novel tokens, pasted key material, and provider CLI stderr. Audit export then becomes a leak channel (`event` exportable).  
    **Fix:** Redact by source (env, keychain reads, `.env` paths from `11`); default-deny logging of tool stdout for credential paths; scrub on export; document false-negative residual risk.

11. **med** — Missing Settings / rules UI (doc gap + design)  
    > “visible and revocable in **Settings**”  
    **Why:** No Settings spec in `00` screen index; `14` only names the rail slot. Security UX with no information architecture = dumped list of opaque patterns (generic admin slop).  
    **Fix:** Add a short Settings subsection here (or `15-settings.md`): rules grouped by project, human-readable pattern, last used, revoke; one primary accent on **Revoke**, not on Create. Ban eyebrow chips / icon-card grids for this screen (`design-taste` app-screens).

12. **med** — Approval action hierarchy (UI / craft)  
    > Approvals show command/diff; actions implied via Inbox (`07`): Approve, Deny, Approve and remember.  
    **Why:** Three peer actions on a destructive step invites mis-click; glass + dim text from `14` (`--panel` / `--text-dim`, blur) hurts diff readability—exactly where contrast must be highest.  
    **Fix:** In 12, specify layout: **diff/command is the dominant block** (mono only for the command, full ink); Deny and Approve as clear pair; “Remember” behind secondary/disclosure; solid (non-glass) surface for approval detail; status by text+icon not colour alone (`14` a11y already says this—bind it to approvals).

13. **med** — Threat model incomplete vs real daemon shape  
    > Risks (1)–(4) only.  
    **Why:** Omits compromised/malicious provider CLI (daemon spawns them—`01`/`03`), webhook localhost callers (`05`), SSE token in query strings, backup/`~/.junos` theft, and “phone via tunnel” (`01`/`13` Phase 5) expanding the attack surface beyond the title “single user, localhost.”  
    **Fix:** Extend the ordered list; for tunnel/phone, require second factor or short-lived tokens, not “same token forever.”

14. **med** — § Data safety worktree escape  
    > “never directly on the main working tree, **unless set otherwise**.”  
    **Why:** Escape hatch with no who/where/UI makes the control optional in practice.  
    **Fix:** Default immutable; “work on main” is a per-project setting that forces Ask-first for all writes; log every bypass.

15. **low** — § Prompt injection weasel wording  
    > “no tools while reading untrusted content **when avoidable**”  
    **Why:** Implementers will always find it “unavoidable.”  
    **Fix:** Hard rule: ingest pass = tools off; act pass = tools on only after a policy gate; no combined pass for Scout/mail/web.

16. **low** — Doc scope / tone vs product UI system  
    Security surfaces are only prose; product chrome is Translucent Glass + Inter + violet (`14`), which `design-taste` flags as assistant defaults (glass, gradient glow, violet).  
    **Why:** Without constraints in **this** doc, approval/kill-switch UI will inherit marketing glass and look like every AI dashboard—weak trust signaling on Operate screens.  
    **Fix:** Add 5–10 lines: approval/kill-switch chrome uses flat solid panels, one accent on the irreversible action, no backdrop-blur on diff/approve, no purple urgency pills; point to `14` for the exception list.

17. **low** — Open questions underspecified relative to claims  
    Keychain vs wrappers is still open while § Credentials already mandates keychain.  
    **Why:** Blocks the only compliant secret store.  
    **Fix:** Pick one in-doc (e.g. `keytar`-compatible native module with CLI fallback) or downgrade the mandate to “Phase 1 file 600 → Phase 2 keychain” with an explicit migration.
