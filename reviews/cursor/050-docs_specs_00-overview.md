**Verdict:** As a product index, `00-overview.md` is clear; as a design/IA brief for an Operate product, it over-scopes, under-prioritizes, and locks a visual direction both skills treat as a tell.

Mode: **Operate** (personal command center). The overview should read like an app-screen brief: one default job, quiet chrome, colour on meaning. It currently reads like a feature catalogue plus a glass aesthetic commitment.

---

### Contradictions

1. **“Boring and changeable” vs “Translucent Glass”**  
   Principle 5 wants small, plain, swappable pieces. The Screens line commits the UI to Stitch “Translucent Glass.” Glass (blur, frosted panels, floating chrome) is the opposite of boring Operate UI, and design-taste bans it outright (“No glass. No backdrop blur panels, no floating pill navigation”). Impeccable Operate mode wants earned familiarity, not decorative surface language. The doc picks both sides.

2. **“Subscriptions, not API keys” vs “credentials live on Jonas’s machine”**  
   Principle 1 rejects API keys; principle 2 assumes credentials on disk. CLI sessions, OAuth cookies, and tool tokens are still secrets. The overview never says what is allowed (session reuse) vs forbidden (raw provider keys), so “no API keys” can be read as absolute when the rest of the system needs secrets.

3. **“One event stream” vs the screen list**  
   Principle 3 says Inbox, Home, and Kanban are views over one stream. The table also lists Chat, Agent chats, Tasks, Workflows, Hermes, Scout, Files, Connections—without saying whether they are the same stream, writers into it, or separate worlds. Agent chats and Inbox share one spec while Chat is separate, so “one place to chat” and “agent chats” compete without a boundary.

4. **“Local first” vs “any model he already pays for”**  
   Local data/credentials with outbound CLIs means prompts, files, and findings leave the machine. The overview never states that tradeoff, so “local first” can be misread as “nothing leaves.”

---

### Gaps

| Gap | Why it matters |
|---|---|
| No primary job / default screen | App-screen rule: first screen answers one question and puts the most frequent job one click away. The product line lists six jobs with equal weight. |
| No IA hierarchy | Eleven destinations, no “core / secondary / settings,” no shell model (sidebar vs command palette vs tabs). Nav will be dense by default. |
| No MVP cut inside this doc | Non-goals trim hosting/billing/mobile, not surface count. Roadmap is linked but this overview still presents all screens as the product. |
| No approval UX sketch | “Human stays in charge” has no place (modal, inline, inbox item) or severity model—only a pointer to security. |
| No empty/error/attention model | A “what needs attention” product with no definition of attention, urgency, or quiet empty states. |
| Design system deferred without constraints | Points at `14-ui-system` but already pins mockups. Tokens, density, contrast, motion get no floor here. |
| Single-user threat surface omitted | Local daemon + web UI is the architecture; binding, who can talk to the daemon, and browser-origin trust are absent even at one-liner level. |

---

### Unrealistic scope

For one user and a draft v0.1 overview, the implied surface is a full personal OS:

- multi-provider chat + effort picker  
- agent supervision (Hermes)  
- inbox + agent chats  
- scheduled/on-demand workflows  
- Scout  
- Kanban  
- files/projects  
- connections/routing  
- unified event stream across all of it  

Non-goals only exclude multi-user, native mobile, public hosting, billing, and a plugin marketplace. That still leaves an amount of Operate UI that usually needs phased “ship Home + Chat + Inbox first” language *in this index*, not only in a linked roadmap. Without that, every downstream spec will treat parity across eleven screens as in-scope.

---

### Security / privacy risks (called out by this doc’s own claims)

1. **Local daemon + browser client** — Any page that can reach the daemon can drive agents, read files, and use credentials. Overview never names localhost auth, origin checks, or “UI is not a trusted peer.”
2. **File/project browsing + external models** — Principle 1 routes work through paid CLIs; principle 2 claims local-first. Path for redaction, allowlists, or “don’t send this folder” is missing.
3. **Approvals as principle only** — Destructive/outward actions need a concrete gate. Vague “approve anything destructive” fails when Scout, crons, and Hermes run unattended.
4. **Secrets under “no API keys”** — Session stores, CLI auth caches, and SQLite event history are high-value local data; overview doesn’t classify them.
5. **Single-user assumption** — Fine as a non-goal, but shared-machine / family PC / remote access isn’t acknowledged as out of threat model.

---

### UI / design-quality problems (skills lens)

These are problems *encoded by the overview*, not judgments of unbuilt pixels.

**Hierarchy**  
Equal screen table + kitchen-sink one-liner → no visual or IA primary. Impeccable Operate and design-taste app screens both want: product named in the shell, one question per screen, colour on data/actions not chrome. This doc doesn’t define that for Home (or any screen).

**Density / navigation**  
Eleven top-level destinations almost guarantees a heavy shell (long sidebar or icon rail). App-screen guidance: navigation recedes; active state is quiet. A glass command-center mockup set usually does the opposite (chrome-forward, frosted panels).

**Typography / legibility / contrast**  
“Translucent Glass” typically means text on blur, layered panels, soft neutrals—weak contrast and fuzzy hierarchy. Design-taste: running text in full ink; surfaces separated by tone steps, not glass. Operate: restrained colour, semantic states—not atmosphere.

**Spacing / composition**  
No density target (glance dashboard vs dense ops). Home-as-attention + Kanban + Inbox risk three overlapping “what’s next” compositions without a stated difference.

**Motion**  
Unmentioned. Operate default: 150–250 ms state feedback only; no load choreography. Glass kits often ship decorative blur/fade. Leaving motion unspecified while pinning glass invites the wrong motion budget.

**Slop / tells the doc invites**  
- Glass / backdrop blur (banned)  
- Likely floating pill nav and carded KPI/attention tiles (app-screen anti-patterns)  
- No product-specific face beyond the mockup name—risk of “well-applied kit, not JunOS”

**Internal taste clash**  
“Boring and changeable” aligns with both skills’ Operate stance. “Translucent Glass” fights them. For this product, the overview should pin **Operate constraints** (flat surfaces, one accent, quiet nav, state motion only) and treat Stitch glass as disposable exploration—or drop principle 5.

---

### Highest-leverage fixes (doc-only; not implementing)

1. Pick one aesthetic law: flat Operate UI, or glass—not both; if Stitch stays, mark it non-binding anti-reference.  
2. Name the default job and default screen in one sentence.  
3. Split screens into MVP vs later in this file.  
4. Resolve chat surfaces: one Chat model, agents as threads/inbox, not three peers.  
5. One security sentence: local daemon trust boundary + approvals + what may leave the machine.  
6. Soften “no API keys” to “prefer existing CLI/session auth; no user-pasted provider keys in the UI” (or equivalent).

I’m in Ask mode, so this is review only. Switch to Agent mode if you want these edits applied to `00-overview.md`.
