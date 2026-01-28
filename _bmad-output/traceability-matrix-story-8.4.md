# Traceability Matrix & Gate Decision - Story 8.4

**Story:** Admin Login / Maintenance Gating  
**Date:** 2026-01-26  
**Evaluator:** Murat (TEA)

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status      |
| --------- | -------------- | ------------- | ---------- | ----------- |
| P0        | 2              | 2             | 100%       | ✅ PASS     |
| P1        | 2              | 2             | 100%       | ✅ PASS     |
| P2        | 0              | 0             | n/a        | n/a         |
| P3        | 0              | 0             | n/a        | n/a         |
| **Total** | **4**          | **4**         | **100%**   | **✅ PASS** |

**Priority rationale (risk-based):**
- **P0**: Admin ability to operate during maintenance (ops-critical) + preventing maintenance-mode false blocks on admin routes (regression prevention).
- **P1**: Redirect correctness + “reliably works” journey validation.

---

### Detailed Mapping

#### AC-8.4.1: Admin sees dashboard when maintenance is off (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `JEST` — `tests/components/layout/DashboardLayout.test.tsx`
    - Verifies **no “System Maintenance” banner** when `initialMaintenanceStatus.enabled=false`.

#### AC-8.4.2: Admins bypass maintenance when it is on (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `JEST` — `tests/utils/middleware.test.ts`
    - “Story 8.4: Admin route bypass tests” covering `/dashboard/admin/*` write-method bypass.
  - `PLAYWRIGHT` — `tests/e2e/admin-maintenance.spec.ts`
    - “maintenance enabled does not block super admin routes” (navigates admin routes while maintenance is ON).

#### AC-8.4.3: Post-login redirect lands on correct admin route (P1)

- **Coverage:** FULL ✅
- **Tests:**
  - `PLAYWRIGHT` — `tests/e2e/admin-maintenance.spec.ts`
    - “login with returnUrl lands on super admin dashboard”
  - `JEST` — `tests/dashboard.test.tsx`
    - Asserts super admin “Dashboard” nav link targets `/dashboard/admin/super`.

#### AC-8.4.4: Reliable admin login → dashboard flow (P1)

- **Coverage:** FULL ✅
- **Tests:**
  - `PLAYWRIGHT` — `tests/e2e/admin-maintenance.spec.ts`
    - Enables maintenance via UI and verifies admin routes render (no maintenance 503/blocking).
  - `PLAYWRIGHT` — `tests/e2e/navigation.spec.ts` (smoke baseline)

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

0 gaps found. ✅

#### High Priority Gaps (PR BLOCKER) ⚠️

0 gaps found. ✅

---

### Quality Assessment

**BLOCKER issues** ❌  
- None detected.

**WARNING issues** ⚠️  
- None outstanding for Story 8.4: removed `networkidle` usage in shared auth fixture.

**INFO issues** ℹ️  
- `tests/e2e/admin-maintenance.spec.ts` runs **serially** because it manipulates global state (singleton super admin + maintenance mode).
- Added E2E-only helper endpoint `src/app/api/internal/e2e/set-role/route.ts`:
  - guarded by `E2E_TEST_MODE=1`
  - uses service-role Supabase client to swap the singleton super admin role for tests, then restore it

---

### Coverage by Test Level

| Test Level | Tests (relevant)                     | Criteria Covered | Notes |
| ---------- | ------------------------------------ | ---------------- | ----- |
| E2E        | `tests/e2e/admin-maintenance.spec.ts` | 3 (full)         | returnUrl + maintenance-on admin routes |
| Component  | `tests/components/layout/DashboardLayout.test.tsx` | 1 (full) | maintenance banner behavior |
| Unit       | `tests/utils/middleware.test.ts`      | 1 (full)         | maintenance bypass logic |
| **Total**  | **3**                                | **4**            | all FULL |

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story  
**Decision Mode:** deterministic

### Evidence Summary

#### Test Execution Results (local)

- **Jest subset:** `tests/utils/middleware.test.ts`, `tests/dashboard.test.tsx`, `tests/components/layout/DashboardLayout.test.tsx` → ✅ PASS (32/32)
- **Playwright:** `tests/e2e/admin-maintenance.spec.ts` (chromium) → ✅ PASS (2/2)

### GATE DECISION: PASS ✅

**Rationale (rule-aligned):**
- ✅ P0 coverage is 100% and passing.
- ✅ P1 coverage is 100% and passing (admin returnUrl + maintenance-on admin navigation validated end-to-end).

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  traceability:
    story_id: "8.4"
    date: "2026-01-26"
    coverage:
      overall: 100%
      p0: 100%
      p1: 100%
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 0
    quality:
      blocker_issues: 0
      warning_issues: 0
  gate_decision:
    decision: "PASS"
    gate_type: "story"
    decision_mode: "deterministic"
    evidence:
      jest_subset_run: "PASS (3 suites, 32 tests)"
      playwright_admin_flow: "PASS (2 tests)"
```

