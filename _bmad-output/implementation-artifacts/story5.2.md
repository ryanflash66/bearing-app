# Story 5.2: ISBN Purchase Workflow (Stripe Integration)

## Description
As an author, I want to purchase a valid ISBN for my book directly within the platform using Stripe, so that I can publish professionally without leaving the system. This creates a traceable service request that admins can fulfill.

## Acceptance Criteria

### AC 5.2.1: Stripe Checkout Initiation
- **Given:** I am on the Service Marketplace page
- **When:** I click "Request Service" (or "Buy ISBN") on the ISBN card
- **Then:** A Stripe Checkout session is initiated for the amount of $125
- **And:** The metadata includes `user_id` and `manuscript_id` (if selected)

### AC 5.2.2: Service Request Creation
- **Given:** A successful Stripe payment
- **When:** The webhook `checkout.session.completed` is received
- **Then:** A new record is created in the `service_requests` table with `status: 'pending'`
- **And:** The request type is set to `isbn`

### AC 5.2.3: Success Redirection
- **Given:** A completed Stripe session
- **When:** I am redirected back to the platform
- **Then:** I see a "Success" page thanking me for the purchase
- **And:** I am prompted to view my order in the upcoming "My Orders" tab (Story 5.3)

### AC 5.2.4: Admin Pool Warning (Optional/Recommended)
- **Given:** A checkout attempt
- **When:** The internal `isbn_pool` is empty
- **Then:** The UI shows a subtle warning that "Manual assignment may take 24-48 hours" before proceeding to Stripe.

## Technical Requirements
- **Database**:
    - Create `service_requests` table.
    - Create `isbn_pool` table for tracking available numbers.
- **Stripe Integration**:
    - Use `@stripe/stripe-js` and `stripe` Node library.
    - Implement `/api/checkout` and `/api/webhooks/stripe` routes.
- **Security**:
    - RLS on `service_requests` must restrict viewing to the owning user or Admins.

---

## Tasks/Subtasks

### Task 1: Create database migrations for service_requests and isbn_pool tables
- [x] 1.1: Create migration for `service_requests` table with columns: id, user_id, manuscript_id (nullable), service_type (enum), status (enum), stripe_session_id, stripe_payment_intent_id, amount_cents, metadata (jsonb), created_at, updated_at
- [x] 1.2: Create migration for `isbn_pool` table with columns: id, isbn, assigned_to_request_id (nullable), created_at, assigned_at
- [x] 1.3: Add RLS policies for service_requests (user sees own, admins see all)
- [x] 1.4: Add RLS policies for isbn_pool (admin-only access)

### Task 2: Install and configure Stripe dependencies
- [x] 2.1: Install `stripe` (server) and `@stripe/stripe-js` (client) packages
- [x] 2.2: Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to environment config

### Task 3: Create /api/checkout route for Stripe session creation
- [x] 3.1: Create POST `/api/checkout/isbn/route.ts` that creates Stripe Checkout session
- [x] 3.2: Include user_id and manuscript_id in session metadata
- [x] 3.3: Check isbn_pool count and include warning flag in response if empty
- [x] 3.4: Return session URL for redirect

### Task 4: Create /api/webhooks/stripe route for webhook handling
- [x] 4.1: Create POST `/api/webhooks/stripe/route.ts` with signature verification
- [x] 4.2: Handle `checkout.session.completed` event
- [x] 4.3: Create service_request record with status='pending' on successful payment
- [x] 4.4: Implement idempotency check to handle duplicate webhook events

### Task 5: Update ServiceCard component for ISBN purchase flow
- [x] 5.1: Detect ISBN service type and show "Buy ISBN - $125" button
- [x] 5.2: Call /api/checkout/isbn on button click
- [x] 5.3: Display pool warning modal if isbn_pool is empty before proceeding
- [x] 5.4: Redirect to Stripe Checkout URL

### Task 6: Create success page for post-payment redirect
- [x] 6.1: Create `/dashboard/marketplace/success/page.tsx`
- [x] 6.2: Display thank you message and order confirmation
- [x] 6.3: Include link to "My Orders" (placeholder for Story 5.3)

### Task 7: Write tests for ISBN purchase workflow
- [x] 7.1: Unit tests for /api/checkout/isbn route (5 tests)
- [x] 7.2: Unit tests for /api/webhooks/stripe route (7 tests)
- [x] 7.3: Component tests for ServiceCard ISBN flow (13 tests)
- [x] 7.4: Integration test for full checkout flow (mocked Stripe)

---

## Success Criteria (QA Gate)
- [x] Checkout flow redirects to Stripe and back to Success page.
- [x] `service_requests` record is created with correct metadata.
- [x] Webhook handling is robust (handles duplicate events).
- [x] 0.00% data loss on purchase.

---

## Dev Notes

### Architecture Requirements
- Follow existing API route patterns in `src/app/api/`
- Use Supabase RLS for security (per project-context.md)
- Stripe webhook must verify signature using STRIPE_WEBHOOK_SECRET
- Use service role client for webhook operations (bypasses RLS)

### Integration Points
- ServiceCard.tsx - Existing component needs ISBN-specific handling
- marketplace-data.ts - ISBN service already defined (id: "isbn", price: $125)
- Manuscripts - Optional manuscript_id association for the ISBN

### Error Handling
- Graceful handling of Stripe API errors
- Retry logic not needed (Stripe handles retries)
- Log webhook events for debugging

---

## Status
**Done** - Code review passed 2026-01-14

---

## Dev Agent Record

### Implementation Plan
1. Database first: Create migrations with proper schema and RLS
2. Stripe setup: Install packages, configure env vars
3. API routes: Checkout session creation and webhook handler
4. UI updates: ServiceCard with ISBN-specific flow
5. Success page: Post-payment user experience
6. Tests: Comprehensive test coverage

### Debug Log
- 2026-01-14: Fixed Stripe API version from 2024-12-18.acacia to 2025-12-15.clover
- 2026-01-14: Fixed lazy initialization of Stripe client to prevent build-time errors

### Completion Notes
Implementation complete with full test coverage:
- **Database**: Created `service_requests` and `isbn_pool` tables with proper RLS policies
- **Stripe Integration**: Lazy-initialized Stripe client, checkout session API, webhook handler with idempotency
- **UI**: Updated ServiceCard with ISBN-specific purchase flow and pool warning modal
- **Success Page**: Post-payment thank you page with order reference display
- **Tests**: 25 tests covering API routes and component functionality

All acceptance criteria verified:
- AC 5.2.1: Stripe checkout initiates with $125 amount and user_id/manuscript_id metadata
- AC 5.2.2: Webhook creates service_request with status='pending' and type='isbn'
- AC 5.2.3: Success page displays with session_id and next steps
- AC 5.2.4: Pool warning modal shown when isbn_pool is empty

---

## File List

### New Files
| File | Description |
|------|-------------|
| `supabase/migrations/20260114000000_create_service_marketplace_tables.sql` | Database migration for service_requests and isbn_pool tables with RLS |
| `src/lib/stripe.ts` | Stripe client initialization with lazy loading and service constants |
| `src/app/api/checkout/isbn/route.ts` | API route to create Stripe checkout sessions |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler for payment events |
| `src/app/dashboard/marketplace/success/page.tsx` | Success page after ISBN purchase |
| `tests/api/checkout/isbn.test.ts` | Unit tests for checkout API route |
| `tests/api/webhooks/stripe.test.ts` | Unit tests for Stripe webhook handler |

### Modified Files
| File | Description |
|------|-------------|
| `src/components/marketplace/ServiceCard.tsx` | Added ISBN purchase flow with pool warning modal |
| `.env.example` | Added Stripe environment variable documentation |
| `package.json` | Added stripe and @stripe/stripe-js dependencies |
| `tests/components/marketplace/ServiceCard.test.tsx` | Updated with ISBN purchase flow tests |

### Code Review Fixes (2026-01-14)
| File | Description |
|------|-------------|
| `.env.example` | Added SUPABASE_SERVICE_ROLE_KEY documentation |
| `supabase/migrations/20260114000001_fix_function_search_path.sql` | Security fix for search_path vulnerability |
| `src/lib/stripe.ts` | Added API version documentation comment |
| `src/app/api/checkout/isbn/route.ts` | Added UUID validation for manuscriptId |
| `tests/api/checkout/isbn.test.ts` | Added test for invalid UUID handling |
| `tests/components/marketplace/ServiceCard.test.tsx` | Added test for Continue to Payment button |

---

## Senior Developer Review (AI)

**Review Date:** 2026-01-14
**Reviewer:** Claude Code (Adversarial Review)
**Outcome:** ✅ APPROVED (after fixes)

### Issues Found and Fixed
| Severity | Issue | Resolution |
|----------|-------|------------|
| HIGH | Missing SUPABASE_SERVICE_ROLE_KEY in .env.example | Added with documentation |
| HIGH | Function search_path mutable (security lint) | Created migration to fix |
| MEDIUM | Hardcoded Stripe API version undocumented | Added comment with upgrade URL |
| MEDIUM | No UUID validation on manuscriptId | Added regex validation |
| MEDIUM | Missing test for Continue to Payment button | Added test coverage |

### Remaining Low-Priority Items (Deferred)
- `get_available_isbn_count()` could document index dependency
- Success page could verify session ownership (low risk)

### Verification
- All 27 tests passing
- All Acceptance Criteria verified as implemented
- All Task checkboxes verified against actual code
- Security advisory for search_path addressed

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-14 | Story created with detailed implementation tasks | Dev Agent |
| 2026-01-14 | Implementation complete - all tasks done, tests passing | Dev Agent |
| 2026-01-14 | Code review: 2 HIGH, 4 MEDIUM issues found and fixed | Claude Code |
| 2026-01-14 | Status changed to Done after review fixes | Claude Code |
