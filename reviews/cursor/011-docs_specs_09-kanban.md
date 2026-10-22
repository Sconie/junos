Context loading did not run; I’ll read the existing project context directly.

## Findings (ranked)

1. **high — Blocked is “optional” but required by pickup**  
   *Quote:* “optional `Blocked`” vs “On failure or block: moves to Blocked…”  
   *Why:* Hermes failure path cannot land if the column was deleted or never created; column editability and automation fight each other.  
   *Fix:* Make `Blocked` a required system column (or map failures to `Review` + Inbox `failure` with a `blocked` label). State that column rename is allowed, delete of system columns is not.

2. **high — Dual pickup eligibility (`assignee` vs `label`) contradicts 06**  
   *Quote:* Ready: “Cards labelled `hermes`…”; pickup: “assignee `hermes` (or label `hermes`)”; `06`: “pick up cards labelled `hermes`”.  
   *Why:* Implementers will ship divergent rules; accidental pickup when only a label or only an assignee is set; Scout/workflow cards can inherit the wrong signal.  
   *Fix:* One rule only—prefer `assignee=hermes` in Ready. Treat label `hermes` as a UI affordance that *sets* assignee, or drop labels for eligibility. Align `06` to the same sentence.

3. **high — Spec fields/API outrun the data model**  
   *Quote:* card fields include “checklist, links (…), activity log”; API `POST /cards/:id/comments`; `02` has only `kanban_card(… source_ref_json …)` and `kanban_board`.  
   *Why:* Comments, multi-links, checklist, and activity have nowhere to live; `02` invariant is a *single* `source_ref_json`, not a links list. Scope looks small in prose but is a second schema.  
   *Fix:* Either cut checklist/comments/activity/links-list from v1 and point at `source_ref_json` + `event` for history, or extend `02` with explicit tables (`kanban_comment`, `kanban_link`, checklist JSON) before Phase 3.

4. **high — Column name `Inbox/Ideas` collides with product Inbox**  
   *Quote:* columns ``Inbox/Ideas``; semantics use **Ideas**; triage “Suggestions appear as an Inbox item”.  
   *Why:* Copy, filters, events, and “open Inbox” become ambiguous next to `07`.  
   *Fix:* Rename the column to `Ideas` only. Never use “Inbox” for a board column.

5. **high — “Matches mockup” with no Kanban mockup; Screen is an unranked feature pile**  
   *Quote:* “Screen (matches mockup)” + swimlanes, filters, DnD, drawer, Hermes status strip, inline add per column.  
   *Why:* `docs/design/stitch-prompts.md` has no Kanban screen; `14` already defines shell chrome. Without a composition brief, this defaults to generic AI-kanban (filter chips + status banner + glass cards). App-screen lens: one job unanswered; first viewport overloaded.  
   *Fix:* Add a Stitch/prompt or wireframe: noun title “Board”, columns as the hero, one primary action (`c` / Add). Defer swimlanes and the Hermes strip to v1.1. Specify card *face* fields (title + one meta line) vs drawer-only fields.

6. **high — `🤖` creator marker is a banned / low-quality tell**  
   *Quote:* “Hermes-created cards carry a `🤖` marker”.  
   *Why:* design-taste app rules ban emoji in labels/empty states; `14` already has Badge/Chip/StatusDot; emoji fails a11y and looks template-y.  
   *Fix:* Use a text Badge (`Hermes` / `Scout` / `Workflow`) from creator; optional quiet icon, never emoji. Update acceptance to “creator badge”, not “marker”.

7. **high — Untrusted / agent text on the board without a trust boundary**  
   *Quote:* Scout/workflows/Hermes auto-add cards; Hermes “summarises finished work on the card”; triage “rewrites vague titles” (as Inbox suggestions).  
   *Why:* Against `12`: web/Scout content is untrusted; summaries can paste secrets/paths into durable board text; a Ready pickup can re-inject that body into tools. No redaction policy for card bodies (unlike logs).  
   *Fix:* Mark `creator ≠ jonas` bodies as untrusted in UI (distinct treatment); redact secrets on write; on Hermes pickup, wrap card body as data (same as `12` prompt-injection rules). Keep triage suggestions proposal-only (already good)—require explicit apply.

8. **med — Phase 3 scope vs thin acceptance**  
   *Quote:* full Screen + bulk paste + triage + WIP + comments API; acceptance is three happy paths; roadmap “Kanban with Hermes create/pickup rules.”  
   *Why:* Unrealistic for one phase; swimlanes/WIP/comments will slip or ship half-broken.  
   *Fix:* v1 acceptance = create, live Hermes card, pickup→Review. Explicitly defer: swimlanes, WIP, comments, bulk paste, column editor. Keep triage as a starter workflow only if `05` already owns it.

9. **med — Keyboard contract incomplete and conflicts with Inbox**  
   *Quote:* “quick add (`c` anywhere…)”; `14`: “Keyboard-first (list in each spec)”; `07` uses `c` for “make card”.  
   *Why:* Global `c` fights Inbox; DnD-primary board fails keyboard/a11y without move shortcuts; “under 3 seconds” is untestable without the chord list.  
   *Fix:* Scope `c` to Board (and ⌘K “New card” globally). List Board keys: add, open drawer, move column, assign Hermes, filter. DnD is secondary.

10. **med — Extra “Hermes is working on” top bar vs shell**  
    *Quote:* “Top bar shows Hermes is working on: \<card\>”; `14` top bar = ⌘K, provider pill, avatar.  
    *Why:* Dual chrome; accent/status on chrome is an app-screen tell; Home/`06` already surface Hermes state.  
    *Fix:* Reuse the shell status pill or a single compact chip in the Board title row linking to Hermes—no second top bar.

11. **med — Glass-on-cards density vs `14` blur rules (and taste “no glass”)**  
    *Quote:* Screen is a full board of cards; `14` Translucent Glass + “never nested more than two deep”; taste bans glass/blur on app screens.  
    *Why:* Product brief pins glass (impeccable: brief wins), but a 5-column board of frosted cards will nest blur, hurt perf, and read as neon-glass dashboard slop.  
    *Fix:* Atmosphere + glass on shell/drawer only; column/card faces = opaque tone step (`--panel` solid), 1px border, no per-card `backdrop-filter`.

12. **med — Card face / priority / filters underspecified (generic chip soup risk)**  
    *Quote:* fields P0–P3, labels, filters “mine, Hermes, project, label”; no face layout.  
    *Why:* Default implementation = rainbow priority pills + chip rows (generated-dashboard tell). “mine” undefined (assignee vs creator).  
    *Fix:* Define face: title, creator badge, optional due; priority as text `P0` in ink, colour only when P0. Define `mine` = `assignee=jonas`. Put labels/checklist only in the drawer.

13. **med — Multi-board API vs “one board” decision**  
    *Quote:* `GET /boards/:id`; open question proposes one board + project field.  
    *Why:* Extra ID surface and empty-board UX for a decided product shape.  
    *Fix:* Lock open question: one board. API `GET /board` / `POST /cards`; keep `board_id` in DB as constant if needed for later.

14. **med — Missing states required by `14`**  
    *Quote:* Screen section has no loading/empty/error/offline; `14` mandates them for every screen.  
    *Why:* Empty Ideas column and “junosd down mid-drag” will be improvised poorly.  
    *Fix:* Specify skeleton columns, empty Ideas CTA (“Press c”), per-column error, disabled DnD when offline with the global daemon banner.

15. **med — Hermes move powers broader than pickup rules**  
    *Quote:* `06`: “move its own cards”; `09`: constrained start/finish/block paths; “Hermes never moves a card to Done”.  
    *Why:* Can Hermes drag Ready→Ideas, or edit Jonas’s cards? Race with Jonas DnD unspecified.  
    *Fix:* Allowlist Hermes transitions: `Ready→In progress`, `In progress→Review|Blocked`, plus create into Ideas. Jonas-only: Done and any move of `assignee=jonas` cards. Last-write-wins + activity via `event`.

16. **low — WIP vs Hermes concurrency**  
    *Quote:* “WIP limit per column (optional)”; “One card In progress at a time”.  
    *Why:* Unclear whether pickup may exceed WIP or drag is blocked.  
    *Fix:* If shipping WIP: Hermes pickup respects In-progress WIP; soft-block Jonas drag with a toast. Else cut WIP from v1 (already deferred above).

17. **low — Review → Inbox `result` vs Done lifecycle**  
    *Quote:* “Moving Hermes work here creates an Inbox `result`”; “Hermes never moves… to Done; Jonas does.”  
    *Why:* Orphan results if Done doesn’t resolve Inbox; notification noise.  
    *Fix:* Moving to Done auto-resolves the linked Inbox `result` (or require Done from the Inbox action). Document the link in `source_ref_json`.

18. **low — No responsive Board behavior beyond `14`’s tab bar**  
    *Quote:* Board is desktop DnD; `14` &lt;900px → bottom tabs + sheets.  
    *Why:* Horizontal boards fail on phone without a defined fold.  
    *Fix:* One line: below 900px, vertical column accordion or single-column with column picker; drawer = full-screen sheet; no swimlanes on small screens.
