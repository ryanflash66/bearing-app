# Development Guide

## Prerequisites
- **Node.js**: v18+ (Required for Next.js 14+)
- **npm** or **yarn** or **pnpm**
- **Docker**: For running local Supabase instance.
- **Supabase CLI**: `npm install -g supabase`

## Setup

1. **Clone & Install**
   ```bash
   git clone <repo>
   cd bearing-app
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env.local` and populate:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. **Start Local Database**
   ```bash
   npx supabase start
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:3000`.

## Testing
Jest is configured for unit and integration testing.
- Run all tests: `npm test`
- Watch mode: `npm run test:watch`

## Database Migrations
- Create migration: `npx supabase migration new name_of_change`
- Apply local: `npx supabase db reset` (resets local db)
- Push to remote: `npx supabase db push`

## Code Style
- TypeScript strict mode enabled.
- ESLint configured via Next.js defaults.
