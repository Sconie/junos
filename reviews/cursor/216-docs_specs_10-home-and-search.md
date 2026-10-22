**Verdict:** Spec 10 is a solid *systems* sketch (independent card loading, ⌘K must not auto-send, Inbox as decision authority) but a weak *product-UI* brief. Through Impeccable Operate + design-taste app-screens, it reads as an eight-widget dashboard with a greeting bolted on—high collision risk with “glance, not work,” and almost no hierarchy, layout, or state craft specified.

---

### Contradictions

1. **Glance vs decisions** — “A glance page, not a place to work” conflicts with **Needs you** inline Approve/Deny and with **Quick ask** (a full ask→Chat path). Rev 2’s “Home is a summary; Inbox is the authority” does not resolve whether Approve/Deny on Home is binding, soft-link, or forbidden.

2. **Dual data contract** — “one `GET /home` aggregate **or** per-card queries” plus SSE. Rev 2 only hardens the aggregate shape. Implementers can ship two architectures; failure modes and “under 1s” meaning diverge.

3. **Hermes duplicated** — Cards 4 and 5 both surface “Hermes’s current card.” App-screens rule: a fact shown twice must be one source; two cards that drift destroy trust.

4. **Search scope vs phase** — “Global search” promises FTS now and semantic “with the file index (11).” Unclear whether Home/⌘K ship without 11, or whether “file summaries” already imply index work.

5. **⌘K “create a card without leaving the page”** — Ambiguous: leave Home, leave whatever route you were on, or open a modal? Conflicts with “jump to any screen” if creation navigates.

6. **Two ask surfaces** — Quick ask (card) vs ⌘K “Ask \<model\>” (explicit row + 04 disclosure). Disclosure is called out only for ⌘K; Quick ask “sends into Chat” with no parallel rule in this doc.

---

### Gaps (spec silence that will bite)

| Area | Missing |
|---|---|
| **One question** | No screen question / finding (e.g. “Who is waiting on me?”). Eight equal cards → no hierarchy. |
| **Layout** | Order is a list, not composition: columns, span, above-the-fold budget, “View all” targets, phone stack (14 collapses rail &lt;900px; Home with 8 cards is unspecified). |
| **States** | Skeleton / error / retry named; empty, zero, stale UI, offline, and SSE-vs-payload conflict not. |
| **⌘K** | Non-Mac shortcut; empty/no-match copy; when fuzzy vs NL mode engages; ranking; disabled actions; focus trap / a11y. |
| **Search** | Result ranking, highlight, pagination, filter UX, deleted/revoked content, message vs summary indexing. |
| **Approvals** | Re-read-before-approve, irreversible warning, focus-scoped shortcuts (14’s ApprovalCard rules)—not referenced here. |
| **Copy** | “Greeting and date” only—name? timezone? locale? generic “Welcome back” risk. |
| **Visual** | No type scale, density, motion budget, or card anatomy; “from the mockup” with no linked brief. |

---

### Unrealistic scope

- **Eight live cards + aggregate/SSE + &lt;1s** from “local data” with no cold-start, empty-DB, or first-paint definition.
- **⌘K &lt;100ms** while indexing conversations, projects, files, cards, tasks, fuzzy match, recent ranking, and actions—plus create-card—without indexing/prewarm rules.
- **Home as Inbox lite** (top 5 + Approve/Deny) duplicates a primary nav destination and expands QA surface for the riskiest actions.
- Shipping **Board + Hermes + Subscriptions + Scout + Files** as first-class Home citizens before those domains stabilize (roadmap ties Home to later Scout/index work).

---

### Security / privacy

- **High-stakes actions on a low-attention surface** — Approve/Deny on a glance grid invites mis-clicks; this doc does not require ApprovalCard semantics, revalidation, or irreversible callouts.
- **Quick ask → Chat** — Can send provider-bound context without the disclosure rule you already require for ⌘K.
- **`GET /home` aggregate** — Bundles inbox, board, usage, scout, files; over-broad for future multi-user/tenancy; no field-level sensitivity notes.
- **FTS over messages / inbox / files** — No retention, redaction, deletion-from-index, or path-leakage rules for “Recent projects and files.”
- **SSE-driven Home updates** — Authz and “stale” handling for streamed mutations not specified (spoofed or late events could show wrong approval state).
- **Greeting personalization** — If it uses identity/calendar, privacy surface is unnamed.

Rev 2’s ⌘K “never sends on its own” is the strongest line in the doc; extend that discipline to Quick ask and Home approvals or cut those actions.

---

### UI / design quality (skills lens)

**Mode:** Operate / app `home` overview—not a marketing page. Ambition should be precision and scanability, not expression.

**Hierarchy** — Greeting + date as the opener without a finding or primary job fails app-screens §2.2 (“one question,” “most frequent job one click away”). Eight peer cards is the stock dashboard the skill exists to prevent (KPI/tile row, then widgets).

**Density & layout** — “Everything the brief names on the first screen” at 1440×900 cannot honestly hold eight headers + first rows without crush or scroll. Spec never chooses: prioritize 2–3 blocks, or accept intentional scroll with a named hero block (~200–360px).

**Typography** — No sizes/roles. Risk: large greeting competing with data, or uniform card titles with no dominant answer. Operate wants a tight rem scale and one UI family—not a hero greeting unless you deliberately pick something like `editorial-greeting` and mean it.

**Colour / legibility** — “Status dot” alone conflicts with “no information by colour alone” (system-wide). Usage bars on glass need contrast rules this doc never states. Dim secondary text for cron/next-time will fail if unspecified.

**Components / tells** — Card grid + greeting + usage bars + column counts + status dots ≈ generated-dashboard tells (app-screens §14). Flat tone-step panels and type-led figures would fit a glance home better than eight equal glass tiles.

**Motion** — Independent skeletons are good; unspecified staggered load choreography fights Operate (“no orchestrated page-load sequences,” 150–250ms state motion only).

**⌘K** — Grouping, recent-first, explicit Ask row: strong. Competing **Quick ask** card + top-bar ⌘K field (from 14) splits the same job.

**Spacing** — No home grid map onto the 12-column system; ragged multi-card rows and stretched empty panels are predictable failures when “8 cards from the mockup” is the only brief.

---

### Highest-leverage fixes (for the next rev of *this* doc only)

1. **Pick Home’s one question** and demote or deep-link the rest (Scout/Subscriptions/Board → “Open …” rows, not peer cards).
2. **Resolve glance vs Approve/Deny**: summary + deep link, or full ApprovalCard contract + Inbox remains source of truth with sync rules.
3. **One data contract** (`GET /home` + SSE), define `stale`/`empty`/`zero` UI, and drop the “or per-card” fork.
4. **Dedupe Hermes**; one owner for “current card.”
5. **Align ask paths**: Quick ask inherits 04 disclosure / explicit send; or remove Quick ask and let ⌘K + Chat own it.
6. **Add a minimal layout brief**: above-fold priority, max rows per list, View-all targets, phone stacking, type roles for greeting vs figures vs meta.

I reviewed the workspace file `docs/specs/10-home-and-search.md` (Rev 2 body as quoted); shell access to verify blob `595fe13` was blocked in this session—if that commit differs, say so and we can re-diff.
