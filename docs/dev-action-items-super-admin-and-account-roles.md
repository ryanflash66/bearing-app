# Dev Action Items: Super Admin Singleton & Account Roles

**Priority:** ASAP  
**Source:** PM (Ryan) — Feb 8 2026  
**For:** DEV agent implementation

---

## Problem summary

1. **Super admin is not locked to a single designated account.** Any account type can currently be promoted to super admin by the existing super admin. Super admin must be exactly one account and must be the account with email `dark7eaper@bearing.app` — no other account may be promoted to super admin, and that account must not be demotable from super admin via the app.
2. **Account types are incomplete.** Required global app roles are: **user**, **support_agent**, and **admin**. The app currently exposes **user**, **support_agent**, and **super_admin** in the Super Admin user management UI. The **admin** role exists in the DB (migration `20260117000004_restore_admin_role.sql`) but is not assignable in the UI and is not consistently used in the codebase.

---

## Intended model

| Role           | Count   | Who / purpose |
|----------------|---------|----------------|
| **super_admin** | Exactly 1 | Single designated account: `dark7eaper@bearing.app`. Not assignable; not demotable via app. |
| **admin**      | 0+      | Account-level admins (assignable by super admin). |
| **support_agent** | 0+   | Support staff (assignable by super admin). |
| **user**       | 0+      | Default author accounts. |

---

## Action items for DEV

### 1. Lock super admin to the designated account

- **1.1** In code that updates global user role (e.g. `src/lib/super-admin-users.ts` → `updateGlobalUserRole`):
  - Reject any request to set `role = 'super_admin'` for any user other than the designated super admin (resolve designated user by email `dark7eaper@bearing.app` or by a single source of truth, e.g. env var or config).
  - Reject any request to change the designated super admin’s role away from `super_admin` (no demotion of that account via this flow).
- **1.2** In the Super Admin UI (`src/components/admin/super/GlobalUsersTable.tsx`):
  - Remove **Super Admin** from the role dropdown for all users. No one should be able to “promote” another user to super admin from the UI.
  - For the row that is the current super admin (designated account), show role as “Super Admin” read-only (no dropdown, or disabled dropdown) so it cannot be changed from the UI.
- **1.3** Optionally: add a small config or env check (e.g. `SUPER_ADMIN_EMAIL` or similar) so the designated account is not hardcoded in many places. Document in `.env.example` if used.

**Definition of done:** Only the account for `dark7eaper@bearing.app` can hold `super_admin`; that account cannot be demoted via the app; UI does not offer “Super Admin” as an assignable role.

---

### 2. Add and use the **admin** account type

- **2.1** Ensure the DB enum `public.app_role` includes `admin` (already added in `20260117000004_restore_admin_role.sql`). If TypeScript types are out of date, regenerate Supabase types so `app_role` includes `"admin"` (e.g. `npx supabase gen types typescript` and update `src/types/supabase.ts` if needed).
- **2.2** In the Super Admin user management UI (`GlobalUsersTable.tsx`), add **Admin** as an assignable role:
  - ROLES list should be: **User**, **Support Agent**, **Admin** (and no **Super Admin** — see 1.2).
- **2.3** In `src/lib/super-admin-users.ts` (and any other places that accept or persist global role), allow and persist `admin` as a valid role. Ensure types use `"user" | "support_agent" | "admin"` (and exclude `super_admin` from assignable values).
- **2.4** Audit permission checks that currently treat “admin” or “account admin” differently from “super_admin” (e.g. `src/app/dashboard/admin/page.tsx` primaryAccount.role, `src/app/api/manuscripts/[id]/service-status/route.ts` role checks, blog moderation migrations that reference `admin`). Ensure that global **admin** (users.role = 'admin') is granted the intended access (e.g. admin dashboard, moderation, manuscript oversight) consistently with architecture. Add or update checks where “admin” is required so they use the global `users.role = 'admin'` where appropriate.

**Definition of done:** Admin is an assignable role in the Super Admin UI; backend and RLS treat `admin` correctly; types and DB are aligned.

---

### 3. Harden backend and RLS

- **3.1** Ensure the singleton super_admin constraint remains enforced in the DB (unique partial index `idx_singleton_super_admin` on `users(role) WHERE role = 'super_admin'`). Do not allow any code path (e.g. service role updates) to bypass this; if a second super_admin is ever written, the DB should reject it.
- **3.2** If there is an RPC or API that can change `users.role` (e.g. `assign_user_role` or internal APIs), ensure it never assigns `super_admin` (migration `20260117000007_rpc_assign_role.sql` already blocks assigning super_admin via that RPC; confirm no other path can assign it except the designated-account logic in 1.1).

**Definition of done:** Only one row can have `role = 'super_admin'`; no code path can assign `super_admin` except to the designated account.

---

### 4. QA and docs

- **4.1** Manually verify: Super admin cannot assign another user to Super Admin; designated super admin row shows read-only Super Admin; Admin can be assigned and has correct access.
- **4.2** Update any relevant docs (e.g. `docs/architecture-auth.md` or role matrix) to state: super_admin = single designated account (dark7eaper@bearing.app); assignable roles = user, support_agent, admin.

---

## Key file references

| Area | File(s) |
|------|--------|
| Global role update | `src/lib/super-admin-users.ts` |
| Super Admin UI table | `src/components/admin/super/GlobalUsersTable.tsx` |
| Super Admin action | `src/app/dashboard/admin/super/actions.ts` |
| Role types | `src/types/supabase.ts` (Enums.app_role) |
| Singleton constraint | `supabase/migrations/20260117000008_fix_singleton_index.sql` |
| Assign-role RPC (no super_admin) | `supabase/migrations/20260117000007_rpc_assign_role.sql` |
| Admin role in enum | `supabase/migrations/20260117000004_restore_admin_role.sql` |

---

## Out of scope for this set

- Changing **account-level** roles (author / admin / support) on accounts; those remain as-is.
- E2E or internal test helpers (e.g. `src/app/api/internal/e2e/set-role/route.ts`) may still need to swap or set super_admin for tests; keep those restricted to dev/test and document that they are exceptions.

---

*End of action items. DEV can implement in order 1 → 2 → 3 → 4.*
