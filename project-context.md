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
- `_bmad-output/bmm-workflow-status.yaml`: Current project progress.
