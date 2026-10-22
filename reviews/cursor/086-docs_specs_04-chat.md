⚠️ Spec-only review (no rendered UI / detector). Mode: **Operate** / app screen (chat is worked in). Lens: impeccable Operate + design-taste `app-screens`.

## Verdict

`04-chat.md` sketches a familiar three-pane AI chat but under-specifies Phase 1 vs later, stacks too many entry points for the same jobs, and leaves the actual Operate craft (states, density, collapse, motion, empty/error) almost blank — while the feature list already implies a high-chrome Cursor/ChatGPT clone with weak product identity.

---

## Contradictions

1. **Rich messages vs mid-thread model switch**  
   Messages include thinking, tool-call cards, attachments; behavior says switching models “replays history as plain messages.” Unclear what is stripped (tools, thinking, attachments, route) and whether the new provider sees prior tool I/O.

2. **Tool toggles vs approval policy**  
   Context panel has tool toggles (Files, Web, Hermes, Tasks); behavior defers tools to “approval policy in 12.” Toggle = enablement, per-call approval, or both? Spec never says.

3. **Three ways to set “project”**  
   Composer `@` project, `/project`, and Context “selected project (sets `cwd`)” — no source of truth or what wins.

4. **Local storage vs HTTP API**  
   “Stored locally” vs `POST /conversations`, `GET /conversations?cursor=`, SSE runs. Local-only cache, local daemon API, or remote? Auth, sync, and who owns the data are undefined.

5. **Features vs Phase 1 acceptance**  
   Features list slash commands, `@`, tool cards, branch, Kanban, save-to-file, Context panel, folder attach; acceptance is only stream Claude, model/effort in run record, logged-out Connect. Unclear what Phase 1 actually ships.

6. **Effort when model changes**  
   Effort is greyed when unsupported; acceptance says changing effort changes the run. No rule for switching to a model that doesn’t support the current effort (clamp, clear, block send?).

7. **Auto-title vs no provider**  
   Titles use “cheapest connected model” after first exchange; logged-out composer can’t send. First exchange with only one provider, or all disconnected after send — title path unspecified.

---

## Gaps (craft / Operate)

| Area | Missing |
| --- | --- |
| **Jobs** | No primary job statement (“send / read / resume”). Inventory of objects/fields is a feature dump. |
| **Layout** | “Matches mockup” with no mockup link or measurements. No widths, collapse rules for list, or when Context opens. |
| **Responsive** | Phone/narrow not mentioned; only Context is collapsible. |
| **States** | No empty list, empty thread, streaming skeleton, reconnect, tool denied, attach failed, rate limit. Logged-out is the only error path. |
| **Message chrome** | Header “model, effort, route” on every bubble — default density, collapse, or only on hover/focus? |
| **Actions** | Retry / branch / Kanban / save-to-file — overflow menu vs always-visible; confirmation for branch/Kanban. |
| **Streaming UX** | Cancel keeps partial — cursor, “stopped”, retry vs continue, whether cancel is mid-tool. |
| **Thinking / tools** | Default collapsed? Streaming into collapsible region? Failed tool card? |
| **Compare (phase 3)** | Listed under Features with no IA (splits Center? second composer? shared Context?). |
| **Motion** | None: panel collapse, stream token paint, reduced motion. |
| **Type / colour** | No scale, roles, or semantic states; deferred entirely. |
| **a11y** | Keyboard for `/` `@` pickers, focus return, live region for stream — absent. |

---

## Unrealistic / bloated scope

For a Phase 1 chat surface, the doc loads roughly a full agent IDE:

- Attach files **and** project folders  
- `/` commands + `@` mentions (file, project, agent)  
- Model + effort + route on messages  
- Tool-call cards + collapsible thinking  
- Context panel with tools + tokens + project  
- Branch, Kanban, save-to-file  
- Agents in the same component (→ 07)  
- Compare mode parked in the same Features list  

App-screen guidance: one frequent job one click from the first screen; chrome ~minimal. This spec inventories chrome before the thread. **Phase 1 acceptance should match a cut feature set**; everything else belongs in phased bullets or Open questions (as voice/personas already are).

---

## Security / privacy risks (called out or implied, not controlled)

1. **Replay to another provider** — plain-message replay can send prior tool results, file snippets, or thinking to a different vendor without a consent/redaction rule.  
2. **Attachments + project folders + `cwd`** — path scope, symlinks, secrets in tree, max size, and whether paths or contents go to the model are unspecified.  
3. **Web / Hermes toggles** — network egress and what leaves the machine not tied to 12 beyond a pointer.  
4. **“Save to file” / “send to Kanban”** — write targets, overwrite, and approval not defined.  
5. **Local conversations** — encryption at rest, export, deletion, and whether runs/SSE logs retain prompts.  
6. **API sketch** — no auth, conversation ACL, or attachment validation on `POST .../messages`.  
7. **`/hermes <directive>` and `@` agent** — prompt/tool injection surface with no trust boundary in this doc.  
8. **Token estimate in UI** — minor info leak; fine if local-only, risky if derived server-side and exposed broadly.

---

## UI / design-quality (hierarchy, spacing, typography, density, motion, legibility, contrast)

**Hierarchy**  
Center thread should dominate; the spec gives equal billing to list, composer gadgets, and Context. Message metadata line competes with content (Operate: tighter type scale, metadata secondary). No product mark/name in the shell — taste/app-screens: screen could be any AI chat.

**Density**  
Provider icon per row + date buckets + search + New chat; composer with attach, `/`, `@`, model, effort; every message with actions + optional thinking/tools. Without progressive disclosure, this fails the “quiet chrome, colour on meaning” app-screen bar and piles decision points (>4 visible options) on send.

**Spacing / layout**  
Three columns + bottom composer needs explicit gutters, list width, Context default closed on first run, and what happens when Compare adds a fourth surface. “Collapsible” alone invites a cramped Center.

**Typography**  
Unspecified. Risk: same weight for list titles, bubble body, and “via subscription”. Code/tables need measure and overflow rules (horizontal scroll vs wrap) — absent.

**Motion**  
Streaming is the one motion-like behavior; no duration, no `prefers-reduced-motion`, no guidance that motion is state-only (150–250ms). Collapse of thinking/Context unspecified → either jank or decorative choreography later.

**Legibility / contrast**  
“Greyed” effort levels and disabled providers need a real disabled pattern (not low-contrast text-only). Connect link inside a disabled group needs clear hit target and focus. Collapsible thinking defaults matter for scanability of the thread.

**Anti-slop / specificity**  
Tool-call **cards**, segmented effort, popover picker, badge for agents — all category-default. Spec never names one Juno-only thread element (route as first-class status, local-project `cwd` as visible place, approval as a first-class control — any one would help). House rules: avoid icon-only rows and decorative card chrome; treat tool UI as functional panels with honest states (pending / approved / denied / error), not tinted feature cards.

**Emotional / empty**  
No first-run empty thread copy in product language; only logged-out composer copy is implied. Peak moment (first successful stream) and failure valley (cancel, tool deny, disconnect) are undesigned.

---

## Priority fixes for the doc (not implementation)

1. **Split Phase 1 vs later** so Features and Acceptance match.  
2. **Resolve local vs API** and the model-switch replay contract (what is sent, what is redacted).  
3. **One project selection model**; define tool toggle vs approval.  
4. **Add Operate essentials**: empty/loading/error, collapse defaults, message action IA, narrow layout, streaming/cancel copy.  
5. **Privacy subsection**: attachments, `cwd`, provider replay, Web/Hermes egress — even if details live in 12.  
6. **Design constraints in one short block**: thread-first hierarchy, Context default, metadata secondary, state-only motion, no phone = out of scope for v1.

---

Questions skipped: Ask-mode doc review; no interactive follow-ups required unless you want the same lens on `07` / `12` or the mockup this file claims to match.
