**Verdict:** Solid threat-model sketch for a single-user localhost agent, but the approval table undercuts risk #1 (injection → silent `write-local` / provider exfil), and the UI surfaces it implies (Inbox approvals, remembered rules, kill switch, pairing) are named without Operate-grade hierarchy, density, or decision design.

Mode: **Operate** (Inbox queue, Settings rules, high-stakes confirm). Lens: impeccable Operate (familiarity, state feedback 150–250ms, semantic colour) + design-taste app-screens (quiet chrome, colour on data/decision, lists not cards, destructive last + confirm).

---

### Contradictions

1. **Top risk vs Balanced defaults** — Threat #1 is injection → destructive/leak. Table: `write-local` is **auto in Balanced**. Prompt-injection section only tightens **external-send** and **destructive** after untrusted content — not writes. Injected “edit these files” can run quiet in the mode most people will use.

2. **“Leak” vs no exfil class** — Threat #1 includes leaking data; classes cover mail/post/push/API write and spend, not “file/mail body → cloud model context.” Provider calls are the main exfil path and sit outside the table.

3. **“Always ask” vs “Approve and remember”** — `external-send` / `destructive` / `spend` are “always ask,” then remembered scoped rules skip asks. Either “always” is false, or remember is forbidden for those classes — unspecified.

4. **Daemon threat vs defenses** — Threat #2 is another local process/page calling the daemon. Mitigations stress CORS/`Origin`/`Host` (browser drive-by). Same-user `curl` + bearer from `~/.junos/token` (mode 600, still readable by that user) is not addressed. CORS does not stop non-browser local callers.

5. **Threat #3 vs credentials** — “Leaked provider sign-ins” is a top risk, then “JunOS stores **no** provider passwords or tokens.” Residual risk lives in CLIs; JunOS’s duty (never log/relay/copy them) is not stated, so #3 looks like a JunOS control problem it has already disclaimed.

6. **Worktree safety with escape hatch** — “Never directly on the main working tree, **unless set otherwise**” cancels the guarantee in the same sentence.

7. **Hard rule softened** — “No tools while reading untrusted content **when avoidable**” makes the injection control optional exactly when agents are tool-heavy.

---

### Gaps (product + Operate)

- **Pairing:** lifetime, single-use invalidation, where the URL is shown, history/referrer, what happens if UI and daemon disagree on token.
- **Token lifecycle:** rotation, revoke-all, compromise recovery, multi-UI clients.
- **“UI origin”:** scheme/port (Vite, packaged app, `file://`) — CORS story depends on it.
- **Class edge cases:** shell *inside* allowlist; `git push` vs force-push; MCP/webhooks/clipboard; inbound untrusted vs outbound.
- **Provider/context send:** is attaching a file or pasting mail into a cloud chat `read`, `external-send`, or `spend`?
- **Remembered rules:** pattern language, specificity, collision, audit of auto-approvals, max scope, expiry.
- **Approval UX states:** timeout, deny-by-default, queue flood, expired run, partial diff, “approve while run still mutating.”
- **Kill switch:** stops in-flight only vs blocks new runs; survives restart; CLI/daemon equivalent if UI is hung.
- **Audit:** who can wipe `event`; export format; retention; whether backups/logs are in scope for redaction.
- **At rest:** SQLite/backups encryption; backup contents vs “redact logs.”
- **v1 credentials:** keychain still an open question — secrets story is incomplete for anything that needs a JunOS-owned secret at ship.

---

### Unrealistic scope

The doc is short; the overreach is **assurance**, not feature count:

| Claim | Why it’s heavy / early |
| --- | --- |
| Balanced + auto `write-local` as safe default | Needs sandbox / stronger injection gates; sandbox is Phase 4 |
| “No tools while reading untrusted when avoidable” | Hard in multi-step agent loops; “when avoidable” invites bypass |
| Redact “known secret patterns” | Incomplete by definition (novel tokens, screenshots, pasted keys) |
| Every approval + every external action in `event` | Requires every tool path to be classified and instrumented |

Credible v1 from this doc’s own threat order: localhost bind + token, no silent external-send/destructive/spend, injection → at least ask on **write-local** too, pairing that’s one-shot, kill switch with a non-UI path, audit of approvals. Keychain + shell sandbox as explicit Phase N.

---

### Security / privacy risks

- **Same-user token theft** — `~/.junos/token` is shared-fate with the user account; malware/other local agents get full daemon access.
- **Pairing URL** — Classic localhost race (open URL, log, extension); not threat-modeled.
- **Silent allowlisted writes** — Post-injection overwrite of source, config, or `.env` under Balanced.
- **Cloud context exfil** — Unclassified; redaction of logs does not stop prompt upload.
- **Over-broad remember rules** — “Project + action pattern” can become standing external-send/destructive approval.
- **Host/Origin checks as primary** — Understate raw TCP/HTTP clients on `127.0.0.1`.
- **Backups** — Nightly DB may hold pre-redaction run output / approval payloads.
- **Classification mistakes** — Ambiguous `git push` / shell / “API write” → wrong default (auto vs ask).
- **Kill switch only “in the UI”** — If the UI is the stuck surface, no recovery path is specified.
- **Open keychain question** — Until resolved, webhook/Hermes tokens risk landing in SQLite/env despite the policy line.

---

### UI / design quality (hierarchy, density, type, motion, contrast)

Surfaces implied: pairing, Inbox approval items, Settings → rules, kill switch. Spec is silent on composition → high risk of template chrome or an unreadable diff wall.

1. **Hierarchy (Inbox)** — App-screens: one job first. Approval item must lead with **decision** (class, target, blast radius, why now), then command/diff. Doc only says “exact command/diff” → medium-everything, no focal mass when squinted.

2. **Density** — Approvals are a **list/queue** (dense rows OK); full diffs need progressive disclosure (summary → expand), not a card of monospace. Unspecified → either sparse “Approve?” cards or a scroll of noise.

3. **Cognitive load** — Per item: Approve / Deny / Approve-and-remember (+ maybe edit scope) already crowds Operate’s “don’t exceed ~4 visible decisions.” Remember belongs as a **follow-up** (“also create rule?”) or Settings-only, not a peer primary.

4. **Typography** — Operate: one UI face, rem scale, mono **only** for command/paths/diff. Doc silent → risk of all-mono security theater or tiny grey secondary text for the actual risk line.

5. **Colour / contrast** — Colour on **severity and the affirming action**, not chrome. Destructive/spend need non-colour-only cues (label + placement). App-screens: destructive last, outlined/negative, consequence in words + confirm — kill switch and Deny/Approve need that pattern; unspecified.

6. **Class labels** — Taste bans tiny tracked uppercase eyebrows (`DESTRUCTIVE`). Prefer sentence-case, readable size (“Deletes files outside the allowlist”).

7. **Settings rules** — Should be a quiet table/list (pattern, project, created, revoke) — not icon tiles. Revoke must be obvious; empty state teaches “no standing approvals.”

8. **Kill switch** — Findable under stress without screaming on every screen (accent on the control when armed/stopping, not a permanent red bar). Motion: state feedback only (150–250ms), no pulse/glow urgency theater; honor reduced motion.

9. **Pairing** — First-run trust moment: one title, one short consequence sentence, one action. No badge row (“Secure · Localhost · Token”).

10. **Legibility of diffs** — Unbounded “exact diff” without wrap/measure, truncation, or binary/secret warnings will fail contrast and scanability (and can itself leak secrets into the UI).

11. **Motion** — No decorative load choreography on security surfaces; approval appear / kill confirm = feedback only.

---

### Highest-leverage doc fixes (if you edit later)

1. After untrusted content, require ask for **`write-local`** (and define **provider/context send** as ask or spend) — align defaults with threat #1.
2. Resolve **“always ask” vs remember** (forbid remember for destructive/spend, or rename the default).
3. Threat #2: state **token = capability**; CORS as browser defense only; pairing one-shot + rotation.
4. Specify Inbox item **information hierarchy** + Approve vs Remember as two steps; Settings rules as a revocable list.
5. Kill switch: UI + daemon/CLI; sandbox/keychain called out as Phase N without implying Balanced is fully mitigated.

I did not run `impeccable critique` / `inspect.mjs` against a live UI (spec-only, Ask mode). Questions skipped: N/A for a doc audit.
