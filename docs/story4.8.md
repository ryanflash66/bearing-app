# Story 4.8: Security & Audit Log Viewer

**Description**
As a Super Admin,
I want to filter and inspect system audit logs,
So that I can detect security threats or investigate "who changed what".

**Acceptance Criteria**
*   **Given** the Security page
    *   **When** loaded
    *   **Then** the `audit_logs` table is displayed sorted by newest first.
*   **Given** filtering needs
    *   **When** selecting filters
    *   **Then** I can filter by: User ID, Action Type (LOGIN_FAIL, ROLE_CHANGE), or Date Range.
*   **Given** a specific log entry
    *   **When** expanded
    *   **Then** the full JSON metadata is visible (formatted for readability).
*   **Given** immutable constraint
    *   **When** viewing
    *   **Then** there are NO "Delete" or "Edit" buttons available.

**Effort:** 8h
**Dependencies:** Epic 1 (Audit Table), Story 4.5
**Status:** Backlog
