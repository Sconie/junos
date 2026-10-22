**Verdict:** The doc treats Home as a glance surface, then specifies an eight-widget ops dashboard with high-stakes actions and almost no visual or privacy contract. As written it reads like a generated dashboard brief, not an Operate screen with one question.

Mode through the skills: **Operate / app screen** (worked in daily), not a marketing page. Critique is of the spec only (no rendered UI).

---

### Contradictions

1. **“Glance, not a place to work” vs the card list.** Cards 1–2 are work: send a chat, Approve/Deny Inbox. Hermes Open, board/blocked cards, and subscriptions usage are also operational. Either drop the glance framing or demote Quick ask / Needs you to links (“Open Inbox”) and keep Home read-only.

2. **Independent card loads vs one `GET /home`.** Per-card isolation and “no card may block the others” fights a single aggregate unless the client fan-outs and the API streams/partials. The doc never chooses: streamed aggregate, BFF with per-section endpoints, or true parallel queries.

3. **Acceptance vs surface.** “Renders in under 1s from local data” sits next to live stream + eight remote cards. Unclear whether cold start, warm cache, or offline-first counts; whether ⌘K’s “create a card without leaving” is part of that budget.

4. **Search scope split.** Global search promises FTS now and semantic “with the file index (11),” but Home’s “Recent projects and files” and ⌘K’s jump-to-file imply file discovery works before 11 exists.

---

### Gaps

| Area | Missing |
| --- | --- |
| **One question** (app-screens §2.2) | No stated primary question (“Who needs me?” vs “What’s running?”). Without it, eight peers stay equal and hierarchy is undefined. |
| **Layout / IA** | No grid, spans, reading order, or which block is largest. No “View all” vs cap rules beyond “top 5 / next 5 / latest 3.” |
| **Responsive** | No phone/tablet: 8 cards + inline Approve/Deny will stack into a button farm (app-screens §12). |
| **Empty / zero / first-run** | Skeleton + error/retry only. No empty Needs you, no Scout with zero findings, no first-run Home. |
| **Freshness** | Stream mentioned; no “last updated,” stale-while-revalidate, or conflict when aggregate and stream disagree (Hermes state on two cards). |
| **⌘K** | Ranking, keyboard nav (group headers), empty query, offline, and how “Ask \<model\>” differs from Quick ask. |
| **FTS** | Indexing triggers, ranking, snippet highlighting, permission filters, max results, large DB cost. |
| **Copy / a11y** | Greeting tone, status-dot legend, Approve/Deny confirmation, focus order across cards. |
| **UI system** | No tokens, type scale, density band, or motion; deferred entirely. |

---

### Unrealistic scope (for one short spec)

Shipping together: eight independently resilient widgets; aggregate *or* fan-out + event stream; full command palette (nav + create + NL ask); FTS5 over messages, cards, findings, inbox, names, *and* summaries; filters by type/project/date; ⌘K create-card without leaving; Home &lt;1s and palette &lt;100ms.

That’s a product slice, not a single-screen acceptance doc. Cut or phase: e.g. Home = Needs you + one secondary strip; ⌘K = jump only; FTS = one corpus first; create-card and NL ask later.

---

### Security / privacy

- **Search & palette as universal readers.** FTS + jump to “any conversation, project, file, card, task” with no ACL, workspace scope, soft-delete, or “sensitive / agent” exclusion. Inbox approvals and chat content in one index is a leak surface if multi-project or shared DB ever appears.
- **File summaries in FTS** can embed secrets from docs; no redaction or “searchable vs not” policy.
- **Inline Approve/Deny on Home** — high-stakes, often low context (no diff, agent, risk). Spec doesn’t require re-auth, undo window, or “open full item” before deny.
- **Subscriptions usage** — provider quotas/billing on the glance page; no note on what not to expose (API keys, exact plan IDs).
- **NL “Ask \<model\>”** — unclear what context is attached (open project? recent messages?) and whether that leaves the machine.
- **Aggregate `GET /home`** — one endpoint that returns inbox + board + hermes + usage is a juicy over-fetch if auth is wrong once.

---

### UI / design quality (impeccable Operate + design-taste app-screens)

**Hierarchy.** Greeting + date + eight equal “cards” matches generated-dashboard tells: welcome header, peer widget grid, no noun title answering one question. Needs you (decision) and Quick ask (compose) compete with Scout/files/subscriptions for the same visual weight.

**Density.** Eight blocks with headers + first rows cannot honestly fit a 1440×900 first screen without crushing type or pushing critical actions below the fold. App-screens: everything named must show header + first rows *or* the brief must drop blocks. Prefer one lead block (Needs you) and 2–3 secondary summaries, not eight cards.

**Spacing / composition.** “Cards” as the only structure invites equal padding, equal radius, orphan cells. Prefer one divided surface or mixed spans tied to the question; avoid a uniform 2×4 grid.

**Typography.** Unspecified. Risk: large greeting (landing-page title) and tiny card bodies. App-screens: title ~18–32px noun (“Home” / “Needs you”), figures 16–40px, labels 12–14px sentence case — not a hero greeting.

**Status / colour.** “Status dot,” column counts, usage bars, Hermes state — colour-only status fails contrast/legibility without text or pattern. Usage bars need both ends labelled (“12.7k of 20k”), not a naked bar. Colour on data that needs a decision (blocked, approval), not on every chrome chip.

**Motion.** Skeletons only. App-screens loading: layout-stable grey bars at final size, no shimmer gradient; refresh keeps old values + freshness stamp. No `prefers-reduced-motion`. Palette open &lt;100ms implies no heavy enter animation.

**Legibility / contrast.** Inline Approve/Deny next to five inbox rows needs 44px targets on phone and clear primary vs destructive. Grouped ⌘K results need type hierarchy (group label vs title vs meta), not dense monospace/eyebrow stacks. Fuzzy + NL last row must not look like another nav hit.

**Product face.** Spec never names what only this product shows (Hermes current card as the signature element is closest). Without that, Home stays a generic widget board.

---

### Highest-leverage spec fixes

1. Pick **one Home question** and cut cards that don’t answer it.  
2. Resolve **glance vs work** (especially Approve/Deny).  
3. Choose **data loading model** (no “or”).  
4. Add **ACL + corpus rules** for FTS/⌘K.  
5. Add **layout: lead block, caps, View all, phone stack, empty/error/freshness**.  
6. Shrink acceptance to what that thinner surface can meet.

I can turn this into a tightened outline for `10-home-and-search.md` (still Ask mode — guidance only) if you want that next.
