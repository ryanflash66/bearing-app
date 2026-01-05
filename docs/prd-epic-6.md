# Epic 6: Publication & Beta Distribution

## Overview
Transitions the author from "Production" to "Distribution," providing the tools needed to collect feedback and prepare for professional self-publishing.

## User Stories

### Story 6.1: Beta Reader Access & Commenting
**Description**: Authors can share a private link with Beta Readers who can leave comments but not edit the script.
- **AC**: External users with "BETA" role can see but not change text.
- **AC**: Commenting system linked to specific text selections.

### Story 6.2: WYSIWYG Export Previewer
**Description**: A high-fidelity preview of the manuscript in Kindle (KDP) and PDF Print formats.
- **AC**: Visual representation of "Gutter" and "Bleed" for print.
- **AC**: Table of Contents auto-generation for PDF.

### Story 6.3: Publication Metadata & Blurb Hub
**Description**: A central place to manage ISBNs, Pen Names, Blurbs, and Book Descriptions.
- **AC**: Metadata is automatically injected into Export headers.

### Story 6.4: Public "Coming Soon" Pages
**Description**: Authors can toggle a public landing page to build interest.
- **AC**: Displays blurb, progress bar, and "Subscribe" for updates.

## Technical Goals
- **NFR**: Render 300-page PDF preview in < 5s.
- **SEC**: Beta links must be revocable and token-based.
