**Verdict:** This reads as a feature inventory for a generated dashboard, not a home-screen design brief. As written it fights its own “glance, not work” claim, over-scopes the first viewport, and leaves hierarchy, states, privacy, and destructive actions unspecified.

Mode used: **Operate** (impeccable) / **app screen · home/overview** (design-taste). No live UI to inspect — critique is of the spec’s design decisions.

---

### Contradictions

1. **Glance vs work.** Opening line: “A glance page, not a place to work.” Then: Quick ask → Chat, inline Approve/Deny, Hermes Open, ⌘K create card, Run workflow. That is a work surface with high-stakes actions, not a glance.

2. **One question vs eight equal cards.** App-screen rule: name *one* question and make its block biggest. The list is eight peer modules (Quick ask → Recent files) with no priority, spanning, or “what is left out.” Hermes’s card also appears under Board snapshot — same fact twice with no shared-source rule.

3. **Data loading vs acceptance.** “One `GET /home` aggregate **or** per-card queries” vs “Home renders in under 1 second from local data.” Aggregate of eight domains and independent per-card fetches are different products; the 1s bar is undefined for either path (cold vs warm, empty vs full inbox).

4. **Search scope vs deferred semantic.** Global search claims messages, cards, findings, inbox, file names **and** summaries; semantic file search is “comes with 11.” Unclear whether summaries are FTS-only now, empty until 11, or half-built.

5. **Palette “execute on Enter” vs actions.** Jumping to a screen on Enter is fine; “Run workflow” / “Ask Hermes” / “New …” on the same Enter path needs confirmation rules the doc never gives.

---

### Gaps (spec holes that block a good build)

| Missing | Why it matters |
| --- | --- |
| Screen’s one question + one finding | Without them, layout defaults to equal card grid (generated-dashboard tell). |
| Layout / IA | No grid, spans, above-the-fold order, “View all” caps, or link-out targets for Inbox / Kanban / Hermes. |
| Empty / zero / offline | Per-card skeleton/error only; no empty copy, no “0 upcoming,” no daemon-down behavior on Home. |
| Approval UX | Approve/Deny: confirm? undo? which fields shown? what if item already resolved elsewhere? |
| ⌘K ranking & scoping | “Recent first” + fuzzy + NL last row — no tie-break, privacy of result previews, project filter. |
| Search quality acceptance | No ranking, snippet, highlight, or “no results” criteria; filters named but not behavior. |
| Keyboard / a11y | UI system elsewhere requires keyboard-first and no color-only status; this doc doesn’t. |
| Responsive | Eight cards + palette + search — no phone composition (rail → bottom tabs). |
| Motion | None; Operate wants 150–250 ms state motion only — silence invites load choreography. |
| Typography / density / contrast | Zero tokens or type roles; “status dot” and “usage bar” without legible labels. |

Acceptance is only two bullets (1 s home, 100 ms ⌘K). That does not gate empty states, search correctness, or safe approvals.

---

### Unrealistic scope

- **Eight first-class widgets** (plus greeting/date) on one glance page. App-screen guidance: at 1440×900 every named block shows header + first rows; time-sensitive before long lists; lists capped ~4–6. Eight independent cards almost guarantees fold overflow, ragged row heights, and stretched empty panels.
- **Home as mini-Inbox + mini-Kanban + mini-Hermes + mini-Scout + billing.** Duplicates other surfaces; high maintenance and stale-data risk unless this is explicitly a thin projection with deep links only.
- **`GET /home` as one aggregate** of inbox, tasks, Hermes, board, subscriptions, scout, projects/files — heavy for “local under 1 s,” especially with live event stream fan-in.
- **⌘K as navigation + creation + workflows + NL ask** in one modal is a full product; “opens in under 100 ms” is optimistic once FTS + actions + model chip hydrate.
- **“from the mockup”** with no linked mockup / Stitch screen — scope is unanchored.

---

### Security / privacy risks

1. **Inline Approve/Deny on Home** — high-impact actions on a dense glance surface; easy mis-click; no confirmation, rate limit, or audit trail in the spec.
2. **Aggregate `/home` (or event stream)** — single payload/channel mixing approvals, agent state, usage, findings; over-broad for least privilege and for accidental logging of sensitive inbox bodies.
3. **FTS5 across messages, inbox, findings, file summaries** — indexes sensitive content; no mention of what is indexed, retention, exclusion (secrets, vaulted files), or snippet redaction in results.
4. **⌘K / search result previews** — listing conversations/files/cards can leak titles into shoulder-surfing or shared screens; no “hide content” / blur mode.
5. **Natural-language “Ask \<model\>”** from palette — unclear whether the typed sentence is sent as chat (and thus stored/logged) on Enter without explicit confirm.
6. **Subscriptions / usage bars** — may expose org billing/provider quotas on the default landing screen.

---

### UI / design-quality problems (lens findings)

**Hierarchy.** Greeting + date as opener is the app-screen “Welcome back” tell (editorial-greeting is a *chosen* style, not the default for an ops home). Eight peer cards = no hierarchy. “Needs you” should dominate if the job is triage; Quick ask as card #1 competes with Chat and ⌘K.

**Density / composition.** Classic generated-dashboard kit: greeting, equal cards, status dots, usage bars, board “counts per column,” last-N lists. Prefer one divided surface or uneven spans driven by the one question; peer metrics only as equal tiles when they are the same kind of object.

**Typography.** No title noun (“Home” / workspace name), no type scale, no rule that running text stays full ink. Model chip + inputs on Home invite small tracked labels and monospace chrome — banned tells unless they are real code/IDs.

**Spacing / layout.** Independent cards with skeletons will load to different heights → ragged bottoms and void bands. Spec never says: shared row bottom edges, no stretch-over-empty, 4–6 row caps, gutter math.

**Legibility / contrast.** “Status dot” without text/icon fails color-alone. Usage bars without numbers/units fail. Frosted/glass UI (product direction elsewhere) needs explicit contrast for dim text on glass — this doc is silent.

**Motion.** Per-card skeleton → data is good; no reduced-motion, no ban on orchestrated “dashboard reveal.” Operate: motion = state feedback only.

**Interaction clarity.** Quick ask vs ⌘K vs Chat vs “Ask model” in palette — three ask entry points, no differentiation. Scout “latest 3 findings” and Board “blocked cards” without severity or next action read as wallpaper.

---

### Highest-leverage fixes (if you revise the doc)

1. Pick **one question** (e.g. “What needs me?”) and make Needs-you + finding the primary block; demote or deep-link the rest.
2. Resolve **glance vs work**: either remove Approve/Deny/Quick ask, or rename Home as a triage hub and specify confirm/undo.
3. Cap the brief to **≤4 blocks above the fold**, each with empty/error/zero and a View-all target.
4. Split **data contract**: prefer per-card queries + stream; define what `/home` may never include (message bodies, secrets).
5. Add **search/⌘K privacy + Enter semantics** (navigate vs mutate vs send-to-model).
6. Add design minimums: noun title, no color-only status, density/type from Operate (tight rem scale, 150–250 ms state motion), phone stack order.

I can go deeper on a revised outline for this spec (still Ask mode) if you want that next.
