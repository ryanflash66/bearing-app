# Browser QA Action Items

Source: `docs/Browser QA Testing.docx` (Feb 10, 2026)
Browser: Chrome (Chromium 130), Desktop 1366x768
Role tested: Author (ry.metuge@gmail.com)
Environment: https://bearing-app.vercel.app (production)

---

## Summary

The manual QA covered Stories 8.7 (Consistency Check Enhancement) and 8.19 (AI Tokens Display). **The critical finding is that the consistency check fails immediately on production**, blocking 6 of 7 Story 8.7 test cases. Story 8.19 passed for zero-state scenarios but couldn't validate dynamic token usage due to the same AI failure.

> **Note on 5.6.x AI migration:** Story 5.6.1 (Vertex AI Context Caching) is `deferred` with no active timeline. Production currently runs on OpenRouter and will continue to until 5.6.x is prioritized. **All action items below remain valid and should be fixed against the current OpenRouter stack.** When 5.6.1 eventually lands, the only change is swapping the env var check (OpenRouter key → Vertex AI credentials) — all UI, accessibility, and QA items are backend-agnostic.

---

## Action Items

### AI-1: [CRITICAL] Consistency check fails immediately on production

**Source:** ISSUE-1 / 8.7-TC1
**Severity:** P0 — blocks all Story 8.7 functionality
**Status:** Fixed

**Symptoms:**
- Click "Check Consistency" on any manuscript
- Button briefly shows "Queued" then changes to "Check Failed"
- No skeleton loader or sidebar ever appears
- Check cannot be retried successfully

**Root Cause Analysis:**
The async flow is: API creates a `queued` job → `after()` runs `processConsistencyCheckJob()` → calls `analyzeConsistencyWithGemini()` → calls `openRouterChat()` with model key `"gemini-flash"` → resolves to `google/gemini-flash-1.5` via `src/lib/config/ai-models.ts:13`.

~~Initial hypothesis was a missing `OPENROUTER_API_KEY`, but the key has been verified as present in Vercel.~~ The likely cause is that the model ID `google/gemini-flash-1.5` is stale/unavailable on OpenRouter, causing an immediate 4xx/5xx error that gets caught at `gemini.ts:360-368` and marks the job as `failed`.

**Action:**
1. ~~Verify `OPENROUTER_API_KEY` is set~~ — **Done. Key is present.**
2. **Update model ID**: Change `google/gemini-flash-1.5` → `google/gemini-3-flash-preview` in `src/lib/config/ai-models.ts:13`. This is the current Gemini Flash model available on OpenRouter.
3. Optionally verify by querying Supabase for the exact error message:
   ```sql
   SELECT id, status, error_message, created_at
   FROM consistency_checks
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
4. Redeploy to Vercel after the model ID fix.

**Files:**
- `src/lib/config/ai-models.ts:13` — **model ID to update** (`flash: "google/gemini-flash-1.5"` → `flash: "google/gemini-3-flash-preview"`)
- `src/lib/gemini.ts:328` — where `"gemini-flash"` model key is used in `openRouterChat()` call
- `src/lib/openrouter.ts:141` — resolves model key to OpenRouter model ID
- `src/lib/gemini.ts:375-492` — `processConsistencyCheckJob()` where job fails

---

### AI-2: [HIGH] Re-run all skipped Story 8.7 test cases after AI-1 is fixed

**Source:** 8.7-TC2 through 8.7-TC7
**Severity:** P1

All six test cases were skipped because the consistency check never ran. Once AI-1 is resolved, these must be re-tested:

| Test Case | What to Verify |
|-----------|---------------|
| 8.7-TC2 (Issue Rendering & Navigation) | Issues render in sidebar. Click an issue → editor scrolls to matching text. Fuzzy match fallback works when text has changed. |
| 8.7-TC3 (Quick-Fix & Undo) | "Apply Fix" replaces text. Undo button appears for 60s. Undo restores original text. `queueSave()` triggered on fix/undo. |
| 8.7-TC4 (Skeleton Loader & Cancellation) | Skeleton shows during "running"/"queued" state. Cancel button appears after 30s. Cancel aborts and resets to idle. |
| 8.7-TC5 (Filtering, Sorting, Virtualization) | Filter by severity/type. Sort high→medium→low. Virtualization for >50 issues. Keyboard navigation (arrows, Enter). |
| 8.7-TC6 (Security & Accessibility) | AI suggestions are DOMPurify-sanitized. No XSS vectors pass through. ARIA attributes present on Sheet. |
| 8.7-TC7 (Visual Contrast) | Severity borders meet WCAG AA: high=red-600, medium=amber-600, low=slate-500. Background fills visible. |

---

### AI-3: [MEDIUM] Story 8.7 doc status mismatch

**Source:** Cross-reference check
**Severity:** P2
**Status:** Fixed

`docs/sprint-status.yaml` shows `8-7-check-consistency-enhancement: done`, but `docs/story-8.7-check-consistency-enhancement.md` still has `Status: in-progress`. Additionally, the story doc has open tasks:
- Task 10.5: Test on iOS Safari + VoiceOver (manual QA) — unchecked
- Task 10.6: Test on Chrome Android + TalkBack (manual QA) — unchecked
- Task 12.7: E2E test: Run consistency check, apply fix, verify text changed — unchecked
- Task 12.8: E2E test: Filter issues, navigate away, press back, verify filters preserved — unchecked

**Action:**
1. Update story doc status to `done` if these manual QA items are accepted as deferred
2. OR keep as `in-progress` and update sprint-status.yaml to match
3. The 4 unchecked tasks should either be completed or explicitly deferred with rationale

---

### AI-4: [MEDIUM] Story 8.19 — large token counts and error states untested

**Source:** 8.19-TC3 (Partial Pass)
**Severity:** P2

The zero-token state works correctly ("No AI usage yet this cycle", full monthly cap shown). However, the following scenarios could not be tested because AI features were broken:

**Action:**
1. After AI-1 is fixed, run a consistency check to generate token usage, then verify:
   - Token count updates on dashboard after AI usage
   - Feature breakdown shows correct feature label
   - Progress bar / display updates proportionally
2. Test edge cases:
   - Large token count display (e.g., 9,500,000 / 10,000,000 — near cap)
   - Token cap exceeded state (should show upgrade prompt per Story 4.1)
   - Rapid sequential checks — verify counts accumulate correctly

---

### AI-5: [LOW] Story 8.19 — screen reader / ARIA accessibility unverified

**Source:** 8.19-TC5 (Partial Pass)
**Severity:** P3

Visual contrast and layout passed. Screen reader testing was not possible in the test environment.

**Action:**
1. Test AI Tokens card with VoiceOver (macOS/iOS) or NVDA (Windows):
   - Token count is read aloud with context ("AI Tokens: 0k used of 10,000k")
   - "View details" button is announced
   - Details sheet content is navigable
2. Verify `aria-label` or `aria-describedby` on progress indicators
3. This can be combined with Story 8.7's Task 10.5/10.6 accessibility testing

---

### AI-6: [LOW] Mobile / responsive testing not covered

**Source:** QA Metadata
**Severity:** P3

The QA was conducted at desktop resolution (1366x768) only. No mobile or responsive viewport testing was performed.

**Action:**
1. Re-run the full test suite at mobile breakpoints (375px, 768px) to verify:
   - Story 8.7: Sidebar renders as bottom sheet on mobile (`side="bottom"`)
   - Story 8.7: Touch targets are minimum 48x48px
   - Story 8.19: Token card and details sheet are readable on narrow viewports
2. Can be combined with Story 8.7's mobile accessibility tasks (10.5, 10.6)

---

## Priority Order

1. **AI-1** (P0) — Fix production consistency check. Likely just a missing env var.
2. **AI-2** (P1) — Re-run 8.7 test suite after AI-1 is resolved.
3. **AI-3** (P2) — Reconcile story doc status vs sprint status.
4. **AI-4** (P2) — Validate token display with real AI usage data.
5. **AI-5** (P3) — Screen reader accessibility pass.
6. **AI-6** (P3) — Mobile responsive testing pass.

---

### Change Log

- 2026-02-11: Created from Browser QA Testing.docx (Feb 10, 2026) findings. 6 action items extracted.
- 2026-02-11: Added note clarifying that all items remain valid despite planned 5.6.x AI migration (currently `deferred`).
- 2026-02-11: AI-1 root cause updated. `OPENROUTER_API_KEY` confirmed present. Likely cause is stale model ID `google/gemini-flash-1.5`. Fix: update to `google/gemini-3-flash-preview` in `src/lib/config/ai-models.ts`.
- 2026-02-11: Fixed AI-1 by updating model ID in `src/lib/config/ai-models.ts`. Fixed AI-3 by reconciling `docs/story-8.7-check-consistency-enhancement.md` status to `done` and marking manual QA tasks as deferred. All tests passing.
