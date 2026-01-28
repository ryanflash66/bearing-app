/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useAutosave } from "@/lib/useAutosave";

// Mock Supabase client
jest.mock("@/utils/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  })),
}));

// Mock manuscripts module
const mockUpdateManuscript = jest.fn();
const mockGenerateContentHash = jest.fn(() => Promise.resolve("mock-hash"));

jest.mock("@/lib/manuscripts", () => ({
  updateManuscript: (supabase: unknown, id: unknown, data: unknown, expectedUpdatedAt: unknown) =>
    mockUpdateManuscript(supabase, id, data, expectedUpdatedAt),
  generateContentHash: () => mockGenerateContentHash(),
}));

// Mock manuscriptVersions module
jest.mock("@/lib/manuscriptVersions", () => ({
  createVersionSnapshot: jest.fn(() => Promise.resolve()),
}));

// Simple IndexedDB mock that resolves immediately
beforeAll(() => {
  const mockStore = {
    put: jest.fn().mockImplementation(() => {
      const request = { onerror: null as any, onsuccess: null as any };
      Promise.resolve().then(() => request.onsuccess?.());
      return request;
    }),
    get: jest.fn().mockImplementation(() => {
      const request = { onerror: null as any, onsuccess: null as any, result: null };
      Promise.resolve().then(() => request.onsuccess?.());
      return request;
    }),
    delete: jest.fn().mockImplementation(() => {
      const request = { onerror: null as any, onsuccess: null as any };
      Promise.resolve().then(() => request.onsuccess?.());
      return request;
    }),
    getAll: jest.fn().mockImplementation(() => {
      const request = { onerror: null as any, onsuccess: null as any, result: [] };
      Promise.resolve().then(() => request.onsuccess?.());
      return request;
    }),
  };

  const mockTransaction = {
    objectStore: jest.fn(() => mockStore),
  };

  const mockDB = {
    objectStoreNames: { contains: () => true },
    transaction: jest.fn(() => mockTransaction),
  };

  Object.defineProperty(window, "indexedDB", {
    value: {
      open: jest.fn(() => {
        const request = {
          result: mockDB,
          onerror: null as any,
          onsuccess: null as any,
          onupgradeneeded: null as any,
        };
        Promise.resolve().then(() => request.onsuccess?.({ target: request }));
        return request;
      }),
    },
    writable: true,
  });
});

// Helper to flush all pending promises
const flushPromises = async () => {
  // Flush microtask queue multiple times to handle chained promises
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

// Use fake timers with modern implementation
jest.useFakeTimers();

describe("useAutosave", () => {
  const manuscriptId = "test-manuscript-id";
  const initialUpdatedAt = new Date().toISOString();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Reset to success by default
    mockUpdateManuscript.mockResolvedValue({
      manuscript: { updated_at: new Date().toISOString() },
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("initialization", () => {
    it("should initialize with idle status", () => {
      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt)
      );

      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.retryCount).toBe(0);
      expect(result.current.state.pendingChanges).toBe(false);
      expect(result.current.state.retryingIn).toBeNull();
      expect(result.current.state.maxRetriesExceeded).toBe(false);
    });
  });

  describe("exponential backoff", () => {
    it("should retry with exponential delays: 2s, 4s, 8s, 16s", async () => {
      // Simulate persistent failure
      mockUpdateManuscript.mockResolvedValue({
        manuscript: null,
        error: "Network error",
        conflictDetected: false,
      });

      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          retryDelayMs: 2000,
          maxRetries: 5,
        })
      );

      // Queue a save
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "test content",
          "Test Title"
        );
      });

      // Fast-forward debounce (5s default)
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      // First attempt should have been made
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(1);
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.retryCount).toBe(1);

      // Wait for first retry (should be 2s with exponential backoff: 2000 * 2^0)
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(2);
      expect(result.current.state.retryCount).toBe(2);

      // Wait for second retry (should be 4s: 2000 * 2^1)
      await act(async () => {
        jest.advanceTimersByTime(4000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(3);
      expect(result.current.state.retryCount).toBe(3);

      // Wait for third retry (should be 8s: 2000 * 2^2)
      await act(async () => {
        jest.advanceTimersByTime(8000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(4);
      expect(result.current.state.retryCount).toBe(4);

      // Wait for fourth retry (should be 16s: 2000 * 2^3)
      await act(async () => {
        jest.advanceTimersByTime(16000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(5);
      expect(result.current.state.retryCount).toBe(5);
    });

    it("should cap retry delay at maxRetryDelay (30s)", async () => {
      mockUpdateManuscript.mockResolvedValue({
        manuscript: null,
        error: "Network error",
        conflictDetected: false,
      });

      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          retryDelayMs: 2000,
          maxRetries: 6,
          maxRetryDelay: 30000,
        })
      );

      // Queue a save
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "test content",
          "Test Title"
        );
      });

      // Fast-forward debounce
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      // First attempt made
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(1);

      // Retry delays: 2s, 4s, 8s, 16s, 30s (capped), 30s (capped)
      // After retry 1 (2s)
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(2);

      // After retry 2 (4s)
      await act(async () => {
        jest.advanceTimersByTime(4000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(3);

      // After retry 3 (8s)
      await act(async () => {
        jest.advanceTimersByTime(8000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(4);

      // After retry 4 (16s)
      await act(async () => {
        jest.advanceTimersByTime(16000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(5);

      // After retry 5 (should be 32s but capped at 30s)
      // Advance 29s - should NOT trigger yet
      await act(async () => {
        jest.advanceTimersByTime(29000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(5);

      // Advance 1 more second (total 30s) - should trigger
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await flushPromises();
      });
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(6);
    });

    it("should clear retry timer on unmount", async () => {
      mockUpdateManuscript.mockResolvedValue({
        manuscript: null,
        error: "Network error",
        conflictDetected: false,
      });

      const { result, unmount } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          retryDelayMs: 2000,
          maxRetries: 5,
        })
      );

      // Queue a save and trigger first failure
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "test content",
          "Test Title"
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      expect(mockUpdateManuscript).toHaveBeenCalledTimes(1);
      expect(result.current.state.retryCount).toBe(1);

      // Unmount before retry timer fires
      unmount();

      // Advance time past when retry would have fired
      await act(async () => {
        jest.advanceTimersByTime(10000);
        await flushPromises();
      });

      // Should not have retried after unmount
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(1);
    });

    it("should expose retryingIn field with countdown value", async () => {
      mockUpdateManuscript.mockResolvedValue({
        manuscript: null,
        error: "Network error",
        conflictDetected: false,
      });

      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          retryDelayMs: 2000,
          maxRetries: 5,
        })
      );

      // Queue a save
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "test content",
          "Test Title"
        );
      });

      // Fast-forward debounce to trigger first save
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      // After first failure, retryingIn should be set
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.retryingIn).toBe(2); // 2 seconds until next retry
    });

    it("should set maxRetriesExceeded to true when max retries exceeded", async () => {
      mockUpdateManuscript.mockResolvedValue({
        manuscript: null,
        error: "Network error",
        conflictDetected: false,
      });

      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          retryDelayMs: 1000,
          maxRetries: 2,
        })
      );

      // Queue a save
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "test content",
          "Test Title"
        );
      });

      // Fast-forward debounce
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      // First failure
      expect(result.current.state.retryCount).toBe(1);
      expect(result.current.state.maxRetriesExceeded).toBe(false);

      // Retry 1 (1s delay)
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await flushPromises();
      });
      expect(result.current.state.retryCount).toBe(2);
      expect(result.current.state.maxRetriesExceeded).toBe(false);

      // Retry 2 (2s delay)
      await act(async () => {
        jest.advanceTimersByTime(2000);
        await flushPromises();
      });
      expect(result.current.state.maxRetriesExceeded).toBe(true);
      expect(result.current.state.retryingIn).toBeNull();
    });
  });

  describe("manual save", () => {
    it("should allow manual save when max retries exceeded", async () => {
      // First fail, then succeed on manual save
      mockUpdateManuscript
        .mockResolvedValueOnce({
          manuscript: null,
          error: "Network error",
          conflictDetected: false,
        })
        .mockResolvedValueOnce({
          manuscript: null,
          error: "Network error",
          conflictDetected: false,
        })
        .mockResolvedValueOnce({
          manuscript: null,
          error: "Network error",
          conflictDetected: false,
        })
        .mockResolvedValue({
          manuscript: { updated_at: new Date().toISOString() },
          error: null,
        });

      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          retryDelayMs: 1000,
          maxRetries: 2,
        })
      );

      // Queue a save and exhaust retries
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "test content",
          "Test Title"
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(5000); // debounce
        await flushPromises();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000); // retry 1
        await flushPromises();
      });

      await act(async () => {
        jest.advanceTimersByTime(2000); // retry 2
        await flushPromises();
      });

      expect(result.current.state.maxRetriesExceeded).toBe(true);

      // Now call saveNow() - should succeed
      await act(async () => {
        await result.current.saveNow();
      });

      expect(result.current.state.status).toBe("saved");
      expect(result.current.state.maxRetriesExceeded).toBe(false);
    });

    it("should reset error state on successful manual save", async () => {
      mockUpdateManuscript
        .mockResolvedValueOnce({
          manuscript: null,
          error: "Network error",
          conflictDetected: false,
        })
        .mockResolvedValue({
          manuscript: { updated_at: new Date().toISOString() },
          error: null,
        });

      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          maxRetries: 0, // No automatic retries
        })
      );

      // Queue a save
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "test content",
          "Test Title"
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      expect(result.current.state.status).toBe("error");

      // Manual save
      await act(async () => {
        await result.current.saveNow();
      });

      expect(result.current.state.status).toBe("saved");
      expect(result.current.state.retryCount).toBe(0);
      expect(result.current.state.error).toBeNull();
    });

    it("should resume autosave after successful manual save", async () => {
      mockUpdateManuscript
        .mockResolvedValueOnce({
          manuscript: null,
          error: "Network error",
          conflictDetected: false,
        })
        .mockResolvedValue({
          manuscript: { updated_at: new Date().toISOString() },
          error: null,
        });

      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          maxRetries: 0,
        })
      );

      // First save fails
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "test content",
          "Test Title"
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      expect(result.current.state.status).toBe("error");

      // Manual save succeeds
      await act(async () => {
        await result.current.saveNow();
      });

      expect(result.current.state.status).toBe("saved");

      // Queue another save - autosave should work normally
      act(() => {
        result.current.queueSave(
          { type: "doc", content: [] },
          "updated content",
          "Test Title"
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      expect(result.current.state.status).toBe("saved");
      expect(mockUpdateManuscript).toHaveBeenCalledTimes(3);
    });
  });

  describe("error logging", () => {
    it("should log structured error without PII", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockUpdateManuscript.mockResolvedValue({
        manuscript: null,
        error: "Network error",
        conflictDetected: false,
      });

      const { result } = renderHook(() =>
        useAutosave(manuscriptId, initialUpdatedAt, {
          maxRetries: 0,
        })
      );

      act(() => {
        result.current.queueSave(
          { type: "doc", content: [{ type: "paragraph", content: "Secret content that should NOT be logged" }] },
          "Secret manuscript content that should NOT be logged",
          "My Secret Title"
        );
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await flushPromises();
      });

      // Check that console.error was called with structured log
      const logCall = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("[Autosave]")
      );

      expect(logCall).toBeDefined();
      if (logCall) {
        const logMessage = logCall[1];
        const parsed = JSON.parse(logMessage);

        expect(parsed.event).toBe("autosave_error");
        expect(parsed.manuscriptId).toBe(manuscriptId);
        expect(parsed.errorType).toBeDefined();
        expect(parsed.timestamp).toBeDefined();
        // Should NOT contain manuscript content
        expect(logMessage).not.toContain("Secret content");
        expect(logMessage).not.toContain("Secret manuscript");
        expect(logMessage).not.toContain("My Secret Title");
      }

      consoleSpy.mockRestore();
    });
  });
});
