1. **[high] The approval promise conflicts with the proposed autonomy model.**  
   **Reference:** Principle 4: “Jonas approves anything destructive or outward-facing.”  
   **Why it matters:** `06-hermes.md` permits “Autonomous (log only),” while `12-security-and-privacy.md` says external sends and destructive actions always require approval. These cannot all govern execution. The roadmap also places automation before the phase explicitly introducing approvals.  
   **Concrete fix:** Make this overview’s rule an invariant that overrides autonomy settings, remembered permissions, and provider defaults. Require enforced approval gates before enabling any automation with those capabilities. Distinguish approved model requests from actions such as sending mail, publishing, or pushing code.

2. **[high] “Local first” does not explain where private content goes.**  
   **Reference:** Principle 2: “Data and credentials live on Jonas’s machine.”  
   **Why it matters:** Local storage does not mean local inference. Chat history, attached files, workflow inputs, and optional AI tagging can reach cloud providers. `03-connections-and-routing.md` also proposes automatic provider fallback, potentially changing the recipient of sensitive context. The overview gives no indication of this boundary.  
   **Concrete fix:** State that JunOS stores its records locally but sends selected context to the chosen provider. Require explicit folder permissions for background processing and an approved set of fallback providers per conversation or workflow. Clarify that provider credentials remain in the official clients’ stores.

3. **[high] The central subscription promise exceeds the documented feasibility.**  
   **Reference:** “chat with any model he already pays for”; Principle 1 lists Claude, Codex, Cursor, Grok/X, and Nous Portal.  
   **Why it matters:** The linked connection spec explicitly marks Grok as unconfirmed, Cursor as requiring verification, and Nous as potentially using a key. Paying for a subscription does not establish that JunOS can access all its models through a supported client. This uncertainty affects the product’s primary promise.  
   **Concrete fix:** Promise access to **models exposed by verified, supported adapters**. Name Claude and Codex as the initial validation targets; label the others as research candidates. Preserve the no-API-key requirement as a release gate rather than implying every listed provider already meets it.

4. **[med] The event-stream principle lacks a privacy and deletion boundary.**  
   **Reference:** Principle 3: “Every run, message, task and finding becomes an event.”  
   **Why it matters:** This can be interpreted as copying sensitive content into an additional permanent store. The supporting architecture specifies append-only events, the schema includes flexible payloads, and backups retain copies. Deleting a conversation would not necessarily remove its content from events, run records, indexes, or backups.  
   **Concrete fix:** Specify that events contain references and minimal metadata by default. Require a retention and deletion policy covering primary records, event payloads, run output, derived indexes, and backup expiry; redact secrets before persistence.

5. **[med] The overview presents the complete vision without identifying the first usable release.**  
   **Reference:** “What JunOS is” and the eleven-entry Screens table.  
   **Why it matters:** Chat, scheduling, workflows, agent supervision, Scout, a board, and file indexing appear equally committed. The roadmap spreads them across multiple phases, while `src/` and the README describe an unwired scaffold. This makes scope and current capability easy to misread.  
   **Concrete fix:** Add a short distinction between **current scaffold**, **first release**, and **later vision**. Make the first release a verified subscription-chat path with local history and daemon authentication. Mark each screen’s delivery phase in the existing table.

6. **[med] “Match the mockups” points to an unavailable and conflicting design authority.**  
   **Reference:** Screens heading: “match the Stitch ‘Translucent Glass’ mockups in /design”; status: “Nothing here is final.”  
   **Why it matters:** This checkout has no `/design` directory. The available `docs/design/stitch-prompts.md` describes an older navigation structure and blur mainly on overlays, while `14-ui-system.md` specifies frosted panels and a larger navigation set. Implementers cannot reliably determine what “match” requires. The blanket draft disclaimer also fails to record the settled glass decision.  
   **Concrete fix:** Record **Translucent Glass as settled**, with the accent palette still open. Link the actual approved exports when available; meanwhile identify `14-ui-system.md` as the implementation authority and the older prompts as historical input.

7. **[med] The screen inventory does not establish a usable navigation hierarchy.**  
   **Reference:** Screens table: Home, Chat, Agent chats, Inbox, Tasks, Workflows, Hermes, Scout, Kanban, Files, Connections.  
   **Why it matters:** These are different kinds of destinations presented as peers. Chat overlaps Agent chats and Hermes; Inbox overlaps Home’s attention view. The linked UI spec turns this inventory into a long icon rail, adding recognition and navigation costs. Settings is referenced elsewhere but absent from this index.  
   **Concrete fix:** Distinguish primary destinations from contextual views and utilities. Define Home as a summary, Inbox as the authoritative decision queue, and Hermes as the detailed supervision surface. Make agent conversations accessible through shared Chat, clarify when a separate Agents destination is needed, and add Settings to the index.

8. **[med] Visual matching is not paired with a measurable usability acceptance standard.**  
   **Reference:** “match the … mockups” and the `14-ui-system` cross-reference.  
   **Why it matters:** A static reference cannot establish legibility over changing glow, working density, spacing rhythm, typography hierarchy, or motion behavior. The UI spec already requires text contrast and preference support, but leaves type sizes, line heights, spacing scales, and density largely undefined. Its reduced-motion instruction does not specify how pulsing and shimmering states behave.  
   **Concrete fix:** Add a brief quality gate here, with detailed values owned by `14-ui-system.md`:
   
   - Define title/body/metadata typography, line heights, gutters, panel padding, and row heights.
   - Make pending approvals and failures visually outrank routine activity.
   - Verify text contrast over the brightest composited glass background; verify essential control boundaries and focus indicators too.
   - Provide an explicit opaque mode and static equivalents for pulse/shimmer.
   - Check representative populated, empty, and error states at desktop, narrow widths, and 200% zoom before calling a screen complete.