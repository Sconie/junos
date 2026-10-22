**Verdict:** The doc is a feature inventory for a dashboard, not a Home brief. It fights its own “glance, not a place to work” line, stacks eight equal cards, and leaves hierarchy, layout, empty states, and approval safety unspecified—so it will ship as a generated overview unless those gaps are closed.

Lens: impeccable **Operate** mode + design-taste **app screen** (`home` / overview). Review is of this doc only (no rendered UI). Cross-refs to other specs are only where they expose contradictions with *this* text.

---

### Contradictions

1. **Glance vs work.** Opening line: glance page. Cards then ship **Quick ask** (starts Chat), **inline Approve/Deny**, Hermes **Open**, and ⌘K actions that create/run things. That is a work surface with a glance costume.
2. **No single question.** App-screen rule: one question first, biggest block answers it. Here eight peers (Quick ask → Recent files) with no reading order, span, or “lead” block. Nothing decides what is biggest.
3. **Hermes current work twice.** Card 4: “current card or task”; card 5: “Hermes’s current card.” Same fact twice with no single source—easy to disagree on the page.
4. **Needs you vs Inbox.** Top 5 Inbox items + Approve/Deny duplicates 07’s triage surface, but without detail pane, exact command/diff, or keyboard map. Two UIs for the same high-stakes mutation.
5. **Two “ask” entries.** Home Quick ask + ⌘K “Ask &lt;model&gt;” last row. No rule for when which wins, or whether both create the same conversation kind.
6. **Data loading fork.** “one `GET /home` aggregate **or** per-card queries plus the event stream” is two architectures. Acceptance (“under 1s from local data”) doesn’t pick one or define stale vs live.
7. **Greeting vs craft rules.** “Greeting and date” is exactly the generated-home tell design-taste replaces with a noun title (~24px). Impeccable Operate would also keep chrome quiet; a greeting header steals hierarchy from the finding that matters.
8. **Scope vs “not a place to work.”** Board snapshot + subscriptions + Scout + recent files is a full product synopsis, not a glance.

---

### Gaps (blocking a good build)

| Area | Missing |
|---|---|
| **Screen question / finding** | e.g. “What needs me right now?” → Needs you leads; everything else secondary |
| **Layout** | Grid, spans, first-screen pack at 1440×900, what drops below the fold |
| **Empty / zero / first-run** | Only skeleton → data → error; no empty copy, zeros, or cold-start |
| **Actions** | “View all”, deep links, whether Approve needs expand-first |
| **Status** | “Status dot” with no text/icon companion (conflicts with 14’s “no colour alone”) |
| **Usage bars** | No “12 of 20” both-ends labelling (app-screens usage rule) |
| **⌘K** | Ranking, empty query, confirm for Run workflow / Ask Hermes, destructive actions, mobile (no ⌘) |
| **Search** | Ranking, snippet/highlight, result privacy, index freshness, what “file summaries” contain |
| **Responsive** | Eight cards under 900px / bottom tabs—stack order and what collapses |
| **Keyboard** | Home has none; Inbox does (`a`/`d`). Palette mentions Enter only |
| **Freshness** | No stamp / last-updated when cards are independent |
| **Motion** | Palette open/close, card load; no `prefers-reduced-motion` (14 mentions it globally; this doc doesn’t) |

---

### Unrealistic scope

- **Eight independent cards + stream + optional mega-aggregate** for a glance page is a Phase-sized surface, not a thin home.
- **⌘K** as universal jump + create + NL ask + fuzzy over all entity types, **&lt;100 ms**, is a product of its own; acceptance only checks open + create card.
- **FTS5 across messages, cards, findings, inbox, file names and summaries** plus later semantic search is heavy; Home doesn’t define index ownership or when results are “ready.”
- **Inline approvals without the approval body** looks cheap in the mockup list and expensive in trust (see security).
- Fitting **headers + first rows for all eight** on one 1440×900 screen (design-taste §2.2) is unrealistic at “top 5 / next 5 / last 3 / counts / usage / recent files.” Something must be cut, spanned, or demoted—and the doc doesn’t.

---

### Security / privacy risks

1. **Approve/Deny without the artifact.** 07/12 expect approvals to show the exact command/diff. Home “inline” invites rubber-stamping from a title line—prompt-injection / accidental external-send risk.
2. **`GET /home` as a dump.** One aggregate of inbox, Hermes, board, usage, Scout, recent files is a high-value localhost payload if auth/CORS slips (12’s threat model). Prefer narrow per-card reads or a field-filtered aggregate.
3. **FTS5 on messages and file summaries.** Chat and summaries can hold secrets/paths; 12 redacts logs but this doc never says search indexes follow the same redaction, retention, or exclusion rules.
4. **Subscriptions / usage bars.** Provider quota UI can leak account identity and spend posture on a shared screen or screenshot.
5. **Recent projects and files.** Paths and names are sensitive; no mention of allowlist scope or hiding denied paths.
6. **⌘K “Run workflow” / “Ask Hermes”.** Instant execute from a fuzzy match is easy to mis-trigger; no confirm / preview / scope.
7. **NL row always “Ask &lt;model&gt;”.** Typing secrets into the palette may persist as a chat/search history with no warning.

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility)

Through design-taste app-screens + impeccable Operate:

**Hierarchy.** Equal card list → classic “eight widgets” dashboard. No lead finding under the title, no primary job control tied to that finding. Quick ask as card #1 often becomes a fake hero and buries “Needs you.”

**Composition / density.** Peer card grid with mixed jobs (compose, approve, schedule, agent, board KPIs, billing, scout, files) is a tell. App-screens prefers: one question → biggest block → capped lists (4–6) + “View all,” time-sensitive before long lists. Eight blocks will either overflow or crush padding/type into a dense soup.

**Typography.** “Greeting and date” encourages large welcome chrome; study homes that greet still keep titles ~18–24px, not marketing scale. No type roles (title / section / row / meta) defined—implementers will invent five sizes.

**Spacing / surfaces.** Spec says “cards” with no rule to group or divide (e.g. one “Attention” band vs eight boxes). With 14’s glass panels + blur, eight frosted tiles → chrome noise; design-taste bans glass/glow for app screens and wants colour on data (~3%), not panel chrome.

**Colour / contrast / legibility.** Status **dots** alone fail “colour isn’t the only signal.” Usage bars and Scout “findings” without severity text will muddy on `#9AA0AC` / glass (14 already notes 4.5:1 on glass—Home content is mostly secondary lists). Accent violet on every chip/dot would violate “accent on data / one control.”

**Motion.** Independent skeletons are good; shimmer gradients are an app-screen anti-pattern (flat grey bars at real size, labels visible). Palette &lt;100 ms implies snap-open; still need reduced-motion and focus trap (not in this doc).

**Empty / error.** Retry-only errors without “last good at …” and empty frames without a next action will look unfinished (skill §11). Board “counts per column” with all zeros still needs honest zeros, not dashed emptiness.

**Product face.** Nothing JunOS-specific (no signature element: e.g. attention strip, Hermes lane, event pulse). As written, any agent OS could reuse the same eight cards unchanged—low design specificity.

---

### Highest-leverage doc fixes (if you edit later)

1. **One question** (e.g. “What needs Jonas?”) → Needs you is the lead; cut or demote 2–3 cards (Subscriptions / Recent files / Board counts are the usual demotions).
2. **Drop greeting**; use a noun title + one finding line + one primary action.
3. **Approvals:** link into Inbox detail or expand-to-diff before Approve; same API as 07.
4. **Pick one load model** (prefer per-card + events); define empty/zero/error/freshness per block.
5. **Split ⌘K vs search** responsibilities and add confirm for run/agent actions; search redaction policy in one sentence.
6. **First-screen budget:** name what must show above the fold at 1440 and what stacks under 900.

---

Questions skipped: Ask-mode doc review only; no impeccable detector / live UI. Switch to Agent mode if you want this folded into a revised `10-home-and-search.md`.
