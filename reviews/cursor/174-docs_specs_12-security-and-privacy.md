Context loading did not run (Ask mode blocked the launcher); no `PRODUCT.md` / `DESIGN.md` in-repo. Review is of **this spec only**, in **Operate / app-screen** mode (impeccable) with **design-taste app-screen** rules as the quality floor. No live UI to inspect.

---

## Verdict

The threat model and approval classes are a credible skeleton for a localhost single-user agent host, but the doc **undercuts its own secrets story**, leaves the highest-risk controls (token theft by same-UID processes, prompt injection, shell) underspecified, and treats security UI as a sentence (“Inbox item”, “kill switch”, “Settings”) with **no Operate-mode craft**—no hierarchy, states, density, contrast, or motion for the highest-stakes screens in the product.

---

## Contradictions

1. **Where JunOS secrets live**  
   Daemon auth token: `~/.junos/token` (mode 600).  
   Credentials: “Any JunOS-owned secret … goes in the OS keychain, never in SQLite, logs, or the repo.”  
   The bearer token *is* a JunOS-owned secret. File vs keychain is unresolved; implementers will pick the file path and silently violate the keychain rule.

2. **Threat (2) vs mitigations**  
   Risk: “another local process … calling the daemon.”  
   Mitigations: bind `127.0.0.1`, CORS/`Origin`/`Host`, bearer token.  
   CORS/Origin stop **browsers**, not local processes. Any same-user process that can read `~/.junos/token` owns the API. The threat list ranks local callers high; the controls do not match that threat.

3. **Prompt-injection policy is self-weakening**  
   “Models given no tools while reading untrusted content **when avoidable**” + approvals only for **external-send and destructive** after untrusted content.  
   That leaves **write-local** (auto in Balanced) and **spend** after poisoned context without the same gate—while threat (1) is exactly agent misuse/leak via injection.

4. **“Always ask” classes vs “Approve and remember”**  
   Destructive / external-send / spend are “always ask,” yet remembered scoped rules can auto-approve later. “Always” is not always unless remember is banned or narrowly capped for those classes—unstated.

5. **Remote access “same token”**  
   Local pairing token reused over a tunnel equates “on this machine” with “anything that can present the token.” That conflicts with treating localhost binding as a primary boundary.

---

## Gaps

| Area | Missing |
| --- | --- |
| **Token lifecycle** | Rotate, revoke, re-pair, expiry, multi-UI clients, leaked-token recovery. |
| **Pairing URL** | TTL, single-use enforcement, binding to loopback only, what UI origin is allowed, failure if opened remotely. |
| **Transport auth** | HTTP bearer is named; SSE/WebSocket (architecture elsewhere) not covered here—auth on upgrade/subscribe. |
| **Same-user malware** | Explicit acceptance or hardening (keychain, OS permission prompts, optional confirm for first local client). |
| **Allowlist** | Who edits paths, symlinks/traversal, new folders, default deny, UI to review grants. |
| **Action taxonomy** | Borderline cases: `git push` vs force-push, `rm` in allowlist, network read vs write, clipboard, screenshot, payment CLIs. |
| **Spend detection** | How “costs money” is known before the call (provider metering vs heuristics vs always-ask on unknown). |
| **Approval timeout / deny** | What happens if Inbox never answers; auto-deny? hang forever? |
| **Kill switch semantics** | Stops runs—pending approvals? cron/workflows? Hermes only? resume rules? confirmation? |
| **Audit** | Retention, who can export, whether exports include redacted secrets, PII in diffs/mail bodies. |
| **Backups** | Nightly DB backup referenced (02)—path, mode, encryption, restore, whether backups contain secrets/PII. |
| **Privacy** | No telemetry/crash/cloud story; “single user” is assumed, not enforced. |
| **UI surfaces** | Approval item layout, Settings rules list, kill-switch placement—named but not specified (see UI section). |
| **Open questions as blockers** | Keychain choice and Phase-4 sandbox are still open while shell/destructive can ship earlier under “always ask” alone. |

---

## Unrealistic scope

- **Prompt injection** is listed as risk #1 with mitigations that are research-hard (“wrap as data”, “no tools when avoidable”). As written, it reads like a solved product policy, not a defense-in-depth outline with residual risk.
- **Accurate spend + destructive classification** for every tool/CLI/agent path is a full policy engine; the doc ships it as a five-row table.
- **“Approve and remember” scoped rules** (project + action pattern) is a mini IAM product—pattern language, over-broad matches, conflict resolution, and revocation UX are all deferred.
- **Sandbox deferred to Phase 4** while shell-outside-allowlist already exists as a class implies early phases rely on approval UX alone for code execution—ambitious and fragile.
- **Keychain still an open question** while the credentials section states keychain as policy—scope claims a store that isn’t chosen.

A thinner honest cut: localhost bind + token + CORS; **default-deny** external/destructive/spend; explicit same-user threat acceptance; injection = “treat as untrusted + force ask on side effects”; sandbox/keychain as hard Phase gates before shell/Hermes autonomy.

---

## Security / privacy risks

1. **Token file readable by same UID** — Highest practical hole relative to threat (2). Browser drive-by is mitigated; local agents, malware, and other Electron apps are not.

2. **Balanced auto write-local after untrusted input** — Classic injection path: poison a file/web page → model edits allowlisted code or exfil-shaped files without an ask.

3. **Remembered rules over-matching** — “Action pattern” without grammar/examples invites `*` rules that silently reclassify destructive/external-send.

4. **Redact “known” secret patterns only** — Novel tokens, provider session blobs in CLI output, and mail bodies in run records still land in logs/audit/export.

5. **Provider CLIs as egress** — “No provider tokens in JunOS” does not stop an approved (or mis-classified) tool call from leaking local data through a signed-in CLI.

6. **Audit export** — Exportable `event` stream of approvals and external actions is a privacy/sensitivity store; no handling guidance.

7. **Remote tunnel + same token** — Broadens blast radius of one leaked secret to any network path that reaches the tunnel.

8. **No sandbox until Phase 4** — Approval fatigue + mis-tap Approve becomes remote code execution on the laptop.

---

## UI / design-quality (skills lens)

Operate mode: one job, honest high-stakes copy, scanability, native expectations. Design-taste app screens: colour on status/meaning not chrome; settings as label+panel rows; destructive actions isolated with named confirmation; quiet motion (feedback only); no glass/blur on trust surfaces; density that shows the decision payload first.

### Hierarchy
- Security UX is scattered one-liners (Inbox approval, Settings rules, kill switch) with **no primary screen question** (“What am I about to allow?” / “What can agents still do?”). App-screens require the frequent/high-stakes job one click from the first view—undefined here.
- Approval content (“exact command/diff”) is the **hero data**; Approve/Deny are secondary. Spec doesn’t say command/diff leads, or that chrome stays quiet (~3% colour).

### Spacing / density
- Diffs and long shell commands will dominate; no max height, sticky action bar, collapse for huge diffs, or “show full” pattern → either unreadable walls or truncated commands (unsafe).
- Settings “visible and revocable” rules need a **list density** (pattern, project, class, last used, revoke)—not specified; risk of empty card grid or tiny unreadables.

### Typography
- Commands/diffs need a **monospace code treatment** (allowed for real code); body copy must stay full ink at ≥14px. Spec doesn’t separate “policy prose” vs “payload type.”
- Class labels (read / spend / destructive) need a small fixed type scale—not pill soup or tracked uppercase (taste bans).

### Contrast / colour
- Approve vs Deny vs “Approve and remember” need **one primary** and a clearly negative Deny; remember must not outrank Deny (common dark-pattern).
- Spend/destructive should use **semantic encoding** (hue on the class mark / consequence line), not rainbow badges or icon-in-tinted-square tiles.
- If the product shell goes “Translucent Glass” elsewhere, this doc never requires **opaque, high-contrast** surfaces for approval/kill—trust UI on glass fails contrast and legibility.

### Motion
- Kill switch and approval appearance need **immediate feedback**, not entrance theatre. Spec silent on `prefers-reduced-motion`, press states, and “stopping…” progress.
- No shimmer/pulse language here (good restraint) but also no required busy/stopped honest states.

### Legibility / states
- Missing: empty rules list, expired/failed pairing, denied-by-timeout, kill-switch confirmation that **names what stops**, offline daemon, redaction markers in the visible diff (“secret hidden”).
- “Exact command/diff” without wrapping, overflow, or phone layout → Operate failure on the surface that matters most.

### Cognitive load
- Three actions (Approve / Deny / Remember) plus scoped-rule implications is already near the decision-point ceiling; without a **preview of the rule that would be saved**, Remember is a blind commit.

---

## Priority fixes (if this doc is revised)

1. Resolve **token storage** (file vs keychain) and rewrite threat (2) mitigations for same-UID readers—or explicitly accept that risk.  
2. Make post-untrusted-content policy **default-ask for write-local and spend**, and drop or define “when avoidable.”  
3. Specify **approval UI** as an Operate surface: payload-first layout, one primary, Deny equal weight, Remember with rule preview, timeout/deny behavior.  
4. Define **kill switch** scope, placement, confirmation copy, and visible stopped state.  
5. Cap Phase scope: no shell autonomy / remember-for-destructive until sandbox + rule grammar exist.

Questions skipped: Ask mode review-only; no follow-up command menu.
