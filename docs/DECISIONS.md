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

[Add more decisions as you make them during development]