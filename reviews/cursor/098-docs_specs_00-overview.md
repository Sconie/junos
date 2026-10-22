Context loading did not run; I’ll read the existing project context directly. No `PRODUCT.md` / `DESIGN.md` in the repo — this overview is the brief.

---

## Verdict

As a **v0.1 product index**, this doc is clear and short. As a **design/IA brief** under Impeccable (Operate) and design-taste (app screens), it locks a **glass / multi-surface command center** that fights its own principles, under-specifies the Operate job, and inherits contrast/legibility risk before any screen is built.

---

### Contradictions (inside this doc)

1. **“Boring and changeable” vs “Translucent Glass.”** Principle 5 asks for small, plain, swappable pieces. The Screens line commits every surface to Stitch’s translucent-glass look — ornament, blur, layered chrome. That is the opposite of boring Operate UI and of design-taste’s hard ban: *No glass / no backdrop blur / no floating pill nav*.

2. **Operate product, Persuade aesthetic.** The product is a personal command center (scan, approve, act). Glass mockups optimize for atmosphere, not task density, hierarchy, or data-first chrome — the failure mode app-screens.md warns about (“kit, not product”).

3. **“Subscriptions, not API keys” vs “chat with any model.”** Opening line promises any model he already pays for; the principle list is a closed set of CLIs/sessions. “Any” and that list are not the same; overview never resolves what happens for a paid model with no adapter.

4. **“One event stream” vs flat screen list.** Home, Inbox, and Kanban are said to be views over one stream, but the table treats 11 destinations as peers. No primary surface, no “start here,” no rule for when the same event appears in two places.

5. **“Human stays in charge” vs filesystem + agents.** Agents + “browse files and projects” + workflows imply high blast radius; the principle only names approve-for-destructive/outward without defining either, or who can read/write which paths by default.

---

### Gaps

| Gap | Why it matters |
|---|---|
| No single primary job / success metric | Impeccable Operate needs “visitor completes a task”; overview lists capabilities, not the one job of the first session. |
| No shell / nav model | 11 screens, no IA: rail vs tabs, what’s always visible, what collapses on responsive web. |
| Overlapping agent surfaces | Chat, Agent chats, Hermes, Scout — undifferentiated in the index; cognitive load and duplicate chrome are likely. |
| No first-run / empty / error story | Local daemon + connections are load-bearing; overview never says what the UI does when the daemon is down or a CLI isn’t linked. |
| No brand/product face | Taste skill: shell must name the product and carry one signature element; overview only points at Stitch glass. |
| Responsive web only, no density/breakpoint intent | “Mobile app non-goal” without how 11 destinations and glass layers behave at phone width. |
| Motion, type, contrast deferred with aesthetic already pinned | `14-ui-system` is linked, but Screens already freezes the look to glass — tokens can’t easily undo that. |
| Security/privacy only a link | Overview states local-first and credentials-on-machine without even a one-line trust boundary (localhost-only? loopback? who can open the UI?). |

---

### Unrealistic scope (for a draft v0.1 “personal” tool)

Shipping surface area implied by the screen table alone:

- Multi-provider chat with model/effort picker  
- Agent chats + Inbox  
- Tasks/crons + workflow launcher  
- Hermes console + Scout  
- Kanban + files/projects + connections  

That’s several products (chat client, agent ops, automation, research, PM, file browser) behind one glass shell. Principles say small pieces; the index reads like a full suite. Without a phased “must ship first” cut in *this* doc (roadmap is only linked), v0.1 reads as everything at once.

---

### Security / privacy risks (as framed here)

These are risks the overview *introduces or leaves open*, not a full threat model:

1. **Web UI → local daemon → credentials/CLIs.** XSS or malicious content in chat/agent output in a privileged local UI is a classic local-agent escape; overview doesn’t flag content isolation or “treat model output as untrusted.”
2. **“Data and credentials live on Jonas’s machine”** with no binding rule. If the daemon listens beyond loopback, “local first” becomes LAN exposure of session material.
3. **Filesystem browse + agents** without a named sandbox or allowlist in the overview — high privacy blast radius for a personal machine.
4. **Approvals only for “destructive or outward-facing.”** Silent read of mail, files, or calendar can be as sensitive as a send; the principle under-scopes privacy.
5. **Multi-CLI session reuse** (“already pays for”) concentrates many provider sessions in one app; overview doesn’t mention least privilege or per-connection scopes.

(Detail belongs in `12-security-and-privacy`; the gap is that the overview’s local-first claim is stronger than the controls it states.)

---

### UI / design-quality problems (skills lens)

Treating this as an **Operate / app-screen brief**, not a marketing page:

**Hierarchy & IA**  
Eleven equal destinations with no primary path. Impeccable cognitive-load guidance flags >4 visible options; this index implies a saturated shell before any screen is designed. Home / Inbox / Kanban as three peers over one stream without a “default attention surface” will produce duplicate chrome and unclear status.

**Density vs glass**  
Command centers need scannable lists, tables, and approval queues (taste: colour on data, flat surfaces, quiet nav). Translucent glass fights density: soft layers, low-contrast text on frosted panels, chrome competing with content.

**Spacing / composition**  
No grid, shell, or section rhythm stated — only “match mockups.” For Operate, that’s backwards: shell and type scale should lead; decoration follows. Risk of card/KPI/sidebar template layout (taste’s anti-pattern list) if Stitch glass is followed literally.

**Typography**  
No face, scale, or measure. Taste: one loaded face with character, not stock Inter/Geist-on-grey. Overview’s only visual cue is material (glass), not type — weak product identity.

**Legibility & contrast**  
Translucent panels over busy backgrounds are a known WCAG failure mode (text on variable backdrop). Pinning that aesthetic in the overview commits the project to fighting contrast on every screen.

**Motion**  
Unmentioned. Taste/Impeccable still expect purposeful feedback and reduced-motion fallbacks on Operate UIs; glass UIs often over-animate blur/opacity. Leaving motion unspecified while locking glass invites decorative motion.

**Product specificity**  
“Could this shell belong to another AI dashboard after renaming?” Almost certainly yes if it’s generic Stitch glass. Taste’s competitor test fails: nothing JunOS-specific (Jonas, Hermes, subscription CLIs, local daemon) is turned into a visual or IA device — only a material trend.

**Principle clash as design debt**  
“Boring” + glass is not a resolvable tension in implementation; one side will lose. The overview should pick Operate craft (flat, high contrast, data-first) or explicitly accept glass as brand and drop “boring.”

---

### Highest-leverage fixes (doc only — guidance)

1. Replace “match Translucent Glass” with Operate constraints: flat surfaces, full-ink body text, one accent on action/data, no blur — or keep glass and rewrite Principle 5.  
2. Name **one** default screen and collapse Chat / Agent chats / Hermes / Scout into a clear relationship in one paragraph.  
3. Add a one-line trust boundary next to “local first” (e.g. loopback-only UI, untrusted model output).  
4. Cut or phase the screen table so v0.1 isn’t eleven peers.

---

Questions skipped: Ask-mode doc review; no interactive follow-up required by the critique playbook for a non-rendered target.
