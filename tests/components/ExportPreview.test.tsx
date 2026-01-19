import { render, screen, act } from "@testing-library/react";
import ExportPreview from "../../src/components/export/ExportPreview";
import { ExportProvider, useExport } from "../../src/components/export/ExportContext";
import React, { useEffect } from "react";

// Mock Paged.js
jest.mock("pagedjs", () => {
  return {
    Previewer: jest.fn().mockImplementation(() => ({
      preview: jest.fn().mockResolvedValue({}),
      registerHandlers: jest.fn(),
    })),
  };
});

// Helper component to update context
function ContextUpdater({ viewMode }: { viewMode: "pdf" | "epub" }) {
  const { updateSettings } = useExport();
  useEffect(() => {
    updateSettings({ viewMode });
  }, [viewMode, updateSettings]);
  return null;
}

describe("ExportPreview", () => {
  const mockContent = "<p>Hello World</p>";

  it("renders the preview container in PDF mode", async () => {
    await act(async () => {
      render(
        <ExportProvider>
          <ExportPreview content={mockContent} />
        </ExportProvider>
      );
    });
    expect(screen.getByTestId("export-preview-container")).toBeInTheDocument();
  });

  it("renders the epub frame in epub mode", async () => {
    await act(async () => {
      render(
        <ExportProvider>
          <ContextUpdater viewMode="epub" />
          <ExportPreview content={mockContent} />
        </ExportProvider>
      );
    });
    // Check for epub-specific elements (like the notch placeholder)
    // The notch is a div with rounded-b-xl
    const notch = document.querySelector(".rounded-b-xl");
    expect(notch).toBeInTheDocument();
  });
});
