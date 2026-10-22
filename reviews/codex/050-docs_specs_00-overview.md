1. **[high] The approval guarantee conflicts with the proposed autonomy modes.**  
   **Reference:** §Principles, line 12: “Jonas approves anything destructive or outward-facing.”  
   **Why it matters:** [06-hermes.md](docs/specs/06-hermes.md) permits “Autonomous (log only),” while [12-security-and-privacy.md](docs/specs/12-security-and-privacy.md) permits remembered approvals. The overview promises a stronger boundary than these modes provide. A supervision UI also cannot guarantee approval enforcement unless the executor actually pauses before acting.  
   **Concrete fix:** Define whether approval means per action or prior scoped authorization. State that no autonomy mode bypasses the destructive/external-action policy, and require enforceable approval gates before enabling agent tools.

2. **[high] “Local first” does not explain where private content goes.**  
   **Reference:** §Principles, line 10: “Data and credentials live on Jonas’s machine.”  
   **Why it matters:** Local storage does not mean local processing. Chat history, attachments and workflow inputs can reach remote providers; [03-connections-and-routing.md](docs/specs/03-connections-and-routing.md) also proposes automatic provider fallback. The overview gives no boundary against sending sensitive context to a different provider after a failure.  
   **Concrete fix:** Distinguish local persistence from remote inference. Require visible destination disclosure, an allowed-provider policy per conversation/project, and explicit authorization before fallback crosses that boundary. Clarify that provider sign-ins remain owned by official clients.

3. **[high] Subscription coverage is presented as guaranteed despite unresolved integration paths.**  
   **Reference:** §What JunOS is, line 6: “any model he already pays for”; §Principles, line 9: “Subscriptions, not API keys.”  
   **Why it matters:** The linked routing spec marks Grok as a low-confidence research spike and describes Nous authentication as “Portal login or key.” These are unresolved exceptions to the overview’s defining promise. Current [providers.ts](src/lib/providers.ts) also explicitly contains placeholders rather than working connections.  
   **Concrete fix:** Limit the promise to models exposed through verified subscription-backed adapters. Identify Claude/Codex as initial validation targets and label the remaining providers experimental or deferred. Decide whether key-based providers are excluded or optional exceptions.

4. **[med] The overview defines the whole product without defining the first usable release.**  
   **Reference:** §What JunOS is and §Screens, lines 6 and 15–28.  
   **Why it matters:** Eleven screen entries encompass chat, automation, agent supervision, search, indexing and a board. Yet [13-roadmap.md](docs/specs/13-roadmap.md) describes a phased build, and its foundation phase already requires mock screens and five integration spikes. Without a release boundary here, the entire catalogue can be mistaken for MVP scope.  
   **Concrete fix:** Add a short “First usable release” boundary: authenticated local daemon, one validated provider, streaming chat, persisted history and truthful connection states. Mark automation, Hermes, Scout and indexing by later phase. Put safety gates before the first tool-executing phase.

5. **[med] “Every … becomes an event” leaves sensitive-data retention unbounded.**  
   **Reference:** §Principles, line 11: “Every run, message, task and finding becomes an event.”  
   **Why it matters:** The architecture specifies append-only events, while the data model separately stores messages and run inputs/outputs. Without defining event contents, implementers may duplicate private text into an immutable stream and its backups. Deleting a conversation would then leave copies elsewhere.  
   **Concrete fix:** Define events as typed metadata and entity references by default. Require explicit retention, redaction and deletion rules covering messages, run records, event payloads, indexes and backups. Distinguish append-only operational history from permanent content retention.

6. **[med] The visual acceptance reference is missing and its authority is unclear.**  
   **Reference:** §Screens, line 15: “match the Stitch ‘Translucent Glass’ mockups in /design.”  
   **Why it matters:** No `/design` assets are present in this checkout. [14-ui-system.md](docs/specs/14-ui-system.md) references two design directories and calls its tokens starting values; [docs/design/stitch-prompts.md](docs/design/stitch-prompts.md) describes different navigation and blur placement. “Match” therefore has no reproducible acceptance target.  
   **Concrete fix:** Link committed, versioned reference images or a precise export. Establish precedence: Translucent Glass is fixed; the UI system governs behavior and tokens; mockups guide composition. Explicitly leave accent colour open.

7. **[med] The screen catalogue lacks a task hierarchy.**  
   **Reference:** §Screens, lines 18–28: Home, Agent chats, Inbox, Tasks, Workflows and Hermes appear as peer destinations.  
   **Why it matters:** The same work can surface in several places, but the overview never explains which surface owns the next action. The UI system turns this into a long icon rail; Home adds eight content blocks. Equal visual emphasis would make a command center harder to scan precisely when something needs attention.  
   **Concrete fix:** Define Home as the glance surface, Inbox as the decision queue, Chat as conversation, and Hermes as execution inspection. Group navigation into daily work, automation and administration. Require blocked decisions to outrank routine results, with one clear primary action per screen and progressive disclosure for logs.

8. **[med] “Match the mockups” is insufficient as a glass execution standard.**  
   **Reference:** §Screens, line 15; §Cross-cutting docs, line 35.  
   **Why it matters:** The linked UI system already requests 4.5:1 text contrast and motion/contrast preferences, but lacks a complete verification contract. Contrast varies over atmospheric backgrounds; typography and spacing lack a defined scale; opaque fallback currently depends on blur being unsupported rather than the user needing less transparency.  
   **Concrete fix:** Make the overview require acceptance against §14: test text contrast over the brightest composited glow and stacked panels; specify 3:1 contrast for essential controls/focus indicators; define body/metadata sizes, line heights, spacing and row density. Require an explicit opaque mode, reduced-motion replacements for shimmer/pulsing, and checks at phone width and 200% zoom. Preserve the glass direction throughout.