**Verdict:** Revision 2 fixes the biggest control-plane ordering bug (gateway before executors), but the doc still front-loads a full Operate product shell, leaves sandbox/Telegram/phone attack surface late or underspecified, and treats UI as tokens + stubs rather than Operate craft (one job per screen, density, states, Stop placement).

Lens: **impeccable** Operate/Read (task UI, not Persuade) + **design-taste** app-screens (quiet chrome, substance on first screen, no kit dashboard). Reviewed only `docs/specs/13-roadmap.md` as present in the workspace (Revision 2, 2026-10-22).

---

### Contradictions

1. **Principle vs sandbox timing.** Principle: never ship an executing feature before its gate. Phase 0 only *chooses* a sandbox approach; Phase 1 ships Claude/Codex execution; Phase 3 ships **local + VPS shells**; Phase 4 is “sandbox **hardening**.” Choosing ≠ gating. Hardening after executors conflict with the stated principle.

2. **Scout as early risk mitigation vs Scout in Phase 4.** Risks table: “Scout watches releases” for CLI format drift. Scout is Phase 4. Phases 1–3 have no substitute watcher, so that mitigation is temporally false for the first release.

3. **“First release = Phases 0–2” vs Phase 2 Done-when.** First release is gated on “a daily task runs unattended for a **week**… across forced daemon restarts.” That is a soak/ops gate, not a ship checklist—either the release definition or the Done-when is wrong.

4. **Phase 1 auth model vs Phase 3 Telegram approvals.** Phase 1 is browser pairing, cookie auth, Origin/Host, CSRF. Phase 3 adds approvals via a **separate Telegram bot** “through the same gateway” without saying how digest-binding, single-use, expiry, and identity map onto chat messages. Same gateway ≠ same threat model.

5. **Theme / tokens sequencing.** Phase 0: adopt UI tokens and stub **all** screens. Phase 5: light theme. Implies a long dark-only ship with a late second theme—fine if intentional, but then “tokens” in Phase 0 must already encode dual-theme roles, which the roadmap never states. As written, Phase 5 light theme reads like a retrofit.

6. **Soft: consented fallback vs deny-by-default.** Phase 1 has deny-by-default for external-send/destructive/spend **and** “allowed-providers list with consented fallback.” Fallback path is unnamed; if it can widen providers or tools after consent, it can contradict deny-by-default unless scoped tightly (doc doesn’t).

---

### Gaps

| Area | What’s missing in this doc |
|---|---|
| **Control surfaces** | Revision note mentions localhost protections; Phase 1 bullets list Origin/Host/CSRF but not localhost/bind rules as Done-when checks. |
| **Stop UX** | “Shared … Stop control” exists; no placement (global vs per-run), confirmation, or ambiguous VPS state UI beyond “says honestly it cannot confirm.” |
| **Automation without backends** | “Morning briefing without mail/calendar” has no stated substitute inputs—what does the workflow show/run? |
| **Backup vs unattended** | Week-long unattended automation (Phase 2) before backups UI (Phase 5). |
| **Phone** | Phase 5 “phone access” with no scope (approvals only? chat? not Terminal?). |
| **Operate states** | No empty/loading/error/partial-failure Done-whens for Chat, Inbox, Tasks, Connections. |
| **IA / first job** | Home aggregate is Phase 4; first release is Chat + Tasks + Inbox with “route stubs for all screens”—no statement of the **one** primary job on first open. |
| **Design ownership** | Tokens (14) only. No product face, type scale ownership, density budget, motion + `prefers-reduced-motion`, or contrast acceptance. |
| **Secret lifecycle** | Secret **redaction** in Phase 1; no storage/rotation/display rules in Connections. |
| **Packaging** | “Tauri … **or** service install” left unresolved inside Phase 5. |

---

### Unrealistic scope

- **Phase 0:** monorepo layout + tokens + stubs for *all* screens + **five** 1-day spikes (Claude stream, Codex exec, sandbox, Cursor headless, Nous). That’s a full research week plus shell work packed as “foundations.”
- **Phase 1:** daemon + SQLite/SSE + pairing/auth + **Gateway v1** (classify, approvals, deny-by-default, audit, Stop SM, redaction) + two adapters + Connections + streaming chat/history + markdown/CSP + ApprovalCard/Stop. For a first vertical slice this is several subsystems, not one phase.
- **Phase 2 Done-when:** week of unattended correctness across restarts is a reliability program, not a phase exit.
- **Phase 3:** real Hermes on VPS + Telegram bot + dual Terminal + Kanban atomic pickup + more adapters—any one of these is a phase.
- **Phase 4 Done-when:** Scout “under 30% dismissed as noise” is an ML/product-quality target you can’t honestly schedule as a binary phase gate.

---

### Security / privacy risks (called out by the roadmap itself)

1. **Late sandbox hardening** while Phase 1–3 already run agents and shells (see contradiction).
2. **Telegram as approval channel** — spoofing, account takeover, delayed/offline approve, and whether digest + expiry are visible/enforceable in-bot are unaddressed; high-stakes Operate moment with weak UI affordances risk.
3. **Stop cannot confirm on VPS** — ambiguous kill is a safety failure mode; “honest” copy without a forced safe state (block new work, mark run unknown) is incomplete.
4. **Unattended automation before backups / richer notifications** — recovery and human awareness lag the blast radius.
5. **Indexing + search with revocation (Phase 4)** — no note on residual copies in logs, embeddings, Scout findings, or chat history after revoke.
6. **“Consented fallback”** — consent UI can become a bypass of allowlists if not narrowly defined.
7. **Phone access (Phase 5)** expands cookie/session surface; roadmap doesn’t re-assert pairing, CSRF, or Origin rules for that client.
8. **Scout findings in UI** — read-only pipeline can still **display** sensitive file/project content; privacy is not only pipeline scope.

---

### UI / design-quality (Operate + app-screens lens)

This is not a rendered UI; findings are about what the roadmap **commits you to build**.

**Hierarchy & IA**  
Stubbing **all** screens in Phase 0 before a real end-to-end job encourages a full nav chrome and thin destinations—classic generated-dashboard shell (many places, no one question answered first). Home only in Phase 4 makes Phases 1–2 a bag of features (Chat, Connections, Tasks, Inbox) without a stated primary surface. Inbox packing “approvals, results, failures” is three jobs; without grouping/priority rules, density and scan hierarchy will fail.

**High-stakes UX (impeccable emotional journey)**  
ApprovalCard + Stop are the product’s dangerous moments. The roadmap names components, not: persistent Stop reachability, approval digest legibility, reject-vs-edit, or post-Stop reassurance. Phase 3 “cannot confirm” Stop is an emotional valley with no UI recovery pattern.

**Spacing / density**  
By Phase 3 the same shell absorbs Chat, Inbox, Console, Terminal (dual tabs), Kanban. No density budget, no “one primary canvas” rule. Terminal + Kanban next to chat is a known clutter failure unless the roadmap forbids parallel chrome.

**Typography & product face**  
“Adopt UI tokens (14)” is necessary but not sufficient. App-screens require a product face (name/mark, one signature element, loaded face—not a generic kit). Roadmap never requires that before “Polish.”

**Legibility & contrast**  
Safe markdown + CSP in Phase 1 is good for XSS; it does not specify code/pre contrast, streaming transcript hierarchy, or approval digest readability. Light theme only in Phase 5 means contrast QA for the second theme is deferred while all screens already exist—expensive rework.

**Motion**  
No motion or reduced-motion anywhere, including Phase 5 “Polish.” For Operate, motion should be feedback (approve, Stop, stream) not decoration; absence of a budget usually becomes either none or random fades later.

**Slop / kit risks the roadmap invites**  
- Unified status pills / icon status grids on Connections  
- Model + effort picker as a large option set (cognitive load: >4 visible choices)  
- ⌘K + compare mode in Phase 4 before empty-state/harden work—power-user chrome before substance  
- “Home aggregate” without a single stated question → KPI-tile home  

**Phone (Phase 5)**  
Untargeted “phone access” fights app-screens phone rules (compose for thumb jobs). Approvals/Stop are the plausible phone jobs; Terminal/Kanban are not. Doc doesn’t choose.

---

### What’s already strong

- Gateway **before** automation/agents (Rev 2)—correct relative to the old ordering.  
- Deny-by-default, digest-bound single-use approvals, audit, Stop SM, CSP/safe markdown—right control themes for an agent OS.  
- Phase 0 spikes with results written back; Hermes mock validated against a **recorded** real session.  
- Explicit “done when” per phase; scope-creep mitigation named.  
- Starter workflows trimmed (Repo health / Weekly review deferred)—good distill instinct, incomplete elsewhere.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Move **sandbox enforceable constraints** (not just “hardening”) to before any CLI/shell execution Done-when; keep Phase 4 for depth if needed.  
2. Replace Scout-in-Risks with a Phase 1–2 mitigation (contract tests already listed—or a tiny release probe).  
3. Split Phase 2 Done-when: ship gate vs week soak.  
4. Spec Telegram approvals as a first-class authz surface (identity, digest UX, offline, revoke).  
5. Phase 0: stub **only** screens needed for Phases 1–2; defer full IA. State the first-open job.  
6. Add Operate Done-whens: Stop placement, approval hierarchy, empty/error, density rule for Terminal vs Chat, phone job list, motion = control feedback + reduced-motion.  
7. Resolve backups/notifications before or with unattended automation.

I did not run live `impeccable critique` / `inspect` (target is a roadmap, not a viewable UI; Ask mode also blocked shell). If you want the same lens applied to `14-ui-system.md` or the mock shell next, say which.
