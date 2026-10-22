**Verdict:** The sequencing principle is sound, but Phase 0 locks in a glass aesthetic both skills reject, security lands after agents can already run tools, and “Polish” is carrying foundational UI work (theme, density, mobile) that should be decided earlier.

---

### Contradictions

1. **Glass as foundation vs craft bans.** Phase 0 “Adopt the Translucent Glass tokens (14)” conflicts with design-taste (`No glass`, no backdrop-blur panels) and impeccable’s craft floor (glass/blur as decoration). Making that the first UI act hard-wires a banned default into every later screen.

2. **“One path early” vs Phase 0 spike pile.** The principle says one Claude path first; Phase 0 timeboxes five provider spikes (Claude, Codex, Cursor, Grok, Nous) before Phase 1 chat works. That is widening before the end-to-end path exists.

3. **Approvals before approval policy UI.** Phase 3 puts “approvals in Inbox”; Phase 4 adds “approval rules UI.” Agents and Hermes can produce approval-shaped work before the operator can define rules in product.

4. **Tools before sandbox.** Phase 2 workflows include “prompt/tool/output steps”; Phase 4 is “sandboxed shell.” Tool execution without a stated sandbox/approval boundary is a sequencing contradiction, not just a risk note.

5. **Dark-implied product, light as polish.** Light theme only in Phase 5 implies dark-first by default. Both skills say theme comes from use scene, not category habit; deferring light to “Polish” treats a token-system decision as residual chrome.

6. **Scope-creep table vs Phase 0 content.** Risks say each phase has a done-when and no premature next phase—but Phase 0 has no calendar bound beyond “days,” and packs monorepo split, glass tokens, five new routes, mock API, and five spikes.

---

### Gaps

| Area | What’s missing in this doc |
|---|---|
| **IA / shell** | No nav model, information priority, or “one job per screen” for Home, Inbox, Agents, Workflows, Scout, Kanban, ⌘K |
| **Design system** | No type scale, spacing rhythm, density budget, contrast targets, or motion budget—only “glass tokens” |
| **States** | No empty / loading / error / offline / degraded-provider work in any phase (impeccable `harden` / craft-floor states) |
| **Operate craft** | No “screen question,” primary action, or honest data inventory for each new surface (app-screens run §2) |
| **Security timeline** | Auth is “auth token”; no storage, rotation, localhost binding, or remote-access model before Phase 5 tunnel |
| **Privacy** | Phase 4 “file/project indexing” with no retention, exclusion, or “what Scout may read” criteria |
| **Estimates** | Only Phase 0 is timed; Phases 1–5 and week-long soak done-whens have no capacity against them |
| **Design verification** | Testing is unit/contract/Playwright smoke—nothing for hierarchy, contrast, reduced motion, or phone composition |

---

### Unrealistic scope

- **Phase 0** is a program, not “days”: repo reshape + design-token adoption + five shell routes + mock layer + five adapter spikes.
- **Phase 1** alone is a product: daemon, SQLite, auth, SSE, events, two adapters, Connections, model/effort picker, streaming, history, routing fallback.
- **Phase 2–4** each combine net-new domains (scheduler/workflows, Hermes+Kanban+more adapters, Scout+index+Home+⌘K+compare+hardening) with soak criteria (“a week,” “under 30% noise”) that need calendar after build, not instead of it.
- **Phase 5** stacks packaging *or* service install, backups UI, notifications, light theme, and phone-over-tunnel—any one of those is a phase for a solo path.
- **“No phase starts before the last passes”** plus multi-week done-whens will stall or force rubber-stamping.

---

### Security / privacy risks (as sequenced here)

1. **Privilege before containment.** Workflows with tool steps (P2) and Hermes/agent chats (P3) precede sandboxed shell and approval-rules UI (P4).
2. **Remote surface late and thin.** “Phone access over a tunnel” (P5) sits on Phase 1’s auth token with no extra authn/z, bind address, or session model called out.
3. **Local index without policy.** Scout “file/project indexing and search” (P4) expands what the daemon can see; this doc never names scope, secrets exclusion, or retention.
4. **History / events.** SQLite + conversation history + event table (P1) with no retention, export, or wipe in the roadmap (backups UI appears only in P5).
5. **Background spend / abuse.** Subscription-limit risk is noted; missing is who can trigger jobs, kill switches, and whether Scout/adapters can escalate beyond chat.
6. **Mock switch left on.** “Keep mock data switchable” is good for UI, but with no ship gate it is easy to confuse mock Connections/approvals with real control.

---

### UI / design-quality problems (impeccable + design-taste lens)

This is an **Operate** product (shell + Inbox, Agents, Kanban, Scout, etc.). App-screen rules apply: quiet chrome, colour on data, product-specific face, first screen answers one job. The roadmap under-specifies all of that and over-specifies glass.

**Hierarchy & IA**
- Phase 0 adds five routes before any real data → nav density and parallel empty shells.
- Home aggregation and ⌘K land in Phase 4—classic “search/palette papers over unclear hierarchy” pattern.
- Compare mode has no shape (what compared, where in hierarchy, how density stays readable).

**Spacing, typography, density**
- No density rule for Inbox / Kanban / run logs (app-screens care about pitch, alignment, honest empty frames).
- No type roles (shell title vs section vs table); Operate UIs fail when everything is the same weight.
- “UI already exists as a shell” + glass tokens with no typeset/layout pass → refinement without a craft floor.

**Motion**
- No motion budget, reduced-motion, or “one authored moment.” Glass/blur stacks usually imply decorative motion and backdrop cost; skills want purposeful, transform/opacity-first motion with a reduced-motion path—not deferred forever and not implied by glass.

**Legibility & contrast**
- Light theme as Phase 5 polish: contrast and secondary text on translucent surfaces are the hardest problems; solving them after shipping dark glass is expensive and often fails AA on blur.
- Translucent surfaces over busy chat/agent content are a known contrast/legibility trap; the roadmap adopts that as the system.

**Taste / anti-slop**
- “Translucent Glass” is the category costume both skills are built to kill (glass, blur, floating chrome).
- Phase 5 “notifications” with no hierarchy risks badge/pill clutter (banned tells on pages; on app screens, colour must stay on data/decisions, not chrome).
- No product-specific “one element only this product has” (app-screens § face)—roadmap reads as generic agent-ops dashboard assembly order.

**What’s strong (briefly)**  
Mock-first screen-by-screen backend, subscription-without-API-keys done-when, Hermes mock-before-real, and “ship without Grok” are good scope discipline—the design and security sequencing do not match that discipline.

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Replace Phase 0 “Translucent Glass” with a non-glass Operate token pass (flat surfaces, tone steps, one accent on data/actions)—or explicitly accept glass as a brief override and document the a11y cost.
2. Move **sandbox + approval policy** to before or with first tool-capable workflow/agent, not Phase 4.
3. Shrink Phase 0 to: monorepo + mock layer + **Chat (+ Connections) routes only**; defer Scout/Kanban/Agents shell until their phase.
4. Promote **light/dark from use scene**, empty/error states, and density rules out of “Polish” into Foundations / Chat.
5. Give Phases 1–4 real timeboxes and treat week-long soak done-whens as post-build gates, not build content.

I did not run impeccable’s dual-agent critique or taste `inspect` (target is a markdown roadmap, not a rendered surface). This is a doc-only review through those skills’ Operate / craft rules.
