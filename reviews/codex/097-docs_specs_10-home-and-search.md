1. **[high] Inline approvals bypass the specified review context.**  
   **Reference:** Home, line 6: “inline Approve/Deny”; Rev 2, line 32: “Inbox is the authority for decisions.”  
   **Why it matters:** A five-item summary can omit the exact action, target, expiry, or irreversible consequences. Specs 07, 12, and 14 require those details and a fresh approval-status check, including when Telegram has already resolved the request.  
   **Fix:** Make Home’s row action **Review**, opening the authoritative Inbox detail. If inline decisions remain, require the full shared ApprovalCard, status revalidation, and stable row placement while focused.

2. **[high] Enter’s behavior is ambiguous between navigation, execution, and model submission.**  
   **Reference:** Command palette, lines 18–20: “Run workflow,” “Ask Hermes,” and “executes on Enter”; line 31 prohibits implicit model sends.  
   **Why it matters:** The spec does not distinguish opening a form from starting work. Fuzzy results updating beneath the selection could turn an intended navigation action into a workflow launch or prompt submission.  
   **Fix:** Define activation per result type: destinations navigate; creation actions open forms; workflows open parameter review; model requests open a composer with provider disclosure and explicit Send. Preserve selection by result ID and never select the Ask row automatically.

3. **[med] The aggregate endpoint does not guarantee independent loading.**  
   **Reference:** Lines 14 and 30: “no card may block the others,” but data may arrive through one `GET /home` response.  
   **Why it matters:** Per-card `status` fields describe a completed response; they do not prevent one slow provider or Hermes query from delaying that response for every card. This also undermines the one-second render criterion.  
   **Fix:** Specify that `/home` returns cached local snapshots under a bounded deadline, with integrations refreshed asynchronously. Alternatively, use independent card queries. Define unavailable-card behavior when no previous snapshot exists.

4. **[med] Snapshot and SSE reconciliation is undefined.**  
   **Reference:** Line 30: cards have `as_of` and “also update from the SSE stream.”  
   **Why it matters:** Timestamps alone cannot order snapshots against the sequence-based events in spec 01. An older HTTP response could overwrite a newer event, or an event between snapshot creation and subscription could be missed.  
   **Fix:** Include a snapshot sequence watermark, replay events after it, reject older updates, and refetch affected cards on `resync`. Show freshness explicitly and disable approval actions until revalidated.

5. **[med] Eight cards are listed without a hierarchy or density budget.**  
   **Reference:** Home, lines 4–12: greeting, Quick ask, five approvals, five runs, activity, board counts, subscriptions, findings, and recent files.  
   **Why it matters:** Equal visual treatment would make a glance page a dense inventory, with blocked work competing against routine usage meters. The mockups are absent, and the historical Stitch prompt covers a different six-card arrangement. Spec 14’s grid does not resolve these priorities.  
   **Fix:** Define a Home composition: Needs you as the dominant information region, compact Quick ask, secondary run/agent summaries, and lower-priority discovery content below. Set card spans, row caps, totals with “View all,” spacing, and responsive reading order. A practical starting point is 24px page title, 16px card headings, 14px body, 12px metadata, and 16–24px panel padding.

6. **[med] Glass legibility lacks Home-specific acceptance checks.**  
   **Reference:** Line 4: “cards (from the mockup)”; acceptance criteria, lines 25–27.  
   **Why it matters:** Spec 14 provides glass tokens and opaque fallbacks, but this document does not establish whether dense timestamps, cron strings, status labels, or palette selections remain readable over the brightest bloom and overlapping surfaces. Token-pair checks alone do not establish contrast after compositing.  
   **Fix:** Reference spec 14 explicitly and require rendered contrast checks at the brightest backdrop and supported overlay depth: 4.5:1 for normal text and 3:1 for essential control boundaries and state indicators. Verify opaque/high-contrast fallbacks. Keep atmospheric motion optional; reduced motion should remove shimmer, pulsing, and animated bloom while retaining static status text.

7. **[med] File-search coverage conflicts with the file-index specification.**  
   **Reference:** Global search, line 23: “file names and file summaries.” Spec 11 indexes text-file content and requires finding files by content.  
   **Why it matters:** A text file containing the searched phrase could disappear from global results unless its name or optional AI summary also matches. That makes search unexpectedly dependent on AI processing.  
   **Fix:** Include indexed file content in global FTS coverage and identify whether each match came from a name, content, or summary. Explicitly apply spec 11’s query-time exclusions and folder revocation to global search and recent-file results, including cached results.

8. **[med] Search has no defined results surface or ranking contract.**  
   **Reference:** Lines 16–23: palette results use “recent first”; global search lists sources and filters only.  
   **Why it matters:** It is unclear where full-text results appear, how users reach them from the palette, or how a relevant older match competes with a recent weak match. Message hits also need a destination that reveals the matching message rather than merely opening its conversation.  
   **Fix:** Define a dedicated results view and a “Search all” palette action that preserves the query. Rank exact and relevant matches before recency tie-breaks. Specify excerpts, source/project labels, pagination, empty/error states, and deep links to the matched object.

9. **[med] Subscription bars promise measurements that may not exist.**  
   **Reference:** Home, line 10: “per provider state and usage bar.”  
   **Why it matters:** Spec 03 allows usage meters only when providers expose them; otherwise it uses local run counts and rate-limit information. An unconditional bar implies known capacity and can mislead scheduling decisions.  
   **Fix:** Use the shared connection-state enum. Show a bar only with a known numerator, limit, and period; otherwise show labelled local counts or “Usage unavailable.” Distinguish unknown, disconnected, rate-limited, and stale states without relying on colour.

10. **[med] Acceptance criteria leave scope and input behavior largely untestable.**  
    **Reference:** Lines 26–27: Home under one second; “⌘K opens in under 100 ms and can create a card.”  
    **Why it matters:** There is no dataset or timing boundary, search criterion, or distinction between first opening and cached opening. Windows input is unspecified despite the Windows-first environment. Roadmap Phase 4 owns Home and search, but this document does not mark that delivery boundary.  
    **Fix:** Label the phase and dependencies. Define performance fixtures and measure shell rendering separately from data readiness. Add Ctrl+K alongside ⌘K, a visible launcher, arrow-key selection, Escape, focus restoration, screen-reader result announcements, and creation validation/error behavior. Add acceptance cases for content search, revoked folders, stale approvals, disconnected providers, and reduced-motion/opaque presentation.