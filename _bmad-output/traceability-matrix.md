# Traceability Matrix & Gate Decision - Story 8.20

**Story:** Sync & State (Manuscript ↔ Service)
**Date:** 2026-01-28
**Evaluator:** Ryanf (TEA validation by Murat)

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status       |
| --------- | -------------- | ------------- | ---------- | ------------ |
| P0        | 2              | 0             | 0%         | ❌ FAIL       |
| P1        | 3              | 0             | 0%         | ❌ FAIL       |
| P2        | 2              | 0             | 0%         | ⚠️ WARN       |
| P3        | 0              | 0             | N/A        | N/A          |
| **Total** | **7**          | **0**         | **0%**     | **❌ FAIL**   |

**Legend:**

- ✅ PASS - Coverage meets quality gate threshold
- ⚠️ WARN - Coverage below threshold but not critical
- ❌ FAIL - Coverage below minimum threshold (blocker)

---

### Detailed Mapping

#### AC-8.20.1: Active Request Detection (P1)

- **Coverage:** INTEGRATION-ONLY ⚠️
- **Tests:**
  - `Service Status API returns active request and isLocked=true` - tests/api/service-status.test.ts
    - **Given:** Authenticated owner user
    - **When:** GET `/api/manuscripts/[id]/service-status`
    - **Then:** `activeRequest` returned and `isLocked=true`
  - `Service Status API returns null and isLocked=false when no active request` - tests/api/service-status.test.ts
    - **Given:** Authenticated owner user with no active request
    - **When:** GET `/api/manuscripts/[id]/service-status`
    - **Then:** `activeRequest=null`, `isLocked=false`
  - `getActiveServiceRequest returns active/null/error` - tests/lib/service-requests.test.ts
    - **Given:** Active status exists or not
    - **When:** `getActiveServiceRequest` called
    - **Then:** Returns request or null (errors handled)

- **Gaps:**
  - Missing editor-load integration/E2E test to verify the editor actually checks and propagates the lock state

- **Recommendation:** Add a component or E2E test that opens the manuscript editor and asserts the lock state derives from the service status endpoint.

---

#### AC-8.20.2: Service Status Banner (P2)

- **Coverage:** NONE ❌
- **Tests:** None

- **Gaps:**
  - Banner content (service type + status) not validated
  - Cancel button visibility for `pending` only not validated
  - View Order link path/fallback not validated

- **Recommendation:** Add component tests for `ServiceStatusBanner` to verify rendering, button visibility by status, and link fallback behavior.

---

#### AC-8.20.3: Edit Locking (P0)

- **Coverage:** NONE ❌
- **Tests:** None

- **Gaps:**
  - TipTap editor `editable=false` when locked not validated
  - Autosave and manual save triggers disabled not validated
  - Title field disabled + lock reason text not validated

- **Recommendation:** Add component/E2E tests to assert read-only state, autosave suppression, and lock indicator text for active requests.

---

#### AC-8.20.4: Cancel Request Flow (P1)

- **Coverage:** PARTIAL ⚠️
- **Tests:**
  - `Cancel Request API returns 200 on pending request` - tests/api/cancel-request.test.ts
    - **Given:** Owner + pending request
    - **When:** POST `/api/service-requests/[id]/cancel`
    - **Then:** Status → `cancelled`
  - `Cancel Request API error handling (401/403/400/404/500)` - tests/api/cancel-request.test.ts
    - **Given:** Unauthorized or invalid status
    - **When:** POST cancel
    - **Then:** Appropriate error codes returned
  - `cancelServiceRequest enforces pending-only` - tests/lib/service-requests.test.ts
    - **Given:** Request not pending
    - **When:** `cancelServiceRequest`
    - **Then:** Error returned

- **Gaps:**
  - Confirmation modal UX not validated
  - Editor unlock after cancel not validated
  - User-facing error messaging not validated

- **Recommendation:** Add a component/E2E test for the banner cancel flow, including confirm modal and immediate unlock behavior.

---

#### AC-8.20.5: Duplicate Prevention (P0)

- **Coverage:** PARTIAL ⚠️
- **Tests:**
  - `Service request API returns 409 when active request exists` - tests/api/api-services.test.ts
    - **Given:** Existing active request
    - **When:** POST `/api/services/request`
    - **Then:** 409 with `DUPLICATE_ACTIVE_REQUEST`
  - `Service request API returns 409 on unique index violation` - tests/api/api-services.test.ts
    - **Given:** Insert throws unique constraint error
    - **When:** POST `/api/services/request`
    - **Then:** 409 with `DUPLICATE_ACTIVE_REQUEST`

- **Gaps:**
  - No integration test against real DB unique index
  - No UI validation for duplicate error message

- **Recommendation:** Add integration test against Supabase (if feasible) to validate partial unique index; add UI test to verify error display.

---

#### AC-8.20.6: Status Sync (P1)

- **Coverage:** NONE ❌
- **Tests:** None

- **Gaps:**
  - No test validating unlock when status becomes `completed`, `cancelled`, or `failed`
  - No test validating refresh-based state sync

- **Recommendation:** Add E2E test that updates status then reloads editor to confirm lock removal.

---

#### AC-8.20.7: Manuscript List Integration (P2)

- **Coverage:** NONE ❌
- **Tests:** None

- **Gaps:**
  - No test verifying badge display for active requests
  - No test validating list uses batch active-request mapping

- **Recommendation:** Add component test for ManuscriptList with active request map to verify badge behavior.

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

2 gaps found. **Do not release until resolved.**

1. **AC-8.20.3: Edit Locking** (P0)
   - Current Coverage: NONE
   - Missing Tests: Editor read-only, autosave suppression, title disable, lock reason text
   - Recommend: `8.20-E2E-001` (E2E) or component test for ManuscriptEditor lock state
   - Impact: Users may edit manuscripts during active service processing (data integrity risk)

2. **AC-8.20.5: Duplicate Prevention** (P0)
   - Current Coverage: PARTIAL
   - Missing Tests: DB-level validation of partial unique index and RLS interaction
   - Recommend: `8.20-INT-001` (integration) or DB migration validation test
   - Impact: Multiple active requests could be created for one manuscript

---

#### High Priority Gaps (PR BLOCKER) ⚠️

3 gaps found. **Address before PR merge.**

1. **AC-8.20.1: Active Request Detection** (P1)
   - Current Coverage: INTEGRATION-ONLY
   - Missing Tests: Editor load path validating lock state
   - Recommend: `8.20-E2E-002` (E2E) or component test for ManuscriptEditorWrapper
   - Impact: Editor may not reflect active request reliably

2. **AC-8.20.4: Cancel Request Flow** (P1)
   - Current Coverage: PARTIAL
   - Missing Tests: Confirmation modal UX, unlock after cancel
   - Recommend: `8.20-E2E-003` (E2E) or component test for ServiceStatusBanner
   - Impact: Users may be unable to cancel or unlock reliably

3. **AC-8.20.6: Status Sync** (P1)
   - Current Coverage: NONE
   - Missing Tests: Unlock after status change on refresh
   - Recommend: `8.20-E2E-004` (E2E)
   - Impact: Users may remain locked after completion/cancel

---

#### Medium Priority Gaps (Nightly) ⚠️

2 gaps found. **Address in nightly test improvements.**

1. **AC-8.20.2: Service Status Banner** (P2)
   - Current Coverage: NONE
   - Recommend: `8.20-COMP-001` (component)

2. **AC-8.20.7: Manuscript List Integration** (P2)
   - Current Coverage: NONE
   - Recommend: `8.20-COMP-002` (component)

---

#### Low Priority Gaps (Optional) ℹ️

0 gaps found.

---

### Quality Assessment

#### Tests with Issues

**BLOCKER Issues** ❌

- None found

**WARNING Issues** ⚠️

- None found

**INFO Issues** ℹ️

- Current tests are unit/API-mock heavy; no UI/E2E validation exists for editor lock/banner behavior

---

#### Tests Passing Quality Gates

**4/4 test files (100%) meet quality criteria** ✅

---

### Duplicate Coverage Analysis

#### Acceptable Overlap (Defense in Depth)

- AC-8.20.1 and AC-8.20.4 are covered at unit + API levels (logic + endpoint)

#### Unacceptable Duplication ⚠️

- None detected

---

### Coverage by Test Level

| Test Level | Tests (files) | Criteria Covered | Coverage % |
| ---------- | ------------- | ---------------- | ---------- |
| E2E        | 0             | 0                | 0%         |
| API        | 3             | 3                | 43%        |
| Component  | 0             | 0                | 0%         |
| Unit       | 1             | 2                | 29%        |
| **Total**  | **4**         | **3**            | **43%**    |

---

### Traceability Recommendations

#### Immediate Actions (Before PR Merge)

1. **Add edit-lock validation** - E2E or component test asserting TipTap `editable=false`, autosave disabled, title disabled.
2. **Add cancel flow validation** - Test confirmation modal + unlock after successful cancel.
3. **Add status sync validation** - Test unlock after status moves to completed/cancelled/failed on refresh.

#### Short-term Actions (This Sprint)

1. **Banner rendering coverage** - Component test for ServiceStatusBanner content and button visibility.
2. **Manuscript list badge coverage** - Component test for ManuscriptList badge on active requests.

#### Long-term Actions (Backlog)

1. **DB constraint integration** - Validate partial unique index and RLS cancel policy with real Supabase integration test.

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

---

### Evidence Summary

#### Test Execution Results

- **Total Tests**: N/A (no test execution results provided)
- **Passed**: N/A
- **Failed**: N/A
- **Skipped**: N/A
- **Duration**: N/A

**Overall Pass Rate**: N/A

**Test Results Source**: not provided

---

#### Coverage Summary (from Phase 1)

**Requirements Coverage (FULL only):**

- **P0 Acceptance Criteria**: 0/2 covered (0%) ❌
- **P1 Acceptance Criteria**: 0/3 covered (0%) ❌
- **P2 Acceptance Criteria**: 0/2 covered (0%) ⚠️
- **Overall Coverage**: 0%

**Coverage Source**: _bmad-output/traceability-matrix.md

---

#### Non-Functional Requirements (NFRs)

**Security**: NOT_ASSESSED

- Security Issues: N/A

**Performance**: NOT_ASSESSED

**Reliability**: NOT_ASSESSED

**Maintainability**: NOT_ASSESSED

**NFR Source**: not provided

---

#### Flakiness Validation

**Burn-in Results**: not available

---

### GATE DECISION: SKIPPED (test execution results not provided)

**Coverage-only risk indicator:** FAIL (P0 coverage < 100%)

---

### Rationale

Gate decision is **not evaluated** because no test execution evidence was provided. Based on coverage alone, P0 criteria lack FULL coverage, which is a blocker.

---

### Gate Recommendations

1. **Run relevant test suites** (unit + API + any E2E) and provide results for deterministic gate decision.
2. **Close P0 coverage gaps** (edit locking, duplicate prevention integration validation) before gate reconsideration.

---

### Next Steps

**Immediate Actions** (next 24-48 hours):

1. Add lock/cancel/status-sync tests (component or E2E).
2. Run unit + API tests for Story 8.20 and capture results.
3. Re-run trace workflow with test results attached.

**Follow-up Actions** (next sprint):

1. Add banner + manuscript list badge component tests.
2. Add DB constraint integration validation.

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  # Phase 1: Traceability
  traceability:
    story_id: "8.20"
    date: "2026-01-28"
    coverage:
      overall: 0%
      p0: 0%
      p1: 0%
      p2: 0%
      p3: N/A
    gaps:
      critical: 2
      high: 3
      medium: 2
      low: 0
    quality:
      passing_tests: 4
      total_tests: 4
      blocker_issues: 0
      warning_issues: 0
    recommendations:
      - "Add edit-lock validation (E2E or component)"
      - "Add cancel-flow + status-sync validation"

  # Phase 2: Gate Decision
  gate_decision:
    decision: "SKIPPED"
    gate_type: "story"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 0%
      p0_pass_rate: N/A
      p1_coverage: 0%
      p1_pass_rate: N/A
      overall_pass_rate: N/A
      overall_coverage: 0%
      security_issues: N/A
      critical_nfrs_fail: N/A
      flaky_tests: N/A
    thresholds:
      min_p0_coverage: 100
      min_p0_pass_rate: 100
      min_p1_coverage: 90
      min_p1_pass_rate: 95
      min_overall_pass_rate: 90
      min_coverage: 80
    evidence:
      test_results: "not provided"
      traceability: "_bmad-output/traceability-matrix.md"
      nfr_assessment: "not provided"
      code_coverage: "not provided"
    next_steps: "Add missing tests, run suites, re-evaluate gate"
```

---

## Related Artifacts

- **Story File:** docs/8-20-sync-manuscript-service.md
- **Test Design:** _bmad-output/test-design-system.md
- **Test Results:** not provided
- **NFR Assessment:** not provided
- **Test Files:** tests/lib/service-requests.test.ts, tests/api/service-status.test.ts, tests/api/cancel-request.test.ts, tests/api/api-services.test.ts

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 0%
- P0 Coverage: 0% ❌
- P1 Coverage: 0% ❌
- Critical Gaps: 2
- High Priority Gaps: 3

**Phase 2 - Gate Decision:**

- **Decision**: SKIPPED (missing test results)
- **P0 Evaluation**: ❌ ONE OR MORE FAILED (coverage)
- **P1 Evaluation**: ❌ FAILED

**Overall Status:** ❌ FAIL (coverage-only indicator)

**Next Steps:**

- Add P0/P1 tests, run suites, and re-run traceability workflow

---

<!-- Powered by BMAD-CORE™ -->