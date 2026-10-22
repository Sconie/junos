1. **[high] Mandatory approval conflicts with the permitted autonomy model.**  
   **Reference:** Principle 4: “Jonas approves anything destructive or outward-facing.”  
   **Why it matters:** [06-hermes.md](docs/specs/06-hermes.md) permits “Autonomous (log only),” contradicting this guarantee. The roadmap also places automation before the explicit approval milestone, leaving the safety requirement’s delivery order unclear.  
   **Concrete fix:** Make this principle an invariant: every executor must enforce approval before destructive actions or external writes. Define whether remembered, scoped approvals qualify; exclude unrestricted log-only execution. Require enforcement before enabling automation.

2. **[high] “Local first” overstates the privacy boundary.**  
   **Reference:** Principle 2: “Data and credentials live on Jonas’s machine.”  
   **Why it matters:** Local persistence does not imply local inference. Chat attachments, workflow context and conversation history can reach external providers; routing fallback in [03-connections-and-routing.md](docs/specs/03-connections-and-routing.md) can change the recipient. The overview gives no indication of that distinction.  
   **Concrete fix:** State that storage and orchestration are local, while selected providers may process content remotely. Require visible destination information and explicit permission for cross-provider fallback involving private context. Clarify that provider credentials remain in official clients’ stores.

3. **[high] Subscription coverage is presented as a promise despite unresolved feasibility.**  
   **Reference:** “Chat with any model he already pays for”; Principle 1 lists Claude, Codex, Cursor, Grok/X and Nous Portal.  
   **Why it matters:** The connections spec labels Grok a research spike, Cursor unverified, and Nous potentially key-based. The overview consequently makes uncertain integrations—and the absence of API keys—sound guaranteed.  
   **Concrete fix:** Promise access to **verified, supported subscription clients**. Identify Claude/Codex as the initial implementation targets, subject to their capability spikes; label remaining providers conditional. State how providers requiring separately billed access are handled.

4. **[med] The scope has no visible first-release boundary.**  
   **Reference:** “What JunOS is” and the eleven-entry Screens table.  
   **Why it matters:** Chat, scheduling, workflow execution, agent supervision, indexing, search and a board appear equally committed. Although [13-roadmap.md](docs/specs/13-roadmap.md) provides phases, Phase 0 still asks for every screen on mock data before the first real chat path. That creates substantial UI work around unverified capabilities.  
   **Concrete fix:** Add a short release boundary and a phase/status column to the index. Make the first deliverable one authenticated, persisted chat path with visible connection failures; progressively expose automation and agent surfaces when their prerequisites work.

5. **[med] The visual source of truth is unavailable and its authority is ambiguous.**  
   **Reference:** “Screens (match the Stitch ‘Translucent Glass’ mockups in /design)” and “Nothing here is final.”  
   **Why it matters:** `/design` is absent from this checkout, including the reference directories named in [14-ui-system.md](docs/specs/14-ui-system.md). The available Stitch prompts describe a different navigation inventory. Implementers cannot reliably determine which geometry to match, while the blanket draft disclaimer also makes the settled glass direction appear provisional.  
   **Concrete fix:** Record Translucent Glass as settled, with palette still open. Link to available, versioned references and specify precedence: functional specs and accessibility requirements override illustrative mockup details. Mark unavailable assets as pending.

6. **[med] The screen inventory does not establish a navigation or attention hierarchy.**  
   **Reference:** Screens table: Home, Agent chats, Inbox, Hermes console, Tasks and Workflows launcher.  
   **Why it matters:** These are overlapping destinations without stated boundaries. The UI spec turns them into a long icon rail, while Home contains eight competing blocks. Jonas must infer where to ask an agent, inspect its work or resolve its approval. Existing `src/App.tsx` also uses “Overview” and “Scheduled,” creating naming drift.  
   **Concrete fix:** Add each screen’s primary job and canonical name. Define Home as a summary, Inbox as the decision queue, agent chats as conversation, and Hermes as execution detail. Group navigation by use and require urgent decisions to outrank ambient status.

7. **[med] “Match the mockups” lacks a measurable glass-execution acceptance gate.**  
   **Reference:** Screens heading and the link to “design tokens, layout, components, states.”  
   **Why it matters:** The UI spec already requires 4.5:1 text contrast, reduced-motion support and a blur fallback, but does not define typography sizes, line heights, spacing rhythm or density targets. Nor does it specify contrast checks over composited glow backgrounds. A static mockup cannot establish legibility during streaming, expanded logs or narrow layouts.  
   **Concrete fix:** Make the linked UI contract a release requirement: define type and spacing scales; test text contrast over the brightest permitted composite; require 3:1 contrast for essential control boundaries and focus indicators. Verify representative dense states at desktop, tablet and phone widths, at 200% zoom, with motion reduced and an explicitly selectable opaque/high-contrast presentation. Preserve glass as the default direction.

8. **[med] The universal event-stream principle leaves sensitive-data retention undefined.**  
   **Reference:** Principle 3: “Every run, message, task and finding becomes an event.”  
   **Why it matters:** Read literally, this encourages duplicating private content into an append-only record. [02-data-model.md](docs/specs/02-data-model.md) also retains messages, run inputs, step outputs and backups, without a defined deletion lifecycle. Removing a conversation could leave its contents elsewhere.  
   **Concrete fix:** Specify that events normally contain identifiers and minimal metadata, with content stored separately. Require retention and deletion rules covering messages, run records, indexes and backups; distinguish a minimal approval audit from indefinitely retained private payloads.