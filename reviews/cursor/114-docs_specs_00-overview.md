Context loading did not run; I’ll read the existing project context directly. There is no `PRODUCT.md` / `DESIGN.md` in the repo; the overview itself pins the visual world to Stitch **“Translucent Glass.”**

This is a **spec critique** (Operate product brief), not a pixel audit—there is no renderable UI to inspect.

---

## Verdict

`00-overview.md` is a clear personal-tool charter, but it **locks a glass/dark/violet chrome direction that fights its own “boring” principle and both skills’ Operate/app-screen rules**, while packing **~11 primary destinations** onto one shell without a single primary job. Scope and security boundaries are sketched, not constrained.

---

## Contradictions (inside this doc)

1. **“Boring and changeable” vs “match Translucent Glass”**  
   Principle 5 wants small, plain, swappable pieces. The Screens section hard-commits the whole product to frosted-glass mockups. Those two product identities cannot both win.

2. **“One event stream” vs a screen zoo**  
   Principle 3 says Inbox, Home, and Kanban are *views* over one stream—then the table still lists Chat, Agent chats, Inbox, Tasks, Workflows, Hermes, Scout, Kanban, Files as peer destinations. The overview never says which is the default attention surface vs which is a filter/mode. That will produce three competing “what needs me?” UIs.

3. **“Human stays in charge” vs unsupervised surface names**  
   Approvals are stated once; Scout, Hermes, scheduled workflows, and “outward-facing” agents are listed as first-class screens with **no overview-level default-deny / approval map**. The principle and the IA don’t meet.

4. **Local-first daemon + “responsive web only”**  
   Non-goals ban public hosting and a mobile app, but the overview still implies a browser client talking to a local daemon—without saying bind address, auth on the wire, or who can open the UI. Local-first and “just a web UI” need an explicit trust boundary here.

5. **Index incompleteness vs “this is the map”**  
   Cross-links omit Settings (called out elsewhere as rail chrome), and Search exists only inside `10-home-and-search` while the table row is only “Home.” The overview presents itself as the screen index but isn’t.

---

## Gaps

| Gap | Why it matters |
|---|---|
| No single primary job | “Command center” lists six jobs in one sentence; neither skill can set hierarchy without one question the first screen answers. |
| No product face / idea | Name + “personal AI command center” fails the competitor test (any AI shell). No signature object, ritual, or artefact. |
| No density / IA budget | 11 screens, several doubled into shared specs (Agents+Inbox, Tasks+Workflows)—boundaries undefined. |
| No motion / reduced-motion stance | Overview pins a visual style but says nothing about motion; glass UIs usually lean on blur/fade chrome. |
| No first-run / empty / daemon-down | Operate products live or die on empty and offline; deferred entirely. |
| No data-lifetime / redaction | “Every run, message, task and finding” → one SQLite corpus; retention never mentioned. |
| Thin non-goals | Excludes multi-user/mobile/hosting/billing/marketplace; does **not** exclude code exec, mail, browser control, unrestricted FS—things Hermes/Scout imply. |

---

## Unrealistic scope (for a draft that already indexes everything)

For one user and a local daemon, the overview still commits to:

- Multi-provider chat (Claude, Codex, Cursor, Grok/X, Nous) via “subscriptions not API keys”
- Scheduled + on-demand workflows
- Hermes supervision
- Attention inbox
- Kanban
- Scout
- Files/projects browser
- Connections

That is a **phase roadmap’s worth of product**, presented as the current screen map with no “v0 ships only X.” Unrealistic not because any one screen is impossible, but because the overview treats the full suite as the baseline IA.

---

## Security / privacy risks (implied by this page alone)

1. **Daemon + web UI** — Classic localhost (or worse, LAN) attack surface; overview never states loopback-only, pairing token, or OS-keychain vs UI exposure.
2. **CLI session = credentials** — “No API keys” still means long-lived provider sessions the daemon must hold; web client vs daemon secret separation is undefined.
3. **Universal event log** — Messages, findings, file/project context in one stream: high-sensitivity personal data with no retention, export, or redaction principle at overview level.
4. **Files and projects** — Filesystem browse without a stated allowlist/root; conflicts with “human approves destructive” if read scope is ambient.
5. **Agents + Scout + crons** — Outward/destructive actions named only as a principle, not as a product rule (default deny, what auto-runs, what always prompts).
6. **Single-user assumption** — Fine for Jonas; still needs “any process that can hit the UI port is Jonas,” or the model is wrong on a shared machine.

(Detail belongs in `12-security-and-privacy.md`; the failure here is the overview asserting local-first + agents **without** a one-paragraph trust boundary.)

---

## UI / design quality (impeccable Operate + design-taste app-screens)

**Mode:** This is **Operate** (task UI), not Persuade/Experience. Ambition should be precision and scanability—not atmospheric chrome.

### Hierarchy & IA
- Rail of ~11 destinations (as expanded in the linked UI system) exceeds a sane Operate decision set; impeccable flags **>4 visible competing options** as cognitive load. App-screens: nav should recede; active state quiet.
- Home / Inbox / Kanban as peer “attention” surfaces with no stated priority → muddled first screen.
- Shared specs for distinct table rows (Agent chats vs Inbox; Tasks vs Workflows) predict **duplicate layouts** and unclear labels.

### Visual direction (pinned by this doc)
Committing to **Translucent Glass** collides hard with design-taste house rules for both pages and app screens:

| Overview commitment | Skill pushback |
|---|---|
| Frosted / glass panels | **No glass**, no backdrop blur panels |
| Atmospheric dark + glow (via linked system) | App-screens: colour on **data**, not chrome; ~3% colour; flat surfaces |
| Violet accent culture (Stitch / Soft Dark) | **No assistant palette** (violet/indigo); dark-first is a known bias |
| Inter / system UI (in `14`, locked by “match mockups”) | Kit face; app-screens demand a **product face**, loaded type, mark/name |

Impeccable: on Operate, brand lives in precise details—not a hero glass treatment. The overview chooses the opposite.

### Density, spacing, typography
- Overview doesn’t set a density doctrine (calm terminal vs card dashboard). “Command center” + glass mockups usually means **panel stacks, chips, status pills**—the generated-dashboard tells app-screens exist to kill (KPI tiles, tinted icon squares, pill chrome).
- No type scale, measure, or “one question per screen” rule—only a pointer to mockups. For an index doc that names every screen, that’s a craft gap: implementers will copy Stitch density wholesale.

### Legibility & contrast
- Glass over atmospheric gradients is a **known contrast trap**; even the UI system admits 4.5:1 “on the glass.” The overview’s “match the mockups” instruction prioritizes look over readable ink-on-panel—the wrong priority for chat, logs, cron, and diffs (this product’s real content).

### Motion
- Silent in the overview. Glass systems tend to blur/fade chrome motion; Operate needs **feedback on controls**, not decorative atmosphere—and a `prefers-reduced-motion` stance should be a principle next to local-first if blur is in play.

### What’s missing for taste (substance, not restraint)
- No **signature element** only JunOS has (event stream as material, approval as the ritual, provider sessions as the object).
- No **trade language** for empty states (“Waiting on approval” vs “No items”).
- Shell identity (name/mark in chrome) not stated—risk of “well-applied kit, not a product.”

---

## Strengths (keep)

- Clear owner, local-first, single-user framing.
- Strong principles skeleton (subscriptions, event stream, human approval, swappable guts).
- Honest draft status + non-goals stub.
- Useful index into deeper specs.

---

## Highest-leverage fixes (if you revise only this doc)

1. **Pick one identity:** either “boring Operate shell” or “Translucent Glass”—and make Principle 5 match the Screens line.  
2. **Name the one job** of the first screen (almost certainly Inbox-or-Home-as-attention, not 11 peers).  
3. **Collapse the map:** mark Phase-0 screens vs later; split shared-spec rows or explain modes.  
4. **Add a 5-line trust boundary:** loopback, secrets never in the browser, FS roots, default-deny for agents/crons, event retention.  
5. **Replace glass as the north star** with Operate craft: flat panels, ink-first type, colour on status/data, quiet nav—Stitch as reference sketches, not law.

---

**Questions skipped:** full impeccable dual-assessment + browser detector (target is markdown only; Ask mode; no renderable UI).
