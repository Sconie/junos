**Verdict:** The roadmap’s sequencing idea (one real chat path, then widen) is sound, but Phase 0 fights that principle, security controls land after tools/agents, Phase 5 has no exit criteria, and adopting “Translucent Glass” as the foundation locks in several craft risks both skills treat as high-cost defaults.

---

### Contradictions (inside this doc)

1. **Principle vs Phase 0.** Principle: one end-to-end Claude subscription path first. Phase 0: five provider spikes (Claude, Codex, Cursor, Grok, Nous) *before* Phase 1 chat works, plus “mock data for **all** screens.” That is breadth-first, not the stated principle.

2. **“Screen by screen” vs “all screens”.** Principle says build the backend screen by screen with a switchable mock layer. Phase 0 done-when requires every screen on mocks, and Phase 0 also dumps Inbox / Agents / Workflows / Scout / Kanban into the shell at once. The mock switchability goal is fine; the “all screens ready” gate is not screen-by-screen.

3. **Scope-creep rule vs Phase 5.** Risks say every phase has a done-when and nothing starts until the last passes. Phase 5 lists packaging, backups UI, notifications, light theme, phone tunnel — **no done-when**.

4. **Approvals vs when work that needs them ships.** Phase 2 ships a workflow runner with **tool** steps. Phase 3 adds Hermes + “approvals in Inbox.” Phase 4 finally adds sandboxed shell + approval-rules UI. Tool-capable automation is explicitly earlier than the controls named for containing it.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No craft / a11y / empty-state / motion gates | UI is treated as a finished shell; only Phase 5 “Polish” touches presentation, and that list is packaging + themes + tunnel, not hierarchy/legibility/states. |
| Auth is one bullet (“auth token”) | Not enough for later “phone access over a tunnel,” conversation history, or agent approvals. |
| No data-lifecycle gates | History, backups, and Scout indexing appear without retention, export, or wipe criteria. |
| Testing skips security & UI | Unit/contract/Playwright smoke only — no approval-policy E2E, no contrast/reduced-motion, no tunnel/auth abuse cases. |
| “UI already exists as a shell” is untested by phases | Nothing verifies shell density, nav IA, or that mock→real doesn’t break states. |
| Compare mode + ⌘K + Home + Scout + indexing in one phase | No ordering or partial done-whens inside Phase 4. |

---

### Unrealistic scope

- **Phase 0:** monorepo split + glass tokens + all routes + five 1-day spikes + mocks for every screen. Any one of those can eat the “days” budget.
- **Phase 1 done-when:** Claude *and* Codex, Connections real states, model/effort picker, SSE streaming, history, routing fallback — still “no API keys.” That’s a full product slice, not a thin vertical.
- **Phase 2 done-when:** “daily morning briefing for a week without duplicates or lost runs” is a **reliability burn-in**, not a build gate; it blocks Phase 3 for calendar time even if code is “done.”
- **Phase 3–4:** Hermes (mock→real), Kanban rules, more adapters, Scout pipeline + indexing + Home + ⌘K + compare + security UI. Each is a product of its own; the phase boundaries don’t isolate a single user job the way Phase 1’s chat job does.
- **Phase 5:** Tauri *or* service install, backups, notifications, light theme, remote phone access — five different product bets with no prioritization.

---

### Security / privacy risks (as sequenced here)

1. **Tools before sandbox.** Workflows with tool steps (P2) and agent work (P3) precede sandboxed shell (P4). If “tool” includes shell/file/network, the dangerous surface is live while mitigation is still roadmap fiction.

2. **Approvals split across phases.** Inbox approvals in P3; “approval rules UI” in P4. Policy editing and enforcement UI lag the first approval-requiring agents.

3. **Phone tunnel in Polish.** Remote access is framed as finish-line UX. Combined with a thin Phase 1 “auth token,” that is a high-impact exposure path (local daemon + chat history + agent controls) unless tunnel is blocked until auth, TLS/binding, and least-privilege are explicit done-whens.

4. **Subscription burn + background jobs.** Risk table mentions usage budgets, but Phase 2 unattended automation has no phase gate for budgets/kill-switches before the week-long burn-in.

5. **Scout + indexing in the same phase as hardening.** File/project indexing expands the data the app can read/search; hardening is a peer bullet, not a prerequisite. Privacy blast radius grows before controls are “done.”

6. **“No API keys” as success.** Subscription CLIs still imply credentials on the machine; the done-when can hide keychain/file secret handling, log redaction, and event-table leakage of prompts/tool output.

---

### UI / design quality (impeccable + design-taste lens)

Mode for this product: **Operate** (task UI). Ambition should be precision and scanability, not atmosphere. App-screen taste: colour on data not chrome, flat surfaces, no hero chrome, quiet nav, honest states.

**1. Phase 0 freezes a high-tell visual system**  
“Adopt the Translucent Glass tokens (14)” as the *foundation* commits the whole build to glass / frost / blur / atmospheric dark. Against **design-taste**: no glass, no backdrop blur, no floating pill chrome, no assistant violet/glow stack, Inter/system stacks as default face. Against **impeccable Operate**: brand in precise details, not decorative depth.  
Caveat (impeccable): if Jonas pinned Translucent Glass as the brief, do not “taste away” the identity — but this roadmap should still require **craft gates** (solid fallbacks, max blur depth, text never on ambiguous glass, contrast ≥4.5:1, no nested frost) instead of treating token adoption as done. As written, Phase 0 has no such gate.

**2. Nav density before any job works**  
Adding Inbox, Agents, Workflows, Scout, Kanban (on top of an existing shell) in Phase 0 creates a wide Operate IA while the only real job (chat) is still Phase 1. Cognitive load: many peer destinations, no phase that validates icon-rail discoverability, badge hierarchy, or “one primary job per screen.”

**3. Polish ≠ craft**  
Phase 5 bundles light theme with packaging and tunnel. Light theme late means contrast/hierarchy are only proven on dark glass for most of the project — fragile for legibility (`text-dim` on translucent panels is a classic fail). Missing entirely from the roadmap: typeset/layout pass, density pass, empty/error/offline states as ship criteria, motion budget + `prefers-reduced-motion`, focus rings, keyboard paths.

**4. Hierarchy and density never scheduled**  
Chat, Inbox, Kanban, Scout, Home aggregation, and ⌘K are high-density Operate surfaces. The roadmap never assigns a distill/layout/critique moment. Risk: mock shell looks “designed,” real data (logs, diffs, Scout findings, approvals) collapses into card/glass mush — exactly what app-screen rules warn against (shadowed cards, KPI tiles, chrome colour).

**5. Motion**  
No motion plan. Taste wants purposeful motion with reduced-motion fallbacks; impeccable `animate` is optional craft, but Operate still needs state change feedback (streaming, run status, approvals). Leaving it unnamed usually yields either none or decorative blur/glow.

**6. Home / ⌘K / compare deferred to Phase 4**  
Those are the scan/aggregate surfaces that set hierarchy for the whole app. Building them after Agents/Kanban/Scout means the shell’s information architecture is finalized late, while Phase 0 already committed the nav list.

---

### Highest-leverage fixes (guidance only; Ask mode)

1. **Reorder security ahead of tools:** sandbox + approval policy (+ tests) before workflow tool steps and Hermes pickup.  
2. **Align Phase 0 with the principle:** one Claude mock→real path; defer extra spikes and “all screens mocked.”  
3. **Give Phase 5 a done-when** — or split packaging vs light theme vs remote access.  
4. **If glass stays:** add an explicit craft/a11y done-when in Phase 0/1 (contrast on panels, no nested blur, solid fallback, focus, empty/error/offline). Do not treat “tokens adopted” as UI quality.  
5. **Narrow Phase 4** into ordered slices (Scout useful → search → Home/⌘K), each with its own done-when.  
6. **Replace the week-long Phase 2 burn-in** with measurable offline tests (no duplicate fires, crash recovery) plus an optional soak — don’t block the roadmap on calendar time alone.

I did not re-review `14-ui-system.md` or `12-security-and-privacy.md` as targets; they only clarify what this roadmap’s “tokens (14)” and tunnel/sandbox bullets are pointing at.
