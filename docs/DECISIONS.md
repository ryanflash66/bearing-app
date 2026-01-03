# Architecture Decisions for The Bearing

## ADR-001: Database Choice (Supabase PostgreSQL)
**Decision**: Use Supabase instead of custom Firebase/DynamoDB
**Rationale**: 
  - Full SQL power for complex queries
  - Row-Level Security for author data isolation
  - Built-in auth (Supabase Auth)
  - Cost-efficient ($25/month base)
**Alternatives considered**: Firebase (less control), DynamoDB (overkill)
**Tradeoffs**: No NOSQL flexibility, but not needed for this project

## ADR-002: Ingest-First Dashboard Layout
**Decision**: Prioritize Magic Ingest (file import) as the primary visual action on the Manuscripts page.
**Rationale**: 
  - Most authors start with existing drafts rather than empty canvases.
  - Reduces friction for onboarding new manuscripts.
  - Promotes the AI parsing engine as a core differentiator.
**Tradeoffs**: "New Manuscript" (blank) is moved to a secondary visual position.

## ADR-003: Manual Import Retry Strategy
**Decision**: Implement client-side `lastFileRef` storage for manual retries instead of complex server-side backends for non-Edge environments.
**Rationale**: 
  - Resilient against Vercel serverless timeouts.
  - Minimal architectural complexity (no Job Queues needed yet).
  - High user visibility and control.
