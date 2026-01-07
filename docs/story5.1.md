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
**Status:** Planned
