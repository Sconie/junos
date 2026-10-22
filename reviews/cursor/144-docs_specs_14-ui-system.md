**Verdict:** As an Operate-mode system brief, this doc locks a Stitch “glass + soft dark” look and a long component/nav checklist, but it is too thin to ship from: no type/spacing/motion scales, an icon-only IA that fights discoverability, and several token/a11y claims that the listed values do not back. The glass direction can stand (brief wins over house bans), but Inter + violet + frosted chrome currently reads as a generic kit, not JunOS.

---

### Contradictions

- **Glass vs depth rules.** Direction is frosted panels everywhere; rules also say blur only on panels over the background and never nest more than two deep. `Card` + `Drawer` + glass chrome will nest three surfaces unless the doc forbids glass on cards/drawers.
- **Contrast claim vs tokens.** “Text ≥4.5:1 on the glass” is stated, but `--panel` / `--panel-strong` are 4–7% white over `#0B0C0F` plus `--bg-glow`. Contrast under purple/teal atmosphere is not fixed by the solid fallback alone; `@supports` only covers missing `backdrop-filter`, not glow under text.
- **`prefers-contrast` with no tokens.** Mentioned with no high-contrast palette, border, or blur overrides (and light theme deferred to Phase 5).
- **Keyboard-first vs icon rail.** Slim 64px icons + tooltips conflicts with keyboard-first: tooltips are pointer-centric unless focus-visible labels/titles are specified (they are not).
- **Desktop IA vs mobile IA.** Desktop lists ~12 destinations; &lt;900px keeps five (Home, Chat, Inbox, Kanban, More). Agents, Workflows, Tasks, Hermes, Scout, Files, Connections, Settings are undefined in “More” — different products, not a fold of the same map.
- **“No information by colour alone” vs `StatusDot`.** The rule is right; the component name and primary API still invite colour-only status unless label/icon is mandatory in the contract.
- **Skill house style vs pinned brief.** design-taste / craft-floor ban glass-as-default, background gradients, and violet/indigo “assistant” accents; Jonas pinned Translucent Glass + `#8B5CF6`. That is allowed (brief wins), but the doc never says which Stitch rules override the craft floor — implementers will thrash.

---

### Gaps (cannot implement consistently)

- No **type scale** (roles, sizes, weights, line-height, measure). App screens need ~12/14/16/24, not Inter alone.
- No **spacing / grid gutters / page padding**; “12-column grid” without column/gutter numbers.
- No **elevation / z-index** for rail, top bar, drawers, toasts, palette vs glass stacking.
- No **motion tokens** despite `prefers-reduced-motion` (duration, easing, what may animate: panel open, skeleton, toast).
- No **interactive states**: hover, active, disabled, selected for nav, chips, buttons, table rows.
- No **shell identity**: product mark/name, workspace/scope — app-screen studies flag nameless kits hard.
- No **focus ring** spec beyond “accent” (width, offset, contrast on glass and on accent fills).
- No **icon system** (size, stroke, library) for a 12-item icon rail.
- References `/design/stitch-glass/` and `/design/stitch-softdark/` are cited; those paths are not in the repo as checked — the “match Stitch” plan has no local source of truth yet.
- Open questions stop at light theme / hand-match; silent gaps: density target (ops vs marketing), when `Card` vs bare panel, toast vs banner priority, provider-pill content.

---

### Unrealistic scope

- **Build-once list** packs product surfaces: `DiffView`, `MarkdownView`+code, `KanbanColumn/Card`, `CommandPalette`, `CronPreview`, `DataTable`, `Timeline/StepCard`. That is a design-system program, not a token page.
- **Five required states on every screen** × many destinations multiplies work the rest of the specs still have to define.
- **Icon rail of ten primary destinations** (plus Connections/Settings) is a lot of peer IA for a “slim” shell; app-screen guidance: labelled sidebar unless ≤5 destinations and width is scarce — this doc chooses the exception without justifying width need.

---

### Security / privacy risks (UI-level)

- **Offline banner with “start command”** — can expose install paths, shell invocation, or env-specific ops detail on a shared screen; needs redaction rules.
- **Error “with … detail”** — unbounded detail often dumps provider errors, paths, or prompt fragments into Toast/EmptyState.
- **Provider status pill** — always-visible connection topology; may be sensitive in demos/screenshares; no quiet/minimal mode.
- **Inbox badge + ⌘K** — no rule that palette/search omit secrets, tokens, or message bodies from previews.
- **Avatar** — unspecified (photo vs initials); no privacy note for multi-user or captured screens.
- Glass itself is not a data leak, but **blur is not redaction** — do not treat frosted overlays as hiding sensitive content.

---

### UI / design quality (skills lens)

| Area | Problem |
| --- | --- |
| **Hierarchy** | Top bar is ⌘K + status + avatar with no product/scope anchor. Content hierarchy (page title vs panel title vs meta) undefined — glass will flatten everything to same luminance. |
| **Typography** | `Inter` + system stack is the textbook “kit not product” tell. No display/UI distinction; `--font-mono` OK for code, risky if used for “tech” chrome. |
| **Colour** | Violet accent + dual purple/teal glows put colour on **atmosphere/chrome**, not data. App-screen rule: ~≤5% colour, hue on meaning. Focus ring in `#8B5CF6` on dark glass is easy to miss next to glow. |
| **Density** | 64px icon rail saves width but burns recognition; drawers 360–420px + chat 760px + rail needs a min window width the doc never states. |
| **Spacing** | Only radius `12px` and drawer widths — no section rhythm, so screens will invent 8/12/16/24 inconsistently. |
| **Motion** | Reduced-motion named; purposeful motion (drawer, palette, toast) not. Risk: either static deadness or unscoped blur/fade everywhere. |
| **Legibility** | `--text-dim: #9AA0AC` on near-black may pass WCAG on solid bg and fail on glow/glass; secondary chat meta often set in dim — craft floor wants body in full ink. Borders at 8% white are hairline noise more than structure. |
| **Contrast** | Solid fallback helps unsupported blur; it does not solve **text-on-glass-over-glow**. `prefers-contrast` needs opaque panels, stronger borders, and possibly killing atmosphere. |
| **Composition tells** | Frosted panels + soft dark + Inter + violet is saturated “AI dashboard” costume. To keep the Stitch brief and still pass taste: opaque tone steps for work surfaces, glass only where depth is earned (e.g. floating palette/drawer), accent on data/actions not nav chrome, and a face with character loaded for real. |

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Resolve **glass nesting**: which surfaces are opaque vs frosted; max one frosted layer in the content stack.  
2. Add **type + space + state + z-index** tables; make contrast a verification note (solid panel under text when glow is present).  
3. Replace or augment the **icon rail** with labels (or ≤5 primary + overflow with a real IA map for More).  
4. Bound **error/offline/palette** copy so paths and secrets never render by default.  
5. Treat Inter/violet/glow as **Stitch-matched starting tokens** and explicitly decide what becomes JunOS-specific (face, mark, data hue) so this is not “Soft Dark template.”

I did not run the impeccable detector or browser inspect — this is a doc-only review, not a rendered critique.
