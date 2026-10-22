**Verdict:** The threat model is clear and localhost-first, but the doc undercuts itself on secrets storage, prompt-injection coverage, and escape hatches—and it barely specifies the high-stakes **Operate** surfaces (approvals Inbox, remembered rules, kill switch), so UI risk is mostly “underspecified dangerous defaults.”

---

### Contradictions

1. **Where secrets live**  
   “Any JunOS-owned secret … goes in the OS keychain” vs the daemon token in `~/.junos/token` (file, mode 600). That token *is* a JunOS-owned secret; the file path contradicts the keychain rule.

2. **Threat model vs remote access**  
   Framed as “single user, localhost,” then “Remote access, if ever: private tunnel + same token.” Same auth story for a different threat surface (LAN, tunnel misconfig, shared machine) with no updated model.

3. **Prompt injection vs approval table**  
   Injection section only forces approval for **external-send** and **destructive**. Table already marks **spend** as always-ask and **write-local** as auto in Balanced. Injected content can still drive file edits (and possibly spend) without the injection rule requiring a gate. “When avoidable” for tool-less reading is a second soft contradiction of “untrusted = data.”

4. **Worktree safety vs “unless set otherwise”**  
   “Never directly on the main working tree, unless set otherwise” makes the safety control optional without saying who may flip it or how the UI makes that risk obvious.

---

### Gaps (security / product)

- **Pairing URL:** one-time how? TTL? who can open it? browser history / logs / screenshots? what happens after use?
- **Token lifecycle:** rotation, revoke-all, leak response, multi-client UI.
- **UI origin:** CORS/Origin/Host assume a stable origin; Tauri/`app://`/`localhost` ports need an explicit rule.
- **Shell allowlist:** destructive = “shell outside allowlist”; no definition of inside-allowlist shell, cwd, network, env, or timeout.
- **Spend:** how cost is detected (API vs agent claim); partial spends; provider billing lag.
- **Provider data plane:** no threat for secrets in prompts/logs sent to third-party CLIs (threat list stops at local leak / agent actions).
- **Backups:** nightly DB backup cited; encryption, location, retention, restore, and whether backups include redacted-or-not run text are missing.
- **Audit export:** format, who can export, whether exports can contain secrets that redaction missed.
- **Kill switch:** stops new runs only vs cancels in-flight; survives restart; confirmation; accidental hit.
- **Open questions** leave keychain *and* Phase-4 sandbox unresolved while Balanced auto-write and shell already exist in the policy table—implementation order vs risk is undefined.

---

### Unrealistic / thin scope

- Prompt-injection hardening (“wrap as data,” strip tools, class-gated tool calls) is a research-grade control set compressed into one paragraph with no failure modes (model ignores wrapping, tool calls smuggled in “read,” multi-step laundering via write-local → later external-send).
- “Redact known secret patterns” is acknowledged-incomplete by nature; no “assume breach of logs” posture.
- Sandbox deferred to Phase 4 while destructive/shell and auto write-local are in the default policy now → **policy ahead of containment**.

---

### Security / privacy risks (highest first)

| Risk | Why it matters |
|---|---|
| Balanced **auto write-local** + weak injection gate | Highest practical blast radius on a coding agent: silent project mutation from untrusted mail/web/file text. |
| Auth token on disk, not keychain | Readable by same-user malware/other local processes; conflicts with stated secret policy. |
| Shell without sandbox (until P4) | “Ask” is the only brake; approval fatigue → rubber-stamping. |
| Pairing URL unspecified | Classic local-daemon footgun: anyone who can hit the URL once owns the bearer. |
| CORS/Host as sole web lock | Necessary but insufficient alone; needs binding to token + loopback + explicit no-LAN bind forever (or a real remote model). |
| Worktree escape hatch | One setting reintroduces main-tree destruction, the core “agent destructive” threat. |
| Redaction-only log privacy | Unknown patterns (new API keys, cookies, private URLs) still land in `event` / exports / backups. |

---

### UI / design-quality (Impeccable **Operate** + tasteskill **app screens**)

These surfaces are implied, not designed. Against Operate / app-screen rules:

**Hierarchy & jobs**  
Approvals are “Inbox items” and the kill switch is a one-liner. For a security product moment, the **pending high-risk decision** and **stop everything** should be first-class jobs (one click from the place you work), not buried in a general Inbox or an unnamed chrome control. App-screen rule: the frequent/critical job is on the first screen; colour on the *decision*, not chrome.

**Density & legibility**  
“Exact command/diff” with no layout: risk of a monospace wall, weak scan path (what? where? irreversible?). Need a fixed hierarchy: **class + blast radius → target path → short summary → expandable diff**. Running text in full ink; secondary meta quiet—not a grey sea of logs.

**Cognitive load**  
Five classes × Balanced/Ask-first × “Approve and remember” scoped rules is a lot of policy with almost no Settings IA: how patterns are shown, edited, conflicted, or explained in plain language. Settings should answer one question per panel (“What can run without asking in this project?”), not dump a rule table.

**Emotional journey (high stakes)**  
Approve/deny needs peak reassurance: scope of remember, what won’t be auto-allowed, easy revoke. Kill switch needs calm, irreversible-feeling affordance without drama-slop (no pulsing red hero, no badge stack).

**Copy / clarify**  
Missing deny, timeout, stale approval, “agent already continued,” and remember-rule explanations. Security UX fails on ambiguous verbs (“Approve and remember” remember *what*?).

**Motion**  
Unspecified. For Operate: feedback on approve/deny/kill only; transform/opacity; **mandatory `prefers-reduced-motion`**. No entrance theater on destructive confirms.

**Contrast / states**  
No specified treatment for risk class (read vs spend vs destructive), blocked vs waiting, remembered vs one-shot. Colour should mark **decision severity on the row**, not tint the whole shell. Avoid generated tells: pill “NEEDS APPROVAL” eyebrows, icon-in-tinted-square security cards, monospace labels as decoration, hairline “audit” dashboards.

**Spacing / typography**  
No type scale or density target for Inbox approval rows vs Settings rule list. App screens want quiet type (~body primacy, small titles), tight repeated rows, not a marketing hero over “Security.”

---

### Priority fixes for the doc itself

1. Resolve **token vs keychain** (one rule).  
2. Align **prompt-injection gates** with **write-local** and **spend** (or explicitly accept auto-write after untrusted input and call that out in the threat model).  
3. Specify **pairing**, **kill switch**, and **approval row IA** enough to implement without inventing dangerous UX.  
4. Remove or tightly govern **“unless set otherwise”** / **“when avoidable.”**  
5. Tie **sandbox** to any auto or ask-approved shell story, or narrow shell until Phase 4.

---

Questions skipped: Ask-mode doc review only; no live UI or detector run (`Questions skipped: target is a markdown spec, not a viewable surface`).
