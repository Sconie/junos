**Verdict:** As a security/privacy contract, `12` is a sketch that undercuts its own threat model—especially auto write-local after untrusted content—and as Operate UI guidance it names surfaces (Inbox approvals, remembered rules, kill switch, pairing) without hierarchy, density, or high-stakes interaction design. Title promises privacy; the body barely defines it.

Mode lens: **Operate** for the product surfaces this doc commits to; **Read** for the doc itself (thin, claim-heavy, hard to implement without inventing UX).

---

### Contradictions (inside this doc)

1. **Threat #1 vs approval + injection rules.** Agents doing damage / leaking via prompt injection is the top risk, but `write-local` is **auto in Balanced**, and after untrusted content only `external-send` and `destructive` need approval. An injected “edit this file / rewrite this config / drop a webhook” path is left open by the same policy that claims to address injection.

2. **Threat #2 vs daemon auth.** Another local process calling the daemon is risk #2, but mitigations are loopback + bearer token in `~/.junos/token` (mode 600) + CORS/`Origin`/`Host`. Same-user processes skip CORS entirely; file mode 600 does not stop same-UID readers. The pairing URL that hands the UI the token is another local disclosure channel—undefined, so the threat and the control do not match.

3. **Credentials section vs open questions.** Normative: JunOS-owned secrets “go in the OS keychain.” Open question: keychain access from Node is unresolved. That is a contradiction between “shipped control” and “we don’t know how.”

4. **“No provider tokens” vs JunOS secrets.** Fine as a split, but the bold claim reads absolute while webhook/Hermes tokens are still secrets on disk/in keychain. Redaction of “known secret patterns” does not cover unknown or novel shapes—overclaimed relative to the mechanism.

5. **Title vs content.** “Privacy” is almost absent: no retention, deletion, provider prompt egress, local indexing of mail/files, or what leaves the machine when models run. This is a localhost threat-model note, not a privacy spec.

6. **Worktree safety with an escape hatch.** “Never directly on the main working tree, **unless set otherwise**” cancels the control without saying who can set it, how it’s shown, or whether it’s in the audit trail.

---

### Gaps

| Area | Missing |
|---|---|
| Pairing | How the one-time URL is shown, TTL, single-use, binding to UI origin, failure/re-pair, what if the browser is already compromised |
| Token lifecycle | Rotation, revoke, multi-UI, leakage via logs/crash dumps/devtools |
| Allowlists | How project folders are chosen, path traversal/`..`, symlinks, writes outside intent |
| Class boundaries | How shell, network, git, and “spend” are detected; misclassification = silent auto or endless prompts |
| Remembered rules | Pattern language, breadth limits, expiry, preview before save, conflict with Ask-first |
| Untrusted content | What “wrapped as data” means; when “when avoidable” fails; tool use mid-run after a tool already fetched untrusted data |
| Kill switch | Scope (all runs vs current), resume, in-flight tool side effects, visibility when not on Hermes |
| Audit | Who exports, redaction, retention, whether remembered-rule fires are logged |
| Privacy | Provider data flow, local corpora (mail/files), backups of secrets-adjacent data, wipe/uninstall |
| Remote | “Private network tunnel” with no auth beyond the same token; no device binding or UI for “you are exposed” |

---

### Unrealistic / deferred scope

- **Phase 4 sandbox** is listed as an open question while `destructive` / shell-outside-allowlist is “always ask.” Approval without a sandbox is a yes/no gate on an unbounded blast radius—fine as interim honesty, weak as the security chapter’s end state.
- **Remote access “if ever”** is waved off with “same token,” which is not a remote threat model.
- **Spend class** with no metering, provider, or UI for cost estimates will either never fire or false-positive constantly.
- Shipping **keychain-or-bust** while the Node approach is unknown blocks the credentials story in practice.

---

### Security / privacy risks (from what’s written)

1. **Prompt injection → auto write-local** is the sharpest hole: untrusted web/mail/file content can still drive allowlisted edits without a human gate.
2. **Token-on-disk + pairing URL** under a same-machine adversary model is weak; treat “localhost + CORS” as drive-by browser protection only, not local malware.
3. **“Approve and remember”** without a mandatory scope preview invites durable over-approval (broad shell/network patterns).
4. **Redaction by pattern** fails closed for novel secrets; audit/export can reintroduce them.
5. **No privacy boundary for model/provider subprocesses**—the real data exfil path for a localhost agent product—is outside the doc.
6. **Kill switch unspecified** risks a control that feels present but doesn’t stop the dangerous class of work (queued runs, child processes, Hermes bridge).

---

### UI / design-quality problems (impeccable Operate + tasteskill app-screens)

Surfaces implied: **Inbox approval items**, **Settings remembered rules**, **kill switch**, **first-run pairing**. All are high-stakes Operate UI; this doc only says they exist.

**Hierarchy & jobs**
- Approvals need one job: decide. “Exact command/diff” with Approve / Deny / Approve-and-remember is three jobs and unbounded content with no primary action hierarchy, no class-first headline (destructive vs spend vs send), and no “what happens if I approve” line.
- Kill switch is the product’s safety peak; “in the UI” with no placement fails Operate’s “always find the control for the job” and app-screens’ “most frequent/critical job one click from the first screen.” Adjacent product language elsewhere already implies always-visible Stop; this doc doesn’t own that.

**Density & legibility**
- Full diffs in an Inbox list/detail without progressive disclosure (summary → expand hunks → raw) will either truncate blindly or drown the decision. App-screen density wants scannable rows; security UX needs the *decision* above the *evidence*.
- Diff/command should be real monospace code blocks; meta (project, class, age) must stay in the UI face at readable size—not tiny tracked labels (house ban) and not `--text-dim`-only body (full ink for the decision text).

**Contrast & glass risk**
- Under the product’s Translucent Glass direction (frosted panels, dim text, violet accent), approval and kill-switch chrome is a legibility trap: long diffs on translucent panels, accent used as decoration, status by colour alone. Security surfaces need solid panels, full-ink primary copy, semantic colour on the *decision state*, and text/icon redundancy—not glass as the default substrate for irreversible actions.

**Spacing & settings**
- Remembered rules in Settings need a real settings composition: section title + consequence description, list of rules with scope readable at a glance, revoke as a destructive pattern (own section, consequence in words, confirm naming the rule)—none of that is specified. Empty state (“no standing approvals”) is missing.

**Motion**
- Operate budget: 150–250 ms state feedback only. Kill switch and approve must not choreograph; reduced-motion must keep controls visible. Doc is silent—easy to ship decorative motion on the one place that should feel mechanical and trustworthy.

**Cognitive load & copy**
- “Approve and remember” without an inline scope sentence (“Remember: write files under `proj/X` matching `…`”) fails clarify/harden. Keyboard approve (`a`) without a distinct confirm for destructive/spend is a footgun the security doc should forbid or require.

**Emotional journey (high stakes)**
- Peak-end for security moments: clear ask → evidence → calm primary → audible/visible result. Auto-deny timeouts, pairing failures, and kill confirmation are unmentioned valleys where trust breaks.

---

### Highest-leverage fixes (spec only)

1. After untrusted content in a run, **also gate `write-local` (and shell)**—or drop Balanced auto-write as the default.
2. Rewrite threat #2 mitigations for **same-UID** attackers (or demote that threat and say so).
3. Specify **pairing, kill switch, and remembered-rule UI** as Operate contracts: placement, copy, density of evidence, confirmations, empty/error states—not one-liners.
4. Add a real **privacy** subsection (what leaves the machine, retention, wipe) or rename the doc.
5. Resolve **keychain** before treating it as normative; until then, state the interim store and its risks.

---

Questions skipped: Ask-mode doc review; no live UI to score with the impeccable detector.
