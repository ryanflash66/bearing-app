# Story 8.19: Clarify AI tokens display

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

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
        - Tokens reset each billing cycle.
        - The displayed value is tokens used / monthly cap.

2.  **AC 8.19.2: View per-feature usage breakdown**
    - **Given** I am on `/dashboard`
    - **When** I open the AI tokens details view (sheet/modal)
    - **Then** I see a breakdown for the current billing cycle showing:
        - Feature name (human friendly)
        - Tokens used (exact number)
        - Action count per feature
    - **And** if there is usage data, the breakdown includes at least `consistency_check` and `suggestion`.
    - **And** if there are no usage events, I see an empty state ("No AI usage yet this cycle").

3.  **AC 8.19.3: Clarify units and formatting**
    - The dashboard summary may use abbreviated units (e.g., `k`), but the details view shows exact token numbers with separators.
    - The UI explicitly clarifies that `k` means **thousands of tokens**.
    - The monthly cap is sourced from `MONTHLY_TOKEN_CAP` in `src/lib/ai-usage.ts` (no duplicate constants).

4.  **AC 8.19.4: Upgrade / purchase guidance**
    - The details view includes a link to `/dashboard/settings` for upgrading.
    - Copy clarifies that additional tokens are provided via plan upgrade (and/or token purchase when available).

5.  **AC 8.19.5: Admin usage table clarity (Super Admin)**
    - **Given** I am viewing the Super Admin user usage table
    - **When** I hover/focus the "Tokens (Cycle)" help affordance
    - **Then** I see the same token explanation copy used on the user dashboard.

## Tasks / Subtasks

- [ ] **Task 1: Add usage breakdown helpers**
    - [ ] 1.1 Add a helper in `src/lib/ai-usage.ts` to return per-feature totals for the **current** billing cycle (tokens + count).
    - [ ] 1.2 Map internal `feature` keys to human-friendly labels (at minimum: `consistency_check`, `suggestion`).
    - [ ] 1.3 Ensure the monthly cap continues to come from `MONTHLY_TOKEN_CAP` (no duplicate constants).

- [ ] **Task 2: Add AI tokens explanation + details UI (Dashboard)**
    - [ ] 2.1 Add a client component (sheet/modal) for the explanation + breakdown (use `src/components/ui/sheet.tsx`).
    - [ ] 2.2 Update `src/app/dashboard/page.tsx` to fetch the breakdown and pass it to the new component.
    - [ ] 2.3 Update the "AI Tokens" card to include an accessible help affordance and a "View details" action.

- [ ] **Task 3: Super Admin table header help**
    - [ ] 3.1 Update `src/components/admin/UserUsageTable.tsx` to add a help affordance on "Tokens (Cycle)".
    - [ ] 3.2 Reuse the same explanation copy as the Dashboard (single source of truth for copy).

- [ ] **Task 4: Tests**
    - [ ] 4.1 Unit test the breakdown helper(s) (feature aggregation and labeling).
    - [ ] 4.2 Component test: Dashboard renders help affordance and details view opens with expected copy.

## Dev Notes

- **Data source:** This is a display/UX story. Do not change metering logic or DB schema. Use existing `billing_cycles` + `ai_usage_events`.
- **Feature keys in use today:**
  - `consistency_check` (Gemini checks) — see `src/lib/gemini.ts`
  - `suggestion` (Llama suggestions) — see `src/lib/llama.ts`
- **Current dashboard display:** `src/app/dashboard/page.tsx` shows a single total (tokensUsed) and checkCount.
- **UI approach:** Prefer a simple, accessible sheet/modal using the existing Radix-based `src/components/ui/sheet.tsx`.
- **Server/client split:** Keep data fetching in the Dashboard server component, pass breakdown data into a client component for the interactive UI.
- **Upgrade CTA:** Use the existing Settings upgrade entrypoint (`/dashboard/settings`) and keep copy aligned with `src/components/dashboard/UpsellBanner.tsx`.

## Dev Agent Record

### Agent Model Used

gpt-5.2

### Debug Log References

- `docs/prd-epic-8.md` (Story 8.19 summary)
- `src/app/dashboard/page.tsx` (AI Tokens card)
- `src/lib/ai-usage.ts` (cap + monthly usage helpers)
- `src/lib/gemini.ts` and `src/lib/llama.ts` (feature keys logged)
- `src/components/ui/sheet.tsx` (sheet/modal primitive)
- `src/components/admin/UserUsageTable.tsx` (admin tokens table)

### Completion Notes List

-

### File List

- `docs/story8.19.md`
- `docs/sprint-status.yaml`
