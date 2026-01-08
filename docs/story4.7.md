# Story 4.7: Global Manuscript Explorer

**Description**
As a Super Admin,
I want a searchable view of ALL manuscripts in the system,
So that I can investigate content reports or support issues without logging in as the user.

**Acceptance Criteria**
*   **Given** the Admin Dashboard
    *   **When** navigating to "Manuscripts"
    *   **Then** a paginated table of all manuscripts is shown (Title, Author, Status, CreatedAt).
*   **Given** a search query
    *   **When** entered
    *   **Then** results filter by Title or Author Name.
*   **Given** a manuscript row
    *   **When** clicked
    *   **Then** it opens in "Read Only" mode using the admin-bypass RLS policy.
*   **Given** privacy constraints
    *   **When** viewing
    *   **Then** the admin access is logged to the `audit_logs` table ("ADMIN_VIEW_CONTENT").

**Effort:** 12h
**Dependencies:** Epic 1 (RLS Bypass), Story 4.5 (Admin Dash)
**Status:** Backlog
