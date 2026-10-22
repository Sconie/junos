**Verdict:** As an Operate-mode board spec, `09-kanban.md` is a workable skeleton for pickup/claim semantics, but it contradicts itself on Hermes eligibility, under-specifies the working UI, and commits to a dense product surface with acceptance criteria that only cover three happy paths.

Lens: **impeccable** Operate (task completion, scanability, states) + **design-taste app-screens** (quiet chrome, density, colour on data, no emoji/template tells). No rendered UI or mockup exists in-repo, so this is a spec critique only.

---

### Contradictions

1. **Hermes eligibility (label vs assignee)**  
   - Ideas/Ready: “Cards labelled `hermes` here are eligible for pickup.”  
   - Pickup rules: “assignee `hermes`… A label alone never triggers execution…”  
   Acceptance (“Ready `hermes` card”) keeps the ambiguity. One of these must win; the other line should go.

2. **Column display name vs `kind=ready`**  
   Pickup keys off `kind=ready`, but columns are only listed as editable names (`Ready`, `Inbox/Ideas`, …). No mapping, no rule for rename/delete of the Ready column, no guarantee Blocked exists when Hermes “moves to Blocked.”

3. **Two different “Inbox”s**  
   Column `Inbox/Ideas` vs “creates an Inbox `result`” / triage suggestions as Inbox items. Same word, different systems — easy to implement or UX-copy wrong.

4. **Open questions vs “Decided”**  
   Sync/local-only is still under Open questions and immediately marked decided. Stale checklist noise.

5. **API vs product decision**  
   “One board” decided, but API is `GET /boards/:id` — implies multi-board without saying why the id exists.

6. **Blocked optional vs required failure path**  
   Blocked is optional; on failure Hermes must move there. Spec does not say what happens if Blocked is off.

---

### Gaps (spec completeness)

| Area | Missing |
| --- | --- |
| Visual contract | “Matches mockup” — no mockup/file in repo; no layout, type scale, density, or card-face vs drawer split |
| Card face | Which of title/body/priority/labels/due/checklist/links/creator show on the tile vs only in the drawer |
| States | Empty board, empty column, loading, offline, claim expired, approval-gated pickup (06), drag-fail |
| Realtime | “Appears live” — websocket/poll/event; conflict when Jonas and Hermes edit the same card |
| Ordering | `position` semantics (gap index? fractional?); what DnD writes |
| Authz | Who can assign Hermes, move others’ cards, see all projects |
| Done hygiene | Archive, hide Done, retention — board will grow forever |
| Capture | Paste → many cards: delimiter, title truncation, untrusted HTML |
| Lease | Claim TTL, renew interval, UI when lease expires mid-view |
| A11y | Keyboard move (only add has `c`); drawer focus trap; live region for Hermes status |
| Mobile | Swimlanes + DnD + drawer — no phone composition |
| Events | `kanban.card.*` payload shape (triggers in 05 will invent it) |

Cross-refs to 05/06/12 are fine as pointers, but this doc never states what the **board UI** must show for approvals or safe markdown failure modes.

---

### Unrealistic scope

Acceptance is three thin paths (fast add, live Hermes card, mock pickup → Review). The Screen + Who-fills sections imply a much larger product in one pass:

- DnD board + swimlanes + multi-filter + drawer + live Hermes strip  
- Bulk paste, chat/file/Inbox capture  
- Checklists, rich links, activity log, comments API  
- WIP limits, editable columns, triage workflow, Scout/workflow creators  

For a local-only v1, that is several milestones. Risk: implementers ship chrome (filters/swimlanes/emoji) before the claim/lease and safe-render paths that the spec actually cares about.

---

### Security / privacy

**Strong:** Atomic claim SQL; label ≠ execute; Hermes never Done; capture/Scout/web text called untrusted and routed through 12 + data-wrapping.

**Weak / missing:**

- **Prompt injection:** Wrapping as data reduces but does not define UI affordances (show “untrusted”, strip tool-looking markdown, limit body size into the model).  
- **Authz / tenancy:** No read/write rules; project filter is UX, not a boundary.  
- **Automation amplification:** Events → triggers (05) can re-act on poisoned titles/bodies; no “don’t auto-execute from card text” here.  
- **Comments / activity / links:** Sanitization only mentioned for card text — not comments, checklist text, or link titles.  
- **Creator spoofing:** `workflow:<id>` / `scout` as client-supplied fields?  
- **Shared-screen leak:** Top bar “Hermes is working on: &lt;card&gt;” exposes titles.  
- **Secrets in Done:** Bodies/links with paths, PR URLs, conversation ids — no redaction/retention.  
- **Clipboard capture:** Pasting secrets into Ideas with live collaborators.

---

### UI / design quality (Operate + app-screens)

This is an **app screen**, not a marketing page: quiet chrome, colour on meaning, density that supports triage, motion as feedback only.

**Hierarchy / cognitive load**  
One Screen paragraph stacks swimlane toggle, four filters, DnD, drawer, Hermes top bar, and per-column add. App-screens expect one primary job on first paint (for Jonas: add / triage / see what Hermes is doing — pick one as default). As written, &gt;4 competing controls before the cards.

**Card density & tells**  
Unbounded fields on the card invite the template kanban: stacked pills (priority + labels + assignee + due), emoji, shadows, coloured column headers. App-screens: ~one status mark per row; colour on data not chrome; flat surfaces. Spec should pin **tile** = title + one meta line (assignee or project) + optional due; everything else in the drawer.

**Emoji `🤖`**  
Banned by design-taste house rules; redundant with `creator=hermes`; bad for SR and for “product face.” Prefer a quiet text mark or stable Hermes affordance in the shell.

**Typography / legibility**  
No type roles. For Operate: page/board title ~18–24px, card title ~14–16, meta ~12; body in drawer ≥14; running text full ink, not soft grey. Truncation rules for long titles missing (triage rewrites titles — UI should show old→new).

**Spacing / layout**  
No column width, card pitch, drawer width, or gutter. Swimlanes × many columns will crush tiles; WIP in headers helps only if headers stay quiet type, not badge chrome.

**Contrast**  
Priority P0–P3 + labels as coloured chips risks low-contrast pale pills and rainbow chrome. Prefer monochrome chips + one accent for the thing that needs a decision (e.g. Blocked, or lease expired).

**Motion**  
DnD and live inserts need a motion note: transform/opacity only, `prefers-reduced-motion` = instant move / no fly-in; no confetti on Done. App-screens: no motion floor — feedback only.

**Hermes status strip**  
Useful, but as a loud top bar it becomes hero chrome. Better as a single quiet status line in the shell (product name + scope + “Working: …” in body size), not a second header.

**Empty / error**  
No trade copy (“No ideas yet — press `c`”, “Claim expired — back in Ready”). Empty columns will look like unfinished UI.

**Design specificity**  
As specified, this is a generic Trello/Linear clone. Skills ask for one product-owned element (e.g. Hermes claim/lease state as the signature, Jonas/`c` as the primary control). Spec never names that.

---

### Priority fixes (if you revise the doc)

1. Resolve **label vs assignee** (and acceptance wording) in one sentence.  
2. Define **column `kind`** vs label; require Blocked (or a fallback) for failure.  
3. Split **v1** (add, columns, claim/lease, Review, safe render, live marker) from swimlanes/filters/bulk/comments.  
4. Specify **card face vs drawer** and ban emoji markers.  
5. Add **authz**, lease TTL, and what the UI shows for approval-gated pickup.  
6. Drop or replace “matches mockup” with a short Operate layout contract (shell, column, tile, drawer).

---

Questions skipped: Ask-mode doc review only; no rendered board to score with impeccable critique/detector.
