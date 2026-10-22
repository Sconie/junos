1. **[high] The approval promise conflicts with the agent modes and delivery order.**  
   **Reference:** Principle 4: “Jonas approves anything destructive or outward-facing.”  
   **Why it matters:** `06-hermes.md` permits an Autonomous mode with “log only,” while `12-security-and-privacy.md` says external and destructive actions always require approval. The roadmap introduces tool workflows in Phase 2, before the explicit approvals work in Phase 3. Implementers have competing definitions of the central safety guarantee.  
   **Concrete fix:** State that destructive actions, external writes, and spending require daemon-enforced approval in every mode. Make that enforcement a prerequisite for the first tool-enabled run.

2. **[high] “Local first” overstates the privacy boundary.**  
   **Reference:** Principle 2: “Data and credentials live on Jonas’s machine.”  
   **Why it matters:** Local persistence does not mean local processing. The linked specs send conversations and attached files to providers, optionally generate file summaries remotely, and replay history across models. `03-connections-and-routing.md` also allows automatic provider fallback. The overview gives no indication that a fallback can change who receives private context.  
   **Concrete fix:** Say “JunOS stores its records locally; selected content is processed by the chosen provider.” Clarify that provider logins remain owned by their clients, and require explicit permission for cross-provider fallback involving private context.

3. **[high] Subscription coverage is presented as guaranteed despite unresolved integrations.**  
   **Reference:** “chat with any model he already pays for” and Principle 1’s provider list.  
   **Why it matters:** `03-connections-and-routing.md` explicitly marks Grok as unconfirmed, Cursor as requiring verification, and Nous as potentially using a key. The overview turns research dependencies into a product promise and implies that every paid model is accessible through an adapter.  
   **Concrete fix:** Limit the promise to “supported models available through verified subscription clients.” Name Claude/Codex as initial targets pending successful probes; label other providers exploratory and define what happens when subscription access is unavailable.

4. **[med] The universal event stream lacks a privacy lifecycle.**  
   **Reference:** Principle 3: “Every run, message, task and finding becomes an event.”  
   **Why it matters:** `01-architecture.md` makes events append-only; `02-data-model.md` retains database backups. Without payload and deletion boundaries, sensitive conversation or file content can survive deletion through events and backups. “Every … becomes an event” also leaves metadata versus full-content storage ambiguous.  
   **Concrete fix:** Specify that events normally contain references and minimal metadata. Require retention, deletion/redaction, and backup-expiry rules for sensitive payloads before treating the stream as the universal record.

5. **[med] The overview does not distinguish the first usable release from the full ambition.**  
   **Reference:** “What JunOS is” and the eleven-screen inventory.  
   **Why it matters:** The overview presents chat, automation, supervision, indexing, discovery, and a board as one product scope. The roadmap further requires mock UI for all screens during “Foundations (days),” before the first real chat path. In `src/`, the existing application is still a shell. This encourages broad placeholder work before proving the core integration.  
   **Concrete fix:** Add a short release boundary: first release = verified chat, connection states, local history, cancellation, and daemon authentication. Mark the screen inventory by phase and keep future screens out of primary navigation until usable.

6. **[med] The named visual authority is unavailable and ambiguous.**  
   **Reference:** “Screens (match the Stitch ‘Translucent Glass’ mockups in /design).”  
   **Why it matters:** This checkout has no `/design` directory. The available `docs/design/stitch-prompts.md` is a prompt set, not exported mockups, and describes a different navigation inventory from `14-ui-system.md`. “Match” cannot be verified and leaves competing sources of truth.  
   **Concrete fix:** Link to committed, versioned reference images or the exact design artifact. Until available, designate `14-ui-system.md` as authoritative and explicitly identify the prompts as historical input.

7. **[med] Screen parity obscures the primary job and creates overlapping destinations.**  
   **Reference:** The Screens table gives Home, Chat, Agent chats, Inbox, Workflows, Tasks, Hermes, and Scout equal standing.  
   **Why it matters:** The linked UI system turns these into a long icon rail. Home aggregates eight blocks, while Chat, Agent chats, and Hermes all provide conversation entry points. Without clear destination boundaries, the interface risks becoming a generic command-center dashboard whose navigation requires remembering internal architecture.  
   **Concrete fix:** Define the primary journey—review what needs attention, then act—and give each destination one distinct purpose. Group automation and supervision destinations; explain when a user chooses Chat, Agent chats, or Hermes. Make pending decisions visually lead Home.

8. **[med] “Match the glass mockups” makes decoration more explicit than operational hierarchy.**  
   **Reference:** Screens heading and the link to `14-ui-system.md`.  
   **Why it matters:** The linked direction specifies violet/teal atmosphere, translucent panels, blur, and rounded cards. Without limits on their use, independent Home blocks and live activity can become equally prominent glowing panels—the generic AI-dashboard pattern highlighted by design-taste-frontend. Glass itself is an explicitly chosen direction; the gap is its operational discipline.  
   **Concrete fix:** Preserve the chosen identity, but require quiet reading surfaces, restrained atmosphere, and semantic status colour. Reserve emphasis for blocked approvals, failures, and the current action; keep dense logs and long messages on stable, high-contrast surfaces.

9. **[med] Typography and spacing have no reviewable quality target.**  
   **Reference:** Screens heading’s “match” requirement; Cross-cutting docs → UI system.  
   **Why it matters:** `14-ui-system.md` names fonts, a grid, and drawer widths but supplies no type scale, line-height scale, spacing rhythm, or density rules. The overview therefore delegates visual fidelity to an incomplete contract. Matching colours and corner radii could still produce cramped controls, weak headings, or large empty cards.  
   **Concrete fix:** Require the UI system to define title/body/meta roles, line heights, spacing tokens, control and row sizes, and responsive density. Add a visual acceptance gate using realistic populated, empty, error, and narrow-screen states.