**Verdict:** As Stitch art direction, this doc locks in a high-tell “AI command center” kit (dark + violet + glass + Inter + card masonry + greeting) that both skills treat as the failure mode for Operate UI—and several prompts pack more chrome, panes, and live states than one Stitch screen can hold coherently.

Scope note: review is of `docs/design/stitch-prompts.md` only (content matches the prompts you listed under spec `2e87f7e`). No rendered Stitch output was available.

---

### Contradictions (internal + vs skills)

| Conflict | Why it matters |
|---|---|
| **“Dense but calm” + “generous spacing”** (prompt 0) | App-screen density is three knobs moved together (row pitch, pad, type). Asking Stitch for both usually yields either sparse empty cards or cramped chrome with leftover voids. |
| **Glass blur on overlays** vs **no heavy shadows** | design-taste app house rules ban glass/backdrop blur; impeccable craft-floor treats decorative glass/blur as refuse. Opaque tone-step surfaces are the consistent rule. |
| **Electric violet `#8B5CF6` as brand chrome** | App-screen ban: violet/indigo accents (owner taste); colour should sit on data / at most one control, ~≤3% coloured pixels. Violet + teal is **two accent families**. |
| **Dark-first Linear/Raycast/terminal mashup** | Operate mode wants precision from the use scene, not category costume. Study skews light; “neon/glass on dark” is an explicit generated-dashboard tell. |
| **Inter + JetBrains Mono as the face** | Inter/Geist + dark kit is called out as “kit face, not product face.” Mono is fine for cron/IDs; using it to *feel* terminal is costume. |
| **10px radius** | Study is bimodal (≈4–8 or 16–24); 11–12 is rare. Middle radius reads as default soft UI. |
| **Home greeting “Good evening, Jonas”** | Classic tell vs noun title at ~24/600 answering one job. |
| **6 peer cards + “3 + 3 masonry”** | Peer cards OK only for equal peer objects; mixed jobs (ask / runs / agent / subs / projects / files) want ranked hierarchy, not equal tiles. Sparklines on project cards echo banned KPI sparklines. |
| **Global ⌘K** (prompt 0) **+ Files NL search bar** (prompt 5) | Two search systems on one product with no rule for which wins. |
| **Hermes “progress shimmer”** | Loading rule: flat skeleton bars, **no shimmer gradient**. |
| **Status dots teal/red only** | Colour-only status fails legibility and heuristic “visibility of system status” without text/icon backup. |
| **Icon rail 64px, 8 destinations, labels only implied** | Icon rails are allowed but save width *and* hide names; eight icons + bottom Connections/Settings is a lot of unlabeled destinations. |
| **Light/mobile only as optional follow-ups** | Foundation is dark-first; phone fold is Home-only while Chat/Tasks/Hermes/Files are multi-pane desktops. |

---

### Gaps

- **No screen-level question** (app-screens §2.2). Home never says what to answer first (“What’s running?”, “What needs me?”, “Ask once”).
- **No product-specific signature element**—only competitor mashup. Skills expect one thing only JunOS has.
- **Nav lists Settings; no Settings prompt.** Incomplete IA.
- **Almost no empty / loading / zero / permission-denied states** (Connections “session expired” only). Operate surfaces live or die on these.
- **No a11y contract:** focus rings, reduced motion for pulse/shimmer, contrast floors for muted text on `#14161B`, non-colour status.
- **No density tokens** (type scale, row heights, card pad)—Stitch will invent Inter-14-everything.
- **Handoffs undefined:** Tasks → Hermes queue, Chat tools, “Give to Hermes,” “Open in Chat” are named without object model or confirmation patterns.
- **Sample data vs illustrative** not labeled; usage % and subscription plan names will read as product claims.
- **Tablet band absent**; mobile only for Home.

---

### Unrealistic scope (for Stitch, one screen per prompt)

Each “screen” is really a **multi-surface product**:

1. **Chat** — 3 columns + open model popover (5 provider groups) + code + table + thinking + context toggles.  
2. **Tasks** — tabs + table + 24h timeline + open drawer (schedule builder, next-5 preview, history logs).  
3. **Hermes** — header + instruction stream + tool-call timeline + 4 bottom inspectors.  
4. **Files** — tree + project cards/sparklines + list/grid browser + markdown preview + NL search.  
5. **Connections** — provider grid + drag-reorder routing rules + error card.

Stitch is weak at consistent global chrome, masonry, drag-reorder, and “live” states. Expect style drift across prompts 1–6, collapsed drawers/popovers ignored, and unreadable density at 1440. Prompt 0 also asks to **design Home inside the foundation prompt**, which fights “one screen per prompt.”

---

### Security / privacy risks (design-as-spec)

These are product implications encoded as friendly UI copy:

1. **“Linking existing AI subscriptions instead of API keys”** + methods like **CLI sign-in / local session / OAuth** designs a subscription-piggyback / session-reuse surface—ToS and credential-exfiltration risk if built as drawn.  
2. **Hermes tools: shell, browser, file edit, API** with no sandbox, approval, or audit affordances in the prompt—normalizes high-risk autonomy in the default chrome.  
3. **Memory chips** (“key facts… editable”) with no retention, export, or clear-all control.  
4. **Files: Local + Google Drive + GitHub + AI tags including “invoice”**—sensitive doc graph in a personal OS mock.  
5. **Usage meters / plan names**—implies scraping or proxying vendor quotas; privacy and accuracy landmines.  
6. **Personal name “Jonas” / avatar “J”** in prompts sent to Google Stitch—PII in a third-party design tool. Prefer neutral sample identity in shared prompts.  
7. **Context tool toggles (Files, Web, Hermes, Tasks)** with no permission or scope copy—looks always-on.

---

### UI / design-quality (hierarchy, space, type, density, motion, legibility)

**Hierarchy** — Home is six equal jobs; Chat/Hermes bury the primary action under chrome. Skills want the block that answers the screen’s question largest and first.

**Spacing** — “Generous” + masonry card grid + slim rails will produce either template card gaps or stacked drawers with no resting plane. App screens: group, don’t box; prefer one divided surface over six trays.

**Typography** — No scale (title/section/body/meta). Greeting competes with content. Mono for schedules is fine; mono as brand voice fights “calm Operate.”

**Density** — Mission-control everywhere. At desktop width, Chat (260 + thread + 300) and Hermes (40/60 + bottom tabs) will crush the reading column; Tasks table + drawer is a second product on one artboard.

**Motion** — Teal **pulse** + **shimmer** are decorative status theater; no `prefers-reduced-motion`, no single authored moment. For Operate, motion should confirm state change, not ornament “Working.”

**Legibility / contrast** — Unspecified secondary text on `#14161B`; colour-only dots; glass overlays under copy; violet chips for user messages risk low contrast on small UI. Provider logos + tiny badges in lists will fail at real sizes.

**Composition tells** (design-taste §14) this doc *asks* Stitch to emit: dark kit, greeting, card grid, usage bars, sparklines, status pills, top bar search+avatar, glass, violet chrome, identical provider cards.

---

### Highest-leverage fixes (if you revise the doc later)

1. **Pick Operate tokens:** neutral dark *or* light, **one** data hue (not violet chrome), no glass; tight *or* soft radius once; Inter → a deliberate face or own the kit consciously in a DESIGN.md exception.  
2. **One question per screen**; Home = ranked primary strip + secondary, not 6-up masonry.  
3. **Split mega-prompts** (e.g. Chat thread vs model picker; Tasks table vs drawer).  
4. **Strip or caveat the subscription-piggyback / shell-agent framing** in anything that might become implementation truth; add consent, sandbox, and memory controls if those surfaces stay.  
5. **Add Settings + empty/error/loading + a11y one-liners**; de-personalize sample user for Stitch uploads.  
6. **Resolve search:** ⌘K *or* in-screen search, with a single rule.

I’m in Ask mode, so I can’t edit the doc—switch to Agent mode if you want a revised prompt set.
