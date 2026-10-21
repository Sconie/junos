# Connections and routing (subscriptions instead of API keys)

## Goal
Use Claude, Codex, Cursor, Grok/X and Nous Portal through the plans Jonas already pays for, with no per-token API billing.

## The approach: drive official clients, never extract tokens
JunOS does not copy OAuth tokens out of other tools or reverse-engineer private endpoints. That is fragile and may breach provider terms and get accounts banned. Instead the daemon launches each provider's **official client in non-interactive mode** as a subprocess, using the sign-in the user already completed in that client.

| Provider | How it is reached | Auth owner | Confidence |
|---|---|---|---|
| Claude | Claude Code CLI in print/streaming JSON mode, or the Claude Agent SDK pointed at the logged-in CLI | `claude login` | high |
| Codex (ChatGPT) | Codex CLI non-interactive exec mode | `codex login` | high |
| Cursor | Cursor's agent CLI in headless mode | Cursor sign-in | medium, verify |
| Grok (X) | no confirmed official subscription CLI; options: official API if one is bundled, or a browser-session adapter | X login | **low, research spike** |
| Nous Portal | Nous Portal has its own account and an OpenAI-compatible endpoint; Hermes models can also run locally | Portal login or key | medium, verify |

Each adapter is a "capability probe + runner": `which <cli>`, `status` command, version check, then streaming run.

Verify each row against current vendor docs in the Phase 1 spike before building (CLIs change flags often).

## Connection states
`connected` · `needs_login` (session expired, show Reconnect with the exact CLI command to run) · `rate_limited` (with reset time) · `unavailable` (CLI missing) · `degraded`.

The Connections screen shows plan name, method label ("Signed in via CLI"), usage meter and reset time (only where the provider exposes it; otherwise show local run counts and last 429), models unlocked, Reconnect/Disconnect. Disconnect removes only JunOS's reference, never the CLI's login.

## Effort mapping
One UI scale: Low / Medium / High / Max. Per provider, mapped to what exists:
- Claude: thinking/effort level flags where supported, else prompt-budget tiers.
- Codex: reasoning effort setting.
- Others: nearest equivalent; if none, the picker disables the control and shows "n/a for this model".
The model list from `models()` declares which efforts each model supports, so the UI never offers an invalid combo.

## Routing rules
- Default chat model.
- Fallback order (drag to reorder): if the first provider is `rate_limited` or `needs_login`, try the next, and tell the user in the message header ("answered by Sonnet via Claude, fell back from Codex").
- Per-task and per-workflow overrides.
- "Cost guard": subscriptions have usage caps, so workflows can set `maxRunsPerDay` and `preferCheapModel`.

## Usage budget
Because limits are shared with Jonas's own manual use of those tools, the scheduler must treat subscription capacity as a budget: background jobs yield when the weekly meter is above a configurable threshold (default 80%), and the Inbox gets a notice instead of silently burning the cap.

## Open questions
- Grok/X path (see spike). If none is legitimate, ship without it and keep the card as "coming".
- Concurrency limits per provider (probably 1-2 parallel runs).
