**Verdict:** The doc locks a direction that fights both skills’ app-screen craft (glass, glow gradients, violet chrome, Inter), then under-specifies the system needed to make that direction safe and operable—so implementers will fill gaps with kit defaults.

Note: Impeccable says the brief wins. Jonas chose Translucent Glass; the findings below assume that stays and ask whether the spec makes it craft rather than costume.

---

### Direction vs craft (design-taste app-screens + impeccable craft-floor)

| Spec choice | Skill pressure |
| --- | --- |
| Frosted glass + `--blur: 18px` | App-screens **ban** glows, glass, backdrop blur → opaque tone steps |
| `--bg-glow` dual radial gradients | Gradients on grounds banned; colour should stay ~≤3% of pixels, on **data** not chrome |
| `--accent: #8B5CF6` + accent focus rings | Violet/indigo accents banned as house taste; accent on chrome (nav/focus/pills) is a tell |
| `Inter` + glass dark kit | Explicit “kit face” tell (Inter/Geist + dark neon/glass) |
| Generic `Card` as a once-built primitive | “Group, don’t box”; resting cards + glass stacks two tells |

Glass can survive as a **pinned** world only if the spec constrains it: opaque fallbacks as the real surface model, blur as one atmospheric layer (not every panel), accent off chrome, colour on status/data. Right now it reads as atmospheric decoration with a contrast aspiration.

---

### Contradictions (inside this doc)

1. **Blur rules fight each other.** “Blur only on panels over the background” vs “never nested more than two deep.” Nested blur implies panels over panels, not over bg. No layer map (shell / floating / modal) → drawers + toasts + command palette will nest illegally.
2. **Contrast claim vs tokens.** “≥4.5:1 on the glass” is asserted, but text sits on `rgba(255,255,255,0.04–0.07)` over a **non-uniform** glow field. `--text-dim: #9AA0AC` will fail over purple/teal glows and over stacked glass. No measured pairs, no `prefers-contrast` overrides.
3. **Icon rail vs a11y.** “Keyboard-first” and “no information by colour alone,” but primary nav is **64px icons + tooltips**—tooltips are not a durable text label; screen readers and discoverability need names, not hover.
4. **Responsive IA vs desktop IA.** Desktop lists ~12 destinations; &lt;900px keeps five + More. Spec never defines More’s contents, order, or badge routing (Inbox badge vanishes from the collapsed set’s primary story).
5. **Light theme “Phase 5”** with tokens that are glow/glass-shaped, not semantic (`--panel` as alpha white). Hand-matching Stitch first without a semantic layer makes a later light theme a rewrite, not a theme flip.
6. **References may be aspirational.** Paths `/design/stitch-glass/` and `/design/stitch-softdark/` appear empty in-repo; “match to Stitch export when available” leaves the CSS block as the only truth with no visual contract.

---

### Gaps (what a UI system must specify and this doesn’t)

- **Type scale / measure / weight roles** — only families. App screens need ~12/14/16/24, tabular nums, title ≤32px. Chat “760px” is width, not type measure.
- **Spacing / density scale** — no 4px base, control heights, rail hit targets (44px on touch after collapse?), table pitch.
- **Elevation / surface roles** — bg, panel, panel-strong, float, modal; when border vs fill vs blur; radius nesting (one `--radius: 12px` for everything).
- **Motion** — `prefers-reduced-motion` named; no durations, what moves (drawer/toast/skeleton), transform-only budget. App screens: motion is feedback, not atmosphere.
- **Component semantics** — StatusDot / Chip / Badge overlap; Card vs panel; when KanbanColumn is glass vs opaque; Skeleton “no shimmer gradient” (taste) unset.
- **Shell identity** — no product mark/name placement; top bar is ⌘K + provider pill + avatar (chrome-heavy; taste study often has no top bar).
- **Focus / selection / scrollbars** — accent focus ring only; craft-floor wants selection, caret, tabular figures themed.
- **High contrast / forced colors** — named, not tokenized.
- **Icon system** — size, stroke, active state (brightness vs tinted pill vs accent bar—all unspecified; accent active pill would be another tell).

---

### Unrealistic scope

- **“Components to build once”** is a full product kit (tables, diffs, markdown, kanban, cron, command palette, …) in a one-page system doc with no phases or dependency order.
- **“States every screen needs”** (skeleton, empty, error, offline daemon, disconnected provider) is right as policy, heavy as day-one for every surface; offline banner with a **start command** is also a product/security surface, not just UI.
- **Icon-only rail of 10+ items** plus Connections/Settings is high cognitive load (impeccable: many parallel destinations). No progressive disclosure, grouping, or “core vs lab” split (Hermes/Scout sit equal to Home/Inbox).

---

### Security / privacy risks (UI-shaped)

- **Command palette / ⌘K** — no rule that results redact secrets, tokens, paths, or message bodies; global search is a leak surface.
- **MarkdownView / DiffView / code blocks** — no sanitization, exfil, or “don’t render untrusted HTML” note (UI system owns the viewer).
- **Provider status pill** — can expose provider/model/account identity on every screen (shoulder-surfing / recordings).
- **Offline banner “with start command”** — shell/daemon commands in UI are copy-paste attack and support-scam bait if wording isn’t tightly controlled.
- **Avatar** — no rule on what it loads (remote URL, tracking, PII in tooltip).
- **Glass does not protect privacy** — blur is aesthetic; screen share still shows content. Spec shouldn’t imply otherwise.
- **Badge counts** — unread totals can leak sensitive volume on lock screen / screen share; no privacy mode.

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility)

1. **Hierarchy is chrome-first.** Atmosphere + glass + accent focus + status pill compete with content. Taste: colour on data; shell quieter; active nav by brightness, not brand fill.
2. **No density model.** Agent/inbox/kanban ops UIs need a dense default; glass + 12px radius + soft panels usually push airy marketing density.
3. **Legibility risk is structural.** Variable backdrop under translucent panels makes body/`--text-dim` unreliable; solid underlays (or opaque panels) should be the contract, glass optional decoration on floats only.
4. **Typography is default stack.** Inter + JetBrains Mono with no scale = every AI dashboard. Even under a glass brief, pick one loaded face with character and a short role table.
5. **Motion unspecified → will become blur/glow animation.** Spec should forbid animating `backdrop-filter`/blur for atmosphere; allow sheet/drawer opacity+transform only.
6. **Icon rail density.** 64px with many icons: weak scan hierarchy, tooltip-dependent labels, active state undefined—active item will likely become a violet pill (banned pattern).
7. **Chat measure 760 + drawer 360–420 + rail 64** only fits comfortably on wide desktops; at ~1280px the grid fights itself; at 900px everything becomes sheets with no transition rules (preserve scroll? back affordance?).
8. **Empty/loading** named but not designed: empty “with next action” is good; Skeleton without “no layout shift / no shimmer gradient” invites the generated-dashboard look.

---

### Highest-leverage fixes (if you revise the doc later)

1. **Surface contract:** opaque panel fills as default; blur ≤1 atmospheric layer; no nested glass; measured text/bg pairs including `--text-dim` and `prefers-contrast`.
2. **Token roles:** type scale, spacing, control height, elevation—not only colours.
3. **Accent policy:** accent on data + one primary control; focus ring neutral/high-contrast; active nav by luminance.
4. **IA:** group rail (core vs tools); define More; badge rules; drop or defer half the “build once” list behind phases.
5. **Safe viewers:** Markdown/Diff/CommandPalette sanitization and redaction one-liners in this system doc.
6. **Reconcile Stitch:** commit reference frames or stop pointing at empty paths.

I’m in Ask mode, so this is review only—no edits to the spec or `reviews/cursor/160-…`. Switch to Agent mode if you want the findings written into that review file.
