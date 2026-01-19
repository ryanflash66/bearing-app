# Story 5.9: AI Cover Generator

Status: ready-for-dev

<!-- Note: Comprehensive context generated via parallel-planning-workflow -->

## Story

As an Author,
I want to generate visual cover concepts using AI based on my book's metadata,
So that I can visualize my packaging or create a placeholder cover for my coming soon page.

## Acceptance Criteria

### 1. Cover Generator UI
- [ ] New "Cover Lab" tab in Manuscript settings.
- [ ] Input form for: Genre (Dropdown), Mood (Dropdown), Art Style (Cinematic, Illustrated, Minimalist), and Visual Description.
- [ ] Auto-fills Title and Author Name from manuscript metadata.

### 2. Generation Pipeline
- [ ] "Generate" button triggers async job to Modal.com (Stable Diffusion XL or similar).
- [ ] Backend handles prompt engineering (injecting style modifiers).
- [ ] Returns 4 distinct variations.
- [ ] UI shows loading state (skeleton or progress bar).

### 3. Selection & Persistence
- [ ] User can view full-size preview of variations.
- [ ] User can "Select as Book Cover".
- [ ] Selected image is uploaded to Cloudflare R2 permanent storage.
- [ ] Manuscript `cover_url` field is updated.

### 4. Safety & Limitations
- [ ] Rate limiting (e.g., 5 generations per day per user).
- [ ] Safety filter (NSFW check via Modal or keyword list).
- [ ] Error handling for timeout or service failure.

## Tasks / Subtasks

- [ ] 1. Backend: AI Service Integration
  - [ ] Create Modal function for Image Generation (SDXL).
  - [ ] Implement `generateCover(prompt, style)` in NestJS.
  - [ ] Implement R2 upload logic for temporary (grid) and permanent (selected) images.

- [ ] 2. Frontend: Cover Lab UI
  - [ ] Create `CoverGenerator` component.
  - [ ] Implement form state and validation.
  - [ ] Build `ImageGrid` for displaying results.
  - [ ] Implement "Select" action to save to DB.

- [ ] 3. Prompt Engineering logic
  - [ ] Create utility to construct optimized SDXL prompts from user inputs (Style + Genre + Description).
  - [ ] Add negative prompts for quality assurance.

- [ ] 4. Integration Tests
  - [ ] Test the full flow (Mock Modal -> Receive Images -> Save).
  - [ ] Verify R2 upload success.

## Dev Notes

### Architecture
- **Modal.com**: Use the existing Modal integration pattern for Llama/Gemini, but add a new function for SDXL.
- **R2 Storage**: Generated images should probably go to a `tmp/` folder first, then move to `covers/` only when selected to save space.
- **Rate Limiting**: Critical to control costs.

### References
- [PRD 13 AI System](docs/PRD.md#62-ai-functions) -> "AI cover generator"
- [Epic 5](docs/epics.md)

## Dev Agent Record

### Agent Model Used
Antigravity (Parallel Planner)

### Debug Log References
-

### Completion Notes List
-

### File List
-
