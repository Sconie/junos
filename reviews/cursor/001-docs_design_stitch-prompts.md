## Findings

### 1. High — IA is a different product from the specs
**Where:** §0 sidebar (`Home, Chat, Hermes, Tasks, Files, Projects…`); only prompts 1–6 exist.  
**Why:** `14-ui-system.md` and `00-overview.md` require Inbox, Agents, Workflows, Kanban, Scout (and Settings). Home in `10-home-and-search.md` centers **Needs you**, board snapshot, and Scout — none of that is in prompt 1. Stitch output will freeze a half-app shell that Phase 0 (`13-roadmap.md`) then has to undo.  
**Fix:** Rewrite §0 nav to match `14-ui-system.md`. Add prompts (or explicit “out of scope for Stitch”) for Inbox, Workflows, Kanban, Scout, Settings. Rebuild Home cards to match §10 order: Quick ask → Needs you → Upcoming → Hermes → Board → Subscriptions → Scout → Recent.

### 2. High — Style foundation is the “AI dashboard” kit the taste skill bans
**Where:** §0 — dark-first, `#8B5CF6`, Inter + JetBrains Mono, “1px hairline borders”, “subtle glass blur”, “mix of Linear, Raycast and a terminal”; §1 card grid; §4 “mission control” + shimmer/pulse; §5 sparklines; §6 identical provider cards.  
**Why:** design-taste house rules ban violet/indigo assistant palettes, glass/blur chrome, hairline costume, Inter-default stacks, icon/card grids, sparklines-as-KPI chrome, and pulsing/shimmer decoration. App-screens guidance: colour on data not chrome; KPIs as type not tiles; no vanity sparklines. The brief also fights itself: `14-ui-system.md` chose Translucent Glass (brief wins per impeccable), while taste treats that stack as generic. Result: Stitch will look like every other dark AI console.  
**Fix:** Keep glass only if you accept it as a pinned brief — then document “taste exceptions: glass, hairlines, violet” once. Otherwise rewrite §0: one ground/ink/accent from JunOS (not stock violet), one UI face that isn’t Inter, flat panels with tone steps (no blur), accent only on live status/data, no sparklines/shimmer/pulse, Home as a few dense type+table blocks not six equal cards. Add one JunOS-specific signature (e.g. event-stream / approval strip), not “Linear×Raycast×terminal”.

### 3. High — Token/layout contradictions with `14-ui-system.md`
**Where:** §0 radius `10px`, panels `#14161B`, “no heavy shadows” + glass; drawers `300px` (§2), table+timeline+drawer (§3).  
**Why:** UI system: radius `12px`, translucent `rgba` panels + `--bg-glow`, drawers `360–420px`, chat measure max `760px`. Solid vs glass and 10 vs 12 will make every Stitch export fight hand-matched CSS.  
**Fix:** Paste §0 tokens verbatim from `14-ui-system.md` (`--panel`, `--blur`, `--radius: 12px`, drawer widths, chat max width). Drop competing solid-panel language.

### 4. High — Connections copy implies unsafe / out-of-policy auth
**Where:** §2 “Connect link”; §6 “OAuth”, “Local session”, usage meters; §1 “62% of weekly limit”.  
**Why:** `03-connections-and-routing.md` and `12-security-and-privacy.md`: drive official CLIs, **never extract tokens/OAuth**, no provider passwords in JunOS; usage only when the provider exposes it (else local counts). Mocking OAuth/session and fake % meters teaches the wrong product and can steer implementers toward scraping sessions (ban risk + credential leakage).  
**Fix:** Connection method labels only: “Signed in via CLI” / “CLI missing” / “needs_login” with **Reconnect = show exact CLI command**. Usage: “when provider exposes meter; else local runs / last 429”. Remove OAuth/Local session. Connect link → “Run `claude login` (copy)” not in-app OAuth.

### 5. High — Privacy: personal + sensitive UI content pushed into Google Stitch
**Where:** How to use (Stitch URL); §0 avatar `"J"`; §1 `"Good evening, Jonas"`; §4 expandable tool I/O; §5 NL search over files / AI tags like `"invoice"`; Cloud Drive.  
**Why:** Stitch is a third-party cloud generator. Prompts encode real identity, subscription set, agent tool I/O, and file-classification UX. `12` treats agent I/O and local data as sensitive; `11` makes AI tagging opt-in and keeps content local unless attached.  
**Fix:** Use generic user (`You` / `User`); no real name. Sample Hermes I/O: redacted placeholders (`[redacted]`), never shell secrets. File tags: “opt-in; sample tags only”. Mark Cloud as “v2 / greyed”. Add a one-line ops note: don’t paste real paths, prompts, or logs into Stitch.

### 6. High — Per-prompt density is unrealistic for Stitch “one screen”
**Where:** Intro (“one screen per prompt”); §1 six cards + masonry; §2 three columns + open popover + thinking/code/table; §3 table + 24h strip + full drawer; §4 chat + activity + four bottom inspectors; §5 tree + cards + sparklines + browser + preview + NL search.  
**Why:** Stitch collapses multi-region “mission control” into muddy chrome. You’ll get pretty noise, not implementable structure. Specs already split concerns (Home glance vs work screens; Hermes approvals in Inbox).  
**Fix:** Split: e.g. Chat = thread+composer only; follow-up = list; follow-up = model picker open; follow-up = context panel. Hermes: console shell, then Activity, then Memory/Queue. Files: projects row OR browser OR preview — not all. Cap each prompt to one primary job and ≤2 secondary regions.

### 7. Med — Internal nav contradiction: Files vs Projects
**Where:** §0 lists **Files** and **Projects** as separate items; §5 is one **Files & Projects** screen.  
**Why:** Stitch will invent two destinations or orphan one icon. Specs treat one screen with a tree (`11`).  
**Fix:** One nav item “Files” (or “Files & projects”) matching §5; drop the extra Projects icon.

### 8. Med — Home omits the product’s actual job (“Needs you”)
**Where:** §1 cards 1–6 (Quick ask, Upcoming, Hermes, Subscriptions, Projects, Files).  
**Why:** Principles in `00` / `12`: human in charge via approvals. Without Inbox/approvals on Home, the mock sells a status wallpaper, not a command center (`10`, app-screens “something to do”).  
**Fix:** Make **Needs you** (approvals first, inline Approve/Deny) the second block after Quick ask; demote Subscriptions/Recent below the fold or merge.

### 9. Med — Hermes console missing approval / kill-switch hierarchy
**Where:** §4 Pause/Stop/Settings; activity cards with expandable I/O; no approval banner.  
**Why:** `06-hermes.md` / `12`: Stop always visible; approval banner; autonomy level; memory writes as diffs until pinned. Without that, Stitch designs a firehose, not supervision.  
**Fix:** Add mandatory chrome: autonomy chip, approval banner on blocked step, Stop as destructive emphasis, Memory “proposed vs pinned”. Soften “expandable input/output” to summary-first + redact.

### 10. Med — Optional follow-ups fight roadmap and non-goals
**Where:** Optional: light-mode variant; mobile 390px bottom tabs.  
**Why:** `14` / `13`: light theme Phase 5; desktop first; `00` non-goal “mobile app”. Early light/mobile variants split the design system and burn Stitch budget. Responsive rule in `14` is rail→bottom tabs below 900px — not a separate mobile product.  
**Fix:** Delete or gate under “Phase 5 only”. If needed, one note: “below 900px: bottom tabs Home/Chat/Inbox/Kanban/More” without a full mobile redesign pass now.

### 11. Med — Missing production states the UI system requires
**Where:** All screen prompts; no Settings prompt despite §0.  
**Why:** `14-ui-system.md`: loading skeleton, empty+next action, error+retry, offline daemon banner, disconnected provider — every screen. Without them, mocks are happy-path only and a11y/keyboard-first never appears.  
**Fix:** Add a global §0.5 “States” blurb pasted into each screen; one Connections card already errors — mirror for empty Home, empty Chat, `junosd not running` banner. Add a minimal Settings prompt (approvals, autonomy defaults, allowlists) or remove Settings from the rail until it exists.

### 12. Med — Typography / hierarchy instructions produce weak Operate UI
**Where:** §1 greeting as hero; §4 “more technical”; monospace for cron/logs (ok) plus dense cards; Inter everywhere.  
**Why:** App-screens: no hero header; headings ~16–24px; colour on data; two sizes doing the work. Greeting-as-hero + card equal-weight grid kills hierarchy; Inter+violet+mono labels reads template.  
**Fix:** Specify: shell chrome quiet; page title ≤24px; primary data in full ink; one accent on live/running only; monospace **only** in cron, code, logs (not badges/labels); equal card weight banned — one primary region larger.

### 13. Low — Effort / model UX incomplete vs routing rules
**Where:** §2 effort always Low–Max; provider groups always shown.  
**Why:** `03`: grey/`n/a` when unsupported; fallback messaging in headers; cost guard. Mock won’t show disabled effort or fallback.  
**Fix:** One sample model with effort disabled; one message header “fell back from X”; note Max only where supported.

### 14. Low — Cloud / AI tags presented as current, specs say later / opt-in
**Where:** §5 Cloud (Drive, GitHub); AI tag column always on.  
**Why:** `11`: Cloud v2; AI tagging opt-in per folder; secrets excluded. Mock normalizes the risky path.  
**Fix:** Cloud section labelled “Coming / v2” or disabled; AI tags column with “opt-in” empty state.

### 15. Low — Radius/spacing/motion micro-tells
**Where:** §0 `rounded corners 10px`, `teal pulsing`, §4 `progress shimmer`; §1 masonry.  
**Why:** Masonry + pulse/shimmer are common generative tells; conflict with `prefers-reduced-motion` in `14`.  
**Fix:** Fixed 12-col grid (no masonry); status = static teal + text; running = determinate progress or quiet “Running”; document reduced-motion: no pulse/shimmer.
