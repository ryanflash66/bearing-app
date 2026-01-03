/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useZenMode } from "@/lib/useZenMode";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useZenMode", () => {
  beforeEach(() => {
    // Reset the mock implementation to return null by default
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it("should initialize with isActive = false by default", () => {
    const { result } = renderHook(() => useZenMode());
    expect(result.current.isActive).toBe(false);
  });

  it("should toggle zen mode on and off", () => {
    const { result } = renderHook(() => useZenMode());

    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isActive).toBe(false);
  });

  it("should enable zen mode", () => {
    const { result } = renderHook(() => useZenMode());

    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.enable();
    });

    expect(result.current.isActive).toBe(true);
  });

  it("should disable zen mode", () => {
    const { result } = renderHook(() => useZenMode());

    act(() => {
      result.current.enable();
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.disable();
    });

    expect(result.current.isActive).toBe(false);
  });

  it("should persist state to localStorage", async () => {
    const { result } = renderHook(() => useZenMode());

    act(() => {
      result.current.enable();
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "bearing-zen-mode",
        "true"
      );
    });
  });

  it("should load initial state from localStorage when true", async () => {
    // Pre-set localStorage value before hook mounts
    localStorageMock.getItem.mockReturnValue("true");

    const { result } = renderHook(() => useZenMode());

    // The useEffect that loads from localStorage runs async
    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });
  });

  it("should not toggle on unrelated key presses", () => {
    const { result } = renderHook(() => useZenMode());

    expect(result.current.isActive).toBe(false);

    // Simulate Ctrl+S (should not toggle)
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "s",
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isActive).toBe(false);

    // Simulate just \ without modifier (should not toggle)
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "\\",
        bubbles: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isActive).toBe(false);
  });

  // Note: Keyboard shortcut toggle tests (Ctrl+\, Cmd+\) are better suited for E2E tests
  // as jsdom's KeyboardEvent simulation doesn't fully replicate browser behavior
});
