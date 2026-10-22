# UI system

Direction (chosen by Jonas): **Translucent Glass** from the Stitch project "JunOS Soft Dark": atmospheric dark background, frosted panels. Reference images: `/design/stitch-glass/` and `/design/stitch-softdark/`.

## Tokens (rev 2: colour kept out of the background)
The glass look stays: frosted panels over an atmospheric dark background. The background is **neutral** (deep blue-grey/graphite gradient, subtle noise or light bloom, no violet or teal tint). Colour is reserved for meaning: accent only for selection, focus and primary actions; teal/amber/red only for status. Violet is no longer a decorative or ambient colour; the accent hue is **soft green** (decided by Jonas, 2026-10-22; violet is dropped). Because `--ok` is teal, status and accent must not be confused: keep `--ok` visibly teal-leaning and never use the accent alone to signal success; status dots also carry an icon or text.
```css
:root {
  --bg: #0A0B0E;
  --bg-atmos: radial-gradient(60% 50% at 20% 0%, #FFFFFF10, transparent),
              radial-gradient(50% 40% at 90% 100%, #9AA7B814, transparent);   /* neutral light bloom */
  --panel: rgba(255,255,255,0.05);
  --panel-strong: rgba(255,255,255,0.08);
  --border: rgba(255,255,255,0.10);
  --blur: 18px;
  --accent: #7FD6A4;            /* soft green (Jonas, 2026-10-22): selection, focus ring, primary buttons only */
  --accent-fg: #0B0C0F;         /* text on accent fills; verified >= 4.5:1 */
  --ok: #2DD4BF;  --warn: #F5B544;  --bad: #F87171;   /* status only */
  --text: #E7E8EC;  --text-dim: #A3A9B5;               /* dim text verified >= 4.5:1 on panel */
  --radius: 12px;
  --font-ui: Inter, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```
Rules: blur only on panels over the background, never nested more than two deep; solid-colour fallback via `@supports not (backdrop-filter: blur(1px))`; `prefers-reduced-motion` and `prefers-contrast: more` (opaque panels, stronger borders) respected. Every accent/foreground and status/background pair used for text must be checked at build time (a small contrast test over the token pairs); accent-on-glass text is not allowed, use `--text` with an accent border or fill with `--accent-fg`.

## Shared components that carry safety
- **ApprovalCard** (one component, used in Inbox, Hermes console, chat and Telegram previews): actor, exact action or diff (monospace, expandable), target and project, expiry countdown, irreversible-action warning, Approve/Deny. It re-reads approval status before enabling Approve and shows resolved/stale states. Shortcuts only work when the card is focused in a detail view.
- **StopControl**: always visible in the top bar whenever any run or agent is active (not hidden in a page). States: idle (hidden), running, cancelling, stopped, `stop not confirmed`. See 12 for semantics.
- **SafeMarkdown**: the only way markdown or agent/web text is rendered: no raw HTML, sanitized links, remote images blocked until clicked, code as text. Previews of files use a sandboxed iframe.
- **ProviderDisclosure**: one-line notice when context goes to a new provider (04).

## Layout
Slim left rail (64 px, icons with tooltips), primary group: Home, Inbox (badge), Chat, Tasks, Kanban, Hermes; secondary group (grouped under a divider or a "More" popover): Workflows, Scout, Files; bottom: Connections, Settings. Agent chats live inside Chat as a filter. Top bar: ⌘K field, provider status pill, **StopControl** (visible while anything runs), avatar. Content uses a 12-column grid, side drawers 360-420 px, max readable line length for chat 760 px.

## Components to build once
ApprovalCard, StopControl, SafeMarkdown, StatusDot, Chip, Badge, SegmentedControl (effort), ModelPicker, Card, DataTable, Drawer, Timeline/StepCard, DiffView, CronPreview, KanbanColumn/Card, EmptyState, Skeleton, Toast, CommandPalette.

## States every screen needs
Loading (skeleton), empty (with the next action), error (with retry and detail), offline daemon (global banner "junosd not running" with start command), disconnected provider.

## Accessibility and input
Keyboard-first (list in each spec), visible focus ring in accent, ARIA roles for tabs/dialogs/lists, no information by colour alone (status dots also carry text or icon).

## Responsive
Desktop first. Below 900 px the rail becomes a bottom tab bar (Home, Chat, Inbox, Kanban, More) and side panels become full-screen sheets.

## Open questions
- Light theme: later (Phase 5).
- Export tokens from Stitch design to code, or hand-match? Hand-match first.
