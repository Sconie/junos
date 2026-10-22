**Verdict:** Rev 2 hardens the right security instincts (read-only pipeline, Self aggregates, source allowlisting), but the screen section is still a generic three-pane sketch, and several pipeline/privacy claims don’t hold together under load.

Lens: Impeccable **Operate** mode + tasteskill **app screens** (inbox/queue, not marketing). No live UI to inspect — this is a spec-only review.

---

### Contradictions

1. **Title vs “Self”.** Spec is “watches for upgrades,” but Self promises “features never used, repeated manual actions.” Rev 2 then limits Self to aggregate counters only. Those jobs need more than rates/durations — either Self’s capabilities shrink, or the privacy claim is false.

2. **Cadence.** Open questions lock “daily for releases, weekly for ideas,” while the Screen lets every source edit cadence. Unclear which wins and what the UI shows as default vs override.

3. **Ideas sources vs allowlist.** Rev 2: “only http(s) feeds and allowlisted local commands.” Ideas use “web search by a configured query list” — that isn’t a feed or a local command. Collection for Ideas is either out of policy or underspecified.

4. **Filter vs Publish threshold.** Filter “drops irrelevant”; Publish keeps ≥60; digest covers “the rest.” Unclear whether Filter already applied a soft relevance cut, what 0–59 means after Filter, and whether digest items are Inbox items, `scout_finding` rows, or both (“digest to the Inbox” vs “summarises the rest”).

5. **Dedupe vs dismiss.** Acceptance: “same title does not return.” Pipeline: “Dedupe against past findings.” Learning: dismiss reasons as few-shot. Three mechanisms, one behavior promised — title match alone is weak (rewritten headlines, version bumps, same advisory different title).

6. **“Ask Claude”** while the watch list is multi-provider (Codex, Cursor, Hermes…). Couples the action to one vendor and fights the product’s own scope.

---

### Gaps (blocking for implementability)

| Area | Missing |
|---|---|
| Collect | Watermarks, retries, partial failure, what “new since last run” means per kind |
| Assess | Risk scale (relevance has 0–100, effort S/M/L; risk is unnamed) |
| Budget | “max N” and meter threshold undefined here (only “see 03”) |
| Adapter probe | Side effects, auth, rate limits — is it still “fetch-only”? |
| Dependencies | How advisories are fetched; whether `npm outdated` is the only allowlisted command |
| Screen | Empty / loading / error / first-run; what “health” means; digest presentation; duplicate “Make card”; phone/narrow layout |
| Mockup | “Matches mockup” with no linked mockup or layout contract |
| Learning | How few-shot examples are selected/capped; whether dismiss text can poison Filter |

Acceptance criteria only cover a happy path of two feeds — nothing for budget, Self-off, bad feed, or dismiss→relearn.

---

### Unrealistic scope

One agent is asked to own: multi-vendor release monitoring, npm/security, provider/adapter probing, open-web idea search, telemetry Self, prompt learning, weekly digest, editable sources UI, Inbox + Kanban integration.

Ship surface for v1 is really: **release feeds → scored Inbox findings → Make card / Dismiss**. Ideas + Self + adapter probe + learning look like phase 2; keeping them in the same acceptance bar invites a shallow, noisy Scout.

---

### Security / privacy

**Strong (keep):** read-only end-to-end; tools off in Assess; web as data; Self off by default; no message/file content in Self; no arbitrary shell sources.

**Risks the doc doesn’t close:**

- **SSRF:** “http(s) feeds” without blocking link-local / private / metadata IPs if Scout can reach them.
- **Prompt injection:** Filter *and* Assess both see untrusted release/blog text. Tools-off helps Assess; Filter still shapes what gets scored. Needs an explicit “untrusted content delimiters / no tool / no follow links” contract for Filter too.
- **Dismiss few-shots:** User reasons are lower risk than web, but still model input — cap length, strip control-like phrasing, don’t let dismiss text override system policy.
- **Stored findings:** Defers to “safe pipeline in 12” — fine, but Scout must require sanitised render (titles/summaries/links) as a Scout AC, not only a cross-spec hope.
- **Allowlisted commands:** `npm outdated` can hit the network; scope cwd, env, and timeout or “read-only” is marketing.
- **Privacy of Ideas queries:** Configured searches encode stack/interests; no retention/visibility note for query strings or raw fetched bodies.

Draft-PR open question correctly deferred; don’t reopen until the above is boring.

---

### UI / design quality (hierarchy, density, type, motion, legibility)

Mode: **Operate** inbox. App-screen bar: answer one job first, colour on data not chrome, real empty/error states, product-specific face — not a generic “feed + chips + right rail.”

**What’s thin or slop-prone in the Screen paragraph:**

1. **No primary question.** Is the job “triage today’s upgrades” or “manage sources”? First viewport should make triage one click away; source admin is secondary (rail or settings), not equal chrome.

2. **Generic composition.** Feed + badges + effort chips + detail + right rail could be any ops product. Spec never names a Scout-specific element (e.g. “what in JunOS it would touch” as the visual anchor, not another chip).

3. **Chip / badge density.** Source badge + effort chip (+ implied risk/relevance) without type scale invites pill clutter. Prefer: relevance as sort + one quiet secondary line; effort/risk as plain text or a single data hue, not a chip row.

4. **Hierarchy underspecified.** Sorted by relevance only — no treatment for high risk / breaking provider changes vs nice-to-have blog ideas. Colour should mark decision-worthy risk, not “health” decoration.

5. **Right-rail overload.** Sources + last-checked + health + cadence + run-now in one rail will crush scanability. Split: feed job vs “Sources” subview.

6. **Missing Operate states.** Empty feed, Scout never run, all sources unhealthy, run in progress, budget exhausted, Self disabled — none specified. App-screen study fails thin first screens and “nothing to do.”

7. **Typography / contrast / spacing.** No type roles, measure, or density target (list row height, summary length, detail sections). “One-line summary” is good; detail dump (“why / links / suggested change”) needs a fixed order and secondary ink for links/meta so body stays full-ink readable.

8. **Motion.** Run-now and Collect need progress/honest failure, not decorative motion. Spec is silent — risk of spinner-only or animated “health” without content.

9. **Copy.** “Ask Claude” is brittle; “Make card” is fine if the result state is visible (card link back). Dismiss reasons need short, scannable labels — already listed; ensure they aren’t buried in a modal with no undo.

10. **Digest.** Weekly digest “to the Inbox” with no list vs detail treatment will either spam Inbox or be invisible.

---

### Priority fixes for the next rev (spec-only)

1. Resolve Self: aggregates-only **or** drop “never used / repeated actions” until a privacy-safe definition exists.  
2. Define Ideas collection under the allowlist (or cut Ideas from v1).  
3. One dedupe story: stable key (source + external id / canonical URL) + dismiss suppression + optional few-shot — not title string alone.  
4. Narrow v1 AC to feeds → Inbox → card/dismiss; mark Ideas/Self/learning as later.  
5. Rewrite Screen as an Operate brief: one job, row anatomy, detail hierarchy, empty/loading/error, sources as secondary, no chip pile — and point at the mockup or drop “matches mockup.”

I can turn this into a line-annotated punch list against sections of `08-scout.md` if you want that next.
