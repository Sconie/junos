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
| Grok (X) | no supported route known. **Browser-session scraping is out of scope** (fragile, likely against terms). Card stays "not available" until an official client or API route exists | X login | **not available** |
| Nous Portal | the Portal's official sign-in if it offers a supported client flow; otherwise Hermes models run locally. **No API-key storage in JunOS** (it would contradict the goal) | Portal login | low-medium, verify |

Each adapter is a "capability probe + runner": `which <cli>`, `status` command, version check, then streaming run.

**Scope of the promise**: JunOS gives access to models exposed by *verified, supported adapters*. Claude and Codex are the initial validation targets; Cursor and Nous are research candidates; Grok/X is not available. "No API keys" is a release gate for each adapter, not a claim that every listed provider qualifies.

Verify each row against current vendor docs in the Phase 1 spike before building (CLIs change flags often).

## Connection states (single enum used everywhere: UI, Home, router, Hermes pill)
`connected` · `needs_login` (show Reconnect with the exact CLI command) · `rate_limited` (with reset time if known) · `unavailable` (CLI missing or provider unverified) · `degraded` · `unknown` (not yet probed). Hermes's own states (online/idle/working/paused/error/unreachable) are agent states, a separate enum.

The Connections screen shows plan name, method label ("Signed in via CLI"), usage meter and reset time (only where the provider exposes it; otherwise show local run counts and last 429), models unlocked, Reconnect/Disconnect. Disconnect removes only JunOS's reference, never the CLI's login.

## Effort mapping
One UI scale: Low / Medium / High / Max. Per provider, mapped to what exists:
- Claude: thinking/effort level flags where supported, else prompt-budget tiers.
- Codex: reasoning effort setting.
- Others: nearest equivalent; if none, the picker disables the control and shows "n/a for this model".
The model list from `models()` declares which efforts each model supports, so the UI never offers an invalid combo.

## Routing rules
- Default chat model.
- Fallback order (drag to reorder) is limited to the **allowed providers** for that conversation/workflow (12). Automatic fallback never leaves that list. If no allowed provider is available the run fails with a message and a "Send once to <other provider>" button, which re-submits that single request after an explicit confirmation and does not change the list. Fallback inside the list is shown in the message header. Fallback happens only before a run starts or when a run failed before any tool side effect; never re-run a request that already performed an action.
- Per-task and per-workflow overrides.
- "Cost guard": subscriptions have usage caps, so workflows can set `maxRunsPerDay` and `preferCheapModel`.

## Usage budget
Because limits are shared with Jonas's own manual use of those tools, the scheduler must treat subscription capacity as a budget: background jobs yield when the weekly meter is above a configurable threshold (default 80%), and the Inbox gets a notice instead of silently burning the cap. When a provider exposes no meter, use local counters (runs per day/week) with user-set caps, and treat the last rate-limit response as authoritative until its reset time.

## Open questions
- Decided (Jonas, 2026-10-22): v1 ships without Grok/X; its card stays as "coming" while the spike continues.
- Concurrency limits per provider (probably 1-2 parallel runs).
