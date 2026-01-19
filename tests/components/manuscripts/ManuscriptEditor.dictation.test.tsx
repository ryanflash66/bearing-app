/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManuscriptEditor from "@/components/manuscripts/ManuscriptEditor";
import { useDictation } from "@/lib/useDictation";
import React from "react";

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
  useDictation: jest.fn(),
}));

// Create a global mock editor to verify commands
const mockEditorInstance = {
  commands: {
    insertContent: jest.fn(),
    setTextSelection: jest.fn(),
  },
  getHTML: () => "<p></p>",
  getText: () => "",
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

// Mock Tiptap Editor using absolute path
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

// Mock other components using confirmed absolute paths
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

describe("ManuscriptEditor Dictation Integration", () => {
  const defaultProps = {
    manuscriptId: "test-id",
    initialContent: "Initial content",
    initialTitle: "Test Title",
    initialUpdatedAt: new Date().toISOString(),
  };

  const mockDictation = {
    isListening: false,
    isSupported: true,
    start: jest.fn(),
    stop: jest.fn(),
    toggle: jest.fn(),
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDictation as jest.Mock).mockReturnValue(mockDictation);
  });

  it("renders the dictation button when supported", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });
    expect(screen.getByRole("button", { name: /Start Dictation|Dictate/i })).toBeInTheDocument();
  });

  it("calls toggle function when dictation button is clicked", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });
    const button = screen.getByRole("button", { name: /Start Dictation|Dictate/i });
    fireEvent.click(button);
    expect(mockDictation.toggle).toHaveBeenCalled();
  });

  it("shows 'Listening...' text when listening", async () => {
    (useDictation as jest.Mock).mockReturnValue({
      ...mockDictation,
      isListening: true,
    });
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });
    
    // Should find multiple "Listening..." (one in button, one in header)
    expect(screen.getAllByText(/Listening.../i).length).toBeGreaterThanOrEqual(1);
  });

  it("displays interim dictation text in the sticky header", async () => {
    let capturedOnResult: any;
    (useDictation as jest.Mock).mockImplementation(({ onResult }) => {
      capturedOnResult = onResult;
      return { ...mockDictation, isListening: true };
    });

    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    await act(async () => {
      capturedOnResult("Hello world interim", false); // Interim
    });

    expect(screen.getByText("Hello world interim")).toBeInTheDocument();
    expect(screen.getByText("Hello world interim")).toHaveClass("text-slate-600");
  });

  it("inserts final dictation text into the editor and clears interim", async () => {
    let capturedOnResult: any;
    (useDictation as jest.Mock).mockImplementation(({ onResult }) => {
      capturedOnResult = onResult;
      return { ...mockDictation, isListening: true };
    });

    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // First set some interim text
    await act(async () => {
      capturedOnResult("Testing final", false);
    });
    expect(screen.getByText("Testing final")).toBeInTheDocument();

    // Now send final result
    await act(async () => {
      capturedOnResult("Testing final", true);
    });

    // Interim text should be cleared
    expect(screen.queryByText("Testing final")).not.toBeInTheDocument();
    
    // Editor should have received the content
    expect(mockEditorInstance.commands.insertContent).toHaveBeenCalledWith("Testing final ");
  });

  it("displays dictation errors when they occur", async () => {
    (useDictation as jest.Mock).mockReturnValue({
      ...mockDictation,
      error: "permission-denied",
    });
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });
    
    expect(screen.getByText(/Dictation Error: permission-denied/i)).toBeInTheDocument();
  });
});
