# GitHub Copilot Instructions for Bearing App

## Project Overview

The Bearing App is a secure manuscript management and AI-assisted editing platform built with Next.js, Supabase, and AI services (OpenRouter, Gemini, Llama).

## Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (JWT-based)
- **Styling**: Tailwind CSS (Modern Parchment Design System)
- **AI Services**: OpenRouter (Gemini, Llama models)
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Vercel (frontend), Supabase (database)

## Critical Rules

### 1. Deployment & Database Synchronization

**"Database is Manual, Code is Automatic"**

- The deployment pipeline (GitHub → Vercel) manages application code automatically
- It does **NOT** manage the Supabase database schema
- When making database schema changes:
  1. **SYNC DATABASE FIRST**: Run `npx supabase db push` to apply migrations
  2. **VERIFY SCHEMA**: Ensure production database is updated
  3. **PUSH CODE SECOND**: Only after database is updated, push code changes

### 2. Environment Variables

- Production environment variables must be manually configured in Vercel Dashboard
- Never assume variables in `.env.local` will be available in production
- Always document new environment variables in `.env.example`

### 3. Middleware Location

- Next.js middleware is in `src/proxy.ts` (renamed from `middleware.ts` in Next.js 16+)
- Do not create a `middleware.ts` file in the root

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/          # API endpoints
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # Main dashboard and features
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components (organized by feature)
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── editor/
│   │   ├── manuscripts/
│   │   ├── support/
│   │   └── ui/           # Reusable UI components
│   ├── lib/              # Business logic and utilities
│   ├── utils/            # Helper functions
│   ├── types/            # TypeScript type definitions
│   └── proxy.ts          # Next.js middleware
├── supabase/
│   └── migrations/       # Database migrations (source of truth)
├── tests/                # Test files
├── docs/                 # Architecture and design documentation
└── scripts/              # Utility scripts
```

## Coding Conventions

### TypeScript

- **Strict mode enabled**: Always use proper types, avoid `any`
- Use type imports: `import type { Metadata } from 'next'`
- Path aliases: Use `@/*` for imports from `src/` directory
- Target: ES5 with modern lib support (dom, esnext)

### React & Next.js

- **Use "use client" directive** for client components (interactive, hooks, event handlers)
- **Server components by default** unless client-side interactivity is needed
- Use `export const dynamic = 'force-dynamic'` for API routes that need fresh data
- Prefer `useTransition` for state updates that trigger server actions
- Use `useRouter` from `next/navigation` (not `next/router`)
- Suppress hydration warnings when needed: `suppressHydrationWarning`

### Components

- Place components in feature-based directories under `src/components/`
- Client components: Use `"use client"` at the top of the file
- Props interface naming: `ComponentNameProps`
- Export components as default: `export default function ComponentName()`

### API Routes

- Use proper HTTP status codes (401 Unauthorized, 400 Bad Request, 500 Internal Server Error)
- Always authenticate with Supabase: `await createClient()` then `supabase.auth.getUser()`
- Return JSON responses: `NextResponse.json({ ... }, { status: ... })`
- Add comments for complex logic or business rules
- Document acceptance criteria (AC) references in comments where applicable

### Database & Security

- **Always use Row Level Security (RLS)** policies
- Never bypass RLS except for service-level operations (cleanup jobs, admin operations)
- Use service role key only when necessary and with proper API key authentication
- All database queries go through Supabase client
- Migrations are numbered with timestamp: `YYYYMMDDHHMMSS_description.sql`

### Authentication & Authorization

- Use Supabase Auth for authentication
- Check user authentication in API routes: `const { data: { user }, error } = await supabase.auth.getUser()`
- Validate user roles and permissions using RLS policies
- Use JWT tokens stored in httpOnly cookies (handled by Supabase)

### Error Handling

- Catch and log errors appropriately
- Return user-friendly error messages
- Use proper HTTP status codes
- For large file operations, document memory risks and future optimizations

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use consistent spacing and color scheme from the design system
- Inline styles only when necessary (e.g., dynamic styles, `suppressHydrationWarning`)

## Build, Test, and Lint Commands

```bash
# Development
npm run dev              # Start Next.js development server

# Build
npm run build            # Production build

# Testing
npm test                 # Run Jest unit tests
npm run test:watch       # Run tests in watch mode

# Linting
npm run lint             # Run Next.js linter

# Environment validation
npm run validate-env     # Validate environment variables

# Database
npx supabase db push     # Push migrations to Supabase (production)
npm run verify-rls       # Verify RLS policies are properly configured
```

## Known Issues & Warnings to Ignore

The following build warnings are **safe to ignore** and should **not** be fixed:

- **`inflight@1.0.6` (Memory Leak)**: Transitive dependency via `ts-jest` → `babel-plugin-istanbul`. Only affects test execution, not production.
- **`glob@7.2.3` (Unsupported)**: Required by `babel-plugin-istanbul` for test coverage.

**Do NOT force override these dependencies** as it breaks the test suite. Wait for upstream updates.

## Security Best Practices

- Never commit secrets or API keys to the repository
- Use environment variables for all sensitive configuration
- Always validate and sanitize user input
- Implement proper authentication checks on all protected routes
- Use parameterized queries (Supabase client handles this)
- Follow the principle of least privilege for database access
- Add audit logging for sensitive operations

## AI Integration

- Use OpenRouter for AI model access (Gemini, Llama)
- Implement streaming for AI responses when possible
- Track token usage for cost monitoring
- Cache AI responses when appropriate
- Document token estimates in API responses
- Validate context window sizes before AI calls

## Testing Guidelines

- Write unit tests for business logic in `lib/` directory
- Use React Testing Library for component tests
- Use Playwright for E2E tests
- Test files should mirror source structure
- Mock Supabase client in tests
- Test both success and error cases

## Documentation

- Reference architecture docs in `/docs` for system design
- Document complex business logic with inline comments
- Include acceptance criteria (AC) references when implementing features
- Update `.env.example` when adding new environment variables
- Document API endpoints with JSDoc comments

## Git Workflow

- Commit messages should be clear and descriptive
- Keep commits focused and atomic
- Do not commit build artifacts, logs, or dependencies (see `.gitignore`)
- Excluded files: `node_modules/`, `.next/`, `.env*`, `*.log`, test outputs

## Additional Context

- Project uses path alias `@/` pointing to `src/` directory
- Manuscripts support versioning and soft deletion (30-day recovery period)
- Role-based access control: users can be authors, admins, or support agents
- The app supports multi-account management with proper isolation
- See `/docs` directory for detailed architecture documentation on:
  - Authentication & Identity (`architecture-auth.md`)
  - Database & Data Model (`architecture-database.md`)
  - AI Integration (`architecture-ai.md`)
  - Security & Compliance (`architecture-security.md`)
  - Deployment & Operations (`architecture-deployment.md`)

## Working with This Repository

- Always check `project-context.md` for deployment guidelines
- Consult architecture docs before making significant changes
- Test database migrations locally before pushing to production
- Validate environment variables with `npm run validate-env`
- Run RLS verification after database changes: `npm run verify-rls`
