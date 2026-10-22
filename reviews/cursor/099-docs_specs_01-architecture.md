**Verdict:** Strong localhost-daemon split and clear adapter boundary; weak on transport/auth, event growth, and how many Operate surfaces that event bus will feed. Design lenses mostly expose **missing Operate constraints**, not visual specs (those belong in 14).

---

### Contradictions

1. **SSE vs WebSocket** — Shape says `HTTP + SSE/WebSocket`; Event bus commits to **SSE only**. Pick one or define when each is used (e.g. SSE for events, WS for interactive pty).
2. **Scout special-cased and not** — “Scout runner (a scheduled workflow, not a special case)” vs first-class `scout.finding` event. Either Scout is just another workflow + generic events, or it is a product surface with its own stream.
3. **Resume vs cancel** — Reliability: “Every run is resumable or cleanly failed.” Adapter surface has `cancel` but no `resume` / checkpoint contract. Resumability is asserted without an interface for it.
4. **Client shape unresolved** — “Why not hosted” points at localhost (+ optional Tailscale phone); open questions still float Electron/Tauri tray/auto-start. Three delivery models, one architecture diagram.

---

### Gaps

| Area | What’s missing |
|---|---|
| Auth | “Token-protected” only — mint, store, rotate, revoke; bind to `127.0.0.1` vs LAN; CORS; CSRF on mutating REST |
| Daemon discovery | Port, health, “daemon not running” UX contract |
| Event model | Retention, compaction, backpressure when SSE consumers lag; who materializes Inbox/Home/timeline |
| Secrets | “Not in browser storage” — where *do* they live, encryption, backup of `~/.junos/junos.db` |
| Concurrency | Max parallel runs, queueing, cancel propagation across providers |
| File indexer | Roots, ignore rules, PII — high privacy surface with no bounds here |
| Hermes bridge | Named in Shape, undefined |
| Operate UI states | Daemon down, reconnecting stream, partial provider failure — not in Reliability rules |
| Phase boundary | Shape lists API, bus, DB, scheduler, workflows, 5 adapters, Hermes, indexer, Scout as one box; Phase 1 only says “move `src/` once daemon exists” |

---

### Unrealistic scope

The Shape reads like a full personal ops platform in one cut: five providers (`claude` \| `codex` \| `cursor` \| `grok` \| `nous`), Hermes, Scout, Kanban event family, file watcher, cron catch-up policies, and resumable workflows.

For a single-user localhost daemon that’s plausible over time, but as **architecture for Phase 1** it’s overloaded. A credible slice is: daemon + SQLite + one adapter + event bus + thin UI shell; Scout/Kanban/indexer/Hermes as later workflows on the same bus — not peers in the first diagram.

`status(): plan? / usage?` on every adapter also implies billing/plan UX per provider before core chat/run loop is proven.

---

### Security / privacy risks

- **Localhost token without bind/CORS rules** — If the daemon listens beyond loopback (or Tailscale lands without re-auth), “token-protected” is thin.
- **Tailscale “later”** — Changes threat model (remote UI → daemon). Architecture should require auth/TLS assumptions *before* that option, not after.
- **Append-only events + truncated run output “for audit”** — Prompts, tool args, and file paths will land in SQLite. No redaction, TTL, or “don’t index secrets” rule here.
- **File indexer / watcher** — Broad FS read is the largest privacy footgun; unspecified scope.
- **`execa` + “pty only where a CLI demands it”** — Interactive CLIs can surface credentials in streams that the bus then fans out to the UI.
- **Single plaintext DB file** — Backup is called “easy”; theft/backup sync of `~/.junos/junos.db` = full history. No at-rest story.
- **Provider CLIs outside the DB** — Adapters won’t contain sessions that live in each tool’s own config dirs; architecture doesn’t say how those are treated as part of the trust boundary.

What’s already right: UI cannot touch CLIs/FS; secrets out of browser storage; keep sign-ins on-machine vs hosted tokens.

---

### UI / design quality (Operate + tasteskill app-screen lens)

This doc barely specifies UI — gaps show up as **architecture that will force bad product UI** if left alone:

1. **Too many peer views from one event soup** — Inbox, Home feed, activity timeline, plus Kanban/Scout event types, with no primary Operate question or shell. App-screen rule: first screen answers one job; colour/chrome stay quiet. An undifferentiated event bus → badge noise, competing feeds, and “activity timeline” as a second Inbox.
2. **No density / projection contract** — “Views are queries over events plus a few materialized tables” without saying what is projected vs raw. Risk: live SSE rows as the UI (high density, weak hierarchy) instead of calm materialized lists with type-led status (Operate: scanability over stream theater).
3. **Motion / realtime** — Operate wants 150–250 ms state motion, not choreography. Architecture doesn’t say events drive **data refresh**, not entrance animations or toast storms on `run.step` / `connection.changed`.
4. **Connection chrome vs data** — `connection.changed` + per-provider `status()` invite a status dashboard (icon tiles, plan chips). Tasteskill: colour on data, not chrome; KPIs as type. Architecture should push “one degraded banner / connections settings,” not a hero connection strip.
5. **Typography / tokens deferred to 14** — Fine, but architecture still chooses **Plain CSS + tokens** and TanStack + Zustand without naming shell IA (nav, primary surface, empty/error). Design debt isn’t visual yet — it’s **no information architecture**.
6. **Electron/Tauri open question** — Tray + auto-start changes density and attention (background runs, notifications). Leaving it open means Inbox/`task.fired` alerting policy can’t be designed.
7. **Legibility / contrast** — Not specified here (correct for 14), but storing truncated thinking/tool streams implies a dense transcript UI with no hierarchy rules (thinking vs tokens vs tools). That’s a legibility risk seeded by the adapter’s `RunEvent` union with no UI mapping.

Mode fit: this product is **Operate**, not Persuade. Ambition should show as precise shell + one primary queue, not five feeds from day one.

---

### Priority fixes (doc-only)

1. Resolve **SSE vs WS**, **bind + token lifecycle**, and **client (tab vs Tauri)** before more surface events.
2. Shrink Shape to a Phase-1 core; demote Scout/Kanban/indexer/Hermes to “same bus, later.”
3. Add event **retention/redaction**, run-output privacy, and file-indexer roots.
4. Add an **Operate shell** note: primary surface, how SSE maps to Query invalidation (not chrome), daemon-down/empty states.
5. Align **resume** with the adapter interface or drop the claim.

I only reviewed `docs/specs/01-architecture.md`; cross-spec drift with 02/12/14 wasn’t checked.
