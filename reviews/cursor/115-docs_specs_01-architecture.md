**Verdict:** Solid localhost-daemon shape and a clear “browser can’t touch CLIs/secrets” boundary — but the doc under-specifies auth, stream protocol, secret storage, and how a multi-feed Operate UI stays quiet under live events. Several internal tensions (SSE vs WebSocket, Scout “not special” vs special runner/events) will bite implementation and shell design.

---

### Contradictions (within this doc)

1. **Transport mismatch** — Shape says `HTTP + SSE/WebSocket`; Event bus says only **SSE** to the UI. Pick one primary real-time channel (or define when each is used). Dual-path without rules invites two UIs for the same stream.
2. **Scout is / isn’t special** — Shape lists a dedicated `Scout runner`; Event bus has `scout.finding`; prose says Scout is “a scheduled workflow, **not a special case**.” Either it’s just a workflow + event types, or it gets a first-class runner — not both without saying what “not special” still means.
3. **Hermes vs providers** — Adapters are `claude | codex | cursor | grok | nous`; Hermes is a separate **bridge**. Unclear whether `nous` *is* Hermes, wraps it, or is a fifth LLM plus Hermes as orchestration. Naming collision risk for Connection UI and routing.
4. **“Token-protected” vs no auth story** — The only security claim on the wire is a token; Open questions float Tauri/Electron and Tailscale. Those change trust boundaries (webview origin, tray, remote LAN) without updating the auth model.

---

### Gaps (architecture that Operate UI will need)

| Gap | Why it matters |
|---|---|
| **Bind address / Origin / CSRF** | “localhost + token” is not a threat model. Is the API `127.0.0.1` only? Cookie vs bearer? Who mints/rotates the token? |
| **Where secrets live** | Correctly bans browser storage; never says keychain, env, encrypted SQLite, or CLI session files on disk. |
| **`RunRequest` power** | `cwd?`, `tools?`, `systemPrompt?` from the UI → daemon with FS/CLI access needs allowlists, project roots, and who may set them. |
| **Event → view contract** | “Queries over events + materialized tables” — no rebuild, idempotency, or backfill rules. Home / Inbox / timeline will diverge silently. |
| **Stream volume / coalescing** | Token/thinking/tool events with no batching, lag, or “quiet mode” → UI either floods or invents ad-hoc throttling. |
| **Shell / IA** | No product shell: nav, connection strip, run-in-progress affordance, empty/error for daemon-down. Deferred to 14 without architectural constraints. |
| **Failure UX** | Reliability covers daemon restart; not “daemon dead,” “provider disconnected,” or “token invalid” as first-class UI states. |
| **Phasing** | Shape is the full system; only layout migrate is “Phase 1.” No cut line for adapter count, indexer, Scout, Kanban events. |

---

### Unrealistic scope

Shipping in one daemon: **5 adapters + Hermes + cron + workflows/approvals + file indexer + Scout + Kanban-shaped events + SSE UI**, then monorepo split. That’s a product platform, not an architecture MVP.

For a credible Phase 1: one adapter path, event bus + SQLite, one run surface, catch-up policy — then indexer/Scout/Kanban as consumers of the same bus. Leaving Electron/Tauri and Tailscale open while listing the full Shape reads as “optional packaging” on top of an already large core.

---

### Security / privacy risks

- **Localhost ≠ private** if bound to `0.0.0.0`, or once **Tailscale** exposes the API: token alone without mTLS/device auth is thin.
- **CLI sessions & subscription cookies** in the daemon process = high-value target; no isolation, audit of `run`/`cancel`, or “which UI client is allowed.”
- **`cwd` + tools** = arbitrary local execution surface if the UI (or a compromised tab) can set them.
- **Append-only events + truncated run output “for audit”** will retain prompts, paths, tool args, and secrets unless redaction/retention is specified.
- **File indexer/watcher** expands the sensitive corpus (project files into DB/search) with no retention or exclude rules here.
- **SQLite at `~/.junos/junos.db`**: easy backup also means easy exfil; no encryption-at-rest or backup hygiene.
- **Tauri/Electron open question**: tray + auto-start increase always-on attack window; DevTools/remote debugging must stay out of the threat model.

---

### UI / design-quality (Impeccable Operate + tasteskill app screens)

This doc barely designs the product surface, but it **implies** one: multi-view feeds over a hot event bus and five live connections. Against Operate / app-screen taste:

**Hierarchy & IA**  
Inbox + Home feed + activity timeline as three queries over the same events risks **three competing “what’s happening” surfaces** (cognitive load, peak-end noise). Architecture should name **one primary live surface** and treat the others as filters/projections — not peer chrome.

**Density**  
Token/thinking/tool streams default to **chat-log density** that fights app-screen norms (quiet chrome, colour on data not chrome, no KPI tile strip). Spec needs coalescing, collapse rules for thinking/tools, and what stays ink vs secondary — or the shell will grow status cards per provider (`plan`, `usage`, `connection.changed`).

**Typography / legibility**  
Streaming + truncated audit output without measure, mono-only-for-code, and contrast roles invites grey “secondary” walls of tool JSON. Architecture should require: body in full ink ≥16px, code/mono only for real code, truncated previews that don’t dump full tool payloads into the feed.

**Spacing / composition**  
“Materialized tables + event queries” with no shell grid invites dashboard slop: connection KPI row, sparkline usage, icon tiles per provider. App-screen law: **~3% colour, KPIs as type not tiles, flat surfaces, no hero header.** Call that out as a constraint for anything built on `connection.changed` / usage.

**Motion**  
SSE token streams invite typewriter / pulse / glow. Operate: **150–250ms, state-only, no page-load choreography**; `prefers-reduced-motion` must keep content visible. Architecture should ban decorative stream motion and define the one state motion (run active → finished/failed).

**Contrast / states**  
Missing daemon-down, reconnecting, and provider-error as **semantic UI states** (not toast spam). Without them, the UI will fake health with badges and soft greys.

**Product face**  
“Plain CSS with tokens (see 14)” is fine technically; as product direction it’s empty. App screens need one face, product mark in the shell, and **one Junos-specific live element** (e.g. run/approval strip) — not a generic agent dashboard. Architecture should pin that element so 14 doesn’t invent chrome.

---

### Priority fixes for this doc (design-director order)

1. **Single real-time protocol + client auth threat model** (bind, token lifecycle, Tailscale implications).  
2. **Secret & run sandbox policy** (where secrets live; who may set `cwd`/`tools`).  
3. **Event retention/redaction** for audit/privacy.  
4. **Resolve Scout / Hermes / `nous` naming** so Connection and feed UIs don’t fork.  
5. **UI constraints from the bus**: one primary live surface, stream coalescing, no provider KPI chrome, state-only motion — then point at 14 for tokens/type.

---

Questions skipped: Ask-mode doc review (no live UI / detector). If you want the same pass against `14-ui-system.md` next, say so.
