**Verdict:** As a local-daemon shape this is clear and mostly coherent; as an Operate-product architecture it under-specifies auth, retention, and the UI surfaces those events will feed — which is where the design and privacy risk actually lives.

---

### Contradictions (internal)

1. **Transport:** Shape says `HTTP + SSE/WebSocket`; Event bus only commits to **SSE**. WebSocket is never defined (bidirectional cancel? reconnect? binary?). Pick one primary realtime path or say what WS is for.
2. **Scout:** Shape says scout is “a scheduled workflow, not a special case,” but the event taxonomy has a dedicated `scout.finding`. Either scout is just another workflow emitting generic run/inbox events, or it *is* a first-class producer — the doc says both.
3. **Hermes vs providers:** Adapter ids include `'nous'`; Hermes is a separate box with no interface. Unclear whether Hermes is a provider, a bridge *to* providers, or a peer channel. That ambiguity will fork routing and UI “connection” chrome.
4. **Storage story:** Event bus = append-only `events` + “a few materialized tables”; Reliability = “output of runs is stored (truncated…)”. Unclear whether run output lives in events, blobs, or materializations — and therefore which views are live vs stale.
5. **Delivery model:** Body assumes a localhost browser tab; Open questions float Electron/Tauri *and* Tailscale phone access. Those three shells imply different chrome, lifecycle, and auth — unresolved while the rest of the doc reads decided.

---

### Gaps

| Area | What’s missing |
|---|---|
| **Daemon↔UI contract** | Port discovery, single-instance lock, bind address, API versioning, schema migrations for `~/.junos/junos.db` |
| **Auth** | What the “token” is, how the UI gets it, rotation, where it may *not* be stored |
| **Realtime** | Reconnect, backpressure, event cursor/resume after SSE drop, payload size limits |
| **`RunRequest` blast radius** | Who may set `cwd`, `tools`, `systemPrompt`; validation boundary before `execa`/pty |
| **File indexer** | Roots, ignore rules, secret paths, CPU budget — currently unbounded |
| **Approvals** | Workflow runner mentions approvals; no event/API/UI channel |
| **Daemon-down UX** | `connection.changed` is named; no contract for degraded UI (Operate empty/error/loading) |
| **Retention** | Events + truncated run output grow forever unless capped |
| **Hermes / Scout / Kanban** | Named in the diagram or event list with no architectural responsibility here |

Deferred pointers (`see 03`, `see 14`) are fine; the holes above are architectural, not “belongs in UI system.”

---

### Unrealistic scope

Phase 1 is framed as “daemon exists → move `src/` into `apps/web`,” but the daemon already owns: multi-provider adapters (incl. pty), scheduler with catch-up, workflow runner + approvals, event bus + materializations, file watcher/indexer, Hermes, and Scout. That is a full local OS for AI work, not a thin API in front of the current Vite app.

Catch-up `run all missed` without rate limits or a global budget is a realistic way to melt the machine after a weekend offline. Materialized views “plus” event queries without a rule for *when* to materialize invites an unbounded dual-write design.

**Design-taste / Operate angle:** Naming Inbox, Home feed, *and* activity timeline as peer views over the same bus, with no primary job per surface, is how you get a template dashboard (three feeds, no one question). App-screen craft wants one screen → one job → first viewport shows the work; this architecture invents three canvases before that decision.

---

### Security / privacy risks

Strong intent (“secrets must not live in browser storage”; localhost-only because of ToS/tokens) — thin controls:

- **Token-protected localhost** without bind-to-`127.0.0.1`, origin checks, or token storage rules. Any local process that learns the token can stream chats/runs/files metadata.
- **`~/.junos/junos.db`** as single file for events + audit output: likely prompts, tool results, paths, usage — **no encryption at rest**, backup, or ACL story.
- **Tailscale “later”** expands the trust boundary; architecture does not require auth upgrade (session, device pairing) when leaving pure localhost.
- **File indexer + `cwd` on runs:** high risk of ingesting secrets (`.env`, keys, mail) into events/audit unless roots and redaction are specified here.
- **Stored run output for audit** conflicts with privacy unless truncation, redaction, and retention are first-class — not a footnote.
- **`execa` / pty:** UI-influenced commands are a classic local RCE path if Zod only validates shape, not allowlists.

---

### UI / design-quality (Operate + app-screen lens)

This is an Operate surface (task UI), not Persuade. The doc correctly picks plain CSS tokens (anti-framework-slop), then **does not constrain the product shell** that those events will flood.

1. **Hierarchy / IA** — Event types imply many panes (chat stream, run steps/thinking/tools, inbox, home feed, timeline, kanban, scout, connection status) with no primary surface, density budget, or “one job.” Risk: equal-weight panels, KPI-ish status chrome, and a feed that never answers “what do I do next?”
2. **Density** — Token/thinking/tool SSE without coalescing, virtualization, or “collapse tool noise” rules will produce unreadably tall, soft-grey logs. App screens want quiet chrome and colour on *data that needs a decision*; a raw event firehose fails that.
3. **Motion** — Operate: 150–250 ms, state only, no load choreography. Architecture’s step stream invites progress theatre unless the doc forbids decorative motion on every `run.step`.
4. **Typography / legibility** — No split between prose chat and tool/log surfaces (mono only for real code is a taste house rule). Without that, implementers grey-out “secondary” streams and kill contrast.
5. **Spacing / composition** — “Views are queries over events” pushes UI toward infinite lists. No guidance on section rhythm, fixed shell vs scrolling canvas, or keeping the frequent job one click from the first screen.
6. **States** — `connection.changed`, failed runs, empty inbox/home, catch-up storms: architecture names producers, not the empty/zero/loading/error vocabulary Operate and app-screens treat as mandatory.
7. **Approvals** — High-stakes; default will be a modal. Operate prefers inline/progressive interrupt; architecture should say how approvals appear in the shell.
8. **Phone / Tauri** — Phone via tunnel without a phone composition for the app shell is a design debt bomb. Tray/desktop wrapper changes nav chrome while still “open.”
9. **Product face** — Tech table is solid; nothing says the shell must name the product/workspace or carry one signature element. Easy to ship “generic local AI dashboard” (Geist/Inter, `#f8f8f8`, status pills) even with tokens in 14.
10. **Contrast** — Streaming “thinking” and connection errors need semantic colour on *meaning*, not accent on chrome. Doc is silent; 14 alone won’t know which events are decision-coloured.

---

### What to fix first in *this* doc (if you revise it)

1. One realtime transport; resume/cursor; bind + token rules.  
2. Event retention, run-output storage location, redaction.  
3. Collapse Scout/Hermes into clear adapter vs workflow vs bridge.  
4. Name **one primary Operate surface** and demote the other feeds.  
5. Explicit UI contracts: daemon-down, approval interrupt, stream density/coalesce, prose vs log type roles — even as one short “UI implications” section pointing at 14 for tokens.

I’m in Ask mode, so this is review only. If you want the doc patched, switch to Agent mode.
