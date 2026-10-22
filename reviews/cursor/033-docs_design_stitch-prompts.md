**Verdict:** As a Stitch brief, this doc hardcodes a familiar “AI OS dashboard” kit (dark + violet + glass + Inter + card masonry) and packs more interaction into each screen than Stitch can reliably invent. It also leaves Settings, states, a11y, and sensitive-data handling unspecified while celebrating raw agent I/O and subscription-session chrome.

Mode: **Operate** (task UI). Lens: impeccable Operate + design-taste **app screens** (not the marketing-page run).

---

### Contradictions (inside the doc)

1. **Density vs air.** Style foundation asks for both “dense but calm” and “generous spacing.” Home then stacks six card modules in a “3 + 3 masonry.” Stitch will pick one and drift screen-to-screen.
2. **Calm Linear vs Hermes “mission control.”** Global tone is calm/dense; Hermes is told to feel “more technical and terminal-like” with pulsing status, shimmer, and tool-call cards. No rule for what stays shared vs what may diverge (type scale, borders, motion).
3. **Accent vs state color.** Violet is the brand accent; teal/red own health. User chat bubbles are “subtle violet tint,” so accent, selection, and message chrome compete. When is violet for action vs decoration?
4. **Cards everywhere vs “no heavy shadows / terminal calm.”** Home, Files, Connections, and Hermes activity all prescribe cards. Foundation bans heavy shadows but keeps hairlines + glass—still a soft, layered chrome language that fights “terminal-like.”
5. **Nav promises Settings; no Settings prompt.** Sidebar lists Connections + Settings; only Connections is specified. Agents will invent Settings or leave a dead icon.
6. **Prompt 0 double-briefs Home.** Foundation ends with “Start by designing the Home…” and prompt 1 is Home again—easy to get two competing Homes in one Stitch project.
7. **Dark-first tokens vs light follow-up.** Foundation locks `#0B0C0F` / `#14161B` / violet / teal. Optional light mode has no remapped tokens, so light variants will be inverted dark chrome.
8. **Mobile only for Home.** Optional 390px Home with bottom tabs; every other prompt hardcodes desktop widths (64 / 260 / 300 / 40%–60%). No shared collapse rules.

---

### Gaps

| Gap | Why it matters |
|---|---|
| **No Settings screen** | In the chrome; undefined IA for providers, theme, profile, danger zone |
| **Almost no empty / loading / zero states** | Only one Connections “Session expired” card; Home/Chat/Tasks/Hermes/Files assume full data |
| **No primary job per screen** | App-screen craft: one question + one frequent action from the first viewport. Home is a greeting + six modules |
| **⌘K is chrome-only** | Command palette is in the top bar but never specified as a screen/overlay |
| **No keyboard / focus / reduced-motion** | Pulsing teal + shimmer with no `prefers-reduced-motion` or focus vocabulary |
| **No contrast targets** | Violet/teal chips, grey “Not connected,” mono on panels—no WCAG floor |
| **No shared component vocabulary** | Model/effort picker appears in Chat, Tasks drawer, Hermes header—duplicated without one control spec |
| **Files vs Home overlap** | Recent projects/files on Home and a full Files & Projects screen—no “source of truth” rule |
| **No IA for Chat vs Hermes vs Tasks** | When does work live in a thread, the agent console, or a cron? |

---

### Unrealistic scope (for Stitch + for one screen each)

Stitch is asked, per prompt, for interactions it usually fakes poorly:

- **Home:** 12-col masonry, six different card types, usage bars, status dots, model chip input  
- **Chat:** three columns + open model popover (grouped subscriptions) + effort control + thinking block + code + table + context toggles  
- **Tasks:** filter tabs + 24h timeline + dense table + open drawer with schedule builder, live next-5 preview, expandable logs  
- **Hermes:** live dual pane + shimmering step + four bottom inspectors (Memory / Skills / Logs / Queue)  
- **Files:** tree + sparkline project cards + list/grid + markdown preview + NL search  
- **Connections:** drag-to-reorder routing + usage meters + multi-method connection labels  

Also unrealistic as a **product** first paint: Home alone is a multi-product status wall (subs, agent, crons, projects, files, chat). That is template dashboard density, not “one job.”

---

### Security / privacy risks (prompted into the UI)

These are design-doc risks: Stitch will normalize whatever you describe.

1. **Subscription-session as first-class UI.** “Signed in via CLI,” “OAuth,” “Local session,” reconnect/disconnect, usage % of weekly limits—encourages a surface that looks like it stores or proxies someone else’s paid session. No redaction, scopes, or “what we store” copy.
2. **Hermes expandable tool I/O.** Shell / browser / file edit / API with input/output in mono—invites pasting secrets, paths, cookies, and PII into the mock (and later the product). No “sanitize / truncate / secret-mask” guidance.
3. **Agent Memory as editable chips.** “Key facts the agent remembers” on a bottom strip with no sensitivity classes (personal, credentials, third-party).
4. **Real name + avatar in the foundation.** “Good evening, Jonas” and avatar `"J"` bake personal identity into generated screenshots and exports.
5. **NL file search + “Ask about this file.”** No boundary on indexed content (Cloud / Drive / GitHub / invoices tagged in the AI column).
6. **Provider logos and plan names** (“Claude Max,” “ChatGPT Pro,” etc.) in marketing-like cards—trademark/ToS sensitivity for generated assets, plus implying unofficial “subscription bridging.”

---

### UI / design-quality problems (skills lens)

**Identity / anti-slop (taste app-screens + user design rules)**  
The foundation is almost a checklist of generated-dashboard tells: dark mode first, electric violet, glass blur, Inter + JetBrains Mono, hairline borders, status pills, usage bars, sparklines, icon rail, “Good evening, {Name},” card grid. Taste’s app study: colour on data not chrome; KPIs as type not tiles; no hero greeting; navigation recedes; Inter/#kit look reads as “well-applied kit, not a product.” Impeccable Operate allows familiar patterns, but still wants restraint and one semantic accent—not violet chrome + teal pulse + glass overlays.

**Hierarchy**  
- Icon-only 64px sidebar (labels never specified): weak wayfinding for eight destinations.  
- Home greeting competes with Quick ask; no single dominant control.  
- Chat: left list + thread + context + open picker = four competing foci.  
- Hermes: header + instruction stream + activity + four bottom tabs = no clear primary pane.

**Spacing / density**  
Conflicting brief (“generous” + “dense” + masonry + multi-panel drawers). Tasks table + timeline + drawer will crush row height; Hermes bottom strip will steal vertical space from the live timeline.

**Typography**  
Inter as default UI face is the generic kit face both skills warn about. Mono is overloaded (cron, logs, model IDs, code, thinking). No type scale, weight roles, or “one size for page title” (Operate: tighter scale, often ≤24px page titles—Home doesn’t specify).

**Legibility / contrast**  
Violet (`#8B5CF6`) and teal (`#2DD4BF`) on `#14161B` for small chips/badges/mono is unspecified and often fails at 12–13px. Grey “Not connected” on near-black panels is a classic fail. Violet-tinted user bubbles on violet accent reduce message/action separation.

**Motion**  
“Teal pulsing” and “progress shimmer” are decorative/ambient. Operate: 150–250ms, state-only, no load choreography. No reduced-motion path in any prompt.

**Component consistency**  
Model + effort appear in Chat, Tasks, and Hermes with different chrome (chip, drawer fields, header). Status is pill / dot / badge / shimmer without one status language.

---

### Highest-impact fixes (guidance only; Ask mode)

1. **Pick one job per screen** and cut Home to ≤3 modules; kill masonry.  
2. **Replace the kit look:** light or neutral dark ground, non-Inter face (or one dealt app face), accent on data/actions only, no glass, no violet-as-theme, labels on nav.  
3. **Add Settings + empty/error/loading + shared Model/Effort/Status specs** once; reference them.  
4. **Strip sensitive mock content:** no real name; truncate tool I/O; memory chips as non-sensitive examples; connection methods as abstract “Connected” without CLI/session theatre unless product-legal is settled.  
5. **Match Stitch’s ceiling:** one primary state per prompt (e.g. Chat with picker *closed*, separate follow-up “show model picker open”); no drag-reorder / sparklines / live pulse in v1 prompts.  
6. **Resolve density:** either “compact ops” (8–12px gaps, tight tables) or “airy” (generous)—not both—and state row heights.

I did not run impeccable’s live critique/detector: there is no rendered UI, only this prompt doc. If you want, I can next turn this into a tightened prompt outline (still Ask mode) or you can switch to Agent mode to edit the file.
