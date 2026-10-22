1. **[high] A human-launched agent can bypass the promised execution gateway.**  
   **Reference:** `15-terminal.md:10–14` — “Jonas’s own typing is not gated”; “Anything run by a CLI model, workflow or Hermes” is gated; the VPS shell runs Hermes directly.  
   **Why it matters:** Typing a command that starts Hermes does not make its subsequent autonomous actions human actions. An unrestricted child process could bypass the gateway while the UI claims supervision. Spec 12 requires constrained execution and read-only operation where mediation is unavailable.  
   **Concrete fix:** Explicitly distinguish human shell authority from managed agent authority. Managed agent launches must use constrained adapters and gateway callbacks. Label other interactive agent launches as unmanaged; never imply their child actions are gated. Document the human-terminal exception to spec 12’s universal wording.

2. **[high] Closing a tab does not define how execution stops.**  
   **Reference:** `15-terminal.md:14,18` — “tabs close when the token is revoked or Stop is pressed”; idle timeout “closes VPS tabs.”  
   **Why it matters:** Removing the UI or disconnecting transport does not establish that local, remote or container processes have terminated. This falls short of spec 12’s cancellation, process-group termination and remote acknowledgement requirements.  
   **Concrete fix:** Define separate detach, close, interrupt and terminate operations. Stop must disable further input, cancel owned processes, escalate after the grace period and await shim confirmation. Preserve a visible session record showing `cancelling`, `stopped` or `stop not confirmed`; do not hide unresolved execution by closing its tab.

3. **[high] Automatic output persistence creates an insufficiently bounded privacy risk.**  
   **Reference:** `15-terminal.md:13,22` — “Session output is stored truncated for audit”; persistence across restarts remains open.  
   **Why it matters:** Human terminals can expose private documents, credentials and connection strings. Pattern redaction cannot establish that arbitrary output is safe to retain. Truncation limits volume, not sensitivity or retention duration.  
   **Concrete fix:** Separate metadata auditing from transcript capture. Make persistent human-session transcripts opt-in, specify byte and time limits, exclude raw keystroke/password capture, and provide clear/delete controls. Define redaction before persistence, including secrets split across output chunks, and deletion behaviour consistent with spec 12.

4. **[med] The transport references an architecture that explicitly excludes WebSockets.**  
   **Reference:** `15-terminal.md:9` — “the same authenticated SSE/WebSocket channel rules as 01.”  
   **Why it matters:** Spec 01 says “commands use plain HTTP. No WebSocket.” Consequently, there is no existing WebSocket contract to inherit, and input, resizing and session closure have no specified transport.  
   **Concrete fix:** Follow the current architecture: authenticated HTTP operations for create/input/resize/close and session-scoped SSE for output. Specify CSRF checks on mutations and ownership checks on every operation. If WebSockets are necessary, identify that as an explicit architecture change with handshake authentication and Origin validation.

5. **[med] Terminal output needs its own untrusted-content policy.**  
   **Reference:** `15-terminal.md:9,13` — xterm.js rendering and stored output, without rules for integration hooks or output-triggered behaviour.  
   **Why it matters:** Spec 12’s SafeMarkdown policy does not define terminal handling. Titles, hyperlinks and custom parser hooks introduce separate integration surfaces; xterm.js specifically warns that terminal-derived data must remain untrusted. [xterm.js security guidance](https://xtermjs.org/docs/guides/security/)  
   **Concrete fix:** Require safe text handling for titles and audit previews, validated click-only links, and explicit restrictions on clipboard access and custom escape-sequence handlers. Output must never become terminal input or approval authority. Add malicious-output acceptance cases.

6. **[med] Tab labels do not reliably identify the execution target.**  
   **Reference:** `15-terminal.md:6,11,14` — “two machines,” a separate “agent” tab, and access into the Hermes container.  
   **Why it matters:** There are at least three consequential contexts: the PC, VPS host and Hermes container. “VPS” identifies a machine; “agent” identifies an actor. Neither alone prevents typing an unrestricted command into the wrong environment.  
   **Concrete fix:** Require persistent daemon-controlled labels showing actor, host, host/container scope and effective user. Keep that identity visible when titles truncate, and distinguish interactive sessions from read-only agent output through text and affordances, not colour alone.

7. **[med] PTY lifecycle and capacity are missing from the implementation scope.**  
   **Reference:** `15-terminal.md:9,18–22` — PTY sessions are promised, but only shell choice and restart scrollback remain open.  
   **Why it matters:** Reconnection, browser closure, daemon restart, noisy processes and multiple tabs all need defined behaviour. Without limits, streaming output can exhaust buffers or storage; without input semantics, reconnection risks repeating commands. Phase 3 currently has no terminal-specific completion criteria.  
   **Concrete fix:** Specify session IDs, input ordering and deduplication, output resume boundaries, bounded buffers/scrollback, session limits and restart behaviour. Define whether idle means no input or no output. Add a Windows PTY feasibility spike and acceptance cases for reconnect, resize, sustained output and orphan cleanup.

8. **[med] “Next to” leaves layout, hierarchy and usable terminal space unresolved.**  
   **Reference:** `15-terminal.md:6` — “It sits next to the Hermes console and the run logs.”  
   **Why it matters:** Spec 06 already allocates 40%/60% to chat and activity, with bottom tabs. Another adjacent pane could leave all three surfaces cramped. The spec provides no entry point, default size or responsive composition; the current source contains only scaffold views.  
   **Concrete fix:** Choose an explicit layout, such as a resizable bottom dock with maximise/restore. Define minimum usable rows and columns, which neighbouring content yields space, a consistent spacing scale, and behaviour below 900 px and at 200% zoom. Keep active terminal output dominant while its controls remain compact.

9. **[med] Shared glass tokens do not cover terminal typography or ANSI contrast.**  
   **Reference:** `15-terminal.md:9` — “xterm.js,” without a terminal theme or legibility requirements.  
   **Why it matters:** Spec 14 covers UI tokens and fallbacks, but terminal output adds ANSI colours, dim text, inverse text, cursor and selection states. Passing UI token checks does not establish that these remain readable over blur and atmospheric bloom.  
   **Concrete fix:** Define monospace size, line height, zoom and a tested ANSI theme. Preserve the frosted shell while bounding the terminal background’s composited luminance. For an opaque fallback, `#E7E8EC` and `#A3A9B5` on `#121419` provide approximately **15.05:1** and **7.81:1** contrast. Test selection, cursor and ANSI states separately, and explicitly carry spec 14’s opaque/high-contrast fallbacks into the renderer.

10. **[med] Keyboard ownership, accessible escape and live-output motion are undefined.**  
    **Reference:** `15-terminal.md:6,9` — “Jonas types freely, like any terminal.”  
    **Why it matters:** Tab, Escape and Ctrl shortcuts can belong to either the terminal application or JunOS. Users need a predictable way to leave terminal focus and reach Stop. Continuous output can also disrupt reading even when decorative animations respect reduced motion.  
    **Concrete fix:** Define shortcut precedence, a discoverable focus-escape command, tab switching, copy/paste behaviour and screen-reader support. Preserve scroll position when reading history, show a “new output” indicator with jump-to-latest, and suppress decorative pulses/shimmer under reduced motion. Require a keyboard-only acceptance flow through session creation, a full-screen terminal application, target switching and Stop.