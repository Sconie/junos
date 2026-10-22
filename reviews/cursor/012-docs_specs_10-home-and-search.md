## Ranked findings

### 1. high — Inline Approve/Deny without the approval body
**Ref:** §Home card 2 — “top 5 Inbox items (approvals first) with inline Approve/Deny.”  
**Why:** `12-security-and-privacy` requires approvals to show the **exact command/diff**; `07` also offers “Approve and remember.” A five-row Home strip cannot carry that evidence. Approving from a title line invites rubber-stamping destructive/external/spend actions and diverges from the Inbox contract.  
**Fix:** Home shows urgency + one-line title only; primary actions are **Open** / **Go to Inbox**. If inline approve stays, require an expandable preview of the exact command/diff (and “Approve and remember”) before the button enables — same payload as `POST /inbox/:id/action`.

### 2. high — “Glance page, not a place to work” vs an eight-card work surface
**Ref:** opening line vs cards 1–8 (Quick ask, Needs you + actions, Hermes Open, Board, Subscriptions, Scout, projects/files).  
**Why:** App-screen craft (`design-taste` §2.2): one question, one frequent job one click away, every named block visible at 1440×900. Eight peer cards force either an unreadable fold or a KPI-tile dashboard — the generated-dashboard tell the skill bans. Purpose and layout fight each other.  
**Fix:** Name one Home question (e.g. “What needs Jonas now?”). Ship **Needs you + next run + Hermes state** above the fold; demote Board / Subscriptions / Scout / Recent to “View all” links or a second row. Drop or merge duplicates (see #5).

### 3. high — “From the mockup” does not match the Stitch Home brief
**Ref:** “cards (from the mockup)” vs `docs/design/stitch-prompts.md` §1.  
**Why:** Stitch Home has Quick ask, Upcoming runs, Hermes, Subscriptions, Recent projects, Recent files — **no** Needs you, Board snapshot, or Scout; projects/files are separate. Spec invents high-stakes UI and still claims mockup fidelity → implementers will fight design and each other.  
**Fix:** Either regenerate the Stitch Home prompt to match this card set, or rewrite §Home to the six mockup cards and treat Inbox/Board/Scout as deep links only. Stop saying “from the mockup” until they match.

### 4. high — Global FTS over messages/inbox with no schema or result-privacy rules
**Ref:** §Global search — FTS5 across messages, cards, findings, inbox items, file names/summaries; filters type/project/date.  
**Why:** `02-data-model` has **no** FTS virtual tables or sync rules. Message/inbox bodies can hold secrets, diffs, and PII; `12` redacts logs but search is a second leak surface (snippets, ⌘K preview, clipboard). Semantic file search is deferred to `11` without restating “embeddings stay local.”  
**Fix:** Add FTS tables + indexer ownership to `02`/`01`; define snippet redaction (same patterns as logs); exclude approval bodies / secret-like paths by default; state that semantic search uses the local embedding path from `11` or is off until that lands. Add acceptance: sensitive path/content never appears in snippets.

### 5. med — Duplicate Hermes “current work” on two cards
**Ref:** card 4 “current card or task” and card 5 “Hermes’s current card, blocked cards.”  
**Why:** App-screen rule: a fact shown twice is one variable; disagreeing cards destroy trust. Two widgets competing for the same live state also waste the glance budget.  
**Fix:** One Hermes strip owns live state + Open. Board snapshot is column counts + blocked only (or “Hermes: [link]” pointing at card 4), not a second current-card field.

### 6. med — Unresolved data contract: aggregate vs fan-out
**Ref:** “one `GET /home` aggregate or per-card queries plus the event stream.”  
**Why:** Acceptance demands &lt;1s and isolated failure. Aggregate + independent card errors need partial responses or field-level errors; pure fan-out needs eight endpoints and cache rules. Roadmap Phase 4 dumps Home on top of Scout + files + search — scope is late and vague.  
**Fix:** Pick one: e.g. `GET /home` returns per-section `{ data | error }` objects + SSE `home.*` / existing domain events; document payload shape like other specs’ API sketches. Split Phase 4: Home v1 on Inbox+Tasks+Hermes only; Scout/files widgets after those APIs exist.

### 7. med — Three “ask” entry points without IA
**Ref:** Quick ask (card 1); ⌘K “Ask &lt;current model&gt;” / “Ask Hermes”; Chat composer (`04`).  
**Why:** Operate UI fails when the same job has three near-identical doors. Quick ask as full-width hero also fights “glance, not work” and pulls Chat chrome onto Home.  
**Fix:** One rule: Home Quick ask **creates/navigates to a Chat**; ⌘K NL row is the same action (same model chip defaults); no third behavior. Or remove Quick ask and keep only ⌘K + Chat.

### 8. med — Greeting + equal card grid = generic AI dashboard
**Ref:** “Greeting and date, then cards”; stitch: “Good evening, Jonas” + masonry cards; `14-ui-system` glass/violet/Inter.  
**Why:** `design-taste` app tells: greeting-as-hero, equal peer cards, glass/glow, violet chrome, Inter kit face. Impeccable Operate mode wants scanability and product-specific hierarchy, not a welcome banner over tiles. Spec never names the screen’s one finding or title hierarchy.  
**Fix:** Spec a noun title (“Home” / “Needs you”) ≤24px, date as quiet meta; lead with the urgent list (type, not tiles); forbid icon-in-circle KPIs and usage-bar decoration on Home; defer glass/blur to shell overlays per `14`, not every card. Point implementers at `14` tokens but add Home-specific anti-patterns from this list.

### 9. med — Destructive / spend actions from ⌘K with no confirm path
**Ref:** §Command palette — “Run workflow”, “Ask Hermes”; “executes on Enter.”  
**Why:** `05`/`12` treat workflow runs and agent handoffs as budgeted and often approval-gated. Instant Enter from a fuzzy list skips parameters, dry-run, and cost guard from `03`.  
**Fix:** Jump/create-nav actions execute on Enter; Run workflow / Ask Hermes open a confirm sheet (params, model, cost-guard note) or the existing launcher/directive UI. Document which actions are “instant” vs “staged.”

### 10. med — No keyboard map, empty/first-run, or responsive collapse (required elsewhere)
**Ref:** whole doc vs `14` “Keyboard-first (list in each spec)” and “States every screen needs”; `14` bottom tab below 900px.  
**Why:** Home is the default route (`Overview` today). Spec covers skeleton/error per card but not empty Inbox/tasks, first-run (no providers), or how an 8-card grid becomes a phone stack. Gaps will ship as ad-hoc UI.  
**Fix:** Add keys (e.g. `g h` Home, `⌘K`, `a`/`d` only in Inbox not Home); empty copy with next action; phone: Needs you → Upcoming → Hermes, rest behind “More.”

### 11. low — Status dots as colour-only signal
**Ref:** “status dot” on Upcoming runs; Hermes “state.”  
**Why:** `14` forbids information by colour alone.  
**Fix:** Dot + text (`ok` / `failed` / `paused`) or icon+label; same `StatusDot` component contract as `14`.

### 12. low — Acceptance ignores search and under-specifies Home success
**Ref:** §Acceptance — &lt;1s Home, failing card isolated; ⌘K &lt;100ms and create card.  
**Why:** Global search is half the doc title but has no acceptance; “create a card without leaving the page” is Kanban work on a “glance” screen with no UX for the created card.  
**Fix:** Add search acceptance (query → ranked hit &lt;N ms local; filter by type; open target). For ⌘K card create: toast + optional “Open board,” or drop create-from-palette from Home acceptance.

### 13. low — Spec/UI naming drift vs current `src/`
**Ref:** doc “Home” vs `src/pages/Overview.tsx` (“Good to see you” + nav link cards); rail in `14` includes Inbox/Kanban/Scout absent from `App.tsx`.  
**Why:** Not a logic bug in the doc alone, but implementers following `10` will not match the shell or `14` nav order without an explicit rename/route note.  
**Fix:** One line in `10`: route `/` title Home, replace Overview; nav order deferred to `14` (single source of truth).
