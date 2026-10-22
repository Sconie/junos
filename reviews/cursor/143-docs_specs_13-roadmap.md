**Verdict:** The roadmap’s sequencing principle is sound, but Phase 0 locks a high-risk visual system too early, Phase 4 is a kitchen sink, security lags the automation that needs it, and several done-whens / mitigations contradict the phase order.

---

### Contradictions

1. **“One path early” vs Phase 0 spikes**  
   Principle: Claude chat first. Phase 0 still timeboxes **five** provider spikes (Claude, Codex, Cursor, Grok, Nous) before Phase 1’s single working path. That fights the stated principle and burns foundation days on paths you may never ship (Grok is already “ship without it”).

2. **Scout used before Scout exists**  
   Risks: “Scout watches releases” for CLI churn. Scout is Phase 4. Adapters land in Phase 1–3. The mitigation is not available when the risk is highest.

3. **Inbox timing**  
   Phase 2 ships Inbox (results/failures); Phase 3 adds approvals in Inbox. Unclear whether Phase 2 Inbox is a stub or full surface—and whether Home’s “Needs you” / approvals can exist before Phase 3.

4. **Phase 5 has no Done when**  
   Every other phase has an exit criterion; Polish does not. Packaging choice (“Tauri **or** service”), light theme, tunnel phone access, and backups are open-ended.

5. **Scope-creep mitigation vs week-long gates**  
   “No phase starts before the last passes” plus Phase 2/4 done-whens that need **a week of real use** means multi-week hard stops between phases—or the rule will be ignored. The doc doesn’t say which.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No a11y / states / motion gate | Spec 14 demands skeletons, empty, error, offline, focus, `prefers-reduced-motion`. Roadmap never schedules them; Phase 5 “Polish” won’t catch missing empty states on 10+ screens. |
| No design QA gate | “Adopt tokens” ≠ verified contrast on glass, hierarchy, or density. Nothing says “pass contrast / reduced-motion before Phase 1.” |
| Files / Home / Hermes / Tasks routes | Phase 0 adds Inbox, Agents, Workflows, Scout, Kanban only. Full rail in 14 is larger; roadmap never says when remaining shell routes appear vs when they become real. |
| Auth / bind / threat model | Phase 1: “auth token” only. No local-only bind, token storage, rotation, or what the token protects. |
| Indexing privacy | Phase 4: “file/project indexing” with no retention, path allowlist, or “what leaves the machine.” |
| Testing vs phases | Contract tests and Playwright are listed globally, not as phase exits. Phase 0 done-when is mock UI only—no smoke-test bar. |
| Notifications | Appear only in Phase 5; automation (Phase 2) and Scout (Phase 4) will need failure signals earlier. |

---

### Unrealistic scope

- **Phase 0 “days”** packs monorepo split + glass tokens + five routes + five 1-day spikes. That’s closer to 1–2 weeks if spikes slip.
- **Phase 1** is a full local product: daemon, SQLite, SSE, events, two adapters, Connections, streaming, history, routing fallback—still “one phase.”
- **Phase 4** stacks Scout pipeline, indexing/search, Home aggregation, ⌘K, compare mode, **and** security hardening. Any one of those is a phase; together it’s the largest blob and the weakest done-when (“&lt;30% noise” is subjective and needs a labeled corpus the doc never defines).
- **Phase 3 done-when** depends on real Hermes pickup + Review. If Hermes stays mock-long (risk table), the phase cannot pass under the written rule.

---

### Security / privacy risks

1. **Automation before sandbox**  
   Phase 2: scheduler + workflow runner with tool/output steps. Phase 4: “sandboxed shell, approval rules UI.” Unattended runs and tool steps land **before** the hardening that should constrain them.

2. **Phone access over a tunnel (Phase 5)**  
   Exposes local daemon + chat/history/approvals off-machine. No mention of auth beyond Phase 1’s token, TLS, allowlisted devices, or killing the tunnel by default. Highest privacy risk in the doc; treated as polish.

3. **Subscription burn**  
   Risk table points at “usage budget in 03,” but Phase 2’s week-long unattended briefing is exactly what exhausts caps. Roadmap doesn’t sequence budget UI/enforcement before that done-when.

4. **Backups UI without crypto posture**  
   Phase 5 backups with no note on encryption at rest / export scope (chat, files index, secrets).

5. **Compare mode + indexing**  
   Side-by-side provider/output and project search expand the sensitive surface; no approval or redaction story in the roadmap.

---

### UI / design quality (impeccable + design-taste lens)

Mode for these surfaces is **Operate** (app screens): scanability and restraint over atmosphere. Against that:

1. **Glass as Phase 0 foundation (severity: high)**  
   “Adopt the Translucent Glass tokens” commits the shell to frosted panels / blur before any real data density. design-taste bans glass and backdrop-blur chrome for app work; colour should sit on **data**, not chrome. Roadmap makes atmospheric chrome the first UI deliverable—hard to unwind later.

2. **Light theme deferred to Phase 5 (high)**  
   Building every screen dark-glass, then bolting light, doubles theme debt and usually breaks contrast, hierarchy, and “text-dim on glass.” For Operate UIs, light (or a single solid theme with real ink) should be decided early—or dual-theme should be an explicit Phase 0 constraint, not polish.

3. **Shell density before jobs (medium–high)**  
   Phase 0 adds five routes on mock data. App-screen guidance: first screen must answer one job and expose the frequent action; icon rails with tooltips-only labels raise cognitive load. Mock-complete IA before Chat works risks a dashboard-shaped empty product.

4. **Hierarchy / typography / spacing unspecified here**  
   Roadmap only says “tokens (14).” No phase owns type scale, density for Inbox/Kanban tables, or chat measure. Phase 4’s Home + ⌘K + compare will fight for top-bar and first-screen attention with no layout budget.

5. **Legibility / contrast on glass (medium)**  
   Glass + dim text is a known failure mode. Roadmap never gates “4.5:1 on frosted panels” (which 14 claims) before streaming chat and Inbox land—where illegibility hurts most.

6. **Motion (medium)**  
   No motion budget, reduced-motion, or “don’t animate layout.” Streaming chat, Kanban moves, Scout feed, and ⌘K all want motion; without a phase rule you’ll get fadey chrome or none—both fail craft (impeccable: purposeful motion; taste: transform/opacity + reduced-motion fallback).

7. **Compare mode + ⌘K in the same phase as Scout/Home (density)**  
   Command palette + multi-pane compare + aggregated Home is three high-density patterns with no “one composition / one job” constraint. High risk of card grids, pill status chrome, and competing headers—the exact Operate anti-patterns both skills call out.

8. **Brief vs skill tension (note, not a contradiction inside 13 alone)**  
   Impeccable: **the brief wins**—Jonas chose Translucent Glass. The roadmap problem is not “ignore the brief”; it’s **scheduling glass + late light theme + no craft gate**, so quality debt compounds across every screen before Polish.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Cut Phase 0 spikes to Claude (+ maybe Codex); park Cursor/Grok/Nous behind Phase 1 done-when.  
2. Move sandboxed shell + approval rules to **before or with** Phase 2 automation; treat tunnel phone access as a security milestone with explicit auth, not Phase 5 fluff.  
3. Split Phase 4 (Scout **or** search/Home/⌘K **or** hardening).  
4. Add Done when for Phase 5; replace “Scout watches releases” with adapter version probes until Scout exists.  
5. Add an explicit UI craft gate after tokens: contrast on panels, empty/loading/error, one theme strategy (or dual-theme from Phase 0), reduced-motion—before stacking more routes.

I can go deeper on any one phase’s sequencing, or cross-check Phase 0’s glass commitment against `14-ui-system.md` token-by-token, if you want that next.
