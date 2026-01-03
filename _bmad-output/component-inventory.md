# Component Inventory

## Overview
UI components are organized by domain (Auth, Manuscripts, Admin) with a shared directory for generic UI elements. Components are built with React and likely use Tailwind CSS for styling.

## inventory

### Shared UI (`src/components/ui`)
Basic building blocks.
- `LoadingSkeleton.tsx`: Generic loading state placeholder.
- `ErrorBanner.tsx`: Global error display component.

### Manuscripts (`src/components/manuscripts`)
Core editing experience.
- `ManuscriptEditor.tsx`: Main TipTap-based editor integration. Comprehensive logic.
- `ManuscriptList.tsx`: Dashboard view of manuscripts.
- `VersionHistory.tsx`: Panel to view and restore previous versions.
- `ConflictResolutionModal.tsx`: UI for handling cloud sync conflicts.
- `AISuggestion.tsx`: Inline or side-panel component for AI feedback.

### Authentication (`src/components/auth`)
- Login forms
- Registration flows
- Password reset
- (Inferred from directory structure)

### Admin (`src/components/admin`)
- User management
- Account settings
- (Inferred from directory structure)

### Layout (`src/components/layout`)
- `Sidebar`, `Header`, `AppShell` (likely)

## Design System
The project appears to use a custom set of components rather than a full pre-built library like MUI or AntD, or potentially a lightweight wrapper around Headless UI/Radix UI (indicated by `ui` folder naming convention often seen with shadcn/ui).
