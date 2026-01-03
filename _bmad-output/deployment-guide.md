# Deployment Guide

## Infrastructure

The application consists of two primary components:
1. **Frontend/API (Next.js)**: Deployed to Vercel (recommended) or any Node.js/Docker host.
2. **Database (PostgreSQL)**: Managed Supabase project.

## Deployment Steps

### 1. Database (Supabase)
1. Link project: `npx supabase link --project-ref <project-id>`
2. Push migrations: `npx supabase db push`
3. Push seed data: `npx supabase db reset --linked` (CAUTION: Resets remote DB - usually use explicit seed scripts for prod).

### 2. Application (Vercel)
1. Connect GitHub repository to Vercel.
2. Configure Environment Variables in Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (if needed for admin routes)
3. Deploy. Vercel automatically detects Next.js build settings.

## CI/CD
- **Linting**: Runs on generic `next build`.
- **Testing**: Should be added to GitHub Actions (not currently visible in root scan).
- **Preview Deployments**: Automatic via Vercel for every PR.

## Configuration
- `next.config.js`: Core build settings.
- `supabase/config.toml`: Database auth configuration and local settings.
