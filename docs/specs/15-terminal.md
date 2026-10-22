# Terminal

Status: draft v0.1 (2026-10-22). Added at Jonas's request; scope decided the same day.

## What it is
A built-in terminal in JunOS with tabs for two machines: a **local shell on Jonas's PC** and a **shell on the VPS** (including into the Hermes container). Jonas types freely, like any terminal. It sits next to the Hermes console and the run logs, and agent or Hermes commands appear in it too.

## Behaviour
- Local tabs are PTY sessions owned by junosd; VPS tabs go through the shim over Tailscale (see 06). Browser side: xterm.js over the same authenticated SSE/WebSocket channel rules as 01.
- **Jonas's own typing is not gated.** He is the human in charge; keystrokes are not run through the approval gateway.
- **Agent-initiated commands are gated.** Anything run by a CLI model, workflow or Hermes goes through the junosd execution gateway (12): digest-bound, single-use approval for external-send, destructive and spend actions, and every command is logged to `event` with actor and result. They are shown in a separate, clearly labelled "agent" tab so they are never mixed with Jonas's input.
- Agents cannot write to Jonas's interactive tabs.
- Session output is stored truncated for audit; secrets patterns are redacted from stored output.
- The VPS shell can also run Hermes's CLI directly (the terminal Jonas already uses on the VPS), so the Hermes console and the VPS tab share one path. The VPS shell needs the shim's bridge token; tabs close when the token is revoked or Stop is pressed.

## Security notes
- The terminal endpoint accepts only the authenticated, origin-checked browser session from 12; a web page or other local process cannot attach to a PTY.
- An idle timeout closes VPS tabs after a configurable period.

## Open questions
- Windows shell default (PowerShell vs WSL) for the local tab.
- Whether to keep scrollback between daemon restarts.
