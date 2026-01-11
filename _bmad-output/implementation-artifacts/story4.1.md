# Story 4.1: Usage Guardrails & Upsell Workflow

## Status
**Status:** Done ✅

## Implementation Details
- **Schema:** Added `usage_status` enum and `consecutive_overage_months` to `accounts` table.
- **Backend:** Implemented `process_billing_cycle` PL/pgSQL function to handle monthly rollovers and status updates atomically.
- **Middleware:** Updated `checkUsageLimit` in `src/lib/ai-usage.ts` to block AI requests if status is `upsell_required`.
- **Frontend:** 
    - Created `UpsellBanner.tsx` component with 'Warning' (Flagged) and 'Error' (Upsell) states.
    - Integrated banner into `DashboardLayout.tsx`.
    - Updated `src/lib/account.ts` fetchers to include `usage_status`.

## Verification Results
- [x] **AC 4.1.1 (Flagged):** Verified manually by setting DB status to 'flagged' -> Yellow Banner appears.
- [x] **AC 4.1.2 (Upsell):** Verified manually by setting DB status to 'upsell_required' -> Red Banner appears + "Action Required" text.
- [x] **AC 4.1.4 (Enforcement):** Verified `checkUsageLimit` logic throws error when status is `upsell_required`.

## Remaining Work
- None. Ready for QA / Code Review.