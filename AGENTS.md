# AGENTS: Bearing App (BMAD Required)

This repository MUST follow the BMAD Method (BMM). Every change must be planned and executed through BMAD workflows. Deviating from BMAD is a project‑level failure mode.

## BMAD Non‑Negotiables (Read First)
- BMAD workflows are the source of truth. Do not improvise outside the workflow system.
- Always start with `/bmad:bmm:workflows:workflow-status` or `/bmad:bmm:workflows:workflow-init` when unsure.
- Brownfield rule: run `/bmad:bmm:workflows:document-project` unless docs are confirmed AI‑ready and indexed.
- Use fresh chats per workflow (especially PRD, architecture, create‑story, dev‑story, code‑review, QA).
- Story files are authoritative. Implement tasks/subtasks in order; do not skip or reorder.
- Follow red‑green‑refactor. Tests must pass 100% before marking tasks complete.
- Code review is adversarial; it must find issues (no “looks good”).
- QA gate required before status update (see Story Completion Quality Gate below).
- `project-context.md` is the coding standard bible; never override story requirements with it.
- Always update BMAD status files via workflows (never by hand).
- If a workflow has a checklist, run validation or follow its built‑in validation step.

## BMAD Configuration + Paths (Check before any workflow)
- BMAD config: `_bmad/bmm/config.yaml`
  - Current values (verify in config): `output_folder` = `_bmad-output`, `sprint_artifacts` = `docs`, `project_knowledge` = `docs`.
- Workflow status tracker: `_bmad-output/bmm-workflow-status.yaml`
- Sprint tracking (Phase 4): `docs/sprint-status.yaml`
- Planning artifacts: `_bmad-output/project-planning-artifacts/`
- Implementation artifacts: `_bmad-output/implementation-artifacts/`
- Workflow manifest (canonical workflow IDs): `_bmad/_config/workflow-manifest.csv`
- Agent manifest (canonical agent list): `_bmad/_config/agent-manifest.csv`
- Task manifest: `_bmad/_config/task-manifest.csv`
- Project coding rules: `project-context.md`
- BMAD core workflow runner: `_bmad/core/tasks/workflow.xml` (must follow its rules if executing workflows manually).

## BMAD Agents (load in IDE; file paths are canonical)
- Analyst (Mary): `_bmad/bmm/agents/analyst.md`
  - Phase 1 analysis, research, and brownfield documentation.
- PM (John): `_bmad/bmm/agents/pm.md`
  - Planning and requirements (PRD, epics/stories), workflow routing.
- Architect (Winston): `_bmad/bmm/agents/architect.md`
  - Architecture decisions and implementation readiness gate.
- UX Designer (Sally): `_bmad/bmm/agents/ux-designer.md`
  - UX specification and UI planning.
- SM (Bob): `_bmad/bmm/agents/sm.md`
  - Sprint planning and create‑story workflow.
- DEV (Amelia): `_bmad/bmm/agents/dev.md`
  - dev‑story implementation and code‑review.
- TEA (Murat): `_bmad/bmm/agents/tea.md`
  - Testing architecture and QA quality gates.
- Technical Writer (Paige): `_bmad/bmm/agents/tech-writer.md`
  - Documentation, Mermaid/Excalidraw, project doc tooling.
- Quick Flow Solo Dev (Barry): `_bmad/bmm/agents/quick-flow-solo-dev.md`
  - Quick Flow tech‑spec + quick‑dev.
- BMad Master (core): `_bmad/core/agents/bmad-master.md`
  - Orchestrator for workflows, tasks, party‑mode.

## Opencode Slash Command Pattern (use these for workflows)
- Format: `/bmad:<module>:workflows:<workflow-id>`
  - Modules used here: `bmm` and `core`.
  - Workflow IDs come from `_bmad/_config/workflow-manifest.csv` (do not invent).
- Examples:
  - `/bmad:bmm:workflows:workflow-init`
  - `/bmad:bmm:workflows:create-prd`
  - `/bmad:core:workflows:party-mode`

## Phase 0: Documentation (Brownfield‑First)
Use these before planning if docs are not verified AI‑ready.
- `document-project`
  - Command: `/bmad:bmm:workflows:document-project`
  - Path: `_bmad/bmm/workflows/document-project/workflow.yaml`
  - Agent: Analyst or Technical Writer.
- `generate-project-context`
  - Command: `/bmad:bmm:workflows:generate-project-context`
  - Path: `_bmad/bmm/workflows/generate-project-context/workflow.md`
  - Produces `_bmad-output/project-context.md` (useful if `project-context.md` missing).
- Doc sharding + indexing (for massive docs):
  - Tool: `_bmad/core/tools/shard-doc.xml`
  - Task: `_bmad/core/tasks/index-docs.xml`
  - If supported: `/bmad:core:tasks:index-docs`
  - Use when docs are huge or unindexed.

## Phase 1: Analysis (Optional, Strategic)
- `brainstorming`
  - Command: `/bmad:core:workflows:brainstorming`
  - Path: `_bmad/core/workflows/brainstorming/workflow.md`
  - Agent: Analyst.
- `create-product-brief`
  - Command: `/bmad:bmm:workflows:create-product-brief`
  - Path: `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`
  - Agent: Analyst.
- `research`
  - Command: `/bmad:bmm:workflows:research`
  - Path: `_bmad/bmm/workflows/1-analysis/research/workflow.md`
  - Agent: Analyst.

## Phase 2: Planning (Required)
Entry point + scale‑adaptive routing.
- `workflow-init` (entry point, routes track)
  - Command: `/bmad:bmm:workflows:workflow-init`
  - Path: `_bmad/bmm/workflows/workflow-status/init/workflow.yaml`
  - Agent: PM or Analyst.
- `workflow-status` (status router)
  - Command: `/bmad:bmm:workflows:workflow-status`
  - Path: `_bmad/bmm/workflows/workflow-status/workflow.yaml`
- `create-prd` (BMad Method / Enterprise)
  - Command: `/bmad:bmm:workflows:create-prd`
  - Path: `_bmad/bmm/workflows/2-plan-workflows/prd/workflow.md`
  - Agent: PM.
- `create-ux-design` (optional UX)
  - Command: `/bmad:bmm:workflows:create-ux-design`
  - Path: `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`
  - Agent: UX Designer.
- `create-tech-spec` (Quick Flow)
  - Command: `/bmad:bmm:workflows:create-tech-spec`
  - Path: `_bmad/bmm/workflows/bmad-quick-flow/create-tech-spec/workflow.yaml`
  - Agent: PM or Quick Flow Solo Dev.
- Track rules:
  - Quick Flow: tech‑spec → Phase 4.
  - BMad Method: PRD → Phase 3.
  - Enterprise: PRD → Phase 3 + extended QA/security/devops workflows.

## Phase 3: Solutioning (BMad Method + Enterprise)
- `create-architecture`
  - Command: `/bmad:bmm:workflows:create-architecture`
  - Path: `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`
  - Agent: Architect.
- `create-epics-and-stories` (must run AFTER architecture)
  - Command: `/bmad:bmm:workflows:create-epics-and-stories`
  - Path: `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`
  - Agent: PM.
- `check-implementation-readiness`
  - Command: `/bmad:bmm:workflows:check-implementation-readiness`
  - Path: `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`
  - Agent: Architect.
- Optional test planning in Phase 3:
  - `testarch-test-design` (see Testing section).

## Phase 4: Implementation (All Tracks)
- `sprint-planning`
  - Command: `/bmad:bmm:workflows:sprint-planning`
  - Path: `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml`
  - Agent: SM.
- `sprint-status`
  - Command: `/bmad:bmm:workflows:sprint-status`
  - Path: `_bmad/bmm/workflows/4-implementation/sprint-status/workflow.yaml`
  - Agent: SM or DEV.
- `create-story`
  - Command: `/bmad:bmm:workflows:create-story`
  - Path: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
  - Agent: SM.
- `dev-story`
  - Command: `/bmad:bmm:workflows:dev-story`
  - Path: `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
  - Agent: DEV.
- `code-review`
  - Command: `/bmad:bmm:workflows:code-review`
  - Path: `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml`
  - Agent: DEV (fresh context recommended).
- `retrospective`
  - Command: `/bmad:bmm:workflows:retrospective`
  - Path: `_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml`
  - Agent: SM.
- `correct-course`
  - Command: `/bmad:bmm:workflows:correct-course`
  - Path: `_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml`
  - Agent: PM/Architect/SM (use when scope shifts).

## Quick Flow Track (Standalone Fast Path)
- `create-tech-spec` → `quick-dev` → `code-review` (optional but recommended).
- `quick-dev`
  - Command: `/bmad:bmm:workflows:quick-dev`
  - Path: `_bmad/bmm/workflows/bmad-quick-flow/quick-dev/workflow.yaml`
  - Agent: Quick Flow Solo Dev.
- Quick Flow works without `workflow-init`, but `workflow-init` is still recommended when unsure.

## Testing & QA (TEA, runs in parallel with Phases 2‑4)
Use these to design, validate, and gate quality.
- `testarch-framework`
  - Command: `/bmad:bmm:workflows:testarch-framework`
  - Path: `_bmad/bmm/workflows/testarch/framework/workflow.yaml`
- `testarch-atdd`
  - Command: `/bmad:bmm:workflows:testarch-atdd`
  - Path: `_bmad/bmm/workflows/testarch/atdd/workflow.yaml`
- `testarch-test-design`
  - Command: `/bmad:bmm:workflows:testarch-test-design`
  - Path: `_bmad/bmm/workflows/testarch/test-design/workflow.yaml`
- `testarch-automate`
  - Command: `/bmad:bmm:workflows:testarch-automate`
  - Path: `_bmad/bmm/workflows/testarch/automate/workflow.yaml`
- `testarch-trace`
  - Command: `/bmad:bmm:workflows:testarch-trace`
  - Path: `_bmad/bmm/workflows/testarch/trace/workflow.yaml`
- `testarch-nfr`
  - Command: `/bmad:bmm:workflows:testarch-nfr`
  - Path: `_bmad/bmm/workflows/testarch/nfr-assess/workflow.yaml`
- `testarch-ci`
  - Command: `/bmad:bmm:workflows:testarch-ci`
  - Path: `_bmad/bmm/workflows/testarch/ci/workflow.yaml`
- `testarch-test-review`
  - Command: `/bmad:bmm:workflows:testarch-test-review`
  - Path: `_bmad/bmm/workflows/testarch/test-review/workflow.yaml`
- TEA knowledge base: `_bmad/bmm/testarch/tea-index.csv` and `_bmad/bmm/testarch/knowledge/`.

## Diagramming & Documentation Workflows (Any Phase)
- `create-excalidraw-diagram`
  - Command: `/bmad:bmm:workflows:create-excalidraw-diagram`
  - Path: `_bmad/bmm/workflows/excalidraw-diagrams/create-diagram/workflow.yaml`
- `create-excalidraw-dataflow`
  - Command: `/bmad:bmm:workflows:create-excalidraw-dataflow`
  - Path: `_bmad/bmm/workflows/excalidraw-diagrams/create-dataflow/workflow.yaml`
- `create-excalidraw-flowchart`
  - Command: `/bmad:bmm:workflows:create-excalidraw-flowchart`
  - Path: `_bmad/bmm/workflows/excalidraw-diagrams/create-flowchart/workflow.yaml`
- `create-excalidraw-wireframe`
  - Command: `/bmad:bmm:workflows:create-excalidraw-wireframe`
  - Path: `_bmad/bmm/workflows/excalidraw-diagrams/create-wireframe/workflow.yaml`

## Story Completion Quality Gate (Mandatory)
Reference: `_bmad/bmm/docs/story-completion-workflow.md`
1. DEV runs `dev-story` (tests required; story is source of truth).
2. DEV runs `code-review` in a fresh context (adversarial review; must find issues).
3. DEV fixes issues and re‑runs tests until clean.
4. TEA runs QA workflows (at minimum `testarch-trace` or `testarch-test-review`).
   - Outputs to `_bmad-output/` (traceability matrix + gate decision).
5. PM updates `bmm-workflow-status.yaml` after QA PASS.
6. Ensure `docs/sprint-status.yaml` is updated (code‑review workflow can sync it).

## BMAD Output Files (Typical Locations)
- Workflow status: `_bmad-output/bmm-workflow-status.yaml`
- PRD: `_bmad-output/PRD.md`
- UX spec: `_bmad-output/ux*.md`
- Architecture: `_bmad-output/architecture*.md`
- Epics: `_bmad-output/epic*.md` (or sharded epics folders)
- Sprint tracking: `docs/sprint-status.yaml`
- Story files: `docs/*.md` (see sprint-status for exact paths)
- Implementation artifacts: `_bmad-output/implementation-artifacts/story*.md`
- QA artifacts: `_bmad-output/traceability-matrix-*.md`, `_bmad-output/gate-decision-*.md`

## BMAD Tasks + Tools (Core Execution)
- Workflow engine (mandatory): `_bmad/core/tasks/workflow.xml`
  - Always load this before executing any workflow YAML.
  - Execute steps in order; never skip instructions or template outputs.
- Validate workflow output: `_bmad/core/tasks/validate-workflow.xml`
  - Run when workflow has a checklist or you need QA validation.
  - Generates validation report in document folder.
- Index docs task: `_bmad/core/tasks/index-docs.xml`
  - Generates/updates `index.md` for a directory.
  - Use after sharding large docs or when `docs/index.md` is missing.
- Shard docs tool: `_bmad/core/tools/shard-doc.xml`
  - Splits large markdown into structured shards + index.
  - Use before index task if docs exceed ~500 lines.

## Brownfield Readiness Checklist (Mandatory for existing codebases)
Follow this before any planning if the repo is brownfield (this repo is).
1. **Check for AI‑ready docs**:
   - Look for `docs/index.md` and recent updates (≤30 days).
   - Ensure docs are structured (<500 lines per file) and cover architecture, setup, patterns.
2. **If docs are missing or questionable** → run `document-project`:
   - Command: `/bmad:bmm:workflows:document-project`
   - Path: `_bmad/bmm/workflows/document-project/workflow.yaml`
3. **If docs exist but are huge** → shard + index:
   - Shard: `_bmad/core/tools/shard-doc.xml`
   - Index: `_bmad/core/tasks/index-docs.xml`
   - If supported: `/bmad:core:tasks:index-docs`
4. **Verify outputs**:
   - `docs/index.md` exists and links are valid.
   - Key docs present: `docs/project-overview.md`, `docs/architecture.md`, `docs/source-tree-analysis.md`.
5. **Only then** proceed to `workflow-init` (or `create-tech-spec` for Quick Flow).

## Workflow Cheat‑Sheet (Phase‑Ordered, Canonical IDs + Paths)
Use slash commands with canonical IDs from `_bmad/_config/workflow-manifest.csv`.

### Core Workflows (Any Phase)
- `brainstorming` → `/bmad:core:workflows:brainstorming` → `_bmad/core/workflows/brainstorming/workflow.md`
- `party-mode` → `/bmad:core:workflows:party-mode` → `_bmad/core/workflows/party-mode/workflow.md`

### Phase 0: Documentation
- `document-project` → `/bmad:bmm:workflows:document-project` → `_bmad/bmm/workflows/document-project/workflow.yaml`
- `generate-project-context` → `/bmad:bmm:workflows:generate-project-context` → `_bmad/bmm/workflows/generate-project-context/workflow.md`

### Phase 1: Analysis
- `create-product-brief` → `/bmad:bmm:workflows:create-product-brief` → `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`
- `research` → `/bmad:bmm:workflows:research` → `_bmad/bmm/workflows/1-analysis/research/workflow.md`

### Phase 2: Planning
- `workflow-init` → `/bmad:bmm:workflows:workflow-init` → `_bmad/bmm/workflows/workflow-status/init/workflow.yaml`
- `workflow-status` → `/bmad:bmm:workflows:workflow-status` → `_bmad/bmm/workflows/workflow-status/workflow.yaml`
- `create-prd` → `/bmad:bmm:workflows:create-prd` → `_bmad/bmm/workflows/2-plan-workflows/prd/workflow.md`
- `create-ux-design` → `/bmad:bmm:workflows:create-ux-design` → `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`
- `create-tech-spec` → `/bmad:bmm:workflows:create-tech-spec` → `_bmad/bmm/workflows/bmad-quick-flow/create-tech-spec/workflow.yaml`

### Phase 3: Solutioning
- `create-architecture` → `/bmad:bmm:workflows:create-architecture` → `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`
- `create-epics-and-stories` → `/bmad:bmm:workflows:create-epics-and-stories` → `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`
- `check-implementation-readiness` → `/bmad:bmm:workflows:check-implementation-readiness` → `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`

### Phase 4: Implementation
- `sprint-planning` → `/bmad:bmm:workflows:sprint-planning` → `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml`
- `sprint-status` → `/bmad:bmm:workflows:sprint-status` → `_bmad/bmm/workflows/4-implementation/sprint-status/workflow.yaml`
- `create-story` → `/bmad:bmm:workflows:create-story` → `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- `dev-story` → `/bmad:bmm:workflows:dev-story` → `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- `code-review` → `/bmad:bmm:workflows:code-review` → `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml`
- `retrospective` → `/bmad:bmm:workflows:retrospective` → `_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml`
- `correct-course` → `/bmad:bmm:workflows:correct-course` → `_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml`

### Quick Flow Track (Standalone)
- `create-tech-spec` → `/bmad:bmm:workflows:create-tech-spec` → `_bmad/bmm/workflows/bmad-quick-flow/create-tech-spec/workflow.yaml`
- `quick-dev` → `/bmad:bmm:workflows:quick-dev` → `_bmad/bmm/workflows/bmad-quick-flow/quick-dev/workflow.yaml`
- `code-review` → `/bmad:bmm:workflows:code-review` → `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml`

### Testing & QA (Test Architecture)
- `testarch-framework` → `/bmad:bmm:workflows:testarch-framework` → `_bmad/bmm/workflows/testarch/framework/workflow.yaml`
- `testarch-atdd` → `/bmad:bmm:workflows:testarch-atdd` → `_bmad/bmm/workflows/testarch/atdd/workflow.yaml`
- `testarch-test-design` → `/bmad:bmm:workflows:testarch-test-design` → `_bmad/bmm/workflows/testarch/test-design/workflow.yaml`
- `testarch-automate` → `/bmad:bmm:workflows:testarch-automate` → `_bmad/bmm/workflows/testarch/automate/workflow.yaml`
- `testarch-trace` → `/bmad:bmm:workflows:testarch-trace` → `_bmad/bmm/workflows/testarch/trace/workflow.yaml`
- `testarch-nfr` → `/bmad:bmm:workflows:testarch-nfr` → `_bmad/bmm/workflows/testarch/nfr-assess/workflow.yaml`
- `testarch-ci` → `/bmad:bmm:workflows:testarch-ci` → `_bmad/bmm/workflows/testarch/ci/workflow.yaml`
- `testarch-test-review` → `/bmad:bmm:workflows:testarch-test-review` → `_bmad/bmm/workflows/testarch/test-review/workflow.yaml`

### Diagramming (Excalidraw)
- `create-excalidraw-diagram` → `/bmad:bmm:workflows:create-excalidraw-diagram` → `_bmad/bmm/workflows/excalidraw-diagrams/create-diagram/workflow.yaml`
- `create-excalidraw-dataflow` → `/bmad:bmm:workflows:create-excalidraw-dataflow` → `_bmad/bmm/workflows/excalidraw-diagrams/create-dataflow/workflow.yaml`
- `create-excalidraw-flowchart` → `/bmad:bmm:workflows:create-excalidraw-flowchart` → `_bmad/bmm/workflows/excalidraw-diagrams/create-flowchart/workflow.yaml`
- `create-excalidraw-wireframe` → `/bmad:bmm:workflows:create-excalidraw-wireframe` → `_bmad/bmm/workflows/excalidraw-diagrams/create-wireframe/workflow.yaml`

## Project overview
- Next.js 16 App Router, React 19, TypeScript.
- Supabase (Postgres + RLS), Supabase Auth.
- Tailwind CSS (Modern Parchment design system).
- AI services via OpenRouter (Gemini, Llama).

## Key locations
- `src/app/` App Router pages + API routes.
- `src/components/` feature components (`ui/` for shared).
- `src/lib/` business logic, Supabase clients.
- `src/types/` shared TypeScript types.
- `src/proxy.ts` Next.js middleware (do not add `middleware.ts`).
- `supabase/migrations/` schema source of truth.
- `tests/` unit/integration tests.
- `tests/e2e/` Playwright tests.

## Build, lint, and test
### Core commands
- `npm run dev` start dev server.
- `npm run build` production build.
- `npm run start` run production server locally.
- `npm run lint` ESLint (flat config disabled).
- `npm test` run Jest unit tests.
- `npm run test:watch` Jest watch mode.
- `npm run validate-env` validate environment variables.
- `npm run verify-rls` check RLS policies.

### Single-test commands
- Jest single file: `npm test -- tests/foo.test.ts` or `npx jest tests/foo.test.ts`.
- Jest test name: `npm test -- -t "renders empty state"`.
- Jest path (faster): `npx jest --runTestsByPath tests/foo.test.ts`.
- Playwright single file: `npx playwright test tests/e2e/foo.spec.ts`.
- Playwright by title: `npx playwright test -g "login happy path"`.
- Playwright project: `npx playwright test --project=chromium`.

### Playwright notes
- Config: `playwright.config.ts`.
- E2E tests live in `tests/e2e/` (excluded from Jest).
- Playwright auto-runs `npm run dev` via `webServer` unless on CI.

## Environment + deployment rules (critical)
- "Database is Manual, Code is Automatic."
- If migrations change, run `npx supabase db push` **before** pushing code.
- Verify schema matches production after pushing migrations.
- Production env vars are set in Vercel dashboard.
- Always update `.env.example` when adding new variables.

## TypeScript and imports
- Strict mode is enabled; avoid `any`.
- Use `import type { ... }` for type-only imports.
- Use `@/*` alias for `src/` imports (see `tsconfig.json`).
- Import order: external → `@/` alias → relative.
- Prefer named exports for utilities, default exports for components.
- Keep exports close to usage; avoid circular dependencies.

## Naming + formatting
- Components and files in `src/components` use `PascalCase.tsx`.
- Hooks are named `useX` and live in `src/lib/` or `src/hooks/`.
- Functions/vars use `camelCase`; constants use `UPPER_SNAKE_CASE`.
- No Prettier config found; follow ESLint + existing file style.

## React + Next.js conventions
- Server components by default; add `"use client"` only when needed.
- Use `useRouter` from `next/navigation`, not `next/router`.
- Use `useTransition` for UI state updates that invoke server actions.
- For data that must be dynamic, add `export const dynamic = 'force-dynamic'`.
- If hydration warnings are expected, use `suppressHydrationWarning`.
- Next.js 15+ route params are Promises: always `const { id } = await params;`.

## Components
- Place feature components under `src/components/<feature>/`.
- Shared UI primitives go in `src/components/ui/`.
- Props interface names: `ComponentNameProps`.
- Prefer `export default function ComponentName()` for components.
- Keep components lean; move business logic to `src/lib/`.

## API routes
- Use proper HTTP status codes (401, 400, 500).
- Always authenticate: `const supabase = await createClient();`.
- Retrieve user: `const { data: { user } } = await supabase.auth.getUser()`.
- Return JSON with `NextResponse.json({ ... }, { status })`.
- Document complex logic with comments; include AC references when needed.

## Database + security
- RLS is mandatory; never bypass unless service-role is required.
- Use `getAdminAwareClient` for super-admin operations (bypasses RLS safely).
- Use constraint names when multiple FKs reference the same table.
- Migrations use `YYYYMMDDHHMMSS_description.sql`.
- Supabase ambiguous FKs: specify constraint name (e.g., `users!support_tickets_user_id_fkey`).

## Authentication
- Use Supabase Auth for login/session management.
- Validate roles/permissions via RLS policies.
- JWTs are stored in httpOnly cookies (handled by Supabase).

## Error handling
- Catch and log errors with actionable context.
- Return user-friendly messages; avoid leaking secrets.
- Use consistent error shapes in API responses.
- For large file ops, note memory risks and future optimizations.

## Styling
- Use Tailwind CSS utilities (mobile-first responsive).
- Keep spacing/color consistent with the design system.
- Inline styles only for dynamic values or hydration workarounds.

## Testing guidance
- Unit tests live near `lib/` or in `tests/`.
- Use React Testing Library for components.
- Use Playwright for E2E flows.
- Mirror source structure in test paths when possible.
- Mock Supabase clients in tests.
- Test both success and error paths.

## ESLint rules worth noting
- `@typescript-eslint/no-explicit-any`: warn (still avoid).
- `@typescript-eslint/ban-ts-comment`: warn (explain if used).
- `prefer-const`: warn (prefer const).
- `react-hooks/rules-of-hooks`: warn (follow hook rules).

## Known warnings to ignore
- `inflight@1.0.6` (memory leak) via `ts-jest` / `babel-plugin-istanbul`.
- `glob@7.2.3` (unsupported) via `babel-plugin-istanbul`.
- Do not override these deps; it breaks `npm test`.

## Git + PR workflow
- Keep commits atomic and descriptive.
- Each logical set of commits must have a PR.
- Workflow: branch → commit → push → `gh pr create`.

## Cursor/Copilot rules
- Copilot rules live in `.github/copilot-instructions.md` (included above).
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.

## Agent tips
- Check `docs/architecture-*.md` for design context.
- `project-context.md` contains deployment rules and pitfalls.
- Avoid creating `middleware.ts`; use `src/proxy.ts`.
- If modifying env vars, update `.env.example` in same change.
- Use `npm run validate-env` before running the app locally.

## Quick reference: common commands
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Unit tests: `npm test`
- E2E: `npx playwright test`
- Single E2E test: `npx playwright test tests/e2e/foo.spec.ts`
- Single Jest test: `npx jest --runTestsByPath tests/foo.test.ts`

## Do not do
- Do not commit secrets or `.env*` files.
- Do not push code before database migrations are applied.
- Do not bypass RLS for non-admin operations.

## Questions or ambiguity
- If a change touches DB schema, ask for confirmation before pushing.
- If unsure about RLS, consult `docs/architecture-database.md`.
- If unsure about auth, consult `docs/architecture-auth.md`.
