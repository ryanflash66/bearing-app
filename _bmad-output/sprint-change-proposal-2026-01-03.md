# Sprint Change Proposal: Supabase RLS & Security Fixes
**Date:** 2026-01-03
**Trigger:** Critical Supabase warnings and "Account Required" blocking error.

## 1. Issue Summary
During development and testing, we encountered the following critical issues:
1.  **"Account Required" Error:** New users could not sign up due to overly restrictive RLS on the `accounts` table.
2.  **Performance Warnings:** "Auth RLS Init Plan" and "Multiple Permissive Policies" warnings caused by inefficient RLS logic.
3.  **Security Warnings:** "Security Definer View" and "Mutable Function Search Path" vulnerabilities.

## 2. Impact Analysis
*   **Epic 1 (Foundation & Auth):** Deeply impacts Story 1.3 (Roles) and 1.4 (RLS). The "As-Planned" RLS strategy was insufficient for production standards.
*   **Epic 4 (Support & Admin):** Impacts Story 4.3 (Support). Support messaging needed specific RLS optimization.
*   **Artifacts:** `architecture.md`, `prd-epic-1.md`, and `prd-epic-4.md` require updates to reflect the deployed, verified secure implementation.

## 3. Recommended Approach
**Direct Adjustment (Minor Scope):**
Update the documentation to align with the *verified, implemented code*. The code fixes are already applied and tested; the documentation must now catch up to ensure the "map matches the territory."

## 4. Detailed Change Proposals

### Architecture (`architecture.md`)
**Section 3.3 RLS Policy Outline:**
*   **Change:** Explicitly mandate "Consolidated Policies" using `OR` logic.
*   **Change:** Require optimization of `auth.uid()` in helper functions.
*   **Change:** Mandate strict security settings for Views and Functions.

### Epic 1 (`prd-epic-1.md`)
**Story 1.3 (Account & Role Management):**
*   **Modify AC 1.3.3:** Mention use of optimized helper functions for RLS performance.

**Story 1.4 (Secure Storage & RLS):**
*   **Modify AC 1.4.1:** Specify "consolidated select policies" to prevent performance warnings.
*   **Modify AC 1.4.2:** Specify "admin bypass via explicit admin_or_owner policies" to replace generic permissive checks.

### Epic 4 (`prd-epic-4.md`)
**Story 4.3 (In-App Support):**
*   **Add AC 4.3.6:** Mandate RLS optimization (`is_platform_support`) to prevent "Auth RLS Init Plan" warnings.

## 5. Implementation Handoff
*   **Scope:** Minor (Documentation updates only).
*   **Dependencies:** None.
*   **Action:** Apply edits to `architecture.md`, `prd-epic-1.md`, and `prd-epic-4.md`.
