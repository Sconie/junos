# Adapter spikes (ticket #6)

Dated 2026-10-22. Machine: Jonas's Windows PC. Versions probed: Claude Code 2.1.306, Codex CLI 0.163.0, Cursor Agent 2026.10.19-6bbf2c4.

## How these were done, and what that means
Every CLI was probed **offline**: `--version` and `--help`, plus vendor documentation. **No prompt was sent to any provider**, so nothing was spent and nothing left the machine. The consequence is explicit below: flags and billing rules are **verified**; the exact shape of each CLI's streaming output and the real model lists are **not yet verified** and must be captured once from a live run (recorded as fixtures) before the adapters in #9 and #10 are called done. Jonas approves that one live call per provider; it counts against his plan like any chat.

## Verdicts

| Provider | Route works without API keys? | Verdict | Verified | Still to verify |
|---|---|---|---|---|
| Claude | Yes, `claude -p` on the logged-in plan | **Build** (#9) | flags, billing rule | stream-json event shapes |
| Codex | Yes, `codex exec` reuses the ChatGPT login | **Build** (#10) | flags, auth reuse | JSONL event shapes, usage-limit signal |
| Cursor | Yes, `cursor-agent -p` on the Cursor login | **Build, second** (#10) | flags | event shapes, `models` output, plan limits |
| Nous Portal | Not as a standalone chat route | **No JunOS adapter in v1; reached through Hermes** | official docs only | whether Portal ever ships a supported client |
| Grok / X | No supported route | **Not in v1** (unchanged) | n/a | n/a |

## Claude (verdict: yes)
- Run: `claude -p "<prompt>" --output-format stream-json --include-partial-messages` (token-level deltas). Input can also be `--input-format stream-json` for multi-turn over one process.
- Model and effort: `--model <name>` and `--effort low|medium|high|xhigh|max`. The picker maps one to one.
- Sessions: `--session-id <uuid>` to pin an id, `--resume <id>` / `--continue`, `--no-session-persistence` for throwaway runs (use for Scout and summaries).
- Constraints for the gateway (spec 12): `--permission-mode` (`plan`, `dontAsk`, `acceptEdits`, `manual`, `auto`, `bypassPermissions`), `--tools`, `--allowedTools`, `--disallowedTools`, `--add-dir`, `--mcp-config` with `--strict-mcp-config`. The default is `plan` or `dontAsk` plus an explicit tool list; **never** `bypassPermissions` or `--dangerously-skip-permissions`.
- **Do not use `--bare`.** Its help text says Anthropic auth is then strictly `ANTHROPIC_API_KEY` or an `apiKeyHelper`, and it skips keychain reads, so it would silently break "subscription, not API keys".
- **Billing (official help article, read 2026-10-22):** `claude -p`, the Agent SDK and third-party apps signed in with a plan still draw from the **plan's usage limits**. A June 2026 plan to move them to a separate credit was paused; since 2026-10-07 Max and Team plans also get monthly API credits, but those apply to API-key use from a linked Console org, not to plan sign-in. This has changed twice this year, so Scout should watch that article (add it to the Scout source list in 08) and the adapter reports plan-limit errors as `rate_limited`, not as a failure.
- Terms risk: JunOS only launches the official binary and never reads, copies or stores Claude tokens. Anything that extracts OAuth tokens is out of scope.
- Not verified: exact stream-json event names, and whether `--verbose` is needed with stream-json. Capture one run as a fixture.

## Codex (verdict: yes)
- Run: `codex exec --json -C <dir> -s read-only "<prompt>"` (JSONL events on stdout). `-o <file>` writes the final message; `--output-schema <file>` forces a JSON shape; `--ephemeral` avoids writing session files; `resume` and `fork` subcommands continue a thread.
- Model and effort: `-m <model>` and `-c model_reasoning_effort="<level>"` (the `-c key=value` override is in `--help`; the key name comes from the docs, confirm on the live run).
- Auth: `codex exec` reuses the saved CLI login (`~/.codex/auth.json`, or `CODEX_HOME`). OpenAI's docs treat that file like a password; JunOS never opens it. The docs push API keys for CI, which JunOS does not use.
- Constraints: `-s read-only | workspace-write | danger-full-access`. JunOS default is `read-only`; `workspace-write` only for an approved action inside a worktree. **Never** `--dangerously-bypass-approvals-and-sandbox`. `--ignore-user-config` and `--ignore-rules` make runs reproducible, but check they do not drop auth (auth still uses `CODEX_HOME` per the help).
- Prompt on **stdin** (`-`), not as an argument: on Windows a quoted prompt passed through a shell shim gets mangled, and `codex` is an npm `.ps1`/`.cmd` shim, so launch it through `cmd.exe /d /s /c`.
- Usage limits are real and runs stop partway with a "usage limit" message (seen on this PC today). Map that to `rate_limited` with the reset time, and never retry in a loop. Runs share one budget, so the scheduler runs one Codex job at a time.
- Not verified: JSONL event names, the exact limit message format.

## Cursor (verdict: yes, with caveats)
- Binary: `cursor-agent` (a PowerShell shim at `%LOCALAPPDATA%\cursor-agent`). It is **not found from Git Bash**, so the adapter resolves it with PATH and PATHEXT on Windows rather than trusting the name.
- Run: `cursor-agent -p "<prompt>" --output-format stream-json --stream-partial-output --model <id> --workspace <dir> --trust`.
- Model and effort: models accept bracket parameters, for example `claude-opus-4-8[context=1m,effort=high,fast=false]`, so effort is part of the model string. `cursor-agent models` lists models for the account (not run here, it contacts Cursor's servers).
- Status: `cursor-agent status` / `whoami`. Login is `cursor-agent login` by the user, never by JunOS.
- Constraints: `--mode ask` (read-only Q&A) and `--mode plan` (read-only planning), `--sandbox enabled|disabled`, `-w/--worktree`. **Never** `--force` / `--yolo`. `--approve-mcps` stays off.
- Not verified: whether the plan limit is shared with the Cursor app, and event shapes and plan-limit errors.

## Nous Portal (verdict: no standalone adapter; via Hermes)
- The only official sign-in found is Hermes's own: `hermes setup --portal` or `hermes portal` does the Portal OAuth in a browser and stores a refresh token in `~/.hermes/auth.json` on the machine running Hermes. It is a Hermes feature, not a client JunOS can drive.
- JunOS must not read that token (no extracted tokens, spec 03). So Nous models are used **through Hermes**: Jonas's Hermes runs in Docker on the VPS, and the Hermes bridge (#14, #15) reaches it over Tailscale. The Connections card shows Nous as "via Hermes" with Hermes's status.
- A remote-host OAuth needs the browser callback on the same machine or port forwarding; that is Jonas's one-time setup on the VPS, not something JunOS does.
- Evidence quality: the pages found were mostly third-party mirrors of the Hermes docs. The official page is https://hermes-agent.nousresearch.com/docs/guides/run-hermes-with-nous-portal; check it against the running Hermes version before #15.

## Sandbox choice for CLI-backed agents (decided)
Answers the open question in spec 12. **v1: strictest native mode, a JunOS-owned working directory, a scrubbed environment, and the gateway for anything with side effects. No new infrastructure.**

1. **Working directory:** each conversation or run gets a scratch directory, or a git worktree for project work (Codex `-C` / `--worktree`, Cursor `--workspace` / `-w`, Claude `--add-dir` limited to the attached project).
2. **Strictest native mode by action class:** read class uses Claude `plan`, Codex `-s read-only`, Cursor `--mode ask`. Anything that writes needs an approval first and then `acceptEdits`, `workspace-write` or `--sandbox enabled` respectively, inside the worktree. The `dangerously-*`, `bypass*`, `--force` and `--yolo` flags are never passed (the launch builder in #9 gets a test that asserts this).
3. **Environment:** launch with a minimal environment: the provider's own auth home, PATH, and nothing else from Jonas's shell. No API keys are injected.
4. **Gateway re-check:** side effects the CLI performs on its own are treated as untrusted until the gateway can see them; where a CLI cannot be constrained it runs read-only and the UI labels it.
5. **Deferred to Phase 4 hardening:** a separate Windows user, WSL2 or a container. Reason: the three provider logins live in Jonas's user profile, so a separate user means three more logins and fragile credential copies, which is more risk than it removes for a single-user machine.

## Changes to other specs
- 03: provider table now links here; Nous row says "via Hermes"; Cursor and Claude flags are recorded.
- 12: the sandbox open question is closed by the section above.
- 13: Phase 0 spikes are done on paper; the live-fixture capture is added to #9 and #10.

## Update 2026-10-23: Claude isolation flags verified with one live call
The adapter's command line (`--setting-sources project --strict-mcp-config --disable-slash-commands --tools "" --system-prompt <short>`, empty working directory, scrubbed environment) was run once for real with a one-word prompt. **Input tokens: 3,126** (2 uncached + 3,122 cache creation), 4 output tokens, about $0.013 at API rates, `apiKeySource: none` (the plan, not an API key). The first, unisolated call used **435,880** input tokens (about $3.49), so the flags cut the cost by about 99.3%. In the init event: 0 tools, 0 MCP servers, 0 commands and skills, 0 hook events; 3 plugins and 6 agents are still listed (they are loaded by name but contribute little). The `provider.heavy_context` guard (above 60k input tokens) did not fire. A caveat: the cache-creation figure is for a cold start, so the first message of a session costs about 3k tokens and later ones should read mostly from cache.
