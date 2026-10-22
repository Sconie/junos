**Verdict:** As a product index, `00-overview.md` is clear and short. As the brief that steers UI and risk, it under-specifies the Operate job and **locks the look to “Translucent Glass”** — a direction both design skills treat as anti-pattern for a working command center.

---

### Contradictions

1. **“Boring and changeable” vs “Translucent Glass”**  
   Principle 5 pushes small, plain, swappable pieces. The Screens section pins Stitch “Translucent Glass” mockups. Glass (blur, frosted panels, soft chrome) is the opposite of the app-screen house rules: flat surfaces, colour on data not chrome, no backdrop blur / floating glass chrome. The overview picks both without resolving which wins.

2. **“Subscriptions, not API keys” vs “any model he already pays for”**  
   Claude / Codex / Cursor fit the CLI story. Grok/X and Nous Portal often imply cloud auth, tokens, or API-shaped access. The principle reads absolute; the product claim does not. Overview should say what counts as a “subscription session” vs what is out of scope.

3. **“Local first” vs multi-provider chat/agents**  
   Data/credentials on-machine is fine; prompts, files, and tool results still leave via those CLIs. “Local first” without “what leaves the machine” invites a false privacy read.

4. **“Human stays in charge” vs Scout / Hermes / scheduled workflows**  
   Autonomous or recurring agents are named as first-class screens. Approval is one line with no overview rule for what can run without Jonas (read-only scout vs outbound vs destructive). That tension belongs here, not only in `12`.

5. **IA overlap: Chat / Agent chats / Inbox**  
   Three entries, two specs, one event-stream principle. Unclear whether “chat with any model,” “supervise Hermes,” and “what needs attention” are one stream with filters or three products sharing a nav.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No single Operate question | App-screen craft starts with “what does the first screen answer?” Overview lists 11 surfaces, not one job. |
| No nav / shell model | Screens table ≠ IA. No primary surface, no default landing, no “attention” definition. |
| No priority / cut line | Everything looks MVP-weight. No “ship Home + Chat + Inbox first.” |
| Design deferred entirely | Tokens live in `14-ui-system`, but overview already commits a visual world (“Translucent Glass”) without hierarchy, density, type, motion, or a11y floors. |
| Security one-liner only | Principle + link to `12` is thin for a daemon holding credentials and agent power. |
| Responsive web, no phone Operate rules | Non-goal “no mobile app” still implies dense web on small widths; no density/legibility stance. |
| No product face | Name “JunOS” appears; no mark, voice, or one signature element that makes this *not* a generic AI dashboard kit. |

---

### Unrealistic scope

Eleven screens plus multi-CLI routing, crons/workflows, Hermes, Scout, Kanban, and files/projects is several products. For one user and a local daemon, that is a multi-phase program presented as a flat inventory.

Highest risk of thrash: **“any model he already pays for”** (unbounded adapters) and **Scout + Hermes + Tasks** (three automation surfaces) before a stable Chat + Inbox loop exists.

Non-goals help (no multi-user, public hosting, billing, marketplace) but do not cut the screen list.

---

### Security / privacy risks (from this doc alone)

- **Local web UI ↔ local daemon** — Classic localhost/CSRF/confused-deputy surface. Overview never states “UI binds to loopback only” or “no remote bind.”
- **Credentials on disk for many CLIs** — High-value target; no overview mention of OS keychain, encryption at rest, or least-privilege for the daemon.
- **Agents + “outward-facing” approval** — Good principle; undefined what is outward (email, web, file write, shell). Gap invites over-trust in early builds.
- **Third-party model paths** — Chat content and tool context leave the machine; no retention / “don’t train” / redaction stance at overview level.
- **Personal single-user framing** — Fine; still needs an explicit “no accounts, no sync, no telemetry” (or the opposite) so later specs cannot quietly add cloud.

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility, contrast)

Judging the overview as the **design brief** (Operate / app-screen mode), not a rendered page:

1. **Visual world is wrong for the product mode**  
   “Translucent Glass” predicts blur, stacked translucent panels, weak text-on-glass contrast, and chrome-heavy hierarchy. App-screen guidance wants ~flat surfaces, ~3% colour on chrome, type-led density, colour on status/data. Overview points implementation at the failure mode.

2. **No hierarchy among 11 destinations**  
   Cognitive load: a shell that exposes Home, Chat, Agent chats, Inbox, Tasks, Workflows, Hermes, Scout, Kanban, Files, Connections is already past a sane first-run decision set. Overview never names a primary lane (e.g. Inbox/Home as the job; the rest secondary).

3. **Density and legibility unstated**  
   A command center lives or dies on scanability (event list, approvals, run status). Glass + soft hierarchy usually means low-contrast secondary text and padded empty chrome — the opposite of inbox/kanban density. Overview should forbid “hero headers” and KPI-tile chrome for Home, or at least point at Operate density rules.

4. **Motion**  
   No mention of reduced motion, or that motion is feedback (approve, run start/fail) not atmosphere. Glass kits often add ambient blur/glow motion that fights Operate restraint.

5. **Typography**  
   Zero type stance here (one face vs display, sizes for nav vs event rows). For an Operate product, overview should at least say “UI type for work, not marketing display” so Stitch mockups cannot dictate oversized heroes on Home.

6. **Spacing / composition**  
   No shell rhythm (sidebar vs top nav, content measure, list row pitch). Linking `14-ui-system` is fine; naming glass mockups as the match undercuts that doc before it starts.

7. **Brand / specificity**  
   Skills ask for a product face (name + one signature element from *this* subject). Overview describes a generic “AI command center” feature bag; nothing unique to Jonas’s workflow appears as a design anchor (e.g. approval queue as the signature, not frosted panels).

---

### What this doc should decide (without rewriting other specs)

If this overview is meant to govern design and risk, the highest-leverage fixes are:

1. Replace or demote “Translucent Glass” — treat Stitch as exploration, not the locked look; align with flat Operate UI in `14`.
2. Name **one primary job** and the default landing screen.
3. Collapse or clearly distinguish Chat vs Agent chats vs Inbox.
4. Add a short **trust box**: loopback-only UI, what may leave the machine, what always needs approval.
5. Add a **phase cut**: which 3–4 screens are real MVP.

I’m in Ask mode, so this is review only. Switch to Agent mode if you want those edits applied to the overview.
