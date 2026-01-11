# Story H.5: Visual & UX Polish Sweep

## Description
Finalize the "Modern Parchment" design language and improve user experience flow. This story focuses on the aesthetic details that distinguish the application, specifically the transition animations, typography for AI suggestions, and the initial onboarding experience.

## Acceptance Criteria

### AC H.5.1: Binder Aesthetics
- **Given** the Binder is open/toggled
- **When** the user interacts with it
- **Then** it should use "Liquid Glass" transitions (smooth, blur-based backdrops).
- **And** the Consistency Badges should align perfectly with the chosen typography.

### AC H.5.2: AI Ghost Text Polish
- **Given** an AI suggestion is displayed in the editor
- **Then** it should use `SF Mono` (or similar monospace font) to clearly distinguish it from author text.
- **And** it should have a subtle pulsing animation or distinct color per the "Modern Parchment" theme.

### AC H.5.3: Onboarding Upload Experience
- **Given** a new user creates a manuscript
- **When** they use the upload feature
- **Then** the progress indication should be clear.
- **And** the transition from "Empty State" to "Editor" should be smooth (no layout shifts).

## Implementation Tasks
- [x] Refine `Binder.tsx` styles:
    - [x] Add backdrop-blur effects (Liquid Glass).
    - [x] Smooth out open/close animations (Framer Motion or CSS transitions).
- [x] Update `GhostOverlay.tsx` (or equivalent suggestion component):
    - [x] Ensure font family is correct (`font-mono`).
    - [x] Tweak colors for dark/light mode contrast.
- [x] Review `UploadManuscriptModal.tsx` (MagicIngest.tsx):
    - [x] Improve loading state visuals.
    - [x] Validate layout stability during file processing.
- [x] General:
    - [x] Check Consistency Badge alignment in Binder relative to text.

## Technical Notes
- **Design Tokens**: Ensure we are using Tailwind classes consistent with `index.css` / theme.
- **Performance**: Blur effects can be expensive; ensure `backdrop-filter` usage is performant.
