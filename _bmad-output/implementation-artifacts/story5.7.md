# Story 5.3: Voice-to-Text Dictation Support

## Description

As an author with RSI, mobility issues, or a preference for dictation, I can use voice input to compose my manuscript. The system integrates with browser-native Speech Recognition APIs and provides voice-activated commands for common actions, ensuring accessibility and flow for all authors.

## Acceptance Criteria (Gherkin Format)

### AC 5.3.1

- **Given:** I am in the manuscript editor
- **When:** I click the "Dictate" button or press a designated shortcut
- **Then:** The browser's Speech Recognition API is activated
- **And:** A visual indicator shows that dictation is active (pulsing microphone icon)

### AC 5.3.2

- **Given:** Dictation is active
- **When:** I speak
- **Then:** My speech is transcribed in real-time and inserted at the cursor position
- **And:** Interim (unconfirmed) text is displayed in a muted style until finalized

### AC 5.3.3

- **Given:** Dictation is active
- **When:** I say a voice command (e.g., "new paragraph", "period", "comma")
- **Then:** The corresponding action is executed (insert paragraph break, insert punctuation)

### AC 5.3.4

- **Given:** The browser does not support Speech Recognition (e.g., Firefox)
- **When:** I try to activate dictation
- **Then:** A clear message explains the limitation and suggests using Chrome or Edge

### AC 5.3.5

- **Given:** Dictation is active
- **When:** I press `Esc` or click the "Stop" button
- **Then:** Dictation stops immediately
- **And:** The visual indicator returns to inactive state

### AC 5.3.6

- **Given:** The Cmd+K Commander is open (Story 5.2)
- **When:** I activate voice mode and speak a command
- **Then:** The command is recognized and executed as if typed

## Dependencies

- **Story 2.1:** Editor exists
- **Story 5.2:** Cmd+K Commander (optional, for voice command integration)
- **Browser Requirement:** Web Speech API (Chrome, Edge, Safari)

## Implementation Tasks

- [ ] Create `useDictation` hook wrapping Web Speech API
- [ ] Add "Dictate" button to editor toolbar with pulsing animation
- [ ] Implement voice command recognition ("new paragraph", "period", "comma", "question mark")
- [ ] Display interim transcription with muted styling
- [ ] Handle browser compatibility detection and fallback messaging
- [ ] (Optional) Integrate with Cmd+K Commander for voice-activated commands
- [ ] Add accessibility announcements for screen readers during dictation

## Cost Estimate

- **AI inference:** $0 (uses browser-native Speech Recognition, not server-side AI)
- **Storage:** Negligible
- **Compute:** $0
- **Total:** $0/month

## Latency SLA

- **Dictation start:** <500ms after activation
- **Transcription update:** Real-time (<200ms lag)

## Success Criteria (QA Gate)

- [ ] All ACs verified on Chrome
- [ ] Graceful fallback on unsupported browsers
- [ ] Voice commands work reliably
- [ ] Accessibility tested with screen readers

## Effort Estimate

- **Dev hours:** 12 hours
- **QA hours:** 4 hours
- **Total:** 16 hours

---

## Status

**backlog**

---

## UX Reference

See `_bmad-output/ux-design-specification.md`:
- Section: "Responsive Design & Accessibility" - "Assistive Technologies"
- "Voice-to-Text: Prioritized Canvas dictation support for authors with RSI or mobility issues."
