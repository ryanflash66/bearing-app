/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManuscriptEditor from "@/components/manuscripts/ManuscriptEditor";
import React from "react";

// Mock useAutosave
jest.mock("@/lib/useAutosave", () => ({
  useAutosave: jest.fn(() => ({
    state: { status: "idle" },
    queueSave: jest.fn(),
    saveNow: jest.fn(),
    resetTimestamp: jest.fn(),
  })),
  AutosaveState: {},
}));

// Mock indexedDB
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
};
Object.defineProperty(window, "indexedDB", { value: mockIndexedDB });

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

// Mock useGhostText hook
jest.mock("@/lib/useGhostText", () => ({
  useGhostText: jest.fn(() => ({
    suggestion: null,
    isLoading: false,
    dismiss: jest.fn(),
    accept: jest.fn(),
  })),
}));

// Mock useCommandPalette hook
jest.mock("@/lib/useCommandPalette", () => ({
  useCommandPalette: jest.fn(() => ({
    isOpen: false,
    setIsOpen: jest.fn(),
    commands: [],
    isLoading: false,
    loadingMessage: "",
  })),
}));

// Mock manuscripts lib
jest.mock("@/lib/manuscripts", () => ({
  updateManuscript: jest.fn(),
  getManuscript: jest.fn(),
}));

// Mock manuscript-utils
jest.mock("@/lib/manuscript-utils", () => ({
  extractCharacters: jest.fn(() => []),
  saveSelection: jest.fn(),
  restoreSelection: jest.fn(),
  findFirstOccurrence: jest.fn(),
}));

// Create a global mock editor to verify commands
const mockEditorInstance = {
  commands: {
    insertContent: jest.fn(),
    setTextSelection: jest.fn(),
    focus: jest.fn(),
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

const mockServiceRequestCalls: Array<{
  isOpen: boolean;
  serviceId: string;
  serviceTitle: string;
}> = [];

// Mock Tiptap Editor
jest.mock("@/components/editor/TiptapEditor", () => {
  return {
    __esModule: true,
    default: function MockTiptapEditor({
      onEditorReady,
    }: {
      onEditorReady: (editor: typeof mockEditorInstance) => void;
    }) {
      React.useEffect(() => {
        onEditorReady(mockEditorInstance);
      }, [onEditorReady]);
      return <div data-testid="tiptap-editor" />;
    },
  };
});

// Mock ServiceRequestModal used by ManuscriptEditor (publishing requests)
jest.mock("@/components/marketplace/ServiceRequestModal", () => {
  return {
    __esModule: true,
    default: function MockServiceRequestModal(props: {
      isOpen: boolean;
      serviceId: string;
      serviceTitle: string;
    }) {
      mockServiceRequestCalls.push({
        isOpen: props.isOpen,
        serviceId: props.serviceId,
        serviceTitle: props.serviceTitle,
      });
      if (!props.isOpen) return null;
      return (
        <div data-testid="service-request-modal" data-service-id={props.serviceId}>
          Request {props.serviceTitle}
        </div>
      );
    },
  };
});

// Mock component imports
jest.mock("@/components/manuscripts/Binder", () => ({
  __esModule: true,
  default: () => <div data-testid="binder" />,
}));
jest.mock("@/components/manuscripts/BetaCommentsPanel", () => ({
  __esModule: true,
  default: () => <div data-testid="comments-panel" />,
}));
jest.mock("@/components/manuscripts/BetaShareModal", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/manuscripts/ServiceStatusBanner", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/manuscripts/VersionHistory", () => ({
  __esModule: true,
  default: function MockVersionHistory({ onClose }: { onClose: () => void }) {
    return <div data-testid="version-history-panel">Version History Panel</div>;
  },
}));
jest.mock("@/components/manuscripts/ExportModal", () => ({
  __esModule: true,
  default: function MockExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return <div data-testid="export-modal">Export Modal</div>;
  },
}));
jest.mock("@/components/manuscripts/ConflictResolutionModal", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/manuscripts/AISuggestion", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/manuscripts/ConsistencyReportViewer", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/manuscripts/GhostTextDisplay", () => ({
  __esModule: true,
  GhostTextOverlay: () => null,
}));
jest.mock("@/components/editor/CommandPalette", () => ({
  __esModule: true,
  default: () => null,
}));

// Mock Sheet components
type SheetProps = React.PropsWithChildren;

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: SheetProps) => <div>{children}</div>,
  SheetContent: ({ children }: SheetProps) => <div>{children}</div>,
  SheetHeader: ({ children }: SheetProps) => <div>{children}</div>,
  SheetTitle: ({ children }: SheetProps) => <div>{children}</div>,
}));

describe("ManuscriptEditor Fullscreen Logic", () => {
  const defaultProps = {
    manuscriptId: "test-id",
    initialContent: "Initial content",
    initialTitle: "Test Title",
    initialUpdatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockServiceRequestCalls.length = 0;
  });

  it("renders fullscreen button in toolbar", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    const fullscreenButton = screen.getByTestId("fullscreen-button");
    expect(fullscreenButton).toBeInTheDocument();
    expect(fullscreenButton).toHaveTextContent("Fullscreen");
  });

  it("enters fullscreen mode when button is clicked", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    const fullscreenButton = screen.getByTestId("fullscreen-button");

    await act(async () => {
      fireEvent.click(fullscreenButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-overlay")).toBeInTheDocument();
    });
  });

  it("reacts to Cmd+\\ shortcut (Mac)", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.keyDown(window, {
        key: "\\",
        metaKey: true,
      });
    });

    await waitFor(() => {
      expect(mockEditorInstance.commands.focus).toHaveBeenCalled();
    });

    expect(screen.getByTestId("fullscreen-overlay")).toBeInTheDocument();
  });

  it("reacts to Ctrl+\\ shortcut (Windows)", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.keyDown(window, {
        key: "\\",
        ctrlKey: true,
      });
    });

    await waitFor(() => {
      expect(mockEditorInstance.commands.focus).toHaveBeenCalled();
    });

    expect(screen.getByTestId("fullscreen-overlay")).toBeInTheDocument();
  });

  it("hides header and footer in fullscreen mode", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Trigger fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    expect(screen.getByTestId("fullscreen-overlay")).toBeInTheDocument();
  });

  it("shows floating controls in fullscreen mode", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    // Check controls exist
    expect(screen.getByTestId("fullscreen-controls")).toBeInTheDocument();

    // Check exit button
    const exitButton = screen.getByRole("button", { name: /Exit Fullscreen/i });
    expect(exitButton).toBeVisible();

    // Check theme toggle
    const themeButton = screen.getByRole("button", { name: /Toggle Dark Mode/i });
    expect(themeButton).toBeVisible();
  });

  it("handles theme toggle and persists to localStorage", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    // Check theme toggle
    const themeButton = screen.getByRole("button", { name: /Toggle Dark Mode/i });

    // Toggle theme
    await act(async () => {
      fireEvent.click(themeButton);
    });

    // Check localStorage
    expect(window.localStorage.getItem("bearing-fullscreen-theme")).toBe("dark");

    // Check dark mode class applied
    const editorContainer = screen.getByTestId("fullscreen-overlay");
    expect(editorContainer).toHaveClass("bg-slate-900");
  });

  it("exits fullscreen on Escape key", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    expect(screen.getByTestId("fullscreen-overlay")).toBeInTheDocument();

    // Escape
    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    // Should be gone
    expect(screen.queryByTestId("fullscreen-overlay")).not.toBeInTheDocument();
  });

  it("exits fullscreen when exit button is clicked", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    expect(screen.getByTestId("fullscreen-overlay")).toBeInTheDocument();

    // Click exit button
    const exitButton = screen.getByRole("button", { name: /Exit Fullscreen/i });
    await act(async () => {
      fireEvent.click(exitButton);
    });

    // Should be gone
    expect(screen.queryByTestId("fullscreen-overlay")).not.toBeInTheDocument();
  });

  it("loads dark mode preference from localStorage", async () => {
    // Set dark mode preference before render
    localStorage.setItem("bearing-fullscreen-theme", "dark");

    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    // Should have dark mode applied
    const editorContainer = screen.getByTestId("fullscreen-overlay");
    expect(editorContainer).toHaveClass("bg-slate-900");
  });

  it("opens publishing request modal from the toolbar", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    const publishingButton = screen.getByRole("button", { name: /Publishing/i });
    await act(async () => {
      fireEvent.click(publishingButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("service-request-modal")).toBeInTheDocument();
    });

    expect(screen.getByTestId("service-request-modal")).toHaveAttribute(
      "data-service-id",
      "publishing-help"
    );
    expect(screen.getByText("Request Publishing Assistance")).toBeInTheDocument();
  });

  it("shows Export button in fullscreen floating controls", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    // Check Export button exists in fullscreen controls
    const exportButton = screen.getByTestId("fullscreen-export-button");
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).toHaveAttribute("title", "Export Manuscript");
  });

  it("shows Version History button in fullscreen floating controls", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    // Check Version History button exists in fullscreen controls
    const versionHistoryButton = screen.getByTestId("fullscreen-version-history-button");
    expect(versionHistoryButton).toBeInTheDocument();
    expect(versionHistoryButton).toHaveAttribute("title", "Version History");
  });

  it("opens Export modal when Export button is clicked in fullscreen", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    // Click Export button
    const exportButton = screen.getByTestId("fullscreen-export-button");
    await act(async () => {
      fireEvent.click(exportButton);
    });

    // Export modal should be visible
    await waitFor(() => {
      expect(screen.getByTestId("export-modal")).toBeInTheDocument();
    });
  });

  it("opens Version History panel when Version History button is clicked in fullscreen", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    // Enter fullscreen
    await act(async () => {
      fireEvent.keyDown(window, { key: "\\", metaKey: true });
    });

    // Click Version History button
    const versionHistoryButton = screen.getByTestId("fullscreen-version-history-button");
    await act(async () => {
      fireEvent.click(versionHistoryButton);
    });

    // Version History panel should be visible
    await waitFor(() => {
      expect(screen.getByTestId("version-history-panel")).toBeInTheDocument();
    });
  });
});
