# Pending Actions & Deferred Tasks

This document tracks action items that have been deferred or require future attention. It serves as a persistent reminder for the project team.

## Status: Active

### 🔴 High Priority

### 🟡 Medium Priority
- [ ] **Config**: Add Stripe API Keys to `.env.local`
    - **Context**: Story 5.2 (ISBN Purchase Workflow) validation failed manually because `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are missing.
    - **Impact**: Checkout flow cannot be verified in the browser. Automated tests passed with mocks.
    - **Action**: Obtain keys from Stripe dashboard and add to `.env.local`.
    - **Verification**: Re-run buying flow in Marketplace; confirm redirect to Stripe Checkout.

### 🟢 Low Priority

---
**Last Updated:** 2026-01-14
