# Traceability Matrix: Story 5.2 ISBN Purchase Workflow
**Generated:** 2026-01-14

| Criterion ID | Description | Test ID | Test File | Test Level | Coverage Status |
| ------------ | ----------- | ------- | --------- | ---------- | --------------- |
| AC-1 | Initiate Stripe Checkout on "Buy ISBN" click | `POST /api/checkout/isbn` | `tests/api/checkout/isbn.test.ts` | Integration (API) | **INTEGRATION-ONLY** |
| AC-2 | Webhook creates Service Request and Success Redirect | `POST /api/webhooks/stripe` | `tests/api/webhooks/stripe.test.ts` | Integration (API) | **INTEGRATION-ONLY** |
| AC-3 | Warn user if ISBN pool empty (Delayed Processing) | `POST /api/checkout/isbn` (Pool Warning) | `tests/api/checkout/isbn.test.ts` | Integration (API) | **INTEGRATION-ONLY** |

## Coverage Analysis
*   **Overall Coverage:** 100% of ACs have API-level coverage.
*   **E2E Gap:** No UI-driven E2E tests found. Interaction with "Buy ISBN" button and Redirect pages is inferred but not directly tested in browser.
*   **Data Consistency Note:** AC-2 specifies "Pending" state; Implementation uses "paid". This requires verification if "paid" implies "pending processing" or if it violates the requirement.

## Recommendations
1.  **Verify Status Enum:** Confirm if `status='paid'` is the correct intended state vs `status='pending'`.
2.  **Add E2E Test:** A rudimentary E2E test clicking the button and verifying the redirection to Stripe (mocked) would close the coverage gap.
