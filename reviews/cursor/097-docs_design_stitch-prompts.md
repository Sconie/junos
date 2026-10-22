**Verdict:** As a Stitch brief, this doc encodes a generic “AI command center” kit (dark + violet + Inter + glass + card grid) and packs more chrome, panels, and live states per screen than Stitch can reliably deliver—or than Operate-mode app craft would keep. Several prompts also fight each other and the product’s own nav.

---

### Contradictions (inside the doc)

1. **Density vs air** — Prompt 0 asks for “generous spacing” and “dense but calm” in the same breath. Stitch will pick one; usually the card grid wins and nothing feels calm.
2. **Foundation vs screen 1** — Style foundation already says “Start by designing the Home dashboard,” then prompt 1 redesigns Home. Easy to get two Homes or a diluted foundation.
3. **Shell vs screen chrome** — Global top bar is command palette (`Ask or jump to…`). Files (prompt 5) adds another “global search bar” for NL queries. Two search systems, unclear which owns ⌘K.
4. **Nav vs screens** — Sidebar lists **Files** and **Projects** separately; prompt 5 merges them. **Settings** is in the shell; there is no Settings prompt. **Connections** is bottom-nav only, not in the top icon stack story.
5. **Column math** — Shell sidebar (64px) + Chat’s three columns (260 / flex / 300) + optional open model popover is a four-band layout. Same squeeze on Tasks (table + timeline + open drawer) and Hermes (stream + activity + bottom inspector).
6. **Visual tone** — Hermes must feel “more terminal-like” while “keeping the same colors.” Prompt 0 already claims Linear + Raycast + terminal. No rule for what may diverge (type size? mono density? borders?) so Stitch will either clone Home or invent a second system.
7. **Dark-first vs optional light** — Follow-up asks for light mode with “the same layout.” Tokens are dark-tuned (violet/teal on `#0B0C0F`); light remaps are unspecified, so contrast and accent weight will drift.

---

### Gaps

| Gap | Why it matters |
| --- | --- |
| No **one job / one question** per screen | Skills expect Operate screens to answer one job first; every prompt lists widgets instead |
| No type **scale** (only Inter + JetBrains Mono) | Hierarchy will be invented per screen |
| Almost no **empty / loading / disabled** (only one Connections error card) | Agent/ops UIs live in these states |
| No **focus, keyboard, reduced-motion** | Pulsing teal + shimmer are specified with no fallback |
| No **contrast / semantic color** rules | Status = teal/red dots only; violet used as brand and message chrome |
| Mobile only as optional Home | Chat / Tasks / Hermes / Files are desktop-only multi-pane |
| No **product-specific signature** | Skills ask for one element only this product has; prompts only cite Linear/Raycast/terminal |
| Sample content unbounded | Paths, prompts, tool I/O, “memory” chips—no “use clearly fake data” rule |

---

### Unrealistic scope (for Stitch + for one mock)

Stitch is steered toward **one static screen**. These prompts repeatedly ask for **interaction state machines** in one paste:

- Chat: thread *and* open model popover *and* effort control *and* context panel  
- Tasks: full table *and* 24h timeline *and* open drawer with schedule builder + live next-5 preview + expandable logs  
- Hermes: live stream *and* activity cards with expandable I/O *and* shimmer *and* four bottom inspectors  
- Files: tree *and* project cards with sparklines *and* list/grid *and* markdown preview *and* NL search  
- Home: six card types + masonry “3 + 3”

Also unrealistic as **product UI density**: icon-only 64px rail for eight destinations, Home as a six-widget dashboard, and “mission control” Hermes on top of an already dense shell. Expect truncated panels, fake sparklines/usage bars, and inconsistent component sizing across regenerations.

---

### Security / privacy risks (prompt → third-party + UI patterns)

1. **PII in the prompt** — Real greeting “Jonas” and avatar `"J"` go to Google Stitch. Fine for a private throwaway; bad if the project/prompts are shared or the Stitch project is public.
2. **Subscription-session framing** — “Signed in via CLI”, “OAuth”, “Local session”, usage meters, reconnect—normalizes UI around **hijacking/reusing vendor sessions** rather than first-party API keys. Even as mock UI, that trains the wrong trust model and invites realistic account-looking sample data.
3. **Agent surface area in the mock** — Hermes shows shell / browser / file-edit / API tool cards with expandable input/output. Without a hard rule that samples are synthetic and redacted, people will paste real traces (secrets, paths, tokens) into Stitch or into later handoff assets.
4. **Memory chips + Drive/GitHub trees + file paths** — Designs persistent personal memory and cloud corpora with no privacy copy, consent, or redaction pattern.
5. **Provider logos / plan names** — Trademark and “looks like the real billing page” risk if mocks use real marks and plan strings (“Claude Max”, “ChatGPT Pro”).

---

### UI / design-quality problems (skills lens)

**Mode:** These are Operate/app screens. Impeccable + design-taste-frontend app rules want quiet chrome, color on data, flat surfaces, no hero dashboard theater. This brief does the opposite.

**Category slop (hard conflicts with both skills)**  
- Dark-first + **electric violet** + Inter + glass blur + hairline + soft status pills = default “AI product” costume (taste skill bans assistant violet/indigo; craft floor treats glass-as-decoration as refuse; app study calls out Inter + dark kit).  
- Home: greeting + **card grid** + usage bars + status dots + project tiles + sparklines = textbook generated dashboard (app-screens: KPIs aren’t tiles; no sparklines-as-content; colour on data not chrome; no hero header).  
- “Feels like Linear, Raycast and a terminal” is **pastiche**, not a subject-derived idea—so every screen will look interchangeable with other AI consoles.

**Hierarchy**  
- Home never states the single next action; six peers compete.  
- Chat buries the thread between list + context + open picker.  
- Tasks opens the drawer in the same frame as the master list—no clear primary.  
- Hermes gives header, stream, activity, and bottom tabs equal weight; “mission control” without a focal strip.

**Spacing / density**  
- Masonry on Home fights a calm 12-column ops layout (gaps won’t close; cards will stagger).  
- Icon-only sidebar saves space but costs scanability (app guidance: icon rails fail when people need labels).  
- “Compact cards” + “generous spacing” + multi-drawers = either cramped type or endless scroll.

**Typography**  
- Inter as the only UI face is the kit default the skills warn against; no display/figure decision for JunOS itself.  
- Mono for cron/logs is justified; mono for **model IDs** and “terminal feel” across Hermes risks costume mono.  
- No sizes/weights → Stitch will invent 6–8 sizes and chip labels in tiny tracked UI.

**Motion**  
- Teal **pulsing** status + activity **shimmer** are continuous chrome motion, not a signature Operate moment. No `prefers-reduced-motion`, no cap on looping motion (bad for focus in a command center).

**Legibility / contrast**  
- Violet `#8B5CF6` as accent on `#0B0C0F` / `#14161B` is risky for small chips, links, and “subtle violet tint” user bubbles—prompts never require ≥4.5:1 body or non-color status cues.  
- Status = teal/red **dots only** (color-only encoding).  
- Glass blur on overlays undercuts overlay text contrast.  
- Grey “Not connected” on dark panels is called out without a contrast floor.

---

### Highest-leverage fixes (guidance only; Ask mode)

1. Rewrite prompt 0: one ground/ink/accent from **JunOS**, not violet-on-near-black Inter glass; flat surfaces; color reserved for running/fail/data; name a real typeface with character or keep one UI face + mono for code only.  
2. Per screen: one sentence **job**, above-the-fold blocks only, **closed** states (picker closed; drawer closed; one Hermes inspector). Put open states in separate follow-ups.  
3. Split Files vs Projects; add Settings; drop masonry/sparklines/usage theater unless they answer the screen’s job.  
4. Replace personal name with a placeholder; mandate **synthetic** paths/logs/memory; soften “local session / CLI signed-in” copy unless product/legal owns that threat model.  
5. Add explicit a11y lines: contrast floor, text+icon status, reduced-motion off for pulse/shimmer.

I did not compare this file to other specs—review is of `docs/design/stitch-prompts.md` only, through impeccable (Operate/craft) and design-taste-frontend (app-screen / anti-slop) lenses.
