**Verdict:** Spec 09 is a usable *behavior* sketch for Hermes pickup, but it is not yet an implementable Operate-mode board: pickup eligibility contradicts itself, the Screen section is a feature dump with no hierarchy or states, and several security/data fields are asserted without a model or UI contract.

Mode (impeccable): **Operate** — scanability and restraint matter more than expression. Lens (design-taste): **app screen**, not a marketing page.

---

### Contradictions

1. **Label vs assignee (fatal for automation)**  
   - L10: *“Cards labelled `hermes` here are eligible for pickup.”*  
   - L25: *“Only … assignee `hermes`. A label alone never triggers … and never overrides an explicit assignee.”*  
   Implementers cannot know which wins. Spec 06 also still says “labelled `hermes`,” so the contradiction is already spreading.

2. **Column identity**  
   Defaults are display names (`Inbox/Ideas`, `Ready`, …) while pickup uses `kind=ready`. Editable columns + kind-based automation is fine in principle (02 already says that), but **09 never defines the `kind` map**, so “Ready” vs `kind=ready` vs optional rename is underspecified here.

3. **Ideas naming**  
   Column is `Inbox/Ideas`; semantics only define **Ideas**. “Inbox” collides with the product Inbox (07) and invites wrong IA (“is this the same Inbox?”).

4. **Claim fields vs card fields**  
   Pickup uses `claimed_by` / `claim_lease_expires` (L26), but **Card fields** (L15) list neither. Unclear whether claim is separate from `assignee`, whether Jonas’s assignee survives a lease expiry, or what the UI shows during a claim.

5. **“matches mockup” (L32)** with no mockup, tokens, or layout in-repo — the Screen section cannot be verified or reviewed visually.

6. **Open questions vs decided**  
   L48 asks about GitHub/Linear sync; L49 already decides local-only / one board. The open question is stale noise.

---

### Gaps

| Area | Missing |
|---|---|
| **Permissions** | Who may create/move/delete cards? Can Hermes move Jonas’s cards? Can workflows move to Done? |
| **Ordering** | `position` in API, no rules for insert, DnD, bulk paste, or concurrent edits |
| **WIP** | Optional limit with no overflow behavior (block DnD? warn? soft cap?) |
| **Triage** | Inbox suggestions only — no accept/reject UX or conflict if board changed since triage |
| **Live updates** | Acceptance wants live Hermes cards; no SSE/event→UI contract beyond emitting events |
| **Drawer** | Fields listed, no layout, edit model, or what is primary vs meta |
| **Empty / loading / error / offline** | None — Operate screens fail without these |
| **Keyboard** | `c` / under-3s add, but no focus order, Escape, column navigation, or DnD keyboard path |
| **Mobile / narrow** | Horizontal board + right drawer + top Hermes banner — no fold or alternate |
| **Checklist / activity / links** | Named, not shaped (inline vs drawer-only; how links open) |
| **Multi-assignee / Scout / workflow creators** | Creators listed; pickup only mentions Hermes |
| **Board CRUD** | Columns “editable”; no UI or API for rename/reorder/add/remove kinds |
| **Stop / cancel mid-card** | Failure→Blocked exists; no link to StopControl / claim release on Stop |

---

### Unrealistic / oversized scope (for one screen)

Packed into one board without phases:

- Swimlanes (project **and** assignee)  
- Four filter dimensions  
- DnD + inline add per column + right drawer  
- Live Hermes status in the top bar  
- Bulk paste → many cards  
- Capture from chat / file / Inbox  
- Triage workflow + event-driven triggers  
- Checklist, activity log, rich links, markdown body  

That is a full work-management product surface. Acceptance only covers keyboard add, live Hermes marker, and mock pickup→Review — so **build scope and done-when do not match**. Realistic cut: single lane, no swimlanes v1; drawer for detail; Hermes strip; claim rules locked; defer bulk/triage/swimlanes.

---

### Security / privacy

**Good:** Untrusted capture/Scout/web text → safe render (12) + data-wrapping for Hermes (L30); autonomy/approvals still apply (L29); atomic claim reduces double-execution.

**Risks / holes in this doc:**

1. **Prompt injection via cards** — Bodies from paste, Scout, web, or workflows become Hermes work context. Wrapping is asserted, not specified (what is stripped, max size, whether links/checklists are included).  
2. **`POST /cards/bulk` + paste** — High-volume untrusted content with no rate/size/source attribution rules in 09.  
3. **Events `kanban.card.*` → triggers (05)** — Card title/body in payloads could leak into automations; 02 says events hold refs/minimal metadata — **09 should say the same** for kanban events.  
4. **API sketch has no authz** — Any local client that can hit the daemon could mutate the board; 12’s gateway is not referenced for Kanban mutations.  
5. **Hermes marker `🤖`** — Cosmetic, but emoji-as-authority is weak; a text/creator badge is clearer and avoids “trusted because robot.”  
6. **Links to files/PRs/conversations** — No mention of path/URL allowlists or opening remote URLs safely (12’s link rules should be cited for card bodies and link chips).  
7. **Claim lease after crash** — Returns to Ready with a note; no rule if partial side effects already ran (orphan work / double-apply risk).

---

### UI / design quality (impeccable Operate + design-taste app-screen)

The Screen section (L32–33) is a **chrome checklist**, not a composition. Against both skills:

**Hierarchy**  
No primary question for the first viewport (app-screens: one job, most frequent action one click away). Competing chrome: global top bar (14) + “Hermes is working on…” + filters + swimlane toggle + columns + drawer. Hermes status belongs as a **quiet strip or column cue**, not a second page title.

**Density**  
Kanban wants medium–dense data. Swimlanes × filters × WIP badges × emoji × priority × labels on every card will create **status soup** (taste: one status mark per row; colour on data not chrome). Spec should define the **card face** (title + 1–2 meta) vs drawer-only fields.

**Spacing / layout**  
“Add-card inline at bottom of each column” + drawer 360–420 (from 14) + horizontal scroll: no column width, card padding, gap, or sticky headers. Risk of leftover empty columns reading unfinished (app-screens density).

**Typography**  
No type roles. Card titles will fight column headers and the Hermes banner. Operate mode: small title scale (≈14–24px), body 13–14px, meta ≥11px and ≥4.5:1 — none of that is pinned here or delegated to 14 with board-specific overrides.

**Motion**  
Live card appearance is in acceptance; no motion budget. Prefer opacity/transform on insert, no celebratory bounce; `prefers-reduced-motion`; DnD must not rely on motion for meaning.

**Legibility / contrast**  
Priority P0–P3, labels, creator marker, assignee — if encoded only as colour/emoji, fails 14’s “no information by colour alone” and taste contrast floors. WIP in headers needs a numeric treatment (tabular figures), not a loud pill on every column.

**Tells to ban up front** (taste app-screens / house rules)  
Robot emoji as brand; rainbow priority; icon-in-tinted-square creators; glass drawer; gradient “AI working” bar; KPI-style column stats; identical feature-card chrome on every ticket.

**Missing Operate states the skills require**  
Empty board, empty column, filter-no-results, claim race (“already claimed”), lease expired note, Hermes unreachable, drawer unsaved, DnD rejected by WIP — none specified.

---

### Highest-leverage fixes (if you revise 09)

1. **One pickup rule:** `kind=ready` **and** `assignee=hermes` (or explicit claim); delete “labelled hermes eligible.” Align 06 later.  
2. **Card chrome contract:** face fields vs drawer; no emoji; text creator/assignee.  
3. **Screen as Operate brief:** one job, hierarchy, empty/error, keyboard, narrow layout — defer swimlanes.  
4. **Claim + events + bulk** under 12 gateway; event payloads refs-only; untrusted body size/wrap rules.  
5. **Drop “matches mockup”** or attach a real mock with column/card measurements.

I did not run impeccable’s browser critique (doc-only target; Ask mode). If you want a pass that scores heuristics against a mock once it exists, switch to Agent mode with that asset.
