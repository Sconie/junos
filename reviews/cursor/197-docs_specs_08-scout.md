**Verdict:** `08-scout.md` is a solid *agent* brief (read-only pipeline, budget, untrusted web) but a thin *Operate* screen brief. Internally it also undercuts its own Self-source and Ideas-source claims, and the UI paragraph would ship as badge/chip chrome without a clear first question, states, or keyboard path.

*(Workspace file reviewed as current `docs/specs/08-scout.md`; shell was blocked in Ask mode so commit `595fe13` could not be re-diffed here.)*

---

### Contradictions

1. **Self source vs Rev 2 privacy**  
   “What it watches” promises unused features and repeated manual actions; Rev 2 allows only aggregate counters and keeps Self off by default. Those product insights usually need more than counters — the ambition and the guardrail disagree.

2. **Ideas sources vs source validation**  
   Ideas are “web search by a configured query list,” but Rev 2 only allows `http(s)` feeds and allowlisted local commands. Search queries are neither; storage/validation for that kind is undefined.

3. **Dedupe: “past findings” vs acceptance**  
   Pipeline says dedupe against past findings; acceptance only requires “same title” after dismiss. Titles drift; dismiss few-shots and title-dedupe can disagree on whether something “returns.”

4. **Digest semantics**  
   Pipeline: weekly digest for below-threshold items. Open question: “digest to the Inbox.” Unclear whether high-scoring findings are Inbox-only, also in the digest, or both — and what a digest item’s actions are.

5. **Cadence: decided vs editable**  
   Open questions lock daily releases / weekly ideas, while the screen still exposes per-source cadence. Defaults vs hard policy is unresolved.

6. **Filter vs Assess isolation**  
   Untrusted web + tools disabled is stated for **Assess** only. **Filter** also runs a model on fetched content; same isolation is not stated.

7. **“Adapter probe” vs fetch-only collection**  
   Provider changes use “release notes plus adapter probe,” while Rev 2 says collection is fetch-only. Probe implies runtime contact with adapters — scope and read-only boundary clash.

8. **Risk scored, then dropped**  
   Assess scores risk; the screen shows badge / summary / effort chip — not risk. Publish/schema path in this doc never says risk is stored or shown.

9. **Scout screen vs Inbox finding actions**  
   Inbox (cross-ref in spirit of this doc’s Publish step) has Snooze; Scout detail does not. Dual surfaces for the same finding without sync rules.

10. **Read-only vs open draft-PR question**  
    Guardrail forbids PRs; open question keeps draft PRs alive. Fine as deferral, but it weakens the “must hold across the pipeline” claim unless marked explicitly out of scope for v1.

---

### Gaps (spec holes that block a faithful build)

- No named **screen question** or primary job (“triage today’s upgrades” vs “configure sources”).
- No **empty / loading / error / zero / run-in-progress** states (required by the UI system pattern every screen needs).
- No **keyboard** map (other queue specs have one; 14 expects per-screen lists).
- No **status** UX for `scout_finding` (open / dismissed / carded) or filters on the feed.
- Threshold default 60: not said whether editable, or where.
- What is stored from the web (snippet, full page, hash)? Retention left entirely to “see 12.”
- “Make card” / “Ask Claude”: which conversation, which model, how finding text is wrapped as data before chat/tools.
- Source **health**: signal definition, failure copy, retry.
- Allowlist for local commands: who edits it, how `npm outdated` is scoped to JunOS packages.
- “Matches mockup” with **no mockup path** in this doc.
- Mobile: right rail → sheet behavior never mentioned.

---

### Unrealistic scope

For one Phase-4 agent, the doc stacks: multi-ecosystem release watching, dependency/advisory scans, provider/adapter probing, open-web ideation, self-telemetry, two-model pipeline, dismiss-learning, editable sources with health, Inbox + Scout dual publish, Kanban + chat handoffs. Acceptance is only “two feeds → one Inbox finding,” which does not pressure-test that surface area. Learning-from-dismiss as growing few-shots also has no cap, eval, or rollback.

---

### Security / privacy

**Strong already:** read-only acting path; budget/meter yield; Assess tools off; web as data; Self off by default; aggregates only; http(s) + allowlisted commands; render via 12.

**Still thin or risky in this doc:**

| Risk | Why |
|---|---|
| Prompt injection on **Filter** | Same untrusted corpus as Assess; isolation not specified. |
| Editable feed URLs | SSRF / internal hosts if URL allowlisting isn’t tighter than “http(s).” |
| Allowlisted shell | Creep from `npm outdated` to “just one more command.” |
| Finding → **Ask Claude** | Untrusted summary enters a tool-capable chat unless wrapping/tool policy is mandatory here. |
| Finding **links** | Phishing/open redirects in a trusted glass UI; click affordances unspecified. |
| Suggested change → **Kanban** | Model output from web becomes durable work items; trust labeling underspecified on Scout itself. |
| Dismiss few-shots in prompts | Unbounded prompt growth; possible cross-contamination of filter behavior; no “reset learning.” |
| Stored web content | Volume and sensitivity of cached fetch bodies not bounded here. |
| Adapter probe | Easy to become non-readonly or credentialed. |

---

### UI / design quality (impeccable Operate + design-taste app-screens)

Scout is an **app screen** (queue + settings), not a marketing page. Through that lens the Screen section is the weakest part of the doc.

**Hierarchy & job**  
No single first answer on the canvas. Feed + detail + source admin rail is two jobs (triage vs configure). App-screen guidance wants the main job one click away and every named block visible at desktop; this brief doesn’t prioritize “act on finding” vs “tinker with sources.”

**Chrome / density tells**  
“Source badge” + “effort chip” as the row language is the default generated-queue look (chips/badges as decoration). Effort and relevance are data — better as quiet type/alignment than chip chrome. Risk is assessed then invisible, so hierarchy doesn’t match the pipeline’s own signals.

**Substance vs thin admin**  
Detail fields (why / links / suggested change) are good. Missing: evidence of score/threshold, source health as readable status (not colour-only dots), last run outcome, and dismissed/carded history. Right rail packs list + health + cadence + run-now with no layout rhythm or progressive disclosure.

**Typography / spacing / legibility**  
No type scale, measure, or truncation rules for version-heavy one-liners. Relies on 14’s glass tokens without saying how badges/chips avoid accent-on-glass (14 forbids accent text on glass). Contrast for dim “last checked” and status colour isn’t called out; colour-alone health would violate 14’s a11y rule.

**Motion / feedback**  
Long Collect→Publish runs need progress, partial failure, and completion feedback. Spec is silent; app screens treat motion as control feedback, not decoration — still need run-state UX.

**IA mismatch with product shell**  
Scout is secondary nav; this screen reads like a primary Inbox clone plus Settings. Without snooze/status/keyboard parity, Jonas will triage in Inbox and only visit Scout to edit sources — which argues for splitting **Findings** and **Sources** rather than one overloaded rail.

---

### Highest-leverage fixes (if you revise the doc)

1. Split **Findings** (Operate queue) from **Sources** (settings); name the screen’s one question.  
2. Align Self and Ideas with Rev 2 (or explicitly defer those kinds).  
3. Apply tool-disable + data-wrapping to **every** model stage; tighten URL/command allowlists.  
4. Replace badge/chip-first row language with relevance/effort/risk as typography; define states + keyboard.  
5. Make dedupe, digest, and cadence policy precise enough that acceptance tests aren’t gameable by title wording alone.

I can turn this into a tighter “must-change / nice-to-have” checklist against Rev 3 wording next if you want that format.
