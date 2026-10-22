**Verdict:** As Stitch art direction for an Operate surface, this doc mostly encodes the *generated dashboard* kit both skills warn against (dark + violet + glass + Inter + card grid + sparklines). It also overloads each screen, under-specifies states/a11y, and quietly asks Stitch to mock sensitive subscription/agent surfaces.

---

### Contradictions

- **Dense vs generous.** Prompt 0 wants “dense but calm” *and* “generous spacing.” Stitch will pick one; usually oversized cards with sparse innards.
- **Icon rail vs named items.** Global layout is a **64px icon sidebar**, but items are listed by name (Home, Chat…). No tooltip/label rule → unlabelled chrome, which `app-screens` flags when the rail needs labels.
- **Nav IA vs screens.** Sidebar has **Files** and **Projects** as separate items; prompt 5 merges them into one “Files & Projects” screen. **Settings** is in the rail; there is **no Settings prompt**.
- **Double Home.** Prompt 0 already “Start by designing the Home”; prompt 1 redesigns it. Easy style drift between paste 0 and paste 1.
- **Accent vs status.** Brand accent is electric violet; “healthy/running” is teal. Chat user bubbles get “subtle violet tint,” so accent lands on chrome/content, not “on data” (`app-screens` / taste house rules).
- **Dark-first vs light/mobile follow-ups.** Optional light mode and 390px bottom tabs are bolted on without token remaps, contrast rules, or how **8 rail destinations** collapse into a phone tab bar.
- **Layout jargon.** Home: “12-column… remaining cards in a **3 + 3 masonry**.” Masonry + fixed 12-col + six equal cards fights itself; Stitch will invent uneven heights and weak scan order.
- **Taste vs brief.** `design-taste-frontend` bans (for pages) / heavily warns (for apps): **violet/indigo as kit accent**, **glass/backdrop blur**, **Inter-as-default face**, **KPI/project sparklines**, **identical card grids**, neon-on-dark energy. Prompt 0 asks for most of that on purpose—so the brief *is* the slop direction unless JunOS intentionally owns that Linear/Raycast costume.

---

### Gaps (what Stitch won’t invent well without being told)

- **One job per screen.** No “primary question” or primary action (Operate / `app-screens` §2). Home is six competing widgets; Chat opens the model picker; Tasks opens a drawer; Hermes is full mission control—nothing says what to emphasize.
- **Empty / loading / zero / permission-denied** except one Connections “Session expired” card. No empty chat, no zero tasks, no offline Hermes, no failed file preview.
- **Focus, keyboard, contrast floors, `prefers-reduced-motion`.** Motion is implied (`teal pulsing`, `progress shimmer`) with no reduced-motion fallback (impeccable craft floor / taste motion rules).
- **Type scale.** Only Inter + JetBrains Mono; no size/weight roles. App screens want ~4–6 sizes, title ~18–24px—not marketing display. Risk: Stitch oversizes the greeting and undersizes table meta.
- **Status language.** Dots and pills everywhere without “one status mark per row” or pale-tint-on-dark pairs (`app-screens` §7.6 / §9.3). Red/teal dots alone fail colorblind and non-text contrast checks.
- **Responsive beyond one optional Home mobile.** Chat three-pane, Tasks table+drawer, Hermes 40/60 + bottom strip have **no** collapse rules.
- **Real content contract.** Placeholder logos, fake usage “62%,” sample models—fine for mocks, but no “illustrative / not real credentials” note for anyone pasting into a shared Stitch project.
- **Product face.** Avatar “J” and greeting “Jonas” personalize, but there’s no JunOS mark/wordmark rule—shell can still read as generic dark admin (`app-screens` “kit, not a product”).

---

### Unrealistic scope (for one Stitch screen each)

| Screen | Why it will mush |
| --- | --- |
| **Chat** | 3 columns + open model popover + effort control + code/table/thinking samples + context toggles. One prompt, many competing focal points. |
| **Tasks** | Tabs + table + 24h timeline + open drawer with schedule builder, live next-5 preview, run history/logs. |
| **Hermes** | Dual live streams + expandable tool I/O + shimmer + Memory/Skills/Logs/Queue. |
| **Files** | Tree + project cards + sparklines + list/grid + preview + NL search. |
| **Home** | Six card types including live agent feed and subscription meters. |

Stitch’s own guidance in the doc (“one screen per prompt”) is right; the **payload per screen** still asks for a multi-view product demo, not a single composed frame. Expect missing columns, truncated drawers, and inconsistent chrome across prompts 2–6.

---

### Security / privacy risks (in the *prompt content*, not implemented code)

- **Personal identity in shareable prompts:** “Good evening, **Jonas**,” avatar **“J”**—fine locally; bad if the Stitch project is public/shared.
- **Subscription / session bridging as UX:** Connections frames “linking existing AI subscriptions instead of API keys,” “Signed in via CLI,” “OAuth,” “Local session,” reconnect/disconnect, usage meters. That teaches a **credential/session-proxy** product shape; mocks will normalize showing plan names, limits, and expiry. High sensitivity if screenshots leave the machine.
- **Agent attack surface in UI copy:** Hermes activity with **shell, browser, file edit, API**, expandable **input/output**, editable **Memory** chips, “Give to Hermes,” queue from Tasks. Design prompts that show raw tool I/O train the visual language of **secrets-in-logs** (tokens, paths, prompts).
- **Filesystem / cloud corpus:** tree includes Google Drive / GitHub; NL search over “PDFs… about the API”; “Ask about this file.” Implies broad personal/work data in the command center—privacy-by-default (redaction, path scrubbing, no content in previews) is unspecified.
- **Provider brand marks** in every chat row / connection card—trademark and phishing-lookalike risk in polished fakes.

None of this is “write malware,” but as a design brief it **under-specifies** safe defaults (masked paths, no secret-looking monospace samples, usage as abstract, memory as non-PII examples).

---

### UI / design-quality problems (skills lens)

**Hierarchy & density**  
Home leads with a greeting (template tell: “Welcome back”) then a **card wall**—no single dominant answer. Chat/Tasks/Hermes bury the primary control under chrome. Taste/impeccable Operate: colour and weight on **the job and the data**, not six equal tiles.

**Spacing & layout**  
“Masonry” on a command center fights alignment; icon rail + top ⌘K bar + status pill + avatar is a lot of shell before content. Files stacks cards *and* a browser *and* preview—classic below-the-fold failure (`app-screens`: every named block should show header + first rows at 1440×900).

**Typography**  
**Inter** is explicitly called out as the “kit face” anti-pattern. Mono for cron/model IDs is justified; mono as overall “terminal vibe” (Hermes) drifts into costume (impeccable refuse: monospace as technical cosplay). No measure/line-height; chat bubbles + thinking + code will get cramped or huge inconsistently.

**Colour, contrast, legibility**  
- Near-black `#0B0C0F` / panels `#14161B` with **hairlines**: hairlines vanish or become noise; secondary grey on dark often lands ~2–3:1 unless specified (`app-screens` §9.3).  
- **`#8B5CF6`** as system accent on dark is the default AI-admin look; on light follow-up it gets worse.  
- **`#2DD4BF`** as small status text may fail 4.5:1; better as fill-on-tint, not raw label colour.  
- Violet-tinted user bubbles: accent on content chrome, weak contrast for text.

**Components / tells**  
Status **pills**, **usage bars**, **sparklines** on project cards, **glass blur overlays**, **10px** soft radii, provider **chip** piles, icon+badge cards on Connections—aligns with §14 “Tells of generated dashboards,” not with the studied quiet products (colour ≤~3% of pixels, sparklines on KPIs = 0/23).

**Motion**  
Pulsing Working pill + progress shimmer + (implied) live feeds = scattered motion. No signature *one* motion, no reduced-motion path. Impeccable: one authored moment; taste: motion after the static composition works.

**Mobile follow-up**  
Bottom tab bar for Home only doesn’t scale to Chat’s three panes or Hermes. “More” overflow or a different IA is unstated—unrealistic as a one-liner.

---

### Highest-impact doc fixes (guidance only; Ask mode)

1. **Pick Operate restraint:** one ground, one ink, **one** accent used on data/primary action; drop glass, sparklines-on-cards, and violet-as-chrome—or explicitly accept “Linear cosplay” and stop mixing teal+violet+glass.  
2. **One question + one primary action per prompt**; move secondary widgets to follow-ups.  
3. **Align IA:** either merge Files/Projects in the rail or split prompt 5; add Settings or remove it from the shell.  
4. **Replace layout mush** (“3+3 masonry”) with a fixed grid and row order (e.g. ask → runs/Hermes → rest).  
5. **Add a privacy strip** to every prompt: scrubbed paths, fake non-secret logs, illustrative usage, no real name if the project is shared.  
6. **Specify dark contrast pairs** (secondary text, status tint pairs) and `prefers-reduced-motion: no pulse/shimmer`.  
7. **Cut Chat/Tasks/Hermes** to closed popovers and one focused state each; open-picker / open-drawer as separate follow-ups (the doc already says follow-ups work better).

I did not run Stitch or render UI—this is a **prompt-doc** review against impeccable (Operate + craft floor) and `design-taste-frontend` (especially `app-screens.md` house rules/tells).
