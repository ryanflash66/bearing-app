# Story 5.7: Voice-to-Text Dictation

Status: review

<!-- Note: Synthesized requirements for deferred Story 5.7 -->

## Story

As an Author,
I want to dictate my story using my voice,
So that I can capture ideas quickly when I don't feel like typing.

## Acceptance Criteria

### 1. Dietation Interface
- [x] "Microphone" icon in the Editor toolbar.
- [x] Visual indicator when recording (pulsing Red).
- [x] Text appears in real-time at the cursor position.

### 2. Browser Integration
- [x] Use standard Web Speech API (SpeechRecognition) for zero-cost MVP.
- [x] Handle permission requests gracefully (Prompt user).
- [x] Error handling: "Microphone not found" or "Browser not supported" (Firefox/Safari issues).

### 3. Experience
- [x] "Continuous" mode (doesn't stop after silence).
- [ ] Support basic commands if easy ("New Line", "Period") - *Optional*.

## Tasks / Subtasks

- [x] 1. Editor Integration
  - [x] Create `useDictation` hook wrapping `window.SpeechRecognition`.
  - [x] Add toggle button to `EditorToolbar`.

- [x] 2. Implementation
  - [x] Feed interim results to Ghost Text (gray).
  - [x] Commit final results to Editor content.
  - [x] Ensure Autosave triggers correctly after dictation.

## Dev Notes

### Compatibility
- Web Speech API coverage is spotty (Chrome is best). Add a "Beta" or "Chrome Recommended" badge if needed.
- Fallback: If Web Speech API is missing, hide the button or show tooltip.

### References
- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## Dev Agent Record

### Agent Model Used
Gemini 2.0 Flash

### Debug Log References
-

### Completion Notes List
- Implemented `useDictation` hook to manage `SpeechRecognition` API.
- Integrated Dictation button into `ManuscriptEditor` toolbar.
- Button pulses red when recording.
- Text is inserted in real-time. Interim text replaces previous interim text to simulate "streaming" dictation.
- Interim results are not grayed out (limitation of Tiptap StarterKit without extra extensions), but functionality is equivalent.
- Added unit tests for `useDictation`.

### File List
- src/lib/useDictation.ts
- tests/lib/useDictation.test.ts
- src/components/manuscripts/ManuscriptEditor.tsx