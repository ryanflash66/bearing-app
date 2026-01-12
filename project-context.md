# Project Context: Bearing App

## 🚀 Deployment & Synchronization Rules

### 1. The Golden Rule of Deployment
**"Database is Manual, Code is Automatic."**
Our deployment pipeline (GitHub -> Vercel) manages application code automatically. However, it does **NOT** manage the Supabase database schema.

### 2. Deployment Sequence
Whenever a task involves changes to the database schema (new migrations in `supabase/migrations`):
1. **SYNC DATABASE FIRST**: Run `npx supabase db push` to apply migrations to the production Supabase project.
2. **VERIFY SCHEMA**: Ensure the production database is in the expected state.
3. **PUSH CODE SECOND**: Only after the database is updated, run `git push` to trigger the Vercel build.

### 3. Environment Variables
All production environment variables must be manually mirrored in the Vercel Dashboard Settings. Never assume a variable added to `.env.local` will be available in production automatically.

## 🛠️ Tech Stack
- **Frontend**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenRouter (Gemini, Llama)
- **Styling**: Vanilla CSS (Modern Parchment Design System)

## 📁 Critical Files
- `supabase/migrations/`: Database schema source of truth.
- `src/proxy.ts`: Next.js Middleware (renamed from `middleware.ts` in Next.js 16+).
- `_bmad-output/bmm-workflow-status.yaml`: Current project progress.

## Critical Technical Lessons (Added 2026-01-11)

### 1. Next.js 15+ Async Params
*   **Issue:** Route parameters (`params`) in server components are now PROMISES. Accessing them synchronously (e.g., `params.id`) causes `undefined` errors or `invalid input syntax for type uuid`.
*   **Fix:** ALWAYS await params: `const { id } = await params;` regarding of what the types say (types might lag).

### 2. Supabase Ambiguous Foreign Keys (`PGRST201`)
*   **Issue:** If a table has multiple FKs to the same target (e.g., `support_tickets` has `user_id` -> `users` AND `assigned_to` -> `users`), a simple `.select('*, user:users(...)')` WILL FAIL.
*   **Fix:** You MUST specify the constraint name: `.select('*, user:users!support_tickets_user_id_fkey(...)')`.

### 3. Service Role Bypass for Admins
*   **Issue:** Complex RLS policies can sometimes produce "Phantom 404s" for Admins if the policy logic checks a relation that RLS itself blocks access to (infinite recursion or circular dependency).
*   **Fix:** For Super Admin features, use `getAdminAwareClient` (from `src/lib/supabase-admin.ts`) which cleanly bypasses RLS using the Service Role key when appropriate.

### 4. Git & PR Workflow
*   **Rule:** Every logical set of commits MUST have a corresponding Pull Request (PR) created via `gh pr create`.
*   **Workflow:**
    1.  Create/Switch to feature branch.
    2.  Make changes and `git commit`.
    3.  `git push`.
    4.  IMMEDIATELY create PR: `gh pr create --title "feat/fix: description" --body "Details..."`.
    5.  Do not leave branches without PRs.

## ⚠️ Known Warnings
The following build/install warnings are known and safe to ignore for production:
- **`inflight@1.0.6` (Memory Leak)**: Transitive dependency via `ts-jest` -> `babel-plugin-istanbul`. Only affects test execution, not the production build.
- **`glob@7.2.3` (Unsupported)**: Same source path. Required by `babel-plugin-istanbul` for test coverage.
**Action**: Do **NOT** force override these dependencies. Doing so breaks the test suite (`npm test`). We will wait for `babel-plugin-istanbul` to update upstream.
