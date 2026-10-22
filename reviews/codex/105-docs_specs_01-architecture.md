1. **[high] The gateway guarantee exceeds the remote enforcement architecture.**  
   **Reference:** §Execution gateway, lines 46–47: “All side effects … only the gateway executes or approves them.”  
   **Why it matters:** §Where things run places Hermes on the VPS, where it also accepts Telegram directives (§06). A private tunnel and an action-request API do not establish that Hermes’s shell, browser and network tools cannot bypass junosd. §12 explicitly guarantees enforcement only for actions Hermes asks JunOS to perform.  
   **Concrete fix:** Distinguish locally enforced actions from remote autonomous actions. Require verified remote tool interception before claiming gateway control; otherwise expose that limitation and disable JunOS-initiated remote execution requiring that guarantee.

2. **[high] Run identity and enforcement context are missing from the adapter boundary.**  
   **Reference:** §Provider adapter interface, lines 30–38: `run(req)` versus `cancel(runId)`; `RunRequest` contains neither `runId` nor a gateway interface.  
   **Why it matters:** The contract does not explain how an adapter receives its persisted run identity, associates tool requests with it, or exposes the process handle needed for Stop. This leaves safety-critical behavior to incompatible adapter-specific conventions.  
   **Concrete fix:** Have junosd allocate the run first. Pass a typed execution context containing `runId`, cancellation signal and gateway interface; define how process ownership, tool requests and terminal events attach to that identity. Keep policy authoritative in junosd.

3. **[high] Sequence numbers do not close the snapshot/reconnect consistency gap.**  
   **Reference:** §Event stream contract, line 44: “sends `resync` and the client refetches snapshots.”  
   **Why it matters:** Events can arrive while snapshots are fetched. Without a snapshot watermark and replay boundary, the client can miss a change or overwrite newer state with an older snapshot. Separately committing state and its event also allows a crash to produce a durable change with no notification.  
   **Concrete fix:** Commit domain changes and their events in one SQLite transaction. Return snapshots with a consistent sequence watermark; buffer subsequent events and apply only those after that watermark. Define recovery for deleted records and interrupted resynchronization.

4. **[med] The adapter status type contradicts the shared connection-state model.**  
   **Reference:** §Provider adapter interface, line 32: `connected: boolean`.  
   **Why it matters:** §03 requires `connected`, `needs_login`, `rate_limited`, `unavailable`, `degraded` and `unknown`. A boolean plus free-text error cannot reliably drive reconnect instructions, budget-aware scheduling or honest model-picker states. The scaffold’s `src/lib/providers.ts` already uses this boolean, so the architecture would preserve the limitation.  
   **Concrete fix:** Replace it with the shared discriminated status type, including structured reason, probe timestamp and optional rate-limit reset. Keep provider connection state distinct from Hermes agent state.

5. **[med] The stream topology and command response contract disagree across specs.**  
   **Reference:** §Transport decision, line 41: “commands use plain HTTP” and “same SSE channel per subscription.”  
   **Why it matters:** §04 instead specifies `POST /conversations/:id/messages -> SSE of RunEvent`. It is unclear whether a client opens one daemon-wide stream, one per provider, or one per run—and whether sequence deduplication is global across them. This complicates concurrent chats, reconnects and cancellation.  
   **Concrete fix:** Choose one contract here: commands return `{runId}`; one authenticated event stream multiplexes typed events carrying run/provider/conversation identifiers. Update the referenced chat contract to match, and specify how a newly opened tab obtains its initial cursor.

6. **[med] Streaming has no resource or rendering budget, threatening both readability and safety controls.**  
   **Reference:** §Transport decision and §Event bus, lines 41–50: token output shares the event infrastructure with application updates.  
   **Why it matters:** Unbounded token, thinking and tool output can create excessive persistence, replay traffic and React updates. During busy runs, the thread can jump, keyboard focus can be disrupted, and Stop or approval updates can appear late. These are execution-quality problems for the chosen glass interface regardless of its styling.  
   **Concrete fix:** Specify delta coalescing, bounded subscriber queues and an overflow-to-resync policy. Require batched UI updates, stable focus, scroll following only when already at the bottom, and prompt delivery of control-state events. Reference §14’s motion and opaque-panel fallbacks as acceptance requirements.

7. **[med] “Append-only” and truncated audit output lack a privacy-safe lifecycle.**  
   **Reference:** §Event bus, line 50, and §Reliability rules, line 76: “Append-only” events; output retained “for audit.”  
   **Why it matters:** §12 requires content deletion across events and run output, and redaction before persistence. This architecture does not reconcile those requirements with append-only storage or define whether token/thinking content enters the replay log. A size cap limits volume, not sensitive-data exposure; it can also discard useful audit evidence.  
   **Concrete fix:** Define append-only as normal-operation behavior with explicit retention/deletion exceptions. Keep event payloads minimal, redact before any persistence, separate content retention from action-decision audit records, and record truncation metadata. Reference §12 directly beside the storage rule.

8. **[med] Moving junosd to the VPS is presented as a scheduling fix without accounting for its other responsibilities.**  
   **Reference:** §Where things run, line 23: “move junosd to the VPS too.”  
   **Why it matters:** junosd also owns local file watching, project paths, CLI sessions and local execution. Moving it changes those capabilities and the meaning of `cwd`; provider terms are only one dependency. Maintaining local access would introduce another agent, synchronization or remote filesystem boundary beyond the stated architecture.  
   **Concrete fix:** Keep the first-release topology explicitly local and describe sleep through bounded catch-up. Mark VPS migration as a separate architecture decision requiring storage, credentials, execution, file-access and UI-auth designs.

9. **[low] The service decision remains contradictory and lacks a concrete Windows startup contract.**  
   **Reference:** §Open questions, lines 79–80: Windows auto-start is decided, followed by an unresolved launchd/systemd question.  
   **Why it matters:** These describe different operating systems, while §13 also leaves “service install” until Phase 5. Running under the wrong account or environment can make already-authenticated provider CLIs appear disconnected.  
   **Concrete fix:** Record Windows as the initial platform, select the per-user startup mechanism and phase, and specify account identity, CLI discovery, restart behavior and singleton ownership. Remove or explicitly defer the macOS/Linux question.