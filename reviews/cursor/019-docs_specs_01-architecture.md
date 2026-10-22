**Verdict:** As a systems sketch, `01-architecture.md` is coherent (localhost daemon owns secrets/CLIs; UI is a thin client). As an Operate-mode product architecture, it under-specifies the shell and streaming work surfaces while packing an unrealistic surface area into one shape diagram—exactly where design quality and security usually fail later.

---

### Contradictions (within this doc)

1. **Scout is both special and not.** Shape lists a dedicated `Scout runner`; prose says scout is “a scheduled workflow, not a special case.” Pick one: either it is just a workflow (drop the box) or it has privileged scheduling/IO (document why).

2. **Transport is undecided while drawn as decided.** The pipe is `HTTP + SSE/WebSocket`. That is three protocols with different reconnect, buffering, and UI implications. Architecture should name one primary realtime path and when (if ever) the other is allowed.

3. **SQLite choice fights the “one local file” story.** `better-sqlite3 or libsql` with `~/.junos/junos.db` is fine for local embedded; libsql also implies remote/replica patterns that clash with “no hosted backend / tokens stay on machine” unless you explicitly forbid remote.

4. **Shape says Browser; open questions reopen the product.** Tray / auto-start / launchd vs “plain localhost tab” changes shell, lifecycle, reconnect UX, and the threat model. The diagram presents a decided client; the footer does not.

5. **“Token-protected localhost” vs “keep everything on localhost.”** A token already assumes something other than ambient same-machine trust (multi-tab, tunnel, or hostile localhost apps). That belongs in the security model of *this* doc, not only “later Tailscale.”

---

### Gaps

| Area | What’s missing |
|---|---|
| **Primary job** | No single Operate question (“what do I do when I open this?”). Events power Inbox, Home feed, activity timeline, kanban, scout—five jobs without a default. |
| **Shell / IA** | No nav, workspace scope, or which surface owns streaming runs vs inbox vs board. |
| **Daemon↔UI contract for failures** | Runs are resumable; UI has no reconnect, daemon-down, auth-fail, or partial-stream states. |
| **Approvals** | Workflow runner mentions approvals; no UI/API surface for approve/deny, timeout, or who is asked. |
| **File indexer** | Watcher exists; no roots, ignore rules, retention, or what the UI may show. |
| **Hermes bridge** | Named capability with zero boundary (what it can read/write/trigger). |
| **Secrets** | “Not in browser storage” is stated; daemon storage, rotation, and redaction of run transcripts are not. |
| **Styling ownership** | “Plain CSS with tokens (see 14)” defers *all* hierarchy/density/motion—architecture still needs non-negotiables for Operate (see UI below). |
| **Phone** | Tailscale “later” with no adaptive/phone composition constraint. |

---

### Unrealistic scope

The shape treats as one daemon: five provider adapters, scheduler + catch-up, workflow runner with retries/approvals, Hermes, filesystem indexer, scout, and an event taxonomy that already assumes Inbox, Home, activity, kanban, and scout UIs.

Phase 1 is framed as “move `src/` into `apps/web` once the daemon exists”—the migrate is trivial; **daemon + adapters + durable runs** is the product. The type union already freezes five providers (`claude | codex | cursor | grok | nous`) as day-one architecture rather than one adapter + a registry.

For design taste / impeccable Operate: this is how you get a generated multi-panel “agent cockpit” with no product face and no one primary control.

---

### Security / privacy risks (called out by this doc’s own claims)

1. **Localhost is not a trust boundary.** Any local process can often hit `localhost`. “Token-protected” needs issuance, storage (memory vs keychain), binding (loopback-only listen), and CSRF/SOP assumptions for the Vite origin—none appear here.

2. **File indexer / watcher** is the largest privacy blast radius in the diagram. Without scoped roots and redaction, the daemon becomes a searchable corpus of the machine; the UI will pressure you to show paths and snippets.

3. **Append-only events + truncated run storage “for audit”** will hold prompts, tool output, paths, and provider errors. Truncation ≠ redaction; secrets in model/tool output need a policy.

4. **Provider sessions via CLI/pty** concentrate credentials on disk and in child processes. Architecture says the daemon can touch them; it does not say isolation, logging bans, or what `status()` may return to the browser (`plan`, `usage`, `error`).

5. **Tailscale / phone later** expands from single-user loopback to remote client without upgrading auth (device binding, short-lived tokens, no long-lived browser storage—already a goal that remote access will stress).

6. **SSE/WebSocket event types** (`inbox.item`, `scout.finding`, `kanban.card.*`) look like a full push of potentially sensitive content to any holder of the token. Need event-level filtering / least privilege for UI subscriptions.

---

### UI / design-quality problems (impeccable Operate + design-taste app-screens)

Mode for this product is **Operate** (task UI), not Persuade. Ambition here is precision and scanability—not a marketing hero. Through that lens, this doc sets up several predictable failures:

**Hierarchy & IA**  
Naming Inbox + Home feed + activity timeline as peer “views over events” invites three competing chronologies. App-screen guidance: one job per screen, most frequent job one click from first paint, product name/scope in the shell. Architecture never assigns a primary surface or a quiet shell.

**Density**  
An append-only bus of `chat.message`, `run.*`, `task.fired`, `scout.finding`, etc. defaults to a noisy firehose. Without density rules (row pitch, what is primary vs secondary, collapse of `thinking` / tool noise), Home/activity will read as a log dump—high cognitive load, weak hierarchy.

**Typography & legibility**  
`run` streams `token | thinking | tool | done | error`. That is a three-tier type problem (answer vs thinking vs tool). Operate wants a tight rem scale and full-ink running text; thinking/tool must be clearly secondary without soft-grey-on-grey illegibility. Not mentioned; “see 14” is not enough for the core interaction.

**Contrast & state color**  
`connection.changed`, `run.failed`, approvals, and provider `status().error` need a small semantic vocabulary (error/warn/success/info)—colour on meaning, not chrome. Architecture lists events; it does not require semantic tokens or forbid decorative accent-on-nav (classic generated-dashboard tell).

**Spacing / composition**  
“Plain CSS + tokens” with TanStack Query + Zustand and many views usually becomes sidebar + KPI-ish summary + feed + side chat—the average agent dashboard. Nothing in this doc forbids icon-tile KPIs, card grids, or a hero header on Home. Architecture should at least pin Operate constraints: flat surfaces, no vanity stats, data/actions over chrome.

**Motion**  
Token streaming and step events tempt typewriter/choreographed load motion. Impeccable Operate: 150–250ms, motion conveys state only, no page-load theatre; design-taste still wants reduced-motion fallbacks. Architecture’s realtime model needs an explicit motion policy: stream updates as content, not performance.

**Daemon-down / empty / loading**  
Reliability rules are daemon-centric. The highest-stakes UI moment—daemon not running, token rejected, provider disconnected—is absent. Empty Inbox/Home without teaching copy will ship as “No items.”

**Phone**  
Optional tunnel access without a phone composition plan guarantees a squeezed desktop shell.

---

### Priority fixes (doc-only; no implementation)

1. **Collapse the product shape** to: daemon + one chat/run path + event bus + one provider; mark scout/kanban/hermes/indexer as later modules—or justify each with a boundary and Phase.  
2. **Pick one realtime transport** and define reconnect + UI degraded mode.  
3. **Resolve Scout** (workflow vs subsystem) and **Hermes/files** with capability and privacy scopes.  
4. **Specify localhost auth** (listen address, token lifecycle) consistent with optional tunnel.  
5. **Add an Operate UI contract** in this doc (short): primary screen & job; shell; stream hierarchy (answer / thinking / tools); density; semantic states; reduced-motion; daemon-unreachable. Leave tokens/typefaces to `14`, not hierarchy and states.

---

**Questions skipped:** full impeccable dual-agent critique + browser detector (target is a markdown architecture doc, not a viewable surface).
