**Verdict:** Spec `12` is a solid threat-model outline for a localhost daemon, but it is not an Operate-mode brief for the surfaces that carry those guarantees (pairing, approvals, remembered rules, kill switch, audit). Through impeccable (Operate) and design-taste app-screen rules, the biggest problems are an undecided trust UI, auto `write-local` that undercuts the #1 threat, and high-stakes decisions with no hierarchy, density, or state design.

**Mode:** Operate (security settings + approval inbox). Ambition should be precision, scanability, and reassurance at irreversible moments — not marketing polish.

---

### Contradictions

1. **Threat #1 vs Balanced `write-local` auto**  
   Top risk is agent harm / leak via prompt injection from web/file content. Prompt injection only forces ask for `external-send` and `destructive`. `write-local` stays auto in Balanced. Injected “rewrite this config / overwrite this script” never hits the Inbox. The table and the injection paragraph disagree on what “untrusted content” actually gates.

2. **“Never on main” vs “unless set otherwise”**  
   Hermes/workflows on a branch/worktree is stated as a safety property, then voided by an unspecified escape hatch. Readers cannot tell whether main-tree writes are a real control or a preference.

3. **Localhost-only threat model vs remote access**  
   Threat model is single-user localhost; Daemon access still sketches private-network tunnel + token. That expands the attacker set (token theft on the tunnel, mis-bound tunnel, shared LAN) without updating risks (2)/(3) or UI for “you are exposed beyond loopback.”

4. **Bearer file vs one-time pairing**  
   Token lives in `~/.junos/token` (mode 600) *and* the UI gets it via a one-time pairing URL. Unclear after pairing: does the UI keep a copy (memory, OS keychain, Electron store)? Is the file still the source of truth? Can a second client pair? One-time-ness and storage are in tension until named.

5. **CORS / Origin / Host as the local-process defense**  
   Risk (2) is “another local process or a web page calling the daemon.” Strict CORS blocks *browsers*; a local process that reads `~/.junos/token` and calls `127.0.0.1` is unaffected. The bullet list reads as if CORS+Host checks address both classes; they don’t.

6. **“No provider passwords” vs redaction / JunOS secrets**  
   Fine as layered claims, but “redact known secret patterns” implies JunOS *sees* secrets in logs/run records. That sits awkwardly next to “stores no provider tokens” without saying whether provider CLI env/output is ever captured into `event` before redaction.

---

### Gaps (spec / product)

- **No “one question” per surface** (app-screens §2.2). Is the security UI “decide this action now,” “see what can still auto-run,” or “stop everything”? Pairing, Inbox approvals, Settings rules, kill switch, and audit export are five jobs with no IA.
- **Balanced / Ask-first undefined** beyond one table cell (where set, default, whether per-project, whether changeable mid-run).
- **Approval lifecycle missing:** deny, timeout, expire while agent waits, queue when run cancelled, bulk approve, what happens if UI is closed.
- **“Approve and remember” scope unspecified:** pattern language, collision with stricter classes, audit of rule hits, “this once” vs “this project,” how revoke is shown.
- **Pairing UX unspecified:** how the URL is shown, TTL, single-use enforcement, what failure looks like if token file permissions fail.
- **Kill switch unspecified:** scope (runs only vs daemon), in-flight tool steps, restart behavior, confirmation, discoverability.
- **Audit export unspecified:** format, retention, whether exports include redacted fields, who triggers export, path allowlist.
- **Allowlist integrity** (who edits project folders, can an agent expand the allowlist) not mentioned under Approval or Data safety.
- **Spend class** has no metering/UI (what counts as money, streaming cost, false “always ask” fatigue).
- **Open questions leave the credential story unfinished** while Credentials already asserts keychain — implementation fork is still open.

---

### Unrealistic scope

Packed into ~40 lines:

| Cluster | Cost |
|---|---|
| Loopback bind + token + pairing + CORS/DNS-rebinding + optional tunnel | Full local auth story |
| 5-class policy + modes + scoped remember-rules | Policy engine + Settings product |
| Prompt-injection wrapping + “no tools while reading when avoidable” | Hard agent-runtime property, not a bullet |
| Keychain secrets + pattern redaction + exportable audit | Ops + privacy engineering |
| Branch/worktree isolation + kill switch + nightly backup (via 02) | Cross-cutting runtime |

Credible v1 cut matching the threat order: loopback + token + pairing + ask-for external/destructive/spend + visible approvals + kill switch — **not** remember-rules, remote tunnel, and “tools off while reading untrusted content” as if they were the same size.

---

### Security / privacy risks

- **Auto write after untrusted context** is the practical injection path this doc leaves open (files, mail drafts on disk, `package.json`, hooks, CI config).
- **Remembered rules** are a durable bypass; without hit-counts, last-used, and hard caps (never remember destructive/spend), Settings becomes the soft underbelly.
- **Token file is the crown jewel.** Any backup, sync (OneDrive/iCloud of `~`), or world-readable mis-chmod defeats mode 600. No rotation, compromise, or “regenerate token” path.
- **One-time pairing URL** in a notification, log, or shared screen is equivalent to handing over the daemon. No guidance on display, copy affordance, or “do not log this.”
- **Pattern redaction** fails closed poorly: unknown formats, multiline secrets, provider-specific tokens. Prefer structured secret handles over regex hope.
- **Kill switch races:** without “abort current tool + drain queue,” users get a false sense of stop while a shell/`external-send` completes.
- **Phase 4 sandbox deferred** while `destructive` can still run (with ask) as the user’s user — approval ≠ isolation.
- **Host/Origin checks** without a fixed UI origin story (custom scheme vs `localhost` port vs `file://`) are easy to get wrong or disable in dev and ship that way.
- **Audit is exportable** but not described as sensitive itself (prompts, diffs, paths, recipients). Export is a privacy event, not only a security feature.

---

### UI / design quality (hierarchy, density, type, motion, legibility)

Lens: Operate + app-screens (quiet chrome, colour on decisions not chrome, settings as labeled panels, inbox as work queue, motion only for state, reassurance at high stakes).

**Hierarchy / composition**

- Approvals are “Inbox items” with exact command/diff, but no layout: master–detail vs full-takeover modal, what is primary (risk class vs command vs project), what is secondary. App-screens: the largest block answers the one question; here the question is never named, so diffs will compete with chrome.
- Five action classes + two modes + “remember” is >4 visible decision points if shown flat — cognitive-load failure unless class is one clear mark and actions are progressive (Approve / Deny first; Remember behind a step).
- Kill switch has no home (toolbar? always visible? buried in Settings?). For the emotional peak of “stop harm,” burying it fails peak-end / heuristics (user control & freedom; error prevention).
- Pairing is first-run security theatre if unspecified: risk of a thin “paste token” screen or a URL dumped in monospace without consequence copy (“anyone with this link controls JunOS on this machine”).

**Density / lists / settings**

- Diffs in an inbox need a density contract (app-screens tables/lists: identity + key signal in ink; meta grey; one status mark). Spec only says “exact command/diff” — unbounded wall of text, poor scan of *what will execute*.
- Remembered rules in Settings need §8 layout (label column + panel, one save model, destructive/revoke last). “Visible and revocable” is product intent without row anatomy (pattern, project, class, last hit, revoke).
- No empty / loading / error states for: no pending approvals, pairing failed, keychain unavailable, audit export failed. Operate expects these as first-class.

**Typography / legibility / contrast**

- Commands and diffs imply monospace; house rules allow monospace for real code — but body risk copy must stay full ink at ≥14px, not soft grey “warning” text (app-screens: running text in full ink; grey is secondary).
- Class labels (`destructive`, `spend`) need a semantic vocabulary (error/warning), not rainbow pills. Colour on the decision, ~3% chrome: one hue intensity for “needs you,” pale marks for remembered/auto — not a badge farm.
- Contrast risk if “always ask” items use muted chips while auto noise fills the queue — urgency inverted.

**Motion**

- Impeccable Operate: 150–250ms, state only; no choreographed load. Approvals must not animate content in (hides the command) or auto-dismiss. Kill switch feedback should be immediate state change (running → stopped), not delight.
- design-taste motion budget for *pages* does not apply; applying entrance staggers to security surfaces would be the wrong mode.

**Copy / trust**

- “Approve and remember” needs clarify-level consequence copy (scope in plain language before commit). Spec has the control name, not the sentence the user must understand.
- No preview of “what this rule will allow next time” beside the control (app-screens §8.2: show what the setting produces).

---

### What the doc does well

- Clear threat ranking for a single-user localhost product.
- Sensible defaults: loopback bind, bearer token, no provider passwords in JunOS DB, ask for external/destructive/spend.
- Approvals as first-class Inbox work (right product shape) rather than modal spam — if IA and density get specified.
- Honest open questions (keychain, sandbox) instead of fake certainty on those two points.

---

### Three changes that would move this most

1. **Close the injection hole:** after untrusted content in a run, escalate `write-local` (and any allowlist mutation) to ask — or drop Balanced auto until that exists.  
2. **Write the Operate brief for two screens:** Approval (one question, layout, deny/timeout, density of diff, no remember on destructive/spend) and Security settings (modes, rules table, kill switch, pairing/regenerate token, audit).  
3. **Separate “daemon auth” from “agent policy”** and cut remote tunnel + remember-rules from v1 narrative so the threat model and the UI can stay aligned.

---

Questions skipped: Ask mode / doc-only review (no rendered UI to score heuristics numerically; no inspector).
