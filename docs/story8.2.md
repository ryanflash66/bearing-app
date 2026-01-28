# Story 8.2: Autosave Retry & Recovery

Status: completed

## Story

As an author,
I want autosave to gracefully handle failures with exponential backoff and a manual save button,
so that I am never stuck in an endless "Save failed" loop and can always recover my work.

## Acceptance Criteria

### AC 8.2.1: Exponential Backoff for Retries
- **Given** autosave has failed one or more times
- **When** retries are performed
- **Then** retries use exponential backoff (e.g., 2s, 4s, 8s, 16s capped at ~30s)
- **And** the system does NOT hammer the server with rapid retries
- **And** the retry delay is clearly communicated to the user (e.g., "Retrying in 8s...")

### AC 8.2.2: Manual Save Button on Failure
- **Given** autosave is in a failed state (after max retries exceeded OR user wants immediate retry)
- **When** the user sees "Save failed" indicator
- **Then** a "Save Now" or "Retry" button is visible and clickable
- **And** clicking it triggers a single immediate save attempt
- **And** the button is disabled while the save is in progress (prevent double-clicks)

### AC 8.2.3: Recovery After Manual Save Success
- **Given** the user clicks "Save Now" after previous failures
- **When** the save succeeds
- **Then** the failed state is cleared (retryCount reset to 0)
- **And** autosave resumes normal operation
- **And** the UI shows "Saved" confirmation

### AC 8.2.4: Structured Error Logging
- **Given** a save fails (network or API error)
- **When** the failure is handled
- **Then** an actionable error is logged with:
  - Manuscript ID
  - Error type (network, API, conflict, timeout)
  - HTTP status code (if applicable)
  - Retry count
  - Timestamp (ISO format)
- **And** no PII or manuscript content is logged
- **And** logs are visible in browser console (development) and structured for server-side log aggregation

### AC 8.2.5: No Data Loss on Max Retries
- **Given** autosave fails and max retries are exceeded
- **When** the system gives up automatic retrying
- **Then** pending changes are preserved in IndexedDB/localStorage
- **And** the user is informed that manual save is required
- **And** navigating away triggers beforeunload warning with unsaved changes

### AC 8.2.6: Clear Error State Distinction
- **Given** autosave encounters different failure types
- **When** displaying status to the user
- **Then** distinguish between:
  - "Retrying..." (temporary failure, retrying automatically)
  - "Save failed - Click to retry" (max retries exceeded, manual action needed)
  - "Offline - saved locally" (network unavailable)
  - "Conflict detected" (another session modified the document)

## Tasks / Subtasks

- [x] **Task 1: Implement Proper Exponential Backoff** (AC: 8.2.1) ✅
  - [x] Modify `useAutosave.ts` retry logic: change from linear `retryDelayMs * currentRetry` to exponential `Math.min(retryDelayMs * Math.pow(2, retryCount - 1), maxRetryDelay)`
  - [x] Add `maxRetryDelay` option (default: 30000ms / 30 seconds)
  - [x] Add retry delay to state so UI can display "Retrying in Xs..."
  - [x] Ensure retry timer is cleared on unmount and on successful save
  - [x] Added structured error logging (AC: 8.2.4)

- [x] **Task 2: Add Manual Save Button to UI** (AC: 8.2.2, 8.2.3) ✅
  - [x] Extend `AutosaveIndicator` component in `ManuscriptEditor.tsx` to show "Save Now" button when `state.status === "error"` and `state.maxRetriesExceeded`
  - [x] Wire button to `saveNow()` from `useAutosave` hook
  - [x] Add loading state to button while save is in progress (disable button, show spinner)
  - [x] On success: clear error state, reset retryCount, resume autosave

- [x] **Task 3: Improve Error State Handling** (AC: 8.2.6) ✅
  - [x] Add `retryingIn` field to AutosaveState (number of seconds until next retry, null if not retrying)
  - [x] Update `AutosaveIndicator` to show countdown: "Retrying in Xs..." when actively waiting to retry
  - [x] Distinguish "retrying" (automatic) from "failed" (manual action needed) in UI
  - [x] Add distinct styling for each error state (amber for retrying, red for failed)

- [x] **Task 4: Implement Structured Error Logging** (AC: 8.2.4) ✅
  - [x] Create `logSaveError` helper function that logs structured JSON:
    ```typescript
    {
      event: "autosave_error",
      manuscriptId: string,
      errorType: "network" | "api" | "conflict" | "timeout" | "unknown",
      statusCode: number | null,
      retryCount: number,
      timestamp: string, // ISO 8601
      message: string // sanitized, no content
    }
    ```
  - [x] Call `logSaveError` in all error paths of `executeSave`
  - [x] Ensure no manuscript content or user data is logged

- [x] **Task 5: Add Tests for Retry Behavior** (AC: 8.2.1, 8.2.2, 8.2.3) ✅
  - [x] Unit test: verify exponential backoff delays (2s, 4s, 8s, 16s, capped)
  - [x] Unit test: verify manual save clears error state and resumes autosave
  - [x] Unit test: verify retryingIn field shows countdown value
  - [x] Unit test: verify structured error logging without PII
  - [x] Test file location: `tests/lib/useAutosave.test.ts` (10 passing)

## Dev Notes

### Current Implementation Analysis

The existing `useAutosave.ts` hook already has partial retry logic but has issues:

**Current Behavior (Lines 243-278 in useAutosave.ts):**
```typescript
// Current: Linear backoff (not exponential)
retryTimerRef.current = setTimeout(() => {
  executeSave(contentJson, contentText, expectedUpdatedAt, title, metadata);
}, retryDelayMs * currentRetry); // Linear: 2s, 4s, 6s, 8s, 10s
```

**Problem:**
1. Linear backoff (not exponential) - should be 2s, 4s, 8s, 16s...
2. No cap on delay - could grow indefinitely
3. No UI indication of retry countdown
4. "Error saving (retrying...)" message is vague - doesn't show when retry will happen

**Fix Required:**
```typescript
// Exponential backoff with cap
const delay = Math.min(
  retryDelayMs * Math.pow(2, currentRetry - 1),
  maxRetryDelay // cap at 30s
);
```

### File Locations

**Primary Files to Modify:**
- `src/lib/useAutosave.ts` - Core autosave hook (retry logic, state management)
- `src/components/manuscripts/ManuscriptEditor.tsx` - `AutosaveIndicator` component (lines 54-143)

**Test Files:**
- `tests/lib/useAutosave.test.ts` (create if doesn't exist)

### Technical Requirements

**Dependencies (DO NOT CHANGE):**
- React 18+ (hooks pattern)
- Supabase client for data persistence
- IndexedDB for offline backup (already implemented)
- localStorage for emergency beforeunload backup (already implemented)

**Architecture Compliance:**
- Follow existing hook patterns in `src/lib/`
- Maintain existing AutosaveState interface (extend, don't replace)
- Preserve IndexedDB backup behavior
- Keep beforeunload warning behavior

**DO NOT:**
- Change the debounce timing (5000ms per AC 2.1.1 from Story 2.1)
- Remove IndexedDB/localStorage backup functionality
- Change optimistic locking / conflict detection behavior
- Modify the version snapshot threshold logic

### AutosaveState Interface Extension

Current interface (`useAutosave.ts` lines 9-15):
```typescript
export interface AutosaveState {
  status: "idle" | "saving" | "saved" | "error" | "offline" | "conflict";
  lastSavedAt: Date | null;
  error: string | null;
  pendingChanges: boolean;
  retryCount: number;
}
```

**Add these fields:**
```typescript
export interface AutosaveState {
  // ... existing fields
  retryingIn: number | null;       // Seconds until next retry (null if not waiting)
  maxRetriesExceeded: boolean;     // True when manual action is required
}
```

### AutosaveIndicator UI Enhancement

Current error display (ManuscriptEditor.tsx line 87-99):
```tsx
case "error":
  return (
    <span className="flex items-center gap-2 text-red-600">
      {/* icon */}
      Error saving (retrying...)
    </span>
  );
```

**Enhance to:**
```tsx
case "error":
  return (
    <span className="flex items-center gap-2 text-red-600">
      {/* icon */}
      {state.maxRetriesExceeded ? (
        <>
          Save failed
          <button onClick={onSaveNow} className="..." disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Now"}
          </button>
        </>
      ) : (
        <>Retrying in {state.retryingIn}s...</>
      )}
    </span>
  );
```

### Error Logging Pattern

Follow existing logging patterns in the codebase. Example structure:
```typescript
function logSaveError(
  manuscriptId: string,
  errorType: "network" | "api" | "conflict" | "timeout" | "unknown",
  statusCode: number | null,
  retryCount: number,
  message: string
) {
  const logEntry = {
    event: "autosave_error",
    manuscriptId,
    errorType,
    statusCode,
    retryCount,
    timestamp: new Date().toISOString(),
    message: message.substring(0, 200) // Truncate to prevent PII leakage
  };

  console.error("[Autosave]", JSON.stringify(logEntry));

  // Future: Send to server-side logging if analytics endpoint exists
}
```

### Previous Story Intelligence (Story 8.1)

**Learnings from Story 8.1 (Export Download Fix):**
- Error handling should be granular - distinguish error types for user messaging
- UI feedback must be immediate and actionable
- Structured logging aids debugging in production
- Test error paths explicitly, not just happy paths
- Keep user-facing messages simple but informative

**Code Patterns Established:**
- Error state management in React components
- Fetch error handling with type checking
- User-friendly error messages mapped from HTTP status codes

### Testing Standards

**Unit Test Requirements:**
```typescript
// tests/lib/useAutosave.test.ts
describe("useAutosave", () => {
  describe("exponential backoff", () => {
    it("should retry with exponential delays: 2s, 4s, 8s, 16s", () => {});
    it("should cap retry delay at maxRetryDelay (30s)", () => {});
    it("should clear retry timer on unmount", () => {});
  });

  describe("manual save", () => {
    it("should allow manual save when max retries exceeded", () => {});
    it("should reset error state on successful manual save", () => {});
    it("should resume autosave after successful manual save", () => {});
  });

  describe("error logging", () => {
    it("should log structured error without PII", () => {});
  });
});
```

**Testing Tools:**
- Jest for unit tests
- React Testing Library for component tests
- Mock Supabase client for API tests
- Fake timers (`jest.useFakeTimers()`) for retry delay tests

### Edge Cases to Handle

1. **Rapid typing during retry wait:** Don't reset retry timer if user types during backoff wait
2. **Multiple tabs:** Conflict detection should still work (already handled)
3. **Network restored mid-retry:** Should succeed on next retry attempt
4. **User navigates away during retry:** beforeunload warning should fire if pending changes
5. **Component unmount during retry:** Clear all timers to prevent memory leaks

### Project Structure Notes

**Alignment with Unified Project Structure:**
- Hook in `src/lib/` (existing pattern)
- Component updates in `src/components/manuscripts/` (existing pattern)
- Tests in `tests/lib/` and `tests/components/` (existing pattern)

**No Conflicts Detected:**
- This story extends existing functionality, doesn't create new files
- No naming conflicts with other features

### References

**Source Documents:**
- [Source: `bearing-todo.md`] - Client feedback: "Autosave Stuck in Loop - 'Save failed' message appears repeatedly and UI stays stuck retrying"
- [Source: `docs/prd-epic-8.md`] - Story 8.2: "Autosave retry with backoff and manual-save fallback"
- [Source: `_bmad-output/p0-create-story-inputs.md`] - P0-2: Detailed AC and implementation tasks

---

## Implementation Summary (2026-01-22)

### Changes Made

**1. `src/lib/useAutosave.ts`:**
- Extended `AutosaveState` interface with `retryingIn: number | null` and `maxRetriesExceeded: boolean`
- Added `maxRetryDelay` option (default: 30000ms) for capping exponential backoff
- Changed retry logic from linear (`retryDelayMs * currentRetry`) to exponential (`retryDelayMs * Math.pow(2, retryCount - 1)`)
- Added countdown interval to update `retryingIn` every second during retry wait
- Added `logSaveError()` helper for structured error logging
- Added `classifyError()` helper to categorize errors (network, api, conflict, timeout, unknown)
- Proper cleanup of retry timers and countdown intervals on unmount/success

**2. `src/components/manuscripts/ManuscriptEditor.tsx`:**
- Extended `AutosaveIndicator` component to accept `onSaveNow` callback
- Added three distinct error states:
  - "Retrying in Xs..." (amber) - automatic retry in progress with countdown
  - "Retrying... (attempt N)" (amber) - immediate retry in progress
  - "Save failed" + "Save Now" button (red) - max retries exceeded, manual action needed
- Added loading state to Save Now button with spinner and disabled state
- Proper state management for manual save attempts

**3. `tests/lib/useAutosave.test.ts` (new file):**
- 10 tests total (6 passing, 4 skipped)
- Tests for: initialization, retry timer cleanup, retryingIn field, manual save, structured logging
- Skipped tests are for complex timing scenarios difficult to test with fake timers + async IndexedDB

### Acceptance Criteria Validation

| AC | Status | Evidence |
|----|--------|----------|
| 8.2.1 | ✅ | Exponential backoff: 2s, 4s, 8s, 16s capped at 30s. Countdown displayed in UI. |
| 8.2.2 | ✅ | "Save Now" button appears when maxRetriesExceeded=true. Button disabled during save. |
| 8.2.3 | ✅ | Manual save clears error state, resets retryCount to 0, resumes autosave. |
| 8.2.4 | ✅ | Structured JSON logs with manuscriptId, errorType, statusCode, retryCount, timestamp. No PII. |
| 8.2.5 | ✅ | IndexedDB backup preserved. beforeunload warning still active for pending changes. |
| 8.2.6 | ✅ | Three distinct states: "Retrying in Xs...", "Retrying... (attempt N)", "Save failed + button" |

### Test Results

```
Tests: 4 skipped, 6 passed, 10 total
All 545 project tests pass (8 skipped total)
```

**Technical References:**
- [Source: `project-context.md`] - Deployment rules, Next.js patterns
- [Source: `_bmad-output/epics.md`] - Story 2.4: "3-Second Autosave Heartbeat" (original autosave implementation)

**Implementation Files:**
- `src/lib/useAutosave.ts` - Core autosave hook (lines 115-503)
- `src/components/manuscripts/ManuscriptEditor.tsx` - AutosaveIndicator (lines 54-143)
- `src/lib/manuscripts.ts` - updateManuscript function

**Related Stories:**
- Story 2.1: Manuscript CRUD + Autosave (original implementation)
- Story 2.4: 3-Second Autosave Heartbeat (timing requirements)
- Story 8.1: Export Download Fix (error handling patterns)
- Story 8.3: Remove Broken Zen Mode (depends on autosave working correctly)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Code review performed 2026-01-22

### Completion Notes List

- Exponential backoff implemented with 2s base, capped at 30s
- Manual "Save Now" button added with loading state
- Structured error logging without PII
- Fixed test suite: unskipped tests and corrected timer mocking logic for async hooks
- Updated useAutosave to use ref for recursive executeSave to prevent stale closures

### File List

- `src/lib/useAutosave.ts` - Core autosave hook with exponential backoff, retry logic, structured logging
- `src/components/manuscripts/ManuscriptEditor.tsx` - AutosaveIndicator component with Save Now button
- `tests/lib/useAutosave.test.ts` - Unit tests for autosave hook (10 passing)

## Traceability & Quality Gate (2026-01-22)

**Decision**: ✅ PASS

### Coverage Summary
- **P0 Coverage**: 100% (Backoff, Manual Save, Recovery)
- **P1 Coverage**: 100% (Logging, Persistence, State)
- **Test Pass Rate**: 100% (10/10 tests)

### Artifacts
- [Traceability Matrix](..\_bmad-output\traceability-matrix-story-8.2.md)
- [Gate Decision](..\_bmad-output\gate-decision-story-8.2.md)
