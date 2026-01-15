# Story 5.5: Cmd+K Commander Pattern

## Description

As an author, I can open a quick-action command palette using `Cmd+K` (Mac) or `Ctrl+K` (Windows) to perform AI-powered transformations and navigate rapidly. This "Commander" provides a keyboard-first interface for power users to invoke actions without leaving the keyboard.

## Acceptance Criteria (Gherkin Format)

### AC 5.5.1

- **Given:** I am editing a manuscript
- **When:** I press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
- **Then:** A floating command palette appears centered on screen with a search input
- **And:** Focus is automatically placed in the search input

### AC 5.5.2

- **Given:** The command palette is open
- **When:** I type a command (e.g., "change tone to dark")
- **Then:** Matching actions are filtered and displayed in real-time
- **And:** Pressing `Enter` on a highlighted action executes it

### AC 5.5.3

- **Given:** I have text selected in the editor
- **When:** I invoke a transformation command (e.g., "make more concise")
- **Then:** The AI processes the selected text and returns a suggestion
- **And:** The suggestion is shown inline for acceptance/rejection (same as AC 2.3.2)

### AC 5.5.4

- **Given:** The command palette is open
- **When:** I press `Esc`
- **Then:** The palette closes and focus returns to the editor at my previous cursor position

### AC 5.5.5

- **Given:** The command palette is open
- **When:** I type a navigation command (e.g., "go to chapter 3")
- **Then:** The editor navigates to the specified chapter without closing the palette
- **And:** The palette shows a "Navigated to Chapter 3" confirmation

## Dependencies

- **Story 2.1:** Editor exists
- **Story 2.3:** AI suggestion infrastructure
- **UX Design Specification:** Defines "Cmd+K Commander" as a novel UX pattern

## Implementation Tasks

- [x] Create `CommandPalette` component using Radix Dialog + Combobox primitives
- [x] Implement fuzzy search for available commands
- [x] Register keyboard shortcut (`Cmd+K` / `Ctrl+K`) globally in the editor
- [x] Add AI transformation commands ("change tone", "expand", "condense", "continue")
- [x] Add navigation commands ("go to chapter X", "find character Y")
- [x] Integrate with existing AI suggestion flow for text transformations
- [x] Add animation for palette open/close (subtle scale + fade)

## Cost Estimate

- **AI inference:** Uses existing Llama suggestion infrastructure
- **Storage:** Negligible (command history optional)
- **Compute:** ~$0
- **Total:** $0/month (shared with Story 2.3 costs)

## Latency SLA

- **Palette open:** <100ms after keypress
- **Search filtering:** <50ms per keystroke
- **AI command execution:** <2s P95 (shared with Story 2.3 SLA)

## Success Criteria (QA Gate)

- [x] All ACs verified
- [x] Keyboard navigation works without mouse
- [x] AI commands integrate with existing suggestion flow
- [x] Accessible via screen readers (ARIA labels)

## Effort Estimate

- **Dev hours:** 16 hours
- **QA hours:** 6 hours
- **Total:** 22 hours

---

## Status

**Done** - Implementation complete 2026-01-12

---

## UX Reference

See `_bmad-output/ux-design-specification.md`:
- Section: "Novel UX Patterns" - "Cmd+K Commander"
- Section: "UX Consistency Patterns" - "Action Hierarchy"

---

## Dev Agent Record

### Implementation Summary

Implemented a full-featured command palette using `cmdk` (Vercel's command menu library) built on Radix UI primitives. The palette provides:

1. **AI Transformation Commands:**
   - Make Concise (shorten text)
   - Expand (add detail)
   - Formal/Casual/Dark/Light Tone changes
   - Continue Writing
   - Fix Grammar
   - Simplify
   - Show Don't Tell

2. **Navigation Commands:**
   - "go to chapter N" - Natural language chapter navigation
   - "find character X" - Navigate to first mention of a character
   - Chapter list appears when typing "chapter"
   - Character list appears when typing "find" or "character"
   - Confirmation message after navigation

3. **Keyboard-First Design:**
   - `Cmd+K` / `Ctrl+K` to open (capture phase for priority)
   - `Esc` to close
   - Arrow keys for navigation
   - `Enter` to select

4. **Accessibility:**
   - VisuallyHidden Dialog Title for screen readers
   - ARIA labels on search input
   - Keyboard navigation hints in footer

### Technical Decisions

- Used `cmdk` library instead of building from scratch - provides battle-tested fuzzy search and keyboard navigation
- Added `@radix-ui/react-dialog` and `@radix-ui/react-visually-hidden` for accessible modal
- Integrated with existing SSE streaming suggestion API
- Chapter extraction uses same regex as Binder component for consistency

### Tests

- 31 unit tests total (17 component + 14 hook tests)
- Component tests: rendering, fuzzy search, command execution, navigation, escape handling, accessibility
- Hook tests: keyboard shortcuts, AI command generation/execution, loading states, onClose callback

---

## File List

### New Files
| File | Description |
|------|-------------|
| `src/components/editor/CommandPalette.tsx` | Main command palette component with Radix Dialog + cmdk |
| `src/lib/useCommandPalette.ts` | Hook for keyboard shortcuts and command generation |
| `tests/components/editor/CommandPalette.test.tsx` | Component tests (17 tests) |
| `tests/lib/useCommandPalette.test.ts` | Hook tests (14 tests) |

### Modified Files
| File | Description |
|------|-------------|
| `src/components/manuscripts/ManuscriptEditor.tsx` | Integrated CommandPalette, added chapter/character extraction, cursor position restoration, AI transform handler |
| `src/app/globals.css` | Added CSS variables for Parchment Design System (--parchment-surface, --parchment-text, etc.) |
| `package.json` | Added dependencies: `cmdk`, `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-visually-hidden` |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Initial implementation complete | Dev Agent |
| 2026-01-12 | Code review fixes: added character navigation, removed placeholder commands, cursor restoration, hook tests, CSS variables | Dev Agent |
