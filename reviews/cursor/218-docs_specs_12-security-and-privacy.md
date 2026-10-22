Context loading did not run; I reviewed the doc as committed and applied **impeccable Operate** + **design-taste app-screen** rules directly (no PRODUCT.md/DESIGN.md in the repo).

**Verdict:** The gateway/digest/CAS model is a strong spine. The weak spots are “Stop always works,” spend classification, CLI dual-path enforcement, Windows process kill, backup vs delete, and an Approval UX that over-promises sameness across channels without hierarchy, density, or safe defaults.

---

### Contradictions

1. **Invariant 3 vs Stop** — “Stop always works” conflicts with Hermes `unreachable` / “stop not confirmed.” Either redefine the invariant (“Stop is always *attempted* and state is always honest”) or drop the absolute wording.

2. **Opening claim vs Execute** — Revision note says approvals are enforced by JunOS’s layer, not the agent. Execute still allows CLI “ask-through” and “deny” flags, with gateway routing only “where the CLI supports a hook.” That reintroduces a second authority path.

3. **Untrusted-content rule vs remembered approvals** — Fresh approval for external-send/destructive “even if a remembered rule matches” is mostly dead letter: remembered rules are already banned for those classes. **Spend** is omitted from the fresh-approval sentence.

4. **“Shown identically” (Inbox / Hermes / Telegram / chat)** — Same fields is fine; identical *component* on Telegram is not. Diffs, irreversible callouts, and focused keyboard approve/deny do not fit chat bubbles without truncation or a different layout—which then contradicts “identical.”

---

### Gaps

| Area | What’s missing |
|---|---|
| **Spend** | Are model/API token costs “spend”? If yes, every call asks (unusable). If no, money leaves without the invariant. |
| **Shell class** | “Shell outside allowlist” = destructive; shell *inside* allowlist is undefined. One approved `bash` is a blank check. |
| **write-local in Balanced** | Auto-allow edits with no ask: secret writes, mass overwrite, then a later push ask. |
| **Normalized patterns** | Remembered `{normalized argument pattern}` with no over-broad / collision rules. |
| **Approval UI truncation** | Diff/command can hide malice if clipped; no “show full / hash of full” rule. |
| **Telegram approver identity** | Audit logs “who approved (Inbox/Telegram)” but not how Telegram proves Jonas (beyond bot replies to his ID elsewhere). |
| **Delete vs backups** | Primary delete is thorough; 14-day backups retain deleted content—undeclared privacy residual. |
| **Platform** | Process-group kill + 5s grace is Unix-shaped; you’re on Windows—Job Objects / tree kill unspecified. |
| **Open spikes** | Keychain + sandbox still open while the whole Execute trust model depends on them. |
| **Wrapping “as data”** | Prompt-injection mitigation is aspirational without a concrete envelope format. |

---

### Unrealistic scope

- Full side-effect gateway **plus** per-CLI constrain/hook/sandbox **plus** read-only fallback **plus** Hermes trust split, while sandbox/keychain are still Phase 0 questions.
- Per-project OS user/container on a single-user desktop machine is heavy vs “worktree + deny flags.”
- “Tool use disabled while reading untrusted content *where possible*” is an escape hatch that can swallow the control.
- Pixel-identical approval UI on Telegram + desktop Inbox.

---

### Security / privacy risks

1. **Approved shell / script = unbounded** — Digest binds args, not transitive effects.
2. **CLI not fully hooked** — Runs read-only *or* with vendor ask-through; either leaks capability or splits policy.
3. **Balanced write-local allow** — Quiet local damage and staging of exfil before an external-send ask.
4. **Stop on remote** — User may believe kill worked; UI string alone is easy to miss (see UI).
5. **Pairing code + `~/.junos/token`** — Local malware / other users; expected for single-user, but threat (2) needs “other local process” mitigations beyond bind + cookie.
6. **One-off provider send** — Social-engineering bypass of the allowlist; needs very explicit confirmation copy (channel + model + what leaves).
7. **Remote images on click** — Tracking/exfil on load; no proxy/strip mention.
8. **No at-rest encryption** for SQLite/state (optional for single user, still a gap vs “private context”).
9. **Hermes → JunOS actions** — Advisory Hermes approvals are good; ensure Telegram cannot be used as a confused-deputy approve channel without digest + Jonas auth.

---

### UI / design quality (Operate + app-screen lens)

Approval UX is the only real UI section; it reads like a field checklist, not an Operate surface.

**Hierarchy** — Actor, exact action/diff, target, project, expiry, irreversible dumped as peers. Squint test fails: nothing leads. For irreversible actions, **Deny / safer path should lead**; Approve must not be the only filled accent (app-screens: colour on the decision that matters; Operate: accent on primary carefully).

**Density** — Diffs in Inbox vs Telegram need two compositions (detail pane vs summary + “open full”). Forcing one density guarantees either unreadable walls or truncated attacks.

**Typography** — Commands/diffs should be one monospace block (allowed for real code); labels sentence-case, not tracked caps/eyebrows. No type scale: title vs meta vs body vs diff.

**Spacing / layout** — No list vs focused detail structure beyond “shortcuts only in focused detail.” Good instinct; missing: sticky action bar, irreversible block separation, meta as secondary tone step (not hairline cards/shadow stacks).

**Legibility / contrast** — No rule that irreversible + expiry stay full ink / high contrast; “stop not confirmed” is easy to style as muted grey (app-screens warn: restraint must not hide meaning). Provider-fallback “notice in the message header” risks competing with message content or disappearing into chrome.

**Motion** — Stop state machine (`stop requested → cancelling → stopped`) needs **state motion only** (150–250ms, Operate)—progress on cancelling, honest terminal state—not choreography. Approval appear should not hide content if motion fails (`prefers-reduced-motion`).

**States (missing entirely)** — Empty / loading / expired / consumed / denied approvals; unreachable Stop; read-only CLI badge. App-screens: honest states, words of the trade (“Stop not confirmed — Hermes unreachable”), one obvious next action.

**Cross-channel** — Prefer **same information contract**, different layout: desktop = focused detail + keyboard; Telegram = short digest + link/deep-link to full action; never pretend one component.

**Settings (remembered rules)** — “Listed and revocable” only. Needs scanability: project, pattern, class, expiry, uses left—not a card grid of identical tiles.

---

### Highest-impact fixes (spec only)

1. Rewrite Stop invariant to match remote honesty; specify Windows kill semantics.  
2. Define **spend** (and whether LLM calls count).  
3. Classify in-allowlist shell; warn that one approval ≠ contained blast radius.  
4. Replace “identical component” with “identical decision fields + channel-appropriate layout.”  
5. Specify Approval detail hierarchy: irreversible first, full-or-hashed action body, Approve as secondary for destructive/spend.  
6. Close CLI path: no ask-through that bypasses digest CAS; unconstrained = read-only only.  
7. Declare backup retention as a privacy exception on delete.  
8. Add ambient trust UI: autonomy level, read-only agent, provider allowlist—quiet chrome, meaning in type/colour on the exception.

I did not open other specs (including 14); review is scoped to this file only. Switch to Agent mode if you want proposed redlines in the markdown.
