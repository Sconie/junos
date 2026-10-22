**Verdict:** As an index, `00-overview.md` is clear and useful. As the product’s north star it over-commits a glass/dark “AI console” look that both skills would reject for Operate/app screens, under-specifies IA and first-release scope, and leaves privacy/security as pointers without the assumptions an overview needs.

*Lens note: this is a markdown-spec critique only (no render, no detector). Mode = **Operate** / app screens. Impeccable’s “brief wins” still applies if you intentionally pin glass — but then call that an explicit override of the house bans, not neutral craft.*

---

### Contradictions (inside this doc)

1. **Settled glass vs “boring” + craft bans**  
   Principles say boring/changeable; Design status locks **Translucent Glass** (frosted panels, atmospheric dark). Design-taste hard-bans glass/backdrop blur; impeccable craft-floor treats glass/blur as decoration unless the effect is specific. Pinning glass as the whole product world conflicts with Operate guidance (flat surfaces, tone steps, colour on data not chrome).

2. **IA: Agent chats**  
   Navigation: “filter of Chat, not a separate destination.” Screens table: separate row “Agent chats” → 07. Readers will treat it as a peer destination.

3. **IA: Terminal & Settings**  
   Terminal is in the Screens table, not in Primary/Secondary nav. Settings is in Secondary nav and cross-cutting prose, but has no Screens row (only “across 03, 11 and 12”). Orphan destinations.

4. **Phases vs table**  
   “Each screen below lists its phase in 13-roadmap” — the table here has no phases. First release names Claude + Codex + Connections + Tasks + Inbox; the table lists Hermes, Scout, Kanban, Files, Terminal with equal weight. Overview flattens urgency.

5. **Finality language**  
   Header: “Nothing here is final.” Body: glass “settled,” accent “decided 2026-10-22.” Status date is 2026-10-21. Mixed authority for implementers.

6. **Search**  
   Home links to `10-home-and-search`, but Search never appears in the navigation model. Is it a Home affordance, a global command, or a destination?

---

### Gaps (reader of only this doc)

| Gap | Why it matters |
|---|---|
| No one-liner job per screen | Operate needs “this screen answers X”; Home / Inbox / Hermes all sound like attention surfaces |
| No shell/layout commit | Primary/secondary listed; no rail vs top bar, count badges, or phone collapse |
| No typeface / type scale / density | Only glass + soft green; app-screen craft lives in 13–16px body, quiet chrome |
| No motion policy | App screens: motion = feedback only (no motion floor). Unstated → likely decorative blur/glow |
| Scout / Hermes undefined | Named in nav and later vision with no one-sentence purpose |
| Settings surface undefined | Approval rules / retention live here in spirit; no screen ownership |
| Responsive “web only” | Non-goal mobile app, but no breakpoint/density commitment for an 11-destination shell |
| Local data posture | “Local first” + egress caveat; no overview stance on transcript retention, event-stream PII, backups |

---

### Unrealistic scope

- **Surface count:** ~11 nav destinations (+ Terminal, Settings, Search ambiguity) for one user’s first product is a large Operate shell before any domain depth.
- **First release (0–2):** subscription chat for two CLIs + Connections + Tasks + Inbox is already a full product; “mock UI only” → that slice is a steep jump if adapters are release-gated and non-trivial.
- **Later vision (3–5):** Hermes + Kanban + Scout + files + search stacked on the same “one event stream / one command center” metaphor risks a second product without a kill criteria in this doc.
- **Provider list in principle 1** (Claude, Codex, Cursor, Grok/X, Nous) vs first release (Claude + Codex) is fine, but the overview still sells the full set as the product identity — easy to overbuild adapters early.

---

### Security / privacy risks (as stated here)

Strengths already present: local records, logins in official clients, egress honesty, human-in-charge approvals via gateway, pointer to 12.

Risks / underspecs in *this* overview:

1. **Event stream as archive** — “Every run, message, task and finding becomes an event” implies a local corpus of prompts, tool output, and findings. No retention/minimization principle at overview level.
2. **Gateway as single choke point** — Strong claim (“overrides autonomy…”) without saying what must never bypass it (provider CLIs, Hermes, workflows, Terminal). Overview should state the invariant in one sentence.
3. **“Subscriptions, not API keys”** — Reduces key sprawl; does not reduce prompt/content egress or session-token exposure via CLIs. Easy to misread as “more private.”
4. **Scout (named, undefined)** — Name implies outbound discovery; privacy impact is invisible until 08.
5. **Responsive web + local daemon (implied elsewhere)** — Public hosting is a non-goal; overview should still say “bind local / no remote UI” if that is the threat-model boundary, or say it is deferred to 12.
6. **Single-user non-goal** — Good; does not address shared-machine / disk encryption / backup of the SQLite event store (only mentioned as Settings topics elsewhere).

---

### UI / design-quality problems (hierarchy, spacing, type, density, motion, legibility, contrast)

Applying design-taste **app-screens** + impeccable **Operate**:

1. **Direction = category default** — Dark atmospheric + frosted panels + soft green accent reads as generic “AI command center,” not something only Jonas’s workflows would produce. Cover-the-logo test fails: swap the name, still looks like every agent dashboard. Skills want flat grounds, ~3% coloured pixels, colour on data/actions, product face via one signature element — not glass chrome.

2. **Glass vs contrast/legibility** — Frosted panels on atmospheric backgrounds are a classic failure mode for body text, secondary labels, and disabled states (impeccable contrast floor ≥4.5:1). Overview settles the aesthetic without a contrast invariant.

3. **Hierarchy / cognitive load** — Six primary destinations before secondary is already past the “>4 visible options” critique flag. Home + Inbox + Hermes as three attention metaphors without a stated priority order will fight for the same mental slot.

4. **Density** — Command-center work (chat, inbox, tasks, kanban, terminal) wants quiet chrome and dense content. “Atmospheric” backgrounds and frosted panels push toward sparse, decorative Operate UI — wrong density bias for this product class.

5. **Typography** — No face, scale, or measure committed. Soft-green accent without type decisions usually yields Inter/Geist + muted grey body — the kit look app-screens explicitly call out.

6. **Spacing / composition** — No grid, margin, or section-rhythm commit; deferred to 14 is fine only if overview does not freeze a glass language that 14 must then fight.

7. **Motion** — Unspecified. Glass worlds invite blur/parallax/glow; app-screens want press/hover/focus/sheet motion only. Overview should forbid decorative motion or explicitly defer with a one-line rule.

8. **Nav chrome risk** — Secondary list length + primary set invites coloured active pills, icon rails, and badge spam — all called out as generated-dashboard tells unless constrained.

9. **Stitch dependency** — “Match the Stitch mockups” while “designs aren’t in the repo” freezes look without reviewable truth. Design-taste reviews need screenshots; this overview cannot be visually QA’d from the repo.

---

### Priority fixes (overview-only, if you revise)

1. Reconcile **glass** with the skills: either demote to “historical Stitch input” and adopt flat Operate tokens, or mark glass as an explicit house-rule override with contrast requirements.  
2. Fix **nav ↔ screens**: place Terminal & Settings; resolve Agent chats and Search.  
3. Add a **phase column** (or “First release / Later”) on the screens table.  
4. One sentence each for **Home vs Inbox vs Hermes**, **Scout**, and the **gateway never-bypass** invariant.  
5. Add overview principles for **retention of the event stream** and **motion = feedback only**.  
6. Shrink **first-release identity** to the Phase 0–2 surface list so the overview stops selling Phases 3–5 as equal peers.

I did not open sibling specs (per your “ONLY this doc” constraint); several gaps may already be answered in 12–14 — they still belong as one-liners here if this file is the index.
