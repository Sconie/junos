## Findings (ranked)

1. **high — Autonomous mode vs hard approval rules**  
   *Quote:* “Autonomous (log only).” / *cross-check:* `00-overview` “approves anything destructive or outward-facing”; `12-security` external-send / destructive / spend **always ask**.  
   *Why:* “Log only” reads as bypassing the product’s safety floor; an implementer can ship a mode that auto-runs shell, mail, and spend.  
   *Fix:* Redefine Autonomous as “auto-approve **read + allowlisted write-local** only; external-send / destructive / spend still always ask,” or drop the mode and keep Ask-first / Balanced.

2. **high — Live step stream ships raw `input` / `output`**  
   *Quote:* `GET /hermes/stream` → steps with `{…, input, output, …}` for `shell|browser|file|api|message`.  
   *Why:* Shell/API/browser payloads routinely contain tokens, mail, cookies, file contents; `12` redacts secrets in logs/runs but this stream is a parallel secret channel into the UI and any SSE client.  
   *Fix:* Stream redacted summaries by default; full I/O only behind an explicit “Reveal” (and still pattern-redacted); never persist unredacted blobs in SQLite without the same caps/redaction as `run_step`.

3. **high — Two approval channels, no source of truth**  
   *Quote:* `POST /hermes/approvals/:id {decision}` **and** “Approvals appear as Inbox items and as a banner”; Inbox owns `POST /inbox/:id/action` (`07`).  
   *Why:* Dual paths invite double-approve, banner-vs-Inbox drift, and races with the 30 min auto-deny.  
   *Fix:* One approval object in Inbox; Hermes bridge only *raises* it; console banner is a deep-link UI over the same `inbox_item`; delete `/hermes/approvals`.

4. **high — Memory / skills are writable without a trust boundary**  
   *Quote:* `GET/PUT /hermes/memory`, `GET/PUT /hermes/skills`; “memory writes… until Jonas pins them (**optional** setting).”  
   *Why:* Optional pin-before-accept + PUT skills means the agent (or a buggy UI) can silently rewrite facts or enable dangerous tools; that is prompt-injection persistence.  
   *Fix:* Pin/diff default **on**; skills changes always require explicit confirm + audit `event`; API is propose/apply, not blind PUT; document who may call these (UI token only, never Hermes self-service).

5. **high — Balanced “writes free” undercuts worktree / allowlist story**  
   *Quote:* “writes in allowlisted folders free, shell/network/mail ask.” / *cross-check:* `12` “Hermes… on a git branch/worktree… never directly on the main working tree.”  
   *Why:* Spec never binds “allowlisted folders” to worktrees, nor forbids writing secrets dirs (`~/.ssh`, `.env`, keychain paths).  
   *Fix:* Define allowlist = project worktree paths only; denylist home-dotfiles/secrets; main-tree writes = destructive/ask even in Balanced.

6. **med — Console layout is unrealistic density / generic “mission control”**  
   *Quote:* Header + left 40% chat + right 60% step **cards** + bottom tabs Memory/Skills/Logs/Queue; “pulsing”, “shimmers.”  
   *Why (impeccable / app-screens):* One Operate surface with four competing jobs and >4 chrome actions; stitch itself already suggests hiding bottom tabs behind “Inspect.” Icon+card step rows, status pill pulse, and shimmer loading are dashboard-generator tells; app-screens ban shimmer gradients on load.  
   *Fix:* One primary job on first paint (activity + Stop/Pause); chat as the directive composer or a drawer; Memory/Skills/Logs/Queue behind one Inspect panel or routes (match `src/pages/Hermes.tsx`: Console / Tasks / Memory / Settings); status = quiet text/dot, not pulse; running step = static “Running” mark + `prefers-reduced-motion`.

7. **med — Spec IA contradicts shell, Agents, and code**  
   *Quote:* Bottom tabs Memory / Skills / Logs / Queue. / *cross-check:* `14` nav has **Agents** and **Hermes**; `07` Agent chats; `src/pages/Hermes.tsx` tabs Console / Tasks / Memory / Settings.  
   *Why:* Three IAs for one product; Agents vs Hermes console vs embedded `kind=agent` chat will duplicate status/task UI.  
   *Fix:* Pick one: Hermes sub-app routes as in `src`, Agents list → Hermes detail; drop bottom-strip tabs from `06` or mark them as Inspect contents only.

8. **med — Bridge contract is too thin for the UI promises**  
   *Quote:* Minimal REST/SSE list; “If Hermes is a CLI… translates stdout”; open: same machine? one vs many?; “Needs from Jonas: how Hermes runs… where its memory lives.”  
   *Why:* Console acceptance needs live steps, queue, memory, approvals, pause/stop—without process model, auth, reconnect, or failure modes this is mock-only forever (`13` already flags unknown interface).  
   *Fix:* Phase-gate: mock schema + UI first; real bridge checklist (spawn, cwd, env, auth token from `12`, crash/restart, backpressure on SSE, memory file path). Defer Skills/Memory edit until memory location is known.

9. **med — Bridge auth not specified on these endpoints**  
   *Quote:* `/hermes/*` contract in `06`. / *cross-check:* `12` “Hermes bridge token” in keychain; daemon bearer on `127.0.0.1`.  
   *Why:* Easy to implement Hermes HTTP as an unauthenticated localhost sidecar → any local process becomes the agent.  
   *Fix:* State explicitly: all `/hermes/*` are daemon-internal or bearer-protected like the rest of the API; no second open port.

10. **med — Kanban pickup rule disagrees with `09`**  
    *Quote:* “pick up cards labelled `hermes`.” / `09`: “assignee `hermes` **(or label `hermes`)**.”  
    *Why:* Label-only vs assignee-or-label changes what Ready means and who owns WIP.  
    *Fix:* Align on one rule (prefer assignee `hermes`; label as alias only) and link both specs to it.

11. **med — Missing Operate states this screen needs**  
    *Quote:* Acceptance covers mock status/stream/queue/memory; no offline Hermes, bridge error, empty queue, truncated stream, or approval timeout UX. / `14` requires loading/empty/error/offline.  
    *Why:* Agent consoles fail most often in the “not running / stuck / denied” paths; shimmer cards without those states look finished and aren’t.  
    *Fix:* Add states: Hermes offline, bridge error+retry, empty activity with “Give directive”, approval expired (auto-deny recorded), Stop in progress.

12. **med — No keyboard map; Stop/approvals are high-stakes**  
    *Quote:* Behaviors name Kill switch / approvals; no keys. / `14` “Keyboard-first (list in each spec)”; `07` has a full map.  
    *Why:* Approving shell from a banner without shortcuts or focus order is slow and error-prone.  
    *Fix:* Spec keys: Pause, Stop (confirm), approve/deny when banner focused, focus move between chat and timeline; never bind irreversible Stop without confirm.

13. **med — 40/60 + bottom strip ignores responsive rule**  
    *Quote:* Fixed left 40% / right 60% / bottom tabs. / `14`: &lt;900 px bottom tab bar + full-screen sheets; app-screens: multi-pane → one region at a time.  
    *Why:* Unusable on laptop width / phone; content crushed into cards.  
    *Fix:* Desktop split; &lt;1100 stack or tabs (Activity | Chat | Inspect); phone = one pane with back.

14. **med — Stop vs Pause / queue semantics underspecified**  
    *Quote:* “Stop cancels the current step and drops queue to paused.”  
    *Why:* Unclear whether queued directives are kept, discarded, or need re-approval; Pause vs Stop confusion causes accidental resume of risky work.  
    *Fix:* Pause = freeze current+queue; Stop = cancel current, leave queue paused pending explicit Resume; document Resume does not auto-start without confirmation when autonomy ≠ Autonomous.

15. **low — Step `type` enum doesn’t cover real Hermes actions**  
    *Quote:* `shell|browser|file|api|message` vs behaviors (Kanban, memory diffs, mail/network, approvals).  
    *Why:* UI will invent types or stuff everything into `api`/`shell`, breaking filters and icons.  
    *Fix:* Extend types (`kanban`, `memory`, `approval`, `network`) or a closed `type` + `subtype`.

16. **low — Memory as “editable chips”**  
    *Quote:* “Memory (editable chips with pin).”  
    *Why:* Chip clouds scale poorly, hide markdown (`memory_item.value_md` in `02`), and read as generic AI UI.  
    *Fix:* Pinned list/table: key | value preview | pin | diff; edit in a drawer with DiffView (`14`).

17. **low — “Handoff from anywhere” without context budget**  
    *Quote:* “Give to Hermes… creates a directive with the context attached.”  
    *Why:* Attaching whole files/threads risks secret leakage and token blowups; no size/redaction policy.  
    *Fix:* Attach refs (ids/paths) + short excerpt; hard size cap; same untrusted-content wrapping as `12` prompt-injection section.

18. **low — One vs many agents left open while UI is singular**  
    *Quote:* Open question “One Hermes or several…”; screen header “name”. / `02` `agent` table allows many.  
    *Why:* Building a singleton console burns a migration when named agents arrive.  
    *Fix:* Console is always `/agents/:id` with Hermes as default row; drop the open question or schedule multi-agent after v1.
