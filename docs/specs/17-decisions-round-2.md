# Decisions, round 2

Status: 2026-10-22. Jonas answered these on the decision board (interactive page with a diagram per option). They refine or settle open questions in specs 04 to 16; where a spec disagrees, this file wins until the spec is edited.

| # | Topic | Decision |
|---|---|---|
| Q15 | Terminal shell | The PC terminal tab opens **WSL (Linux)**. VPS tab as in 15. |
| Q16 | Concurrency | Up to two runs per subscription was picked, with a note: Jonas prefers **one task per subscription**, with a small local router deciding what runs where to avoid rate limits. See Q29 (pending). |
| Q17 | Hermes web UI | **Rebuild natively.** JunOS draws its own Hermes screens from the shim (status, live steps, memory, chat); the Hermes web UI is not embedded. Jonas dislikes the official app and dashboard and wants a custom chat interface (see 06 and Q32). The shim therefore must expose steps and memory. |
| Q19 | Scheduled tasks | The daemon runs tasks through the provider CLIs by default; Hermes runs the tasks that say so. |
| Q20 | Hermes autonomy | Default is **Balanced**: reads and writes in a work copy run freely, shell asks. Send/delete/spend always ask. |
| Q21 | Night alerts | The JunOS bot is quiet at night **except approvals**, which always arrive. Results and Scout digests wait for morning. Quiet window 23:00 to 07:00 (configurable). |
| Q22 | Retention | Chats and run logs are kept **90 days**, but Jonas wants a **condensed record kept afterwards** (summary and/or index) instead of plain deletion. Detail in Q30 (pending). Approvals and the audit trail are always kept. |
| Q23 | Telegram content | A **short summary** (what and where), not the full command. Jonas still wants to **approve from Telegram**. The button-press check is in Q31 (pending). |
| Q24 | Approval expiry | **30 minutes** then auto-deny (as drafted in 06). |
| Q25 | Backups | Nightly backups go to an **external drive**. |
| Q26 | CLI agent sandbox | **Container (WSL or Docker)** with only the work copy mounted. This replaces the "worktree plus scrubbed environment only" choice in spec 16 for Phase 4 hardening; until the container exists, the scratch-dir mode stays as the interim. Provider logins must be shared into the container read-only. |
| Q27 | Nous Portal | Reached **only through Hermes**; no standalone adapter. |

## Pending (on the board)
Q18 workflow authoring, Q28 live test calls to providers, Q29 router, Q30 condensing old chats, Q31 Telegram approve flow, Q32 Hermes chat layout.
