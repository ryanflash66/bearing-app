/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGhostText } from "@/lib/useGhostText";

// Use fake timers to control execution precisely
jest.useFakeTimers();

describe("useGhostText", () => {
  const mockOnRequestSuggestion = jest.fn();
  const mockOnAccept = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRequestSuggestion.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("should initialize with inactive state", () => {
    const { result } = renderHook(() =>
      useGhostText("Initial content", 15, {
        onRequestSuggestion: mockOnRequestSuggestion,
      })
    );

    expect(result.current.isActive).toBe(false);
  });

  it("should not trigger suggestion with insufficient context", () => {
    const { result } = renderHook(() =>
      useGhostText("Short", 5, {
        onRequestSuggestion: mockOnRequestSuggestion,
        pauseMs: 100,
      })
    );

    act(() => {
      jest.advanceTimersByTime(110);
    });

    expect(mockOnRequestSuggestion).not.toHaveBeenCalled();
    expect(result.current.isActive).toBe(false);
  });

  it.skip("should trigger suggestion after pause with sufficient context", async () => {
    mockOnRequestSuggestion.mockResolvedValue("suggested text");

    const { result } = renderHook(() =>
      useGhostText("This is enough context to trigger a suggestion", 48, {
        onRequestSuggestion: mockOnRequestSuggestion,
        pauseMs: 100,
      })
    );

    expect(result.current.isActive).toBe(false);

    // Advance timer
    await act(async () => {
      jest.advanceTimersByTime(110);
    });

    // Wait for the async effect to settle
    await waitFor(() => {
      expect(mockOnRequestSuggestion).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
      expect(result.current.ghostText).toBe("suggested text");
    });
  });

  it.skip("should reset when content changes", async () => {
    mockOnRequestSuggestion.mockResolvedValue("suggested text");

    const { result, rerender } = renderHook(
      ({ content, cursor }) =>
        useGhostText(content, cursor, {
          onRequestSuggestion: mockOnRequestSuggestion,
          pauseMs: 100,
        }),
      {
        initialProps: {
          content: "This is enough context to trigger",
          cursor: 33,
        },
      }
    );

    // Advance timer halfway
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Change content (simulates typing)
    rerender({
      content: "This is enough context to trigger a",
      cursor: 35,
    });

    // Advance timer - should reset since content changed
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Should not have triggered because timer was reset
    expect(result.current.isActive).toBe(false);
    
    // Advance remaining time + buffer
    await act(async () => {
      jest.advanceTimersByTime(60);
    });

    // Should now trigger
    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });
  });

  it.skip("should call onAccept when accept() is called", async () => {
    mockOnRequestSuggestion.mockResolvedValue("suggested text");

    const { result } = renderHook(() =>
      useGhostText("This is enough context to trigger a suggestion", 48, {
        onRequestSuggestion: mockOnRequestSuggestion,
        onAccept: mockOnAccept,
        pauseMs: 100,
      })
    );

    await act(async () => {
      jest.advanceTimersByTime(110);
    });
    
    await waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    act(() => {
      result.current.accept();
    });

    expect(mockOnAccept).toHaveBeenCalledWith("suggested text");
    expect(result.current.isActive).toBe(false);
  });
});
