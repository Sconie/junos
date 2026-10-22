Context loading did not run; this is a **doc-only** review of `docs/specs/00-overview.md` through Impeccable (Operate mode) and design-taste (app-screen house rules). No live UI to inspect.

---

## Verdict

As a product index, the doc is clear and short. As the brief that locks IA and visual direction, it under-specifies Operate UX, over-commits surface area, and pins a **glass / dark / violet** look that both skills treat as a fail for a work surface. Principle 5 (“boring”) and the Stitch line fight each other.

---

## Contradictions

1. **“Boring and changeable” vs “Translucent Glass”**  
   Principle 5 wants small pieces and swapability. The Screens line hard-binds every surface to a translucent-glass Stitch set. Glass, blur, and a fashion mockup language are neither boring nor easy to swap; they fight Impeccable’s Operate mode (precision/restraint over expression).

2. **Operate product, Persuade chrome**  
   Impeccable mode for this product is **Operate** (command center, inbox, board, agent console). “Translucent Glass” is Persuade/gallery costume. Design-taste app rules explicitly replace glass/backdrop blur with opaque tone steps.

3. **“Local first” / “subscriptions not API keys” vs silent complexity**  
   Those principles are stated as settled. The overview never says that CLI/session adapters are the real product risk (session expiry, ToS, brittle auth). The Connections screen is listed; the hard part is not named as a first-class constraint.

4. **One event stream vs many peer screens**  
   Principle 3 says Inbox, Home, and Kanban are views over one stream. The screen table still lists ~11 peers with no primary/secondary hierarchy, so the IA reads as eleven apps, not three lenses plus tools.

5. **Draft honesty vs missing open questions**  
   The header says every doc ends with open questions. This file has none.

6. **IA collisions inside the table**  
   Agent chats and Inbox share one spec; Tasks and Workflows launcher share another. The overview never states how those pairs differ in job or chrome—easy to ship duplicate shells.

---

## Gaps

| Gap | Why it matters |
|---|---|
| No MVP cut | Roadmap is linked, but the overview presents the full command center as the product. Nothing says what ships first. |
| No one-line job per screen | Operate needs “this screen answers X.” Scout, Hermes, Workflows launcher are names only. |
| Settings / shell | Table has no Settings; Stitch-style shells usually do. Global search/command palette is absent here. |
| Approval UX | Principle 4 is policy only—no where approvals live (modal, inbox item, Hermes gate). |
| Empty / error / first-run | Personal tool with many integrations; cold start and “nothing connected” are undefined. |
| Density / type / motion / a11y | Defers to `14-ui-system` while already locking glass mockups—tokens arrive after the look is fixed. |
| Responsive non-goal vs density | “Responsive web only, no mobile app” with a dense multi-panel command center—phone composition is unaddressed. |
| What “attention” means | Inbox is listed; triage criteria are not. |
| Scout | Named in the matrix with no definition—scope and privacy ambiguous by omission. |

---

## Unrealistic scope (for a v0.1 overview)

Bundled as one product without phasing in this doc:

- Multi-provider chat + effort routing  
- Scheduled tasks + workflows  
- Supervised autonomous agent (Hermes)  
- Scout  
- Kanban  
- Files/projects  
- Connections  
- Unified event bus feeding Home / Inbox / Kanban  

For one user that can be fine as a north star; as a draft overview it reads like a full OS. Unrealistic part is implying all of that shares one Stitch visual system and one event model before any slice is named done.

“Human approves destructive/outward” across Hermes + tasks + chat tools is a product of its own; the overview treats it as a sentence.

---

## Security / privacy risks (implied, not modeled here)

`12-security-and-privacy` is linked, but the overview itself sets risky defaults without bounds:

1. **Web UI → local daemon** — Classic localhost/LAN exposure, CSRF-ish “drive the daemon from a page,” and XSS → credential/session abuse. Non-goals say no public hosting; they do not say “bind 127.0.0.1 only” or “no remote clients.”
2. **Credentials on disk** — “Local first” is good; no hint of OS keychain, encryption, or least privilege for the daemon.
3. **High-privilege CLIs as the trust boundary** — Claude/Codex/Cursor/Grok/Nous sessions are effectively keys. Overview frames them as convenience, not crown jewels.
4. **Approval scope too narrow** — “Destructive or outward-facing” leaves silent reads (mail, files, secrets), shell, and bulk export undefined.
5. **Files + Hermes + “any model”** — Data that can leave the machine via tools/chat is the privacy core; not called out next to “local first.”
6. **Scout unnamed** — If it watches external accounts or the filesystem, the overview should at least flag consent and retention; it doesn’t.

---

## UI / design-quality problems (hierarchy, space, type, density, motion, legibility, contrast)

Judging what this doc **commits** the UI to (including the Stitch “Translucent Glass” pin):

**Hierarchy**  
Eleven equal screens + icon sidebar mental model. No “Home answers one question; everything else is drill-in.” Design-taste app screens: no hero header theater; product name/scope in the shell; one primary job one click away. Overview doesn’t define that.

**Spacing / density**  
“Command center” + glass panels + many cards (as Stitch-style home implies) tends toward dashboard tile grids—exactly the generated-dashboard pattern app-screens reject (KPI tiles, icon wells, masonry cards). Principle 5 wants calm/boring; the visual pin wants richness.

**Typography**  
Overview specifies none. The locked mockup path (Inter + mono everywhere, violet accent) conflicts with design-taste: no Inter-as-default “kit face,” monospace only for real code, two faces max, running text in full ink not soft grey on glass.

**Motion**  
App screens: motion is feedback only (press/hover/focus/sheets)—no motion floor, no pulse/shimmer as identity. Overview’s glass/mission-control vibe invites status pulses and overlay blur transitions without a reduced-motion or feedback-only rule.

**Legibility / contrast**  
Translucent panels on near-black with hairlines are a known contrast trap (text on frosted layers, 1px borders as structure). Overview never states WCAG targets, light mode, or “opaque surfaces + tone steps.” Design-taste bans glass for that reason.

**Colour / look (skill bans hit by the pin)**  
Referenced Stitch foundation: dark-first, electric violet, glass blur—aligns with banned “assistant palette” (violet/indigo) and “glows, glass, backdrop blur.” Impeccable user rules also warn against defaulting to dark + purple + glow.

**IA chrome load**  
Sidebar of Home / Chat / Hermes / Tasks / Files / Projects (+ Connections / Settings in the design prompts) plus command palette plus status pills: cognitive load before any task. Overview doesn’t cap nav or name a primary path.

**Brand / product face**  
Skills want one subject-specific idea (name, object, ritual)—not “Linear × Raycast × terminal.” Overview defines JunOS by feature list, not a visual idea unique to Jonas’s command center. Easy to ship a kit.

---

## Highest-leverage fixes (guidance only; Ask mode)

1. Drop or demote “match Translucent Glass”; point visual authority at `14-ui-system` with **opaque Operate** tokens (one ground, one ink, one accent from the product—not violet-by-default).  
2. Add open questions + an MVP slice (e.g. Chat + Connections + local daemon only).  
3. Collapse the screen table: mark primary views vs tools; resolve Inbox vs Agent chats and Tasks vs Workflows in one sentence each.  
4. Next to principles 2 and 4, one line each: daemon bind/trust, and approval taxonomy (what must block vs notify).  
5. One line of Operate craft: density target, type roles, motion = feedback + `prefers-reduced-motion`, contrast on opaque surfaces.

---

**Questions skipped:** full Impeccable dual-agent critique (no viewable UI target); design-taste inspector not run (spec text only).
