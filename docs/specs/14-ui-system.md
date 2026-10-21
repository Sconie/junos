# UI system

Direction (chosen by Jonas): **Translucent Glass** from the Stitch project "JunOS Soft Dark": atmospheric dark background, frosted panels. Reference images: `/design/stitch-glass/` and `/design/stitch-softdark/`.

## Tokens (starting values; match to Stitch export when available)
```css
:root {
  --bg: #0B0C0F;                 /* under the atmosphere */
  --bg-glow: radial-gradient(60% 50% at 20% 0%, #8B5CF633, transparent),
             radial-gradient(50% 40% at 90% 100%, #2DD4BF22, transparent);
  --panel: rgba(255,255,255,0.04);
  --panel-strong: rgba(255,255,255,0.07);
  --border: rgba(255,255,255,0.08);
  --blur: 18px;                  /* backdrop-filter */
  --accent: #8B5CF6;  --ok: #2DD4BF;  --warn: #F5B544;  --bad: #F87171;
  --text: #E7E8EC;  --text-dim: #9AA0AC;
  --radius: 12px;
  --font-ui: Inter, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```
Rules: blur only on panels over the background, never nested more than two deep (performance); give a solid-colour fallback via `@supports not (backdrop-filter: blur(1px))`; respect `prefers-reduced-motion` and `prefers-contrast`; text contrast at least 4.5:1 on the glass.

## Layout
Slim left rail (64 px, icons with tooltips) in this order: Home, Inbox (badge), Chat, Agents, Workflows, Tasks, Kanban, Hermes, Scout, Files, then Connections and Settings at the bottom. Top bar: ⌘K field, provider status pill, avatar. Content uses a 12-column grid, side drawers 360-420 px, max readable line length for chat 760 px.

## Components to build once
StatusDot, Chip, Badge, SegmentedControl (effort), ModelPicker, Card, DataTable, Drawer, Timeline/StepCard, MarkdownView with code blocks, DiffView, CronPreview, KanbanColumn/Card, EmptyState, Skeleton, Toast, CommandPalette.

## States every screen needs
Loading (skeleton), empty (with the next action), error (with retry and detail), offline daemon (global banner "junosd not running" with start command), disconnected provider.

## Accessibility and input
Keyboard-first (list in each spec), visible focus ring in accent, ARIA roles for tabs/dialogs/lists, no information by colour alone (status dots also carry text or icon).

## Responsive
Desktop first. Below 900 px the rail becomes a bottom tab bar (Home, Chat, Inbox, Kanban, More) and side panels become full-screen sheets.

## Open questions
- Light theme: later (Phase 5).
- Export tokens from Stitch design to code, or hand-match? Hand-match first.
