1. **[high] Inline approval lacks the evidence needed for informed consent.**  
   **Reference:** Home, “top 5 Inbox items … with inline Approve/Deny” (line 6).  
   **Why it matters:** Security spec §Approval policy requires the exact command/diff. A compact title and two buttons could authorize a destructive or external action without showing its scope. Live updates also create a stale-approval risk.  
   **Fix:** Require an expandable command/diff preview, affected project and consequence before approval. Bind approval to the displayed action version; disable expired/resolved requests and show pending, success and failure states.

2. **[high] Local search and model submission share an insufficiently defined execution boundary.**  
   **Reference:** Command palette, “typing a sentence offers ‘Ask <current model>’” and “executes on Enter” (lines 19–20).  
   **Why it matters:** A private search phrase could become a provider-bound prompt if selection changes as results arrive. “Run workflow” and “Ask Hermes” also mix navigation with execution.  
   **Fix:** Keep typing and search entirely local. Require explicit selection of a visibly labelled “Send to [provider/model]” action; never select it automatically when results disappear. Specify what context is transmitted. Workflow actions should open the parameter/dry-run form defined in spec 05, with approval policy preserved.

3. **[med] Home’s hierarchy and density are undefined for an expanded card inventory.**  
   **Reference:** “A glance page” followed by eight card categories (lines 4–12).  
   **Why it matters:** The referenced Stitch prompt describes a smaller inventory and makes Quick ask full-width. Neither it nor the existing equal-card grid in `src/index.css` resolves the new composition. Approvals can lose prominence among subscription meters, feeds and duplicated Hermes information.  
   **Fix:** Define desktop column spans and a single-column reading order. Give Needs you visual priority when action is pending, keep Quick ask compact, and place monitoring below. Specify card padding, row spacing, list caps, overflow counts and “View all” links. Show Hermes’s current assignment in one place.

4. **[med] Independent loading is not guaranteed by the proposed aggregate endpoint.**  
   **Reference:** “one `GET /home` aggregate or per-card queries … no card may block the others” (line 14).  
   **Why it matters:** An aggregate that awaits every provider or subsystem can delay all cards behind one slow dependency. Partial errors alone do not provide independent arrival.  
   **Fix:** Choose per-card queries, or define `/home` as a bounded-time response from local cached views with per-card freshness/error metadata. Refresh slow sources asynchronously. State how event-stream reconnection catches up and when stale data remains visible.

5. **[med] Global file search omits the content search promised elsewhere.**  
   **Reference:** Global search indexes “file names and file summaries” (line 23).  
   **Why it matters:** Spec 11 §Indexing requires FTS5 text indexing for text files, and its acceptance criteria promise finding a file by content. Optional AI summaries cannot substitute for that coverage.  
   **Fix:** Explicitly include indexed text-file content. Distinguish filename, content, optional summary and optional semantic matches. Carry spec 11’s allowlist/exclusions into the search contract, including removal of stale results after deletion or exclusion.

6. **[med] The relationship between palette search and full-text search is missing.**  
   **Reference:** Palette uses fuzzy matching and “recent first”; Global search uses FTS5 and filters (lines 17–23).  
   **Why it matters:** It is unclear where full-text results appear, whether the palette searches message contents, or how users reach additional matches. Recency-first ordering can bury an exact title match beneath weak recent matches.  
   **Fix:** Define the palette as a capped launcher with exact/prefix matches before fuzzy matches and recency as a tie-breaker. Add “Search all results” leading to a defined results view with snippets, source/project labels, paging and clear filter semantics.

7. **[med] Keyboard and focus behavior is too thin for the palette’s acceptance promise.**  
   **Reference:** “Command palette (⌘K)” and “can create a card without leaving the page” (lines 16, 27).  
   **Why it matters:** The project runs on Windows, yet Ctrl+K is unspecified. The document also omits selection, dismissal, focus restoration and the actual card-creation flow.  
   **Fix:** Specify Ctrl+K/Cmd+K plus a visible trigger, arrow-key selection, Enter activation, Escape dismissal and focus restoration. Define an accessible in-place card form, validation, save feedback and return to the prior context.

8. **[med] Glass requirements are not translated into Home and palette execution criteria.**  
   **Reference:** Card inventory and palette (lines 4–20); cross-check spec 14 §Tokens.  
   **Why it matters:** Spec 14 already requires contrast and fallbacks, but this document does not identify the difficult combinations: dim timestamps over glow, selected search rows, highlighted matches, focus rings and layered overlays. Independent skeletons and streamed updates can also produce excessive motion or layout shifts.  
   **Fix:** Add acceptance checks for those states over the brightest permitted atmosphere, including opaque mode. Specify a compact type scale—for example, 24px page title, 16px card titles, 14px rows with 20px line height—and reserve skeleton space. Reduced-motion mode should remove shimmer/pulsing and avoid animated row reordering.

9. **[med] Subscription bars imply usage data that may not exist.**  
   **Reference:** “per provider state and usage bar” (line 10).  
   **Why it matters:** Spec 03 permits a usage meter only when the provider exposes it; otherwise it uses local run counts and the last rate-limit response. An unconditional bar invites fabricated percentages or an “unknown” value rendered as zero.  
   **Fix:** Make meters capability-dependent. Label measured usage with its period, reset time and freshness; otherwise show “Usage unavailable” with local activity separately. Preserve the provider’s actual connection state.

10. **[med] Quick ask does not define a reliable handoff into Chat.**  
    **Reference:** “input plus model chip, sends into Chat” (line 5).  
    **Why it matters:** It leaves unclear whether submission creates a conversation, resumes one, or merely transfers a draft. Effort, project context and disconnected-provider behavior are also unspecified despite being meaningful Chat settings in spec 04.  
    **Fix:** Define a fresh-conversation default, visible model/effort, explicit project context and single-submit behavior. Preserve the prompt on failure, prevent duplicate runs, and navigate to the conversation containing the submitted message.

11. **[low] Upcoming runs favors scheduler syntax over readable timing.**  
    **Reference:** “next 5 tasks with cron, next time, status dot” (line 7).  
    **Why it matters:** Spec 05 includes one-off tasks without cron and explicit timezones. Raw cron plus an unlabeled dot makes a glance card harder to interpret.  
    **Fix:** Lead with task name and human-readable next occurrence, with timezone available explicitly. Put cron in secondary detail, represent one-offs correctly, exclude paused tasks from “upcoming,” and pair every status dot with text.