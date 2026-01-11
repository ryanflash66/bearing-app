# Sprint Change Proposal: Supabase RLS & Security Fixes
**Date:** 2026-01-03
**Trigger:** Critical Supabase warnings and "Account Required" blocking error.

## 1. Issue Summary
During development and testing, we encountered the following critical issues:
1.  **"Account Required" Error:** New users could not sign up due to overly restrictive RLS on the `accounts` table.
2.  **Performance Warnings:** "Auth RLS Init Plan" and "Multiple Permissive Policies" warnings caused by inefficient RLS logic.
3.  **Security Warnings:** "Security Definer View" and "Mutable Function Search Path" vulnerabilities.
4.  **Onboarding Deadlock:** Race conditions between DB triggers and RLS prevented new users from "claiming" their profiles or creating accounts atomically.
5.  **MFA Collision:** Duplicate "Friendly Name" errors blocked users during re-enrollment or page refresh.

## 2. Impact Analysis
*   **Epic 1 (Foundation & Auth):** Deeply impacts Story 1.1 (MFA) and 1.3/1.4 (Roles/RLS). Client-only provisioning is no longer viable for production standards.
*   **Epic 4 (Support & Admin):** Impacts Story 4.3 (Support). Support messaging needed specific RLS optimization.
*   **Future Features (Epic 5):** High impact. Features like Custom Model Fine-Tuning or Team Permissions must now adopt the **RPC-First** pattern.
*   **Artifacts:** `architecture-auth.md`, `architecture-security.md`, `ux-design-specification.md`, and `prd-epic-1.md` require updates.

## 3. Recommended Approach
**Direct Adjustment (Minor Scope):**
Update documentation and technical standards to mandate **Security Definer RPCs** for cross-table provisioning and **MFA Cleanup/Unique Naming** for security components. The code is already refined and verified; this ensures future "drifts" are prevented.

## 4. Detailed Change Proposals

### Architecture (`architecture-auth.md` & `architecture-security.md`)
*   **Addition:** Mandate **RPC-First** pattern for workspace-level settings.
*   **Addition:** Document `claim_profile` and `create_default_account` as the standard for user provisioning.
*   **Update:** Require explicit `refreshSession()` and unique friendly names (timestamp-suffixed) for MFA setup.

### UX Specification (`ux-design-specification.md`)
*   **Update:** Formalize the **Terminal Success State** for MFA enrollment to improve user confidence and prevent loops.

### Tech Spec Standard (Future Epics)
*   **Policy:** Any new feature that modifies multiple tables in a single user action (e.g., inviting a team member, changing a workspace model) must use a single atomic Postgres Function (RPC) rather than multiple client-side `.insert()` calls.

## 5. Implementation Handoff
*   **Scope:** Minor (Documentation updates only).
*   **Action:** All artifacts have been updated to reflect the new "Hardened Foundation." No further dev work required for these specific issues.
