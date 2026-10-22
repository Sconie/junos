1. **[high] The approval promise conflicts with the permitted autonomy and delivery order.**  
   **Reference:** Principle 4: “Jonas approves anything destructive or outward-facing.”  
   **Why it matters:** `06-hermes.md` permits “Autonomous (log only),” while `12-security-and-privacy.md` says external sends and destructive actions always require approval. The roadmap introduces automation in Phase 2 but places Hermes approvals in Phase 3 and sandboxing in Phase 4. The overview presents an unconditional guarantee without identifying which rule wins or requiring enforcement before execution.  
   **Concrete fix:** Make this principle a release gate: all enabled executors must enforce approval **before** a destructive action or external write. Disable executors that cannot intercept those actions. Explicitly resolve whether saved permissions can authorize future actions and remove the conflicting “log only” exception from the stated contract.

2. **[high] “Local first” obscures where private content is processed.**  
   **Reference:** Principle 2: “Data and credentials live on Jonas’s machine.”  
   **Why it matters:** Local storage does not mean local inference. The linked specifications send conversations and attached files to providers, allow background AI tagging, and automatically fall back between providers. A reader could reasonably infer stronger privacy than the system provides; fallback can also send the same sensitive context to another provider without a prior decision.  
   **Concrete fix:** State: “History and indexes are stored locally; cloud models receive the context needed for enabled requests.” Require explicit consent for background processing and an allowed-provider policy for each conversation or workflow. Distinguish ordinary inference requests from external actions requiring approval.

3. **[med] Subscription coverage is promised before feasibility is established.**  
   **Reference:** “Chat with any model he already pays for” and Principle 1’s five-provider list.  
   **Why it matters:** `03-connections-and-routing.md` marks Grok as an unconfirmed research spike, Cursor as requiring verification, and Nous as potentially using a key. These qualifications contradict the overview’s categorical “Subscriptions, not API keys” promise. `src/lib/providers.ts` confirms that current connections are placeholders.  
   **Concrete fix:** Promise “supported models available through verified subscription adapters.” Identify Claude/Codex as the initial implementation targets, mark other providers as conditional, and state whether paid API access is excluded or an explicit optional exception.

4. **[med] The visual authority points to missing assets and has no precedence rule.**  
   **Reference:** Screens heading: “match the Stitch ‘Translucent Glass’ mockups in /design.”  
   **Why it matters:** `/design` is absent from this checkout. The available `docs/design/stitch-prompts.md` describes a different navigation inventory and blur mainly on overlays; `14-ui-system.md` specifies frosted panels and a larger navigation system. “Match” cannot resolve those differences, and an implementer cannot verify the intended reference.  
   **Concrete fix:** Link the actual committed reference assets or stable exports. Declare precedence: functional and accessibility requirements govern behavior; `14-ui-system.md` governs implementation tokens; named Translucent Glass references govern visual direction. Treat the older prompts as historical input.

5. **[med] The screen inventory does not distinguish the first usable product from later scope.**  
   **Reference:** “What JunOS is” and the eleven-row Screens table.  
   **Why it matters:** Chat, scheduling, workflow execution, agent supervision, discovery, indexing, search and a board are presented as one undifferentiated product commitment. Although the roadmap phases them, Phase 0 still requires mocked UI for every screen before the first real chat path. That creates substantial speculative UI work around unresolved provider and Hermes contracts.  
   **Concrete fix:** Add phase and status columns to the overview: existing shell, first release, later, or research-dependent. Name the first complete path—connect a supported provider, send a message, retain history—and defer screens whose underlying contracts remain unverified.

6. **[med] The attention hierarchy is unclear across overlapping destinations.**  
   **Reference:** Home, Agent chats, Inbox, Hermes console, Scout and Kanban entries.  
   **Why it matters:** The same directive, finding or result can appear across several destinations. The overview names screens without explaining where Jonas should act first. The linked UI system compounds this with twelve icon-only navigation destinations, making closely related areas harder to distinguish.  
   **Concrete fix:** Add a short navigation contract: Home summarizes; Inbox owns decisions; Chat/Agent chats own conversation; Hermes owns execution inspection; Kanban owns work state; Scout owns discovery. Group navigation by those jobs and provide a labelled expansion rather than relying solely on tooltips.

7. **[med] Glass execution lacks a testable acceptance contract.**  
   **Reference:** Screens heading and the `14-ui-system` link.  
   **Why it matters:** The UI system already requests 4.5:1 text contrast, reduced motion and an unsupported-blur fallback. It does not specify testing over the brightest glow, stacked panels, or interaction states, nor an opaque option when blur is supported. Its proposed text/accent pair, `#E7E8EC` on `#8B5CF6`, yields only **3.46:1** if used for normal-size button labels.  
   **Concrete fix:** Add an overview-level visual acceptance gate covering composited contrast, distinguishable controls and focus, an explicit opaque mode, and static replacements for pulse/shimmer under reduced motion. One alternative accent is ice blue `#70C9E8`: it supports **9.57:1** against opaque `#15171C`, or **10.44:1** with `#0B0C0F` labels on its fill, while staying distinct from teal success states. These are opaque-pair calculations; glass compositions still need testing.

8. **[med] “Match mockups” leaves typography, spacing and density underspecified.**  
   **Reference:** Screens heading and Principle 5: “Boring and changeable.”  
   **Why it matters:** `14-ui-system.md` names font families and a grid but supplies no type scale, line heights, spacing scale or row-density rules. The linked screens combine multi-pane conversations, logs, tables and eight Home sections. Without shared rules, independently matched mockups can produce inconsistent hierarchy, cramped metadata and competing glass panels.  
   **Concrete fix:** Require `14-ui-system.md` to define a compact type scale, body line heights, spacing tokens, row heights and minimum pane widths. Set one dominant job per screen, collapse secondary panes before shrinking text, and verify representative empty, populated and long-content states at desktop, tablet and phone widths.