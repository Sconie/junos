**Verdict:** As an index, this overview is clear. As a product brief it locks a glass-dark visual world that fights its own principles, and it lists roughly a full product suite without a primary job, shell hierarchy, or security boundary.

Lens: Impeccable **Operate** (task UI, restraint, state-only motion) + design-taste **app screens** (flat surfaces, colour on data, no glass/blur, quiet nav, density by job).

---

### Contradictions

1. **“Boring and changeable” vs “Translucent Glass”**  
   Principle 5 asks for small pieces and easy swaps. The Screens heading hard-pins the whole product to frosted panels / backdrop blur. That is neither boring nor cheap to swap (nested blur, solid fallbacks, text-on-glass contrast). Same doc pulls in two directions.

2. **“One event stream” vs ten peer screens**  
   Principle 3 says Inbox, Home, and Kanban are *views* over one stream. The table treats ~10 destinations as equals (Home, Chat, Agent chats, Inbox, Tasks, Workflows, Hermes, Scout, Kanban, Files, Connections). That is a shell/IA contradiction: views vs a product with eleven top-level places.

3. **“Subscriptions, not API keys” vs real trust model**  
   Principle 1 reads as “we avoid secrets.” Session/CLI auth for Claude, Codex, Cursor, Grok, Nous *is* credential material. The framing understates the blast radius of one local command center.

4. **Local-first web client vs “responsive web only”**  
   Non-goals correctly kill a mobile app and public hosting, but still promise a usable responsive web UI for a dense multi-pane ops surface. Overview never names how a 10-destination command center folds—so “responsive” and “command center” are asserted together without a plan.

5. **Broken visual contract**  
   Screens must “match the Stitch Translucent Glass mockups in `/design`.” In this repo that glass mockup tree is not present (only `docs/design/stitch-prompts.md`). The overview commits implementers to assets that are not there.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No primary job | Operate / app-screen rule: first screen answers one question and puts the frequent action one click away. “What needs his attention?” is implied by Inbox/Home but never owned. |
| No shell model | No nav pattern (rail vs sidebar vs command palette), no which screens are primary vs nested. Cognitive load: >4 peer destinations with no hierarchy. |
| No MVP cut | Flat list of Chat + workflows + Hermes + Scout + Kanban + files + connections. No “ship this vertical first.” |
| No density map | Chat, Hermes logs, Kanban, and Files need different pitch/type; overview only says “match glass mockups.” |
| No motion / a11y invariants | Operate wants 150–250 ms state feedback and no load choreography; glass kits usually bring ambient blur/glow. Overview doesn’t constrain that. |
| No contrast invariant next to glass | Text on frosted panels is the usual failure; contrast/fallback isn’t stated here (only deferred to `14`). |
| Overlapping destinations unexplained | Agent chats vs Inbox vs Hermes vs Scout — four “watch the agent” surfaces with no ownership sentence. |
| Security one-liner missing | Points at `12` but never states the trust boundary (local daemon + browser = anything on localhost). |

---

### Unrealistic scope

For a draft v0.1 overview, the product is simultaneously:

- multi-provider chat client  
- cron/workflow runner  
- agent supervisor (Hermes)  
- attention inbox  
- Scout (outbound/research-shaped)  
- Kanban  
- files/projects browser  
- connection manager  

That is several products. Principles (“boring,” “human in charge,” “one event stream”) could support a tight slice—e.g. **event stream → Home/Inbox + one chat path + approvals**—but the screen list does not. Matching a full Stitch set for all of those before IA and threat model settle is also unrealistic.

---

### Security / privacy risks (from this doc alone)

1. **Single vault for every paid CLI/session** — one local app becomes the compromise path for all listed providers.  
2. **Web UI → local daemon** — XSS or a malicious page talking to localhost can punch through “local first”; non-goal “no public hosting” does not remove that.  
3. **One event stream of runs, messages, tasks, findings** — high-sensitivity retention with no overview stance on retention, redaction, or what never leaves disk.  
4. **Approval only for “destructive or outward-facing”** — silent read / tool use / data leave via chat tools is outside that sentence.  
5. **Scout** — name alone implies outbound observation; privacy posture for a personal machine isn’t scoped here.  
6. **Principle 1 softens the secret story** — under-labeling session material as “not API keys” invites weak handling later.

---

### UI / design quality (skills lens)

Mode is **Operate / app screen**, not Persuade. Ambition here should be precision and scanability, not atmosphere.

**Glass / chrome (highest severity)**  
Design-taste app house rules ban glass and backdrop blur; tells list “neon on dark, glowing borders, glass.” Surfaces should be opaque tone steps; colour on data (~3% coloured pixels), not on chrome. The overview’s only visual mandate is the opposite kit.

**Hierarchy**  
No product face, no primary question, no ranked destinations. A personal “Jonas command center” could own a strong idea (terminal/CLI ritual, approval as the object, one attention queue). Glass-dark multi-panel dashboard is category costume—could be any AI ops demo after removing the wordmark.

**Density**  
Ten dense destinations + glass panels + “generous” mockup spacing typically yields either cramped frosted cards or empty chrome. Overview never assigns sparse (Home/Connections) vs medium (Inbox/Kanban) vs dense (Hermes/Chat logs).

**Typography**  
Deferred to `14`, but pinning Translucent Glass usually imports Inter + display/hero headers. Operate wants one tuned sans, tight scale (≈1.125–1.2), no display fonts in labels; app screens often keep titles ≤24 px. Overview doesn’t protect that.

**Spacing / composition**  
“Match mockups” without a shell (open plane / ruled T-frame / etc.) invites floating glass cards, unequal margins, and leftover voids—exactly what app-screen rules call unfinished.

**Motion**  
No budget. Risk: decorative blur/ambient motion. Operate: motion = state only; app screens: no motion floor—feedback on press/hover/focus/sheets only.

**Legibility / contrast**  
Frosted panels + dark atmosphere + secondary grey text is a known 4.5:1 failure mode. Overview mandates the aesthetic without a hard contrast rule beside it.

**Responsive**  
Non-goal “responsive web only” with this IA needs an explicit fold (top bar + sheet, ≤5 bottom destinations). Unstated → either a useless phone shell or a second product.

---

### Priority fixes (doc-only; not implementing)

1. Drop or demote “Translucent Glass” from this overview; put visual direction only in `14`, and prefer flat Operate/app-screen surfaces over glass.  
2. Name **one** primary job and make Home/Inbox the default; demote the rest to secondary or phase 2.  
3. Reconcile “views over one stream” with a real shell (≤5 primary nav items).  
4. Add one trust-boundary sentence (local daemon, browser, session material, approvals include silent outward data).  
5. Fix or remove the `/design` mockup path until assets exist.  
6. Add density + contrast + motion one-liners so `14` can’t quietly reintroduce glass chrome.

---

Questions skipped: Ask-mode doc review only; no live UI or impeccable detector run (nothing rendered to score).
