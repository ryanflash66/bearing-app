# Story 5.2: ISBN Purchase Workflow

**Description**
As an Author,
I want to purchase a valid ISBN for my book,
So that I can distribute it to retailers legally.

**Acceptance Criteria**
*   **Given** the "Buy ISBN" clicked
    *   **When** confirmed
    *   **Then** a Stripe Checkout session is initiated for the configured amount.
*   **Given** successful payment
    *   **When** webhook received
    *   **Then** a Service Request (Type: ISBN) is created in "Pending" state.
    *   **And** the user is redirected to a "Success" page.
*   **Given** no available ISBNs in admin pool
    *   **When** checking out
    *   **Then** logic warns user "Delayed Processing" but allows purchase.

**Effort:** 16h
**Dependencies:** Story 5.1, Stripe Account
**Status:** Planned
