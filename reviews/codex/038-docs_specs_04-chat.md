1. **[high] Tool toggles do not define an enforceable permission boundary.**  
   **Reference:** Lines 15, 22: “tool toggles (Files, Web, Hermes, Tasks)” and “always behind the approval policy in 12.”  
   **Why it matters:** `01-architecture.md` runs official CLIs inside a project directory. Restricting daemon tools does not establish whether those CLIs can independently read files, execute commands, or use native tools. Approvals arrive in Phase 3 according to `13-roadmap.md`, after working chat.  
   **Concrete fix:** Require each adapter to enforce the selected tool allowlist and approval policy, including native CLI capabilities. Unsupported restrictions must disable that capability. Make enforcement a Phase 1 gate; “Files off” must have a precise, verifiable meaning.

2. **[high] Automatic routing can disclose a conversation to another provider without a clear decision.**  
   **Reference:** Lines 21, 23: “history is replayed as plain messages”; titles use “the cheapest connected model.”  
   **Why it matters:** Title generation can send private conversation content to an unrelated provider. Routing fallback in `03-connections-and-routing.md` introduces another automatic recipient; an after-the-fact message header cannot prevent that disclosure. “Stored locally” does not explain these outbound transfers.  
   **Concrete fix:** Generate titles locally or through the conversation’s approved provider. Specify authorized fallback providers per conversation, show the destination before first disclosure, and require confirmation when model switching would transfer existing history or attachments to a new provider.

3. **[high] Folder attachment and project selection have no bounded context contract.**  
   **Reference:** Lines 10, 15: “attach files or project folders”; selecting a project “sets `cwd`.”  
   **Why it matters:** The spec does not distinguish selecting a working directory from sending its contents. `11-files-and-projects.md` promises explicit attachment, exclusions, and size caps, but 04 never applies those rules to folder expansion, `@` mentions, or subsequent file changes. A token estimate alone does not prevent an oversized or sensitive submission.  
   **Concrete fix:** Define a pre-send manifest showing included files, exclusions, sizes, recipient, and extraction failures. Enforce allowlisted canonical paths, secret exclusions, folder/file limits, and an explicit context-overflow policy. Record the submitted content snapshot so later file changes do not silently change retries.

4. **[high] Rich message rendering lacks a security contract.**  
   **Reference:** Line 13: “markdown, code blocks … tables … tool-call cards.”  
   **Why it matters:** Model responses and tool output are untrusted content. Neither this spec nor `12-security-and-privacy.md` specifies safe HTML rendering, URL schemes, or remote images. Implementations could permit script injection or load tracking images merely by displaying a reply.  
   **Concrete fix:** Specify a sanitized renderer with raw HTML disabled by default, an allowed URL-scheme list, and remote media blocked pending user action. Tool cards must render structured data safely; generated text must never become an executable command or approval action automatically.

5. **[high] Streaming and cancellation have no recovery or duplicate-prevention semantics.**  
   **Reference:** Lines 14, 28–29: “Partial output is kept on cancel”; message submission returns SSE.  
   **Why it matters:** The spec does not say what happens when the stream disconnects after the daemon accepts a message, the user retries, or cancellation races with completion. `01-architecture.md` requires restart recovery, but 04 provides no way to reconnect to an existing run. Duplicate submissions could repeat tool side effects.  
   **Concrete fix:** Define submission idempotency, an immediately available run ID, ordered replayable events, and reconnection to that run. Specify queued/running/waiting-approval/completed/failed/cancelled states. Cancellation must stop execution, preserve explicitly marked partial output, and explain that completed side effects remain.

6. **[med] Plain-message replay conflicts with structured history and branching.**  
   **Reference:** Lines 13, 21: “collapsible thinking, tool-call cards … branch from this message”; history replayed “as plain messages.”  
   **Why it matters:** Flattening can turn tool output into apparent assistant speech, lose attachment provenance, and accidentally replay thinking content. The schema in `02-data-model.md` has no branch ancestry or alternative-response relationship, so retry and branch behavior are also unresolved.  
   **Concrete fix:** Define canonical typed history and adapter-specific serialization. Exclude thinking from replay; preserve tool-output provenance and attachment references. Specify whether retry creates a sibling response and branching creates a new conversation, with explicit parent references and branch-point rules.

7. **[med] Feature phases contradict the roadmap and leave Phase 1 unbounded.**  
   **Reference:** Line 16 assigns compare mode to Phase 3; lines 9–17 otherwise list features without phases.  
   **Why it matters:** `13-roadmap.md` puts compare mode in Phase 4, tasks in Phase 2, Hermes/Kanban in Phase 3, and indexing in Phase 4. Meanwhile, 04’s acceptance criteria cover Claude but omit the roadmap’s required Codex path and persisted history.  
   **Concrete fix:** Add a feature-to-phase table inside 04. Separate basic file attachment from indexed mentions; phase task, agent, and board actions explicitly. Align compare mode with the roadmap and include Claude, Codex, history persistence, fallback, and interruption recovery in Phase 1 acceptance.

8. **[med] The three-column layout has no rule for protecting the thread’s usable width.**  
   **Reference:** Line 7: conversation list, thread, composer, collapsible Context panel.  
   **Why it matters:** The referenced Stitch prompt uses 260px and 300px side panels; `14-ui-system.md` instead suggests 360–420px drawers. At 1000px, a 64px rail plus 260px list and 360px Context panel leaves only 316px before gutters. The shared below-900px rule activates too late.  
   **Concrete fix:** Declare authoritative panel widths and a minimum thread width. Collapse Context first, then the conversation list, whenever that minimum cannot fit. Specify sheet navigation, focus restoration, and composer behavior with the on-screen keyboard and enlarged text.

9. **[med] Message hierarchy, typography, and spacing are left to incidental implementation.**  
   **Reference:** Line 13 lists metadata, rich content, thinking, tool cards, and four message actions without presentation priorities.  
   **Why it matters:** Giving these elements equal prominence would turn a reading surface into repeated controls and panels. `14-ui-system.md` supplies font families and a 760px maximum, but no chat-specific type scale or rhythm. Existing `.bubble { max-width: 70% }` in `src/index.css` further narrows content inside an already constrained thread.  
   **Concrete fix:** Specify, for example, 16px message text at 1.55 line height, 13px metadata, and a roughly 65–75-character reading measure. Define separate spacing within content and between messages. Keep thinking/tool details collapsed, secondary actions in an accessible menu, and wide tables/code independently scrollable.

10. **[med] Glass contrast is stated globally but not resolved for chat’s actual states.**  
    **Reference:** Line 6: “matches mockup”; line 12: unsupported efforts are “greyed.”  
    **Why it matters:** The shared 4.5:1 requirement does not establish bubble, chip, link, selection, or focus colors over composited glass. With `14-ui-system.md` tokens, `#E7E8EC` on violet `#8B5CF6` is approximately **3.46:1**; violet text on solid `#14161B` is **4.27:1**. Both miss 4.5:1 for normal text.  
    **Concrete fix:** Define and verify chat-specific foreground/background pairs across glow positions and opaque/high-contrast fallbacks. One viable accent is the existing cooler blue `#7C9CFF`: **6.94:1** against solid `#14161B`, with dark `#0B0C0F` button text at **7.50:1**. Its lighter luminance offers more contrast headroom; these solid-surface measurements still require validation over glass.

11. **[med] Keyboard, assistive-technology, and streaming-motion behavior are unspecified.**  
    **Reference:** Lines 10–14: Enter-to-send, picker popovers, segmented effort control, streaming.  
    **Why it matters:** `14-ui-system.md` explicitly requires keyboard behavior in each spec. Here, Enter can conflict with IME composition or suggestion selection; token-by-token announcements can overwhelm screen-reader users; automatic scrolling can interrupt reading. Global reduced-motion guidance does not settle these interactions.  
    **Concrete fix:** Define keyboard selection, Escape behavior, focus return, and accessible labels for both pickers and suggestions. Enter must send only outside composition and active suggestion handling. Announce streaming status and coherent text chunks, preserve scroll position when reading earlier messages, offer “Jump to latest,” and replace animated indicators with static states under reduced motion.

12. **[med] Local conversation storage has no deletion or retention behavior.**  
    **Reference:** Line 20: “Conversations are stored locally; each assistant message links to its run.”  
    **Why it matters:** `02-data-model.md` stores message content, thinking, tool inputs/outputs, and run data, with fourteen nightly backups. Removing a conversation from the list could therefore leave its sensitive contents in several other places indefinitely.  
    **Concrete fix:** Specify conversation deletion, attachment-cache cleanup, linked-run retention, and backup expiry. Explain what deletion removes immediately and what remains until backup rotation. Give thinking and verbose tool payloads an explicit retention policy rather than retaining them implicitly.