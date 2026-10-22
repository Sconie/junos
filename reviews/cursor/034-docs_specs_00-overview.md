Context loading did not run; reviewing from the doc text and the skill rules only (no PRODUCT.md/DESIGN.md in the repo).

---

## Verdict

`00-overview.md` is a thin product index that **locks an aesthetic (“Translucent Glass”) and a 11-screen surface map before it defines the product’s one job, Operate-mode craft, or a visual system of its own**. As a draft index that is fine; as the north star for UI and scope it already conflicts with both skills and under-specifies security at the overview level.

---

### Contradictions

1. **“Boring and changeable” vs “Translucent Glass”**  
   Principle 5 wants small pieces and plain materials. The Screens line pins Stitch “Translucent Glass” mockups. Glass/blur chrome is fashion, not boring; taste’s house rule is explicit: *no glass, no backdrop blur, no floating pill nav*. Impeccable’s Operate mode also favors restraint and known patterns over Persuade-style atmosphere.

2. **“Local first” + “web UI client of a local daemon” vs non-goals**  
   “Public hosting” is out, but a web UI still implies a local HTTP surface. The overview never says “loopback only / no LAN bind,” so “local first” and “not public hosting” can both be true while the daemon is still reachable on the network—an overview-level hole (detail may live in `12`, but the principle isn’t constrained here).

3. **“One event stream” vs the screen list**  
   Only Inbox, Home, and Kanban are called views over the stream. Chat, Agent chats, Hermes, Scout, Tasks/Workflows, Files are left unexplained: streams, side channels, or something else? That undercuts the unifying model the principles sell.

4. **“Subscriptions, not API keys” vs Connections**  
   Connections is a first-class screen. Overview never clarifies whether Connections is session/CLI wiring only, or whether tokens/cookies still land on disk. Readers can infer either.

5. **Agent chats and Inbox share one spec**  
   Same link for two nav items. Either they are one surface with two modes (say so) or IA is already muddy.

6. **Draft status vs “match the … mockups”**  
   Status says nothing is final; Screens treats Stitch as the match target. That freezes glass before `14-ui-system` or a DESIGN.md exists (none in repo).

---

### Gaps (product / IA / craft)

| Gap | Why it matters under these skills |
|---|---|
| No single primary job | Taste app-screens: first screen answers one question; most frequent job one click away. Overview lists a command center of everything. |
| No mode | Impeccable: this is **Operate** (and some Read). Unstated → glass/marketing habits creep in. |
| No IA priority | 11 screens, flat table, no default route, no “day 1” vs later. |
| Hermes / Scout unnamed | Index names them; overview never defines them in one line. |
| No attention model | “See what needs his attention” is the product promise; no criteria (approval, failure, mention, Scout finding). |
| No states | Empty / loading / error / offline daemon / approval pending—Operate craft and `harden` expect these at system level. |
| No typography / density / motion stance | Deferred to `14`, but Screens already picks glass; hierarchy/spacing/motion/contrast never appear as requirements. |
| No “product face” | Taste: mark, name, one element only this product has. Overview has a name and a persona, not a UI identity beyond Stitch. |
| Responsive-only mobile | Non-goal is fine; no density/touch/nav rules for narrow Operate UI. |

---

### Unrealistic scope

For one personal operator, the screen set is a **full ops suite** in one product:

Home · Search · Chat · Agent chats · Inbox · Tasks · Crons · Workflows · Hermes · Scout · Kanban · Files/projects · Connections  

Principles say small pieces; the index reads like phase-all-at-once. Without phasing in *this* doc (roadmap is separate), implementers will treat the table as MVP. Unrealistic for a coherent Operate shell: too many primary destinations → weak hierarchy, nav chrome, and “dashboard of widgets” density—the failure mode both skills warn about.

---

### Security / privacy (overview-level)

What the doc *does* assert is high-risk if left unqualified:

- **Credentials on the machine** + **web UI → local daemon**: classic local-agent attack surface (XSS in UI → daemon, malicious markdown/tool output, CSRF-ish calls to loopback). Overview doesn’t even say “UI never holds secrets” or “daemon binds 127.0.0.1 only.”
- **“Human approves destructive or outward-facing”**: good principle; no list of what counts, where approval UI lives, or what happens if the UI is compromised (approval bypass).
- **Multi-CLI / multi-provider**: session cookies and CLI auth material for Claude/Codex/Cursor/Grok/Nous—overview doesn’t say “no key export in UI,” “redact in logs/events,” or “Scout/Hermes can’t exfiltrate.”
- **One event stream** of runs, messages, tasks, findings: high-sensitivity corpus; no retention, redaction, or “don’t sync” line in the overview.
- **Non-goal multi-user** helps; still need single-user hardening (OS user boundary ≠ safe daemon).

Deferring to `12-security-and-privacy` is fine only if this doc’s principles don’t over-promise safety they don’t constrain.

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility, contrast)

Judging the **direction this overview commits to**, not a rendered screen:

1. **Glass as system identity** — Direct conflict with taste (no glass/blur) and with Operate: color on data, flat surfaces, quiet nav. Blur also hurts **legibility/contrast** over busy content (chat, boards, file trees).

2. **Command-center sprawl → hierarchy failure** — Eleven peers in one shell usually means equal-weight nav, no dominant work surface, Home as a KPI/card dump. Taste explicitly rejects icon-tile KPI rows and hero headers on app screens.

3. **Density risk** — Chat + inbox + kanban + files in one product without a density doctrine (one primary column, secondary trays, what collapses on 390px) will ship cramped glass panels—worst of both worlds.

4. **Typography unspecified** — No display vs UI face, size budget, or “running text in full ink.” Glass UIs often default soft grey body text → unfinished/low contrast (taste colour law).

5. **Motion** — Unmentioned. Impeccable/taste want purposeful motion and `prefers-reduced-motion`. Glass stacks often add blur/fade chrome motion that doesn’t aid Operate tasks (approve, find, resume run).

6. **Spacing / composition** — No shell rules (margins, section rhythm, one question per screen). Stitch-driven multi-panel glass layouts tend toward card grids and hairline rules—both taste bans for marketing pages; for apps, quiet borders are OK but **not** decorative glass stacks.

7. **Brand/specificity** — “Could be any AI console with a glass kit.” Skills want JunOS-specific face (Jonas’s workflows, Hermes/Scout as product objects), not a gallery template name.

8. **Search on Home** — Named only via `10-home-and-search`. Search-as-omni is powerful but, undirected, becomes another dense chrome band competing with Inbox attention.

---

### What the doc does well

- Clear single-user owner and local-first intent.  
- Strong product principles (subscriptions, events, human approval).  
- Honest non-goals.  
- Clean index to deeper specs.

---

### Highest-leverage fixes (doc-only; Ask mode)

1. Drop or demote “Translucent Glass” to “inspiration only”; point craft at Operate + `14-ui-system` / a real DESIGN.md (flat, high-contrast, quiet chrome).  
2. Name **one primary job** and a **phased screen set** (e.g. Chat + Inbox/approvals + Connections first).  
3. One sentence each for Hermes and Scout; clarify event-stream scope.  
4. Bind security principles here: loopback-only daemon, approvals non-bypassable, secrets never in renderer, event redaction.  
5. Add a short UI stance: hierarchy (one primary surface), density, type/contrast, motion/reduced-motion—even if tokens live in `14`.

I can go deeper on any one section (e.g. rewrite the Screens + Principles block) if you switch to Agent mode or ask for proposed copy.
