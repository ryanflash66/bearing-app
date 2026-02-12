/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManuscriptEditor from "@/components/manuscripts/ManuscriptEditor";

jest.mock("@/lib/useAutosave", () => ({
  useAutosave: jest.fn(() => ({
    state: { status: "idle" },
    queueSave: jest.fn(),
    saveNow: jest.fn().mockResolvedValue(true),
    resetTimestamp: jest.fn(),
  })),
  AutosaveState: {},
}));

const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
};
Object.defineProperty(window, "indexedDB", { value: mockIndexedDB });

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

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

const mockDismissGhostText = jest.fn();

jest.mock("@/lib/useGhostText", () => ({
  useGhostText: jest.fn(() => ({
    suggestion: null,
    isLoading: false,
    dismiss: mockDismissGhostText,
    accept: jest.fn(),
  })),
}));

jest.mock("@/lib/useCommandPalette", () => ({
  useCommandPalette: jest.fn(() => ({
    isOpen: false,
    setIsOpen: jest.fn(),
    commands: [],
    isLoading: false,
    loadingMessage: "",
  })),
}));

jest.mock("@/lib/manuscript-utils", () => ({
  extractCharacters: jest.fn(() => []),
  saveSelection: jest.fn(),
  restoreSelection: jest.fn(),
  findFirstOccurrence: jest.fn(),
}));

let selectedText = "";
const mockEditorInstance = {
  commands: {
    insertContent: jest.fn(),
    insertContentAt: jest.fn(),
    setTextSelection: jest.fn(),
    focus: jest.fn(),
  },
  getHTML: () => "<p></p>",
  getText: () => selectedText,
  getJSON: () => ({ type: "doc", content: [] }),
  state: {
    doc: {
      textBetween: () => selectedText,
    },
    selection: { from: 1, to: 1 },
  },
  view: {
    focus: jest.fn(),
    domAtPos: () => ({ node: document.createElement("div") }),
  },
};

jest.mock("@/components/editor/TiptapEditor", () => {
  return {
    __esModule: true,
    default: function MockTiptapEditor({
      onEditorReady,
      onSelectionUpdate,
    }: {
      onEditorReady: (editor: typeof mockEditorInstance) => void;
      onSelectionUpdate?: (editor: typeof mockEditorInstance) => void;
    }) {
      React.useEffect(() => {
        onEditorReady(mockEditorInstance);
      }, [onEditorReady]);

      return (
        <button
          type="button"
          data-testid="mock-select-text"
          onClick={() => {
            selectedText = "Selected paragraph";
            mockEditorInstance.state.selection = { from: 1, to: selectedText.length + 1 };
            onSelectionUpdate?.(mockEditorInstance);
          }}
        >
          Select text
        </button>
      );
    },
  };
});

jest.mock("@/components/manuscripts/Binder", () => ({ __esModule: true, default: () => <div data-testid="binder" /> }));
jest.mock("@/components/manuscripts/BetaCommentsPanel", () => ({ __esModule: true, default: () => <div data-testid="comments-panel" /> }));
jest.mock("@/components/manuscripts/BetaShareModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/ServiceStatusBanner", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/VersionHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/ExportModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/ConflictResolutionModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/AISuggestion", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/ConsistencyReportViewer", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/ConsistencyReportSidebar", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/editor/CommandPalette", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/manuscripts/GhostTextDisplay", () => ({ __esModule: true, GhostTextOverlay: () => null }));
jest.mock("@/components/marketplace/ServiceRequestModal", () => ({ __esModule: true, default: () => null }));

type SheetProps = React.PropsWithChildren;
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: SheetProps) => <div>{children}</div>,
  SheetContent: ({ children }: SheetProps) => <div>{children}</div>,
  SheetHeader: ({ children }: SheetProps) => <div>{children}</div>,
  SheetTitle: ({ children }: SheetProps) => <div>{children}</div>,
}));

describe("ManuscriptEditor suggestions trigger", () => {
  const defaultProps = {
    manuscriptId: "test-id",
    initialContent: "Initial content",
    initialTitle: "Test Title",
    initialUpdatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    selectedText = "";
    mockEditorInstance.state.selection = { from: 1, to: 1 };
  });

  it("shows Get Suggestions button after text selection", async () => {
    await act(async () => {
      render(<ManuscriptEditor {...defaultProps} />);
    });

    expect(screen.queryByTestId("get-suggestions-button")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mock-select-text"));

    expect(screen.getByTestId("get-suggestions-button")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Get Suggestions/i })).toBeInTheDocument();
    expect(mockDismissGhostText).toHaveBeenCalled();
  });
});
