# Story H.4: Job Resilience (Consistency Checks)

## Description
Ensure that long-running background jobs, specifically **Consistency Checks**, are resilient to server failures, timeouts, or restarts. Currently, if the server crashes while a job is `running`, it remains `running` forever. We need a mechanism to detect and handle these "stale" jobs.

## Acceptance Criteria

### AC H.4.1: Stale Job Detection
- **Given** a consistency check job has been in `running` state for more than 15 minutes
- **When** the recovery process runs
- **Then** the job is identified as "stale".

### AC H.4.2: Job Recovery / Clean Up
- **Given** a stale job
- **When** the recovery process runs
- **Then** the job status is updated to `failed`.
- **And** the `error_message` is set to "Job timed out or system restarted during processing."

### AC H.4.3: Recovery Trigger
- **Given** the application is running
- **When** the admin visits the dashboard OR a scheduled cron runs (for MVP: an API endpoint or script)
- **Then** accurate status is reflected.

## Implementation Tasks

- [x] Create `src/lib/jobs/monitor.ts` to find and fix stale jobs.
- [x] Add `recover_stale_jobs` RPC function (optional, but safer) OR client-side logic in a specific admin route.
    *   *Decision*: Use client-side logic in a Server Action or API Route for simplicity in MVP, or a simple SQL function called via RPC. SQL is better for atomicity. (Implemented SQL function)
- [x] Create an API route (`/api/jobs/cleanup`) or Server Action. (Implemented as Server Action)
- [x] Add a "Job Status" indicator/button in the Admin Dashboard to trigger cleanup manually.
- [x] Update `gemini.ts` to better handle graceful shutdowns if possible (though crashes are ungraceful by definition). (Covered by resilience recovery logic)

## Technical Notes
- **Timeout Threshold**: 15 minutes (Gemini checks shouldn't take this long).
- **Mechanism**:
    ```sql
    update consistency_checks
    set status = 'failed', error_message = 'Stalled: Job timed out', completed_at = now()
    where status = 'running' and updated_at < now() - interval '15 minutes';
    ```
- We need to ensure `updated_at` is being updated during chunk processing (we already added "Analysing chunk X..." updates in H.3/Gemini work, so `updated_at` should change).
