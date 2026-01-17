# Story 5.2: ISBN Purchase Workflow

**Description**
As an Author (Subscriber),
I want to claim an ISBN for my book as part of my subscription plan,
So that I can distribute it to retailers legally without a separate checkout process.

**Acceptance Criteria**
*   **Given** the "Request ISBN" action is clicked
    *   **When** validated
    *   **Then** the system Checks for Active Subscription (e.g., "Pro" plan).
    *   **And** Checks for Monthly Quota (e.g., "1 ISBN remaining this month").
*   **Given** validation passes
    *   **When** confirmed
    *   **Then** the UI proceeds immediately to the "Book Details" assignment form (Skipping Payment).
    *   **And** a Service Request (Type: ISBN) is created in "Pending" state.
*   **Given** validation fails (No Subscription or Quota Exceeded)
    *   **When** attempted
    *   **Then** an upgrading/upsell modal is displayed.
*   **Given** no available ISBNs in admin pool
    *   **When** requesting
    *   **Then** logic warns user "Delayed Processing" but allows the request queueing.

**Effort:** 16h
**Dependencies:** Story 5.1, Stripe Account
**Status:** Planned
