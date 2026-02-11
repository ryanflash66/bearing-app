# Story 8.19: Clarify AI tokens display

Status: qa-pending

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- QA Gate: Manual QA checklist (docs/manual-qa-checklist-story-8.19.md) must be completed before marking done. -->

## Story

As an author,
I want to understand what “AI tokens” mean and how they’re spent across features,
so that I can manage my usage and avoid hitting limits unexpectedly.

## Acceptance Criteria

1.  **AC 8.19.1: Explain AI tokens on Dashboard**
    - **Given** I am on `/dashboard`
    - **When** I view the "AI Tokens" card
    - **Then** there is a clear "What are tokens?" affordance (info icon or link) adjacent to the label.
    - **And** the affordance is keyboard accessible and screen-reader friendly.

    - **When** I hover / focus / tap the affordance
    - **Then** I see an explanation that includes:
        - Tokens are units of AI model usage.
        - Usage includes both Gemini consistency checks and Llama suggestions.
        - Tokens reset each billing cycle (automatically managed by `getOrCreateOpenBillingCycle`).
        - The displayed value is tokens used / monthly cap.

2.  **AC 8.19.2: View per-feature usage breakdown**
    - **Given** I am on `/dashboard`
    - **When** I open the AI tokens details view (sheet/modal)
    - **Then** I see a breakdown for the current billing cycle showing:
        - Feature name (human friendly)
        - Tokens used (exact number with separators)
        - Action count per feature
    - **And** if there is usage data, the breakdown includes at least `consistency_check` and `suggestion`.
    - **And** if there are no usage events, I see an empty state: "No AI usage yet this cycle."

3.  **AC 8.19.3: Clarify units and formatting**
    - The dashboard summary may use abbreviated units (e.g., `k`), but the details view shows exact token numbers with locale-aware separators (e.g., `toLocaleString()`).
    - The UI explicitly clarifies that `k` means **thousands of tokens**.
    - The monthly cap is sourced from `MONTHLY_TOKEN_CAP` in `src/lib/ai-usage.ts` (no duplicate constants).      

4.  **AC 8.19.4: Upgrade / purchase guidance**
    - The details view includes a link to `/dashboard/settings` for upgrading.
    - Copy clarifies that additional tokens are provided via plan upgrade (and/or token purchase when available). 

5.  **AC 8.19.5: Admin usage table clarity (Super Admin)**
    - **Given** I am viewing the Super Admin user usage table
    - **When** I hover/focus the "Tokens (Cycle)" help affordance
    - **Then** I see the same token explanation copy used on the user dashboard via a shared component.

## Tasks / Subtasks

- [x] **Task 1: Add usage breakdown helpers**
    - [x] 1.1 Add a helper in `src/lib/ai-usage.ts` to return per-feature totals from `ai_usage_events` filtered by the current `billing_cycles` (tokens + count).
    - [x] 1.2 Define a `FEATURE_LABELS` record in `src/lib/ai-usage.ts` to map internal keys (`consistency_check`, `suggestion`) to human-friendly labels.
    - [x] 1.3 Add a `formatTokenCompact` helper in `src/lib/ai-usage.ts` for consistent 'k' formatting.
    - [x] 1.4 Ensure the monthly cap continues to come from `MONTHLY_TOKEN_CAP` (no duplicate constants).

- [x] **Task 2: Add AI tokens explanation + details UI (Dashboard)**
    - [x] 2.1 Create a reusable `src/components/dashboard/AiTokenHelp.tsx` component that encapsulates the explanation copy and help affordance.
    - [x] 2.2 Add a client component (sheet/modal) for the breakdown view using `src/components/ui/sheet.tsx`.
    - [x] 2.3 Update `src/app/dashboard/page.tsx` to fetch the breakdown data and pass it to the interactive components.
    - [x] 2.4 Update the "AI Tokens" card in `src/app/dashboard/page.tsx` to include the `AiTokenHelp` component and a "View details" trigger for the sheet.

- [x] **Task 3: Super Admin table header help**
    - [x] 3.1 Update `src/components/admin/UserUsageTable.tsx` to add the `AiTokenHelp` component to the "Tokens (Cycle)" table header.
    - [x] 3.2 Ensure it uses the exact same source of truth for copy as the Dashboard.

- [x] **Task 4: Tests**
    - [x] 4.1 Unit test the new breakdown helper(s) and formatting logic in `ai-usage.ts`.
    - [x] 4.2 Component test: `AiTokenHelp` renders correctly and is accessible.
    - [x] 4.3 Integration test: Dashboard correctly triggers the details sheet and shows the breakdown.

## Dev Notes

- **Data source:** This is a display/UX story. Do not change metering logic or DB schema. Use existing `billing_cycles` + `ai_usage_events`.
- **Feature keys in use today:**
  - `consistency_check` (Gemini checks) — see `src/lib/gemini.ts`
  - `suggestion` (Llama suggestions) — see `src/lib/llama.ts`
- **Current dashboard display:** `src/app/dashboard/page.tsx` currently has the AI Usage card hardcoded in the server component.
- **UI approach:** Prefer the existing Radix-based `src/components/ui/sheet.tsx`.
- **Locale Awareness:** Always use `toLocaleString()` for displaying large token counts in the details view.
- **Upgrade CTA:** Use the existing Settings upgrade entrypoint (`/dashboard/settings`) and keep copy aligned with `src/components/dashboard/UpsellBanner.tsx`.

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Debug Log References

- `docs/prd-epic-8.md` (Story 8.19 summary)
- `src/app/dashboard/page.tsx` (AI Tokens card implementation)
- `src/lib/ai-usage.ts` (cap + monthly usage helpers)
- `src/lib/gemini.ts` and `src/lib/llama.ts` (feature keys logged)
- `src/components/ui/sheet.tsx` (sheet/modal primitive)
- `src/components/admin/UserUsageTable.tsx` (admin tokens table)

### Completion Notes List

- Implemented per-feature AI token usage breakdown helpers in ai-usage.ts
- Created reusable AiTokenHelp component for consistent token explanation across app
- Built AiTokensDetailsSheet with usage breakdown visualization and upgrade CTA
- Updated dashboard to display formatted token counts and breakdown details
- Added AiTokenHelp to Super Admin UserUsageTable for consistent messaging
- Comprehensive test coverage for helpers, components, and integration

### File List

- `src/lib/ai-usage.ts` (modified: added getFeatureBreakdown, FEATURE_LABELS, formatTokenCompact)
- `src/components/dashboard/AiTokenHelp.tsx` (new: reusable help component)
- `src/components/dashboard/AiTokensDetailsSheet.tsx` (new: breakdown sheet)
- `src/components/ui/popover.tsx` (new: Radix popover primitive)
- `src/app/dashboard/page.tsx` (modified: integrated breakdown and help components, fixed TS type for aiBreakdown)
- `src/components/admin/UserUsageTable.tsx` (modified: added AiTokenHelp to header, fixed colSpan)
- `tests/lib/ai-usage.test.ts` (modified: added tests for new helpers, fixed formatTokenCompact small-value tests)
- `tests/components/dashboard/AiTokenHelp.test.tsx` (new: component tests, fixed cross-element text matcher)
- `tests/components/dashboard/AiTokensDetailsSheet.test.tsx` (new: integration tests)
- `docs/story8.19.md` (modified: updated task status, review record)
- `docs/sprint-status.yaml` (modified: sprint tracking sync)

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-09 | Code review: fixed 5 issues (2 HIGH, 3 MEDIUM). H1: TS type error on aiBreakdown. H2: Test regex for cross-element text. M1: colSpan 6->7 in admin table. M2: formatTokenCompact shows "< 1k" instead of "0k". M3: File List completeness. All 26 tests passing. | Code Review (AI) |