# Source Tree Analysis

## Directory Structure

```
bearing-app/
├── docs/                # Project Documentation (Architecture, PRDs, Stories)
├── src/
│   ├── app/             # Next.js 13+ App Router
│   │   ├── api/         # Backend API Routes (Manuscripts, Cleanup)
│   │   ├── auth/        # Auth Pages
│   │   ├── dashboard/   # Main App Interface
│   │   ├── login/       # Login Page
│   │   └── signup/      # Registration Page
│   ├── components/      # React Components
│   │   ├── admin/       # Admin domain components
│   │   ├── auth/        # Auth domain components
│   │   ├── layout/      # Shell/Structure components
│   │   ├── manuscripts/ # Editor & Management components
│   │   └── ui/          # Shared Generic UI
│   ├── lib/             # Core Utilities & Libraries
│   │   └── supabase/    # Supabase Client setup
│   ├── utils/           # Helper functions
│   └── middleware.ts    # Edge Middleware (Auth Protection)
├── supabase/            # Database Configuration
│   ├── migrations/      # SQL Schema Migrations
│   ├── config.toml      # Local Dev Config
│   └── seed.sql         # Seed Data
├── tests/               # Test Suite (Jest)
├── public/              # Static Assets
├── package.json         # Dependencies & Scripts
├── tsconfig.json        # TypeScript Config
└── next.config.js       # Next.js Configuration
```

## Critical Pathways

### Entry Points
- **Frontend**: `src/app/page.tsx` (Landing), `src/app/layout.tsx` (Root Layout).
- **Backend**: `src/app/api/**/route.ts` handlers.
- **Middleware**: `src/middleware.ts` runs on every request for auth checking.

### Key Logic
- **State Management**: React Server Components (fetching) + limited Client Component state.
- **Data Access**: `@supabase/ssr` used in Server Components/Actions; `@supabase/supabase-js` client-side.
- **Database**: Rules defined in `supabase/migrations`.
