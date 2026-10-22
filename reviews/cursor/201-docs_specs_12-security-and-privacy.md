**Verdict:** Revision 2’s gateway model is coherent and stronger than “trust the CLI,” but the doc still under-specifies the hard enforcement boundary for CLI-backed agents, treats multi-channel approval UX as identical when that is not realistic, and leaves several high-stakes UI decisions (hierarchy, density, contrast, irreversibility) to a shared component in 14 without enough Operate/app-screen constraints.

Lens: **impeccable Operate** + **design-taste app screens** (security surfaces are work screens, not marketing). No PRODUCT.md/DESIGN.md in repo; no rendered UI to score—this is a **spec** critique only.

---

### Contradictions (within this doc)

1. **Enforcement story vs CLI reality**  
   Lead claim: approvals are enforced by JunOS’s execution layer, not CLI output. Later: for CLI-backed agents, JunOS sets the CLI’s own deny/ask flags, optional hooks/MCP, and if unconstrained → read-only. Those are still partly *trusting or degrading the agent*, not “gateway performs the action.” That tension is the central unfinished architectural fight in the doc.

2. **“Single-use” vs release-back-to-`approved`**  
   Compare-and-set `approved → consumed` is solid; allowing release back to `approved` when “no side effect occurred” reopens the same approval. Proving zero side effect for shell/network is not defined, so this fights the single-use invariant in practice.

3. **Untrusted-content override incomplete vs invariants**  
   After untrusted content, fresh approval is required for external-send and destructive even if a remembered rule matches. **Spend** (and auto-allowed **write-local** in Balanced) are omitted. Invariants treat spend like destructive; Balanced write-local is the main injection→damage path the override does not harden.

4. **“Shown identically” vs channel physics**  
   Approval UX must be identical in Inbox, Hermes console, Telegram, and chat, including exact action/diff and keyboard shortcuts only in a focused detail view. Telegram cannot host the same detail chrome, full diffs, or focused keyboard model without a different information architecture. “Identical” contradicts the rest of the channel list unless identical means “same fields, adapted layout” (not stated).

5. **`Secure` cookie vs local daemon**  
   Cookie is `Secure` when over TLS; daemon is `127.0.0.1` (typically cleartext HTTP). Fine for localhost, but “remote access = tunnel + same session auth” does not require TLS on the browser hop, so `Secure` may never apply when it matters most.

---

### Gaps

| Area | Missing |
|---|---|
| Allowlists | What paths/hosts/repos count as allowlisted; whether `.env`, hooks, credential paths are write-local or destructive |
| Spend detection | How “costs money” is classified for opaque tool/API calls |
| Egress audit | What is logged when context leaves the machine (tokens/refs vs content); how Jonas reviews it |
| Prompt injection | “Wrapped as data” + disable tools “where possible”—no rule when tools cannot be disabled mid-run |
| Approval authenticity | How Telegram/Hermes approval cryptographically binds to `action_digest` (anti-replay, anti-spoof) |
| Pairing | Threat from another local process racing the printed one-time code |
| Deletion honesty | Residual copies in the 14-day backups (and any OS/provider caches) not called out as expected residual risk |
| Windows Stop | Process-group kill + grace period is Unix-shaped; no Windows job-object / tree-kill semantics |
| UI states | Loading/error/empty for approvals, remembered rules, stop-not-confirmed, provider-fallback notice—almost none |
| A11y | Contrast, non-color-only approve/deny, focus order, diff legibility—unmentioned |

Open questions correctly flag keychain + sandbox; until those land, several “invariants” are aspirational.

---

### Unrealistic scope

- One gateway that *itself* executes (or fully interposes) every side effect from every CLI/agent ecosystem.
- Bit-identical approval UI across desktop Inbox and Telegram.
- Reliable “failed-before-start ⇒ no side effect” for arbitrary tools.
- Perfect purge across primary rows, events, run output, FTS, and embeddings while still keeping useful audit trails.
- Constraining third-party CLIs with “hooks where supported,” else permanent read-only—product pressure will push that boundary.

---

### Security / privacy risks (as written or underspecified)

1. **Balanced write-local = allow** after injected instructions is the highest practical risk; the untrusted-content clause does not force ask for write-local.  
2. **Remembered rules on “normalized argument pattern”**—over-broad patterns become standing write authority.  
3. **CLI cannot be constrained → read-only** is safe; the dangerous middle is “partially constrained” (flags set, stdout not trusted, but tools still execute locally).  
4. **Hermes advisory approvals**—correct that it cannot self-approve; a compromised Hermes can still **shape** ask prompts to social-engineer Jonas.  
5. **Telegram as approval channel**—phishing, truncated command display, and approval without full irreversible context.  
6. **“Local first”** only covers storage; marketing/UX of that phrase can still mis-set privacy expectations when files/summaries go to providers.  
7. **Secret redaction of “known patterns”** fails open for novel secrets.  
8. **Remote images click-to-load**—if JunOS fetches the URL, SSRF/exfil risk unless fetch is tightly bounded (not specified).  
9. **Backup retention** quietly preserves deleted conversation/index content for up to 14 days.  
10. **Release-to-approved** and retry-needs-new-approval are in tension under concurrency/TOCTOU unless the transaction story is tighter.

Strong pieces worth keeping: digest-bound single-use approvals; deny wins; unknown tool = destructive; localhost bind + Host/Origin; CSRF; HttpOnly + SameSite; no raw token in URLs/localStorage/logs; Hermes as separate trust zone; Markdown/HTML/CSP/iframe preview rules.

---

### UI / design quality (Operate / app-screen lens)

The only concrete UI contract is **Approval UX requirements** plus Stop copy, fallback notice, kill switch, Settings revoke. Against hierarchy / spacing / type / density / motion / legibility / contrast:

1. **Hierarchy** — Required fields are a flat list (actor, action/diff, target, project, expiry, irreversible). No primary decision stack (e.g. irreversible consequence → plain-language action → target → evidence/diff → metadata). App-screen rule: answer the one job first; this reads as an audit dump, not a decision surface.

2. **Density** — “Exact … diff” with no max height, progressive disclosure, or summary-first pattern. High risk of monospace walls in Inbox and unreadable truncation on Telegram. No list-row content rules (what a row may show so it cannot look safer than the detail).

3. **Typography** — No split between **chrome** (product UI face, sentence case) and **payload** (real command/diff in monospace). Tasteskill allows mono only for real code; without that split, implementations drift to mono labels/chips (banned tell) or body-size diffs that fail scanability.

4. **Spacing / composition** — “One shared component” + four channels pushes either a desktop-sized card into Telegram or a cramped card on desktop. No phone/Telegram composition of its own (app-screens: phone is its own layout).

5. **Legibility & contrast** — Diff/approval and “what is irreversible” need explicit contrast and structure (headers, separate irreversible callout). Fallback provider notice “in the message header” is likely small/secondary type—privacy-critical signal in the weakest hierarchy slot.

6. **Motion** — Stop’s `cancelling → stopped` and kill switch need **state feedback**, not animation theater. Spec is silent on reduced motion, whether approve/deny animate, and avoiding attention-stealing motion on security chrome (app screens: colour/motion on the decision, not decoration).

7. **Emotional / high-stakes UX (impeccable)** — Irreversible actions need calm confirmation patterns (disable double-submit, clear Deny dominance or equal weight, no sneaky “Approve and remember” near Approve). “Approve and remember” availability rules are policy-only; placement and copy affordances are unspecified—easy to make remember too easy.

8. **Settings for remembered rules** — List + revocable only; no empty state, pattern preview, expiry surfacing, or “why this matched” when a rule fires (audit UX gap that becomes trust gap).

9. **Kill switch** — Named but not designed: placement, confirm-on-accident, and visibility during an active run are unspecified. For Operate, the most frequent/urgent job should be one clear control from the run surface.

10. **Slop / theater risk** — Spec does not forbid security-badge eyebrows (“Verified”, “Secure session”), icon tiles, or rainbow severity chips; those are exactly the generated-dashboard tells app-screens bans, and they erode trust on a security surface.

---

### Highest-leverage fixes (spec-only; not implementing)

1. Rewrite the CLI section so the invariant is testable: **either** gateway-mediated execution **or** documented degraded mode with UI disclosure (already partly there)—remove the implication that flags alone equal gateway enforcement.  
2. Extend untrusted-content fresh-ask to **spend** and **write-local** (or to “any non-read”).  
3. Replace “shown identically” with **same decision fields + channel-specific layout**, and require summary-first + full evidence on desktop; Telegram: irreversible summary + hash/digest + deep link to Inbox.  
4. Specify approval **visual hierarchy**, list vs detail, contrast for diffs/irreversible, no-color-only actions, and Settings empty/revoke states.  
5. Define write-local exclusions (secrets, hooks, ignorefiles) and residual deletion (backups).  
6. Drop or tightly gate release-back-to-`approved`; prefer always mint a new approval after any execute attempt.

I did not cross-check specs 03/11/14/15; review was limited to this file as requested.
