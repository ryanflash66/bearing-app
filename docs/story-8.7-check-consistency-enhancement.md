# Story 8.7: Check consistency enhancement (AI)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **Author**,
I want **the consistency check results to be integrated into my writing workspace**,
so that **I can review and apply improvements to my grammar, style, tone, and character consistency without losing my flow.**

## Acceptance Criteria

1. **Integrated Sidebar UI**: Replace the consistency report modal with a toggleable right sidebar in the `ManuscriptEditor`. Use controlled state (`open` prop) on the Radix-based Sheet component—do NOT rely on non-existent props like `keepOpen`. The sidebar must remain open while the user interacts with the editor (controlled via React state, not Sheet internals). [AC 8.7.1]

2. **Enhanced Check Scope**: Update the AI prompt/logic to include:
   - Grammar & Spelling
   - Writing Style (e.g., "show, don't tell", passive voice detection)
   - Tone Drift (detecting shifts in narrative voice)
   - Character & Plot Consistency (Existing logic) [AC 8.7.2]

3. **Interactive Navigation with Fallback**: Clicking an issue in the sidebar must attempt to scroll the Tiptap editor to the relevant text and highlight it. **Text Matching Strategy**:
   - Primary: Case-insensitive exact substring match of `originalText` in current editor content (use `textContent.toLowerCase().indexOf(originalText.toLowerCase())`).
   - Fallback: Fuzzy match using Levenshtein distance with **unified threshold**: `maxDistance = Math.max(3, Math.floor(originalText.length * 0.1))`. This means: minimum 3 edits allowed, OR 10% of string length, whichever is greater. Applies to ALL string lengths consistently.
   - Failure UX: If no match found, show inline warning "Text may have changed. Navigate manually." with the original text quoted. Do NOT silently fail. [AC 8.7.3]

4. **Quick-Fix with Undo Stack**: For grammar and style issues, provide an "Apply Fix" button that replaces the problematic text with the AI suggestion. **Undo Requirements**:
   - Maintain an undo stack (max 20 items) stored in component state.
   - Each fix adds to the stack with `{ issueId, originalText, fixedText, appliedAt: Date.now() }`.
   - **Undo visibility timer**: Each issue card shows "Undo" button for 60 seconds from `appliedAt` timestamp (per-item timer, not global). Use `useEffect` with `setTimeout` to hide after expiry.
   - Undo button per-fix visible in the sidebar issue card until the issue is dismissed OR 60 seconds elapse from application time.
   - **Fix application locking**: Disable all "Apply Fix" buttons while a fix is being applied (set `isApplying` state). Re-enable after `queueSave()` completes or fails. This prevents race conditions from rapid clicks.
   - Applying a fix must trigger `queueSave()` from `useAutosave` hook.
   - **Autosave failure handling**: If `queueSave()` fails (network error, quota exceeded), show error toast "Save failed. Your fix was applied locally but not saved. Retry?" with Retry button. Show warning toast immediately on first failure (not after 3). Persistent banner after 3 consecutive failures. Do NOT lose the applied fix—keep it in editor state. [AC 8.7.4]

5. **Real-Time Feedback with Cancellation**: Show pulsing skeleton screens in the sidebar while the Gemini job is in the "running" or "queued" state.
   - **Skeleton behavior**: Show skeleton immediately when check starts (`isRunning = true`). Hide skeleton and show results when data arrives OR when cancelled. Skeleton has no fixed duration—it's purely state-driven.
   - After 30 seconds of waiting, show "Taking longer than expected. [Cancel]" button.
   - **Cancel button race condition handling**: Once cancel button is shown, it remains visible until state changes. If response arrives while cancel is visible, hide cancel and show results (no flash). Use `useRef` to track if cancel was clicked before response arrived.
   - **Cancel behavior**: Abort the fetch request (AbortController), reset sidebar to idle state, show toast "Check cancelled."
   - User may immediately start a new check after cancellation.
   - If a check is in progress and user starts another, the previous request is auto-cancelled. [AC 8.7.5]

6. **Mobile Optimization with Accessibility**: On mobile devices (< 768px), the consistency report must appear as a swipe-up overlay (Sheet with `side="bottom"`). **Touch targets**:
   - All interactive elements (buttons, issue cards) must have minimum 48x48px touch target using `min-h-12 min-w-12` or padding expansion.
   - Use `p-3` minimum on clickable cards, `p-4` on action buttons.
   - Issue cards use invisible padding extension via `before:` pseudo-element if content is smaller.
   - **Accessibility requirements**: Sheet must trap focus when open (Radix handles this). Ensure `aria-modal="true"` and `role="dialog"`. Tab order must cycle within sheet. Test with VoiceOver (iOS) and TalkBack (Android) during QA. [AC 8.7.6]

7. **Issue List Virtualization with Keyboard Support**: For manuscripts generating > 50 issues, use `react-window` (already in dependencies) to virtualize the issue list. Render max 20 items in DOM at a time. Show issue count badge: "Showing 1-20 of 342 issues".
   - **Keyboard navigation**: Use `react-window`'s `outerRef` + custom `onKeyDown` handler. Arrow keys move `activeIndex` state, scroll item into view via `scrollToItem()`. Focused item must have visible focus ring (`ring-2 ring-primary`). Enter/Space triggers navigation to that issue's text. [AC 8.7.7]

8. **Severity-Based Sorting and Filtering**: Issues must be sortable/filterable by severity (`high`, `medium`, `low`) and type (`grammar`, `style`, `tone`, `character`, `plot`).
   - Default sort: severity (high first), then by document position.
   - **Visual treatment (WCAG AA compliant)**: `high` = `border-l-4 border-red-600` + "⚠️" icon + `bg-red-50`, `medium` = `border-l-4 border-amber-600` + `bg-amber-50`, `low` = `border-l-4 border-slate-500` + `bg-slate-50`. Use darker border shades (600 instead of 400/500) and background fills to ensure sufficient contrast.
   - **Filter state persistence**: Store filter state in URL query params (`?severity=high&type=grammar`). This is REQUIRED (not optional) to preserve state on back button navigation. Use `useSearchParams` + `router.replace()`. [AC 8.7.8]

9. **XSS Protection with Safe Formatting**: All AI-generated suggestion text must be sanitized before rendering.
   - Use `DOMPurify.sanitize(text, { ALLOWED_TAGS: ['em', 'strong', 'code', 'mark'], ALLOWED_ATTR: [] })` to preserve basic formatting (emphasis, bold, code, highlight) while stripping dangerous content.
   - Unit test must verify `<script>`, `<img onerror>`, `<a href="javascript:">`, and data URIs are stripped while `<em>`, `<strong>`, `<code>` are preserved.
   - Never use `dangerouslySetInnerHTML` with raw Gemini output—always sanitize first. [AC 8.7.9]

## Out of Scope (Explicitly Deferred)

- **Internationalization (i18n)**: All user-facing strings remain English. i18n is a platform-wide initiative tracked separately.
- **Real-time Collaboration Conflicts**: This feature assumes single-user editing. Multi-user conflict resolution deferred to future collaboration epic.
- **Custom Fine-Tuned Models**: Gemini via OpenRouter only. Custom models tracked in Story 5.6.

## Tasks / Subtasks

- [x] **Task 1: UI Refactoring**
  - [x] 1.1: Create `ConsistencyReportSidebar.tsx` using controlled Sheet (`open` + `onOpenChange` props, NOT `keepOpen`).
  - [x] 1.2: Use `side="right"` for desktop, `side="bottom"` for mobile (detect via `useMediaQuery` or Tailwind breakpoint).
  - [x] 1.3: Implement toggle state in `ManuscriptEditor.tsx` via `useState<boolean>`.
  - [x] 1.4: Add "Consistency" button to editor toolbar with spinner animation when `isRunning`.
  - [x] 1.5: Implement skeleton loader using `Skeleton` component from `src/components/ui/skeleton.tsx`. Skeleton shows when `isRunning && !issues.length`. Hides immediately when data arrives or on cancel.

- [x] **Task 2: Issue List Virtualization**
  - [x] 2.1: Install `react-window` if not present (`npm ls react-window` to check).
  - [x] 2.2: Wrap issue list in `FixedSizeList` with `itemSize={80}` (adjust based on card height).
  - [x] 2.3: Show "Showing X-Y of Z issues" counter in sidebar header.
  - [x] 2.4: Implement keyboard navigation: `activeIndex` state, arrow key handler on list container, `scrollToItem(activeIndex)` on change, visible focus ring on active item, Enter/Space to trigger navigation.
  - [x] 2.5: Ensure focus remains in list when scrolling (use `outerRef` for focus management).

- [x] **Task 3: Severity & Filtering**
  - [x] 3.1: Add `severity` and `type` filter toggles to sidebar header.
  - [x] 3.2: Implement sort logic: high → medium → low, then by `documentPosition`.
  - [x] 3.3: Style severity (WCAG AA): high = `border-l-4 border-red-600 bg-red-50`, medium = `border-l-4 border-amber-600 bg-amber-50`, low = `border-l-4 border-slate-500 bg-slate-50`.
  - [x] 3.4: **REQUIRED**: Persist filter state in URL query params using `useSearchParams`. On mount, read params and apply filters. On filter change, call `router.replace()` with updated params. This preserves state on back button.

- [x] **Task 4: AI Logic Expansion**
  - [x] 4.1: Update `src/lib/gemini.ts` SYSTEM_PROMPT to request grammar, style, tone, character, plot checks.
  - [x] 4.2: Update JSON schema to include `type: 'grammar' | 'style' | 'tone' | 'character' | 'plot'` and `severity: 'high' | 'medium' | 'low'`.
  - [x] 4.3: Add `documentPosition` field (character offset from document start) to each issue for stable sorting.
  - [x] 4.4: Validate Gemini response schema; if malformed, show "AI returned unexpected format. Try again." AND log full response to console with `console.error('[Gemini] Malformed response:', response)` for debugging.

- [x] **Task 5: XSS Protection**
  - [x] 5.1: Install `dompurify` and `@types/dompurify` if not present.
  - [x] 5.2: Sanitize `suggestion` and `explanation` fields: `DOMPurify.sanitize(text, { ALLOWED_TAGS: ['em', 'strong', 'code', 'mark'], ALLOWED_ATTR: [] })`.
  - [x] 5.3: Add unit test verifying dangerous content stripped (`<script>`, `<img onerror>`, `javascript:` URIs, data URIs) AND safe tags preserved (`<em>`, `<strong>`, `<code>`).

- [x] **Task 6: Text Navigation with Fallback**
  - [x] 6.1: Implement case-insensitive exact match: `editor.state.doc.textContent.toLowerCase().indexOf(originalText.toLowerCase())`.
  - [x] 6.2: If exact match fails, implement fuzzy match using `fastest-levenshtein`. Threshold: `maxDistance = Math.max(3, Math.floor(originalText.length * 0.1))`.
  - [x] 6.3: If fuzzy match fails (distance > threshold), show warning: "Text may have changed since the check. Original: '{originalText.slice(0, 50)}...'"
  - [x] 6.4: On successful match, call `editor.commands.setTextSelection({ from, to })` and `editor.commands.scrollIntoView()`.
  - [x] 6.5: Add temporary highlight decoration (yellow background, 2-second fade) using Tiptap decoration plugin.

- [x] **Task 7: Undo Stack Implementation**
  - [x] 7.1: Create `useUndoStack` hook with `push(fix)`, `pop(issueId)`, `clear()`, `isExpired(issueId)` methods.
  - [x] 7.2: Store stack in component state: `Array<{ issueId: string, originalText: string, fixedText: string, appliedAt: number }>`.
  - [x] 7.3: Max stack size: 20. FIFO eviction when full.
  - [x] 7.4: Show "Undo" button on each issue card where fix was applied. Use `useEffect` per-card to set 60s timeout from `appliedAt`, hide button on expiry.
  - [x] 7.5: Undo action: replace `fixedText` with `originalText` in editor, remove from stack, trigger `queueSave()`.
  - [x] 7.6: If undo fails (text no longer matches), show warning "Cannot undo—text has changed."

- [x] **Task 8: Autosave Failure Handling**
  - [x] 8.1: Wrap `queueSave()` call in try/catch.
  - [x] 8.2: On FIRST failure, show toast immediately: "Save failed. Your changes are preserved locally. [Retry]".
  - [x] 8.3: Retry button calls `queueSave()` again.
  - [x] 8.4: Track `pendingSaveFailures` count; if ≥ 3 consecutive failures, show persistent banner "Connection issues. Your work is saved locally." (banner stays until successful save).

- [x] **Task 9: Cancellation Logic**
  - [x] 9.1: Use `AbortController` for the Gemini fetch request.
  - [x] 9.2: Store controller ref in `useRef<AbortController | null>`.
  - [x] 9.3: On cancel click: set `cancelClicked.current = true`, then `controller.abort()`, reset `isRunning` state, show toast "Check cancelled."
  - [x] 9.4: On new check while previous running: auto-abort previous, start new.
  - [x] 9.5: Show cancel button after 30s via `setTimeout` + `showCancelButton` state. On response arrival, set `showCancelButton = false` regardless of timing.
  - [x] 9.6: If response arrives after cancel was clicked (`cancelClicked.current === true`), ignore response and keep cancelled state.

- [x] **Task 10: Mobile Touch & Accessibility** _(Requires manual QA)_
  - [x] 10.1: Audit all buttons/cards for 48x48px minimum touch target.
  - [x] 10.2: Use `min-h-12 min-w-12` on action buttons.
  - [x] 10.3: Use `p-3` minimum padding on issue cards.
  - [x] 10.4: Ensure Sheet has `aria-modal="true"` and `role="dialog"` (Radix defaults, verify present).
  - [x] 10.5: Test on iOS Safari + VoiceOver (manual QA) — Deferred — manual QA items, tracked in docs/qa-action-items-browser-qa.md AI-5 and AI-6
  - [x] 10.6: Test on Chrome Android + TalkBack (manual QA) — Deferred — manual QA items, tracked in docs/qa-action-items-browser-qa.md AI-5 and AI-6

- [x] **Task 11: Migration & Cleanup**
  - [x] 11.1: Add feature flag `NEXT_PUBLIC_CONSISTENCY_SIDEBAR=true` in `.env.example`.
  - [x] 11.2: In `ManuscriptEditor.tsx`, conditionally render old `ConsistencyReportViewer` vs new `ConsistencyReportSidebar` based on flag.
  - [x] 11.3: Mark `ConsistencyReportViewer.tsx` with `@deprecated` JSDoc comment.
  - [x] 11.4: Create follow-up issue/task in sprint tracker: "Remove deprecated ConsistencyReportViewer after 2-week validation period (target: {deploy_date + 14 days})". Define "no issues" = zero P0/P1 bugs attributed to new sidebar.

- [x] **Task 12: Testing**
  - [x] 12.1: Unit test: XSS sanitization strips dangerous content, preserves safe formatting tags.
  - [x] 12.2: Unit test: Undo stack FIFO eviction at max size.
  - [x] 12.3: Unit test: Fuzzy match fallback triggers warning when no match.
  - [x] 12.4: Unit test: Undo button visibility expires after 60 seconds.
  - [x] 12.5: Integration test: Apply fix → autosave called → button re-enabled.
  - [x] 12.6: Integration test: Rapid fix clicks are blocked by `isApplying` lock.
  - [x] 12.7: E2E test: Run consistency check, apply fix, verify text changed — Deferred — manual QA items, tracked in docs/qa-action-items-browser-qa.md AI-5 and AI-6
  - [x] 12.8: E2E test: Filter issues, navigate away, press back, verify filters preserved — Deferred — manual QA items, tracked in docs/qa-action-items-browser-qa.md AI-5 and AI-6

## Dev Notes

### Sheet Component Usage (IMPORTANT)

The Sheet component at `src/components/ui/sheet.tsx` is a Radix Dialog wrapper. It does NOT have a `keepOpen` prop. Use controlled mode:

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false);
<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
  <SheetContent side={isMobile ? "bottom" : "right"}>
    {/* content */}
  </SheetContent>
</Sheet>;
```

To prevent closing on overlay click, pass `onInteractOutside={(e) => e.preventDefault()}` to `SheetContent`.

### Text Matching Strategy

Do NOT use fingerprinting (hash-based). The manuscript is mutable and fingerprints become stale immediately. Instead:

1. Store `originalText` (the exact problematic string) in each issue.
2. On navigation, search for `originalText` in current editor content.
3. Use fuzzy matching as fallback.
4. Accept that some navigations will fail—provide clear UX for that case.

### Performance Measurement Protocol

For any performance SLAs mentioned in future iterations:

- Measure client-side using `performance.now()`.
- Test on mid-range device (e.g., Moto G Power).
- Test with 50,000-word manuscript.
- Measure P50, P95, P99 over 20 runs.
- Document in QA report.

### Single-User Assumption

This story assumes single-user editing. If User A and User B edit simultaneously, consistency reports may become stale. This is acceptable for MVP. Real-time collaboration (if added later) will require report invalidation on external edits.

## Project Structure Notes

- New Component: `src/components/manuscripts/ConsistencyReportSidebar.tsx`
- New Hook: `src/lib/hooks/useUndoStack.ts`
- Refined Logic: `src/lib/gemini.ts` (Prompt expansion)
- Main Hub: `src/components/manuscripts/ManuscriptEditor.tsx`
- New Dep (if needed): `dompurify`, `fastest-levenshtein`, `react-window`

## References

- [Source: src/components/manuscripts/ConsistencyReportViewer.tsx] - Reference for current issue rendering (DEPRECATED after this story).
- [Source: src/lib/gemini.ts] - Gemini integration and prompt logic.
- [Source: src/components/manuscripts/ManuscriptEditor.tsx] - Main integration point.
- [Source: src/components/ui/sheet.tsx] - Radix-based Sheet (use controlled mode, no `keepOpen` prop).

## Adversarial Review Resolutions

### Round 1 (2026-02-09)

| Finding                                  | Resolution                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Fingerprint collision handling absent    | **Removed fingerprinting entirely.** Use exact substring match + fuzzy fallback instead.                |
| Undo functionality underspecified        | Added full undo stack spec: max 20 items, per-issue undo buttons, 60s visibility, FIFO eviction.        |
| `keepOpen` prop doesn't exist            | Confirmed. Updated to use controlled `open` + `onOpenChange` props.                                     |
| Cancellation behavior undefined          | Specified: AbortController, reset state, allow immediate re-check.                                      |
| Migration path missing                   | Added feature flag (`NEXT_PUBLIC_CONSISTENCY_SIDEBAR`) with conditional rendering and deprecation plan. |
| Performance SLAs lack measurement        | Removed unsubstantiated SLAs. Added measurement protocol in Dev Notes for future use.                   |
| 90% fingerprint success = 10% failure    | Replaced fingerprinting with substring match. Fallback UX defined for match failures.                   |
| Autosave failure handling nonexistent    | Added Task 8 with retry logic, toast messages, and persistent banner for repeated failures.             |
| Fingerprint persistence undefined        | N/A—fingerprints removed. Navigation is stateless (search at click time).                               |
| Mobile touch target strategy unspecified | Added explicit Tailwind classes: `min-h-12`, `min-w-12`, `p-3`, `p-4`.                                  |
| Severity levels are cosmetic             | Added visual treatment (border colors, icons) and sort/filter behavior.                                 |
| XSS injection unaddressed                | Added Task 5 with DOMPurify sanitization and unit test requirement.                                     |
| >1000 issue scenarios ignored            | Added virtualization with `react-window`, max 20 DOM nodes.                                             |
| i18n completely ignored                  | Explicitly deferred to Out of Scope.                                                                    |
| Collaboration conflicts hand-waved       | Explicitly stated single-user assumption in Out of Scope and Dev Notes.                                 |

### Round 2 (2026-02-09)

| Finding                                                       | Resolution                                                                                                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fuzzy match threshold arbitrary and inconsistent              | Unified formula: `maxDistance = Math.max(3, Math.floor(originalText.length * 0.1))`. Applies to all string lengths.                                                           |
| Undo stack timestamp captured but never used                  | Clarified: `appliedAt` timestamp drives per-item 60s timer via `useEffect` + `setTimeout`. Each item has its own expiry.                                                      |
| Apply Fix race conditions from rapid clicks                   | Added `isApplying` lock state. All "Apply Fix" buttons disabled while a fix is being applied. Re-enabled after save completes/fails.                                          |
| Skeleton loader duration undefined                            | Specified: Skeleton shows when `isRunning && !issues.length`. Hides immediately on data arrival or cancel. No fixed duration—purely state-driven.                             |
| Cancel button race condition (30s timing)                     | Added `cancelClicked` ref. If response arrives after cancel clicked, ignore response. Cancel button hides on state change, not on timer expiry.                               |
| Mobile Sheet accessibility ignored                            | Added accessibility requirements: `aria-modal`, `role="dialog"`, focus trapping. Added VoiceOver + TalkBack manual QA tasks.                                                  |
| Virtualization breaks keyboard navigation                     | Added detailed keyboard nav spec: `activeIndex` state, arrow key handler, `scrollToItem()`, visible focus ring, Enter/Space triggers navigation.                              |
| Filter URL params marked optional breaks back button          | Changed to REQUIRED. Filter state persisted via `useSearchParams` + `router.replace()`. Added E2E test for back button preservation.                                          |
| DOMPurify strips ALL tags including legitimate formatting     | Updated config: `{ ALLOWED_TAGS: ['em', 'strong', 'code', 'mark'], ALLOWED_ATTR: [] }`. Preserves safe formatting, strips dangerous content.                                  |
| Autosave failure threshold of 3 too permissive                | Changed: Show warning toast on FIRST failure (not after 3). Persistent banner after 3 consecutive failures.                                                                   |
| Feature flag migration timeline untracked                     | Added: Create follow-up issue in sprint tracker with target date. "No issues" defined as zero P0/P1 bugs attributed to new sidebar.                                           |
| Performance measurement protocol exists but no AC requires it | Acknowledged. Performance measurement remains in Dev Notes for future use. No AC added (intentional—this story is functional, not performance-focused).                       |
| Exact match is case-sensitive                                 | Changed to case-insensitive: `textContent.toLowerCase().indexOf(originalText.toLowerCase())`.                                                                                 |
| Gemini malformed response not logged                          | Added: `console.error('[Gemini] Malformed response:', response)` for debugging in addition to user-facing error message.                                                      |
| Severity border colors fail WCAG contrast                     | Updated: Use darker shades (`border-red-600`, `border-amber-600`, `border-slate-500`) + background fills (`bg-red-50`, `bg-amber-50`, `bg-slate-50`) for sufficient contrast. |

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (via BMad PM Agent) — original draft
Claude (Adversarial Review Resolution Round 1) — 2026-02-09
Claude (Adversarial Review Resolution Round 2) — 2026-02-09
GPT-5.2 (Codex CLI) — code-review fixes — 2026-02-10

### Change Log

- 2026-02-09: Addressed 15 adversarial review findings (Round 1). Major rewrites to AC, Tasks, and Dev Notes.
- 2026-02-09: Addressed 15 adversarial review findings (Round 2). Refined AC 3-9, expanded Tasks 1-12 with implementation details.
- 2026-02-10: Code-review fixes: add missing deps (`react-window`, `fastest-levenshtein`), correct Tiptap doc-position mapping for locate/apply/undo, add temporary highlight decoration plugin, improve cancellation + inline UX, add tests for Apply Fix locking/autosave.
- 2026-02-10: NOTE: Working tree includes unrelated story renumbering for Publishing Ops dashboard (8.7 → 8.23) and a `docs/sprint-status.yaml` update; split into a separate PR/commit.

### File List

- `package.json`
- `.env.example`
- `src/components/editor/TiptapEditor.tsx`
- `src/components/manuscripts/ConsistencyReportSidebar.tsx`
- `src/components/manuscripts/ConsistencyReportSidebar.test.tsx`
- `src/components/manuscripts/ConsistencyReportViewer.tsx`
- `src/components/manuscripts/ManuscriptEditor.tsx`
- `src/components/ui/skeleton.tsx`
- `src/lib/gemini.ts`
- `src/lib/hooks/useUndoStack.ts`
- `src/lib/hooks/useUndoStack.test.ts`
- `src/lib/textNavigation.ts`
- `src/lib/textNavigation.test.ts`
- `src/lib/tiptap/temporaryHighlight.ts`
- `src/lib/useMediaQuery.ts`
- `docs/sprint-status.yaml` (unrelated; split)
- `docs/story-8.23-publishing-ops-review-dashboard.md` (unrelated; split)
- `docs/story-8.7-publishing-ops-review-dashboard.md` (unrelated deletion; split)
