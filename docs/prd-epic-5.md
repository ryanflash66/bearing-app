# Epic 5: Services & Monetization

**Goal:** Encapsulate all financial and service-based transactions, enabling authors to purchase professional assets (ISBNs) and services (Editing, Marketing) directly within the platform.

## Scope
This Epic covers the "Business Side" of self-publishing. It moves beyond the manuscript itself to the logistics of publishing.
*   **Service Marketplace:** A catalog UI for browsing available services.
*   **ISBN Procurement:** Validating, purchasing, and assigning ISBNs.
*   **Service Request State Machine:** Tracking orders from "Requested" to "Fulfilled".
*   **Admin Fulfillment:** Back-office tools for admins to process these specialized requests.

## Functional Requirements Covered
*   **Services Marketplace (PRD 7)**: Browse and filtering of services.
*   **ISBN Workflow (PRD 7.1)**: Purchase and assignment logic.
*   **Order Tracking (PRD 7.2)**: Visibility into service status.
*   **Admin Fulfillment (PRD 10)**: Ability for admins to upload ISBN blocks and mark services complete.

## Non-Functional Requirements
*   **Financial Security**: All payments via Stripe (Audit Logs required).
*   **Data Integrity**: ISBNs must be unique and immutable once assigned.
*   **Accessibility**: Marketplace and Checkout must be WCAG 2.1 AA compliant.

## User Stories Overview
*   **Story 5.1: Service Marketplace UI**: The "Storefront" for authors.
*   **Story 5.2: ISBN Purchase Workflow**: The checkout and assignment flow.
*   **Story 5.3: Service Request Management**: The "My Orders" view for authors.
*   **Story 5.4: Admin Fulfillment Dashboard**: The backend processing view.
