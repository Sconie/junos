Context loading did not run; I’ll review from the doc itself (no PRODUCT.md/DESIGN.md in the repo).

**Mode:** Operate (local daemon + working UI). Lenses: impeccable Operate restraint + design-taste app-screen rules (quiet chrome, colour on data, honest density, product face, one job per screen).

---

## Verdict

`01-architecture.md` is a solid shape sketch for a local-first agent OS, but it under-specifies the security boundary, leaves transport/DB choices contradictory, and packs an unrealistic amount of surface into one daemon without UI/IA constraints. As an architecture doc it mostly defers design; the risks are that the named views (Inbox, Home feed, timeline) will ship as undifferentiated event dashboards.

---

## Contradictions

1. **Transport:** Shape says `HTTP + SSE/WebSocket`; Event bus says **SSE only**. Pick one primary realtime channel (or say WebSocket only when pty/bidirectional is required).
2. **Scout is / isn’t special:** Shape lists a peer-level `Scout runner`; prose says it’s “a scheduled workflow, not a special case,” yet `scout.finding` is a first-class event. Either Scout is just a workflow id + event type, or it’s a subsystem—don’t say both.
3. **SQLite flavor:** Shape offers `better-sqlite3 or libsql`; Tech choices only say “SQLite (WAL).” libsql changes sync/remote assumptions; decide before Phase 1.
4. **Access model:** Body = localhost tab; open questions = Electron/Tauri; future = Tailscale phone. Those three imply different auth, binding, and auto-start requirements. Architecture should pick a Phase-1 path and mark the rest as non-goals.
5. **“UI cannot touch filesystem” vs File indexer:** Correct split, but the indexer is a privileged FS reader with no path policy here—architecturally the UI *does* get filesystem-derived data through the API, so the boundary needs an explicit allowlist story, not only “daemon can.”

---

## Gaps (architecture-critical)

| Gap | Why it matters |
|---|---|
| Bind address / CORS / origin | “localhost, token-protected” without `127.0.0.1`-only, no LAN bind, and no CSRF story for browser clients |
| Token lifecycle | Issue, store, rotate, revoke; cookie vs `Authorization`; what happens on first launch |
| Secret storage | Secrets leave the browser—where do they live in `~/.junos/`? Keychain? plaintext DB? |
| Hermes bridge | Named in the tree, zero interface or failure mode |
| Approval scope | Workflows have approvals; `ProviderAdapter.run` does not say chat/tool runs need the same gate |
| Event retention / deletion | Append-only `events` forever vs user erase / export |
| Materialized tables | “a few” with no ownership, rebuild, or consistency rules after crash |
| Daemon↔UI versioning | Shared Zod helps; no schema/version handshake or migrate-on-start |
| Offline / daemon-down UX | Realtime views with no reconnect/backoff contract |
| Multi-writer | One SQLite file; no note on single daemon lock / second-instance behavior |

---

## Unrealistic scope

- **One daemon owns:** API, event bus, DB, cron, workflow runner, 5 provider adapters, Hermes, file indexer, Scout—plus monorepo split and `src/` → `apps/web` migration “once the daemon exists (Phase 1).” That’s several products’ worth of Phase 1 unless Phase 1 is explicitly “daemon = API + one adapter + events + SQLite” and the rest are Phase 2+.
- **Five providers in the `id` union** from day one (`claude | codex | cursor | grok | nous`) locks breadth before depth; architecture should allow `string` + registered adapters, with 1–2 implemented first.
- **pty “where a CLI demands it”** is a full interactive-session product (resize, input, secrets in the clear, hang detection)—not a one-liner under Process mgmt.
- **Resumable runs + catch-up policies + truncated audit store** are each non-trivial; stated as rules without a minimal state machine (queued → running → interrupted → resumed | failed).

---

## Security / privacy risks

Highest severity first:

1. **Local token ≠ authorization model.** Any page that can hit the daemon with a stolen/leaked token drives providers (spend, tools, `cwd`). Spec never says bind to loopback only, deny non-local origins, or use a short-lived token in memory + OS keychain for long-lived secrets.
2. **Tailscale / phone “later”** turns a loopback agent into a remote command channel. Without mTLS/device auth and explicit “remote = read-only or approval-required,” this is a footgun the doc currently waves at casually.
3. **`~/.junos/junos.db` as single bag** likely holds chat, tool output, paths, usage, maybe session metadata. No encryption-at-rest, backup sensitivity, or “DB is secret” warning.
4. **File indexer/watcher** can ingest SSH keys, `.env`, mail, browser profiles if roots aren’t constrained. Architecture should require roots + deny patterns as config, not an afterthought in another doc.
5. **Run output “stored for audit” (truncated)** still retains prompts, thinking, tool payloads—high privacy surface. Need redaction policy (secrets, tokens, file bodies) and user-controlled retention.
6. **Provider CLIs / pty** can surface interactive auth and paste secrets into the event stream (`chat.message`, run events) and thus the UI and DB.
7. **ToS / “Jonas’s machine”** is a product constraint, not a control. Architecture should still assume malware on-box = full compromise, and minimize what a malicious renderer can do if XSS ever appears in the Vite app (CSP, no privileged APIs in the page, token not in `localStorage` if avoidable).

---

## UI / design-quality problems (impeccable + design-taste)

This doc barely designs the product shell; that absence *is* the finding for an architecture that already names multiple working surfaces.

1. **No primary job / shell.** Inbox, Home feed, and activity timeline are all “queries over events.” App-screen lens: each screen needs one question and one frequent action. Architecture currently encourages three near-duplicate event browsers → dense, samey IA and high cognitive load.
2. **Home as event feed** invites template dashboard failure modes (KPI tiles, sparklines, “activity” cards). App-screen rule: colour on data not chrome; KPIs as type not tiles. Architecture should forbid Home = metric carnival and define Home’s one job (e.g. “what needs me now”).
3. **Realtime without motion budget.** SSE/`connection.changed`/`run.*` will spam the UI. No rule for coalescing updates, reduced motion, or “live” vs “settled” density—Operate surfaces need restraint, not toast storms.
4. **Typography / hierarchy / density:** “Plain CSS with tokens (see 14)” is the only UI line. For Operate mode, architecture should at least pin: product name in the shell, quiet nav, one accent on data/status, density targets for Inbox vs Chat (scan vs read). Leaving all of that to 14 makes 01 silent on whether the system is a calm operator console or a busy agent cockpit.
5. **Daemon disconnect / empty / first-run** unmentioned. Harden/onboard lens: localhost apps fail first on “is the daemon running?”—that state needs a designed screen, not a blank Query error.
6. **Phone via tunnel** with no adaptive shell. If phone is in scope later, architecture should mark “phone = notification + approve/reject only” or accept a full responsive app; half-tunnel with desktop density will be illegible.
7. **Brand / product face.** Nothing says how “junos” appears in the chrome. Taste skill’s repeated failure mode: correct kit, no product. Architecture owning the shell should require wordmark + one product-specific status object (e.g. connection/providers strip), not generic “Dashboard.”
8. **Contrast / legibility of live streams.** Thinking/tool/token streams are high-frequency, low-contrast by default in agent UIs. Spec should demand full-ink body for primary content and treat stream chrome as secondary—otherwise Home/Inbox become grey mush.

---

## What the doc gets right

- Local-first daemon with clear “browser must not hold secrets / CLIs” rationale.
- Provider adapter as the only provider-aware boundary; streaming `AsyncIterable` is the right shape.
- Append-only events as the spine for Inbox/Home/timeline.
- Reliability rules (resumable runs, catch-up, stored output) named early.
- Honest rejection of hosted backend given machine-bound subscriptions.

---

## Highest-leverage fixes (doc-only)

1. Freeze Phase 1: loopback-only Fastify + SQLite + events + **one** adapter + web Query client; defer Hermes, Scout-as-product, indexer, pty, Tailscale, Tauri.
2. Resolve SSE vs WebSocket; resolve better-sqlite3 vs libsql; resolve tray app vs tab.
3. Add a **Security boundary** subsection: bind `127.0.0.1`, token model, DB sensitivity, FS roots, retention/redaction, no remote exposure in Phase 1.
4. Add a **Shell / IA** subsection: one primary Operate surface, roles of Inbox vs Home vs timeline, live-update and daemon-down states—so 14 inherits constraints instead of inventing the product.

I didn’t run the impeccable detector or screenshot gate; target is a markdown architecture spec, not a rendered screen.
