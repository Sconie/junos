**Verdict:** Spec 10 is a thin feature inventory, not an Operate-screen brief. It lists eight peer cards, two search surfaces, and two latency targets — and never names the home’s one question, layout hierarchy, or safety model for inline Approve/Deny. Through impeccable (Operate) and design-taste (app screens), that is the core failure mode: a generated “dashboard of everything,” not a glance tool.

Review mode: **spec-only** (no rendered UI, no inspector). Skills used as critique lenses, not as a full `$impeccable critique` run.

---

### Contradictions

1. **Glance vs work.** Opening line: “A glance page, not a place to work.” Card 2 then puts **inline Approve/Deny** on Home. Rev 2 says Inbox is the authority for decisions. Those three claims cannot all stand: either Home is read-only summary with deep-links, or it is a second decision surface (and must inherit ApprovalCard / focus / re-read rules).

2. **Hermes fact shown twice.** Card 4 is Hermes; card 5’s Board snapshot also shows “Hermes’s current card.” App-screen data rule: one fact → one variable. Spec invites divergent “current card” between panels.

3. **Load contract vs acceptance.** Cards “load independently” *and* may come from one `GET /home` *or* per-card queries *plus* SSE. Acceptance is “Home renders in under 1 second.” Unclear whether that means shell, first card, or all eight `ok` — and how `stale` counts toward the budget.

4. **Two “ask” entry points.** Quick ask (home card) and ⌘K “Ask \<model\>” both send model work; no rule for when which is primary, or whether Quick ask shows ProviderDisclosure (Rev 2 only ties disclosure to ⌘K).

---

### Gaps (spec is silent where implementers will invent)

| Area | Missing |
|---|---|
| **One question** | No line like “What needs me before I open anything else?” — so no primary block, no reading order, no delete list for low-value cards. |
| **Layout** | “From the mockup” with no grid, spans, or which cards share a row. Eight equal cards → default 2×4 / KPI-tile grid. |
| **Empty / zero / first-run** | Skeleton + error + retry only. No empty Inbox, no zero runs, no “no projects yet,” no offline daemon on this surface. |
| **Responsive** | No stack order below 900px; eight cards + bottom tab bar will bury “Needs you.” |
| **⌘K / search states** | No no-results, loading, keyboard map beyond Enter, ARIA, grouping caps, or how FTS vs fuzzy vs “recent” merge. |
| **Visual system** | No type roles (greeting / card title / row / meta), spacing, motion, or contrast notes — all deferred to an external mockup. |
| **Cross-links** | “Open” / row click targets, “View all,” and whether Approve stays on Home or navigates to Inbox after action. |
| **Search scope** | What is a “file summary,” when indexed, max result size, highlight rules, permission if multi-project later. |

---

### Unrealistic scope

- **Home as phase-complete product map.** Cards pull Inbox, Tasks/crons, Hermes, Kanban, Subscriptions, Scout, and Files/projects. That is a system overview, not a thin first-release home. Latency and independent loading get harder as each subsystem lands at different times; the spec does not define progressive card availability (hide vs `error` vs empty).
- **`<1s` from local data** with eight payloads + SSE subscription is plausible only if “render” = painted shells and local cache; not if cold SQLite aggregates all domains.
- **⌘K `<100ms` open** is fine for a warm in-memory palette; “jump to any … file, card, task” plus fuzzy + NL row plus “create a card without leaving” is a mini-app. Creating a card implies form/validation UI inside the palette — unspecified.
- **Global FTS** over messages, cards, findings, inbox, file names *and* summaries is a full search product; semantic search deferred to 11 is good, but FTS alone is still large for this doc’s length.

---

### Security / privacy risks

1. **Inline Approve/Deny on a glance grid** — high-stakes actions next to decorative cards. Spec does not require ApprovalCard (exact action/diff, expiry, irreversible warning, re-read before enable, focus-gated shortcuts). Mis-click and stale-approve risk are real; Rev 2’s “Inbox is authority” without forbidding Home actions makes this worse, not better.

2. **⌘K NL → model** — Rev 2 correctly requires an explicit “Ask \<model\>” row and 04 disclosure. Still missing: confirmation that navigation/fuzzy rows never call a provider; whether Quick ask on Home has the same gate; what query text is logged locally.

3. **FTS index of messages and file summaries** — local-first helps, but the spec never states retention, what leaves the machine (nothing should for search itself), whether deleted messages are purged from FTS, or that search snippets must not render unsanitized HTML (SafeMarkdown territory for previews).

4. **Subscriptions card “usage bar”** — may surface provider quota/identity; no note on sensitive numbers in screenshots/shared sessions.

5. **SSE-driven card updates** while user is mid-Approve — no concurrency / “approval already resolved” behavior on Home.

---

### UI / design quality (impeccable Operate + design-taste app screens)

**Hierarchy & density.** Eight peer cards after a greeting is the stock dashboard: no biggest answer, no one finding, no single primary job. App-screens §2.2: at 1440×900 every named block shows header + first rows — here that is ~greeting + 8 headers + (5+5+3+…) rows. Either the page scrolls (not a glance) or type/spacing collapses (illegible). Spec should cut to 3–4 blocks or declare a primary column (“Needs you”) and demote the rest.

**Composition / “generated dashboard” tells.** Greeting + date + identical card chrome + usage bars + status dots matches the anti-pattern set (icon/KPI tiles, equal card grid, chrome colour). Spec does not forbid icon-topped cards, sparklines, or emoji greetings; implementers will invent them. Board “counts per column” is a mini-KPI strip with no encoding of blocked vs Hermes current beyond prose.

**Duplication & trust.** Hermes ×2, Needs-you vs Inbox, Board “blocked” vs Inbox approvals — without single-source rules, the glance page teaches distrust.

**Typography & spacing.** No scale: greeting size vs card title vs row vs meta. Operate wants a tight rem scale and scanability; without it, glass panels + dim meta will default to soft grey body (design-taste: running text in full ink; grey only for secondary). Usage bars and multi-line cron rows need tabular figures and alignment — unstated.

**Contrast & legibility.** Spec inherits glass from the product direction but does not say status cannot be colour-only (Upcoming “status dot” alone fails 14’s own a11y rule and app-screen honesty). Dim text on frosted panels is a known failure mode; Home should call out meta vs body roles.

**Motion.** Operate: 150–250ms feedback only; no load choreography. Spec mentions skeletons but not whether cards stagger-fade in (anti-pattern for Operate) or how SSE updates animate without layout jump.

**Command palette.** Familiar pattern (good for Operate), but “results grouped by type with recent first” without caps or type priority will flood the list. Natural-language as last row is sound; visual hierarchy of that row vs jump results is unspecified (easy to make “Ask” look like a search hit).

**Quick ask.** Input + model chip on Home competes with the top-bar ⌘K field (14). Two search-ish inputs on one glance surface raise cognitive load (impeccable: >4 visible options / competing affordances).

---

### Highest-leverage fixes (if you revise the doc)

1. **One question + one primary block** (almost certainly “Needs you”), max 3–4 supporting cards; rest deep-link only.  
2. **Resolve Approve on Home:** either remove actions (link to Inbox) or mandate ApprovalCard + stale/re-read + no shortcut without focus.  
3. **Define render budget:** shell &lt;1s; cards may be stale/ok/error independently; cold path explicit.  
4. **Layout contract:** grid spans, mobile order, empty/zero copy in product words.  
5. **Search/⌘K:** non-goals, result limits, never-call-model rules for all entry points, FTS purge on delete.

---

Questions skipped: full impeccable dual-assessment / browser detector (Ask mode + markdown-only target). I did not re-verify commit `595fe13` via git (shell blocked in Ask mode); review is of the current workspace file content matching that revision’s described Rev 2 additions.
