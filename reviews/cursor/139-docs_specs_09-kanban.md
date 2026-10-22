**Verdict:** The behavioral core (columns, Hermes pickup, triage-as-Inbox) is clear; the Screen / API / acceptance sections are too thin for an Operate board and already encode a few self-contradictions plus UI smells (emoji marker, chrome pile-up, no density/states).

Mode: **Operate** (app board). Lens: impeccable Operate + design-taste **app screens** (quiet chrome, one job, honest states, no emoji/tells). Spec-only review — no live UI.

---

### Contradictions (inside this doc)

1. **Column identity vs “editable”**  
   Pickup, Review→Inbox `result`, Ideas auto-land, and Blocked-on-failure all assume fixed names/semantics. “Default, editable” columns without stable IDs or locked system columns will break those rules the moment someone renames `Ready` or merges `Review`.

2. **`Inbox/Ideas` vs `Ideas`**  
   Column list says `Inbox/Ideas`; semantics heading is **Ideas**. Unclear whether this is one column, a synonym with Inbox (07), or a naming collision.

3. **Hermes eligibility: assignee *or* label**  
   Two gates (`assignee=hermes` vs `label hermes`) without precedence. A card can be eligible, half-eligible, or ambiguous when one is set and the other isn’t.

4. **Auto-land vs workflow intent**  
   “Auto-added cards land [in Ideas]” vs workflows that “create next week’s cards” — those often belong in Ready. One rule can’t cover both without an override.

5. **One board vs `GET /boards/:id`**  
   Open question proposes one board + project field; API is multi-board. Spec signals both.

6. **“Shared work board” vs single-operator product**  
   Purpose reads multi-actor; filters include **mine**. For a one-user command center, “mine” / “shared” need a defined meaning (creator? assignee? vs Hermes?).

7. **Review → Inbox `result` only for “Hermes work”**  
   Undefined for Jonas/Scout/workflow cards moved to Review, or Hermes cards Jonas moves early.

8. **“Matches mockup”** with no mockup, tokens, or card anatomy in this file — unfalsifiable.

---

### Gaps (behavior / product)

| Area | Missing |
| --- | --- |
| Card face vs drawer | Which fields show on the tile (title only? priority? due? checklist %?) vs drawer-only |
| Ordering | `position` in PATCH; no model (index, fractional, per-column) |
| WIP | Shown in header; no exceed behavior (block, warn, ignore) |
| DnD + a11y | Drag mentioned; no keyboard move, focus, or live-region for Hermes moves |
| Conflict | Hermes moves card while Jonas drags; optimistic UI; who wins |
| Triage | Inbox suggestions exist; no apply / dismiss / partial-apply UX or API |
| Bulk paste | No delimiter rules, caps, or dedup |
| Done / archive | Hermes can’t Done; no archive, hide Done, or retention |
| Blocked | Entry path; who unblocks; relation to autonomy/approvals |
| Empty / loading / error | None — app-screen floor |
| Mobile | Silent (shell elsewhere collapses rail; board + drawer + DnD need a phone composition) |
| Realtime | “Appears live” + events; no reconnect / lag / offline |
| Permissions | Creator strings only; no who-may-edit-Hermes-cards |
| Acceptance | Three happy paths; no DnD, swimlanes, WIP, triage, failure→Blocked, filters |

---

### Unrealistic scope

One short **Screen** line packs: swimlanes, four filter dimensions, DnD, right drawer, Hermes status bar, inline add per column, plus global `c` / `/card` / paste / capture-from-chat-file-Inbox, triage workflow, autonomy coupling, and event-driven triggers.

That’s a full board product. Acceptance criteria only prove “quick add + live Hermes card + mock pickup.” Either shrink v1 (e.g. fixed columns, no swimlanes, drawer = title/body/links, Hermes bar only) or expand acceptance and Screen to match.

---

### Security / privacy

- **Markdown body** — no sanitize/CSP note; XSS risk if rendered as HTML.
- **Links** (file, PR, conversation, finding, run) — no rule that targets stay in-app / same principal; easy to turn cards into open-redirect or local-path exfil vectors if naively opened.
- **`kanban.card.*` on every change** — likely includes title/body; SSE/logs become a second copy of work content with no redaction/retention note.
- **Bulk + workflow/Scout auto-create** — no rate limit or size cap → board / event spam.
- **Activity log** — unbounded append; PII in comments; no access or purge story.
- **“Shared”** language without an ACL model — fine if truly single-user and stated; dangerous if copy-pasted into multi-user later.
- **Robot marker / creator in UI** — low risk; still don’t treat `creator` as auth.

---

### UI / design quality (hierarchy, spacing, type, density, motion, legibility, contrast)

**Hierarchy / IA**  
First viewport is unspecified. App-screen rule: one question + the frequent job one click away. Here chrome competes before cards: swimlane toggle, filters (mine / Hermes / project / label), Hermes top bar, column headers + optional WIP, inline add. Decide the dominant object (columns of work) and demote the rest (e.g. Hermes status as one quiet line or only when `in_progress`, filters behind one control, not a chip row).

**Density / card face**  
Fields listed: title, body, creator, assignee, project, P0–P3, labels, due, checklist, links, activity. If most land on the tile → classic dense kanban sludge (many status marks). Taste/app rule: **one status mark per row**; secondary meta in the drawer. Spec should freeze a minimal face (e.g. title + due-or-priority + assignee glyph) and put the rest in the drawer.

**Emoji `🤖`**  
Explicitly against design-taste app house rules (no emoji in labels). Prefer a text/creator chip (“Hermes”) consistent with Scout/workflow — same vocabulary, not a special snowflake glyph.

**“Mine” on a solo board**  
Reads as template residue. Prefer filters that match the product (“Assignee: Hermes”, “Created by Scout”, project, label).

**Swimlanes + project filter**  
Two ways to slice the same axis → cognitive load and double chrome. Pick one for v1.

**Drawer**  
“Card drawer on the right” only. No hierarchy (title → status/assignee → body → checklist → links → activity), no edit vs read during Hermes run, no width/scroll behavior. Risk: everything equally loud; activity log crowding the body.

**Spacing / columns**  
No column width, card pitch, gap, or WIP-header treatment. Operate boards need a fixed rhythm (e.g. card title 14/500, meta 12 secondary ink, consistent padding) or implementers invent five densities.

**Typography**  
No type roles. Markdown in-drawer needs a readable measure; board titles need truncation rules (one line, ellipsis) so columns don’t dance.

**Motion**  
Live insert, DnD, column moves, Hermes start/finish — none specified. Operate guidance: **150–250 ms state feedback only**, no load choreography; **`prefers-reduced-motion`** must still show the card (not hide content behind an entrance). Spec should ban decorative column animations and define DnD preview + commit feedback.

**Legibility / contrast**  
Priority colors, label chips, Blocked, WIP counts — no semantic palette or “not by colour alone” (dots + text). Soft grey meta under 4.5:1 is a common failure; call out primary vs secondary ink. If the wider UI system goes glass/translucent, this board will fight app-screen rules (flat surfaces, tone steps not blur) — this doc should require **opaque column surfaces** even if the shell experiments.

**Empty / first-run**  
No empty column copy, empty board, or “Hermes idle” state. App screens: keep frame + header + one sentence + the primary action where it normally lives (inline add / `c`).

**Phone**  
DnD + multi-column + right drawer is a desktop composition. Without a phone story (single column picker, sheet instead of drawer, no swimlanes), “desktop first” elsewhere will strand this route.

**Product face**  
“Hermes is working on: \<card\>” is the one JunOS-specific affordance — good substance if quiet and accurate; bad if it’s permanent top-bar chrome with search/status clutter. Spec should say: show only when a Hermes run is linked; link opens the card drawer.

---

### Priority fixes for the doc (design-director order)

1. **Lock system columns** (stable ids + editable *labels* only) or drop pickup automation.  
2. **One eligibility rule** for Hermes; one auto-create landing rule (with workflow override).  
3. **Specify card face vs drawer** and kill the emoji marker.  
4. **Cut v1 Screen** (no swimlanes or no multi-filter bar) until acceptance covers it.  
5. **Add states** (empty, loading, Hermes conflict, Blocked) and **motion/a11y** for DnD + live updates.  
6. **Security notes**: markdown render policy, link allowlist, event payload minimization, bulk caps.

---

Questions skipped: critique command’s dual-agent/browser path doesn’t apply to a markdown-only target; this is a single-pass spec critique under Ask mode.
