**Verdict:** The threat model and approval table are a solid skeleton, but the doc contradicts itself on secrets storage, under-specifies the high-stakes UI (approvals, kill switch, remembered rules), and leaves prompt-injection + localhost-token gaps that undermine the claimed mitigations.

Mode for implied surfaces: **Operate** (Inbox approvals, Settings rules, kill switch) — precision and consequence copy beat decoration.

---

### Contradictions

1. **Where secrets live.** Daemon auth token is `~/.junos/token` (file, mode 600). Next section: “Any JunOS-owned secret … goes in the OS keychain, never in SQLite, logs, or the repo.” The bearer token is a JunOS-owned secret and is neither keychain nor excluded by that sentence. Pick one store.

2. **“No provider tokens” vs JunOS tokens.** Fine if “provider” is deliberate, but the doc never defines the boundary (CLI session cookies vs webhook/Hermes/daemon tokens). Readers will treat the bold claim as absolute.

3. **Untrusted content vs auto write-local.** Prompt injection says content is untrusted, then only forces approval for **external-send** and **destructive** after untrusted content. In Balanced, **write-local stays auto** — so injected “edit this allowlisted file” can land without a human. That fights the threat model’s #1 risk.

4. **Shell classification.** “Shell outside allowlist” → destructive / always ask. Shell *inside* allowlist is unclassified (not write-local, not spend). Arbitrary in-tree shell is often as bad as out-of-tree.

5. **Overlapping classes.** `force-push` is destructive; a normal `git push` / API write is external-send; both can spend quota. One action can need two rows of policy with no precedence rule.

6. **Autonomy vocabulary.** Table only names Balanced and Ask-first. No default for a third level, no “who sets level,” no UI for it — incomplete matrix for a policy doc.

---

### Gaps

| Area | Missing |
|---|---|
| Pairing | Who hosts the one-time URL, TTL, single-use enforcement, restart/re-pair, multiple UI clients |
| Token lifecycle | Rotation, revoke, leak response; file vs keychain decision |
| Transport | UI origin (`http://127.0.0.1:…` vs `file://`), SSE/WS auth, CSRF if cookies ever used |
| Threat (2) | Same-user local processes can read `~/.junos/token`; binding + CORS do not stop that |
| Allowlist | Who edits it, integrity, path traversal / symlink escape |
| Spend | Detection method (subscription burn ≠ API $); false negatives |
| Prompt injection | “when avoidable” is not a rule; no default when tools *are* needed on untrusted mail/files |
| Remembered rules | Pattern language, specificity, collision, audit of rule hits, expiry |
| Kill switch | Global vs per-run, confirm, resume, visibility when not on Hermes |
| Audit export | Format, redaction before export, who can trigger, secrets in command/diff bodies |
| Privacy | Retention, delete-my-data, what leaves the machine to providers, clipboard/notifications |
| Backup | Nightly DB (02) — encryption at rest, path permissions, restore test |

---

### Unrealistic scope

- Treating prompt-injection controls (“wrap as data,” “no tools while reading”) as settled product behavior without failure modes or UI when the model still requests tools.
- “Redact known secret patterns” as sufficient logging hygiene (unknown formats always leak).
- Perfect, durable classification of spend / destructive / external without an appeal path or “I’m not sure → ask.”
- “Approve and remember” as a safe default without specifying how narrow patterns must be — pattern allowlists are a classic bypass surface and a UX footgun.

Phase 4 sandbox called out as open is honest; shipping shell on “always ask” alone is realistic for MVP only if approval UX can’t be rubber-stamped (see below).

---

### Security / privacy risks (doc as written)

1. **Local token file = full daemon** for any same-uid process or backup that copies `~/.junos/` — undercuts risk (2).
2. **Balanced + injection → silent local writes** (and possibly in-allowlist shell).
3. **Scoped “action pattern” rules** that expand blast radius after one rushed Approve-and-remember.
4. **Audit/export and Inbox bodies** hold “exact command/diff” — high chance of secrets; redaction is only claimed for logs/run records, not Inbox or export.
5. **Remote “if ever”** with the same long-lived token: tunnel + stolen file token = remote agent control; no step-up auth.
6. **No attention-budget / approval spam** control — injection can DoS the human with urgent approvals until they click through.

---

### UI / design quality (Impeccable Operate + design-taste app-screens)

This doc defines three Operate surfaces and almost no visual/UX contract. Against the skills’ Operate / app-screen rules:

**1. Approval Inbox items — hierarchy & density**  
“Show the exact command/diff” without layout: risk **class** and **consequence** should be the first read (biggest type / full ink); command and diff are evidence, not the title. App-screens: the screen’s question is answered by the biggest thing — here that question is “allow this?” not “here’s a wall of diff.” Large diffs need collapsed summary + expand, or people approve blind (legibility + density failure).

**2. High-stakes confirmations**  
App-screens §8.2: destructive actions need consequence in words and confirmation that **names the object**. Doc allows one-click Approve (and worse, Approve-and-remember) for destructive/spend with no second step, no object naming, no “what this will do” line. Emotional peak for security UX is under-specified → rubber-stamp valley.

**3. Approve-and-remember — cognitive load**  
One control merges **this decision** and **standing policy**. That exceeds Operate’s “earned familiarity” bar and creates permanent trust expansion from a fatigued Inbox click. Split: Approve vs “Remember…” with a scope preview (project + pattern in plain language) before commit.

**4. Settings — remembered rules**  
Only “visible and revocable.” No section layout (label column + panel), empty state, last-matched, or plain-language pattern. Taste/settings: one view per area; this belongs in a dedicated Security / Approvals settings view, not a dump under generic Settings.

**5. Kill switch — discoverability & contrast**  
“Kill switch in the UI” with no placement, label, or state. Operate: Stop always findable; motion only for state (150–250 ms feedback), not decoration. Needs a stable shell control, destructive/negative colour with WCAG contrast, disabled/loading when already stopping — none specified.

**6. Typography & anti-slop**  
Risk of **eyebrow pills** (“DESTRUCTIVE”, “SPEND”) in tiny tracked caps — banned by design-taste house rules and weak for Operate. Prefer sentence-case class in the title (“Delete 14 files in `proj`”) at readable size; colour on the **decision**, not chrome.

**7. Colour & meaning**  
Five classes need a small semantic set (ask / danger / spend), not a rainbow of badges. Colour on state and data (~few % coloured pixels on app screens), not tinted icon tiles around every approval.

**8. Motion**  
SSE-driven approval arrival: row insert / badge update is enough. No entrance choreography on security surfaces (app-screens: no motion floor; no section entrances). Kill switch and Approve must feel instant; don’t animate the diff into view in a way that delays the decision.

**9. Pairing / first run**  
One-time pairing URL has no UI states (expired, already paired, copy-failed, success). Onboarding for a security gate needs clear hierarchy: one action (“Open JunOS”), one status line — not a settings dump.

**10. Audit export**  
Exportable audit with no UI: where it lives, progress, redaction warning before download. Privacy-critical flows need explicit copy (“Diffs may contain secrets”) — clarify skill territory, currently absent.

**11. Legibility of monospace diffs**  
Monospace is correct for real diffs; still need measure, contrast (full ink, not grey body), and overflow behavior in the Inbox detail pane / Home inline approve. Spec silence here is a design bug waiting to happen.

---

### Priority fixes for this doc (if you revise it)

1. Resolve **token vs keychain**; state same-user local threat honestly.  
2. After untrusted content: **default-ask for write-local (and in-allowlist shell)** or define a narrower auto path.  
3. Spec **approval card IA**: title = consequence + class; evidence = command/diff; separate remember flow; destructive/spend confirm that names the object.  
4. Spec **kill switch** placement and states in the shell.  
5. Spec **Settings → approval rules** as its own view (list, revoke, empty, pattern preview) and audit/export redaction.

---

Questions skipped: this was a docs-only review (no rendered UI / detector run); not an `$impeccable critique` session.
