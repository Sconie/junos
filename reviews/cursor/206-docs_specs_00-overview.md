**Verdict:** As an Operate-mode product brief, `00-overview.md` is clear on who it’s for and what pillars exist, but it locks a **glass/dark AI-console look** that both skills treat as template default, under-specifies craft (contrast, density, motion, states), and has several **IA and delivery contradictions** that will confuse implementers. Security intent is good; the overview still leaves a **UI-vs-enforcement** hole.

*Lens: impeccable (Operate / craft-floor) + design-taste-frontend (app-screens + house rules). Spec-only review — no rendered UI, no detector. Workspace file matches the content you named; git verify was blocked in Ask mode.*

---

### Contradictions (inside this doc)

1. **Nav vs Screens vs “phase in table”**  
   Delivery says each screen lists its phase in 13, but the Screens table has **no phases**. Nav lists Settings; Screens does not. Screens lists **Terminal**; Nav does not. Agent chats are “a filter of Chat, not a separate destination,” yet get their **own Screens row**.

2. **First-release vs full product surface**  
   First release = Claude/Codex chat, Connections, Tasks, Inbox. Primary nav still presents **Home, Chat, Inbox, Tasks, Kanban, Hermes** as if that IA ships together. Scaffold is “mock UI only, no daemon,” while Principle 4 depends on an **execution gateway** that only a daemon can enforce.

3. **“Local first” vs egress**  
   Principle 2 headlines local storage, then admits model context leaves the machine. Honest in the body; the principle name still oversells privacy.

4. **Design authority split**  
   “Translucent Glass is the settled direction” and “match the Stitch mockups,” then “Stitch designs aren’t in the repo yet” and `14` is implementation authority. Implementers have a settled name without a settled artifact.

5. **Status staleness**  
   Status block is draft v0.1 dated **2026-10-21**; accent decision is **2026-10-22** in the same file.

---

### Gaps

| Area | Missing in overview |
|---|---|
| Platform | Electron / Tauri / browser? Only “responsive web” as a non-goal for mobile |
| First-run / empty / offline / disconnected provider | Not mentioned |
| Search | Spec linked as `10-home-and-search`; Nav only says Home |
| Approval UX | “Exact, single-use” said; not that approvals must be unmistakable, interruptive, or non-decorated |
| Event stream | No retention, redaction, or what counts as sensitive in the unified stream |
| Named surfaces | Hermes / Scout / “soft green” usage rules undefined here |
| Craft | No contrast floor, type scale, density, or `prefers-reduced-motion` — all deferred while direction is declared “settled” |

---

### Unrealistic scope

- One-liner packs **six pillars** (multi-provider chat, workflows, Hermes, attention, Kanban, files/projects) plus Terminal and Scout in the index.
- Provider list in Principles (Claude, Codex, Cursor, Grok/X, Nous) is wider than first-release adapters; fine if phased, but the overview doesn’t mark which nav items are **phase ≥3**.
- For a personal single-builder product, shipping a full primary nav of six “always there” destinations before Phases 3–5 is a classic over-build of chrome before jobs.

---

### Security / privacy risks (from this doc alone)

1. **Approval theater** — Scaffold has no daemon; Principle 4’s gateway is the real control. If mock UI shows “Approve” without enforcement, habits form around fake safety. Overview never states “UI must not claim approval until gateway exists.”
2. **CLI / subscription session reuse** — Chat via CLIs Jonas already pays for implies driving authenticated sessions. Overview doesn’t flag **prompt injection → tool use → spend/external send** as the core threat (only “see 12”).
3. **Unified event stream** — Every message, run, task, finding in one store concentrates secrets and model output; retention/encryption not even named here.
4. **“Local first” + provider egress** — Users (and future you) can misread the product as private; overview should treat egress as a first-class principle, not a footnote.
5. **Non-goals help** — No multi-user / public hosting reduces blast radius; still silent on local multi-account OS users, backups, and plaintext SQLite at rest.

---

### UI / design quality (skills lens)

**Mode:** Operate (command center). Ambition = precision and restraint, not Persuade chrome.

**Design-specificity:** “Frosted panels + atmospheric dark + soft green” reads as **category AI dashboard**, not Jonas-specific. App-screens: colour on data not chrome; surfaces flat; no hero chrome; nav recedes. Glass as product identity fights that.

| Topic | Problem in this overview |
|---|---|
| **Hierarchy / IA** | Six primary + five secondary destinations → cognitive load (>4 competing options). Three attention jobs (Home summary, Inbox decisions, Hermes supervision) overlap without a one-line job split beyond labels. |
| **Density** | Full IA presented as current; no “first-release shell” vs “later destinations.” Risk of empty mock shells and thin first screens (app-screens failure mode). |
| **Surfaces / glass** | Settled **Translucent Glass** vs taste **“No glass / no backdrop blur”** and craft-floor **refuse glass/blur as decoration**. Frosted panels on dark atmospheres are the default this lens rejects unless the brief *requires* them with a craft reason (legibility plan). |
| **Contrast / legibility** | Glass on atmospheric dark is a known failure for body/secondary text and disabled states. Overview settles the look without a ≥4.5:1 body rule or “no grey body on frosted panels.” |
| **Typography** | No face, scale, or Operate density (study: many working screens keep headings ~16–24px). Soft green accent unconstrained → likely chrome pills instead of data/action. |
| **Spacing / rhythm** | Deferred to 14 while Nav/Screens already imply a dense multi-pane shell; no “one job per primary surface” spacing rule. |
| **Motion** | Unmentioned. Glass UIs often compensate with blur/glow motion; skills want purposeful motion + reduced-motion fallback, not atmospheric decoration. |
| **High-stakes UX** | Approvals are the emotional peak; overview doesn’t require calm, high-contrast, non-glass treatment for irreversible actions (impeccable: reassurance at high stakes). |

**Pinned-brief note (impeccable):** If you *intentionally* pin Translucent Glass, the skills don’t veto the brief — but then **14 must compensate** (opaque approval surfaces, contrast floors, flat work canvases, accent only on action/data). As written, the overview treats glass as settled craft, not as a constraint that needs compensating rules.

---

### Highest-leverage fixes (overview-only)

1. Add **phase tags** on every Screens/Nav item; hide or demote Phase ≥3 from primary nav in first-release copy.  
2. Resolve **Settings / Terminal / Agent chats / Search** so Nav ≡ Screens ≡ one IA story.  
3. Rewrite Principle 2 to **“Local records; provider egress on every model call.”**  
4. State explicitly: **no approval UX until gateway enforces it.**  
5. Either drop “settled Translucent Glass” until Stitch/14 exist, or add one craft paragraph: flat opaque work surfaces, glass limited to chrome if at all, contrast floors, accent on actions/data only, reduced motion.

---

Questions skipped: Ask-mode spec review; no rendered target for impeccable’s dual assessment / detector.
