# Forensic Sprint Change Proposal

**Date:** 2026-01-06
**Status:** DRAFT
**Objective:** Align the active Sprint 4 Board with the verified `PRD-The-Bearing-platform.txt`.

## Executive Summary

The forensic audit revealed significant structural discrepancies between the active Sprint Board and the PRD.
1.  **Epic 2 Overload:** The old Epic 2 mixed "Writing Tools" (Editor) with "AI Features" (Llama), violating the "Independent Value" principle.
2.  **AI Isolation:** AI features (Llama, Gemini, Metering) are now correctly consolidated into a distinct **Epic 3**, allowing for better cost/architecture isolation.
3.  **Epic 4 Focus:** The new Epic 4 is tighter and focused on "Emergency Rework" (Roles, Tickets, Security), deprioritizing "Nice-to-have" admin features like the Global Explorer (Old 4.7).

## Migration Plan

### 1. Structure Migration

| Old Epic | New Epic Structure | Action |
| :--- | :--- | :--- |
| **Epic 1: Foundation** | **Epic 1: Foundation & Identity** | **Keep.** Minor scope adjustments. |
| **Epic 2: Editor & Llama** | **Epic 2: Core Writing Studio** | **SPLIT.** Move Llama/Metering to Epic 3. |
| | **Epic 3: AI Intelligence Layer** | **CREATE.** Receive Llama/Gemini stories. |
| **Epic 3: Consistency** | **Merged into Epic 3** | **RETIRE.** Fold into generic AI Layer. |
| **Epic 4: Admin/Support** | **Epic 4: Support & Admin** | **REFACTOR.** Align with Emergency Rework priorities. |

### 2. Story Mapping & Status Transfer

We will migrate the status of existing stories to their new equivalents.

#### Epic 2 (Active) -> Split into New 2 & 3
*   `Old 2.1 (CRUD)` [Completed] -> **New 2.3 (Editor) [Completed]** & **New 2.1 (Dashboard) [Completed]**
*   `Old 2.2 (History)` [Completed] -> **New 2.5 (Version History) [Completed]**
*   `Old 2.3 (Llama Work)` [Result Needed] -> **New 3.1 (Llama Ghost Text) [Planned]** *(Marking as planned to force re-verification of "Ghost Text" UX)*
*   `Old 2.4 (Export)` [Completed] -> **New 2.X (Implicit in Editor)** or **Keep as Backlog Item** (Export is not explicit in New Top 5, but is PRD 5.2.2. Will add as **New 2.6** if critical).
*   `Old 2.5 (Metering)` [Completed] -> **New 3.4 (Usage Metering) [Completed]**

#### Epic 3 (Old) -> Merged into New 3
*   `Old 3.1 (Manual Check)` [Completed] -> **New 3.2 (Async Consistency) [Completed]**
*   `Old 3.2 (Report UI)` [Refinement] -> **New 3.3 (Clarity Hub) [Planned]**

#### Epic 4 (Active) -> Strict Realignment
*   `Old 4.1 (RBAC)` [Completed] -> **New 4.1 (Separate Support Role) [Completed]**
*   `Old 4.2 (Ticket Engine)` [In Review] -> **New 4.2 (State Machine) [In Review]**
*   `Old 4.3 (User Console)` [In Review] -> **New 4.3 (In-App Inbox) [In Review]**
*   `Old 4.4 (Agent Dash)` [Planned] -> **New 4.4 (Admin Dash) [Planned]** (Merged concept).
*   `Old 4.6 (Notifications)` [Planned] -> **Implicit in 4.2/4.3** (Keep as separate Tech Task if needed).
*   `Old 4.7 (Explorer)` & `4.8 (Audit)` -> **Deprioritize to Backlog** (Not critical for "Emergency Rework").

### 3. Proposed Actions

1.  **Rename & Rescope Epic 2**: Remove AI stories.
2.  **Create Epic 3**: Populate with New 3.1-3.4.
3.  **Update Sprint Board**: Move existing stories to new IDs.
4.  **Orphan Handling**: Move Old 4.7, 4.8 to "Backlog" (Future Epic 7: Advanced Admin).

## Approval

Do you approve this migration plan?
**[C] Apply Changes to Sprint Board**
**[R] Request Modifications**
