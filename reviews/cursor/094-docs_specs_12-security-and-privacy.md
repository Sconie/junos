**Verdict:** As Operate-mode security surfaces (approvals, rules, kill switch, pairing), this doc names the right threat order but undercuts itself: the bearer token lives on disk while “all secrets go in the keychain,” CORS is sold as a local-process defense it cannot provide, and Balanced auto-write sits next to “prompt injection is #1.” UI for the high-stakes moments is almost unspecified.

Mode: **Operate** (approvals, settings, kill switch). Lens: impeccable Operate restraint + design-taste app-screen rules (quiet chrome, colour on meaning, one primary job, honest states, 150–250ms state motion only).

No PRODUCT.md / DESIGN.md in repo; review is from this file alone.

---

### Contradictions

1. **Keychain vs `~/.junos/token`.** Credentials: “Any JunOS-owned secret … goes in the OS keychain, never in SQLite, logs, or the repo.” Daemon access: random auth token stored at `~/.junos/token` (mode 600). That token *is* a JunOS-owned secret on disk—same class as a webhook token, with weaker recovery story than keychain.

2. **Threat #2 vs CORS as the fix.** Risks include “another local process … calling the daemon.” Mitigations emphasize Strict CORS + Origin/Host. CORS only constrains browsers; a local process with the token (or a bug that skips auth) is unaffected. Host/Origin checks help DNS rebinding in browsers, not arbitrary localhost clients. The real control is the bearer token—and that file is the weakest link.

3. **Prompt-injection #1 vs Balanced auto write-local.** Injection is the top risk. Classification still defaults `write-local` to **auto in Balanced**, and injection section only forces approval for `external-send` and `destructive` after untrusted content—not for write-local. Classic path: untrusted mail/web → model → silent edits in allowlisted folders.

4. **“Always ask” vs “Approve and remember”.** Spend / external-send / destructive are “always ask,” then remembered scoped rules can skip asks. Unstated whether remember can cover those classes, how broad “action pattern” is, or whether “always” still applies after a rule exists.

5. **Worktree safety vs “unless set otherwise.”** Data safety: Hermes/workflows use a branch/worktree, “never directly on the main working tree, unless set otherwise.” The escape hatch empties the guarantee; no UI/consent for that override.

6. **Localhost-only threat model vs remote access.** Framing is single-user localhost, then “Remote access, if ever: private tunnel + same token.” Same token over a tunnel widens theft impact; threat model isn’t updated (no tunnel compromise, no multi-device pairing).

7. **“No tools while reading untrusted content when avoidable.”** Hedge + later “tool calls that follow … require approval” for only two classes leaves read/write-local after tainted context as the default path. Soft language vs hard threat ranking.

---

### Gaps (product + UI)

- **Pairing URL:** one-time how? TTL? What if the UI can’t open it? Replay? Display of token material in logs/crash reports?
- **Token lifecycle:** rotation, revoke-all, multi-UI clients, behavior when `token` file is copied or mode bits are wrong (esp. Windows ACLs—`600` is a Unix story).
- **Desktop “UI origin”:** webview / custom scheme / `null` Origin often break “Strict CORS to the UI origin”; unbound.
- **Approval lifecycle:** timeout while user is away, queue vs deny, queue of in-flight tool mid-run, batching, queue of “remember” rules that already fired.
- **Kill switch:** stops runs only, or also disables daemon accept / clears token / blocks new sessions? Survives restart? Visible where?
- **Scoped rules UI:** “visible and revocable in Settings” with no list fields, conflict resolution, or audit of which rule auto-approved what.
- **Audit export:** format, retention, who can read `event`, whether exports include secrets/diffs.
- **Sandbox:** open question Phase 4 while shell-outside-allowlist is ask-only—approval ≠ isolation.
- **States:** pairing failed, token missing, keychain unavailable, backup failed, redaction miss, approval queue while offline—none specified (Operate expects these first-class).
- **Phone / a11y:** kill switch and approve/deny on small screens; keyboard path for diff review; focus order—absent.

---

### Unrealistic scope

Thin page, heavy claims:

| Claim | Why it’s heavy |
| --- | --- |
| Prompt-injection hardening (wrap as data, tool gating, class-based ask) | Needs a real agent runtime contract, not a paragraph |
| Policy engine (“Approve and remember”, project + pattern, Settings CRUD) | Full authorization product |
| Keychain + redaction + exportable audit | Cross-cutting infra |
| CORS/Host rebinding defenses + optional remote tunnel | Network threat model beyond “localhost” |
| Nightly backup + run caps + worktrees + kill switch | Ops + UX + SCM safety |

v1 that matches the threat model is closer to: localhost bind + keychain (or equivalent) token + **Ask-first default for write-local after any untrusted input** + explicit approve/deny Inbox + kill switch + audit of externals—defer remember-rules, remote tunnel, and Phase-4 sandbox *as named non-goals* until the ask path is solid.

---

### Security / privacy risks

- **Token file as ambient authority:** any process that can read `~/.junos/token` owns the daemon; mode 600 doesn’t help other local users/admin malware/backups syncing that path to cloud.
- **Auto write-local after untrusted content:** highest practical injection → data-loss/leak path in this doc.
- **Remembered rules:** over-broad patterns (“any `git` in project X”) become standing external-send/destructive capability.
- **Redaction by “known secret patterns”:** false negatives (new token shapes, provider env names, paste in diffs); false sense of safe logs/exports.
- **Provider CLIs hold creds, but JunOS drives them:** tool output and prompts can still exfiltrate; “we store no passwords” ≠ “we can’t leak them.”
- **Approvals show “exact command/diff”:** diffs themselves may contain secrets; Inbox + `event` become a second secret store unless redacted/truncated.
- **No sandbox until Phase 4:** “always ask” for shell outside allowlist still runs with user privileges after one mis-tap.
- **Remote tunnel + same token:** phishing/mis-share of tunnel URL ≈ full daemon access.
- **Backup (02) + exportable audit:** retention and encryption of backups/exports unspecified here—privacy hole if backups are plain copies of DB + events.

---

### UI / design-quality problems (hierarchy, density, type, motion, legibility)

Implied surfaces: Inbox approval items, Settings rule list, kill switch, pairing.

1. **No one question for the approval viewport.** App-screen rule: answer the job first. Spec says “exact command/diff” but not what dominates: risk class, target project, or the diff. High-stakes Operate screens need class + blast radius in the first scan line, then the artifact—not a wall of diff with peer Approve / Remember / Deny.

2. **“Approve and remember” as equal sibling to Approve.** Error-prevention fail. Remember should be progressive disclosure (secondary, confirm scope: project + pattern preview), not a third same-weight button. Cognitive load: >2 equal irreversible actions on one item.

3. **Kill switch unspecified in chrome.** For threat #1, it must be shell-level, always reachable, unmistakable—not buried in Settings. Spec never places it; implementers will hide it. Colour budget: one semantic danger treatment, not a red pill farm.

4. **Class table is policy, not UI vocabulary.** Five classes need scannable labels in Inbox (“Spend”, “External”, “Destructive”) in full ink—not tiny uppercase chips / badge eyebrows (taste + impeccable ban on tracked caps as chrome). Soft grey for the command body kills legibility when it matters most.

5. **Diff / command density.** Operate: monospace only for real code/commands; tables/rules not card stacks. Unspecified → likely card-per-approval + shadow/glow “security” chrome (app-screen ban: shadows at rest, colour on chrome). Prefer flat list, tone step, command in one block, diff scroll with sticky action bar.

6. **Settings “scoped rules” with no density target.** Risk of KPI-like rule cards, icons in tinted squares, or rainbow class dots. Quiet list: pattern, project, last used, revoke—one primary revoke control.

7. **Pairing / first-run.** No teaching empty state for missing token or failed pair. Operate empty states teach the affordance (“Open pairing from the app”), not “Unauthorized.”

8. **Motion.** No budget. Don’t choreograph approve success; 150–250ms state feedback on kill (running → stopped) and on rule revoke. Reduced-motion: content stays, travel drops.

9. **Contrast for Balanced vs Ask-first.** Mode switch is a safety control; if it looks like a decorative segment control with muted labels, users won’t know write-local is auto. Mode name + one sentence consequence in ink at settings and on first auto-write (or never auto after untrusted).

10. **Hierarchy collision: Inbox item vs Chat vs Settings.** Approvals are “Inbox items” but this doc doesn’t say whether the diff lives in-thread or as a blocking sheet. Blocking modal-as-first-thought is Operate laziness; inline in Inbox with sticky actions fits better—and should be stated.

---

### Highest-leverage fixes (spec-only)

1. Put the daemon token in the same secret store as other JunOS secrets (or explicitly carve it out and justify disk + ACL/rotation/revoke). Stop implying CORS stops local processes—token + bind address only.  
2. Align injection #1 with policy: after untrusted content in a run, **write-local asks too** (or force Ask-first until trust boundary is clear); define whether “remember” can cover external/destructive/spend.  
3. Specify approval UI hierarchy (risk line → artifact → Approve / Deny; Remember behind confirm + scope preview) and kill-switch placement/behavior.  
4. Close worktree and remote-access hedges with consent + threat-model updates, or cut them from v1.  
5. Add pairing/token/keychain failure states and audit/export retention; mark Phase-4 sandbox as required before auto shell, not only “open questions.”

I only reviewed this file; I didn’t cross-check 02/03/07. If you want the same pass against Inbox/approvals or credentials-in-03, say which docs to include.
