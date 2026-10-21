# JunOS: Google Stitch prompts

How to use: open https://stitch.withgoogle.com, choose **Web** (desktop) mode, and paste prompt 0 first. Then paste each screen prompt into the same project so Stitch keeps the style consistent. Stitch does best with one screen per prompt, so don't merge them. After each screen, small follow-ups like "make the sidebar narrower" work better than re-running the whole prompt.

---

## 0. Style foundation (paste first)

```
Design a desktop web app called "JunOS", a personal AI operating system / command center for one power user.
Visual style: dark mode first, near-black background (#0B0C0F), slightly lighter panels (#14161B), 1px hairline borders, one accent color electric violet (#8B5CF6) with a secondary teal (#2DD4BF) for "running/healthy" states. Typography: Inter for UI, JetBrains Mono for code, logs, cron expressions and model IDs. Rounded corners 10px, generous spacing, no heavy shadows, subtle glass blur on overlays. Feels like a mix of Linear, Raycast and a terminal: dense but calm.
Global layout for every screen: a slim left icon sidebar (64px) with these items top to bottom: Home, Chat, Hermes, Tasks (clock icon), Files, Projects, and at the bottom Connections and Settings. A top bar with a global command palette search ("Ask or jump to… ⌘K"), a small status pill showing connected providers, and the user avatar "J".
Start by designing the Home / Overview dashboard (see next prompt for details).
```

## 1. Home / Overview dashboard

```
JunOS Home dashboard. A greeting "Good evening, Jonas" with today's date. Below it a grid of cards:
1) "Quick ask": a single chat input with a model chip (e.g. "Claude · High effort") to fire a question straight into Chat.
2) "Upcoming runs": the next 5 scheduled tasks with name, cron in monospace, next run time, and a teal/red status dot.
3) "Hermes agent": status (Online / Idle / Working), current task, last 3 actions as a mini activity feed, and an "Open Hermes" button.
4) "Subscriptions": compact rows for Claude, Codex, Cursor, Grok (X), Nous Portal, each with a logo placeholder, a connected/disconnected badge and a small usage bar (e.g. "62% of weekly limit").
5) "Recent projects": 4 project tiles with name, last edited, and repo/branch tag.
6) "Recent files": a short list with file type icon, path and time.
Layout: 12-column grid, quick ask spans full width at the top, remaining cards in a 3 + 3 masonry.
```

## 2. Chat with model + effort picker

```
JunOS Chat screen. Three columns:
Left (260px): conversation list grouped by Today / This week / Older, with a "New chat" button and a search field. Each conversation shows a tiny provider logo.
Center: the chat thread. Assistant messages have a small header showing which model answered (e.g. "Claude Opus · effort: high · via Claude subscription"). Include a code block, a markdown table and a collapsible "thinking" section in the sample messages. User messages right-aligned in a subtle violet tint.
Bottom composer: large multi-line input, attach button, a MODEL PICKER dropdown chip and an EFFORT PICKER segmented control (Low / Medium / High / Max). Show the model picker opened as a popover, grouped by provider subscription: Claude (Opus, Sonnet, Haiku), Codex / OpenAI (GPT models), Cursor, Grok (X), Nous Portal (Hermes models). Each provider group shows "Connected via subscription" in teal or "Not connected" in grey with a Connect link.
Right panel (collapsible, 300px): "Context" with attached files, selected project, and tools the model can use (toggles for Files, Web, Hermes, Tasks).
```

## 3. Scheduled tasks / crons

```
JunOS Scheduled Tasks screen. Header "Tasks" with tabs: All, Running, Paused, Failed, and a primary "New task" button.
Main area: a table of scheduled jobs with columns: status dot, name, schedule (cron in monospace plus human text like "Every weekday at 08:00"), target (which model or Hermes agent runs it), last run (time + success/fail chip), next run, and an actions menu (Run now, Pause, Edit, Logs).
Above the table, a horizontal 24-hour timeline strip showing today's upcoming runs as small markers.
Right side drawer opened for one task "Morning briefing": fields for name, prompt textarea, model + effort picker, schedule builder (preset buttons Hourly / Daily / Weekly / Custom cron with a live preview of the next 5 run times), output destination (Chat thread, File, Notification), and a "Run history" list with expandable log output in monospace.
```

## 4. Hermes agent console

```
JunOS Hermes agent console, a dedicated, more "mission control" interface for a personal autonomous agent named Hermes.
Top: agent header with name "Hermes", status pill (Working, teal pulsing), current model, uptime, and buttons Pause / Stop / Settings.
Left (40%): live chat / instruction stream with the agent, where the user can give directives.
Center/right (60%): a live "Activity" timeline of steps the agent takes: tool calls (shell, browser, file edit, API) shown as compact cards with icon, short description, duration, and expandable input/output in monospace. Currently running step has a progress shimmer.
Bottom strip: tabs for Memory (key facts the agent remembers, editable chips), Skills/Tools (toggle list), Logs (raw terminal-style log), and Queue (pending tasks handed to Hermes from the Tasks screen).
Make it feel slightly more technical and terminal-like than the rest of the app while keeping the same colors.
```

## 5. Files & Projects overview

```
JunOS Files & Projects screen. Left: a tree navigator with sections "Projects", "Local folders", "Cloud" (Google Drive, GitHub repos).
Top of the main area: a row of project cards (name, short description, language/tech tags, git branch, last activity, a small sparkline of activity over 14 days, and quick buttons "Open in Chat" and "Give to Hermes").
Below: a file browser with a toggle between list and grid view. List columns: name with type icon, project, size, modified, and an AI tag column (auto-generated tags like "spec", "invoice", "notes").
Right preview pane: preview of the selected file (markdown rendered) with an "Ask about this file" input at the bottom.
Global search bar at the top supporting natural-language queries like "PDFs from last week about the API".
```

## 6. Connections (subscriptions)

```
JunOS Connections screen for linking existing AI subscriptions instead of paying for API keys.
A grid of provider cards: Claude, OpenAI Codex, Cursor, Grok (X), Nous Portal. Each card: logo placeholder, plan name (e.g. "Claude Max", "ChatGPT Pro", "SuperGrok"), connection method label (e.g. "Signed in via CLI", "OAuth", "Local session"), status badge, usage meter with reset time, list of models it unlocks as small chips, and buttons Reconnect / Disconnect.
Below: a "Routing rules" section where the user sets defaults: default chat model, fallback order (drag-to-reorder list), and per-task overrides.
Include one card in an error state ("Session expired, reconnect") to show that state.
```

## Optional follow-ups

- `Generate a light-mode variant of this screen with the same layout.`
- `Create a mobile (390px) version of the Home dashboard with a bottom tab bar instead of the sidebar.`
- `Make the Hermes console more minimal: hide the bottom tabs behind a single "Inspect" toggle.`
