**Verdict:** As an Operate-mode shell for a dense agent product, this doc locks in a look the skills treat as anti-patterns (glass, ground gradients, violet chrome, Inter), under-specifies the craft floor (type, space, density, elevation), and asks for a full component library before the tokens can even keep contrast honest.

---

### Contradictions

1. **Glass vs guaranteed contrast.** You require ≥4.5:1 “on the glass,” but `--panel` / `--panel-strong` are 4–7% white over `--bg-glow` radial washes and whatever sits behind the blur. Effective background is scene-dependent; WCAG on glass cannot be a static token promise. Same tension with `prefers-contrast`: high contrast wants opaque surfaces; the chosen direction is translucency.

2. **Blur nesting vs the component list.** “Never nested more than two deep” fights Drawer over Card over KanbanColumn/Card, Toast over everything, CommandPalette over the shell. Building that inventory as glass makes the rule aspirational.

3. **Solid `@supports` fallback vs panel alpha.** Without blur, `rgba(255,255,255,0.04)` on `#0B0C0F` is a near-invisible surface. Fallback needs opaque `--surface` / `--raised` steps; the doc does not define them.

4. **Status color tokens vs “not by colour alone.”** `--ok` / `--warn` / `--bad` are given as raw hues with no text/pill pairs. Teal `#2DD4BF` and amber `#F5B544` as small text on dark often miss 4.5:1; StatusDot + Chip/Badge will be used as colour chrome unless ink/bg pairs are specified (app-screens: pale tint + dark ink of the same hue).

5. **Accent as focus chrome vs accent-on-data.** App-screen house rules put hue on data and at most one control; active nav is brightness or a neutral pill. The doc puts “visible focus ring in accent” (`#8B5CF6`) and a “provider status pill” in the chrome—violet as UI costume, which both skills flag as assistant/kit look.

6. **Pinned brief vs skill bans.** Jonas chose Translucent Glass; impeccable says the brief wins. design-taste app-screens explicitly ban glows, glass, and backdrop blur, and ban gradients on grounds. The doc is coherent as a Stitch hand-off and incoherent as a craft system under that skill—pick which document owns truth.

---

### Gaps (craft / Operate)

| Missing | Why it matters |
| --- | --- |
| Type scale (sizes, weight, leading, measure) | Only Inter + mono; no hierarchy for titles, body, meta, code |
| Spacing / density scales | Home vs Inbox vs Kanban need different row pitch; none defined |
| Elevation / z-index | Drawers, palette, toasts, sheets will collide without a stack |
| Interaction states | Hover / pressed / disabled / selected for rail, chips, cards |
| Motion budget | `prefers-reduced-motion` named; no what moves, duration, or that motion is feedback-only |
| Shell identity | No product mark/name placement; icon rail alone reads as generic kit |
| When to use Card | Card is in the “build once” list; app craft prefers tone step / 1px rule, not boxing everything |
| Loading recipe | Skeleton named; no “flat bars at real size, no shimmer, no layout shift” |
| ⌘K only | No Ctrl+K / non-Mac affordance |
| Mobile IA for “More” | 12 desktop destinations → 4 tabs + More with no mapping |

States (“loading / empty / error / offline / disconnected”) are named well for Operate, but without patterns (in-block error vs global banner, empty keeps frame, zero vs missing) screens will invent five incompatible dialects.

---

### Unrealistic scope

“Components to build once” is roughly a product UI kit (DiffView, MarkdownView, Kanban, CommandPalette, CronPreview, DataTable, …), not a UI *system* foundation. Realistic order under both skills: tokens + shell (rail, top bar, focus, surfaces) → shared states → then feature components as specs need them. Shipping glass + blur on that whole set before opaque surface tokens and contrast pairs is a performance and a11y trap, not a starting kit.

---

### Security / privacy

- **Frosted panels over chat/diffs/files:** translucency can leak shape/colour of content underneath (and through stacked sheets). Opaque drawers/sheets for sensitive surfaces should be required, not optional.
- **“Offline daemon… with start command”:** global UI that surfaces runnable commands invites copy-paste of privileged local actions; keep copy non-executable and path/secret-free.
- **Error “with … detail” / toasts:** easy to dump stack traces, paths, provider payloads into the chrome.
- **MarkdownView / DiffView:** no trust boundary (sanitize untrusted agent/markdown HTML). A UI system doc should say rendered content is untrusted unless proven otherwise.
- **Provider status pill + avatar:** screenshot/share leakage of connected providers and identity; no guidance on what is safe to show.

---

### UI / design quality (skills lens)

**Hierarchy & density.** Icon-only 64px rail with ~12 destinations maximizes chrome and cognitive load for an Operate tool; labels (or fewer primary destinations) scan better. No density modes for sparse Home vs dense Inbox/Kanban. 12-column grid + 360–420 drawers + 760 chat measure is fine arithmetically but unused without column/gap tokens.

**Typography.** Inter + JetBrains Mono is the default AI/devtools stack; app-screens call stock Inter a “kit, not a product.” No display/body steps, no tabular nums rule for counts/badges, no mono scope (IDs/code only).

**Colour & atmosphere.** Dark ground + violet/teal radial glows + glass is exactly the generated-dashboard tell (“neon on dark, glowing borders, glass”). Studied dark apps: flat `#000`/`#111`, surfaces by lightness step or 1px line, ≤~3% colour, hue on data. `--bg-glow` fights that. Light theme deferred to Phase 5 leaves the system single-theme with no token roles that survive a light pass.

**Spacing & surfaces.** `--radius: 12px` sits in the weak middle (study: tight 4–8 or soft 16–24). Border + blur + alpha panels stack separation methods; craft wants one: tone step *or* 1px line, shadow only on floaters.

**Motion.** Naming `prefers-reduced-motion` without a feedback-only motion list invites decorative panel fades on glass—noise on an Operate surface.

**Legibility.** Dim text `#9AA0AC` may pass on solid `#0B0C0F` and fail on glowing/blurred panels. Icon+tooltip-only nav fails first-run discoverability and hurts keyboard users who need names, not only focus rings.

**Responsive.** Bottom bar pattern matches app-screens phone rules; collapsing 12 → 5 without a named IA map will bury Hermes/Scout/Files/Agents and break “one click to the main job.”

---

### What the doc does well

Pinned Stitch direction and reference paths; solid/fallback/`prefers-*` awareness; keyboard-first + no colour-only status; global offline/disconnected states; desktop-first with a concrete fold. Those are Operate instincts—the gaps are mostly unfinished system depth and a direction that fights the anti-slop / app-screen craft floor.

---

**Highest-leverage fix if this stays the system of record:** resolve glass vs opaque (either commit to glass and replace the 4.5:1 slogan with tested opaque text wells + sensitive-surface exceptions, or keep Stitch as moodboard and specify flat dark surfaces the skills accept), then add type/space/density/elevation before the component laundry list.

Does Translucent Glass remain a hard pin for code, or is Stitch reference-only while tokens move to opaque dark surfaces?
