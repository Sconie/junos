**Verdict:** The doc is a useful safety/IA skeleton (ApprovalCard, StopControl, SafeMarkdown), but as a UI system it is under-specified for craft and fights both skills’ app-screen house style—while still leaving real contrast, motion, density, and iframe/markdown security holes.

Review scope: `docs/specs/14-ui-system.md` only, through impeccable (Operate mode + craft floor) and design-taste-frontend (`app-screens.md`). No live UI, no inspector run. Jonas pinned **Translucent Glass**; impeccable says the brief wins, so glass is treated as committed direction and judged for quality/cost inside that choice.

---

### Brief vs skill collision (not a “wrong brief,” a hard tradeoff)

| Spec choice | Skill stance |
|---|---|
| Translucent Glass / `backdrop-filter` | design-taste app house rule: **no glass / blur**; replace with opaque tone steps. Impeccable craft floor: glass/blur only as a *specific* effect, not chrome default. |
| Atmospheric radial blooms + noise | design-taste: **no gradients** as backgrounds |
| Soft dark + Inter | App-screen tell: “Geist/Inter kit,” neon/glass on dark |
| Soft green accent + separate teal `--ok` | App dark rule: if accent is green-family, **positive is the accent** (or success stays neutral ink)—two greens still read as one family |

So the direction is coherent with the Stitch choice, but it is the opposite of what these skills reward for **Operate** surfaces. Implementers will need an explicit “brief overrides house style” note, or the skills will keep failing the look in review.

---

### Contradictions / internal tension

1. **“Colour reserved for meaning” vs glass chrome** — Frosted panels, blooms, and blur are decorative atmosphere. That fights the “colour only for meaning” line and the app-screen rule “colour on data, not chrome.”
2. **StopControl wording** — “Always visible in the top bar” vs state `idle (hidden)`. Intent is clear (show when something runs); the prose overclaims.
3. **Accent vs `--ok`** — Doc admits confusion risk, then keeps both in the cyan–mint band (`#7FD6A4` vs `#2DD4BF`). Icons/text help, but hue separation is weak; colour-blind and peripheral glance still fail easily.
4. **“Verified ≥ 4.5:1” on glass** — Claims are for solid pairs (`--accent-fg` on `--accent`, `--text-dim` on panel). Frosted panels over variable blooms change effective background; a static token-pair test does **not** prove legibility on real glass stacks. That’s an internal methodology contradiction.
5. **Reference authority** — Spec points at `/design/stitch-glass/` and `/design/stitch-softdark/` as if they are the visual source of truth, with no fallback if those assets are missing or diverge from the hand-matched tokens.

---

### Gaps (what a UI system must say and this doesn’t)

**Typography & hierarchy**
- Only `--font-ui` / `--font-mono`. No type scale, weights, line-heights, tabular nums, or page-title vs meta sizes.
- App-screens expect ~12/14/16/24-ish Operate scales; Inter is called out as the generic kit face—no product-specific type decision beyond “system UI.”

**Spacing, density, elevation**
- No spacing scale, row pitches, control heights, or density modes.
- `Card` + glass panels invite nested chrome (craft floor: nested cards are always wrong).
- Chip / Badge / StatusDot overlap with no “one status mark per row” rule.

**Motion**
- Mentions `prefers-reduced-motion` but defines no motion language. For Operate, skills want feedback only (press/hover/focus/sheet)—still need durations, what animates, and what never does (approval enablement, stop confirm).

**Focus / selection / states**
- “Focus ring in accent” only. Missing: selected row vs focus vs hover (inbox pattern), disabled Approve, `stop not confirmed` visual treatment, toast live regions, skeleton vs empty copy rules beyond one line.

**Responsive IA**
- Desktop primary includes Tasks + Hermes; mobile bottom bar is Home / Chat / Inbox / Kanban / More. **Tasks and Hermes drop out of primary mobile** with no rule for where StopControl, approvals, or active runs live on phone sheets.

**Component contract**
- Long “build once” list with almost no API, content, or do-not-do rules except the four safety components. DiffView, Kanban, CronPreview, ModelPicker are names, not systems.

**Light theme**
- Deferred to Phase 5 with zero token strategy (glass on light is a different problem).

---

### Unrealistic scope

One short doc claims to be the implementation authority for:
- a full glass visual language,
- full app shell + 12-col grid + drawers + command palette,
- ~20 shared components,
- a11y/keyboard “in each spec,”
- contrast CI,
- reduced-motion + forced-colors-ish (`prefers-contrast: more`),
- and cross-surface safety (Inbox, Hermes, chat, Telegram).

That is several phases of design-system work packed into a token block and a shopping list. Without prioritization (e.g. shell + ApprovalCard + SafeMarkdown + StopControl first), implementers will invent inconsistent Cards/Badges/Drawers and call it “14.”

---

### Security / privacy risks (in this doc’s own surface)

**Strong**
- Shared ApprovalCard with re-read-before-approve, focused shortcuts, stale/resolved states.
- SafeMarkdown as sole renderer; no raw HTML; remote images gated.
- ProviderDisclosure when context hits a new provider.

**Under-specified / risky**
- **Sandboxed iframe** for file previews: no `sandbox` flags, CSP, `srcdoc` vs URL, whether scripts/forms/popups are allowed. Default “sandboxed” is not a policy.
- **Sanitized links**: no allowlist (block `javascript:`, `data:`, dangerous schemes), no `rel` on external targets, no phishing/copy rules for lookalike URLs.
- **“Code as text”** vs DiffView / expandable monospace action: unclear whether agent HTML/SVG in diffs can ever hit a rich renderer.
- **Click-to-load remote images**: still egresses IP/Referer on click; no proxy, no strip-referrer, no offline policy.
- **Telegram / chat previews** of ApprovalCard: untrusted content adjacent to Approve—needs explicit isolation (no nested interactive markdown inside the approve hit target).
- **Avatar / provider pill / ⌘K**: no guidance on what metadata is shown or logged in UI.
- **ProviderDisclosure “one-line”**: may be too thin for “context left the machine” moments if the rest of the product treats privacy as a principle.

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility, contrast)

**Hierarchy**
- Icon-only 64px rail + tooltips: app-screens warn that icon rails fail when labels are needed; secondary dump under “More” hides Workflows/Scout/Files; Hermes as both primary nav and “agent chats are a Chat filter” splits the mental model.
- No product mark / name in the shell tokens—skills flag “kit without a face.”

**Spacing & density**
- Glass + 12px radius + translucent borders tends toward soft, low-density dashboards unless row pitches and control heights are fixed. Spec never sets Operate density (tables, inbox rows, kanban cards).

**Typography**
- Inter + system stack = default AI/product kit. No display vs UI distinction (fine for Operate), but also no hierarchy tokens—screens will invent sizes.
- Chat max width 760px is good for measure; everything else unsaid.

**Motion**
- Blur/glass is itself a motion/perf cost (nested blur capped at two—good). No guidance on scrolling lists over blurred backgrounds (jank), or disabling blur under `prefers-reduced-transparency` (only contrast/motion named).

**Legibility & contrast**
- `--text` / `--text-dim` on near-black solid is plausible; **on `rgba(255,255,255,0.05)` glass over blooms, dim text will flicker around the WCAG line**.
- Status hues as fills/text on glass untested in the doc.
- Accent focus ring on low-contrast glass borders can be the only “colour chrome,” which is good, but selection fills in soft green next to teal OK dots will muddy status reading.
- `@supports` solid fallback and `prefers-contrast: more` → opaque panels: correct instincts, but no specified opaque palette (what are the non-glass `--panel` values?).

**Composition tells (skills)**
- Glass + dark + soft green + Inter + badges/chips/cards is very close to the generated “soft dark SaaS” average the skills exist to reject—unless JunOS-specific structure (approval exactness, stop semantics, provider honesty) dominates every primary screen.

---

### What already works (keep)

- Safety components named and shared across surfaces.
- Accent scoped to selection/focus/primary; status separated in intent.
- Blur nesting limit, solid fallback, forced-contrast path.
- Keyboard-first + no colour-only status.
- Desktop → bottom bar + full-screen sheets is a sane Operate phone pattern *if* destination mapping is fixed.
- Hand-match tokens first (pragmatic vs blocked on Stitch export).

---

### Highest-leverage doc fixes (guidance only; Ask mode)

1. Declare brief override: glass is intentional; list which skill bans are waived and which still apply (no violet ambient, flat type hierarchy, colour on data, one status mark).
2. Add type scale, spacing scale, control heights, opaque contrast fallbacks, and a “contrast on composited glass” test method—not only token pairs.
3. Resolve accent/`--ok` (merge success into accent **or** move `--ok` out of mint/teal entirely).
4. Specify SafeMarkdown/iframe policy in threat-model bullets (schemes, sandbox flags, referrer, approve-hit isolation).
5. Fix mobile IA for Tasks/Hermes/Stop and cut the component list into must-ship vs later.
6. Replace or justify Inter; add one JunOS-specific shell signal (mark, empty-state language, approval layout)—so it isn’t “any dark glass admin.”

I could not re-verify commit `2e87f7e` from the shell in this session; the file on disk matches the “rev 2 / soft green 2026-10-22” content you described. If you want this turned into concrete spec edits, switch to Agent mode.
