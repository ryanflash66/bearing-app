# Critical Auth & MFA Repairs

## Executive Summary
Resolved a series of blocking issues in the Authentication and User Provisioning flows. The system now correctly handles new user sign-ups, properly provisions accounts without RLS conflicts, and reliably manages MFA enrollment even with stale browser sessions.

## 1. Profile Creation Fix
**Problem:** Users incurred "Duplicate Key" errors because RLS policies prevented the client from seeing (and thus claiming) existing "orphaned" profile rows created by triggers.
**Solution:**
- Implemented `claim_profile` (Security Definer RPC).
- This function bypasses RLS to securely check for an existing email match and updates the `auth_id` to the current user, "claiming" the profile.

## 2. Account Creation Fix
**Problem:** `42501 RLS Violation` during account creation. The dependency between `users`, `accounts`, and `account_members` tables created circular RLS checks that failed during the initial "bootstrapping" phase.
**Solution:**
- Implemented `create_default_account` (Security Definer RPC).
- Moved the multi-step provisioning logic (Insert Account -> Insert Member) into a single atomic database transaction.
- This ensures data integrity and bypasses the fragility of client-side RLS checks for creation.

## 3. MFA Enrollment Fix
**Problem:** "Friendly Name already exists" error.
- The `MFAEnrollment` component would attempt to create a new key with a default name.
- If the user had a previous failed attempt (unverified factor) or a stale session (verified factor not seen by client), the database rejected the duplicate name.
**Solution:**
- **Guard Rails:** Component now checks for *Verified* factors first and aborts if found.
- **Cleanup:** Component automatically deletes stale *Unverified* factors.
- **Uniqueness:** Generated Friendly Names now include a timestamp suffix (e.g., `Bearing App (email) - 1234`) to mathematically guarantee uniqueness, preventing blocking errors even in edge cases.
- **Freshness:** Forced `supabase.auth.refreshSession()` before operations to ensure client state matches server state.

## Current Status
- **Sign Up:** ✅ Operational
- **Account Creation:** ✅ Operational
- **MFA Setup:** ✅ Operational
