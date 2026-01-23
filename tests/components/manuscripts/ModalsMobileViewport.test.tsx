/**
 * Story 5.8 — 5.8-COMP-002: Modals (Export, Settings) fit within mobile viewports.
 *
 * Asserts Export and Publishing modals use responsive layout (w-full, max-w-*,
 * overflow) so they fit and scroll on small screens.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import ExportModal from "@/components/manuscripts/ExportModal";
import PublishingSettingsModal from "@/components/manuscripts/PublishingSettingsModal";

jest.mock("@/components/export/ExportPreview", () => ({
  __esModule: true,
  default: () => <div data-testid="export-preview-mock">Preview</div>,
}));

describe("5.8-COMP-002: Modals fit within mobile viewports", () => {
  it("ExportModal container has responsive width and overflow", () => {
    render(
      <ExportModal
        isOpen
        onClose={() => {}}
        manuscriptId="test-id"
        title="Test"
        content="<p>Content</p>"
      />
    );

    const heading = screen.getByRole("heading", { name: /export manuscript/i });
    expect(heading).toBeInTheDocument();

    const outer = heading.closest("[class*='fixed'][class*='inset-0']");
    expect(outer).toBeInTheDocument();

    const panel = outer?.querySelector("[class*='bg-white'][class*='rounded-xl']");
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass("w-full");
    expect(panel).toHaveClass("overflow-hidden");
  });

  it("PublishingSettingsModal container has responsive width and overflow", () => {
    render(
      <PublishingSettingsModal
        isOpen
        onClose={() => {}}
        initialMetadata={{}}
        onSave={() => {}}
      />
    );

    const heading = screen.getByRole("heading", { name: /publishing details/i });
    expect(heading).toBeInTheDocument();

    const outer = heading.closest("[class*='fixed'][class*='inset-0']");
    expect(outer).toBeInTheDocument();

    const panel = outer?.querySelector("[class*='w-full'][class*='overflow-hidden']");
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass("w-full");
    expect(panel).toHaveClass("overflow-hidden");
  });
});
