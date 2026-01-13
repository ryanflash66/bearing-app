/**
 * Tests for Llama AI Suggestions
 * Story 2.3 Acceptance Criteria:
 * - AC 2.3.1: Suggestion streams within 2 seconds (P95)
 * - AC 2.3.2: Suggestions never auto-apply (non-destructive)
 * - AC 2.3.3: Cached responses returned within cache TTL
 * - AC 2.3.4: Token cap enforcement with clear error message
 * - AC 2.3.5: Low confidence suggestions labeled as "beta"
 */

import {
  estimateTokens,
  computeRequestHash,
  validateContextWindow,
  getLlamaSuggestion,
} from "@/lib/llama";
import { SupabaseClient } from "@supabase/supabase-js";

// Mock crypto for testing
global.crypto = {
  subtle: {
    digest: jest.fn().mockResolvedValue(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    ),
  } as unknown as SubtleCrypto,
} as Crypto;

// Mock ai-usage
jest.mock("@/lib/ai-usage", () => ({
  checkUsageLimit: jest.fn().mockResolvedValue(undefined),
  logUsageEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock openrouter to avoid actual API calls
jest.mock("@/lib/openrouter", () => ({
  openRouterChat: jest.fn().mockResolvedValue({
    choices: [{ message: { content: "Mock improved text" } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  }),
  openRouterChatStream: jest.fn().mockImplementation(async function* () {
    yield "Mock ";
    yield "improved ";
    yield "text";
    return { fullContent: "Mock improved text" };
  }),
  isOpenRouterConfigured: jest.fn().mockReturnValue(true),
  getMockResponse: jest.fn().mockReturnValue("Mock suggestion response"),
  OPENROUTER_MODELS: {
    "gemini-pro": "google/gemini-pro-1.5",
    "gemini-flash": "google/gemini-flash-1.5",
    "llama-8b": "meta-llama/llama-3.1-8b-instruct",
    "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
    default_consistency: "google/gemini-flash-1.5",
    default_suggestion: "meta-llama/llama-3.1-8b-instruct",
  },
  OpenRouterError: class OpenRouterError extends Error {
    constructor(message: string, public statusCode: number) {
      super(message);
    }
  },
}));

describe("Llama Service", () => {
  describe("estimateTokens", () => {
    it("should estimate tokens correctly", () => {
      // Rough approximation: 1 token ≈ 4 characters
      expect(estimateTokens("test")).toBeGreaterThan(0);
      expect(estimateTokens("a".repeat(400))).toBeGreaterThan(50);
    });

    it("should handle empty strings", () => {
      expect(estimateTokens("")).toBeGreaterThan(0); // Should include prompt overhead
    });
  });

  describe("computeRequestHash", () => {
    it("should generate consistent hashes for same input", async () => {
      const hash1 = await computeRequestHash("test", "improve");
      const hash2 = await computeRequestHash("test", "improve");
      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different inputs", async () => {
      const hash1 = await computeRequestHash("test1", "improve");
      const hash2 = await computeRequestHash("test2", "improve");
      expect(hash1).not.toBe(hash2);
    });

    it("should handle missing instruction", async () => {
      const hash1 = await computeRequestHash("test", undefined);
      const hash2 = await computeRequestHash("test", "");
      expect(hash1).toBe(hash2);
    });
  });

  describe("validateContextWindow", () => {
    it("should accept valid selections", () => {
      const result = validateContextWindow("short text");
      expect(result.valid).toBe(true);
      expect(result.tokens).toBeGreaterThan(0);
    });

    it("should reject selections exceeding max tokens", () => {
      // Create text that exceeds 1000 tokens (roughly 4000 characters)
      const largeText = "a".repeat(5000);
      const result = validateContextWindow(largeText);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("should include instruction in token count", () => {
      const result = validateContextWindow("text", "instruction");
      expect(result.tokens).toBeGreaterThan(
        validateContextWindow("text").tokens
      );
    });
  });

  describe("getLlamaSuggestion", () => {
    const createMockSupabase = () => {
      return {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { account_id: 'acc-123' }, error: null }) // manuscript fetch
            }),
          }),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          insert: jest.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-id" } },
            error: null,
          }),
        },
      } as unknown as SupabaseClient;
    };

    beforeEach(() => {
      // Clear session cache
      jest.clearAllMocks();
      // Reset environment
      delete process.env.MODAL_LLAMA_URL;
      delete process.env.NEXT_PUBLIC_MODAL_LLAMA_URL;
      (process.env as any).NODE_ENV = "test";
    });

    it("should return cached response when available", async () => {
      const supabase = createMockSupabase();
      
      // First call (will use mock)
      (process.env as any).NODE_ENV = "development";
      const result1 = await getLlamaSuggestion(
        supabase,
        {
          selectionText: "test",
          manuscriptId: "ms-id",
        },
        "user-id"
      );

      // Second call should use cache
      const result2 = await getLlamaSuggestion(
        supabase,
        {
          selectionText: "test",
          manuscriptId: "ms-id",
        },
        "user-id"
      );

      expect(result2.cached).toBe(true);
    });

    it("should enforce context window limits", async () => {
      const supabase = createMockSupabase();
      const largeText = "a".repeat(5000);

      await expect(
        getLlamaSuggestion(
          supabase,
          {
            selectionText: largeText,
            manuscriptId: "ms-id",
          },
          "user-id"
        )
      ).rejects.toThrow("too large");
    });

    it("should log suggestion to database", async () => {
      const insertSpy = jest.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      const supabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { account_id: 'acc-123' }, error: null }) // manuscript fetch
            }),
          }),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          insert: insertSpy,
        }),
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: "user-id" } },
            error: null,
          }),
        },
      } as unknown as SupabaseClient;

      (process.env as any).NODE_ENV = "development";
      
      // Use unique text to avoid cache hits
      const uniqueText = `test-${Date.now()}-${Math.random()}`;
      
      await getLlamaSuggestion(
        supabase,
        {
          selectionText: uniqueText,
          manuscriptId: "ms-id",
        },
        "user-id"
      );

      // Check that insert was called
      expect(insertSpy).toHaveBeenCalled();
      
      // Verify the last call had the correct structure
      // Note: Implementation now logs to 'suggestions' AND 'ai_usage_events'
      // The insertSpy catches both tables if .from() returns same mock
      // Since .from() mock returns the same object for all tables, insertSpy tracks all inserts.
      
      // We expect 'suggestions' insert and 'ai_usage_events' insert (via mock ai-usage? No, logic calls logUsageEvent mocked)
      // Actually logUsageEvent is mocked, so that won't call Supabase insert.
      // So only `suggestions` insert should be called.
      
      const lastCall = insertSpy.mock.calls[insertSpy.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        manuscript_id: "ms-id",
        original_text: uniqueText,
        tokens_estimated: expect.any(Number),
        tokens_actual: expect.any(Number),
      });
    });
  });
});
