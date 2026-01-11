# Story H.1: Model & Service Governance

## Description
Centralize and formalize AI model configuration to avoid hardcoding and drift. This ensures all AI model identifiers are managed in a single source of truth and that critical external services are monitored for health. This is a critical hardening step to prevent "works on my machine" issues where production uses different model versions or API targets.

## Acceptance Criteria

### AC H.1.1: Centralized Model Config
- **Given** the application needs to make an AI request
- **When** selecting a model ID (e.g., for consistency checks or suggestions)
- **Then** it must import from `src/lib/config/ai-models.ts`
- **And** no hardcoded model strings (e.g., "google/gemini-flash-1.5") exist in feature code.

### AC H.1.2: Service Health Check
- **Given** the application is running
- **When** an admin or monitoring service checks status
- **Then** a utility `checkServiceStatus` reports connectivity to OpenRouter and Modal.

### AC H.1.3: CI Environment Validation
- **Given** a new deployment or build started
- **When** the build pipeline runs
- **Then** a validation script verifies all required API keys (OPENROUTER_API_KEY, etc.) and model variables are present.

## Implementation Tasks

- [x] Create `src/lib/config/ai-models.ts` with explicit model IDs and fallback logic.
- [x] Refactor `src/lib/gemini.ts` to use centralized config.
- [x] Refactor `src/app/api/suggestions/route.ts` (Llama) to use centralized config.
- [x] Implement `src/lib/monitoring/service-status.ts`.
- [x] Create `scripts/validate-env.js` and add to `package.json` scripts.
- [x] Verify functionality by running the consistency check flow.

## Technical Notes
- Current OpenRouter Models:
  - Flash: `google/gemini-flash-1.5`
  - Pro: `google/gemini-pro-1.5`
  - Llama: `meta-llama/llama-3.1-8b-instruct` (or similar, check current usage)
