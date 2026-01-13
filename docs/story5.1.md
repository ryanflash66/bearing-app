# Story 5.1: Service Marketplace UI

**Description**
As an Author,
I want to browse a catalog of available services (ISBN, Editing),
So that I can purchase the resources I need to publish my book.

**Acceptance Criteria**
*   **Given** the marketplace page
    *   **When** loaded
    *   **Then** a grid of available services (ISBN, Copy Editing, Cover Design Request) is displayed.
    *   **And** each card shows: Title, Price/Range, Description, Turnaround Time.
*   **Given** a distinct user type "Designer" (System Persona)
    *   **When** viewing the marketplace
    *   **Then** they see a "Task Board" view instead of a "Purchase" view (Future Scope prep).
*   **Given** mobile view
    *   **When** accessed
    *   **Then** the grid stacks responsive (1 column).

**Effort:** 8h
**Dependencies:** Epic 1 (Auth)
**Status:** Done

## Dev Agent Record

### File List
- `src/app/dashboard/marketplace/page.tsx`
- `src/components/marketplace/DesignerBoard.tsx`
- `src/components/marketplace/ServiceCard.tsx`
- `src/components/marketplace/ServiceGrid.tsx`
- `src/lib/marketplace-data.ts`
- `src/components/layout/DashboardLayout.tsx`

### Change Log
- **2026-01-13**: Implemented Service Marketplace UI.
    - Added `MarketplacePage` with role-based view switching.
    - Implemented `support_agent` role mapping to "Designer" view.
    - Created `ServiceCard` and `ServiceGrid` components.
    - Added mock data for 7 services (Cover, Editing, etc.).
    - Added "Marketplace" navigation item.
    - Addressed Code Review findings: Added "Track Order" link placeholder and improved accessibility.
    - **Round 2 Updates**: Added empty state handling to `ServiceGrid`.
