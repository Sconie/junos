**Verdict:** The threat model and localhost daemon story are directionally sound, but the approval vs prompt-injection rules conflict, the UI surfaces that carry trust (approvals, kill switch, remembered rules) are underspecified for Operate-mode craft, and several “mitigations” are weaker than the doc implies.

Lens: **impeccable** Operate/Read (task clarity, high-stakes reassurance, motion restraint) + **design-taste-frontend** app screens (inbox/settings: colour on decisions, density, honest states, no chrome theatre).

---

### Contradictions

1. **Prompt injection vs write-local auto**  
   Injection says tool calls after untrusted content need approval for *external-send* and *destructive* only. Approval policy makes **write-local auto in Balanced**. An injected “edit this allowlisted file” can therefore land without a human gate—the main threat (1) is only half-covered.

2. **Same-user vs “another local process”**  
   Risk (2) is another process calling the daemon, mitigated by a bearer token in `~/.junos/token` (mode 600). Any process running as the same user can read that file. The model treats “other process” as outsider; on a single-user desktop it’s usually **same principal**.

3. **Threat model vs “remote access, if ever”**  
   Framed as single-user localhost, then casually opens private-network tunnel + token. That expands the trust boundary (LAN, tunnel software, URL leakage) without updating risks (2)–(3).

4. **“No tools while reading untrusted content when avoidable”**  
   Softened by “when avoidable,” so the hard rule is optional. Elsewhere approvals are absolute (“always ask”). Trust story is inconsistent.

5. **Credentials split**  
   “JunOS stores **no** provider passwords or tokens” vs JunOS-owned secrets in the keychain. Fine if “provider” means Claude/OpenAI CLIs, but the absolute wording fights the next bullet and invites implementers to put bridge/webhook tokens in SQLite “temporarily.”

---

### Gaps / unrealistic scope

| Area | Gap |
|---|---|
| Pairing URL | One-time mentioned; no TTL, single-use enforcement, binding to UI origin, or what happens if the URL is bookmarked/logged/leaked in history. |
| Token | Entropy, rotation, revocation on logout/reinstall, migration when `~/.junos` is restored from backup. |
| UI origin / CORS | Undefined for Electron, Tauri, or `file://` / custom scheme—where “strict CORS to the UI origin” actually points. |
| Action classes | Missing: network fetch, package install, env/credential read, clipboard, screenshot, opening URLs, MCP/tool install. |
| Allowlists | Who defines project folders; how path traversal / symlink escape is treated; “shell outside allowlist” vs shell *inside* with `rm -rf`. |
| Diff/command honesty | Approvals show “exact command/diff”—no truncation, folding, binary, or multi-file rules (classic place attackers hide). |
| Remembered rules | Pattern language, breadth limits, TTL, conflict resolution, audit of rule hits—only “visible and revocable.” |
| Kill switch | Scope (all runs vs current), persistence, resume, confirmation—name only. |
| Redaction | “Known secret patterns” is inherently incomplete; no mention of provider request bodies, embeddings, or backup copies. |
| Prompt injection | Wrapping + selective approvals is a research-hard problem sold as a short policy; no evals, no fail-closed default for Balanced. |
| Phase 4 sandbox | Shell sandbox deferred while destructive is “ask only”—human fatigue becomes the control. |
| Open questions | Keychain choice and sandbox sit as unresolved while the rest reads shippable. |

Unrealistic for an early product: implying prompt-injection is “handled,” and relying on perpetual high-quality human review of every external/destructive action without rate limits, batching rules, or fatigue design.

---

### Security / privacy risks (called out by the doc itself)

- **Token file = session key** for any same-user malware, installer, or curious script; pairing URL is a second leak channel (browser history, screenshots, shared screen).
- **CORS/Origin/Host** help against drive-by pages; they do not stop a local binary that already has the token.
- **Balanced + injection → silent local writes** (see contradiction 1): data integrity / exfil staging without an Inbox item.
- **Approve and remember**: over-broad patterns become standing bypasses of “always ask” classes if patterns can match external-send/destructive/spend.
- **Logs/run records**: redaction gaps + nightly DB backup (02) can rehydrate secrets outside keychain.
- **Audit export**: “exportable” with no sensitivity class, destination, or whether exports include prompts/tool args (privacy surface for the single user and anyone with disk access).
- **Providers**: “no tokens in JunOS” doesn’t address **prompt content** (mail, files, web) leaving the machine—privacy risk (1) adjacent, unstated.
- **Remote tunnel “if ever”**: expands attacker set without authn beyond the same long-lived token.

---

### UI / design-quality problems (surfaces this doc implies)

These are **Operate / app-screen** surfaces: Inbox approvals, Settings rules, kill switch. The doc names them but does not specify craft; from the skills that omission is itself a product risk—high-stakes UI defaults to generic chrome.

**Hierarchy & job**  
Approval item’s job is decide under risk. Spec only says “exact command/diff.” Missing first-screen hierarchy (app-screens §2): **risk class → what changes → why now → primary action**. Without that, Inbox rows become another queue of same-weight cards.

**Colour on decisions, not chrome**  
Classes (read / write-local / external-send / destructive / spend) need **semantic ink on the decision**, not badge chrome. Spend and destructive should read differently from read at a glance; soft grey everything fails the “restraint hid meaning” warning.

**Density & legibility**  
Diffs/commands need monospace (allowed for real code), tabular alignment, truncation policy with “show full,” and enough row pitch that a two-line summary + class doesn’t collide (lists: ~40–44px for two-line). Unspecified → either wall-of-text or truncated traps.

**Contrast**  
Risk labels, secondary “remember” copy, and diff context often ship as low-contrast grey. Running explanation of the action must stay in **full ink**; grey only for metadata (time, project).

**Spacing / composition**  
“Approve and remember” beside Approve/Deny is a classic consent-fatigue layout. Skills want **one primary job**: Approve / Deny first; remember as a progressive, scoped step (project + pattern preview), not a third equal button.

**Settings rules**  
“Visible and revocable” is not an IA. Needs list of rules with **pattern, project, class, last used, revoke**—flat settings dump becomes un-auditable. Empty state should use product language (“No standing approvals”), not “No items.”

**Kill switch**  
Must be findable under stress and hard to hit by accident: confirm or two-step, clear “everything stopped” state, no decorative motion. Operate motion: **150–250ms state feedback only**—no choreographed panic animation.

**Pairing / first run**  
One-time pairing URL is a security ceremony; UI needs plain copy (what the token is for), failure states (expired/used), and no glass/pill theatre. If this is onboarding, treat as harden/onboard: errors and i18n matter more than delight.

**Motion**  
Approvals and kill switch: state change only. No entrance theatre that delays the diff. `prefers-reduced-motion` still shows the command and buttons.

**What’s missing as specified UI**  
Loading/empty/error for pending approvals; deny reason optional; timeout if user walks away; how multi-file diffs present; whether spend shows **estimated cost** (colour/data that earns the spend class).

---

### Priority fixes (doc-level)

1. **Close the injection hole:** after untrusted content, require ask (or deny) for **write-local** too in Balanced—or drop “auto write-local” when the run ingested untrusted data.  
2. **Rewrite threat (2)** as same-user token theft + drive-by without token; say what the token *doesn’t* stop.  
3. **Specify approval UI contract:** hierarchy, class semantics, full-vs-truncated diff, Approve / Deny / remember-as-follow-up, kill-switch behavior.  
4. **Bound “remember”:** cannot widen external-send / destructive / spend without re-prompt; show pattern preview before save.  
5. **Either delete or fully threat-model “remote access, if ever.”**  
6. **Replace weasel words** (“when avoidable,” “known patterns”) with fail-closed defaults and explicit Phase gates for keychain + sandbox.

---

Questions skipped: Ask mode / doc-only review—no rendered UI or detector run. Switch to Agent mode if you want this written into `reviews/cursor/126-…` or the spec patched.
