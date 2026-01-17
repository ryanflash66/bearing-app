# Epic 5: Services & Monetization

**Goal:** Encapsulate all financial and service-based transactions, enabling authors to access subscriber benefits (ISBNs) and services (Editing, Marketing) directly within the platform.

## Scope
This Epic covers the "Business Side" of self-publishing. It moves beyond the manuscript itself to the logistics of publishing.
*   **Service Marketplace:** A catalog UI for browsing available subscriber benefits.
*   **ISBN Procurement:** Validating subscription status and assigning ISBNs.
*   **Service Request State Machine:** Tracking requests from "Requested" to "Fulfilled".
*   **Admin Fulfillment:** Back-office tools for admins to process these specialized requests.

## Functional Requirements Covered
*   **Services Marketplace (PRD 7)**: Browse and filtering of included benefits.
*   **ISBN Workflow (PRD 7.1)**: Subscription validation and assignment logic.
*   **Order Tracking (PRD 7.2)**: Visibility into service status.
*   **Admin Fulfillment (PRD 10)**: Ability for admins to upload ISBN blocks and mark services complete.

## Non-Functional Requirements
*   **Access Control**: All services gated by Subscription Tier (Entitlement Check).
*   **Data Integrity**: ISBNs must be unique and immutable once assigned.
*   **Accessibility**: Marketplace and Request forms must be WCAG 2.1 AA compliant.

## User Stories Overview
*   **Story 5.1: Service Marketplace UI**: The "Benefits Hub" for authors.
*   **Story 5.2: ISBN Request Workflow**: The entitlement and assignment flow.
*   **Story 5.4: Admin Fulfillment Dashboard**: The backend processing view.
*   **Story 5.5: Cmd+K Commander Pattern**: Global command palette for power users.
*   **Story 5.6: Integrate Custom Fine-Tuned Models**: (Deferred) Specialized AI models.
*   **Story 5.7: Voice-to-Text Dictation**: (Deferred) Audio input for manuscripts.
*   **Story 5.8: Mobile Responsive Layout**: (Deferred) Optmized view for mobile devices.
*   **Story 5.9: AI Cover Generator**: (Deferred) Generative art tool for book covers (moved from Epic 6).
