## Findings (ranked)

### 1. High — Design lock-in fights the skill lens and is mostly missing on disk
**Ref:** §Screens — *“match the Stitch ‘Translucent Glass’ mockups in /design”*; mirrored in [14-ui-system](docs/specs/14-ui-system.md) (frosted panels, `--bg-glow` gradients, `#8B5CF6`, Inter, `--blur` / `backdrop-filter`).

**Why:** design-taste house rules ban glass, gradients, violet/indigo “assistant palette,” and floating glass chrome; impeccable/app-screen guidance treats dark glass + Inter + violet as kit, not product identity. Cross-check: `/design/stitch-glass/` and `/design/stitch-softdark/` are not in the repo (only [docs/design/stitch-prompts.md](docs/design/stitch-prompts.md)); `src/index.css` is still flat panels and blue `#7c9cff`, not glass.

**Fix:** In `00-overview`, replace the Stitch path with a durable art direction: Operate-mode personal OS, one ground / one ink / one accent drawn from *Jonas’s* world (not gallery violet), no glass as the product idea; point at `14` only after `14` is rewritten to match, or mark Stitch as discarded concept art. Add a real reference folder or drop the path until assets exist.

---

### 2. High — Product framed as a full command center with no MVP cut
**Ref:** §What JunOS is — chat any paid model, scheduled + on-demand workflows, Hermes, attention, board, files/projects; §Screens lists ~10 destinations (Chat, Agent chats, Inbox, Tasks, Workflows, Hermes, Scout, Kanban, Files, Connections).

**Why:** [13-roadmap](docs/specs/13-roadmap.md) needs five phases and a week of unattended briefing before agents/board/Scout; [03](docs/specs/03-connections-and-routing.md) marks Grok **low** and Cursor/Nous **medium**. Overview reads as ship-all-now and invites scope creep the roadmap already fears.

**Fix:** Add an explicit **v1 slice** (e.g. local daemon + Claude chat + Connections + one scheduled task + Inbox for failures) and label remaining screens as Phase N. Keep the vision one paragraph; make the screen table Phase-tagged.

---

### 3. High — Navigation / IA contradicts itself across overview, UI system, Stitch, and `src`
**Ref:** Overview screen table (Home, Chat, Agent chats, Inbox, Tasks, Workflows, Hermes, Scout, Kanban, Files, Connections) vs [14](docs/specs/14-ui-system.md) rail (Home, Inbox, Chat, Agents, Workflows, Tasks, Kanban, Hermes, Scout, Files + Connections/Settings) vs [stitch-prompts](docs/design/stitch-prompts.md) (Home, Chat, Hermes, Tasks, Files, Projects + Connections/Settings — no Inbox/Scout/Kanban/Agents/Workflows) vs `src/App.tsx` (6 routes: Overview, Chat, Schedules, Hermes, Files, Connections).

**Why:** ~11 equal destinations blows cognitive load (app-screens: one primary job on the first screen; nav should recede). “Agent chats” vs “Agents”, “Tasks / crons” vs “Scheduled”, missing **Settings** (approvals live there in [12](docs/specs/12-security-and-privacy.md)), and Stitch still splitting Files/Projects break the overview’s claim to be the index.

**Fix:** One canonical IA in `00`: ordered primary jobs (≤5 in the rail, rest under More/⌘K), rename once, add Settings to the index, and state that Stitch prompt 0 is stale until regenerated.

---

### 4. High — Home-as-card-dashboard is endorsed without a product question
**Ref:** Screens → Home → [10-home-and-search](docs/specs/10-home-and-search.md) (greeting + 8 cards); Stitch Home: “Good evening, Jonas” + Quick ask / Upcoming / Hermes / Subscriptions / Projects / Files grid.

**Why:** That pattern is the generated-dashboard average (welcome, KPI/status tiles, icon cards). App-screen rules: no hero header theatre, KPIs as type not tiles, first viewport must answer one question and expose the most frequent action. Overview never states what Home is *for*, so the bad mockup wins by default.

**Fix:** In overview (or a one-line Home brief): e.g. “Home answers: what needs Jonas in the next hour?” — then list 1 primary control + 2–3 data regions, not eight peer cards. Ban subscription usage bars and sparkline project tiles from the overview’s design contract.

---

### 5. High — Security principles understate the real threat model
**Ref:** Principles 2 & 4 (*local first*; *approve anything destructive or outward-facing*) vs non-goals (*responsive web only*) vs [12](docs/specs/12-security-and-privacy.md) (#1 risk = prompt injection; write-local auto in Balanced; tunnel remote) and [13](docs/specs/13-roadmap.md) Phase 5 phone-over-tunnel.

**Why:** Overview never names prompt injection, pairing token, CORS/DNS-rebinding, or that “Balanced” auto-writes. Non-goals reject public hosting but roadmap tunnels expand the attack surface without a matching overview constraint. Readers of only `00` get a softer story than `12`.

**Fix:** Add a fifth-or-sixth principle: untrusted content is data; tools that follow it need policy. State defaults: Ask-first until Phase N; remote = tunnel + same token only; link `12` as binding, not optional. Align non-goals with Phase 5 or mark tunnel as an explicit exception.

---

### 6. Med — “Subscriptions, not API keys” is absolute but not true for every provider
**Ref:** Principle 1; Connections row; [03](docs/specs/03-connections-and-routing.md) (Nous: “Portal login **or key**”; Grok path unconfirmed).

**Why:** Absolute wording pushes adapters toward scraping sessions or inventing Grok bridges — exactly what `03` warns against (ToS / bans).

**Fix:** Soften to: “Prefer official CLIs/sessions Jonas already pays for; no JunOS-owned provider API billing; drop or stub providers without a legitimate path (see 03).” Call out Nous/Grok as spike-gated in the overview table.

---

### 7. Med — “One event stream” overclaims what Home/Kanban are
**Ref:** Principle 3 — *“Inbox, Home and Kanban are views over it.”* vs [01](docs/specs/01-architecture.md) (events + materialized tables; Home aggregates Hermes, connections, board counts).

**Why:** Treating everything as an event feed encourages timeline-UI for board and glance surfaces, and fights a quiet Operate layout (tables, columns, typed counts).

**Fix:** “Append-only event log is the audit/source of truth; Inbox is primarily event-driven; Home/Kanban are projections (queries + snapshots), not raw feeds.”

---

### 8. Med — Principle 5 (“Boring and changeable”) clashes with glass/atmosphere as the screen contract
**Ref:** Principle 5 vs §Screens Translucent Glass / [14](docs/specs/14-ui-system.md) blur depth rules and glow gradients.

**Why:** Glass + nested `backdrop-filter` is neither boring nor cheap to swap (perf, fallbacks, a11y). Skills prefer flat tone steps and swappable tokens.

**Fix:** Make Principle 5 win: plain surfaces, tokens, no blur-as-identity. If glass remains a Jonas pin, document it as an explicit exception to craft defaults and scope blur to overlays only (as stitch prompt 0 already says) — and say that in `00`, not only in `14`.

---

### 9. Med — Privacy wording is slightly wrong and omits JunOS-held secrets
**Ref:** Principle 2 — *“Data and credentials live on Jonas's machine.”* vs [12](docs/specs/12-security-and-privacy.md) (no provider passwords in JunOS; `~/.junos/token`; OS keychain for JunOS secrets).

**Why:** Implies JunOS holds provider credentials; underplays the pairing token and keychain surface.

**Fix:** “Provider logins stay in official CLIs; JunOS keeps local SQLite + a pairing token + keychain secrets only. Browser never holds long-lived provider creds.”

---

### 10. Med — Overview promises open questions but has none; no success metric
**Ref:** Lead — *“every doc ends with open questions”*; body has none. No definition of done / primary outcome (unlike phase Done-whens in `13`).

**Why:** Gaps that should be decided early (IA, design pin vs taste, Grok, Settings, MVP) stay invisible; overview can’t gate other specs.

**Fix:** End with open questions: design pin vs rewrite; rail IA; MVP screen set; tunnel vs non-goals; Settings ownership. Add one product success line (“Jonas runs morning briefing and Claude chat without leaving localhost”).

---

### 11. Med — Current `src` shell is an icon-card Overview; overview doesn’t mark it transitional
**Ref:** Screens contract vs `src/pages/Overview.tsx` (grid of link cards) and emoji/`◎✦` nav in `App.tsx`.

**Why:** design-taste bans icon-topped / identical card rows and emoji chrome; without “shell ≠ target,” implementers will ship the shell aesthetic under the overview’s name.

**Fix:** One sentence in `00`: “Current Vite shell is structural only; visual and IA targets are `14` + this index after reconciliation.” Ban emoji nav in the target IA.

---

### 12. Low — Typography / density signals are all Inter + “Linear/Raycast/terminal”
**Ref:** Indirect via Stitch lock-in; [14](docs/specs/14-ui-system.md) `--font-ui: Inter`; stitch prompt 0 “mix of Linear, Raycast and a terminal.”

**Why:** Category cosplay, not JunOS-specific face (app-screens: dealt face + mark from the product). Overview never asserts a typographic or naming POV.

**Fix:** In overview design one-liner: name the Operate tone (e.g. dense calm, monospace only for cron/model IDs) and require a non-default UI face in `14`; drop competitor-name moodboards from the binding contract.

---

### 13. Low — Non-goals omit multi-agent marketplace-adjacent creep already in the doc set
**Ref:** Non-goals: multi-user, mobile app, public hosting, billing, plugin marketplace. Specs still introduce Scout-as-agent, custom personas ([07](docs/specs/07-inbox-and-agent-chats.md)), workflow marketplace-shaped “launcher,” compare mode ([13](docs/specs/13-roadmap.md)).

**Why:** Without naming those as out-of-scope or phased, “plugin marketplace” is the only explicit stop — weaker than needed.

**Fix:** Extend non-goals: no third-party skill store, no multi-agent orchestration UI in v1, no semantic-search-as-platform until Phase 4 Done-when; Scout stays read-only watcher.

---

### 14. Low — Dual entry for Agent chats + Chat without hierarchy
**Ref:** Screens rows Chat and Agent chats (both point at different specs; [04](docs/specs/04-chat.md) says same component).

**Why:** Two nav peers for one surface doubles chrome and confuses “where do I talk to Hermes?”

**Fix:** One Chat surface in the overview table; “agent threads” as a filter/badge, not a sibling screen — or nest under Agents with a single deep link.
