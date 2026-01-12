import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommandPalette } from "@/lib/useCommandPalette";

describe("useCommandPalette", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Keyboard shortcut registration", () => {
    it("opens palette on Cmd+K", async () => {
      const { result } = renderHook(() => useCommandPalette({ enabled: true }));

      expect(result.current.isOpen).toBe(false);

      // Simulate Cmd+K
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("opens palette on Ctrl+K", async () => {
      const { result } = renderHook(() => useCommandPalette({ enabled: true }));

      expect(result.current.isOpen).toBe(false);

      // Simulate Ctrl+K
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("toggles palette on repeated Cmd+K", async () => {
      const { result } = renderHook(() => useCommandPalette({ enabled: true }));

      // Open
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);
      });
      expect(result.current.isOpen).toBe(true);

      // Close
      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);
      });
      expect(result.current.isOpen).toBe(false);
    });

    it("does not respond when disabled", async () => {
      const { result } = renderHook(() => useCommandPalette({ enabled: false }));

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          metaKey: true,
          bubbles: true,
        });
        document.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("AI Commands generation", () => {
    it("generates AI commands when selectedText is provided", () => {
      const mockTransform = jest.fn();
      const { result } = renderHook(() =>
        useCommandPalette({
          enabled: true,
          selectedText: "Some selected text",
          onTransform: mockTransform,
        })
      );

      const aiCommands = result.current.commands.filter(c => c.category === "ai");
      expect(aiCommands.length).toBeGreaterThan(0);

      // AI commands should be enabled when there's selected text
      const enabledAiCommands = aiCommands.filter(c => !c.disabled);
      expect(enabledAiCommands.length).toBeGreaterThan(0);
    });

    it("disables AI commands when no text selected", () => {
      const mockTransform = jest.fn();
      const { result } = renderHook(() =>
        useCommandPalette({
          enabled: true,
          selectedText: "",
          onTransform: mockTransform,
        })
      );

      const aiCommands = result.current.commands.filter(c => c.category === "ai");
      const enabledAiCommands = aiCommands.filter(c => !c.disabled);
      expect(enabledAiCommands.length).toBe(0);
    });

    it("disables AI commands when no transform handler", () => {
      const { result } = renderHook(() =>
        useCommandPalette({
          enabled: true,
          selectedText: "Some text",
          // No onTransform provided
        })
      );

      const aiCommands = result.current.commands.filter(c => c.category === "ai");
      const enabledAiCommands = aiCommands.filter(c => !c.disabled);
      expect(enabledAiCommands.length).toBe(0);
    });
  });

  describe("AI Command execution", () => {
    it("calls onTransform with instruction and text when AI command executed", async () => {
      const mockTransform = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useCommandPalette({
          enabled: true,
          selectedText: "Test text",
          onTransform: mockTransform,
        })
      );

      const makeConciseCommand = result.current.commands.find(c => c.id === "make-concise");
      expect(makeConciseCommand).toBeDefined();

      await act(async () => {
        await makeConciseCommand!.action();
      });

      expect(mockTransform).toHaveBeenCalledWith(
        expect.stringContaining("concise"),
        "Test text"
      );
    });

    it("sets loading state during command execution", async () => {
      let resolveTransform: () => void;
      const mockTransform = jest.fn().mockImplementation(() =>
        new Promise<void>((resolve) => {
          resolveTransform = resolve;
        })
      );

      const { result } = renderHook(() =>
        useCommandPalette({
          enabled: true,
          selectedText: "Test text",
          onTransform: mockTransform,
        })
      );

      const expandCommand = result.current.commands.find(c => c.id === "expand");

      // Start execution (don't await)
      let actionPromise: Promise<void>;
      act(() => {
        actionPromise = expandCommand!.action() as Promise<void>;
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingMessage).toContain("Expand");

      // Complete the transform
      await act(async () => {
        resolveTransform!();
        await actionPromise;
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.loadingMessage).toBe("");
    });

    it("closes palette after successful transformation", async () => {
      const mockTransform = jest.fn().mockResolvedValue(undefined);
      const mockClose = jest.fn();
      const { result } = renderHook(() =>
        useCommandPalette({
          enabled: true,
          selectedText: "Test text",
          onTransform: mockTransform,
          onClose: mockClose,
        })
      );

      // Open the palette first
      act(() => {
        result.current.setIsOpen(true);
      });
      expect(result.current.isOpen).toBe(true);

      // Execute a command
      const command = result.current.commands.find(c => c.id === "make-concise");
      await act(async () => {
        await command!.action();
      });

      // Should be closed
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("onClose callback", () => {
    it("calls onClose when palette closes", async () => {
      const mockClose = jest.fn();
      const { result } = renderHook(() =>
        useCommandPalette({
          enabled: true,
          onClose: mockClose,
        })
      );

      // Open then close
      act(() => {
        result.current.setIsOpen(true);
      });

      act(() => {
        result.current.setIsOpen(false);
      });

      // Wait for the delayed callback
      await waitFor(() => {
        expect(mockClose).toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it("does not call onClose when opening", () => {
      const mockClose = jest.fn();
      const { result } = renderHook(() =>
        useCommandPalette({
          enabled: true,
          onClose: mockClose,
        })
      );

      act(() => {
        result.current.setIsOpen(true);
      });

      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe("Available commands", () => {
    it("includes standard AI transformation commands", () => {
      const { result } = renderHook(() => useCommandPalette({ enabled: true }));

      const commandIds = result.current.commands.map(c => c.id);

      expect(commandIds).toContain("make-concise");
      expect(commandIds).toContain("expand");
      expect(commandIds).toContain("change-tone-formal");
      expect(commandIds).toContain("change-tone-casual");
      expect(commandIds).toContain("change-tone-dark");
      expect(commandIds).toContain("change-tone-light");
      expect(commandIds).toContain("continue");
      expect(commandIds).toContain("fix-grammar");
      expect(commandIds).toContain("simplify");
      expect(commandIds).toContain("show-dont-tell");
    });

    it("does not include placeholder commands (removed per code review)", () => {
      const { result } = renderHook(() => useCommandPalette({ enabled: true }));

      const commandIds = result.current.commands.map(c => c.id);

      // These were removed as they were non-functional placeholders
      expect(commandIds).not.toContain("nav-next-chapter");
      expect(commandIds).not.toContain("nav-prev-chapter");
      expect(commandIds).not.toContain("action-save-snapshot");
      expect(commandIds).not.toContain("action-run-consistency");
      expect(commandIds).not.toContain("action-export-pdf");
      expect(commandIds).not.toContain("action-export-docx");
    });
  });
});
