# Story 8.7: Check consistency enhancement (AI)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **Author**,
I want **the consistency check results to be integrated into my writing workspace**,
so that **I can review and apply improvements to my grammar, style, tone, and character consistency without losing my flow.**

## Acceptance Criteria

1. **Integrated Sidebar UI**: Replace the consistency report modal with a toggleable right sidebar in the `ManuscriptEditor`. Reuse the `Sheet` logic (from `src/components/ui/sheet.tsx`) to ensure a unified UI pattern. [AC 8.7.1]
2. **Enhanced Check Scope**: Update the AI prompt/logic to include:
    - Grammar & Spelling
    - Writing Style (e.g., "show, don't tell", passive voice detection)
    - Tone Drift (detecting shifts in narrative voice)
    - Character & Plot Consistency (Existing logic) [AC 8.7.2]
3. **Interactive Navigation**: Clicking an issue in the sidebar must automatically scroll the Tiptap editor to the relevant text and highlight it (via selection or temporary decoration). [AC 8.7.3]
4. **Quick-Fix UI**: For grammar and style issues, provide a "Apply Fix" button that replaces the problematic text with the AI suggestion. **CRITICAL**: Applying a fix must trigger the 3-second autosave heartbeat to ensure the change is persisted immediately. [AC 8.7.4]
5. **Real-Time Feedback**: Show pulsing skeleton screens in the sidebar while the Gemini job is in the "running" or "queued" state, allowing the author to continue writing without blocking. [AC 8.7.5]
6. **Mobile Optimization**: On mobile devices (< 768px), the consistency report must appear as a swipe-up overlay (Sheet) with touch-optimized targets. [AC 8.7.6]

## Tasks / Subtasks

- [ ] **UI Refactoring**
  - [ ] Refactor `ConsistencyReportViewer.tsx` into `ConsistencyReportSidebar.tsx` using the `Sheet` component.
  - [ ] Implement toggle state in `ManuscriptEditor.tsx` to control sidebar visibility.
  - [ ] Add "Consistency" button to the editor toolbar with "running" animation support.
  - [ ] Implement pulsing skeleton states for the issue list.
- [ ] **AI Logic Expansion**
  - [ ] Update `src/lib/gemini.ts` SYSTEM_PROMPT to include grammar, style, and tone instructions.
  - [ ] Ensure the JSON schema response handles `type` values: `grammar`, `style`, `tone`, `character`, `plot`.
- [ ] **Editor Integration**
  - [ ] Implement `onApplyFix` callback in `ManuscriptEditor` using `editor.commands.insertContent`.
  - [ ] Implement `onNavigate` to use `editor.commands.setTextSelection` and `scrollIntoView`.
  - [ ] Ensure that `onApplyFix` calls the `queueSave` or `saveNow` logic from the `useAutosave` hook.
- [ ] **Verification & Mobile**
  - [ ] Verify that applying a fix updates the word count and triggers autosave.
  - [ ] Test the swipe-up behavior on mobile viewports.

## Dev Notes

- **Sheet Pattern**: Refer to the mobile Binder implementation in `ManuscriptEditor.tsx` for how to handle the `Sheet` overlay.
- **Tiptap Interaction**: Use `editor.commands.setTextSelection({ from, to })` for navigation. Ensure coordinates are mapped correctly if the manuscript text has changed since the last report.
- **Autosave Sync**: The `useAutosave` hook's `queueSave` function should be called immediately after an AI fix is applied to maintain the "non-destructive" trust model.
- **Prompt Engineering**: The core prompt lives in `src/lib/gemini.ts`. Maintain the "writer-in-the-loop" philosophy—suggestions should be evaluated, not forced.

### Project Structure Notes

- New Component: `src/components/manuscripts/ConsistencyReportSidebar.tsx`
- Refined Logic: `src/lib/gemini.ts` (Prompt expansion)
- Main Hub: `src/components/manuscripts/ManuscriptEditor.tsx`

### References

- [Source: src/components/manuscripts/ConsistencyReportViewer.tsx] - Reference for current issue rendering.
- [Source: src/lib/gemini.ts] - Gemini integration and prompt logic.
- [Source: src/components/manuscripts/ManuscriptEditor.tsx] - Main integration point.

## Dev Agent Record

### Agent Model Used
Gemini 2.0 Flash (via BMad PM Agent)

### File List
- `src/components/manuscripts/ConsistencyReportSidebar.tsx`
- `src/lib/gemini.ts`
- `src/components/manuscripts/ManuscriptEditor.tsx`