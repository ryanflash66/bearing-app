/**
 * Story 5.8 — 5.8-COMP-001: Text container has appropriate padding on small screens.
 *
 * Asserts the editor content wrapper uses responsive padding classes.
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManuscriptEditor, { EDITOR_CONTENT_WRAPPER_CLASSNAME } from "@/components/manuscripts/ManuscriptEditor";

// Mock indexedDB to prevent ReferenceError in useAutosave
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
};
Object.defineProperty(window, 'indexedDB', { value: mockIndexedDB });

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock Supabase client
jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

// Mock useDictation hook
jest.mock("@/lib/useDictation", () => ({
  useDictation: jest.fn(() => ({
    isListening: false,
    isSupported: false,
    start: jest.fn(),
    stop: jest.fn(),
    toggle: jest.fn(),
    error: null,
  })),
}));

// Create a mock editor instance
const mockEditorInstance = {
  commands: {
    insertContent: jest.fn(),
    setTextSelection: jest.fn(),
  },
  getHTML: () => "<p></p>",
  getText: () => "",
  getJSON: () => ({ type: "doc", content: [] }),
  state: {
    doc: {
      textBetween: () => "",
    },
    selection: { from: 0, to: 0 },
  },
  view: {
    focus: jest.fn(),
    domAtPos: () => ({ node: document.createElement("div") }),
  },
};

// Mock Tiptap Editor
jest.mock("@/components/editor/TiptapEditor", () => {
  return {
    __esModule: true,
    default: function MockTiptapEditor({ onEditorReady }: any) {
      React.useEffect(() => {
        onEditorReady(mockEditorInstance);
      }, [onEditorReady]);

      return <div data-testid="tiptap-editor" />;
    }
  };
});

// Mock other components
jest.mock("@/components/manuscripts/Binder", () => ({ __esModule: true, default: () => <div data-testid="binder" /> }));
jest.mock("@/components/manuscripts/BetaCommentsPanel", () => ({ __esModule: true, default: () => <div data-testid="comments-panel" /> }));
jest.mock("@/components/manuscripts/BetaShareModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/PublishingSettingsModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/VersionHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/ExportModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/ConflictResolutionModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/AISuggestion", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/ConsistencyReportViewer", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/editor/CommandPalette", () => ({ __esModule: true, default: () => null }));

describe("5.8-COMP-001: Editor text container responsive padding", () => {
  const defaultProps = {
    manuscriptId: "test-id",
    initialContent: "Initial content",
    initialTitle: "Test Title",
    initialUpdatedAt: new Date().toISOString(),
  };

  it("exported constant has responsive padding classes for mobile", () => {
    // Unit test: verify the exported constant contains expected classes
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("mx-auto");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("px-4");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("py-6");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("md:px-8");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("md:py-12");
    expect(EDITOR_CONTENT_WRAPPER_CLASSNAME).toContain("max-w-3xl");
  });

  it("renders editor content wrapper with responsive padding classes applied to DOM", async () => {
    // Integration test: verify classes are actually applied in the rendered component
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    const wrapper = screen.getByTestId("editor-content-wrapper");
    expect(wrapper).toBeInTheDocument();
    
    // Verify all responsive padding classes are applied
    expect(wrapper).toHaveClass("mx-auto");
    expect(wrapper).toHaveClass("px-4");
    expect(wrapper).toHaveClass("py-6");
    expect(wrapper).toHaveClass("md:px-8");
    expect(wrapper).toHaveClass("md:py-12");
    expect(wrapper).toHaveClass("max-w-3xl");
  });
});
