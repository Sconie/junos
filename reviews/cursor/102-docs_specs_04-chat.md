⚠️ Spec-only review (no rendered UI / detector). Mode: **Operate** / app screen. Lens: impeccable Operate + design-taste `app-screens`.

## Verdict

`04-chat.md` is a feature inventory for a Cursor-class chat, not an Operate brief. Phase 1 acceptance is three happy paths; Features already assume tool cards, branching, Kanban, agents, folder attach, and compare. Craft (states, density, collapse, motion, a11y) is almost absent, so implementers will invent a high-chrome clone with weak hierarchy and fuzzy trust boundaries.

---

## Contradictions

1. **Rich history vs “plain message” replay**  
   Messages include thinking, tool-call cards, attachments, route metadata; switching models “replays history as plain messages.” Unclear what is stripped and whether the new provider receives prior tool I/O, file contents, or thinking.

2. **Tool toggles vs approval (→ 12)**  
   Context panel exposes Files / Web / Hermes / Tasks toggles; behavior only says tools sit “behind the approval policy in 12.” Toggle = session enablement, per-call gate, or both? Undefined.

3. **Three ways to set project**  
   `@` project, `/project`, and Context “selected project (sets `cwd`)” with no source of truth or precedence.

4. **“Stored locally” vs HTTP API**  
   Local conversations vs `POST /conversations`, cursor pagination, SSE runs. Local daemon API, remote sync, or both? Auth and data ownership are undefined.

5. **Features list vs Phase 1 acceptance**  
   Features load slash commands, `@`, tool cards, branch, Kanban, save-to-file, Context, folder attach; acceptance is only stream Claude, model/effort in the run record, and logged-out Connect. What Phase 1 actually ships is contradictory.

6. **Effort when the model changes**  
   Effort greys unsupported levels; acceptance requires effort to affect the run. No rule for switching to a model that lacks the current level (clamp, clear, block send).

7. **Auto-title vs disconnected providers**  
   Titles use “cheapest connected model” after the first exchange; logged-out composer cannot send. Partial disconnect after send, or zero models for titling, is unspecified.

8. **Agents “in the same component” vs chat Purpose**  
   Purpose is “talk to any connected model”; agents with badges are deferred to 07 but still share this surface. Same composer/tools/approval path or a different mode is never decided here.

---

## Gaps (Operate / craft)

| Area | Missing |
| --- | --- |
| **Primary job** | No one-line job (“compose → stream → resume”). Feature dump instead of task flow. |
| **Layout** | “Matches mockup” with no link, widths, list default state, or when Context opens. |
| **Responsive** | Only Context is collapsible. Phone: list/thread/sheet handoff absent (app-screens: one region at a time). |
| **States** | No empty list/thread, first-run, streaming skeleton, reconnect, tool denied, attach fail, rate limit. Logged-out is the only error path. |
| **Message chrome** | Header “model, effort, route” on every bubble — always on, hover, or collapsed? |
| **Actions** | Retry / branch / Kanban / save — always visible vs overflow; confirmations. |
| **Streaming** | Cancel keeps partial — “stopped” label, retry vs continue, cancel mid-tool. |
| **Thinking / tools** | Default collapsed? Stream into the region? Failed tool card? |
| **Compare (phase 3)** | In Features with no IA (split Center? second composer?). |
| **Motion** | None: panel/thinking collapse, token paint, `prefers-reduced-motion`. |
| **Type / colour / contrast** | Deferred entirely; no roles for meta vs body vs code. |
| **a11y** | Keyboard for `/` `@` pickers, focus return, live region for stream — absent. |
| **Search** | Conversation search mentioned once; ranking, scope (titles vs body), empty results — none. |

---

## Unrealistic / bloated scope

For Phase 1, the doc already describes a full agent IDE chrome:

- Attach files **and** project folders  
- `/` commands + `@` (file, project, agent)  
- Model + effort + route on messages  
- Tool-call cards + collapsible thinking  
- Context: tools + tokens + project  
- Branch, Kanban, save-to-file  
- Agents in-component (→ 07)  
- Compare parked in the same Features list  

App-screen guidance: one frequent job one click from the first screen; colour and chrome stay quiet. This invents chrome before the thread. **Phase 1 acceptance should name a cut set**; the rest belongs in phased bullets or Open questions (like voice/personas).

---

## Security / privacy (implied, not controlled)

1. **Cross-provider replay** — plain replay can ship prior tool results, paths, or snippets to another vendor with no consent/redaction rule.  
2. **Attachments + folders + `cwd`** — scope, symlinks, secrets in tree, size limits, path vs content to the model — unspecified.  
3. **Web / Hermes toggles** — egress and what leaves the machine only pointed at 12.  
4. **Save to file / send to Kanban** — write targets, overwrite, approval undefined.  
5. **Local conversations** — encryption at rest, delete/export, whether run/SSE logs retain prompts.  
6. **API sketch** — no auth, ACL, or attachment validation on `POST .../messages`.  
7. **`/hermes` and `@` agent** — injection/trust boundary absent in this doc.  
8. **Token estimate** — fine if local; risky if derived remotely and exposed broadly.

---

## UI / design quality

**Hierarchy**  
Center thread should dominate. Spec gives equal weight to list chrome, composer gadgets, and Context. Per-message “model, effort, via subscription” competes with content (Operate: meta secondary, tight scale). No product mark/name in the shell — taste/app-screens: could be any AI chat.

**Density**  
Provider icon + date buckets + search + New chat; composer with attach, `/`, `@`, model, effort; every message with actions + optional thinking/tools. Without progressive disclosure this fails “quiet chrome, colour on meaning” and piles >4 visible decisions at send.

**Spacing / layout**  
Three columns + bottom composer need gutters, list width, Context default-closed on first run, and a rule for Compare as a fourth surface. “Collapsible” alone invites a crushed Center. Max readable measure (elsewhere ~760px) is not stated here.

**Typography**  
Unspecified. Risk: same weight for list titles, bubble body, and route meta. Code/tables need overflow rules (scroll vs wrap) — absent. App-screens: one grotesk, title ~18–24px, meta 11–12px ≥4.5:1 — none of that is constrained.

**Motion**  
Streaming is the only motion-like behavior; no duration, no reduced-motion, no “state only, 150–250ms.” Thinking/Context collapse unspecified → jank or decorative choreography later. App-screens: no motion floor; feedback only.

**Legibility / contrast**  
Effort “greyed” and disabled providers with no contrast floor. Token estimate and dim meta on glass/dark (if the product goes that way) are classic failures; this doc never sets ink roles or disabled-legibility (“disabled stays legible and says why”). Segmented Max effort beside Low invites equal visual weight for unequal use.

**Phone**  
Unmentioned. App-screens: sidebar → sheet; list and thread one-at-a-time; Context under main or as tab. Leaving this open guarantees a desktop three-pane squeezed onto 390px.

**Product face**  
Trade vocabulary is thin (“New chat”, generic tool names). Empty/first-run copy that teaches the job is missing — the strongest app-screen differentiator after quiet chrome.

---

## Priority fixes (if you edit the spec)

1. Split **Phase 1 must-ship** from later Features; shrink acceptance to match.  
2. Resolve **local vs API**, **project source of truth**, and **replay redaction** in Behavior rules.  
3. Add an Operate craft block: empty/loading/error, Context default, message meta density, action overflow, streaming cancel UX, keyboard/`live` region, phone collapse.  
4. Move Compare / personas / voice-style items out of the main Features list until IA exists.

Questions skipped: Ask-mode doc review only; no rendered target for impeccable detector questions.
