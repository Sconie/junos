Context loading did not run (Ask mode; no `PRODUCT.md` / `DESIGN.md` in this repo). Review is of the current `docs/specs/06-hermes.md` text as an **Operate / app-screen** surface, through impeccable + design-taste-frontend (app-screens + house rules)—not a live UI or detector pass.

---

## Verdict

The integration/deployment story is unusually concrete for a personal-agent bridge. The **Screen** section is still a layout sketch that would ship a dense, chrome-heavy ops console, and several deployment/channel decisions fight each other on memory writes, approvals surfaces, and “local” autonomy. Fix the contract contradictions and cut the first viewport to one job before treating the mockup as binding.

---

## Contradictions

1. **Memory write path vs volume mounts**  
   Bridge exposes `PUT /hermes/memory`; Behaviors let Jonas edit/pin chips. Deployment says the shim mounts memory volumes **read-only** for the Memory tab and “writes memory only through Hermes’s own interface.” Unclear whether JunOS edits go Hermes→API, shim→files, or are display-only. Same conflict for “proposed as a diff until pin” vs immediate PUT.

2. **“Write-local” autonomy on a remote agent**  
   Balanced/Autonomous mention “wider write-local in allowlisted worktrees,” but Hermes’s workspace is a **VPS volume**; local files only arrive via git/upload. “Local” is the wrong invariant and will confuse allowlist UX and 12’s gateway rules.

3. **Three (or four) approval channels**  
   Approvals: Inbox + console banner + Hermes Telegram inline buttons; urgent items also go through a **separate JunOS Telegram bot**. “First answer wins” is stated, but not which prompts fire together, how duplicates are suppressed, or how “resolved elsewhere” is shown in the console. Risk of triple-ping and race UX.

4. **Control plane sprawl**  
   Shim may drive Hermes via CLI/`docker exec`, shipped web UI HTTP, and/or Telegram-like gateway delivery. Open questions still ask which is primary. Lifecycle “Restart/Update” via Docker API proxy is a fourth plane. Spec never ranks a single supported path for Phase 3.

5. **Tailscale status**  
   Deployment treats Tailscale+shim as decided; Open questions still say Tailscale is **not set up** and mock-only until Phase 3. Intent is clear; readiness language conflicts.

6. **Unreachable vs stop UI**  
   Status adds `unreachable`, but Stop behavior shows header copy `stop not confirmed` when the VPS is down. Are these one state with two labels, or competing presentations?

7. **Unified session vs two left-rail streams**  
   Directives should behave “exactly like a Telegram message (same memory, same session),” yet the screen is “directive stream” **and** “chat with Hermes.” Spec never says whether those are one transcript, two tabs, or Telegram-mirrored messages interleaved with JunOS sends.

---

## Gaps

| Area | Missing |
| --- | --- |
| Wire format | Auth headers, error bodies, SSE event versioning, backpressure, max payload size for `input`/`output` |
| Memory | Volume path still open; blocks real Memory tab; no retention/export/delete |
| Web UI spike | Port/auth/API and billing unknown, but Phase 3 real shim depends on them |
| Settings | Header has Settings; no IA, no autonomy/echo/timeout controls placed |
| States | Empty queue, idle timeline, unreachable, approval countdown, upload-in-progress for “Give to Hermes” |
| Mobile | Telegram is phone-first; console has **no** responsive story |
| Multi-agent | Data model allows many agents; UI assumes one Hermes |
| Skills | Toggle mid-run? Persist across container restart? |
| History | Who stores JunOS↔Hermes↔Telegram transcript; catch-up after reconnect only gestured at |
| Self-containment | Relies on 07/09/12 for approvals, Kanban, stop machine without restating the console-facing contracts |

Acceptance (“mock validated against a **recorded real** Hermes session including Telegram before Phase 3 is done”) is underspecified: who records, what format, and how that works while Tailscale/shim are absent.

---

## Unrealistic scope

For one console spec, this already bundles:

- Remote bridge + mock-first UI  
- hermes-agent-shim + Docker sidecar + restricted Docker API proxy + health→status  
- Telegram observe/mirror + optional echo + dual-bot approvals  
- Memory diffs, skills, raw logs, queue, Kanban pickup, file upload handoff  
- Optional embed of Hermes’s own web UI  

Any one of “restricted docker proxy,” “stable web UI API,” or “Telegram parity without the bot token” is a project. Keeping **embed Hermes web UI** as an open option without a hard “out of v1” line invites unbounded Phase 3.

Also optimistic: Stop “within a few seconds” across VPS + tunnel + container + agent loop, with side-effect listing when unreachable—hard without a defined cancel protocol in the wire format.

---

## Security / privacy risks

**Strong already:** private network only; bridge token in OS keychain; Hermes publishes nothing; bot token stays on VPS; no docker.sock in Hermes; non-root / dropped caps / resource limits called out.

**Gaps / risks:**

1. **SSE `input`/`output` for `shell|browser|file|api`** will carry secrets, tokens, file contents into JunOS UI, logs, and any recording used for mock validation. No redaction, truncation, or “sensitive step” policy.

2. **Logs tab = raw** is a credential hose next to a chat. Needs retention, filter, and copy warnings in the spec if it stays.

3. **Telegram mirror into JunOS** moves private chat into another system; no retention, access control, or “don’t index/train” note.

4. **`echo to Telegram` off by default** is good; still need a rule that handoff context (local file uploads, project paths) is not echoed unless explicitly included.

5. **JunOS Telegram bot** for approvals: allowlist is stated for Hermes bot only—“confirm allowlist” is unverified. Same requirement must apply to the JunOS bot; compromise of Telegram account ≈ spend/destructive approval.

6. **Upload / git clone onto VPS**: no deny-list for `.env`, keys, or post-task wipe of workspace volume.

7. **Shim with Docker rights** is higher privilege than Hermes; compromise of shim = container lifecycle + mounted volumes. Spec should treat shim as the security boundary and say so.

8. **Memory chips** surface “key facts” (likely PII) in the main chrome with no sensitivity marking or quick scrub.

9. **Egress**: container hardening omits network policy (agent browsing/APIs from VPS).

---

## UI / design quality (impeccable Operate + tasteskill app-screens)

Mode: **Operate**—precision and scanability beat expression. App-screens: colour on data not chrome; no hero header; first screen answers **one** job; avoid generated-dashboard tells.

### Hierarchy / IA

The Screen paragraph packs **six jobs** into one viewport: status/control, directives, chat, live activity, plus Memory/Skills/Logs/Queue. App-screens’ failure mode (“nothing to do”) is inverted here: **everything to do**.

The console’s real question is roughly: *What is Hermes doing, and does it need me?*  
That implies:

- Primary: activity (or unified transcript) + approval  
- Header: status + Pause/Stop only  
- Memory / Skills / Logs / Queue: secondary, not equal bottom tabs competing with the live task  

“Matches mockup” currently freezes a **monitoring dashboard** layout rather than a supervision console.

### Density / layout

- **40% left = directive stream + agent chat** is two timelines in one column—high cognitive load (impeccable: decision points with many visible options). Prefer one chronological stream with provenance (`via Telegram` as plain text, not a badge farm).  
- **Right 60% step cards** + **bottom four tabs** + approval **banner** + Inbox is stacked chrome.  
- No statement of what must appear above the fold at 1440×900 (app-screens §2.2).

### Components / anti-slop tells

| Spec choice | Lens problem |
| --- | --- |
| Step **cards** with **icons** | App template tell; prefer tight list/timeline rows, type+status, not icon tiles |
| Status **pill** + **pulse** | Colour/motion on chrome; status is data—prefer calm label + one accent when `working`/`error` |
| Running step **shimmers** | Decorative loading; prefer elapsed `ms` + explicit `running` (honest states) |
| Memory **editable chips** + pin | Chip/pill clutter; key facts want a short editable list or diff view, not tags |
| `via Telegram` **badge** | Eyebrow/pill habit; fold into metadata line |

### Typography / legibility

Spec is silent on type. For this surface you need at least:

- UI sans for chrome; **monospace only** for step I/O and Logs (house exception for real code)  
- Cap display sizes (app-screens: headings often ≤24px)—no marketing-scale header  
- Measure and max-height for expandable I/O or shell dumps will wipe hierarchy  
- Raw Logs vs chat vs stream: three text systems with no density or contrast roles  

### Spacing / contrast / colour

No tokens, tone steps, or contrast requirements. Risks: pulsing pill + shimmer + banner + status colours → rainbow chrome (app-screens: ~3% coloured pixels). Separation should be tone steps / quiet rules, not card shadows or glowing “working” states (taste: no shadows at rest, no glows).

### Motion

Pulse + shimmer with no `prefers-reduced-motion`, no motion budget, and no “motion explains state once” rule. Impeccable/taste: transform/opacity only; content must remain if motion is off. Continuous pulse while `working` will fatigue on a day-long supervision screen.

### High-stakes UX (approvals / stop)

Approvals and Stop are the emotional peaks—spec barely designs them:

- No countdown UI for 30‑min auto-deny  
- No plain-language digest of what will happen  
- Unreachable + Stop: `stop not confirmed` and side-effect list are named, not laid out (blocking, modal, or header-only?)  
- Dual Telegram + Inbox resolution needs clear “You approved in Telegram” in-console feedback  

### Product face (tasteskill)

Nothing Hermes-specific in the UI description (name/status/model/uptime is generic agent-console kit). Missing one signature element from the product’s world (e.g. unified Telegram+JunOS transcript, or VPS/workspace breadcrumb as the object of supervision)—so the mockup will read as “any agent dashboard.”

---

## Priority fixes (spec-only)

1. **Pick one write path for memory** and one primary Hermes control plane; demote the rest to fallback.  
2. **Collapse approval surfaces** to Inbox + one Telegram path (or hard-spec dedupeing).  
3. **Rewrite Screen around one job**: live activity + approval; tabs become a drawer/settings. Replace cards/chips/pulse/shimmer with list density, calm status, and honest running/elapsed states.  
4. **Add a redaction + Logs policy** for stream `input`/`output` and raw logs.  
5. **Rename autonomy** away from “write-local”; scope allowlists to VPS workspace / git worktrees.  
6. **Hard-cut v1 scope**: no embedded Hermes web UI; mock until Tailscale+shim; record the validation fixture format.

---

I did not run impeccable’s dual-agent critique/detector (target is markdown, not a viewable UI). If you want that on the actual Hermes mock once it exists, switch to Agent mode and point at the route or HTML.
