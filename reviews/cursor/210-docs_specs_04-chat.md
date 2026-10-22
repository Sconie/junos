**Verdict:** As a Phase 1 Operate/chat surface, this spec overloads Features while under-specifying hierarchy, states, and egress UX. Rev 2 fixes the worst permission illusions, but several internal contradictions and a chrome-heavy message model remain.

Lens: **impeccable Operate** + **design-taste app screens** (worked-in chat, not a marketing page). No live UI to inspect—review is of what the doc *commits* implementers to build. Product glass direction lives in 14; this doc still has to survive those constraints.

---

### Contradictions

1. **History replay vs provider warning**  
   Behavior: mid-thread switch replays history as **plain messages**. Rev 2: warn that **attachments/tool results** go to the new provider. Those cannot both be true without a precise rule (e.g. plain text only vs full run artifacts). Implementers will guess wrong on egress.

2. **Auto-title vs allowed providers**  
   Behavior: title from the **cheapest connected** model. Rev 2: auto-title **respects** the conversation’s allowed-providers list. Cheapest-connected ∉ allowed is undefined (block? pick cheapest allowed? skip?).

3. **Tool surface mismatch**  
   Context toggles: Files, Web, Hermes, Tasks. Behavior tool set: read file, list projects, create card, create task. **Web** and **Hermes** appear as toggles but not in the exposed set; **list projects / create card** have no toggles. Rev 2’s “toggles are requests” doesn’t fix the inventory mismatch.

4. **Attach “project folders” vs manifest**  
   Features still reads like attaching a tree; Rev 2 correctly says manifest + on-demand allowlisted reads. The Features line should be rewritten or it will be implemented as upload/sync.

5. **Phase scope**  
   Features includes **Compare mode (phase 3)** and a full slash/`@` surface; Acceptance is only Phase 1 stream/picker/logged-out. The doc never says which Features are Phase 1 vs later, so “done” is unbounded.

6. **Cancel ownership**  
   Streaming cancel lives in Chat; 14 puts a global **StopControl** in the top bar. 04 never says whether composer cancel, StopControl, or both cancel a chat run—and what the thread shows for each.

---

### Gaps (product / API / behavior)

| Area | Missing |
|---|---|
| **States** | Empty thread, empty list, search-no-hits, loading skeletons, stream error, reconnect, offline daemon, provider disconnect mid-stream |
| **Keyboard** | Beyond Enter / Shift+Enter: focus order, list→thread→composer, Escape (cancel? close panel?), when shortcuts apply with IME |
| **Branching** | How branches appear in the list/thread, default view, whether context panel/tools follow the branch |
| **Message actions** | Placement, overflow, confirmations for “send to Kanban” / “save to file” (path? overwrite?) |
| **`@` / `/hermes`** | What context is injected; whether Hermes directives cross the VPS trust zone from this composer |
| **API** | No GET-by-id, attachments upload, `allowedProviders`, auth/CSRF on SSE, event shape, pagination for messages, delete/export |
| **Responsive** | 14 collapses rail/panels below 900px; 04’s three-pane + context drawer has no phone composition |
| **“Matches mockup”** | No path/link to the mockup; visual truth is unpinned |
| **Token estimate** | What counts (system, tools, attachments, thinking); stale vs live; user-visible confidence |

---

### Unrealistic scope

Phase 1 Acceptance is three checks. The same Features block also commits: multi-provider picker + effort + attachments + `@` + `/` commands + agent badge + tool-call cards + thinking + retry/branch/Kanban/save + context panel + provider allowlist disclosures + model-switch egress warnings + (later) compare.

For an Operate surface, that is several products in one chrome shell. Taste/impeccable both push **one primary job on the first screen**; here the job (“send and read this thread”) competes with model/effort/tools/context/routing chrome before the first token arrives.

---

### Security / privacy risks (as specified in 04)

Rev 2 correctly demotes tool toggles and defers markdown to 12. Remaining risks **this doc** still leaves open:

- **Provider egress ambiguity** (replay contradiction): tool results and attachment bytes may silently leave the machine on model switch or auto-title.
- **`/hermes <directive>` from Chat**: composer becomes a bridge into another trust zone with no approval/disclosure rule here.
- **`@` agent / file / project**: undefined whether mention expands file contents or agent memory into the provider payload.
- **“Save to file” / “send to Kanban”**: side effects from message chrome; no class (write-local vs external) or ApprovalCard trigger called out in 04.
- **Attachments**: no type/size/secret-scanning rules in 04 (only folder allowlist / `.junosignore` for projects).
- **Partial output kept on cancel**: may persist incomplete tool-call JSON or secrets into local history and later replay.
- **SSE `RunEvent`**: no allowlist of fields shown vs stored; easy to log prompts/tool args in the UI layer.
- **Local conversations**: “stored locally” only—no retention/export/delete UX in 04 (12 has deletion invariants; Chat doesn’t expose them).

Disclosure on first new provider is good; it does not cover **fallback**, **compare mode dual-send**, or **title generation** as first-class moments in the composer.

---

### UI / design quality (hierarchy, spacing, type, density, motion, legibility)

**Mode:** Operate / app screen. Success = continue the thread with low chrome noise; brand lives in precise details (glass from 14), not decoration.

**Strengths worth keeping**
- Clear three-zone IA (list / thread / context) matches chat conventions.
- Rev 2 disclosure + “toggles ≠ permissions” is the right quiet safety pattern.
- Effort as segmented control (named in 14) is a familiar Operate pattern if kept secondary.

**Priority UI problems in the spec**

1. **No stated primary question**  
   App-screens §2.2: name the one question. 04 never does. Result risk: first paint is chrome (list groups, picker, effort, four toggles, context) around an empty or thin thread—the “thin first screen” failure mode from the app study.

2. **Message chrome density**  
   One assistant message carries: model + effort + route header, markdown, code+copy, tables, collapsible thinking, tool-call cards, then retry / branch / Kanban / save. That is **>4 concurrent decision points** on a single artifact (impeccable cognitive-load flag). Taste would put one trailing kebab + progressive disclosure; primary ink on content, meta in dim text.

3. **Permanent effort + model chrome**  
   Four-segment effort always visible, plus provider-grouped picker, plus context toggles. Colour/chrome budget for app screens is tight (~3% colour). Spec doesn’t demote these when a stream is active, so controls will fight the transcript for attention.

4. **“Greyed” effort levels**  
   Operate: disabled must stay legible and say why. “Greyed where unsupported” without replacement copy or contrast floor invites WCAG failures on glass (`--text-dim` on `--panel`).

5. **Three frosted panes**  
   List + thread + context as glass panels vs 14’s “blur never nested more than two deep.” 04 doesn’t constrain stacking/opacity, so a literal layout will violate the UI system and taste’s flat-surface preference (brand may keep glass; nesting still needs a rule).

6. **Hierarchy / type unspecified**  
   No roles for list row title vs meta, message body vs thinking vs tool card, composer vs disclosure. App type scale is ~12/14/16/24—thinking/tool cards will sprawl without a size/weight budget. Max chat measure (760px in 14) isn’t restated here; wide tool cards will break the reading column.

7. **Motion**  
   Streaming, cancel, panel collapse, compare—all unspecified. Operate: 150–250 ms, state only, no load choreography; app screens: **no motion floor**, feedback only. Spec should ban decorative stream glitter and require `prefers-reduced-motion` (keep tokens, drop travel)—currently silent.

8. **Compare mode vs measure**  
   Side-by-side two models fights 760px readable measure and density rules; as written it’s a layout landmine for Phase 3.

9. **False affordance risk on toggles**  
   Even with Rev 2 prose, labels “Files / Web / Hermes / Tasks” read as capabilities granted. Without UI copy (“model may request…”), taste/heuristics (match system–real world) fail.

10. **Empty / error / loading omitted**  
    App-screens §11 is non-optional for trust. Acceptance doesn’t include a first-run empty chat that teaches composer + picker + why send is disabled when logged out (Acceptance mentions composer explanation only for logged-out—good seed, not generalized).

11. **Agent badge + list provider icons**  
    Two competing identity marks per row without a rule for which dominates (provider vs agent vs project). Badge spam is a classic inbox tell.

12. **Legibility of “route” in headers**  
    `"Claude Opus, high, via subscription"` as standing header chrome will wrap/truncate on glass; no truncation/tooltip rule.

---

### Highest-leverage fixes (spec-only; not implementing)

1. Split Features into **Phase 1 / 2 / 3** and shrink Phase 1 to stream + picker + effort + empty/error + logged-out.  
2. Resolve **plain replay vs tool/attachment egress** in one normative paragraph.  
3. Align **tool toggles ↔ gateway tool inventory**; rename toggles to request affordances in the UI copy.  
4. Specify **message action IA** (one overflow) and **thinking/tool card** type/spacing hierarchy.  
5. Add **states + keyboard + narrow layout** acceptance bullets.  
6. Define **cancel vs StopControl**, **title model selection among allowed providers**, and **Hermes/`@` egress**.  
7. Pin the **mockup path** and a nesting rule for glass panes so layout can’t contradict 14.

---

Questions skipped: Ask mode / doc-only review—no live detector or sub-agent split; `Questions skipped: critique orchestration N/A for markdown spec audit`.
