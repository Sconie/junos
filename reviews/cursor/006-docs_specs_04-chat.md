## Findings (ranked)

### 1. High — Cross-provider history replay is a privacy/ToS landmine
**Ref:** Behavior rules — *"Switching model mid-thread is allowed; history is replayed as plain messages."*

**Why:** Replaying a thread into Claude after Codex (or vice versa) sends prior content, attachments, and project paths to a different vendor. Spec 12’s threat model cares about leakage via agents/tools, but not this. Spec 03’s “subscriptions, not API keys” does not make multi-vendor transcript sharing safe or ToS-clear.

**Fix:** Require an explicit confirm when the next send would leave the current provider (“Send N prior messages to {provider}?”). Default: branch into a new conversation with a summary, or replay only user turns. Persist `provider` per message (already in 02) and never silently re-send another vendor’s assistant text as context.

---

### 2. High — Context tools invent capabilities the security model does not define
**Ref:** Context panel — *tool toggles (Files, Web, Hermes, Tasks)*; Behavior — *“small tool set (read file, list projects, create card, create task)”* + *approval policy in 12*

**Why:** Web browse + Hermes handoff + Tasks are not in the listed tool set. Web content is untrusted in 08/12; turning Web on in chat with no “tools off while reading untrusted content” rule creates prompt-injection write paths (create card/task, Hermes). Hermes as a toggle blurs Chat vs agent chat (07) and bypasses the console/Inbox approval story.

**Fix:** Phase the toggles. Phase 1: Files only (allowlisted paths from 11). Map each toggle to a named tool id, approval class (12), and disabled reason. Drop or rename Hermes/Web/Tasks until adapters exist; Hermes belongs on `@agent` / `/hermes` / agent chats, not a silent tool toggle.

---

### 3. High — Phase 1 surface is a full IDE chat product, not “chat that works”
**Ref:** Features (composer `@`/`/`, tool-call cards, branch, Kanban, save to file, Context panel, slash set) vs Acceptance (Claude stream + model/effort + Connect) vs Roadmap Phase 1 (*streaming chat, conversation history, routing fallback*)

**Why:** Acceptance and 13 define a thin path; Features reads as Cursor-complete. Implementers will either ship half-broken chrome or slip Phase 2–4 work into Phase 1. Compare mode is already phase-tagged; almost everything else is not.

**Fix:** Split Features into **Phase 1 must / Phase 2+ later**. Phase 1: list, thread, composer, model+effort, stream+cancel, history, Connect empty state. Park branch, Kanban, `/task`/`/card`/`/hermes`, compare, rich tool cards, `@agent` behind explicit later phases matching 13.

---

### 4. High — “Branch from this message” has no model or API
**Ref:** Messages — *“branch from this message”*; API sketch; `conversation` / `message` in 02 (no `parent_message_id` / `branch_id`)

**Why:** Branching is a hard product feature (tree UI, title, which branch streams). Spec and schema omit it; UI will invent forks that cannot persist or export.

**Fix:** Either cut from Phase 1–3, or add `message.parent_id` / `conversation.root_id` + `GET/POST` branch semantics and list UX (“Branches” under the thread). Until then, replace with “Retry with another model” only.

---

### 5. High — Attachments / project folders vs allowlist are underspecified
**Ref:** Composer — *“attach files or project folders”*; Context — *selected project (sets `cwd`)*; 11 — *explicit allowlist; nothing else indexed*; 12 — *write-local in allowlisted folders*

**Why:** Arbitrary folder attach + CLI `cwd` is a destructive/read-all surface. API `{attachments[]}` does not say path vs `file_id`, size caps, or that paths must be under an allowlisted project. Conflict with 11’s privacy (“content only sent when attached”) if Context “attached files” auto-injects.

**Fix:** Attachments = `file_id` from indexed allowlist (or picker constrained to allowlist). Project select = only `project` rows. Document max size/count, and that context injection is opt-in per send, not ambient.

---

### 6. Med — Compare mode phase contradicts the roadmap
**Ref:** *“Compare mode (phase 3)”* vs 13 Phase 4 — *“compare mode”*

**Why:** Wrong phase = wrong sequencing next to Hermes/Kanban (Phase 3) vs Scout/Home (Phase 4).

**Fix:** Change to **phase 4** (or move compare into Phase 3 in 13 and keep docs aligned).

---

### 7. Med — Shared component vs agent list IA conflict
**Ref:** Purpose — *agent chats in the same component with an agent badge (see 07)*; Layout — *Today / This week / Older*; 07 — *Left list groups by agent*

**Why:** One list cannot be both chronological and per-agent without a mode. Badge alone does not satisfy 07. Risk of two half-UIs or broken navigation between Chat and Agents.

**Fix:** Specify modes: `kind=chat` → time groups; `kind=agent` → group by agent (07). Shared primitives (composer, message render, stream), not one layout. Document route split (`/chat` vs `/agents/:id`) and what the badge does.

---

### 8. Med — API sketch cannot support the feature list
**Ref:** API sketch (4 endpoints) vs Features (attachments, cancel, tools, branch, slash→task/card, SSE)

**Why:** Missing: `GET /conversations/:id`, message history pagination, attachment upload, patch title, delete/archive, tool-approval events on the stream, cancel authz, compare. `POST .../messages` returning SSE fights 01’s global event bus (`chat.message`, `run.*`) without a join story.

**Fix:** Expand the sketch to match Phase 1 only; state that UI subscribes to `run.*` SSE and that `POST /messages` returns `{runId}` (or document why dual streams). Add attachment and history endpoints when those features are in-phase.

---

### 9. Med — Design direction locks in glass / violet / Inter “AI kit” tells
**Ref:** Layout *“matches mockup”*; stitch prompt — *“User messages right-aligned in a subtle violet tint”*; 14 — Translucent Glass, `--accent: #8B5CF6`, `--font-ui: Inter`, backdrop blur

**Why:** Operate-mode chat (impeccable) needs scanability and product face, not marketing glass. design-taste app-screens ban glass/backdrop-blur, violet/indigo accents, and Inter-on-dark-kit as generated-dashboard tells. Spec 04 never defines hierarchy, density, or what is JunOS-specific—only a three-column chat clone.

**Fix:** In 04 (or a Chat subsection of 14): opaque panels (tone step, no blur nesting), accent on connection/route status and active stream only—not user-bubble fill; one distinctive move (e.g. route line in message meta, not violet bubbles). Prefer 14’s drawer widths + 760px measure with explicit column collapse. Call out stitch violet bubbles as anti-reference for implementation.

---

### 10. Med — Message chrome is an action landfill (hierarchy / cognitive load)
**Ref:** Messages — header + markdown + code + tables + thinking + tool cards + retry + branch + Kanban + save

**Why:** App-screen rule: one primary job per region; >4 visible options spikes load. Every assistant turn becomes a toolbar. No overflow/kebab, no “primary vs rare,” no states for when Kanban/Hermes are unavailable.

**Fix:** Always-visible: copy code, retry. Overflow menu: branch, Kanban, save, “open run.” Collapse thinking/tools by default; show one status line (model · effort · route). Gate Kanban/Hermes actions until those phases.

---

### 11. Med — Required UI states are missing (14 + app-screen empty/error rules)
**Ref:** 04 has no loading/empty/error/offline; 14 — *States every screen needs*; Acceptance only covers logged-out Connect

**Why:** Current `Chat.tsx` empty copy is generic (“Start a conversation”). Without skeletons, stream failure, rate-limit (03), and daemon-down (14), Phase 1 “done” will feel broken under real CLI failures.

**Fix:** Add a States section: empty (New chat CTA + last model), streaming (cancel), cancelled-partial, provider `rate_limited` / `needs_login`, daemon banner, retry-failed-run. Match 14’s empty “next action” pattern with trade words (“No chats yet — ask Claude about this repo”), not template nouns.

---

### 12. Med — “Keyboard-first” claimed globally, Chat has no map
**Ref:** 14 — *Keyboard-first (list in each spec)*; 07 lists `j/k` etc.; 04 only Enter / Shift+Enter

**Why:** Chat will be the highest-frequency screen; no list nav, no focus to composer, no model/effort shortcuts → inconsistent product and weak Operate craft.

**Fix:** Add shortcuts: `n` new, `↑/↓` or `j/k` in list, `/` focus search, `Esc` stop stream / close panel, `⌘⇧M` / `⌘⇧E` model/effort, `]` toggle Context. Document focus order for the three columns.

---

### 13. Med — Token estimate + auto-title burn budget and leak content
**Ref:** Context — *token estimate*; Behavior — *Titles auto-generated by the cheapest connected model after the first exchange*; 03 usage budget

**Why:** Estimate that hits a provider sends content off-machine. Auto-title after every first exchange spends shared subscription quota and may title from sensitive text. No local tokenizer / offline rule.

**Fix:** Prefer local/heuristic estimate (chars≈tokens) labeled “approx.” Titles: local heuristic first (first user line truncated); optional cheap-model title behind a setting, after redact of paths/secrets, once per conversation.

---

### 14. Med — Responsive three-pane chat unspecified vs 14
**Ref:** Layout three columns; 14 — *Below 900 px … side panels become full-screen sheets*

**Why:** Conversation list + Context + thread on phone without “one region at a time” (app-screens §12) will ship an unusable squeeze or contradict the shell.

**Fix:** Specify: &lt;900px → thread full screen; list and Context as sheets; composer sticky; no simultaneous three panes. Match 14 bottom tab (Chat).

---

### 15. Low — Effort disabled copy disagrees with Connections
**Ref:** Effort — *“greyed where the model has no such level”*; 03 — *“n/a for this model”*

**Why:** Greyed control without explanation fails “no information by colour alone” (14) and a11y.

**Fix:** Disabled segment + visible “n/a for this model” (03); don’t use grey alone.

---

### 16. Low — Header copy “via subscription” is slogan, not signal
**Ref:** *“Claude Opus, high, via subscription”*; stitch same pattern

**Why:** Every answer is via subscription by product law (00/03). Wastes meta hierarchy; sounds like marketing chrome (taste: colour/words on chrome, not data).

**Fix:** Show *model · effort · provider/route* and fallback only when it happened (*“fell back from Codex”* per 03). Drop “via subscription.”

---

### 17. Low — Schema `pinned` unused; list UX thin
**Ref:** Layout list groups; 02 `conversation.pinned`; no pin/archive/delete in 04

**Why:** Gaps vs data model and daily Operate needs (pin project chats, archive noise).

**Fix:** List row actions: pin, rename, archive/delete; show pinned above Today. Or remove `pinned` until specified.

---

### 18. Low — Slash commands duplicate visible pickers (clutter vs power)
**Ref:** `/model`, `/effort`, `/project` beside Model/Effort pickers and Context project

**Why:** Three ways to set the same state without saying which wins or whether `/` is CommandPalette (10) vs in-composer.

**Fix:** Keep `/task`, `/card`, `/hermes` as actions; drop `/model`/`/effort`/`/project` or make them aliases that open the same popovers. Clarify composer `/` vs global ⌘K.

---

### 19. Low — Incumbent `Chat.tsx` encodes bubble-chat defaults the spec never corrects
**Ref:** `src/pages/Chat.tsx` bubbles + toolbar selects; `index.css` accent-filled user bubble; 04 “matches mockup” only

**Why:** Without layout/type/density notes, the path of least resistance is generic chat UI (skill: “could belong to anyone”). Spec should constrain the rebuild, not only list features.

**Fix:** Add a short **Visual / layout** subsection: no accent-filled user pills; meta above assistant as 12px secondary; composer as floating opaque bar (shadow only while elevated); list density (row height, provider mark as mono/letter not logo salad); max measure 760px centered in the thread column.
