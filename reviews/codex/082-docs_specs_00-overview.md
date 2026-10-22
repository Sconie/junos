1. **[high] The approval guarantee conflicts with the autonomy model and delivery sequence.**  
   **Reference:** Principle 4: “Jonas approves anything destructive or outward-facing.”  
   **Why it matters:** `06-hermes.md` allows “Autonomous (log only),” while `13-roadmap.md` introduces tool workflows in Phase 2 and agent approvals in Phase 3. The overview promises a safeguard that downstream specs can bypass or deliver later.  
   **Concrete fix:** Declare destructive actions, external writes and spending subject to mandatory approval across every executor, including Hermes. Make enforcement a prerequisite for tool execution, and distinguish these actions from permitted outbound model requests.

2. **[high] “Local first” leaves the actual privacy boundary unclear.**  
   **Reference:** Principle 2: “Data and credentials live on Jonas’s machine.”  
   **Why it matters:** Local persistence does not mean local processing. `11-files-and-projects.md` permits sending attached content and optional file summaries to models; `03-connections-and-routing.md` permits automatic fallback between providers. A conversation or file could reach a different provider without prior consent.  
   **Concrete fix:** State that storage is local but selected content may leave the machine. Require allowed providers per conversation/project, explicit permission before fallback crosses that boundary, and a visible indication of the destination provider.

3. **[high] The provider promise exceeds the documented feasibility.**  
   **Reference:** “Chat with any model he already pays for”; Principle 1 lists Claude, Codex, Cursor, Grok/X and Nous Portal.  
   **Why it matters:** `03-connections-and-routing.md` labels Cursor and Nous unverified and Grok a low-confidence research spike; Nous may require a key. The overview makes conditional integrations sound guaranteed and makes “no API keys” an absolute constraint they may not satisfy.  
   **Concrete fix:** Promise supported models exposed by verified subscription adapters. Name Claude/Codex as initial targets subject to validation; label the remaining integrations experimental and explicitly permit shipping without them.

4. **[med] The screen catalogue presents the full vision without a release boundary.**  
   **Reference:** “What JunOS is” and the eleven-row Screens table.  
   **Why it matters:** Chat, scheduling, workflow execution, agent supervision, indexing and discovery each carry substantial reliability requirements. `13-roadmap.md` stages them across six phases, while `src/App.tsx` currently exposes six shell routes and `src/lib/providers.ts` explicitly says nothing is wired up. The overview does not distinguish current capability, first release and later ambition.  
   **Concrete fix:** Add a short “Current state / First usable release / Later” distinction and a phase/status column in the table. Define the first release around persistent subscription chat and verified connections.

5. **[med] The visual reference is unavailable and its precedence is undefined.**  
   **Reference:** “Screens (match the Stitch ‘Translucent Glass’ mockups in /design).”  
   **Why it matters:** The referenced root `design/` directory is absent. The available `docs/design/stitch-prompts.md` describes a different navigation set from `14-ui-system.md`, and the source shell differs again. “Match” gives implementers no reliable authority for layout or interaction decisions.  
   **Concrete fix:** Link to committed, versioned reference images when available. State that glass is the settled material direction, functional specs govern behavior, and `14-ui-system.md` governs shared layout and tokens. Mark older prompts as historical input.

6. **[med] “Match the mockups” lacks an explicit usability acceptance gate.**  
   **Reference:** Screens heading and the cross-cutting link to `14-ui-system.md`.  
   **Why it matters:** The UI spec already requires 4.5:1 text contrast and motion preferences, but it leaves typography sizes, spacing and density largely unspecified. Unsupported-blur fallback also does not provide an opaque option for users whose browsers support blur. Screenshot matching alone cannot establish legibility over changing glows or usable streaming/log screens.  
   **Concrete fix:** Make visual acceptance conditional on a defined type/spacing scale, readable dense rows, keyboard focus, zoom/reflow, measured contrast over the brightest composited backgrounds, and opaque/reduced-motion modes. A viable accent candidate is existing-source blue `#7C9CFF`: **7.50:1** against `#0B0C0F`, visually distinct from teal health states. Use dark button labels; `#E7E8EC` on that blue is only **2.13:1**. Recheck actual glass composites.

7. **[med] The screen list does not establish attention hierarchy or navigation grouping.**  
   **Reference:** Separate entries for Home, Chat, Agent chats, Inbox, Tasks, Workflows, Hermes, Scout and Kanban.  
   **Why it matters:** These are related views, but the overview presents them as peers. `14-ui-system.md` translates them into twelve icon-only destinations, while `10-home-and-search.md` proposes eight Home sections. Without a priority rule, approvals and failures can compete with routine activity and decorative panels.  
   **Concrete fix:** State the primary journey: identify what needs attention, inspect context, act, then return. Group navigation into attention, conversations, automation and resources; make approvals/failures the dominant Home content and routine summaries secondary. Preserve visible labels or an expandable labelled rail.

8. **[med] “Every … message … becomes an event” has no data-minimization boundary.**  
   **Reference:** Principle 3: “One event stream.”  
   **Why it matters:** `02-data-model.md` combines append-only event payloads with stored messages and run inputs/outputs. Neither the overview nor linked specs establishes how sensitive content is removed from events, search indexes and backups. An audit trail can become an indefinite second copy of private material.  
   **Concrete fix:** Define events as minimal references and state transitions by default. Establish retention and deletion rules for content, derived indexes and backups, while retaining only the audit metadata needed to explain actions.