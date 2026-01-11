# Epic: Stabilization & Hardening (Sprint 0.5)

## Overview
A focused cycle to pay down technical debt, harden security boundaries, and establish performance baselines before moving into public-facing publication features.

## Stories & Tasks

### Story H.1: Model & Service Governance
**Description**: Centralize and formalize AI model configuration to avoid hardcoding and drift.
- [x] Implement `src/lib/config/ai-models.ts` for OpenRouter model IDs.
- [x] Add a "Service Status" check for Modal and Gemini APIs.
- [x] Create an environment variable validation script for CI.

### Story H.2: Security & RLS Hardening
**Description**: Systematic verification of data isolation and privileged operations.
- [x] Build a "Cross-Account Leak" test suite for manuscripts, chapters, and audit logs.
- [x] Standardize the "RPC-first" pattern for all membership and account mutations.
- [x] Audit RLS policies for `suggestions` and `consistency_checks`.

### Story H.3: Performance & Latency Baseline
**Description**: Ensure the platform meets NFR-01 (200ms P95 editor interaction).
- [x] Load-test TipTap sync with 100k word manuscript.
- [x] Implement payload compression for autosave if needed.
- [x] Profile Gemini job processing for large manuscripts and optimize chunking.

### Story H.4: Job Resilience & Observability
**Description**: Prevent "Stalled Jobs" and provide clear user feedback.
- [x] Implement a "Cleanup" job for stale "running" consistency checks.
- [x] Add real-time log streaming for long-running AI jobs in the UI.
- [x] Verify Next.js `after()` lifecycle reliability in production.

### Story H.5: Visual & UX Polish Sweep
**Description**: Finalizing the "Modern Parchment" design tokens and transitions.
- [x] Implement "Liquid Glass" transitions for the Binder.
- [x] Refine the "SF Mono" ghost text overlay aesthetics.
- [x] Polish the onboarding "First Run" upload experience.

## Success Criteria
- [x] Zero "Stalled" jobs in 24 hours of simulated load.
- [x] 100% pass rate on Cross-Account security tests.
- [x] P95 Editor Latency < 200ms on 50k word manuscript.
