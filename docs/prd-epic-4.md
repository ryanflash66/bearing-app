# Epic 4: Admin Infrastructure & Support System (Emergency Rework)

**Status:** Emergency Rework (Prioritized)
**Duration:** Weeks 14-16
**Stories:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6

---

## Epic Goal

Establish a robust, high-trust support system with distinct admin roles, persistent ticket management, and deep accessibility.

This epic ensures:
- Strict role separation (Super Admin vs Support Agent)
- Persistent support ticket system/state machine
- Comprehensive Audit Logs
- Accessibility compliance (WCAG 2.1 AA)

---

## Functional Requirements (Epic 4 Update)

| FR | Requirement |
|----|----|
| **FR-04** | Role-based access (Author, Admin, Support Agent, Super Admin) [UPDATED] |
| **FR-21** | In-app support messaging (Robust Ticket System) |
| **FR-22** | Admin dashboard (Dual Views: System & Support) |
| **FR-23** | Admin override controls |
| **FR-24** | (New) Support Ticket State Machine (Draft -> Open -> Pending -> Resolved) |
| **FR-25** | (New) Admin/Support Rate Limiting & Audit Logs |

---

## Non-Functional Requirements (Epic 4 Update)

| NFR | Requirement |
|-----|---|
| **NFR-11** | Audit logs for all admin/support actions |
| **NFR-18** | (New) Support UI must pass accessibility tests (WCAG 2.1 AA) |
| **NFR-19** | (New) E2E Tests for Ticket Lifecycle Required |
| **NFR-20** | (New) Mobile/Safari Support for Support UI verified |

---

## User Stories Plan

### Story 4.1: Admin Role Architecture (RBAC)
Separate Super Admin and Support Agent roles with strict DB constraints.

### Story 4.2: The Support Ticket Engine (State Machine)
Formal state machine for tickets (Open -> Pending -> Resolved).

### Story 4.3: User Support Console (Frontend)
Persistent "My Tickets" page with accessible inputs.

### Story 4.4: Support Agent Dashboard
Dedicated dashboard with queue and user context snapshot.

### Story 4.5: Super Admin Dashboard
High-level view of system health and override controls.

### Story 4.6: Critical Notification System
Automated email triggers for ticket activity.
