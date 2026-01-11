# System-Level Test Design

## Testability Assessment

- **Controllability**: PASS with CONCERNS.
    - **Pros**: Supabase allows easy data seeding and state inspection. Frontend-backend communication is via standard HTTP/JSON which is easy to mock.
    - **Concerns**: Heavy reliance on external AI providers (Modal/Llama, Google/Gemini) requires robust mocking strategy to avoid non-deterministic test failures and excessive costs. RLS logic is complex and requires special care to verify via integration tests using different user roles.
- **Observability**: PASS.
    - **Pros**: Immutable audit logs and structured usage events provide excellent visibility into system operations. Next.js Route Handlers and Supabase logs provide clear error tracing.
    - **Note**: Ensure `request_id` is propagated to client responses and audit logs for end-to-end traceability.
- **Reliability**: PASS.
    - **Pros**: Async job coordination (Consistency Checks) prevents blocking the main UI. Immutable audit logs prevent state manipulation by rogue admins.
    - **Note**: Parallel test execution will require unique user/account isolation to prevent RLS/Quota collisions.

## Architecturally Significant Requirements (ASRs)

| ID | Category | Requirement | Priority | Test Approach |
| --- | --- | --- | --- | --- |
| ASR-001 | SEC | **Private-by-default (RLS)**: User A must never see User B's content. | 9 | Integration tests verifying RLS policies with multiple user sessions. |
| ASR-002 | COST | **Enforceable Usage Caps**: Block AI requests when quotas are hit. | 9 | Unit tests for metering logic + Integration tests verifying 403/429 responses. |
| ASR-003 | PERF | **Non-blocking Editor**: AI suggestions must not delay writing. | 6 | E2E tests verifying UI responsiveness during AI calls + k6 latency caps. |
| ASR-004 | REL | **Async Job Resilience**: Consistency checks must survive disconnects. | 6 | Integration tests for job status polling and Realtime event receipt. |
| ASR-005 | SEC | **Immutable Audit Logs**: Admin actions cannot be deleted or forged. | 9 | SQL-level integration tests attempting unauthorized updates/deletes. |

## Test Levels Strategy

- **Unit**: (40%)
    - **Focus**: Pure logic (usage metering, cost calculation, text processing).
    - **Rationale**: Fast feedback for complex branching logic in billing and AI parsing.
- **Integration**: (40%)
    - **Focus**: Supabase RLS policies, API contracts, Job Queue coordination.
    - **Rationale**: This is the heart of the system stability. RLS is the primary security boundary.
- **E2E**: (20%)
    - **Focus**: High-value user journeys (Signup -> MFA -> Publish).
    - **Rationale**: Verifies that disparate systems (Supabase, Modal, R2, Vercel) work together in a realistic environment.

## NFR Testing Approach

- **Security**: 
    - **Auth/Authz**: Verify MFA enrollment enforcement and token expiry.
    - **Data Leak**: Systematic "Cross-Account" queries to verify RLS safety.
    - **OWASP**: Basic injection/XSS validation on manuscript inputs.
- **Performance**:
    - **Latency**: Enforce <2s for Llama suggestions (excluding cold starts).
    - **Concurrency**: Verify usage metering doesn't drift under high parallel load.
- **Reliability**:
    - **Failure Recovery**: Mock 50x errors from Gemini and verify job "Failed" status and user notification.
    - **Graceful Degradation**: Verify editor remains usable even if Suggestion API is offline.
- **Maintainability**:
    - **Coverage**: Target 80% coverage for `src/lib/gemini.ts` and `src/lib/profile.ts`.
    - **Observability**: Verify `audit_logs` are written for every sensitive admin action.

## Risk Assessment Matrix

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation Strategy |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | SEC | RLS policy failure allows cross-account data access | 2 | 3 | 6 | exhaustive cross-user integration tests |
| R-002 | COST | AI Quota bypass due to race condition in usage logging | 2 | 3 | 6 | transactional usage updates + concurrency tests |
| R-003 | REL | Modal/Gemini API outages block manuscript saving | 1 | 3 | 3 | circuit breaker + offline-first local storage |
| R-004 | DATA | TipTap JSON corruption during multi-device sync | 2 | 3 | 6 | conflict resolution unit tests + E2E sync tests |
| R-005 | PERF | Long-form manuscripts cause Gemini timeout (>60s) | 3 | 2 | 6 | chunked processing + async status polling |

## Coverage Matrix

| Requirement | Test Level | Priority | Risk Link | Owner |
| --- | --- | --- | --- | --- |
| Account Isolation (RLS) | Integration | P0 | R-001 | Security Lead |
| Usage Metering / Caps | Unit / Int | P0 | R-002 | Platform |
| AI Suggestion Flow | E2E / API | P1 | R-003 | AI Team |
| Manuscript Export (PDF) | E2E | P1 | - | Quality |
| Audit Log Immutability | SQL / Int | P0 | - | Security |

## Execution Order

### Smoke Tests (<5 min)
- User Login / MFA
- Manuscript Creation
- Basic AI Suggestion (Mocked)

### P0 (Critical Path)
- Cross-account RLS validation
- Usage limit enforcement (Soft/Hard caps)
- Audit log persistence

### P1 (Feature Regression)
- TipTap sync reliability
- Consistency check report generation
- PDF/Markdown export correctness

## Resource Estimates

- **Framework Setup**: 16 hours (Supabase/AI mocks, CI config)
- **Security Integration Tests**: 24 hours (RLS matrix coverage)
- **Feature E2E Suite**: 32 hours (Core journeys)
- **NFR / Perf Baseline**: 8 hours (k6 scripts)
- **Total Estimated Effort**: 80 hours (~10 developer days)


## Quality Gate Criteria

- **P0 tests pass rate**: 100% (Blocker: RLS leaks, Quota bypass, Audit failures).
- **P1 tests pass rate**: ≥95% (Key user journeys: Suggest, Export).
- **Coverage**: ≥80% for high-risk domains (`/lib`, `/actions`).
- **NFR Compliance**: Latency checks within 10% of baseline; Security scan clear of Critical/High.

## Next Steps

1. **Sprint 0 Setup**: Initialize Playwright with Supabase/AI mocks.
2. **Framework Init**: Implement the `createTestUser` and `createTestManuscript` factories.
3. **EPIC 5 Planning**: Run Epic-level test design for "Intelligence Upgrade".
