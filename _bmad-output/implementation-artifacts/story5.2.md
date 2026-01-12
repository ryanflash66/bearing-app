# Story 5.2: Cmd+K Commander Pattern

## Description

As an author, I can open a quick-action command palette using `Cmd+K` (Mac) or `Ctrl+K` (Windows) to perform AI-powered transformations and navigate rapidly. This "Commander" provides a keyboard-first interface for power users to invoke actions without leaving the keyboard.

## Acceptance Criteria (Gherkin Format)

### AC 5.2.1

- **Given:** I am editing a manuscript
- **When:** I press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
- **Then:** A floating command palette appears centered on screen with a search input
- **And:** Focus is automatically placed in the search input

### AC 5.2.2

- **Given:** The command palette is open
- **When:** I type a command (e.g., "change tone to dark")
- **Then:** Matching actions are filtered and displayed in real-time
- **And:** Pressing `Enter` on a highlighted action executes it

### AC 5.2.3

- **Given:** I have text selected in the editor
- **When:** I invoke a transformation command (e.g., "make more concise")
- **Then:** The AI processes the selected text and returns a suggestion
- **And:** The suggestion is shown inline for acceptance/rejection (same as AC 2.3.2)

### AC 5.2.4

- **Given:** The command palette is open
- **When:** I press `Esc`
- **Then:** The palette closes and focus returns to the editor at my previous cursor position

### AC 5.2.5

- **Given:** The command palette is open
- **When:** I type a navigation command (e.g., "go to chapter 3")
- **Then:** The editor navigates to the specified chapter without closing the palette
- **And:** The palette shows a "Navigated to Chapter 3" confirmation

## Dependencies

- **Story 2.1:** Editor exists
- **Story 2.3:** AI suggestion infrastructure
- **UX Design Specification:** Defines "Cmd+K Commander" as a novel UX pattern

## Implementation Tasks

- [ ] Create `CommandPalette` component using Radix Dialog + Combobox primitives
- [ ] Implement fuzzy search for available commands
- [ ] Register keyboard shortcut (`Cmd+K` / `Ctrl+K`) globally in the editor
- [ ] Add AI transformation commands ("change tone", "expand", "condense", "continue")
- [ ] Add navigation commands ("go to chapter X", "find character Y")
- [ ] Integrate with existing AI suggestion flow for text transformations
- [ ] Add animation for palette open/close (subtle scale + fade)

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

- [ ] All ACs verified
- [ ] Keyboard navigation works without mouse
- [ ] AI commands integrate with existing suggestion flow
- [ ] Accessible via screen readers (ARIA labels)

## Effort Estimate

- **Dev hours:** 16 hours
- **QA hours:** 6 hours
- **Total:** 22 hours

---

## Status

**ready-for-dev**

---

## UX Reference

See `_bmad-output/ux-design-specification.md`:
- Section: "Novel UX Patterns" - "Cmd+K Commander"
- Section: "UX Consistency Patterns" - "Action Hierarchy"
