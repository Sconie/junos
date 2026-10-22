**Verdict:** As a Stitch brief this doc steers hard into the generated “AI command center” kit that both skills treat as failure mode—dark Inter + violet, glass, card grids, greeting header, sparklines, shimmer—while packing more panels and states into each prompt than Stitch can hold coherently. Several internal IA contradictions and privacy-sensitive mock surfaces make it worse.

Mode: **Operate / app screens** (not a marketing page). Judged against impeccable Operate restraint and design-taste app-screen house rules / dashboard tells.

---

### Contradictions (inside this doc)

1. **Nav vs screens**  
   Prompt 0 defines separate **Files** and **Projects** sidebar items, then prompt 5 ships one combined “Files & Projects” screen. **Settings** is in the shell; there is no Settings prompt. Connections is covered; Settings is not.

2. **Density language fights itself**  
   Prompt 0 wants “generous spacing” *and* “dense but calm,” then Chat (3 cols + open popover), Hermes (split + bottom strip), and Tasks (table + timeline + open drawer) all ask for multi-region density. Stitch will resolve that by shrinking type and stacking chrome.

3. **Calm Linear/Raycast vs “mission control”**  
   Prompt 0: Linear / Raycast / terminal, calm. Prompt 4: more technical, pulsing status, progress shimmer, activity “cards,” terminal logs. That is a second product look, not a slight shift.

4. **One accent vs chrome use of accent**  
   Violet is the brand accent; user bubbles get “subtle violet tint,” providers get teal/grey status, Hermes pulses teal. Accent leaks onto chrome and status decoration—the app-screen rule is accent on **data / one control**, not tinted bubbles and pulsing pills.

5. **Dark-first foundation vs light follow-up**  
   Optional light mode has no token remapping (grounds, hairlines, violet/teal on light). A follow-up “same layout, light” will invent a second, weaker system.

6. **Mobile follow-up vs 8-item icon rail**  
   Bottom tab bar for Home only, while the shell has eight destinations. App-screen phone guidance caps bottom bars at ~4–5; the rest has no IA story (overflow, “More,” Settings burial).

---

### Gaps

| Gap | Why it matters |
| --- | --- |
| No Settings screen | Named in global layout; Stitch will invent it inconsistently if needed |
| Almost no empty / loading / error states | Only Connections “Session expired”; no empty chat, idle Hermes, zero tasks, failed file preview |
| No type scale | Inter + Mono named; no sizes, weights, or title vs meta hierarchy |
| No product mark | Avatar “J” and name in copy; shell never requires a JunOS mark/wordmark (app-screen “give the product a face”) |
| No a11y / reduced-motion | Pulsing + shimmer with no `prefers-reduced-motion`; status as color dots only |
| No contrast guidance for secondary text / hairlines on `#0B0C0F` | Grey “Not connected,” hairlines, and violet-tint bubbles will drift |
| Optional mobile only for Home | Chat / Hermes / Tasks three-pane layouts are the hard responsive cases |
| Sample data quality | “logo placeholder,” vanity usage “62%,” generic providers—no “believable rows that add up” |

---

### Unrealistic scope (for Stitch, one screen per prompt)

Each prompt asks Stitch to invent **layout + rich sample content + an open secondary UI** at once:

- **Home:** six different card types + “3 + 3 masonry” (masonry is already a weak, uneven hierarchy for an ops home).
- **Chat:** list + thread (code, table, thinking) + **opened** model picker + context rail.
- **Tasks:** tabs + table + 24h timeline + **opened** drawer with schedule builder and log history.
- **Hermes:** dual pane + live activity + four bottom inspectors.
- **Files:** tree + project cards + list/grid browser + preview + NL search.

That is beyond “one screen”; it is several interaction states. Expect muddled hierarchy, truncated columns, and fake chrome. Better: shell once, then one primary region per prompt; popovers/drawers as separate follow-ups.

---

### Security / privacy risks (in what these prompts ask to *depict*)

Not exploit steps—**mock UI that invites dangerous sample content**:

- **Hermes expandable tool I/O** (shell, browser, file edit, API) with no “redact secrets / no real tokens” rule → Stitch often invents plausible keys, cookies, `.env` lines, emails.
- **Memory chips** (“key facts the agent remembers”) with no sensitivity boundary → invented PII, addresses, employer, health, credentials-as-facts.
- **Files / Cloud** (Drive, GitHub, paths, tags like “invoice”) → realistic personal finance/docs in demos.
- **Connections** (OAuth, CLI session, usage) → fake account emails, session strings, plan IDs that look real.
- **NL search over personal files** and **Logs** tabs → same dump surface.

The doc never tells Stitch: fictional data only, no credential-shaped strings, no real emails/paths that look like the user’s.

---

### UI / design-quality (skills lens)

**Identity / anti-slop**  
Prompt 0 is almost a checklist of design-taste **generated dashboard tells** and bans:

- Dark mode + **electric violet** (violet/indigo accent ban in app-screen house rules; also the classic AI-product default).
- **Inter** as UI face (called out as kit face).
- **Glass blur** on overlays (banned; prefer opaque tone steps).
- **Card grid** home + greeting **“Good evening, Jonas”** (replace with a noun title / one job).
- Project **sparklines** (banned as KPI/decoration; study: 0/23).
- **Progress shimmer** (loading rule: flat placeholders, no shimmer gradient).
- **Teal pulsing** status (glow/pulse adjacent to banned neon-on-dark).
- References **Linear + Raycast + terminal** without one subject-derived idea—so Stitch will average them into generic “dev OS.”

**Hierarchy**  
Home leads with greeting, not the day’s one job. Six peer cards equalize importance; Quick ask should dominate or the overview should answer one question (what’s running / what needs me). Chat opens the model picker by default—chrome over conversation. Hermes bottom strip competes with the activity stream.

**Spacing / density**  
“Generous” + multi-pane + masonry + 10px radius cards will either look sparse and templated or cramped with 12px meta everywhere. No grid math (gutters, max content width, panel min-widths). “3 + 3 masonry” fights a calm scan path.

**Typography**  
Inter + Mono is fine for Operate *if* Mono is only code/cron/IDs—but “more terminal-like” Hermes invites Mono-as-costume (craft-floor refuse). No scale → Stitch will invent 11px labels and oversized greetings.

**Motion**  
Only specified motion is **pulse** and **shimmer**—decorative, not task feedback. Missing: intentional open/close for drawers/popovers, reduced-motion, and “content visible if motion fails.”

**Legibility / contrast**  
- Status **dots** without text → color-only.
- Violet-tint user bubbles on near-black: unspecified fill/text contrast.
- Hairlines and grey badges on `#0B0C0F` / `#14161B` need explicit steps (app screens: e.g. `#2e2e2e` on `#111`-class grounds).
- Usage bars as “62%” without labelled ends (skill prefers both ends labelled).

**Composition**  
Icon-only 64px rail for eight destinations hurts learnability (Tasks clock vs Hermes). Logo placeholders and sparklines fill space without product-specific substance. Optional light mode and one mobile home screen don’t redeem the desktop IA.

---

### Highest-leverage fixes (guidance only; Ask mode)

1. **Rewrite prompt 0** away from Inter/violet/glass/card-dashboard: one neutral dark ground, one non-violet accent used on data, one distinctive face, opaque overlays, noun titles, accent on one control.
2. **Align IA:** either merge Files+Projects in the nav or split prompt 5; add Settings or drop it from the rail.
3. **Split fat prompts:** closed picker/drawer by default; “show X open” as follow-ups.
4. **Add a sample-data / redaction line** to every agent/files/connections prompt.
5. **Replace** greeting grid, masonry, sparklines, shimmer, pulse with: one overview question, flat loading, labelled status, one timeline or table done well.

I did not run the live impeccable critique detector (this is a prompt doc, not rendered UI). If you want this turned into a rewritten `stitch-prompts.md`, switch to Agent mode.
