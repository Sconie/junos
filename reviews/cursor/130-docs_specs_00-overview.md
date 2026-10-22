**Verdict:** As an Operate-mode product index, `00-overview.md` is clear on *what* JunOS is for Jonas, but it locks craft to a banned aesthetic (“Translucent Glass”), lists a full OS of screens with no primary job or MVP cut, and breaks its own “ends with open questions” rule. Through impeccable + design-taste, the biggest risk is shipping a glass “mission control” kit instead of a calm, high-trust personal shell.

Context loading did not run; review is from the doc text plus both skills’ Operate/app-screen rules.

---

### Contradictions

1. **Meta vs body.** Status says every doc ends with open questions; this file ends at Non-goals. No questions, no unresolved decisions.

2. **“Translucent Glass” vs craft.** Screens must “match the Stitch Translucent Glass mockups.” design-taste house rule: no glass / backdrop blur / floating pill nav. App-screens: flat surfaces, colour on data not chrome, nav that recedes. impeccable craft-floor: glass/blur as decoration is banned. The overview *pins the wrong foundation* before `14-ui-system` can recover.

3. **“Subscriptions, not API keys” vs “credentials live on the machine.”** CLIs still store/refresh auth material. The principle reads as “no keys in env files,” but the overview never says secrets *are* credentials—just relocated. Easy to under-design vaulting.

4. **Local-first vs multi-provider chat.** Data “lives on Jonas’s machine,” but chat/agents run through remote CLIs. Prompt/history still leave the box. Overview never names that boundary.

5. **One event stream vs many attention UIs.** Home, Inbox, Scout, Hermes, Kanban are all “what needs attention,” but the table treats them as peer destinations with no primary surface or ownership rule. Same stream, five unread metaphors.

6. **Agent chats + Inbox → same spec row.** Two screen names, one link—are they one route, two tabs, or duplicate IA? Overview doesn’t say.

7. **Chat vs Agent chats.** Two chat products side by side with no split rule (human↔model vs supervise Hermes / agent threads).

8. **Non-goal “responsive web only” vs personal desktop command center.** Fine as a cut, but “local daemon + web client” without saying *desktop-first Operate density* invites sparse marketing layouts on a tool that needs scanability.

---

### Gaps (this doc should answer, even briefly)

| Missing | Why it matters |
|---|---|
| Primary job / first screen | App-screens: first screen answers one question and puts the frequent action one click away. Overview never names it (Approve? Chat? Inbox?). |
| Nav / IA model | 11 destinations, no shell, no order of importance. |
| MVP / phase cut | Everything is listed as peer; no “v0 is X.” Roadmap is linked, not reflected. |
| What a “finding” is | Principles invent findings; screens don’t define them. |
| Approval UX | “Human stays in charge” with no default: modal, Inbox item, Hermes console? |
| Identity / face | No product mark, type, or one signature element—only a Stitch style name. |
| States | No empty / error / offline / daemon-down mandate at product level. |
| Open questions | Promised; absent. |
| Visual truth path | Points at `/design` Translucent Glass mockups; repo has prompts, not that mock set as durable truth for implementers reading *this* index. |

---

### Unrealistic scope

For one user and “boring and changeable,” the screen table is a **full personal OS**: multi-model chat, workflows/crons, Hermes console, Scout, Kanban, files/projects, connections, dual inbox/agent surfaces, home/search.

- Adapter matrix (“any model he already pays for”: Claude, Codex, Cursor, Grok/X, Nous) is open-ended; overview treats it as settled.
- Non-goals drop multi-user/mobile/hosting/billing/plugins but **don’t cut product surface**—so scope pressure moves into UI completeness and glass polish.
- “One event stream” powering Home + Inbox + Kanban is a large platform bet for a v0.1 draft index.

---

### Security / privacy risks (named only enough for this overview)

- **High-value local aggregate:** one daemon holding multi-provider sessions + files + agent runs is a single compromise target. Overview asserts local-first without threat classes (localhost bind, browser→daemon, XSS→session, shoulder-surfing).
- **Outward-facing undefined:** “approves anything destructive or outward-facing” needs examples (email, PRs, spend, file delete)—else agents get inconsistent gates.
- **Glass as privacy material:** frosted overlays can leak shape/motion of chat, paths, or keys underneath; overview adopts glass without requiring opaque scrims for Connections/secrets.
- **Remote egress silent:** local storage ≠ private inference; overview should state that model traffic leaves the machine by design.
- **Web UI client:** browser origin + local API is a classic footgun; pointing at `12-security` is fine, but the overview should not imply “local = safe.”

---

### UI / design quality (hierarchy, spacing, type, density, motion, legibility, contrast)

Through impeccable **Operate** + design-taste **app screens**, what this overview *commits* to:

1. **Hierarchy.** No primary surface, no title job, no “one thing to do next.” A flat screen table reads as a feature dashboard—exactly the generated command-center pattern both skills reject (hero header, equal-weight nav destinations, chrome over data).

2. **Glass / contrast / legibility.** Translucent Glass implies text-on-blur, dim meta, stacked translucency. App-screens floor: body tiers ≥4.5:1 on the *surface they sit on*; contrast over composited blur is not computable without opaque wells. Overview gives zero contrast or fallback policy.

3. **Density.** Personal OS needs medium–dense Operate (lists, runs, approvals). Glass kits usually pad chrome and thin content. Overview never sets density intent (sparse home vs dense inbox).

4. **Typography.** No face, scale, or “two sizes do the work.” Stitch glass defaults (often Inter + soft hierarchy) fight “give the product a face.”

5. **Spacing / composition.** No shell grid, section rhythm, or “group don’t box.” Matching mockups without a surface policy invites card grids and nested frosted panels—taste bans icon-card rows and treats leftover empty as unfinished.

6. **Colour.** “Command center” + glass historically → dark + violet accent + glow. Taste bans assistant violet/indigo and wants ~≤3% coloured pixels, hue on status/data. Overview doesn’t constrain accent placement.

7. **Motion.** Unmentioned. Risk under glass: decorative blur/shimmer vs needed feedback (run progress, streaming, approval). Both skills want purposeful motion + reduced-motion; overview is silent.

8. **Emotional fit.** Principles say boring, human-in-charge, local trust. Aesthetic named is spectacle glass—misaligned with Operate restraint and the “boring and changeable” principle.

---

### Highest-leverage fixes (guidance only; Ask mode)

1. Drop or heavily constrain “match Translucent Glass”; state Operate defaults: opaque shell, flat tone steps, colour on status/data, glass only if any on true floating layers—with contrast/opaque fallbacks.  
2. Name **one primary job** and order screens under it; merge or clarify Chat / Agent chats / Inbox.  
3. Add a short **MVP cut** and real **Open questions**.  
4. One sentence each on **egress**, **approvals**, and **daemon↔browser** trust.  
5. Point visual truth at committed screenshots/tokens, not a Stitch style label alone.

---

If you want the same lens on `14-ui-system.md` next (where glass is usually specified in detail), say so—or switch to Agent mode if you want edits to this overview.
