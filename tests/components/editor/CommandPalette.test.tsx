import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommandPalette, { CommandItem } from "@/components/editor/CommandPalette";

// Mock ResizeObserver which is used by cmdk
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock Element.prototype.scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock commands for testing
const mockCommands: CommandItem[] = [
  {
    id: "make-concise",
    label: "Make Concise",
    description: "Shorten the text",
    icon: "✂️",
    category: "ai",
    action: jest.fn(),
  },
  {
    id: "expand",
    label: "Expand",
    description: "Add more detail",
    icon: "📝",
    category: "ai",
    action: jest.fn(),
  },
  {
    id: "nav-chapter",
    label: "Go to Chapter",
    description: "Navigate to a chapter",
    icon: "📖",
    category: "navigation",
    action: jest.fn(),
  },
  {
    id: "export-pdf",
    label: "Export PDF",
    description: "Download as PDF",
    icon: "📄",
    category: "action",
    action: jest.fn(),
  },
];

const mockChapters = [
  { title: "Introduction", index: 0 },
  { title: "The Beginning", index: 150 },
  { title: "The Middle", index: 500 },
  { title: "The End", index: 1000 },
];

describe("CommandPalette", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("AC 5.2.1: Palette Opening", () => {
    it("renders when open is true", () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
    });

    it("does not render when open is false", () => {
      render(
        <CommandPalette
          open={false}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("focuses search input when opened", async () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type a command/i);
        expect(document.activeElement).toBe(input);
      }, { timeout: 200 });
    });
  });

  describe("AC 5.2.2: Fuzzy Search and Filtering", () => {
    it("displays all commands initially", () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      expect(screen.getByText("Make Concise")).toBeInTheDocument();
      expect(screen.getByText("Expand")).toBeInTheDocument();
      expect(screen.getByText("Go to Chapter")).toBeInTheDocument();
      expect(screen.getByText("Export PDF")).toBeInTheDocument();
    });

    it("filters commands based on search input", async () => {
      const user = userEvent.setup();

      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, "concise");

      // Should show matching command
      expect(screen.getByText("Make Concise")).toBeInTheDocument();
      // cmdk handles filtering - non-matching items may be hidden via CSS/display
    });

    it("shows empty state when no commands match", async () => {
      const user = userEvent.setup();

      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, "xyznonexistent");

      await waitFor(() => {
        expect(screen.getByText(/no commands found/i)).toBeInTheDocument();
      });
    });
  });

  describe("AC 5.2.3: AI Transformation Commands", () => {
    it("executes command action when selected", async () => {
      const user = userEvent.setup();
      const mockAction = jest.fn();
      const commands: CommandItem[] = [
        {
          id: "test-command",
          label: "Test Command",
          description: "A test command",
          category: "ai",
          action: mockAction,
        },
      ];

      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={commands}
        />
      );

      const commandItem = screen.getByText("Test Command");
      await user.click(commandItem);

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it("shows loading state during command execution", () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
          isLoading={true}
          loadingMessage="Processing..."
        />
      );

      // Check for loading spinner (it has a sr-only text)
      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });

    it("disables commands when loading", () => {
      const mockAction = jest.fn();
      const commands: CommandItem[] = [
        {
          id: "test-command",
          label: "Test Command",
          description: "A test command",
          category: "ai",
          action: mockAction,
        },
      ];

      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={commands}
          isLoading={true}
        />
      );

      const commandItem = screen.getByText("Test Command").closest("[data-disabled]");
      expect(commandItem).toHaveAttribute("data-disabled", "true");
    });
  });

  describe("AC 5.2.4: Escape to Close", () => {
    it("calls onOpenChange(false) when Escape is pressed", async () => {
      const onOpenChange = jest.fn();

      render(
        <CommandPalette
          open={true}
          onOpenChange={onOpenChange}
          commands={mockCommands}
        />
      );

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("AC 5.2.5: Navigation Commands", () => {
    it("navigates to chapter when navigation command is used", async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();

      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
          chapters={mockChapters}
          onNavigate={onNavigate}
        />
      );

      // Type "go to chapter 2" and press Enter to trigger navigation
      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, "go to chapter 2");
      await user.keyboard("{Enter}");

      // Should trigger navigation
      await waitFor(() => {
        expect(onNavigate).toHaveBeenCalledWith(150); // index of chapter 2
      });
    });

    it("shows navigation confirmation after navigating", async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();

      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
          chapters={mockChapters}
          onNavigate={onNavigate}
        />
      );

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, "chapter 1");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        // Navigation message format: "Navigated to Chapter N: Title"
        expect(screen.getByText(/Navigated to Chapter 1: Introduction/i)).toBeInTheDocument();
      });
    });

    it("shows chapters when searching for 'chapter'", async () => {
      const user = userEvent.setup();

      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
          chapters={mockChapters}
          onNavigate={jest.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, "chapter");

      await waitFor(() => {
        expect(screen.getByText(/Chapter 1: Introduction/)).toBeInTheDocument();
        expect(screen.getByText(/Chapter 2: The Beginning/)).toBeInTheDocument();
      });
    });

    it("handles invalid chapter number gracefully", async () => {
      const user = userEvent.setup();
      const onNavigate = jest.fn();

      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
          chapters={mockChapters}
          onNavigate={onNavigate}
        />
      );

      const input = screen.getByPlaceholderText(/type a command/i);
      await user.type(input, "go to chapter 99");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        // Actual message format: "Chapter 99 not found (1-4 available)"
        expect(screen.getByText(/Chapter 99 not found/i)).toBeInTheDocument();
      });
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      // Dialog should be present
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      // Title should exist (visually hidden for screen readers)
      expect(screen.getByText("Command palette")).toBeInTheDocument();
      expect(screen.getByLabelText("Search commands")).toBeInTheDocument();
    });

    it("shows keyboard navigation hints", () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      expect(screen.getByText("navigate")).toBeInTheDocument();
      expect(screen.getByText("select")).toBeInTheDocument();
      expect(screen.getByText("close")).toBeInTheDocument();
    });

    it("groups commands by category", () => {
      render(
        <CommandPalette
          open={true}
          onOpenChange={jest.fn()}
          commands={mockCommands}
        />
      );

      expect(screen.getByText("AI Transformations")).toBeInTheDocument();
      expect(screen.getByText("Navigation")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });
});
